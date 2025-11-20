# 🧪 Escrow.com Sandbox Integration - Complete Setup Guide

## ✅ Your Sandbox Credentials

- **Email:** `3v0ltn@gmail.com`
- **API Key:** `4767_oaGfrPsQjh3PclmYUvK7bEhIpIlrdTaPdLylHz9DwrLZFtKi2h5I3pYzsUslqfTe`
- **Sandbox URL:** `https://www.escrow-sandbox.com`
- **API Endpoint:** `https://api.escrow-sandbox.com/2017-09-01`

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Update Your .env File

Open `DomainSeller-Backend/.env` and update the Escrow section:

```env
# Escrow.com SANDBOX Configuration (ACTIVE)
ESCROW_API_URL=https://api.escrow-sandbox.com/2017-09-01
ESCROW_EMAIL=3v0ltn@gmail.com
ESCROW_API_KEY=4767_oaGfrPsQjh3PclmYUvK7bEhIpIlrdTaPdLylHz9DwrLZFtKi2h5I3pYzsUslqfTe
```

### Step 2: Test API Connection

Run the test script:

```bash
cd DomainSeller-Backend
node test-escrow-api.js
```

This will:
- ✅ Test authentication
- ✅ Create a test transaction
- ✅ List your transactions
- ✅ Verify everything works!

### Step 3: Restart Your Server

```bash
node server.js
# or
npm start
```

Your escrow integration is now LIVE (in sandbox mode)! 🎉

---

## 🧪 How to Test the Integration

### Method 1: Using the Test Script

The easiest way to test:

```bash
node test-escrow-api.js
```

This creates a real sandbox transaction you can view at:
`https://www.escrow-sandbox.com`

### Method 2: Through Your Domain Selling Flow

1. **Send a test email to your campaign:**
   ```
   From: buyer@example.com
   Subject: Interested in buying
   Body: I'd like to purchase this domain. How can I pay?
   ```

2. **AI Agent will respond with escrow link**

3. **Check the database:**
   ```sql
   SELECT * FROM escrow_transactions 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

### Method 3: Direct API Call

```bash
curl -X POST http://localhost:5000/backend/escrow/create \
  -H "Content-Type: application/json" \
  -d '{
    "domainName": "example.com",
    "buyerEmail": "buyer@test.com",
    "buyerName": "John Buyer",
    "sellerEmail": "3v0ltn@gmail.com",
    "sellerName": "Domain Seller",
    "amount": 5000,
    "currency": "USD",
    "campaignId": "your_campaign_id",
    "userId": 12,
    "feePayer": "buyer"
  }'
```

---

## 📊 Understanding Sandbox vs Production

### Sandbox Environment (Current)
- ✅ **URL:** `https://www.escrow-sandbox.com`
- ✅ **API:** `https://api.escrow-sandbox.com/2017-09-01`
- ✅ **Money:** Fake (test only)
- ✅ **Perfect for:** Development, testing, demos
- ✅ **Transactions:** Can be cancelled/deleted freely
- ✅ **No real money involved**

### Production Environment (When Ready)
- 🔴 **URL:** `https://www.escrow.com`
- 🔴 **API:** `https://api.escrow.com/2017-09-01`
- 🔴 **Money:** Real
- 🔴 **Use for:** Live customer transactions
- 🔴 **Transactions:** Legally binding contracts
- 🔴 **Requires:** Production API credentials

---

## 🎯 Common Use Cases

### Use Case 1: Buyer Requests Payment Link

**Buyer Email:**
> Hi, I'm interested in buying domain-example.com. How can I pay?

**What Happens:**
1. AI detects payment request
2. System calls `createEscrowTransaction()`
3. API creates transaction in Escrow.com sandbox
4. Buyer receives email with secure payment link
5. Transaction stored in database

**Result:**
```
✅ Escrow transaction created: txn_abc123
🔗 Payment URL: https://www.escrow-sandbox.com/transaction/txn_abc123
```

### Use Case 2: Configure Campaign Escrow Settings

Set asking price and fee payer for a campaign:

```bash
curl -X PUT http://localhost:5000/backend/escrow/campaign/campaign_123/settings \
  -H "Content-Type: application/json" \
  -d '{
    "askingPrice": 5000,
    "escrowFeePayer": "buyer",
    "escrowEnabled": true
  }'
```

### Use Case 3: Check Transaction Status

```bash
curl http://localhost:5000/backend/escrow/transactions/campaign_123
```

Returns all escrow transactions for that campaign.

---

## 🔧 API Endpoints Reference

### 1. Create Escrow Transaction

```bash
POST /backend/escrow/create
```

**Body:**
```json
{
  "domainName": "example.com",
  "buyerEmail": "buyer@test.com",
  "buyerName": "John Buyer",
  "sellerEmail": "3v0ltn@gmail.com",
  "sellerName": "Seller Name",
  "amount": 5000,
  "currency": "USD",
  "campaignId": "campaign_id",
  "userId": 12,
  "feePayer": "buyer"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "txn_abc123",
  "escrowUrl": "https://www.escrow-sandbox.com/transaction/txn_abc123",
  "amount": 5000,
  "currency": "USD",
  "message": "Escrow transaction created successfully"
}
```

### 2. Connect User Escrow Account

```bash
POST /backend/escrow/connect
```

**Body:**
```json
{
  "userId": 12,
  "escrowEmail": "3v0ltn@gmail.com",
  "escrowApiKey": "your_api_key",
  "escrowProvider": "escrow.com"
}
```

### 3. Check Escrow Status

```bash
GET /backend/escrow/status/:userId
```

**Response:**
```json
{
  "enabled": true,
  "email": "3v0ltn@gmail.com",
  "provider": "escrow.com"
}
```

### 4. Get Campaign Transactions

```bash
GET /backend/escrow/transactions/:campaignId
```

**Response:**
```json
[
  {
    "id": 1,
    "transaction_id": "txn_abc123",
    "campaign_id": "campaign_123",
    "buyer_email": "buyer@test.com",
    "domain_name": "example.com",
    "amount": 5000,
    "status": "pending",
    "escrow_url": "https://www.escrow-sandbox.com/transaction/txn_abc123",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### 5. Configure Campaign Escrow

```bash
PUT /backend/escrow/campaign/:campaignId/settings
```

**Body:**
```json
{
  "askingPrice": 5000,
  "escrowFeePayer": "buyer",
  "escrowEnabled": true
}
```

---

## 🎨 How AI Agent Uses Escrow

The AI agent automatically detects payment requests and generates escrow links:

### Trigger Phrases:
- "How can I pay?"
- "Send payment link"
- "Ready to buy"
- "Purchase process"
- "Escrow link"
- "Want to proceed"

### Email Template:

When buyer requests payment, AI responds with:

```
Hi [Buyer Name],

Great to hear you're ready to move forward!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 SECURE PAYMENT LINK

To complete your purchase securely through Escrow.com:

🔗 [Payment Link]

💰 Amount: $5,000 USD
🛡️ Protected by Escrow.com
📋 Escrow fees paid by buyer

Escrow.com ensures safe transfer - your payment is protected 
until you receive the domain.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best regards,
[Seller Name]
```

---

## 🐛 Troubleshooting

### Issue: "Authentication failed"

**Solution:**
1. Check `.env` file has correct credentials
2. Verify sandbox URL: `https://api.escrow-sandbox.com/2017-09-01`
3. Test with: `node test-escrow-api.js`

### Issue: "Transaction creation failed"

**Possible causes:**
- Invalid email format
- Amount too low (must be > $100 for real Escrow.com)
- Missing required fields

**Solution:**
Check console logs for detailed error message.

### Issue: "Escrow link not appearing in emails"

**Check:**
1. Campaign has `asking_price` set
2. Buyer message contains payment keywords
3. AI agent is enabled for campaign

### Issue: "Manual link instead of API link"

**Causes:**
- `.env` not updated
- Server not restarted after `.env` change
- API credentials invalid

**Solution:**
1. Update `.env` file
2. Restart server: `node server.js`
3. Test: `node test-escrow-api.js`

---

## 📈 Monitoring Transactions

### View in Escrow.com Sandbox

Login at: [https://www.escrow-sandbox.com](https://www.escrow-sandbox.com)
- Email: `3v0ltn@gmail.com`
- Password: (your sandbox password)

### View in Database

```sql
-- All escrow transactions
SELECT * FROM escrow_transactions 
ORDER BY created_at DESC;

-- Transactions for specific campaign
SELECT * FROM escrow_transactions 
WHERE campaign_id = 'campaign_123';

-- Pending transactions
SELECT * FROM escrow_transactions 
WHERE status = 'pending';
```

### Check Status

```bash
# Get all transactions for campaign
curl http://localhost:5000/backend/escrow/transactions/campaign_123

# Check user escrow status
curl http://localhost:5000/backend/escrow/status/12
```

---

## 🚀 Going to Production

When you're ready to use real money:

### Step 1: Get Production Credentials

1. Go to [https://www.escrow.com](https://www.escrow.com)
2. Create production account (or upgrade sandbox)
3. Get production API key from Settings → API Access

### Step 2: Update .env File

```env
# Escrow.com PRODUCTION Configuration
ESCROW_API_URL=https://api.escrow.com/2017-09-01
ESCROW_EMAIL=your-production-email@example.com
ESCROW_API_KEY=your_production_api_key
```

### Step 3: Test Thoroughly

Run tests again with production credentials:
```bash
node test-escrow-api.js
```

### Step 4: Go Live!

Restart server and start accepting real payments! 🎉

---

## 📚 Additional Resources

- **Escrow.com API Docs:** [https://www.escrow.com/apidocs](https://www.escrow.com/apidocs)
- **Sandbox Portal:** [https://www.escrow-sandbox.com](https://www.escrow-sandbox.com)
- **Support:** api@escrow.com

---

## 🎉 You're All Set!

Your escrow integration is ready to use! Here's what you can do now:

✅ Test API connection: `node test-escrow-api.js`
✅ Send test emails to trigger escrow links
✅ View transactions at escrow-sandbox.com
✅ Monitor in database
✅ When ready, switch to production

**Need help?** Check the troubleshooting section or contact Escrow.com support.

Happy selling! 🚀

