/**
 * Test script for 3VLTN Chatbot API
 * Tests the complete flow: message → conversation → scoring
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/backend/chatbot`;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}\n${'='.repeat(60)}`),
};

// Test conversation scenarios
const testConversations = [
  {
    name: 'Hot Lead - Large Portfolio with High Pain',
    messages: [
      'What do you do?',
      'I have about 50 domains',
      'I\'m actively trying to sell them but struggling with renewals and finding buyers',
      'They range from $5000 to $20000 in value',
      'Yes, I need help with pricing too'
    ],
    expectedScore: 6, // Should be >= 4 for hot
    expectedClassification: 'hot'
  },
  {
    name: 'Warm Lead - Medium Portfolio',
    messages: [
      'Hi',
      'I have around 8 domains',
      'Just looking to start selling',
      'Mid-range value, nothing premium'
    ],
    expectedScore: 2, // Should be 2-3 for warm
    expectedClassification: 'warm'
  },
  {
    name: 'Cold Lead - Browsing Only',
    messages: [
      'Hello',
      'Just exploring options',
      'I only have one domain',
      'Not sure if I want to sell yet'
    ],
    expectedScore: 0, // Should be 0-1 for cold
    expectedClassification: 'cold'
  }
];

/**
 * Send a message to the chatbot
 */
async function sendMessage(message, sessionId = null, userEmail = null, userName = null) {
  try {
    const response = await axios.post(`${API_URL}/message`, {
      message,
      sessionId,
      userEmail,
      userName
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
}

/**
 * Score a conversation
 */
async function scoreConversation(sessionId) {
  try {
    const response = await axios.post(`${API_URL}/score`, {
      sessionId
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
}

/**
 * Get session details
 */
async function getSession(sessionId) {
  try {
    const response = await axios.get(`${API_URL}/session/${sessionId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
}

/**
 * Get all leads
 */
async function getLeads(classification = null) {
  try {
    let url = `${API_URL}/leads`;
    if (classification) {
      url += `?classification=${classification}`;
    }
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
}

/**
 * Delete a session
 */
async function deleteSession(sessionId) {
  try {
    const response = await axios.delete(`${API_URL}/session/${sessionId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
}

/**
 * Run a test conversation
 */
async function runConversation(testCase) {
  log.section(`Test: ${testCase.name}`);
  
  let sessionId = null;
  const userEmail = `test_${Date.now()}@example.com`;
  const userName = 'Test User';

  try {
    // Send each message in sequence
    for (let i = 0; i < testCase.messages.length; i++) {
      const message = testCase.messages[i];
      log.info(`Message ${i + 1}: "${message}"`);
      
      const result = await sendMessage(message, sessionId, userEmail, userName);
      
      if (!sessionId) {
        sessionId = result.sessionId;
        log.success(`Session created: ${sessionId}`);
      }
      
      // Display bot response
      console.log(`${colors.yellow}Bot Response:${colors.reset}`);
      console.log(`  Answer: ${result.response.answer}`);
      if (result.response.simplify) {
        console.log(`  Simplify: ${result.response.simplify}`);
      }
      console.log(`  Engage: ${result.response.engage}`);
      console.log(`  Intent: ${result.intent}`);
      console.log('');
    }

    // Score the conversation
    log.info('Scoring conversation...');
    const scoreResult = await scoreConversation(sessionId);
    
    console.log(`${colors.yellow}Lead Score Results:${colors.reset}`);
    console.log(`  Score: ${scoreResult.leadScore.score}`);
    console.log(`  Classification: ${scoreResult.leadScore.classification}`);
    console.log(`  Follow-up Action: ${scoreResult.leadScore.followUpAction}`);
    console.log('');
    
    console.log(`${colors.yellow}Qualification Data:${colors.reset}`);
    console.log(`  Portfolio Size: ${scoreResult.leadScore.qualificationData.portfolioSize || 'Not detected'}`);
    console.log(`  Activity Level: ${scoreResult.leadScore.qualificationData.activity || 'Not detected'}`);
    console.log(`  Pain Points: ${scoreResult.leadScore.qualificationData.painPoints.join(', ') || 'None detected'}`);
    console.log(`  Domain Value: ${scoreResult.leadScore.qualificationData.domainValue || 'Not detected'}`);
    console.log('');

    // Verify expected results
    const scoreMatches = scoreResult.leadScore.score >= testCase.expectedScore;
    const classificationMatches = scoreResult.leadScore.classification === testCase.expectedClassification;

    if (scoreMatches && classificationMatches) {
      log.success(`Test passed! Score: ${scoreResult.leadScore.score}, Classification: ${scoreResult.leadScore.classification}`);
    } else {
      log.error(`Test failed! Expected score >= ${testCase.expectedScore} and classification '${testCase.expectedClassification}'`);
      log.error(`Got score: ${scoreResult.leadScore.score}, classification: '${scoreResult.leadScore.classification}'`);
    }

    // Get full session details
    log.info('Fetching full session details...');
    const sessionDetails = await getSession(sessionId);
    log.success(`Session has ${sessionDetails.session.messageCount} messages`);

    return {
      success: scoreMatches && classificationMatches,
      sessionId,
      score: scoreResult.leadScore.score,
      classification: scoreResult.leadScore.classification
    };

  } catch (error) {
    log.error(`Test failed with error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      sessionId
    };
  }
}

/**
 * Test lead retrieval
 */
async function testLeadRetrieval() {
  log.section('Testing Lead Retrieval');

  try {
    // Get all leads
    log.info('Fetching all leads...');
    const allLeads = await getLeads();
    log.success(`Found ${allLeads.count} total leads`);

    // Get hot leads
    log.info('Fetching hot leads...');
    const hotLeads = await getLeads('hot');
    log.success(`Found ${hotLeads.count} hot leads`);

    // Get warm leads
    log.info('Fetching warm leads...');
    const warmLeads = await getLeads('warm');
    log.success(`Found ${warmLeads.count} warm leads`);

    // Get cold leads
    log.info('Fetching cold leads...');
    const coldLeads = await getLeads('cold');
    log.success(`Found ${coldLeads.count} cold leads`);

    console.log('\nLead Distribution:');
    console.log(`  🔥 Hot:  ${hotLeads.count}`);
    console.log(`  🌡️  Warm: ${warmLeads.count}`);
    console.log(`  ❄️  Cold: ${coldLeads.count}`);

  } catch (error) {
    log.error(`Lead retrieval test failed: ${error.message}`);
  }
}

/**
 * Clean up test sessions
 */
async function cleanupTestSessions(sessionIds) {
  log.section('Cleaning Up Test Sessions');

  for (const sessionId of sessionIds) {
    if (sessionId) {
      try {
        await deleteSession(sessionId);
        log.success(`Deleted session: ${sessionId}`);
      } catch (error) {
        log.error(`Failed to delete session ${sessionId}: ${error.message}`);
      }
    }
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}  3VLTN CHATBOT API TEST SUITE${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`API URL: ${API_URL}\n`);

  const results = [];
  const sessionIds = [];

  // Run each test conversation
  for (const testCase of testConversations) {
    const result = await runConversation(testCase);
    results.push(result);
    if (result.sessionId) {
      sessionIds.push(result.sessionId);
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test lead retrieval
  await testLeadRetrieval();

  // Summary
  log.section('Test Summary');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log('');

  if (failed === 0) {
    log.success('All tests passed! 🎉');
  } else {
    log.error(`${failed} test(s) failed`);
  }

  // Ask if user wants to clean up
  console.log('\n' + '='.repeat(60));
  console.log('Test sessions created:');
  sessionIds.forEach(id => console.log(`  - ${id}`));
  console.log('\nTo clean up test sessions, run:');
  console.log(`  node test-chatbot.js --cleanup ${sessionIds.join(' ')}`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

/**
 * CLI entry point
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === '--cleanup') {
    const sessionIds = args.slice(1);
    if (sessionIds.length === 0) {
      console.error('Please provide session IDs to clean up');
      process.exit(1);
    }
    cleanupTestSessions(sessionIds).then(() => {
      console.log('Cleanup complete');
      process.exit(0);
    });
  } else {
    runAllTests().catch(error => {
      log.error(`Test suite failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
  }
}

module.exports = {
  sendMessage,
  scoreConversation,
  getSession,
  getLeads,
  deleteSession
};

