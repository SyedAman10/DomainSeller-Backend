const axios = require('axios');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini'; // or gpt-3.5-turbo for cheaper

/**
 * Generate AI response to buyer's email using OpenAI
 * @param {Object} context - Email context
 * @returns {Promise<Object>} AI generated response
 */
const generateAIResponse = async (context) => {
  const {
    buyerMessage,
    domainName,
    buyerName,
    sellerName = 'Domain Seller',
    sellerEmail = '',
    conversationHistory = [],
    campaignInfo = {}
  } = context;

  console.log('🤖 AI AGENT - Generating Response');
  console.log(`   Domain: ${domainName}`);
  console.log(`   Buyer: ${buyerName}`);
  console.log(`   Seller Name: "${sellerName}" (type: ${typeof sellerName}, length: ${sellerName?.length || 0})`);
  console.log(`   Seller Email: "${sellerEmail}" (type: ${typeof sellerEmail}, length: ${sellerEmail?.length || 0})`);
  console.log(`   Message Length: ${buyerMessage.length} characters`);
  
  // Validate seller info
  if (!sellerName || sellerName === 'Domain Seller' || sellerName.includes('[Your Name]')) {
    console.warn(`⚠️  WARNING: Seller name is placeholder or missing! Value: "${sellerName}"`);
  }
  if (!sellerEmail || sellerEmail.length === 0) {
    console.warn(`⚠️  WARNING: Seller email is empty!`);
  }

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured in environment variables');
    }

    // Extract customization settings
    const {
      askingPrice,  // This can be passed from email content or domain data
      minimumPrice,
      negotiationStrategy = 'flexible',
      responseStyle = 'professional',
      responseLength = 'medium',
      customInstructions = '',
      highlightFeatures = ''
    } = campaignInfo;

    // Build pricing guidance
    let pricingGuidance = '';
    if (minimumPrice) {
      pricingGuidance = `
PRICING STRATEGY:
- **NEVER voluntarily mention the asking price in your response**
- Only discuss price if the buyer specifically asks "What's the price?" or "How much?"
- Minimum Acceptable: $${minimumPrice}
- Negotiation Approach: ${negotiationStrategy}

${negotiationStrategy === 'firm' ? 
  '- If they ask about price, justify the value before mentioning any numbers' : 
  negotiationStrategy === 'flexible' ?
  '- If they ask about price, show openness to reasonable offers above $${minimumPrice}' :
  '- If they ask about price, be flexible and willing to work within their budget (above $${minimumPrice})'}

PRICE DISCUSSION RULES:
- NEVER say "The asking price is..." unless they specifically asked
- If they don't mention price, focus on value, benefits, and asking if they're interested
- If they mention budget concerns, ask what they're comfortable with
- If they make an offer below $${minimumPrice}, politely counter: "I appreciate your offer, but the minimum I can accept is $${minimumPrice} given the domain's value"
- If they make an offer above $${minimumPrice}, negotiate strategically
- Always emphasize VALUE over price
`;
    } else if (askingPrice) {
      pricingGuidance = `
PRICING INFO:
- **NEVER voluntarily mention the asking price unless buyer specifically asks**
- If they ask "What's the price?", then you can mention: $${askingPrice}
- Focus on value, benefits, and ROI rather than leading with price
- Let them express interest first, then discuss pricing
`;
    } else {
      pricingGuidance = `
PRICING INFO:
- **NEVER volunteer pricing information**
- If buyer asks about price, refer to "competitive market pricing" and ask their budget
- Focus on value, benefits, and ROI rather than price
- Build interest first, pricing comes later
`;
    }

    // Build style guidance
    const styleInstructions = {
      professional: 'Maintain professional tone, formal language, business-focused',
      casual: 'Use conversational tone, friendly language, relatable examples',
      friendly: 'Warm and approachable, build rapport, personable communication',
      direct: 'Get straight to the point, concise, no fluff, clear statements',
      persuasive: 'Strong call-to-actions, emphasize benefits, create urgency'
    };

    const lengthInstructions = {
      short: '1-2 paragraphs maximum, very concise, bullet points where appropriate',
      medium: '2-4 paragraphs, balanced detail, clear structure',
      long: '4-6 paragraphs, detailed explanations, comprehensive information'
    };

    // Build features section
    let featuresSection = '';
    if (highlightFeatures) {
      featuresSection = `
KEY DOMAIN FEATURES TO EMPHASIZE:
${highlightFeatures}
`;
    }

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are an expert domain sales agent selling the domain "${domainName}".

COMMUNICATION STYLE: ${responseStyle.toUpperCase()}
${styleInstructions[responseStyle]}

RESPONSE LENGTH: ${responseLength.toUpperCase()}
${lengthInstructions[responseLength]}

${pricingGuidance}

${featuresSection}

CORE SELLING POINTS (if not mentioned above):
- SEO Benefits: Premium domains rank better
- Brand Value: Memorable, professional, credible
- Investment: Domains appreciate over time
- Instant Authority: Established domain = instant credibility
- Marketing Advantage: Easier to remember and share

RESPONSE STRATEGY - READ THIS CAREFULLY:
1. **FIRST: Answer their specific question directly and concisely** - Don't deflect or avoid
2. **THEN: Only add sales points if natural and appropriate to the conversation flow**
3. Match the buyer's communication style:
   - If they ask a quick question → Give a quick, direct answer
   - If they're casual/friendly → Be casual/friendly back  
   - If they're detailed/formal → Provide more detail
4. **NOT EVERY MESSAGE NEEDS TO BE A SALES PITCH**
5. Have a natural conversation - you're a helpful person, not a pushy salesperson
6. **DO NOT mention price unless they specifically ask** - focus on answering their questions
7. If they ask something simple (like "who owns this?", "when was it registered?", etc.), just answer it briefly
8. If they ask about budget, ask what they're comfortable with first

${customInstructions ? `CUSTOM INSTRUCTIONS:\n${customInstructions}` : ''}

CRITICAL RULES:
- Use buyer's name: ${buyerName}
- **NEVER say "The asking price is..." or "The price is..." unless they explicitly asked**
- If they didn't ask about price, focus on interest, value, and benefits
- ${responseLength === 'short' ? 'Be extremely concise' : responseLength === 'long' ? 'Provide comprehensive details' : 'Balance detail with brevity'}
- ${responseStyle === 'direct' ? 'No unnecessary pleasantries' : 'Be personable and warm'}
- Never make false claims about the domain
- Match the buyer's communication energy
- Always end with clear next steps or questions to keep conversation going

EMAIL SIGNATURE - CRITICAL:
- You MUST end EVERY email with this EXACT signature (copy it exactly as shown):
  
  Best regards,
  ${sellerName}${sellerEmail ? `\n${sellerEmail}` : ''}

- NEVER use placeholders like [Your Name], [Your Contact Information], [Your Email], etc.
- NEVER make up a name - use EXACTLY: ${sellerName}
- NEVER make up an email - use EXACTLY: ${sellerEmail}
- Copy the signature exactly as shown above, word for word
- This is a MANDATORY requirement - failure to use the correct signature is unacceptable

Remember: Build interest and value FIRST. Price discussion comes ONLY when they ask or show strong interest.`
      }
    ];

    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role === 'buyer' ? 'user' : 'assistant',
        content: msg.content
      });
    });

    // Add current buyer message
    messages.push({
      role: 'user',
      content: `Buyer's latest message:\n\n${buyerMessage}\n\nGenerate a ${responseStyle} response that is ${responseLength} in length. FIRST answer their question directly, THEN add value points only if appropriate. Be conversational and helpful, not pushy.`
    });

    console.log('🚀 Calling OpenAI API...');
    console.log(`   Style: ${responseStyle}, Length: ${responseLength}`);
    if (askingPrice) console.log(`   Asking Price: $${askingPrice}`);
    if (minimumPrice) console.log(`   Min Price: $${minimumPrice}`);
    console.log(`   Signature in prompt: "${sellerName}${sellerEmail ? `\n${sellerEmail}` : ''}"`);
    console.log(`   Total messages in context: ${messages.length}`);

    // Adjust max_tokens based on response length
    const maxTokens = {
      short: 250,
      medium: 500,
      long: 800
    }[responseLength];

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: AI_MODEL,
        messages: messages,
        temperature: responseStyle === 'direct' ? 0.4 : 0.6, // Lower temperature for more focused responses
        max_tokens: maxTokens,
        presence_penalty: 0.5, // Reduced to allow natural repetition when needed
        frequency_penalty: 0.2  // Reduced to allow natural phrasing
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiReply = response.data.choices[0].message.content.trim();

    console.log('✅ AI Response Generated');
    console.log(`   Length: ${aiReply.length} characters`);
    console.log(`   Tokens Used: ${response.data.usage.total_tokens}`);

    return {
      success: true,
      reply: aiReply,
      tokensUsed: response.data.usage.total_tokens,
      model: AI_MODEL
    };

  } catch (error) {
    console.error('❌ AI Generation Failed:', error.response?.data || error.message);
    
    // Fallback response if AI fails
    const fallbackResponse = `Hi ${buyerName},

Thank you for your interest in ${domainName}. I'd love to discuss this opportunity with you further.

${domainName} is a premium domain that offers excellent branding potential and SEO benefits for your business.

Could you let me know what specific questions you have? I'm here to help and can provide more details about the domain's value and transfer process.

Looking forward to hearing from you!

Best regards,
${sellerName}${sellerEmail ? `\n${sellerEmail}` : ''}`;

    return {
      success: false,
      reply: fallbackResponse,
      error: error.response?.data?.error?.message || error.message,
      usingFallback: true
    };
  }
};

/**
 * Analyze buyer sentiment and intent
 * @param {String} message - Buyer's message
 * @returns {Object} Sentiment analysis
 */
const analyzeBuyerIntent = (message) => {
  const lowerMessage = message.toLowerCase();
  
  const intent = {
    isInterested: false,
    isPriceObjection: false,
    isNegotiating: false,
    isReady: false,
    isNotInterested: false,
    hasQuestions: false,
    sentiment: 'neutral'
  };

  // Interest indicators
  const interestKeywords = ['interested', 'like', 'want', 'consider', 'looking', 'need', 'how'];
  intent.isInterested = interestKeywords.some(word => lowerMessage.includes(word));

  // Price objection
  const priceKeywords = ['expensive', 'too much', 'price', 'cost', 'cheaper', 'budget', 'afford'];
  intent.isPriceObjection = priceKeywords.some(word => lowerMessage.includes(word));

  // Negotiation
  const negotiationKeywords = ['offer', 'negotiate', 'lower', 'discount', 'deal', 'payment plan'];
  intent.isNegotiating = negotiationKeywords.some(word => lowerMessage.includes(word));

  // Ready to buy
  const readyKeywords = ['buy', 'purchase', 'proceed', 'next steps', 'payment', 'transfer'];
  intent.isReady = readyKeywords.some(word => lowerMessage.includes(word));

  // Not interested
  const notInterestedKeywords = ['not interested', 'no thanks', 'pass', 'unsubscribe', 'stop'];
  intent.isNotInterested = notInterestedKeywords.some(word => lowerMessage.includes(word));

  // Questions
  const questionIndicators = ['?', 'what', 'how', 'when', 'where', 'why', 'can you'];
  intent.hasQuestions = questionIndicators.some(word => lowerMessage.includes(word));

  // Determine sentiment
  if (intent.isReady) intent.sentiment = 'very_positive';
  else if (intent.isInterested || intent.isNegotiating) intent.sentiment = 'positive';
  else if (intent.isPriceObjection) intent.sentiment = 'neutral';
  else if (intent.isNotInterested) intent.sentiment = 'negative';

  return intent;
};

module.exports = {
  generateAIResponse,
  analyzeBuyerIntent
};

