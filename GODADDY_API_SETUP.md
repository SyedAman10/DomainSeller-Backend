# GoDaddy API Setup Guide

## 🎯 **Quick Fix for 403 ACCESS_DENIED Error**

If you're getting a 403 "ACCESS_DENIED" error, it's usually one of these issues:

### **1. Using OTE/Test Keys Instead of Production Keys**

GoDaddy has TWO separate environments:
- **OTE (Test Environment)**: `https://api.ote-godaddy.com`
- **Production**: `https://api.godaddy.com`

**❌ Common Mistake:**
You created API keys in the OTE environment but our system uses production.

**✅ Solution:**
Create production API keys at: https://developer.godaddy.com/keys

---

### **2. API Key Doesn't Have Domain Permissions**

Your API key must have **Domain** permissions enabled.

**✅ How to Check:**
1. Go to https://developer.godaddy.com/keys
2. Find your API key
3. Click "Edit" or view details
4. Ensure "Domain" permission is checked

---

### **3. No Active Domains in Account**

The API test fetches your domain list. If you have no domains, it might fail.

**✅ Solution:**
Add at least one domain to your GoDaddy account first.

---

### **4. API Key Format Issues**

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

You can test your GoDaddy API keys using curl:

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
