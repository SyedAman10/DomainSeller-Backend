# Campaign CRUD API Examples

Complete examples for managing campaigns (Create, Read, Update, Delete).

---

## 1. Create Campaign

**POST** `/api/campaigns`

```bash
curl -X POST http://localhost:5000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "domainId": 5,
    "domainName": "example.com",
    "campaignName": "Q4 Premium Domain Campaign",
    "emailTone": "professional",
    "includePrice": true,
    "maxEmailsPerDay": 10,
    "followUpSequence": [
      {
        "name": "Reminder",
        "daysAfter": 3,
        "subject": "Quick reminder about {domain}",
        "template": "reminder"
      },
      {
        "name": "Value Add",
        "daysAfter": 7,
        "subject": "Additional value for {domain}",
        "template": "value_add"
      },
      {
        "name": "Final Offer",
        "daysAfter": 14,
        "subject": "Final offer for {domain}",
        "template": "final_offer"
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign created successfully",
  "campaign": {
    "id": 1,
    "campaign_id": "campaign_1730207789_x7k2m9p",
    "user_id": 1,
    "domain_id": 5,
    "domain_name": "example.com",
    "campaign_name": "Q4 Premium Domain Campaign",
    "email_tone": "professional",
    "include_price": true,
    "max_emails_per_day": 10,
    "follow_up_sequence": [
      {
        "name": "Reminder",
        "daysAfter": 3,
        "subject": "Quick reminder about {domain}",
        "template": "reminder"
      },
      {
        "name": "Value Add",
        "daysAfter": 7,
        "subject": "Additional value for {domain}",
        "template": "value_add"
      },
      {
        "name": "Final Offer",
        "daysAfter": 14,
        "subject": "Final offer for {domain}",
        "template": "final_offer"
      }
    ],
    "status": "draft",
    "created_at": "2025-10-29T12:00:00Z",
    "total_emails_sent": 0,
    "total_emails_scheduled": 0
  },
  "scheduled": [],
  "scheduledCount": 0
}
```

---

## 2. Get All Campaigns

**GET** `/api/campaigns`

```bash
# Get all campaigns
curl http://localhost:5000/api/campaigns

# Get campaigns for specific user
curl http://localhost:5000/api/campaigns?userId=1
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "campaigns": [
    {
      "campaign_id": "campaign_1730207789_x7k2m9p",
      "domain_name": "example.com",
      "campaign_name": "Q4 Premium Domain Campaign",
      "status": "active",
      "total_emails_sent": 45,
      "total_emails_scheduled": 12,
      "created_at": "2025-10-29T12:00:00Z"
    }
  ]
}
```

---

## 3. Get Single Campaign Details

**GET** `/api/campaigns/:campaignId`

```bash
curl http://localhost:5000/api/campaigns/campaign_1730207789_x7k2m9p
```

**Response:**
```json
{
  "success": true,
  "campaign": {
    "campaign_id": "campaign_1730207789_x7k2m9p",
    "campaign_name": "Q4 Premium Domain Campaign",
    "domain_name": "example.com",
    "status": "active",
    "email_tone": "professional"
  },
  "buyers": [
    {
      "buyer_id": "buyer_123",
      "buyer_name": "John Doe",
      "buyer_email": "john@example.com",
      "status": "contacted"
    }
  ]
}
```

---

## 4. Update Campaign

**PUT** `/api/campaigns/:campaignId`

```bash
curl -X PUT http://localhost:5000/api/campaigns/campaign_1730207789_x7k2m9p \
  -H "Content-Type: application/json" \
  -d '{
    "campaignName": "Updated Campaign Name",
    "emailTone": "friendly",
    "status": "active",
    "maxEmailsPerDay": 100
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign updated successfully",
  "campaign": {
    "campaign_id": "campaign_1730207789_x7k2m9p",
    "campaign_name": "Updated Campaign Name",
    "email_tone": "friendly",
    "status": "active",
    "max_emails_per_day": 100,
    "updated_at": "2025-10-29T14:30:00Z"
  }
}
```

---

## 5. Delete Campaign

**DELETE** `/api/campaigns/:campaignId`

```bash
curl -X DELETE http://localhost:5000/api/campaigns/campaign_1730207789_x7k2m9p
```

**Response:**
```json
{
  "success": true,
  "message": "Campaign deleted successfully",
  "campaign": {
    "campaign_id": "campaign_1730207789_x7k2m9p",
    "campaign_name": "Q4 Premium Domain Campaign"
  }
}
```

---

## JavaScript Examples

### Create Campaign
```javascript
const response = await fetch('http://localhost:5000/api/campaigns', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 1,
    domainId: 5,
    domainName: 'example.com',
    campaignName: 'Q4 Premium Domain Campaign',
    emailTone: 'professional',
    includePrice: true,
    maxEmailsPerDay: 50,
    followUpDays: 3
  })
});

const data = await response.json();
console.log('Campaign ID:', data.campaign.campaign_id);
```

### Get All Campaigns
```javascript
const response = await fetch('http://localhost:5000/api/campaigns?userId=1');
const data = await response.json();
console.log(`Found ${data.count} campaigns`);
```

### Update Campaign
```javascript
const response = await fetch('http://localhost:5000/api/campaigns/campaign_123', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    status: 'active',
    maxEmailsPerDay: 100
  })
});

const data = await response.json();
console.log('Updated:', data.campaign);
```

### Delete Campaign
```javascript
const response = await fetch('http://localhost:5000/api/campaigns/campaign_123', {
  method: 'DELETE'
});

const data = await response.json();
console.log(data.message);
```

---

## Field Descriptions

### Required Fields (Create Campaign):
- **userId** (integer) - User ID who owns the campaign
- **domainName** (string) - Domain name for the campaign
- **campaignName** (string) - Name/title of the campaign

### Optional Fields:
- **domainId** (integer) - Domain ID reference
- **emailTone** (string) - Tone of emails (professional, friendly, urgent). Default: "professional"
- **includePrice** (boolean) - Include price in emails. Default: true
- **maxEmailsPerDay** (integer) - Max emails to send per day. Default: 50
- **followUpDays** (integer) - Days between follow-ups. Default: 3
- **followUpSequence** (array) - Array of follow-up email configurations

### Status Values:
- `draft` - Campaign created but not started
- `active` - Campaign is running
- `paused` - Campaign temporarily stopped
- `completed` - Campaign finished
- `cancelled` - Campaign cancelled

---

## Console Logging

With enhanced logging enabled, every API call will show:

```
============================================================
📥 POST /api/campaigns
⏰ 2025-10-29T12:30:00.000Z
📦 Body: {
  "userId": 1,
  "domainName": "example.com",
  "campaignName": "My Campaign"
}
============================================================
🆕 Creating new campaign...
📝 Campaign: My Campaign for example.com
✅ Campaign created with ID: campaign_1730207789_x7k2m9p
```

This makes debugging much easier!

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "userId, domainName, and campaignName are required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Campaign not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "error": "Failed to create campaign",
  "message": "Database error details..."
}
```

