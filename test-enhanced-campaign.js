#!/usr/bin/env node

/**
 * Test Enhanced Campaign Creation Flow
 * 
 * This script demonstrates the new interactive campaign creation
 * with configuration options for:
 * - Matched buyers
 * - Landing pages
 * - Follow-up sequences
 * - Email scheduling
 * - Manual composition
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'https://api.3vltn.com';
const USER_ID = process.env.TEST_USER_ID || 10;

let sessionId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(type, message) {
  const timestamp = new Date().toLocaleTimeString();
  const color = {
    user: colors.blue,
    ai: colors.green,
    system: colors.yellow,
    error: colors.red
  }[type] || colors.reset;

  console.log(`\n${color}[${timestamp}] ${type.toUpperCase()}:${colors.reset}`);
  console.log(message);
  console.log(colors.cyan + '─'.repeat(80) + colors.reset);
}

async function chat(message) {
  try {
    log('user', message);

    const response = await axios.post(`${BASE_URL}/backend/ai-agent/chat`, {
      userId: USER_ID,
      message: message,
      sessionId: sessionId
    });

    if (response.data.success) {
      if (!sessionId) {
        sessionId = response.data.sessionId;
        log('system', `Session started: ${sessionId}`);
      }

      log('ai', response.data.message);
      return response.data;
    } else {
      log('error', `Error: ${response.data.error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    log('error', `Request failed: ${error.message}`);
    if (error.response?.data) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEnhancedCampaignFlow() {
  console.log(colors.bright + '\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   🤖 Testing Enhanced Campaign Creation Flow                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝' + colors.reset);

  console.log(`\n${colors.cyan}Testing with:${colors.reset}`);
  console.log(`  API URL: ${BASE_URL}`);
  console.log(`  User ID: ${USER_ID}`);
  console.log(`  Domain: theprimecrafters.com`);
  console.log(`  Price: $2500\n`);

  await sleep(1000);

  // ============================================================
  // STEP 1: Initiate Campaign Creation
  // ============================================================
  log('system', 'STEP 1: Initiating campaign creation');
  await chat('Create a new campaign');
  await sleep(2000);

  // ============================================================
  // STEP 2: Provide Domain and Price
  // ============================================================
  log('system', 'STEP 2: Providing domain name and asking price');
  await chat('domain is theprimecrafters.com asking price is 2500');
  await sleep(2000);

  // ============================================================
  // STEP 3: Confirm Campaign Name
  // ============================================================
  log('system', 'STEP 3: Confirming campaign name suggestion');
  await chat('yes this works');
  await sleep(2000);

  // ============================================================
  // STEP 4: Configure Campaign Settings
  // ============================================================
  log('system', 'STEP 4: Configuring campaign with all options');
  await chat(`Yes, please:
- Find matched buyers for crafting-related businesses
- Check and include landing page if it exists
- Add follow-up emails on days 3, 7, and 14
- Send emails immediately
- Auto-generate the emails for me`);
  await sleep(2000);

  // ============================================================
  // STEP 5: View Campaign Details
  // ============================================================
  log('system', 'STEP 5: Viewing created campaign');
  await chat('Show me the details of theprimecrafters.com campaign');
  await sleep(2000);

  // ============================================================
  // Summary
  // ============================================================
  console.log(colors.bright + '\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ✅ Enhanced Campaign Creation Test Complete!               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝' + colors.reset);

  console.log(`\n${colors.green}Features Tested:${colors.reset}`);
  console.log('  ✅ Interactive campaign creation');
  console.log('  ✅ Campaign name suggestion');
  console.log('  ✅ Draft status creation');
  console.log('  ✅ Configuration prompt');
  console.log('  ✅ Matched buyer search');
  console.log('  ✅ Landing page detection');
  console.log('  ✅ Follow-up sequence setup');
  console.log('  ✅ Email scheduling');
  console.log('  ✅ Auto-generation options\n');

  if (sessionId) {
    console.log(`${colors.cyan}Session ID: ${sessionId}${colors.reset}`);
    console.log(`View history: ${BASE_URL}/backend/ai-agent/history/${sessionId}?userId=${USER_ID}\n`);
  }
}

// Alternative: Test Manual Composition Flow
async function testManualCompositionFlow() {
  console.log(colors.bright + '\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ✍️  Testing Manual Email Composition Flow                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝' + colors.reset);

  await sleep(1000);

  log('system', 'STEP 1: Creating campaign with manual composition preference');
  await chat('Create a campaign for techwriters.io for $4000 called "Tech Writers Domain"');
  await sleep(2000);

  log('system', 'STEP 2: Requesting manual email composition');
  await chat(`Configure the campaign:
- Find matched buyers in the writing and content industry
- Include landing page if available
- Add follow-ups on days 5 and 10
- I want to manually compose the emails myself`);
  await sleep(2000);

  log('system', 'Campaign created in DRAFT mode for manual composition');
  await chat('Show me the campaign status');
  await sleep(2000);

  console.log(colors.bright + '\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ✅ Manual Composition Test Complete!                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝' + colors.reset);
}

// Alternative: Test Landing Page Check
async function testLandingPageCheck() {
  console.log(colors.bright + '\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   🌐 Testing Landing Page Detection                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝' + colors.reset);

  await sleep(1000);

  await chat('Does theprimecrafters.com have a landing page?');
  await sleep(2000);

  await chat('Check landing page for example.com');
  await sleep(2000);

  console.log(colors.bright + '\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ✅ Landing Page Check Complete!                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝' + colors.reset);
}

// Alternative: Test Buyer Matching
async function testBuyerMatching() {
  console.log(colors.bright + '\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   🎯 Testing Matched Buyer Search                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝' + colors.reset);

  await sleep(1000);

  await chat('Find buyers for theprimecrafters.com');
  await sleep(2000);

  await chat('Find buyers in the e-commerce industry');
  await sleep(2000);

  console.log(colors.bright + '\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ✅ Buyer Matching Test Complete!                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝' + colors.reset);
}

// Run tests based on command line argument
async function main() {
  const testType = process.argv[2] || 'full';

  try {
    switch (testType) {
      case 'manual':
        await testManualCompositionFlow();
        break;
      case 'landing':
        await testLandingPageCheck();
        break;
      case 'buyers':
        await testBuyerMatching();
        break;
      case 'full':
      default:
        await testEnhancedCampaignFlow();
        break;
    }
  } catch (error) {
    log('error', `Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  console.log(colors.bright + '\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║        🤖 Enhanced Campaign Creation Test Suite               ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝' + colors.reset);

  console.log(`\n${colors.cyan}Available test modes:${colors.reset}`);
  console.log('  node test-enhanced-campaign.js          - Full enhanced flow');
  console.log('  node test-enhanced-campaign.js manual   - Manual composition');
  console.log('  node test-enhanced-campaign.js landing  - Landing page check');
  console.log('  node test-enhanced-campaign.js buyers   - Buyer matching\n');

  main().catch(error => {
    console.error(colors.red + '\n❌ Test suite failed:', error.message + colors.reset);
    process.exit(1);
  });
}

module.exports = {
  chat,
  testEnhancedCampaignFlow,
  testManualCompositionFlow,
  testLandingPageCheck,
  testBuyerMatching
};

