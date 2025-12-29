# Domain Buyer Lead Generation API

Complete documentation for the Domain Buyer Lead Generation system.

---

## 🎯 Overview

This system automatically collects, scores, and manages leads of people looking to **BUY domain names** using:

- **Apify Google SERP Scraping** - Extracts search results
- **Intent Classification** - Scores leads as HOT/WARM/COLD
- **Contact Enrichment** - Crawls pages to extract emails and profiles
- **Lead Management** - Full CRUD API for managing leads

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install apify-client
```

### 2. Set Environment Variables

Add to your `.env` file:

```bash
APIFY_API_KEY=apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Run Database Migration

```bash
node migrate.js database/create_domain_buyer_leads.sql
```

### 4. Start Server

```bash
node server.js
```

---

## 📡 API Endpoints

Base URL: `https://api.3vltn.com/backend/leads`

---

### 1. Collect Leads

**POST** `/backend/leads/collect`

Scrape Google SERP and collect domain buyer leads.

**Request Body:**
```json
{
  "query": "looking to buy domain name",
  "country": "us",
  "language": "en",
  "maxPages": 1,
  "resultsPerPage": 10,
  "dateRange": "anytime",
  "crawlContacts": true,
  "minConfidence": 20
}
```

**Parameters:**
- `query` (required): Search query to find leads
- `country` (optional): Country code (default: "us")
- `language` (optional): Language code (default: "en")
- `maxPages` (optional): Max pages to scrape (default: 1)
- `resultsPerPage` (optional): Results per page (default: 10)
- `dateRange` (optional): "anytime", "day", "week", "month", "year"
- `crawlContacts` (optional): Extract contact info (default: true)
- `minConfidence` (optional): Min confidence score 0-100 (default: 20)

**Response:**
```json
{
  "success": true,
  "message": "Lead collection completed",
  "data": {
    "sessionId": 123,
    "runId": "abcd1234",
    "totalScraped": 10,
    "totalStored": 8,
    "totalCrawled": 3,
    "breakdown": {
      "hot": 3,
      "warm": 2,
      "cold": 3
    },
    "avgConfidence": 65,
    "topKeywords": {
      "looking to buy domain": 3,
      "need domain name": 2
    },
    "computeUnits": 0.05,
    "durationSeconds": 45
  }
}
```

**Example:**
```bash
curl -X POST https://api.3vltn.com/backend/leads/collect \
  -H "Content-Type: application/json" \
  -d '{
    "query": "want to buy premium domain",
    "country": "us",
    "maxPages": 2
  }'
```

---

### 2. Get Leads

**GET** `/backend/leads`

Retrieve leads with filtering and pagination.

**Query Parameters:**
- `intent`: Filter by HOT/WARM/COLD
- `status`: Filter by new/contacted/qualified/converted/rejected/archived
- `source`: Filter by source (google, twitter, reddit, etc.)
- `minConfidence`: Min confidence score (0-100)
- `hasEmail`: Filter leads with email (true/false)
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset (default: 0)
- `sortBy`: Sort field (created_at, confidence_score, intent, position)
- `sortOrder`: ASC or DESC (default: DESC)

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "id": 1,
        "source": "google",
        "query_used": "buy domain name",
        "title": "Looking to Buy Premium Domain Names",
        "snippet": "I need to purchase a short .com domain for my startup...",
        "url": "https://example.com/domain-search",
        "intent": "HOT",
        "confidence_score": 85,
        "matched_keywords": ["buy domain", "need to purchase domain"],
        "contact_email": "buyer@example.com",
        "author_name": "John Doe",
        "profile_url": "https://twitter.com/johndoe",
        "country_code": "us",
        "language_code": "en",
        "position": 1,
        "status": "new",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**Examples:**
```bash
# Get all HOT leads
GET /backend/leads?intent=HOT

# Get WARM leads with email addresses
GET /backend/leads?intent=WARM&hasEmail=true

# Get high confidence leads (80+)
GET /backend/leads?minConfidence=80

# Get leads sorted by confidence
GET /backend/leads?sortBy=confidence_score&sortOrder=DESC

# Pagination
GET /backend/leads?limit=20&offset=40
```

---

### 3. Get Lead Statistics

**GET** `/backend/leads/stats`

Get overview and statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_leads": 450,
      "hot_leads": 85,
      "warm_leads": 165,
      "cold_leads": 200,
      "leads_with_email": 120,
      "new_leads": 180,
      "contacted_leads": 95,
      "qualified_leads": 45,
      "converted_leads": 12,
      "unique_queries": 25,
      "unique_sources": 3
    },
    "recentHotLeads": [...],
    "recentWarmLeads": [...],
    "recentSessions": [...]
  }
}
```

---

### 4. Get Single Lead

**GET** `/backend/leads/:id`

Get detailed information for a specific lead.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "source": "google",
    "query_used": "buy domain name",
    "title": "Looking to Buy Premium Domain",
    "snippet": "Need help finding...",
    "url": "https://example.com",
    "intent": "HOT",
    "confidence_score": 85,
    "matched_keywords": ["buy domain"],
    "contact_email": "buyer@example.com",
    "status": "new",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### 5. Update Lead

**PUT** `/backend/leads/:id`

Update lead information.

**Request Body:**
```json
{
  "status": "contacted",
  "notes": "Contacted via email, interested in premium .com domains",
  "assigned_to": 5,
  "contact_email": "newemail@example.com",
  "phone": "+1-555-0123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lead updated",
  "data": {...}
}
```

---

### 6. Delete Lead

**DELETE** `/backend/leads/:id`

Delete a lead (GDPR compliance).

**Response:**
```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

---

### 7. Get Scraping Session

**GET** `/backend/leads/sessions/:sessionId`

Get details about a scraping session.

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": 123,
      "actor_id": "damilo/google-search-apify",
      "run_id": "abcd1234",
      "query": "buy domain name",
      "status": "completed",
      "total_results": 10,
      "hot_leads": 3,
      "warm_leads": 4,
      "cold_leads": 3,
      "duration_seconds": 45,
      "compute_units": 0.05
    },
    "leads": [...]
  }
}
```

---

### 8. Manual Crawl Lead

**POST** `/backend/leads/:id/crawl`

Manually trigger contact extraction for a lead.

**Response:**
```json
{
  "success": true,
  "message": "Contact information extracted",
  "data": {
    "emails": ["buyer@example.com"],
    "author": "John Doe",
    "socialProfiles": ["https://twitter.com/johndoe"]
  }
}
```

---

## 🔥 Intent Classification

Leads are automatically classified based on keyword matching:

### HOT Intent (🔥 80-100% confidence)
Strong buying signals:
- "looking to buy domain"
- "want to buy domain"
- "need domain name"
- "domain wanted"
- "buy premium domain"
- "domain broker"

### WARM Intent (🌤️ 40-79% confidence)
Moderate interest:
- "startup name ideas"
- "brand name ideas"
- "launching startup"
- "domain name ideas"
- "brandable domain names"

### COLD Intent (❄️ 0-39% confidence)
Low intent or informational:
- "what is a domain"
- "free domain"
- "domain basics"

---

## 📊 Database Schema

### `domain_buyer_leads` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `source` | VARCHAR(50) | Source (google, twitter, etc.) |
| `query_used` | TEXT | Search query used |
| `title` | TEXT | SERP result title |
| `snippet` | TEXT | SERP result snippet |
| `url` | TEXT | URL of result |
| `intent` | VARCHAR(10) | HOT/WARM/COLD |
| `confidence_score` | INTEGER | 0-100 score |
| `matched_keywords` | TEXT[] | Array of matched keywords |
| `contact_email` | VARCHAR(255) | Extracted email |
| `author_name` | VARCHAR(255) | Author name |
| `profile_url` | TEXT | Social profile URL |
| `phone` | VARCHAR(50) | Phone number |
| `country_code` | VARCHAR(10) | Country code |
| `language_code` | VARCHAR(10) | Language code |
| `position` | INTEGER | Position in SERP |
| `crawled` | BOOLEAN | Whether page was crawled |
| `status` | VARCHAR(20) | Lead status |
| `created_at` | TIMESTAMP | Creation timestamp |

### `lead_scraping_sessions` Table

Tracks Apify scraping runs.

---

## 🎨 Example Queries

### Find Hot Leads for Tech Startups

```bash
curl "https://api.3vltn.com/backend/leads/collect" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "query": "need domain for tech startup",
    "country": "us",
    "maxPages": 3,
    "crawlContacts": true
  }'
```

### Find Crypto/Web3 Buyers

```bash
curl "https://api.3vltn.com/backend/leads/collect" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "query": "buy crypto domain OR web3 domain name",
    "country": "us",
    "maxPages": 2
  }'
```

### Find Premium Domain Buyers

```bash
curl "https://api.3vltn.com/backend/leads/collect" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "query": "buy premium domain OR short domain name",
    "country": "us",
    "dateRange": "week"
  }'
```

---

## 🔒 Best Practices

1. **Rate Limiting**: Don't scrape the same query too frequently
2. **Batch Processing**: Collect leads in batches during off-peak hours
3. **Contact Crawling**: Only crawl HOT/WARM leads to save compute
4. **Lead Nurturing**: Update lead status as you contact them
5. **Privacy**: Respect GDPR - delete leads on request

---

## 🚦 Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (validation error)
- `404` - Resource not found
- `500` - Server error

---

## 💰 Cost Estimation

**Apify Costs:**
- Google SERP scraping: ~$0.005-0.01 per page
- Website crawling: ~$0.01-0.02 per page

**Example:**
- Scrape 3 pages (30 results): ~$0.03
- Crawl 5 HOT leads: ~$0.05-0.10
- **Total per collection**: ~$0.08-0.13

---

## 🛠️ Customization

### Add Custom Keywords

Edit `services/leadClassificationService.js`:

```javascript
const HOT_KEYWORDS = [
  'looking to buy domain',
  'your custom keyword here',
  // ...
];
```

### Adjust Scoring

Modify the scoring weights in `classifyLead()` function.

### Add New Sources

Extend `apifyService.js` to support other Apify actors (Twitter, Reddit, etc.)

---

## 📈 Monitoring

Check scraping sessions:
```bash
GET /backend/leads/sessions/:sessionId
```

View overall stats:
```bash
GET /backend/leads/stats
```

---

## 🎯 Next Steps

1. Install Apify package: `npm install apify-client`
2. Add APIFY_API_KEY to `.env`
3. Run database migration
4. Test with sample query
5. Build frontend dashboard (optional)

---

**Ready to collect domain buyer leads!** 🚀

