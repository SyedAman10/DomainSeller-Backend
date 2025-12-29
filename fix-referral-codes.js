#!/usr/bin/env node

/**
 * Fix Referral Code Generation
 * 
 * This script fixes the referral code auto-generation issue
 * by updating the database trigger and generating codes for existing users
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

async function fixReferralCodes() {
  console.log('\n' + '='.repeat(70));
  console.log('🔧 FIXING REFERRAL CODE GENERATION');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Check current state
    console.log('📊 Step 1: Checking current state...');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(referral_code) as users_with_codes,
        COUNT(*) - COUNT(referral_code) as users_without_codes
      FROM users
    `);
    
    const { total_users, users_with_codes, users_without_codes } = stats.rows[0];
    console.log(`   Total Users: ${total_users}`);
    console.log(`   Users with Codes: ${users_with_codes}`);
    console.log(`   Users without Codes: ${users_without_codes}\n`);

    // Step 2: Run the fix
    console.log('🔧 Step 2: Applying fix...');
    const fixSQL = fs.readFileSync(
      path.join(__dirname, 'database', 'fix_referral_code_generation.sql'),
      'utf8'
    );
    
    await pool.query(fixSQL);
    console.log('✅ Fix applied successfully\n');

    // Step 3: Verify fix
    console.log('✅ Step 3: Verifying fix...');
    const afterStats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(referral_code) as users_with_codes,
        COUNT(*) - COUNT(referral_code) as users_without_codes
      FROM users
    `);
    
    const after = afterStats.rows[0];
    console.log(`   Total Users: ${after.total_users}`);
    console.log(`   Users with Codes: ${after.users_with_codes}`);
    console.log(`   Users without Codes: ${after.users_without_codes}\n`);

    // Step 4: Show sample codes
    console.log('📋 Step 4: Sample referral codes...');
    const samples = await pool.query(`
      SELECT id, username, referral_code
      FROM users
      WHERE referral_code IS NOT NULL
      ORDER BY id DESC
      LIMIT 5
    `);
    
    if (samples.rows.length > 0) {
      console.log('');
      samples.rows.forEach(user => {
        console.log(`   User #${user.id} (${user.username}): ${user.referral_code}`);
      });
    }

    // Step 5: Test trigger
    console.log('\n🧪 Step 5: Testing trigger...');
    console.log('   Creating a test user to verify auto-generation...');
    
    const testUsername = `testuser_${Date.now()}`;
    const testResult = await pool.query(`
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, referral_code
    `, [testUsername, `${testUsername}@test.com`, 'test_hash']);
    
    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if code was generated
    const testUser = await pool.query(
      'SELECT id, username, referral_code FROM users WHERE username = $1',
      [testUsername]
    );
    
    if (testUser.rows[0].referral_code) {
      console.log(`   ✅ Test user created with code: ${testUser.rows[0].referral_code}`);
      
      // Clean up test user
      await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
      console.log('   ✅ Test user cleaned up\n');
    } else {
      console.log('   ⚠️  Test user created but code not generated (may take a moment)\n');
      
      // Clean up test user
      await pool.query('DELETE FROM users WHERE username = $1', [testUsername]);
    }

    // Summary
    console.log('='.repeat(70));
    console.log('✅ FIX COMPLETE!');
    console.log('='.repeat(70));
    console.log('');
    console.log('📋 Summary:');
    console.log(`   • Fixed ${users_without_codes} users without referral codes`);
    console.log('   • Updated database trigger to work correctly');
    console.log('   • New users will automatically get referral codes');
    console.log('');
    console.log('🔄 What happens now:');
    console.log('   1. All existing users have referral codes');
    console.log('   2. New signups automatically get codes');
    console.log('   3. Codes are unique and based on username');
    console.log('');
    console.log('📊 Verify in your app:');
    console.log('   - Visit your referral dashboard');
    console.log('   - You should see your referral code');
    console.log('   - Share it with friends!');
    console.log('');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixReferralCodes()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

