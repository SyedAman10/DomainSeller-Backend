# 🎯 Referral System API Reference

## Quick Deploy
```bash
cd /root/DomainSeller-Backend
git pull
npm run migrate  # Runs database/add_referral_system.sql
pm2 restart node-backend
```

## ⚠️ Important: Set FRONTEND_URL
In your `.env` file on the server:
```bash
# Change this:
FRONTEND_URL=http://localhost:3000  # ❌ Wrong for production!

# To this:
FRONTEND_URL=https://3vltn.com  # ✅ Correct!
```

Then restart:
```bash
pm2 restart node-backend
```

## Super Referral Code
- **Code:** `SUPER2025`
- **Benefit:** 1 month FREE Professional plan
- **Commission:** 15% lifetime

---

## API Endpoints

### 1. Validate Referral Code
**GET** `/backend/referrals/validate/:code`

```javascript
// Request
fetch('https://api.3vltn.com/backend/referrals/validate/SUPER2025')

// Response (200 OK)
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

// Response (404 Not Found)
{
  "success": false,
  "error": "Code not found"
}
```

---

### 2. Apply Referral Code (During Signup)
**POST** `/backend/referrals/apply`

```javascript
// Request
fetch('https://api.3vltn.com/backend/referrals/apply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 123,
    referralCode: "SUPER2025",
    metadata: {  // Optional
      ip: "192.168.1.1",
      userAgent: "Mozilla/5.0...",
      utm_source: "twitter",
      utm_medium: "social"
    }
  })
})

// Response (200 OK)
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

---

### 3. Get User's Referral Code & Share Links
**GET** `/backend/referrals/my-code/:userId`

```javascript
// Request
fetch('https://api.3vltn.com/backend/referrals/my-code/10')

// Response (200 OK)
{
  "success": true,
  "referralCode": "AMAN1234",
  "shareableLink": "https://3vltn.com/signup?ref=AMAN1234",
  "totalReferrals": 5,
  "shareText": "Join me on DomainSeller! Use my referral code AMAN1234 to get started.",
  "socialLinks": {
    "twitter": "https://twitter.com/intent/tweet?text=...",
    "facebook": "https://www.facebook.com/sharer/...",
    "linkedin": "https://www.linkedin.com/sharing/..."
  }
}
```

---

### 4. Get Referral Dashboard
**GET** `/backend/referrals/dashboard/:userId`

```javascript
// Request
fetch('https://api.3vltn.com/backend/referrals/dashboard/10')

// Response (200 OK)
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
    "total_referrals": "25",
    "converted_referrals": "15",
    "active_referrals": "15",
    "total_commission_earned": "450.50",
    "total_commission_paid": "200.00",
    "total_commission_pending": "250.50"
  },
  "commissionBreakdown": [
    { "status": "pending", "count": "5", "total": "250.50" },
    { "status": "approved", "count": "8", "total": "0.00" },
    { "status": "paid", "count": "12", "total": "200.00" }
  ],
  "monthlyPerformance": [
    {
      "month": "2025-12-01T00:00:00.000Z",
      "signups": "8",
      "conversions": "5",
      "commission": "150.50"
    }
  ],
  "topReferrals": [...],
  "recentReferrals": [...],
  "pendingCommissions": 250.50
}
```

---

### 5. Get Referral Stats (Simple)
**GET** `/backend/referrals/stats/:userId`

```javascript
// Request
fetch('https://api.3vltn.com/backend/referrals/stats/10')

// Response (200 OK)
{
  "success": true,
  "referralCode": "AMAN1234",
  "stats": {
    "total_referrals": "25",
    "converted_referrals": "15",
    "active_referrals": "15",
    "total_commission_earned": "450.50",
    "total_commission_paid": "200.00",
    "total_commission_pending": "250.50"
  },
  "recentReferrals": [
    {
      "id": 123,
      "referred_username": "john",
      "referred_email": "john@example.com",
      "signup_date": "2025-12-20T...",
      "status": "converted",
      "commission_earned": "45.00",
      "subscription_plan": "professional"
    }
  ],
  "pendingCommissions": 250.50
}
```

---

### 6. Get Leaderboard
**GET** `/backend/referrals/leaderboard?timeframe=all&limit=20`

```javascript
// Request
fetch('https://api.3vltn.com/backend/referrals/leaderboard?timeframe=month&limit=10')

// Response (200 OK)
{
  "success": true,
  "timeframe": "month",
  "leaderboard": [
    {
      "rank": 1,
      "id": 10,
      "username": "aman",
      "referral_code": "AMAN1234",
      "total_referrals": "25",
      "conversions": "15",
      "total_commission": "450.50",
      "member_since": "2025-01-01T..."
    }
  ]
}
```

---

### 7. Get Commission History
**GET** `/backend/referrals/commissions/:userId?status=pending&limit=50`

```javascript
// Request
fetch('https://api.3vltn.com/backend/referrals/commissions/10?status=pending')

// Response (200 OK)
{
  "success": true,
  "commissions": [
    {
      "id": 789,
      "amount": "45.00",
      "commission_type": "subscription",
      "commission_rate": "15.00",
      "base_amount": "300.00",
      "status": "pending",
      "created_at": "2025-12-20T...",
      "referred_username": "john",
      "referred_email": "john@example.com",
      "referred_user_plan": "professional"
    }
  ],
  "totals": {
    "total_count": "25",
    "pending_amount": "250.50",
    "approved_amount": "0.00",
    "paid_amount": "200.00"
  },
  "pagination": {
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### 8. Request Payout
**POST** `/backend/referrals/request-payout`

```javascript
// Request (Minimum $50)
fetch('https://api.3vltn.com/backend/referrals/request-payout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 10,
    amount: 250.50,
    paymentMethod: "paypal",  // paypal, bank_transfer, stripe
    paymentEmail: "aman@erptechnicals.com"
  })
})

// Response (200 OK)
{
  "success": true,
  "payout": {
    "id": 123,
    "user_id": 10,
    "amount": "250.50",
    "payment_method": "paypal",
    "payment_email": "aman@erptechnicals.com",
    "status": "pending",
    "requested_at": "2025-12-25T...",
    "commission_count": 15
  },
  "message": "Payout request submitted successfully. It will be processed within 5-7 business days."
}

// Response (400 Bad Request)
{
  "success": false,
  "error": "Insufficient balance. Available: $150.25"
}

// Response (400 Bad Request)
{
  "success": false,
  "error": "Minimum payout amount is $50"
}
```

---

### 9. Get Payout History
**GET** `/backend/referrals/payouts/:userId`

```javascript
// Request
fetch('https://api.3vltn.com/backend/referrals/payouts/10')

// Response (200 OK)
{
  "success": true,
  "payouts": [
    {
      "id": 123,
      "amount": "250.50",
      "currency": "USD",
      "payment_method": "paypal",
      "payment_email": "aman@erptechnicals.com",
      "status": "completed",
      "requested_at": "2025-12-20T...",
      "completed_at": "2025-12-25T...",
      "commission_count": 15
    }
  ]
}
```

---

### 10. Create Custom Code (Admin Only)
**POST** `/backend/referrals/create-code`

```javascript
// Request
fetch('https://api.3vltn.com/backend/referrals/create-code', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    adminKey: "your_admin_secret_from_env",  // From .env
    code: "HOLIDAY50",
    codeType: "promotional",
    bonusType: "discount_percent",
    bonusValue: 50,
    bonusPlan: "professional",
    bonusDuration: 90,
    commissionRate: 10,
    maxUses: 100,
    expiresAt: "2026-01-31",
    description: "50% off Professional plan for 3 months"
  })
})

// Response (200 OK)
{
  "success": true,
  "code": {
    "id": 456,
    "code": "HOLIDAY50",
    "code_type": "promotional",
    "bonus_type": "discount_percent",
    "bonus_value": "50.00",
    "is_active": true,
    "total_uses": 0
  }
}
```

---

## Frontend Integration Example

### Signup Page
```jsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function SignupPage() {
  const router = useRouter();
  const { ref } = router.query; // Get ?ref=CODE from URL
  
  const [refCode, setRefCode] = useState(ref || '');
  const [refValid, setRefValid] = useState(null);
  
  // Validate code when entered
  useEffect(() => {
    if (refCode.length >= 4) {
      fetch(`/backend/referrals/validate/${refCode}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.valid) {
            setRefValid(data);
          } else {
            setRefValid(null);
          }
        });
    }
  }, [refCode]);
  
  const handleSignup = async (formData) => {
    // 1. Create user
    const userRes = await fetch('/backend/users/signup', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    const user = await userRes.json();
    
    // 2. Apply referral code
    if (refCode && user.id) {
      await fetch('/backend/referrals/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          referralCode: refCode,
          metadata: {
            utm_source: router.query.utm_source,
            utm_medium: router.query.utm_medium
          }
        })
      });
    }
    
    router.push('/dashboard');
  };
  
  return (
    <form onSubmit={handleSignup}>
      {/* ...other fields... */}
      
      <input
        value={refCode}
        onChange={(e) => setRefCode(e.target.value.toUpperCase())}
        placeholder="Referral Code (Optional)"
      />
      
      {refValid && (
        <div className="bonus-alert">
          🎁 {refValid.description}
        </div>
      )}
      
      <button>Sign Up</button>
    </form>
  );
}
```

### Referral Dashboard
```jsx
export default function ReferralDashboard({ userId }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch(`/backend/referrals/dashboard/${userId}`)
      .then(r => r.json())
      .then(setData);
  }, [userId]);
  
  if (!data) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>Your Referral Code: {data.user.referralCode}</h2>
      
      <div className="share-box">
        <input 
          readOnly 
          value={data.shareableLink} 
          onClick={(e) => e.target.select()}
        />
        <button onClick={() => {
          navigator.clipboard.writeText(data.shareableLink);
        }}>
          Copy Link
        </button>
      </div>
      
      <div className="stats">
        <div>Total Referrals: {data.user.totalReferrals}</div>
        <div>Earnings: ${data.user.totalCommissionEarned}</div>
        <div>Pending: ${data.pendingCommissions}</div>
      </div>
      
      <div className="recent">
        <h3>Recent Referrals</h3>
        {data.recentReferrals.map(ref => (
          <div key={ref.id}>
            {ref.referred_username} - ${ref.commission_earned}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## That's It!

Deploy:
```bash
git pull
npm run migrate
pm2 restart node-backend
```

Test:
```bash
curl https://api.3vltn.com/backend/referrals/validate/SUPER2025
```

