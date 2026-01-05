# 🤖 3VLTN Conversational Chatbot - Lead Qualification System

> Transform website visitors into qualified leads through intelligent conversation

## 🎯 What Is This?

An AI-powered chatbot that qualifies leads through natural conversation using the **"Answer, Simplify, Engage"** framework. Every response provides value while gathering qualification data to automatically score and classify leads as hot, warm, or cold.

## ⚡ Quick Start

```bash
# 1. Add OpenAI key to .env
echo "OPENAI_API_KEY=sk-proj-xxxxx" >> .env

# 2. Run database migration
psql $NEON_DATABASE_URL -f database/create_chatbot_tables.sql

# 3. Start server
npm start

# 4. Test it
node test-chatbot.js
```

## 📊 Key Features

### ✅ Intelligent Conversation
- Pre-configured intents for common questions
- AI-powered dynamic responses for edge cases
- Every response ends with a qualifying question

### ✅ Automatic Lead Scoring
- Scores based on 4 factors: portfolio size, activity, pain points, domain value
- Real-time classification: 🔥 Hot, 🌡️ Warm, ❄️ Cold
- Extracts structured qualification data

### ✅ Complete API
- Send messages and get responses
- Score conversations automatically
- Retrieve and filter leads
- Full session history

### ✅ Production Ready
- Session management with PostgreSQL
- Full conversation history storage
- Comprehensive test suite
- Detailed documentation

## 🎨 How It Works

```javascript
// 1. User sends message
POST /backend/chatbot/message
{
  "message": "What do you do?",
  "sessionId": "optional"
}

// 2. Bot responds with Answer-Simplify-Engage
{
  "response": {
    "answer": "We automate domain sales so investors can scale...",
    "simplify": "",
    "engage": "How many domains are you working with?"
  }
}

// 3. After 5 messages, score the lead
POST /backend/chatbot/score
{
  "sessionId": "session_123"
}

// 4. Get classification and next action
{
  "leadScore": {
    "score": 5,
    "classification": "hot",  // 🔥 Contact immediately!
    "qualificationData": {
      "portfolioSize": 50,
      "painPoints": ["renewals", "pricing"]
    }
  }
}
```

## 📈 Lead Scoring System

| Factor | High | Medium | Low |
|--------|------|--------|-----|
| **Portfolio** | 10+ domains (+2) | 3-9 domains (+1) | 1-2 domains (0) |
| **Activity** | Actively selling (+2) | Looking to start (+1) | Just browsing (0) |
| **Pain** | Critical pain (+2) | Some pain (+1) | No pain (0) |
| **Value** | $5k+ domains (+2) | < $5k (+1) | Unknown (0) |

**Classifications:**
- **🔥 HOT (4+ points)**: Immediate personal contact
- **🌡️ WARM (2-3 points)**: Email nurture
- **❄️ COLD (0-1 points)**: General nurture

## 📚 Documentation

| File | Description |
|------|-------------|
| **[CHATBOT_API.md](CHATBOT_API.md)** | Complete API reference with all endpoints |
| **[CHATBOT_SETUP.md](CHATBOT_SETUP.md)** | Step-by-step setup guide |
| **[CHATBOT_QUICKREF.md](CHATBOT_QUICKREF.md)** | Quick reference & cheatsheet |
| **[CHATBOT_ARCHITECTURE.md](CHATBOT_ARCHITECTURE.md)** | System architecture & flow diagrams |
| **[CHATBOT_IMPLEMENTATION_SUMMARY.md](CHATBOT_IMPLEMENTATION_SUMMARY.md)** | Complete implementation summary |

## 🔧 Configuration

Add to your `.env` file:

```bash
# Required
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
AI_MODEL=gpt-4o-mini

# Optional
CONTACT_NAME=Sarah from 3VLTN
SIGNUP_LINK=https://3vltn.com/signup
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxxxx
```

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/backend/chatbot/message` | POST | Send message, get response |
| `/backend/chatbot/score` | POST | Score conversation |
| `/backend/chatbot/session/:id` | GET | Get session details |
| `/backend/chatbot/leads` | GET | List all leads |
| `/backend/chatbot/session/:id` | DELETE | Delete session |

## 💻 Frontend Integration

### JavaScript Example

```javascript
let sessionId = localStorage.getItem('chatSessionId');

async function sendMessage(message) {
  const response = await fetch('/backend/chatbot/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId })
  });
  
  const data = await response.json();
  sessionId = data.sessionId;
  localStorage.setItem('chatSessionId', sessionId);
  
  // Display: data.response.answer, .simplify, .engage
  return data;
}
```

### React Example

```jsx
function Chatbot() {
  const [sessionId, setSessionId] = useState(
    localStorage.getItem('chatSessionId')
  );
  
  const sendMessage = async (text) => {
    const res = await fetch('/backend/chatbot/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId })
    });
    
    const data = await res.json();
    setSessionId(data.sessionId);
    return data.response;
  };
  
  return <ChatInterface onSend={sendMessage} />;
}
```

## 🧪 Testing

```bash
# Run full test suite
node test-chatbot.js

# Expected output:
# ✓ Hot Lead test passed (score: 6)
# ✓ Warm Lead test passed (score: 2)
# ✓ Cold Lead test passed (score: 0)
# ✓ All tests passed! 🎉
```

## 📊 Monitoring

### View Hot Leads

```sql
SELECT * FROM hot_leads 
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Lead Statistics

```sql
SELECT * FROM lead_statistics;
```

### API Query

```javascript
// Get hot leads
const response = await fetch('/backend/chatbot/leads?classification=hot');
const { leads } = await response.json();
```

## 🎯 Pre-configured Intents

1. **value_proposition** - "What do you do?"
2. **target_customer** - "Who is this for?"
3. **spam_objection** - Spam concerns
4. **core_pain_point** - Problems/challenges
5. **first_step** - Getting started
6. **just_browsing** - Casual exploration
7. **pricing_objection** - Cost concerns
8. **greeting** - Hi/Hello

## 🔔 Slack Notifications (Optional)

```bash
# Add webhook to .env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxxxx

# Modify chatbotService.js to send notifications
if (classification === 'hot') {
  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    text: `🔥 New Hot Lead: ${userEmail} (Score: ${score})`
  });
}
```

## 🗂️ Database Schema

```sql
CREATE TABLE chatbot_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    conversation_history JSONB,
    message_count INTEGER DEFAULT 0,
    lead_score INTEGER,
    lead_classification VARCHAR(50),
    qualification_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    scored_at TIMESTAMP
);

-- Views
CREATE VIEW hot_leads AS ...
CREATE VIEW lead_statistics AS ...
```

## 🚀 Production Checklist

- [ ] Add `OPENAI_API_KEY` to production `.env`
- [ ] Run database migration
- [ ] Configure `CONTACT_NAME` and `SIGNUP_LINK`
- [ ] Add production domain to CORS
- [ ] Set up Slack notifications (optional)
- [ ] Test end-to-end flow
- [ ] Monitor API costs
- [ ] Train team on hot lead handling

## 💰 Cost Estimate

**OpenAI API (GPT-4o-mini)**
- Input: ~$0.15 per 1M tokens
- Output: ~$0.60 per 1M tokens
- **Average conversation (10 messages): ~$0.003**
- **1000 conversations/month: ~$3**

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "OPENAI_API_KEY not configured" | Add to `.env` and restart |
| Table doesn't exist | Run migration SQL |
| Low scores | Check conversation has qualification data |
| CORS errors | Add domain to `server.js` |

## 📝 Files Created

```
services/chatbotService.js          Core logic
routes/chatbot.js                   API endpoints
database/create_chatbot_tables.sql  Database schema
test-chatbot.js                     Test suite
CHATBOT_*.md                        Documentation
```

## 🎓 Learn More

- **[Full API Docs](CHATBOT_API.md)** - Complete endpoint reference
- **[Setup Guide](CHATBOT_SETUP.md)** - Detailed setup instructions
- **[Architecture](CHATBOT_ARCHITECTURE.md)** - System diagrams & flows
- **[Quick Ref](CHATBOT_QUICKREF.md)** - Commands & cheatsheet

## ✅ What You Get

✅ AI-powered conversational chatbot
✅ Automatic lead scoring (0-8+ points)
✅ Hot/Warm/Cold classification
✅ Session management
✅ Complete API
✅ Test suite
✅ Full documentation

## 🎉 Ready to Go!

```bash
# Get started now:
node test-chatbot.js
```

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** January 5, 2026

**Need Help?** Check the documentation files or run `node test-chatbot.js` to see it in action.

