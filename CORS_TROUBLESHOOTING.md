# CORS Issue Troubleshooting Guide

## Problem
**No logs in backend** when making requests from `http://localhost:3000` to `https://3vltn.com/stripe/connect`

This means the request is being blocked BEFORE it reaches your Node.js backend.

## Root Cause
You have **Nginx (or another reverse proxy)** in front of your Node.js backend that is:
1. Not configured to handle CORS preflight (OPTIONS) requests
2. Blocking the request before it reaches Node.js

## Solution

### Option 1: Configure Nginx to Handle CORS (RECOMMENDED)

**Step 1: SSH into your server**
```bash
ssh user@3vltn.com
```

**Step 2: Edit your Nginx configuration**
```bash
sudo nano /etc/nginx/sites-available/3vltn.com
# or
sudo nano /etc/nginx/nginx.conf
```

**Step 3: Add CORS headers**
Add this inside your `server` block:

```nginx
# CORS Headers
add_header 'Access-Control-Allow-Origin' $http_origin always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;

# Handle OPTIONS preflight
if ($request_method = 'OPTIONS') {
    add_header 'Access-Control-Allow-Origin' $http_origin always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Max-Age' '86400' always;
    return 204;
}
```

**Step 4: Test and reload Nginx**
```bash
sudo nginx -t                    # Test configuration
sudo systemctl reload nginx      # Reload Nginx
```

**Step 5: Restart your Node.js backend**
```bash
cd /path/to/DomainSeller-Backend
git pull
pm2 restart backend              # or your restart command
```

### Option 2: Use Backend URL Directly (TEMPORARY WORKAROUND)

If you can't access the server right now, temporarily use the direct backend port:

**In your frontend code:**
```javascript
// Instead of:
const response = await fetch('https://3vltn.com/stripe/connect', {
  method: 'POST',
  // ...
});

// Use:
const response = await fetch('https://3vltn.com:5000/stripe/connect', {
  method: 'POST',
  // ...
});
```

**BUT** you need to open port 5000 on your server firewall:
```bash
sudo ufw allow 5000
```

### Option 3: Use /backend Prefix

Try using the `/backend` prefix which might have different Nginx rules:

```javascript
const response = await fetch('https://3vltn.com/backend/stripe/connect', {
  method: 'POST',
  // ...
});
```

## Verification Steps

### 1. Check if Nginx is running
```bash
sudo systemctl status nginx
```

### 2. Check Nginx error logs
```bash
sudo tail -f /var/log/nginx/error.log
```

### 3. Check Nginx access logs
```bash
sudo tail -f /var/log/nginx/access.log
```

### 4. Check if Node.js backend is running
```bash
pm2 status
# or
ps aux | grep node
```

### 5. Check backend logs
```bash
pm2 logs backend
# or check your log file location
```

### 6. Test the endpoint directly from the server
```bash
curl -X POST http://localhost:5000/stripe/connect \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","email":"test@example.com"}'
```

## Expected Behavior After Fix

### Browser Network Tab
You should see:
1. **OPTIONS** request to `/stripe/connect` - Status: 204
2. **POST** request to `/stripe/connect` - Status: 200

### Backend Logs
You should see:
```
============================================================
📥 OPTIONS /stripe/connect
⏰ 2025-11-27T16:02:59.000Z
🌍 Origin: http://localhost:3000
🔑 Host: 3vltn.com
============================================================
🔍 CORS PREFLIGHT REQUEST DETECTED
   Origin: http://localhost:3000
   Method: POST
   Headers: content-type
============================================================
📥 POST /stripe/connect
⏰ 2025-11-27T16:02:59.100Z
🌍 Origin: http://localhost:3000
🔑 Host: 3vltn.com
📦 Body: {
  "userId": "123",
  "email": "user@example.com"
}
============================================================
🔗 Initiating Stripe Connect onboarding...
```

## Quick Diagnostic

Run this command to check what's listening on port 5000:
```bash
sudo netstat -tlnp | grep 5000
```

Check Nginx configuration:
```bash
sudo nginx -T | grep -A 20 "server_name 3vltn.com"
```

## Files Provided
- `nginx-cors-config.conf` - Complete Nginx configuration example
- This troubleshooting guide

## Next Steps
1. SSH into your server at 3vltn.com
2. Configure Nginx with CORS headers
3. Restart Nginx and Node.js backend
4. Test from frontend

The issue is 100% at the Nginx/proxy level, not in your Node.js code!
