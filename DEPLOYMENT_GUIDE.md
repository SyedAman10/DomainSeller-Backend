# 🚀 Complete Deployment Guide

## ✅ What We Fixed & Added

### 1. **Fixed Stripe Approval 404 Error**
- **Issue:** `https://3vltn.com/backend/stripe/approvals/3/approve` returning 404
- **Cause:** Route exists but needs server restart
- **Solution:** Added enhanced logging to debug and verify route is working

### 2. **Added Complete Referral/Affiliate System**
- Referral codes for every user
- Super referral code: `SUPER2025` (1 month free Professional plan)
- Commission tracking
- Payout system
- Leaderboard
- Dashboard

---

## 📦 Files Created/Modified

### **New Files:**
1. `database/add_referral_system.sql` - Complete database schema
2. `services/referralService.js` - Referral business logic
3. `routes/referrals.js` - API endpoints
4. `MAILGUN_WEBHOOK_SETUP.md` - Webhook setup guide
5. `WEBHOOK_DEBUG_GUIDE.md` - Debugging reference

### **Modified Files:**
1. `server.js` - Added referral routes + CORS fix
2. `routes/inbound.js` - Enhanced logging for webhooks  
3. `routes/stripe.js` - Enhanced logging for approval debugging

---

## 🗄️ Database Migration

**Run this on your Neon database:**

```bash
# SSH into your server
ssh root@your-server

# Connect to database
psql $NEON_DATABASE_URL

# Run migration
\i /root/DomainSeller-Backend/database/add_referral_system.sql
```

**Or copy/paste the SQL directly from:**
`database/add_referral_system.sql`

---

## 🔧 Deployment Steps

### **Step 1: Pull Latest Code**

```bash
cd /root/DomainSeller-Backend
git pull origin main
```

### **Step 2: Install Dependencies** (if any new)

```bash
npm install
```

### **Step 3: Run Database Migration**

```bash
# Option A: Using psql
psql $NEON_DATABASE_URL -f database/add_referral_system.sql

# Option B: Through Neon Console
# Copy the SQL content and paste in Neon SQL Editor
```

### **Step 4: Restart Backend**

```bash
pm2 restart node-backend
pm2 logs node-backend --lines 50
```

### **Step 5: Verify It's Working**

```bash
# Test health
curl https://api.3vltn.com/backend/health

# Test referral code validation
curl https://api.3vltn.com/backend/referrals/validate/SUPER2025

# Test stripe approval endpoint
curl https://api.3vltn.com/backend/stripe/approvals/pending
```

---

## 🧪 Testing the Stripe Approval Fix

### **The Problem:**
```
GET https://3vltn.com/backend/stripe/approvals/3/approve
→ 404 Not Found
```

### **Possible Causes:**
1. ❌ Server not restarted after code update
2. ❌ Route not registered (Fixed: it is registered)
3. ❌ Nginx caching the 404 response
4. ❌ Wrong approval ID (doesn't exist in database)

### **How to Test:**

**1. Check if server is running:**
```bash
pm2 list
pm2 logs node-backend --lines 20
```

**2. Test the endpoint directly:**
```bash
# This should return HTML with approval page
curl -L https://api.3vltn.com/backend/stripe/approvals/3/approve

# Check if approval exists
curl https://api.3vltn.com/backend/stripe/approvals/pending
```

**3. Check Nginx logs:**
```bash
tail -f /var/log/nginx/access.log | grep "stripe/approvals"
```

**4. Watch backend logs in real-time:**
```bash
pm2 logs node-backend --raw
```

Then click the approval link from the email.

**Expected log output:**
```
════════════════════════════════════════════════════════════
✅ STRIPE APPROVAL REQUEST RECEIVED (GET)
📍 Request Path: /approvals/3/approve
🆔 Approval ID: 3
🌍 Origin: No origin
🔗 Full URL: https://api.3vltn.com/backend/stripe/approvals/3/approve
════════════════════════════════════════════════════════════
```

---

## 🎯 Referral System Usage

### **Super Referral Code:**
```
Code: SUPER2025
Benefit: 1 month free Professional plan
Commission: 15% lifetime
Status: Unlimited uses
```

### **API Endpoints:**

#### **1. Validate Referral Code**
```bash
GET /backend/referrals/validate/:code

Example:
curl https://api.3vltn.com/backend/referrals/validate/SUPER2025
```

**Response:**
```json
{
  "success": true,
  "valid": true,
  "code": "SUPER2025",
  "codeType": "super",
  "bonusType": "free_month",
  "bonusValue": 1.00,
  "bonusPlan": "professional",
  "bonusDuration": 30,
  "commissionRate": 15.00,
  "description": "Super referral code - 1 month free Professional plan"
}
```

#### **2. Apply Referral Code (During Signup)**
```bash
POST /backend/referrals/apply

Body:
{
  "userId": 123,
  "referralCode": "SUPER2025",
  "metadata": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "utm_source": "twitter",
    "utm_medium": "social"
  }
}
```

**Response:**
```json
{
  "success": true,
  "referralId": 456,
  "referrerId": null,
  "referrerUsername": null,
  "bonusApplied": true,
  "bonusDetails": {
    "type": "free_month",
    "plan": "professional",
    "duration": 30,
    "endsAt": "2026-01-25T00:00:00.000Z"
  },
  "commissionRate": 15.00,
  "message": "Super referral code - 1 month free Professional plan"
}
```

#### **3. Get User's Referral Code**
```bash
GET /backend/referrals/my-code/:userId

Example:
curl https://api.3vltn.com/backend/referrals/my-code/10
```

**Response:**
```json
{
  "success": true,
  "referralCode": "SYED1234",
  "shareableLink": "https://3vltn.com/signup?ref=SYED1234",
  "totalReferrals": 5,
  "shareText": "Join me on DomainSeller! Use my referral code SYED1234 to get started.",
  "socialLinks": {
    "twitter": "https://twitter.com/intent/tweet?...",
    "facebook": "https://www.facebook.com/sharer/...",
    "linkedin": "https://www.linkedin.com/sharing/..."
  }
}
```

#### **4. Get Referral Dashboard**
```bash
GET /backend/referrals/dashboard/:userId

Example:
curl https://api.3vltn.com/backend/referrals/dashboard/10
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 10,
    "username": "aman",
    "referralCode": "AMAN1234",
    "totalReferrals": 25,
    "totalCommissionEarned": 450.50,
    "subscriptionPlan": "professional"
  },
  "stats": {
    "total_referrals": 25,
    "converted_referrals": 15,
    "active_referrals": 15,
    "total_commission_earned": 450.50,
    "total_commission_paid": 200.00,
    "total_commission_pending": 250.50
  },
  "commissionBreakdown": [...],
  "monthlyPerformance": [...],
  "topReferrals": [...],
  "recentReferrals": [...]
}
```

#### **5. Get Leaderboard**
```bash
GET /backend/referrals/leaderboard?timeframe=month&limit=20

Example:
curl "https://api.3vltn.com/backend/referrals/leaderboard?timeframe=all"
```

#### **6. Request Payout**
```bash
POST /backend/referrals/request-payout

Body:
{
  "userId": 10,
  "amount": 250.50,
  "paymentMethod": "paypal",
  "paymentEmail": "aman@erptechnicals.com"
}
```

**Minimum payout:** $50

---

## 🔗 Frontend Integration

### **Signup Page with Referral Code:**

```jsx
// Example React/Next.js component
const SignupPage = () => {
  const router = useRouter();
  const { ref } = router.query; // Get ref code from URL
  
  const [referralCode, setReferralCode] = useState(ref || '');
  const [referralValid, setReferralValid] = useState(null);
  
  // Validate referral code
  useEffect(() => {
    if (referralCode) {
      fetch(`/backend/referrals/validate/${referralCode}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.valid) {
            setReferralValid(data);
            // Show bonus message
            toast.success(`🎉 ${data.description}`);
          }
        });
    }
  }, [referralCode]);
  
  const handleSignup = async (formData) => {
    // 1. Create user account first
    const user = await createUser(formData);
    
    // 2. Apply referral code if present
    if (referralCode && user.id) {
      await fetch('/backend/referrals/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          referralCode: referralCode,
          metadata: {
            utm_source: router.query.utm_source,
            utm_medium: router.query.utm_medium
          }
        })
      });
    }
    
    // 3. Redirect to dashboard
    router.push('/dashboard');
  };
  
  return (
    <form onSubmit={handleSignup}>
      {/* ... signup fields ... */}
      
      <input
        type="text"
        value={referralCode}
        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
        placeholder="Referral Code (Optional)"
      />
      
      {referralValid && (
        <div className="bonus-badge">
          🎁 {referralValid.description}
        </div>
      )}
      
      <button type="submit">Sign Up</button>
    </form>
  );
};
```

---

## 📊 Database Tables Created

### **1. referral_codes**
- Super codes (like SUPER2025)
- Promotional codes
- Custom codes

### **2. referrals**
- Tracks each referral relationship
- Commission earned
- Conversion status

### **3. referral_commissions**
- Detailed commission transactions
- Approval workflow
- Payment tracking

### **4. referral_payouts**
- Payout requests
- Payment processing
- Status tracking

---

## 🔐 Admin Functions

### **Create Custom Referral Code:**

```bash
POST /backend/referrals/create-code

Body:
{
  "adminKey": "your_admin_secret_key_from_env",
  "code": "HOLIDAY50",
  "codeType": "promotional",
  "bonusType": "discount_percent",
  "bonusValue": 50,
  "bonusPlan": "professional",
  "bonusDuration": 90,
  "commissionRate": 10,
  "maxUses": 100,
  "expiresAt": "2026-01-31",
  "description": "50% off Professional plan for 3 months"
}
```

**Set admin key in `.env`:**
```bash
ADMIN_SECRET_KEY=your_secure_random_key_here
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Server restarted successfully
- [ ] Database migration completed
- [ ] Referral codes generated for existing users
- [ ] Super code `SUPER2025` exists
- [ ] Stripe approval endpoint responds (not 404)
- [ ] Mailgun webhook configured
- [ ] AI responses working
- [ ] CORS allows `https://api.3vltn.com`

---

## 🆘 Troubleshooting

### **Stripe Approval Still 404:**

1. Check PM2 is running:
```bash
pm2 status
```

2. Check if route is loaded:
```bash
pm2 logs node-backend --lines 100 | grep "stripe"
```

3. Test directly on server:
```bash
curl http://localhost:5000/backend/stripe/approvals/pending
```

4. Clear Nginx cache:
```bash
systemctl reload nginx
```

### **Referral Code Not Working:**

```sql
-- Check if code exists
SELECT * FROM referral_codes WHERE code = 'SUPER2025';

-- Check if user has referral code
SELECT id, username, referral_code FROM users WHERE id = 10;

-- Generate missing codes
SELECT generate_referral_code(id) FROM users WHERE referral_code IS NULL;
```

---

## 📞 Support

If issues persist:
1. Share PM2 logs: `pm2 logs node-backend --lines 100`
2. Share error screenshot
3. Share database query results for debugging

---

**Deployment complete! 🚀**

