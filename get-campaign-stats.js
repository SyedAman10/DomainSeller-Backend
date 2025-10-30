const { query } = require('./config/database');

(async () => {
  try {
    console.log('🔍 Fetching all campaigns with email statistics...\n');
    
    const result = await query(`
      SELECT 
        c.id,
        c.campaign_id,
        c.campaign_name,
        c.domain_name,
        c.user_id,
        c.status,
        c.created_at,
        c.total_emails_sent,
        c.total_emails_scheduled,
        (SELECT COUNT(*) FROM sent_emails se WHERE se.campaign_id = c.campaign_id) as actual_sent_count,
        (SELECT COUNT(*) FROM scheduled_emails sch WHERE sch.campaign_id = c.campaign_id AND sch.status = 'pending') as pending_count,
        (SELECT COUNT(*) FROM scheduled_emails sch WHERE sch.campaign_id = c.campaign_id AND sch.status = 'sent') as completed_count,
        (SELECT COUNT(*) FROM scheduled_emails sch WHERE sch.campaign_id = c.campaign_id AND sch.status = 'failed') as failed_count
      FROM campaigns c
      ORDER BY c.created_at DESC
    `);

    console.log('════════════════════════════════════════════════════════════');
    console.log(`📊 TOTAL CAMPAIGNS: ${result.rows.length}`);
    console.log('════════════════════════════════════════════════════════════\n');

    let totalSent = 0;
    let totalScheduled = 0;
    let totalPending = 0;
    let totalFailed = 0;

    result.rows.forEach((campaign, index) => {
      const actualSent = parseInt(campaign.actual_sent_count);
      const pending = parseInt(campaign.pending_count);
      const completed = parseInt(campaign.completed_count);
      const failed = parseInt(campaign.failed_count);
      
      totalSent += actualSent;
      totalPending += pending;
      totalScheduled += completed;
      totalFailed += failed;

      console.log(`${index + 1}. ${campaign.campaign_name}`);
      console.log(`   📋 Campaign ID: ${campaign.campaign_id}`);
      console.log(`   🆔 Database ID: ${campaign.id}`);
      console.log(`   🌐 Domain: ${campaign.domain_name}`);
      console.log(`   👤 User ID: ${campaign.user_id}`);
      console.log(`   📊 Status: ${campaign.status}`);
      console.log(`   📅 Created: ${new Date(campaign.created_at).toLocaleString()}`);
      console.log(`   📧 Emails:`);
      console.log(`      ✅ Sent: ${actualSent}`);
      console.log(`      ⏳ Pending: ${pending}`);
      console.log(`      ✔️  Completed Scheduled: ${completed}`);
      console.log(`      ❌ Failed: ${failed}`);
      console.log('');
    });

    console.log('════════════════════════════════════════════════════════════');
    console.log('📈 OVERALL STATISTICS');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`📧 Total Campaigns: ${result.rows.length}`);
    console.log(`✅ Total Emails Sent: ${totalSent}`);
    console.log(`⏳ Total Pending: ${totalPending}`);
    console.log(`✔️  Total Completed Scheduled: ${totalScheduled}`);
    console.log(`❌ Total Failed: ${totalFailed}`);
    console.log(`📊 Grand Total Emails: ${totalSent + totalPending + totalScheduled + totalFailed}`);
    console.log('════════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();

