/**
 * Smart Lead Generation Service using Apify
 * 
 * This service integrates with Apify's lead generation actors
 * Features:
 * - Caches leads in database to avoid duplicate scraping
 * - Returns existing leads matching keywords before scraping
 * - Prevents duplicate lead storage
 * - Supports multiple Apify actors for lead generation
 */

const { ApifyClient } = require('apify-client');
const { query } = require('../config/database');

// Initialize Apify client
const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_KEY,
});

// Apify Actors for lead generation
const LEAD_ACTORS = {
  LEADS_FINDER: 'code_crafter/leads-finder', // Your specified actor
  GOOGLE_MAPS: 'nwua9/google-maps-scraper',
  LINKEDIN: 'socialminer/linkedin-scraper',
  YELLOWPAGES: 'epctex/yellowpages-scraper'
};

const DEFAULT_ACTOR = LEAD_ACTORS.LEADS_FINDER;
const DEFAULT_TIMEOUT = 300; // 5 minutes

/**
 * Generate leads with smart caching
 * @param {Object} options - Lead generation options
 * @param {string} options.keyword - Search keyword/industry (e.g., "tech companies in NYC")
 * @param {number} options.count - Number of leads requested
 * @param {string} options.location - Location filter (optional)
 * @param {string} options.industry - Industry filter (optional)
 * @param {string} options.actor - Which Apify actor to use (optional)
 * @param {boolean} options.forceRefresh - Force new scraping even if cached leads exist
 * @returns {Promise<Object>} - Generated leads with metadata
 */
async function generateLeads(options) {
  const {
    keyword,
    count = 5,
    location = null,
    industry = null,
    actor = DEFAULT_ACTOR,
    forceRefresh = false,
    userId  // NEW: User ID for multi-tenant support
  } = options;

  console.log('\n🎯 SMART LEAD GENERATION REQUEST');
  console.log('━'.repeat(80));
  console.log('📋 REQUEST PARAMETERS:');
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log(`│ Keyword: "${keyword}"`);
  console.log(`│ Count: ${count}`);
  console.log(`│ Location: ${location || 'Any'}`);
  console.log(`│ Industry: ${industry || 'Any'}`);
  console.log(`│ Actor: ${actor}`);
  console.log(`│ Force Refresh: ${forceRefresh}`);
  console.log(`│ User ID: ${userId || 'Not specified'}`);
  console.log('└─────────────────────────────────────────────────────────────────┘');

  try {
    // Step 1: Check database for existing leads matching this keyword
    if (!forceRefresh) {
      console.log('\n🔍 STEP 1: Checking database for existing leads...');

      const cachedLeads = await searchCachedLeads({
        keyword,
        location,
        industry,
        limit: 100, // Search more than requested to allow rotation
        userId
      });

      // If we have leads for this keyword, and the user only asked for a small amount,
      // we can return them from cache. However, if they want "freshness" or more than we have, we scrape.
      if (cachedLeads.length >= count && cachedLeads.length > 0) {
        console.log('\n✅ CACHE HIT - Sufficient leads found!');
        console.log('┌─────────────────────────────────────────────────────────────────┐');
        console.log(`│ Found: ${cachedLeads.length} cached leads (requested: ${count})`);
        console.log('│ Result: Returning from cache 🎉');
        console.log('└─────────────────────────────────────────────────────────────────┘');

        // Randomize the order a bit so same keyword doesn't always return same leads if we have more than count
        const shuffled = [...cachedLeads].sort(() => 0.5 - Math.random());

        return {
          success: true,
          source: 'cache',
          leads: shuffled.slice(0, count),
          totalFound: cachedLeads.length,
          requested: count,
          fromCache: cachedLeads.length,
          scrapingUsed: false
        };
      } else if (cachedLeads.length > 0) {
        console.log('\n⚠️  PARTIAL CACHE HIT');
        console.log('┌─────────────────────────────────────────────────────────────────┐');
        console.log(`│ Found: ${cachedLeads.length} cached leads (need: ${count})`);
        console.log(`│ Missing: ${count - cachedLeads.length} leads`);
        console.log('│ Result: Will scrape additional leads to reach target');
        console.log('└─────────────────────────────────────────────────────────────────┘');

        // Scrape more to ensure we get NEW leads
        const scrapeCount = Math.max(count, 10); // Scrape at least 10 to rotate
        const scrapedLeads = await scrapeLeads({
          keyword,
          location,
          industry,
          count: scrapeCount,
          actor,
          userId
        });

        // Combine and return
        const allLeads = [...cachedLeads, ...scrapedLeads];
        // Deduplicate by ID in case any were returned by both
        const uniqueLeads = Array.from(new Map(allLeads.map(l => [l.id, l])).values());

        return {
          success: true,
          source: 'hybrid',
          leads: uniqueLeads.slice(0, count),
          totalFound: uniqueLeads.length,
          requested: count,
          fromCache: cachedLeads.length,
          fromScraping: scrapedLeads.length,
          scrapingUsed: true
        };
      } else {
        console.log('\n❌ CACHE MISS - No cached leads found');
      }
    } else {
      console.log('\n🔄 FORCE REFRESH - Skipping cache check');
    }

    // Step 2: No cached leads found or force refresh - scrape new leads
    console.log('\n🕷️  STEP 2: Starting fresh scraping...');

    const scrapedLeads = await scrapeLeads({
      keyword,
      location,
      industry,
      count,
      actor,
      userId  // Pass userId for fresh scraping
    });

    console.log('\n✅ SCRAPING RESULT:');
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log(`│ Scraped: ${scrapedLeads.length} new leads`);
    console.log(`│ Source: Fresh from Apify actor`);
    console.log('└─────────────────────────────────────────────────────────────────┘');
    console.log('━'.repeat(80) + '\n');

    return {
      success: true,
      source: 'scraping',
      leads: scrapedLeads.slice(0, count),
      totalFound: scrapedLeads.length,
      requested: count,
      fromCache: 0,
      fromScraping: scrapedLeads.length,
      scrapingUsed: true
    };

  } catch (error) {
    console.error('\n❌ ERROR IN SMART LEAD GENERATION:');
    console.error('┌─────────────────────────────────────────────────────────────────┐');
    console.error(`│ Error: ${error.message}`);
    console.error('└─────────────────────────────────────────────────────────────────┘');
    console.error('━'.repeat(80) + '\n');
    throw error;
  }
}

/**
 * Search for cached leads in database
 * @param {Object} filters - Search filters
 * @returns {Promise<Array>} - Cached leads
 */
async function searchCachedLeads(filters) {
  const { keyword, location, industry, limit = 10, userId } = filters;

  try {
    // Build dynamic WHERE clause
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // IMPORTANT: Filter by user_id for multi-tenant support
    if (userId) {
      whereConditions.push(`user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    // Keyword matching (search in title, snippet, company_name, description)
    // Make keyword optional - if empty, just filter by user_id
    if (keyword && keyword.trim() && keyword !== '*') {
      whereConditions.push(`(
        title ILIKE $${paramIndex} OR 
        snippet ILIKE $${paramIndex} OR 
        company_name ILIKE $${paramIndex} OR
        description ILIKE $${paramIndex} OR
        query_used ILIKE $${paramIndex}
      )`);
      params.push(`%${keyword}%`);
      paramIndex++;
    }

    // Location filter
    if (location) {
      whereConditions.push(`(location ILIKE $${paramIndex} OR city ILIKE $${paramIndex})`);
      params.push(`%${location}%`);
      paramIndex++;
    }

    // Industry filter
    if (industry) {
      whereConditions.push(`industry ILIKE $${paramIndex}`);
      params.push(`%${industry}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    params.push(limit);

    const result = await query(`
      SELECT 
        id,
        company_name,
        email,
        phone,
        website,
        location,
        city,
        country,
        industry,
        title,
        snippet,
        description,
        linkedin_url,
        facebook_url,
        twitter_url,
        contact_person,
        employee_count,
        revenue,
        founded_year,
        query_used,
        confidence_score,
        intent,
        first_name,
        last_name,
        full_name,
        job_title,
        seniority,
        company_domain,
        company_linkedin,
        company_phone,
        company_revenue_clean,
        company_total_funding,
        company_total_funding_clean,
        company_technologies,
        keywords,
        created_at
      FROM generated_leads
      ${whereClause}
      ORDER BY 
        confidence_score DESC,
        created_at DESC
      LIMIT $${paramIndex}
    `, params);

    console.log(`   Found ${result.rows.length} cached leads`);
    return result.rows;

  } catch (error) {
    console.error('❌ Error searching cached leads:', error);
    return []; // Return empty array on error, don't break the flow
  }
}

/**
 * Scrape new leads using Apify actor
 * @param {Object} options - Scraping options
 * @returns {Promise<Array>} - Scraped leads
 */
async function scrapeLeads(options) {
  const {
    keyword,
    location,
    industry,
    count = 5,
    actor = DEFAULT_ACTOR,
    userId  // NEW: User ID to associate leads with user
  } = options;

  console.log(`\n🚀 Starting Apify actor: ${actor}`);
  console.log('━'.repeat(80));

  try {
    // Prepare actor input based on which actor is being used
    let input = prepareActorInput(actor, {
      keyword,
      location,
      industry,
      count
    });

    console.log('\n📤 SENDING TO APIFY ACTOR:');
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ Actor:', actor);
    console.log('│ Input:', JSON.stringify(input, null, 2).split('\n').join('\n│       '));
    console.log('└─────────────────────────────────────────────────────────────────┘');

    // Run the actor
    console.log('\n⏳ Running Apify actor... (this may take 30-60 seconds)');
    const run = await apifyClient.actor(actor).call(input, {
      timeout: DEFAULT_TIMEOUT,
      memory: 2048, // 2GB
    });

    console.log('\n✅ APIFY ACTOR COMPLETED:');
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log(`│ Run ID: ${run.id}`);
    console.log(`│ Status: ${run.status}`);
    console.log(`│ Compute Units: ${run.usedComputeUnits || 0}`);
    console.log(`│ Started: ${run.startedAt}`);
    console.log(`│ Finished: ${run.finishedAt}`);
    console.log('└─────────────────────────────────────────────────────────────────┘');

    if (run.status !== 'SUCCEEDED') {
      throw new Error(`Actor run failed with status: ${run.status}`);
    }

    // Fetch dataset results
    console.log('\n📥 Fetching scraped results from Apify dataset...');
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    console.log(`\n✅ RECEIVED ${items.length} RAW RESULTS FROM APIFY`);
    console.log('━'.repeat(80));

    // Log first result as sample
    if (items.length > 0) {
      console.log('\n📄 SAMPLE RAW RESULT (First Lead):');
      console.log('┌─────────────────────────────────────────────────────────────────┐');
      console.log(JSON.stringify(items[0], null, 2).split('\n').map(line => `│ ${line}`).join('\n'));
      console.log('└─────────────────────────────────────────────────────────────────┘');
    }

    console.log('\n🔄 Transforming and storing leads...');

    // Transform and store leads
    const transformedLeads = await transformAndStoreLeads(items, {
      keyword,
      location,
      industry,
      actor,
      runId: run.id,
      userId  // Pass userId to store with each lead
    });

    console.log('\n✅ STORAGE COMPLETE:');
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log(`│ Stored: ${transformedLeads.length} unique leads`);
    console.log(`│ Duplicates Skipped: ${items.length - transformedLeads.length}`);
    console.log(`│ Requested Count: ${count}`);
    console.log(`│ Returning: ${Math.min(transformedLeads.length, count)} leads`);
    console.log('└─────────────────────────────────────────────────────────────────┘');
    console.log('━'.repeat(80) + '\n');

    // Return only the requested count
    // Return all new leads found, up to a reasonable limit, but at least requested count
    return transformedLeads;

  } catch (error) {
    console.error(`❌ Error scraping with ${actor}:`, error);
    throw error;
  }
}

/**
 * Prepare actor input based on which actor is being used
 * @param {string} actor - Actor ID
 * @param {Object} options - Input options
 * @returns {Object} - Actor-specific input
 */
function prepareActorInput(actor, options) {
  const { keyword, location, industry, count } = options;

  // Map common keywords to Apify's exact industry names
  const getIndustryFromKeyword = (kw) => {
    const lower = kw.toLowerCase();

    // Tech-related keywords
    if (lower.includes('tech') || lower.includes('software') || lower.includes('saas')) {
      return ['information technology & services', 'computer software', 'internet'];
    }

    // Healthcare keywords
    if (lower.includes('health') || lower.includes('medical') || lower.includes('hospital')) {
      return ['hospital & health care', 'medical practice', 'medical devices'];
    }

    // Finance keywords
    if (lower.includes('finance') || lower.includes('banking') || lower.includes('investment')) {
      return ['financial services', 'banking', 'investment management'];
    }

    // Marketing keywords
    if (lower.includes('marketing') || lower.includes('advertising')) {
      return ['marketing & advertising'];
    }

    // Real estate keywords
    if (lower.includes('real estate') || lower.includes('property')) {
      return ['real estate', 'commercial real estate'];
    }

    // E-commerce/Retail keywords
    if (lower.includes('ecommerce') || lower.includes('retail') || lower.includes('shop')) {
      return ['retail', 'internet', 'consumer goods'];
    }

    return null;
  };

  switch (actor) {
    case LEAD_ACTORS.LEADS_FINDER:
      const industryFilter = getIndustryFromKeyword(keyword);

      return {
        fetch_count: Math.max(count * 2, 20), // Request more to account for duplicates and increase total count
        email_status: ['validated'],
        // Add seniority filter if keyword mentions leadership roles
        ...(keyword.toLowerCase().includes('ceo') ||
          keyword.toLowerCase().includes('founder') ||
          keyword.toLowerCase().includes('director') ||
          keyword.toLowerCase().includes('vp') ||
          keyword.toLowerCase().includes('chief')
          ? { seniority_level: ['founder', 'c_suite', 'vp'] }
          : {}
        ),
        // Add industry filter if detected from keyword
        ...(industryFilter ? { company_industry: industryFilter } : {})
      };

    case LEAD_ACTORS.GOOGLE_MAPS:
      return {
        searchQuery: `${industry || keyword} ${location || ''}`.trim(),
        maxResults: count,
        language: 'en',
        includeWebsite: true,
        includePhone: true,
        includeEmail: true
      };

    case LEAD_ACTORS.LINKEDIN:
      return {
        keywords: keyword,
        location: location,
        resultsPerPage: count,
        includeContactInfo: true
      };

    case LEAD_ACTORS.YELLOWPAGES:
      return {
        search: keyword,
        location: location || 'United States',
        maxItems: count
      };

    default:
      // Default generic format
      return {
        query: keyword,
        location: location,
        maxResults: count
      };
  }
}

/**
 * Transform scraped data and store in database (avoiding duplicates)
 * @param {Array} items - Raw scraped items
 * @param {Object} metadata - Scraping metadata
 * @returns {Promise<Array>} - Stored leads
 */
async function transformAndStoreLeads(items, metadata) {
  const { keyword, location, industry, actor, runId, userId } = metadata;
  const storedLeads = [];
  let duplicateCount = 0;

  console.log('\n🔄 TRANSFORMING LEADS:');
  console.log(`   Processing ${items.length} raw items...`);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      // Transform item to standard format
      const lead = transformLeadData(item, actor);

      // Skip if no essential data
      if (!lead.company_name && !lead.email && !lead.website) {
        console.log(`   ⚠️  [${i + 1}/${items.length}] Skipped: Insufficient data`);
        continue;
      }

      console.log(`   📝 [${i + 1}/${items.length}] Storing: ${lead.company_name || lead.email || lead.website}`);

      // Insert into database with duplicate prevention
      const result = await query(`
        INSERT INTO generated_leads (
          company_name,
          email,
          phone,
          website,
          location,
          city,
          country,
          industry,
          title,
          snippet,
          description,
          linkedin_url,
          facebook_url,
          twitter_url,
          contact_person,
          employee_count,
          revenue,
          founded_year,
          query_used,
          source_actor,
          run_id,
          confidence_score,
          intent,
          raw_data,
          first_name,
          last_name,
          full_name,
          job_title,
          seniority,
          company_domain,
          company_linkedin,
          company_phone,
          company_revenue_clean,
          company_total_funding,
          company_total_funding_clean,
          company_technologies,
          keywords,
          user_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38
        )
        ON CONFLICT (email, website, user_id) 
        DO UPDATE SET
          updated_at = NOW(),
          query_used = EXCLUDED.query_used
        RETURNING *
      `, [
        lead.company_name,
        lead.email,
        lead.phone,
        lead.website,
        lead.location || location,
        lead.city,
        lead.country,
        lead.industry || industry,
        lead.title,
        lead.snippet,
        lead.description,
        lead.linkedin_url,
        lead.facebook_url,
        lead.twitter_url,
        lead.contact_person,
        lead.employee_count,
        lead.revenue,
        lead.founded_year,
        keyword,
        actor,
        runId,
        lead.confidence_score || 50,
        lead.intent || 'WARM',
        JSON.stringify(item),
        lead.first_name,
        lead.last_name,
        lead.full_name,
        lead.job_title,
        lead.seniority,
        lead.company_domain,
        lead.company_linkedin,
        lead.company_phone,
        lead.company_revenue_clean,
        lead.company_total_funding,
        lead.company_total_funding_clean,
        lead.company_technologies,
        lead.keywords,
        userId  // NEW: Save with user_id
      ]);

      storedLeads.push(result.rows[0]);
      console.log(`      ✅ Stored successfully (ID: ${result.rows[0].id})`);

    } catch (error) {
      // If it's a duplicate key error, that's OK - we just skip it
      if (error.code === '23505') {
        duplicateCount++;
        console.log(`      ℹ️  Duplicate - already exists in database`);
      } else {
        console.error(`      ❌ Error storing lead: ${error.message}`);
      }
    }
  }

  console.log('\n📊 STORAGE SUMMARY:');
  console.log(`   ✅ Successfully stored: ${storedLeads.length}`);
  console.log(`   ℹ️  Duplicates skipped: ${duplicateCount}`);
  console.log(`   ⚠️  Insufficient data: ${items.length - storedLeads.length - duplicateCount}`);

  return storedLeads;
}

/**
 * Transform raw actor data to standard lead format
 * @param {Object} item - Raw item from actor
 * @param {string} actor - Actor ID
 * @returns {Object} - Standardized lead object
 */
function transformLeadData(item, actor) {
  // This function normalizes different actor outputs to a standard format
  // The code_crafter/leads-finder actor returns: company_name, linkedin, company_size, etc.

  const lead = {
    // Company information
    company_name: item.company_name || item.companyName || item.name || item.businessName || null,
    website: item.company_website || item.website || item.url || item.websiteUrl || item.company_domain || null,
    industry: item.industry || item.category || null,
    employee_count: item.company_size || item.employeeCount || item.employees || null,
    revenue: item.company_annual_revenue || item.revenue || item.annualRevenue || null,
    founded_year: item.company_founded_year || item.foundedYear || item.yearFounded || null,
    description: item.company_description || item.description || item.about || null,

    // Contact information
    email: item.email || item.contactEmail || item.mail || null,
    phone: item.mobile_number || item.company_phone || item.phone || item.phoneNumber || item.telephone || null,
    contact_person: item.full_name || item.first_name || item.last_name || item.contactPerson || item.owner || item.manager || null,

    // Job/Position information  
    title: item.job_title || item.title || item.headline || null,
    snippet: item.headline || item.snippet || item.description?.substring(0, 500) || null,

    // Location
    location: `${item.city || ''}${item.city && item.state ? ', ' : ''}${item.state || ''}`.trim() || item.company_full_address || item.location || item.address || null,
    city: item.city || item.company_city || null,
    country: item.country || item.company_country || null,

    // Social/LinkedIn
    linkedin_url: item.linkedin || item.linkedinUrl || item.linkedin_url || null,
    facebook_url: item.facebookUrl || item.facebook || null,
    twitter_url: item.twitterUrl || item.twitter || null,

    // Scoring
    confidence_score: item.score || item.confidence || 70,
    intent: item.seniority_level ? (item.seniority_level === 'owner' || item.seniority_level === 'c_suite' ? 'HOT' : 'WARM') : (item.intent || 'WARM'),

    // NEW FIELDS from leads-finder actor
    first_name: item.first_name || null,
    last_name: item.last_name || null,
    full_name: item.full_name || null,
    job_title: item.job_title || null,
    seniority: item.seniority_level || null,
    company_domain: item.company_domain || null,
    company_linkedin: item.company_linkedin || null,
    company_phone: item.company_phone || null,
    company_revenue_clean: item.company_annual_revenue_clean || null,
    company_total_funding: item.company_total_funding || null,
    company_total_funding_clean: item.company_total_funding_clean || null,
    company_technologies: item.company_technologies || null,
    keywords: item.keywords || null
  };

  return lead;
}

/**
 * Get lead generation statistics
 * @param {string} keyword - Optional keyword filter
 * @returns {Promise<Object>} - Statistics
 */
async function getLeadStats(keyword = null) {
  try {
    const whereClause = keyword ? 'WHERE query_used ILIKE $1' : '';
    const params = keyword ? [`%${keyword}%`] : [];

    const result = await query(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(DISTINCT query_used) as unique_queries,
        COUNT(DISTINCT source_actor) as actors_used,
        COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as leads_with_email,
        COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as leads_with_phone,
        COUNT(CASE WHEN intent = 'HOT' THEN 1 END) as hot_leads,
        COUNT(CASE WHEN intent = 'WARM' THEN 1 END) as warm_leads,
        COUNT(CASE WHEN intent = 'COLD' THEN 1 END) as cold_leads,
        AVG(confidence_score)::INTEGER as avg_confidence,
        MIN(created_at) as first_lead_date,
        MAX(created_at) as latest_lead_date
      FROM generated_leads
      ${whereClause}
    `, params);

    return result.rows[0];

  } catch (error) {
    console.error('❌ Error fetching lead stats:', error);
    throw error;
  }
}

/**
 * Smart Domain-to-Lead Matching with Interest Categorization
 * Analyzes a domain and categorizes ALL leads into high/low interest
 * NEVER returns 0 leads - always shows something to the user
 * 
 * @param {Object} options - Matching options
 * @param {string} options.domain - Domain name to analyze (e.g., "fitness.com")
 * @param {number} options.userId - User ID for filtering leads
 * @param {number} options.limitHigh - Max high interest results (default: 20)
 * @param {number} options.limitLow - Max low interest results (default: 50)
 * @returns {Promise<Object>} - Object with highInterest and lowInterest arrays
 */
async function matchLeadsForDomain(options) {
  const { domain, userId, limitHigh = 20, limitLow = 50 } = options;

  try {
    console.log(`\n🎯 SMART DOMAIN MATCHING: "${domain}"`);
    console.log(`   User ID: ${userId || 'All users'}`);
    console.log(`   High Interest Limit: ${limitHigh}`);
    console.log(`   Low Interest Limit: ${limitLow}`);

    // Extract keywords from domain name
    const domainKeywords = extractDomainKeywords(domain);
    console.log(`   📝 Extracted Keywords: ${domainKeywords.join(', ')}`);

    // Build WHERE clause for user filtering
    let whereClause = '';
    let params = [];

    if (userId) {
      whereClause = 'WHERE user_id = $1';
      params.push(userId);
    }

    // Build scoring calculation
    let scoreCalc = '';
    domainKeywords.forEach((keyword, idx) => {
      const searchTerm = `%${keyword}%`;
      if (idx > 0) scoreCalc += ' + ';
      scoreCalc += `
        (CASE WHEN industry ILIKE '${searchTerm}' THEN 30 ELSE 0 END) +
        (CASE WHEN keywords ILIKE '${searchTerm}' THEN 20 ELSE 0 END) +
        (CASE WHEN company_name ILIKE '${searchTerm}' THEN 15 ELSE 0 END) +
        (CASE WHEN description ILIKE '${searchTerm}' THEN 10 ELSE 0 END) +
        (CASE WHEN job_title ILIKE '${searchTerm}' OR title ILIKE '${searchTerm}' THEN 5 ELSE 0 END)
      `;
    });

    // Query to get ALL leads with calculated scores
    const allLeadsQuery = `
      SELECT 
        id,
        company_name,
        email,
        phone,
        website,
        location,
        city,
        country,
        industry,
        title,
        snippet,
        description,
        linkedin_url,
        contact_person,
        employee_count,
        revenue,
        founded_year,
        first_name,
        last_name,
        full_name,
        job_title,
        seniority,
        company_domain,
        company_linkedin,
        company_phone,
        company_revenue_clean,
        company_total_funding_clean,
        company_technologies,
        keywords,
        created_at,
        (
          ${scoreCalc} +
          (CASE WHEN seniority IN ('owner', 'c_suite', 'vp') THEN 20 ELSE 0 END)
        ) as confidence_score
      FROM generated_leads
      ${whereClause}
      ORDER BY confidence_score DESC, created_at DESC
    `;

    console.log(`\n🔍 Fetching all user leads with relevance scoring...`);
    const result = await query(allLeadsQuery, params);
    const allLeads = result.rows;

    console.log(`   📊 Total leads found: ${allLeads.length}`);

    // Categorize leads
    const HIGH_INTEREST_THRESHOLD = 40; // Score of 40+ = High Interest

    const highInterest = allLeads
      .filter(lead => lead.confidence_score >= HIGH_INTEREST_THRESHOLD)
      .slice(0, limitHigh);

    const lowInterest = allLeads
      .filter(lead => lead.confidence_score < HIGH_INTEREST_THRESHOLD)
      .slice(0, limitLow);

    console.log(`\n📊 CATEGORIZATION RESULTS:`);
    console.log(`   🔥 High Interest: ${highInterest.length} leads (score ≥ ${HIGH_INTEREST_THRESHOLD})`);
    console.log(`   📋 Low Interest: ${lowInterest.length} leads (score < ${HIGH_INTEREST_THRESHOLD})`);

    if (highInterest.length > 0) {
      console.log(`   🏆 Top High Interest: ${highInterest[0].company_name} (Score: ${highInterest[0].confidence_score})`);
      console.log(`      📧 ${highInterest[0].email}`);
      console.log(`      💼 ${highInterest[0].job_title || highInterest[0].title}`);
    }

    if (lowInterest.length > 0) {
      console.log(`   📌 Top Low Interest: ${lowInterest[0].company_name} (Score: ${lowInterest[0].confidence_score})`);
    }

    return {
      highInterest,
      lowInterest,
      total: allLeads.length,
      stats: {
        highInterestCount: highInterest.length,
        lowInterestCount: lowInterest.length,
        threshold: HIGH_INTEREST_THRESHOLD
      }
    };

  } catch (error) {
    console.error('❌ Error matching leads for domain:', error);
    throw error;
  }
}

/**
 * Extract meaningful keywords from a domain name
 * @param {string} domain - Domain name (e.g., "fitness.com", "startup-ai.io")
 * @returns {Array<string>} - Array of keywords
 */
function extractDomainKeywords(domain) {
  // Remove TLD (.com, .io, .ai, etc.)
  const domainWithoutTld = domain.replace(/\.(com|net|org|io|ai|co|app|tech|dev|cloud|xyz|info|biz)$/i, '');

  // Split by common separators
  const parts = domainWithoutTld.split(/[-_]/);

  // Add full domain name without TLD as a keyword
  const keywords = [domainWithoutTld];

  // Add individual parts if split occurred
  if (parts.length > 1) {
    keywords.push(...parts);
  }

  // Filter out common words and short strings
  const filtered = keywords.filter(k =>
    k.length > 2 &&
    !['www', 'the', 'and', 'for', 'app'].includes(k.toLowerCase())
  );

  // Convert to lowercase and remove duplicates
  return [...new Set(filtered.map(k => k.toLowerCase()))];
}

module.exports = {
  generateLeads,
  searchCachedLeads,
  scrapeLeads,
  getLeadStats,
  matchLeadsForDomain,
  LEAD_ACTORS
};

