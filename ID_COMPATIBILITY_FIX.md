# Campaign ID Compatibility Fix

## Problem

Frontend was sending the database **integer ID** (85) but backend was expecting the **string campaign_id** ("campaign_1761753495010_k68astylt").

### Error Flow:
```
Frontend → campaignId: 85 (integer DB id)
          ↓
Backend → WHERE campaign_id = '85' (looking for string)
          ↓
Result → 404 Campaign not found ❌
```

## Root Cause

The `campaigns` table has TWO ID fields:
- `id` (integer, auto-increment) - e.g., 85
- `campaign_id` (varchar, unique string) - e.g., "campaign_1761753495010_k68astylt"

The backend was only checking `campaign_id`, but the frontend was sending `id`.

## Solution

Updated all campaign endpoints to **accept BOTH formats**:

```javascript
// Check both id (integer) and campaign_id (string)
if (typeof campaignId === 'number' || !isNaN(parseInt(campaignId))) {
  // Search by integer id OR string campaign_id
  campaign = await query(
    'SELECT * FROM campaigns WHERE id = $1 OR campaign_id = $2',
    [campaignId, String(campaignId)]
  );
} else {
  // Search by string campaign_id OR integer id
  campaign = await query(
    'SELECT * FROM campaigns WHERE campaign_id = $1 OR id = $2',
    [campaignId, parseInt(campaignId) || 0]
  );
}
```

## Endpoints Fixed

✅ **POST /api/campaigns/send-batch**
- Now accepts: `85` or `"campaign_1761753495010_k68astylt"`

✅ **POST /api/campaigns/schedule-followup**
- Now accepts: `85` or `"campaign_1761753495010_k68astylt"`

✅ **GET /api/campaigns/:campaignId/stats**
- Now accepts: `85` or `"campaign_1761753495010_k68astylt"`

## Benefits

1. ✅ **Frontend Flexibility** - Can use whichever ID is convenient
2. ✅ **Backward Compatible** - Existing code using string IDs still works
3. ✅ **Better UX** - No need to convert between ID formats
4. ✅ **Clearer Errors** - Better error messages with hints

## Testing

### Before Fix:
```bash
POST /api/campaigns/send-batch
Body: { "campaignId": 85, "emails": [...] }
Result: 404 "Campaign not found" ❌
```

### After Fix:
```bash
POST /api/campaigns/send-batch
Body: { "campaignId": 85, "emails": [...] }
Result: 200 "Batch emails processed" ✅
```

### Both Formats Work:
```javascript
// Using integer ID
{ "campaignId": 85 } ✅

// Using string campaign_id  
{ "campaignId": "campaign_1761753495010_k68astylt" } ✅
```

## Enhanced Logging

Added detailed logging to help debug ID issues:

```
🔍 Looking for campaign with ID: 85 (type: number)
✅ Campaign found: campaign_1761753495010_k68astylt (DB ID: 85)
```

## Implementation Details

```javascript
// Extract the actual campaign_id string for consistency
const actualCampaignId = campaign.rows[0].campaign_id;

// Use actualCampaignId for all database operations
await query(
  'INSERT INTO sent_emails (campaign_id, ...) VALUES ($1, ...)',
  [actualCampaignId, ...]
);
```

This ensures all subsequent database operations use the correct string `campaign_id` regardless of which format was provided in the request.

## Database Schema

```sql
CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,              -- Integer, auto-increment (85)
  campaign_id VARCHAR(255) NOT NULL,  -- String, unique ("campaign_...")
  ...
);
```

Both fields are valid identifiers, but:
- `id` is the primary key (integer)
- `campaign_id` is a unique string used in foreign keys

## Files Modified

- `routes/campaigns.js` - Updated 3 endpoints to accept both ID formats

## Result

✅ Frontend can now send either ID format  
✅ Backend handles both seamlessly  
✅ All existing code continues to work  
✅ Better error messages and logging  

---

**The 404 "Campaign not found" error is now resolved!**

