# 📊 Sales & Sold Domains API Documentation

## Overview
These APIs allow sellers to view their sold domains, transaction details, and sales statistics. They use the new `transactions` table from the escrow system.

---

## 🔑 **API Endpoints**

### 1. Get All Sales for a Seller

**Endpoint:** `GET /backend/sales/seller/:userId`

**Description:** Get all sold domains and transactions for a specific seller.

**Query Parameters:**
- `status` (optional): Filter by status
  - `completed` - Only show completed transfers
  - `pending` - Only show pending verifications
  - `all` - Show all (default)

**Request Example:**
```http
GET /backend/sales/seller/10
GET /backend/sales/seller/10?status=completed
GET /backend/sales/seller/10?status=pending
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "sales": [
      {
        "transaction_id": 9,
        "domain_name": "theprimecrafters.com",
        "total_amount": "2500.00",
        "currency": "USD",
        "platform_fee_amount": "125.00",
        "seller_payout_amount": "2375.00",
        "buyer_name": "aman",
        "buyer_email": "aman@erptechnicals.com",
        "payment_status": "paid",
        "verification_status": "verified",
        "transfer_status": "completed",
        "transfer_id": "tr_1SpAgpQSlT9MJxuDe6ataGmf",
        "buyer_confirmed": false,
        "buyer_confirmed_at": null,
        "paid_at": "2026-01-13T15:45:42.000Z",
        "verified_at": "2026-01-13T16:36:01.000Z",
        "created_at": "2026-01-13T13:55:15.000Z",
        "updated_at": "2026-01-13T16:36:02.000Z",
        "campaign_name": "Prime Crafters Domain Campaign",
        "campaign_id": "campaign_1768237454413_2yhbcxcjq",
        "sold": true,
        "sold_at": "2026-01-13T16:36:02.000Z",
        "seller_username": "syed_aman",
        "seller_email": "amanullahnaqvi@gmail.com",
        "seller_first_name": "Syed",
        "seller_last_name": "Aman Ullah"
      }
    ],
    "summary": {
      "totalSold": 1,
      "totalPending": 2,
      "totalRevenue": "2375.00",
      "totalPendingRevenue": "4750.00",
      "averagePrice": "2375.00"
    }
  }
}
```

**Use Cases:**
- Seller dashboard "My Sales" page
- Transaction history
- Revenue tracking

---

### 2. Get Transaction Details

**Endpoint:** `GET /backend/sales/transaction/:transactionId`

**Description:** Get detailed information about a specific transaction including verification history.

**Request Example:**
```http
GET /backend/sales/transaction/9
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": 9,
      "campaign_id": null,
      "buyer_email": "aman@erptechnicals.com",
      "buyer_name": "aman",
      "domain_name": "theprimecrafters.com",
      "amount": "2500.00",
      "currency": "USD",
      "payment_status": "paid",
      "stripe_payment_intent_id": "pi_3Sp9mqQSlT9MJxuD0Q0TI4X5",
      "stripe_payment_link_id": "plink_1Sp9mGQSlT9MJxuDgYI7Flat",
      "stripe_product_id": "prod_RdGjsC8v9K0s3H",
      "stripe_price_id": "price_1Sp9mGQSlT9MJxuDDfmb6f2b",
      "paid_at": "2026-01-13T15:45:42.000Z",
      "verification_status": "verified",
      "verification_method": null,
      "verified_at": "2026-01-13T16:36:01.000Z",
      "verified_by": 1,
      "verification_notes": "check bro",
      "buyer_confirmed": false,
      "buyer_confirmed_at": null,
      "transfer_status": "completed",
      "transfer_id": "tr_1SpAgpQSlT9MJxuDe6ataGmf",
      "refund_id": null,
      "user_id": 10,
      "seller_stripe_id": "acct_1SY7wyKNo0zkXAmY",
      "platform_fee_amount": "125.00",
      "seller_payout_amount": "2375.00",
      "created_at": "2026-01-13T13:55:15.000Z",
      "updated_at": "2026-01-13T16:36:02.000Z",
      "seller_username": "syed_aman",
      "seller_email": "amanullahnaqvi@gmail.com",
      "seller_first_name": "Syed",
      "seller_last_name": "Aman Ullah",
      "campaign_name": null,
      "campaign_id": null,
      "sold": null,
      "sold_at": null,
      "sold_price": null
    },
    "history": [
      {
        "id": 1,
        "transaction_id": 9,
        "action": "payment_received",
        "previous_status": "pending_payment",
        "new_status": "payment_received",
        "performed_by": null,
        "notes": "Payment completed, awaiting verification",
        "metadata": null,
        "created_at": "2026-01-13T15:45:42.000Z",
        "performed_by_username": null,
        "performed_by_email": null
      },
      {
        "id": 2,
        "transaction_id": 9,
        "action": "admin_verification",
        "previous_status": "payment_received",
        "new_status": "verified",
        "performed_by": 1,
        "notes": "Domain transfer verified. Transfer initiated.",
        "metadata": null,
        "created_at": "2026-01-13T16:36:01.000Z",
        "performed_by_username": "admin",
        "performed_by_email": "admin@3vltn.com"
      }
    ]
  }
}
```

**Use Cases:**
- Transaction detail page
- Audit trail
- Support inquiries

---

### 3. Check if Domain is Sold

**Endpoint:** `GET /backend/sales/domain/:domainName`

**Description:** Check if a specific domain has been sold and get sale details.

**Request Example:**
```http
GET /backend/sales/domain/theprimecrafters.com
```

**Response Example (Sold):**
```json
{
  "success": true,
  "data": {
    "isSold": true,
    "domainName": "theprimecrafters.com",
    "soldAt": "2026-01-13T16:36:02.000Z",
    "soldPrice": "2500.00",
    "campaign": {
      "id": 15,
      "campaignId": "campaign_1768237454413_2yhbcxcjq",
      "campaignName": "Prime Crafters Domain Campaign",
      "status": "paused"
    },
    "transaction": {
      "id": 9,
      "domain_name": "theprimecrafters.com",
      "amount": "2500.00",
      "currency": "USD",
      "buyer_name": "aman",
      "buyer_email": "aman@erptechnicals.com",
      "payment_status": "paid",
      "verification_status": "verified",
      "transfer_status": "completed",
      "paid_at": "2026-01-13T15:45:42.000Z",
      "verified_at": "2026-01-13T16:36:01.000Z"
    }
  }
}
```

**Response Example (Not Sold):**
```json
{
  "success": true,
  "data": {
    "isSold": false,
    "domainName": "example.com"
  }
}
```

**Use Cases:**
- Campaign creation validation (prevent campaigns for sold domains)
- Domain listing pages (show "SOLD" badge)
- Seller dashboard

---

### 4. Get Sales Statistics

**Endpoint:** `GET /backend/sales/stats/:userId`

**Description:** Get comprehensive sales statistics for a seller.

**Request Example:**
```http
GET /backend/sales/stats/10
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "total": {
      "count": 5,
      "revenue": 12375.00,
      "fees": 650.00
    },
    "completed": {
      "count": 3,
      "revenue": 7125.00,
      "fees": 375.00
    },
    "pending": {
      "count": 2,
      "revenue": 5250.00,
      "fees": 275.00
    },
    "awaitingVerification": {
      "count": 1,
      "revenue": 2375.00
    },
    "thisMonth": {
      "count": 3,
      "revenue": 7125.00
    },
    "thisYear": {
      "count": 5,
      "revenue": 12375.00
    }
  }
}
```

**Use Cases:**
- Dashboard summary cards
- Analytics charts
- Revenue reports

---

## 🎨 **Frontend Integration Examples**

### Example 1: Seller Dashboard - Sales List

```typescript
// Fetch all completed sales
const response = await fetch('https://api.3vltn.com/backend/sales/seller/10?status=completed');
const { data } = await response.json();

// Display sales
data.sales.forEach(sale => {
  console.log(`
    Domain: ${sale.domain_name}
    Sale Price: $${sale.total_amount}
    Your Payout: $${sale.seller_payout_amount}
    Status: ${sale.transfer_status}
    Sold: ${new Date(sale.sold_at).toLocaleDateString()}
  `);
});

// Show summary
console.log(`
  Total Sold: ${data.summary.totalSold}
  Total Revenue: $${data.summary.totalRevenue}
  Average Price: $${data.summary.averagePrice}
`);
```

### Example 2: Check if Domain is Sold (Before Creating Campaign)

```typescript
// Check if domain is sold
const checkSold = async (domainName) => {
  const response = await fetch(`https://api.3vltn.com/backend/sales/domain/${domainName}`);
  const { data } = await response.json();
  
  if (data.isSold) {
    alert(`This domain was sold on ${new Date(data.soldAt).toLocaleDateString()} for $${data.soldPrice}`);
    return false; // Don't allow campaign creation
  }
  
  return true; // Allow campaign creation
};
```

### Example 3: Transaction Detail Page

```typescript
// Get transaction details
const response = await fetch('https://api.3vltn.com/backend/sales/transaction/9');
const { data } = await response.json();

console.log('Transaction:', data.transaction);
console.log('History:', data.history);

// Show timeline
data.history.forEach(event => {
  console.log(`
    ${new Date(event.created_at).toLocaleString()}
    ${event.action}: ${event.notes}
    ${event.performed_by_username ? `By: ${event.performed_by_username}` : ''}
  `);
});
```

### Example 4: Dashboard Stats Cards

```typescript
// Get stats
const response = await fetch('https://api.3vltn.com/backend/sales/stats/10');
const { data } = await response.json();

// Display cards
const cards = [
  {
    title: 'Total Revenue',
    value: `$${data.total.revenue}`,
    subtitle: `${data.total.count} sales`
  },
  {
    title: 'This Month',
    value: `$${data.thisMonth.revenue}`,
    subtitle: `${data.thisMonth.count} sales`
  },
  {
    title: 'Pending',
    value: `$${data.pending.revenue}`,
    subtitle: `${data.pending.count} transactions`
  },
  {
    title: 'Avg Sale Price',
    value: `$${data.completed.revenue / data.completed.count}`,
    subtitle: 'Completed sales'
  }
];
```

---

## 🔐 **Security Notes**

1. **User ID Verification**: In production, verify that the requesting user matches the `userId` in the URL or has admin permissions.

2. **Add Authentication Middleware**:
```javascript
// Add to routes/sales.js
const { authenticateUser } = require('../middleware/auth');

router.get('/seller/:userId', authenticateUser, async (req, res) => {
  // Verify req.user.id === req.params.userId
  if (req.user.id !== parseInt(req.params.userId) && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  // ... rest of code
});
```

---

## 📋 **Summary**

### **What's Available:**

| Endpoint | Purpose | Frontend Use |
|----------|---------|--------------|
| `GET /backend/sales/seller/:userId` | List all sales | Seller dashboard, sales history |
| `GET /backend/sales/transaction/:id` | Transaction details | Detail page, audit trail |
| `GET /backend/sales/domain/:name` | Check if sold | Campaign validation, badges |
| `GET /backend/sales/stats/:userId` | Sales statistics | Dashboard cards, analytics |

### **What Shows "SOLD" Status:**

✅ `sold = true` in `campaigns` table
✅ `transfer_status = 'completed'` in `transactions` table
✅ Domain name check via `/backend/sales/domain/:name`

### **Platform Fee:**

- **Current Rate**: 5%
- Automatically calculated and stored in `platform_fee_amount`
- Seller receives 95% in `seller_payout_amount`

---

## 🚀 **Next Steps**

1. ✅ APIs created in `routes/sales.js`
2. ✅ Routes registered in `server.js`
3. 🟡 Add authentication middleware (recommended)
4. 🟡 Build frontend UI components
5. 🟡 Test with real transactions

**Ready to use immediately!** Just restart your server:
```bash
pm2 restart all
```

