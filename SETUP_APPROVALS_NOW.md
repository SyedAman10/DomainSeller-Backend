# 🚀 Setup Admin Approvals - Quick Start

## ⚡ 2 Simple Commands (That's It!)

### Step 1: Create Database Table
```bash
npm run setup:escrow-approvals
```

**Expected output:**
```
✅ Table created successfully!
✅ Status index created
✅ Campaign index created
✅ User index created
✅ Created date index created
✅ SETUP COMPLETE!
```

### Step 2: Restart Server
```bash
npm start
```

---

## ✅ That's It!

**No email configuration needed!** 🎉

The system automatically uses your account email (the one from the users table) for notifications.

Now when buyers request payment:
1. ✅ AI responds: "Link coming soon!"
2. ✅ You get email: "APPROVAL NEEDED"
3. ✅ You click APPROVE
4. ✅ Buyer gets payment link

---

## 🧪 Test It

Send email to your campaign:
```
Subject: Ready to buy
Body: Hi, I'm ready to purchase. Send me the payment link!
```

**You should receive email with:**
- Full conversation thread
- Approval request
- **Clickable APPROVE / DECLINE buttons** (work directly from email!)

---

## 📧 Admin Email Features

**Every notification includes:**
- ✅ Latest buyer message
- ✅ AI's response
- ✅ Complete conversation history
- ✅ Approval buttons (if escrow needed)

---

## 🔧 API Endpoints

### Get Pending Approvals
```bash
curl http://localhost:5000/backend/escrow/approvals/pending?userId=10
```

### Approve Request
```bash
curl -X POST http://localhost:5000/backend/escrow/approvals/1/approve \
  -H "Content-Type: application/json" \
  -d '{"approvedBy": 10}'
```

### Decline Request
```bash
curl -X POST http://localhost:5000/backend/escrow/approvals/1/decline \
  -H "Content-Type: application/json" \
  -d '{"declinedBy": 10, "notes": "Not interested"}'
```

---

## 📊 Database Queries

### View Pending Approvals
```sql
SELECT * FROM escrow_approvals 
WHERE status = 'pending' 
ORDER BY created_at DESC;
```

### View All Approvals
```sql
SELECT 
  ea.*,
  c.campaign_name,
  c.domain_name
FROM escrow_approvals ea
LEFT JOIN campaigns c ON ea.campaign_id = c.campaign_id
ORDER BY ea.created_at DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Table Creation Failed?

**Check database connection:**
```bash
psql $NEON_DATABASE_URL -c "SELECT 1;"
```

If fails, verify your `.env` has:
```
NEON_DATABASE_URL=postgresql://username:password@host/database
```

### Not Receiving Emails?

**Check notification email is set:**
```sql
SELECT campaign_id, campaign_name, notification_email 
FROM campaigns;
```

If `notification_email` is NULL, update it:
```sql
UPDATE campaigns 
SET notification_email = 'your-email@gmail.com'
WHERE campaign_id = 'your_campaign_id';
```

### Still Having Issues?

1. **Check Mailgun configuration** in `.env`
2. **Verify server is running**: `npm start`
3. **Check logs** for errors
4. **Test email service**: Send regular email first

---

## 📚 Full Documentation

- **Complete Guide:** `ADMIN_APPROVAL_FEATURE.md`
- **Escrow Setup:** `ESCROW_COMPLETE_SUMMARY.md`
- **API Reference:** `API_REFERENCE.md`

---

## ✅ Summary

**What You Get:**
- ✅ Email for EVERY buyer conversation
- ✅ Full thread in each notification
- ✅ Escrow approval before commitment
- ✅ Control over all sales
- ✅ APPROVE / DECLINE buttons

**Setup Time:** 2 minutes

**Commands:**
```bash
# 1. Create table
npm run setup:escrow-approvals

# 2. Set email
psql $NEON_DATABASE_URL -c "UPDATE campaigns SET notification_email = 'your@email.com';"

# 3. Restart
npm start
```

**Done!** 🎉

