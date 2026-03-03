const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const analyzeSocialLead = async (text, platform) => {
    // 1. Pre-filter: If text is too short, reject immediately
    if (!text || text.length < 15) return { intent: "irrelevant", score: "low" };

    const prompt = `
    You are an EXTREMELY STRICT lead qualification agent for 'Evolution.com' (A Premium Domain Name Marketplace).
    Your job is to filter out noise and only identify real, commercial leads.

    Platform: ${platform}
    Post: "${text.substring(0, 1000)}" 

    RULES FOR CLASSIFICATION (BE RUTHLESS):
    - "buyer": The user EXPLICITLY states they want to buy, purchase, or acquire a domain name right now.
    - "seller": The user EXPLICITLY states they own a domain and want to sell, auction, or appraise it.
    - "founder": The user is launching a startup, app, or business and explicitly needs help finding a brand name or a domain.
    - "irrelevant": Anything else. If they are talking about web hosting, DNS errors, SEO, coding (domain-driven design), or just general tech news, mark it "irrelevant". If you are unsure, mark it "irrelevant".

    Return JSON ONLY exactly matching this structure: 
    { 
        "reasoning": "Write 1 sentence explaining why this matches the specific intent rules.",
        "intent": "buyer|seller|founder|irrelevant", 
        "score": "high|medium|low", 
        "email": "extracted_email_or_null",
        "context": "Short summary of what they want", 
        "outreach": "A short, professional outreach message" 
    }
  `;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo", // Use gpt-4-turbo or gpt-4o for best reasoning
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.1 // Keep temperature low so it is strict and analytical
        });

        const result = JSON.parse(completion.choices[0].message.content);

        // Safety check: If AI marked it irrelevant, force score to low
        if (result.intent === "irrelevant") {
            result.score = "low";
        }

        return result;
    } catch (e) {
        console.error("AI Error:", e.message);
        return { intent: "irrelevant", score: "low", email: null, context: "error", outreach: "" };
    }
};

module.exports = { analyzeSocialLead };