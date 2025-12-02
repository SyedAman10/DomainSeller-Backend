require('dotenv').config();
const fetch = require('node-fetch');

/**
 * Test script for password reset functionality
 * Tests the complete forgot password flow
 */

const BASE_URL = 'http://localhost:5000/backend/users';
const TEST_EMAIL = 'test@test.com'; // Update with a real email from your users table

async function testForgotPassword() {
  console.log('🧪 Testing Forgot Password Flow\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Request password reset
    console.log('\n1️⃣  Testing: POST /forgot-password');
    console.log(`   Email: ${TEST_EMAIL}`);

    const resetRequest = await fetch(`${BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL })
    });

    const resetResponse = await resetRequest.json();
    console.log('   Response:', JSON.stringify(resetResponse, null, 2));

    if (resetResponse.success) {
      console.log('   ✅ Reset email request successful');
      console.log('   📧 Check the email inbox for reset link');
    } else {
      console.log('   ❌ Reset email request failed');
    }

    // Step 2: Test with invalid email
    console.log('\n2️⃣  Testing: Invalid email format');
    const invalidRequest = await fetch(`${BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email' })
    });

    const invalidResponse = await invalidRequest.json();
    console.log('   Response:', JSON.stringify(invalidResponse, null, 2));

    if (!invalidResponse.success) {
      console.log('   ✅ Invalid email correctly rejected');
    }

    // Step 3: Test with non-existent email
    console.log('\n3️⃣  Testing: Non-existent email');
    const nonExistentRequest = await fetch(`${BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com' })
    });

    const nonExistentResponse = await nonExistentRequest.json();
    console.log('   Response:', JSON.stringify(nonExistentResponse, null, 2));

    if (nonExistentResponse.success) {
      console.log('   ✅ Security check passed (same response for security)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ All tests completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Check the email inbox for reset link');
    console.log('   2. Click the reset link or copy the token');
    console.log('   3. Test the reset password endpoint with:');
    console.log('      POST /backend/users/reset-password');
    console.log('      Body: { token: "YOUR_TOKEN", newPassword: "newpass123" }');
    console.log('\n💡 Or verify token with:');
    console.log('   GET /backend/users/verify-reset-token/:token');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nMake sure:');
    console.error('1. Backend server is running (npm start)');
    console.error('2. Database migration was run (node run-password-reset-migration.js)');
    console.error('3. Email service is configured (.env has MAILGUN_API_KEY)');
  }
}

// Run tests
testForgotPassword();

