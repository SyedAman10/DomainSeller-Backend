# 🚀 QUICK FIX: Run This on Your Server

## The Error:
```
error: column "stripe_account_id" of relation "users" does not exist
```

## The Fix (30 seconds):

```bash
# SSH into your server
ssh user@3vltn.com

# Navigate to backend
cd /root/DomainSeller-Backend

# Pull latest code
git pull

# Run migration
node run-stripe-migration.js

# Done! ✅
```

## Expected Output:
```
✅ Migration completed successfully!

Changes made:
  ✓ Added stripe_account_id column to users table
  ✓ Added stripe_enabled column to users table
  ✓ Created stripe_payments table
  ✓ Created stripe_approvals table

🎉 Your database is now ready for Stripe Connect!
```

## Test Again:
After running the migration, your Stripe Connect endpoint will work!

---

**That's it!** The migration script is already pushed to GitHub. Just pull and run it. 🎯
