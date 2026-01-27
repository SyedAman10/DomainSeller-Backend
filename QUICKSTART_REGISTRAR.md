# Quick Start: Registrar Integration Setup

## 📝 Prerequisites

1. **Generate Encryption Key**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and add to your `.env`:

```bash
ENCRYPTION_KEY=<paste_generated_key_here>
```

2. **Run Database Migration**

```bash
# Easy way (recommended)
npm run migrate:registrar

# OR manual way
cd DomainSeller-Backend
psql -U your_user -d your_database -f database/add_registrar_integration.sql
```

3. **Restart Server**

```bash
npm start
# or
pm2 restart domainseller-backend
```

## ✅ Verify Setup

Check server logs for:

```
🕐 INITIALIZING REGISTRAR SYNC SCHEDULER
✅ Started: hourly-sync
✅ Started: daily-sync
✅ REGISTRAR SYNC SCHEDULER ACTIVE
```

## 🔌 Test API

```bash
# Get supported registrars
curl http://localhost:3000/backend/registrar/supported

# Should return:
# {"success":true,"registrars":[{"code":"godaddy",...}]}
```

## 📚 Full Documentation

See `REGISTRAR_INTEGRATION.md` for complete guide.

## 🎯 User Flow

1. User goes to: **Settings → Registrar Connections**
2. Clicks: **Connect GoDaddy / Cloudflare / Namecheap**
3. Enters API credentials
4. System:
   - ✅ Tests connection
   - ✅ Encrypts credentials
   - ✅ Auto-verifies all domains
   - ✅ Syncs hourly

**Result**: 247 domains verified instantly! 🎉

## 🔐 Get API Keys

- **GoDaddy**: https://developer.godaddy.com/keys
- **Cloudflare**: https://dash.cloudflare.com/profile/api-tokens
- **Namecheap**: https://ap.www.namecheap.com/settings/tools/apiaccess/
