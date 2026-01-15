# 🎯 Smart Lead Generation API - Complete Documentation

## Overview
This API provides intelligent lead generation using Apify actors with **smart caching** to prevent duplicate leads and minimize scraping costs.

### Key Features:
✅ **Smart Caching** - Checks database before scraping
✅ **Duplicate Prevention** - Never stores the same lead twice  
✅ **Cost Efficient** - Only scrapes when necessary
✅ **Multi-Actor Support** - Works with multiple Apify actors
✅ **Keyword Matching** - Returns cached leads matching your criteria

---

## 🔑 **How It Works**

```
User Request: "Give me 5 tech leads"
    ↓
1. Check Database
    ├─ Found 5+ cached leads? → Return immediately ✅
    ├─ Found 2 cached leads? → Return 2 + scrape 3 more 🔄
    └─ Found 0 cached leads? → Scrape all 5 new leads 🆕
    ↓
2. Store New Leads (if scraped)
    └─ Duplicate check → Skip if exists
    ↓
3. Return Results
```

---

## 📡 **API Endpoints**

### 1. **Generate Leads** (Smart Caching)

**Endpoint:** `POST /backend/leads/generate`

**Description:** Intelligently generates leads by checking cache first, then scraping only if needed.

**Request Body:**
```json
{
  "keyword": "tech companies in NYC",
  "count": 5,
  "location": "New York",
  "industry": "Technology",
  "actor": "code_crafter/leads-finder",
  "forceRefresh": false
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `keyword` | String | ✅ Yes | Search keyword/query (e.g., "SaaS companies", "ecommerce stores") |
| `count` | Number | No | Number of leads (1-100, default: 5) |
| `location` | String | No | Location filter (e.g., "San Francisco", "California") |
| `industry` | String | No | Industry filter (e.g., "Technology", "Healthcare") |
| `actor` | String | No | Apify actor to use (default: `code_crafter/leads-finder`) |
| `forceRefresh` | Boolean | No | Skip cache and force new scraping (default: false) |

**Response (From Cache):**
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": 123,
        "company_name": "TechCorp Inc",
        "email": "contact@techcorp.com",
        "phone": "+1-555-0123",
        "website": "https://techcorp.com",
        "location": "New York, NY",
        "city": "New York",
        "country": "United States",
        "industry": "Technology",
        "title": "TechCorp - Leading Software Solutions",
        "description": "We build innovative software...",
        "linkedin_url": "https://linkedin.com/company/techcorp",
        "contact_person": "John Doe",
        "employee_count": 150,
        "confidence_score": 85,
        "intent": "HOT",
        "created_at": "2026-01-15T10:30:00.000Z"
      }
    ],
    "metadata": {
      "keyword": "tech companies in NYC",
      "requested": 5,
      "returned": 5,
      "totalFound": 5,
      "source": "cache",
      "fromCache": 5,
      "fromScraping": 0,
      "scrapingUsed": false,
      "cacheEfficiency": "100%"
    }
  }
}
```

**Response (Hybrid - Cache + Scraping):**
```json
{
  "success": true,
  "data": {
    "leads": [ /* ... 5 leads ... */ ],
    "metadata": {
      "keyword": "tech companies in NYC",
      "requested": 5,
      "returned": 5,
      "totalFound": 5,
      "source": "hybrid",
      "fromCache": 2,
      "fromScraping": 3,
      "scrapingUsed": true,
      "cacheEfficiency": "40%"
    }
  }
}
```

**Response (Fresh Scraping):**
```json
{
  "success": true,
  "data": {
    "leads": [ /* ... 5 leads ... */ ],
    "metadata": {
      "keyword": "tech companies in NYC",
      "requested": 5,
      "returned": 5,
      "totalFound": 5,
      "source": "scraping",
      "fromCache": 0,
      "fromScraping": 5,
      "scrapingUsed": true,
      "cacheEfficiency": "0%"
    }
  }
}
```

---

### 2. **Search Cached Leads**

**Endpoint:** `GET /backend/leads/search`

**Description:** Search existing cached leads without triggering any scraping.

**Query Parameters:**
```
GET /backend/leads/search?keyword=tech&location=NYC&industry=SaaS&limit=10
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keyword` | String | ✅ Yes | Search keyword |
| `location` | String | No | Location filter |
| `industry` | String | No | Industry filter |
| `limit` | Number | No | Max results (default: 10, max: 100) |

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": [
      { /* lead object */ }
    ],
    "count": 3,
    "keyword": "tech",
    "filters": {
      "location": "NYC",
      "industry": "SaaS"
    }
  }
}
```

---

### 3. **Get Lead Statistics**

**Endpoint:** `GET /backend/leads/stats`

**Description:** Get statistics about your cached leads.

**Query Parameters:**
```
GET /backend/leads/stats?keyword=tech
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLeads": 1250,
    "uniqueQueries": 45,
    "actorsUsed": 2,
    "leadsWithEmail": 980,
    "leadsWithPhone": 750,
    "intentDistribution": {
      "hot": 450,
      "warm": 600,
      "cold": 200
    },
    "averageConfidence": 72,
    "dateRange": {
      "first": "2025-12-01T10:00:00.000Z",
      "latest": "2026-01-15T14:30:00.000Z"
    },
    "emailCoverage": "78%",
    "phoneCoverage": "60%"
  }
}
```

---

### 4. **List Available Actors**

**Endpoint:** `GET /backend/leads/actors`

**Description:** Get list of supported Apify actors for lead generation.

**Response:**
```json
{
  "success": true,
  "data": {
    "actors": {
      "LEADS_FINDER": "code_crafter/leads-finder",
      "GOOGLE_MAPS": "nwua9/google-maps-scraper",
      "LINKEDIN": "socialminer/linkedin-scraper",
      "YELLOWPAGES": "epctex/yellowpages-scraper"
    },
    "default": "code_crafter/leads-finder",
    "description": {
      "code_crafter/leads-finder": "Generic leads finder with email/phone extraction",
      "nwua9/google-maps-scraper": "Scrapes business data from Google Maps",
      "socialminer/linkedin-scraper": "Extracts professional profiles from LinkedIn",
      "epctex/yellowpages-scraper": "Scrapes business listings from Yellow Pages"
    }
  }
}
```

---

## 💡 **Usage Examples**

### Example 1: Generate 5 Tech Leads

```javascript
const response = await fetch('https://api.3vltn.com/backend/leads/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyword: 'tech companies in San Francisco',
    count: 5,
    location: 'San Francisco',
    industry: 'Technology'
  })
});

const { data } = await response.json();

console.log(`Source: ${data.metadata.source}`);
console.log(`Cache Efficiency: ${data.metadata.cacheEfficiency}`);
console.log(`Scraping Used: ${data.metadata.scrapingUsed}`);

data.leads.forEach(lead => {
  console.log(`
    Company: ${lead.company_name}
    Email: ${lead.email}
    Phone: ${lead.phone}
    Website: ${lead.website}
    Confidence: ${lead.confidence_score}%
  `);
});
```

### Example 2: Search Existing Leads (No Scraping)

```javascript
const response = await fetch(
  'https://api.3vltn.com/backend/leads/search?keyword=ecommerce&location=NYC&limit=10'
);

const { data } = await response.json();

console.log(`Found ${data.count} cached leads`);
data.leads.forEach(lead => {
  console.log(`${lead.company_name} - ${lead.email}`);
});
```

### Example 3: Force Fresh Scraping

```javascript
// Ignore cache and get fresh leads
const response = await fetch('https://api.3vltn.com/backend/leads/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyword: 'SaaS startups',
    count: 10,
    forceRefresh: true  // ⚡ Force new scraping
  })
});
```

### Example 4: Use Different Apify Actor

```javascript
// Use Google Maps scraper instead
const response = await fetch('https://api.3vltn.com/backend/leads/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyword: 'restaurants in Manhattan',
    count: 20,
    actor: 'nwua9/google-maps-scraper'  // 🗺️ Google Maps
  })
});
```

---

## 🛡️ **Duplicate Prevention**

The system prevents duplicates using a **UNIQUE constraint** on `(email, website)`:

```sql
UNIQUE(email, website)
```

**What This Means:**
- If a lead with the same email AND website exists → **SKIP** (don't store)
- If email is different OR website is different → **STORE** as new lead
- Scraping the same keyword twice won't create duplicates ✅

**Example:**
```
Existing Lead: email="john@techcorp.com", website="techcorp.com"
New Scrape:    email="john@techcorp.com", website="techcorp.com"
Result: ❌ SKIPPED (duplicate)

New Scrape:    email="jane@techcorp.com", website="techcorp.com"  
Result: ✅ STORED (different email)
```

---

## 📊 **Lead Object Structure**

```typescript
interface Lead {
  id: number;
  
  // Company Info
  company_name: string;
  email: string;
  phone: string;
  website: string;
  
  // Location
  location: string;
  city: string;
  country: string;
  
  // Business Details
  industry: string;
  title: string;
  snippet: string;
  description: string;
  
  // Social Media
  linkedin_url: string;
  facebook_url: string;
  twitter_url: string;
  
  // Additional
  contact_person: string;
  employee_count: number;
  revenue: string;
  founded_year: number;
  
  // Quality Metrics
  confidence_score: number;  // 0-100
  intent: 'HOT' | 'WARM' | 'COLD';
  
  // Metadata
  query_used: string;
  source_actor: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  
  // Timestamps
  created_at: string;
  updated_at: string;
}
```

---

## 💰 **Cost Savings**

### Without Smart Caching:
```
Request 1: "tech companies" → Scrape 5 leads (Cost: $0.10)
Request 2: "tech companies" → Scrape 5 leads (Cost: $0.10)
Request 3: "tech companies" → Scrape 5 leads (Cost: $0.10)
Total: $0.30 (15 API calls to Apify)
```

### With Smart Caching:
```
Request 1: "tech companies" → Scrape 5 leads (Cost: $0.10)
Request 2: "tech companies" → Return from cache (Cost: $0.00) ✅
Request 3: "tech companies" → Return from cache (Cost: $0.00) ✅
Total: $0.10 (only 5 API calls to Apify)
```

**Savings: 67%** 🎉

---

## 🔧 **Setup Instructions**

### 1. Run Database Migration

```bash
psql -U your_user -d your_database -f database/create_generated_leads.sql
```

### 2. Set Apify API Key

Add to your `.env` file:
```env
APIFY_API_KEY=apify_api_xxxxxxxxxxxxxxxxx
```

Get your API key from: https://console.apify.com/account/integrations

### 3. Test the Endpoint

```bash
curl -X POST https://api.3vltn.com/backend/leads/generate \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "tech companies",
    "count": 5
  }'
```

---

## 🐛 **Troubleshooting**

### "Actor run failed"
- Check your Apify API key is valid
- Verify you have sufficient Apify credits
- Check actor ID is correct

### "No leads returned"
- Try a more specific keyword
- Check if the actor supports your query format
- Try a different actor

### "Duplicate key error"
- This is normal - means the lead already exists
- The system automatically skips duplicates
- You'll see "ℹ️ Duplicate lead skipped" in logs

---

## 📈 **Best Practices**

1. **Use Specific Keywords**
   - ❌ Bad: "companies"
   - ✅ Good: "SaaS companies in San Francisco"

2. **Check Cache First**
   - Use `forceRefresh: false` (default)
   - Only use `forceRefresh: true` when you need fresh data

3. **Use Location Filters**
   - Helps narrow down results
   - Improves cache hit rate

4. **Monitor Statistics**
   - Check `/stats` endpoint regularly
   - Track cache efficiency
   - Monitor email/phone coverage

---

## 🎯 **Summary**

| Feature | Benefit |
|---------|---------|
| Smart Caching | 60-80% cost savings |
| Duplicate Prevention | Clean database, no redundancy |
| Multi-Actor Support | Flexible data sources |
| Keyword Matching | Fast retrieval without scraping |
| Quality Scoring | Focus on best leads |

**Ready to use!** 🚀

**Test it now:**
```bash
POST /backend/leads/generate
{
  "keyword": "tech companies",
  "count": 5
}
```

