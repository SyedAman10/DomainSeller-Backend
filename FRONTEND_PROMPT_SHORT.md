# Quick Frontend Prompt

Build a Next.js campaign management dashboard that integrates with the backend running on `http://localhost:5000`.

## Backend APIs Available:

1. **POST** `/api/campaigns/send-batch` - Send up to 10 emails
   ```json
   { "campaignId": 1, "emails": [{ "to": "email@example.com", "subject": "...", "html": "..." }] }
   ```

2. **GET** `/api/campaigns/:id/stats` - Get campaign statistics (sent, opened, clicked, open rate, click rate)

3. **POST** `/api/campaigns/schedule-followup` - Schedule follow-up email
   ```json
   { "campaignId": 1, "buyerEmail": "...", "subject": "...", "body": "...", "scheduledFor": "ISO date" }
   ```

4. **GET** `/api/campaigns/:id` - Get campaign details with buyers

## Pages Needed:

1. **Dashboard (`/dashboard`)** - Campaign cards with stats, create campaign button
2. **Campaign Details (`/campaigns/[id]`)** - Charts, email activity table, analytics
3. **Send Batch (`/campaigns/[id]/send-batch`)** - Email composer, recipient list (CSV upload), send button
4. **Schedule Follow-up (`/campaigns/[id]/schedule-followup`)** - Schedule form with date picker

## Tech Stack:
- Next.js 14+ (TypeScript, App Router)
- Tailwind CSS
- Shadcn/ui or Radix UI components
- React Query for data fetching
- Recharts for analytics
- React Hook Form for forms

## Key Features:
- ✅ Modern, responsive UI
- ✅ Real-time campaign statistics with charts
- ✅ Send batch emails (max 10 per batch)
- ✅ Schedule automated follow-ups
- ✅ CSV upload for bulk recipients
- ✅ Email activity tracking table
- ✅ Toast notifications for success/error
- ✅ Loading states and error handling

## Design:
- Sidebar navigation
- Stats cards with icons and percentages
- Charts: Line (sent over time), Donut (status distribution), Bar (engagement)
- Email status badges (Delivered=blue, Opened=green, Clicked=purple, Bounced=red)
- Mobile responsive

## Important:
- Backend on port 5000, frontend on port 3000
- Max 10 emails per batch (show warning if exceeded)
- Scheduled emails process every 5 minutes
- Stats update in real-time (poll every 30 seconds)

Start with dashboard → send batch functionality → analytics/stats display.

