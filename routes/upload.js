const express = require('express');
const multer = require('multer');
const csvParser = require('csv-parser');
const { Readable } = require('stream');

const { enqueuePortfolioJob } = require('../queue');
const {
  ensureSchema,
  createJobWithDomains,
  getJobStatus
} = require('../services/portfolioService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.PORTFOLIO_CSV_MAX_SIZE || 5 * 1024 * 1024) // 5MB default
  }
});

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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required (field: file)'
      });
    }

    await ensureSchema();

    const { domains, removedDuplicates, invalidCount } = await parseCsvDomains(req.file.buffer);

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

    await enqueuePortfolioJob(job.id);

    return res.status(202).json({
      success: true,
      message: 'Portfolio accepted and queued for background processing',
      jobId: job.id,
      stats: {
        totalValidDomains: domains.length,
        removedDuplicates,
        invalidDomains: invalidCount
      }
    });
  } catch (error) {
    console.error('Portfolio upload failed:', error);
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

