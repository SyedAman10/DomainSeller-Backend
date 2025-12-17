const { Pool } = require('pg');
require('dotenv').config();

async function syncPayment() {
  console.log('🔄 Syncing payment status...\n');

  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Update pending payment to completed
    const result = await pool.query(`
      UPDATE stripe_payments 
      SET status = 'completed',
          updated_at = NOW()
      WHERE status = 'pending'
      RETURNING id, domain_name, amount, buyer_name, status
    `);

    if (result.rows.length > 0) {
      console.log('✅ Updated payments:\n');
      result.rows.forEach(p => {
        console.log(`   💰 ${p.domain_name} - $${p.amount} from ${p.buyer_name} → COMPLETED`);
      });
      console.log(`\n🎉 Total: ${result.rows.length} payment(s) synced!`);
    } else {
      console.log('ℹ️  No pending payments found to sync.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

syncPayment();

