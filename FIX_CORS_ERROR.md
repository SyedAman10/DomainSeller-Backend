# 🔧 CORS Error Fix Guide

## ❌ The Error You're Seeing

```
Access to fetch at 'https://api.3vltn.com/backend/leads/generate' 
from origin 'https://3vltn.com' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**What This Means:** Your backend server is not sending the correct CORS headers to allow your frontend (`https://3vltn.com`) to access the API (`https://api.3vltn.com`).

---

## ✅ Solution Steps

### Step 1: Update Server CORS Configuration

I've already updated `server.js` to include better CORS logging and more origins. Now restart your server:

```bash
pm2 restart all
```

Or if running directly:
```bash
pm2 stop all
pm2 start server.js --name node-backend
```

### Step 2: Check Server Logs

After restarting, check the logs to see CORS activity:

```bash
pm2 logs node-backend --lines 50
```

You should see:
```
🌐 CORS Allowed Origins: [...includes https://3vltn.com...]
🔍 CORS Check - Origin: https://3vltn.com
   ✅ Allowed: https://3vltn.com is in whitelist
```

### Step 3: Test CORS

Run the test script:

```bash
node test-cors-leads.js
```

This will test:
1. ✅ OPTIONS preflight request
2. ✅ POST request from `https://3vltn.com`
3. ✅ POST request without origin

Expected output:
```
✅ Request succeeded
   Status: 204 (for OPTIONS) or 200 (for POST)
   CORS Headers:
   - Access-Control-Allow-Origin: https://3vltn.com
   - Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH
```

### Step 4: Clear Browser Cache

Sometimes browsers cache CORS preflight responses. Clear your browser cache or try:

```javascript
// In your browser console (F12)
location.reload(true); // Hard reload
```

Or use **Incognito/Private** mode to test.

---

## 🔍 Diagnosis

### Check 1: Is the Server Running?

```bash
pm2 status
```

Should show:
```
│ node-backend │ online │
```

### Check 2: Is the Domain Correct?

Your frontend is at: `https://3vltn.com`
Your API is at: `https://api.3vltn.com`

Make sure you're calling:
```javascript
fetch('https://api.3vltn.com/backend/leads/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    keyword: 'tech companies',
    count: 5
  })
})
```

### Check 3: Check Nginx Configuration

If you're using Nginx as a reverse proxy, it might be stripping CORS headers. Check your Nginx config:

```bash
cat /etc/nginx/sites-available/default
# or
cat /etc/nginx/sites-available/api.3vltn.com
```

Make sure Nginx is NOT adding its own CORS headers. Your Nginx config should look like:

```nginx
server {
    listen 80;
    server_name api.3vltn.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # DO NOT add CORS headers here - let Express handle it
    }
}
```

If Nginx has CORS headers, **remove them** and let Express handle CORS.

After changing Nginx config:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🚨 Common Issues & Fixes

### Issue 1: Still Getting CORS Error After Restart

**Solution:** Make sure you restarted the correct process:

```bash
# Kill all node processes
pm2 delete all

# Start fresh
cd /path/to/DomainSeller-Backend
pm2 start server.js --name node-backend

# Check logs
pm2 logs node-backend
```

### Issue 2: Different Port

If your server is running on a different port (not 5000), make sure Nginx is proxying to the correct port.

Check what port your server is using:
```bash
pm2 logs node-backend | grep "Server running"
```

Should show:
```
🚀 Server running on port 5000
```

### Issue 3: SSL/HTTPS Issue

If your API domain (`api.3vltn.com`) doesn't have HTTPS but your frontend does (`https://3vltn.com`), browsers will block the request.

**Solution:** Make sure `api.3vltn.com` has a valid SSL certificate:

```bash
# Check SSL
curl -I https://api.3vltn.com/backend/health

# Should return 200 OK with HTTPS
```

If no SSL, install Let's Encrypt:
```bash
sudo certbot --nginx -d api.3vltn.com
```

### Issue 4: Firewall Blocking

Make sure port 80 and 443 are open:

```bash
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 🧪 Quick Test from Browser

Open your browser console (F12) on `https://3vltn.com` and run:

```javascript
fetch('https://api.3vltn.com/backend/leads/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    keyword: 'test',
    count: 2
  })
})
.then(res => res.json())
.then(data => console.log('✅ Success:', data))
.catch(err => console.error('❌ Error:', err));
```

**Expected:**
```
✅ Success: { success: true, data: { leads: [...], metadata: {...} } }
```

**If you see CORS error:**
1. Check server is running: `pm2 status`
2. Check server logs: `pm2 logs node-backend`
3. Check Nginx config
4. Clear browser cache

---

## 📋 Updated CORS Configuration

I've updated your `server.js` with these origins:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  'https://3vltn.com',         // ✅ Your main frontend
  'http://3vltn.com',
  'https://www.3vltn.com',     // ✅ With www
  'http://www.3vltn.com',
  'https://api.3vltn.com',
  'http://api.3vltn.com',
  'https://3-vltn-dashboard.vercel.app'
];
```

**With enhanced logging:**
```javascript
🔍 CORS Check - Origin: https://3vltn.com
   ✅ Allowed: https://3vltn.com is in whitelist
```

---

## ✅ Final Checklist

- [ ] Server restarted: `pm2 restart all`
- [ ] Server is running: `pm2 status` shows "online"
- [ ] Logs show CORS whitelist includes `https://3vltn.com`
- [ ] Nginx config doesn't override CORS headers
- [ ] SSL certificate is valid for `api.3vltn.com`
- [ ] Browser cache cleared or tested in incognito
- [ ] Test script passes: `node test-cors-leads.js`

---

## 🆘 Still Not Working?

### Get Detailed Logs

```bash
# Watch logs in real-time
pm2 logs node-backend --lines 100

# Then make a request from your frontend
# You should see:
# 🔍 CORS Check - Origin: https://3vltn.com
#    ✅ Allowed: https://3vltn.com is in whitelist
```

### Check Network Tab

1. Open Chrome DevTools (F12)
2. Go to "Network" tab
3. Make the request
4. Click on the failed request
5. Look at "Response Headers"

**Should see:**
```
Access-Control-Allow-Origin: https://3vltn.com
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH
```

**If NOT present:** Server isn't running or Nginx is blocking

### Manual cURL Test

```bash
# Test with Origin header
curl -X POST https://api.3vltn.com/backend/leads/generate \
  -H "Origin: https://3vltn.com" \
  -H "Content-Type: application/json" \
  -d '{"keyword": "test", "count": 2}' \
  -v

# Check response headers include:
# < Access-Control-Allow-Origin: https://3vltn.com
```

---

## 📞 Need Help?

If still not working after all these steps, provide:

1. **Server logs:** `pm2 logs node-backend --lines 50`
2. **PM2 status:** `pm2 status`
3. **Network tab screenshot** from browser DevTools
4. **cURL output:** The verbose curl command above

This will help diagnose the exact issue!

---

**TL;DR: Restart server → Clear cache → Test**

```bash
pm2 restart all
# Then test in browser (incognito mode)
```

