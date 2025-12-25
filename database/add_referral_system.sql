-- =====================================================
-- AFFILIATE/REFERRAL SYSTEM - Database Schema
-- =====================================================
-- This script creates a complete referral/affiliate system
-- Features:
-- - Unique referral codes for each user
-- - Super referral codes with special bonuses
-- - Commission tracking per plan
-- - Referral stats and analytics
-- =====================================================

-- 1. Add referral fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS referral_bonus_applied BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_commission_earned DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free', -- free, starter, professional, enterprise
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS free_trial_ends_at TIMESTAMP;

-- Create index for referral lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by_user_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);

-- 2. Create referral_codes table (for super codes and custom codes)
CREATE TABLE IF NOT EXISTS referral_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  code_type VARCHAR(50) NOT NULL, -- 'user', 'super', 'promotional'
  
  -- Owner (NULL for system codes)
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  
  -- Code settings
  is_active BOOLEAN DEFAULT true,
  uses_remaining INTEGER, -- NULL = unlimited
  max_uses INTEGER, -- NULL = unlimited
  
  -- Bonus configuration
  bonus_type VARCHAR(50), -- 'free_month', 'discount_percent', 'discount_fixed', 'free_trial_extension'
  bonus_value DECIMAL(10, 2), -- Amount or percentage
  bonus_plan VARCHAR(50), -- Which plan gets the bonus (NULL = any)
  bonus_duration_days INTEGER, -- How long the bonus lasts
  
  -- Commission settings
  commission_rate DECIMAL(5, 2) DEFAULT 10.00, -- Percentage
  commission_type VARCHAR(50) DEFAULT 'recurring', -- 'one_time', 'recurring', 'lifetime'
  commission_duration_months INTEGER, -- NULL = lifetime
  
  -- Tracking
  total_uses INTEGER DEFAULT 0,
  total_signups INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0, -- Users who became paying customers
  total_revenue_generated DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Metadata
  description TEXT,
  created_by_admin BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_type ON referral_codes(code_type);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active);

-- 3. Create referrals table (tracks each referral)
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  
  -- Referral relationship
  referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code_id INTEGER REFERENCES referral_codes(id) ON DELETE SET NULL,
  referral_code VARCHAR(20) NOT NULL,
  
  -- Referral status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'converted', 'churned'
  signup_date TIMESTAMP DEFAULT NOW(),
  conversion_date TIMESTAMP, -- When they became a paying customer
  
  -- Bonus tracking
  bonus_applied BOOLEAN DEFAULT false,
  bonus_type VARCHAR(50),
  bonus_value DECIMAL(10, 2),
  bonus_applied_at TIMESTAMP,
  
  -- Commission tracking
  commission_earned DECIMAL(10, 2) DEFAULT 0.00,
  commission_paid DECIMAL(10, 2) DEFAULT 0.00,
  commission_pending DECIMAL(10, 2) DEFAULT 0.00,
  last_commission_date TIMESTAMP,
  
  -- Metadata
  referred_user_email VARCHAR(255),
  referred_user_plan VARCHAR(50),
  referrer_ip VARCHAR(45),
  referrer_user_agent TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_signup_date ON referrals(signup_date);

-- 4. Create commissions table (detailed commission tracking)
CREATE TABLE IF NOT EXISTS referral_commissions (
  id SERIAL PRIMARY KEY,
  
  -- Reference
  referral_id INTEGER NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Commission details
  amount DECIMAL(10, 2) NOT NULL,
  commission_type VARCHAR(50) NOT NULL, -- 'signup', 'subscription', 'renewal'
  commission_rate DECIMAL(5, 2) NOT NULL,
  base_amount DECIMAL(10, 2) NOT NULL, -- Original transaction amount
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'cancelled'
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  payment_method VARCHAR(50), -- 'account_credit', 'paypal', 'bank_transfer'
  
  -- Metadata
  subscription_period_start TIMESTAMP,
  subscription_period_end TIMESTAMP,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_referral ON referral_commissions(referral_id);
CREATE INDEX IF NOT EXISTS idx_commissions_referrer ON referral_commissions(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON referral_commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created ON referral_commissions(created_at);

-- 5. Create referral_payouts table (track actual payouts)
CREATE TABLE IF NOT EXISTS referral_payouts (
  id SERIAL PRIMARY KEY,
  
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Payout details
  payment_method VARCHAR(50) NOT NULL, -- 'account_credit', 'paypal', 'bank_transfer', 'stripe'
  payment_email VARCHAR(255),
  payment_account VARCHAR(255),
  transaction_id VARCHAR(255),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Commissions included in this payout
  commission_ids INTEGER[], -- Array of commission IDs
  commission_count INTEGER DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  admin_notes TEXT,
  processed_by_admin_id INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_user ON referral_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON referral_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_requested ON referral_payouts(requested_at);

-- 6. Create super referral code (1 month free Professional plan)
INSERT INTO referral_codes (
  code,
  code_type,
  user_id,
  is_active,
  uses_remaining,
  max_uses,
  bonus_type,
  bonus_value,
  bonus_plan,
  bonus_duration_days,
  commission_rate,
  commission_type,
  description,
  created_by_admin
) VALUES (
  'SUPER2025',
  'super',
  NULL,
  true,
  NULL, -- Unlimited uses
  NULL,
  'free_month',
  1.00,
  'professional',
  30,
  15.00, -- 15% commission for super code
  'lifetime',
  'Super referral code - 1 month free Professional plan',
  true
) ON CONFLICT (code) DO NOTHING;

-- 7. Create default promotional codes
INSERT INTO referral_codes (code, code_type, is_active, bonus_type, bonus_value, bonus_plan, bonus_duration_days, description, created_by_admin)
VALUES 
  ('STARTER50', 'promotional', true, 'discount_percent', 50.00, 'starter', 90, '50% off Starter plan for 3 months', true),
  ('PRO30', 'promotional', true, 'discount_percent', 30.00, 'professional', 90, '30% off Professional plan for 3 months', true),
  ('WELCOME2025', 'promotional', true, 'free_trial_extension', 7.00, NULL, NULL, 'Extra 7 days free trial', true)
ON CONFLICT (code) DO NOTHING;

-- 8. Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id INTEGER)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_code VARCHAR(20);
  v_username VARCHAR(100);
  v_counter INTEGER := 0;
BEGIN
  -- Get username
  SELECT username INTO v_username FROM users WHERE id = p_user_id;
  
  -- Generate code from username + random suffix
  LOOP
    IF v_counter = 0 THEN
      v_code := UPPER(SUBSTRING(v_username FROM 1 FOR 6)) || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    ELSE
      v_code := UPPER(SUBSTRING(v_username FROM 1 FOR 5)) || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    END IF;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE referral_code = v_code) 
       AND NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code) THEN
      RETURN v_code;
    END IF;
    
    v_counter := v_counter + 1;
    
    -- Prevent infinite loop
    IF v_counter > 100 THEN
      RAISE EXCEPTION 'Could not generate unique referral code after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 9. Generate referral codes for existing users
DO $$
DECLARE
  user_record RECORD;
  new_code VARCHAR(20);
BEGIN
  FOR user_record IN SELECT id, username FROM users WHERE referral_code IS NULL
  LOOP
    new_code := generate_referral_code(user_record.id);
    UPDATE users SET referral_code = new_code WHERE id = user_record.id;
  END LOOP;
END $$;

-- 10. Create trigger to auto-generate referral code on user creation
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON users;
CREATE TRIGGER trigger_auto_generate_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- 11. Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_referral_codes_updated_at ON referral_codes;
CREATE TRIGGER update_referral_codes_updated_at 
  BEFORE UPDATE ON referral_codes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at 
  BEFORE UPDATE ON referrals 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_commissions_updated_at ON referral_commissions;
CREATE TRIGGER update_commissions_updated_at 
  BEFORE UPDATE ON referral_commissions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payouts_updated_at ON referral_payouts;
CREATE TRIGGER update_payouts_updated_at 
  BEFORE UPDATE ON referral_payouts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 12. Add helpful comments
COMMENT ON TABLE referral_codes IS 'Stores all referral codes including user codes, super codes, and promotional codes';
COMMENT ON TABLE referrals IS 'Tracks each referral relationship between users';
COMMENT ON TABLE referral_commissions IS 'Detailed commission tracking for each referral event';
COMMENT ON TABLE referral_payouts IS 'Tracks commission payouts to affiliates';
COMMENT ON COLUMN users.referral_code IS 'User unique referral code for sharing';
COMMENT ON COLUMN users.referred_by_code IS 'The referral code used when signing up';
COMMENT ON COLUMN referral_codes.code_type IS 'Type: user, super, or promotional';
COMMENT ON COLUMN referral_codes.bonus_type IS 'Type of bonus: free_month, discount_percent, discount_fixed, free_trial_extension';
COMMENT ON COLUMN referral_codes.commission_type IS 'Commission structure: one_time, recurring, or lifetime';

COMMIT;

-- =====================================================
-- END OF REFERRAL SYSTEM MIGRATION
-- =====================================================

