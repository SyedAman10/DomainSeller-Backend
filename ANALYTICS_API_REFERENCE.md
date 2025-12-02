# Landing Page Analytics API - Complete Reference

## 📋 All Endpoints

Base URL: `https://3vltn.com/backend/analytics/`

---

## 1. **GET `/landing-page-insights/:landingPageId`**

Get overall analytics insights for a landing page.

### Request

**URL:** `/backend/analytics/landing-page-insights/:landingPageId?dateRange=7d`

**Query Parameters:**
- `dateRange` (optional): `7d` | `30d` | `90d` | `all` (default: `7d`)

**Example:**
```
GET /backend/analytics/landing-page-insights/campaign_123?dateRange=30d
```

### Response

```json
{
  "success": true,
  "data": {
    "totalVisits": 1250,
    "uniqueVisitors": 892,
    "avgSessionDuration": 154,
    "bounceRate": 45.2,
    "totalConversions": 23,
    "conversionRate": 2.58,
    "topCountries": [
      { "country": "USA", "visits": 450 },
      { "country": "UK", "visits": 220 },
      { "country": "Canada", "visits": 180 }
    ],
    "topReferrers": [
      { "source": "google.com", "visits": 320 },
      { "source": "twitter.com", "visits": 180 },
      { "source": "facebook.com", "visits": 120 }
    ]
  }
}
```

---

## 2. **GET `/visitor-timeline/:landingPageId`**

Get visitor timeline data for charts.

### Request

**URL:** `/backend/analytics/visitor-timeline/:landingPageId?range=7d`

**Query Parameters:**
- `range` (optional): `7d` | `30d` | `90d` (default: `7d`)

**Example:**
```
GET /backend/analytics/visitor-timeline/campaign_123?range=7d
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-01",
      "visits": 45,
      "uniqueVisitors": 32,
      "conversions": 2
    },
    {
      "date": "2025-01-02",
      "visits": 67,
      "uniqueVisitors": 51,
      "conversions": 5
    },
    {
      "date": "2025-01-03",
      "visits": 53,
      "uniqueVisitors": 41,
      "conversions": 3
    }
  ]
}
```

---

## 3. **GET `/device-breakdown/:landingPageId`**

Get device, browser, and OS breakdown.

### Request

**URL:** `/backend/analytics/device-breakdown/:landingPageId`

**Example:**
```
GET /backend/analytics/device-breakdown/campaign_123
```

### Response

```json
{
  "success": true,
  "data": {
    "devices": {
      "desktop": 60.5,
      "mobile": 35.2,
      "tablet": 4.3
    },
    "browsers": {
      "chrome": 65.3,
      "safari": 20.1,
      "firefox": 10.4,
      "edge": 3.2,
      "other": 1.0
    },
    "os": {
      "windows": 45.6,
      "macos": 30.2,
      "android": 15.1,
      "ios": 8.5,
      "linux": 0.6
    }
  }
}
```

---

## 4. **GET `/traffic-sources/:landingPageId`**

Get traffic source breakdown.

### Request

**URL:** `/backend/analytics/traffic-sources/:landingPageId`

**Example:**
```
GET /backend/analytics/traffic-sources/campaign_123
```

### Response

```json
{
  "success": true,
  "data": {
    "direct": 40.5,
    "organic": 35.2,
    "referral": 15.8,
    "social": 8.5,
    "topReferrers": [
      {
        "source": "google.com",
        "visits": 280,
        "percentage": 22.4
      },
      {
        "source": "twitter.com",
        "visits": 120,
        "percentage": 9.6
      },
      {
        "source": "linkedin.com",
        "visits": 95,
        "percentage": 7.6
      }
    ]
  }
}
```

---

## 5. **GET `/realtime-visitors/:landingPageId`**

Get real-time visitor data.

### Request

**URL:** `/backend/analytics/realtime-visitors/:landingPageId`

**Example:**
```
GET /backend/analytics/realtime-visitors/campaign_123
```

### Response

```json
{
  "success": true,
  "data": {
    "activeNow": 12,
    "last24Hours": 245,
    "recentSessions": [
      {
        "country": "USA",
        "device": "mobile",
        "timestamp": "2025-01-20T10:30:00Z"
      },
      {
        "country": "UK",
        "device": "desktop",
        "timestamp": "2025-01-20T10:28:00Z"
      },
      {
        "country": "Canada",
        "device": "tablet",
        "timestamp": "2025-01-20T10:25:00Z"
      }
    ]
  }
}
```

---

## 🔐 Authentication

**Note:** All endpoints should include userId authentication in production.

**Example with userId:**
```javascript
const response = await fetch(`/backend/analytics/landing-page-insights/${landingPageId}?dateRange=30d&userId=${userId}`);
```

---

## ❌ Error Responses

All endpoints return the same error format:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

**Common Error Codes:**
- `400` - Bad Request (missing parameters, invalid range)
- `500` - Server Error

---

## 📊 Data Types

### Numeric Values
- All visit counts: `integer`
- Percentages: `number` (e.g., `45.2` not `"45.2%"`)
- Session duration: `integer` (seconds)

### Date Formats
- Dates: `YYYY-MM-DD` (e.g., `"2025-01-20"`)
- Timestamps: ISO 8601 (e.g., `"2025-01-20T10:30:00Z"`)

### Device Types
- `desktop`, `mobile`, `tablet`

### Traffic Sources
- `direct` - No referrer
- `organic` - Search engines
- `referral` - Other websites
- `social` - Social media platforms

---

## 🚀 Quick Test

```bash
# Test insights endpoint
curl "http://localhost:5000/backend/analytics/landing-page-insights/test_page_123?dateRange=7d"

# Test timeline endpoint
curl "http://localhost:5000/backend/analytics/visitor-timeline/test_page_123?range=7d"

# Test device breakdown
curl "http://localhost:5000/backend/analytics/device-breakdown/test_page_123"

# Test traffic sources
curl "http://localhost:5000/backend/analytics/traffic-sources/test_page_123"

# Test real-time visitors
curl "http://localhost:5000/backend/analytics/realtime-visitors/test_page_123"
```

---

## 📁 Files Created

```
DomainSeller-Backend/
├── database/
│   └── add_analytics_support.sql       # Migration SQL
├── routes/
│   └── analytics.js                    # Analytics routes (NEW)
├── services/
│   └── analyticsService.js             # Analytics service (NEW)
├── run-analytics-migration.js          # Migration runner
└── ANALYTICS_API_REFERENCE.md          # This file
```

---

## ✅ Setup Complete

- [x] Database migration run
- [x] Analytics routes created
- [x] Analytics service created
- [x] Routes mounted in server.js
- [x] All 5 endpoints ready

**Ready to use! 🎉**

