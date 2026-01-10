# 🔍 Stripe Payment Not Working - Troubleshooting Guide

## Issue
Payment link works: `https://buy.stripe.com/c/pay/cs_test_...`  
But after payment completes → **Nothing happens** (no emails, no database update)

---

## ✅ Quick Checks

### 1. Check Stripe Webhook Configuration

**In Stripe Dashboard:**
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Find your webhook endpoint
3. Should be: `https://api.3vltn.com/stripe/webhook`
4. Check these events are selected:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`

**Important:** For **Connect accounts**, add:
- `https://api.3vltn.com/stripe/webhook` (main webhook)

### 2. Check Webhook Secret in `.env`

```bash
# On server
cat /root/DomainSeller-Backend/.env | grep STRIPE_WEBHOOK_SECRET

# Should see:
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

**If missing or wrong → Get new secret:**
1. Stripe Dashboard → Webhooks
2. Click your webhook
3. Copy "Signing secret"
4. Update `.env`:
   ```bash
   nano /root/DomainSeller-Backend/.env
   # Update STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   # Save and exit
   pm2 restart node-backend
   ```

### 3. Check Webhook is Receiving Events

**Watch logs while testing:**
```bash
# Terminal 1: Watch logs
pm2 logs node-backend --raw --lines 100

# Terminal 2: Complete a test payment
# (Use your Stripe payment link)
```

**You should see:**
```
════════════════════════════════════════════════════════════
📨 STRIPE WEBHOOK RECEIVED
⏰ Time: 2025-12-25T...
════════════════════════════════════════════════════════════
✅ Webhook signature verified successfully!
📨 Event Type: checkout.session.completed
✅ Checkout completed: cs_test_xxxxx
   Payment Intent: pi_xxxxx
   Payment Link: plink_xxxxx
✅ Found and updated payment by payment_link
✅ Seller notification sent to seller@email.com
✅ Buyer confirmation sent to buyer@email.com
```

**If you DON'T see this → Webhook not configured correctly!**

---

## 🔧 Common Issues & Fixes

### Issue 1: "Webhook signature verification failed"

**Logs show:**
```
❌ Webhook signature verification failed: No signatures found
```

**Fix:**
```bash
# Get new webhook secret from Stripe Dashboard
nano /root/DomainSeller-Backend/.env
# Update: STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret
pm2 restart node-backend
```

### Issue 2: No webhook logs at all

**Webhook URL is wrong. Should be:**
```
https://api.3vltn.com/stripe/webhook
NOT: https://api.3vltn.com/backend/stripe/webhook
```

**Fix in Stripe Dashboard:**
1. Webhooks → Edit endpoint
2. Change URL to: `https://api.3vltn.com/stripe/webhook`
3. Save

### Issue 3: Webhook receives but "payment not found"

**Logs show:**
```
✅ Checkout completed: cs_test_xxxxx
🔍 Trying to find payment by payment_link: plink_xxxxx
❌ Payment not found in database
```

**Fix:** Check database:
```sql
-- Check if payment exists
SELECT id, payment_link_id, status, buyer_email, domain_name 
FROM stripe_payments 
WHERE payment_link_id = 'plink_xxxxx';

-- If not found, the approval wasn't created properly
-- Check stripe_approvals:
SELECT * FROM stripe_approvals 
WHERE status = 'approved' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Issue 4: Using test mode but webhook is for live mode

**Check in Stripe:**
- Payment link: `https://buy.stripe.com/c/pay/cs_test_...` ← **test mode**
- Webhook: Should also be in **test mode**

**Fix:**
1. Stripe Dashboard → Switch to "Test mode" (toggle top right)
2. Webhooks → Create test webhook
3. Use test webhook secret in `.env`

---

## 🧪 Test the Webhook Manually

### Method 1: Stripe CLI (Best)
```bash
# Install Stripe CLI
https://stripe.com/docs/stripe-cli

# Forward webhooks to local
stripe listen --forward-to https://api.3vltn.com/stripe/webhook

# Trigger test event
stripe trigger checkout.session.completed
```

### Method 2: Check webhook delivery in Stripe

1. Stripe Dashboard → Webhooks
2. Click your webhook
3. Click "Events" tab
4. See recent deliveries
5. If failed, click to see error

---

## 📊 Debug Checklist

Run these commands:

```bash
# 1. Check if webhook secret is set
echo $STRIPE_WEBHOOK_SECRET

# 2. Check recent logs
pm2 logs node-backend --lines 200 | grep "WEBHOOK"

# 3. Test webhook endpoint is accessible
curl -X POST https://api.3vltn.com/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Should return: "Webhook Error: No signatures found"
# (This is good - means endpoint works)

# 4. Check database for payments
psql $NEON_DATABASE_URL -c "SELECT * FROM stripe_payments ORDER BY created_at DESC LIMIT 5;"

# 5. Check approvals
psql $NEON_DATABASE_URL -c "SELECT * FROM stripe_approvals ORDER BY created_at DESC LIMIT 5;"
```

---

## ✅ Complete Flow Test

**Step-by-step:**

1. **Create approval request** (from AI email response)
   - Buyer replies asking for payment
   - AI detects and creates `stripe_approvals` record

2. **Approve request** (click email link or dashboard)
   - Click approval link
   - Creates Stripe payment link
   - Stores in `stripe_payments` table
   - Buyer receives email with link

3. **Complete payment** (buyer pays)
   - Buyer clicks Stripe link
   - Completes payment
   - Stripe sends webhook to: `https://api.3vltn.com/stripe/webhook`

4. **Webhook processing** (automatic)
   - Backend receives webhook
   - Verifies signature
   - Finds payment in database
   - Updates status to 'completed'
   - Sends emails to buyer & seller

**Check each step:**
```sql
-- Step 1: Check approval
SELECT * FROM stripe_approvals WHERE buyer_email = 'buyer@example.com';

-- Step 2: Check payment link created
SELECT * FROM stripe_payments WHERE buyer_email = 'buyer@example.com';

-- Step 3 & 4: Check payment completed
SELECT * FROM stripe_payments WHERE status = 'completed';
```

---

## 🆘 Still Not Working?

**Send me these:**

1. **Webhook logs:**
   ```bash
   pm2 logs node-backend --lines 100 | grep -A 20 "STRIPE WEBHOOK"
   ```

2. **Database check:**
   ```sql
   SELECT id, buyer_email, domain_name, status, payment_link_id, created_at 
   FROM stripe_payments 
   WHERE buyer_email = 'your-test-email@example.com';
   ```

3. **Stripe webhook delivery:**
   - Screenshot of webhook event in Stripe Dashboard
   - Response code and body

4. **Your webhook URL:**
   - What URL is configured in Stripe?
   - Test or Live mode?

---

## 🔗 Quick Links

- Stripe Dashboard: https://dashboard.stripe.com/test/webhooks
- PM2 Logs: `pm2 logs node-backend`
- Database URL: Check `.env` → `NEON_DATABASE_URL`

---

**Most Common Fix:**
```bash
# Wrong webhook secret!
# Get new secret from: https://dashboard.stripe.com/test/webhooks
# Then:
nano /root/DomainSeller-Backend/.env
# Update STRIPE_WEBHOOK_SECRET
pm2 restart node-backend
```

