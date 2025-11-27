# Stripe Database Migration Guide

## Problem
```
error: column "stripe_account_id" of relation "users" does not exist
```

The Stripe Connect integration requires additional columns in the `users` table that don't exist yet.

## Solution

Run the Stripe database migration to add the necessary columns.

---

## Option 1: Run Migration Script (EASIEST)

### On Your Server:

```bash
# SSH into your server
ssh user@3vltn.com

# Navigate to backend directory
cd /root/DomainSeller-Backend

# Pull latest changes (includes the migration script)
git pull

# Run the migration
node run-stripe-migration.js
```

You should see:
```
🔧 Starting Stripe database migration...
📄 SQL file loaded: /root/DomainSeller-Backend/database/add_stripe_support.sql
🔗 Connecting to database...

✅ Migration completed successfully!

Changes made:
  ✓ Added stripe_account_id column to users table
  ✓ Added stripe_enabled column to users table
  ✓ Added stripe_onboarding_completed column to users table
  ✓ Created stripe_payments table
  ✓ Created stripe_approvals table
  ✓ Created necessary indexes

🎉 Your database is now ready for Stripe Connect!
```

---

## Option 2: Run SQL Manually

If you prefer to run the SQL directly:

```bash
# SSH into your server
ssh user@3vltn.com

# Connect to PostgreSQL
psql -U your_db_user -d your_db_name

# Or if using a connection string:
psql "your_database_url"
```

Then run this SQL:

```sql
-- Add Stripe fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false;

-- Create index for faster Stripe account lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_account ON users(stripe_account_id);

-- Create stripe_payments table
CREATE TABLE IF NOT EXISTS stripe_payments (
  id SERIAL PRIMARY KEY,
  payment_link_id VARCHAR(255) UNIQUE NOT NULL,
  payment_intent_id VARCHAR(255),
  campaign_id VARCHAR(255) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  stripe_account_id VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  domain_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  payment_url TEXT NOT NULL,
  product_id VARCHAR(255),
  price_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create stripe_approvals table
CREATE TABLE IF NOT EXISTS stripe_approvals (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(255) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  seller_email VARCHAR(255) NOT NULL,
  seller_name VARCHAR(255) NOT NULL,
  domain_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  payment_link_id VARCHAR(255),
  approved_at TIMESTAMP,
  approved_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stripe_payments_campaign ON stripe_payments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_user ON stripe_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_buyer ON stripe_payments(buyer_email);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_status ON stripe_payments(status);
CREATE INDEX IF NOT EXISTS idx_stripe_approvals_campaign ON stripe_approvals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_stripe_approvals_user ON stripe_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_approvals_status ON stripe_approvals(status);

SELECT 'Stripe migration completed!' AS status;
```

---

## Verify Migration

After running the migration, verify the columns exist:

```sql
-- Check users table
\d users

-- You should see:
-- stripe_account_id     | character varying(255) |
-- stripe_enabled        | boolean                | default false
-- stripe_onboarding_completed | boolean          | default false
```

---

## Test the Endpoint Again

After the migration, test your Stripe Connect endpoint:

```bash
curl -X POST https://3vltn.com/backend/stripe/connect \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "10",
    "email": "amanullahnaqvi@gmail.com"
  }'
```

Expected response:
```json
{
  "success": true,
  "accountId": "acct_1SY7rO47Go4AwMec",
  "onboardingUrl": "https://connect.stripe.com/setup/...",
  "message": "Stripe Connect account created. Complete onboarding to activate."
}
```

---

## What the Migration Adds

### Users Table Columns:
- `stripe_account_id` - Stores the Stripe Connect account ID
- `stripe_enabled` - Boolean flag for whether Stripe is fully set up
- `stripe_onboarding_completed` - Tracks onboarding completion

### New Tables:
- `stripe_payments` - Stores payment links and transactions
- `stripe_approvals` - Approval workflow for payment requests

### Indexes:
- Optimized lookups for Stripe account IDs
- Fast queries on payment status
- Efficient campaign and user filtering

---

## Files

- `database/add_stripe_support.sql` - The migration SQL file
- `run-stripe-migration.js` - Node.js script to run the migration

---

## Next Steps

1. ✅ Run the migration (Option 1 or 2 above)
2. ✅ Test the `/stripe/connect` endpoint
3. ✅ Complete the Stripe onboarding flow
4. ✅ Start accepting payments!

---

## Troubleshooting

### "relation 'users' does not exist"
Make sure you're connected to the correct database.

### "permission denied"
Make sure your database user has ALTER TABLE permissions.

### Migration runs but columns still missing
Check if you're connected to the right database:
```sql
SELECT current_database();
```

---

Good luck! 🚀
