# 🤖 AI SUPER AGENT API

## 🚀 Quick Start

### 1️⃣ Add Environment Variable

Add this to your `.env` file:

```bash
# OpenAI API Key (Required)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Change model (default: gpt-4-turbo-preview)
OPENAI_MODEL=gpt-4-turbo-preview
```

### 2️⃣ Run Database Migration

```bash
node migrate-ai-agent.js
```

### 3️⃣ Restart Server

```bash
pm2 restart node-backend
```

---

## 📡 API Endpoints

### Base URL
```
https://api.3vltn.com/backend/ai-agent
```

---

### 1️⃣ **Chat with AI Agent**

**POST** `/backend/ai-agent/chat`

Send a message to the AI agent and get a response.

#### Request Body:
```json
{
  "userId": 10,
  "message": "Create a campaign for example.com",
  "sessionId": "session_10_1234567890" // Optional, omit for new session
}
```

#### Response:
```json
{
  "success": true,
  "sessionId": "session_10_1234567890",
  "message": "I'll help you create a campaign for example.com! What would you like to name this campaign?",
  "tokensUsed": 245
}
```

#### Example Conversation:

**User:** "Create a campaign for techstartup.com"

**AI:** "I'll help you create a campaign for techstartup.com! What would you like to name this campaign?"

**User:** "Tech Startup Outreach"

**AI:** "Great! What's the asking price for techstartup.com?"

**User:** "$5000"

**AI:** "✅ Campaign 'Tech Startup Outreach' created successfully for techstartup.com at $5000! Would you like me to help you generate leads for this campaign?"

---

### 2️⃣ **Get Chat History**

**GET** `/backend/ai-agent/history/:sessionId?userId=10`

Retrieve conversation history for a session.

#### Response:
```json
{
  "success": true,
  "messages": [
    {
      "role": "user",
      "content": "Create a campaign for example.com",
      "created_at": "2026-01-18T12:00:00Z"
    },
    {
      "role": "assistant",
      "content": "I'll help you create a campaign...",
      "created_at": "2026-01-18T12:00:02Z"
    }
  ]
}
```

---

### 3️⃣ **Get Recent Session**

**GET** `/backend/ai-agent/sessions?userId=10`

Get user's most recent chat session.

#### Response:
```json
{
  "success": true,
  "session": {
    "session_id": "session_10_1234567890",
    "started_at": "2026-01-18T12:00:00Z",
    "last_message_at": "2026-01-18T12:05:30Z",
    "message_count": 8,
    "is_active": true
  }
}
```

---

## 🎯 What the AI Can Do

### ✅ Currently Implemented:

1. **Create Campaigns**
   - "Create a campaign for example.com"
   - "I want to sell mywebsite.com for $3000"
   - "Start a new campaign"

2. **View Campaigns**
   - "Show me my campaigns"
   - "What domains do I have?"
   - "List my active campaigns"

3. **Campaign Analytics**
   - "How's my techstartup.com campaign doing?"
   - "Show me stats for example.com"
   - "What's my open rate?"

### 🔜 Coming Soon:
- Generate leads
- Approve payments
- Manage domains
- Schedule emails

---

## 💬 Example Chat Flow

```
User: Hey!
AI: Hi! I'm your AI assistant for managing domain campaigns. 
    How can I help you today?

User: How many domains do I own?
AI: Let me check... You have 3 active campaigns:
    1. techstartup.com - $5,000
    2. example.com - $2,500
    3. mywebsite.io - $8,000
    
    Would you like details on any of these?

User: Create a new campaign for newdomain.com
AI: Great! I'll help you set up a campaign for newdomain.com.
    What would you like to name this campaign?

User: New Domain Launch
AI: Perfect! What's the asking price for newdomain.com?

User: $4500
AI: ✅ Campaign "New Domain Launch" created successfully 
    for newdomain.com at $4,500!
    
    Your campaign is now active. Would you like me to 
    help you generate leads?
```

---

## 🛠️ Technical Details

### Architecture:
- **OpenAI GPT-4** with function calling
- **Persistent memory** per user
- **Multi-turn conversations** with context
- **Database storage** for chat history

### Features:
- ✅ Function calling for real database actions
- ✅ Conversation memory across sessions
- ✅ Natural language understanding
- ✅ Context-aware responses
- ✅ Token usage tracking

### Database Tables:
- `ai_chat_sessions` - Chat sessions
- `ai_chat_messages` - Individual messages
- `ai_agent_memory` - Persistent user memory

---

## 🧪 Testing

### Test from Command Line:

```bash
curl -X POST https://api.3vltn.com/backend/ai-agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 10,
    "message": "Show me my campaigns"
  }'
```

### Test Creating Campaign:

```bash
# Step 1: Start conversation
curl -X POST https://api.3vltn.com/backend/ai-agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 10,
    "message": "Create a campaign for example.com for $3000"
  }'

# Copy the sessionId from response

# Step 2: Continue conversation
curl -X POST https://api.3vltn.com/backend/ai-agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 10,
    "sessionId": "session_10_1234567890",
    "message": "Name it Example Campaign"
  }'
```

---

## 📊 Frontend Integration

### React Example:

```javascript
const [messages, setMessages] = useState([]);
const [sessionId, setSessionId] = useState(null);
const [input, setInput] = useState('');
const [loading, setLoading] = useState(false);

const sendMessage = async () => {
  if (!input.trim()) return;
  
  setLoading(true);
  
  // Add user message to UI
  setMessages(prev => [...prev, { role: 'user', content: input }]);
  
  try {
    const response = await fetch('https://api.3vltn.com/backend/ai-agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        message: input,
        sessionId: sessionId
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update session ID if new
      if (!sessionId) setSessionId(data.sessionId);
      
      // Add AI response to UI
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message 
      }]);
    }
  } catch (error) {
    console.error('Chat error:', error);
  } finally {
    setLoading(false);
    setInput('');
  }
};
```

---

## 🎨 UI Recommendations

### Chat Interface:
- **Left sidebar:** Session history
- **Center:** Chat messages
- **Right sidebar:** Quick actions (create campaign, view stats)
- **Bottom:** Input box with send button

### Message Bubbles:
- **User messages:** Right-aligned, blue
- **AI messages:** Left-aligned, gray
- **Function results:** Highlighted cards (e.g., "✅ Campaign Created")

### Features:
- Typing indicator when AI is thinking
- Auto-scroll to latest message
- Session persistence
- Quick action buttons in AI responses

---

## 🔒 Security

- User ID validation required
- Rate limiting recommended
- OpenAI API key stored securely in `.env`
- All database queries use parameterized statements

---

## 📈 Monitoring

Check logs for:
```bash
pm2 logs node-backend --lines 100
```

Look for:
- `🤖 AI AGENT CHAT REQUEST`
- `🔧 Function call requested:`
- `✅ Response:`
- Token usage per request

---

## 🐛 Troubleshooting

### Issue: "OpenAI API key not found"
**Solution:** Add `OPENAI_API_KEY` to `.env` and restart server

### Issue: "Table does not exist"
**Solution:** Run `node migrate-ai-agent.js`

### Issue: "Function not working"
**Solution:** Check database permissions and user_id validity

---

## 💰 Cost Estimation

- **GPT-4 Turbo:** ~$0.01 per message (avg 250 tokens)
- **100 messages/day:** ~$1/day
- **3000 messages/month:** ~$30/month

**Optimization:**
- Use `gpt-3.5-turbo` for cheaper responses
- Cache common queries
- Limit conversation history to 10-20 messages

---

## 🎉 You're Ready!

Your AI Super Agent is now live at:
```
POST https://api.3vltn.com/backend/ai-agent/chat
```

**Next Steps:**
1. Add `OPENAI_API_KEY` to `.env`
2. Run migration: `node migrate-ai-agent.js`
3. Restart server: `pm2 restart node-backend`
4. Test from frontend!

🚀 **Happy building!**

