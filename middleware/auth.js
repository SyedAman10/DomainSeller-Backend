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
 * For now, this is a basic implementation that assumes:
 * - User ID is passed in X-User-Id header (for testing)
 * - OR Authorization header with Bearer token (for production)
 * 
 * TODO: Implement full JWT verification in production
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

      // For now, treat the token as user ID (simplified)
      // In production, you would verify JWT here
      if (token) {
        // Try to parse as user ID
        const parsedUserId = parseInt(token, 10);
        if (!isNaN(parsedUserId)) {
          req.user = {
            id: parsedUserId
          };
          return next();
        }

        // If not a number, it might be a JWT token
        // For now, return error instead of using default
        console.error('⚠️  JWT token provided but verification not implemented');
        return res.status(401).json({
          success: false,
          message: 'JWT authentication not implemented',
          error: 'Please use X-User-Id header for authentication',
          hint: 'Add header: X-User-Id: <your_user_id>'
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
