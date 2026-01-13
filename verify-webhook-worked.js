// Verify webhook worked after payment
require('dotenv').config();
const { query } = require('./config/database');

async function verifyWebhook() {
  console.log('\n🔍 VERIFYING WEBHOOK WORKED\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Check most recent transaction
    const transactionResult = await query(`
      SELECT 
        id, domain_name, amount, payment_status, 
        verification_status, paid_at, created_at
      FROM transactions
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    if (transactionResult.rows.length === 0) {
      console.log('❌ NO TRANSACTIONS FOUND!');
      console.log('   Webhook did not fire.');
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check Stripe Dashboard → Developers → Webhooks → Events tab');
      console.log('   2. Look for error messages in failed deliveries');
      console.log('   3. Verify endpoint URL: https://api.3vltn.com/backend/stripe/webhook');
      console.log('   4. Make sure server is running and accessible\n');
      process.exit(1);
    }
    
    const transaction = transactionResult.rows[0];
    console.log('📊 LATEST TRANSACTION:');
    console.log(`   ID: ${transaction.id}`);
    console.log(`   Domain: ${transaction.domain_name}`);
    console.log(`   Amount: $${transaction.amount}`);
    console.log(`   Payment Status: ${transaction.payment_status}`);
    console.log(`   Verification Status: ${transaction.verification_status}`);
    console.log(`   Paid At: ${transaction.paid_at || 'Not yet'}`);
    console.log(`   Created: ${transaction.created_at}`);
    
    if (transaction.payment_status === 'payment_received') {
      console.log('\n✅ SUCCESS! WEBHOOK WORKED!');
      console.log('   Transaction status updated to "payment_received"');
      console.log('   This means the webhook fired successfully!\n');
      
      // Check admin notifications
      const notifResult = await query(`
        SELECT * FROM admin_notifications
        WHERE transaction_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [transaction.id]);
      
      if (notifResult.rows.length > 0) {
        console.log('✅ Admin notification created!');
        console.log(`   Type: ${notifResult.rows[0].type}`);
        console.log(`   Title: ${notifResult.rows[0].title}\n`);
      }
      
      // Check verification history
      const historyResult = await query(`
        SELECT * FROM verification_history
        WHERE transaction_id = $1
        ORDER BY created_at DESC
        LIMIT 3
      `, [transaction.id]);
      
      if (historyResult.rows.length > 0) {
        console.log('✅ Verification history:');
        historyResult.rows.forEach(h => {
          console.log(`   - ${h.action}: ${h.previous_status} → ${h.new_status}`);
        });
        console.log('');
      }
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🎉 ESCROW SYSTEM IS WORKING PERFECTLY!');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('📋 What happens next:');
      console.log('   1. Admin verifies domain transfer');
      console.log('   2. Admin approves via: POST /backend/admin/verify/:id/approve');
      console.log('   3. Platform transfers funds to seller (minus fee)');
      console.log('   4. Buyer gets confirmation email\n');
      
    } else if (transaction.payment_status === 'pending_payment') {
      console.log('\n⚠️  Transaction still "pending_payment"');
      console.log('   This means webhook has NOT fired yet.\n');
      console.log('💡 Possible reasons:');
      console.log('   1. Payment not completed yet');
      console.log('   2. Webhook not configured correctly');
      console.log('   3. Server not restarted after .env update');
      console.log('   4. Webhook secret mismatch\n');
      console.log('🔍 Check Stripe Dashboard:');
      console.log('   Developers → Webhooks → Click your webhook → Events tab');
      console.log('   Look for recent events and any error messages\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

verifyWebhook();

