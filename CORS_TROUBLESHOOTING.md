# CORS Troubleshooting Guide

## 🔍 Issue: CORS Blocked - No 'Access-Control-Allow-Origin' Header

This error appears when the backend server either:
1. Isn't running
2. Crashed during startup
3. Not responding to requests
4. CORS not properly configured

---

## ✅ Quick Fix Steps

### Step 1: Restart the Backend

```bash
pm2 restart node-backend
```

### Step 2: Check Server Logs

```bash
pm2 logs node-backend --lines 100
```

**Look for these SUCCESS indicators:**
```
✅ Database connected
✅ Email queue processor started
✅ REGISTRAR SYNC SCHEDULER ACTIVE
🚀 Campaign Backend Server Running
📡 Port: 3000
```

**Look for these ERROR indicators:**
```
❌ Error: Cannot find module...
❌ Database connection failed
❌ EADDRINUSE (port already in use)
```

### Step 3: Test Server is Responding

```bash
# Test health endpoint
curl https://api.3vltn.com/backend/health

# Expected response:
# {"status":"OK","message":"Campaign Backend is running"}
```

### Step 4: Test CORS Headers

```bash
# Test OPTIONS preflight
curl -X OPTIONS https://api.3vltn.com/backend/registrar/supported \
  -H "Origin: https://3vltn.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type, X-User-Id" \
  -v
```

**Look for these headers in response:**
```
< Access-Control-Allow-Origin: https://3vltn.com
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
< Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, X-User-Id
< Access-Control-Allow-Credentials: true
```

---

## 🐛 Common Issues & Fixes

### Issue 1: Server Crashed on Startup

**Symptoms:**
- PM2 shows "errored" or keeps restarting
- CORS errors in browser

**Fix:**
```bash
# Check logs for error
pm2 logs node-backend --err --lines 50

# Common errors and fixes:
# - "Cannot find module": Missing dependency
npm install

# - "ENCRYPTION_KEY not set": Missing env variable
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Add output to .env as ENCRYPTION_KEY=<key>

# - "Database connection failed": Database issue
# Check DATABASE_URL in .env

# Restart after fixing
pm2 restart node-backend
```

### Issue 2: Port Already in Use

**Symptoms:**
- `Error: listen EADDRINUSE :::3000`

**Fix:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or restart with PM2
pm2 delete node-backend
pm2 start server.js --name node-backend
```

### Issue 3: Frontend Using Wrong URL

**Symptoms:**
- CORS errors even when server is running
- Requests going to wrong domain

**Fix:**
Check your frontend environment variables:
```env
# Should be:
NEXT_PUBLIC_API_URL=https://api.3vltn.com
# NOT:
NEXT_PUBLIC_API_URL=https://3vltn.com
```

### Issue 4: Nginx Not Proxying Correctly

**Symptoms:**
- Server responds to `curl` but not browser
- 502 Bad Gateway errors

**Fix:**
Check Nginx configuration:
```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/api.3vltn.com

# Should have:
location /backend {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🧪 Test Suite

### Test 1: Health Check
```bash
curl https://api.3vltn.com/backend/health
# Expected: {"status":"OK",...}
```

### Test 2: Public Endpoint (No Auth)
```bash
curl https://api.3vltn.com/backend/registrar/supported
# Expected: {"success":true,"registrars":[...]}
```

### Test 3: Protected Endpoint (With Auth)
```bash
curl https://api.3vltn.com/backend/registrar/accounts \
  -H "X-User-Id: 10"
# Expected: {"success":true,"accounts":[...]}
```

### Test 4: OPTIONS Preflight
```bash
curl -X OPTIONS https://api.3vltn.com/backend/registrar/supported \
  -H "Origin: https://3vltn.com" \
  -H "Access-Control-Request-Method: GET" \
  -v
# Expected: HTTP 204 with CORS headers
```

---

## 📋 Checklist

- [ ] Backend server is running (`pm2 status`)
- [ ] No errors in logs (`pm2 logs`)
- [ ] Health endpoint responds (`curl /backend/health`)
- [ ] CORS headers present in OPTIONS response
- [ ] Nginx is running and configured correctly
- [ ] SSL certificates are valid
- [ ] Firewall allows port 3000 (or proxy port)
- [ ] Environment variables are set correctly

---

## 🔐 CORS Configuration

Your backend is configured to allow these origins:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'https://3vltn.com',          // ✅ Your frontend
  'http://3vltn.com',
  'https://www.3vltn.com',
  'http://www.3vltn.com',
  'https://api.3vltn.com',
  'http://api.3vltn.com',
  'https://3-vltn-dashboard.vercel.app'
];
```

**Allowed headers:**
- Content-Type
- Authorization
- X-Requested-With
- Accept
- Origin
- X-User-Id (for auth)

**Allowed methods:**
- GET
- POST
- PUT
- DELETE
- OPTIONS
- PATCH

---

## 🚨 Emergency Debug

If nothing works, enable verbose logging:

```bash
# Add to .env
DEBUG=*
NODE_ENV=development

# Restart
pm2 restart node-backend

# Watch logs in real-time
pm2 logs node-backend --raw
```

Then make a request from frontend and watch the logs.

---

## 📞 Still Having Issues?

1. **Check PM2 status**: `pm2 status`
2. **View full logs**: `pm2 logs node-backend --lines 200`
3. **Test health endpoint**: `curl https://api.3vltn.com/backend/health`
4. **Check Nginx error logs**: `sudo tail -f /var/log/nginx/error.log`
5. **Check system logs**: `sudo journalctl -u nginx -n 100`

---

## ✅ Success Indicators

When everything is working, you should see:

**In browser console:**
```
✅ No CORS errors
✅ API requests succeeding
✅ 200 OK responses
```

**In PM2 logs:**
```
✅ REGISTRAR SYNC SCHEDULER ACTIVE
✅ Server running on port 3000
🔍 CORS Check - Origin: https://3vltn.com
   ✅ Allowed: https://3vltn.com is in whitelist
```

**In curl test:**
```
< HTTP/2 200
< access-control-allow-origin: https://3vltn.com
< access-control-allow-credentials: true
```

---

**The CORS issue should now be resolved!** 🎉
