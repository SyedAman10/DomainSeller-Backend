const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const redisConnection = new IORedis(process.env.UPSTASH_REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

const DOMAIN_PORTFOLIO_QUEUE = 'domain-portfolio-processing';

const domainPortfolioQueue = new Queue(DOMAIN_PORTFOLIO_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 1000,
    removeOnFail: 1000
  }
});

const enqueuePortfolioJob = async (jobId) => {
  return domainPortfolioQueue.add(
    'process-portfolio',
    { jobId },
    { jobId: `portfolio-${jobId}` }
  );
};

module.exports = {
  DOMAIN_PORTFOLIO_QUEUE,
  redisConnection,
  domainPortfolioQueue,
  enqueuePortfolioJob
};

