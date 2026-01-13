# 💰 Stripe Test Mode Balance Solution

## The Problem
When trying to transfer funds to sellers in **Stripe test mode**, you may encounter:
```
StripeInvalidRequestError: You have insufficient available funds in your Stripe account
```

This happens because:
- Test payments create a **pending balance** (not available immediately)
- Test mode has payout schedules just like production
- Transfers require funds in the **available balance**

---

## ✅ Solution Options

### **Option 1: Simulate Transfers (Recommended for Testing)**

Add this to your `.env` file:
```bash
SKIP_STRIPE_TRANSFER_IN_TEST=true
```

**What this does:**
- ✅ Simulates the transfer without actually calling Stripe
- ✅ Allows you to test the full escrow flow
- ✅ Updates database records as if transfer succeeded
- ✅ Sends all notifications as normal
- ⚠️  Only works in test mode (automatically disabled in production)

**When to use:**
- Testing the escrow verification flow
- Testing email notifications
- Testing database updates
- Demo/development environments

---

### **Option 2: Add Real Test Funds**

Use the special test card **4000000000000077** which adds funds directly to your **available balance**.

**Steps:**

#### 1. Enable Raw Card Data API
1. Go to: https://dashboard.stripe.com/test/settings/integration
2. Find "Access to raw card data APIs"
3. Enable it

#### 2. Create a Test Payment
```javascript
// Run: node add-test-funds.js
// This will add $10,000 to your available balance
```

Or manually:
1. Go to: https://dashboard.stripe.com/test/payments
2. Click "New"
3. Use card: `4000000000000077`
4. Amount: At least equal to the transfer amount
5. Complete payment

**When to use:**
- Testing actual Stripe transfers
- Verifying Stripe API integration
- Testing real Stripe webhooks for transfers

---

### **Option 3: Manual Transfer in Stripe Dashboard**

1. Go to: https://dashboard.stripe.com/test/connect/transfers
2. Click "New transfer"
3. Select the connected account
4. Enter amount and complete manually

**When to use:**
- One-off testing
- Debugging specific transfer issues

---

## 🎯 Recommended Approach

**For Development/Testing:**
```bash
# .env
SKIP_STRIPE_TRANSFER_IN_TEST=true
```

**For Production:**
```bash
# .env  
SKIP_STRIPE_TRANSFER_IN_TEST=false  # or remove this line
```

In production, this setting is automatically ignored even if set to true, ensuring real transfers always happen.

---

##🔍 How It Works

When `SKIP_STRIPE_TRANSFER_IN_TEST=true`:

1. Admin verifies domain transfer in dashboard
2. System detects **test mode** + **skip flag**
3. Creates a **simulated transfer** record:
   ```javascript
   {
     id: 'simulated_tr_1234567890',
     amount: 237500, // $2,375
     destination: 'acct_1234567890',
     metadata: { simulated: true }
   }
   ```
4. Updates database as if transfer succeeded
5. Marks domain as **sold**
6. Pauses all related campaigns
7. Sends emails to buyer and seller

Everything works exactly as in production, just without the actual Stripe transfer.

---

## 📊 Current Balance Status

Your Stripe test account shows:
- **Available Balance**: $0.00 ❌
- **Pending Balance**: $21,648.06 ⏳ (Expected payout: Jan 20)

This is why transfers fail - pending funds aren't available for transfers.

---

## 🚀 Quick Fix

**Run this command:**
```bash
echo "SKIP_STRIPE_TRANSFER_IN_TEST=true" >> .env
pm2 restart all
```

Then try verifying the transaction again in the admin dashboard.

---

## ⚠️ Important Notes

1. **Production Safety**: The skip flag only works in test mode. Production always does real transfers.
2. **Database Accuracy**: Even with simulated transfers, all database records are accurate and complete.
3. **Email Notifications**: All emails are sent normally, sellers get paid notifications.
4. **Audit Trail**: Simulated transfers are marked in metadata for transparency.

---

## 🧪 Testing Checklist

- [ ] Buyer completes payment
- [ ] Webhook processes payment
- [ ] Admin sees pending verification
- [ ] Admin approves transfer
- [ ] ✅ Transfer succeeds (simulated or real)
- [ ] Domain marked as sold
- [ ] Campaigns paused
- [ ] Buyer email sent
- [ ] Seller email sent
- [ ] Cannot create new campaign for sold domain

All of the above work with `SKIP_STRIPE_TRANSFER_IN_TEST=true`!

