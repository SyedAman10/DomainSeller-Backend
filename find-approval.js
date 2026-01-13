// Find pending approvals for theprimecrafters.com
require('dotenv').config();
const { query } = require('./config/database');

async function findApproval() {
  console.log('\n🔍 SEARCHING FOR APPROVAL\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Search for theprimecrafters.com approvals
    const result = await query(`
      SELECT 
        id, 
        domain_name, 
        buyer_email, 
        buyer_name,
        amount,
        status,
        created_at
      FROM stripe_approvals
      WHERE domain_name = 'theprimecrafters.com'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No approvals found for theprimecrafters.com');
      console.log('\n💡 Creating a new approval...\n');
      
      // Get user
      const userResult = await query(`
        SELECT id, email, username FROM users
        WHERE stripe_account_id IS NOT NULL
        LIMIT 1
      `);
      
      if (userResult.rows.length === 0) {
        console.log('❌ No users with Stripe found');
        process.exit(1);
      }
      
      const user = userResult.rows[0];
      
      // Create new approval
      const newApproval = await query(`
        INSERT INTO stripe_approvals (
          user_id, campaign_id, seller_email, seller_name,
          domain_name, amount, currency, buyer_email, buyer_name,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW(), NOW())
        RETURNING *
      `, [
        user.id, null, user.email, user.username,
        'theprimecrafters.com', 2500, 'USD',
        'aman@erptechnicals.com', 'aman'
      ]);
      
      console.log('✅ New approval created!');
      console.log(`   ID: ${newApproval.rows[0].id}`);
      console.log(`   Domain: ${newApproval.rows[0].domain_name}`);
      console.log(`   Amount: $${newApproval.rows[0].amount}`);
      console.log(`\n🔗 Approval URL:`);
      console.log(`   https://api.3vltn.com/backend/stripe/approvals/${newApproval.rows[0].id}/approve\n`);
      
    } else {
      console.log(`✅ Found ${result.rows.length} approval(s):\n`);
      
      result.rows.forEach((approval, i) => {
        console.log(`${i + 1}. Approval ID: ${approval.id}`);
        console.log(`   Domain: ${approval.domain_name}`);
        console.log(`   Buyer: ${approval.buyer_name} (${approval.buyer_email})`);
        console.log(`   Amount: $${approval.amount}`);
        console.log(`   Status: ${approval.status}`);
        console.log(`   Created: ${approval.created_at}`);
        console.log(`\n   🔗 Approval URL:`);
        console.log(`   https://api.3vltn.com/backend/stripe/approvals/${approval.id}/approve\n`);
      });
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n💡 FRONTEND FIX NEEDED:\n');
    console.log('Your frontend button is sending "null" instead of the approval ID.');
    console.log('The button should construct the URL like:');
    console.log('`https://api.3vltn.com/backend/stripe/approvals/${approvalId}/approve`');
    console.log('\nMake sure your frontend code has access to the approval.id field!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

findApproval();

