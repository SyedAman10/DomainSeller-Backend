// Manual webhook test
const fetch = require('node-fetch');

async function testWebhook() {
  console.log('🧪 Testing webhook by updating transaction manually...\n');
  
  const { query } = require('./config/database');
  
  try {
    // Simulate what webhook would do
    console.log('1️⃣ Simulating webhook processing...');
    
    const result = await query(`
      UPDATE transactions 
      SET 
        payment_status = 'paid',
        verification_status = 'payment_received',
        paid_at = NOW(),
        stripe_payment_intent_id = 'pi_test_manual',
        updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Transaction updated:', result.rows[0].domain_name);
      console.log('   Status:', result.rows[0].verification_status);
      
      // Add history
      await query(`
        INSERT INTO verification_history 
          (transaction_id, action, previous_status, new_status, notes, created_at)
         VALUES ($1, 'payment_received', 'pending_payment', 'payment_received', 'Manual test', NOW())
      `, [1]);
      
      // Add notification
      await query(`
        INSERT INTO admin_notifications 
          (type, title, message, transaction_id, priority, created_at)
         VALUES ('payment_received', 'Test Payment Received', 'Manual webhook test for ${result.rows[0].domain_name}', $1, 'high', NOW())
      `, [1]);
      
      console.log('✅ Verification history and notification added');
      console.log('\n💡 Now check your admin dashboard API:');
      console.log('   GET /backend/admin/verifications/pending');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

testWebhook();

