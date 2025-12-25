# 🚀 Mailgun Webhook Setup Guide for AI Auto-Response

## Problem: AI is Not Responding to Buyer Emails

Your campaign emails are being **sent successfully**, but when buyers reply, the **AI is not generating responses**. This is because **Mailgun is not forwarding the replies to your backend**.

---

## ✅ Current Status (From Your Logs)

### What's Working:
- ✅ Backend server is running (`api.3vltn.com`)
- ✅ CORS is configured correctly
- ✅ Campaigns are being created successfully
- ✅ Emails are being sent to buyers via Mailgun
- ✅ Database is connected and working
- ✅ OpenAI integration is configured

### What's NOT Working:
- ❌ **Mailgun webhook is NOT forwarding buyer replies to your backend**
- ❌ No inbound emails are being received at `/inbound/mailgun`
- ❌ The `email_conversations` table shows 0 inbound messages

---

## 🔧 How to Fix: Configure Mailgun Route

### Step 1: Log into Mailgun Dashboard
Go to: https://app.mailgun.com/

### Step 2: Navigate to Receiving Routes
1. Select your domain: `mail.3vltn.com`
2. Click on **"Receiving"** in the left sidebar
3. Click on **"Routes"**

### Step 3: Create a New Route

Click **"Create Route"** and configure:

**Priority:** `0` (highest priority)

**Expression Type:** Choose "Match Recipient"

**Expression:**
```
match_recipient("admin@mail.3vltn.com") OR match_recipient("info@mail.3vltn.com")
```

**Actions:**
1. **Forward** to: `https://api.3vltn.com/inbound/mailgun`
2. **Stop** (check this to prevent further processing)

**Description:** `Forward buyer replies to backend AI agent`

### Step 4: Save the Route

Click **"Create Route"**

---

## 🧪 Testing Your Setup

### Test 1: Check Webhook Endpoint

Visit this URL in your browser:
```
https://api.3vltn.com/backend/inbound/webhook-status
```

This will show:
- Whether Mailgun is configured
- Your webhook URL
- Recent inbound emails received
- Setup instructions

### Test 2: Send a Test Email

1. **Reply to one of your campaign emails** from `aman@erptechnicals.com`
2. **Check your backend logs:**
   ```bash
   pm2 logs node-backend --lines 50
   ```

3. **Look for this log:**
   ```
   📨 INBOUND EMAIL RECEIVED FROM MAILGUN WEBHOOK
   ```

If you see that log, it's working! ✅

If you don't see it, Mailgun is not forwarding emails yet. ❌

### Test 3: Check Database

```sql
SELECT * FROM email_conversations 
WHERE direction = 'inbound' 
ORDER BY received_at DESC 
LIMIT 5;
```

You should see buyer replies here.

---

## 📧 How the AI Auto-Response Works

Once the webhook is configured, here's what happens automatically:

### When a Buyer Replies:

1. **Mailgun receives the reply** at `admin@mail.3vltn.com` or `info@mail.3vltn.com`

2. **Mailgun forwards it** to your backend webhook: `/inbound/mailgun`

3. **Your backend processes it:**
   ```
   📨 INBOUND EMAIL RECEIVED FROM MAILGUN WEBHOOK
   🔍 Looking for related campaign...
   ✅ Found Campaign: Campaign for theprimecrafters.com
   🤖 Generating AI response...
   ✅ AI Response Generated Successfully
   📤 Sending AI-generated response...
   ✅ AI response sent successfully!
   ```

4. **AI generates a personalized response** using OpenAI

5. **Response is sent back to the buyer** automatically

6. **Admin gets notified** with the full conversation thread

7. **Follow-up emails are paused** for this buyer (since they engaged)

---

## 🔍 Debugging Tips

### Check if Webhook is Being Called

Add this to your Nginx logs (if using Nginx):
```nginx
log_format mailgun '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for"';

access_log /var/log/nginx/mailgun.log mailgun;
```

### Check Backend Logs in Real-Time

```bash
pm2 logs node-backend --raw | grep "INBOUND EMAIL"
```

### Manually Test the Webhook

Use curl to simulate Mailgun:
```bash
curl -X POST https://api.3vltn.com/inbound/mailgun \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "sender=test@example.com" \
  -d "recipient=admin@mail.3vltn.com" \
  -d "subject=Test Reply" \
  -d "body-plain=This is a test reply"
```

---

## 📊 Monitoring AI Responses

### View Conversation Threads

```
GET https://api.3vltn.com/backend/inbound/threads/{campaignId}
```

### View Specific Conversation

```
GET https://api.3vltn.com/backend/inbound/thread/{campaignId}/{buyerEmail}
```

### View Recent Inbound Emails

```sql
SELECT 
  ec.buyer_email,
  ec.buyer_name,
  ec.message_content,
  ec.received_at,
  c.campaign_name,
  c.domain_name
FROM email_conversations ec
JOIN campaigns c ON ec.campaign_id = c.campaign_id
WHERE ec.direction = 'inbound'
ORDER BY ec.received_at DESC
LIMIT 20;
```

---

## ⚙️ Campaign Settings

### Auto-Response Mode

**Enabled (default):**
- AI responds immediately to buyer emails
- Admin gets notified with full thread

**Disabled:**
- Creates draft responses for manual review
- You approve/edit before sending

Set in campaign creation or update `auto_response_enabled` in database.

### Response Customization

Configure in your campaign:
- `response_style`: professional | casual | friendly | direct | persuasive
- `response_length`: short | medium | long
- `negotiation_strategy`: firm | flexible | very_flexible
- `minimum_price`: Don't accept offers below this
- `custom_instructions`: Additional AI instructions

---

## 🚨 Common Issues

### Issue 1: "No campaign found for this buyer"
**Cause:** The buyer email doesn't match any sent emails
**Fix:** Make sure you sent an email to this buyer first

### Issue 2: "OpenAI Key Missing"
**Cause:** `OPENAI_API_KEY` not set in `.env`
**Fix:** Add your OpenAI API key to `.env` and restart

### Issue 3: Webhook Returns 404
**Cause:** URL is incorrect in Mailgun route
**Fix:** Use `https://api.3vltn.com/inbound/mailgun` (no /backend prefix)

### Issue 4: AI Response is Too Long/Short
**Fix:** Adjust `response_length` in campaign settings:
- `short`: 100-120 words
- `medium`: 180-200 words  
- `long`: 300-320 words

---

## 📝 Next Steps

1. ✅ **Configure Mailgun Route** (see Step 3 above)
2. ✅ **Test by replying** to a campaign email
3. ✅ **Check logs** for "INBOUND EMAIL RECEIVED"
4. ✅ **Verify AI response** was sent to buyer
5. ✅ **Check admin notification** email

Once configured, your AI agent will:
- ✅ Automatically respond to all buyer replies
- ✅ Personalize responses based on buyer messages
- ✅ Handle price negotiations intelligently
- ✅ Pause follow-ups for engaged buyers
- ✅ Keep you notified of all conversations

---

## 🆘 Still Not Working?

Check the webhook status endpoint:
```
https://api.3vltn.com/backend/inbound/webhook-status
```

Or contact support with:
1. Screenshot of your Mailgun route configuration
2. Backend logs showing the issue
3. Example buyer email that didn't get a response

