# 🚀 Quick Start: Database Migration

## ✨ Super Simple - One Command!

### **Option 1: Using npm (Recommended)**

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status
```

### **Option 2: Direct execution**

```bash
# Run migrations
node migrate.js

# Check status
node migrate.js status
```

---

## 📋 What the Script Does

1. ✅ Connects to your Neon database
2. ✅ Creates `schema_migrations` tracking table
3. ✅ Scans `database/` folder for `.sql` files
4. ✅ Runs only NEW migrations (skips already applied ones)
5. ✅ Tracks which migrations have been applied
6. ✅ Rolls back automatically if any migration fails
7. ✅ Shows beautiful colored output

---

## 🎯 Usage Examples

### **First Time Setup**

```bash
cd /root/DomainSeller-Backend
npm run migrate
```

**Output:**
```
============================================================
DATABASE MIGRATION
============================================================

→ Testing database connection...
✓ Connected to database

→ Setting up migrations tracking...
✓ Migrations tracking table ready

→ Found 15 migration file(s)
→ Already applied: 0
→ Pending migrations: 15
────────────────────────────────────────────────────────────

→ Running: add_analytics_support.sql
✓ Success: add_analytics_support.sql

→ Running: add_referral_system.sql
✓ Success: add_referral_system.sql

... (more migrations) ...

────────────────────────────────────────────────────────────
MIGRATION SUMMARY
────────────────────────────────────────────────────────────
✓ Successful: 15
============================================================
```

### **Check Status**

```bash
npm run migrate:status
```

**Output:**
```
============================================================
MIGRATION STATUS
============================================================

✓ Database connected

📊 Status:
   Total migrations: 15
   Applied: 15
   Pending: 0

✓ Applied migrations:
   - add_analytics_support.sql
   - add_bounced_column.sql
   - add_domain_transfers.sql
   - add_escrow_support.sql
   - add_referral_system.sql
   ... (more)

============================================================
```

### **After Adding New Migration**

```bash
# Just run migrate again - it only runs NEW files!
npm run migrate
```

**Output:**
```
→ Found 16 migration file(s)
→ Already applied: 15
→ Pending migrations: 1

→ Running: add_new_feature.sql
✓ Success: add_new_feature.sql
```

---

## 🗂️ Migration Files

The script automatically picks up all `.sql` files from the `database/` folder:

```
database/
├── add_analytics_support.sql
├── add_bounced_column.sql
├── add_domain_transfers.sql
├── add_enhanced_analytics.sql
├── add_escrow_approvals.sql
├── add_escrow_support.sql
├── add_landing_page_support.sql
├── add_missing_analytics_columns.sql
├── add_password_reset.sql
├── add_referral_system.sql        ← NEW!
├── add_stripe_support.sql
├── add_timestamp_column.sql
├── create_email_conversations_table.sql
├── fix_analytics_table.sql
├── fix_cascade_delete_v2.sql
└── fix_cascade_delete.sql
```

**Files are run in alphabetical order!**

---

## 🔒 Safety Features

### **1. Transaction Safety**
Each migration runs in a transaction:
- ✅ If successful → COMMIT
- ❌ If error → ROLLBACK (no changes applied)

### **2. Duplicate Prevention**
The script tracks applied migrations:
- Already applied migrations are skipped
- No migration runs twice

### **3. Stops on Error**
If any migration fails:
- Execution stops immediately
- Error message is displayed
- Exit code 1 (for CI/CD)

---

## 📝 How It Works

### **1. Tracking Table**
First run creates this table:
```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);
```

### **2. Migration Check**
For each `.sql` file:
1. Check if filename exists in `schema_migrations`
2. If not → run migration
3. If yes → skip it

### **3. Recording**
After successful migration:
```sql
INSERT INTO schema_migrations (filename) 
VALUES ('add_referral_system.sql');
```

---

## 🆘 Troubleshooting

### **Error: Cannot connect to database**

**Check your `.env` file:**
```bash
cat .env | grep NEON_DATABASE_URL
```

**Test connection manually:**
```bash
psql $NEON_DATABASE_URL -c "SELECT NOW();"
```

### **Error: Migration failed**

**See the error message:**
```bash
npm run migrate 2>&1 | tee migration.log
```

**Check SQL syntax:**
```bash
# Test SQL file manually
psql $NEON_DATABASE_URL -f database/add_referral_system.sql
```

### **Need to rollback?**

The script doesn't support automatic rollback (for safety).

**Manual rollback:**
```sql
-- 1. Delete tracking record
DELETE FROM schema_migrations WHERE filename = 'bad_migration.sql';

-- 2. Manually undo the changes
-- (write reverse SQL or restore from backup)
```

---

## 🔄 Deployment Workflow

### **Local Development**
```bash
# 1. Create new migration file
touch database/add_new_feature.sql

# 2. Write SQL
nano database/add_new_feature.sql

# 3. Test locally
npm run migrate

# 4. Check status
npm run migrate:status

# 5. Commit
git add database/add_new_feature.sql
git commit -m "Add new feature migration"
git push
```

### **Production Deployment**
```bash
# SSH into server
ssh root@your-server

# Pull latest code
cd /root/DomainSeller-Backend
git pull

# Run migrations
npm run migrate

# Restart app
pm2 restart node-backend

# Verify
npm run migrate:status
```

---

## 📊 CI/CD Integration

### **GitHub Actions**
```yaml
- name: Run Migrations
  env:
    NEON_DATABASE_URL: ${{ secrets.NEON_DATABASE_URL }}
  run: npm run migrate
```

### **Exit Codes**
- `0` = Success (all migrations applied)
- `1` = Failure (migration error)

---

## ✅ Complete Deployment Checklist

```bash
# 1. Pull code
cd /root/DomainSeller-Backend
git pull

# 2. Check migration status
npm run migrate:status

# 3. Run migrations
npm run migrate

# 4. Verify success
npm run migrate:status

# 5. Restart backend
pm2 restart node-backend

# 6. Check logs
pm2 logs node-backend --lines 50

# 7. Test endpoints
curl https://api.3vltn.com/backend/health
curl https://api.3vltn.com/backend/referrals/validate/SUPER2025
```

---

## 🎯 Quick Reference

| Command | Description |
|---------|-------------|
| `npm run migrate` | Run all pending migrations |
| `npm run migrate:status` | Show migration status |
| `node migrate.js` | Direct execution |
| `node migrate.js status` | Status via direct execution |

---

## 🚀 Ready to Deploy?

**Just run this on your server:**

```bash
cd /root/DomainSeller-Backend
git pull
npm run migrate
pm2 restart node-backend
```

**That's it! The referral system is now active! 🎉**

---

## 💡 Pro Tips

1. **Always check status first:**
   ```bash
   npm run migrate:status
   ```

2. **Test locally before production:**
   ```bash
   # Local
   npm run migrate
   
   # Then production
   ssh root@server "cd /root/DomainSeller-Backend && npm run migrate"
   ```

3. **Keep migrations small:**
   - One feature per migration file
   - Easier to debug and rollback

4. **Name files clearly:**
   ```
   ✅ add_referral_system.sql
   ✅ fix_user_permissions.sql
   ❌ update.sql
   ❌ changes.sql
   ```

5. **Backup before major migrations:**
   ```bash
   # Neon Console → Backups → Create Backup
   ```

---

**Happy Migrating! 🚀**

