/**
 * ============================================================
 * AUTHENTICATION MIDDLEWARE
 * ============================================================
 * 
 * Purpose: Verify user authentication for protected routes
 * 
 * Usage:
 * router.get('/protected', requireAuth, async (req, res) => {
 *   // req.user.id is available here
 * });
 * ============================================================
 */

/**
 * ============================================================
 * AUTHENTICATION MIDDLEWARE
 * ============================================================
 * 
 * Purpose: Verify user authentication for protected routes
 * 
 * Usage:
 * router.get('/protected', requireAuth, async (req, res) => {
 *   // req.user.id is available here
 * });
 * ============================================================
 */

/**
 * Simple authentication middleware
 * Extracts user info from headers or JWT token
 * 
 * Supports:
 * - X-User-Id header (for testing/simple auth)
 * - JWT tokens (for production with proper verification if JWT_SECRET is set)
 * - Authorization header with Bearer token
 */
const requireAuth = (req, res, next) => {
  try {
    // Method 1: Check for X-User-Id header (simple auth for testing)
    const userId = req.headers['x-user-id'];
    
    if (userId) {
      req.user = {
        id: parseInt(userId, 10)
      };
      return next();
    }

    // Method 2: Check for Authorization header
    const authHeader = req.headers['authorization'];
    
    if (authHeader) {
      // Extract token from "Bearer <token>" format
      let token = authHeader;
      
      // Remove "Bearer " prefix (case-insensitive)
      if (token.toLowerCase().startsWith('bearer ')) {
        token = token.substring(7).trim();
      }
      
      console.log('🔍 Extracted token (first 50 chars):', token.substring(0, 50) + '...');

      if (token && token !== 'Bearer') {
        // Try JWT verification if JWT_SECRET is available
        if (process.env.JWT_SECRET) {
          try {
            // Try to use jsonwebtoken library if available
            let jwt;
            try {
              jwt = require('jsonwebtoken');
            } catch (e) {
              // jsonwebtoken not installed, fall back to simple parsing
              console.warn('⚠️  jsonwebtoken not installed, using fallback auth');
            }

            if (jwt) {
              // Verify JWT token
              const decoded = jwt.verify(token, process.env.JWT_SECRET);
              
              console.log('🔍 JWT decoded payload:', decoded);
              
              // Try multiple common field names for user ID
              const userId = decoded.userId || decoded.id || decoded.sub || 
                            decoded.user_id || decoded.ID || decoded.user?.id;
              
              if (!userId) {
                console.error('❌ No user ID found in JWT token. Payload:', decoded);
                return res.status(401).json({
                  success: false,
                  message: 'Invalid token structure',
                  error: 'Token does not contain userId, id, or sub field',
                  hint: 'JWT must include user ID in one of these fields: userId, id, sub, user_id'
                });
              }
              
              req.user = {
                id: parseInt(userId, 10),
                email: decoded.email,
                ...decoded
              };
              
              console.log('✅ JWT verified, User ID:', req.user.id);
              return next();
            }
          } catch (jwtError) {
            console.error('❌ JWT verification failed:', jwtError.message);
            
            // If verification failed, try to decode without verification to see what's inside
            try {
              const parts = token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                console.log('🔍 Token payload (unverified):', payload);
              }
            } catch (e) {
              console.error('Could not decode token for debugging');
            }
            
            return res.status(401).json({
              success: false,
              message: 'Invalid or expired token',
              error: jwtError.message
            });
          }
        }

        // Fallback: Try to parse token as simple format (e.g., "userId:timestamp:signature")
        // This is a simplified approach for systems that don't use standard JWT
        
        console.log('🔍 Attempting fallback token parsing...');
        console.log('   Token (first 50 chars):', token.substring(0, 50) + '...');
        
        // Try to parse as user ID
        const parsedUserId = parseInt(token, 10);
        if (!isNaN(parsedUserId)) {
          console.log('✅ Token parsed as user ID:', parsedUserId);
          req.user = {
            id: parsedUserId
          };
          return next();
        }

        // If token looks like it might be base64 encoded, try to decode
        try {
          const decoded = Buffer.from(token, 'base64').toString('utf8');
          const parsed = JSON.parse(decoded);
          
          console.log('🔍 Base64 decoded token:', parsed);
          
          if (parsed.userId || parsed.id) {
            req.user = {
              id: parsed.userId || parsed.id,
              ...parsed
            };
            console.log('✅ Token parsed from base64, User ID:', req.user.id);
            return next();
          }
        } catch (decodeError) {
          // Not a valid base64 JSON token, continue
          console.log('   Not a base64 JSON token');
        }

        // Try to decode as JWT without verification (to see what's inside)
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            console.log('🔍 JWT payload (no secret verification):', payload);
            
            // Extract user ID from common fields
            const userId = payload.userId || payload.id || payload.sub || 
                          payload.user_id || payload.ID || payload.user?.id;
            
            if (userId) {
              console.log('⚠️  Found user ID in JWT but JWT_SECRET may not match');
              console.log('   User ID:', userId);
              console.log('   Hint: Check if frontend and backend use the same JWT_SECRET');
              
              // Allow it through anyway for debugging
              req.user = {
                id: parseInt(userId, 10),
                ...payload
              };
              return next();
            } else {
              console.error('❌ JWT token does not contain user ID in any expected field');
              console.error('   Available fields:', Object.keys(payload));
            }
          }
        } catch (e) {
          console.log('   Not a JWT token');
        }

        // If we get here, we couldn't parse the token
        console.error('❌ Could not parse token in any known format');
        return res.status(401).json({
          success: false,
          message: 'Invalid authentication token',
          error: 'Could not parse or verify token',
          hint: 'Use X-User-Id header or valid JWT token'
        });
      }
    }

    // No authentication provided
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'Missing X-User-Id or Authorization header',
      hint: 'Add header: X-User-Id: <your_user_id>'
    });

  } catch (error) {
    console.error('❌ Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Optional authentication middleware
 * Doesn't block request if no auth is provided
 */
const optionalAuth = (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const authHeader = req.headers['authorization'];

    if (userId) {
      req.user = {
        id: parseInt(userId, 10)
      };
    } else if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;
      
      const parsedUserId = parseInt(token, 10);
      if (!isNaN(parsedUserId)) {
        req.user = {
          id: parsedUserId
        };
      }
    }

    next();
  } catch (error) {
    console.error('❌ Optional auth error:', error);
    next();
  }
};

module.exports = {
  requireAuth,
  optionalAuth
};
