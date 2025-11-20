# ⚡ Escrow Integration - Quick Reference

## 🚀 3-Step Setup

### 1️⃣ Update .env File
```env
ESCROW_API_URL=https://api.escrow-sandbox.com/2017-09-01
ESCROW_EMAIL=3v0ltn@gmail.com
ESCROW_API_KEY=4767_oaGfrPsQjh3PclmYUvK7bEhIpIlrdTaPdLylHz9DwrLZFtKi2h5I3pYzsUslqfTe
```

### 2️⃣ Test Connection
```bash
node test-escrow-api.js
```

### 3️⃣ Restart Server
```bash
node server.js
```

---

## 🧪 Testing Commands

```bash
# Test API connection
node test-escrow-api.js

# View sandbox portal
# Login at: https://www.escrow-sandbox.com
# Email: 3v0ltn@gmail.com

# Check database transactions
# SELECT * FROM escrow_transactions ORDER BY created_at DESC;
```

---

## 📝 Common API Calls

### Create Transaction
```bash
curl -X POST http://localhost:5000/backend/escrow/create \
  -H "Content-Type: application/json" \
  -d '{
    "domainName": "example.com",
    "buyerEmail": "buyer@test.com",
    "buyerName": "John Buyer",
    "sellerEmail": "3v0ltn@gmail.com",
    "sellerName": "Seller",
    "amount": 5000,
    "currency": "USD",
    "campaignId": "campaign_id",
    "userId": 12,
    "feePayer": "buyer"
  }'
```

### Get Campaign Transactions
```bash
curl http://localhost:5000/backend/escrow/transactions/campaign_123
```

### Configure Campaign
```bash
curl -X PUT http://localhost:5000/backend/escrow/campaign/campaign_123/settings \
  -H "Content-Type: application/json" \
  -d '{
    "askingPrice": 5000,
    "escrowFeePayer": "buyer",
    "escrowEnabled": true
  }'
```

---

## 🎯 How It Works

1. **Buyer asks:** "How can I pay?"
2. **AI detects** payment request
3. **System creates** Escrow.com transaction
4. **Email sent** with payment link
5. **Buyer pays** through Escrow.com
6. **Domain transfers** safely

---

## 🔗 Important Links

- **Sandbox Portal:** https://www.escrow-sandbox.com
- **API Docs:** https://www.escrow.com/apidocs
- **Your Email:** 3v0ltn@gmail.com
- **Full Guide:** See `ESCROW_SANDBOX_SETUP.md`

---

## ⚠️ Sandbox vs Production

| | Sandbox | Production |
|---|---------|------------|
| URL | `escrow-sandbox.com` | `escrow.com` |
| API | `api.escrow-sandbox.com` | `api.escrow.com` |
| Money | Fake | Real |
| Use | Testing | Live sales |

---

## 🐛 Quick Troubleshooting

**No escrow link in emails?**
- Set campaign `asking_price`
- Restart server after `.env` update
- Check buyer message has payment keywords

**API errors?**
- Run: `node test-escrow-api.js`
- Check `.env` file credentials
- Verify sandbox URL is correct

**Transaction not showing?**
- Check database: `SELECT * FROM escrow_transactions;`
- Login to escrow-sandbox.com
- Check console logs

---

## 📞 Support

Need help?
- Full docs: `ESCROW_SANDBOX_SETUP.md`
- Escrow.com: api@escrow.com
- API Docs: https://www.escrow.com/apidocs

---

✅ **Ready to test!** Run: `node test-escrow-api.js`

