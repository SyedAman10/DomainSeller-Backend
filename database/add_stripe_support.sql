-- =====================================================
-- STRIPE INTEGRATION - Database Schema
-- =====================================================
-- This script adds Stripe Connect support for domain payments
-- Run this migration to enable Stripe payment processing
-- =====================================================

-- 1. Add Stripe fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false;

-- Create index for faster Stripe account lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_account ON users(stripe_account_id);

-- 2. Create stripe_payments table
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

-- Create indexes for stripe_payments
CREATE INDEX IF NOT EXISTS idx_stripe_payments_campaign ON stripe_payments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_user ON stripe_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_buyer ON stripe_payments(buyer_email);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_status ON stripe_payments(status);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_payment_intent ON stripe_payments(payment_intent_id);


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

-- Create indexes for stripe_approvals
CREATE INDEX IF NOT EXISTS idx_stripe_approvals_campaign ON stripe_approvals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_stripe_approvals_user ON stripe_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_approvals_status ON stripe_approvals(status);
CREATE INDEX IF NOT EXISTS idx_stripe_approvals_buyer ON stripe_approvals(buyer_email);

-- 4. Add Stripe-related fields to campaigns table (optional)
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS stripe_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_approve_stripe BOOLEAN DEFAULT false;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE stripe_payments IS 'Stores Stripe payment links and transaction details';
COMMENT ON TABLE stripe_approvals IS 'Approval workflow for Stripe payment requests before sending payment links to buyers';

COMMENT ON COLUMN users.stripe_account_id IS 'Stripe Connect account ID for receiving payments';
COMMENT ON COLUMN users.stripe_enabled IS 'Whether Stripe is enabled and fully onboarded for this user';
COMMENT ON COLUMN stripe_payments.payment_link_id IS 'Stripe payment link ID';
COMMENT ON COLUMN stripe_payments.payment_intent_id IS 'Stripe payment intent ID (populated after payment)';
COMMENT ON COLUMN stripe_payments.status IS 'Payment status: pending, succeeded, failed, completed';
COMMENT ON COLUMN stripe_approvals.status IS 'Approval status: pending, approved, declined';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Stripe integration tables created successfully!' AS status;

