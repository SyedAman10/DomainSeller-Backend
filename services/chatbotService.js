const axios = require('axios');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

/**
 * 3VLTN Chatbot Service
 * Implements "Answer, Simplify, Engage" framework
 * Qualifies leads through conversational AI
 */

// Intent definitions with response templates
const CHATBOT_INTENTS = {
  value_proposition: {
    triggers: ['what do you do', 'tell me about', 'what is 3vltn', 'what does this do'],
    response: {
      answer: "We automate the entire domain sales process so investors can scale from a side hustle to a system. It's like a full-time sales agent for your portfolio.",
      simplify: "",
      engage: "How many domains are you working with right now?"
    }
  },
  target_customer: {
    triggers: ['who is this for', 'target audience', 'who uses this', 'right for me'],
    response: {
      answer: "We're built for investors who want to systemize sales, not for one-off auctions.",
      simplify: "This focus lets us build powerful tools for scaling a portfolio.",
      engage: "What does your portfolio look like right now—mostly holding for investment, or actively trying to sell?"
    }
  },
  spam_objection: {
    triggers: ['spam', 'avoid spam', 'unsolicited', 'annoying emails'],
    response: {
      answer: "We hate spam too. Our AI researches each lead and writes a short, relevant message. You approve every email before sending.",
      simplify: "The goal is to start a genuine conversation.",
      engage: "What's been your biggest frustration with how domain buyers get approached?"
    }
  },
  core_pain_point: {
    triggers: ['biggest mistake', 'fix', 'problem', 'pain point', 'challenge'],
    response: {
      answer: "Treating a portfolio like a storage locker—paying renewals on boxes you never open.",
      simplify: "Our system instantly identifies which domains have real potential. Most users cut renewal waste by 30-40%.",
      engage: "Do you ever feel uncertain about which domains in your portfolio are truly worth renewing?"
    }
  },
  first_step: {
    triggers: ['first step', 'get started', 'sign up', 'how to start', 'begin'],
    response: {
      answer: "You'll get an instant portfolio health check. Import your names, and in 60 seconds, our AI will show your highest-potential domains.",
      simplify: "",
      engage: "What's the first domain you'd like to run through the scanner?"
    }
  },
  just_browsing: {
    triggers: ['just looking', 'not sure', 'browsing', 'exploring', 'checking out'],
    response: {
      answer: "No problem—most of our best customers started by exploring.",
      simplify: "",
      engage: "What brought you to 3VLTN today? Curious about automation, or dealing with a specific domain challenge?"
    }
  },
  pricing_objection: {
    triggers: ['how much', 'cost', 'price', 'pricing', 'expensive', 'fee'],
    response: {
      answer: "Pricing scales with your portfolio size, but most users find it pays for itself with 1-2 sales.",
      simplify: "The real question is about ROI.",
      engage: "What's the typical value of the domains you're looking to sell? That helps us show you the potential."
    }
  },
  greeting: {
    triggers: ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon'],
    response: {
      answer: "Hi! I'm the 3VLTN assistant.",
      simplify: "I'm here to help you understand how we can automate your domain sales.",
      engage: "Are you looking to automate your domain sales today?"
    }
  }
};

/**
 * Match user message to an intent
 * @param {String} userMessage - The user's message
 * @returns {Object|null} Matched intent or null
 */
const matchIntent = (userMessage) => {
  const lowerMessage = userMessage.toLowerCase();
  
  for (const [intentName, intent] of Object.entries(CHATBOT_INTENTS)) {
    for (const trigger of intent.triggers) {
      if (lowerMessage.includes(trigger)) {
        return {
          name: intentName,
          response: intent.response
        };
      }
    }
  }
  
  return null;
};

/**
 * Generate chatbot response using AI with Answer-Simplify-Engage framework
 * @param {Object} params - Parameters
 * @returns {Promise<Object>} Chatbot response
 */
const generateChatbotResponse = async ({ 
  userMessage, 
  conversationHistory = [],
  sessionId = null 
}) => {
  console.log('🤖 3VLTN CHATBOT - Generating Response');
  console.log(`   User Message: ${userMessage}`);
  console.log(`   Session ID: ${sessionId}`);
  
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // First, try to match a specific intent
    const matchedIntent = matchIntent(userMessage);
    
    if (matchedIntent) {
      console.log(`   ✅ Matched Intent: ${matchedIntent.name}`);
      
      // Return the structured response from the intent
      return {
        success: true,
        response: matchedIntent.response,
        intent: matchedIntent.name,
        shouldScore: true
      };
    }

    // If no intent matched, use AI to generate a response following the framework
    console.log('   Using AI to generate response...');
    
    const messages = [
      {
        role: 'system',
        content: `You are the 3VLTN chatbot assistant. Your goal is to qualify leads through conversation.

**MANDATORY RESPONSE STRUCTURE:**
Every response must follow this exact structure:
{
  "answer": "1-2 sentences addressing the query directly, leading with benefit/empathy",
  "simplify": "1 key point of proof, data, or social proof (can be empty string if not needed)",
  "engage": "A QUESTION designed to gather qualification data"
}

**CRITICAL RULES:**
1. The "engage" component is MANDATORY - you must ALWAYS end with a qualifying question
2. Never give information without asking a qualifying question back
3. Keep "answer" to 1-2 sentences maximum
4. The "engage" question should help us learn about:
   - Portfolio size
   - Current activity (actively selling vs holding)
   - Pain points (renewals, pricing, finding buyers, etc.)
   - Domain values
   - Specific challenges

**EXAMPLES:**

User: "Can you help with domain valuation?"
Response:
{
  "answer": "Yes, our AI instantly analyzes domains and shows their market potential based on trends, search volume, and comparable sales.",
  "simplify": "Most users discover hidden gems in their portfolio they didn't know were valuable.",
  "engage": "How many domains do you need valued?"
}

User: "I'm struggling to find buyers"
Response:
{
  "answer": "That's the exact problem we solve. Our system researches and reaches out to qualified buyers automatically.",
  "simplify": "Users typically see 3-5x more conversations than manual outreach.",
  "engage": "What types of domains are you trying to sell—premium names, industry-specific, or something else?"
}

**YOUR GOAL:** Keep the conversation flowing while gathering qualification data through strategic questions.

Response must be in JSON format with "answer", "simplify", and "engage" fields.`
      }
    ];

    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      });
    });

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: AI_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiResponse = JSON.parse(response.data.choices[0].message.content);

    console.log('✅ AI Response Generated');
    console.log(`   Tokens Used: ${response.data.usage.total_tokens}`);

    // Validate the response has all required components
    if (!aiResponse.engage) {
      aiResponse.engage = "What can I help you with regarding your domain portfolio?";
    }

    return {
      success: true,
      response: aiResponse,
      intent: 'ai_generated',
      shouldScore: true,
      tokensUsed: response.data.usage.total_tokens
    };

  } catch (error) {
    console.error('❌ Chatbot Generation Failed:', error.response?.data || error.message);
    
    // Fallback response that still follows the framework
    return {
      success: false,
      response: {
        answer: "I'm here to help you automate your domain sales and maximize your portfolio value.",
        simplify: "",
        engage: "What would you like to know about 3VLTN?"
      },
      intent: 'fallback',
      shouldScore: false,
      error: error.message
    };
  }
};

/**
 * Score a lead based on conversation analysis
 * @param {Array} conversationHistory - Full conversation history
 * @returns {Object} Lead score and classification
 */
const scoreLeadFromConversation = (conversationHistory) => {
  console.log('📊 LEAD SCORING - Analyzing conversation...');
  
  let score = 0;
  const qualificationData = {
    portfolioSize: null,
    activity: null,
    painPoints: [],
    domainValue: null,
    detectedKeywords: []
  };

  // Combine all user messages
  const allUserMessages = conversationHistory
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content.toLowerCase())
    .join(' ');

  console.log(`   Analyzing ${conversationHistory.length} messages...`);

  // 1. Portfolio Size Scoring
  const portfolioPatterns = [
    { pattern: /(\d+)\s*(domains?|names?|sites?)/gi, multiplier: 1 },
    { pattern: /(hundred|hundreds)/gi, value: 100 },
    { pattern: /(dozen|dozens)/gi, value: 12 },
    { pattern: /(few|small|handful)/gi, value: 5 },
    { pattern: /(just one|single|one domain)/gi, value: 1 },
    { pattern: /(many|lots|bunch)/gi, value: 20 }
  ];

  for (const { pattern, multiplier, value } of portfolioPatterns) {
    const matches = allUserMessages.match(pattern);
    if (matches) {
      if (value) {
        qualificationData.portfolioSize = value;
      } else {
        const numbers = allUserMessages.match(/\b(\d+)\b/g);
        if (numbers) {
          qualificationData.portfolioSize = parseInt(numbers[0]);
        }
      }
      break;
    }
  }

  if (qualificationData.portfolioSize !== null) {
    if (qualificationData.portfolioSize >= 10) {
      score += 2;
      console.log('   Portfolio Size: 10+ domains (+2 points)');
    } else if (qualificationData.portfolioSize >= 3) {
      score += 1;
      console.log('   Portfolio Size: 3-9 domains (+1 point)');
    } else {
      console.log('   Portfolio Size: 1-2 domains (+0 points)');
    }
  }

  // 2. Activity/Selling Intent
  const highActivityKeywords = ['actively selling', 'need to sell', 'quickly', 'urgent', 'right now', 'asap'];
  const mediumActivityKeywords = ['looking to start', 'want to sell', 'planning', 'investment', 'holding'];
  const lowActivityKeywords = ['just researching', 'curious', 'exploring', 'just looking'];

  if (highActivityKeywords.some(kw => allUserMessages.includes(kw))) {
    score += 2;
    qualificationData.activity = 'high';
    console.log('   Activity: High intent (+2 points)');
  } else if (mediumActivityKeywords.some(kw => allUserMessages.includes(kw))) {
    score += 1;
    qualificationData.activity = 'medium';
    console.log('   Activity: Medium intent (+1 point)');
  } else if (lowActivityKeywords.some(kw => allUserMessages.includes(kw))) {
    qualificationData.activity = 'low';
    console.log('   Activity: Low intent (+0 points)');
  }

  // 3. Expressed Pain (Keyword Detection)
  const highPainKeywords = [
    'pricing', 'valuation', 'renewals', 'wasting money', 'spam', 
    'finding buyers', 'time-consuming', 'struggling', 'frustrated',
    'difficult', 'challenge', 'problem'
  ];
  const mediumPainKeywords = ['automation', 'easier', 'organized', 'tools', 'help', 'better way'];

  const detectedHighPain = highPainKeywords.filter(kw => allUserMessages.includes(kw));
  const detectedMediumPain = mediumPainKeywords.filter(kw => allUserMessages.includes(kw));

  if (detectedHighPain.length > 0) {
    score += 2;
    qualificationData.painPoints = detectedHighPain;
    console.log(`   Pain Points: High (${detectedHighPain.join(', ')}) (+2 points)`);
  } else if (detectedMediumPain.length > 0) {
    score += 1;
    qualificationData.painPoints = detectedMediumPain;
    console.log(`   Pain Points: Medium (${detectedMediumPain.join(', ')}) (+1 point)`);
  }

  // 4. Domain Value (If disclosed)
  const valuePatterns = [
    /\$?\s*(\d+)k/gi,  // $5k, 10k, etc.
    /\$\s*(\d+,?\d*)/gi,  // $5000, $5,000, etc.
    /(premium|high value|valuable)/gi,
    /(mid-range|average)/gi
  ];

  for (const pattern of valuePatterns) {
    const matches = allUserMessages.match(pattern);
    if (matches) {
      if (matches[0].includes('premium') || matches[0].includes('high value')) {
        qualificationData.domainValue = 'high';
        score += 2;
        console.log('   Domain Value: High/Premium (+2 points)');
        break;
      } else if (matches[0].includes('mid-range') || matches[0].includes('average')) {
        qualificationData.domainValue = 'medium';
        score += 1;
        console.log('   Domain Value: Mid-range (+1 point)');
        break;
      } else {
        // Try to extract numeric value
        const numMatch = matches[0].match(/(\d+)/);
        if (numMatch) {
          let value = parseInt(numMatch[0]);
          if (matches[0].includes('k')) value *= 1000;
          
          if (value >= 5000) {
            qualificationData.domainValue = value;
            score += 2;
            console.log(`   Domain Value: $${value} (+2 points)`);
          } else {
            qualificationData.domainValue = value;
            score += 1;
            console.log(`   Domain Value: $${value} (+1 point)`);
          }
          break;
        }
      }
    }
  }

  // Determine lead classification
  let classification = '';
  let followUpAction = '';

  if (score >= 4) {
    classification = 'hot';
    followUpAction = 'immediate_personal_contact';
    console.log('🔥 HOT LEAD (4+ points)');
  } else if (score >= 2) {
    classification = 'warm';
    followUpAction = 'email_nurture';
    console.log('🌡️  WARM LEAD (2-3 points)');
  } else {
    classification = 'cold';
    followUpAction = 'general_nurture';
    console.log('❄️  COLD LEAD (0-1 points)');
  }

  return {
    score,
    classification,
    followUpAction,
    qualificationData,
    timestamp: new Date().toISOString()
  };
};

/**
 * Get the final message based on lead score
 * @param {String} classification - hot, warm, or cold
 * @param {String} contactName - Name of contact person
 * @param {String} signupLink - Link to signup page
 * @returns {String} Final message
 */
const getFinalMessage = (classification, contactName = 'our team', signupLink = 'https://3vltn.com/signup') => {
  const messages = {
    hot: {
      answer: `That's a perfect fit for our platform. I'm flagging your interest for a personal walkthrough.`,
      simplify: `${contactName} will reach out shortly to show you how we can help.`,
      engage: `In the meantime, you can start your free health check here: ${signupLink}`
    },
    warm: {
      answer: "Great. The free tier is perfect for getting started.",
      simplify: "You'll get a weekly report with tips tailored to portfolios like yours.",
      engage: `Sign up here: ${signupLink}`
    },
    cold: {
      answer: "Perfect place to start. Our free tools will help you evaluate your domains.",
      simplify: "",
      engage: `You can sign up and run your first scan in 2 minutes here: ${signupLink}`
    }
  };

  return messages[classification] || messages.cold;
};

module.exports = {
  generateChatbotResponse,
  scoreLeadFromConversation,
  getFinalMessage,
  matchIntent,
  CHATBOT_INTENTS
};

