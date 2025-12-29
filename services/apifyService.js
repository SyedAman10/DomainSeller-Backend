/**
 * Apify Service
 * 
 * Handles all Apify API interactions for scraping Google SERP data
 * Actor: damilo/google-search-apify
 */

const { ApifyClient } = require('apify-client');
const { query } = require('../config/database');

// Initialize Apify client
const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_KEY,
});

const GOOGLE_SERP_ACTOR = 'damilo/google-search-apify';
const DEFAULT_TIMEOUT = 300; // 5 minutes
const MAX_RETRIES = 3;

/**
 * Scrape Google SERP results using Apify actor
 * @param {Object} options - Scraping options
 * @param {string} options.query - Search query
 * @param {string} options.country - Country code (e.g., 'us')
 * @param {string} options.language - Language code (e.g., 'en')
 * @param {number} options.maxPages - Maximum pages to scrape
 * @param {number} options.resultsPerPage - Results per page
 * @param {string} options.dateRange - Date range filter ('anytime', 'day', 'week', 'month', 'year')
 * @returns {Promise<Object>} - Scraping results with metadata
 */
async function scrapeGoogleSERP(options) {
  const {
    query: searchQuery,
    country = 'us',
    language = 'en',
    maxPages = 1,
    resultsPerPage = 10,
    dateRange = 'anytime',
    sessionId = null
  } = options;

  console.log('\n🔍 Starting Google SERP scraping...');
  console.log(`   Query: "${searchQuery}"`);
  console.log(`   Country: ${country} | Language: ${language}`);
  console.log(`   Max Pages: ${maxPages} | Results/Page: ${resultsPerPage}`);
  console.log(`   Date Range: ${dateRange}`);

  let session = null;
  let run = null;

  try {
    // Create or update scraping session in database
    if (sessionId) {
      session = await query(
        `UPDATE lead_scraping_sessions 
         SET status = 'running', started_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [sessionId]
      );
      session = session.rows[0];
    } else {
      session = await query(
        `INSERT INTO lead_scraping_sessions (
          actor_id, query, country_code, language_code, 
          max_pages, results_per_page, date_range, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'running')
        RETURNING *`,
        [GOOGLE_SERP_ACTOR, searchQuery, country, language, maxPages, resultsPerPage, dateRange]
      );
      session = session.rows[0];
    }

    // Run the Apify actor
    console.log(`📡 Running Apify actor: ${GOOGLE_SERP_ACTOR}`);
    
    const input = {
      query: searchQuery,
      country: country,
      language: language,
      max_pages: maxPages,
      results_per_page: resultsPerPage,
      date_range: dateRange
    };

    run = await apifyClient.actor(GOOGLE_SERP_ACTOR).call(input, {
      timeout: DEFAULT_TIMEOUT,
      memory: 1024, // 1 GB
    });

    console.log(`✅ Actor run completed: ${run.id}`);
    console.log(`   Status: ${run.status}`);
    console.log(`   Compute units: ${run.usedComputeUnits || 0}`);

    // Update session with run ID
    await query(
      'UPDATE lead_scraping_sessions SET run_id = $1 WHERE id = $2',
      [run.id, session.id]
    );

    // Check run status
    if (run.status !== 'SUCCEEDED') {
      throw new Error(`Actor run failed with status: ${run.status}`);
    }

    // Fetch dataset items
    console.log('📥 Fetching dataset results...');
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    console.log(`✅ Retrieved ${items.length} results`);

    // Calculate duration
    const startTime = new Date(session.started_at);
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    // Update session as completed
    await query(
      `UPDATE lead_scraping_sessions 
       SET status = 'completed',
           completed_at = NOW(),
           total_results = $1,
           duration_seconds = $2,
           compute_units = $3
       WHERE id = $4`,
      [items.length, durationSeconds, run.usedComputeUnits || 0, session.id]
    );

    return {
      success: true,
      sessionId: session.id,
      runId: run.id,
      results: items,
      totalResults: items.length,
      computeUnits: run.usedComputeUnits || 0,
      durationSeconds
    };

  } catch (error) {
    console.error('❌ Error scraping Google SERP:', error);

    // Update session as failed
    if (session) {
      await query(
        `UPDATE lead_scraping_sessions 
         SET status = 'failed',
             completed_at = NOW(),
             error_message = $1
         WHERE id = $2`,
        [error.message, session.id]
      );
    }

    throw error;
  }
}

/**
 * Crawl a specific URL to extract contact information
 * @param {string} url - URL to crawl
 * @param {Object} options - Crawling options
 * @returns {Promise<Object>} - Extracted data
 */
async function crawlURLForContacts(url, options = {}) {
  const {
    timeout = 60,
    extractEmails = true,
    extractSocial = true,
    extractAuthor = true
  } = options;

  console.log(`🕷️ Crawling URL for contacts: ${url}`);

  try {
    // Use Apify Website Content Crawler actor
    const CRAWLER_ACTOR = 'apify/website-content-crawler';
    
    const input = {
      startUrls: [{ url }],
      maxCrawlPages: 1,
      maxCrawlDepth: 0,
      readableTextCharThreshold: 100
    };

    const run = await apifyClient.actor(CRAWLER_ACTOR).call(input, {
      timeout,
      memory: 512
    });

    if (run.status !== 'SUCCEEDED') {
      throw new Error(`Crawler failed with status: ${run.status}`);
    }

    // Fetch crawled data
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    if (items.length === 0) {
      return {
        success: false,
        error: 'No content extracted'
      };
    }

    const pageData = items[0];
    const extractedData = {
      success: true,
      url,
      emails: [],
      author: null,
      socialProfiles: []
    };

    // Extract emails from text content
    if (extractEmails && pageData.text) {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const foundEmails = pageData.text.match(emailRegex) || [];
      extractedData.emails = [...new Set(foundEmails)]; // Remove duplicates
    }

    // Extract author from metadata
    if (extractAuthor && pageData.metadata) {
      extractedData.author = pageData.metadata.author || 
                             pageData.metadata['article:author'] || 
                             null;
    }

    // Extract social profiles (Twitter, LinkedIn, etc.)
    if (extractSocial && pageData.text) {
      const socialRegex = /(https?:\/\/)?(www\.)?(twitter|linkedin|facebook|instagram)\.com\/[\w-]+/gi;
      const foundSocial = pageData.text.match(socialRegex) || [];
      extractedData.socialProfiles = [...new Set(foundSocial)];
    }

    console.log(`✅ Extracted: ${extractedData.emails.length} emails, ${extractedData.socialProfiles.length} social profiles`);

    return extractedData;

  } catch (error) {
    console.error(`❌ Error crawling URL ${url}:`, error.message);
    return {
      success: false,
      url,
      error: error.message
    };
  }
}

/**
 * Get status of a scraping session
 * @param {number} sessionId - Session ID
 * @returns {Promise<Object>} - Session status
 */
async function getScrapingSessionStatus(sessionId) {
  const result = await query(
    'SELECT * FROM lead_scraping_sessions WHERE id = $1',
    [sessionId]
  );

  if (result.rows.length === 0) {
    throw new Error('Session not found');
  }

  return result.rows[0];
}

/**
 * Get recent scraping sessions
 * @param {number} limit - Number of sessions to retrieve
 * @returns {Promise<Array>} - List of sessions
 */
async function getRecentSessions(limit = 10) {
  const result = await query(
    `SELECT * FROM lead_scraping_sessions 
     ORDER BY created_at DESC 
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

/**
 * Retry failed scraping session
 * @param {number} sessionId - Session ID to retry
 * @returns {Promise<Object>} - New scraping results
 */
async function retryScrapingSession(sessionId) {
  const session = await getScrapingSessionStatus(sessionId);

  if (session.status !== 'failed') {
    throw new Error('Can only retry failed sessions');
  }

  console.log(`🔄 Retrying failed session ${sessionId}...`);

  return scrapeGoogleSERP({
    query: session.query,
    country: session.country_code,
    language: session.language_code,
    maxPages: session.max_pages,
    resultsPerPage: session.results_per_page,
    dateRange: session.date_range,
    sessionId
  });
}

module.exports = {
  scrapeGoogleSERP,
  crawlURLForContacts,
  getScrapingSessionStatus,
  getRecentSessions,
  retryScrapingSession
};

