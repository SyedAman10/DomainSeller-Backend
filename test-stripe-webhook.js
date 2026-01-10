#!/usr/bin/env node
/**
 * Stripe Webhook Test Script
 * 
 * Usage: node test-stripe-webhook.js
 */

require('dotenv').config();
const axios = require('axios');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testWebhook() {
  log('\n' + '='.repeat(60), 'bright');
  log('STRIPE WEBHOOK TEST', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  // Configuration
  const BACKEND_URL = process.env.BACKEND_URL || 'https://api.3vltn.com';
  const WEBHOOK_URL = `${BACKEND_URL}/stripe/webhook`;

  log(`→ Backend URL: ${BACKEND_URL}`, 'cyan');
  log(`→ Webhook URL: ${WEBHOOK_URL}`, 'cyan');
  log(`→ Webhook Secret: ${process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Not Set'}`, 'cyan');
  log('');

  // Test 1: Check if webhook endpoint is accessible
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
  log('TEST 1: Webhook Endpoint Accessibility', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');

  try {
    const response = await axios.post(WEBHOOK_URL, {
      test: true
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // Accept any status
    });

    log(`✓ Endpoint is reachable`, 'green');
    log(`  Status: ${response.status}`);
    log(`  Response: ${response.data || response.statusText}`);
    
    if (response.status === 400 && response.data.includes('No signatures found')) {
      log(`  ✅ This is expected! Webhook is working but rejecting unsigned requests`, 'green');
    }
  } catch (error) {
    log(`✗ Endpoint not reachable!`, 'red');
    log(`  Error: ${error.message}`, 'red');
    return;
  }

  log('');

  // Test 2: Check database for recent payments
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
  log('TEST 2: Database Check', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');

  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check stripe_payments
    const payments = await pool.query(
      `SELECT id, payment_link_id, buyer_email, domain_name, amount, status, created_at 
       FROM stripe_payments 
       ORDER BY created_at DESC 
       LIMIT 3`
    );

    log(`\n→ Recent Payments (${payments.rows.length}):`);
    if (payments.rows.length > 0) {
      payments.rows.forEach((p, i) => {
        log(`\n  ${i + 1}. Payment ID: ${p.id}`, 'cyan');
        log(`     Domain: ${p.domain_name}`);
        log(`     Buyer: ${p.buyer_email}`);
        log(`     Amount: $${p.amount}`);
        log(`     Status: ${p.status}`, p.status === 'completed' ? 'green' : 'yellow');
        log(`     Payment Link: ${p.payment_link_id || 'N/A'}`);
        log(`     Created: ${new Date(p.created_at).toLocaleString()}`);
      });
    } else {
      log(`  ⚠ No payments found in database`, 'yellow');
    }

    // Check stripe_approvals
    const approvals = await pool.query(
      `SELECT id, buyer_email, domain_name, amount, status, created_at, approved_at 
       FROM stripe_approvals 
       ORDER BY created_at DESC 
       LIMIT 3`
    );

    log(`\n→ Recent Approvals (${approvals.rows.length}):`);
    if (approvals.rows.length > 0) {
      approvals.rows.forEach((a, i) => {
        log(`\n  ${i + 1}. Approval ID: ${a.id}`, 'cyan');
        log(`     Domain: ${a.domain_name}`);
        log(`     Buyer: ${a.buyer_email}`);
        log(`     Amount: $${a.amount}`);
        log(`     Status: ${a.status}`, a.status === 'approved' ? 'green' : 'yellow');
        log(`     Created: ${new Date(a.created_at).toLocaleString()}`);
        if (a.approved_at) {
          log(`     Approved: ${new Date(a.approved_at).toLocaleString()}`);
        }
      });
    } else {
      log(`  ⚠ No approvals found in database`, 'yellow');
    }

  } catch (error) {
    log(`✗ Database query failed!`, 'red');
    log(`  Error: ${error.message}`, 'red');
  } finally {
    await pool.end();
  }

  log('');

  // Test 3: Create a test approval
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
  log('TEST 3: Create Test Approval', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');

  const pool2 = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const testApproval = await pool2.query(
      `INSERT INTO stripe_approvals (
        campaign_id, 
        buyer_email, 
        buyer_name, 
        domain_name, 
        amount, 
        currency, 
        seller_email,
        seller_name,
        user_id,
        status
      ) VALUES (
        'test_campaign_${Date.now()}',
        'test-buyer@example.com',
        'Test Buyer',
        'test-domain-${Date.now()}.com',
        99.99,
        'USD',
        'seller@example.com',
        'Test Seller',
        1,
        'pending'
      ) RETURNING id`,
      []
    );

    const approvalId = testApproval.rows[0].id;
    log(`\n✓ Test approval created!`, 'green');
    log(`  Approval ID: ${approvalId}`, 'cyan');
    log(`\n→ Next steps:`, 'yellow');
    log(`  1. Approve it by visiting:`, 'yellow');
    log(`     ${BACKEND_URL}/backend/stripe/approvals/${approvalId}/approve`, 'bright');
    log(`\n  2. This will create a Stripe payment link`, 'yellow');
    log(`\n  3. Complete payment on that link`, 'yellow');
    log(`\n  4. Check if webhook fires by watching logs:`, 'yellow');
    log(`     pm2 logs node-backend --lines 50`, 'cyan');

  } catch (error) {
    log(`✗ Failed to create test approval!`, 'red');
    log(`  Error: ${error.message}`, 'red');
  } finally {
    await pool2.end();
  }

  log('\n');

  // Summary
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
  log('SUMMARY', 'bright');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'bright');
  
  log(`\n✓ Checks completed`, 'green');
  log(`\n→ To test complete flow:`, 'cyan');
  log(`  1. Visit approval link above`, 'cyan');
  log(`  2. Complete payment on Stripe link`, 'cyan');
  log(`  3. Watch logs: pm2 logs node-backend --lines 100`, 'cyan');
  log(`  4. You should see "STRIPE WEBHOOK RECEIVED"`, 'cyan');
  
  log('\n' + '='.repeat(60) + '\n', 'bright');
}

// Run the test
testWebhook().catch(error => {
  log('\n✗ Test failed!', 'red');
  log(`Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

