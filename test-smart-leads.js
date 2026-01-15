/**
 * Test Script: Smart Lead Generation API
 * 
 * This script tests the smart lead generation endpoint
 * to ensure everything is working correctly
 */

const fetch = require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function testSmartLeadGeneration() {
  console.log('\n🧪 Testing Smart Lead Generation API\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Generate leads (first time - should scrape)
    console.log('\n📋 Test 1: Generate 3 tech leads (first request)');
    console.log('Expected: Should scrape from Apify\n');

    const test1Response = await fetch(`${API_URL}/backend/leads/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: 'technology companies',
        count: 3,
        location: 'San Francisco'
      })
    });

    const test1Data = await test1Response.json();
    
    if (test1Data.success) {
      console.log('✅ Test 1 PASSED');
      console.log(`   Source: ${test1Data.data.metadata.source}`);
      console.log(`   Returned: ${test1Data.data.metadata.returned} leads`);
      console.log(`   From Cache: ${test1Data.data.metadata.fromCache}`);
      console.log(`   From Scraping: ${test1Data.data.metadata.fromScraping}`);
      console.log(`   Scraping Used: ${test1Data.data.metadata.scrapingUsed}`);
      
      if (test1Data.data.leads.length > 0) {
        const lead = test1Data.data.leads[0];
        console.log('\n   Sample Lead:');
        console.log(`   - Company: ${lead.company_name || 'N/A'}`);
        console.log(`   - Email: ${lead.email || 'N/A'}`);
        console.log(`   - Website: ${lead.website || 'N/A'}`);
      }
    } else {
      console.log('❌ Test 1 FAILED');
      console.log('   Error:', test1Data.error);
      console.log('   Message:', test1Data.message);
    }

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Generate same leads again (should use cache)
    console.log('\n📋 Test 2: Generate same leads (second request)');
    console.log('Expected: Should return from cache\n');

    const test2Response = await fetch(`${API_URL}/backend/leads/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: 'technology companies',
        count: 3,
        location: 'San Francisco'
      })
    });

    const test2Data = await test2Response.json();
    
    if (test2Data.success) {
      console.log('✅ Test 2 PASSED');
      console.log(`   Source: ${test2Data.data.metadata.source}`);
      console.log(`   Cache Efficiency: ${test2Data.data.metadata.cacheEfficiency}`);
      console.log(`   Scraping Used: ${test2Data.data.metadata.scrapingUsed}`);
      
      if (test2Data.data.metadata.source === 'cache' || test2Data.data.metadata.fromCache > 0) {
        console.log('   🎉 CACHE WORKING! No scraping needed!');
      }
    } else {
      console.log('❌ Test 2 FAILED');
      console.log('   Error:', test2Data.error);
    }

    // Test 3: Search cached leads
    console.log('\n📋 Test 3: Search cached leads');
    console.log('Expected: Should find leads without scraping\n');

    const test3Response = await fetch(
      `${API_URL}/backend/leads/search?keyword=technology&location=San Francisco&limit=5`
    );

    const test3Data = await test3Response.json();
    
    if (test3Data.success) {
      console.log('✅ Test 3 PASSED');
      console.log(`   Found: ${test3Data.data.count} cached leads`);
    } else {
      console.log('❌ Test 3 FAILED');
      console.log('   Error:', test3Data.error);
    }

    // Test 4: Get statistics
    console.log('\n📋 Test 4: Get lead statistics\n');

    const test4Response = await fetch(`${API_URL}/backend/leads/stats`);
    const test4Data = await test4Response.json();
    
    if (test4Data.success) {
      console.log('✅ Test 4 PASSED');
      console.log(`   Total Leads: ${test4Data.data.totalLeads}`);
      console.log(`   With Email: ${test4Data.data.leadsWithEmail} (${test4Data.data.emailCoverage})`);
      console.log(`   With Phone: ${test4Data.data.leadsWithPhone} (${test4Data.data.phoneCoverage})`);
      console.log(`   Hot Leads: ${test4Data.data.intentDistribution.hot}`);
      console.log(`   Warm Leads: ${test4Data.data.intentDistribution.warm}`);
      console.log(`   Cold Leads: ${test4Data.data.intentDistribution.cold}`);
    } else {
      console.log('❌ Test 4 FAILED');
      console.log('   Error:', test4Data.error);
    }

    // Test 5: List available actors
    console.log('\n📋 Test 5: List available Apify actors\n');

    const test5Response = await fetch(`${API_URL}/backend/leads/actors`);
    const test5Data = await test5Response.json();
    
    if (test5Data.success) {
      console.log('✅ Test 5 PASSED');
      console.log(`   Available Actors:`);
      Object.entries(test5Data.data.actors).forEach(([key, value]) => {
        console.log(`   - ${key}: ${value}`);
      });
      console.log(`\n   Default: ${test5Data.data.default}`);
    } else {
      console.log('❌ Test 5 FAILED');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ All tests completed!\n');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    console.error('   Message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  Server not running. Start it with: pm2 start server.js');
    }
  }
}

// Run tests
testSmartLeadGeneration();

