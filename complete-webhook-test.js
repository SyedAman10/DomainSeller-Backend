// Complete end-to-end webhook test
require('dotenv').config();
const { query } = require('./config/database');

async function completeWebhookTest() {
  console.log('\n🧪 COMPLETE WEBHOOK TEST\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Verify configuration
    console.log('1️⃣ CONFIGURATION CHECK:');
    console.log(`   Webhook Secret: ${process.env.STRIPE_WEBHOOK_SECRET ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`   New Secret: whsec_hhg7qsAVVZxlx7QVPkEjgPx75N18yldQ`);
    console.log(`   Match: ${process.env.STRIPE_WEBHOOK_SECRET === 'whsec_hhg7qsAVVZxlx7QVPkEjgPx75N18yldQ' ? '✅ YES' : '❌ NO - UPDATE .ENV!'}`);
    
    if (process.env.STRIPE_WEBHOOK_SECRET !== 'whsec_hhg7qsAVVZxlx7QVPkEjgPx75N18yldQ') {
      console.log('\n❌ WEBHOOK SECRET MISMATCH!');
      console.log('   Update your .env file with:');
      console.log('   STRIPE_WEBHOOK_SECRET=whsec_hhg7qsAVVZxlx7QVPkEjgPx75N18yldQ');
      console.log('   Then restart your server!\n');
      process.exit(1);
    }
    
    // Step 2: Create new test approval
    console.log('\n2️⃣ CREATING TEST APPROVAL:');
    const userResult = await query(`
      SELECT id, username, email FROM users 
      WHERE stripe_account_id IS NOT NULL LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('   ❌ No users with Stripe found');
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    const timestamp = Date.now();
    
    const approvalResult = await query(`
      INSERT INTO stripe_approvals (
        user_id, campaign_id, seller_email, seller_name,
        domain_name, amount, currency, buyer_email, buyer_name,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW(), NOW())
      RETURNING *
    `, [
      user.id, null, user.email, user.username,
      `webhook-test-${timestamp}.com`, 50, 'USD',
      'test@webhook.com', 'Webhook Test Buyer'
    ]);
    
    const approval = approvalResult.rows[0];
    console.log(`   ✅ Approval ID: ${approval.id}`);
    console.log(`   ✅ Domain: ${approval.domain_name}`);
    console.log(`   ✅ Amount: $${approval.amount}`);
    
    // Step 3: Show approval URL
    console.log('\n3️⃣ APPROVAL URL:');
    const approvalUrl = `https://api.3vltn.com/backend/stripe/approvals/${approval.id}/approve`;
    console.log(`   ${approvalUrl}`);
    
    console.log('\n4️⃣ NEXT STEPS:');
    console.log('   1. Open the approval URL above');
    console.log('   2. Copy the Stripe payment link from response');
    console.log('   3. Open payment link in INCOGNITO window');
    console.log('   4. Complete payment with: 4242 4242 4242 4242');
    console.log('   5. After success, wait 5 seconds');
    console.log('   6. Run: node verify-webhook-worked.js');
    
    console.log('\n5️⃣ WHAT TO EXPECT:');
    console.log('   ✅ Payment completes in Stripe');
    console.log('   ✅ Webhook fires automatically');
    console.log('   ✅ Transaction status updates to "payment_received"');
    console.log('   ✅ Admin notification created');
    console.log('   ✅ Emails sent to buyer and seller');
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`\n🚀 READY TO TEST!\n`);
    console.log(`Open: ${approvalUrl}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

completeWebhookTest();

