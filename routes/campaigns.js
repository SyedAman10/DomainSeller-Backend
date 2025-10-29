const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { sendBatchEmails } = require('../services/emailService');

/**
 * POST /api/campaigns/send-batch
 * Send multiple emails at once (rate limited to 10 per batch)
 */
router.post('/send-batch', async (req, res) => {
  try {
    const { campaignId, emails } = req.body;

    if (!campaignId || !emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'campaignId and emails array are required'
      });
    }

    // Validate campaign exists
    const campaign = await query(
      'SELECT * FROM campaigns WHERE campaign_id = $1',
      [campaignId]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get batch limit from env or default to 10
    const batchLimit = parseInt(process.env.EMAIL_BATCH_LIMIT) || 10;

    // Send emails via Mailgun
    const results = await sendBatchEmails(emails, batchLimit);

    // Store sent emails in database
    const insertPromises = emails.slice(0, batchLimit).map(async (email, index) => {
      if (index < results.sent) {
        try {
          await query(
            `INSERT INTO sent_emails 
              (campaign_id, buyer_email, subject, body, sent_at, status)
             VALUES ($1, $2, $3, $4, NOW(), 'sent')`,
            [campaignId, email.to, email.subject, email.html || email.text]
          );
        } catch (error) {
          console.error('Error storing sent email:', error);
        }
      }
    });

    await Promise.all(insertPromises);

    // Update campaign status
    await query(
      `UPDATE campaigns 
       SET status = 'active', updated_at = NOW()
       WHERE campaign_id = $1`,
      [campaignId]
    );

    res.json({
      success: true,
      message: 'Batch emails processed',
      results: {
        total: results.total,
        sent: results.sent,
        failed: results.failed,
        batchLimit,
        errors: results.errors
      }
    });
  } catch (error) {
    console.error('Error sending batch emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send batch emails',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/:campaignId/stats
 * Get campaign statistics
 */
router.get('/:campaignId/stats', async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Get campaign info
    const campaign = await query(
      'SELECT * FROM campaigns WHERE campaign_id = $1',
      [campaignId]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get sent emails count
    const sentEmails = await query(
      'SELECT COUNT(*) as count FROM sent_emails WHERE campaign_id = $1',
      [campaignId]
    );

    // Get scheduled emails count
    const scheduledEmails = await query(
      `SELECT COUNT(*) as count FROM scheduled_emails 
       WHERE campaign_id = $1 AND status = 'pending'`,
      [campaignId]
    );

    // Get response stats (if email_responses table exists)
    const responseStats = await query(
      `SELECT 
        COUNT(CASE WHEN event_type = 'opened' THEN 1 END) as opened,
        COUNT(CASE WHEN event_type = 'clicked' THEN 1 END) as clicked,
        COUNT(CASE WHEN event_type = 'bounced' THEN 1 END) as bounced,
        COUNT(CASE WHEN event_type = 'delivered' THEN 1 END) as delivered
       FROM email_responses er
       JOIN sent_emails se ON er.email_id = se.id
       WHERE se.campaign_id = $1`,
      [campaignId]
    ).catch(() => ({ rows: [{ opened: 0, clicked: 0, bounced: 0, delivered: 0 }] }));

    const sent = parseInt(sentEmails.rows[0].count);
    const delivered = parseInt(responseStats.rows[0].delivered);
    const opened = parseInt(responseStats.rows[0].opened);
    const clicked = parseInt(responseStats.rows[0].clicked);

    // Calculate rates
    const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(2) : 0;
    const clickRate = opened > 0 ? ((clicked / opened) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      campaign: campaign.rows[0],
      stats: {
        sent: sent,
        scheduled: parseInt(scheduledEmails.rows[0].count),
        delivered: delivered,
        opened: opened,
        clicked: clicked,
        bounced: parseInt(responseStats.rows[0].bounced),
        openRate: `${openRate}%`,
        clickRate: `${clickRate}%`
      }
    });
  } catch (error) {
    console.error('Error getting campaign stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign statistics',
      message: error.message
    });
  }
});

/**
 * POST /api/campaigns/schedule-followup
 * Schedule a follow-up email
 */
router.post('/schedule-followup', async (req, res) => {
  try {
    const { campaignId, buyerEmail, subject, body, scheduledFor } = req.body;

    if (!campaignId || !buyerEmail || !subject || !body || !scheduledFor) {
      return res.status(400).json({
        success: false,
        error: 'campaignId, buyerEmail, subject, body, and scheduledFor are required'
      });
    }

    // Validate campaign exists
    const campaign = await query(
      'SELECT * FROM campaigns WHERE campaign_id = $1',
      [campaignId]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Insert into scheduled_emails
    const result = await query(
      `INSERT INTO scheduled_emails 
        (campaign_id, buyer_email, subject, body, scheduled_for, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING *`,
      [campaignId, buyerEmail, subject, body, scheduledFor]
    );

    res.status(201).json({
      success: true,
      message: 'Follow-up email scheduled successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error scheduling follow-up:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule follow-up email',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/:campaignId
 * Get campaign details with buyers
 */
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Get campaign
    const campaign = await query(
      'SELECT * FROM campaigns WHERE campaign_id = $1',
      [campaignId]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get buyers for this campaign
    const buyers = await query(
      'SELECT * FROM campaign_buyers WHERE campaign_id = $1',
      [campaignId]
    );

    res.json({
      success: true,
      campaign: campaign.rows[0],
      buyers: buyers.rows
    });
  } catch (error) {
    console.error('Error getting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign details',
      message: error.message
    });
  }
});

module.exports = router;

