# Quick Setup Guide

Follow these steps to get your Campaign Backend up and running.

## Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages:
- express
- pg (PostgreSQL)
- node-cron
- axios
- dotenv
- cors
- body-parser

---

## Step 2: Configure Environment

Create a `.env` file:

```bash
# On Windows (PowerShell)
Copy-Item ENV_TEMPLATE.txt .env

# On Mac/Linux
cp ENV_TEMPLATE.txt .env
```

Then edit `.env` with your credentials:

```env
PORT=5000
NODE_ENV=development

# Get from Neon Console
NEON_DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# Get from Mailgun Dashboard
MAILGUN_API_KEY=your-api-key-here
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_FROM_EMAIL=noreply@mg.yourdomain.com

# Your Next.js frontend
FRONTEND_URL=http://localhost:3000

# Optional: Email settings
EMAIL_BATCH_LIMIT=10
QUEUE_CHECK_INTERVAL=*/5 * * * *
```

### Where to Find Your Credentials:

**Neon Database URL:**
1. Go to https://console.neon.tech
2. Select your project
3. Click "Connection Details"
4. Copy the connection string

**Mailgun API Key:**
1. Go to https://app.mailgun.com
2. Settings → API Keys
3. Copy your Private API key

**Mailgun Domain:**
1. Mailgun Dashboard → Sending → Domains
2. Use your verified domain (e.g., `mg.yourdomain.com`)

---

## Step 3: Verify Database Tables

Make sure your Neon database has these tables:

- ✅ `campaigns`
- ✅ `sent_emails`
- ✅ `scheduled_emails`
- ✅ `campaign_buyers`
- ✅ `email_responses` (optional - will be auto-created)

The backend will connect to your existing tables.

---

## Step 4: Start the Server

**Development mode (recommended):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

You should see:
```
==================================================
🚀 Campaign Backend Server Running
📡 Port: 5000
🌍 Environment: development
🔗 Health Check: http://localhost:5000/api/health
📧 Mailgun Domain: mg.yourdomain.com
==================================================
```

---

## Step 5: Test the Server

Open your browser or use curl:

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Campaign Backend is running",
  "timestamp": "2025-10-29T...",
  "environment": "development"
}
```

---

## Step 6: Test Email Sending

Send a test email to yourself:

```bash
curl -X POST http://localhost:5000/api/campaigns/send-batch \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": 1,
    "emails": [
      {
        "to": "your-email@example.com",
        "subject": "Test Email from Campaign Backend",
        "html": "<h1>It works!</h1><p>Your backend is successfully sending emails via Mailgun.</p>"
      }
    ]
  }'
```

Check your email inbox!

---

## Step 7: Set Up Mailgun Webhooks

For tracking email opens, clicks, and bounces:

1. Go to Mailgun Dashboard → Sending → Webhooks
2. Add a new webhook
3. **URL:** `https://your-domain.com/api/webhooks/mailgun`
   - For local testing, use ngrok: `https://xxx.ngrok.io/api/webhooks/mailgun`
4. **Events:** Select all (delivered, opened, clicked, bounced, failed)
5. Save

**Using ngrok for local testing:**
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 5000

# Use the generated URL in Mailgun
```

---

## Common Issues

### ❌ Database Connection Failed

**Solution:**
- Verify `NEON_DATABASE_URL` is correct
- Check database is active in Neon Console
- Ensure `?sslmode=require` is at the end of the URL

### ❌ Mailgun Error 401 Unauthorized

**Solution:**
- Double-check `MAILGUN_API_KEY` is correct
- Ensure you're using the **Private API Key**, not Public

### ❌ Port 5000 Already in Use

**Solution:**
- Change `PORT=5001` in `.env`
- Or stop the process using port 5000

### ❌ Emails Not Sending

**Solution:**
- Verify domain is verified in Mailgun
- Check Mailgun logs in dashboard
- For sandbox domains, add recipient email to authorized recipients

---

## Next Steps

✅ Backend is running on **localhost:5000**  
✅ Connect your Next.js frontend on **localhost:3000**  
✅ Start sending campaigns!

See `API_EXAMPLES.md` for more API usage examples.

---

## Development Tips

1. **Watch server logs** - All requests and emails are logged
2. **Check Mailgun dashboard** - Monitor delivery status
3. **Use Postman/Thunder Client** - Better for testing complex APIs
4. **Test with real emails first** - Mailgun sandbox limits recipients
5. **Monitor database** - Use Neon SQL Editor to check tables

---

## File Structure

```
DomainSeller-Backend/
├── config/
│   └── database.js          ← PostgreSQL connection
├── routes/
│   ├── campaigns.js         ← Campaign APIs
│   └── webhooks.js          ← Mailgun webhooks
├── services/
│   ├── emailService.js      ← Mailgun integration
│   └── emailQueue.js        ← Scheduled emails
├── server.js                ← Main server file
├── package.json
├── .env                     ← Your credentials (create this)
├── ENV_TEMPLATE.txt         ← Template
├── README.md                ← Full documentation
├── SETUP.md                 ← This file
└── API_EXAMPLES.md          ← API testing examples
```

---

Need help? Check the full **README.md** for detailed documentation.

