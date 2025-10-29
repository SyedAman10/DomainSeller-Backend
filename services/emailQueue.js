const cron = require('node-cron');
const { query } = require('../config/database');
const { sendEmail } = require('./emailService');

/**
 * Process scheduled emails that are due
 */
const processScheduledEmails = async () => {
  console.log('🔄 Processing scheduled emails...');
  
  try {
    // Get emails that are scheduled for now or earlier and not yet sent
    const result = await query(
      `SELECT 
        se.id,
        se.campaign_id,
        se.buyer_email,
        se.subject,
        se.body,
        se.scheduled_for,
        c.campaign_name
      FROM scheduled_emails se
      JOIN campaigns c ON se.campaign_id = c.campaign_id
      WHERE se.scheduled_for <= NOW()
        AND se.status = 'pending'
      ORDER BY se.scheduled_for ASC
      LIMIT 20`
    );

    if (result.rows.length === 0) {
      console.log('📭 No scheduled emails to process');
      return;
    }

    console.log(`📬 Found ${result.rows.length} scheduled emails to send`);

    for (const email of result.rows) {
      try {
        // Send email via Mailgun
        const emailResult = await sendEmail({
          to: email.buyer_email,
          subject: email.subject,
          html: email.body,
          tags: [`campaign-${email.campaign_id}`, 'scheduled']
        });

        // Update scheduled_emails status
        await query(
          `UPDATE scheduled_emails 
           SET status = 'sent', sent_at = NOW()
           WHERE id = $1`,
          [email.id]
        );

        // Insert into sent_emails table
        await query(
          `INSERT INTO sent_emails 
            (campaign_id, buyer_email, subject, body, sent_at, mailgun_id)
           VALUES ($1, $2, $3, $4, NOW(), $5)`,
          [
            email.campaign_id,
            email.buyer_email,
            email.subject,
            email.body,
            emailResult.messageId
          ]
        );

        console.log(`✅ Scheduled email sent: ${email.buyer_email}`);
      } catch (error) {
        console.error(`❌ Failed to send scheduled email to ${email.buyer_email}:`, error);
        
        // Update status to failed
        await query(
          `UPDATE scheduled_emails 
           SET status = 'failed', error_message = $1
           WHERE id = $2`,
          [error.message, email.id]
        );
      }
    }

    console.log('✅ Scheduled email processing complete');
  } catch (error) {
    console.error('❌ Error processing scheduled emails:', error);
  }
};

/**
 * Start the email queue processor
 */
const startEmailQueue = () => {
  // Run every 5 minutes (can be configured via env)
  const interval = process.env.QUEUE_CHECK_INTERVAL || '*/5 * * * *';
  
  cron.schedule(interval, async () => {
    await processScheduledEmails();
  });

  console.log(`📅 Email queue scheduled: ${interval}`);
  
  // Run once immediately on startup
  setTimeout(() => {
    processScheduledEmails();
  }, 5000);
};

module.exports = {
  startEmailQueue,
  processScheduledEmails
};

