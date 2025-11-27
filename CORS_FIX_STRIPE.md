# CORS Fix for Stripe Connect Endpoint

## Problem
CORS error when accessing `https://3vltn.com/stripe/connect` from `http://localhost:3000`:
```
Access to fetch at 'https://3vltn.com/stripe/connect' from origin 'http://localhost:3000' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control 
check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Changes Made

### 1. Enhanced CORS Configuration (server.js)
Added comprehensive CORS options:
- ✅ Explicit HTTP methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
- ✅ Allowed headers: Content-Type, Authorization, X-Requested-With, Accept, Origin
- ✅ Exposed headers for client access
- ✅ 24-hour preflight cache (maxAge: 86400)
- ✅ OPTIONS success status: 204

### 2. CORS Debugging Middleware (server.js)
Added detailed logging for:
- Preflight OPTIONS requests
- CORS headers being sent in responses
- Origin and request method tracking

### 3. Enhanced Request Logging (server.js)
Now logs:
- 🌍 Origin header
- 🔑 Host header
- All request details

### 4. Stripe Connect Route Logging (routes/stripe.js)
Added detailed logging:
- Request origin
- Request body
- Missing field validation

## What You Need to Do

### **CRITICAL: Restart the Backend Server on https://3vltn.com**

The changes have been pushed to GitHub, but the server needs to be restarted to apply them.

**Steps:**
1. SSH into your production server (3vltn.com)
2. Navigate to the backend directory
3. Pull the latest changes: `git pull`
4. Restart the server:
   - If using PM2: `pm2 restart <app-name>`
   - If using systemd: `sudo systemctl restart <service-name>`
   - If running manually: Stop and restart the Node.js process

### After Restart

When you make a request from the frontend, you should now see detailed logs like:

```
============================================================
📥 OPTIONS /stripe/connect
⏰ 2025-11-27T15:55:04.000Z
🌍 Origin: http://localhost:3000
🔑 Host: 3vltn.com
============================================================
🔍 CORS PREFLIGHT REQUEST DETECTED
   Origin: http://localhost:3000
   Method: POST
   Headers: content-type
📤 CORS PREFLIGHT RESPONSE HEADERS:
   Access-Control-Allow-Origin: http://localhost:3000
   Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH
   Access-Control-Allow-Headers: Content-Type,Authorization,X-Requested-With,Accept,Origin
============================================================
📥 POST /stripe/connect
⏰ 2025-11-27T15:55:04.100Z
🌍 Origin: http://localhost:3000
🔑 Host: 3vltn.com
📦 Body: {
  "userId": "123",
  "email": "user@example.com"
}
============================================================
🔗 Initiating Stripe Connect onboarding...
📍 Request received at /stripe/connect
🌍 Origin: http://localhost:3000
📦 Request Body: {
  "userId": "123",
  "email": "user@example.com"
}
```

## Testing

After restarting the server, test from your frontend at `http://localhost:3000`. The CORS error should be resolved.

If you still see issues, check the server logs - they will now show exactly what's happening with CORS.

## Files Modified
- ✅ `server.js` - Enhanced CORS config and debugging
- ✅ `routes/stripe.js` - Added detailed logging
- ✅ Committed and pushed to GitHub

## Commit Messages
1. "Fix CORS preflight handling for Stripe Connect endpoint"
2. "Add detailed CORS debugging and request logging"
