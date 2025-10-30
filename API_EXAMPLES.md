# API Testing Examples

Quick reference for testing the Campaign Backend APIs.

## Health Check

```bash
curl http://localhost:5000/api/health
```

---

## 1. Send Batch Emails

```bash
curl -X POST http://localhost:5000/api/campaigns/send-batch \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": 1,
    "emails": [
      {
        "to": "buyer1@example.com",
        "subject": "Interested in example.com?",
        "html": "<h1>Premium Domain Available</h1><p>We noticed you might be interested in <strong>example.com</strong>.</p>",
        "text": "Premium Domain Available. We noticed you might be interested in example.com.",
        "tags": ["campaign-1", "initial-outreach"]
      },
      {
        "to": "buyer2@example.com",
        "subject": "Interested in example.com?",
        "html": "<h1>Premium Domain Available</h1><p>We noticed you might be interested in <strong>example.com</strong>.</p>",
        "tags": ["campaign-1", "initial-outreach"]
      }
    ]
  }'
```

---

## 2. Get Campaign Stats

```bash
curl http://localhost:5000/api/campaigns/1/stats
```

---

## 3. Schedule Follow-up Email

```bash
curl -X POST http://localhost:5000/api/campaigns/schedule-followup \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "1",
    "buyerEmail": "buyer@example.com",
    "subject": "Still interested in example.com?",
    "body": "<p>Hi there!</p><p>Just following up to see if you had any questions about <strong>example.com</strong>.</p><p>Best regards,<br>Your Name</p>",
    "scheduledFor": "2025-11-01T14:00:00Z",
    "userId": 1,
    "buyerId": "buyer123",
    "buyerName": "John Doe",
    "domainName": "example.com"
  }'
```

---

## 4. Get Campaign Details

```bash
curl http://localhost:5000/api/campaigns/1
```

---

## Testing from JavaScript (Frontend)

### Send Batch Emails
```javascript
const response = await fetch('http://localhost:5000/api/campaigns/send-batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    campaignId: '1',
    emails: [
      {
        to: 'buyer@example.com',
        subject: 'Premium Domain Available',
        html: '<h1>Hello!</h1><p>Interested in example.com?</p>',
        tags: ['campaign-1'],
        userId: 1,
        buyerId: 'buyer123',
        buyerName: 'John Doe'
      }
    ]
  })
});

const data = await response.json();
console.log(data);
```

### Get Campaign Stats
```javascript
const response = await fetch('http://localhost:5000/api/campaigns/1/stats');
const data = await response.json();
console.log('Campaign Stats:', data.stats);
```

### Schedule Follow-up
```javascript
const scheduledFor = new Date();
scheduledFor.setDate(scheduledFor.getDate() + 3); // 3 days from now

const response = await fetch('http://localhost:5000/api/campaigns/schedule-followup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    campaignId: '1',
    buyerEmail: 'buyer@example.com',
    subject: 'Following up',
    body: '<p>Just checking in...</p>',
    scheduledFor: scheduledFor.toISOString(),
    userId: 1,
    buyerId: 'buyer123',
    buyerName: 'John Doe',
    domainName: 'example.com'
  })
});

const data = await response.json();
console.log(data);
```

---

## Expected Responses

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

---

## Webhook Testing (Mailgun)

To test webhooks locally, use [ngrok](https://ngrok.com):

```bash
# Start ngrok
ngrok http 5000

# Use the ngrok URL in Mailgun dashboard
https://your-ngrok-url.ngrok.io/api/webhooks/mailgun
```

### Test Webhook Endpoint
```bash
curl http://localhost:5000/api/webhooks/test
```

---

## Tips

1. **Replace `campaignId`** with actual campaign IDs from your database
2. **Use real email addresses** for testing (Mailgun sandbox only sends to verified emails)
3. **Check server logs** for detailed information about requests
4. **Monitor Mailgun dashboard** for delivery status
5. **Use `.json` files** for complex payloads:

```bash
curl -X POST http://localhost:5000/api/campaigns/send-batch \
  -H "Content-Type: application/json" \
  -d @test-batch.json
```

