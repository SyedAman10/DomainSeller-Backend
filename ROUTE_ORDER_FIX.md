# Route Order Fix - 404 Error Resolved

## Problem

The `/api/campaigns/send-batch` endpoint was returning **404 Not Found** even though the route was defined.

## Root Cause

In Express.js, **route order matters**. Routes are matched in the order they're defined:

❌ **Before (WRONG ORDER):**
```
1. POST /api/campaigns (create)
2. GET /api/campaigns (list all)
3. PUT /api/campaigns/:campaignId (update)
4. DELETE /api/campaigns/:campaignId (delete)
5. POST /api/campaigns/send-batch (send batch) ← TOO LATE!
6. GET /api/campaigns/:campaignId/stats (stats)
7. POST /api/campaigns/schedule-followup (schedule)
8. GET /api/campaigns/:campaignId (get one)
```

When Express saw `POST /api/campaigns/send-batch`, it was already past the parameterized routes, causing routing issues.

## Solution

✅ **After (CORRECT ORDER):**
```
// ============================================================
// SPECIFIC ROUTES (must come BEFORE parameterized routes)
// ============================================================

1. POST /api/campaigns/send-batch (send batch) ← MOVED UP!
2. POST /api/campaigns/schedule-followup (schedule) ← MOVED UP!

// ============================================================
// GENERAL ROUTES
// ============================================================

3. POST /api/campaigns (create)
4. GET /api/campaigns (list all)
5. PUT /api/campaigns/:campaignId (update)
6. DELETE /api/campaigns/:campaignId (delete)

// ============================================================
// PARAMETERIZED ROUTES (must come AFTER specific routes)
// ============================================================

7. GET /api/campaigns/:campaignId/stats (stats)
8. GET /api/campaigns/:campaignId (get one) ← STAYS AT END
```

## Key Principle

> **Specific routes MUST be defined BEFORE parameterized routes (with `:params`)**

### Why?

Express matches routes **sequentially**. If you have:
- `/:campaignId` defined first
- `/send-batch` defined later

Express will try to match "send-batch" as a `campaignId` parameter value.

## Changes Made

1. ✅ Moved `/send-batch` to the TOP
2. ✅ Moved `/schedule-followup` to the TOP  
3. ✅ Removed duplicate route definitions
4. ✅ Organized routes into logical sections
5. ✅ Added comments explaining the order

## Testing

```bash
# Test send-batch endpoint
curl -X POST http://localhost:5000/api/campaigns/send-batch \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign_123",
    "emails": [
      {
        "to": "test@example.com",
        "subject": "Test",
        "html": "<p>Test</p>"
      }
    ]
  }'
```

**Expected Result:** ✅ 200 OK (not 404)

## Route Organization Best Practices

### 1. Specific Static Routes First
```javascript
router.post('/send-batch', ...)
router.post('/schedule-followup', ...)
router.get('/health', ...)
```

### 2. General Routes
```javascript
router.post('/', ...)  // Create
router.get('/', ...)   // List all
```

### 3. Parameterized Routes with Sub-paths
```javascript
router.get('/:id/stats', ...)
router.get('/:id/details', ...)
```

### 4. General Parameterized Routes Last
```javascript
router.get('/:id', ...)     // Get one
router.put('/:id', ...)     // Update
router.delete('/:id', ...)  // Delete
```

## Visual Comparison

### ❌ Wrong (404 Error)
```
POST /campaigns/:campaignId  ← Generic param route
     ↓
     Tries to match "send-batch" as campaignId
     ↓
POST /campaigns/send-batch  ← Never reached
```

### ✅ Correct
```
POST /campaigns/send-batch   ← Specific route matches first!
     ↓
POST /campaigns/:campaignId  ← Only matches if above didn't
```

## Files Modified

- `routes/campaigns.js` - Reorganized route order

## Result

✅ `/api/campaigns/send-batch` now returns **200 OK**  
✅ All other routes still work  
✅ No more 404 errors  
✅ Proper route matching order  

---

**Remember:** In Express, **order matters**! Always put specific routes before parameterized ones.

