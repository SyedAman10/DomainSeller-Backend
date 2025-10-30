/**
 * Delete All Campaigns from Database
 * WARNING: This will delete ALL campaigns and their associated data
 */

require('dotenv').config();
const { query } = require('./config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function deleteAllCampaigns() {
  try {
    console.log('\n⚠️  WARNING: This will delete ALL campaigns from the database!\n');

    // Show current campaigns
    const campaigns = await query('SELECT id, campaign_id, campaign_name, domain_name, status FROM campaigns ORDER BY id');
    
    if (campaigns.rows.length === 0) {
      console.log('✅ No campaigns found in database.\n');
      rl.close();
      process.exit(0);
    }

    console.log(`Found ${campaigns.rows.length} campaign(s):\n`);
    campaigns.rows.forEach(c => {
      console.log(`  ${c.id}. ${c.campaign_name} (${c.domain_name}) - ${c.status}`);
    });
    console.log('');

    // Ask for confirmation
    rl.question('❓ Are you sure you want to delete ALL campaigns? Type "DELETE ALL" to confirm: ', async (answer) => {
      if (answer === 'DELETE ALL') {
        console.log('\n🗑️  Deleting all campaigns...\n');

        try {
          // Delete campaigns (associated records will be handled by DB cascade rules)
          const result = await query('DELETE FROM campaigns RETURNING *');
          
          console.log(`✅ Successfully deleted ${result.rows.length} campaign(s)!\n`);
          
          // Show what was deleted
          console.log('Deleted campaigns:');
          result.rows.forEach(c => {
            console.log(`  - ${c.campaign_name} (${c.domain_name})`);
          });
          console.log('');

          // Check for orphaned scheduled_emails (if no cascade)
          const orphanedScheduled = await query('SELECT COUNT(*) as count FROM scheduled_emails WHERE campaign_id NOT IN (SELECT campaign_id FROM campaigns)');
          if (parseInt(orphanedScheduled.rows[0].count) > 0) {
            console.log(`⚠️  Found ${orphanedScheduled.rows[0].count} orphaned scheduled_emails`);
            console.log('   Run: DELETE FROM scheduled_emails WHERE campaign_id NOT IN (SELECT campaign_id FROM campaigns)\n');
          }

          // Check for orphaned sent_emails (if no cascade)
          const orphanedSent = await query('SELECT COUNT(*) as count FROM sent_emails WHERE campaign_id NOT IN (SELECT campaign_id FROM campaigns)');
          if (parseInt(orphanedSent.rows[0].count) > 0) {
            console.log(`⚠️  Found ${orphanedSent.rows[0].count} orphaned sent_emails`);
            console.log('   Run: DELETE FROM sent_emails WHERE campaign_id NOT IN (SELECT campaign_id FROM campaigns)\n');
          }

        } catch (error) {
          console.error('❌ Error deleting campaigns:', error.message);
        }
      } else {
        console.log('\n❌ Deletion cancelled. No campaigns were deleted.\n');
      }
      
      rl.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Run the script
console.log('🔌 Connecting to database...');
deleteAllCampaigns();

