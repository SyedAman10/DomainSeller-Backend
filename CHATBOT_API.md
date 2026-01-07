# 3VLTN Chatbot API Documentation

## Overview

The 3VLTN Chatbot API implements an intelligent conversational lead qualification system using the **"Answer, Simplify, Engage"** framework. Every response follows a structured format designed to gather qualification data while providing value to the user.

## Base URL
```
Production: https://api.3vltn.com/backend/chatbot
Development: http://localhost:5000/backend/chatbot
```

## Architecture

### Core Components

1. **Chatbot Service** (`services/chatbotService.js`)
   - Intent matching engine
   - OpenAI integration for dynamic responses
   - Lead scoring algorithm
   - Response generation with mandatory questioning

2. **Chatbot Routes** (`routes/chatbot.js`)
   - Session management
   - Message handling
   - Lead scoring endpoints
   - Analytics and reporting

3. **Database** (`database/create_chatbot_tables.sql`)
   - Session storage
   - Conversation history
   - Lead scoring data
   - Analytics views

---

## API Endpoints

### 1. Send Message to Chatbot

Send a user message and receive an AI-generated response following the Answer-Simplify-Engage framework.

**Endpoint:** `POST /backend/chatbot/message`

**Request Body:**
```json
{
  "message": "What do you do?",
  "sessionId": "session_123456789" (optional, auto-generated if not provided),
  "userEmail": "user@example.com" (optional),
  "userName": "John Doe" (optional)
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_123456789",
  "response": {
    "answer": "We automate the entire domain sales process so investors can scale from a side hustle to a system. It's like a full-time sales agent for your portfolio.",
    "simplify": "",
    "engage": "How many domains are you working with right now?"
  },
  "intent": "value_proposition",
  "messageCount": 2
}
```

**Response Structure:**
- `answer`: 1-2 sentences addressing the query directly
- `simplify`: Key proof point or social proof (may be empty)
- `engage`: **MANDATORY** qualifying question

**Status Codes:**
- `200`: Success
- `400`: Invalid request (missing message)
- `500`: Server error

---

### 2. Score Lead from Conversation

Analyze the conversation history and generate a lead score with classification.

**Endpoint:** `POST /backend/chatbot/score`

**Request Body:**
```json
{
  "sessionId": "session_123456789"
}
```

**Response:**
```json
{
  "success": true, 
  "sessionId": "session_123456789",
  "leadScore": {
    "score": 5,
    "classification": "hot",
    "followUpAction": "immediate_personal_contact",
    "qualificationData": {
      "portfolioSize": 25,
      "activity": "high",
      "painPoints": ["renewals", "finding buyers", "pricing"],
      "domainValue": "high"
    },
    "timestamp": "2026-01-05T10:30:00.000Z"
  },
  "finalMessage": {
    "answer": "That's a perfect fit for our platform. I'm flagging your interest for a personal walkthrough.",
    "simplify": "Our team will reach out shortly to show you how we can help.",
    "engage": "In the meantime, you can start your free health check here: https://3vltn.com/signup"
  },
  "recommendedAction": "immediate_personal_contact"
}
```

**Lead Scoring Rules:**

#### Portfolio Size
- `10+ domains` → **+2 points**
- `3-9 domains` → **+1 point**
- `1-2 domains` → **+0 points**

#### Activity Level
- `"actively selling", "need to sell", "quickly"` → **+2 points**
- `"looking to start", "holding", "investment"` → **+1 point**
- `"just researching", "curious"` → **+0 points**

#### Pain Points
- **High pain** (`"pricing", "valuation", "renewals", "wasting money", "spam", "finding buyers"`) → **+2 points**
- **Medium pain** (`"automation", "easier", "organized", "tools"`) → **+1 point**
- No keywords → **+0 points**

#### Domain Value
- `$5000+ or "premium", "high value"` → **+2 points**
- `<$5000 or "mid-range"` → **+1 point**
- Not discussed → **+0 points**

**Lead Classifications:**
- **HOT (4+ points)**: Immediate personal contact required
- **WARM (2-3 points)**: Email nurture campaign
- **COLD (0-1 points)**: General nurture list

**Status Codes:**
- `200`: Success
- `400`: Invalid request (missing sessionId or insufficient data)
- `404`: Session not found
- `500`: Server error

---

### 3. Get Session Details

Retrieve full session information including conversation history and lead score.

**Endpoint:** `GET /backend/chatbot/session/:sessionId`

**Response:**
```json
{
  "success": true,
  "session": {
    "sessionId": "session_123456789",
    "userEmail": "user@example.com",
    "userName": "John Doe",
    "conversationHistory": [
      {
        "role": "user",
        "content": "What do you do?",
        "timestamp": "2026-01-05T10:25:00.000Z"
      },
      {
        "role": "assistant",
        "content": {
          "answer": "We automate the entire domain sales process...",
          "simplify": "",
          "engage": "How many domains are you working with right now?"
        },
        "intent": "value_proposition",
        "timestamp": "2026-01-05T10:25:02.000Z"
      }
    ],
    "messageCount": 6,
    "leadScore": 5,
    "leadClassification": "hot",
    "qualificationData": {
      "portfolioSize": 25,
      "activity": "high",
      "painPoints": ["renewals", "pricing"]
    },
    "createdAt": "2026-01-05T10:25:00.000Z",
    "updatedAt": "2026-01-05T10:30:00.000Z",
    "scoredAt": "2026-01-05T10:30:00.000Z"
  }
}
```

**Status Codes:**
- `200`: Success
- `404`: Session not found
- `500`: Server error

---

### 4. Get All Scored Leads

Retrieve scored leads with optional filtering.

**Endpoint:** `GET /backend/chatbot/leads`

**Query Parameters:**
- `classification` (optional): Filter by `hot`, `warm`, or `cold`
- `minScore` (optional): Minimum lead score (integer)
- `limit` (optional): Number of results (default: 50, max: 100)

**Example:**
```
GET /backend/chatbot/leads?classification=hot&minScore=4&limit=20
```

**Response:**
```json
{
  "success": true,
  "count": 15,
  "leads": [
    {
      "sessionId": "session_123456789",
      "userEmail": "user@example.com",
      "userName": "John Doe",
      "leadScore": 6,
      "leadClassification": "hot",
      "qualificationData": {
        "portfolioSize": 50,
        "activity": "high",
        "painPoints": ["renewals", "finding buyers", "pricing"],
        "domainValue": 10000
      },
      "messageCount": 8,
      "createdAt": "2026-01-05T10:25:00.000Z",
      "updatedAt": "2026-01-05T10:35:00.000Z",
      "scoredAt": "2026-01-05T10:35:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `500`: Server error

---

### 5. Delete Session

Delete a chatbot session (for testing/cleanup).

**Endpoint:** `DELETE /backend/chatbot/session/:sessionId`

**Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully",
  "sessionId": "session_123456789"
}
```

**Status Codes:**
- `200`: Success
- `404`: Session not found
- `500`: Server error

---

## Intent System

The chatbot recognizes the following pre-defined intents:

### 1. **value_proposition**
**Triggers:** "what do you do", "tell me about", "what is 3vltn"

**Response:**
```json
{
  "answer": "We automate the entire domain sales process so investors can scale from a side hustle to a system. It's like a full-time sales agent for your portfolio.",
  "simplify": "",
  "engage": "How many domains are you working with right now?"
}
```

### 2. **target_customer**
**Triggers:** "who is this for", "target audience", "right for me"

**Response:**
```json
{
  "answer": "We're built for investors who want to systemize sales, not for one-off auctions.",
  "simplify": "This focus lets us build powerful tools for scaling a portfolio.",
  "engage": "What does your portfolio look like right now—mostly holding for investment, or actively trying to sell?"
}
```

### 3. **spam_objection**
**Triggers:** "spam", "avoid spam", "unsolicited"

**Response:**
```json
{
  "answer": "We hate spam too. Our AI researches each lead and writes a short, relevant message. You approve every email before sending.",
  "simplify": "The goal is to start a genuine conversation.",
  "engage": "What's been your biggest frustration with how domain buyers get approached?"
}
```

### 4. **core_pain_point**
**Triggers:** "biggest mistake", "fix", "problem", "challenge"

**Response:**
```json
{
  "answer": "Treating a portfolio like a storage locker—paying renewals on boxes you never open.",
  "simplify": "Our system instantly identifies which domains have real potential. Most users cut renewal waste by 30-40%.",
  "engage": "Do you ever feel uncertain about which domains in your portfolio are truly worth renewing?"
}
```

### 5. **first_step**
**Triggers:** "first step", "get started", "sign up", "how to start"

**Response:**
```json
{
  "answer": "You'll get an instant portfolio health check. Import your names, and in 60 seconds, our AI will show your highest-potential domains.",
  "simplify": "",
  "engage": "What's the first domain you'd like to run through the scanner?"
}
```

### 6. **just_browsing**
**Triggers:** "just looking", "not sure", "browsing", "exploring"

**Response:**
```json
{
  "answer": "No problem—most of our best customers started by exploring.",
  "simplify": "",
  "engage": "What brought you to 3VLTN today? Curious about automation, or dealing with a specific domain challenge?"
}
```

### 7. **pricing_objection**
**Triggers:** "how much", "cost", "price", "pricing", "expensive"

**Response:**
```json
{
  "answer": "Pricing scales with your portfolio size, but most users find it pays for itself with 1-2 sales.",
  "simplify": "The real question is about ROI.",
  "engage": "What's the typical value of the domains you're looking to sell? That helps us show you the potential."
}
```

### 8. **greeting**
**Triggers:** "hi", "hello", "hey"

**Response:**
```json
{
  "answer": "Hi! I'm the 3VLTN assistant.",
  "simplify": "I'm here to help you understand how we can automate your domain sales.",
  "engage": "Are you looking to automate your domain sales today?"
}
```

---

## Database Schema

### chatbot_sessions Table

```sql
CREATE TABLE chatbot_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    conversation_history JSONB DEFAULT '[]'::jsonb,
    message_count INTEGER DEFAULT 0,
    lead_score INTEGER,
    lead_classification VARCHAR(50),
    qualification_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    scored_at TIMESTAMP
);
```

### Views

**hot_leads**: Quick access to high-priority leads (score 4+)
**lead_statistics**: Summary statistics by classification

---

## Integration Example

### Frontend Chat Widget Integration

```javascript
// Initialize chat session
let sessionId = localStorage.getItem('chatSessionId');

async function sendMessage(userMessage) {
  const response = await fetch('https://api.3vltn.com/backend/chatbot/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: userMessage,
      sessionId: sessionId,
      userEmail: currentUser?.email,
      userName: currentUser?.name
    })
  });

  const data = await response.json();
  
  // Save session ID for future messages
  if (data.sessionId) {
    sessionId = data.sessionId;
    localStorage.setItem('chatSessionId', sessionId);
  }

  // Display bot response
  displayBotMessage(data.response);

  // After 5+ messages, score the lead
  if (data.messageCount >= 5) {
    scoreCurrentLead();
  }
}

async function scoreCurrentLead() {
  const response = await fetch('https://api.3vltn.com/backend/chatbot/score', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: sessionId
    })
  });

  const data = await response.json();
  
  if (data.leadScore.classification === 'hot') {
    // Show final message with signup link
    displayBotMessage(data.finalMessage);
    
    // Trigger sales notification
    notifySalesTeam(data);
  }
}
```

### Backend Webhook Integration (for hot leads)

```javascript
// In your chatbot service, after scoring
if (leadScore.classification === 'hot') {
  // Send to Slack
  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    text: `🔥 HOT LEAD: ${userEmail || 'Anonymous'}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New Hot Lead*\nScore: ${leadScore.score}\nPortfolio: ${qualificationData.portfolioSize} domains\nPain Points: ${qualificationData.painPoints.join(', ')}`
        }
      }
    ]
  });

  // Add to CRM
  await addToCRM({
    email: userEmail,
    name: userName,
    source: '3vltn_chatbot',
    score: leadScore.score,
    tags: ['hot_lead', 'chatbot_qualified']
  });
}
```

---

## Environment Variables

Add these to your `.env` file:

```bash
# OpenAI Configuration (required)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
AI_MODEL=gpt-4o-mini

# Chatbot Configuration (optional)
CONTACT_NAME=Sarah from 3VLTN
SIGNUP_LINK=https://3vltn.com/signup

# Webhook URLs (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxxxx
```

---

## Database Migration

Run the database migration to create the necessary tables:

```bash
# Using psql
psql $NEON_DATABASE_URL -f database/create_chatbot_tables.sql

# Or add to your migrate.js script
node migrate.js
```

---

## Testing

### Test Message Flow

```bash
# 1. Send first message
curl -X POST http://localhost:5000/backend/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What do you do?",
    "userEmail": "test@example.com",
    "userName": "Test User"
  }'

# Save the sessionId from response

# 2. Continue conversation
curl -X POST http://localhost:5000/backend/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I have about 50 domains and struggling with renewals",
    "sessionId": "session_xxxxx"
  }'

# 3. Score the lead
curl -X POST http://localhost:5000/backend/chatbot/score \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_xxxxx"
  }'

# 4. Get all hot leads
curl http://localhost:5000/backend/chatbot/leads?classification=hot
```

---

## Best Practices

1. **Session Management**
   - Store `sessionId` in localStorage or cookies
   - Sessions persist across page refreshes
   - Sessions contain full conversation history

2. **Lead Scoring Timing**
   - Score after 3-5 message exchanges
   - Don't score too early (insufficient data)
   - Score before ending conversation

3. **Hot Lead Handling**
   - Alert sales team immediately (Slack, email, CRM)
   - Display final message with clear CTA
   - Provide direct signup/contact links

4. **Privacy & GDPR**
   - Only collect email if user provides it
   - Implement data deletion on request
   - Clear session data after conversion

5. **Rate Limiting**
   - Implement per-session rate limits
   - Monitor for abuse patterns
   - Cache AI responses for common questions

---

## Performance Optimization

1. **Caching**: Cache responses for frequently matched intents
2. **Batch Processing**: Process multiple messages in queue
3. **Database Indexing**: Already configured for optimal queries
4. **AI Model Selection**: Use `gpt-4o-mini` for cost/speed balance

---

## Monitoring & Analytics

### Key Metrics to Track

- **Conversion Rate**: Hot leads → Signups
- **Average Score**: By session, by day, by source
- **Intent Distribution**: Most common user intents
- **Message Count**: Average messages per classification
- **Response Time**: AI generation latency

### Database Queries

```sql
-- Hot leads in last 24 hours
SELECT * FROM hot_leads WHERE created_at > NOW() - INTERVAL '24 hours';

-- Lead statistics
SELECT * FROM lead_statistics;

-- Conversion funnel
SELECT 
  lead_classification,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE user_email IS NOT NULL) as with_email,
  AVG(message_count) as avg_messages
FROM chatbot_sessions
WHERE lead_score IS NOT NULL
GROUP BY lead_classification;
```

---

## Troubleshooting

### Common Issues

1. **AI not responding**
   - Check `OPENAI_API_KEY` is set correctly
   - Verify API quota/credits
   - Check network connectivity

2. **Low lead scores**
   - Review conversation history
   - Adjust scoring thresholds
   - Improve qualifying questions

3. **Intent not matching**
   - Add more trigger keywords
   - Use AI fallback for edge cases
   - Log unmatched queries for analysis

---

## Support & Contact

For questions or issues:
- GitHub Issues: [Your repo]
- Email: dev@3vltn.com
- Documentation: https://docs.3vltn.com/chatbot

---

**Last Updated:** January 5, 2026
**Version:** 1.0.0

