# 3VLTN Chatbot Setup Guide

This guide will walk you through setting up the 3VLTN conversational chatbot with lead qualification.

## Prerequisites

- Node.js installed
- PostgreSQL database (Neon)
- OpenAI API key
- Existing DomainSeller-Backend setup

## Step 1: Install Dependencies

All required dependencies are already in `package.json`. If you need to reinstall:

```bash
cd DomainSeller-Backend
npm install
```

## Step 2: Configure Environment Variables

Add these new variables to your `.env` file:

```bash
# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
AI_MODEL=gpt-4o-mini

# Chatbot Configuration (OPTIONAL)
CONTACT_NAME=Sarah from 3VLTN
SIGNUP_LINK=https://3vltn.com/signup

# Webhook Integration (OPTIONAL)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxxxx/xxxxx/xxxxx
```

### Getting Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and add it to your `.env` file

## Step 3: Run Database Migration

Create the chatbot tables in your database:

```bash
# Option 1: Using psql directly
psql $NEON_DATABASE_URL -f database/create_chatbot_tables.sql

# Option 2: Using the migrate script (if you have one)
node migrate.js
```

This creates:
- `chatbot_sessions` table
- `hot_leads` view
- `lead_statistics` view
- Necessary indexes

## Step 4: Start the Server

```bash
npm start

# Or for development with auto-reload:
npm run dev
```

You should see:
```
🚀 Campaign Backend Server Running
📡 Port: 5000
```

## Step 5: Test the Chatbot

Run the test script to verify everything works:

```bash
node test-chatbot.js
```

This will:
1. Run 3 test conversations (hot, warm, cold leads)
2. Score each conversation
3. Test lead retrieval
4. Display results

Expected output:
```
=================================================================
  3VLTN CHATBOT API TEST SUITE
=================================================================

Test: Hot Lead - Large Portfolio with High Pain
...
✓ Test passed! Score: 6, Classification: hot

Test: Warm Lead - Medium Portfolio
...
✓ Test passed! Score: 2, Classification: warm

...
✓ All tests passed! 🎉
```

## Step 6: Integrate with Frontend

### Basic JavaScript Integration

```javascript
const CHATBOT_API = 'https://api.3vltn.com/backend/chatbot';
let sessionId = localStorage.getItem('chatSessionId');

// Send message
async function sendChatMessage(message) {
  const response = await fetch(`${CHATBOT_API}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      sessionId,
      userEmail: user?.email,
      userName: user?.name
    })
  });
  
  const data = await response.json();
  sessionId = data.sessionId;
  localStorage.setItem('chatSessionId', sessionId);
  
  return data.response;
}

// Score lead after conversation
async function scoreCurrentLead() {
  const response = await fetch(`${CHATBOT_API}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  
  const data = await response.json();
  
  if (data.leadScore.classification === 'hot') {
    // Show final message with CTA
    showFinalMessage(data.finalMessage);
    
    // Optionally redirect to signup
    setTimeout(() => {
      window.location.href = 'https://3vltn.com/signup';
    }, 3000);
  }
  
  return data;
}
```

### React Integration

```jsx
import { useState, useEffect } from 'react';

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(
    localStorage.getItem('chatSessionId')
  );

  const sendMessage = async (text) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    // Send to API
    const response = await fetch('/backend/chatbot/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        sessionId,
        userEmail: user?.email,
        userName: user?.name
      })
    });

    const data = await response.json();
    
    // Save session ID
    setSessionId(data.sessionId);
    localStorage.setItem('chatSessionId', data.sessionId);

    // Add bot response
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: data.response 
    }]);

    // Score after 5 messages
    if (data.messageCount >= 5) {
      scoreConversation();
    }
  };

  const scoreConversation = async () => {
    const response = await fetch('/backend/chatbot/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

    const data = await response.json();
    
    if (data.leadScore.classification === 'hot') {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.finalMessage
      }]);
    }
  };

  return (
    <div className="chatbot">
      <div className="messages">
        {messages.map((msg, i) => (
          <Message key={i} role={msg.role} content={msg.content} />
        ))}
      </div>
      <ChatInput onSend={sendMessage} />
    </div>
  );
}
```

## Step 7: Monitor Hot Leads

### View Hot Leads in Database

```sql
-- View all hot leads
SELECT * FROM hot_leads;

-- Get lead statistics
SELECT * FROM lead_statistics;

-- Get recent hot leads
SELECT 
  session_id,
  user_email,
  user_name,
  lead_score,
  qualification_data,
  created_at
FROM chatbot_sessions
WHERE lead_classification = 'hot'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY lead_score DESC;
```

### Set Up Slack Notifications (Optional)

1. Create a Slack webhook:
   - Go to https://api.slack.com/messaging/webhooks
   - Create an incoming webhook
   - Copy the webhook URL

2. Add to `.env`:
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxxxx
   ```

3. Modify `chatbotService.js` to send notifications:
   ```javascript
   if (classification === 'hot') {
     await axios.post(process.env.SLACK_WEBHOOK_URL, {
       text: `🔥 New Hot Lead: ${userEmail}`,
       blocks: [
         {
           type: "section",
           text: {
             type: "mrkdwn",
             text: `*Score:* ${score}\n*Portfolio:* ${qualificationData.portfolioSize} domains\n*Pain Points:* ${qualificationData.painPoints.join(', ')}`
           }
         }
       ]
     });
   }
   ```

## Step 8: Customize Responses (Optional)

Edit `services/chatbotService.js` to customize:

1. **Add new intents**:
   ```javascript
   custom_intent: {
     triggers: ['trigger phrase', 'another phrase'],
     response: {
       answer: "Your answer here",
       simplify: "Proof point",
       engage: "Your qualifying question?"
     }
   }
   ```

2. **Adjust scoring rules** in `scoreLeadFromConversation()`:
   ```javascript
   // Example: Add bonus points for urgency
   if (allUserMessages.includes('urgent') || allUserMessages.includes('asap')) {
     score += 1;
     console.log('   Urgency detected (+1 point)');
   }
   ```

3. **Customize final messages** in `getFinalMessage()`:
   ```javascript
   hot: {
     answer: "Your custom hot lead message",
     simplify: "Social proof",
     engage: "Your CTA here"
   }
   ```

## Troubleshooting

### Issue: "OPENAI_API_KEY not configured"

**Solution:** Make sure you've added the OpenAI API key to your `.env` file and restarted the server.

### Issue: Database table doesn't exist

**Solution:** Run the migration script:
```bash
psql $NEON_DATABASE_URL -f database/create_chatbot_tables.sql
```

### Issue: Low lead scores

**Solution:** 
- Check conversation history contains enough qualification data
- Review scoring rules in `scoreLeadFromConversation()`
- Ensure users are answering the qualifying questions

### Issue: Bot responses are too generic

**Solution:**
- Add more specific intents for common questions
- Improve trigger keywords
- Adjust AI temperature in `chatbotService.js`

### Issue: CORS errors from frontend

**Solution:** Add your frontend URL to `server.js` allowed origins:
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-frontend-domain.com'
];
```

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/backend/chatbot/message` | POST | Send message to chatbot |
| `/backend/chatbot/score` | POST | Score a conversation |
| `/backend/chatbot/session/:id` | GET | Get session details |
| `/backend/chatbot/leads` | GET | Get all scored leads |
| `/backend/chatbot/session/:id` | DELETE | Delete a session |

See `CHATBOT_API.md` for detailed API documentation.

## Production Deployment

### Environment Setup

1. Set production environment variables:
   ```bash
   NODE_ENV=production
   FRONTEND_URL=https://3vltn.com
   SIGNUP_LINK=https://3vltn.com/signup
   CONTACT_NAME=Your Sales Rep Name
   ```

2. Use production OpenAI model (optional):
   ```bash
   AI_MODEL=gpt-4o  # More advanced but more expensive
   ```

### Performance Optimization

1. **Enable response caching** for common intents
2. **Set up rate limiting** per session
3. **Monitor AI costs** in OpenAI dashboard
4. **Use connection pooling** for database

### Security Considerations

1. **Validate all inputs** before processing
2. **Sanitize user messages** to prevent injection
3. **Implement rate limiting** to prevent abuse
4. **Use HTTPS only** in production
5. **Regularly rotate** API keys

## Next Steps

1. ✅ Set up chatbot endpoints
2. ✅ Test with sample conversations
3. 🔲 Integrate with your frontend
4. 🔲 Set up Slack notifications
5. 🔲 Connect to CRM (optional)
6. 🔲 Monitor and optimize lead scoring
7. 🔲 Train sales team on hot lead handling

## Support

For questions or issues:
- Check `CHATBOT_API.md` for detailed documentation
- Review test output from `test-chatbot.js`
- Check server logs for error messages
- Contact: dev@3vltn.com

---

**Setup Time:** ~15 minutes
**Difficulty:** Intermediate
**Status:** Production Ready ✅

