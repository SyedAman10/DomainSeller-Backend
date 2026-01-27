# JWT Authentication Setup Guide

## 🎯 Current Situation

Your frontend is sending a JWT token, but the backend needs to be configured to verify it.

## ✅ Quick Fix (2 Options)

### **Option 1: Install jsonwebtoken & Configure JWT_SECRET** (Recommended for Production)

This enables full JWT verification.

#### Step 1: Install jsonwebtoken

```bash
cd DomainSeller-Backend
npm install jsonwebtoken
```

#### Step 2: Add JWT_SECRET to .env

```bash
# Generate a secure secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Add to .env
echo "JWT_SECRET=<paste_generated_secret>" >> .env
```

#### Step 3: Restart Server

```bash
pm2 restart node-backend
```

#### Step 4: Update Your Frontend JWT Generation

Make sure your frontend JWT includes either `userId`, `id`, or `sub` field:

```javascript
// When creating JWT on frontend/auth service
const token = jwt.sign(
  {
    userId: user.id,  // ← Must include user ID
    email: user.email,
    // ... other claims
  },
  JWT_SECRET,
  { expiresIn: '24h' }
);
```

---

### **Option 2: Use X-User-Id Header** (Quick Testing)

This bypasses JWT and uses a simple header.

#### Update Your Frontend API Calls

```javascript
// Get current logged-in user
const currentUser = getCurrentUser(); // however you track logged-in user

// Add X-User-Id header to all API calls
fetch('https://api.3vltn.com/backend/registrar/connect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': currentUser.id.toString()  // ← Add this
  },
  body: JSON.stringify({
    registrar: 'godaddy',
    apiKey: apiKey,
    apiSecret: apiSecret
  })
});
```

---

## 🔧 How the Auth Middleware Works

The middleware tries authentication in this order:

1. **X-User-Id header** (simple, for testing)
   ```
   X-User-Id: 10
   ```

2. **JWT token with verification** (if `JWT_SECRET` is set)
   ```
   Authorization: Bearer <jwt_token>
   ```

3. **Simple token formats** (fallback):
   - Direct user ID: `Authorization: Bearer 10`
   - Base64 JSON: `Authorization: Bearer <base64_json>`

---

## 📝 Detailed JWT Setup

### 1. Install jsonwebtoken

```bash
npm install jsonwebtoken
```

### 2. Generate JWT_SECRET

```bash
# Generate a 64-byte random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Output example:
# 5a8f7e3d2c1b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d
```

### 3. Add to .env

```bash
JWT_SECRET=5a8f7e3d2c1b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d
```

### 4. Verify JWT on Frontend

Make sure your JWT tokens include user ID:

```javascript
// Example: Creating JWT on your auth service
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    userId: user.id,      // ← Required
    email: user.email,
    username: user.username,
    iat: Date.now() / 1000,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)  // 24 hours
  },
  process.env.JWT_SECRET
);
```

### 5. Send JWT from Frontend

```javascript
// In your API service/fetch wrapper
const token = localStorage.getItem('token'); // or wherever you store it

fetch('https://api.3vltn.com/backend/registrar/connect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`  // ← Send JWT
  },
  body: JSON.stringify({
    registrar: 'godaddy',
    apiKey: formData.apiKey,
    apiSecret: formData.apiSecret
  })
});
```

---

## 🔍 Debugging Auth Issues

### Check What Token You're Sending

```javascript
// In browser console
const token = localStorage.getItem('token');
console.log('Token:', token);

// Decode JWT (without verification, just to see payload)
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log('Token payload:', payload);

// Check if userId/id/sub exists
console.log('User ID in token:', payload.userId || payload.id || payload.sub);
```

### Check Server Logs

```bash
pm2 logs node-backend --lines 50
```

Look for:
- `"👤 User ID: X"` - Shows extracted user ID
- Auth error messages

### Test with curl

```bash
# Test with X-User-Id header
curl -X POST https://api.3vltn.com/backend/registrar/connect \
  -H "X-User-Id: 10" \
  -H "Content-Type: application/json" \
  -d '{"registrar":"godaddy","apiKey":"test","apiSecret":"test"}'

# Test with JWT token
curl -X POST https://api.3vltn.com/backend/registrar/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"registrar":"godaddy","apiKey":"test","apiSecret":"test"}'
```

---

## 🎨 Frontend Integration Examples

### React Example

```javascript
// api/registrar.js
export const connectRegistrar = async (registrar, apiKey, apiSecret) => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch('/backend/registrar/connect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      registrar,
      apiKey,
      apiSecret
    })
  });
  
  return response.json();
};
```

### Next.js Example

```javascript
// app/api/registrar/connect/route.js
export async function POST(request) {
  const session = await getServerSession();
  const body = await request.json();
  
  const response = await fetch('https://api.3vltn.com/backend/registrar/connect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': session.user.id.toString()
    },
    body: JSON.stringify(body)
  });
  
  return response.json();
}
```

---

## ⚠️ Common Errors & Solutions

### Error: "JWT authentication not implemented"

**Cause**: JWT token sent but `JWT_SECRET` not configured or `jsonwebtoken` not installed

**Solution**:
```bash
npm install jsonwebtoken
echo "JWT_SECRET=$(node -e 'console.log(require(\"crypto\").randomBytes(64).toString(\"hex\"))')" >> .env
pm2 restart node-backend
```

### Error: "Key (user_id)=(X) is not present in table users"

**Cause**: Token contains a user ID that doesn't exist in database

**Solution**: 
- Check if user exists: `SELECT id FROM users WHERE id = X;`
- Or create test user: `npm run setup:test-user`

### Error: "Invalid or expired token"

**Cause**: JWT signature doesn't match or token expired

**Solution**:
- Make sure frontend and backend use same `JWT_SECRET`
- Check token expiration
- Generate new token

---

## ✅ Quick Checklist

- [ ] `jsonwebtoken` installed (`npm install jsonwebtoken`)
- [ ] `JWT_SECRET` in `.env` file
- [ ] JWT tokens include `userId`, `id`, or `sub` field
- [ ] Frontend sends token in `Authorization: Bearer <token>` header
- [ ] Server restarted after changes
- [ ] User exists in database

---

## 🚀 Production Recommendations

1. **Use HTTPS only** - Never send tokens over HTTP
2. **Set token expiration** - e.g., 24 hours
3. **Implement refresh tokens** - For better UX
4. **Rotate JWT_SECRET** - Periodically change secret
5. **Add rate limiting** - Prevent brute force
6. **Log auth failures** - Security monitoring
7. **Use httpOnly cookies** - More secure than localStorage (optional)

---

**Need help?** Check the server logs with `pm2 logs node-backend`
