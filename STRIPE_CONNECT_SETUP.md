# How to Enable Stripe Connect

## The Error You're Seeing

```json
{
    "success": false,
    "error": "Failed to connect Stripe account",
    "message": "You can only create new accounts if you've signed up for Connect, which you can learn how to do at https://stripe.com/docs/connect."
}
```

This means **Stripe Connect is not enabled** on your Stripe account.

---

## Step-by-Step: Enable Stripe Connect

### 1. **Log into Stripe Dashboard**
Go to: https://dashboard.stripe.com/

### 2. **Navigate to Connect Settings**
- Click on **"Settings"** (gear icon in top right)
- In the left sidebar, click **"Connect"**
- Or go directly to: https://dashboard.stripe.com/settings/connect

### 3. **Enable Connect**
You'll see a page that says "Get started with Connect"

Click **"Get started"** or **"Enable Connect"**

### 4. **Choose Your Platform Type**
Stripe will ask what type of platform you're building. Choose:
- **"Standard"** or **"Express"** (Express is recommended for your use case)
- This determines how connected accounts work

### 5. **Fill Out Platform Profile**
Stripe will ask for:
- **Platform name**: Your business/platform name (e.g., "DomainSeller")
- **Platform website**: Your website URL (e.g., "https://3vltn.com")
- **Platform description**: What your platform does
- **Support email**: Your support email
- **Business type**: Select your business type

### 6. **Accept Terms**
- Review and accept Stripe Connect's terms of service

### 7. **Configure Branding (Optional)**
- Upload your logo
- Set brand colors
- This will appear in the onboarding flow for your users

### 8. **Get Your Connect Settings**
After enabling, you'll have access to:
- ✅ Ability to create connected accounts
- ✅ Account Links for onboarding
- ✅ Express/Standard account types

---

## Verify It's Enabled

### Test the API
After enabling Connect, test your endpoint again:

```bash
curl -X POST https://3vltn.com/stripe/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "email": "test@example.com",
    "country": "US"
  }'
```

You should get a response like:
```json
{
  "success": true,
  "accountId": "acct_xxxxxxxxxxxxx",
  "onboardingUrl": "https://connect.stripe.com/setup/...",
  "message": "Stripe Connect account created. Complete onboarding to activate."
}
```

---

## Important Notes

### 1. **Test Mode vs Live Mode**
- Make sure you're in **Test Mode** while developing
- Toggle is in the top right of Stripe Dashboard
- You'll need to enable Connect for BOTH test and live modes separately

### 2. **API Keys**
Your current `.env` should have:
```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx  # Test mode key
# or
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx  # Live mode key
```

Make sure you're using the **test key** (starts with `sk_test_`) during development.

### 3. **Account Types**
Your code uses **Express accounts** (line 27 in stripeService.js):
```javascript
type: 'express', // Express accounts are easier for users
```

This is the right choice because:
- ✅ Easier onboarding for users
- ✅ Stripe handles compliance
- ✅ Less configuration needed

### 4. **Capabilities**
Your code requests these capabilities:
```javascript
capabilities: {
  card_payments: { requested: true },
  transfers: { requested: true },
}
```

This allows connected accounts to:
- Accept card payments
- Receive transfers (payouts)

---

## Testing the Full Flow

### 1. **Enable Connect in Stripe Dashboard** (as described above)

### 2. **Make a Request from Your Frontend**
```javascript
const response = await fetch('https://3vltn.com/backend/stripe/connect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: '123',
    email: 'seller@example.com',
    country: 'US'
  })
});

const data = await response.json();
console.log(data);
// Should return: { success: true, accountId: "acct_...", onboardingUrl: "https://..." }
```

### 3. **User Completes Onboarding**
- Redirect user to the `onboardingUrl`
- User fills out Stripe Connect onboarding form
- Stripe redirects back to your `return_url` (configured in stripeService.js line 42)

### 4. **Check Account Status**
```javascript
const response = await fetch('https://3vltn.com/backend/stripe/status/123');
const data = await response.json();
console.log(data);
// Should show: { connected: true, enabled: true, isComplete: true }
```

---

## Environment Variables Needed

Make sure your `.env` has:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# Frontend URL (for redirect URLs)
FRONTEND_URL=http://localhost:3000
# or in production:
# FRONTEND_URL=https://3vltn.com
```

---

## Quick Links

- **Stripe Connect Dashboard**: https://dashboard.stripe.com/connect
- **Stripe Connect Settings**: https://dashboard.stripe.com/settings/connect
- **Stripe Connect Docs**: https://stripe.com/docs/connect
- **Express Accounts Guide**: https://stripe.com/docs/connect/express-accounts

---

## Troubleshooting

### Error: "You can only create new accounts if you've signed up for Connect"
**Solution**: Enable Connect in Stripe Dashboard (steps above)

### Error: "No such account"
**Solution**: Make sure you're using the correct API key (test vs live)

### Error: "Invalid country"
**Solution**: Use a valid ISO country code (US, GB, CA, etc.)

### Onboarding link expires
**Solution**: Use the `/refresh` endpoint to generate a new link:
```javascript
fetch('https://3vltn.com/backend/stripe/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: '123' })
})
```

---

## Next Steps After Enabling Connect

1. ✅ Enable Stripe Connect in Dashboard
2. ✅ Test the `/stripe/connect` endpoint
3. ✅ Implement the onboarding flow in your frontend
4. ✅ Set up webhooks for account updates
5. ✅ Test payment link creation with a connected account

Good luck! 🚀
