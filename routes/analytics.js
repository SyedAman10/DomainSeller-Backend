const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { getClientIP, getGeoFromIP } = require('../services/geoService');
const {
  getLandingPageInsights,
  getVisitorTimeline,
  getDeviceBreakdown,
  getTrafficSources,
  getRealtimeVisitors
} = require('../services/analyticsService');

/**
 * POST /api/analytics/track-visit
 * Track a landing page visit
 */
router.post('/track-visit', async (req, res) => {
  console.log('📊 Tracking visit...');

  try {
    // Get IP and geolocation
    const ip = getClientIP(req);
    const geo = getGeoFromIP(ip);

    const {
      landingPageId,
      domain,
      visitorId,
      sessionId,
      deviceType,
      browser,
      os,
      country,
      city,
      region,
      ipAddress,
      referrerDomain,
      referrerUrl,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      sessionDuration,
      pageViews,
      isBounce,
      bounced,
      converted,
      conversionType,
      conversionValue,
      eventType,
      pageType,
      userAgent,
      language,
      timezone,
      timestamp,
      eventData,
      metadata
    } = req.body;

    // Use geolocation data if not provided
    const finalData = {
      landingPageId,
      domain,
      visitorId,
      sessionId,
      deviceType,
      browser,
      os,
      country: country || geo.country,
      city: city || geo.city,
      region: region || geo.region,
      ipAddress: ipAddress || ip,
      referrerDomain,
      referrerUrl,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      sessionDuration: sessionDuration || 0,
      pageViews: pageViews || 1,
      isBounce: isBounce || false,
      bounced: bounced || false,
      converted: converted || false,
      conversionType,
      conversionValue,
      eventType,
      pageType,
      userAgent,
      language,
      timezone: timezone || geo.timezone,
      timestamp: timestamp || new Date().toISOString(),
      latitude: geo.latitude,
      longitude: geo.longitude,
      eventData,
      metadata
    };

    // Insert visit
    await query(
      `INSERT INTO landing_page_analytics (
        landing_page_id, domain, visitor_id, session_id, device_type, browser, os,
        country, city, region, ip_address, referrer_domain, referrer_url, 
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        visit_timestamp, session_duration, page_views, is_bounce, bounced,
        converted, conversion_type, conversion_value,
        event_type, page_type, user_agent, language, timezone, timestamp,
        latitude, longitude, event_data, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        NOW(), $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33,
        $34, $35
      )`,
      [
        finalData.landingPageId, finalData.domain, finalData.visitorId, finalData.sessionId,
        finalData.deviceType, finalData.browser, finalData.os, finalData.country, finalData.city,
        finalData.region, finalData.ipAddress, finalData.referrerDomain, finalData.referrerUrl,
        finalData.utmSource, finalData.utmMedium, finalData.utmCampaign, finalData.utmContent,
        finalData.utmTerm, finalData.sessionDuration, finalData.pageViews, finalData.isBounce,
        finalData.bounced, finalData.converted, finalData.conversionType, finalData.conversionValue,
        finalData.eventType, finalData.pageType, finalData.userAgent, finalData.language,
        finalData.timezone, finalData.timestamp, finalData.latitude, finalData.longitude,
        finalData.eventData ? JSON.stringify(finalData.eventData) : null,
        finalData.metadata ? JSON.stringify(finalData.metadata) : null
      ]
    );

    res.json({
      success: true,
      message: 'Visit tracked',
      geo: geo
    });

  } catch (error) {
    console.error('❌ Error tracking visit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track visit',
      message: error.message
    });
  }
});

/**
 * POST /api/analytics/track-session
 * Track or update a session
 */
router.post('/track-session', async (req, res) => {
  console.log('📊 Tracking session...');

  try {
    const {
      landingPageId,
      domain,
      sessionId,
      visitorId,
      deviceType,
      browser,
      os,
      country,
      city,
      durationSeconds,
      interactions,
      bounced,
      action,
      eventType,
      pageType,
      timestamp
    } = req.body;

    // Upsert session (update if exists, insert if not)
    await query(
      `INSERT INTO landing_page_analytics (
        landing_page_id, domain, session_id, visitor_id, device_type, browser, os,
        country, city, duration_seconds, interactions, bounced, action,
        event_type, page_type, timestamp, visit_timestamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
      )
      ON CONFLICT (domain, session_id) 
      DO UPDATE SET
        duration_seconds = EXCLUDED.duration_seconds,
        interactions = EXCLUDED.interactions,
        bounced = EXCLUDED.bounced,
        action = EXCLUDED.action,
        updated_at = NOW()`,
      [
        landingPageId, domain, sessionId, visitorId, deviceType, browser, os,
        country, city, durationSeconds || 0, 
        interactions ? JSON.stringify(interactions) : '[]',
        bounced || false, action, eventType, pageType,
        timestamp || new Date().toISOString()
      ]
    );

    res.json({
      success: true,
      message: 'Session tracked'
    });

  } catch (error) {
    console.error('❌ Error tracking session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track session',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/landing-page-insights/:landingPageId
 * Get overall analytics insights
 */
router.get('/landing-page-insights/:landingPageId', async (req, res) => {
  console.log(`📊 Analytics: Landing page insights requested`);

  try {
    const { landingPageId } = req.params;
    const { dateRange = '7d' } = req.query;

    if (!landingPageId) {
      return res.status(400).json({
        success: false,
        error: 'landingPageId is required'
      });
    }

    // Validate date range
    const validRanges = ['7d', '30d', '90d', 'all'];
    if (!validRanges.includes(dateRange)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid dateRange. Must be one of: 7d, 30d, 90d, all'
      });
    }

    const data = await getLandingPageInsights(landingPageId, dateRange);

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error fetching landing page insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch landing page insights',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/visitor-timeline/:landingPageId
 * Get visitor timeline data
 */
router.get('/visitor-timeline/:landingPageId', async (req, res) => {
  console.log(`📈 Analytics: Visitor timeline requested`);

  try {
    const { landingPageId } = req.params;
    const { range = '7d' } = req.query;

    if (!landingPageId) {
      return res.status(400).json({
        success: false,
        error: 'landingPageId is required'
      });
    }

    // Validate range
    const validRanges = ['7d', '30d', '90d'];
    if (!validRanges.includes(range)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid range. Must be one of: 7d, 30d, 90d'
      });
    }

    const data = await getVisitorTimeline(landingPageId, range);

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error fetching visitor timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor timeline',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/device-breakdown/:landingPageId
 * Get device, browser, and OS breakdown
 */
router.get('/device-breakdown/:landingPageId', async (req, res) => {
  console.log(`📱 Analytics: Device breakdown requested`);

  try {
    const { landingPageId } = req.params;

    if (!landingPageId) {
      return res.status(400).json({
        success: false,
        error: 'landingPageId is required'
      });
    }

    const data = await getDeviceBreakdown(landingPageId);

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error fetching device breakdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch device breakdown',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/traffic-sources/:landingPageId
 * Get traffic source breakdown
 */
router.get('/traffic-sources/:landingPageId', async (req, res) => {
  console.log(`🚦 Analytics: Traffic sources requested`);

  try {
    const { landingPageId } = req.params;

    if (!landingPageId) {
      return res.status(400).json({
        success: false,
        error: 'landingPageId is required'
      });
    }

    const data = await getTrafficSources(landingPageId);

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error fetching traffic sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch traffic sources',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/realtime-visitors/:landingPageId
 * Get real-time visitor data
 */
router.get('/realtime-visitors/:landingPageId', async (req, res) => {
  console.log(`⚡ Analytics: Real-time visitors requested`);

  try {
    const { landingPageId } = req.params;

    if (!landingPageId) {
      return res.status(400).json({
        success: false,
        error: 'landingPageId is required'
      });
    }

    const data = await getRealtimeVisitors(landingPageId);

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Error fetching real-time visitors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time visitors',
      message: error.message
    });
  }
});

/**
 * POST /api/analytics/capture-lead
 * Capture lead information from contact forms
 */
router.post('/capture-lead', async (req, res) => {
  console.log('📧 Capturing lead...');

  try {
    const { landingPageId, visitorId, sessionId, email, name, phone, message } = req.body;
    const ip = getClientIP(req);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Insert lead
    const result = await query(
      `INSERT INTO landing_page_leads (
        landing_page_id, visitor_id, session_id, email, name, phone, message,
        captured_at, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
      RETURNING *`,
      [landingPageId, visitorId, sessionId, email, name, phone, message, ip]
    );

    // Update analytics record to mark as converted
    if (sessionId) {
      await query(
        `UPDATE landing_page_analytics 
         SET converted = true, conversion_type = 'lead_capture'
         WHERE session_id = $1`,
        [sessionId]
      );
    }

    res.json({
      success: true,
      message: 'Lead captured',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error capturing lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to capture lead',
      message: error.message
    });
  }
});

/**
 * POST /api/analytics/track-scroll
 * Track scroll depth for a session
 */
router.post('/track-scroll', async (req, res) => {
  console.log('📜 Tracking scroll...');

  try {
    const { sessionId, domain, scrollDepth, maxScrollDepth } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }

    await query(
      `UPDATE landing_page_analytics 
       SET scroll_depth = $1, max_scroll_depth = $2, updated_at = NOW()
       WHERE session_id = $3 AND domain = $4`,
      [scrollDepth || 0, maxScrollDepth || 0, sessionId, domain]
    );

    res.json({
      success: true,
      message: 'Scroll tracked'
    });

  } catch (error) {
    console.error('❌ Error tracking scroll:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track scroll',
      message: error.message
    });
  }
});

/**
 * POST /api/analytics/track-click
 * Track individual clicks for heatmap
 */
router.post('/track-click', async (req, res) => {
  console.log('🖱️ Tracking click...');

  try {
    const { sessionId, domain, x, y, element, elementText } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }

    // Insert click
    await query(
      `INSERT INTO landing_page_clicks (
        session_id, domain, x_position, y_position, element_type,
        element_text, clicked_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [sessionId, domain, x || 0, y || 0, element, elementText]
    );

    // Update click count
    await query(
      `UPDATE landing_page_analytics 
       SET clicks_count = clicks_count + 1
       WHERE session_id = $1`,
      [sessionId]
    );

    res.json({
      success: true,
      message: 'Click tracked'
    });

  } catch (error) {
    console.error('❌ Error tracking click:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track click',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/visitor-details/:visitorId
 * Get detailed information about a specific visitor
 */
router.get('/visitor-details/:visitorId', async (req, res) => {
  console.log('👤 Fetching visitor details...');

  try {
    const { visitorId } = req.params;

    // Get all sessions for this visitor
    const sessions = await query(
      `SELECT 
        a.*,
        l.email, l.name, l.phone, l.message, l.captured_at
      FROM landing_page_analytics a
      LEFT JOIN landing_page_leads l ON a.session_id = l.session_id
      WHERE a.visitor_id = $1
      ORDER BY a.visit_timestamp DESC`,
      [visitorId]
    );

    // Get all clicks for this visitor
    const clicks = await query(
      `SELECT c.* FROM landing_page_clicks c
       WHERE c.session_id IN (
         SELECT session_id FROM landing_page_analytics WHERE visitor_id = $1
       )
       ORDER BY c.clicked_at DESC`,
      [visitorId]
    );

    const sessionData = sessions.rows;
    const totalTimeSpent = sessionData.reduce((sum, s) => sum + (parseInt(s.session_duration) || 0), 0);
    const countries = [...new Set(sessionData.map(s => s.country).filter(Boolean))];
    const devices = [...new Set(sessionData.map(s => s.device_type).filter(Boolean))];
    const hasLeadInfo = sessionData.some(s => s.email);

    res.json({
      success: true,
      data: {
        visitorId,
        sessions: sessionData,
        clicks: clicks.rows,
        totalVisits: sessionData.length,
        totalTimeSpent,
        countries,
        devices,
        hasLeadInfo
      }
    });

  } catch (error) {
    console.error('❌ Error fetching visitor details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor details',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/leads/:landingPageId
 * Get all leads for a landing page
 */
router.get('/leads/:landingPageId', async (req, res) => {
  console.log('📋 Fetching leads...');

  try {
    const { landingPageId } = req.params;

    const leads = await query(
      `SELECT 
        l.*,
        a.device_type,
        a.browser,
        a.os,
        a.country,
        a.referrer_domain,
        a.utm_source,
        a.utm_medium,
        a.utm_campaign
      FROM landing_page_leads l
      LEFT JOIN landing_page_analytics a ON l.session_id = a.session_id
      WHERE l.landing_page_id = $1
      ORDER BY l.captured_at DESC`,
      [landingPageId]
    );

    const leadsData = leads.rows;
    const totalLeads = leadsData.length;
    const newLeads = leadsData.filter(l => l.status === 'new').length;
    const convertedLeads = leadsData.filter(l => l.status === 'converted').length;

    res.json({
      success: true,
      data: {
        leads: leadsData,
        totalLeads,
        newLeads,
        convertedLeads
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
 * GET /api/analytics/visitors/:landingPageId
 * Get list of all visitors with aggregated data
 */
router.get('/visitors/:landingPageId', async (req, res) => {
  console.log('👥 Fetching visitors list...');

  try {
    const { landingPageId } = req.params;
    const { limit = 100 } = req.query;

    const visitors = await query(
      `SELECT 
        a.visitor_id,
        l.email,
        l.name,
        COUNT(DISTINCT a.session_id) as visit_count,
        MAX(a.visit_timestamp) as last_visit,
        MIN(a.visit_timestamp) as first_visit,
        SUM(a.session_duration) as total_time_spent,
        MAX(a.converted::int)::boolean as has_converted,
        ARRAY_AGG(DISTINCT a.country) FILTER (WHERE a.country IS NOT NULL) as countries,
        ARRAY_AGG(DISTINCT a.device_type) FILTER (WHERE a.device_type IS NOT NULL) as devices,
        MAX(a.ip_address) as ip_address
      FROM landing_page_analytics a
      LEFT JOIN landing_page_leads l ON a.visitor_id = l.visitor_id
      WHERE a.landing_page_id = $1
      GROUP BY a.visitor_id, l.email, l.name
      ORDER BY last_visit DESC
      LIMIT $2`,
      [landingPageId, limit]
    );

    res.json({
      success: true,
      data: visitors.rows
    });

  } catch (error) {
    console.error('❌ Error fetching visitors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitors',
      message: error.message
    });
  }
});

module.exports = router;

