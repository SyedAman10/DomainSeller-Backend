# Complete API Reference

Quick reference for all Campaign Backend APIs with enhanced logging.

---

## 🔍 Enhanced Logging & Debugging

### API Request Logging
Every API call now shows detailed information in the console:

```
============================================================
📥 POST /api/campaigns
⏰ 2025-10-29T12:30:00.000Z
📦 Body: {
  "userId": 1,
  "domainName": "example.com"
}
============================================================
🆕 Creating new campaign...
✅ Campaign created with ID: campaign_123
```

### Email Sending Debug Logs
Every email sent shows comprehensive debugging information:

```
============================================================
📧 SENDING EMAIL
⏰ Time: 2025-10-30T14:22:00.000Z
📨 To: buyer@example.com
📝 Subject: Why example.com is perfect for you
🏷️  Tags: campaign-123, scheduled
🌐 Mailgun Domain: sandbox123.mailgun.org
📮 From: noreply@sandbox123.mailgun.org
============================================================
⚠️  WARNING: Using Mailgun SANDBOX domain!
⚠️  Recipient must be in authorized recipients list
⚠️  Add recipient at: https://app.mailgun.com/app/sending/domains
📄 Content: HTML (523 characters)
🚀 Sending request to Mailgun API...
✅ SUCCESS! Email sent to buyer@example.com
📬 Message ID: <20251030142200.abc123@sandbox.mailgun.org>
💬 Mailgun Response: Queued. Thank you.
============================================================
```

### Email Failure Debug Logs
When an email fails, you get detailed error information:

```
============================================================
❌ FAILED to send email to buyer@example.com
🔴 Error Type: AxiosError
📡 HTTP Status: 403
💬 Mailgun Message: Free accounts are for test purposes only...
📋 Full Response: {
  "message": "Free accounts are for test purposes only..."
}
🚫 FORBIDDEN: Check domain authorization or sandbox recipient list

💡 POSSIBLE SOLUTIONS:
   1. Using sandbox domain? Add recipient to authorized list
   2. Visit: https://app.mailgun.com/app/sending/domains
   3. Or upgrade to a verified domain
============================================================
```

### Scheduled Email Processor Logs
The email queue processor provides detailed execution logs:

```
════════════════════════════════════════════════════════════
🔄 SCHEDULED EMAIL PROCESSOR - RUNNING
⏰ Current Time: 2025-10-30T14:22:00.000Z
════════════════════════════════════════════════════════════
🔍 Querying database for scheduled emails...
   📋 Criteria: scheduled_for <= NOW() AND status = pending
📊 Query Result: Found 2 emails to process

📬 EMAILS TO PROCESS:
   1. ID: 92 | To: buyer@example.com
      Subject: "Why example.com is perfect for you"
      Scheduled: 2025-10-30T14:22:00.000Z
      Overdue: 0 minutes
      Campaign: Campaign for example.com

────────────────────────────────────────────────────────────
📧 Processing Email 1/2
   ID: 92
   To: buyer@example.com
   Subject: "Why example.com is perfect for you"
────────────────────────────────────────────────────────────
[Email sending logs here...]
💾 Updating database records...
   ✅ Updated scheduled_emails: ID 92 -> status = 'sent'
   ✅ Inserted into sent_emails table
✅ SUCCESS! Email ID 92 sent to buyer@example.com
   📬 Mailgun Message ID: <abc123@mailgun.org>

════════════════════════════════════════════════════════════
✅ SCHEDULED EMAIL PROCESSING COMPLETE
📊 Summary:
   ✅ Successful: 1
   ❌ Failed: 1
   📧 Total: 2
════════════════════════════════════════════════════════════
```

---

## 📋 Complete Endpoint List

### Health & Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/webhooks/test` | Test webhook endpoint |

### Campaign CRUD Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/campaigns` | ✅ **NEW** Create campaign (blocks duplicates) |
| POST | `/api/campaigns/replace` | ✅ **NEW** Replace existing campaign |
| GET | `/api/campaigns` | ✅ **NEW** Get all campaigns |
| GET | `/api/campaigns/:id` | Get campaign details |
| PUT | `/api/campaigns/:id` | ✅ **NEW** Update campaign |
| DELETE | `/api/campaigns/:id` | ✅ **NEW** Delete campaign |

### Campaign Actions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/campaigns/send-batch` | Send batch emails (max 10) |
| GET | `/api/campaigns/:id/stats` | Get campaign statistics |
| GET | `/api/campaigns/:id/scheduled` | Get scheduled emails for campaign |
| POST | `/api/campaigns/schedule-followup` | Schedule follow-up email |
| PUT | `/api/campaigns/scheduled/:id` | ✅ **NEW** Update scheduled email content/subject |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/mailgun` | Mailgun event webhook |

### 🤖 AI Email Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/inbound/mailgun` | ✨ **NEW** Receive & auto-reply to buyer emails |
| GET | `/api/inbound/conversations/:campaignId` | ✨ **NEW** Get conversation history for campaign |
| GET | `/api/inbound/conversations/buyer/:email` | ✨ **NEW** Get conversations with specific buyer |

---

## 🤖 NEW: AI Email Agent

**POST** `/api/inbound/mailgun`

Automatically receives buyer replies and generates AI-powered responses to convince them to buy the domain.

### How It Works:
1. 📨 Buyer replies to your email
2. 🔍 System analyzes their intent and sentiment
3. 🤖 AI generates persuasive response
4. 📧 Automatic reply sent to buyer
5. 💾 Conversation tracked in database

### Mailgun Inbound Routing Setup:

Configure in [Mailgun Dashboard](https://app.mailgun.com/app/sending/domains):

```
Expression: match_recipient(".*")
Action: Forward to https://yourdomain.com/api/inbound/mailgun
Priority: 1
```

### Example Flow:

**Buyer sends:**
```
I'm interested in example.com but the price 
seems high. Can you offer a discount?
```

**AI analyzes:**
```json
{
  "isInterested": true,
  "isPriceObjection": true,
  "isNegotiating": true,
  "sentiment": "positive"
}
```

**AI generates & sends:**
```
Hi John,

Thank you for your interest in example.com!

I understand your concern about pricing. Let me 
explain the value:

1. Premium .com extension - rare and valuable
2. SEO benefits - excellent search potential  
3. Brand recognition - memorable and professional

I have other interested parties, but I'd love to 
work with you. Would a payment plan help?

Looking forward to your thoughts!
```

### Response:
```json
{
  "success": true,
  "message": "Email processed and AI response sent",
  "campaign": "Campaign for example.com",
  "domain": "example.com",
  "intent": {
    "sentiment": "positive",
    "isInterested": true,
    "isPriceObjection": true
  },
  "aiGenerated": true
}
```

**Configuration Required:**
```bash
# Add to .env
OPENAI_API_KEY=sk-proj-your-key-here
AI_MODEL=gpt-4o-mini  # or gpt-3.5-turbo, gpt-4
```

📚 **Full Setup Guide:** See [AI_EMAIL_AGENT_SETUP.md](./AI_EMAIL_AGENT_SETUP.md)

---

## 🆕 NEW: Create Campaign

**POST** `/api/campaigns`

⚠️ **Note:** This endpoint blocks duplicate campaigns for the same domain. If you already have an active/draft campaign for the domain, it will return 409 Conflict.

```json
{
  "userId": 1,
  "domainId": 5,
  "domainName": "example.com",
  "campaignName": "My Campaign",
  "emailTone": "professional",
  "includePrice": true,
  "maxEmailsPerDay": 10,
  "followUpSequence": [
    {
      "name": "Reminder",
      "daysAfter": 3,
      "subject": "Quick reminder about {domain}",
      "template": "reminder"
    },
    {
      "name": "Value Add",
      "daysAfter": 7,
      "subject": "Additional value for {domain}",
      "template": "value_add"
    },
    {
      "name": "Final Offer",
      "daysAfter": 14,
      "subject": "Final offer for {domain}",
      "template": "final_offer"
    }
  ]
}
```

**Returns (Success):**
```json
{
  "success": true,
  "campaign": {
    "id": 88,
    "campaign_id": "campaign_1730207789_x7k2m9p",
    "campaign_name": "My Campaign",
    "domain_name": "example.com",
    "email_tone": "professional",
    "include_price": true,
    "max_emails_per_day": 10,
    "follow_up_sequence": [...],
    "status": "draft",
    "created_at": "2025-10-29T12:00:00Z",
    "total_emails_sent": 0,
    "total_emails_scheduled": 0
  },
  "scheduled": [],
  "scheduledCount": 0
}
```

**Returns (Duplicate - 409 Conflict):**
```json
{
  "success": false,
  "error": "Campaign already exists for this domain",
  "message": "You already have an active campaign for example.com",
  "existingCampaign": {
    "id": 85,
    "campaign_id": "campaign_123",
    "campaign_name": "Old Campaign",
    "status": "active"
  },
  "actions": {
    "useExisting": "Use the existing campaign (ID: 85)",
    "replaceExisting": "POST /api/campaigns/replace to delete old and create new",
    "updateExisting": "PUT /api/campaigns/85 to update settings"
  }
}
```

---

## 🆕 NEW: Replace Campaign

**POST** `/api/campaigns/replace`

Atomically deletes existing campaign for a domain and creates a new one. Use this when you want to start fresh with a new campaign.

```json
{
  "userId": 1,
  "domainName": "example.com",
  "campaignName": "New Campaign",
  "emailTone": "friendly",
  "includePrice": true,
  "maxEmailsPerDay": 50
}
```

**Returns:**
```json
{
  "success": true,
  "message": "Campaign replaced successfully",
  "deleted": 1,
  "campaign": {
    "campaign_id": "campaign_1730208000_abc123",
    "status": "draft",
    "created_at": "2025-10-29T12:10:00Z"
  }
}
```

---

## 🆕 NEW: Update Scheduled Email

**PUT** `/api/campaigns/scheduled/:scheduledEmailId`

Update a scheduled email's subject, content, scheduled time, or buyer details. 

⚠️ **Note:** Cannot update emails that have already been sent (status = 'sent').

**Request Body (all fields optional):**
```json
{
  "emailSubject": "Updated subject line",
  "emailContent": "Updated email content/body",
  "scheduledFor": "2025-11-01T10:00:00Z",
  "buyerEmail": "newemail@example.com",
  "buyerName": "Updated Name"
}
```

**Returns (Success - 200):**
```json
{
  "success": true,
  "message": "Scheduled email updated successfully",
  "scheduledEmail": {
    "id": 123,
    "campaign_id": "campaign_1730207789_x7k2m9p",
    "buyer_email": "newemail@example.com",
    "buyer_name": "Updated Name",
    "buyer_id": "buyer_001",
    "email_subject": "Updated subject line",
    "email_content": "Updated email content/body",
    "scheduled_for": "2025-11-01T10:00:00.000Z",
    "status": "pending",
    "created_at": "2025-10-29T12:00:00Z",
    "user_id": 1,
    "domain_name": "example.com"
  }
}
```

**Returns (Not Found - 404):**
```json
{
  "success": false,
  "error": "Scheduled email not found",
  "message": "No scheduled email found with ID: 999"
}
```

**Returns (Already Sent - 400):**
```json
{
  "success": false,
  "error": "Cannot update sent email",
  "message": "This email has already been sent and cannot be modified"
}
```

**Example:**
```bash
# Update just the subject
curl -X PUT http://localhost:5000/api/campaigns/scheduled/123 \
  -H "Content-Type: application/json" \
  -d '{"emailSubject": "New subject line"}'

# Update subject and content
curl -X PUT http://localhost:5000/api/campaigns/scheduled/123 \
  -H "Content-Type: application/json" \
  -d '{
    "emailSubject": "Updated subject",
    "emailContent": "Updated body text"
  }'

# Reschedule email to different time
curl -X PUT http://localhost:5000/api/campaigns/scheduled/123 \
  -H "Content-Type: application/json" \
  -d '{"scheduledFor": "2025-11-05T14:00:00Z"}'
```

---

## 🆕 NEW: Get All Campaigns

**GET** `/api/campaigns?userId=1`

**Returns:**
```json
{
  "success": true,
  "count": 5,
  "campaigns": [...]
}
```

---

## 🆕 NEW: Get Scheduled Emails for Campaign

**GET** `/api/campaigns/:campaignId/scheduled`

Get all scheduled emails for a specific campaign.

**Example:**
```bash
GET /api/campaigns/88/scheduled
```

**Returns:**
```json
{
  "success": true,
  "campaign": {
    "id": 88,
    "campaign_id": "campaign_1761754008962_4wji0omru",
    "campaign_name": "Campaign for mine.com",
    "domain_name": "mine.com"
  },
  "count": 3,
  "scheduled": [
    {
      "id": 123,
      "campaign_id": "campaign_1761754008962_4wji0omru",
      "buyer_email": "buyer@example.com",
      "email_subject": "Follow-up Email",
      "email_content": "...",
      "scheduled_for": "2025-10-30T10:00:00Z",
      "status": "pending",
      "seconds_until_send": 7200,
      "send_status": "soon"
    }
  ]
}
```

**Send Status Values:**
- `ready` - Ready to send now (scheduled time has passed)
- `soon` - Scheduled within next hour
- `waiting` - Scheduled for later

---

## 🆕 NEW: Update Campaign

**PUT** `/api/campaigns/:campaignId`

```json
{
  "campaignName": "Updated Name",
  "status": "active",
  "maxEmailsPerDay": 100
}
```

---

## 🆕 NEW: Delete Campaign

**DELETE** `/api/campaigns/:campaignId`

**Returns:**
```json
{
  "success": true,
  "message": "Campaign deleted successfully"
}
```

---

## 📊 Console Logging Examples

### Successful Request
```
============================================================
📥 GET /api/campaigns/campaign_123/stats
⏰ 2025-10-29T12:30:45.123Z
============================================================
📊 Fetching stats for campaign campaign_123...
✅ Found 45 sent emails, 12 scheduled
```

### Request with Body
```
============================================================
📥 POST /api/campaigns
⏰ 2025-10-29T12:31:00.000Z
📦 Body: {
  "userId": 1,
  "domainName": "example.com",
  "campaignName": "Test Campaign"
}
============================================================
🆕 Creating new campaign...
📝 Campaign: Test Campaign for example.com
✅ Campaign created with ID: campaign_1730207860_abc123
```

### Request with Query Parameters
```
============================================================
📥 GET /api/campaigns
⏰ 2025-10-29T12:32:00.000Z
📋 Query: {
  "userId": "1"
}
============================================================
📋 Fetching all campaigns...
👤 Filtering by user ID: 1
✅ Found 3 campaigns
```

### Error Logging
```
============================================================
📥 POST /api/campaigns
⏰ 2025-10-29T12:33:00.000Z
📦 Body: {
  "domainName": "example.com"
}
============================================================
🆕 Creating new campaign...
❌ Missing required fields
```

---

## 📚 Documentation Files

- **API_REFERENCE.md** (this file) - Complete endpoint reference
- **CAMPAIGN_CRUD_EXAMPLES.md** - Detailed CRUD examples with curl & JavaScript
- **API_EXAMPLES.md** - Email sending and scheduling examples  
- **README.md** - Full backend documentation
- **SETUP.md** - Installation and setup guide

---

## 🎯 Quick Test Commands

```bash
# Create campaign
curl -X POST http://localhost:5000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"domainName":"test.com","campaignName":"Test"}'

# Get all campaigns
curl http://localhost:5000/api/campaigns

# Get specific campaign
curl http://localhost:5000/api/campaigns/campaign_123

# Update campaign
curl -X PUT http://localhost:5000/api/campaigns/campaign_123 \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'

# Update scheduled email
curl -X PUT http://localhost:5000/api/campaigns/scheduled/123 \
  -H "Content-Type: application/json" \
  -d '{"emailSubject":"New subject","emailContent":"New content"}'

# Delete campaign
curl -X DELETE http://localhost:5000/api/campaigns/campaign_123

# Send batch emails
curl -X POST http://localhost:5000/api/campaigns/send-batch \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"campaign_123","emails":[{"to":"test@example.com","subject":"Test","html":"<p>Test</p>"}]}'

# Get campaign stats
curl http://localhost:5000/api/campaigns/campaign_123/stats
```

---

## ✅ All Features

- ✅ Enhanced console logging with emojis
- ✅ Full CRUD for campaigns
- ✅ Batch email sending (Mailgun)
- ✅ Email scheduling with auto-processing
- ✅ Campaign statistics & analytics
- ✅ Webhook integration for tracking
- ✅ 🤖 **AI Email Agent** - Auto-reply to buyers with OpenAI
- ✅ Conversation tracking & history
- ✅ Buyer intent analysis
- ✅ Database connection pooling
- ✅ Error handling & validation
- ✅ CORS enabled
- ✅ Request/response logging

---

## 🐛 Troubleshooting Email Issues

### Common Error: 403 Forbidden (Sandbox Domain)

**Error Message:**
```
🚫 FORBIDDEN: Check domain authorization or sandbox recipient list
```

**Cause:** You're using a Mailgun sandbox domain and the recipient is not authorized.

**Solution:**
1. Go to [Mailgun Dashboard](https://app.mailgun.com/app/sending/domains)
2. Click on your sandbox domain
3. Navigate to "Authorized Recipients"
4. Add the recipient email address
5. Verify the email address

**Or upgrade to a real domain:**
```bash
# In your .env file:
MAILGUN_DOMAIN=yourdomain.com
MAILGUN_FROM_EMAIL=noreply@yourdomain.com
```

---

### Common Error: 401 Unauthorized

**Error Message:**
```
🔑 AUTHENTICATION ERROR: Invalid API key
```

**Solution:**
1. Check your `.env` file has `MAILGUN_API_KEY` set
2. Verify API key is correct in [Mailgun Dashboard](https://app.mailgun.com/app/account/security/api_keys)
3. Copy the correct API key
4. Update `.env` and restart server

---

### Common Error: Email Marked as 'failed'

**Cause:** The scheduled email processor tried to send the email but received an error from Mailgun.

**How to Debug:**
1. Check your server console logs
2. Look for detailed error messages with `❌ FAILED TO SEND EMAIL`
3. Review the error details and HTTP status code
4. Follow the suggested solutions in the logs

---

### Email Not Sending Automatically

**Check:**
1. Is the email queue processor running?
   - Look for: `🚀 EMAIL QUEUE PROCESSOR - STARTING`
   
2. Is the scheduled time correct?
   - Run: `GET /api/campaigns/:id/scheduled`
   - Check `scheduled_for` field
   
3. Is the email status 'pending'?
   - Failed emails won't be retried automatically
   
4. Check cron schedule:
   - Default: Every 5 minutes
   - Set `QUEUE_CHECK_INTERVAL` in `.env` to change

---

### Manually Trigger Email Processor

You can manually test the email processor:

```javascript
// In Node.js console or create a test script
const { processScheduledEmails } = require('./services/emailQueue');
await processScheduledEmails();
```

---

**Base URL:** `http://localhost:5000` (local) or `https://3vltn.com` (production)

