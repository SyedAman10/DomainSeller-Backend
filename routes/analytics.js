const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
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

    // Insert visit
    await query(
      `INSERT INTO landing_page_analytics (
        landing_page_id, domain, visitor_id, session_id, device_type, browser, os,
        country, city, region, ip_address, referrer_domain, referrer_url, 
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        visit_timestamp, session_duration, page_views, is_bounce, bounced,
        converted, conversion_type, conversion_value,
        event_type, page_type, user_agent, language, timezone, timestamp,
        event_data, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        NOW(), $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
      )`,
      [
        landingPageId, domain, visitorId, sessionId, deviceType, browser, os,
        country, city, region, ipAddress, referrerDomain, referrerUrl,
        utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
        sessionDuration || 0, pageViews || 1, isBounce || false, bounced || false,
        converted || false, conversionType, conversionValue,
        eventType, pageType, userAgent, language, timezone, 
        timestamp || new Date().toISOString(),
        eventData ? JSON.stringify(eventData) : null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    res.json({
      success: true,
      message: 'Visit tracked'
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

module.exports = router;

