#!/usr/bin/env node

/**
 * Update Referral System Benefits
 * 
 * This script updates the referral system to:
 * 1. Give referred users 10% discount
 * 2. Give referrers 10% lifetime commission
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateReferralBenefits() {
  console.log('\n' + '='.repeat(70));
  console.log('🔧 UPDATING REFERRAL SYSTEM BENEFITS');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Show current settings
    console.log('📊 Step 1: Current settings...');
    const current = await pool.query(`
      SELECT code, commission_rate, commission_type, bonus_type, bonus_value
      FROM referral_codes
      WHERE code IN ('SUPER2025', 'STARTER50', 'PRO30', 'WELCOME2025')
      ORDER BY code
    `);
    
    console.log('\nBefore:');
    current.rows.forEach(row => {
      console.log(`  ${row.code}: ${row.commission_rate}% ${row.commission_type}`);
    });
    console.log('');

    // Step 2: Apply updates
    console.log('🔧 Step 2: Applying updates...');
    const updateSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'update_referral_benefits.sql'),
      'utf8'
    );
    
    await pool.query(updateSQL);
    console.log('✅ Updates applied successfully\n');

    // Step 3: Show new settings
    console.log('📊 Step 3: New settings...');
    const after = await pool.query(`
      SELECT code, commission_rate, commission_type, bonus_type, bonus_value
      FROM referral_codes
      WHERE code IN ('SUPER2025', 'STARTER50', 'PRO30', 'WELCOME2025')
      ORDER BY code
    `);
    
    console.log('\nAfter:');
    after.rows.forEach(row => {
      console.log(`  ${row.code}: ${row.commission_rate}% ${row.commission_type}`);
    });
    console.log('');

    // Step 4: Check users with discount
    console.log('👥 Step 4: Users with referral discount...');
    const usersWithDiscount = await pool.query(`
      SELECT COUNT(*) as count
      FROM users 
      WHERE referral_discount_active = true
    `);
    console.log(`  Users with 10% discount: ${usersWithDiscount.rows[0].count}\n`);

    // Step 5: Examples
    console.log('='.repeat(70));
    console.log('✅ UPDATE COMPLETE!');
    console.log('='.repeat(70));
    console.log('');
    console.log('🎁 NEW REFERRAL BENEFITS:');
    console.log('');
    console.log('For the REFERRER (person sharing the code):');
    console.log('  ✅ 10% commission on every payment');
    console.log('  ✅ LIFETIME commission (as long as they stay subscribed)');
    console.log('  ✅ Example: They pay $29.99/month → You earn $3.00/month FOREVER');
    console.log('');
    console.log('For the REFERRED USER (person using the code):');
    console.log('  ✅ 10% discount on their subscription');
    console.log('  ✅ Example: $29.99/month → Only pay $26.99/month');
    console.log('');
    console.log('📋 COMPLETE EXAMPLE:');
    console.log('  1. User signs up with your code ASDATR4365');
    console.log('  2. They subscribe to Professional plan ($29.99/month)');
    console.log('  3. They pay: $26.99/month (10% off)');
    console.log('  4. You earn: $2.70/month (10% of what they pay)');
    console.log('  5. They stay for 12 months → You earned $32.40 total');
    console.log('  6. They stay for 2 years → You earned $64.80 total');
    console.log('  7. This continues FOREVER as long as they stay!');
    console.log('');
    console.log('💰 POTENTIAL EARNINGS:');
    console.log('  Refer 10 people on $29.99 plan:');
    console.log('    → $27.00/month passive income');
    console.log('    → $324/year');
    console.log('    → $3,240 over 10 years (if they all stay)');
    console.log('');
    console.log('  Refer 100 people on $29.99 plan:');
    console.log('    → $270/month passive income');
    console.log('    → $3,240/year');
    console.log('    → $32,400 over 10 years!');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the update
updateReferralBenefits()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

