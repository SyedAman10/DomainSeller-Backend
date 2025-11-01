# 🎛️ AI Agent Customization - Quick Guide

## ⚡ **What You Can Customize**

### **1. Minimum Price** 💰
Set the lowest price you'll accept. AI will negotiate down to this.

```json
{
  "minimumPrice": 400
}
```

**Note:** Asking price is already set in your campaign/domain. Only set minimum here.

---

### **2. Negotiation Strategy**
- `firm` - Stay close to asking price
- `flexible` - Moderate negotiation (default)
- `very_flexible` - Negotiate aggressively

---

### **3. Response Style**
- `professional` - Formal, business-focused
- `casual` - Conversational, friendly
- `friendly` - Warm, build rapport
- `direct` - No fluff, straight to point
- `persuasive` - Strong urgency

---

### **4. Response Length**
- `short` - 1-2 paragraphs
- `medium` - 2-4 paragraphs (default)
- `long` - 4-6 paragraphs

---

### **5. Custom Instructions**
```json
{
  "customInstructions": "Mention 10-year domain age. Target tech startups."
}
```

---

### **6. Highlight Features**
```json
{
  "highlightFeatures": "- Short 4-letter .com\n- Aged 15 years\n- Clean history"
}
```

---

## 🚀 **Quick Update**

```bash
curl -X PUT https://3vltn.com/api/campaigns/campaign_123/ai-settings \
  -H "Content-Type: application/json" \
  -d '{
    "minimumPrice": 400,
    "negotiationStrategy": "flexible",
    "responseStyle": "professional",
    "responseLength": "medium",
    "customInstructions": "Mention domain age",
    "highlightFeatures": "- Short .com\n- Tech keyword"
  }'
```

---

## 📖 **Full Documentation**

See `AI_CUSTOMIZATION_GUIDE.md` for complete details.

---

## ✅ **Summary**

**Only set minimum price** - asking price comes from your campaign  
**Choose style** - match your brand voice  
**Set length** - how detailed responses should be  
**Add instructions** - specific guidance for AI  
**Highlight features** - key selling points  

**Test by replying to a campaign email!** 🎯

