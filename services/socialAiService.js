const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const analyzeSocialLead = async (text, platform) => {
    if (!text || text.length < 10) return { intent: "irrelevant", score: "low" };

    const prompt = `
    You are a lead qualification agent for 'Evolution.com' (Domain Marketplace).
    Platform: ${platform}
    Post: "${text.substring(0, 1000)}" 

    Classify intent: "buyer", "seller", "founder", "investor", "irrelevant".
    Score: "high", "medium", "low".
    
    If relevant, draft a short, helpful outreach message.
    
    Return JSON ONLY: { "intent": "...", "score": "...", "context": "...", "outreach": "..." }
  `;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0
        });
        return JSON.parse(completion.choices[0].message.content);
    } catch (e) {
        console.error("AI Error:", e.message);
        return { intent: "irrelevant", score: "low", context: "error", outreach: "" };
    }
};

module.exports = { analyzeSocialLead };