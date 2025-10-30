const cron = require('node-cron');
const { query } = require('../config/database');
const { sendEmail } = require('./emailService');

/**
 * Process scheduled emails that are due
 */
const processScheduledEmails = async () => {
  console.log('\n');
  console.log('════════════════════════════════════════════════════════════');
  console.log('🔄 SCHEDULED EMAIL PROCESSOR - RUNNING');
  console.log(`⏰ Current Time: ${new Date().toISOString()}`);
  console.log('════════════════════════════════════════════════════════════');
  
  try {
    // Get emails that are scheduled for now or earlier and not yet sent
    console.log('🔍 Querying database for scheduled emails...');
    console.log('   📋 Criteria: scheduled_for <= NOW() AND status = pending');
    
    const result = await query(
      `SELECT 
        se.id,
        se.campaign_id,
        se.buyer_email,
        se.email_subject,
        se.email_content,
        se.scheduled_for,
        se.user_id,
        se.buyer_id,
        se.buyer_name,
        se.domain_name,
        se.status,
        c.campaign_name,
        EXTRACT(EPOCH FROM (NOW() - se.scheduled_for)) as seconds_overdue
      FROM scheduled_emails se
      JOIN campaigns c ON se.campaign_id = c.campaign_id
      WHERE se.scheduled_for <= NOW()
        AND se.status = 'pending'
      ORDER BY se.scheduled_for ASC
      LIMIT 20`
    );

    console.log(`📊 Query Result: Found ${result.rows.length} emails to process`);

    if (result.rows.length === 0) {
      console.log('📭 No scheduled emails to process at this time');
      console.log('════════════════════════════════════════════════════════════\n');
      return;
    }

    console.log('\n📬 EMAILS TO PROCESS:');
    result.rows.forEach((email, index) => {
      const overdueMinutes = Math.floor(email.seconds_overdue / 60);
      console.log(`   ${index + 1}. ID: ${email.id} | To: ${email.buyer_email}`);
      console.log(`      Subject: "${email.email_subject}"`);
      console.log(`      Scheduled: ${email.scheduled_for}`);
      console.log(`      Overdue: ${overdueMinutes} minutes`);
      console.log(`      Campaign: ${email.campaign_name}`);
    });
    console.log('');

    let successCount = 0;
    let failCount = 0;

    for (const [index, email] of result.rows.entries()) {
      console.log('────────────────────────────────────────────────────────────');
      console.log(`📧 Processing Email ${index + 1}/${result.rows.length}`);
      console.log(`   ID: ${email.id}`);
      console.log(`   To: ${email.buyer_email}`);
      console.log(`   Subject: "${email.email_subject}"`);
      console.log('────────────────────────────────────────────────────────────');
      
      try {
        // Send email via Mailgun
        const emailResult = await sendEmail({
          to: email.buyer_email,
          subject: email.email_subject,
          html: email.email_content,
          tags: [`campaign-${email.campaign_id}`, 'scheduled', `email-${email.id}`]
        });

        console.log(`💾 Updating database records...`);
        
        // Update scheduled_emails status
        await query(
          `UPDATE scheduled_emails 
           SET status = 'sent', sent_at = NOW()
           WHERE id = $1`,
          [email.id]
        );
        console.log(`   ✅ Updated scheduled_emails: ID ${email.id} -> status = 'sent'`);

        // Insert into sent_emails table (or update if already exists)
        await query(
          `INSERT INTO sent_emails 
            (campaign_id, buyer_email, email_subject, email_content, sent_at, mailgun_message_id, user_id, buyer_id, buyer_name, domain_name, status)
           VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, 'sent')
           ON CONFLICT (user_id, campaign_id, buyer_id) 
           DO UPDATE SET
             sent_at = NOW(),
             mailgun_message_id = EXCLUDED.mailgun_message_id,
             email_subject = EXCLUDED.email_subject,
             email_content = EXCLUDED.email_content,
             status = 'sent'`,
          [
            email.campaign_id,
            email.buyer_email,
            email.email_subject,
            email.email_content,
            emailResult.messageId,
            email.user_id || 0,
            email.buyer_id || 'unknown',
            email.buyer_name || 'Unknown',
            email.domain_name || 'Unknown'
          ]
        );
        console.log(`   ✅ Inserted/Updated sent_emails table`);

        successCount++;
        console.log(`✅ SUCCESS! Email ID ${email.id} sent to ${email.buyer_email}`);
        console.log(`   📬 Mailgun Message ID: ${emailResult.messageId}`);
        
      } catch (error) {
        failCount++;
        console.log('');
        console.error('❌❌❌ FAILED TO SEND EMAIL ❌❌❌');
        console.error(`   Email ID: ${email.id}`);
        console.error(`   Recipient: ${email.buyer_email}`);
        console.error(`   Subject: "${email.email_subject}"`);
        console.error('');
        console.error('🔴 ERROR DETAILS:');
        console.error(`   Error Message: ${error.error || error.message}`);
        
        if (error.statusCode) {
          console.error(`   HTTP Status Code: ${error.statusCode}`);
        }
        
        if (error.details) {
          console.error(`   Full Error Details:`, JSON.stringify(error.details, null, 2));
        }
        
        console.error('');
        console.error('💡 POSSIBLE SOLUTIONS:');
        
        // Check for duplicate key error (database constraint)
        if (error.code === '23505' || (error.error && error.error.includes('duplicate key'))) {
          console.error('   ⚠️  DUPLICATE ENTRY: This email was already sent to this buyer in this campaign');
          console.error('   ✅ This has been handled - the existing record was updated');
          console.error('   💡 This is usually safe to ignore');
        } else if (error.statusCode === 403) {
          console.error('   1. Using sandbox domain? Add recipient to authorized list');
          console.error('   2. Visit: https://app.mailgun.com/app/sending/domains');
          console.error('   3. Or upgrade to a verified domain');
        } else if (error.statusCode === 401) {
          console.error('   1. Check MAILGUN_API_KEY in .env file');
          console.error('   2. Verify API key is correct in Mailgun dashboard');
        } else if (error.statusCode === 400) {
          console.error('   1. Check email address format');
          console.error('   2. Verify email content is valid');
        } else {
          console.error('   1. Check server logs for more details');
          console.error('   2. Verify database connection is working');
          console.error('   3. Check Mailgun account status');
        }
        
        console.error('');
        
        try {
          // Update status to failed with error message
          await query(
            `UPDATE scheduled_emails 
             SET status = 'failed'
             WHERE id = $1`,
            [email.id]
          );
          console.error(`💾 Updated database: Email ID ${email.id} marked as 'failed'`);
        } catch (dbError) {
          console.error(`❌ Failed to update database status:`, dbError.message);
        }
      }
      
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ SCHEDULED EMAIL PROCESSING COMPLETE');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📧 Total: ${result.rows.length}`);
    console.log('════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.log('');
    console.error('════════════════════════════════════════════════════════════');
    console.error('❌❌❌ CRITICAL ERROR IN EMAIL PROCESSOR ❌❌❌');
    console.error('════════════════════════════════════════════════════════════');
    console.error('Error Details:', error);
    console.error('Stack Trace:', error.stack);
    console.error('════════════════════════════════════════════════════════════\n');
  }
};

/**
 * Start the email queue processor
 */
const startEmailQueue = () => {
  // Run every 5 minutes (can be configured via env)
  const interval = process.env.QUEUE_CHECK_INTERVAL || '*/5 * * * *';
  
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('🚀 EMAIL QUEUE PROCESSOR - STARTING');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`📅 Cron Schedule: ${interval}`);
  console.log(`⏰ Interval: Every 5 minutes`);
  console.log(`🔄 First run: In 5 seconds`);
  console.log(`📧 Will check for scheduled emails and send automatically`);
  console.log('════════════════════════════════════════════════════════════\n');
  
  cron.schedule(interval, async () => {
    await processScheduledEmails();
  });
  
  // Run once immediately on startup
  setTimeout(() => {
    console.log('⏰ Initial email processor run starting...\n');
    processScheduledEmails();
  }, 5000);
};

module.exports = {
  startEmailQueue,
  processScheduledEmails
};

