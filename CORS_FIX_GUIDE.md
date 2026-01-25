# 🔧 CORS FIX - Quick Deploy Guide

## ❌ Problem
```
Access to fetch at 'https://api.3vltn.com/backend/leads/generate' 
from origin 'https://3vltn.com' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present
```

## ✅ Solution

The issue is that Nginx on `api.3vltn.com` is not sending proper CORS headers back to the browser.

### 📋 Files Created:
1. `nginx-api-cors-fix.conf` - Updated nginx configuration
2. `fix-cors-deploy.sh` - Automated deployment script

---

## 🚀 Quick Fix (Run on Production Server)

### Option 1: Automated Script (Recommended)

```bash
# SSH into your server
ssh root@api.3vltn.com

# Navigate to backend directory
cd /root/DomainSeller-Backend

# Pull latest changes (includes fix files)
git pull

# Make deploy script executable
chmod +x fix-cors-deploy.sh

# Run the fix script
sudo ./fix-cors-deploy.sh
```

### Option 2: Manual Fix

```bash
# SSH into server
ssh root@api.3vltn.com

# Backup existing config
sudo cp /etc/nginx/sites-available/api.3vltn.com /etc/nginx/sites-available/api.3vltn.com.backup

# Edit the nginx config
sudo nano /etc/nginx/sites-available/api.3vltn.com
```

Add these CORS headers at the top of the `server` block:

```nginx
# Allowed Origins for CORS
set $cors_origin "";

if ($http_origin ~* (https?://(localhost:3000|localhost:5173|3vltn\.com|www\.3vltn\.com|.*\.vercel\.app))) {
    set $cors_origin $http_origin;
}

# CORS Headers
add_header 'Access-Control-Allow-Origin' $cors_origin always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;
add_header 'Access-Control-Max-Age' '86400' always;

# Handle OPTIONS preflight
if ($request_method = 'OPTIONS') {
    add_header 'Access-Control-Allow-Origin' $cors_origin always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Max-Age' '86400' always;
    add_header 'Content-Length' '0';
    add_header 'Content-Type' 'text/plain charset=UTF-8';
    return 204;
}
```

Then test and reload:

```bash
# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 🧪 Test the Fix

### 1. Test CORS Headers:

```bash
curl -I -X OPTIONS https://api.3vltn.com/backend/leads/generate \
  -H "Origin: https://3vltn.com" \
  -H "Access-Control-Request-Method: POST"
```

**Expected Response:**
```
HTTP/2 204
access-control-allow-origin: https://3vltn.com
access-control-allow-methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
access-control-allow-headers: Content-Type, Authorization, X-Requested-With, Accept, Origin
access-control-allow-credentials: true
access-control-max-age: 86400
```

### 2. Test from Browser:

Go to https://3vltn.com and open browser console:

```javascript
fetch('https://api.3vltn.com/backend/leads/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    keyword: 'test',
    count: 5
  })
})
.then(res => res.json())
.then(data => console.log('✅ CORS Fixed!', data))
.catch(err => console.error('❌ Still blocked:', err));
```

---

## 📊 Monitor Logs

```bash
# Nginx logs
sudo tail -f /var/log/nginx/api.3vltn.com.error.log

# Backend logs
pm2 logs node-backend

# Or if using systemd
sudo journalctl -u node-backend -f
```

---

## 🔍 Common Issues

### Issue 1: "Still seeing CORS error"
**Solution:** Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue 2: "Nginx config test fails"
**Solution:** Check syntax, restore backup:
```bash
sudo cp /etc/nginx/sites-available/api.3vltn.com.backup /etc/nginx/sites-available/api.3vltn.com
sudo nginx -t
```

### Issue 3: "Backend not responding"
**Solution:** Restart backend:
```bash
pm2 restart node-backend
# or
sudo systemctl restart node-backend
```

---

## ✅ Verification Checklist

- [ ] Nginx config updated with CORS headers
- [ ] Nginx configuration test passed (`nginx -t`)
- [ ] Nginx reloaded (`systemctl reload nginx`)
- [ ] Backend is running (`pm2 list` or `systemctl status node-backend`)
- [ ] CORS headers present in response (curl test)
- [ ] Frontend can successfully call API (browser test)
- [ ] No CORS errors in browser console

---

## 📞 Need Help?

If the issue persists:

1. Check nginx error logs: `sudo tail -f /var/log/nginx/api.3vltn.com.error.log`
2. Check backend logs: `pm2 logs node-backend`
3. Verify DNS: `nslookup api.3vltn.com`
4. Test direct backend: `curl http://127.0.0.1:5000/backend/health`

---

## 🎯 Root Cause

The issue was that Nginx wasn't configured to add CORS headers for cross-origin requests from `https://3vltn.com` to `https://api.3vltn.com`. Even though they're the same domain family, browsers treat different subdomains as different origins and require explicit CORS headers.
