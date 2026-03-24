const { analyzeDomain } = require('./analyzer');
const { portfolioLog } = require('./portfolioLogger');
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
  portfolioLog(
    `processDomainsForJob start jobId=${jobId} maxDomains=${maxDomains} batchSize=${batchSize}`
  );
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
    portfolioLog(
      `jobId=${jobId} claimPendingBatch requested=${currentBatchSize} claimed=${batch.length}`
    );
    if (!batch.length) break;

    for (const domainRow of batch) {
      try {
        portfolioLog(
          `jobId=${jobId} processing domainRowId=${domainRow.id} domain=${domainRow.domain} attempt=${domainRow.attempts}`
        );
        const result = await analyzeDomain(domainRow.domain);
        await saveDomainSuccess({
          domainRowId: domainRow.id,
          score: result.score,
          tier: result.tier,
          reasoning: result.reasoning
        });
        portfolioLog(
          `jobId=${jobId} SUCCESS domainRowId=${domainRow.id} score=${result.score} tier=${result.tier}`
        );
        successUpdates += 1;
      } catch (error) {
        await saveDomainFailure({
          domainRowId: domainRow.id,
          attempts: domainRow.attempts,
          errorMessage: error.message || 'Unknown domain processing error'
        });
        portfolioLog(
          `jobId=${jobId} FAILURE domainRowId=${domainRow.id} attempt=${domainRow.attempts} error=${error.message}`
        );
        failureUpdates += 1;
      }

      processedAttempts += 1;
      await updateJobProgress(jobId);
      const tickStatus = await getJobStatus(jobId);
      portfolioLog(
        `jobId=${jobId} progress processed=${tickStatus?.processed_domains}/${tickStatus?.total_domains} success=${tickStatus?.success_domains} failed=${tickStatus?.failed_domains} status=${tickStatus?.status}`
      );
      if (processedAttempts >= maxDomains) break;
    }
  }

  await updateJobProgress(jobId);
  await finalizeJobIfDone(jobId);

  const latestStatus = await getJobStatus(jobId);
  portfolioLog(
    `processDomainsForJob done jobId=${jobId} processedAttempts=${processedAttempts} successUpdates=${successUpdates} failureUpdates=${failureUpdates} finalStatus=${latestStatus?.status}`
  );
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
