const express = require('express');
const router = express.Router();
const {
  getLandingPageInsights,
  getVisitorTimeline,
  getDeviceBreakdown,
  getTrafficSources,
  getRealtimeVisitors
} = require('../services/analyticsService');

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

