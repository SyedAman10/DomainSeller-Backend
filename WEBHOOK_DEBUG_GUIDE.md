# 🔍 Webhook Debugging - Quick Reference

## Current Status Based on Your Logs

### ✅ What I Can See Working:
```
✅ Backend server is running on api.3vltn.com
✅ GET request received at /inbound/mailgun (shows endpoint is accessible)
✅ Email queue processor is running
✅ Campaigns are being created and sent successfully
```

### ❌ What's Missing:
```
❌ No POST requests from Mailgun (only GET requests - browser tests)
❌ No actual inbound emails being processed
❌ Mailgun route is NOT configured yet
```

---

## 🎯 The Issue in Plain English

When you see this in logs:
```
❌ 404 NOT FOUND:
   Path: GET /inbound/mailgun
   Origin: undefined
   Full URL: http://api.3vltn.com/inbound/mailgun
```

This means:
1. ✅ Someone (you?) tested the URL in a browser
2. ✅ The endpoint is accessible from the internet
3. ❌ But it was a GET request (browser default)
4. ❌ Mailgun needs to send POST requests (with email data)

---

## 🔧 What You Need To Do NOW

### Step 1: Test the Endpoint (Browser)

**Open in your browser:**
```
https://api.3vltn.com/inbound/mailgun
```

**You should see this JSON response:**
```json
{
  "success": true,
  "message": "Mailgun webhook endpoint is active",
  "note": "This endpoint accepts POST requests from Mailgun",
  "instructions": {
    "mailgunRoute": "Configure in Mailgun Dashboard > Receiving > Routes",
    "expression": "match_recipient(\"admin@mail.3vltn.com\") OR match_recipient(\"info@mail.3vltn.com\")",
    "forwardTo": "https://api.3vltn.com/inbound/mailgun",
    "method": "POST (not GET)"
  }
}
```

If you see that, **your endpoint is working!** ✅

---

### Step 2: Configure Mailgun Route

**Go to:** https://app.mailgun.com/app/sending/domains/mail.3vltn.com/receiving/routes

**Click:** "Create Route"

**Fill in:**

| Field | Value |
|-------|-------|
| **Priority** | `0` |
| **Expression Type** | `Match Recipient` |
| **Recipient** | `admin@mail.3vltn.com` |
| **Actions** | ✅ Forward<br>✅ Stop |
| **Forward URL** | `https://api.3vltn.com/inbound/mailgun` |
| **Description** | `AI Auto-Responder Webhook` |

**Click:** "Create Route"

---

### Step 3: Test with Real Email

**Send an email TO:**
```
admin@mail.3vltn.com
```

**Subject:** `Test Mailgun Webhook`

**Body:** `Testing if webhook is working`

**Watch your logs:**
```bash
pm2 logs node-backend --lines 50
```

**You should see:**
```
📨 INBOUND EMAIL RECEIVED FROM MAILGUN WEBHOOK
⏰ Time: 2025-12-25T...
🌐 Request Method: POST   <--- IMPORTANT: Should be POST now!
📧 From: your-email@example.com
📬 To: admin@mail.3vltn.com
📝 Subject: Test Mailgun Webhook
💬 Message: Testing if webhook is working...
```

---

## 📊 What the Logs Mean

### Before Mailgun Route is Configured:
```
❌ 404 NOT FOUND:
   Path: GET /inbound/mailgun
   Origin: undefined
```
👉 This is just you testing in browser. Normal. Not an error.

### After Mailgun Route is Configured:
```
✅ 📨 INBOUND EMAIL RECEIVED FROM MAILGUN WEBHOOK
✅ 🌐 Request Method: POST
✅ 📧 From: buyer@example.com
✅ 🔍 Looking for related campaign...
```
👉 This means Mailgun is forwarding emails! Success!

---

## 🧪 Quick Test Commands

### Test 1: Check if endpoint responds (GET)
```bash
curl https://api.3vltn.com/inbound/mailgun
```

**Expected:** JSON response with instructions

---

### Test 2: Simulate Mailgun webhook (POST)
```bash
curl -X POST https://api.3vltn.com/inbound/mailgun \
  -d "sender=test@example.com" \
  -d "recipient=admin@mail.3vltn.com" \
  -d "subject=Test Email" \
  -d "body-plain=This is a test message" \
  -d "stripped-text=This is a test message"
```

**Expected in logs:**
```
📨 INBOUND EMAIL RECEIVED FROM MAILGUN WEBHOOK
🌐 Request Method: POST
📧 From: test@example.com
📬 To: admin@mail.3vltn.com
```

---

### Test 3: Check webhook status
```bash
curl https://api.3vltn.com/backend/inbound/webhook-status
```

**Expected:** Detailed status report with setup instructions

---

## 🚦 Status Indicators

### 🟢 Everything Working:
```
📨 INBOUND EMAIL RECEIVED FROM MAILGUN WEBHOOK
🔍 Looking for related campaign...
✅ Found Campaign: Campaign for theprimecrafters.com
🤖 Generating AI response...
✅ AI Response Generated Successfully
📤 Sending AI-generated response...
✅ AI response sent successfully!
```

### 🟡 Endpoint Active, But No Emails:
```
❌ 404 NOT FOUND: Path: GET /inbound/mailgun
```
👉 Mailgun route not configured yet

### 🟠 Receiving Emails, But No Campaign:
```
📨 INBOUND EMAIL RECEIVED
⚠️  No campaign found for this buyer
```
👉 Need to send a campaign email first, then buyer can reply

### 🔴 Endpoint Not Accessible:
```
Connection refused / Timeout
```
👉 Backend server is down or firewall blocking

---

## 📞 Current Setup Summary

**Your Backend:** `api.3vltn.com`
**Webhook Endpoint:** `/inbound/mailgun` (also `/backend/inbound/mailgun`)
**Reply-To Email:** `admin@mail.3vltn.com`
**Mailgun Domain:** `mail.3vltn.com`

**What Happens When Buyer Replies:**
1. Buyer clicks "Reply" to your campaign email
2. Email goes to: `admin@mail.3vltn.com` (your Reply-To)
3. Mailgun receives it
4. **[NEEDS SETUP]** Mailgun forwards to: `https://api.3vltn.com/inbound/mailgun`
5. Your backend processes it
6. AI generates response
7. Response sent back to buyer

**Missing Link:** Step 4 - Mailgun route configuration

---

## ✅ Checklist

- [ ] Can access `https://api.3vltn.com/inbound/mailgun` in browser (GET)
- [ ] Gets JSON response (not 404)
- [ ] Mailgun route created in dashboard
- [ ] Route points to: `https://api.3vltn.com/inbound/mailgun`
- [ ] Route expression matches: `admin@mail.3vltn.com`
- [ ] Tested by sending email to `admin@mail.3vltn.com`
- [ ] Saw "INBOUND EMAIL RECEIVED" in logs
- [ ] Verified POST request (not GET) in logs

Once all checked, your AI auto-responder is live! 🚀

---

## 🆘 Still Not Working?

**Check webhook status:**
```
https://api.3vltn.com/backend/inbound/webhook-status
```

**Share this with support:**
1. Screenshot of Mailgun route configuration
2. Last 50 lines of PM2 logs: `pm2 logs node-backend --lines 50`
3. Result of: `curl https://api.3vltn.com/inbound/mailgun`

