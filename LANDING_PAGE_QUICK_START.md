# 🚀 Landing Page Feature - Quick Start

## ✅ What's Been Done

Your backend now supports **automatic landing page links** in campaign emails!

---

## 🎯 Setup (2 Steps)

### Step 1: Run Migration

```bash
node setup-landing-page.js
```

### Step 2: You're Done!

That's it. The feature is now active.

---

## 📝 How to Use

### When Creating a Campaign:

**Before (no landing page):**
```json
{
  "userId": 1,
  "domainName": "example.com",
  "campaignName": "Domain Sale"
}
```

**After (with landing page):**
```json
{
  "userId": 1,
  "domainName": "example.com",
  "campaignName": "Domain Sale",
  "includeLandingPage": true,
  "landingPageUrl": "https://example.com"
}
```

---

## 🎨 What Happens Automatically

When you send batch emails:

1. **System checks** if `includeLandingPage` is enabled
2. **Automatically adds** a beautiful landing page section to EVERY email
3. **No extra work** needed - it just works!

### Email Preview:

```
Your custom email content here...

┌─────────────────────────────────┐
│  🌐 View example.com Landing    │
│                                 │
│     [🔗 Visit Landing Page]     │
│     (Beautiful gradient button) │
└─────────────────────────────────┘
```

---

## 📋 Complete Example

```bash
# 1. Create campaign with landing page
curl -X POST http://localhost:5000/backend/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "domainName": "premiumdomain.com",
    "campaignName": "Premium Sale",
    "includeLandingPage": true,
    "landingPageUrl": "https://premiumdomain.com/info"
  }'

# 2. Send emails (landing page link added automatically!)
curl -X POST http://localhost:5000/backend/campaigns/send-batch \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign_xxx",
    "emails": [
      {
        "to": "buyer@example.com",
        "subject": "Premium Domain Available",
        "html": "<p>Hi! Interested in premiumdomain.com?</p>"
      }
    ]
  }'
```

**Result:** Buyer receives email with your message + landing page link automatically included!

---

## 🔧 Files Changed

1. ✅ **database/add_landing_page_support.sql** - Database schema
2. ✅ **routes/campaigns.js** - Accept landing page fields
3. ✅ **services/emailTemplates.js** - Format landing page section
4. ✅ **setup-landing-page.js** - Migration script

---

## 💡 Quick Facts

- ✅ **Automatic** - Landing page link added to all emails automatically
- ✅ **Beautiful** - Professional gradient button and styling
- ✅ **Mobile friendly** - Works on all devices
- ✅ **Optional** - Only included if you set `includeLandingPage: true`
- ✅ **Customizable** - Edit `services/emailTemplates.js` to change design

---

## 📖 Full Documentation

See `LANDING_PAGE_FEATURE.md` for complete details.

---

## 🎉 You're Ready!

Just run the migration and start creating campaigns with landing pages!

**Questions?** Check the full documentation or the implementation in `services/emailTemplates.js`.

---

**Happy Selling! 🚀**

