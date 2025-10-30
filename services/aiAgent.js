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

    // Build conversation context
    const messages = [
      {
        role: 'system',
        content: `You are an expert domain sales agent. Your goal is to convince buyers to purchase the domain "${domainName}".

PERSONALITY:
- Professional yet personable
- Persuasive without being pushy
- Knowledgeable about domain values
- Quick to respond to objections
- Always highlight domain benefits

SALES STRATEGY:
1. Address their concerns directly
2. Emphasize domain value (SEO, branding, memorability)
3. Create urgency (other interested parties, limited availability)
4. Overcome price objections with value justification
5. Offer flexible payment terms if price is mentioned
6. Always end with a call to action

TONE: ${campaignInfo.emailTone || 'professional'}

RULES:
- Keep responses concise (2-4 paragraphs max)
- Be authentic and genuine
- Never be desperate
- Don't make false claims
- Match the buyer's communication style
- Use the buyer's name naturally
- Sign off as the domain seller

Remember: You're selling a premium digital asset that can transform their business.`
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
      content: `Buyer's latest message:\n\n${buyerMessage}\n\nGenerate a persuasive response to convince them to buy ${domainName}.`
    });

    console.log('🚀 Calling OpenAI API...');

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: AI_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
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

