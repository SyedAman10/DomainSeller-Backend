const { analyzeDomain } = require('./analyzer');
const {
  markJobStarted,
  claimPendingBatch,
  saveDomainSuccess,
  saveDomainFailure,
  updateJobProgress,
  finalizeJobIfDone,
  getJobStatus
} = require('./portfolioService');

const processDomainsForJob = async ({
  jobId,
  maxDomains = Number.POSITIVE_INFINITY,
  batchSize = Number(process.env.PORTFOLIO_BATCH_SIZE || 15)
}) => {
  await markJobStarted(jobId);

  let processedAttempts = 0;
  let successUpdates = 0;
  let failureUpdates = 0;

  while (processedAttempts < maxDomains) {
    const remainingBudget = maxDomains - processedAttempts;
    const currentBatchSize = Number.isFinite(remainingBudget)
      ? Math.max(1, Math.min(batchSize, remainingBudget))
      : batchSize;

    const batch = await claimPendingBatch(jobId, currentBatchSize);
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
        successUpdates += 1;
      } catch (error) {
        await saveDomainFailure({
          domainRowId: domainRow.id,
          attempts: domainRow.attempts,
          errorMessage: error.message || 'Unknown domain processing error'
        });
        failureUpdates += 1;
      }

      processedAttempts += 1;
      await updateJobProgress(jobId);
      if (processedAttempts >= maxDomains) break;
    }
  }

  await updateJobProgress(jobId);
  await finalizeJobIfDone(jobId);

  const latestStatus = await getJobStatus(jobId);
  return {
    processedAttempts,
    successUpdates,
    failureUpdates,
    status: latestStatus
  };
};

module.exports = {
  processDomainsForJob
};

