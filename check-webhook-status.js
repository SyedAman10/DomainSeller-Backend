// Quick webhook debugging script
require('dotenv').config();
const { query } = require('./config/database');

async function checkWebhookActivity() {
  console.log('🔍 Checking webhook activity and escrow transactions...\n');
  
  try {
    // Check recent transactions
    console.log('1️⃣ Recent Transactions:');
    const transactions = await query(`
      SELECT 
        id, 
        domain_name, 
        amount,
        payment_status,
        verification_status,
        created_at,
        paid_at
      FROM transactions 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (transactions.rows.length > 0) {
      console.log('✅ Found transactions:');
      transactions.rows.forEach(tx => {
        console.log(`   - ID: ${tx.id}, Domain: ${tx.domain_name}, Status: ${tx.verification_status}, Amount: $${tx.amount}`);
      });
    } else {
      console.log('❌ No transactions found in database');
    }
    
    // Check verification history
    console.log('\n2️⃣ Recent Verification History:');
    const history = await query(`
      SELECT 
        vh.action,
        vh.previous_status,
        vh.new_status,
        vh.created_at,
        t.domain_name
      FROM verification_history vh
      LEFT JOIN transactions t ON vh.transaction_id = t.id
      ORDER BY vh.created_at DESC
      LIMIT 10
    `);
    
    if (history.rows.length > 0) {
      console.log('✅ Found history:');
      history.rows.forEach(h => {
        console.log(`   - ${h.action}: ${h.previous_status} → ${h.new_status} (${h.domain_name})`);
      });
    } else {
      console.log('❌ No verification history found');
    }
    
    // Check admin notifications
    console.log('\n3️⃣ Recent Admin Notifications:');
    const notifications = await query(`
      SELECT type, title, created_at, is_read
      FROM admin_notifications
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (notifications.rows.length > 0) {
      console.log('✅ Found notifications:');
      notifications.rows.forEach(n => {
        console.log(`   - ${n.type}: ${n.title} [${n.is_read ? 'Read' : 'Unread'}]`);
      });
    } else {
      console.log('❌ No notifications found');
    }
    
    console.log('\n✅ Check complete!');
    console.log('\n💡 Next Steps:');
    console.log('1. If no transactions found: Webhook not being processed');
    console.log('2. Check server logs: pm2 logs node-bac --lines 200');
    console.log('3. Verify Stripe webhook secret is correct in .env');
    console.log('4. Test with new payment after deploying latest code');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

checkWebhookActivity();

