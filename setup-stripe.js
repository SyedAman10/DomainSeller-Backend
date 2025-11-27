#!/usr/bin/env node
/**
 * Setup script for Stripe integration
 * Run this to add Stripe Connect support to your database
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
  ssl: (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL)?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function setupStripe() {
  console.log('🚀 Setting up Stripe integration...\n');

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'database', 'add_stripe_support.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Running migration: add_stripe_support.sql\n');

    // Execute SQL
    const result = await pool.query(sql);

    console.log('✅ Stripe integration setup complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Created/Updated:');
    console.log('   ✓ users table (added Stripe fields)');
    console.log('   ✓ stripe_payments table');
    console.log('   ✓ stripe_approvals table');
    console.log('   ✓ campaigns table (added Stripe settings)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 Next steps:');
    console.log('   1. Add Stripe keys to your .env file:');
    console.log('      STRIPE_SECRET_KEY=sk_test_...');
    console.log('      STRIPE_PUBLISHABLE_KEY=pk_test_...');
    console.log('      STRIPE_WEBHOOK_SECRET=whsec_...');
    console.log('      FRONTEND_URL=http://localhost:3000');
    console.log('');
    console.log('   2. Update your server.js to include Stripe routes');
    console.log('   3. Users can now connect their Stripe accounts!');
    console.log('');

  } catch (error) {
    console.error('❌ Error setting up Stripe:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupStripe();

