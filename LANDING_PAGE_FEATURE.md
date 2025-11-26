# 🌐 Landing Page Feature

## Overview

The landing page feature allows you to automatically include a beautifully formatted landing page link in your initial campaign emails. When enabled, buyers will see a prominent call-to-action button to visit your domain's landing page.

---

## 🚀 Setup

### 1. Run Database Migration

```bash
node setup-landing-page.js
```

This adds two new fields to the `campaigns` table:
- `include_landing_page` (boolean) - Whether to include the landing page link
- `landing_page_url` (text) - URL of the landing page

---

## 📋 Usage

### Creating a Campaign with Landing Page

**POST /backend/campaigns**

```json
{
  "userId": 1,
  "domainName": "premiumdomain.com",
  "campaignName": "Premium Domain Sale",
  
  "includeLandingPage": true,
  "landingPageUrl": "https://premiumdomain.com/landing"
}
```

### All Fields:

```json
{
  "userId": 1,
  "domainId": "domain_123",
  "domainName": "premiumdomain.com",
  "campaignName": "Premium Domain Sale Campaign",
  "emailTone": "professional",
  "includePrice": true,
  "maxEmailsPerDay": 100,
  "followUpDays": 5,
  "followUpSequence": [...],
  
  "includeLandingPage": true,
  "landingPageUrl": "https://premiumdomain.com"
}
```

---

## 🎨 How It Looks

### HTML Email Format

When `includeLandingPage: true`, emails will automatically include:

```
┌─────────────────────────────────────┐
│  🌐 View premiumdomain.com Landing  │
│                                     │
│ Check out the premium features and  │
│  details of this domain:            │
│                                     │
│     [🔗 Visit Landing Page]         │
│     (Beautiful gradient button)     │
│                                     │
│ Or copy: https://premiumdomain.com │
└─────────────────────────────────────┘
```

### Text Email Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 VIEW PREMIUMDOMAIN.COM LANDING PAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check out the premium features and details:

🔗 https://premiumdomain.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 💡 Features

### ✅ Automatic Insertion
- Landing page link is **automatically added** to all campaign emails
- No need to manually include it in email content
- Works with both HTML and plain text emails

### ✅ Beautiful Design
- **Gradient button** with hover effects (HTML)
- **Styled section** with clear call-to-action
- **Mobile responsive** and professional appearance

### ✅ Smart Placement
- Inserted at the end of email content
- Doesn't interfere with your custom message
- Works with both custom and default email templates

---

## 🔧 How It Works

### 1. Campaign Creation

When you create a campaign with `includeLandingPage: true`:

```javascript
// Campaign stored with:
{
  include_landing_page: true,
  landing_page_url: "https://premiumdomain.com"
}
```

### 2. Email Sending

When sending batch emails via **POST /backend/campaigns/send-batch**:

```javascript
// System automatically:
1. Checks if campaign has includeLandingPage = true
2. Retrieves landingPageUrl from campaign
3. Appends formatted landing page section to each email
4. Sends emails with landing page link included
```

### 3. Email Delivery

Buyers receive email with:
- Your custom message
- **+ Landing page section** (added automatically)

---

## 📖 API Examples

### Example 1: Create Campaign with Landing Page

```bash
curl -X POST http://localhost:5000/backend/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "domainName": "premiumdomain.com",
    "campaignName": "Domain Sale Campaign",
    "includeLandingPage": true,
    "landingPageUrl": "https://premiumdomain.com"
  }'
```

### Example 2: Send Emails (Landing Page Automatically Included)

```bash
curl -X POST http://localhost:5000/backend/campaigns/send-batch \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign_1234567890_abc123",
    "emails": [
      {
        "to": "buyer@example.com",
        "subject": "Premium Domain Available",
        "html": "<p>Hi there, interested in premiumdomain.com?</p>",
        "text": "Hi there, interested in premiumdomain.com?"
      }
    ]
  }'
```

**Result:** Email sent with your message + landing page section appended automatically!

---

## 🎯 Use Cases

### 1. Showcase Domain Features
```
Landing page shows:
- Domain history and age
- Traffic statistics
- SEO metrics
- Similar domain sales prices
```

### 2. Build Trust
```
Landing page includes:
- Your company information
- Testimonials
- Past successful sales
- Contact information
```

### 3. Provide More Information
```
Landing page contains:
- Detailed domain analysis
- Industry use cases
- Payment options
- FAQ section
```

---

## 🔄 Updating Existing Campaigns

### Enable Landing Page for Existing Campaign

**PUT /backend/campaigns/:campaignId**

```json
{
  "includeLandingPage": true,
  "landingPageUrl": "https://newlandingpage.com"
}
```

### Disable Landing Page

```json
{
  "includeLandingPage": false
}
```

---

## 📊 Database Schema

### campaigns Table

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `include_landing_page` | BOOLEAN | `false` | Enable landing page link |
| `landing_page_url` | TEXT | `NULL` | Landing page URL |

---

## 🎨 Customization

### Custom Email Template Service

The landing page section is added via `services/emailTemplates.js`:

```javascript
const { addLandingPageLink } = require('../services/emailTemplates');

// Add to HTML email
const emailWithLanding = addLandingPageLink(
  htmlContent,
  'https://premiumdomain.com',
  'premiumdomain.com',
  'html'
);

// Add to text email
const textWithLanding = addLandingPageLink(
  textContent,
  'https://premiumdomain.com',
  'premiumdomain.com',
  'text'
);
```

### Modify the Design

Edit `services/emailTemplates.js` to customize:
- Button colors and styles
- Section layout
- Text content
- Icons and emojis

---

## ✅ Benefits

### For Sellers:
- ✅ **Increase engagement** - Professional landing pages convert better
- ✅ **Build credibility** - Show domain value and legitimacy
- ✅ **Save time** - Automatic inclusion, no manual work
- ✅ **Track clicks** - See who's interested via Mailgun tracking

### For Buyers:
- ✅ **More information** - Detailed domain details at a click
- ✅ **Build trust** - Professional presentation increases confidence
- ✅ **Easy access** - Clear call-to-action button
- ✅ **Mobile friendly** - Works on all devices

---

## 🐛 Troubleshooting

### Landing Page Not Showing

**Check:**
1. ✅ `includeLandingPage` is set to `true`
2. ✅ `landingPageUrl` is not null
3. ✅ Database migration was run
4. ✅ Campaign was created after migration

**Verify:**
```bash
# Check campaign settings
curl http://localhost:5000/backend/campaigns/campaign_xxx
```

### Invalid Landing Page URL

**Solution:** Ensure URL is valid and includes protocol:
- ✅ Good: `https://example.com`
- ❌ Bad: `example.com`
- ❌ Bad: `www.example.com`

---

## 📝 Notes

- Landing page link is **only added to initial campaign emails**
- Follow-up emails can include landing page by adding it to the follow-up content
- Landing page URL can be changed anytime via campaign update endpoint
- The feature works automatically - no frontend changes needed for email sending

---

## 🎉 That's It!

Your campaigns can now include beautiful landing page links automatically!

**Questions?**
- Check `services/emailTemplates.js` for the implementation
- Modify the design to match your brand
- Use tracking to see which buyers click the landing page

---

**Happy Selling! 🚀**

