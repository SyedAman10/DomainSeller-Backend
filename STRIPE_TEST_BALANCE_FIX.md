# 💰 STRIPE TEST MODE: Adding Available Balance

## The Problem

You received this error:
```
You have insufficient available funds in your Stripe account.
```

**Why?**
- In **test mode**, when buyers pay, funds go to **pending balance** first
- Pending balance is scheduled for payout (yours shows Jan 20)
- You need **available balance** to make transfers to sellers
- Your current available balance: **$0.00**
- Your pending balance: **$11,938.36** (locked until payout date)

---

## ✅ **Solution: Add Test Funds**

Stripe provides a special test card that adds funds **directly** to your available balance:

### 🔢 **Special Test Card:**
```
Card Number:  4000000000000077
Expiry:       Any future date (e.g., 12/28)
CVC:          Any 3 digits (e.g., 123)
ZIP:          Any ZIP code (e.g., 12345)
```

---

## 📝 **Step-by-Step Instructions**

### **Method 1: Create Payment Manually (Easiest)**

1. **Go to Stripe Dashboard:**
   ```
   https://dashboard.stripe.com/test/payments
   ```

2. **Click "New" or "Create payment"**

3. **Enter Details:**
   - Amount: **$5,000.00** (or however much you need)
   - Currency: **USD**
   - Description: "Test funds for escrow transfers"

4. **Use Special Test Card:**
   - Card: `4000000000000077`
   - Expiry: `12/28`
   - CVC: `123`
   - ZIP: `12345`

5. **Click "Pay"**

6. **Check Balance:**
   - Go to: https://dashboard.stripe.com/test/balance/overview
   - You should now see **Available balance: $5,000.00**

---

### **Method 2: Create Payment via API (Automated)**

Run this script:
```bash
node add-test-balance.js
```

This will attempt to create a $5,000 charge using the special test card.

---

## 🔄 **After Adding Funds**

1. **Verify your available balance:**
   ```
   https://dashboard.stripe.com/test/balance/overview
   ```

2. **Try the admin verification again:**
   - Go back to your admin dashboard
   - Find transaction #9
   - Click "Verify Transfer"
   - It should work now! ✅

---

## 🎯 **How Much to Add?**

Your current escrow transaction is for:
- **Total Amount:** $2,500.00
- **Platform Fee (5%):** $125.00
- **Seller Payout:** $2,375.00

**Recommendation:** Add at least **$5,000** to your test account so you can process multiple test transactions.

---

## 🚀 **Production Mode**

**Important:** This is ONLY a test mode issue!

In **production/live mode:**
- Real customer payments create available balance immediately (after Stripe's standard hold period)
- You won't have this problem
- Stripe automatically handles everything

---

## 📊 **Current Status**

```
✅ Payment received: $2,500.00 from buyer
✅ Funds held in YOUR platform account
✅ Admin verified domain transfer
❌ Transfer to seller FAILED (insufficient available balance)

Next step: Add test funds using card 4000000000000077
```

---

## 🔍 **Why This Design?**

This is the **correct escrow flow:**
1. Buyer pays → Funds go to **platform account** (yours)
2. Admin verifies transfer
3. Platform transfers payout to **seller's connected account**
4. Platform keeps the fee

This ensures:
- ✅ Buyer protection (funds held until verified)
- ✅ Seller protection (guaranteed payment after transfer)
- ✅ Platform revenue (fee is automatically retained)

---

## 💡 **Alternative: Manual Transfer**

If you can't add test funds right now, you can manually complete the transfer in Stripe Dashboard:

1. Go to: https://dashboard.stripe.com/test/connect/transfers
2. Click "New transfer"
3. Select connected account: `acct_1SY7wyKNo0zkXAmY` (seller)
4. Amount: $2,375.00
5. Description: "Manual escrow payout for theprimecrafters.com"
6. Complete the transfer

Then update the transaction in your database manually or wait for the webhook to sync.

---

## ✅ **Summary**

**To fix immediately:**
1. Use card `4000000000000077` to add $5,000 to test account
2. Retry admin verification
3. Transfer will succeed ✅

**In production:**
- This will never happen
- Real payments create available balance automatically

