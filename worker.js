require('dotenv').config();

const { Worker } = require('bullmq');
const { redisConnection, DOMAIN_PORTFOLIO_QUEUE } = require('./queue');
const { processDomainsForJob } = require('./services/portfolioProcessor');
const {
  ensureSchema,
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

  await processDomainsForJob({
    jobId,
    batchSize: BATCH_SIZE
  });

  const status = await getJobStatus(jobId);
  const percent =
    status && status.total_domains > 0
      ? Math.round((status.processed_domains / status.total_domains) * 100)
      : 100;
  await job.updateProgress(percent);
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
