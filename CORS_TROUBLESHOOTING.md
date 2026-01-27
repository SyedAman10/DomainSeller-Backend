# CORS & Server Troubleshooting Guide

## 🚨 Issue: CORS Errors from Frontend

### Error Messages
```
Access to fetch at 'https://api.3vltn.com/backend/registrar/supported' 
from origin 'https://3vltn.com' has been blocked by CORS policy
```

## ✅ Fixes Applied

### 1. Added `X-User-Id` to Allowed Headers

The authentication middleware uses `X-User-Id` header, so it must be allowed in CORS:

```javascript
allowedHeaders: [
  'Content-Type', 
  'Authorization', 
  'X-Requested-With', 
  'Accept', 
  'Origin', 
  'X-User-Id'  // ← Added
]
```

### 2. Made Registrar Routes Optional

If registrar integration fails to load, the server will still start:

```javascript
// Routes load with error handling
let registrarRoutes = null;
try {
  registrarRoutes = require('./routes/registrar');
  console.log('✅ Registrar routes loaded successfully');
} catch (error) {
  console.error('⚠️  Failed to load registrar routes:', error.message);
}

// Only register if loaded successfully
if (registrarRoutes) {
  app.use('/backend/registrar', registrarRoutes);
}
```

### 3. Made Sync Scheduler Optional

Same for the background sync scheduler - won't crash the server:

```javascript
try {
  const { syncScheduler } = require('./services/syncScheduler');
  syncScheduler.start();
} catch (error) {
  console.error('⚠️  Sync scheduler failed to start');
  // Server continues running
}
```

## 🔧 How to Fix

### Step 1: Restart the Backend Server

```bash
pm2 restart node-backend
```

### Step 2: Check Server Logs

```bash
pm2 logs node-backend --lines 100
```

Look for these messages:

✅ **Success:**
```
✅ Registrar routes loaded successfully
✅ Registrar routes registered at /backend/registrar
✅ Registrar sync scheduler started
🚀 Campaign Backend Server Running
```

⚠️ **Warning (but server still works):**
```
⚠️  Failed to load registrar routes: [error message]
   Registrar integration will not be available
🚀 Campaign Backend Server Running
```

### Step 3: Test CORS

```bash
# Test from command line
curl -X OPTIONS https://api.3vltn.com/backend/registrar/supported \
  -H "Origin: https://3vltn.com" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

Look for these headers in response:
```
< Access-Control-Allow-Origin: https://3vltn.com
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
< Access-Control-Allow-Headers: Content-Type, Authorization, ...
```

### Step 4: Test Registrar API

```bash
# Test without auth (public endpoint)
curl https://api.3vltn.com/backend/registrar/supported

# Expected response:
# {"success":true,"registrars":[...]}
```

## 🐛 Common Issues

### Issue 1: Routes Not Loading

**Symptoms:**
- `Cannot find module` errors in logs
- `net::ERR_FAILED` in browser

**Solutions:**
1. Check if all dependencies are installed: `npm install`
2. Check if migration was run: `npm run migrate:registrar`
3. Check if `.env` has `ENCRYPTION_KEY`

### Issue 2: CORS Still Blocked

**Symptoms:**
- CORS errors persist after restart
- `No 'Access-Control-Allow-Origin' header` error

**Solutions:**
1. Clear browser cache
2. Check nginx configuration (if using nginx)
3. Verify `allowedOrigins` includes your frontend domain
4. Check if server is actually responding: `curl https://api.3vltn.com/backend/health`

### Issue 3: Server Won't Start

**Symptoms:**
- PM2 shows `errored` status
- Server exits immediately

**Solutions:**
1. Check PM2 logs: `pm2 logs node-backend`
2. Try running directly: `cd DomainSeller-Backend && node server.js`
3. Check `.env` file exists and has required variables
4. Check database connection

## 📋 Required Environment Variables

Make sure these are in your `.env`:

```bash
# Required for basic operation
DATABASE_URL=postgresql://...
PORT=3000

# Required for registrar integration
ENCRYPTION_KEY=<32+ character random string>

# Optional but recommended
BACKEND_URL=https://api.3vltn.com
FRONTEND_URL=https://3vltn.com
```

## 🔐 Generate Encryption Key

If you haven't generated `ENCRYPTION_KEY` yet:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add output to `.env`:
```bash
ENCRYPTION_KEY=<generated_key_here>
```

## 🧪 Test Sequence

Run these commands in order:

```bash
# 1. Check if encryption key exists
cd DomainSeller-Backend
grep ENCRYPTION_KEY .env

# 2. Run migration (if not done yet)
npm run migrate:registrar

# 3. Test registrar integration
npm run test:registrar

# 4. Restart server
pm2 restart node-backend

# 5. Check logs
pm2 logs node-backend --lines 50

# 6. Test API
curl https://api.3vltn.com/backend/registrar/supported
```

## 📞 Still Having Issues?

If the server still won't start or CORS errors persist:

1. **Check server logs** for specific error messages
2. **Run the test script**: `npm run test:registrar`
3. **Try starting server directly**: `node server.js` (to see all errors)
4. **Check nginx configuration** (if using reverse proxy)
5. **Verify DNS** points to correct server

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Server starts without errors
2. ✅ `curl https://api.3vltn.com/backend/registrar/supported` returns JSON
3. ✅ No CORS errors in browser console
4. ✅ Frontend can fetch registrar data

---

**Last Updated**: After implementing graceful error handling for registrar integration
