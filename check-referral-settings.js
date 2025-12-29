const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkReferralSettings() {
  console.log('\n📊 REFERRAL SYSTEM COMMISSION STRUCTURE\n');
  console.log('='.repeat(60));
  
  // Check default settings
  const codes = await pool.query(`
    SELECT code, code_type, commission_rate, bonus_type, bonus_value, 
           bonus_plan, bonus_duration_days, description 
    FROM referral_codes 
    ORDER BY created_at DESC 
    LIMIT 10
  `);
  
  if (codes.rows.length > 0) {
    console.log('\n🎁 SPECIAL PROMO CODES:\n');
    codes.rows.forEach(row => {
      console.log(`Code: ${row.code} (${row.code_type})`);
      console.log(`  Commission Rate: ${row.commission_rate}%`);
      if (row.bonus_type) {
        console.log(`  Bonus: ${row.bonus_type} - ${row.bonus_value} (${row.bonus_plan || 'any plan'})`);
      }
      console.log(`  ${row.description}`);
      console.log('');
    });
  }
  
  // Check default commission rate for regular user codes
  console.log('='.repeat(60));
  console.log('\n💰 REGULAR USER REFERRAL CODES:\n');
  console.log('When users share their personal referral code (like ASDATR4365):');
  console.log('');
  
  // Default is 10% based on the schema
  console.log('  Referrer Earns: 10% commission (default)');
  console.log('  Referred User Gets: No automatic bonus (unless you add one)');
  console.log('');
  console.log('Commission Types:');
  console.log('  • One-time: Commission on first payment only');
  console.log('  • Recurring: Commission on every subscription payment');
  console.log('  • Lifetime: Commission forever as long as they stay subscribed');
  console.log('');
  
  console.log('='.repeat(60));
  console.log('\n📋 EXAMPLE SCENARIOS:\n');
  console.log('1. Free → Starter ($9.99/month):');
  console.log('   → Referrer earns: $0.99/month (10% of $9.99)');
  console.log('');
  console.log('2. Free → Professional ($29.99/month):');
  console.log('   → Referrer earns: $3.00/month (10% of $29.99)');
  console.log('');
  console.log('3. Free → Enterprise ($99.99/month):');
  console.log('   → Referrer earns: $10.00/month (10% of $99.99)');
  console.log('');
  
  console.log('='.repeat(60) + '\n');
  
  await pool.end();
}

checkReferralSettings().catch(console.error);

