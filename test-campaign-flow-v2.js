#!/usr/bin/env node

/**
 * Test Updated Campaign Creation Flow
 * 
 * Tests:
 * 1. AI asks ALL questions at once (not step-by-step)
 * 2. Landing page auto-detection from database
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'https://api.3vltn.com';
const USER_ID = process.env.TEST_USER_ID || 10;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

async function chat(message, sessionId = null) {
  try {
    console.log(`\n${colors.blue}[USER]:${colors.reset} ${message}`);
    
    const response = await axios.post(`${BASE_URL}/backend/ai-agent/chat`, {
      userId: USER_ID,
      message: message,
      sessionId: sessionId
    });

    if (response.data.success) {
      console.log(`${colors.green}[AI]:${colors.reset} ${response.data.message}`);
      return { success: true, sessionId: response.data.sessionId, message: response.data.message };
    } else {
      console.log(`${colors.yellow}[ERROR]:${colors.reset} ${response.data.error}`);
      return { success: false };
    }
  } catch (error) {
    console.log(`${colors.yellow}[ERROR]:${colors.reset} ${error.message}`);
    return { success: false };
  }
}

async function testNewFlow() {
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.cyan}Testing Updated Campaign Creation Flow${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);

  console.log(`${colors.yellow}Expected Behavior:${colors.reset}`);
  console.log(`1. AI should ask ALL 9 questions at once`);
  console.log(`2. AI should auto-check for landing page when domain is mentioned`);
  console.log(`3. User can answer all at once or separately\n`);

  // Test 1: Initial request
  console.log(`${colors.cyan}--- Test 1: Initial Campaign Request ---${colors.reset}`);
  const response1 = await chat('Create a new campaign');
  
  if (!response1.success) {
    console.log('❌ Test failed');
    return;
  }

  // Check if AI asked multiple questions
  const hasMultipleQuestions = (response1.message.match(/\?/g) || []).length >= 5;
  console.log(`\n${colors.yellow}Verification:${colors.reset}`);
  console.log(`Questions asked: ${(response1.message.match(/\?/g) || []).length}`);
  console.log(`Status: ${hasMultipleQuestions ? '✅ PASS - AI asked multiple questions' : '❌ FAIL - AI only asked 1-2 questions'}`);

  // Test 2: Provide domain and see if AI auto-checks landing page
  console.log(`\n${colors.cyan}--- Test 2: Provide Domain (Should Auto-Check Landing Page) ---${colors.reset}`);
  const response2 = await chat(
    'domain is theprimecrafters.com, campaign name is Crafting Opportunities, price is 2500',
    response1.sessionId
  );

  if (!response2.success) {
    console.log('❌ Test failed');
    return;
  }

  // Check if AI mentioned landing page (auto-checked)
  const mentionsLandingPage = response2.message.toLowerCase().includes('landing page');
  console.log(`\n${colors.yellow}Verification:${colors.reset}`);
  console.log(`Mentions landing page: ${mentionsLandingPage ? '✅ YES' : '❌ NO'}`);
  console.log(`Status: ${mentionsLandingPage ? '✅ PASS - AI auto-checked landing page' : '❌ FAIL - AI did not check landing page'}`);

  console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.green}Test Complete!${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

// Run test
testNewFlow().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});

