# 🚀 Lead Generation Quick Setup

Get started with Domain Buyer Lead Generation in 5 minutes.

---

## Step 1: Install Dependencies

```bash
npm install
```

This installs `apify-client` and all other required packages.

---

## Step 2: Add API Key to Environment

Add to your `.env` file:

```bash
APIFY_API_KEY=apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Get your API key from: https://console.apify.com/account/integrations

---

## Step 3: Run Database Migration

```bash
node migrate.js database/create_domain_buyer_leads.sql
```

This creates:
- `domain_buyer_leads` table
- `lead_scraping_sessions` table
- Indexes and views

---

## Step 4: Test the API

Start the server:
```bash
npm start
```

Test lead collection:
```bash
curl -X POST http://localhost:5000/backend/leads/collect \
  -H "Content-Type: application/json" \
  -d '{
    "query": "looking to buy domain name",
    "country": "us",
    "maxPages": 1
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Lead collection completed",
  "data": {
    "totalScraped": 10,
    "totalStored": 8,
    "breakdown": {
      "hot": 3,
      "warm": 2,
      "cold": 3
    }
  }
}
```

---

## Step 5: View Your Leads

Get all HOT leads:
```bash
curl "http://localhost:5000/backend/leads?intent=HOT"
```

Get lead statistics:
```bash
curl "http://localhost:5000/backend/leads/stats"
```

---

## 🎯 Sample Queries to Try

### Find Startup Founders Looking for Domains
```bash
curl -X POST http://localhost:5000/backend/leads/collect \
  -H "Content-Type: application/json" \
  -d '{
    "query": "need domain for startup OR startup domain name",
    "country": "us",
    "maxPages": 2
  }'
```

### Find Premium Domain Buyers
```bash
curl -X POST http://localhost:5000/backend/leads/collect \
  -H "Content-Type: application/json" \
  -d '{
    "query": "buy premium domain OR short domain wanted",
    "country": "us",
    "maxPages": 2,
    "crawlContacts": true
  }'
```

### Find Crypto/Web3 Buyers
```bash
curl -X POST http://localhost:5000/backend/leads/collect \
  -H "Content-Type: application/json" \
  -d '{
    "query": "web3 domain OR crypto domain name wanted",
    "country": "us",
    "maxPages": 1
  }'
```

---

## 📊 Check Results in Database

```sql
-- View all HOT leads
SELECT * FROM domain_buyer_leads 
WHERE intent = 'HOT' 
ORDER BY confidence_score DESC;

-- View leads with email addresses
SELECT title, url, contact_email, intent 
FROM domain_buyer_leads 
WHERE contact_email IS NOT NULL;

-- View statistics
SELECT * FROM lead_stats;
```

---

## 🔥 Production URL

Once deployed, use:

```bash
https://api.3vltn.com/backend/leads/collect
https://api.3vltn.com/backend/leads?intent=HOT
https://api.3vltn.com/backend/leads/stats
```

---

## 📖 Full Documentation

See `LEAD_GEN_API.md` for complete API reference.

---

## 💡 Tips

1. **Start with focused queries** - "buy domain name" works better than broad terms
2. **Filter by confidence** - Use `minConfidence=60` to get higher quality leads
3. **Enable contact crawling** - Set `crawlContacts: true` for HOT/WARM leads
4. **Check recent results** - Use `dateRange: "week"` to find recent intent
5. **Export leads** - Query the database and export to CSV for your sales team

---

## 🎉 You're Ready!

Your lead generation system is now live. Start collecting domain buyer leads! 🚀

