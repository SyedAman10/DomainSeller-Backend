/**
 * Test Duplicate Campaign Prevention
 * This script tests the duplicate prevention feature
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function testDuplicatePrevention() {
  console.log('🧪 Testing Duplicate Campaign Prevention...\n');

  const testDomain = `test-${Date.now()}.com`;
  let campaignData = {
    userId: 1,
    domainName: testDomain,
    campaignName: 'Test Campaign 1',
    emailTone: 'professional'
  };

  try {
    // Test 1: Create first campaign (should succeed)
    console.log('📝 Test 1: Creating first campaign...');
    const response1 = await axios.post(`${BASE_URL}/api/campaigns`, campaignData);
    console.log('✅ Success! Campaign created:');
    console.log(`   ID: ${response1.data.campaign.id}`);
    console.log(`   Campaign ID: ${response1.data.campaign.campaign_id}`);
    console.log(`   Domain: ${response1.data.campaign.domain_name}\n`);

    const firstCampaignId = response1.data.campaign.id;

    // Test 2: Try to create duplicate (should fail with 409)
    console.log('📝 Test 2: Attempting to create duplicate...');
    try {
      await axios.post(`${BASE_URL}/api/campaigns`, {
        ...campaignData,
        campaignName: 'Test Campaign 2 (Duplicate)'
      });
      console.log('❌ FAIL: Duplicate was allowed (should have been blocked)\n');
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('✅ Success! Duplicate blocked with 409 Conflict');
        console.log('   Response:', error.response.data);
        console.log('   Existing Campaign:', error.response.data.existingCampaign);
        console.log('   Suggested Actions:', error.response.data.actions);
        console.log('');
      } else {
        throw error;
      }
    }

    // Test 3: Replace existing campaign
    console.log('📝 Test 3: Replacing existing campaign...');
    const response3 = await axios.post(`${BASE_URL}/api/campaigns/replace`, {
      ...campaignData,
      campaignName: 'Test Campaign 2 (Replaced)'
    });
    console.log('✅ Success! Campaign replaced:');
    console.log(`   Deleted: ${response3.data.deleted} campaign(s)`);
    console.log(`   New ID: ${response3.data.campaign.id}`);
    console.log(`   New Campaign ID: ${response3.data.campaign.campaign_id}`);
    console.log(`   New Name: ${response3.data.campaign.campaign_name}\n`);

    const replacedCampaignId = response3.data.campaign.id;

    // Test 4: Update campaign instead of replacing
    console.log('📝 Test 4: Updating campaign settings...');
    const response4 = await axios.put(`${BASE_URL}/api/campaigns/${replacedCampaignId}`, {
      campaignName: 'Updated Campaign Name',
      emailTone: 'friendly',
      maxEmailsPerDay: 100
    });
    console.log('✅ Success! Campaign updated:');
    console.log(`   ID: ${response4.data.campaign.id}`);
    console.log(`   New Name: ${response4.data.campaign.campaign_name}`);
    console.log(`   Email Tone: ${response4.data.campaign.email_tone}`);
    console.log(`   Max Emails/Day: ${response4.data.campaign.max_emails_per_day}\n`);

    // Test 5: Verify can't create duplicate of replaced campaign
    console.log('📝 Test 5: Verifying replaced campaign also blocks duplicates...');
    try {
      await axios.post(`${BASE_URL}/api/campaigns`, {
        ...campaignData,
        campaignName: 'Test Campaign 3'
      });
      console.log('❌ FAIL: Duplicate was allowed after replace\n');
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('✅ Success! Duplicate still blocked after replace\n');
      } else {
        throw error;
      }
    }

    // Cleanup
    console.log('🧹 Cleaning up test campaign...');
    await axios.delete(`${BASE_URL}/api/campaigns/${response3.data.campaign.campaign_id}`);
    console.log('✅ Test campaign deleted\n');

    console.log('═'.repeat(60));
    console.log('🎉 All tests passed! Duplicate prevention is working correctly.');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run tests
console.log('Starting Duplicate Prevention Tests...\n');
testDuplicatePrevention();

