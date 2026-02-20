const axios = require('axios');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini'; // or gpt-3.5-turbo for cheaper

const extractRequiredToken = (customInstructions = '') => {
  if (!customInstructions || typeof customInstructions !== 'string') {
    return null;
  }

  const everyMessagePattern = /(every message|each message|every reply|each reply|in all messages)/i;
  if (!everyMessagePattern.test(customInstructions)) {
    return null;
  }

  if (/\bbuddy\b/i.test(customInstructions)) {
    return 'buddy';
  }

  const quotedTokenMatch = customInstructions.match(/["']([a-zA-Z][a-zA-Z0-9_-]{1,30})["']/);
  if (quotedTokenMatch) {
    return quotedTokenMatch[1];
  }

  return null;
};

const enforceRequiredTokenInReply = (reply = '', token = null) => {
  if (!reply || !token) {
    return reply;
  }

  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tokenRegex = new RegExp(`\\b${escapedToken}\\b`, 'i');
  if (tokenRegex.test(reply)) {
    return reply;
  }

  const signatureMatch = reply.match(/\n\s*Best regards,\s*\n/i);
  if (!signatureMatch || signatureMatch.index === undefined) {
    return `${reply.trim()}\n\nThanks, ${token}.`;
  }

  const signatureStart = signatureMatch.index;
  const body = reply.slice(0, signatureStart).trimEnd();
  const signature = reply.slice(signatureStart).trimStart();
  return `${body}\n\nThanks, ${token}.\n\n${signature}`;
};

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
      highlightFeatures = '',
      expiryDate,
      registrar
    } = campaignInfo;

    // Build pricing guidance
    let pricingGuidance = '';
    if (minimumPrice) {
      pricingGuidance = `
PRICING STRATEGY:
- **NEVER voluntarily mention the asking price in your response**
- Only discuss price if the buyer specifically asks "What's the price?" or "How much?"
- Asking Price: $${askingPrice || minimumPrice}
- Minimum Acceptable: $${minimumPrice}
- Negotiation Approach: ${negotiationStrategy}

${negotiationStrategy === 'firm' ? 
  '- If they ask about price, justify the value before mentioning any numbers' : 
  negotiationStrategy === 'flexible' ?
  '- If they ask about price, show openness to reasonable offers above $${minimumPrice}' :
  '- If they ask about price, be flexible and willing to work within their budget (above $${minimumPrice})'}

PRICE DISCUSSION RULES - CRITICAL:
- NEVER say "The asking price is..." unless they specifically asked
- If they don't mention price, focus on value, benefits, and asking if they're interested
- If they mention budget concerns, ask what they're comfortable with
- If they make an offer below $${minimumPrice}, politely decline: "I appreciate your offer, but the minimum I can accept is $${minimumPrice} given the domain's value. Would that work for you?"
- **CRITICAL: If they make an offer ABOVE $${minimumPrice} but BELOW the asking price, say:**
  "Thank you for your offer of $[their offer]. Let me check with the domain owner to see if they can accept this price. I'll get back to you shortly!"
- **NEVER ACCEPT ANY PRICE (even above minimum) without explicitly saying you need owner approval**
- **ONLY if their offer equals or exceeds the asking price of $${askingPrice || minimumPrice}, you can proceed with "Great! Let's move forward with the purchase."**
- Always emphasize VALUE over price
`;
    } else if (askingPrice) {
      pricingGuidance = `
PRICING INFO:
- **NEVER voluntarily mention the asking price unless buyer specifically asks**
- Asking Price: $${askingPrice}
- If they ask "What's the price?", then you can mention: $${askingPrice}
- Focus on value, benefits, and ROI rather than leading with price
- Let them express interest first, then discuss pricing

PRICE NEGOTIATION RULES:
- **CRITICAL: If buyer makes any offer BELOW asking price of $${askingPrice}, say:**
  "Thank you for your offer of $[their offer]. Let me check with the domain owner to see if they can accept this price. I'll get back to you shortly!"
- **NEVER accept any price lower than asking price without owner approval**
- **ONLY if their offer equals or exceeds $${askingPrice}, proceed with "Great! Let's move forward with the purchase."**
- Always require owner approval for any counter-offers
`;
    } else {
      pricingGuidance = `
PRICING INFO:
- **NEVER volunteer pricing information**
- If buyer asks about price, refer to "competitive market pricing" and ask their budget
- Focus on value, benefits, and ROI rather than price
- Build interest first, pricing comes later
- **For ANY price discussion, always say: "Let me discuss this with the domain owner and get back to you."**
- **NEVER accept or agree to any price on your own**
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

    let domainFactsSection = '';
    if (registrar || expiryDate) {
      domainFactsSection = `
DOMAIN REGISTRATION FACTS:
- Registrar: ${registrar || 'Not specified'}
- Expiry Date: ${expiryDate || 'Not specified'}
- If buyer asks about registrar or expiry, use these exact details.
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

${domainFactsSection}

CORE SELLING POINTS (if not mentioned above):
- SEO Benefits: Premium domains rank better
- Brand Value: Memorable, professional, credible
- Investment: Domains appreciate over time
- Instant Authority: Established domain = instant credibility
- Marketing Advantage: Easier to remember and share

RESPONSE STRATEGY - CRITICAL INSTRUCTIONS:

🚫 **STOP BEING A PUSHY SALESPERSON!** 🚫

YOU ARE HAVING A NORMAL CONVERSATION, NOT GIVING A SALES PITCH EVERY TIME.

EXAMPLES OF WHAT TO DO:

❌ BAD (what you're doing now):
Buyer: "Who owns this domain?"
You: "The domain is owned by me, [Name]. This premium domain offers significant value in terms of brand recognition and credibility within the tech industry... [300 words of sales pitch]"

✅ GOOD (what you should do):
Buyer: "Who owns this domain?"  
You: "Hi! I'm Syed Aman Ullah Naqvi. What would you like to know about the domain?"

❌ BAD:
Buyer: "What's the age of the domain?"
You: "The domain is 10 years old, which adds tremendous value... [long pitch about SEO, trust, credibility]"

✅ GOOD:
Buyer: "What's the age of the domain?"
You: "It's 10 years old. Anything else you'd like to know?"

RULES FOR EVERY RESPONSE:
1. **Answer their EXACT question in 1-2 sentences MAX**
2. **ONLY add sales points if they specifically ask about benefits/value/features**
3. **If they ask a factual question (who, what, when, where) → Answer ONLY that fact**
4. **Match their energy**: Short question = Short answer
5. **Keep responses conversational and friendly, not formal and salesy**
6. **DO NOT mention price unless they specifically ask**
7. **DO NOT talk about "brand value", "SEO benefits", "credibility" unless they ask**
8. **End with a simple question to keep conversation flowing**

${customInstructions ? `CUSTOM INSTRUCTIONS:\n${customInstructions}` : ''}

PAYMENT & STRIPE HANDLING - CRITICAL:
- If buyer asks about payment/how to pay: Simply acknowledge and confirm you're ready to help them proceed
- NEVER say "I'll send you the payment link" or "I'll send it shortly" - the system adds it automatically!
- Good response: "Great! Let's proceed with the transaction." or "Perfect! Ready to help you complete the purchase."
- NEVER promise to send anything separately - the payment link appears automatically below your response
- If they ask about payment security, briefly confirm: "Yes, we use Stripe for secure payments."
- Keep it natural and brief - the payment link is added automatically after your response
- **PAYMENT LINKS ARE ONLY SENT AT THE ASKING PRICE - ANY NEGOTIATED PRICE REQUIRES OWNER APPROVAL FIRST**

PRICE NEGOTIATION - ABSOLUTE RULES (NEVER BREAK THESE):
🚫 **YOU ARE NOT AUTHORIZED TO ACCEPT COUNTER-OFFERS WITHOUT OWNER APPROVAL** 🚫
- If buyer makes ANY offer below the asking price, you MUST say: "Thank you for your offer of $[amount]. Let me check with the domain owner and get back to you shortly."
- **NEVER say "Let's proceed" or "Great!" to any price below asking price**
- **NEVER agree to negotiate down without explicitly mentioning owner approval**
- Even if their offer is above minimum price, you still need owner approval
- ONLY proceed directly to payment if buyer agrees to pay the full asking price

CRITICAL RULES:
- Use buyer's name: ${buyerName}
- **NEVER say "The asking price is..." or "The price is..." unless they explicitly asked**
- **NEVER accept counter-offers without owner approval**
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
      content: `Buyer's latest message:\n\n${buyerMessage}\n\nRespond naturally and briefly. Answer their EXACT question in 1-3 sentences. DO NOT add sales pitches about "brand value", "SEO", "credibility" unless they specifically ask. Be conversational like a helpful friend, not a salesperson.

REMINDER: If this message contains a price offer below asking price, you MUST say you need to check with the owner first. NEVER accept counter-offers on your own.`
    });

    console.log('🚀 Calling OpenAI API...');
    console.log(`   Style: ${responseStyle}, Length: ${responseLength}`);
    if (askingPrice) console.log(`   Asking Price: $${askingPrice}`);
    if (minimumPrice) console.log(`   Min Price: $${minimumPrice}`);
    console.log(`   Signature in prompt: "${sellerName}${sellerEmail ? `\n${sellerEmail}` : ''}"`);
    console.log(`   Total messages in context: ${messages.length}`);

    // Adjust max_tokens based on response length (reduced to force brevity)
    const maxTokens = {
      short: 150,   // ~100-120 words - very brief
      medium: 250,  // ~180-200 words - conversational
      long: 400     // ~300-320 words - detailed when needed
    }[responseLength];

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: AI_MODEL,
        messages: messages,
        temperature: 0.7, // Higher for more natural, conversational responses
        max_tokens: maxTokens,
        presence_penalty: 0.3, // Lower to allow natural conversation flow
        frequency_penalty: 0.1  // Lower to avoid awkward phrasing
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiReply = response.data.choices[0].message.content.trim();
    const requiredToken = extractRequiredToken(customInstructions);
    const finalReply = enforceRequiredTokenInReply(aiReply, requiredToken);

    console.log('✅ AI Response Generated');
    console.log(`   Length: ${finalReply.length} characters`);
    console.log(`   Tokens Used: ${response.data.usage.total_tokens}`);
    if (requiredToken && finalReply !== aiReply) {
      console.log(`   Enforced custom instruction token: "${requiredToken}"`);
    }

    return {
      success: true,
      reply: finalReply,
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

    const requiredToken = extractRequiredToken(campaignInfo.customInstructions || '');
    const finalFallbackResponse = enforceRequiredTokenInReply(fallbackResponse, requiredToken);

    return {
      success: false,
      reply: finalFallbackResponse,
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
    wantsPaymentLink: false,
    hasPriceOffer: false,
    offeredPrice: null,
    sentiment: 'neutral'
  };

  // Check for price offers (numbers that might be offers)
  // Look for price patterns in the message
  const pricePatterns = [
    /\$\s*(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)/g,  // $2,500.00 or $2,500
    /\$\s*(\d+(?:\.\d{2})?)/g,  // $2500 or $2500.00
    /(\d{1,3}(?:,\d{3})+(?:\.\d{2})?)\s*(?:dollars?|usd|bucks)/gi,  // 2,500 dollars
    /(\d+(?:\.\d{2})?)\s*(?:dollars?|usd|bucks)/gi,  // 2500 dollars
    /(?:^|\s)(\d{3,})(?:\s|$)/g  // Plain numbers with 3+ digits (like "2350")
  ];
  
  let foundPrices = [];
  
  for (const pattern of pricePatterns) {
    const matches = [...message.matchAll(pattern)];
    for (const match of matches) {
      const priceStr = match[1].replace(/[$,\s]/g, '');
      const price = parseFloat(priceStr);
      
      // Consider it a price if it's between $100 and $1,000,000 (reasonable domain prices)
      if (price >= 100 && price <= 1000000) {
        foundPrices.push(price);
      }
    }
  }
  
  // Use the largest price found (most likely to be the actual offer)
  if (foundPrices.length > 0) {
    intent.hasPriceOffer = true;
    intent.offeredPrice = Math.max(...foundPrices);
    console.log(`💰 Detected price offer: $${intent.offeredPrice} (found: ${foundPrices.join(', ')})`);
  }

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

  // Payment link request - NEW!
  const paymentKeywords = [
    'payment link', 'pay link', 'how to pay', 'how do i pay', 'payment method',
    'send payment', 'payment details', 'how to purchase', 'buying process',
    'payment page', 'checkout', 'escrow', 'make payment', 'pay for', 'ready to buy',
    'need link', 'send link', 'give me link', 'want link', 'link please',
    'i need the link', 'send me the link', 'give me the link', 'where is the link',
    'can i get the link', 'share the link', 'provide link', 'link?'
  ];
  intent.wantsPaymentLink = paymentKeywords.some(keyword => lowerMessage.includes(keyword));

  // Determine sentiment
  if (intent.isReady || intent.wantsPaymentLink) intent.sentiment = 'very_positive';
  else if (intent.isInterested || intent.isNegotiating) intent.sentiment = 'positive';
  else if (intent.isPriceObjection) intent.sentiment = 'neutral';
  else if (intent.isNotInterested) intent.sentiment = 'negative';

  return intent;
};

module.exports = {
  generateAIResponse,
  analyzeBuyerIntent
};

