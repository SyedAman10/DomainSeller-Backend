# GoDaddy API Setup Guide

## 🎯 **Quick Fix for 403 ACCESS_DENIED Error**

If you're getting a 403 "ACCESS_DENIED" error, it's usually one of these issues:

### **1. GoDaddy Account Doesn't Meet Minimum Requirements** ⚠️ **MOST COMMON**

**GoDaddy API has strict account requirements:**

> **To use the Domains API in Production, you need:**
> - **10+ domains** in your GoDaddy account, OR
> - **Active "Discount Domain Club – Domain Pro Plan"**

**✅ Solutions:**
1. **Use OTE/Test Environment** (No restrictions):
   - Set `GODADDY_API_URL=https://api.ote-godaddy.com` in your `.env`
   - Use TEST API keys (first keys you create are test keys)
   - Perfect for development and testing

2. **Upgrade Your Production Account**:
   - Add 10+ domains to your account
   - OR subscribe to "Discount Domain Club – Domain Pro Plan"
   - Then use Production API keys

3. **Use a Different Registrar**:
   - Cloudflare (no minimum requirements)
   - Namecheap (more flexible)

---

### **2. Using OTE/Test Keys Instead of Production Keys**

GoDaddy has TWO separate environments:
- **OTE (Test Environment)**: `https://api.ote-godaddy.com`
- **Production**: `https://api.godaddy.com`

### **2. Using OTE/Test Keys with Production URL (or vice versa)**

GoDaddy has TWO separate environments:
- **OTE (Test Environment)**: `https://api.ote-godaddy.com`
- **Production**: `https://api.godaddy.com`

**❌ Common Mistake:**
You created API keys in the OTE environment but our system uses production.

**✅ Solution:**
Match your API keys to the environment:
- **Test keys** → Set `GODADDY_API_URL=https://api.ote-godaddy.com`
- **Production keys** → Leave `GODADDY_API_URL` blank (or set to `https://api.godaddy.com`)

---

### **3. API Key Doesn't Have Domain Permissions**

### **3. API Key Doesn't Have Domain Permissions**

Your API key must have **Domain** permissions enabled.

**✅ How to Check:**
1. Go to https://developer.godaddy.com/keys
2. Find your API key
3. Click "Edit" or view details
4. Ensure "Domain" permission is checked

---

### **4. No Active Domains in Account**

The API test fetches your domain list. If you have no domains AND don't meet the minimum requirements, it will fail.

**✅ Solution:**
- For OTE/Test: No domains needed
- For Production: Need 10+ domains OR Domain Pro Plan

---

### **5. API Key Format Issues**

**Correct Format:**
- **API Key**: Usually ~36 characters, looks like `h1eM8ymN3TNf_YWMh3x7gW4YQpZJt4z9Cyi`
- **API Secret**: Usually ~22 characters, looks like `7hn47NycoNrqUbxod24qpb`

**❌ Common Mistakes:**
- Copying extra spaces
- Using the wrong key (customer number instead of API key)
- Key/secret swapped

---

## 📋 **Step-by-Step: Creating Production API Keys**

### **Step 1: Log into GoDaddy Developer Portal**
Go to: https://developer.godaddy.com/keys

### **Step 2: Create New API Key**
1. Click **"Create New API Key"**
2. **Environment**: Select **PRODUCTION** (NOT OTE)
3. **Key Name**: Enter something like "DomainSeller Backend"

### **Step 3: Select Permissions**
✅ Check these permissions:
- **Domain** (Required)
- **Domain:read** (Required)
- **Domain:update** (Optional, but recommended)

### **Step 4: Save Your Credentials**
⚠️ **IMPORTANT**: Save these immediately - you can't see the secret again!
- Copy **API Key**
- Copy **API Secret**

### **Step 5: Test in DomainSeller**
1. Go to your DomainSeller dashboard
2. Navigate to Settings → Registrar Accounts
3. Click "Connect GoDaddy"
4. Paste your **Production** API Key and Secret
5. Click "Connect"

---

## 🔍 **Troubleshooting Checklist**

If you're still getting errors, verify:

- [ ] Using **PRODUCTION** keys (not OTE/test)
- [ ] API key has **Domain** permissions
- [ ] No extra spaces in key/secret
- [ ] Account has at least one domain
- [ ] Key was created recently (not expired)
- [ ] Copied the entire key/secret (no truncation)

---

## 🔧 **Testing Your API Keys Manually**

### **Option 1: Use Our Test Script (Recommended)**

We've created a handy test script for you!

**Windows (PowerShell):**
```bash
npm run test:godaddy
```

**Linux/Mac (Bash):**
```bash
npm run test:godaddy:bash
```

The script will:
- ✅ Prompt you for your API credentials
- ✅ Test the connection to GoDaddy
- ✅ Show you all your domains
- ✅ Give helpful error messages if something is wrong

---

### **Option 2: Test with Curl**

You can also test your GoDaddy API keys using curl:

```bash
curl -X GET "https://api.godaddy.com/v1/domains" \
  -H "Authorization: sso-key YOUR_API_KEY:YOUR_API_SECRET" \
  -H "Accept: application/json"
```

**Expected Response:**
```json
[
  {
    "domain": "example.com",
    "status": "ACTIVE",
    ...
  }
]
```

**If you get 403:**
Your keys are invalid or don't have permissions.

**If you get 401:**
Your key/secret is incorrect.

**If you get 200 with empty array `[]`:**
Your keys work, but you have no domains in the account.

---

## 🌐 **Environment Variables (Optional)**

If you want to use the OTE/test environment for development:

```bash
# In your .env file
GODADDY_API_URL=https://api.ote-godaddy.com
```

Leave blank or set to `https://api.godaddy.com` for production (default).

---

## 📚 **Additional Resources**

- **GoDaddy Developer Portal**: https://developer.godaddy.com
- **API Documentation**: https://developer.godaddy.com/doc/endpoint/domains
- **Create API Keys**: https://developer.godaddy.com/keys
- **GoDaddy Support**: https://www.godaddy.com/help

---

## 🆘 **Still Having Issues?**

If you've tried everything above and still can't connect:

1. **Double-check you're using Production keys**
2. **Verify your GoDaddy account is in good standing**
3. **Try creating a new API key from scratch**
4. **Contact GoDaddy support to verify API access is enabled**

---

**Last Updated**: January 2026
