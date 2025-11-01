const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * GET /api/monitoring/campaigns/active
 * Get all currently active campaigns with their stats
 */
router.get('/campaigns/active', async (req, res) => {
  console.log('📊 Fetching active campaigns...');
  
  try {
    const { userId } = req.query;
    
    let whereClause = "c.status IN ('active', 'draft')";
    let params = [];
    
    if (userId) {
      whereClause += " AND c.user_id = $1";
      params.push(userId);
      console.log(`   Filtering by user ID: ${userId}`);
    }
    
    const campaigns = await query(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM sent_emails WHERE campaign_id = c.campaign_id) as emails_sent,
        (SELECT COUNT(*) FROM scheduled_emails WHERE campaign_id = c.campaign_id AND status = 'pending') as emails_queued,
        (SELECT MIN(scheduled_for) FROM scheduled_emails WHERE campaign_id = c.campaign_id AND status = 'pending') as next_email_at,
        (SELECT COUNT(*) FROM sent_emails WHERE campaign_id = c.campaign_id AND is_opened = true) as emails_opened,
        (SELECT COUNT(*) FROM sent_emails WHERE campaign_id = c.campaign_id AND is_clicked = true) as emails_clicked
      FROM campaigns c
      WHERE ${whereClause}
      ORDER BY c.updated_at DESC
    `, params);

    res.json({
      success: true,
      count: campaigns.rows.length,
      campaigns: campaigns.rows
    });
  } catch (error) {
    console.error('Error fetching active campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active campaigns',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/emails/recent
 * Get recently sent emails across all campaigns
 */
router.get('/emails/recent', async (req, res) => {
  console.log('📧 Fetching recent emails...');
  
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const emails = await query(`
      SELECT 
        se.*,
        c.campaign_name,
        c.domain_name,
        c.user_id
      FROM sent_emails se
      JOIN campaigns c ON se.campaign_id = c.campaign_id
      ORDER BY se.sent_at DESC
      LIMIT $1
    `, [limit]);

    res.json({
      success: true,
      count: emails.rows.length,
      emails: emails.rows
    });
  } catch (error) {
    console.error('Error fetching recent emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent emails',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/emails/scheduled
 * Get all scheduled/queued emails with countdown
 */
router.get('/emails/scheduled', async (req, res) => {
  console.log('📅 Fetching scheduled emails...');
  
  try {
    const emails = await query(`
      SELECT 
        se.*,
        c.campaign_name,
        c.domain_name,
        c.user_id,
        EXTRACT(EPOCH FROM (se.scheduled_for - NOW())) as seconds_until_send,
        CASE 
          WHEN se.scheduled_for <= NOW() THEN 'ready'
          WHEN se.scheduled_for <= NOW() + INTERVAL '1 hour' THEN 'soon'
          ELSE 'waiting'
        END as send_status
      FROM scheduled_emails se
      JOIN campaigns c ON se.campaign_id = c.campaign_id
      WHERE se.status = 'pending'
      ORDER BY se.scheduled_for ASC
    `);

    res.json({
      success: true,
      count: emails.rows.length,
      queue: emails.rows,
      nextProcessing: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Next queue check in 5 mins
    });
  } catch (error) {
    console.error('Error fetching scheduled emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled emails',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/dashboard
 * Get overview dashboard data
 */
router.get('/dashboard', async (req, res) => {
  console.log('🎯 Fetching dashboard data...');
  
  try {
    const { userId } = req.query;
    
    let userFilter = '';
    let params = [];
    
    if (userId) {
      userFilter = 'AND c.user_id = $1';
      params.push(userId);
      console.log(`   Filtering by user ID: ${userId}`);
    }
    
    // Get overall stats
    const statsQuery = userId 
      ? `SELECT 
          (SELECT COUNT(*) FROM campaigns WHERE status = 'active' AND user_id = $1) as active_campaigns,
          (SELECT COUNT(*) FROM campaigns WHERE status = 'draft' AND user_id = $1) as draft_campaigns,
          (SELECT COUNT(*) FROM sent_emails se JOIN campaigns c ON se.campaign_id = c.campaign_id WHERE se.sent_at > NOW() - INTERVAL '24 hours' AND c.user_id = $1) as emails_sent_24h,
          (SELECT COUNT(*) FROM sent_emails se JOIN campaigns c ON se.campaign_id = c.campaign_id WHERE se.sent_at > NOW() - INTERVAL '7 days' AND c.user_id = $1) as emails_sent_7d,
          (SELECT COUNT(*) FROM scheduled_emails se JOIN campaigns c ON se.campaign_id = c.campaign_id WHERE se.status = 'pending' AND c.user_id = $1) as emails_queued,
          (SELECT COUNT(*) FROM sent_emails se JOIN campaigns c ON se.campaign_id = c.campaign_id WHERE se.is_opened = true AND se.sent_at > NOW() - INTERVAL '7 days' AND c.user_id = $1) as emails_opened_7d,
          (SELECT COUNT(*) FROM sent_emails se JOIN campaigns c ON se.campaign_id = c.campaign_id WHERE se.is_clicked = true AND se.sent_at > NOW() - INTERVAL '7 days' AND c.user_id = $1) as emails_clicked_7d,
          (SELECT COUNT(DISTINCT se.campaign_id) FROM sent_emails se JOIN campaigns c ON se.campaign_id = c.campaign_id WHERE se.sent_at > NOW() - INTERVAL '24 hours' AND c.user_id = $1) as campaigns_sent_today`
      : `SELECT 
          (SELECT COUNT(*) FROM campaigns WHERE status = 'active') as active_campaigns,
          (SELECT COUNT(*) FROM campaigns WHERE status = 'draft') as draft_campaigns,
          (SELECT COUNT(*) FROM sent_emails WHERE sent_at > NOW() - INTERVAL '24 hours') as emails_sent_24h,
          (SELECT COUNT(*) FROM sent_emails WHERE sent_at > NOW() - INTERVAL '7 days') as emails_sent_7d,
          (SELECT COUNT(*) FROM scheduled_emails WHERE status = 'pending') as emails_queued,
          (SELECT COUNT(*) FROM sent_emails WHERE is_opened = true AND sent_at > NOW() - INTERVAL '7 days') as emails_opened_7d,
          (SELECT COUNT(*) FROM sent_emails WHERE is_clicked = true AND sent_at > NOW() - INTERVAL '7 days') as emails_clicked_7d,
          (SELECT COUNT(DISTINCT campaign_id) FROM sent_emails WHERE sent_at > NOW() - INTERVAL '24 hours') as campaigns_sent_today`;
    
    const stats = await query(statsQuery, params);

    // Get next scheduled email
    const nextEmailQuery = `
      SELECT 
        se.scheduled_for,
        se.buyer_email,
        c.campaign_name,
        c.domain_name,
        EXTRACT(EPOCH FROM (se.scheduled_for - NOW())) as seconds_until_send
      FROM scheduled_emails se
      JOIN campaigns c ON se.campaign_id = c.campaign_id
      WHERE se.status = 'pending' AND se.scheduled_for > NOW() ${userFilter}
      ORDER BY se.scheduled_for ASC
      LIMIT 1
    `;
    const nextEmail = await query(nextEmailQuery, params);

    // Get recent activity
    const recentActivityQuery = `
      SELECT 
        'sent' as activity_type,
        se.sent_at as activity_time,
        se.buyer_email,
        c.campaign_name,
        c.domain_name
      FROM sent_emails se
      JOIN campaigns c ON se.campaign_id = c.campaign_id
      ${userId ? 'WHERE c.user_id = $1' : ''}
      ORDER BY se.sent_at DESC
      LIMIT 10
    `;
    const recentActivity = await query(recentActivityQuery, params);

    res.json({
      success: true,
      stats: stats.rows[0],
      nextEmail: nextEmail.rows[0] || null,
      recentActivity: recentActivity.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/campaign/:campaignId/timeline
 * Get complete timeline of a campaign
 */
router.get('/campaign/:campaignId/timeline', async (req, res) => {
  console.log(`📜 Fetching timeline for campaign ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;

    // Find campaign by either id or campaign_id
    let campaign;
    if (!isNaN(parseInt(campaignId))) {
      campaign = await query(
        'SELECT * FROM campaigns WHERE id = $1 OR campaign_id = $2',
        [parseInt(campaignId), campaignId]
      );
    } else {
      campaign = await query(
        'SELECT * FROM campaigns WHERE campaign_id = $1',
        [campaignId]
      );
    }

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const actualCampaignId = campaign.rows[0].campaign_id;

    // Get all events for this campaign
    const timeline = await query(`
      SELECT * FROM (
        -- Sent emails
        SELECT 
          'email_sent' as event_type,
          sent_at as event_time,
          buyer_email as target,
          email_subject as details,
          status,
          is_opened,
          is_clicked
        FROM sent_emails
        WHERE campaign_id = $1
        
        UNION ALL
        
        -- Scheduled emails
        SELECT 
          'email_scheduled' as event_type,
          scheduled_for as event_time,
          buyer_email as target,
          email_subject as details,
          status,
          false as is_opened,
          false as is_clicked
        FROM scheduled_emails
        WHERE campaign_id = $1
        
        UNION ALL
        
        -- Campaign events
        SELECT 
          'campaign_created' as event_type,
          created_at as event_time,
          'Campaign' as target,
          campaign_name as details,
          status,
          false as is_opened,
          false as is_clicked
        FROM campaigns
        WHERE campaign_id = $1
      ) events
      ORDER BY event_time DESC
    `, [actualCampaignId]);

    res.json({
      success: true,
      campaign: campaign.rows[0],
      timeline: timeline.rows
    });
  } catch (error) {
    console.error('Error fetching campaign timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign timeline',
      message: error.message
    });
  }
});

/**
 * GET /api/monitoring/queue/status
 * Get email queue processor status
 */
router.get('/queue/status', async (req, res) => {
  console.log('⚙️ Fetching queue status...');
  
  try {
    const queueStats = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' AND scheduled_for <= NOW() THEN 1 END) as ready_to_send,
        COUNT(CASE WHEN status = 'pending' AND scheduled_for > NOW() THEN 1 END) as waiting,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        MIN(CASE WHEN status = 'pending' AND scheduled_for <= NOW() THEN scheduled_for END) as oldest_pending
      FROM scheduled_emails
    `);

    res.json({
      success: true,
      queue: queueStats.rows[0],
      processorInterval: process.env.QUEUE_CHECK_INTERVAL || '*/5 * * * *',
      nextCheck: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue status',
      message: error.message
    });
  }
});

module.exports = router;

