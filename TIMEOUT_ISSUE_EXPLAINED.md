# 🐛 Lead Generation CORS/Timeout Issue - DIAGNOSIS & FIX

## ❌ The Problem

```
Access to fetch at 'https://api.3vltn.com/backend/leads/generate' 
from origin 'https://3vltn.com' has been blocked by CORS policy

POST https://api.3vltn.com/backend/leads/generate 
net::ERR_FAILED 504 (Gateway Time-out)
```

## 🔍 Root Cause Analysis

### What's Actually Happening:

1. ✅ **Frontend sends request** → Works fine
2. ✅ **Backend receives request** → Works fine (you see this in logs)
3. ✅ **Apify starts scraping** → Works fine (finds 100 leads)
4. ⏰ **Processing takes 60+ seconds** → This is the issue!
5. ❌ **Nginx times out at 60 seconds** → Returns 504 error
6. ❌ **504 response has no CORS headers** → Browser shows CORS error

### The Real Issue:

**It's NOT a CORS problem - it's a TIMEOUT problem!**

The CORS error is misleading - it appears because when Nginx times out, it returns a generic 504 error page **without CORS headers**, making the browser think it's a CORS issue.

---

## 📊 Evidence from Logs

Your logs show the backend IS working:

```
0|node-backend  | 🚀 Starting Apify actor: code_crafter/leads-finder
0|node-backend  | ⏳ Running Apify actor... (this may take 30-60 seconds)
0|node-backend  | leads-finder -> ✅ Found 100 leads
0|node-backend  | leads-finder -> ✅ Found 100 leads
```

The backend successfully:
- ✅ Received the request
- ✅ Started Apify actor
- ✅ Found leads (100 leads!)
- ❌ But the response never made it back to the frontend (Nginx timeout)

---

## ✅ The Solution

Update Nginx configuration to:
1. Increase timeout for lead generation endpoints (180 seconds)
2. Keep CORS headers on all responses (including errors)
3. Keep normal timeouts (60s) for other endpoints

---

## 🚀 Quick Fix

### On Your Production Server:

```bash
# SSH into server
ssh root@api.3vltn.com

# Navigate to backend repo
cd /root/DomainSeller-Backend

# Pull latest changes (includes fix script)
git pull

# Make script executable
chmod +x fix-timeout.sh

# Run the fix
sudo ./fix-timeout.sh
```

That's it! The issue will be fixed.

---

## 📝 Manual Fix (If Needed)

Edit nginx config:

```bash
sudo nano /etc/nginx/sites-available/api.3vltn.com
```

Add this **before** the main `location /` block:

```nginx
# Special location for lead generation (needs longer timeout)
location /backend/leads/ {
    proxy_pass http://127.0.0.1:5000/backend/leads/;
    proxy_http_version 1.1;
    
    # Extended timeouts for long-running lead generation
    proxy_connect_timeout 180s;
    proxy_send_timeout 180s;
    proxy_read_timeout 180s;
    
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Origin $http_origin;
    proxy_buffering off;
    proxy_cache_bypass $http_upgrade;
}
```

Then:

```bash
# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 🧪 Testing

After applying the fix, test from frontend:

```javascript
// Open https://3vltn.com console
fetch('https://api.3vltn.com/backend/leads/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyword: 'tech',
    count: 10
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ SUCCESS! Leads received:', data);
})
.catch(err => {
  console.error('❌ Still failing:', err);
});
```

**Expected result:**
- Wait 60-120 seconds
- Should return successfully with leads
- No CORS error
- No timeout error

---

## 📊 Timeout Configuration Summary

| Endpoint | Timeout | Reason |
|----------|---------|--------|
| `/backend/leads/*` | 180s (3 min) | Lead scraping takes 60-120s |
| All other endpoints | 60s (1 min) | Normal API operations |

---

## 🔍 Why This Happens

### Lead Generation Flow:
```
1. Frontend request → Nginx → Backend [instant]
2. Backend → Apify Actor [instant]
3. Apify scraping Google [30-120 seconds] ⏰
4. Apify → Backend [instant]
5. Backend → Nginx → Frontend [instant]
```

**The delay is in step 3** - Apify takes time to scrape Google and find leads.

### Why Nginx Times Out:

- Default Nginx timeout: 60 seconds
- Lead generation: 60-120 seconds
- Result: Nginx gives up before response arrives

---

## ⚡ Future Improvements (Optional)

### Option 1: Add Loading Indicator
Show users a message: "Generating leads... this may take up to 2 minutes"

### Option 2: Make it Async
1. Frontend starts job, gets job ID
2. Frontend polls for results
3. Backend returns results when ready

### Option 3: Cache More Aggressively
Your backend already has caching - encourage users to reuse cached leads

---

## ✅ Verification Checklist

After applying the fix:

- [ ] Nginx config updated with extended timeouts
- [ ] Nginx config test passed (`nginx -t`)
- [ ] Nginx reloaded (`systemctl reload nginx`)
- [ ] Test from frontend - request completes successfully
- [ ] Check backend logs - see full request/response cycle
- [ ] No CORS errors in browser console
- [ ] No 504 timeout errors

---

## 🎯 Summary

**Problem:** Nginx timing out before lead generation completes
**Solution:** Increase timeout for `/backend/leads/` endpoints to 180 seconds
**Result:** Requests complete successfully, no CORS/timeout errors

The backend is working perfectly - we just need to give it more time to respond! 🚀
