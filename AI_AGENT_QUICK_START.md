# 🚀 Quick Start: AI Agent Settings

## Step 1: Enable/Disable Auto-Response

```bash
# Turn OFF auto-response (manual review mode)
curl -X PUT https://3vltn.com/api/campaigns/campaign_123/ai-settings \
  -H "Content-Type: application/json" \
  -d '{
    "autoResponseEnabled": false,
    "notificationEmail": "your-email@example.com"
  }'
```

```bash
# Turn ON auto-response (automatic mode)
curl -X PUT https://3vltn.com/api/campaigns/campaign_123/ai-settings \
  -H "Content-Type: application/json" \
  -d '{
    "autoResponseEnabled": true,
    "notificationEmail": "your-email@example.com"
  }'
```

---

## Step 2: When Auto-Response is OFF

### View Pending Drafts

```bash
curl "https://3vltn.com/api/inbound/drafts?userId=12&status=pending"
```

### Edit a Draft

```bash
curl -X PUT https://3vltn.com/api/inbound/drafts/45 \
  -H "Content-Type: application/json" \
  -d '{
    "editedResponse": "Your edited message here..."
  }'
```

### Send the Draft

```bash
curl -X POST https://3vltn.com/api/inbound/drafts/45/send
```

---

## What Happens in Each Mode?

### 🚀 Auto-Response ON
1. Buyer replies → AI generates response → **Sends immediately**
2. You get a confirmation email
3. You can monitor from dashboard

### 📝 Auto-Response OFF
1. Buyer replies → AI generates response → **Saves as draft**
2. You get an action-required email
3. You review, edit, and send manually

---

## Email Notifications

When you set `notificationEmail`, you'll receive:

- **Auto-Response ON**: Confirmation emails when AI sends replies
- **Auto-Response OFF**: Action-required emails with suggested responses

---

## Frontend Integration

```javascript
// Toggle auto-response
await fetch(`/api/campaigns/${campaignId}/ai-settings`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    autoResponseEnabled: false,  // or true
    notificationEmail: 'me@example.com'
  })
});

// Get pending drafts
const response = await fetch(`/api/inbound/drafts?userId=${userId}&status=pending`);
const { drafts } = await response.json();

// Send a draft
await fetch(`/api/inbound/drafts/${draftId}/send`, { method: 'POST' });
```

---

## Complete Documentation

See `AI_AGENT_SETTINGS.md` for:
- Full API reference
- Complete workflow examples
- Frontend code examples
- Database schema
- Troubleshooting

---

**That's it! Your AI agent now has full manual control! 🎉**
