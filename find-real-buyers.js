#!/usr/bin/env node
/**
 * Find Real Domain Buyers - Better Queries
 */

require('dotenv').config();
const { scrapeGoogleSERP } = require('./services/apifyService');
const { classifyLeadsBatch } = require('./services/leadClassificationService');

const BETTER_QUERIES = [
  {
    query: 'site:reddit.com "looking for domain" OR "need domain"',
    description: 'Reddit posts from people looking for domains'
  },
  {
    query: 'site:reddit.com "WTB domain" OR "want to buy domain"',
    description: 'Reddit want-to-buy posts'
  },
  {
    query: '"domain broker" contact OR inquiry -site:godaddy.com -site:namecheap.com',
    description: 'Domain broker inquiries (excluding registrars)'
  },
  {
    query: 'site:indiehackers.com "domain name" OR "startup name"',
    description: 'IndieHackers community discussions'
  },
  {
    query: '"need short domain" OR "buy premium domain" site:twitter.com OR site:reddit.com',
    description: 'Social media domain requests'
  }
];

async function findRealBuyers() {
  console.log('🎯 Finding REAL Domain Buyers\n');
  console.log('='.repeat(70));
  console.log('💡 Pro Tip: Use site-specific searches to find actual buyers!');
  console.log('='.repeat(70));

  console.log('\n📋 Suggested Queries:\n');
  
  BETTER_QUERIES.forEach((item, index) => {
    console.log(`${index + 1}. ${item.description}`);
    console.log(`   Query: "${item.query}"\n`);
  });

  console.log('='.repeat(70));
  console.log('\n🧪 Testing Query #1: Reddit Domain Searches\n');

  try {
    const result = await scrapeGoogleSERP({
      query: 'site:reddit.com "looking for domain" OR "need domain for"',
      country: 'us',
      language: 'en',
      maxPages: 1,
      resultsPerPage: 10,
      dateRange: 'month' // Only recent posts
    });

    if (result.success && result.results.length > 0) {
      const leads = result.results.map((item, index) => ({
        title: item.title || '',
        snippet: item.snippet || item.description || '',
        url: item.url || item.link || '',
        position: index + 1
      }));

      const classified = classifyLeadsBatch(leads);
      
      const hotCount = classified.filter(l => l.intent === 'HOT').length;
      const warmCount = classified.filter(l => l.intent === 'WARM').length;
      const coldCount = classified.filter(l => l.intent === 'COLD').length;

      console.log('📊 Results from Reddit:');
      console.log(`  🔥 HOT:  ${hotCount} leads`);
      console.log(`  🌤️  WARM: ${warmCount} leads`);
      console.log(`  ❄️  COLD: ${coldCount} leads\n`);

      // Show all results
      classified.forEach((lead, index) => {
        const intentEmoji = lead.intent === 'HOT' ? '🔥' : lead.intent === 'WARM' ? '🌤️' : '❄️';
        console.log(`${index + 1}. ${intentEmoji} [${lead.intent} ${lead.confidence_score}%]`);
        console.log(`   ${lead.title.substring(0, 70)}...`);
        console.log(`   ${lead.url}`);
        if (lead.matched_keywords.length > 0) {
          console.log(`   Keywords: ${lead.matched_keywords.slice(0, 3).join(', ')}`);
        }
        console.log('');
      });

    } else {
      console.log('⚠️  No results found. Try a different query.');
    }

    console.log('\n' + '='.repeat(70));
    console.log('💡 KEY INSIGHTS:');
    console.log('='.repeat(70));
    console.log('\n✅ What WORKS:');
    console.log('  • Reddit/Forum posts: "site:reddit.com need domain"');
    console.log('  • IndieHackers: "site:indiehackers.com domain name"');
    console.log('  • Twitter requests: "site:twitter.com WTB domain"');
    console.log('  • Exclude registrars: "-site:godaddy.com -site:namecheap.com"');
    console.log('  • Recent posts only: dateRange="week" or "month"');

    console.log('\n❌ What DOESN\'T WORK:');
    console.log('  • Generic queries like "buy domain name" → Returns registrar pages');
    console.log('  • Commercial sites (GoDaddy, Namecheap, Wix)');
    console.log('  • How-to guides and tutorials');

    console.log('\n🎯 EMAIL EXTRACTION:');
    console.log('  • Emails are found when crawling actual buyer posts');
    console.log('  • Reddit/Forum users often include contact info');
    console.log('  • Personal blogs and entrepreneur posts have emails');
    console.log('  • NOT found on commercial registrar pages');

    console.log('\n🚀 NEXT STEPS:');
    console.log('  1. Use site-specific queries (Reddit, IndieHackers, Twitter)');
    console.log('  2. Focus on recent posts (dateRange: "week" or "month")');
    console.log('  3. Exclude commercial sites in your query');
    console.log('  4. Enable crawlContacts=true to extract emails from HOT leads');
    console.log('  5. Try multiple queries to build a diverse lead list');

    console.log('\n📚 Example API Call:');
    console.log(`
curl -X POST https://api.3vltn.com/backend/leads/collect \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "site:reddit.com need domain for startup",
    "country": "us",
    "maxPages": 2,
    "dateRange": "month",
    "crawlContacts": true,
    "minConfidence": 40
  }'
    `);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findRealBuyers();





