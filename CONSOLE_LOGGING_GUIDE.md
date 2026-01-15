# 📊 Smart Lead Generation - Console Logging Guide

## Overview
The Smart Lead Generation API now has **comprehensive console logging** that shows you exactly what's happening at every step.

---

## 🎯 What You'll See

### 1. **API Request Received**

```
════════════════════════════════════════════════════════════════════════════════
🚀 NEW API REQUEST: POST /backend/leads/generate
════════════════════════════════════════════════════════════════════════════════
📥 REQUEST BODY:
{
  "keyword": "tech companies",
  "count": 5,
  "location": "New York",
  "industry": "Technology"
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. **Smart Caching Check**

#### Scenario A: Cache Hit (Best Case!)
```
🎯 SMART LEAD GENERATION REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 REQUEST PARAMETERS:
┌─────────────────────────────────────────────────────────────────┐
│ Keyword: "tech companies"
│ Count: 5
│ Location: New York
│ Industry: Technology
│ Actor: code_crafter/leads-finder
│ Force Refresh: false
└─────────────────────────────────────────────────────────────────┘

🔍 STEP 1: Checking database for existing leads...
   Found 5 cached leads

✅ CACHE HIT - Sufficient leads found!
┌─────────────────────────────────────────────────────────────────┐
│ Found: 5 cached leads (need: 5)
│ Result: Returning from cache (NO SCRAPING NEEDED) 🎉
│ Cost: $0.00
└─────────────────────────────────────────────────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Scenario B: Partial Cache Hit
```
🔍 STEP 1: Checking database for existing leads...
   Found 2 cached leads

⚠️  PARTIAL CACHE HIT
┌─────────────────────────────────────────────────────────────────┐
│ Found: 2 cached leads (need: 5)
│ Missing: 3 leads
│ Result: Will scrape remaining leads
└─────────────────────────────────────────────────────────────────┘

🕷️  STEP 2: Scraping 3 additional leads...
```

#### Scenario C: Cache Miss (Need to Scrape)
```
🔍 STEP 1: Checking database for existing leads...
   Found 0 cached leads

❌ CACHE MISS - No cached leads found
┌─────────────────────────────────────────────────────────────────┐
│ Found: 0 cached leads
│ Result: Will scrape all leads from Apify
└─────────────────────────────────────────────────────────────────┘

🕷️  STEP 2: Starting fresh scraping...
```

### 3. **Apify Actor Execution** (Only if scraping)

```
🚀 Starting Apify actor: code_crafter/leads-finder
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📤 SENDING TO APIFY ACTOR:
┌─────────────────────────────────────────────────────────────────┐
│ Actor: code_crafter/leads-finder
│ Input: {
│         "query": "tech companies",
│         "location": "New York",
│         "industry": "Technology",
│         "maxResults": 3,
│         "includeEmails": true,
│         "includePhones": true,
│         "includeSocialMedia": true
│       }
└─────────────────────────────────────────────────────────────────┘

⏳ Running Apify actor... (this may take 30-60 seconds)
```

### 4. **Apify Response**

```
✅ APIFY ACTOR COMPLETED:
┌─────────────────────────────────────────────────────────────────┐
│ Run ID: abc123xyz
│ Status: SUCCEEDED
│ Compute Units: 0.05
│ Started: 2026-01-15T10:30:00.000Z
│ Finished: 2026-01-15T10:30:45.000Z
└─────────────────────────────────────────────────────────────────┘

📥 Fetching scraped results from Apify dataset...

✅ RECEIVED 3 RAW RESULTS FROM APIFY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 SAMPLE RAW RESULT (First Lead):
┌─────────────────────────────────────────────────────────────────┐
│ {
│   "companyName": "TechCorp Inc",
│   "email": "contact@techcorp.com",
│   "phone": "+1-555-0123",
│   "website": "https://techcorp.com",
│   "location": "New York, NY",
│   "industry": "Technology",
│   "description": "Leading software solutions..."
│ }
└─────────────────────────────────────────────────────────────────┘

🔄 Transforming and storing leads...
```

### 5. **Lead Storage Process**

```
🔄 TRANSFORMING LEADS:
   Processing 3 raw items...

   📝 [1/3] Storing: TechCorp Inc
      ✅ Stored successfully (ID: 123)

   📝 [2/3] Storing: DataSystems LLC
      ℹ️  Duplicate - already exists in database

   📝 [3/3] Storing: CloudTech Solutions
      ✅ Stored successfully (ID: 124)

📊 STORAGE SUMMARY:
   ✅ Successfully stored: 2
   ℹ️  Duplicates skipped: 1
   ⚠️  Insufficient data: 0

✅ STORAGE COMPLETE:
┌─────────────────────────────────────────────────────────────────┐
│ Stored: 2 unique leads
│ Duplicates Skipped: 1
└─────────────────────────────────────────────────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 6. **Final API Response**

```
📤 API RESPONSE:
┌─────────────────────────────────────────────────────────────────┐
│ Success: true
│ Source: hybrid
│ Total Found: 5
│ From Cache: 2
│ From Scraping: 3
│ Returned: 5 leads
│ Duration: 45.32s
└─────────────────────────────────────────────────────────────────┘
════════════════════════════════════════════════════════════════════════════════
```

---

## 📋 Log Sections Explained

### **Request Logs**
- Shows exactly what was sent to your API
- Displays all parameters: keyword, count, location, industry, etc.

### **Cache Check Logs**
- Shows database search results
- Indicates if cache hit, partial hit, or miss
- Explains next action (return cache or scrape)

### **Apify Actor Logs**
- **Input**: Exact JSON sent to Apify actor
- **Status**: Actor run status and compute units used
- **Output**: Sample of raw data received from Apify
- **Duration**: How long the actor took to run

### **Storage Logs**
- Shows each lead being processed and stored
- Indicates duplicates (skipped automatically)
- Shows leads with insufficient data (skipped)
- Summary of storage results

### **Response Logs**
- Final metadata: source, counts, efficiency
- Total duration of the entire request
- Cache efficiency percentage

---

## 🎯 Key Indicators

### **✅ Cache Hit** (Best!)
```
✅ CACHE HIT - Sufficient leads found!
│ Result: Returning from cache (NO SCRAPING NEEDED) 🎉
│ Cost: $0.00
```
**Meaning:** Found enough leads in database, no Apify call needed

### **⚠️ Partial Cache Hit**
```
⚠️  PARTIAL CACHE HIT
│ Found: 2 cached leads (need: 5)
│ Missing: 3 leads
```
**Meaning:** Some leads in cache, will scrape the rest

### **❌ Cache Miss**
```
❌ CACHE MISS - No cached leads found
│ Result: Will scrape all leads from Apify
```
**Meaning:** No cached leads, scraping all from Apify

### **ℹ️ Duplicate Skipped**
```
   📝 [2/3] Storing: DataSystems LLC
      ℹ️  Duplicate - already exists in database
```
**Meaning:** This lead already exists (email + website match), skipping

### **⚠️ Insufficient Data**
```
   ⚠️  [3/3] Skipped: Insufficient data
```
**Meaning:** Lead has no company name, email, or website - can't store

---

## 🔍 Debugging Tips

### **Check Cache Efficiency**
Look for this in the response:
```
│ Cache Efficiency: 60%
```
- **80-100%**: Excellent! Most leads from cache
- **50-80%**: Good! Mix of cache and scraping
- **0-50%**: Low cache usage, mostly scraping
- **0%**: All new scraping (first time query)

### **Monitor Duplicates**
```
📊 STORAGE SUMMARY:
   ℹ️  Duplicates skipped: 3
```
- High duplicates = Good! Your cache is working
- Zero duplicates = Likely first time scraping this query

### **Check Apify Cost**
```
│ Compute Units: 0.05
```
- Lower is better
- 0.00 = Cache hit (no cost!)
- Track this to monitor Apify spending

### **Duration Tracking**
```
│ Duration: 2.5s
```
- **< 5s**: Cache hit (very fast)
- **30-60s**: Scraping involved (normal)
- **> 60s**: Slow actor or network issues

---

## 🚨 Error Logs

If something goes wrong:

```
❌ API ERROR:
┌─────────────────────────────────────────────────────────────────┐
│ Error: Actor run failed with status: TIMED_OUT
│ Duration: 300.00s
└─────────────────────────────────────────────────────────────────┘
Stack: Error: Actor run failed...
```

**Common Errors:**
- `TIMED_OUT`: Actor took too long (> 5 min)
- `FAILED`: Actor crashed (check Apify dashboard)
- `Invalid API key`: Check `.env` file for `APIFY_API_KEY`
- `Insufficient credits`: Add credits to Apify account

---

## 💡 Example Log Flow

### **First Request** (No Cache)
```
REQUEST → CACHE MISS → SCRAPE FROM APIFY → STORE 5 → RETURN 5
Duration: 45s | Cost: $0.10 | Cache: 0%
```

### **Second Request** (Full Cache Hit)
```
REQUEST → CACHE HIT → RETURN 5 (from DB)
Duration: 2s | Cost: $0.00 | Cache: 100%
```

### **Third Request** (Partial Cache)
```
REQUEST → PARTIAL CACHE (2 found) → SCRAPE 3 → STORE 3 → RETURN 5
Duration: 32s | Cost: $0.06 | Cache: 40%
```

---

## 📊 Summary

**What to Watch:**
1. ✅ Cache hit rate (higher = better)
2. 💰 Compute units (lower = cheaper)
3. ⏱️ Duration (faster = better UX)
4. 📦 Duplicates skipped (shows cache working)

**Good Signs:**
- High cache hit rate (80%+)
- Low compute units (< 0.1)
- Fast response times (< 5s)
- Duplicates being skipped

**Red Flags:**
- Always 0% cache (check keywords)
- High compute units (> 0.5)
- Frequent timeouts
- Many "insufficient data" skips

---

**Logs are your friend!** 📊 Monitor them to optimize your lead generation! 🚀

