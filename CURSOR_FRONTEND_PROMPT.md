# 🎯 FRONTEND PROMPT FOR CURSOR - AI Agent Draft Management

Copy this entire prompt into Cursor and paste it in the chat/composer:

---

## 📋 Task: Implement AI Agent Draft Management in Dashboard

I need you to add draft management functionality to my DomainSeller dashboard. Here's what needs to be implemented:

---

## 🎯 Requirements

### 1. **Draft Inbox Section** (Add to Dashboard)
- Show pending draft responses that need review
- Display count badge (e.g., "3 pending")
- Show buyer email, message preview, domain name
- Show time received
- Click to open draft editor

### 2. **Draft Editor Modal/Page**
- Display buyer's inbound message
- Show AI-generated suggested response (editable)
- Subject field (editable)
- Send button
- Discard button
- Save draft button (auto-save)

### 3. **URL Parameters Support**
- `?draftId=123` - Open draft editor for draft 123
- `?draftId=123&action=send` - Auto-send draft 123
- `?campaignId=abc&view=conversations` - Show conversations for campaign

---

## 🔌 Backend API Endpoints (Already Implemented)

### Get All Drafts
```javascript
GET /api/inbound/drafts?userId={userId}&status=pending
Response: {
  success: true,
  count: 3,
  drafts: [
    {
      id: 45,
      campaign_id: "campaign_123",
      campaign_name: "Campaign for mine.com",
      buyer_email: "buyer@example.com",
      buyer_name: "John",
      inbound_message: "I'm interested but price is too high...",
      suggested_response: "Hi John, I understand...",
      edited_response: null,
      subject: "Re: About mine.com",
      status: "pending",
      received_at: "2025-11-01T10:30:00Z",
      domain_name: "mine.com"
    }
  ]
}
```

### Get Single Draft
```javascript
GET /api/inbound/drafts/{draftId}
Response: {
  success: true,
  draft: { ...same as above... }
}
```

### Edit Draft
```javascript
PUT /api/inbound/drafts/{draftId}
Body: {
  editedResponse: "Your edited text...",
  subject: "Optional new subject"
}
Response: {
  success: true,
  message: "Draft updated successfully",
  draft: {...}
}
```

### Send Draft
```javascript
POST /api/inbound/drafts/{draftId}/send
Response: {
  success: true,
  message: "Response sent successfully"
}
```

### Discard Draft
```javascript
DELETE /api/inbound/drafts/{draftId}
Response: {
  success: true,
  message: "Draft discarded successfully"
}
```

---

## 🎨 UI Design Requirements

### Draft Inbox Card
```
┌──────────────────────────────────────────────────┐
│ 📝 Pending Replies (3)                  [View All]│
├──────────────────────────────────────────────────┤
│                                                  │
│ 🟡 mine.com • buyer@example.com                 │
│    "I'm interested but the price is..."          │
│    AI suggests: "Hi there, I understand..."      │
│    ⏰ 5 minutes ago          [Review & Send →]   │
│                                                  │
│ 🟡 premium.com • client@corp.com                │
│    "What's your best offer?"                     │
│    AI suggests: "I can offer..."                 │
│    ⏰ 1 hour ago             [Review & Send →]   │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Draft Editor Modal
```
┌─────────────────────────────────────────────────┐
│  ✉️ Reply to buyer@example.com                  │
│  Campaign: mine.com                             │
├─────────────────────────────────────────────────┤
│                                                 │
│  📥 Their Message:                              │
│  ┌─────────────────────────────────────────┐   │
│  │ I'm interested in mine.com but the      │   │
│  │ price seems too high. Can you           │   │
│  │ negotiate?                              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  📤 Your Response:                              │
│  Subject: [Re: About mine.com             ]     │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Hi there,                               │   │
│  │                                         │   │
│  │ I understand your concern about the     │   │
│  │ price. mine.com is valuable because...  │   │
│  │                                         │   │
│  │ [Editable textarea - 10 rows]          │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  💡 AI-generated • You can edit before sending  │
│                                                 │
│  [💾 Save Draft]  [📤 Send Reply]  [🗑️ Discard] │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📁 Suggested File Structure

```
src/
├── components/
│   ├── drafts/
│   │   ├── DraftInbox.jsx          (Shows list of pending drafts)
│   │   ├── DraftCard.jsx           (Individual draft preview card)
│   │   ├── DraftEditor.jsx         (Edit/send draft modal)
│   │   └── DraftBadge.jsx          (Notification badge with count)
│   └── dashboard/
│       └── CampaignDashboard.jsx   (Main dashboard - add draft section)
│
├── services/
│   └── draftService.js             (API calls for drafts)
│
└── hooks/
    └── useDrafts.js                (Custom hook for draft management)
```

---

## 🔧 Implementation Guide

### Step 1: Create Draft Service (API calls)

```javascript
// services/draftService.js
const API_URL = 'https://3vltn.com/api';

export const draftService = {
  // Get all drafts
  async getDrafts(userId, status = 'pending') {
    const response = await fetch(
      `${API_URL}/inbound/drafts?userId=${userId}&status=${status}`
    );
    return response.json();
  },

  // Get single draft
  async getDraft(draftId) {
    const response = await fetch(`${API_URL}/inbound/drafts/${draftId}`);
    return response.json();
  },

  // Update draft
  async updateDraft(draftId, editedResponse, subject) {
    const response = await fetch(`${API_URL}/inbound/drafts/${draftId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editedResponse, subject })
    });
    return response.json();
  },

  // Send draft
  async sendDraft(draftId) {
    const response = await fetch(`${API_URL}/inbound/drafts/${draftId}/send`, {
      method: 'POST'
    });
    return response.json();
  },

  // Discard draft
  async discardDraft(draftId) {
    const response = await fetch(`${API_URL}/inbound/drafts/${draftId}`, {
      method: 'DELETE'
    });
    return response.json();
  }
};
```

### Step 2: Create Custom Hook

```javascript
// hooks/useDrafts.js
import { useState, useEffect } from 'react';
import { draftService } from '../services/draftService';

export function useDrafts(userId) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const data = await draftService.getDrafts(userId, 'pending');
      setDrafts(data.drafts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchDrafts();
    }
  }, [userId]);

  return { drafts, loading, error, refresh: fetchDrafts };
}
```

### Step 3: Draft Inbox Component

```javascript
// components/drafts/DraftInbox.jsx
import React from 'react';
import { useDrafts } from '../../hooks/useDrafts';
import DraftCard from './DraftCard';

export default function DraftInbox({ userId, onDraftClick }) {
  const { drafts, loading, error } = useDrafts(userId);

  if (loading) return <div>Loading drafts...</div>;
  if (error) return <div>Error: {error}</div>;
  if (drafts.length === 0) return null; // Hide if no drafts

  return (
    <div className="draft-inbox">
      <div className="draft-header">
        <h3>📝 Pending Replies ({drafts.length})</h3>
      </div>
      
      <div className="draft-list">
        {drafts.map(draft => (
          <DraftCard 
            key={draft.id} 
            draft={draft}
            onClick={() => onDraftClick(draft.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

### Step 4: Draft Card Component

```javascript
// components/drafts/DraftCard.jsx
import React from 'react';

export default function DraftCard({ draft, onClick }) {
  const timeAgo = getTimeAgo(draft.received_at);
  
  return (
    <div className="draft-card" onClick={onClick}>
      <div className="draft-domain">
        🟡 {draft.domain_name} • {draft.buyer_email}
      </div>
      <div className="draft-message">
        "{draft.inbound_message.substring(0, 50)}..."
      </div>
      <div className="draft-ai-preview">
        AI suggests: "{draft.suggested_response.substring(0, 50)}..."
      </div>
      <div className="draft-footer">
        <span className="draft-time">⏰ {timeAgo}</span>
        <button className="draft-review-btn">Review & Send →</button>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now - then) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
```

### Step 5: Draft Editor Modal

```javascript
// components/drafts/DraftEditor.jsx
import React, { useState, useEffect } from 'react';
import { draftService } from '../../services/draftService';

export default function DraftEditor({ draftId, onClose, onSuccess }) {
  const [draft, setDraft] = useState(null);
  const [editedResponse, setEditedResponse] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadDraft();
  }, [draftId]);

  async function loadDraft() {
    try {
      const data = await draftService.getDraft(draftId);
      setDraft(data.draft);
      setEditedResponse(data.draft.edited_response || data.draft.suggested_response);
      setSubject(data.draft.subject);
      setLoading(false);
    } catch (error) {
      console.error('Error loading draft:', error);
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      await draftService.updateDraft(draftId, editedResponse, subject);
      alert('Draft saved!');
    } catch (error) {
      alert('Failed to save: ' + error.message);
    }
  }

  async function handleSend() {
    if (!confirm('Send this response?')) return;
    
    try {
      setSending(true);
      await draftService.sendDraft(draftId);
      alert('Response sent successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to send: ' + error.message);
      setSending(false);
    }
  }

  async function handleDiscard() {
    if (!confirm('Discard this draft?')) return;
    
    try {
      await draftService.discardDraft(draftId);
      onSuccess();
      onClose();
    } catch (error) {
      alert('Failed to discard: ' + error.message);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!draft) return <div>Draft not found</div>;

  return (
    <div className="draft-editor-modal">
      <div className="draft-editor-content">
        <div className="draft-editor-header">
          <h2>✉️ Reply to {draft.buyer_email}</h2>
          <p>Campaign: {draft.campaign_name}</p>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="draft-editor-body">
          <div className="inbound-message-section">
            <h3>📥 Their Message:</h3>
            <div className="inbound-message-box">
              {draft.inbound_message}
            </div>
          </div>

          <div className="response-section">
            <h3>📤 Your Response:</h3>
            <input
              type="text"
              className="subject-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
            <textarea
              className="response-textarea"
              value={editedResponse}
              onChange={(e) => setEditedResponse(e.target.value)}
              rows="10"
              placeholder="Edit your response here..."
            />
            <p className="ai-hint">
              💡 AI-generated • You can edit before sending
            </p>
          </div>
        </div>

        <div className="draft-editor-footer">
          <button onClick={handleSave} className="save-btn">
            💾 Save Draft
          </button>
          <button 
            onClick={handleSend} 
            className="send-btn"
            disabled={sending}
          >
            {sending ? 'Sending...' : '📤 Send Reply'}
          </button>
          <button onClick={handleDiscard} className="discard-btn">
            🗑️ Discard
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 6: Integrate into Dashboard

```javascript
// components/dashboard/CampaignDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DraftInbox from '../drafts/DraftInbox';
import DraftEditor from '../drafts/DraftEditor';

export default function CampaignDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [showDraftEditor, setShowDraftEditor] = useState(false);
  
  const userId = 12; // Get from auth context

  // Handle URL parameters
  useEffect(() => {
    const draftId = searchParams.get('draftId');
    const action = searchParams.get('action');
    
    if (draftId) {
      setSelectedDraftId(draftId);
      
      if (action === 'send') {
        // Auto-send if action=send
        handleAutoSend(draftId);
      } else {
        // Open editor
        setShowDraftEditor(true);
      }
    }
  }, [searchParams]);

  async function handleAutoSend(draftId) {
    if (confirm('Send this draft immediately?')) {
      try {
        await draftService.sendDraft(draftId);
        alert('Response sent!');
        setSearchParams({}); // Clear URL params
      } catch (error) {
        alert('Failed to send: ' + error.message);
      }
    }
  }

  function handleDraftClick(draftId) {
    setSelectedDraftId(draftId);
    setShowDraftEditor(true);
  }

  function handleDraftClose() {
    setShowDraftEditor(false);
    setSelectedDraftId(null);
    setSearchParams({}); // Clear URL params
  }

  return (
    <div className="campaign-dashboard">
      <h1>Dashboard</h1>
      
      {/* Draft Inbox Section */}
      <DraftInbox 
        userId={userId} 
        onDraftClick={handleDraftClick}
      />
      
      {/* Other dashboard sections */}
      <div className="campaigns-section">
        {/* Your existing campaign stuff */}
      </div>

      {/* Draft Editor Modal */}
      {showDraftEditor && selectedDraftId && (
        <DraftEditor
          draftId={selectedDraftId}
          onClose={handleDraftClose}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}
```

---

## 🎨 Suggested CSS Styles

```css
/* Draft Inbox */
.draft-inbox {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.draft-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.draft-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* Draft Card */
.draft-card {
  border: 1px solid #e0e0e0;
  border-left: 4px solid #ff9800;
  padding: 15px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.draft-card:hover {
  background: #f9f9f9;
  transform: translateX(5px);
}

.draft-domain {
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.draft-message {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
}

.draft-ai-preview {
  color: #2196F3;
  font-size: 13px;
  font-style: italic;
  margin-bottom: 10px;
}

.draft-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.draft-time {
  color: #999;
  font-size: 12px;
}

.draft-review-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

/* Draft Editor Modal */
.draft-editor-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.draft-editor-content {
  background: white;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.draft-editor-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
}

.draft-editor-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.inbound-message-section {
  margin-bottom: 30px;
}

.inbound-message-box {
  background: #f5f5f5;
  padding: 15px;
  border-left: 4px solid #667eea;
  border-radius: 4px;
  white-space: pre-wrap;
}

.response-section h3 {
  margin-bottom: 10px;
}

.subject-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
  font-size: 14px;
}

.response-textarea {
  width: 100%;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

.ai-hint {
  color: #666;
  font-size: 12px;
  margin-top: 8px;
}

.draft-editor-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.save-btn, .send-btn, .discard-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.save-btn {
  background: #e0e0e0;
  color: #333;
}

.send-btn {
  background: #4CAF50;
  color: white;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.discard-btn {
  background: #f44336;
  color: white;
}
```

---

## ✅ Acceptance Criteria

- [ ] Draft inbox shows on dashboard when drafts exist
- [ ] Draft count badge displays correctly
- [ ] Clicking draft opens editor modal
- [ ] Can edit AI-generated response
- [ ] Can edit subject line
- [ ] Save draft button works
- [ ] Send button sends email and closes modal
- [ ] Discard button removes draft
- [ ] URL parameter `?draftId=123` opens draft
- [ ] URL parameter `?action=send` auto-sends draft
- [ ] Mobile responsive design
- [ ] Loading states for all actions
- [ ] Error handling with user-friendly messages
- [ ] Auto-refresh after send/discard

---

## 🎯 Priority Features

**Phase 1 (MVP):**
- ✅ Draft inbox list
- ✅ Draft editor modal
- ✅ Send/discard functionality
- ✅ URL parameter support

**Phase 2 (Nice to have):**
- Auto-save while editing
- Rich text editor
- Email preview
- Draft notifications
- Keyboard shortcuts (Ctrl+Enter to send)

---

## 🧪 Testing

Test these scenarios:
1. No drafts - inbox should hide
2. Multiple drafts - all show correctly
3. Edit and save - changes persist
4. Send draft - email sent, draft removed
5. Discard draft - draft removed
6. URL with `?draftId=123` - opens editor
7. URL with `?draftId=123&action=send` - sends immediately
8. Mobile view - responsive layout

---

## 📚 Additional Notes

- Backend API is already fully implemented and tested
- Email notifications already working
- All database tables created
- Focus on clean, modern UI
- Use your existing styling/component library
- Follow your project's code structure

---

## 🚀 Start Implementation

Begin with creating the `draftService.js` file, then build components one by one. Test each component independently before integrating into the dashboard.

**Backend endpoints are live at:** `https://3vltn.com/api`

**Let me know if you need any clarification!**

