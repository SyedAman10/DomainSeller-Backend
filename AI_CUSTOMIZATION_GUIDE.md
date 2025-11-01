# 🎛️ AI Agent Fine-Tuning Guide

Complete customization options for your AI email agent.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Pricing & Negotiation](#pricing--negotiation)
3. [Communication Style](#communication-style)
4. [Response Length](#response-length)
5. [Custom Instructions](#custom-instructions)
6. [API Examples](#api-examples)

---

## Overview

Fine-tune your AI agent's behavior for each campaign. Control pricing strategy, communication style, response length, and add custom instructions.

---

## Pricing & Negotiation

### **Asking Price**
Set your initial asking price for the domain.

```javascript
askingPrice: 500  // $500
```

**Effect:** AI will mention this price when buyers ask about cost.

---

### **Minimum Price**
Lowest price you'll accept (AI will negotiate down to this).

```javascript
minimumPrice: 400  // $400
```

**Effect:** 
- AI can negotiate between $400-$500
- Won't accept offers below $400
- Will counter-offer strategically

---

### **Negotiation Strategy**

Choose how flexible the AI should be:

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `firm` | Stays close to asking price, justifies value | Premium domains, high-value assets |
| `flexible` | Moderate negotiation, balanced approach | Most domains, standard sales |
| `very_flexible` | Negotiates aggressively toward minimum | Quick sales, motivated sellers |

**Example:**
```javascript
negotiationStrategy: "flexible"
```

**How it works:**
- **Firm:** "The asking price of $500 reflects the true market value..."
- **Flexible:** "I'm open to reasonable offers around $500..."
- **Very Flexible:** "I'm motivated to sell and can work with your budget..."

---

## Communication Style

Choose AI personality and tone:

### **Professional** (Default)
```javascript
responseStyle: "professional"
```
- Formal language
- Business-focused
- Maintains authority
- Best for: Corporate buyers, B2B

**Example:** "I appreciate your inquiry regarding the domain. This premium asset offers substantial SEO benefits..."

---

### **Casual**
```javascript
responseStyle: "casual"
```
- Conversational tone
- Friendly language
- Relatable examples
- Best for: Small businesses, individuals

**Example:** "Hey! Thanks for reaching out about the domain. It's actually a great choice because..."

---

### **Friendly**
```javascript
responseStyle: "friendly"
```
- Warm and approachable
- Build rapport
- Personable
- Best for: First-time buyers, relationship building

**Example:** "Hi there! I'm so glad you're interested! Let me tell you why this domain is perfect..."

---

### **Direct**
```javascript
responseStyle: "direct"
```
- Straight to the point
- No fluff
- Clear statements
- Best for: Busy professionals, quick decisions

**Example:** "Domain: $500. Premium .com. Includes transfer support. Ready to proceed?"

---

### **Persuasive**
```javascript
responseStyle: "persuasive"
```
- Strong call-to-actions
- Emphasize benefits
- Create urgency
- Best for: Competitive markets, high-value sales

**Example:** "This domain won't last long at $500. Three other buyers have inquired this week. Shall I reserve it for you?"

---

## Response Length

Control how verbose the AI is:

### **Short**
```javascript
responseLength: "short"
```
- 1-2 paragraphs
- Very concise
- Bullet points
- Best for: Quick updates, busy buyers

**Example:**
```
Hi John,

Thanks for your interest! Domain: $500. Premium .com with great SEO potential.

Interested? Let's proceed.
```

---

### **Medium** (Default)
```javascript
responseLength: "medium"
```
- 2-4 paragraphs
- Balanced detail
- Clear structure
- Best for: Most situations

**Example:**
```
Hi John,

Thanks for reaching out about example.com! This is a premium domain 
that offers excellent branding potential.

The asking price is $500, which reflects its market value as a short, 
memorable .com domain. It includes SEO benefits and instant credibility.

I'm happy to discuss payment options or answer any questions. Would you 
like to move forward?

Best regards
```

---

### **Long**
```javascript
responseLength: "long"
```
- 4-6 paragraphs
- Detailed explanations
- Comprehensive info
- Best for: High-value domains, detailed inquiries

**Example:**
```
Hi John,

Thank you so much for your interest in example.com! I'm excited to discuss 
this opportunity with you.

This domain is a premium digital asset that offers several key advantages:
- SEO Benefits: Premium domains rank 40% better in search results
- Brand Authority: Instant credibility with a .com domain
- Marketing Value: Easy to remember and share
- Investment Potential: Domains appreciate 10-15% annually

The asking price is $500, which is actually below market value for a domain 
of this quality. Comparable domains in this space sell for $800-$1200.

I'm flexible on payment terms and can offer a payment plan if that helps. 
The transfer process is straightforward and includes full support from me.

Several other buyers have expressed interest, so I'd recommend moving 
quickly if you're serious. Would you like me to send over the purchase 
agreement?

Looking forward to working with you!

Best regards
```

---

## Custom Instructions

Add specific instructions for the AI agent.

```javascript
customInstructions: "Always mention the domain has been owned for 5 years and 
has clean history. Emphasize it's perfect for tech startups. Never mention 
competitors by name."
```

**Use cases:**
- Domain history/age
- Target audience specifics
- Unique selling points
- Things to avoid mentioning
- Special offers/bonuses

---

## Highlight Features

Key domain features to emphasize.

```javascript
highlightFeatures: `
- Short, 4-letter domain (very rare)
- Exact match for popular keyword
- Aged domain (15 years old)
- Clean backlink profile
- Previous owner: Fortune 500 company
`
```

**The AI will naturally weave these into responses.**

---

## API Examples

### **Get Current Settings**

```bash
curl https://3vltn.com/api/campaigns/campaign_123/ai-settings
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "campaign_id": "campaign_123",
    "campaign_name": "Campaign for mine.com",
    "auto_response_enabled": true,
    "notification_email": "owner@example.com",
    "asking_price": 500.00,
    "minimum_price": 400.00,
    "negotiation_strategy": "flexible",
    "response_style": "professional",
    "response_length": "medium",
    "custom_instructions": "Mention 10-year age",
    "highlight_features": "Short, memorable, .com"
  }
}
```

---

### **Update Settings - Basic**

```bash
curl -X PUT https://3vltn.com/api/campaigns/campaign_123/ai-settings \
  -H "Content-Type: application/json" \
  -d '{
    "askingPrice": 500,
    "minimumPrice": 400,
    "negotiationStrategy": "flexible"
  }'
```

---

### **Update Settings - Full Customization**

```bash
curl -X PUT https://3vltn.com/api/campaigns/campaign_123/ai-settings \
  -H "Content-Type: application/json" \
  -d '{
    "askingPrice": 5000,
    "minimumPrice": 3500,
    "negotiationStrategy": "firm",
    "responseStyle": "persuasive",
    "responseLength": "long",
    "customInstructions": "Always mention Fortune 500 previous owner. Emphasize enterprise value.",
    "highlightFeatures": "- 15 year old domain\n- Clean backlink profile\n- Previously owned by tech giant\n- Exact keyword match"
  }'
```

---

### **Quick Presets**

#### **Preset 1: Quick Sale**
```json
{
  "askingPrice": 500,
  "minimumPrice": 350,
  "negotiationStrategy": "very_flexible",
  "responseStyle": "direct",
  "responseLength": "short"
}
```

#### **Preset 2: Premium Domain**
```json
{
  "askingPrice": 10000,
  "minimumPrice": 8000,
  "negotiationStrategy": "firm",
  "responseStyle": "persuasive",
  "responseLength": "long"
}
```

#### **Preset 3: Friendly Approach**
```json
{
  "askingPrice": 1000,
  "minimumPrice": 750,
  "negotiationStrategy": "flexible",
  "responseStyle": "friendly",
  "responseLength": "medium"
}
```

---

## Complete Example

### **Scenario: Premium Tech Domain**

```bash
curl -X PUT https://3vltn.com/api/campaigns/campaign_techstar/ai-settings \
  -H "Content-Type: application/json" \
  -d '{
    "autoResponseEnabled": true,
    "notificationEmail": "owner@company.com",
    "askingPrice": 15000,
    "minimumPrice": 12000,
    "negotiationStrategy": "firm",
    "responseStyle": "professional",
    "responseLength": "long",
    "customInstructions": "Target audience is tech startups and SaaS companies. Mention that similar domains sold for $20k+. Emphasize investment potential and brand authority.",
    "highlightFeatures": "- Premium 2-word .com\n- Tech industry keyword\n- 18 years old\n- Zero trademark conflicts\n- High search volume (50k/month)\n- Previous Fortune 500 owner"
  }'
```

### **Expected AI Behavior:**

**Buyer:** "Is this domain worth $15k?"

**AI Response:**
```
Dear [Buyer],

Thank you for your inquiry about techstar.com. Yes, the $15,000 asking 
price reflects the true market value of this premium digital asset, and 
here's why:

DOMAIN QUALITY:
- Premium 2-word .com combination
- 18-year domain age (established 2007)
- Zero trademark conflicts
- High search volume: 50,000 monthly searches
- Previously owned by a Fortune 500 technology company

MARKET COMPARISON:
Similar domains in the tech space have sold for $20,000-$35,000 in recent 
transactions. At $15,000, this represents exceptional value.

BUSINESS IMPACT:
For tech startups and SaaS companies, this domain provides:
- Instant industry authority and credibility
- 40% better SEO performance vs. new domains
- Professional brand positioning
- Long-term investment appreciation (domains appreciate 10-15% annually)

INVESTMENT PERSPECTIVE:
Premium .com domains in high-demand industries are increasingly scarce. 
This domain represents both an operational asset and an appreciating 
investment for your business.

I maintain a firm pricing position given the domain's quality and market 
conditions. However, I'm happy to discuss payment terms or answer specific 
questions about the transfer process.

Would you like to schedule a call to discuss how this domain fits your 
business objectives?

Best regards
```

---

## Tips & Best Practices

### ✅ **Do:**
- Set realistic price ranges (min should be 60-80% of asking)
- Match style to your target audience
- Use custom instructions for unique selling points
- Test different combinations
- Update settings based on buyer feedback

### ❌ **Don't:**
- Set minimum = asking (removes negotiation flexibility)
- Use "direct" style for complex sales
- Make unrealistic claims in custom instructions
- Copy-paste generic features
- Forget to set notification email

---

## Frontend Integration

```javascript
// Get settings
const settings = await fetch('/api/campaigns/campaign_123/ai-settings')
  .then(r => r.json());

// Update settings
await fetch('/api/campaigns/campaign_123/ai-settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    askingPrice: 500,
    minimumPrice: 400,
    negotiationStrategy: 'flexible',
    responseStyle: 'professional',
    responseLength: 'medium',
    customInstructions: 'Mention 10-year history',
    highlightFeatures: '- Short .com\n- Tech keyword'
  })
});
```

---

## Summary

**Your AI agent can now:**
✅ Negotiate within your price range  
✅ Match your preferred communication style  
✅ Adjust response length to situation  
✅ Follow custom instructions  
✅ Highlight specific domain features  
✅ Adapt strategy per campaign  

**Test it by replying to a campaign email and see the customized AI in action!** 🚀

