# Frontend Implementation Prompt

Build a Next.js frontend application for the DomainSeller Campaign Management system that integrates with the existing backend APIs.

---

## 🎯 Project Overview

Create a modern, responsive campaign management dashboard where users can:
- Create and manage email campaigns for domain sales
- Send batch emails to potential buyers
- Schedule follow-up emails
- View campaign statistics and analytics
- Track email engagement (opens, clicks, bounces)

---

## 🔧 Tech Stack

**Required:**
- Next.js 14+ (App Router preferred)
- TypeScript
- Tailwind CSS for styling
- React Hook Form for forms
- Axios or Fetch API for HTTP requests

**Recommended:**
- Shadcn/ui or Radix UI for components
- Recharts or Chart.js for analytics graphs
- React Query (TanStack Query) for data fetching
- Zustand or Context API for state management
- React Hot Toast for notifications

---

## 🔌 Backend API Integration

**Backend URL:** `http://localhost:5000`

### Available Endpoints:

#### 1. Health Check
```
GET /api/health
```

#### 2. Send Batch Emails
```
POST /api/campaigns/send-batch
Body: {
  campaignId: number,
  emails: [{
    to: string,
    subject: string,
    html: string,
    text?: string,
    tags?: string[]
  }]
}
```
- Max 10 emails per batch
- Returns success count and any errors

#### 3. Get Campaign Statistics
```
GET /api/campaigns/:campaignId/stats
```
Returns:
- Sent count
- Scheduled count
- Delivered, opened, clicked counts
- Open rate and click rate percentages
- Bounced emails

#### 4. Schedule Follow-up Email
```
POST /api/campaigns/schedule-followup
Body: {
  campaignId: number,
  buyerEmail: string,
  subject: string,
  body: string,
  scheduledFor: string (ISO date)
}
```

#### 5. Get Campaign Details
```
GET /api/campaigns/:campaignId
```
Returns campaign info and associated buyers

---

## 📱 Pages to Build

### 1. Dashboard (`/dashboard`)
**Purpose:** Overview of all campaigns

**Features:**
- List of all campaigns with summary cards
- Quick stats: Total sent, Total scheduled, Average open rate
- Recent activity feed
- "Create New Campaign" button

**UI Components:**
- Campaign cards showing:
  - Campaign name
  - Domain name
  - Status badge (active/paused/completed)
  - Quick stats (sent/opened/clicked)
  - Actions: View Details, Send Emails, Schedule Follow-up

### 2. Campaign Details (`/campaigns/[id]`)
**Purpose:** Detailed view of a single campaign

**Features:**
- Campaign header with name, domain, and status
- Analytics section with charts:
  - Line chart: Emails sent over time
  - Pie chart: Email status distribution (delivered/opened/clicked/bounced)
  - Bar chart: Daily open/click rates
- Email activity table:
  - Columns: Recipient, Status, Sent Date, Opened, Clicked
  - Sortable and filterable
  - Pagination
- Campaign buyers list
- Action buttons: Send Batch, Schedule Follow-up

### 3. Send Batch Emails (`/campaigns/[id]/send-batch`)
**Purpose:** Send emails to multiple recipients

**Features:**
- Form to compose email:
  - Email subject (text input)
  - Email tone selector (dropdown: Professional, Friendly, Urgent)
  - Email body (rich text editor or textarea)
  - Preview pane showing how email will look
- Recipient management:
  - Upload CSV of email addresses
  - Manually add/remove recipients
  - Show recipient count
  - Warning if > 10 recipients (batch limit)
- Template selector (optional):
  - Pre-built email templates
  - Merge fields: {{buyer_name}}, {{domain_name}}, etc.
- Send button with confirmation modal
- Progress indicator while sending
- Results modal showing:
  - ✅ Successfully sent: X
  - ❌ Failed: Y (with error details)

### 4. Schedule Follow-up (`/campaigns/[id]/schedule-followup`)
**Purpose:** Schedule automated follow-up emails

**Features:**
- Select recipient (dropdown of campaign buyers)
- Email subject and body
- Date/time picker for scheduling
- Preview of scheduled email
- List of already scheduled follow-ups with options to:
  - Edit
  - Delete
  - Reschedule

### 5. Create Campaign (`/campaigns/new`)
**Purpose:** Create a new campaign

**Features:**
- Campaign name input
- Domain name input
- Email tone selection
- Optional: Import buyers from CSV
- Create button

### 6. Settings (`/settings`)
**Purpose:** Configure app settings

**Features:**
- Mailgun settings display (read-only)
- Email signature editor
- Default email templates
- Notification preferences

---

## 🎨 Design Requirements

### Color Scheme:
- Primary: Blue (#3B82F6) for actions
- Success: Green (#10B981) for positive metrics
- Warning: Yellow (#F59E0B) for scheduled items
- Danger: Red (#EF4444) for errors/bounces
- Neutral: Gray scale for text and backgrounds

### Layout:
- Sidebar navigation (left side):
  - Dashboard
  - Campaigns
  - Settings
- Top navigation bar:
  - Search bar
  - Notifications icon
  - User profile dropdown
- Main content area (responsive)

### Components:
- **Campaign Card:**
  - Shadow on hover
  - Status badge (colored pill)
  - Mini stats with icons
  - Actions dropdown menu

- **Stats Card:**
  - Large number display
  - Percentage change indicator (↑ green / ↓ red)
  - Icon representation
  - Subtle background color

- **Email Status Badge:**
  - Delivered: Blue
  - Opened: Green
  - Clicked: Purple
  - Bounced: Red
  - Scheduled: Yellow

- **Action Buttons:**
  - Primary: Filled blue
  - Secondary: Outlined
  - Danger: Filled red
  - Hover states with subtle animations

### Responsive Design:
- Mobile-first approach
- Sidebar collapses to hamburger menu on mobile
- Tables convert to cards on small screens
- Charts resize appropriately

---

## 🔐 API Integration Guidelines

### 1. Create API Client (`lib/api.ts`)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const campaignApi = {
  sendBatch: (campaignId: number, emails: Email[]) => 
    api.post('/api/campaigns/send-batch', { campaignId, emails }),
  
  getStats: (campaignId: number) => 
    api.get(`/api/campaigns/${campaignId}/stats`),
  
  scheduleFollowup: (data: FollowupData) => 
    api.post('/api/campaigns/schedule-followup', data),
  
  getCampaign: (campaignId: number) => 
    api.get(`/api/campaigns/${campaignId}`),
};

export default api;
```

### 2. Error Handling

- Show user-friendly error messages using toast notifications
- Handle network errors gracefully
- Retry failed requests (for non-destructive operations)
- Log errors to console in development

### 3. Loading States

- Show loading spinners during API calls
- Disable buttons while processing
- Use skeleton loaders for initial page loads
- Optimistic UI updates where appropriate

### 4. Data Fetching

Use React Query for caching and automatic refetching:

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['campaign', campaignId],
  queryFn: () => campaignApi.getCampaign(campaignId),
  refetchInterval: 30000, // Refetch every 30 seconds
});
```

---

## 📊 Analytics Implementation

### Campaign Stats Display:

1. **Overview Cards (Top of page):**
   - Total Emails Sent
   - Total Opened (with open rate %)
   - Total Clicked (with click rate %)
   - Total Bounced

2. **Charts:**
   - **Line Chart:** Emails sent vs opened over time
   - **Donut Chart:** Email status distribution
   - **Bar Chart:** Hourly/daily performance

3. **Activity Table:**
   - Recent email activities
   - Real-time updates via polling or WebSocket (optional)

---

## ✉️ Email Composer Features

### Rich Text Editor (Optional):
- Bold, italic, underline
- Links
- Lists
- Text alignment
- Basic HTML support

### Template Variables:
Support merge fields that get replaced:
- `{{buyer_name}}` → Recipient name
- `{{domain_name}}` → Campaign domain
- `{{your_name}}` → Sender name
- `{{campaign_name}}` → Campaign name

### Email Preview:
- Side-by-side or toggle view
- Shows how email will render
- Test send to self (optional)

---

## 🔔 User Experience Enhancements

### 1. Notifications:
- Success toast when emails sent successfully
- Error toast with details if sending fails
- Info toast when scheduling email
- Warning toast when batch limit exceeded

### 2. Confirmations:
- Confirm before sending batch emails
- Confirm before deleting scheduled emails
- Show summary before confirming

### 3. Real-time Updates:
- Poll campaign stats every 30 seconds
- Update UI when new webhook events received
- Show "New activity" badge when stats change

### 4. CSV Upload:
- Drag-and-drop CSV file
- Parse and validate email addresses
- Show preview of imported emails
- Handle errors (invalid format, duplicates)

---

## 🚀 Getting Started

### 1. Environment Setup

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=DomainSeller Campaign Manager
```

### 2. Folder Structure

```
app/
├── (dashboard)/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── campaigns/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   ├── send-batch/
│   │   │   │   └── page.tsx
│   │   │   └── schedule-followup/
│   │   │       └── page.tsx
│   │   └── new/
│   │       └── page.tsx
│   └── settings/
│       └── page.tsx
├── layout.tsx
└── page.tsx

components/
├── ui/                    # Reusable UI components
├── campaign/              # Campaign-specific components
│   ├── CampaignCard.tsx
│   ├── StatsCard.tsx
│   └── EmailTable.tsx
├── layout/                # Layout components
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── Navigation.tsx
└── forms/                 # Form components
    ├── EmailComposer.tsx
    └── ScheduleForm.tsx

lib/
├── api.ts                 # API client
├── types.ts               # TypeScript types
└── utils.ts               # Utility functions

hooks/
├── useCampaigns.ts        # Campaign data hooks
└── useEmailSender.ts      # Email sending logic
```

### 3. TypeScript Types

```typescript
interface Campaign {
  campaign_id: number;
  user_id: number;
  domain_name: string;
  campaign_name: string;
  email_tone: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CampaignStats {
  sent: number;
  scheduled: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: string;
  clickRate: string;
}

interface Email {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: string[];
}

interface FollowupData {
  campaignId: number;
  buyerEmail: string;
  subject: string;
  body: string;
  scheduledFor: string;
}
```

---

## ✅ Acceptance Criteria

Your frontend is complete when:

- ✅ User can view all campaigns on dashboard
- ✅ User can send batch emails (up to 10 at once)
- ✅ User can view real-time campaign statistics
- ✅ User can schedule follow-up emails
- ✅ Charts display email performance data
- ✅ Email activity table shows recipient engagement
- ✅ All forms have proper validation
- ✅ Loading states shown during API calls
- ✅ Error messages displayed clearly
- ✅ Responsive design works on mobile/tablet/desktop
- ✅ CSV upload for bulk email import works
- ✅ Email preview shows before sending

---

## 🎁 Bonus Features (Optional)

- **Email Templates Library** - Pre-built templates for different scenarios
- **A/B Testing** - Test different subject lines
- **Export Reports** - Download campaign stats as PDF/CSV
- **Dark Mode** - Toggle between light/dark themes
- **Keyboard Shortcuts** - Power user features
- **Email Scheduling Calendar** - Visual calendar view of scheduled emails
- **Recipient Segments** - Group buyers by category
- **Auto-retry Failed Emails** - Automatically retry bounced emails

---

## 📝 Important Notes

1. **Backend runs on port 5000** - Ensure CORS is configured
2. **Batch limit is 10 emails** - Frontend should prevent sending more
3. **Email queue runs every 5 minutes** - Inform users scheduled emails may take up to 5 minutes
4. **Webhook updates are async** - Stats may not update immediately
5. **Campaign IDs are integers** - Use existing campaigns from database

---

## 🧪 Testing Recommendations

- Test with real campaign IDs from your database
- Verify batch email sending with small batches first
- Test scheduling with near-future dates
- Confirm stats update after emails sent
- Test responsive design on multiple devices
- Verify error handling with invalid inputs

---

## 📚 Documentation to Create

After building, please document:
- How to run the frontend locally
- Environment variables required
- Component usage examples
- API integration patterns used

---

**Start with the dashboard page showing campaign cards, then build out the send-batch functionality, followed by the analytics/stats display.**

Good luck! 🚀

