// Complete Stripe Webhook Test Script
require('dotenv').config();
const crypto = require('crypto');
const fetch = require('node-fetch');

const WEBHOOK_SECRET = 'whsec_jZ3qbImyaOeZsojRF7jE6N2crAfbeKkz'; // From Stripe Dashboard
const WEBHOOK_URL = 'https://api.3vltn.com/backend/stripe/webhook';

// Create a test checkout.session.completed event
function createTestWebhookPayload() {
  return {
    id: 'evt_test_' + Date.now(),
    object: 'event',
    api_version: '2025-04-30.basil',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'cs_test_' + Date.now(),
        object: 'checkout.session',
        amount_total: 250000, // $2,500 in cents
        currency: 'usd',
        customer_details: {
          email: 'buyer@example.com',
          name: 'Test Buyer'
        },
        payment_intent: 'pi_test_' + Date.now(),
        payment_link: 'plink_test_123',
        payment_status: 'paid',
        status: 'complete',
        metadata: {
          domain: 'theprimecrafters.com',
          campaignId: null,
          userId: '1',
          buyerEmail: 'buyer@example.com',
          buyerName: 'Test Buyer',
          sellerStripeAccountId: 'acct_test',
          platformFee: '250.00',
          sellerPayout: '2250.00',
          escrow: 'true' // THIS IS KEY!
        }
      }
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null
    },
    type: 'checkout.session.completed'
  };
}

// Sign the payload like Stripe does
function signPayload(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  
  return {
    signature: `t=${timestamp},v1=${signature}`,
    payload: payloadString
  };
}

async function testWebhook() {
  console.log('🧪 STRIPE WEBHOOK TEST SCRIPT');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Check if endpoint is accessible
    console.log('1️⃣ Testing endpoint accessibility...');
    try {
      const testResponse = await fetch(`${WEBHOOK_URL}/test`);
      const testData = await testResponse.json();
      console.log('✅ Endpoint is accessible:', testData.message);
    } catch (error) {
      console.log('⚠️  Test endpoint not found (this is okay)');
    }
    
    // Step 2: Create and sign webhook payload
    console.log('\n2️⃣ Creating test webhook payload...');
    const payload = createTestWebhookPayload();
    console.log('✅ Payload created:');
    console.log('   Event Type:', payload.type);
    console.log('   Payment Intent:', payload.data.object.payment_intent);
    console.log('   Escrow Metadata:', payload.data.object.metadata.escrow);
    console.log('   Domain:', payload.data.object.metadata.domain);
    console.log('   Amount:', `$${payload.data.object.amount_total / 100}`);
    
    // Step 3: Sign the payload
    console.log('\n3️⃣ Signing payload with webhook secret...');
    const { signature, payload: payloadString } = signPayload(payload, WEBHOOK_SECRET);
    console.log('✅ Signature created:', signature.substring(0, 50) + '...');
    
    // Step 4: Send to webhook endpoint
    console.log('\n4️⃣ Sending webhook to:', WEBHOOK_URL);
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature
      },
      body: payloadString
    });
    
    console.log('📨 Response Status:', response.status, response.statusText);
    
    // Step 5: Check response
    if (response.ok) {
      const responseData = await response.json();
      console.log('✅ Webhook Response:', responseData);
      
      // Step 6: Wait and check database
      console.log('\n5️⃣ Waiting 2 seconds for database update...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('\n6️⃣ Checking database for transaction update...');
      const { query } = require('./config/database');
      
      const result = await query(`
        SELECT 
          id,
          domain_name,
          amount,
          payment_status,
          verification_status,
          stripe_payment_intent_id,
          paid_at
        FROM transactions
        WHERE domain_name = 'theprimecrafters.com'
        ORDER BY id DESC
        LIMIT 1
      `);
      
      if (result.rows.length > 0) {
        const tx = result.rows[0];
        console.log('\n✅ TRANSACTION FOUND:');
        console.log('   ID:', tx.id);
        console.log('   Domain:', tx.domain_name);
        console.log('   Amount:', `$${tx.amount}`);
        console.log('   Payment Status:', tx.payment_status);
        console.log('   Verification Status:', tx.verification_status);
        console.log('   Payment Intent:', tx.stripe_payment_intent_id);
        console.log('   Paid At:', tx.paid_at);
        
        if (tx.verification_status === 'payment_received') {
          console.log('\n🎉 SUCCESS! Webhook processed correctly!');
          console.log('✅ Transaction marked as payment_received');
          console.log('✅ Escrow flow is working!');
        } else if (tx.verification_status === 'pending_payment') {
          console.log('\n⚠️  WARNING: Transaction still pending_payment');
          console.log('❌ Webhook was received but not processed as escrow');
          console.log('💡 Check server logs for errors');
        }
      } else {
        console.log('\n❌ No transaction found in database');
      }
      
      // Check notifications
      const notifications = await query(`
        SELECT * FROM admin_notifications
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      if (notifications.rows.length > 0) {
        console.log('\n✅ ADMIN NOTIFICATION CREATED:');
        console.log('   Type:', notifications.rows[0].type);
        console.log('   Title:', notifications.rows[0].title);
      } else {
        console.log('\n⚠️  No admin notification found');
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ Webhook Failed!');
      console.log('Response:', errorText);
      
      if (response.status === 400) {
        console.log('\n💡 Likely Causes:');
        console.log('1. Webhook secret mismatch');
        console.log('2. Signature verification failed');
        console.log('3. Check .env file has: STRIPE_WEBHOOK_SECRET=' + WEBHOOK_SECRET);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Test Complete!');
    console.log('\n📋 Summary:');
    console.log('- Webhook URL:', WEBHOOK_URL);
    console.log('- Webhook Secret:', WEBHOOK_SECRET.substring(0, 20) + '...');
    console.log('- Expected in .env: STRIPE_WEBHOOK_SECRET=' + WEBHOOK_SECRET);
    console.log('\n💡 Next Steps:');
    console.log('1. If webhook failed: Update .env with correct secret');
    console.log('2. If webhook succeeded: Check admin dashboard API');
    console.log('3. Test with real Stripe payment');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

// Run the test
testWebhook();

