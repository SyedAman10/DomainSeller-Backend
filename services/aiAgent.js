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
    conversationHistory = [],
    campaignInfo = {}
  } = context;

  console.log('🤖 AI AGENT - Generating Response');
  console.log(`   Domain: ${domainName}`);
  console.log(`   Buyer: ${buyerName}`);
  console.log(`   Message Length: ${buyerMessage.length} characters`);

  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured in environment variables');
    }

    // Extract customization settings
    const {
      askingPrice,
      minimumPrice,
      negotiationStrategy = 'flexible',
      responseStyle = 'professional',
      responseLength = 'medium',
      customInstructions = '',
      highlightFeatures = ''
    } = campaignInfo;

    // Build pricing guidance
    let pricingGuidance = '';
    if (askingPrice && minimumPrice) {
      pricingGuidance = `
PRICING STRATEGY:
- Asking Price: $${askingPrice}
- Minimum Acceptable: $${minimumPrice}
- Negotiation Approach: ${negotiationStrategy}

${negotiationStrategy === 'firm' ? 
  '- Stay firm on the asking price, justify the value' : 
  negotiationStrategy === 'flexible' ?
  '- Open to reasonable offers between minimum and asking price' :
  '- Very flexible, willing to negotiate closer to minimum price'}

- If they mention price concerns, present the value proposition
- If they make an offer below minimum, counter with asking price
- If they offer between minimum and asking, negotiate strategically
`;
    } else if (askingPrice) {
      pricingGuidance = `
PRICING INFO:
- Domain asking price: $${askingPrice}
- Emphasize value at this price point
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

SALES STRATEGY:
1. Address their concerns/questions directly
2. ${responseStyle === 'direct' ? 'State benefits clearly and move to action' : 'Build rapport and explain value proposition'}
3. ${negotiationStrategy === 'firm' ? 'Justify the asking price with concrete value' : 'Show flexibility while maintaining value perception'}
4. Create ${responseStyle === 'persuasive' ? 'strong urgency' : 'gentle urgency'} (mention other inquiries if appropriate)
5. ${responseLength === 'short' ? 'Quick call-to-action' : 'Detailed call-to-action with next steps'}

${customInstructions ? `CUSTOM INSTRUCTIONS:\n${customInstructions}` : ''}

RULES:
- Use buyer's name: ${buyerName}
- ${responseLength === 'short' ? 'Be extremely concise' : responseLength === 'long' ? 'Provide comprehensive details' : 'Balance detail with brevity'}
- ${responseStyle === 'direct' ? 'No unnecessary pleasantries' : 'Be personable and warm'}
- Never make false claims about the domain
- ${negotiationStrategy === 'firm' ? 'Stand firm on price' : 'Be open to negotiation'}
- Match the buyer's communication energy
- Always end with clear next steps

Remember: You're selling a premium digital asset that provides real business value.`
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
      content: `Buyer's latest message:\n\n${buyerMessage}\n\nGenerate a ${responseStyle} response that is ${responseLength} in length to convince them to buy ${domainName}.`
    });

    console.log('🚀 Calling OpenAI API...');
    console.log(`   Style: ${responseStyle}, Length: ${responseLength}`);
    if (askingPrice) console.log(`   Asking Price: $${askingPrice}`);
    if (minimumPrice) console.log(`   Min Price: $${minimumPrice}`);

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
        temperature: responseStyle === 'direct' ? 0.5 : 0.7,
        max_tokens: maxTokens,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
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

Best regards`;

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

