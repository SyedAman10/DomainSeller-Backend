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
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (token) {
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
              
              req.user = {
                id: decoded.userId || decoded.id || decoded.sub,
                email: decoded.email,
                ...decoded
              };
              
              return next();
            }
          } catch (jwtError) {
            console.error('❌ JWT verification failed:', jwtError.message);
            return res.status(401).json({
              success: false,
              message: 'Invalid or expired token',
              error: jwtError.message
            });
          }
        }

        // Fallback: Try to parse token as simple format (e.g., "userId:timestamp:signature")
        // This is a simplified approach for systems that don't use standard JWT
        
        // Try to parse as user ID
        const parsedUserId = parseInt(token, 10);
        if (!isNaN(parsedUserId)) {
          req.user = {
            id: parsedUserId
          };
          return next();
        }

        // If token looks like it might be base64 encoded, try to decode
        try {
          const decoded = Buffer.from(token, 'base64').toString('utf8');
          const parsed = JSON.parse(decoded);
          
          if (parsed.userId || parsed.id) {
            req.user = {
              id: parsed.userId || parsed.id,
              ...parsed
            };
            return next();
          }
        } catch (decodeError) {
          // Not a valid base64 JSON token, continue
        }

        // If we get here, we couldn't parse the token
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
