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

**AI:** "Perfect! Would you like me to find matched buyers for this domain? I can search our database for potential buyers in specific industries."

**User:** "Yes, find buyers in the tech industry"

**AI:** "✅ Found 45 matched buyers in the tech industry! Do you have a landing page for techstartup.com? Landing pages can increase buyer engagement by 40%."

**User:** "Yes, https://mysite.com/domains/techstartup"

**AI:** "Excellent! Would you like to include follow-up emails? Research shows follow-ups increase response rates by 3x. I recommend sending follow-ups at 3, 7, and 14 days."

**User:** "Yes, use the default schedule"

**AI:** "Great choice! Would you like to manually compose your email, or should I generate a professional one for each buyer?"

**User:** "Auto-generate please"

**AI:** "Perfect! When should I schedule these emails? Would you like to send them immediately or on a specific date?"

**User:** "Send immediately"

**AI:** "Let me confirm all your settings:
- Domain: techstartup.com
- Campaign: Tech Startup Outreach
- Price: $5000
- Buyers: 45 matched (tech industry)
- Landing Page: https://mysite.com/domains/techstartup
- Follow-ups: 3, 7, 14 days
- Email: Auto-generated
- Schedule: Immediate

Shall I create this campaign?"

**User:** "Yes"

**AI:** "✅ Campaign 'Tech Startup Outreach' created as DRAFT for techstartup.com at $5000! Now configuring your settings... ✅ Campaign settings configured successfully! Emails are ready to be sent! Visit your dashboard to activate the campaign."

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

1. **Create Campaigns (Enhanced Flow)**
   - "Create a campaign for example.com"
   - "I want to sell mywebsite.com for $3000"
   - "Start a new campaign"
   
   **New Interactive Configuration:**
   After creating a campaign, the AI will ask about:
   - ✅ Finding matched buyers for the domain
   - ✅ Checking for existing landing pages
   - ✅ Including follow-up email sequences
   - ✅ Scheduling emails (immediate or specific date)
   - ✅ Manual email composition options

2. **View Campaigns**
   - "Show me my campaigns"
   - "What domains do I have?"
   - "List my active campaigns"

3. **Campaign Analytics**
   - "How's my techstartup.com campaign doing?"
   - "Show me stats for example.com"
   - "What's my open rate?"

4. **Landing Page Management**
   - "Does my domain have a landing page?"
   - "Check landing page for example.com"

5. **Buyer Matching**
   - "Find buyers for techstartup.com"
   - "Show me matched buyers in tech industry"

### 🔜 Coming Soon:
- Approve payments
- Manage domains
- Advanced analytics

---

## 📋 Campaign Creation Process

### Mandatory Steps (In Order)

The AI agent follows a **comprehensive 8-step process** when creating campaigns. It will NOT skip any step to ensure campaigns are properly configured:

#### **Step 1: Gather Basic Information** ✅
- Domain name
- Campaign name (AI suggests one based on domain)
- Asking price (in USD)
- Optional: Target industry/keywords

#### **Step 2: Buyer Matching** 🎯
- AI asks: "Would you like me to find matched buyers?"
- If yes: Searches database by industry/keywords
- Shows number of matches found
- User can proceed or refine search

**Why it matters:** Finding the right buyers increases conversion by 5x

#### **Step 3: Landing Page Setup** 🌐
- AI asks if user has a landing page
- If yes: Collects URL
- If no: Notes for future setup

**Why it matters:** Landing pages increase buyer engagement by 40%

#### **Step 4: Follow-up Configuration** 📧
- AI recommends follow-ups (best practice)
- Default schedule: 3, 7, 14 days
- User can customize timing

**Why it matters:** Follow-ups increase response rates by 3x

#### **Step 5: Email Composition** ✍️
- Manual compose: User writes in dashboard
- Auto-generate: AI creates personalized emails

**Why it matters:** Personalized emails have 6x higher open rates

#### **Step 6: Scheduling** ⏰
- Send immediately OR
- Schedule for specific date/time

**Why it matters:** Timing affects open rates significantly

#### **Step 7: Campaign Creation** 🎨
- AI shows complete summary of all settings
- Asks for final confirmation
- Creates campaign as **DRAFT** status
- Returns campaign ID

#### **Step 8: Campaign Configuration** ⚙️
- Applies all collected settings:
  - Buyer list
  - Landing page URL
  - Follow-up schedule
  - Email composition preference
  - Scheduling
- Confirms campaign is ready
- Explains next steps

### Important Notes

✅ Campaign starts as **DRAFT** (not active)  
✅ All settings collected BEFORE creation  
✅ User confirms at each major step  
✅ AI explains benefits of each feature  
✅ Settings can be changed in dashboard later  
❌ AI will NOT skip configuration steps  
❌ AI will NOT create campaign without buyer selection  

---

## 💬 Example Chat Flow

### Enhanced Campaign Creation Flow:

```
User: Create a new campaign

AI: I'd be happy to help you create a new campaign! Let me gather some information.
    
    1. What's the domain name?
    2. What should we name this campaign?
    3. What's your asking price?

User: domain is theprimecrafters.com asking price is 2500

AI: Perfect! For the domain **theprimecrafters.com**, how about we use 
    "Crafting Opportunities" as the campaign name? Would you like to go 
    with that, or do you have a different campaign name in mind?

User: yes this works

AI: ✅ Campaign "Crafting Opportunities" created as DRAFT for 
    theprimecrafters.com at $2500!
    
    Now let's configure your campaign settings:
    
    📌 **Matched Buyers:** Would you like me to find potential buyers 
       interested in crafting or similar domains?
    
    🌐 **Landing Page:** Should I check if a landing page exists for 
       this domain and include it in emails?
    
    📧 **Follow-up Emails:** Do you want to include automated follow-up 
       emails? (Recommended: 3-day, 7-day, 14-day sequence)
    
    ⏰ **Email Scheduling:** When should emails be sent? 
       (immediately or specific date)
    
    ✍️ **Email Composition:** Would you like to:
       - Let me generate emails automatically
       - Manually compose the emails yourself

User: yes find matched buyers, include landing page if it exists, 
      add follow-ups at 3, 7, and 14 days, send immediately, 
      and auto-generate emails

AI: 🔍 Searching for matched buyers...
    ✅ Found 23 potential buyers matching "theprimecrafters.com"
    
    🌐 Checking landing page...
    ✅ Landing page found: https://theprimecrafters.com/landing
    
    ⚙️ Configuring campaign settings...
    ✅ Follow-up sequence: Days 3, 7, 14
    ✅ Landing page link included
    ✅ Campaign status: Active
    
    Your campaign is now live and ready to send! 🚀
    
    Would you like me to start sending emails to the matched buyers?
```

### Quick Campaign View:

```
User: Show me my campaigns

AI: You have 3 active campaigns:
    
    1. **theprimecrafters.com** - "Crafting Opportunities"
       💰 $2,500 | 📧 23 buyers matched | 🌐 Landing page active
       
    2. **techstartup.com** - "Tech Startup Outreach"
       💰 $5,000 | 📧 45 emails sent | 📊 12 opens (26.7%)
       
    3. **example.com** - "Example Campaign"
       💰 $2,500 | 📧 Draft | ⚙️ Needs configuration
    
    Which campaign would you like to manage?
```

### Campaign Statistics:

```
User: How's my techstartup.com campaign doing?

AI: Here are the stats for your **Tech Startup Outreach** campaign:
    
    📊 **Campaign Performance:**
    - Total Sent: 45 emails
    - Delivered: 43 (95.6%)
    - Opened: 12 (27.9% open rate)
    - Clicked: 3 (6.7% click rate)
    - Replied: 1 (2.3% reply rate)
    
    📈 **Engagement:** Your open rate is above average for cold outreach!
    
    🎯 **Next Steps:**
    - 15 follow-ups scheduled in next 7 days
    - 2 buyers showed high interest (clicked multiple times)
    
    Would you like to see details on the interested buyers?
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
- ✅ Interactive campaign configuration
- ✅ Matched buyer search
- ✅ Landing page detection
- ✅ Follow-up sequence automation
- ✅ Email scheduling options

### Database Tables:
- `ai_chat_sessions` - Chat sessions
- `ai_chat_messages` - Individual messages
- `ai_agent_memory` - Persistent user memory

---

## 🔧 Available AI Functions

The AI agent has access to these functions to help users:

### 1. `createCampaign`
Creates a new campaign as DRAFT and triggers configuration flow.

**Parameters:**
- `domainName` (required): Domain name for the campaign
- `campaignName` (required): Campaign title
- `askingPrice` (required): Asking price in USD
- `targetIndustry` (optional): Target industry for lead generation

**Example:** "Create a campaign for techstartup.com for $5000"

---

### 2. `checkLandingPage`
Checks if a landing page exists for a domain.

**Parameters:**
- `domainName` (required): Domain to check

**Returns:**
- Landing page URL if exists
- Creation date
- Domain information

**Example:** "Does theprimecrafters.com have a landing page?"

---

### 3. `findMatchedBuyers`
Searches for potential buyers based on domain and industry.

**Parameters:**
- `domainName` (required): Domain to find buyers for
- `targetIndustry` (optional): Target industry filter
- `limit` (optional): Max buyers to return (default: 50)

**Returns:**
- List of matched buyers with:
  - Email, name, company
  - Industry, interests
  - Budget range, lead score
  - Location

**Example:** "Find buyers for techstartup.com in the SaaS industry"

---

### 4. `configureCampaignSettings`
Configures campaign settings after creation.

**Parameters:**
- `campaignId` (required): Campaign to configure
- `includeFollowUps` (optional): Enable follow-up emails
- `followUpDays` (optional): Array of days for follow-ups [3, 7, 14]
- `includeLandingPage` (optional): Include landing page in emails
- `landingPageUrl` (optional): Landing page URL
- `scheduleDate` (optional): When to send emails ("now" or ISO date)
- `manualCompose` (optional): User wants to write emails manually

**Example:** "Configure with follow-ups on days 3, 7, and 14"

---

### 5. `getUserCampaigns`
Retrieves all campaigns for the user.

**Parameters:**
- `status` (optional): Filter by status (active/draft/paused/all)

**Returns:**
- List of campaigns with stats
- Email counts, open rates
- Campaign details

**Example:** "Show me all my active campaigns"

---

### 6. `getCampaignStats`
Gets detailed statistics for a campaign.

**Parameters:**
- `campaignId` (required): Campaign ID or domain name

**Returns:**
- Total sent, opened, clicked, replied
- Open rate, click rate
- Campaign details

**Example:** "How is my techstartup.com campaign performing?"

---

## 🧪 Testing

### Quick Test - Enhanced Campaign Flow:

```bash
# Run the comprehensive test suite
node test-enhanced-campaign.js

# Test manual composition flow
node test-enhanced-campaign.js manual

# Test landing page detection
node test-enhanced-campaign.js landing

# Test buyer matching
node test-enhanced-campaign.js buyers
```

### Test from Command Line:

```bash
curl -X POST https://api.3vltn.com/backend/ai-agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 10,
    "message": "Show me my campaigns"
  }'
```

### Test Enhanced Campaign Creation:

```bash
# Step 1: Initiate campaign
curl -X POST https://api.3vltn.com/backend/ai-agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 10,
    "message": "Create a new campaign"
  }'

# Step 2: Provide details (use sessionId from previous response)
curl -X POST https://api.3vltn.com/backend/ai-agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 10,
    "sessionId": "session_10_1234567890",
    "message": "domain is theprimecrafters.com asking price is 2500"
  }'

# Step 3: Confirm campaign name
curl -X POST https://api.3vltn.com/backend/ai-agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 10,
    "sessionId": "session_10_1234567890",
    "message": "yes this works"
  }'

# Step 4: Configure campaign settings
curl -X POST https://api.3vltn.com/backend/ai-agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 10,
    "sessionId": "session_10_1234567890",
    "message": "Find matched buyers, include landing page, add follow-ups on days 3, 7, and 14, send immediately, auto-generate emails"
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

