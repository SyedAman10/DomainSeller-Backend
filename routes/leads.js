/**
 * Domain Buyer Leads Routes
 * 
 * REST API endpoints for lead generation and management
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { scrapeGoogleSERP, crawlURLForContacts, getScrapingSessionStatus, getRecentSessions } = require('../services/apifyService');
const { classifyLeadsBatch, getClassificationStats, shouldCrawlLead, filterLowQualityLeads } = require('../services/leadClassificationService');

/**
 * POST /api/leads/collect
 * Trigger lead collection from Google SERP
 */
router.post('/collect', async (req, res) => {
  console.log('\n🎯 Lead Collection Request Received');
  
  try {
    const {
      query: searchQuery,
      country = 'us',
      language = 'en',
      maxPages = 1,
      resultsPerPage = 10,
      dateRange = 'anytime',
      crawlContacts = true,
      minConfidence = 20
    } = req.body;

    // Validation
    if (!searchQuery || searchQuery.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    console.log(`📊 Query: "${searchQuery}"`);
    console.log(`🌍 Country: ${country} | Language: ${language}`);
    console.log(`📄 Max Pages: ${maxPages} | Results/Page: ${resultsPerPage}`);

    // Step 1: Scrape Google SERP using Apify
    const scrapingResult = await scrapeGoogleSERP({
      query: searchQuery,
      country,
      language,
      maxPages,
      resultsPerPage,
      dateRange
    });

    if (!scrapingResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to scrape search results',
        message: scrapingResult.error
      });
    }

    console.log(`✅ Scraped ${scrapingResult.totalResults} results`);

    // Step 2: Transform and classify leads
    const rawLeads = scrapingResult.results.map((result, index) => ({
      title: result.title || '',
      snippet: result.snippet || result.description || '',
      url: result.url || result.link || '',
      position: index + 1
    }));

    console.log(`🧠 Classifying ${rawLeads.length} leads...`);
    let classifiedLeads = classifyLeadsBatch(rawLeads);

    // Filter low quality leads
    classifiedLeads = filterLowQualityLeads(classifiedLeads, minConfidence);
    console.log(`✅ ${classifiedLeads.length} leads passed quality filter (min confidence: ${minConfidence})`);

    // Get classification stats
    const stats = getClassificationStats(classifiedLeads);
    console.log(`📈 HOT: ${stats.hot} | WARM: ${stats.warm} | COLD: ${stats.cold}`);

    // Step 3: Store leads in database (batch insert)
    const insertedLeads = [];
    
    for (const lead of classifiedLeads) {
      try {
        const result = await query(
          `INSERT INTO domain_buyer_leads (
            source, query_used, title, snippet, url, 
            intent, confidence_score, matched_keywords,
            country_code, language_code, position
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (url, query_used) DO NOTHING
          RETURNING *`,
          [
            'google',
            searchQuery,
            lead.title,
            lead.snippet,
            lead.url,
            lead.intent,
            lead.confidence_score,
            lead.matched_keywords,
            country,
            language,
            lead.position
          ]
        );
        
        if (result.rows.length > 0) {
          insertedLeads.push(result.rows[0]);
        }
      } catch (err) {
        console.error(`⚠️ Failed to insert lead: ${lead.url}`, err.message);
      }
    }

    console.log(`💾 Stored ${insertedLeads.length} new leads in database`);

    // Step 4: Optionally crawl HOT and WARM leads for contact info
    let crawledCount = 0;
    
    if (crawlContacts) {
      console.log('\n🕷️ Starting contact crawling for HOT/WARM leads...');
      
      const leadsToCrawl = insertedLeads.filter(lead => shouldCrawlLead(lead.intent));
      console.log(`📋 ${leadsToCrawl.length} leads eligible for crawling`);

      for (const lead of leadsToCrawl.slice(0, 5)) { // Limit to 5 to avoid long delays
        try {
          console.log(`   Crawling: ${lead.url}`);
          
          // Mark crawl attempt
          await query(
            'UPDATE domain_buyer_leads SET crawl_attempted_at = NOW() WHERE id = $1',
            [lead.id]
          );

          const contactData = await crawlURLForContacts(lead.url, {
            timeout: 30,
            extractEmails: true,
            extractSocial: true,
            extractAuthor: true
          });

          if (contactData.success) {
            // Update lead with contact info
            await query(
              `UPDATE domain_buyer_leads 
               SET contact_email = $1,
                   author_name = $2,
                   profile_url = $3,
                   crawled = true
               WHERE id = $4`,
              [
                contactData.emails[0] || null,
                contactData.author || null,
                contactData.socialProfiles[0] || null,
                lead.id
              ]
            );
            
            crawledCount++;
            console.log(`   ✅ Extracted contacts`);
          }
        } catch (err) {
          console.error(`   ❌ Crawl failed: ${err.message}`);
          
          await query(
            'UPDATE domain_buyer_leads SET crawl_error = $1 WHERE id = $2',
            [err.message, lead.id]
          );
        }
      }
      
      console.log(`✅ Successfully crawled ${crawledCount} leads`);
    }

    // Update scraping session stats
    await query(
      `UPDATE lead_scraping_sessions 
       SET hot_leads = $1, warm_leads = $2, cold_leads = $3
       WHERE id = $4`,
      [stats.hot, stats.warm, stats.cold, scrapingResult.sessionId]
    );

    // Return success response
    res.json({
      success: true,
      message: 'Lead collection completed',
      data: {
        sessionId: scrapingResult.sessionId,
        runId: scrapingResult.runId,
        totalScraped: scrapingResult.totalResults,
        totalStored: insertedLeads.length,
        totalCrawled: crawledCount,
        breakdown: {
          hot: stats.hot,
          warm: stats.warm,
          cold: stats.cold
        },
        avgConfidence: stats.avgConfidence,
        topKeywords: stats.topKeywords,
        computeUnits: scrapingResult.computeUnits,
        durationSeconds: scrapingResult.durationSeconds
      }
    });

  } catch (error) {
    console.error('❌ Error collecting leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect leads',
      message: error.message
    });
  }
});

/**
 * GET /api/leads
 * Get paginated list of leads with filters
 */
router.get('/', async (req, res) => {
  console.log('📋 Fetching leads...');

  try {
    const {
      intent,
      status = 'new',
      source = 'google',
      minConfidence = 0,
      hasEmail = false,
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    // Build dynamic query
    let queryText = 'SELECT * FROM domain_buyer_leads WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;

    // Filter by intent
    if (intent) {
      paramCount++;
      queryText += ` AND intent = $${paramCount}`;
      queryParams.push(intent.toUpperCase());
    }

    // Filter by status
    if (status && status !== 'all') {
      paramCount++;
      queryText += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }

    // Filter by source
    if (source && source !== 'all') {
      paramCount++;
      queryText += ` AND source = $${paramCount}`;
      queryParams.push(source);
    }

    // Filter by minimum confidence
    if (minConfidence > 0) {
      paramCount++;
      queryText += ` AND confidence_score >= $${paramCount}`;
      queryParams.push(minConfidence);
    }

    // Filter by has email
    if (hasEmail === 'true' || hasEmail === true) {
      queryText += ` AND contact_email IS NOT NULL`;
    }

    // Add sorting
    const allowedSortFields = ['created_at', 'confidence_score', 'intent', 'position'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    queryText += ` ORDER BY ${sortField} ${order}`;

    // Add pagination
    paramCount++;
    queryText += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));

    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    queryParams.push(parseInt(offset));

    // Execute query
    const result = await query(queryText, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM domain_buyer_leads WHERE 1=1';
    const countParams = [];
    let countParamIndex = 0;

    if (intent) {
      countParamIndex++;
      countQuery += ` AND intent = $${countParamIndex}`;
      countParams.push(intent.toUpperCase());
    }

    if (status && status !== 'all') {
      countParamIndex++;
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
    }

    if (source && source !== 'all') {
      countParamIndex++;
      countQuery += ` AND source = $${countParamIndex}`;
      countParams.push(source);
    }

    if (minConfidence > 0) {
      countParamIndex++;
      countQuery += ` AND confidence_score >= $${countParamIndex}`;
      countParams.push(minConfidence);
    }

    if (hasEmail === 'true' || hasEmail === true) {
      countQuery += ` AND contact_email IS NOT NULL`;
    }

    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        leads: result.rows,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + result.rows.length) < totalCount
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/stats
 * Get lead statistics and overview
 */
router.get('/stats', async (req, res) => {
  console.log('📊 Fetching lead statistics...');

  try {
    const statsResult = await query('SELECT * FROM lead_stats');
    const stats = statsResult.rows[0];

    // Get recent leads by intent
    const recentHot = await query(
      `SELECT * FROM domain_buyer_leads 
       WHERE intent = 'HOT' 
       ORDER BY created_at DESC 
       LIMIT 5`
    );

    const recentWarm = await query(
      `SELECT * FROM domain_buyer_leads 
       WHERE intent = 'WARM' 
       ORDER BY created_at DESC 
       LIMIT 5`
    );

    // Get recent scraping sessions
    const recentSessions = await getRecentSessions(5);

    res.json({
      success: true,
      data: {
        overview: stats,
        recentHotLeads: recentHot.rows,
        recentWarmLeads: recentWarm.rows,
        recentSessions: recentSessions
      }
    });

  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/:id
 * Get single lead by ID
 */
router.get('/:id', async (req, res) => {
  console.log(`🔍 Fetching lead ${req.params.id}...`);

  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM domain_buyer_leads WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead',
      message: error.message
    });
  }
});

/**
 * PUT /api/leads/:id
 * Update lead (status, notes, assignment, etc.)
 */
router.put('/:id', async (req, res) => {
  console.log(`✏️ Updating lead ${req.params.id}...`);

  try {
    const { id } = req.params;
    const {
      status,
      notes,
      assigned_to,
      contact_email,
      author_name,
      profile_url,
      phone
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      values.push(status);
    }

    if (notes !== undefined) {
      paramCount++;
      updates.push(`notes = $${paramCount}`);
      values.push(notes);
    }

    if (assigned_to !== undefined) {
      paramCount++;
      updates.push(`assigned_to = $${paramCount}`);
      values.push(assigned_to);
    }

    if (contact_email !== undefined) {
      paramCount++;
      updates.push(`contact_email = $${paramCount}`);
      values.push(contact_email);
    }

    if (author_name !== undefined) {
      paramCount++;
      updates.push(`author_name = $${paramCount}`);
      values.push(author_name);
    }

    if (profile_url !== undefined) {
      paramCount++;
      updates.push(`profile_url = $${paramCount}`);
      values.push(profile_url);
    }

    if (phone !== undefined) {
      paramCount++;
      updates.push(`phone = $${paramCount}`);
      values.push(phone);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    paramCount++;
    values.push(id);

    const queryText = `
      UPDATE domain_buyer_leads 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead updated',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error updating lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update lead',
      message: error.message
    });
  }
});

/**
 * DELETE /api/leads/:id
 * Delete a lead (GDPR compliance)
 */
router.delete('/:id', async (req, res) => {
  console.log(`🗑️ Deleting lead ${req.params.id}...`);

  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM domain_buyer_leads WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/sessions/:sessionId
 * Get scraping session details
 */
router.get('/sessions/:sessionId', async (req, res) => {
  console.log(`📊 Fetching session ${req.params.sessionId}...`);

  try {
    const { sessionId } = req.params;

    const session = await getScrapingSessionStatus(sessionId);

    // Get leads from this session
    const leadsResult = await query(
      `SELECT * FROM domain_buyer_leads 
       WHERE query_used = $1 
       AND created_at >= $2
       ORDER BY position ASC`,
      [session.query, session.started_at]
    );

    res.json({
      success: true,
      data: {
        session,
        leads: leadsResult.rows
      }
    });

  } catch (error) {
    console.error('❌ Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session',
      message: error.message
    });
  }
});

/**
 * POST /api/leads/:id/crawl
 * Manually trigger contact crawling for a specific lead
 */
router.post('/:id/crawl', async (req, res) => {
  console.log(`🕷️ Manual crawl requested for lead ${req.params.id}...`);

  try {
    const { id } = req.params;

    // Get lead
    const leadResult = await query(
      'SELECT * FROM domain_buyer_leads WHERE id = $1',
      [id]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    const lead = leadResult.rows[0];

    // Mark crawl attempt
    await query(
      'UPDATE domain_buyer_leads SET crawl_attempted_at = NOW() WHERE id = $1',
      [id]
    );

    // Crawl for contacts
    const contactData = await crawlURLForContacts(lead.url);

    if (contactData.success) {
      // Update lead
      await query(
        `UPDATE domain_buyer_leads 
         SET contact_email = $1,
             author_name = $2,
             profile_url = $3,
             crawled = true,
             crawl_error = NULL
         WHERE id = $4`,
        [
          contactData.emails[0] || null,
          contactData.author || null,
          contactData.socialProfiles[0] || null,
          id
        ]
      );

      res.json({
        success: true,
        message: 'Contact information extracted',
        data: {
          emails: contactData.emails,
          author: contactData.author,
          socialProfiles: contactData.socialProfiles
        }
      });
    } else {
      await query(
        'UPDATE domain_buyer_leads SET crawl_error = $1 WHERE id = $2',
        [contactData.error, id]
      );

      res.status(500).json({
        success: false,
        error: 'Failed to extract contacts',
        message: contactData.error
      });
    }

  } catch (error) {
    console.error('❌ Error crawling lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to crawl lead',
      message: error.message
    });
  }
});

module.exports = router;

