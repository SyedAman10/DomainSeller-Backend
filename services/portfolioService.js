const { pool, query } = require('../config/database');
const { portfolioLog } = require('./portfolioLogger');

let schemaInitialized = false;

const ensureSchema = async () => {
  if (schemaInitialized) return;

  await query(`
    CREATE TABLE IF NOT EXISTS portfolio_jobs (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'queued',
      total_domains INTEGER NOT NULL DEFAULT 0,
      processed_domains INTEGER NOT NULL DEFAULT 0,
      success_domains INTEGER NOT NULL DEFAULT 0,
      failed_domains INTEGER NOT NULL DEFAULT 0,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS portfolio_domains (
      id BIGSERIAL PRIMARY KEY,
      job_id BIGINT NOT NULL REFERENCES portfolio_jobs(id) ON DELETE CASCADE,
      domain TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      score INTEGER,
      tier VARCHAR(20),
      reasoning TEXT,
      error_message TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (job_id, domain)
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_portfolio_domains_job_status
    ON portfolio_domains(job_id, status);
  `);

  schemaInitialized = true;
};

const createJobWithDomains = async ({ filename, domains }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const jobResult = await client.query(
      `INSERT INTO portfolio_jobs (filename, status, total_domains, created_at, updated_at)
       VALUES ($1, 'queued', $2, NOW(), NOW())
       RETURNING id, filename, status, total_domains, created_at`,
      [filename, domains.length]
    );
    const job = jobResult.rows[0];

    const chunkSize = 500;
    for (let i = 0; i < domains.length; i += chunkSize) {
      const chunk = domains.slice(i, i + chunkSize);
      const values = [];
      const placeholders = chunk
        .map((domain, idx) => {
          const offset = idx * 2;
          values.push(job.id, domain);
          return `($${offset + 1}, $${offset + 2}, 'pending', NOW(), NOW())`;
        })
        .join(',');

      await client.query(
        `INSERT INTO portfolio_domains (job_id, domain, status, created_at, updated_at)
         VALUES ${placeholders}
         ON CONFLICT (job_id, domain) DO NOTHING`,
        values
      );
    }

    await client.query('COMMIT');
    return job;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const markJobStarted = async (jobId) => {
  await query(
    `UPDATE portfolio_jobs
     SET status = 'processing', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
     WHERE id = $1`,
    [jobId]
  );
};

const claimPendingBatch = async (jobId, batchSize) => {
  const result = await query(
    `WITH picked AS (
      SELECT id
      FROM portfolio_domains
      WHERE job_id = $1
        AND status = 'pending'
        AND attempts < 3
      ORDER BY id
      LIMIT $2
      FOR UPDATE SKIP LOCKED
    )
    UPDATE portfolio_domains d
    SET status = 'processing',
        attempts = d.attempts + 1,
        updated_at = NOW()
    FROM picked
    WHERE d.id = picked.id
    RETURNING d.id, d.job_id, d.domain, d.attempts`,
    [jobId, batchSize]
  );

  portfolioLog(`DB claimPendingBatch jobId=${jobId} batchSize=${batchSize} claimed=${result.rows.length}`);
  return result.rows;
};

const saveDomainSuccess = async ({ domainRowId, score, tier, reasoning }) => {
  await query(
    `UPDATE portfolio_domains
     SET status = 'processed',
         score = $2,
         tier = $3,
         reasoning = $4,
         error_message = NULL,
         processed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [domainRowId, score, tier, reasoning]
  );
};

const saveDomainFailure = async ({ domainRowId, attempts, errorMessage }) => {
  const shouldRetry = attempts < 3;
  await query(
    `UPDATE portfolio_domains
     SET status = $2::varchar(20),
         error_message = $3,
         processed_at = CASE WHEN $2::varchar(20) = 'failed' THEN NOW() ELSE NULL END,
         updated_at = NOW()
     WHERE id = $1`,
    [domainRowId, shouldRetry ? 'pending' : 'failed', errorMessage.slice(0, 2000)]
  );
};

const updateJobProgress = async (jobId) => {
  await query(
    `UPDATE portfolio_jobs j
     SET processed_domains = stats.processed_domains,
         success_domains = stats.success_domains,
         failed_domains = stats.failed_domains,
         updated_at = NOW()
     FROM (
       SELECT
         job_id,
         COUNT(*) FILTER (WHERE status IN ('processed', 'failed'))::INT AS processed_domains,
         COUNT(*) FILTER (WHERE status = 'processed')::INT AS success_domains,
         COUNT(*) FILTER (WHERE status = 'failed')::INT AS failed_domains
       FROM portfolio_domains
       WHERE job_id = $1
       GROUP BY job_id
     ) stats
     WHERE j.id = stats.job_id`,
    [jobId]
  );
  const status = await getJobStatus(jobId);
  portfolioLog(
    `DB updateJobProgress jobId=${jobId} processed=${status?.processed_domains}/${status?.total_domains} success=${status?.success_domains} failed=${status?.failed_domains} status=${status?.status}`
  );
};

const finalizeJobIfDone = async (jobId) => {
  const result = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('pending', 'processing'))::INT AS remaining,
       COUNT(*) FILTER (WHERE status = 'failed')::INT AS failed_count
     FROM portfolio_domains
     WHERE job_id = $1`,
    [jobId]
  );

  const remaining = result.rows[0]?.remaining || 0;
  const failedCount = result.rows[0]?.failed_count || 0;

  if (remaining > 0) return false;

  await query(
    `UPDATE portfolio_jobs
     SET status = $2,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [jobId, failedCount > 0 ? 'completed_with_errors' : 'completed']
  );
  portfolioLog(`DB finalizeJobIfDone jobId=${jobId} finalStatus=${failedCount > 0 ? 'completed_with_errors' : 'completed'}`);

  return true;
};

const markJobFailed = async (jobId, errorMessage) => {
  await query(
    `UPDATE portfolio_jobs
     SET status = 'failed',
         error_message = $2,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [jobId, String(errorMessage || 'Unknown error').slice(0, 2000)]
  );
};

const getJobStatus = async (jobId) => {
  const result = await query(
    `SELECT
      id,
      filename,
      status,
      total_domains,
      processed_domains,
      success_domains,
      failed_domains,
      started_at,
      completed_at,
      created_at,
      updated_at,
      error_message
    FROM portfolio_jobs
    WHERE id = $1`,
    [jobId]
  );

  return result.rows[0] || null;
};

const getProcessedDomainResults = async (jobId, limit = 25) => {
  const result = await query(
    `SELECT
      domain,
      status,
      score,
      tier,
      reasoning,
      error_message,
      attempts,
      processed_at
    FROM portfolio_domains
    WHERE job_id = $1
      AND status IN ('processed', 'failed')
    ORDER BY processed_at ASC NULLS LAST, id ASC
    LIMIT $2`,
    [jobId, limit]
  );

  return result.rows;
};

module.exports = {
  ensureSchema,
  createJobWithDomains,
  markJobStarted,
  claimPendingBatch,
  saveDomainSuccess,
  saveDomainFailure,
  updateJobProgress,
  finalizeJobIfDone,
  markJobFailed,
  getJobStatus,
  getProcessedDomainResults
};
