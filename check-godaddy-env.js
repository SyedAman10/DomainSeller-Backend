#!/usr/bin/env node

/**
 * GoDaddy API Environment Checker
 * Helps debug authentication issues
 */

require('dotenv').config();

console.log('\n============================================================');
console.log('🔍 GODADDY API ENVIRONMENT CHECKER');
console.log('============================================================\n');

// Check environment variables
const apiUrl = process.env.GODADDY_API_URL || 'https://api.godaddy.com';

console.log('📋 Current Configuration:');
console.log('   API URL:', apiUrl);
console.log('');

if (apiUrl.includes('ote-godaddy.com')) {
    console.log('✅ Environment: OTE (Test)');
    console.log('   You need: OTE/TEST API keys');
    console.log('   Create at: https://developer.godaddy.com/keys (select OTE)');
} else {
    console.log('✅ Environment: PRODUCTION');
    console.log('   You need: PRODUCTION API keys');
    console.log('   Requirements: 10+ domains OR Domain Pro Plan');
    console.log('   Create at: https://developer.godaddy.com/keys (select Production)');
}

console.log('');
console.log('============================================================');
console.log('📝 How to Create the Right Keys:');
console.log('============================================================');
console.log('');
console.log('1. Go to: https://developer.godaddy.com/keys');
console.log('');

if (apiUrl.includes('ote-godaddy.com')) {
    console.log('2. Click "Create New API Key"');
    console.log('3. Select: OTE (Test) Environment');
    console.log('4. Name: "DomainSeller OTE"');
    console.log('5. Save your key and secret');
    console.log('');
    console.log('⚠️  NOTE: Your first API key is automatically OTE');
} else {
    console.log('2. Click "Create New API Key"');
    console.log('3. Select: Production Environment');
    console.log('4. Name: "DomainSeller Production"');
    console.log('5. Make sure you have 10+ domains or Domain Pro Plan');
    console.log('6. Save your key and secret');
}

console.log('');
console.log('============================================================');
console.log('🧪 Test Your Keys:');
console.log('============================================================');
console.log('');
console.log('Run: npm run test:godaddy');
console.log('');
console.log('Or test manually:');
console.log('');
console.log(`curl -X GET -H "Authorization: sso-key YOUR_KEY:YOUR_SECRET" "${apiUrl}/v1/domains"`);
console.log('');

console.log('============================================================');
console.log('💡 Common Issues:');
console.log('============================================================');
console.log('');
console.log('❌ UNABLE_TO_AUTHENTICATE (400):');
console.log('   - Wrong environment keys (OTE key with Production URL)');
console.log('   - Key/secret format incorrect');
console.log('   - Extra spaces in key/secret');
console.log('');
console.log('❌ ACCESS_DENIED (403):');
console.log('   - Production: Need 10+ domains or Domain Pro Plan');
console.log('   - Key doesn\'t have Domain permissions');
console.log('');
console.log('✅ To switch to OTE (recommended for testing):');
console.log('   Add to .env: GODADDY_API_URL=https://api.ote-godaddy.com');
console.log('   Restart server: pm2 restart node-backend');
console.log('');
console.log('============================================================\n');
