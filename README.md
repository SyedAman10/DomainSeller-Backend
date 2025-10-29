# DomainSeller Campaign Backend

Backend API server for managing email campaigns with Mailgun integration and PostgreSQL (Neon) database.

## 🚀 Features

- ✅ **Campaign Management** - Send batch emails and track campaigns
- ✅ **Mailgun Integration** - Professional email delivery service
- ✅ **Email Queue System** - Automated scheduled email processing
- ✅ **Webhook Handler** - Track email events (opens, clicks, bounces)
- ✅ **PostgreSQL (Neon)** - Serverless PostgreSQL database
- ✅ **Rate Limiting** - Configurable batch email limits
- ✅ **CORS Enabled** - Ready for frontend integration

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **Neon Database** account with existing tables
- **Mailgun** account with API key and verified domain
- **Frontend** (Next.js on localhost:3000)

## 🛠️ Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp ENV_TEMPLATE.txt .env
```

Edit `.env` with your actual credentials:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Neon Database Connection
NEON_DATABASE_URL=postgresql://username:password@your-neon-hostname.neon.tech/database_name?sslmode=require

# Mailgun Configuration
MAILGUN_API_KEY=your_mailgun_api_key_here
MAILGUN_DOMAIN=your_mailgun_domain.com
MAILGUN_FROM_EMAIL=noreply@your_mailgun_domain.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Email Queue Settings
EMAIL_BATCH_LIMIT=10
QUEUE_CHECK_INTERVAL=*/5 * * * *
```

**Get Your Credentials:**
- **Neon**: [console.neon.tech](https://console.neon.tech) → Your Project → Connection Details
- **Mailgun**: [mailgun.com](https://mailgun.com) → Settings → API Keys

### 3. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will start on **http://localhost:5000**

## 📡 API Endpoints

### Health Check
```bash
GET /api/health
```
Returns server status and environment info.

---

### Campaign Management

#### 1️⃣ Send Batch Emails
```bash
POST /api/campaigns/send-batch
```

**Request Body:**
```json
{
  "campaignId": 123,
  "emails": [
    {
      "to": "buyer1@example.com",
      "subject": "Premium Domain Available",
      "html": "<h1>Hello!</h1><p>Interested in example.com?</p>",
      "text": "Hello! Interested in example.com?",
      "tags": ["campaign-123", "batch-1"]
    },
    {
      "to": "buyer2@example.com",
      "subject": "Premium Domain Available",
      "html": "<h1>Hello!</h1><p>Interested in example.com?</p>"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch emails processed",
  "results": {
    "total": 2,
    "sent": 2,
    "failed": 0,
    "batchLimit": 10,
    "errors": []
  }
}
```

**Notes:**
- Maximum 10 emails per batch (configurable via `EMAIL_BATCH_LIMIT`)
- Automatically stores sent emails in `sent_emails` table
- Updates campaign status to 'active'

---

#### 2️⃣ Get Campaign Statistics
```bash
GET /api/campaigns/:campaignId/stats
```

**Example:**
```bash
curl http://localhost:5000/api/campaigns/123/stats
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "campaign_id": 123,
    "campaign_name": "Premium Domains Q1",
    "domain_name": "example.com",
    "status": "active"
  },
  "stats": {
    "sent": 150,
    "scheduled": 25,
    "delivered": 145,
    "opened": 87,
    "clicked": 23,
    "bounced": 5,
    "openRate": "60.00%",
    "clickRate": "26.44%"
  }
}
```

---

#### 3️⃣ Schedule Follow-up Email
```bash
POST /api/campaigns/schedule-followup
```

**Request Body:**
```json
{
  "campaignId": 123,
  "buyerEmail": "buyer@example.com",
  "subject": "Following up on example.com",
  "body": "<p>Just checking if you're still interested...</p>",
  "scheduledFor": "2025-11-01T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Follow-up email scheduled successfully",
  "data": {
    "id": 456,
    "campaign_id": 123,
    "buyer_email": "buyer@example.com",
    "scheduled_for": "2025-11-01T10:00:00Z",
    "status": "pending"
  }
}
```

---

#### 4️⃣ Get Campaign Details
```bash
GET /api/campaigns/:campaignId
```

Returns campaign info and associated buyers.

---

### Webhooks

#### Mailgun Webhook Handler
```bash
POST /api/webhooks/mailgun
```

Automatically handles Mailgun events:
- ✉️ **delivered** - Email successfully delivered
- 👁️ **opened** - Recipient opened email
- 🖱️ **clicked** - Recipient clicked link
- ⚠️ **bounced** - Email bounced
- ❌ **failed** - Delivery failed

**Setup in Mailgun:**
1. Go to Mailgun Dashboard → Sending → Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/mailgun`
3. Select events: delivered, opened, clicked, bounced, failed

Events are automatically stored in `email_responses` table.

---

## ⚙️ Email Queue System

The backend automatically processes scheduled emails every 5 minutes (configurable).

**How it works:**
1. Scheduled emails are stored in `scheduled_emails` table
2. Every 5 minutes, the queue processor checks for emails where `scheduled_for <= NOW()`
3. Emails are sent via Mailgun
4. Status is updated to 'sent' and moved to `sent_emails` table

**Configure interval in `.env`:**
```env
QUEUE_CHECK_INTERVAL=*/5 * * * *
```

Cron format examples:
- `*/5 * * * *` - Every 5 minutes
- `*/10 * * * *` - Every 10 minutes
- `0 * * * *` - Every hour
- `0 9 * * *` - Every day at 9am

---

## 📁 Project Structure

```
DomainSeller-Backend/
├── config/
│   └── database.js           # PostgreSQL connection pool
├── routes/
│   ├── campaigns.js          # Campaign management endpoints
│   └── webhooks.js           # Mailgun webhook handler
├── services/
│   ├── emailService.js       # Mailgun API integration
│   └── emailQueue.js         # Scheduled email processor
├── server.js                 # Express server setup
├── package.json              # Dependencies
├── .gitignore               # Git ignore rules
├── ENV_TEMPLATE.txt         # Environment template
└── README.md                # This file
```

---

## 🗄️ Database Tables

Your Neon database should have these tables:

### `campaigns`
Campaign information and settings.

### `sent_emails`
Tracks all sent emails with Mailgun message IDs.

### `scheduled_emails`
Emails waiting to be sent at a specific time.

### `campaign_buyers`
Buyers associated with each campaign.

### `email_responses`
Email events from Mailgun webhooks (opens, clicks, etc).

---

## 🔧 Testing

### Test Health Endpoint
```bash
curl http://localhost:5000/api/health
```

### Test Database Connection
The server automatically tests the database connection on startup.

### Test Mailgun Integration
```bash
curl -X POST http://localhost:5000/api/campaigns/send-batch \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": 1,
    "emails": [{
      "to": "your-email@example.com",
      "subject": "Test Email",
      "html": "<p>Testing Mailgun integration</p>"
    }]
  }'
```

---

## 🚨 Troubleshooting

### Database Connection Fails
1. Check `NEON_DATABASE_URL` is correct
2. Ensure database is active in Neon Console
3. Verify SSL mode is set to `require`

### Emails Not Sending
1. Verify `MAILGUN_API_KEY` is correct
2. Check `MAILGUN_DOMAIN` is verified in Mailgun
3. Review Mailgun logs in dashboard
4. Check server logs for errors

### Webhooks Not Working
1. Ensure webhook URL is publicly accessible (use ngrok for local testing)
2. Verify webhook URL in Mailgun dashboard
3. Check webhook signature verification

### Port Already in Use
Change the `PORT` in `.env`:
```env
PORT=5001
```

---

## 🔐 Security Notes

⚠️ **Important for Production:**

1. **Environment Variables** - Never commit `.env` to version control
2. **HTTPS** - Use HTTPS for webhook endpoints
3. **Webhook Verification** - Signature verification is implemented
4. **Rate Limiting** - Consider adding rate limiting middleware
5. **Input Validation** - Add validation for all user inputs
6. **Error Handling** - Sensitive errors are not exposed to clients

---

## 📦 Dependencies

- **express** - Web framework
- **pg** - PostgreSQL client
- **node-cron** - Scheduled task runner
- **axios** - HTTP client for Mailgun API
- **dotenv** - Environment variable management
- **cors** - Cross-Origin Resource Sharing
- **body-parser** - Request body parsing
- **crypto** - Webhook signature verification

---

## 🎯 Next Steps

1. **Install dependencies**: `npm install`
2. **Configure `.env`** with your credentials
3. **Start server**: `npm run dev`
4. **Test health endpoint**: Visit http://localhost:5000/api/health
5. **Set up Mailgun webhooks** in dashboard
6. **Integrate with frontend** (Next.js on localhost:3000)

---

## 📞 Support

**Mailgun Documentation**: [documentation.mailgun.com](https://documentation.mailgun.com)  
**Neon Documentation**: [neon.tech/docs](https://neon.tech/docs)  
**Express Documentation**: [expressjs.com](https://expressjs.com)

---

Made with ❤️ for DomainSeller Campaign Management
