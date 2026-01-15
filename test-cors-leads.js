/**
 * Test CORS and Lead Generation Endpoint
 * This script tests if the API is accessible from different origins
 */

const https = require('https');

async function testCORS() {
  console.log('\n🧪 Testing CORS and Lead Generation Endpoint\n');
  console.log('═'.repeat(70));

  const tests = [
    {
      name: 'Preflight OPTIONS Request',
      method: 'OPTIONS',
      origin: 'https://3vltn.com'
    },
    {
      name: 'Actual POST Request from 3vltn.com',
      method: 'POST',
      origin: 'https://3vltn.com',
      body: JSON.stringify({
        keyword: 'test companies',
        count: 2
      })
    },
    {
      name: 'POST Request without Origin',
      method: 'POST',
      origin: null,
      body: JSON.stringify({
        keyword: 'test companies',
        count: 2
      })
    }
  ];

  for (const test of tests) {
    console.log(`\n🔍 Test: ${test.name}`);
    console.log('─'.repeat(70));
    
    try {
      const result = await makeRequest(test);
      
      console.log('✅ Request succeeded');
      console.log(`   Status: ${result.statusCode}`);
      console.log('   CORS Headers:');
      console.log(`   - Access-Control-Allow-Origin: ${result.headers['access-control-allow-origin'] || 'NOT SET'}`);
      console.log(`   - Access-Control-Allow-Methods: ${result.headers['access-control-allow-methods'] || 'NOT SET'}`);
      console.log(`   - Access-Control-Allow-Headers: ${result.headers['access-control-allow-headers'] || 'NOT SET'}`);
      
      if (result.body && result.body.length < 500) {
        console.log(`   Response: ${result.body}`);
      }
      
    } catch (error) {
      console.log('❌ Request failed');
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✨ CORS Testing Complete\n');
}

function makeRequest(test) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.3vltn.com',
      port: 443,
      path: '/backend/leads/generate',
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // Add Origin header if specified
    if (test.origin) {
      options.headers['Origin'] = test.origin;
    }

    // For OPTIONS requests, add additional headers
    if (test.method === 'OPTIONS') {
      options.headers['Access-Control-Request-Method'] = 'POST';
      options.headers['Access-Control-Request-Headers'] = 'content-type';
    }

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // Send body for POST requests
    if (test.body) {
      req.write(test.body);
    }

    req.end();
  });
}

// Run tests
testCORS().catch(console.error);

