# ============================================================
# REGISTRAR INTEGRATION - COMPLETE IMPLEMENTATION GUIDE
# ============================================================

## 🎯 Overview

This system enables **bulk domain verification** by connecting users' registrar accounts (GoDaddy, Cloudflare, Namecheap) to automatically verify domain ownership without per-domain DNS verification.

**Key Benefits:**
- ✅ Verify 100+ domains instantly
- ✅ Auto-sync new/removed domains
- ✅ Prevent fraud (domains removed = verification revoked)
- ✅ Zero manual DNS configuration per domain

---

## 🗄️ Database Setup

### Step 1: Run the migration

**Easy way (recommended):**

```bash
npm run migrate:registrar
```

**OR manual way:**

```bash
cd DomainSeller-Backend
psql -U your_user -d your_database -f database/add_registrar_integration.sql
```

This creates:
- `registrar_accounts` - Stores encrypted API credentials
- `registrar_sync_history` - Audit trail of sync operations
- `domain_verification_log` - Security log for verification events
- `registrar_rate_limits` - API rate limiting
- `supported_registrars` - Reference data
- Enhanced `domains` table with verification columns

---

## 🔐 Environment Variables

Add to `.env`:

```bash
# Encryption key for registrar credentials (32+ characters)
ENCRYPTION_KEY=your-super-secret-encryption-key-min-32-chars

# Registrar API URLs (optional, defaults provided)
GODADDY_API_URL=https://api.godaddy.com
NAMECHEAP_API_URL=https://api.namecheap.com/xml.response

# Sync scheduler (optional, defaults provided)
REGISTRAR_SYNC_HOURLY=0 * * * *  # Every hour at :00
REGISTRAR_SYNC_DAILY=0 2 * * *   # Daily at 2 AM
TIMEZONE=UTC
```

### 🚨 Critical: Generate ENCRYPTION_KEY

```bash
# Generate a secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to your `.env` as `ENCRYPTION_KEY`.

---

## 📡 API Endpoints

All endpoints require authentication (`Authorization: Bearer <token>`).

### 1. Get Supported Registrars

```http
GET /backend/registrar/supported
```

**Response:**
```json
{
  "success": true,
  "registrars": [
    {
      "code": "godaddy",
      "name": "GoDaddy",
      "priority": 1,
      "status": "active"
    },
    {
      "code": "cloudflare",
      "name": "Cloudflare",
      "priority": 1,
      "status": "active"
    },
    {
      "code": "namecheap",
      "name": "Namecheap",
      "priority": 2,
      "status": "active"
    }
  ]
}
```

### 2. Connect Registrar Account

```http
POST /backend/registrar/connect
Content-Type: application/json

{
  "registrar": "godaddy",
  "apiKey": "YOUR_API_KEY",
  "apiSecret": "YOUR_API_SECRET"
}
```

**For Namecheap (additional fields):**
```json
{
  "registrar": "namecheap",
  "apiKey": "USERNAME",
  "apiSecret": "API_KEY",
  "username": "USERNAME",
  "clientIp": "YOUR_WHITELISTED_IP"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully connected GoDaddy account",
  "accountId": 1,
  "registrar": "godaddy",
  "domainsCount": 247,
  "syncStatus": "in_progress"
}
```

**What happens:**
1. Credentials encrypted with AES-256-GCM
2. Connection tested immediately
3. Initial domain sync starts (background)
4. All domains auto-verified with level 3 (highest)

### 3. List User's Registrar Accounts

```http
GET /backend/registrar/accounts
```

**Response:**
```json
{
  "success": true,
  "accounts": [
    {
      "id": 1,
      "registrar": "godaddy",
      "connection_status": "active",
      "last_sync_at": "2026-01-28T10:00:00Z",
      "last_sync_status": "success",
      "domains_count": 247,
      "verified_domains_count": 247,
      "created_at": "2026-01-27T09:00:00Z"
    }
  ]
}
```

### 4. Manual Domain Sync

```http
POST /backend/registrar/sync
Content-Type: application/json

{
  "accountId": 1
}
```

**Or sync all accounts:**
```http
POST /backend/registrar/sync
Content-Type: application/json
{}
```

**Response:**
```json
{
  "success": true,
  "message": "Domain sync completed",
  "stats": {
    "found": 248,
    "added": 1,
    "updated": 247,
    "removed": 0,
    "errors": []
  }
}
```

### 5. Test Connection

```http
POST /backend/registrar/test
Content-Type: application/json

{
  "accountId": 1
}
```

### 6. Disconnect Registrar

```http
DELETE /backend/registrar/disconnect
Content-Type: application/json

{
  "accountId": 1
}
```

**What happens:**
1. All domains from this registrar → verification_status = 'revoked'
2. Credentials deleted
3. Security audit log created

### 7. Get Sync Statistics

```http
GET /backend/registrar/stats?accountId=1
```

### 8. Get Sync History

```http
GET /backend/registrar/sync-history?accountId=1&limit=50
```

---

## 🔐 Domain Verification Endpoints

### 1. Get Verification Instructions

```http
GET /backend/domains/verification/instructions?domain=example.com
```

**Response:**
```json
{
  "success": true,
  "instructions": {
    "domain": "example.com",
    "methods": [
      {
        "method": "registrar_api",
        "level": 3,
        "confidence": "highest",
        "recommended": true,
        "instructions": "Connect your registrar account..."
      },
      {
        "method": "dns_txt",
        "level": 1,
        "confidence": "basic",
        "record": {
          "type": "TXT",
          "name": "@",
          "value": "domainseller-verify-abc123...",
          "ttl": 300
        }
      }
    ],
    "token": "domainseller-verify-abc123..."
  }
}
```

### 2. Verify Domain

```http
POST /backend/domains/verification/verify
Content-Type: application/json

{
  "domain": "example.com",
  "token": "domainseller-verify-abc123..."
}
```

### 3. Check Verification Status

```http
GET /backend/domains/verification/status?domain=example.com
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "domain": {
    "name": "example.com",
    "verificationMethod": "registrar_api",
    "verificationLevel": 3,
    "verificationStatus": "verified",
    "verifiedAt": "2026-01-27T10:00:00Z",
    "autoSynced": true,
    "registrar": "godaddy",
    "registrarStatus": "active"
  }
}
```

---

## 🔄 Automatic Sync Schedule

The system automatically syncs domains:

- **Hourly**: Every hour at :00 (default: `0 * * * *`)
- **Daily**: Daily at 2 AM (default: `0 2 * * *`)

**What happens during sync:**
1. Fetch domains from registrar API
2. **New domains** → Auto-add with `verification_status='verified'`
3. **Existing domains** → Update `last_seen_at` timestamp
4. **Removed domains** → Revoke verification (`verification_status='revoked'`)

**This prevents:**
- Selling domains user no longer owns
- Fraud
- Stale ownership data

---

## 🎨 Frontend Integration

### Connect Registrar Flow

```javascript
// Step 1: Get supported registrars
const registrars = await fetch('/backend/registrar/supported');

// Step 2: Show connection form to user
// User enters API key/secret

// Step 3: Connect registrar
const response = await fetch('/backend/registrar/connect', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    registrar: 'godaddy',
    apiKey: 'user_api_key',
    apiSecret: 'user_api_secret'
  })
});

// Step 4: Show success message
// "✅ 247 domains verified! Syncing in background..."
```

### Display Verification Status

```javascript
// Check domain verification
const status = await fetch(
  `/backend/domains/verification/status?domain=example.com`,
  {
    headers: { 'Authorization': `Bearer ${userToken}` }
  }
);

// Show verification badge based on level:
// Level 3 (Registrar API): Gold badge "Verified via GoDaddy"
// Level 2 (Nameserver): Silver badge "Nameserver Verified"
// Level 1 (DNS TXT): Bronze badge "DNS Verified"
```

### User Dashboard

Show registrar accounts with sync status:

```
Connected Registrars:
┌────────────────────────────────────────┐
│ 🟢 GoDaddy                             │
│ 247 domains verified                   │
│ Last sync: 5 minutes ago               │
│ [Sync Now] [Disconnect]                │
└────────────────────────────────────────┘
```

---

## 🔧 How to Get Registrar API Keys

### GoDaddy

1. Go to https://developer.godaddy.com/keys
2. Create **Production** API key
3. Copy both Key and Secret
4. **Important**: API key has format `KEY:SECRET` for requests

### Cloudflare

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create token with:
   - Permission: `Zone:Read`
   - All zones
3. Copy the token (this is the `apiKey`, no `apiSecret` needed)

### Namecheap

1. Go to https://ap.www.namecheap.com/settings/tools/apiaccess/
2. Enable API access
3. Whitelist your server IP
4. Use Namecheap username as `username`
5. Use generated API key as `apiSecret`

---

## 🧪 Testing

### Test Connection

```bash
curl -X POST http://localhost:3000/backend/registrar/connect \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "registrar": "godaddy",
    "apiKey": "YOUR_KEY",
    "apiSecret": "YOUR_SECRET"
  }'
```

### Test Sync

```bash
curl -X POST http://localhost:3000/backend/registrar/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountId": 1}'
```

### Check Logs

The system logs all sync operations:

```
🔄 Starting domain sync for account 1
📋 Account: godaddy (User ID: 10)
🌐 Fetching domains from GoDaddy...
✅ Found 247 domains on GoDaddy
📊 Current database domains: 245
➕ Adding 2 new domain(s)...
   ✅ Added: newdomain1.com
   ✅ Added: newdomain2.com
✅ SYNC COMPLETED SUCCESSFULLY
```

---

## 🛡️ Security Features

1. **AES-256-GCM Encryption**: API credentials encrypted at rest
2. **Audit Logging**: All verification changes logged with timestamps
3. **Automatic Revocation**: Domains removed from registrar = verification revoked
4. **Rate Limiting**: Respect registrar API rate limits
5. **Connection Monitoring**: Failed connections flagged immediately

---

## 📊 Verification Confidence Levels

| Level | Method | Confidence | Use Case |
|-------|--------|------------|----------|
| 3 | Registrar API | Highest | Bulk portfolio, instant transfer |
| 2 | Nameserver | Medium | Advanced users |
| 1 | DNS TXT | Basic | Single domain verification |
| 0 | Manual | Manual | Admin override only |

**Marketplace Actions by Level:**
- **Listing**: Level 1+
- **Transfer Initiation**: Level 2+
- **Instant Payout**: Level 3 only

---

## 🚀 Production Deployment

### 1. Set Environment Variables

```bash
# Generate encryption key
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Add to production .env
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
```

### 2. Run Migration

```bash
psql $DATABASE_URL -f database/add_registrar_integration.sql
```

### 3. Restart Server

```bash
pm2 restart domainseller-backend
```

### 4. Verify Scheduler Started

Check logs for:
```
════════════════════════════════════════════════════════════
🕐 INITIALIZING REGISTRAR SYNC SCHEDULER
════════════════════════════════════════════════════════════
✅ Started: hourly-sync
✅ Started: daily-sync
✅ REGISTRAR SYNC SCHEDULER ACTIVE
```

---

## 📈 Monitoring

### Check Sync Health

```sql
-- Recent sync operations
SELECT 
  ra.registrar,
  rsh.sync_status,
  rsh.domains_found,
  rsh.domains_added,
  rsh.started_at
FROM registrar_sync_history rsh
JOIN registrar_accounts ra ON ra.id = rsh.registrar_account_id
ORDER BY rsh.started_at DESC
LIMIT 20;
```

### Find Stale Syncs

```sql
-- Accounts not synced in 24 hours
SELECT 
  id,
  registrar,
  user_id,
  last_sync_at,
  NOW() - last_sync_at AS time_since_sync
FROM registrar_accounts
WHERE connection_status = 'active'
  AND (last_sync_at < NOW() - INTERVAL '24 hours' OR last_sync_at IS NULL);
```

---

## 🎯 Rollout Strategy

### Phase 1: Launch with GoDaddy Only
- Market as: "Bulk domain verification for GoDaddy users"
- Get feedback, iterate

### Phase 2: Add Cloudflare
- Target DNS power users
- Highlight speed and reliability

### Phase 3: Add Namecheap
- Cover majority of domain investors

### Phase 4: Add Dynadot, Porkbun
- Long-tail registrars

---

## ✅ Success Metrics

Track these KPIs:

1. **Connection Rate**: % of users connecting registrars
2. **Domains per User**: Average domains auto-verified
3. **Sync Success Rate**: % of successful syncs
4. **Fraud Prevention**: Domains with revoked verification
5. **User Satisfaction**: Reduction in support tickets

---

## 🐛 Troubleshooting

### "Encryption key not set"
```bash
# Generate and add to .env
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env
```

### "Connection failed"
- Check API credentials
- Verify registrar API status
- Check whitelisted IPs (Namecheap)

### "Sync not running"
- Check cron scheduler started
- Verify `syncScheduler.start()` called in `server.js`
- Check logs for errors

### "Domains not syncing"
- Check registrar account `connection_status`
- Verify API rate limits not exceeded
- Check `registrar_sync_history` for errors

---

## 📚 Files Created

| File | Purpose |
|------|---------|
| `database/add_registrar_integration.sql` | Database schema |
| `services/registrarAdapters.js` | GoDaddy, Cloudflare, Namecheap adapters |
| `services/encryptionService.js` | AES-256 encryption for credentials |
| `services/domainSyncService.js` | Domain sync logic |
| `services/syncScheduler.js` | Cron job scheduler |
| `services/domainVerificationService.js` | Multi-method verification |
| `routes/registrar.js` | API endpoints |
| `REGISTRAR_INTEGRATION.md` | This documentation |

---

## 🎉 Done!

Your system now supports:
- ✅ Bulk domain verification via registrar APIs
- ✅ Automatic sync (hourly + daily)
- ✅ Multi-registrar support (GoDaddy, Cloudflare, Namecheap)
- ✅ Fraud prevention (auto-revoke removed domains)
- ✅ Enterprise-grade encryption
- ✅ Comprehensive audit logging

**This is the same system used by Dan.com, Sedo, and Afternic for power users!** 🚀
