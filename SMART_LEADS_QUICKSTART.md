# 🎯 Smart Lead Generation System - Quick Start

## ✅ What Was Built

A **smart lead generation API** that:
1. ✅ Checks database for existing leads BEFORE scraping
2. ✅ Returns cached leads if they match your keyword
3. ✅ Only scrapes when necessary (saves $$$)
4. ✅ Never stores duplicate leads
5. ✅ Supports multiple Apify actors (code_crafter/leads-finder, Google Maps, LinkedIn, YellowPages)

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `services/smartLeadService.js` | Core lead generation logic with caching |
| `routes/leads.js` | Added 4 new API endpoints |
| `database/create_generated_leads.sql` | Database schema |
| `migrate-smart-leads.js` | Migration script |
| `test-smart-leads.js` | Test script |
| `SMART_LEAD_GENERATION_API.md` | Full documentation |

---

## 🚀 Setup (3 Steps)

### 1. Run Database Migration

```bash
node migrate-smart-leads.js
```

This creates the `generated_leads` table with duplicate prevention.

### 2. Add Apify API Key

In your `.env` file:
```env
APIFY_API_KEY=apify_api_xxxxxxxxxxxxxxxxx
```

Get your key from: https://console.apify.com/account/integrations

### 3. Restart Server

```bash
pm2 restart all
```

---

## 🎯 API Endpoints

### 1. Generate Leads (Smart)
```bash
POST /backend/leads/generate
{
  "keyword": "tech companies",
  "count": 5,
  "location": "NYC",        # optional
  "industry": "SaaS",       # optional
  "forceRefresh": false     # optional
}
```

**Response:**
- First time: Scrapes from Apify
- Second time: Returns from cache (no scraping!)
- Third time: Returns from cache (no scraping!)

### 2. Search Cached Leads
```bash
GET /backend/leads/search?keyword=tech&location=NYC&limit=10
```

Returns existing leads WITHOUT scraping.

### 3. Get Statistics
```bash
GET /backend/leads/stats
```

Shows total leads, email coverage, intent distribution, etc.

### 4. List Actors
```bash
GET /backend/leads/actors
```

Shows available Apify actors you can use.

---

## 💡 How It Works

```mermaid
User requests 5 "tech" leads
    ↓
Check database for "tech" leads
    ↓
├─ Found 5+ → Return immediately ✅ (No cost!)
├─ Found 2  → Return 2 + scrape 3 more 🔄 (Partial cost)
└─ Found 0  → Scrape 5 new leads 🆕 (Full cost)
    ↓
Store new leads in DB
    ↓
Skip if duplicate (email + website already exists)
    ↓
Return results
```

---

## 🧪 Test It

```bash
node test-smart-leads.js
```

This runs 5 tests:
1. Generate leads (should scrape)
2. Generate same leads (should use cache!)
3. Search cached leads
4. Get statistics
5. List available actors

---

## 📊 Example Usage

### JavaScript/Frontend

```javascript
// Generate 5 tech leads
const response = await fetch('https://api.3vltn.com/backend/leads/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyword: 'SaaS companies in San Francisco',
    count: 5
  })
});

const { data } = await response.json();

console.log(`Source: ${data.metadata.source}`); // "cache", "scraping", or "hybrid"
console.log(`Scraping Used: ${data.metadata.scrapingUsed}`); // true or false
console.log(`Cache Efficiency: ${data.metadata.cacheEfficiency}`); // e.g., "80%"

data.leads.forEach(lead => {
  console.log(`${lead.company_name} - ${lead.email}`);
});
```

### cURL

```bash
curl -X POST https://api.3vltn.com/backend/leads/generate \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "tech companies",
    "count": 5
  }'
```

---

## 🛡️ Duplicate Prevention

The database has a **UNIQUE constraint**:
```sql
UNIQUE(email, website)
```

**What This Means:**
- Same email + same website = ❌ SKIPPED (duplicate)
- Different email OR different website = ✅ STORED (new lead)
- You can scrape the same keyword 100 times = No duplicates!

---

## 💰 Cost Savings

### Before (No Caching):
```
Request 1: Scrape 5 leads → $0.10
Request 2: Scrape 5 leads → $0.10
Request 3: Scrape 5 leads → $0.10
Total: $0.30
```

### After (With Smart Caching):
```
Request 1: Scrape 5 leads → $0.10
Request 2: Return from cache → $0.00 ✅
Request 3: Return from cache → $0.00 ✅
Total: $0.10 (67% savings!)
```

---

## 🎯 Key Features

| Feature | Benefit |
|---------|---------|
| **Smart Caching** | Check DB before scraping |
| **Duplicate Prevention** | Never store same lead twice |
| **Multi-Actor Support** | Use different Apify actors |
| **Keyword Matching** | Find leads by keyword, location, industry |
| **Quality Scoring** | Confidence score (0-100) and intent (HOT/WARM/COLD) |
| **Cost Efficient** | 60-80% cost savings |

---

## 📚 Full Documentation

Read `SMART_LEAD_GENERATION_API.md` for:
- Complete API reference
- All request/response examples
- Lead object structure
- Best practices
- Troubleshooting

---

## 🔥 Quick Test

```bash
# 1. Run migration
node migrate-smart-leads.js

# 2. Test the API
node test-smart-leads.js

# 3. Try it yourself
curl -X POST http://localhost:5000/backend/leads/generate \
  -H "Content-Type: application/json" \
  -d '{"keyword": "tech companies", "count": 3}'
```

---

## ✨ That's It!

Your smart lead generation system is ready to use! 🚀

**Next Steps:**
1. Test with real keywords
2. Monitor cache efficiency via `/stats`
3. Integrate into your frontend
4. Save money on scraping costs!

Need help? Check `SMART_LEAD_GENERATION_API.md` for full docs.

