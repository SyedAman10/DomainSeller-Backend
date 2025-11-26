# 🚀 Stripe Integration - Quick Start

## ✅ What's Been Done

Your backend has been fully configured to use **Stripe Connect** instead of Escrow.com!

### Files Created/Modified:

1. ✅ **services/stripeService.js** - Stripe Connect integration
2. ✅ **routes/stripe.js** - All Stripe API endpoints
3. ✅ **database/add_stripe_support.sql** - Database schema
4. ✅ **setup-stripe.js** - Database migration script
5. ✅ **server.js** - Stripe routes added
6. ✅ **routes/inbound.js** - Updated to use Stripe approvals
7. ✅ **services/aiAgent.js** - AI mentions Stripe instead of Escrow
8. ✅ **services/notificationService.js** - Approval emails updated
9. ✅ **ENV_TEMPLATE.txt** - Added Stripe keys template

---

## 🎯 What You Need To Do

### Step 1: Add Stripe Keys to `.env`

```env
# Stripe Connect Integration (REQUIRED)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=http://localhost:3000
```

**Get your keys:**
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret key** → `STRIPE_SECRET_KEY`
3. Copy your **Publishable key** → `STRIPE_PUBLISHABLE_KEY`

### Step 2: Run Database Migration

```bash
node setup-stripe.js
```

This creates:
- `stripe_payments` table
- `stripe_approvals` table  
- Stripe fields in `users` table

### Step 3: Setup Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Enter: `https://yourdomain.com/stripe/webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
   - `account.updated`
5. Copy **Signing Secret** → `STRIPE_WEBHOOK_SECRET` in `.env`

### Step 4: Restart Server

```bash
npm start
```

---

## 🔥 How It Works Now

### 1️⃣ User Connects Stripe Account

**Frontend calls:**
```javascript
POST /backend/stripe/connect
{
  "userId": "1",
  "email": "user@example.com",
  "country": "US"
}
```

**Response:**
```json
{
  "success": true,
  "accountId": "acct_xxxxxxxxxxxxx",
  "onboardingUrl": "https://connect.stripe.com/setup/...",
  "message": "Stripe Connect account created. Complete onboarding to activate."
}
```

Redirect user to `onboardingUrl` to complete bank account setup.

### 2️⃣ Buyer Requests Payment

- Buyer emails: "How do I pay for this domain?"
- AI detects payment intent
- Creates approval request in database
- Admin gets email notification

### 3️⃣ Admin Approves

Admin clicks **"APPROVE"** button in email:
- Stripe Payment Link generated automatically
- Payment link emailed to buyer
- Buyer clicks → enters card → pays

### 4️⃣ Payment Processed

- Money goes directly to seller's Stripe account
- Webhook updates payment status
- Seller gets payout to their bank account

---

## 📋 Available API Endpoints

### Stripe Connect
- `POST /backend/stripe/connect` - Connect Stripe account
- `GET /backend/stripe/status/:userId` - Check connection status
- `POST /backend/stripe/refresh` - Refresh onboarding link
- `POST /backend/stripe/disconnect` - Disconnect account

### Payments
- `GET /backend/stripe/payments/:campaignId` - Get all payments
- `GET /backend/stripe/payment/:paymentLinkId` - Get payment details

### Approvals
- `GET /backend/stripe/approvals/pending` - Get pending approvals
- `POST /backend/stripe/approvals/:id/approve` - Approve request
- `GET /backend/stripe/approvals/:id/approve` - Approve via email link
- `POST /backend/stripe/approvals/:id/decline` - Decline request

### Webhooks
- `POST /stripe/webhook` - Stripe webhook handler

---

## 🧪 Testing

### Use Test Mode

For development, use test keys (start with `sk_test_` and `pk_test_`).

### Test Cards

| Card Number         | Result  |
|---------------------|---------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 9995 | Decline |

- Any future expiry
- Any 3-digit CVC
- Any ZIP code

### Test Webhooks Locally

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:5000/stripe/webhook

# Copy the webhook secret to .env
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🎨 Frontend Integration Example

### Connect Button

```javascript
async function connectStripe() {
  const response = await fetch('/backend/stripe/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUser.id,
      email: currentUser.email,
      country: 'US'
    })
  });
  
  const { onboardingUrl } = await response.json();
  window.location.href = onboardingUrl; // Redirect to Stripe
}
```

### Check Status

```javascript
async function checkStripeStatus() {
  const response = await fetch(`/backend/stripe/status/${userId}`);
  const { stripe } = await response.json();
  
  if (stripe.enabled) {
    console.log('✅ Stripe fully connected and enabled');
  } else if (stripe.connected) {
    console.log('⚠️  Complete Stripe onboarding');
  } else {
    console.log('❌ Connect Stripe account');
  }
}
```

---

## 💡 Key Differences from Escrow

| Feature | Escrow.com | Stripe |
|---------|-----------|--------|
| Setup | Manual API credentials | Stripe Connect (OAuth) |
| Money Flow | Escrow holds funds | Direct to seller |
| Bank Connection | Manual | Automatic via Stripe |
| Payment Method | Escrow link | Payment Links |
| Security | Escrow.com | Stripe (PCI compliant) |
| Fees | Escrow fees | Stripe fees (~2.9% + 30¢) |
| Payout | After domain transfer | Automatic by Stripe |

---

## 🚨 Important Notes

1. **Users must complete Stripe onboarding** before they can receive payments
2. **Check `stripe.enabled` before showing payment options** to buyers
3. **Approval workflow is still required** - payment links only sent after admin approval
4. **Test mode** - Use test keys for development, switch to live keys for production
5. **Webhooks are critical** - Payment status won't update without them

---

## 📖 Full Documentation

See `STRIPE_INTEGRATION_GUIDE.md` for complete documentation.

---

## 🎉 That's It!

Your backend is now using Stripe! Just add your keys, run the migration, and you're ready to go.

**Questions?**
- Stripe Docs: https://stripe.com/docs/connect
- Stripe Dashboard: https://dashboard.stripe.com

