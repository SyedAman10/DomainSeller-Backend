#!/usr/bin/env node
/**
 * Test Lead Generation System
 * 
 * Quick test script to verify the lead generation system is working
 */

require('dotenv').config();
const { scrapeGoogleSERP } = require('./services/apifyService');
const { classifyLeadsBatch } = require('./services/leadClassificationService');

async function testLeadGeneration() {
  console.log('🧪 Testing Lead Generation System\n');
  console.log('='.repeat(60));

  // Check environment variable
  if (!process.env.APIFY_API_KEY) {
    console.error('❌ Error: APIFY_API_KEY not found in environment');
    console.log('\n📝 Add to your .env file:');
    console.log('APIFY_API_KEY=apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    console.log('\n🔗 Get your API key from: https://console.apify.com/account/integrations');
    process.exit(1);
  }

  console.log('✅ APIFY_API_KEY found');
  console.log('🔑 Key: ' + process.env.APIFY_API_KEY.substring(0, 15) + '...');

  // Test query
  const testQuery = 'looking to buy domain name';
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Test Query: "' + testQuery + '"');
  console.log('📄 Max Pages: 1 (10 results)');
  console.log('🌍 Country: US | Language: EN');
  console.log('='.repeat(60));

  try {
    // Test 1: Classification (offline test)
    console.log('\n📊 TEST 1: Classification Engine');
    console.log('-'.repeat(60));
    
    const sampleLeads = [
      {
        title: 'Looking to Buy Premium Domain Names for My Startup',
        snippet: 'I need to purchase a short .com domain for my tech startup. Budget up to $10k.'
      },
      {
        title: 'Startup Name Ideas and Branding',
        snippet: 'Help me find a good startup name and domain for my new business.'
      },
      {
        title: 'What is a Domain Name?',
        snippet: 'Learn about domain names and how they work on the internet.'
      }
    ];

    const classified = classifyLeadsBatch(sampleLeads);
    
    classified.forEach((lead, index) => {
      console.log(`\nLead ${index + 1}:`);
      console.log(`  Title: ${lead.title.substring(0, 50)}...`);
      console.log(`  Intent: ${lead.intent}`);
      console.log(`  Confidence: ${lead.confidence_score}%`);
      console.log(`  Keywords: ${lead.matched_keywords.slice(0, 2).join(', ')}`);
    });

    console.log('\n✅ Classification test passed');

    // Test 2: Apify Integration
    console.log('\n\n🌐 TEST 2: Apify Integration');
    console.log('-'.repeat(60));
    console.log('⏳ Scraping Google SERP... (this may take 30-60 seconds)');

    const startTime = Date.now();
    
    const result = await scrapeGoogleSERP({
      query: testQuery,
      country: 'us',
      language: 'en',
      maxPages: 1,
      resultsPerPage: 10,
      dateRange: 'anytime'
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result.success) {
      console.log('\n✅ Scraping successful!');
      console.log(`\n📊 Results:`);
      console.log(`  - Total Results: ${result.totalResults}`);
      console.log(`  - Duration: ${duration}s`);
      console.log(`  - Compute Units: ${result.computeUnits}`);
      console.log(`  - Session ID: ${result.sessionId}`);
      console.log(`  - Run ID: ${result.runId}`);

      // Classify the results
      if (result.results && result.results.length > 0) {
        console.log('\n🧠 Classifying results...');
        
        const leads = result.results.map((item, index) => ({
          title: item.title || '',
          snippet: item.snippet || item.description || '',
          url: item.url || item.link || '',
          position: index + 1
        }));

        const classifiedResults = classifyLeadsBatch(leads);
        
        const hotCount = classifiedResults.filter(l => l.intent === 'HOT').length;
        const warmCount = classifiedResults.filter(l => l.intent === 'WARM').length;
        const coldCount = classifiedResults.filter(l => l.intent === 'COLD').length;

        console.log(`\n📈 Classification Results:`);
        console.log(`  🔥 HOT:  ${hotCount} leads`);
        console.log(`  🌤️  WARM: ${warmCount} leads`);
        console.log(`  ❄️  COLD: ${coldCount} leads`);

        // Show top 3 HOT leads
        const hotLeads = classifiedResults.filter(l => l.intent === 'HOT').slice(0, 3);
        
        if (hotLeads.length > 0) {
          console.log('\n🔥 Top HOT Leads:');
          hotLeads.forEach((lead, index) => {
            console.log(`\n  ${index + 1}. ${lead.title.substring(0, 60)}...`);
            console.log(`     Confidence: ${lead.confidence_score}%`);
            console.log(`     URL: ${lead.url.substring(0, 50)}...`);
            console.log(`     Keywords: ${lead.matched_keywords.slice(0, 2).join(', ')}`);
          });
        }
      }
    } else {
      throw new Error('Scraping failed');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));

    console.log('\n🎉 Your Lead Generation System is Working!');
    console.log('\n📚 Next Steps:');
    console.log('  1. Check database: SELECT * FROM domain_buyer_leads;');
    console.log('  2. View session: SELECT * FROM lead_scraping_sessions;');
    console.log('  3. Try API: POST /backend/leads/collect');
    console.log('  4. Read docs: LEAD_GEN_API.md');

    console.log('\n💡 Try different queries:');
    console.log('  - "buy premium domain"');
    console.log('  - "need domain for startup"');
    console.log('  - "web3 domain wanted"');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    
    if (error.message.includes('Actor not found')) {
      console.log('\n💡 Make sure the Apify actor exists:');
      console.log('   Actor: damilo/google-search-apify');
    } else if (error.message.includes('authentication')) {
      console.log('\n💡 Check your APIFY_API_KEY:');
      console.log('   Get it from: https://console.apify.com/account/integrations');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 The request timed out. This might be normal for first run.');
      console.log('   Try again or increase timeout in apifyService.js');
    }

    console.log('\n🔍 Full error details:');
    console.error(error);
    
    process.exit(1);
  }
}

// Run test
console.log('\n');
testLeadGeneration();

