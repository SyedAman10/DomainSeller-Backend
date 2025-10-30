# 🤖 AI Email Agent Setup Guide

Complete guide to setting up the AI-powered email response system that automatically replies to buyer inquiries.

---

## 🎯 What Does the AI Email Agent Do?

The AI Email Agent:
1. **📨 Receives** buyer replies via Mailgun webhooks
2. **🧠 Analyzes** the buyer's message and intent
3. **🤖 Generates** persuasive responses using OpenAI GPT
4. **📧 Sends** automatic replies to convince buyers
5. **💾 Tracks** full conversation history

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-...`)

### Step 2: Add to Environment Variables

Add to your `.env` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
AI_MODEL=gpt-4o-mini  # or gpt-3.5-turbo (cheaper) or gpt-4 (better quality)
```

### Step 3: Install Dependencies

```bash
npm install
# axios is already installed, no new dependencies needed!
```

### Step 4: Configure Mailgun Inbound Routing

1. Go to [Mailgun Dashboard](https://app.mailgun.com/app/sending/domains)
2. Click on your domain
3. Go to "Receiving" tab
4. Click "Create Route"
5. Configure:
   - **Expression:** `match_recipient(".*")`  (catch all)
   - **Actions:** 
     - ✅ Forward → `https://yourdomain.com/api/inbound/mailgun`
     - ✅ Store → Optional (for debugging)
   - **Priority:** 1
   - **Description:** AI Email Agent Webhook

### Step 5: Test the System

Send a test email to your configured reply address and check the logs!

---

## 📋 Detailed Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxx

# Optional (with defaults)
AI_MODEL=gpt-4o-mini                    # AI model to use
FRONTEND_URL=http://localhost:3000     # For CORS
```

### AI Model Options

| Model | Cost | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| `gpt-3.5-turbo` | $ | ⚡⚡⚡ | ⭐⭐⭐ | High volume, cost-effective |
| `gpt-4o-mini` | $$ | ⚡⚡ | ⭐⭐⭐⭐ | **Recommended** - Best balance |
| `gpt-4` | $$$$ | ⚡ | ⭐⭐⭐⭐⭐ | Premium quality responses |

**Recommendation:** Start with `gpt-4o-mini` for the best cost/quality balance.

---

## 🔧 How It Works

### 1. Buyer Sends Reply

```
From: buyer@example.com
To: your-reply-address@yourdomain.com
Subject: Re: Interested in example.com

Hi, I'm interested in buying example.com 
but the price seems a bit high. Can you 
offer a discount?
```

### 2. Mailgun Receives Email

Mailgun catches the inbound email and forwards it to your webhook:

```
POST https://yourdomain.com/api/inbound/mailgun
```

### 3. AI Analyzes Intent

```javascript
{
  isInterested: true,
  isPriceObjection: true,
  isNegotiating: true,
  sentiment: "positive"
}
```

### 4. AI Generates Response

The AI agent:
- Reviews conversation history
- Understands buyer's concerns
- Generates persuasive response
- Addresses objections
- Creates urgency

### 5. Automatic Reply Sent

```
From: noreply@yourdomain.com
To: buyer@example.com
Subject: Re: Interested in example.com

Hi there,

Thank you for your interest in example.com! 
I completely understand your concern about pricing.

Let me explain why example.com is worth the 
investment:

1. Premium .com extension - These are becoming 
   increasingly rare and valuable
2. SEO Benefits - The domain has excellent 
   search potential
3. Brand Recognition - Short, memorable domains 
   command higher prices

I have several other interested parties, but 
I'd love to work with you. Would you be open 
to a payment plan to make this easier?

Looking forward to your thoughts!

Best regards
```

---

## 📊 API Endpoints

### Webhook Endpoint (Mailgun)

**POST** `/api/inbound/mailgun`

Receives inbound emails from Mailgun and processes them.

**Mailgun sends:**
```json
{
  "sender": "buyer@example.com",
  "recipient": "noreply@yourdomain.com",
  "subject": "Re: Interested in domain",
  "body-plain": "Message text...",
  "stripped-text": "Clean message without quotes"
}
```

**Response:**
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

---

### Get Conversation History

**GET** `/api/inbound/conversations/:campaignId`

Get all conversations for a campaign.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "conversations": [
    {
      "id": 1,
      "campaign_id": "campaign_123",
      "buyer_email": "buyer@example.com",
      "buyer_name": "John",
      "direction": "inbound",
      "subject": "Re: Interested",
      "message_content": "I'm interested...",
      "received_at": "2025-10-30T14:00:00Z",
      "ai_generated": false
    },
    {
      "id": 2,
      "direction": "outbound",
      "message_content": "Thank you for your interest...",
      "ai_generated": true
    }
  ]
}
```

---

### Get Buyer Conversations

**GET** `/api/inbound/conversations/buyer/:buyerEmail`

Get all conversations with a specific buyer.

**Example:**
```bash
curl http://localhost:5000/api/inbound/conversations/buyer/john@example.com
```

---

## 🧠 AI Agent Features

### 1. Smart Intent Detection

The agent automatically detects:
- ✅ Interest level
- 💰 Price objections
- 🤝 Negotiation attempts
- 🛒 Ready to buy signals
- ❌ Not interested flags
- ❓ Questions

### 2. Conversation Context

The AI remembers:
- Previous messages in the thread
- Domain being discussed
- Campaign tone (professional/friendly/etc.)
- Buyer's name and history

### 3. Persuasion Strategies

The AI uses proven sales techniques:
- **Value emphasis** - Highlights domain benefits
- **Social proof** - Mentions other interested parties
- **Urgency creation** - Limited availability
- **Objection handling** - Addresses concerns directly
- **Call to action** - Always ends with next steps

### 4. Smart Filtering

Won't reply if buyer:
- Explicitly says "not interested"
- Requests to unsubscribe
- Uses negative language

---

## 💾 Database Schema

### email_conversations Table

```sql
CREATE TABLE email_conversations (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_name VARCHAR(255),
  direction VARCHAR(20) NOT NULL,  -- 'inbound' or 'outbound'
  subject TEXT,
  message_content TEXT NOT NULL,
  received_at TIMESTAMP DEFAULT NOW(),
  user_id INTEGER,
  domain_name VARCHAR(255),
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🐛 Troubleshooting

### Issue: No AI Responses Being Sent

**Check:**
1. Is `OPENAI_API_KEY` set in `.env`?
2. Is Mailgun inbound routing configured?
3. Check server logs for errors
4. Verify webhook URL is accessible

**Debug:**
```bash
# Check OpenAI key
node -e "require('dotenv').config(); console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? 'Set' : 'Not Set');"
```

---

### Issue: AI Generates Poor Responses

**Solutions:**
1. Upgrade to `gpt-4` for better quality
2. Check campaign `email_tone` setting
3. Review conversation history
4. Adjust temperature in `aiAgent.js` (currently 0.7)

---

### Issue: Mailgun Not Forwarding Emails

**Check:**
1. Is the route active in Mailgun?
2. Is the webhook URL correct and accessible?
3. Test with `curl`:
```bash
curl -X POST https://yourdomain.com/api/inbound/mailgun \
  -d "sender=test@example.com" \
  -d "subject=Test" \
  -d "body-plain=Test message"
```

---

### Issue: OpenAI API Errors

**Common errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid API key | Check OPENAI_API_KEY |
| 429 Rate Limit | Too many requests | Add delay or upgrade plan |
| 500 Server Error | OpenAI issue | Use fallback response |

The system has a fallback response if OpenAI fails!

---

## 💰 Cost Estimation

### OpenAI Pricing (as of 2024)

| Model | Input | Output | Est. Cost per Email |
|-------|-------|--------|-------------------|
| gpt-3.5-turbo | $0.50/1M tokens | $1.50/1M tokens | ~$0.002 |
| gpt-4o-mini | $0.15/1M tokens | $0.60/1M tokens | ~$0.001 |
| gpt-4 | $30/1M tokens | $60/1M tokens | ~$0.03 |

**Example:** 
- 1,000 emails/month with `gpt-4o-mini` = **~$1/month**
- Very affordable! 💰

---

## 🧪 Testing

### Test Script

Create `test-ai-agent.js`:

```javascript
require('dotenv').config();
const { generateAIResponse } = require('./services/aiAgent');

(async () => {
  const response = await generateAIResponse({
    buyerMessage: "I'm interested but the price is too high",
    domainName: "example.com",
    buyerName: "John",
    conversationHistory: [],
    campaignInfo: { emailTone: 'professional' }
  });

  console.log('AI Response:');
  console.log(response.reply);
})();
```

Run:
```bash
node test-ai-agent.js
```

---

## 📈 Analytics & Monitoring

### View Conversation Stats

```javascript
// Get total conversations
SELECT COUNT(*) FROM email_conversations;

// Get AI response rate
SELECT 
  COUNT(*) FILTER (WHERE ai_generated = true) as ai_responses,
  COUNT(*) as total,
  ROUND(COUNT(*) FILTER (WHERE ai_generated = true) * 100.0 / COUNT(*), 2) as ai_percentage
FROM email_conversations
WHERE direction = 'outbound';

// Get most active buyers
SELECT 
  buyer_email,
  COUNT(*) as message_count
FROM email_conversations
GROUP BY buyer_email
ORDER BY message_count DESC
LIMIT 10;
```

---

## 🔐 Security Best Practices

1. **Never expose API keys** - Keep in `.env`, never commit
2. **Validate webhooks** - Verify requests are from Mailgun
3. **Rate limiting** - Prevent abuse
4. **Monitor costs** - Set OpenAI billing alerts
5. **Review AI responses** - Periodically check quality

---

## 🎛️ Customization

### Adjust AI Personality

Edit `services/aiAgent.js`:

```javascript
const messages = [
  {
    role: 'system',
    content: `You are a friendly domain sales agent...
    
    PERSONALITY:
    - Casual and conversational  // ← Change this
    - Use emojis sparingly       // ← Add custom traits
    - Technical when needed      // ← Adjust style
    `
  }
];
```

### Change Response Temperature

```javascript
temperature: 0.7,  // 0.0 = Conservative, 1.0 = Creative
```

---

## ✅ Checklist

Before going live:

- [ ] OpenAI API key configured
- [ ] Mailgun inbound routing set up
- [ ] Webhook URL accessible
- [ ] Database table created
- [ ] Test email sent and replied
- [ ] Logs showing AI responses
- [ ] OpenAI billing alerts set
- [ ] Conversation tracking working

---

## 📞 Support

If you need help:
1. Check server logs for detailed errors
2. Test webhook manually with curl
3. Verify OpenAI API key is valid
4. Review Mailgun logs in dashboard

---

**Ready to convert more buyers with AI!** 🚀


