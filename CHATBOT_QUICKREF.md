# 3VLTN Chatbot - Quick Reference

## Quick Start

```bash
# 1. Add to .env
OPENAI_API_KEY=sk-proj-xxxxx
AI_MODEL=gpt-4o-mini

# 2. Run migration
psql $NEON_DATABASE_URL -f database/create_chatbot_tables.sql

# 3. Start server
npm start

# 4. Test
node test-chatbot.js
```

## API Endpoints

### Send Message
```bash
POST /backend/chatbot/message
{
  "message": "What do you do?",
  "sessionId": "optional",
  "userEmail": "optional",
  "userName": "optional"
}
```

### Score Lead
```bash
POST /backend/chatbot/score
{
  "sessionId": "session_xxxxx"
}
```

### Get Leads
```bash
GET /backend/chatbot/leads?classification=hot&limit=20
```

## Lead Scoring

### Score Calculation

| Factor | Criteria | Points |
|--------|----------|--------|
| **Portfolio** | 10+ domains | +2 |
| | 3-9 domains | +1 |
| | 1-2 domains | 0 |
| **Activity** | Actively selling | +2 |
| | Looking to start | +1 |
| | Just browsing | 0 |
| **Pain Points** | High pain keywords | +2 |
| | Medium pain keywords | +1 |
| | None | 0 |
| **Domain Value** | $5000+ or premium | +2 |
| | < $5000 | +1 |
| | Not discussed | 0 |

### Classifications

- **🔥 HOT (4+ points)**: Immediate personal contact
- **🌡️ WARM (2-3 points)**: Email nurture campaign  
- **❄️ COLD (0-1 points)**: General nurture list

## Response Framework

Every bot response follows this structure:

```json
{
  "answer": "1-2 sentences addressing the query",
  "simplify": "Proof point or social proof",
  "engage": "MANDATORY qualifying question"
}
```

## Built-in Intents

1. **value_proposition** - "what do you do"
2. **target_customer** - "who is this for"
3. **spam_objection** - "spam", "unsolicited"
4. **core_pain_point** - "problem", "challenge"
5. **first_step** - "get started", "sign up"
6. **just_browsing** - "just looking", "exploring"
7. **pricing_objection** - "cost", "price"
8. **greeting** - "hi", "hello"

## Frontend Integration

```javascript
// Initialize
let sessionId = localStorage.getItem('chatSessionId');

// Send message
const response = await fetch('/backend/chatbot/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, sessionId })
});

const data = await response.json();
sessionId = data.sessionId;
localStorage.setItem('chatSessionId', sessionId);

// Score after 5+ messages
if (data.messageCount >= 5) {
  const score = await fetch('/backend/chatbot/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  
  const scoreData = await score.json();
  if (scoreData.leadScore.classification === 'hot') {
    // Handle hot lead
  }
}
```

## Database Queries

```sql
-- Hot leads in last 24 hours
SELECT * FROM hot_leads 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Lead statistics
SELECT * FROM lead_statistics;

-- Top leads by score
SELECT session_id, user_email, lead_score, qualification_data
FROM chatbot_sessions
WHERE lead_score IS NOT NULL
ORDER BY lead_score DESC
LIMIT 10;
```

## Environment Variables

**Required:**
- `OPENAI_API_KEY` - OpenAI API key
- `NEON_DATABASE_URL` - Database connection

**Optional:**
- `AI_MODEL` - Default: gpt-4o-mini
- `CONTACT_NAME` - For final messages
- `SIGNUP_LINK` - CTA link
- `SLACK_WEBHOOK_URL` - Hot lead alerts

## Files Created

```
DomainSeller-Backend/
├── services/
│   └── chatbotService.js       # Core chatbot logic
├── routes/
│   └── chatbot.js              # API endpoints
├── database/
│   └── create_chatbot_tables.sql  # Database schema
├── test-chatbot.js             # Test suite
├── CHATBOT_API.md              # Full API documentation
├── CHATBOT_SETUP.md            # Setup guide
└── CHATBOT_QUICKREF.md         # This file
```

## Common Commands

```bash
# Test chatbot
node test-chatbot.js

# Clean up test sessions
node test-chatbot.js --cleanup session_id1 session_id2

# Run migration
psql $NEON_DATABASE_URL -f database/create_chatbot_tables.sql

# Start server
npm start

# Development mode
npm run dev
```

## Customization Points

1. **Add intent**: Edit `CHATBOT_INTENTS` in `chatbotService.js`
2. **Adjust scoring**: Modify `scoreLeadFromConversation()`
3. **Change final messages**: Edit `getFinalMessage()`
4. **Add webhooks**: Integrate in scoring logic

## Testing Scenarios

```javascript
// Hot Lead (expect score 4+)
"What do you do?"
"I have 50 domains"
"Actively trying to sell, struggling with pricing"

// Warm Lead (expect score 2-3)  
"Hi"
"I have 8 domains"
"Just looking to start selling"

// Cold Lead (expect score 0-1)
"Hello"
"Just browsing"
"I only have one domain"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API key error | Add `OPENAI_API_KEY` to `.env` |
| Table not found | Run migration SQL script |
| Low scores | Check conversation has qualification data |
| CORS errors | Add frontend URL to `server.js` |
| Generic responses | Add more specific intents |

## Key Metrics to Track

- Conversion rate (hot → signup)
- Average score by source
- Most common intents
- Response time
- Messages per classification

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production OpenAI key
- [ ] Set up Slack notifications
- [ ] Enable rate limiting
- [ ] Configure CORS for production domain
- [ ] Set up monitoring/alerts
- [ ] Train sales team on hot lead handling

---

**Quick Help:**
- Full docs: `CHATBOT_API.md`
- Setup guide: `CHATBOT_SETUP.md`
- Test: `node test-chatbot.js`

