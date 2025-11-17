/**
 * Test Escrow Integration
 * Quick test script to verify escrow functionality
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TEST_USER_ID = 12; // Change this to your user ID
const TEST_CAMPAIGN_ID = 'campaign_test'; // Change this to your campaign ID

console.log('🧪 TESTING ESCROW INTEGRATION');
console.log('═'.repeat(60));
console.log(`Base URL: ${BASE_URL}`);
console.log('');

async function runTests() {
  try {
    // Test 1: Connect Escrow Account
    console.log('📝 Test 1: Connect Escrow Account');
    console.log('─'.repeat(60));
    
    try {
      const connectResponse = await axios.post(`${BASE_URL}/backend/escrow/connect`, {
        userId: TEST_USER_ID,
        escrowEmail: 'test@example.com',
        escrowProvider: 'escrow.com'
      });
      
      console.log('✅ Connect escrow account:', connectResponse.data.success ? 'PASS' : 'FAIL');
      console.log('   Response:', JSON.stringify(connectResponse.data, null, 2));
    } catch (error) {
      console.log('⚠️  Connect test:', error.response?.data?.error || error.message);
    }
    console.log('');

    // Test 2: Check Escrow Status
    console.log('📝 Test 2: Check Escrow Status');
    console.log('─'.repeat(60));
    
    try {
      const statusResponse = await axios.get(`${BASE_URL}/backend/escrow/status/${TEST_USER_ID}`);
      
      console.log('✅ Check escrow status:', statusResponse.data.success ? 'PASS' : 'FAIL');
      console.log('   Enabled:', statusResponse.data.escrow.enabled);
      console.log('   Email:', statusResponse.data.escrow.email);
      console.log('   Provider:', statusResponse.data.escrow.provider);
    } catch (error) {
      console.log('⚠️  Status check:', error.response?.data?.error || error.message);
    }
    console.log('');

    // Test 3: Configure Campaign Escrow Settings
    console.log('📝 Test 3: Configure Campaign Escrow Settings');
    console.log('─'.repeat(60));
    
    try {
      const campaignResponse = await axios.put(
        `${BASE_URL}/backend/escrow/campaign/${TEST_CAMPAIGN_ID}/settings`,
        {
          escrowEnabled: true,
          escrowFeePayer: 'buyer',
          askingPrice: 5000
        }
      );
      
      console.log('✅ Configure campaign:', campaignResponse.data.success ? 'PASS' : 'FAIL');
      console.log('   Response:', JSON.stringify(campaignResponse.data.campaign, null, 2));
    } catch (error) {
      console.log('⚠️  Campaign config:', error.response?.data?.error || error.message);
    }
    console.log('');

    // Test 4: Get Campaign Transactions
    console.log('📝 Test 4: Get Campaign Transactions');
    console.log('─'.repeat(60));
    
    try {
      const transactionsResponse = await axios.get(
        `${BASE_URL}/backend/escrow/transactions/${TEST_CAMPAIGN_ID}`
      );
      
      console.log('✅ Get transactions:', transactionsResponse.data.success ? 'PASS' : 'FAIL');
      console.log('   Count:', transactionsResponse.data.count);
      if (transactionsResponse.data.count > 0) {
        console.log('   Latest:', transactionsResponse.data.transactions[0]);
      }
    } catch (error) {
      console.log('⚠️  Get transactions:', error.response?.data?.error || error.message);
    }
    console.log('');

    // Test 5: AI Intent Detection
    console.log('📝 Test 5: AI Intent Detection (Payment Keywords)');
    console.log('─'.repeat(60));
    
    const { analyzeBuyerIntent } = require('./services/aiAgent');
    
    const testMessages = [
      'How can I pay for this domain?',
      'Send me a payment link',
      'I\'m ready to buy',
      'What\'s the price?',
      'Just browsing'
    ];
    
    testMessages.forEach(msg => {
      const intent = analyzeBuyerIntent(msg);
      console.log(`Message: "${msg}"`);
      console.log(`  → Wants Payment Link: ${intent.wantsPaymentLink ? '✅' : '❌'}`);
      console.log(`  → Is Ready: ${intent.isReady ? '✅' : '❌'}`);
    });
    console.log('');

    // Summary
    console.log('═'.repeat(60));
    console.log('🎉 ESCROW INTEGRATION TEST COMPLETE');
    console.log('═'.repeat(60));
    console.log('');
    console.log('Next steps:');
    console.log('1. Update TEST_USER_ID and TEST_CAMPAIGN_ID in this file');
    console.log('2. Run: node setup-escrow.js (if not already run)');
    console.log('3. Test with real email: Send "How can I pay?" to a campaign');
    console.log('4. Check logs for escrow link generation');
    console.log('');
    console.log('📚 Read ESCROW_INTEGRATION_GUIDE.md for full details');
    console.log('');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error(error.stack);
  }
}

// Run tests
runTests();

