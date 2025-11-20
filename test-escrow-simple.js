/**
 * Simple Escrow.com API Test
 * Quick test to verify credentials and API access
 */

const axios = require('axios');
require('dotenv').config();

const ESCROW_API_URL = process.env.ESCROW_API_URL || 'https://api.escrow-sandbox.com/2017-09-01';
const ESCROW_EMAIL = process.env.ESCROW_EMAIL;
const ESCROW_API_KEY = process.env.ESCROW_API_KEY;

console.log('🔍 SIMPLE ESCROW API TEST\n');
console.log('Configuration:');
console.log(`  API URL: ${ESCROW_API_URL}`);
console.log(`  Email: ${ESCROW_EMAIL}`);
console.log(`  API Key: ${ESCROW_API_KEY ? ESCROW_API_KEY.substring(0, 10) + '...' : '❌ NOT SET'}`);
console.log();

if (!ESCROW_EMAIL || !ESCROW_API_KEY) {
  console.error('❌ ERROR: Missing credentials in .env file!');
  console.log();
  console.log('Please add to your .env file:');
  console.log('  ESCROW_API_URL=https://api.escrow-sandbox.com/2017-09-01');
  console.log('  ESCROW_EMAIL=3v0ltn@gmail.com');
  console.log('  ESCROW_API_KEY=4767_oaGfrPsQjh3PclmYUvK7bEhIpIlrdTaPdLylHz9DwrLZFtKi2h5I3pYzsUslqfTe');
  console.log();
  process.exit(1);
}

async function testAPI() {
  console.log('Testing API endpoint: /customer/me\n');
  
  try {
    // Create authorization header
    const auth = Buffer.from(`${ESCROW_EMAIL}:${ESCROW_API_KEY}`).toString('base64');
    
    console.log('🔐 Authorization header created');
    console.log(`   Basic ${auth.substring(0, 20)}...`);
    console.log();
    
    // Test 1: Using Authorization header
    console.log('📡 Attempting request with Authorization header...');
    try {
      const response1 = await axios.get(
        `${ESCROW_API_URL}/customer/me`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ SUCCESS with Authorization header!');
      console.log();
      console.log('Response:');
      console.log(JSON.stringify(response1.data, null, 2));
      return true;
    } catch (err1) {
      console.log(`❌ Failed with Authorization header: ${err1.response?.status || err1.message}`);
      console.log();
      
      // Test 2: Using axios auth option
      console.log('📡 Attempting request with axios auth...');
      try {
        const response2 = await axios.get(
          `${ESCROW_API_URL}/customer/me`,
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
        
        console.log('✅ SUCCESS with axios auth!');
        console.log();
        console.log('Response:');
        console.log(JSON.stringify(response2.data, null, 2));
        return true;
      } catch (err2) {
        console.log(`❌ Failed with axios auth: ${err2.response?.status || err2.message}`);
        console.log();
        
        // Show detailed error
        if (err2.response) {
          console.log('Response details:');
          console.log(`  Status: ${err2.response.status} ${err2.response.statusText}`);
          console.log(`  Headers:`, err2.response.headers);
          console.log(`  Data:`, err2.response.data);
        }
        console.log();
        
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

async function checkCredentials() {
  console.log('━'.repeat(60));
  console.log('CREDENTIAL VERIFICATION');
  console.log('━'.repeat(60));
  console.log();
  
  // Check if credentials look valid
  const issues = [];
  
  if (!ESCROW_EMAIL.includes('@')) {
    issues.push('❌ Email format looks invalid (missing @)');
  } else {
    console.log('✅ Email format looks valid');
  }
  
  if (ESCROW_API_KEY.length < 20) {
    issues.push('❌ API Key looks too short');
  } else {
    console.log('✅ API Key length looks valid');
  }
  
  if (!ESCROW_API_URL.includes('escrow')) {
    issues.push('❌ API URL doesn\'t look like Escrow.com');
  } else {
    console.log('✅ API URL looks valid');
  }
  
  console.log();
  
  if (issues.length > 0) {
    console.log('⚠️  Potential issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log();
  }
  
  console.log('━'.repeat(60));
  console.log();
}

async function run() {
  await checkCredentials();
  
  const success = await testAPI();
  
  console.log();
  console.log('━'.repeat(60));
  
  if (success) {
    console.log('✅ TEST PASSED - Your Escrow API is working!');
    console.log();
    console.log('Next steps:');
    console.log('1. Run the full test: npm run test:escrow');
    console.log('2. Start your server: npm start');
    console.log('3. Test with real transactions');
  } else {
    console.log('❌ TEST FAILED - Please check the following:');
    console.log();
    console.log('1. Verify your credentials at: https://www.escrow-sandbox.com');
    console.log('   - Login with: ' + ESCROW_EMAIL);
    console.log('   - Check Settings → API Access');
    console.log();
    console.log('2. Make sure your API key is active and not expired');
    console.log();
    console.log('3. Verify API access is enabled for your account');
    console.log();
    console.log('4. Try regenerating your API key in the sandbox portal');
    console.log();
    console.log('5. Contact Escrow.com support if issues persist:');
    console.log('   Email: api@escrow.com');
  }
  
  console.log('━'.repeat(60));
  console.log();
  
  process.exit(success ? 0 : 1);
}

run();

