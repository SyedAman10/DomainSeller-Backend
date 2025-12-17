#!/usr/bin/env node

/**
 * Test Domain Transfer Lock Checking
 * 
 * This script tests the domain transfer lock detection functionality
 * using real domain WHOIS lookups.
 */

require('dotenv').config();
const { checkDomainTransferLock } = require('./services/domainService');

// Test domains (you can modify these)
const testDomains = [
  'google.com',     // Likely locked (large company)
  'example.com',    // Reserved domain
  'github.com'      // Likely locked
];

async function testTransferLock() {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 TESTING DOMAIN TRANSFER LOCK DETECTION');
  console.log('='.repeat(70) + '\n');

  console.log('This test will check the transfer lock status of several domains');
  console.log('using WHOIS lookups to verify the functionality works.\n');

  for (const domain of testDomains) {
    console.log('─'.repeat(70));
    console.log(`\n🔍 Checking: ${domain}\n`);

    try {
      const result = await checkDomainTransferLock(domain);

      if (result.success) {
        console.log(`✅ Successfully retrieved WHOIS data`);
        console.log(`\n📊 Results:`);
        console.log(`   Domain: ${result.domain}`);
        console.log(`   Transfer Locked: ${result.isTransferLocked ? '🔒 YES' : '🔓 NO'}`);
        console.log(`   Can Transfer: ${result.canTransfer ? '✅ YES' : '❌ NO'}`);
        console.log(`   Registrar: ${result.registrar || 'Unknown'}`);
        
        if (result.lockStatus && result.lockStatus.length > 0) {
          console.log(`   Lock Status:`);
          result.lockStatus.forEach(status => {
            console.log(`     - ${status}`);
          });
        }

        console.log(`\n   Message: ${result.message}`);

        if (result.unlockInstructions) {
          console.log(`\n   📋 Unlock Instructions:`);
          console.log(`      Estimated Time: ${result.unlockInstructions.estimatedTime}`);
          console.log(`      Steps:`);
          result.unlockInstructions.steps.forEach((step, i) => {
            console.log(`        ${i + 1}. ${step}`);
          });
          if (result.unlockInstructions.url) {
            console.log(`      Help URL: ${result.unlockInstructions.url}`);
          }
        }
      } else {
        console.log(`❌ Failed to check transfer lock`);
        console.log(`   Error: ${result.error || result.message}`);
      }

      // Wait a bit between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Error checking ${domain}:`, error.message);
    }

    console.log('');
  }

  console.log('='.repeat(70));
  console.log('✅ TEST COMPLETE');
  console.log('='.repeat(70));
  console.log('');
  console.log('📚 What this means:');
  console.log('');
  console.log('✅ If you see WHOIS data retrieved successfully:');
  console.log('   → The domain transfer lock checking is working!');
  console.log('   → The system can detect locked vs unlocked domains');
  console.log('   → Registrar-specific instructions are being generated');
  console.log('');
  console.log('❌ If you see errors:');
  console.log('   → WHOIS lookups may be rate-limited (wait a few minutes)');
  console.log('   → Some domains may have WHOIS privacy protection');
  console.log('   → Check your internet connection');
  console.log('');
  console.log('🎯 Next steps:');
  console.log('   1. Test with YOUR actual domains');
  console.log('   2. Run the database setup: node setup-domain-transfers.js');
  console.log('   3. Start your server: npm run dev');
  console.log('   4. Test the API endpoints');
  console.log('');
}

// Custom test with user input
async function testCustomDomain() {
  const domain = process.argv[2];
  
  if (!domain) {
    console.log('\n❌ Please provide a domain name');
    console.log('\nUsage:');
    console.log('  node test-domain-transfer.js example.com');
    console.log('');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`🔍 TESTING DOMAIN: ${domain}`);
  console.log('='.repeat(70) + '\n');

  try {
    const result = await checkDomainTransferLock(domain);

    if (result.success) {
      console.log('✅ SUCCESS!\n');
      console.log('📊 Transfer Lock Status:\n');
      console.log(`   Domain:          ${result.domain}`);
      console.log(`   Transfer Locked: ${result.isTransferLocked ? '🔒 YES' : '🔓 NO'}`);
      console.log(`   Can Transfer:    ${result.canTransfer ? '✅ YES' : '❌ NO'}`);
      console.log(`   Registrar:       ${result.registrar || 'Unknown'}`);
      
      if (result.expiryDate) {
        console.log(`   Expiry Date:     ${result.expiryDate}`);
      }

      if (result.nameservers && result.nameservers.length > 0) {
        console.log(`\n   Nameservers:`);
        result.nameservers.forEach(ns => {
          console.log(`     - ${ns}`);
        });
      }

      console.log(`\n   ${result.message}\n`);

      if (result.isTransferLocked && result.unlockInstructions) {
        console.log('📋 How to Unlock:\n');
        console.log(`   Time Required: ${result.unlockInstructions.estimatedTime}\n`);
        console.log('   Steps:');
        result.unlockInstructions.steps.forEach((step, i) => {
          console.log(`   ${i + 1}. ${step}`);
        });
        if (result.unlockInstructions.url) {
          console.log(`\n   📚 Help: ${result.unlockInstructions.url}`);
        }
        console.log('');
      }

      if (result.canTransfer) {
        console.log('🎉 This domain is ready for seamless transfer!\n');
      } else {
        console.log('⚠️  You need to unlock this domain before transfer.\n');
      }

    } else {
      console.log('❌ FAILED\n');
      console.log(`Error: ${result.error || result.message}\n`);
      console.log('Possible reasons:');
      console.log('  - WHOIS privacy protection enabled');
      console.log('  - Rate limiting (wait a few minutes)');
      console.log('  - Domain does not exist');
      console.log('  - Network connectivity issues\n');
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\nFull error:', error);
  }

  console.log('='.repeat(70) + '\n');
}

// Run tests
if (process.argv.length > 2) {
  // Test specific domain from command line
  testCustomDomain()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
} else {
  // Run default tests
  testTransferLock()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

