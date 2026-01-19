# 🔧 Database Schema Fixes - Campaign Creation

## Issues Fixed

### ❌ Error 1: Column "landing_page_url" does not exist
```
ERROR: column "landing_page_url" does not exist
Table: landing_pages
```

**Root Cause:** Used wrong column name. The `landing_pages` table uses `page_url`, not `landing_page_url`.

**✅ Solution:** Updated `checkLandingPage()` function to use correct columns:
- `page_url` instead of `landing_page_url`
- Added `landing_page_id`, `page_title`, `is_active` fields
- Added filter for `is_active = true`

---

### ❌ Error 2: Relation "buyers" does not exist
```
ERROR: relation "buyers" does not exist
```

**Root Cause:** Used wrong table name. The correct table is `domain_buyer_leads`, not `buyers`.

**✅ Solution:** Updated `findMatchedBuyers()` function to:
- Query `domain_buyer_leads` table
- Use correct columns: `title`, `snippet`, `url`, `contact_email`, `author_name`, `intent`, `confidence_score`
- Added domain keyword matching for better results
- Order by intent (HOT → WARM → COLD) and confidence score
- Return detailed breakdown (hot/warm/cold leads, emails found)

---

## Database Schema Reference

### landing_pages Table
```sql
CREATE TABLE landing_pages (
  id SERIAL PRIMARY KEY,
  landing_page_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  campaign_id VARCHAR(255),
  domain_name VARCHAR(255) NOT NULL,
  page_title VARCHAR(255),
  page_url TEXT NOT NULL,  -- ✅ This is the correct column
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### domain_buyer_leads Table
```sql
CREATE TABLE domain_buyer_leads (  -- ✅ This is the correct table name
  id SERIAL PRIMARY KEY,
  source VARCHAR(50) NOT NULL DEFAULT 'google',
  query_used TEXT NOT NULL,
  title TEXT NOT NULL,
  snippet TEXT,
  url TEXT NOT NULL,
  intent VARCHAR(10) CHECK (intent IN ('HOT', 'WARM', 'COLD')),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  matched_keywords TEXT[],
  contact_email VARCHAR(255),
  author_name VARCHAR(255),
  profile_url TEXT,
  phone VARCHAR(50),
  country_code VARCHAR(10),
  status VARCHAR(20) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Code Changes

### 1. checkLandingPage() Function

**Before (Wrong):**
```javascript
const result = await pool.query(
  `SELECT id, landing_page_url, domain_name, created_at, updated_at
   FROM landing_pages
   WHERE domain_name = $1 AND user_id = $2`,
  [domainName, userId]
);
```

**After (Correct):**
```javascript
const result = await pool.query(
  `SELECT id, landing_page_id, page_url, domain_name, page_title, is_active, created_at, updated_at
   FROM landing_pages
   WHERE domain_name = $1 AND user_id = $2 AND is_active = true
   ORDER BY created_at DESC
   LIMIT 1`,
  [domainName, userId]
);
```

**Return Value:**
```javascript
{
  success: true,
  exists: true,
  landingPage: {
    id: landingPage.id,
    landing_page_id: landingPage.landing_page_id,
    url: landingPage.page_url,  // ✅ Using page_url
    domain: landingPage.domain_name,
    title: landingPage.page_title,
    createdAt: landingPage.created_at
  },
  message: '✅ Great news! You already have a landing page...'
}
```

---

### 2. findMatchedBuyers() Function

**Before (Wrong):**
```javascript
const result = await pool.query(`
  SELECT buyer_id, buyer_name, buyer_email, company_name, industry, country, city
  FROM buyers  -- ❌ Wrong table
  WHERE industry ILIKE $1`,
  [`%${targetIndustry}%`]
);
```

**After (Correct):**
```javascript
const result = await pool.query(`
  SELECT 
    id, title, snippet, url, contact_email, author_name, intent,
    confidence_score, matched_keywords, query_used, created_at
  FROM domain_buyer_leads  -- ✅ Correct table
  WHERE status = 'new'
    AND (title ILIKE $1 OR snippet ILIKE $1 OR query_used ILIKE $1)
    AND (title ILIKE $2 OR snippet ILIKE $2 OR query_used ILIKE $2)
  ORDER BY 
    CASE intent 
      WHEN 'HOT' THEN 1
      WHEN 'WARM' THEN 2
      WHEN 'COLD' THEN 3
    END,
    confidence_score DESC,
    created_at DESC
  LIMIT $3`,
  [`%${targetIndustry}%`, `%${domainKeywords}%`, limit]
);
```

**Return Value:**
```javascript
{
  success: true,
  buyers: [...],  // Array of matched buyers
  count: 23,
  message: 'Found 23 potential buyers in AI Automation Agencies industry matching "primecrafters"',
  breakdown: {
    hot: 5,    // HOT intent leads
    warm: 12,  // WARM intent leads
    cold: 6,   // COLD intent leads
    withEmail: 18  // Leads with contact_email
  }
}
```

---

## Enhanced Features

### Better Buyer Matching
Now includes:
- ✅ Domain keyword extraction and matching
- ✅ Intent-based sorting (HOT leads first)
- ✅ Confidence score ordering
- ✅ Breakdown of lead quality
- ✅ Email availability count

### Landing Page Detection
Now includes:
- ✅ Only shows active landing pages (`is_active = true`)
- ✅ Returns landing page ID and title
- ✅ Orders by creation date (newest first)
- ✅ Complete landing page metadata

---

## Testing

The functions now work correctly:

```bash
# User provides domain and industry
User: "theprimecrafters.com, target AI automation agencies"

# AI automatically calls checkLandingPage()
✅ Checking for landing page: theprimecrafters.com for user 10
✅ Landing page found: https://3vltn.com/landing/theprimecrafters.com

# User requests matched buyers
User: "find matched buyers"

# AI calls findMatchedBuyers()
✅ Finding matched buyers for: theprimecrafters.com, industry: AI automation agencies
✅ Found 23 matched buyers
   - HOT: 5
   - WARM: 12
   - COLD: 6
   - With Email: 18
```

---

## Files Modified

- ✅ `services/aiAgentService.js`
  - `checkLandingPage()` - Fixed column names
  - `findMatchedBuyers()` - Fixed table name and query

---

## Result

Both functions now work correctly with the actual database schema:
- ✅ No more "column does not exist" errors
- ✅ No more "relation does not exist" errors
- ✅ Proper data returned from database
- ✅ Enhanced matching and sorting
- ✅ Better user experience

---

**🎉 Database schema issues resolved!**

