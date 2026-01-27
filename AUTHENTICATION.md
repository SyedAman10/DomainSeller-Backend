# Authentication Middleware

## 📝 Overview

Simple authentication middleware for protected routes.

## 🔧 Usage

### In Routes

```javascript
const { requireAuth } = require('../middleware/auth');

router.post('/protected-endpoint', requireAuth, async (req, res) => {
  // req.user.id is available here
  const userId = req.user.id;
  // ... your code
});
```

## 🔑 Authentication Methods

### Method 1: X-User-Id Header (Testing/Development)

```bash
curl http://localhost:3000/backend/registrar/connect \
  -H "X-User-Id: 10" \
  -H "Content-Type: application/json" \
  -d '{"registrar": "godaddy", "apiKey": "key", "apiSecret": "secret"}'
```

### Method 2: Bearer Token (Production)

```bash
curl http://localhost:3000/backend/registrar/connect \
  -H "Authorization: Bearer <user_id_or_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"registrar": "godaddy", "apiKey": "key", "apiSecret": "secret"}'
```

## 🚨 Important Notes

### Current Implementation

- ✅ Simple header-based auth (X-User-Id)
- ✅ Bearer token support
- ⚠️ **JWT verification NOT implemented yet**
- ⚠️ **For testing/development only**

### For Production

You should implement proper JWT verification:

```javascript
const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      // ... other user data
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};
```

## 📚 API Testing

### Get Supported Registrars (No Auth Required)

```bash
curl http://localhost:3000/backend/registrar/supported
```

### Connect Registrar (Auth Required)

```bash
curl -X POST http://localhost:3000/backend/registrar/connect \
  -H "X-User-Id: 10" \
  -H "Content-Type: application/json" \
  -d '{
    "registrar": "godaddy",
    "apiKey": "YOUR_API_KEY",
    "apiSecret": "YOUR_API_SECRET"
  }'
```

### List Registrar Accounts (Auth Required)

```bash
curl http://localhost:3000/backend/registrar/accounts \
  -H "X-User-Id: 10"
```

## 🔐 Security Recommendations

1. **Never commit JWT secrets** to version control
2. **Use HTTPS** in production
3. **Implement rate limiting** for auth endpoints
4. **Add token expiration** (e.g., 24 hours)
5. **Implement refresh tokens** for better UX
6. **Log failed auth attempts** for security monitoring

## ✅ TODO for Production

- [ ] Implement full JWT verification
- [ ] Add token expiration checking
- [ ] Implement refresh token mechanism
- [ ] Add role-based access control (RBAC)
- [ ] Add rate limiting for failed attempts
- [ ] Add security logging
- [ ] Add IP whitelisting (optional)
- [ ] Implement 2FA support (optional)

## 📖 References

- [JWT.io](https://jwt.io/) - JWT standard
- [jsonwebtoken npm](https://www.npmjs.com/package/jsonwebtoken) - JWT library
- [Express JWT Middleware](https://www.npmjs.com/package/express-jwt) - Ready-made middleware
