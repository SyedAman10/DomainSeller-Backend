# 🤖 AI Email Agent - Quick Start

## What Was Built

I've created an **AI-powered email agent** that automatically responds to buyer inquiries to convince them to buy your domains!

---

## ✨ Features

### 1. **Automatic Email Responses**
- Buyer replies to your campaign email
- AI analyzes their message
- Generates persuasive response
- Automatically sends reply

### 2. **Smart Intent Detection**
Detects:
- 💚 Interest level
- 💰 Price objections  
- 🤝 Negotiation attempts
- ✅ Ready to buy signals
- ❌ Not interested flags

### 3. **Conversation Tracking**
- Full history stored in database
- View all conversations per campaign
- Track buyer engagement
- AI remembers context

### 4. **Persuasion Strategies**
- Addresses concerns directly
- Emphasizes domain value
- Creates urgency
- Handles objections
- Always includes call-to-action

---

## 🚀 Setup (3 Minutes)

### Step 1: Get OpenAI API Key

Go to https://platform.openai.com/api-keys and create a key.

### Step 2: Add to `.env`

```bash
OPENAI_API_KEY=sk-proj-your-key-here
AI_MODEL=gpt-4o-mini
```

### Step 3: Configure Mailgun

1. Go to Mailgun Dashboard → Your Domain → Receiving
2. Create Route:
   - Expression: `match_recipient(".*")`
   - Forward to: `https://yourdomain.com/api/inbound/mailgun`
   - Priority: 1

### Step 4: Restart Server

```bash
npm start
```

**Done!** ✅

---

## 📊 What Was Created

### New Files:
1. **`services/aiAgent.js`** - AI response generation & intent analysis
2. **`routes/inbound.js`** - Webhook endpoint for receiving emails
3. **`database/create_email_conversations_table.sql`** - Conversation storage
4. **`AI_EMAIL_AGENT_SETUP.md`** - Complete setup guide
5. **`AI_AGENT_QUICK_START.md`** - This file

### Updated Files:
1. **`server.js`** - Added inbound routes
2. **`ENV_TEMPLATE.txt`** - Added OpenAI config
3. **`API_REFERENCE.md`** - Added AI agent documentation

### New Database Table:
- `email_conversations` - Stores all buyer/seller messages

### New API Endpoints:
- `POST /api/inbound/mailgun` - Receive & process emails
- `GET /api/inbound/conversations/:campaignId` - View conversations
- `GET /api/inbound/conversations/buyer/:email` - View buyer history

---

## 💡 How It Works

```
Buyer Email
    ↓
Mailgun Catches It
    ↓
Forwards to Your Server
    ↓
AI Analyzes Intent
    ↓
Generates Response
    ↓
Sends Reply Automatically
    ↓
Tracks in Database
```

---

## 🧪 Test It

### 1. Send Test Email

Send an email to your configured reply address:

```
To: noreply@yourdomain.com
Subject: Re: Interested in example.com

Hi, I'm interested but the price seems high.
Can you negotiate?
```

### 2. Check Logs

You'll see:

```
════════════════════════════════════════════════════════════
📨 INBOUND EMAIL RECEIVED
════════════════════════════════════════════════════════════
📧 From: buyer@example.com
📬 To: noreply@yourdomain.com
📝 Subject: Re: Interested in example.com
💬 Message: Hi, I'm interested but the price...

🔍 Looking for related campaign...
✅ Found Campaign: Campaign for example.com

💾 Stored inbound message in database

🔍 Buyer Intent Analysis:
   Sentiment: positive
   Interested: true
   Price Objection: true

🤖 Generating AI response...
✅ AI Response Generated
📤 Sending AI-generated response...
✅ AI response sent successfully!
════════════════════════════════════════════════════════════
```

### 3. Buyer Receives Reply

The buyer automatically receives a convincing response!

---

## 💰 Cost

Using `gpt-4o-mini` (recommended):

- **~$0.001 per email response**
- **1,000 emails/month = ~$1**

Very affordable! 💸

---

## 📋 API Usage

### View Conversations for Campaign

```bash
curl http://localhost:5000/api/inbound/conversations/campaign_123
```

### View Buyer's Full History

```bash
curl http://localhost:5000/api/inbound/conversations/buyer/john@example.com
```

---

## 🎯 Examples

### Example 1: Price Objection

**Buyer:** "Too expensive for me"

**AI:** 
> Hi there! I understand budget is important. 
> 
> Consider this: example.com offers incredible branding value that will pay for itself through:
> - Better SEO rankings
> - Professional credibility  
> - Customer trust
>
> I can offer a payment plan to make this easier. Interested?

### Example 2: Questions

**Buyer:** "How long does transfer take?"

**AI:**
> Great question! Domain transfer typically takes 5-7 days.
>
> Here's the process:
> 1. Payment confirmation
> 2. Authorization code provided
> 3. Transfer initiated
> 4. Domain in your account!
>
> I'll guide you through every step. Ready to proceed?

### Example 3: Ready to Buy

**Buyer:** "I want to buy it. What's next?"

**AI:**
> Excellent! I'm excited to work with you!
>
> Next steps:
> 1. Send payment via [payment method]
> 2. I'll initiate the transfer within 24 hours
> 3. You'll receive authorization code
> 4. Transfer completes in 5-7 days
>
> Shall I send you the payment details?

---

## 🔍 Monitoring

Check the database:

```sql
-- View all conversations
SELECT * FROM email_conversations ORDER BY received_at DESC LIMIT 10;

-- Count AI responses
SELECT COUNT(*) FROM email_conversations WHERE ai_generated = true;

-- Most active buyers
SELECT buyer_email, COUNT(*) as messages 
FROM email_conversations 
GROUP BY buyer_email 
ORDER BY messages DESC;
```

---

## ⚙️ Configuration

### AI Model Options

```bash
# Fastest & Cheapest
AI_MODEL=gpt-3.5-turbo

# Best Balance (Recommended)
AI_MODEL=gpt-4o-mini

# Highest Quality  
AI_MODEL=gpt-4
```

### Adjust AI Personality

Edit `services/aiAgent.js` line 23-48 to change:
- Tone (professional/casual/friendly)
- Sales aggressiveness
- Response length
- Persuasion tactics

---

## 🐛 Troubleshooting

### No Responses Sent?

1. Check `OPENAI_API_KEY` is set
2. Verify Mailgun inbound routing
3. Check server logs for errors
4. Test webhook manually

### AI Responses Not Good?

1. Upgrade to `gpt-4`
2. Adjust temperature in code
3. Review campaign tone setting

### Mailgun Not Forwarding?

1. Check route is active
2. Verify webhook URL is accessible
3. Test with curl

---

## 📚 Full Documentation

- **Setup Guide:** [AI_EMAIL_AGENT_SETUP.md](./AI_EMAIL_AGENT_SETUP.md)
- **API Reference:** [API_REFERENCE.md](./API_REFERENCE.md#-ai-email-agent)
- **Email Debugging:** [EMAIL_DEBUGGING_GUIDE.md](./EMAIL_DEBUGGING_GUIDE.md)

---

## ✅ System is Ready!

The AI Email Agent is now part of your domain selling system. Every time a buyer replies, they'll get an intelligent, persuasive response automatically!

**Start converting more buyers with AI! 🚀**

