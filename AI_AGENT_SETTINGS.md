# 🤖 AI Agent Settings & Draft Management

Complete guide to configuring and managing the AI agent's auto-response behavior.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Auto-Response Modes](#auto-response-modes)
3. [Settings Management](#settings-management)
4. [Draft Management](#draft-management)
5. [Email Notifications](#email-notifications)
6. [Complete Workflow Examples](#complete-workflow-examples)

---

## Overview

The AI agent now supports **two operation modes**:

### 🚀 **Auto-Response Mode (ON)**
- AI automatically replies to buyer emails
- No manual intervention needed
- Email notifications sent for monitoring

### 📝 **Manual-Review Mode (OFF)**
- AI generates suggested response
- Stored as draft for review
- User can edit before sending
- Email notifications sent for action

---

## Auto-Response Modes

### Mode Comparison

| Feature | Auto-Response ON | Auto-Response OFF |
|---------|------------------|-------------------|
| **AI generates response** | ✅ Yes | ✅ Yes |
| **Auto-send response** | ✅ Immediately | ❌ No (draft) |
| **Email notification** | ✅ Confirmation | ✅ Action required |
| **User review** | ❌ Optional | ✅ Required |
| **Edit before send** | ❌ No | ✅ Yes |
| **Schedule freeze** | ✅ Yes | ✅ Yes |

---

## Settings Management

### 1. **Get AI Settings**

**GET** `/api/campaigns/:campaignId/ai-settings`

```bash
curl https://3vltn.com/api/campaigns/campaign_123/ai-settings
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "campaign_id": "campaign_123",
    "campaign_name": "Campaign for mine.com",
    "auto_response_enabled": true,
    "notification_email": "owner@example.com"
  }
}
```

---

### 2. **Update AI Settings**

**PUT** `/api/campaigns/:campaignId/ai-settings`

```bash
curl -X PUT https://3vltn.com/api/campaigns/campaign_123/ai-settings \
  -H "Content-Type: application/json" \
  -d '{
    "autoResponseEnabled": false,
    "notificationEmail": "owner@example.com"
  }'
```

**Request Body:**
```json
{
  "autoResponseEnabled": false,
  "notificationEmail": "owner@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "AI settings updated successfully",
  "campaign": {
    "campaign_id": "campaign_123",
    "auto_response_enabled": false,
    "notification_email": "owner@example.com",
    ...
  }
}
```

**Parameters:**
- `autoResponseEnabled` (boolean, optional): Enable/disable auto-response
- `notificationEmail` (string, optional): Email for notifications

---

## Draft Management

### 1. **View All Drafts**

**GET** `/api/inbound/drafts?userId={userId}&status={status}`

```bash
# Get all pending drafts for user 12
curl https://3vltn.com/api/inbound/drafts?userId=12&status=pending
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "drafts": [
    {
      "id": 45,
      "campaign_id": "campaign_123",
      "campaign_name": "Campaign for mine.com",
      "buyer_email": "buyer@example.com",
      "buyer_name": "John",
      "inbound_message": "I'm interested but the price is too high...",
      "suggested_response": "Hi John, I understand your concern...",
      "edited_response": null,
      "subject": "Re: About mine.com",
      "status": "pending",
      "received_at": "2025-11-01T10:30:00Z",
      "domain_name": "mine.com"
    }
  ]
}
```

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `status` (optional): Filter by status (`pending`, `edited`, `sent`, `discarded`)

---

### 2. **Get Single Draft**

**GET** `/api/inbound/drafts/:draftId`

```bash
curl https://3vltn.com/api/inbound/drafts/45
```

**Response:**
```json
{
  "success": true,
  "draft": {
    "id": 45,
    "campaign_id": "campaign_123",
    "buyer_email": "buyer@example.com",
    "inbound_message": "I'm interested but the price is too high...",
    "suggested_response": "Hi John, I understand your concern...",
    "subject": "Re: About mine.com",
    ...
  }
}
```

---

### 3. **Edit Draft**

**PUT** `/api/inbound/drafts/:draftId`

```bash
curl -X PUT https://3vltn.com/api/inbound/drafts/45 \
  -H "Content-Type: application/json" \
  -d '{
    "editedResponse": "Hi John, Thanks for your interest! I completely understand...",
    "subject": "Re: Special offer for mine.com"
  }'
```

**Request Body:**
```json
{
  "editedResponse": "Hi John, Thanks for your interest! I completely understand...",
  "subject": "Re: Special offer for mine.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Draft updated successfully",
  "draft": {
    "id": 45,
    "edited_response": "Hi John, Thanks for your interest! I completely understand...",
    "status": "edited",
    ...
  }
}
```

---

### 4. **Send Draft**

**POST** `/api/inbound/drafts/:draftId/send`

```bash
curl -X POST https://3vltn.com/api/inbound/drafts/45/send
```

**Response:**
```json
{
  "success": true,
  "message": "Response sent successfully",
  "draft": {
    "id": 45,
    "status": "sent",
    "sent_at": "2025-11-01T11:00:00Z",
    ...
  }
}
```

**Behavior:**
- Uses `edited_response` if available
- Falls back to `suggested_response` if not edited
- Stores in conversation history
- Sends confirmation notification

---

### 5. **Discard Draft**

**DELETE** `/api/inbound/drafts/:draftId`

```bash
curl -X DELETE https://3vltn.com/api/inbound/drafts/45
```

**Response:**
```json
{
  "success": true,
  "message": "Draft discarded successfully"
}
```

---

## Email Notifications

### 1. **Auto-Response Notification (Mode ON)**

When auto-response is ON, you'll receive a **confirmation** email:

**Subject:** `✅ Auto-Reply Sent: mine.com`

**Content:**
- ✅ Auto-response confirmation
- 👤 Buyer's email and message
- 🤖 AI response (already sent)
- 💬 Link to view conversation

---

### 2. **Manual-Review Notification (Mode OFF)**

When auto-response is OFF, you'll receive an **action-required** email:

**Subject:** `🔔 New Reply Received: mine.com`

**Content:**
- ℹ️ Auto-response is OFF indicator
- 👤 Buyer's email and message
- 🤖 AI-generated suggested response
- ✏️ "Review & Edit" button
- ✅ "Send As-Is" button

---

### 3. **Manual Send Confirmation**

After manually sending a draft, you'll receive:

**Subject:** `✅ Response Sent: mine.com`

**Content:**
- ✅ Send confirmation
- 👤 Recipient details
- 📝 Sent message content

---

## Complete Workflow Examples

### 🚀 Workflow 1: Auto-Response ON

```
1. Buyer sends email
   ↓
2. System receives email
   ↓
3. ❄️  Pauses all scheduled emails
   ↓
4. 🤖 AI generates response
   ↓
5. 📤 Sends response immediately
   ↓
6. 💾 Stores in conversation history
   ↓
7. 📧 Sends confirmation notification
   ↓
DONE ✅
```

**You receive:**
```
From: noreply@yourapp.com
Subject: ✅ Auto-Reply Sent: mine.com

✅ Auto-response is ON - AI has automatically replied to this message.

👤 From: buyer@example.com
💬 Their Message: "I'm interested..."

🤖 AI Response (Already Sent):
"Hi there, Thanks for your interest..."

[View Full Conversation]
```

---

### 📝 Workflow 2: Auto-Response OFF

```
1. Buyer sends email
   ↓
2. System receives email
   ↓
3. ❄️  Pauses all scheduled emails
   ↓
4. 🤖 AI generates suggested response
   ↓
5. 💾 Stores as draft (status: pending)
   ↓
6. 📧 Sends review notification
   ↓
7. 🔄 YOU REVIEW & EDIT
   ↓
8. ✅ YOU SEND manually
   ↓
9. 📤 Email sent to buyer
   ↓
10. 💾 Stored in conversation history
   ↓
11. 📧 Sends confirmation notification
   ↓
DONE ✅
```

**You receive:**
```
From: noreply@yourapp.com
Subject: 🔔 New Reply Received: mine.com

ℹ️ Auto-response is OFF - This reply requires your review and approval before sending.

👤 From: buyer@example.com
💬 Message: "I'm interested but the price is too high..."

🤖 AI-Generated Response (Review Required):
"Hi there, I understand your concern about the price..."

[✏️ Review & Edit Response]  [✅ Send As-Is]
```

**You click "Review & Edit":**
1. Frontend calls `GET /api/inbound/drafts/45`
2. You edit the response
3. Frontend calls `PUT /api/inbound/drafts/45` with edited text
4. You click "Send"
5. Frontend calls `POST /api/inbound/drafts/45/send`
6. Email sent, buyer receives your edited response

---

## Integration Examples

### Frontend: Toggle Auto-Response

```javascript
// Turn OFF auto-response for a campaign
async function disableAutoResponse(campaignId, notificationEmail) {
  const response = await fetch(
    `https://3vltn.com/api/campaigns/${campaignId}/ai-settings`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autoResponseEnabled: false,
        notificationEmail: notificationEmail
      })
    }
  );
  return await response.json();
}

// Turn ON auto-response
async function enableAutoResponse(campaignId) {
  const response = await fetch(
    `https://3vltn.com/api/campaigns/${campaignId}/ai-settings`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autoResponseEnabled: true
      })
    }
  );
  return await response.json();
}
```

---

### Frontend: Draft Management Dashboard

```javascript
// Get all pending drafts for current user
async function getPendingDrafts(userId) {
  const response = await fetch(
    `https://3vltn.com/api/inbound/drafts?userId=${userId}&status=pending`
  );
  return await response.json();
}

// Edit a draft
async function editDraft(draftId, editedText, newSubject) {
  const response = await fetch(
    `https://3vltn.com/api/inbound/drafts/${draftId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        editedResponse: editedText,
        subject: newSubject
      })
    }
  );
  return await response.json();
}

// Send draft
async function sendDraft(draftId) {
  const response = await fetch(
    `https://3vltn.com/api/inbound/drafts/${draftId}/send`,
    { method: 'POST' }
  );
  return await response.json();
}

// Discard draft
async function discardDraft(draftId) {
  const response = await fetch(
    `https://3vltn.com/api/inbound/drafts/${draftId}`,
    { method: 'DELETE' }
  );
  return await response.json();
}
```

---

### Frontend: Complete Draft Review Page

```javascript
import React, { useState, useEffect } from 'react';

function DraftReviewPage({ draftId }) {
  const [draft, setDraft] = useState(null);
  const [editedResponse, setEditedResponse] = useState('');
  const [subject, setSubject] = useState('');

  useEffect(() => {
    loadDraft();
  }, [draftId]);

  async function loadDraft() {
    const response = await fetch(
      `https://3vltn.com/api/inbound/drafts/${draftId}`
    );
    const data = await response.json();
    setDraft(data.draft);
    setEditedResponse(data.draft.edited_response || data.draft.suggested_response);
    setSubject(data.draft.subject);
  }

  async function handleSave() {
    await fetch(`https://3vltn.com/api/inbound/drafts/${draftId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        editedResponse,
        subject
      })
    });
    alert('Draft saved!');
  }

  async function handleSend() {
    await fetch(`https://3vltn.com/api/inbound/drafts/${draftId}/send`, {
      method: 'POST'
    });
    alert('Response sent!');
  }

  if (!draft) return <div>Loading...</div>;

  return (
    <div className="draft-review">
      <h2>Review Response for {draft.buyer_email}</h2>
      
      <div className="inbound-message">
        <h3>Their Message:</h3>
        <p>{draft.inbound_message}</p>
      </div>
      
      <div className="response-editor">
        <h3>Your Response:</h3>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
        />
        <textarea
          value={editedResponse}
          onChange={(e) => setEditedResponse(e.target.value)}
          rows="10"
          placeholder="Edit your response here..."
        />
      </div>
      
      <div className="actions">
        <button onClick={handleSave}>💾 Save Draft</button>
        <button onClick={handleSend}>📤 Send Now</button>
        <button onClick={() => discardDraft(draftId)}>🗑️ Discard</button>
      </div>
    </div>
  );
}
```

---

## Database Schema

### New Table: `draft_responses`

```sql
CREATE TABLE draft_responses (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_name VARCHAR(255),
  inbound_message TEXT NOT NULL,
  suggested_response TEXT NOT NULL,
  edited_response TEXT,
  subject VARCHAR(255),
  received_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'edited', 'sent', 'discarded')),
  sent_at TIMESTAMP,
  user_id INTEGER,
  domain_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE
);
```

### New Columns in `campaigns`

```sql
ALTER TABLE campaigns 
ADD COLUMN auto_response_enabled BOOLEAN DEFAULT true;

ALTER TABLE campaigns 
ADD COLUMN notification_email VARCHAR(255);
```

---

## Status Flow

### Draft Status Transitions

```
pending → User hasn't reviewed yet
   ↓ (user edits)
edited → User modified the response
   ↓ (user sends)
sent → Response delivered to buyer
```

```
pending → User doesn't want to send
   ↓ (user discards)
discarded → Draft ignored
```

---

## Console Log Examples

### Auto-Response ON
```
════════════════════════════════════════════════════════════
📨 INBOUND EMAIL RECEIVED
════════════════════════════════════════════════════════════
📧 From: buyer@example.com
💬 Message: I'm interested...

⚙️  Auto-response: ON
🚀 AUTO-RESPONSE MODE: Sending reply immediately...
✅ AI response sent successfully!
📧 Sending notification to owner@example.com...
✅ Notification sent!
════════════════════════════════════════════════════════════
```

### Auto-Response OFF
```
════════════════════════════════════════════════════════════
📨 INBOUND EMAIL RECEIVED
════════════════════════════════════════════════════════════
📧 From: buyer@example.com
💬 Message: I'm interested...

⚙️  Auto-response: OFF
📝 MANUAL-REVIEW MODE: Creating draft for review...
💾 Draft created with ID: 45
📧 Sending review notification to owner@example.com...
✅ Review notification sent!
════════════════════════════════════════════════════════════
```

---

## Summary

✅ **Auto-Response Toggle**: Turn AI agent ON/OFF per campaign  
✅ **Email Notifications**: Get notified of all activity  
✅ **Draft Management**: Review, edit, and send responses  
✅ **Full Control**: Manual override for any response  
✅ **Monitoring**: View all drafts in dashboard  
✅ **Flexible**: Different settings per campaign  

**The AI agent is now fully controllable while remaining powerful!** 🚀

