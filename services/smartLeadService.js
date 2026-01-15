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
    forceRefresh = false
  } = options;

  console.log('\n🎯 Smart Lead Generation Request');
  console.log(`   Keyword: "${keyword}"`);
  console.log(`   Count: ${count}`);
  console.log(`   Location: ${location || 'Any'}`);
  console.log(`   Industry: ${industry || 'Any'}`);
  console.log(`   Force Refresh: ${forceRefresh}`);

  try {
    // Step 1: Check database for existing leads matching this keyword
    if (!forceRefresh) {
      console.log('\n🔍 Checking database for existing leads...');
      
      const cachedLeads = await searchCachedLeads({
        keyword,
        location,
        industry,
        limit: count
      });

      if (cachedLeads.length >= count) {
        console.log(`✅ Found ${cachedLeads.length} cached leads matching criteria`);
        console.log('   Returning from cache (no scraping needed)');
        
        return {
          success: true,
          source: 'cache',
          leads: cachedLeads.slice(0, count),
          totalFound: cachedLeads.length,
          requested: count,
          fromCache: true,
          scrapingUsed: false
        };
      } else if (cachedLeads.length > 0) {
        console.log(`⚠️ Found only ${cachedLeads.length} cached leads (need ${count})`);
        console.log(`   Will scrape ${count - cachedLeads.length} more leads`);
        
        // Return partial cached results and scrape the rest
        const remainingCount = count - cachedLeads.length;
        const scrapedLeads = await scrapeLeads({
          keyword,
          location,
          industry,
          count: remainingCount,
          actor
        });

        // Combine cached + scraped
        const allLeads = [...cachedLeads, ...scrapedLeads];
        
        return {
          success: true,
          source: 'hybrid',
          leads: allLeads.slice(0, count),
          totalFound: allLeads.length,
          requested: count,
          fromCache: cachedLeads.length,
          fromScraping: scrapedLeads.length,
          scrapingUsed: true
        };
      }
    }

    // Step 2: No cached leads found or force refresh - scrape new leads
    console.log('\n🕷️ No cached leads found. Starting fresh scraping...');
    
    const scrapedLeads = await scrapeLeads({
      keyword,
      location,
      industry,
      count,
      actor
    });

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
    console.error('❌ Error in smart lead generation:', error);
    throw error;
  }
}

/**
 * Search for cached leads in database
 * @param {Object} filters - Search filters
 * @returns {Promise<Array>} - Cached leads
 */
async function searchCachedLeads(filters) {
  const { keyword, location, industry, limit = 10 } = filters;

  try {
    // Build dynamic WHERE clause
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Keyword matching (search in title, snippet, company_name, description)
    if (keyword) {
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
    actor = DEFAULT_ACTOR
  } = options;

  console.log(`\n🚀 Starting Apify actor: ${actor}`);

  try {
    // Prepare actor input based on which actor is being used
    let input = prepareActorInput(actor, {
      keyword,
      location,
      industry,
      count
    });

    console.log('📤 Actor Input:', JSON.stringify(input, null, 2));

    // Run the actor
    const run = await apifyClient.actor(actor).call(input, {
      timeout: DEFAULT_TIMEOUT,
      memory: 2048, // 2GB
    });

    console.log(`✅ Actor run completed: ${run.id}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Compute units: ${run.usedComputeUnits || 0}`);

    if (run.status !== 'SUCCEEDED') {
      throw new Error(`Actor run failed with status: ${run.status}`);
    }

    // Fetch dataset results
    console.log('📥 Fetching scraped results...');
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    console.log(`✅ Retrieved ${items.length} raw results`);

    // Transform and store leads
    const transformedLeads = await transformAndStoreLeads(items, {
      keyword,
      location,
      industry,
      actor,
      runId: run.id
    });

    console.log(`✅ Stored ${transformedLeads.length} unique leads`);

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

  switch (actor) {
    case LEAD_ACTORS.LEADS_FINDER:
      // Generic leads finder input format
      return {
        query: keyword,
        location: location || undefined,
        industry: industry || undefined,
        maxResults: count,
        includeEmails: true,
        includePhones: true,
        includeSocialMedia: true
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
  const { keyword, location, industry, actor, runId } = metadata;
  const storedLeads = [];

  for (const item of items) {
    try {
      // Transform item to standard format
      const lead = transformLeadData(item, actor);

      // Skip if no essential data
      if (!lead.company_name && !lead.email && !lead.website) {
        console.log('⚠️ Skipping lead with insufficient data');
        continue;
      }

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
          raw_data
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24
        )
        ON CONFLICT (email, website) 
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
        JSON.stringify(item)
      ]);

      storedLeads.push(result.rows[0]);

    } catch (error) {
      // If it's a duplicate key error, that's OK - we just skip it
      if (error.code === '23505') {
        console.log('   ℹ️ Duplicate lead skipped');
      } else {
        console.error('❌ Error storing lead:', error.message);
      }
    }
  }

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
  
  const lead = {
    company_name: item.companyName || item.name || item.title || item.businessName || null,
    email: item.email || item.contactEmail || item.mail || null,
    phone: item.phone || item.phoneNumber || item.telephone || null,
    website: item.website || item.url || item.websiteUrl || null,
    location: item.location || item.address || null,
    city: item.city || null,
    country: item.country || null,
    industry: item.industry || item.category || null,
    title: item.title || item.name || null,
    snippet: item.snippet || item.description?.substring(0, 500) || null,
    description: item.description || item.about || null,
    linkedin_url: item.linkedinUrl || item.linkedin || null,
    facebook_url: item.facebookUrl || item.facebook || null,
    twitter_url: item.twitterUrl || item.twitter || null,
    contact_person: item.contactPerson || item.owner || item.manager || null,
    employee_count: item.employeeCount || item.employees || null,
    revenue: item.revenue || item.annualRevenue || null,
    founded_year: item.foundedYear || item.yearFounded || null,
    confidence_score: item.score || item.confidence || 50,
    intent: item.intent || 'WARM'
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

module.exports = {
  generateLeads,
  searchCachedLeads,
  scrapeLeads,
  getLeadStats,
  LEAD_ACTORS
};

