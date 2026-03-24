require('dotenv').config();

const { Worker } = require('bullmq');
const { redisConnection, DOMAIN_PORTFOLIO_QUEUE } = require('./queue');
const { analyzeDomain } = require('./services/analyzer');
const {
  ensureSchema,
  markJobStarted,
  claimPendingBatch,
  saveDomainSuccess,
  saveDomainFailure,
  updateJobProgress,
  finalizeJobIfDone,
  markJobFailed,
  getJobStatus
} = require('./services/portfolioService');

const BATCH_SIZE = Number(process.env.PORTFOLIO_BATCH_SIZE || 15);
const WORKER_CONCURRENCY = Number(process.env.PORTFOLIO_WORKER_CONCURRENCY || 2);
const RATE_LIMIT_MAX = Number(process.env.PORTFOLIO_RATE_LIMIT_MAX || 5);
const RATE_LIMIT_DURATION = Number(process.env.PORTFOLIO_RATE_LIMIT_DURATION_MS || 1000);

const processPortfolioJob = async (job) => {
  const { jobId } = job.data;
  if (!jobId) throw new Error('Missing jobId in queue payload');

  await ensureSchema();
  await markJobStarted(jobId);

  while (true) {
    const batch = await claimPendingBatch(jobId, BATCH_SIZE);

    if (!batch.length) break;

    for (const domainRow of batch) {
      try {
        const result = await analyzeDomain(domainRow.domain);
        await saveDomainSuccess({
          domainRowId: domainRow.id,
          score: result.score,
          tier: result.tier,
          reasoning: result.reasoning
        });
      } catch (error) {
        await saveDomainFailure({
          domainRowId: domainRow.id,
          attempts: domainRow.attempts,
          errorMessage: error.message || 'Unknown domain processing error'
        });
      }

      await updateJobProgress(jobId);
      const status = await getJobStatus(jobId);
      const percent =
        status && status.total_domains > 0
          ? Math.round((status.processed_domains / status.total_domains) * 100)
          : 0;
      await job.updateProgress(percent);
    }
  }

  await updateJobProgress(jobId);
  await finalizeJobIfDone(jobId);
};

const worker = new Worker(DOMAIN_PORTFOLIO_QUEUE, processPortfolioJob, {
  connection: redisConnection,
  concurrency: WORKER_CONCURRENCY,
  limiter: {
    max: RATE_LIMIT_MAX,
    duration: RATE_LIMIT_DURATION
  }
});

worker.on('completed', (job) => {
  console.log(`Portfolio job completed: ${job.id}`);
});

worker.on('failed', async (job, err) => {
  console.error(`Portfolio job failed: ${job?.id || 'unknown'}`, err.message);
  const dbJobId = job?.data?.jobId;
  if (dbJobId) {
    await markJobFailed(dbJobId, err.message);
  }
});

worker.on('error', (err) => {
  console.error('Worker runtime error:', err);
});

console.log(
  `Portfolio worker started (concurrency=${WORKER_CONCURRENCY}, batch=${BATCH_SIZE}, rate=${RATE_LIMIT_MAX}/${RATE_LIMIT_DURATION}ms)`
);

