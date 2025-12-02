const geoip = require('geoip-lite');

/**
 * Get client IP address from request
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         '127.0.0.1';
};

/**
 * Get geolocation data from IP address
 */
const getGeoFromIP = (ip) => {
  // Skip geolocation for localhost/private IPs
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      country: 'Unknown',
      city: null,
      region: null,
      timezone: null,
      latitude: null,
      longitude: null
    };
  }

  const geo = geoip.lookup(ip);
  
  if (!geo) {
    return {
      country: 'Unknown',
      city: null,
      region: null,
      timezone: null,
      latitude: null,
      longitude: null
    };
  }
  
  return {
    country: geo.country,
    city: null, // geoip-lite doesn't provide city
    region: geo.region,
    timezone: geo.timezone,
    latitude: geo.ll ? geo.ll[0] : null,
    longitude: geo.ll ? geo.ll[1] : null
  };
};

module.exports = {
  getClientIP,
  getGeoFromIP
};

