# 🔐 Escrow System API Reference

## Quick Reference Card

### 🎯 Admin Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/backend/admin/verifications/pending` | GET | Get pending verifications |
| `/backend/admin/verifications/:id` | GET | Get transaction details + history |
| `/backend/admin/verifications/:id/verify` | POST | Verify & transfer funds OR refund |
| `/backend/admin/notifications` | GET | Get admin notifications |
| `/backend/admin/notifications/:id/read` | POST | Mark notification as read |
| `/backend/admin/stats` | GET | Dashboard statistics |

### 👤 Buyer Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/buyer/confirm/:txId/:token` | GET | Confirm domain received (HTML) |
| `/buyer/confirm/:txId` | POST | Confirm domain received (API) |
| `/buyer/transaction/:txId/:token` | GET | Get transaction status |

## 📋 Detailed Endpoints

### Admin: Get Pending Verifications

**GET** `/backend/admin/verifications/pending`

**Response:**
```json
{
  "success": true,
  "count": 3,
  "transactions": [
    {
      "id": 45,
      "domain_name": "premiumdomain.com",
      "amount": "5000.00",
      "currency": "USD",
      "buyer_name": "John Doe",
      "buyer_email": "john@example.com",
      "verification_status": "buyer_confirmed",
      "buyer_confirmed": true,
      "buyer_confirmed_at": "2026-01-12T15:30:00.000Z",
      "seller_username": "seller123",
      "seller_email": "seller@example.com",
      "campaign_name": "Premium Domains",
      "platform_fee_amount": "500.00",
      "seller_payout_amount": "4500.00",
      "paid_at": "2026-01-12T14:00:00.000Z",
      "created_at": "2026-01-12T13:45:00.000Z"
    }
  ]
}
```

---

### Admin: Verify Transaction

**POST** `/backend/admin/verifications/:transactionId/verify`

**Request Body:**
```json
{
  "verified": true,
  "adminUserId": 1,
  "notes": "Domain transfer verified via GoDaddy dashboard. Transfer completed successfully."
}
```

**Success Response:**
```json
{
  "success": true,
  "action": "transferred",
  "transferId": "tr_1AbCdEfGhIjKlMnO",
  "amount": 4500.00,
  "sellerStripeId": "acct_1234567890",
  "message": "Domain transfer verified and funds transferred to seller"
}
```

**Failure Response (Refund):**
```json
{
  "success": true,
  "action": "refunded",
  "refundId": "re_1AbCdEfGhIjKlMnO",
  "amount": 5000.00,
  "message": "Domain transfer failed and buyer refunded"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Transaction already verified and processed",
  "message": "Cannot re-verify a completed transaction"
}
```

---

### Admin: Get Transaction Details

**GET** `/backend/admin/verifications/:transactionId`

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": 45,
    "domain_name": "premiumdomain.com",
    "amount": "5000.00",
    "buyer_name": "John Doe",
    "buyer_email": "john@example.com",
    "verification_status": "buyer_confirmed",
    "payment_status": "paid",
    "seller_username": "seller123",
    "seller_email": "seller@example.com",
    "campaign_name": "Premium Domains",
    "platform_fee_amount": "500.00",
    "seller_payout_amount": "4500.00",
    "stripe_payment_intent_id": "pi_1AbCdEfGhIjKlMnO",
    "paid_at": "2026-01-12T14:00:00.000Z",
    "buyer_confirmed": true,
    "buyer_confirmed_at": "2026-01-12T15:30:00.000Z"
  },
  "history": [
    {
      "id": 120,
      "action": "buyer_confirmed",
      "previous_status": "payment_received",
      "new_status": "buyer_confirmed",
      "notes": "Buyer confirmed domain receipt",
      "created_at": "2026-01-12T15:30:00.000Z",
      "performed_by_username": null
    },
    {
      "id": 119,
      "action": "payment_received",
      "previous_status": "pending_payment",
      "new_status": "payment_received",
      "notes": "Payment completed, awaiting verification",
      "created_at": "2026-01-12T14:00:00.000Z",
      "performed_by_username": null
    },
    {
      "id": 118,
      "action": "transaction_created",
      "previous_status": null,
      "new_status": "pending_payment",
      "notes": "Escrow payment link created",
      "created_at": "2026-01-12T13:45:00.000Z",
      "performed_by_username": null
    }
  ]
}
```

---

### Admin: Get Notifications

**GET** `/backend/admin/notifications?unreadOnly=true&limit=50`

**Query Parameters:**
- `unreadOnly`: `true` or `false` (default: all)
- `limit`: number (default: 50)

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": 234,
      "type": "buyer_confirmed",
      "title": "Buyer Confirmed Domain Receipt",
      "message": "Buyer confirmed receipt of premiumdomain.com. Ready for final admin verification and fund transfer.",
      "transaction_id": 45,
      "priority": "high",
      "is_read": false,
      "domain_name": "premiumdomain.com",
      "amount": "5000.00",
      "buyer_name": "John Doe",
      "created_at": "2026-01-12T15:30:00.000Z"
    },
    {
      "id": 233,
      "type": "payment_received",
      "title": "New Payment Awaiting Verification",
      "message": "Payment of $5000 received for premiumdomain.com. Verification required before transferring funds to seller.",
      "transaction_id": 45,
      "priority": "high",
      "is_read": false,
      "created_at": "2026-01-12T14:00:00.000Z"
    }
  ],
  "unreadCount": 8
}
```

---

### Admin: Mark Notification as Read

**POST** `/backend/admin/notifications/:notificationId/read`

**Request Body:**
```json
{
  "adminUserId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### Admin: Get Dashboard Stats

**GET** `/backend/admin/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "pending": {
      "count": 5,
      "amount": 25000.00
    },
    "completed": {
      "count": 120,
      "amount": 450000.00
    },
    "platformFees": 45000.00,
    "failed": {
      "count": 2,
      "refunded": 8000.00
    }
  }
}
```

---

### Buyer: Confirm Domain Receipt (HTML)

**GET** `/buyer/confirm/:transactionId/:token`

**Example:**
```
GET /buyer/confirm/45/a1b2c3d4e5f6g7h8
```

**Response:** HTML page showing confirmation success

---

### Buyer: Confirm Domain Receipt (API)

**POST** `/buyer/confirm/:transactionId`

**Request Body:**
```json
{
  "buyerEmail": "john@example.com",
  "token": "a1b2c3d4e5f6g7h8"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": 45,
    "domain_name": "premiumdomain.com",
    "buyer_confirmed": true,
    "buyer_confirmed_at": "2026-01-12T15:30:00.000Z",
    "verification_status": "buyer_confirmed"
  },
  "message": "Buyer confirmation recorded. Awaiting final admin verification."
}
```

---

### Buyer: Get Transaction Status

**GET** `/buyer/transaction/:transactionId/:token`

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": 45,
    "domain_name": "premiumdomain.com",
    "amount": "5000.00",
    "currency": "USD",
    "payment_status": "paid",
    "verification_status": "buyer_confirmed",
    "buyer_confirmed": true,
    "buyer_confirmed_at": "2026-01-12T15:30:00.000Z",
    "created_at": "2026-01-12T13:45:00.000Z",
    "paid_at": "2026-01-12T14:00:00.000Z"
  }
}
```

---

## 🔒 Token Generation

Tokens for buyer confirmation links are generated using SHA-256:

```javascript
const crypto = require('crypto');
const token = crypto
  .createHash('sha256')
  .update(`${transactionId}-${buyerEmail}-${domainName}`)
  .digest('hex')
  .substring(0, 16);

const confirmationLink = `https://api.3vltn.com/buyer/confirm/${transactionId}/${token}`;
```

---

## 🎯 Integration Example (React Admin Dashboard)

```typescript
import React, { useEffect, useState } from 'react';

function AdminVerifications() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    const res = await fetch('/backend/admin/verifications/pending');
    const data = await res.json();
    setPending(data.transactions);
    setLoading(false);
  };

  const handleVerify = async (transactionId, verified, notes) => {
    const res = await fetch(`/backend/admin/verifications/${transactionId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verified,
        adminUserId: 1, // Get from auth context
        notes
      })
    });

    const result = await res.json();
    if (result.success) {
      alert(`Transaction ${verified ? 'approved' : 'rejected'}!`);
      fetchPending(); // Refresh list
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Pending Verifications ({pending.length})</h2>
      {pending.map(tx => (
        <div key={tx.id} className="transaction-card">
          <h3>{tx.domain_name}</h3>
          <p>Amount: ${tx.amount}</p>
          <p>Buyer: {tx.buyer_name} ({tx.buyer_email})</p>
          <p>Status: {tx.verification_status}</p>
          {tx.buyer_confirmed && (
            <span className="badge">✓ Buyer Confirmed</span>
          )}
          <button onClick={() => handleVerify(tx.id, true, 'Verified')}>
            ✓ Verify & Transfer Funds
          </button>
          <button onClick={() => handleVerify(tx.id, false, 'Domain not received')}>
            ✗ Reject & Refund
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 📊 Status Reference

| Status | Description | Next Action |
|--------|-------------|-------------|
| `pending_payment` | Payment link created | Wait for payment |
| `payment_received` | Payment completed | Buyer confirms OR admin verifies |
| `buyer_confirmed` | Buyer confirmed receipt | Admin verifies |
| `verified` | Admin verified transfer | Funds transferred |
| `verification_failed` | Verification failed | Buyer refunded |
| `funds_transferred` | Complete | None |

---

**Need Help?** Check `ESCROW_SYSTEM.md` for detailed documentation.

