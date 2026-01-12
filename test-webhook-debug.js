// Test webhook endpoint accessibility
const fetch = require('node-fetch');

async function testWebhook() {
  console.log('🧪 Testing Stripe webhook endpoint...\n');
  
  try {
    // Test 1: Check if endpoint is accessible
    console.log('1️⃣ Testing endpoint accessibility...');
    const testResponse = await fetch('https://api.3vltn.com/backend/stripe/webhook/test');
    const testData = await testResponse.json();
    console.log('✅ Endpoint accessible:', testData);
    
    // Test 2: Check recent server logs via PM2
    console.log('\n2️⃣ Checking for webhook logs...');
    console.log('Run this command on your server:');
    console.log('pm2 logs node-bac --lines 100 | grep "WEBHOOK\\|webhook\\|Checkout"');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWebhook();

