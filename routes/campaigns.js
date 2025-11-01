const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { sendBatchEmails } = require('../services/emailService');

// ============================================================
// SPECIFIC ROUTES (must come BEFORE parameterized routes)
// ============================================================

/**
 * POST /api/campaigns/send-batch
 * Send multiple emails at once (rate limited to 10 per batch)
 */
router.post('/send-batch', async (req, res) => {
  console.log('📧 Processing batch email send...');
  
  try {
    const { campaignId, emails } = req.body;

    if (!campaignId || !emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'campaignId and emails array are required'
      });
    }

    console.log(`🔍 Looking for campaign with ID: ${campaignId} (type: ${typeof campaignId})`);

    // Validate campaign exists - check both id (integer) and campaign_id (string)
    let campaign;
    if (typeof campaignId === 'number' || !isNaN(parseInt(campaignId))) {
      // If it's a number, search by id field first
      campaign = await query(
        'SELECT * FROM campaigns WHERE id = $1 OR campaign_id = $2',
        [campaignId, String(campaignId)]
      );
    } else {
      // If it's a string, search by campaign_id field
      campaign = await query(
        'SELECT * FROM campaigns WHERE campaign_id = $1 OR id = $2',
        [campaignId, parseInt(campaignId) || 0]
      );
    }

    if (campaign.rows.length === 0) {
      console.log(`❌ Campaign not found with ID: ${campaignId}`);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        message: `No campaign found with ID: ${campaignId}`,
        hint: 'Make sure you are using the correct campaign ID from the database'
      });
    }

    console.log(`✅ Campaign found: ${campaign.rows[0].campaign_id} (DB ID: ${campaign.rows[0].id})`);
    
    // Use the campaign_id string for all subsequent operations
    const actualCampaignId = campaign.rows[0].campaign_id;

    // Get batch limit from env or default to 10
    const batchLimit = parseInt(process.env.EMAIL_BATCH_LIMIT) || 10;

    // Send emails via Mailgun
    const results = await sendBatchEmails(emails, batchLimit);

    // Store sent emails in database and schedule follow-ups
    const insertPromises = emails.slice(0, batchLimit).map(async (email, index) => {
      if (index < results.sent) {
        try {
          // Insert sent email (or update if already exists)
          await query(
            `INSERT INTO sent_emails 
              (campaign_id, buyer_email, email_subject, email_content, sent_at, status, user_id, buyer_id, buyer_name, domain_name)
             VALUES ($1, $2, $3, $4, NOW(), 'sent', $5, $6, $7, $8)
             ON CONFLICT (user_id, campaign_id, buyer_id) 
             DO UPDATE SET
               sent_at = NOW(),
               email_subject = EXCLUDED.email_subject,
               email_content = EXCLUDED.email_content,
               status = 'sent'`,
            [
              actualCampaignId, 
              email.to, 
              email.subject, 
              email.html || email.text,
              email.userId || campaign.rows[0].user_id || 0,
              email.buyerId || 'unknown',
              email.buyerName || email.to.split('@')[0],
              campaign.rows[0].domain_name || 'Unknown'
            ]
          );

          // Auto-schedule follow-ups if campaign has followUpSequence
          if (campaign.rows[0].follow_up_sequence) {
            const followUpSequence = typeof campaign.rows[0].follow_up_sequence === 'string' 
              ? JSON.parse(campaign.rows[0].follow_up_sequence)
              : campaign.rows[0].follow_up_sequence;

            if (Array.isArray(followUpSequence) && followUpSequence.length > 0) {
              console.log(`📅 Scheduling ${followUpSequence.length} follow-ups for ${email.to}`);

              for (const followUp of followUpSequence) {
                const daysAfter = followUp.daysAfter || followUp.day || 3;
                const scheduledDate = new Date();
                scheduledDate.setDate(scheduledDate.getDate() + daysAfter);

                // Prepare placeholders for dynamic content
                const placeholders = {
                  domain: campaign.rows[0].domain_name,
                  buyerName: email.buyerName || email.to.split('@')[0],
                  buyerEmail: email.to,
                  campaignName: campaign.rows[0].campaign_name
                };

                // Replace placeholders in subject
                const subject = (followUp.subject || `Follow-up: ${followUp.name}`)
                  .replace(/{domain}/g, placeholders.domain)
                  .replace(/{buyerName}/g, placeholders.buyerName)
                  .replace(/{buyerEmail}/g, placeholders.buyerEmail)
                  .replace(/{campaignName}/g, placeholders.campaignName);

                // Replace placeholders in content/body
                const content = (followUp.content || followUp.body || `Follow-up: ${followUp.name}`)
                  .replace(/{domain}/g, placeholders.domain)
                  .replace(/{buyerName}/g, placeholders.buyerName)
                  .replace(/{buyerEmail}/g, placeholders.buyerEmail)
                  .replace(/{campaignName}/g, placeholders.campaignName);

                await query(
                  `INSERT INTO scheduled_emails 
                    (campaign_id, buyer_email, email_subject, email_content, scheduled_for, status, user_id, buyer_id, buyer_name, domain_name)
                   VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9)`,
                  [
                    actualCampaignId,
                    email.to,
                    subject,
                    content,
                    scheduledDate.toISOString(),
                    email.userId || campaign.rows[0].user_id || 0,
                    email.buyerId || 'unknown',
                    email.buyerName || email.to.split('@')[0],
                    campaign.rows[0].domain_name
                  ]
                );

                console.log(`  ✅ ${followUp.name} scheduled for ${scheduledDate.toISOString().split('T')[0]}`);
              }
            }
          }
        } catch (error) {
          console.error('Error storing sent email or scheduling follow-ups:', error);
        }
      }
    });

    await Promise.all(insertPromises);

    // Update campaign status and scheduled count
    const scheduledCount = campaign.rows[0].follow_up_sequence 
      ? (typeof campaign.rows[0].follow_up_sequence === 'string'
          ? JSON.parse(campaign.rows[0].follow_up_sequence).length
          : campaign.rows[0].follow_up_sequence.length) * results.sent
      : 0;

    await query(
      `UPDATE campaigns 
       SET status = 'active', updated_at = NOW(), 
           total_emails_sent = total_emails_sent + $2,
           total_emails_scheduled = total_emails_scheduled + $3
       WHERE campaign_id = $1`,
      [actualCampaignId, results.sent, scheduledCount]
    );

    console.log(`✅ Batch complete: ${results.sent} sent, ${scheduledCount} follow-ups scheduled`);

    res.json({
      success: true,
      message: 'Batch emails processed and follow-ups scheduled',
      results: {
        total: results.total,
        sent: results.sent,
        failed: results.failed,
        followUpsScheduled: scheduledCount,
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
 * POST /api/campaigns/schedule-followup
 * Schedule a follow-up email
 */
router.post('/schedule-followup', async (req, res) => {
  console.log('📅 Scheduling follow-up email...');
  
  try {
    const { campaignId, buyerEmail, subject, body, scheduledFor, userId, buyerId, buyerName, domainName } = req.body;

    if (!campaignId || !buyerEmail || !subject || !body || !scheduledFor) {
      return res.status(400).json({
        success: false,
        error: 'campaignId, buyerEmail, subject, body, and scheduledFor are required'
      });
    }

    // Validate campaign exists - check both id (integer) and campaign_id (string)
    let campaign;
    if (typeof campaignId === 'number' || !isNaN(parseInt(campaignId))) {
      campaign = await query(
        'SELECT * FROM campaigns WHERE id = $1 OR campaign_id = $2',
        [campaignId, String(campaignId)]
      );
    } else {
      campaign = await query(
        'SELECT * FROM campaigns WHERE campaign_id = $1 OR id = $2',
        [campaignId, parseInt(campaignId) || 0]
      );
    }

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    const actualCampaignId = campaign.rows[0].campaign_id;

    // Insert into scheduled_emails
    const result = await query(
      `INSERT INTO scheduled_emails 
        (campaign_id, buyer_email, email_subject, email_content, scheduled_for, status, created_at, user_id, buyer_id, buyer_name, domain_name)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), $6, $7, $8, $9)
       RETURNING *`,
      [
        actualCampaignId, 
        buyerEmail, 
        subject, 
        body, 
        scheduledFor,
        userId || campaign.rows[0].user_id || 0,
        buyerId || 'unknown',
        buyerName || buyerEmail.split('@')[0],
        domainName || campaign.rows[0].domain_name || 'Unknown'
      ]
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
 * PUT /api/campaigns/scheduled/:scheduledEmailId
 * Update a scheduled email's content, subject, or scheduled time
 */
router.put('/scheduled/:scheduledEmailId', async (req, res) => {
  console.log(`📝 Updating scheduled email ${req.params.scheduledEmailId}...`);
  
  try {
    const { scheduledEmailId } = req.params;
    const {
      emailSubject,
      emailContent,
      scheduledFor,
      buyerEmail,
      buyerName
    } = req.body;

    // Check if scheduled email exists
    const existing = await query(
      'SELECT * FROM scheduled_emails WHERE id = $1',
      [scheduledEmailId]
    );

    if (existing.rows.length === 0) {
      console.log(`❌ Scheduled email ${scheduledEmailId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Scheduled email not found',
        message: `No scheduled email found with ID: ${scheduledEmailId}`
      });
    }

    const currentEmail = existing.rows[0];

    // Don't allow updating emails that have already been sent
    if (currentEmail.status === 'sent') {
      console.log(`❌ Cannot update email that has already been sent`);
      return res.status(400).json({
        success: false,
        error: 'Cannot update sent email',
        message: 'This email has already been sent and cannot be modified'
      });
    }

    // Update scheduled email
    const result = await query(
      `UPDATE scheduled_emails SET
        email_subject = COALESCE($1, email_subject),
        email_content = COALESCE($2, email_content),
        scheduled_for = COALESCE($3, scheduled_for),
        buyer_email = COALESCE($4, buyer_email),
        buyer_name = COALESCE($5, buyer_name)
      WHERE id = $6
      RETURNING *`,
      [
        emailSubject,
        emailContent,
        scheduledFor,
        buyerEmail,
        buyerName,
        scheduledEmailId
      ]
    );

    console.log(`✅ Scheduled email ${scheduledEmailId} updated successfully`);

    res.json({
      success: true,
      message: 'Scheduled email updated successfully',
      scheduledEmail: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating scheduled email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update scheduled email',
      message: error.message
    });
  }
});

/**
 * POST /api/campaigns/replace
 * Delete existing campaign for a domain and create a new one
 */
router.post('/replace', async (req, res) => {
  console.log('🔄 Replace existing campaign...');
  
  try {
    const {
      userId,
      domainId,
      domainName,
      campaignName,
      emailTone,
      includePrice,
      maxEmailsPerDay,
      followUpSequence,
      followUpDays
    } = req.body;

    // Validate required fields
    if (!userId || !domainName || !campaignName) {
      return res.status(400).json({
        success: false,
        error: 'userId, domainName, and campaignName are required'
      });
    }

    console.log(`🔍 Looking for existing campaign for ${domainName}...`);

    // Find and delete existing active/draft campaigns for this domain
    const existing = await query(
      `DELETE FROM campaigns 
       WHERE user_id = $1 AND domain_name = $2 
       AND status IN ('active', 'draft')
       RETURNING *`,
      [userId, domainName]
    );

    if (existing.rows.length > 0) {
      console.log(`🗑️  Deleted ${existing.rows.length} existing campaign(s) for ${domainName}`);
    }

    // Generate unique campaign_id
    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new campaign
    const result = await query(
      `INSERT INTO campaigns 
        (campaign_id, user_id, domain_id, domain_name, campaign_name, email_tone, 
         include_price, max_emails_per_day, follow_up_sequence, follow_up_days, 
         status, created_at, updated_at, total_emails_sent, total_emails_scheduled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', NOW(), NOW(), 0, 0)
       RETURNING *`,
      [
        campaignId,
        userId,
        domainId || null,
        domainName,
        campaignName,
        emailTone || 'professional',
        includePrice !== undefined ? includePrice : true,
        maxEmailsPerDay || 50,
        followUpSequence ? JSON.stringify(followUpSequence) : null,
        followUpDays || 3
      ]
    );

    console.log(`✅ New campaign created: ${campaignId}`);

    res.status(201).json({
      success: true,
      message: 'Campaign replaced successfully',
      deleted: existing.rows.length,
      campaign: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error replacing campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to replace campaign',
      message: error.message
    });
  }
});

// ============================================================
// GENERAL ROUTES
// ============================================================

/**
 * POST /api/campaigns
 * Create a new campaign
 */
router.post('/', async (req, res) => {
  console.log('🆕 Creating new campaign...');
  
  try {
    const {
      userId,
      domainId,
      domainName,
      campaignName,
      emailTone,
      includePrice,
      maxEmailsPerDay,
      followUpSequence,
      followUpDays
    } = req.body;

    // Validate required fields
    if (!userId || !domainName || !campaignName) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'userId, domainName, and campaignName are required'
      });
    }

    console.log(`📝 Campaign: ${campaignName} for ${domainName}`);

    // Check for existing campaign with same domain for this user
    const existingCampaign = await query(
      `SELECT * FROM campaigns 
       WHERE user_id = $1 AND domain_name = $2 
       AND status IN ('active', 'draft')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, domainName]
    );

    if (existingCampaign.rows.length > 0) {
      const existing = existingCampaign.rows[0];
      console.log(`⚠️ Campaign already exists for ${domainName}: ${existing.campaign_id}`);
      
      return res.status(409).json({
        success: false,
        error: 'Campaign already exists for this domain',
        message: `You already have an ${existing.status} campaign for ${domainName}`,
        existingCampaign: {
          id: existing.id,
          campaign_id: existing.campaign_id,
          campaign_name: existing.campaign_name,
          status: existing.status,
          created_at: existing.created_at,
          total_emails_sent: existing.total_emails_sent,
          total_emails_scheduled: existing.total_emails_scheduled
        },
        actions: {
          useExisting: `Use the existing campaign (ID: ${existing.id})`,
          replaceExisting: `POST /api/campaigns/replace to delete old and create new`,
          updateExisting: `PUT /api/campaigns/${existing.id} to update settings`
        },
        hint: 'To create a new campaign for this domain, use the /api/campaigns/replace endpoint'
      });
    }

    // Validate user exists
    const userCheck = await query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      console.log(`❌ User ID ${userId} not found`);
      
      // Get available user IDs
      const availableUsers = await query(
        'SELECT id, email, username FROM users ORDER BY id LIMIT 5'
      );
      
      const userList = availableUsers.rows.map(u => `${u.id} (${u.email})`).join(', ');
      
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: `User ID ${userId} does not exist`,
        availableUsers: availableUsers.rows.map(u => ({
          id: u.id,
          email: u.email,
          username: u.username
        })),
        hint: `Try using one of these user IDs: ${userList}`
      });
    }

    console.log(`✅ User validated: ${userCheck.rows[0].id}`);

    // Generate unique campaign_id
    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert new campaign
    const result = await query(
      `INSERT INTO campaigns 
        (campaign_id, user_id, domain_id, domain_name, campaign_name, email_tone, 
         include_price, max_emails_per_day, follow_up_sequence, follow_up_days, 
         status, created_at, updated_at, total_emails_sent, total_emails_scheduled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', NOW(), NOW(), 0, 0)
       RETURNING *`,
      [
        campaignId,
        userId,
        domainId || null,
        domainName,
        campaignName,
        emailTone || 'professional',
        includePrice !== undefined ? includePrice : true,
        maxEmailsPerDay || 50,
        followUpSequence ? JSON.stringify(followUpSequence) : null,
        followUpDays || 3
      ]
    );

    console.log(`✅ Campaign created with ID: ${campaignId}`);

    // Get scheduled emails for this campaign
    const scheduledEmails = await query(
      `SELECT id, buyer_email, email_subject, scheduled_for, status 
       FROM scheduled_emails 
       WHERE campaign_id = $1 
       ORDER BY scheduled_for ASC`,
      [campaignId]
    );

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign: result.rows[0],
      scheduled: scheduledEmails.rows,
      scheduledCount: scheduledEmails.rows.length
    });
  } catch (error) {
    console.error('❌ Error creating campaign:', error);
    
    // Handle foreign key constraint errors
    if (error.code === '23503' && error.constraint === 'campaigns_user_id_fkey') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'The specified user ID does not exist',
        hint: 'Run "node check-users.js" to see available user IDs'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns
 * Get all campaigns for a user
 */
router.get('/', async (req, res) => {
  console.log('📋 Fetching all campaigns...');
  
  try {
    const { userId } = req.query;

    let queryText = 'SELECT * FROM campaigns ORDER BY created_at DESC';
    let params = [];

    if (userId) {
      queryText = 'SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC';
      params = [userId];
      console.log(`👤 Filtering by user ID: ${userId}`);
    }

    const result = await query(queryText, params);

    console.log(`✅ Found ${result.rows.length} campaigns`);

    res.json({
      success: true,
      count: result.rows.length,
      campaigns: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      message: error.message
    });
  }
});

/**
 * DELETE /api/campaigns
 * Bulk delete campaigns (requires campaignIds array)
 */
router.delete('/', async (req, res) => {
  console.log('🗑️  Bulk deleting campaigns...');
  
  try {
    let { campaignIds, campaignId, userId } = req.body;

    // Handle both single campaignId and array campaignIds
    if (!campaignIds && campaignId) {
      // Convert single campaignId to array
      campaignIds = [campaignId];
      console.log(`   Converting single campaignId to array: [${campaignId}]`);
    }

    if (!campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'campaignIds array or campaignId is required',
        message: 'Provide campaignId (string) or campaignIds (array) to delete'
      });
    }

    console.log(`   Deleting ${campaignIds.length} campaign(s): ${campaignIds.join(', ')}`);
    if (userId) {
      console.log(`   Filtering by user ID: ${userId}`);
    }

    // Build query with user filter if provided
    let query_text = 'DELETE FROM campaigns WHERE campaign_id = ANY($1)';
    let params = [campaignIds];

    if (userId) {
      query_text += ' AND user_id = $2';
      params.push(userId);
    }

    query_text += ' RETURNING *';

    const result = await query(query_text, params);

    console.log(`✅ Deleted ${result.rows.length} campaign(s)`);

    res.json({
      success: true,
      message: `Successfully deleted ${result.rows.length} campaign(s)`,
      deleted: result.rows.length,
      campaigns: result.rows
    });
  } catch (error) {
    console.error('❌ Error bulk deleting campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaigns',
      message: error.message
    });
  }
});

/**
 * PUT /api/campaigns/:campaignId
 * Update campaign details
 */
router.put('/:campaignId', async (req, res) => {
  console.log(`📝 Updating campaign ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;
    const {
      campaignName,
      emailTone,
      includePrice,
      maxEmailsPerDay,
      followUpDays,
      followUpSequence,
      status
    } = req.body;

    // Check if campaign exists
    const existing = await query(
      'SELECT * FROM campaigns WHERE campaign_id = $1',
      [campaignId]
    );

    if (existing.rows.length === 0) {
      console.log(`❌ Campaign ${campaignId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Update campaign
    const result = await query(
      `UPDATE campaigns SET
        campaign_name = COALESCE($1, campaign_name),
        email_tone = COALESCE($2, email_tone),
        include_price = COALESCE($3, include_price),
        max_emails_per_day = COALESCE($4, max_emails_per_day),
        follow_up_days = COALESCE($5, follow_up_days),
        follow_up_sequence = COALESCE($6, follow_up_sequence),
        status = COALESCE($7, status),
        updated_at = NOW()
      WHERE campaign_id = $8
      RETURNING *`,
      [
        campaignName,
        emailTone,
        includePrice,
        maxEmailsPerDay,
        followUpDays,
        followUpSequence ? JSON.stringify(followUpSequence) : null,
        status,
        campaignId
      ]
    );

    console.log(`✅ Campaign ${campaignId} updated successfully`);

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      campaign: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign',
      message: error.message
    });
  }
});

/**
 * DELETE /api/campaigns/:campaignId
 * Delete a campaign
 */
router.delete('/:campaignId', async (req, res) => {
  console.log(`🗑️  Deleting campaign ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;

    const result = await query(
      'DELETE FROM campaigns WHERE campaign_id = $1 RETURNING *',
      [campaignId]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Campaign ${campaignId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    console.log(`✅ Campaign ${campaignId} deleted successfully`);

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
      campaign: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign',
      message: error.message
    });
  }
});

// ============================================================
// PARAMETERIZED ROUTES (must come AFTER specific routes)
// ============================================================

/**
 * GET /api/campaigns/:campaignId/scheduled
 * Get scheduled emails for a specific campaign
 */
router.get('/:campaignId/scheduled', async (req, res) => {
  console.log(`📅 Fetching scheduled emails for campaign ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;

    // Get campaign - check both id (integer) and campaign_id (string)
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

    // Get all scheduled emails for this campaign
    const scheduledEmails = await query(
      `SELECT 
        id,
        campaign_id,
        buyer_email,
        email_subject,
        email_content,
        scheduled_for,
        status,
        created_at,
        user_id,
        buyer_id,
        buyer_name,
        domain_name,
        EXTRACT(EPOCH FROM (scheduled_for - NOW())) as seconds_until_send,
        CASE 
          WHEN scheduled_for <= NOW() THEN 'ready'
          WHEN scheduled_for <= NOW() + INTERVAL '1 hour' THEN 'soon'
          ELSE 'waiting'
        END as send_status
       FROM scheduled_emails
       WHERE campaign_id = $1
       ORDER BY scheduled_for ASC`,
      [actualCampaignId]
    );

    console.log(`✅ Found ${scheduledEmails.rows.length} scheduled emails`);

    res.json({
      success: true,
      campaign: {
        id: campaign.rows[0].id,
        campaign_id: campaign.rows[0].campaign_id,
        campaign_name: campaign.rows[0].campaign_name,
        domain_name: campaign.rows[0].domain_name
      },
      count: scheduledEmails.rows.length,
      scheduled: scheduledEmails.rows
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
 * GET /api/campaigns/:campaignId/stats
 * Get campaign statistics
 */
router.get('/:campaignId/stats', async (req, res) => {
  console.log(`📊 Fetching stats for campaign ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;

    // Get campaign info - check both id (integer) and campaign_id (string)
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

    // Get sent emails count
    const sentEmails = await query(
      'SELECT COUNT(*) as count FROM sent_emails WHERE campaign_id = $1',
      [actualCampaignId]
    );

    // Get scheduled emails count
    const scheduledEmails = await query(
      `SELECT COUNT(*) as count FROM scheduled_emails 
       WHERE campaign_id = $1 AND status = 'pending'`,
      [actualCampaignId]
    );

    // Get engagement stats directly from sent_emails table
    const responseStats = await query(
      `SELECT 
        COUNT(CASE WHEN is_opened = true THEN 1 END) as opened,
        COUNT(CASE WHEN is_clicked = true THEN 1 END) as clicked,
        COUNT(CASE WHEN delivery_status = 'bounced' THEN 1 END) as bounced,
        COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered
       FROM sent_emails
       WHERE campaign_id = $1`,
      [actualCampaignId]
    );

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
 * GET /api/campaigns/:campaignId
 * Get campaign details with buyers
 */
router.get('/:campaignId', async (req, res) => {
  console.log(`📄 Fetching campaign details for ${req.params.campaignId}...`);
  
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

/**
 * PUT /api/campaigns/:campaignId/ai-settings
 * Update AI agent settings for a campaign
 */
router.put('/:campaignId/ai-settings', async (req, res) => {
  console.log(`⚙️  Updating AI settings for campaign ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;
    const { 
      autoResponseEnabled, 
      notificationEmail,
      minimumPrice,
      negotiationStrategy,
      responseStyle,
      responseLength,
      customInstructions,
      highlightFeatures
    } = req.body;

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (typeof autoResponseEnabled === 'boolean') {
      updates.push(`auto_response_enabled = $${paramIndex++}`);
      values.push(autoResponseEnabled);
      console.log(`   Auto-response: ${autoResponseEnabled ? 'ON' : 'OFF'}`);
    }

    if (notificationEmail !== undefined) {
      updates.push(`notification_email = $${paramIndex++}`);
      values.push(notificationEmail || null);
      console.log(`   Notification email: ${notificationEmail || '(none)'}`);
    }

    if (minimumPrice !== undefined) {
      updates.push(`minimum_price = $${paramIndex++}`);
      values.push(minimumPrice || null);
      console.log(`   Minimum price: $${minimumPrice || 'not set'}`);
    }

    if (negotiationStrategy) {
      updates.push(`negotiation_strategy = $${paramIndex++}`);
      values.push(negotiationStrategy);
      console.log(`   Negotiation: ${negotiationStrategy}`);
    }

    if (responseStyle) {
      updates.push(`response_style = $${paramIndex++}`);
      values.push(responseStyle);
      console.log(`   Response style: ${responseStyle}`);
    }

    if (responseLength) {
      updates.push(`response_length = $${paramIndex++}`);
      values.push(responseLength);
      console.log(`   Response length: ${responseLength}`);
    }

    if (customInstructions !== undefined) {
      updates.push(`custom_instructions = $${paramIndex++}`);
      values.push(customInstructions || null);
      console.log(`   Custom instructions: ${customInstructions ? 'set' : 'none'}`);
    }

    if (highlightFeatures !== undefined) {
      updates.push(`highlight_features = $${paramIndex++}`);
      values.push(highlightFeatures || null);
      console.log(`   Highlight features: ${highlightFeatures ? 'set' : 'none'}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No settings provided',
        message: 'Provide at least one AI setting to update'
      });
    }

    values.push(campaignId);
    const queryText = `
      UPDATE campaigns 
      SET ${updates.join(', ')}
      WHERE campaign_id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    console.log('✅ AI settings updated successfully');

    res.json({
      success: true,
      message: 'AI settings updated successfully',
      campaign: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update AI settings',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/:campaignId/ai-settings
 * Get AI agent settings for a campaign
 */
router.get('/:campaignId/ai-settings', async (req, res) => {
  console.log(`⚙️  Fetching AI settings for campaign ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;

    const result = await query(
      `SELECT 
        campaign_id,
        campaign_name,
        auto_response_enabled,
        notification_email,
        minimum_price,
        negotiation_strategy,
        response_style,
        response_length,
        custom_instructions,
        highlight_features
       FROM campaigns 
       WHERE campaign_id = $1`,
      [campaignId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI settings',
      message: error.message
    });
  }
});

module.exports = router;
