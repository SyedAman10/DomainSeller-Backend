const express = require('express');
const multer = require('multer');
const csvParser = require('csv-parser');
const { Readable } = require('stream');

const { enqueuePortfolioJob } = require('../queue');
const { processDomainsForJob } = require('../services/portfolioProcessor');
const { portfolioLog } = require('../services/portfolioLogger');
const {
  ensureSchema,
  createJobWithDomains,
  getJobStatus,
  getProcessedDomainResults
} = require('../services/portfolioService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.PORTFOLIO_CSV_MAX_SIZE || 5 * 1024 * 1024) // 5MB default
  }
});

const FIRST_SYNC_BATCH = Number(process.env.PORTFOLIO_FIRST_SYNC_BATCH || 25);
const ONE_SHOT_MAX = Number(process.env.PORTFOLIO_ONE_SHOT_MAX || 25);

const normalizeDomain = (value) => {
  if (!value) return '';
  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) return '';

  const noProtocol = trimmed.replace(/^https?:\/\//, '');
  const noPath = noProtocol.split('/')[0];
  const noWww = noPath.replace(/^www\./, '');

  return noWww.replace(/\.+$/, '');
};

const isValidDomain = (domain) => {
  const regex =
    /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
  return regex.test(domain);
};

const parseCsvDomains = async (buffer) => {
  const rows = [];
  const invalidRows = [];

  return new Promise((resolve, reject) => {
    Readable.from(buffer)
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => String(header || '').trim()
        })
      )
      .on('data', (row) => {
        const fromNamedField =
          row.domain ||
          row.Domain ||
          row.DOMAIN ||
          row.url ||
          row.URL ||
          row.name ||
          row.Name;

        const fallback = Object.values(row).find((v) => String(v || '').trim().length > 0);
        const candidate = normalizeDomain(fromNamedField || fallback);

        if (!candidate) return;

        if (!isValidDomain(candidate)) {
          invalidRows.push(candidate);
          return;
        }

        rows.push(candidate);
      })
      .on('end', () => {
        const uniqueDomains = [...new Set(rows)];
        resolve({
          domains: uniqueDomains,
          removedDuplicates: rows.length - uniqueDomains.length,
          invalidCount: invalidRows.length
        });
      })
      .on('error', reject);
  });
};

/**
 * POST /upload
 * Upload CSV and enqueue async portfolio processing job.
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    portfolioLog(
      `POST /upload start fileName=${req.file?.originalname || 'n/a'} fileSize=${req.file?.size || 0}`
    );
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required (field: file)'
      });
    }

    await ensureSchema();

    const { domains, removedDuplicates, invalidCount } = await parseCsvDomains(req.file.buffer);
    portfolioLog(
      `POST /upload parsed valid=${domains.length} removedDuplicates=${removedDuplicates} invalid=${invalidCount}`
    );

    if (!domains.length) {
      return res.status(400).json({
        success: false,
        message: 'No valid domains found in CSV',
        invalidCount
      });
    }

    const job = await createJobWithDomains({
      filename: req.file.originalname || 'domains.csv',
      domains
    });
    portfolioLog(`POST /upload created jobId=${job.id} total=${domains.length}`);

    // Small CSVs: process everything immediately in one shot.
    if (domains.length <= ONE_SHOT_MAX) {
      portfolioLog(`POST /upload one-shot mode jobId=${job.id}`);
      const immediate = await processDomainsForJob({
        jobId: job.id,
        maxDomains: domains.length
      });

      const previewResults = await getProcessedDomainResults(job.id, domains.length);

      return res.status(201).json({
        success: true,
        message: 'Portfolio processed in one shot',
        jobId: job.id,
        status: immediate.status?.status || 'completed',
        stats: {
          totalValidDomains: domains.length,
          removedDuplicates,
          invalidDomains: invalidCount,
          processedDomains: immediate.status?.processed_domains || domains.length,
          successDomains: immediate.status?.success_domains || 0,
          failedDomains: immediate.status?.failed_domains || 0
        },
        firstBatchResults: previewResults,
        isComplete: true
      });
    }

    // Large CSVs: process first chunk now for engagement, queue the rest.
    portfolioLog(`POST /upload hybrid mode jobId=${job.id} firstBatch=${FIRST_SYNC_BATCH}`);
    const immediate = await processDomainsForJob({
      jobId: job.id,
      maxDomains: FIRST_SYNC_BATCH
    });

    await enqueuePortfolioJob(job.id);
    portfolioLog(`POST /upload enqueued remaining jobId=${job.id}`);
    const previewResults = await getProcessedDomainResults(job.id, FIRST_SYNC_BATCH);

    return res.status(202).json({
      success: true,
      message:
        'First batch processed. Remaining domains queued for background processing.',
      jobId: job.id,
      stats: {
        totalValidDomains: domains.length,
        removedDuplicates,
        invalidDomains: invalidCount,
        processedDomains: immediate.status?.processed_domains || 0,
        successDomains: immediate.status?.success_domains || 0,
        failedDomains: immediate.status?.failed_domains || 0,
        remainingDomains:
          domains.length - (immediate.status?.processed_domains || FIRST_SYNC_BATCH)
      },
      firstBatchResults: previewResults,
      isComplete: false
    });
  } catch (error) {
    console.error('Portfolio upload failed:', error);
    portfolioLog(`POST /upload error=${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload and queue portfolio',
      error: error.message
    });
  }
});

/**
 * GET /job-status?jobId=123
 */
router.get('/job-status', async (req, res) => {
  try {
    await ensureSchema();

    const jobId = Number(req.query.jobId);
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'jobId query parameter is required'
      });
    }

    const job = await getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const completion =
      job.total_domains > 0
        ? Math.round((job.processed_domains / job.total_domains) * 100)
        : 0;
    portfolioLog(
      `GET /job-status jobId=${job.id} status=${job.status} processed=${job.processed_domains}/${job.total_domains} completion=${completion}%`
    );

    return res.json({
      success: true,
      jobId: job.id,
      status: job.status,
      totalDomains: job.total_domains,
      processedDomains: job.processed_domains,
      successDomains: job.success_domains,
      failedDomains: job.failed_domains,
      completionPercent: completion,
      isComplete: ['completed', 'completed_with_errors', 'failed'].includes(job.status),
      startedAt: job.started_at,
      completedAt: job.completed_at,
      error: job.error_message
    });
  } catch (error) {
    console.error('Failed to fetch job status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch job status',
      error: error.message
    });
  }
});

module.exports = router;
