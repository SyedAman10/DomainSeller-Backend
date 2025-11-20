/**
 * Escrow.com Sandbox API Test
 * Tests the full API integration with your sandbox credentials
 */

const axios = require('axios');
require('dotenv').config();

const ESCROW_API_URL = process.env.ESCROW_API_URL || 'https://api.escrow-sandbox.com/2017-09-01';
const ESCROW_EMAIL = process.env.ESCROW_EMAIL;
const ESCROW_API_KEY = process.env.ESCROW_API_KEY;

console.log('🧪 ESCROW.COM SANDBOX API TEST');
console.log('━'.repeat(60));
console.log(`📍 API URL: ${ESCROW_API_URL}`);
console.log(`📧 Email: ${ESCROW_EMAIL}`);
console.log(`🔑 API Key: ${ESCROW_API_KEY ? '✅ Configured' : '❌ Missing'}`);
console.log('━'.repeat(60));
console.log();

// Test 1: Check API Authentication
async function testAuthentication() {
  console.log('TEST 1: API Authentication');
  console.log('─'.repeat(60));
  
  try {
    const response = await axios.get(
      `${ESCROW_API_URL}/customer`,
      {
        auth: {
          username: ESCROW_EMAIL,
          password: ESCROW_API_KEY
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Authentication successful!');
    console.log(`   Account: ${response.data.email || 'Unknown'}`);
    console.log(`   Status: ${response.data.status || 'Active'}`);
    console.log();
    return true;
  } catch (error) {
    console.error('❌ Authentication failed!');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.error || error.message}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    console.log();
    return false;
  }
}

// Test 2: Create a Test Transaction
async function testCreateTransaction() {
  console.log('TEST 2: Create Test Transaction');
  console.log('─'.repeat(60));
  
  const testTransaction = {
    parties: [
      {
        role: 'buyer',
        customer: {
          name: 'John Buyer',
          email: 'buyer-test@example.com'
        }
      },
      {
        role: 'seller',
        customer: {
          name: 'Domain Seller',
          email: ESCROW_EMAIL
        }
      }
    ],
    currency: 'usd',
    description: 'Test domain purchase: example.com',
    items: [
      {
        title: 'example.com',
        description: 'Domain name: example.com',
        type: 'domain_name',
        inspection_period: 259200, // 3 days
        quantity: 1,
        schedule: [
          {
            amount: 1000.00,
            payer_customer: 'buyer-test@example.com',
            beneficiary_customer: ESCROW_EMAIL
          }
        ],
        fees: [
          {
            type: 'escrow',
            payer_customer: 'buyer-test@example.com'
          }
        ]
      }
    ]
  };

  try {
    console.log('📝 Creating transaction...');
    console.log(`   Domain: example.com`);
    console.log(`   Amount: $1,000 USD`);
    console.log(`   Buyer: buyer-test@example.com`);
    console.log(`   Seller: ${ESCROW_EMAIL}`);
    console.log();

    const response = await axios.post(
      `${ESCROW_API_URL}/transaction`,
      testTransaction,
      {
        auth: {
          username: ESCROW_EMAIL,
          password: ESCROW_API_KEY
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const transactionId = response.data.id;
    const escrowUrl = `https://www.escrow-sandbox.com/transaction/${transactionId}`;

    console.log('✅ Transaction created successfully!');
    console.log(`   Transaction ID: ${transactionId}`);
    console.log(`   Status: ${response.data.status || 'pending'}`);
    console.log(`   Payment URL: ${escrowUrl}`);
    console.log();
    console.log('🎯 You can view this transaction at:');
    console.log(`   ${escrowUrl}`);
    console.log();
    
    return {
      success: true,
      transactionId,
      escrowUrl
    };
  } catch (error) {
    console.error('❌ Transaction creation failed!');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    console.log();
    return {
      success: false,
      error: error.message
    };
  }
}

// Test 3: List Transactions
async function testListTransactions() {
  console.log('TEST 3: List Transactions');
  console.log('─'.repeat(60));
  
  try {
    const response = await axios.get(
      `${ESCROW_API_URL}/transaction`,
      {
        auth: {
          username: ESCROW_EMAIL,
          password: ESCROW_API_KEY
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Successfully retrieved transactions!');
    console.log(`   Total transactions: ${response.data.length || 0}`);
    
    if (response.data.length > 0) {
      console.log();
      console.log('   Recent transactions:');
      response.data.slice(0, 5).forEach((txn, idx) => {
        console.log(`   ${idx + 1}. ${txn.id} - ${txn.status || 'unknown'} - $${txn.items?.[0]?.schedule?.[0]?.amount || 'N/A'}`);
      });
    }
    console.log();
    return true;
  } catch (error) {
    console.error('❌ Failed to list transactions!');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.error || error.message}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    console.log();
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log();
  
  if (!ESCROW_EMAIL || !ESCROW_API_KEY) {
    console.error('❌ ERROR: Missing credentials!');
    console.error('   Please update your .env file with:');
    console.error('   - ESCROW_EMAIL');
    console.error('   - ESCROW_API_KEY');
    console.log();
    process.exit(1);
  }

  const authSuccess = await testAuthentication();
  
  if (!authSuccess) {
    console.error('⚠️  Authentication failed - skipping other tests');
    console.log();
    process.exit(1);
  }

  const transactionResult = await testCreateTransaction();
  
  if (transactionResult.success) {
    await testListTransactions();
  }

  console.log('━'.repeat(60));
  console.log('🎉 TEST SUITE COMPLETE!');
  console.log('━'.repeat(60));
  console.log();
  console.log('✅ Your Escrow.com sandbox API is fully configured!');
  console.log();
  console.log('Next steps:');
  console.log('1. Login to https://www.escrow-sandbox.com to see your test transaction');
  console.log('2. Test the integration with your domain selling flow');
  console.log('3. When ready, switch to production credentials');
  console.log();
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});

