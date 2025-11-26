# 💳 Stripe Integration Guide

## Overview

Your DomainSeller backend now uses **Stripe Connect** for payment processing instead of Escrow.com. Users can connect their Stripe accounts to receive payments directly for their domain sales.

## 🎯 Features

- ✅ **Stripe Connect** - Users connect their own Stripe accounts
- ✅ **Direct Payments** - Money goes directly to sellers' bank accounts
- ✅ **Payment Links** - Easy one-click payment links for buyers
- ✅ **Approval Workflow** - Admin approves before sending payment links
- ✅ **Automatic Webhooks** - Real-time payment status updates
- ✅ **Secure & PCI Compliant** - Stripe handles all security

---

## 🚀 Quick Setup

### 1. Install Dependencies

Already done! The `stripe` package has been installed.

### 2. Setup Database

Run the migration to add Stripe tables:

```bash
node setup-stripe.js
```

This creates:
- `stripe_payments` table - Payment link tracking
- `stripe_approvals` table - Approval workflow
- Stripe fields in `users` table

### 3. Configure Environment Variables

Add these to your `.env` file:

```env
# Stripe Connect Integration
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=http://localhost:3000
```

**Get your keys from:**
- Dashboard: https://dashboard.stripe.com/apikeys
- Webhook Secret: https://dashboard.stripe.com/webhooks

### 4. Setup Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   ```
   https://yourdomain.com/stripe/webhook
   ```
4. Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
   - `account.updated`
5. Copy the **Signing Secret** to your `.env` as `STRIPE_WEBHOOK_SECRET`

---

## 📖 How It Works

### User Flow (Seller)

1. **Connect Stripe Account**
   ```
   POST /backend/stripe/connect
   {
     "userId": "1",
     "email": "seller@example.com",
     "country": "US"
   }
   ```
   
   Response includes `onboardingUrl` - redirect user here to complete Stripe onboarding.

2. **Check Status**
   ```
   GET /backend/stripe/status/:userId
   ```
   
   Returns:
   - `connected`: true/false
   - `enabled`: true/false
   - `isComplete`: true/false

3. **Receive Payments**
   - Once approved, money flows directly to their connected Stripe account
   - Payouts happen automatically based on Stripe settings

### Payment Flow (Buyer)

1. **Buyer Requests Payment**
   - Buyer emails asking "How do I pay?"
   - AI detects payment intent
   - Creates approval request in `stripe_approvals` table

2. **Admin Gets Notification**
   - Email sent to admin with approve/decline buttons
   - Admin clicks **"APPROVE"** button

3. **Payment Link Generated**
   - Stripe Payment Link created automatically
   - Email sent to buyer with payment link
   - Buyer clicks link → enters card info → pays

4. **Payment Confirmed**
   - Webhook updates payment status
   - Money deposited to seller's bank account
   - Seller receives domain transfer request

---

## 🔗 API Endpoints

### User Management

```bash
# Connect Stripe Account
POST /backend/stripe/connect
Body: { userId, email, country }

# Check Account Status
GET /backend/stripe/status/:userId

# Refresh Onboarding Link
POST /backend/stripe/refresh
Body: { userId }

# Disconnect Account
POST /backend/stripe/disconnect
Body: { userId }
```

### Payment Management

```bash
# Get Campaign Payments
GET /backend/stripe/payments/:campaignId

# Get Payment Link Status
GET /backend/stripe/payment/:paymentLinkId

# Webhook (Stripe calls this)
POST /stripe/webhook
```

### Approval Workflow

```bash
# Get Pending Approvals
GET /backend/stripe/approvals/pending?userId=1

# Approve Payment Request (API)
POST /backend/stripe/approvals/:id/approve
Body: { approvedBy: "admin" }

# Approve via Email Button (GET)
GET /backend/stripe/approvals/:id/approve

# Decline Request
POST /backend/stripe/approvals/:id/decline
Body: { notes: "Reason for decline" }
```

---

## 🧪 Testing

### Test Mode

Use Stripe's test mode for development:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Test Cards

Use these test cards on payment links:

| Card Number         | Result  |
|---------------------|---------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 9995 | Decline |
| 4000 0000 0000 0002 | Error   |

- Any future expiry date
- Any 3-digit CVC
- Any ZIP code

### Testing Webhooks Locally

Use Stripe CLI:

```bash
stripe listen --forward-to localhost:5000/stripe/webhook
```

Copy the webhook signing secret to `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 💰 Platform Fees (Optional)

Want to take a commission? Update `stripeService.js`:

```javascript
const paymentResult = await createPaymentLink({
  domainName: "example.com",
  amount: 1000,
  applicationFeePercent: 5, // 5% commission
  // ... other params
});
```

This takes 5% of each transaction as your platform fee.

---

## 🔒 Security

- ✅ **Webhook Verification** - All webhooks are signature-verified
- ✅ **PCI Compliance** - Stripe handles card data (not your server)
- ✅ **Secure Onboarding** - Stripe-hosted onboarding flow
- ✅ **Bank Account Protection** - Stripe verifies all bank accounts

---

## 🎨 Frontend Integration

### Connect Stripe Button

```javascript
// Get onboarding URL
const response = await fetch('/backend/stripe/connect', {
  method: 'POST',
  body: JSON.stringify({
    userId: currentUser.id,
    email: currentUser.email,
    country: 'US'
  })
});

const { onboardingUrl } = await response.json();

// Redirect user to Stripe onboarding
window.location.href = onboardingUrl;
```

### Check Connection Status

```javascript
const response = await fetch(`/backend/stripe/status/${userId}`);
const { stripe } = await response.json();

if (stripe.enabled) {
  // User is fully connected
  console.log('Stripe enabled ✅');
} else if (stripe.connected) {
  // User started onboarding but didn't finish
  console.log('Complete onboarding');
} else {
  // User hasn't connected yet
  console.log('Connect Stripe account');
}
```

---

## 🐛 Troubleshooting

### "Stripe account not connected"

**Solution:** User needs to complete Stripe onboarding
- Check status: `GET /backend/stripe/status/:userId`
- Refresh link: `POST /backend/stripe/refresh`

### "Webhook signature verification failed"

**Solution:** Check your webhook secret
- Ensure `STRIPE_WEBHOOK_SECRET` in `.env` matches Stripe dashboard
- For local testing, use Stripe CLI

### "Payment link not working"

**Solution:** Verify account is fully enabled
- Check `stripe.isComplete` in status response
- Ensure both `chargesEnabled` and `payoutsEnabled` are true

---

## 📊 Database Schema

### `stripe_payments` Table

| Column            | Type    | Description              |
|-------------------|---------|--------------------------|
| payment_link_id   | VARCHAR | Stripe payment link ID   |
| payment_intent_id | VARCHAR | Stripe payment intent ID |
| campaign_id       | INTEGER | Related campaign         |
| user_id           | INTEGER | Seller user ID           |
| stripe_account_id | VARCHAR | Seller's Stripe account  |
| buyer_email       | VARCHAR | Buyer's email            |
| domain_name       | VARCHAR | Domain being sold        |
| amount            | DECIMAL | Payment amount           |
| status            | VARCHAR | Payment status           |
| payment_url       | TEXT    | Payment link URL         |

### `stripe_approvals` Table

| Column            | Type    | Description            |
|-------------------|---------|------------------------|
| campaign_id       | INTEGER | Related campaign       |
| user_id           | INTEGER | Seller user ID         |
| buyer_email       | VARCHAR | Buyer's email          |
| domain_name       | VARCHAR | Domain being sold      |
| amount            | DECIMAL | Requested amount       |
| status            | VARCHAR | pending/approved/declined |
| payment_link_id   | VARCHAR | Generated link ID (after approval) |

---

## 🎉 You're All Set!

Your backend is now configured to use Stripe for payments!

**Next Steps:**
1. Add Stripe keys to `.env`
2. Run `node setup-stripe.js`
3. Setup webhook endpoint
4. Update frontend with Stripe Connect button
5. Test with test cards

**Support:**
- Stripe Docs: https://stripe.com/docs/connect
- Stripe Support: https://support.stripe.com

---

**Powered by Stripe Connect 🚀**

