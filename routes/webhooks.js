const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verifyWebhookSignature } = require('../services/emailService');

/**
 * POST /api/webhooks/mailgun
 * Handle Mailgun webhook events
 * Events: delivered, opened, clicked, bounced, failed, unsubscribed, complained
 */
router.post('/mailgun', async (req, res) => {
  try {
    const signature = req.body.signature;
    const eventData = req.body['event-data'];

    // Verify Mailgun signature
    if (signature && signature.timestamp && signature.token && signature.signature) {
      const isValid = verifyWebhookSignature(
        signature.timestamp,
        signature.token,
        signature.signature
      );

      if (!isValid) {
        console.warn('⚠️ Invalid Mailgun webhook signature');
        return res.status(401).json({
          success: false,
          error: 'Invalid signature'
        });
      }
    }

    if (!eventData) {
      return res.status(400).json({
        success: false,
        error: 'No event data provided'
      });
    }

    const {
      event,
      recipient,
      message,
      timestamp,
      'user-variables': userVars
    } = eventData;

    console.log(`📧 Mailgun webhook: ${event} - ${recipient}`);

    // Find the sent email by Mailgun message ID
    const sentEmail = await query(
      `SELECT id, campaign_id FROM sent_emails 
       WHERE mailgun_id = $1 OR buyer_email = $2
       ORDER BY sent_at DESC LIMIT 1`,
      [message?.headers?.['message-id'], recipient]
    );

    if (sentEmail.rows.length === 0) {
      console.warn(`⚠️ Email not found for recipient: ${recipient}`);
      // Still return 200 to acknowledge receipt
      return res.status(200).json({
        success: true,
        message: 'Event received but email not found'
      });
    }

    const emailId = sentEmail.rows[0].id;
    const campaignId = sentEmail.rows[0].campaign_id;

    // Store event in email_responses table
    try {
      await query(
        `INSERT INTO email_responses 
          (email_id, campaign_id, event_type, recipient_email, event_timestamp, event_data)
         VALUES ($1, $2, $3, $4, to_timestamp($5), $6)
         ON CONFLICT (email_id, event_type) DO UPDATE
         SET event_timestamp = to_timestamp($5), event_data = $6`,
        [
          emailId,
          campaignId,
          event,
          recipient,
          timestamp,
          JSON.stringify(eventData)
        ]
      );

      // Update sent_emails status based on event
      if (event === 'delivered') {
        await query(
          `UPDATE sent_emails SET status = 'delivered' WHERE id = $1`,
          [emailId]
        );
      } else if (event === 'bounced' || event === 'failed') {
        await query(
          `UPDATE sent_emails SET status = 'bounced' WHERE id = $1`,
          [emailId]
        );
      }

      console.log(`✅ Webhook processed: ${event} for email ${emailId}`);
    } catch (error) {
      console.error('Error storing webhook event:', error);
      // Check if email_responses table might not exist
      if (error.message.includes('relation "email_responses" does not exist')) {
        console.warn('⚠️ email_responses table does not exist. Creating it...');
        
        // Try to create the table
        await query(`
          CREATE TABLE IF NOT EXISTS email_responses (
            id SERIAL PRIMARY KEY,
            email_id INTEGER REFERENCES sent_emails(id) ON DELETE CASCADE,
            campaign_id INTEGER,
            event_type VARCHAR(50) NOT NULL,
            recipient_email VARCHAR(255),
            event_timestamp TIMESTAMP,
            event_data JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(email_id, event_type)
          )
        `);
        
        console.log('✅ email_responses table created');
      }
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Error processing Mailgun webhook:', error);
    // Return 200 anyway to prevent Mailgun from retrying
    res.status(200).json({
      success: false,
      error: 'Failed to process webhook',
      message: error.message
    });
  }
});

/**
 * GET /api/webhooks/test
 * Test webhook endpoint
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

