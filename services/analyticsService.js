const { query } = require('../config/database');

/**
 * Analytics Service
 * Handles all analytics queries and data processing
 */

/**
 * Parse date range to SQL WHERE clause
 * @param {String} dateRange - 7d, 30d, 90d, or all
 * @returns {String} SQL WHERE clause
 */
const getDateRangeSQL = (dateRange) => {
  if (dateRange === 'all') return '';
  
  const days = {
    '7d': 7,
    '30d': 30,
    '90d': 90
  };
  
  const numDays = days[dateRange] || 7;
  return `AND visit_timestamp >= NOW() - INTERVAL '${numDays} days'`;
};

/**
 * Get landing page insights
 * @param {String} landingPageId - Landing page ID
 * @param {String} dateRange - Date range (7d, 30d, 90d, all)
 * @returns {Promise<Object>} Analytics data
 */
const getLandingPageInsights = async (landingPageId, dateRange = '7d') => {
  console.log(`📊 Fetching insights for landing page: ${landingPageId}, range: ${dateRange}`);

  const dateSQL = getDateRangeSQL(dateRange);

  try {
    // Total visits and unique visitors
    const visitsQuery = await query(
      `SELECT 
        COUNT(*) as total_visits,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        AVG(session_duration) as avg_session_duration,
        SUM(CASE WHEN is_bounce THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100 as bounce_rate,
        SUM(CASE WHEN converted THEN 1 ELSE 0 END) as total_conversions
       FROM landing_page_visits
       WHERE landing_page_id = $1 ${dateSQL}`,
      [landingPageId]
    );

    const stats = visitsQuery.rows[0];
    
    // Conversion rate
    const conversionRate = stats.total_visits > 0 
      ? (stats.total_conversions / stats.total_visits * 100) 
      : 0;

    // Top countries
    const countriesQuery = await query(
      `SELECT country, COUNT(*) as visits
       FROM landing_page_visits
       WHERE landing_page_id = $1 AND country IS NOT NULL ${dateSQL}
       GROUP BY country
       ORDER BY visits DESC
       LIMIT 10`,
      [landingPageId]
    );

    // Top referrers
    const referrersQuery = await query(
      `SELECT referrer_domain as source, COUNT(*) as visits
       FROM landing_page_visits
       WHERE landing_page_id = $1 AND referrer_domain IS NOT NULL ${dateSQL}
       GROUP BY referrer_domain
       ORDER BY visits DESC
       LIMIT 10`,
      [landingPageId]
    );

    return {
      totalVisits: parseInt(stats.total_visits) || 0,
      uniqueVisitors: parseInt(stats.unique_visitors) || 0,
      avgSessionDuration: Math.round(parseFloat(stats.avg_session_duration) || 0),
      bounceRate: parseFloat(stats.bounce_rate) || 0,
      totalConversions: parseInt(stats.total_conversions) || 0,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      topCountries: countriesQuery.rows.map(row => ({
        country: row.country,
        visits: parseInt(row.visits)
      })),
      topReferrers: referrersQuery.rows.map(row => ({
        source: row.source,
        visits: parseInt(row.visits)
      }))
    };

  } catch (error) {
    console.error('❌ Error fetching insights:', error);
    throw error;
  }
};

/**
 * Get visitor timeline data
 * @param {String} landingPageId - Landing page ID
 * @param {String} range - Date range (7d, 30d, 90d)
 * @returns {Promise<Array>} Timeline data
 */
const getVisitorTimeline = async (landingPageId, range = '7d') => {
  console.log(`📈 Fetching timeline for landing page: ${landingPageId}, range: ${range}`);

  const days = {
    '7d': 7,
    '30d': 30,
    '90d': 90
  };

  const numDays = days[range] || 7;

  try {
    const timelineQuery = await query(
      `SELECT 
        DATE(visit_timestamp) as date,
        COUNT(*) as visits,
        COUNT(DISTINCT visitor_id) as unique_visitors,
        SUM(CASE WHEN converted THEN 1 ELSE 0 END) as conversions
       FROM landing_page_visits
       WHERE landing_page_id = $1
         AND visit_timestamp >= NOW() - INTERVAL '${numDays} days'
       GROUP BY DATE(visit_timestamp)
       ORDER BY date ASC`,
      [landingPageId]
    );

    return timelineQuery.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      visits: parseInt(row.visits),
      uniqueVisitors: parseInt(row.unique_visitors),
      conversions: parseInt(row.conversions)
    }));

  } catch (error) {
    console.error('❌ Error fetching timeline:', error);
    throw error;
  }
};

/**
 * Get device breakdown
 * @param {String} landingPageId - Landing page ID
 * @returns {Promise<Object>} Device data
 */
const getDeviceBreakdown = async (landingPageId) => {
  console.log(`📱 Fetching device breakdown for landing page: ${landingPageId}`);

  try {
    // Device types
    const devicesQuery = await query(
      `SELECT device_type, COUNT(*) as count
       FROM landing_page_visits
       WHERE landing_page_id = $1 AND device_type IS NOT NULL
       GROUP BY device_type`,
      [landingPageId]
    );

    const totalDevices = devicesQuery.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const devices = {};
    devicesQuery.rows.forEach(row => {
      const percentage = totalDevices > 0 ? (parseInt(row.count) / totalDevices * 100) : 0;
      devices[row.device_type.toLowerCase()] = parseFloat(percentage.toFixed(1));
    });

    // Browsers
    const browsersQuery = await query(
      `SELECT browser, COUNT(*) as count
       FROM landing_page_visits
       WHERE landing_page_id = $1 AND browser IS NOT NULL
       GROUP BY browser`,
      [landingPageId]
    );

    const totalBrowsers = browsersQuery.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const browsers = {};
    browsersQuery.rows.forEach(row => {
      const percentage = totalBrowsers > 0 ? (parseInt(row.count) / totalBrowsers * 100) : 0;
      browsers[row.browser.toLowerCase()] = parseFloat(percentage.toFixed(1));
    });

    // Operating Systems
    const osQuery = await query(
      `SELECT os, COUNT(*) as count
       FROM landing_page_visits
       WHERE landing_page_id = $1 AND os IS NOT NULL
       GROUP BY os`,
      [landingPageId]
    );

    const totalOS = osQuery.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const os = {};
    osQuery.rows.forEach(row => {
      const percentage = totalOS > 0 ? (parseInt(row.count) / totalOS * 100) : 0;
      os[row.os.toLowerCase()] = parseFloat(percentage.toFixed(1));
    });

    return {
      devices,
      browsers,
      os
    };

  } catch (error) {
    console.error('❌ Error fetching device breakdown:', error);
    throw error;
  }
};

/**
 * Get traffic sources
 * @param {String} landingPageId - Landing page ID
 * @returns {Promise<Object>} Traffic source data
 */
const getTrafficSources = async (landingPageId) => {
  console.log(`🚦 Fetching traffic sources for landing page: ${landingPageId}`);

  try {
    // Get all visits with referrer info
    const visitsQuery = await query(
      `SELECT 
        referrer_domain,
        referrer_url,
        utm_source,
        utm_medium,
        COUNT(*) as visit_count
       FROM landing_page_visits
       WHERE landing_page_id = $1
       GROUP BY referrer_domain, referrer_url, utm_source, utm_medium`,
      [landingPageId]
    );

    const totalVisits = visitsQuery.rows.reduce((sum, row) => sum + parseInt(row.visit_count), 0);

    let direct = 0;
    let organic = 0;
    let referral = 0;
    let social = 0;
    const referrerDetails = {};

    visitsQuery.rows.forEach(row => {
      const count = parseInt(row.visit_count);
      
      // Categorize traffic
      if (!row.referrer_domain && !row.utm_source) {
        direct += count;
      } else if (row.utm_medium === 'organic' || isOrganicSearch(row.referrer_domain)) {
        organic += count;
      } else if (isSocialMedia(row.referrer_domain)) {
        social += count;
      } else if (row.referrer_domain) {
        referral += count;
        
        // Track individual referrers
        if (!referrerDetails[row.referrer_domain]) {
          referrerDetails[row.referrer_domain] = 0;
        }
        referrerDetails[row.referrer_domain] += count;
      }
    });

    // Calculate percentages
    const directPerc = totalVisits > 0 ? (direct / totalVisits * 100) : 0;
    const organicPerc = totalVisits > 0 ? (organic / totalVisits * 100) : 0;
    const referralPerc = totalVisits > 0 ? (referral / totalVisits * 100) : 0;
    const socialPerc = totalVisits > 0 ? (social / totalVisits * 100) : 0;

    // Top referrers
    const topReferrers = Object.entries(referrerDetails)
      .map(([source, visits]) => ({
        source,
        visits,
        percentage: parseFloat((visits / totalVisits * 100).toFixed(1))
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);

    return {
      direct: parseFloat(directPerc.toFixed(1)),
      organic: parseFloat(organicPerc.toFixed(1)),
      referral: parseFloat(referralPerc.toFixed(1)),
      social: parseFloat(socialPerc.toFixed(1)),
      topReferrers
    };

  } catch (error) {
    console.error('❌ Error fetching traffic sources:', error);
    throw error;
  }
};

/**
 * Get real-time visitors
 * @param {String} landingPageId - Landing page ID
 * @returns {Promise<Object>} Real-time data
 */
const getRealtimeVisitors = async (landingPageId) => {
  console.log(`⚡ Fetching real-time visitors for landing page: ${landingPageId}`);

  try {
    // Active now (last 5 minutes)
    const activeNowQuery = await query(
      `SELECT COUNT(DISTINCT session_id) as active
       FROM landing_page_visits
       WHERE landing_page_id = $1
         AND visit_timestamp >= NOW() - INTERVAL '5 minutes'`,
      [landingPageId]
    );

    // Last 24 hours
    const last24Query = await query(
      `SELECT COUNT(*) as visits
       FROM landing_page_visits
       WHERE landing_page_id = $1
         AND visit_timestamp >= NOW() - INTERVAL '24 hours'`,
      [landingPageId]
    );

    // Recent sessions (last 10)
    const recentSessionsQuery = await query(
      `SELECT 
        country,
        device_type as device,
        visit_timestamp as timestamp
       FROM landing_page_visits
       WHERE landing_page_id = $1
       ORDER BY visit_timestamp DESC
       LIMIT 10`,
      [landingPageId]
    );

    return {
      activeNow: parseInt(activeNowQuery.rows[0].active) || 0,
      last24Hours: parseInt(last24Query.rows[0].visits) || 0,
      recentSessions: recentSessionsQuery.rows.map(row => ({
        country: row.country || 'Unknown',
        device: row.device ? row.device.toLowerCase() : 'unknown',
        timestamp: row.timestamp.toISOString()
      }))
    };

  } catch (error) {
    console.error('❌ Error fetching real-time data:', error);
    throw error;
  }
};

// Helper functions
function isOrganicSearch(domain) {
  if (!domain) return false;
  const searchEngines = ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu', 'yandex'];
  return searchEngines.some(engine => domain.includes(engine));
}

function isSocialMedia(domain) {
  if (!domain) return false;
  const socialPlatforms = ['facebook', 'twitter', 'instagram', 'linkedin', 'pinterest', 'reddit', 'tiktok', 'youtube'];
  return socialPlatforms.some(platform => domain.includes(platform));
}

module.exports = {
  getLandingPageInsights,
  getVisitorTimeline,
  getDeviceBreakdown,
  getTrafficSources,
  getRealtimeVisitors
};

