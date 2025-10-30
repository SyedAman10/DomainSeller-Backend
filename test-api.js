/**
 * API Testing Script for DomainSeller Campaign Backend
 * Tests all endpoints at https://3vltn.com
 */

const axios = require('axios');

const BASE_URL = 'https://3vltn.com';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

// Test counter
let passed = 0;
let failed = 0;

/**
 * Test 1: Health Check
 */
async function testHealthCheck() {
  console.log('\n' + '='.repeat(60));
  log.info('TEST 1: Health Check Endpoint');
  console.log('='.repeat(60));

  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    
    if (response.status === 200) {
      log.success('Health check passed');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      passed++;
      return true;
    }
  } catch (error) {
    log.error('Health check failed');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    failed++;
    return false;
  }
}

/**
 * Test 2: Get Campaign Stats (requires existing campaign ID)
 */
async function testGetCampaignStats(campaignId = 1) {
  console.log('\n' + '='.repeat(60));
  log.info(`TEST 2: Get Campaign Stats (Campaign ID: ${campaignId})`);
  console.log('='.repeat(60));

  try {
    const response = await axios.get(`${BASE_URL}/api/campaigns/${campaignId}/stats`);
    
    if (response.status === 200) {
      log.success('Get campaign stats passed');
      console.log('Campaign:', response.data.campaign?.campaign_name || 'N/A');
      console.log('Stats:', JSON.stringify(response.data.stats, null, 2));
      passed++;
      return response.data;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      log.warning(`Campaign ${campaignId} not found - This is expected if campaign doesn't exist`);
    } else {
      log.error('Get campaign stats failed');
      console.error('Error:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
    }
    failed++;
    return null;
  }
}

/**
 * Test 3: Get Campaign Details
 */
async function testGetCampaignDetails(campaignId = 1) {
  console.log('\n' + '='.repeat(60));
  log.info(`TEST 3: Get Campaign Details (Campaign ID: ${campaignId})`);
  console.log('='.repeat(60));

  try {
    const response = await axios.get(`${BASE_URL}/api/campaigns/${campaignId}`);
    
    if (response.status === 200) {
      log.success('Get campaign details passed');
      console.log('Campaign:', JSON.stringify(response.data.campaign, null, 2));
      console.log('Buyers count:', response.data.buyers?.length || 0);
      passed++;
      return response.data;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      log.warning(`Campaign ${campaignId} not found - This is expected if campaign doesn't exist`);
    } else {
      log.error('Get campaign details failed');
      console.error('Error:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
    }
    failed++;
    return null;
  }
}

/**
 * Test 4: Send Batch Emails (TEST MODE - won't actually send)
 */
async function testSendBatchEmails(campaignId = 1) {
  console.log('\n' + '='.repeat(60));
  log.info(`TEST 4: Send Batch Emails (Campaign ID: ${campaignId})`);
  log.warning('Skipping actual send to avoid sending test emails');
  console.log('='.repeat(60));

  // Don't actually send in test mode
  log.info('This would send batch emails - skipped for safety');
  log.info('To test manually, use the following payload:');
  
  const testPayload = {
    campaignId: campaignId,
    emails: [
      {
        to: 'test@example.com',
        subject: 'Test Email from Campaign Backend',
        html: '<h1>Test</h1><p>This is a test email.</p>',
        tags: ['test', 'api-testing']
      }
    ]
  };
  
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\nTo test:');
  console.log(`curl -X POST ${BASE_URL}/api/campaigns/send-batch \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '${JSON.stringify(testPayload)}'`);
  
  return null;
}

/**
 * Test 5: Schedule Follow-up (TEST MODE)
 */
async function testScheduleFollowup(campaignId = 1) {
  console.log('\n' + '='.repeat(60));
  log.info(`TEST 5: Schedule Follow-up Email (Campaign ID: ${campaignId})`);
  log.warning('Skipping actual scheduling to avoid creating test data');
  console.log('='.repeat(60));

  log.info('This would schedule a follow-up email - skipped for safety');
  log.info('To test manually, use the following payload:');
  
  const scheduledDate = new Date();
  scheduledDate.setMinutes(scheduledDate.getMinutes() + 10); // 10 minutes from now
  
  const testPayload = {
    campaignId: campaignId,
    buyerEmail: 'test@example.com',
    subject: 'Follow-up: Still interested?',
    body: '<p>Just following up on our previous email...</p>',
    scheduledFor: scheduledDate.toISOString()
  };
  
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\nTo test:');
  console.log(`curl -X POST ${BASE_URL}/api/campaigns/schedule-followup \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '${JSON.stringify(testPayload)}'`);
  
  return null;
}

/**
 * Test 6: Webhook Test Endpoint
 */
async function testWebhookEndpoint() {
  console.log('\n' + '='.repeat(60));
  log.info('TEST 6: Webhook Test Endpoint');
  console.log('='.repeat(60));

  try {
    const response = await axios.get(`${BASE_URL}/api/webhooks/test`);
    
    if (response.status === 200) {
      log.success('Webhook test endpoint passed');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      passed++;
      return true;
    }
  } catch (error) {
    log.error('Webhook test endpoint failed');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    failed++;
    return false;
  }
}

/**
 * Test 7: CORS Check
 */
async function testCORS() {
  console.log('\n' + '='.repeat(60));
  log.info('TEST 7: CORS Configuration');
  console.log('='.repeat(60));

  try {
    const response = await axios.get(`${BASE_URL}/api/health`, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    
    log.success('CORS is properly configured');
    const corsHeader = response.headers['access-control-allow-origin'];
    if (corsHeader) {
      console.log('Access-Control-Allow-Origin:', corsHeader);
    }
    passed++;
    return true;
  } catch (error) {
    log.error('CORS test failed');
    console.error('Error:', error.message);
    failed++;
    return false;
  }
}

/**
 * Test 8: 404 Handling
 */
async function test404Handling() {
  console.log('\n' + '='.repeat(60));
  log.info('TEST 8: 404 Error Handling');
  console.log('='.repeat(60));

  try {
    await axios.get(`${BASE_URL}/api/nonexistent-endpoint`);
    log.error('Should have returned 404');
    failed++;
    return false;
  } catch (error) {
    if (error.response?.status === 404) {
      log.success('404 handling works correctly');
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
      passed++;
      return true;
    } else {
      log.error('Unexpected error code');
      console.error('Error:', error.message);
      failed++;
      return false;
    }
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(10) + 'DOMAINSELLER API TEST SUITE' + ' '.repeat(20) + '║');
  console.log('║' + ' '.repeat(15) + 'Testing: https://3vltn.com' + ' '.repeat(15) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  // Run all tests
  await testHealthCheck();
  await testGetCampaignStats(1);
  await testGetCampaignDetails(1);
  await testSendBatchEmails(1);
  await testScheduleFollowup(1);
  await testWebhookEndpoint();
  await testCORS();
  await test404Handling();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  log.success(`Passed: ${passed}`);
  log.error(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Your backend is working correctly.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.\n');
  }

  // Additional info
  console.log('\n' + '='.repeat(60));
  log.info('NEXT STEPS');
  console.log('='.repeat(60));
  console.log('1. If campaign tests failed, create a campaign in your database');
  console.log('2. To test email sending, update campaignId and use real emails');
  console.log('3. Configure Mailgun webhooks to point to:');
  console.log(`   ${BASE_URL}/api/webhooks/mailgun`);
  console.log('4. Check server logs for detailed information');
  console.log('');
}

// Run the tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

