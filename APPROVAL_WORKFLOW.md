# 🎯 Escrow Approval Workflow - How It Works

## 📋 Overview

When a buyer indicates they want to purchase a domain, the system now requires **admin approval** before sending the escrow payment link.

---

## 🔄 Complete Workflow

### 1. **Buyer Shows Interest** 
Buyer sends email: _"Hi, I'm ready to buy. Send me the payment link!"_

### 2. **AI Agent Responds**
AI immediately replies:
```
Thank you for your interest! I'm preparing the secure escrow 
payment link for you. You'll receive it within a few hours. 
If you have any questions in the meantime, feel free to ask!
```

### 3. **Admin Gets Notification Email** ✉️
Admin receives an email with:

- ✅ **Full conversation thread** (all messages exchanged)
- ✅ **Buyer's details** (name, email, domain, price)
- ✅ **AI's suggested response**
- ✅ **Two clickable buttons:**
  - **✅ APPROVE & SEND PAYMENT LINK** (green button)
  - **❌ DECLINE REQUEST** (red button)

### 4. **Admin Clicks APPROVE** ✅
When admin clicks the approve button:

1. **Escrow.com transaction is created** (or manual link if API fails)
2. **Buyer receives email** with:
   - Secure Escrow.com payment link
   - Transaction details
   - Next steps

3. **Admin sees success page** in browser:
   - ✅ "Approved!" confirmation
   - Transaction details
   - Escrow link sent to buyer

### 5. **Admin Clicks DECLINE** ❌
When admin clicks the decline button:

1. **Request is marked as declined** in database
2. **No email is sent to buyer**
3. **Admin sees confirmation** page

---

## 🌐 Button Links

The approval buttons link to these endpoints:

### Approve Button:
```
https://3vltn.com/backend/escrow/approvals/{APPROVAL_ID}/approve
```

### Decline Button:
```
https://3vltn.com/backend/escrow/approvals/{APPROVAL_ID}/decline
```

Both are **GET requests** so they work directly from email clients!

---

## 🎨 Email Example

When you receive an approval email, it looks like this:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔔 APPROVAL REQUIRED!
Campaign: Premium Domains
Domain: example.com
💰 Price: $2,500 USD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ESCROW PAYMENT APPROVAL REQUIRED

💰 Amount: $2,500 USD
👤 Buyer: john@example.com
🌐 Domain: example.com
📋 Status: Pending Your Approval

[✅ APPROVE & SEND PAYMENT LINK]  [❌ DECLINE REQUEST]

⏳ Buyer is waiting! Please approve within 24 hours.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📜 Full Conversation Thread

👤 Buyer • Nov 20, 2025 6:37 PM
Hi, I'm interested in buying example.com. What's your price?

🤖 You (AI) • Nov 20, 2025 6:38 PM
Thank you for your interest! The domain is available for $2,500.

👤 Buyer • Nov 20, 2025 6:40 PM
Sounds good! Send me the payment link.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 💡 Key Features

✅ **One-Click Approval** - Just click the button in email  
✅ **No Login Required** - Works directly from notification email  
✅ **Full Context** - See entire conversation before approving  
✅ **Auto-Send** - Buyer gets payment link immediately after approval  
✅ **Beautiful UI** - Success/decline pages with full details  
✅ **Safe Fallback** - If Escrow.com API fails, sends manual link  

---

## 🧪 Testing

1. Send test email to your campaign:
   ```
   Subject: Ready to buy
   Body: Hi, send me the payment link!
   ```

2. Check your email (campaign owner's email)

3. Click **✅ APPROVE** button

4. Verify:
   - Success page appears
   - Buyer receives payment email
   - Database shows status: `approved`

---

## 🔧 API Endpoints (For Dashboard Integration)

### Get Pending Approvals
```http
GET /backend/escrow/approvals/pending?userId=10
```

### Approve (from email)
```http
GET /backend/escrow/approvals/1/approve
```

### Decline (from email)
```http
GET /backend/escrow/approvals/1/decline
```

### Approve (API version)
```http
POST /backend/escrow/approvals/1/approve
Content-Type: application/json

{
  "approvedBy": 10
}
```

---

## 📊 Database Schema

The `escrow_approvals` table stores:

```sql
id                   SERIAL PRIMARY KEY
campaign_id          VARCHAR(255) NOT NULL
buyer_email          VARCHAR(255) NOT NULL
buyer_name           VARCHAR(255)
domain_name          VARCHAR(255) NOT NULL
amount               NUMERIC(10, 2) NOT NULL
currency             VARCHAR(10) DEFAULT 'USD'
seller_email         VARCHAR(255) NOT NULL
seller_name          VARCHAR(255)
fee_payer            VARCHAR(50) DEFAULT 'buyer'
status               VARCHAR(50) DEFAULT 'pending'
                     -- 'pending', 'approved', 'declined', 'sent'
user_id              INTEGER NOT NULL
approved_at          TIMESTAMP
approved_by          INTEGER
escrow_transaction_id VARCHAR(255)
notes                TEXT
created_at           TIMESTAMP DEFAULT NOW()
updated_at           TIMESTAMP DEFAULT NOW()
```

---

## ✅ System is Live!

Your escrow approval system is now fully operational:

- ✅ Admin receives full conversation thread on every buyer reply
- ✅ Approval required before sending escrow links
- ✅ One-click approve/decline from email
- ✅ Beautiful confirmation pages
- ✅ Automatic buyer notification upon approval

**No additional setup needed - it's ready to use!** 🎉

