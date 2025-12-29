-- =====================================================
-- UPDATE REFERRAL SYSTEM SETTINGS
-- =====================================================
-- Changes:
-- 1. Give referred users 10% discount
-- 2. Set all commissions to 10% lifetime
-- =====================================================

-- 1. Update SUPER2025 code to 10% commission (not 15%)
UPDATE referral_codes 
SET commission_rate = 10.00,
    commission_type = 'lifetime'
WHERE code = 'SUPER2025';

-- 2. Update all promotional codes to lifetime commission
UPDATE referral_codes 
SET commission_type = 'lifetime'
WHERE code_type = 'promotional';

-- 3. Set default values for new user referral codes
-- This ensures all future user codes get these settings
ALTER TABLE referral_codes 
ALTER COLUMN commission_rate SET DEFAULT 10.00,
ALTER COLUMN commission_type SET DEFAULT 'lifetime';

-- 4. Create a function to apply 10% discount to referred users
CREATE OR REPLACE FUNCTION apply_referral_discount(
  p_user_id INTEGER,
  p_plan VARCHAR(50),
  p_base_price DECIMAL(10,2)
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_discount_percent DECIMAL(5,2) := 10.00; -- 10% discount
  v_discounted_price DECIMAL(10,2);
BEGIN
  -- Calculate discounted price
  v_discounted_price := p_base_price * (1 - v_discount_percent / 100);
  
  -- Log the discount application
  RAISE NOTICE 'Applied % discount to user %: $% → $%', 
    v_discount_percent, p_user_id, p_base_price, v_discounted_price;
  
  RETURN v_discounted_price;
END;
$$ LANGUAGE plpgsql;

-- 5. Add referral discount fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referral_discount_percent DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS referral_discount_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_discount_applied_at TIMESTAMP;

-- 6. Create trigger to automatically apply discount when user is referred
CREATE OR REPLACE FUNCTION auto_apply_referral_discount()
RETURNS TRIGGER AS $$
BEGIN
  -- If user was referred and hasn't gotten discount yet
  IF NEW.referred_by_user_id IS NOT NULL AND NEW.referral_discount_active = false THEN
    -- Activate 10% discount
    NEW.referral_discount_active := true;
    NEW.referral_discount_percent := 10.00;
    NEW.referral_discount_applied_at := NOW();
    
    RAISE NOTICE 'Auto-applied 10%% discount to referred user %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_apply_referral_discount ON users;
CREATE TRIGGER trigger_auto_apply_referral_discount
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_apply_referral_discount();

-- 7. Update existing referred users to have 10% discount
UPDATE users 
SET referral_discount_active = true,
    referral_discount_percent = 10.00,
    referral_discount_applied_at = NOW()
WHERE referred_by_user_id IS NOT NULL 
  AND referral_discount_active = false;

-- 8. Add bonus configuration to default user codes
-- Create a default bonus config for all user referral codes
INSERT INTO referral_codes (
  code,
  code_type,
  user_id,
  is_active,
  bonus_type,
  bonus_value,
  bonus_plan,
  commission_rate,
  commission_type,
  description,
  created_by_admin
) VALUES (
  'DEFAULT_USER_BONUS',
  'system_default',
  NULL,
  true,
  'discount_percent',
  10.00,
  NULL, -- Applies to all plans
  10.00,
  'lifetime',
  'Default bonus for all user referral codes - 10% off for referred users',
  true
) ON CONFLICT (code) DO UPDATE SET
  bonus_type = 'discount_percent',
  bonus_value = 10.00,
  commission_rate = 10.00,
  commission_type = 'lifetime';

-- 9. Verification query
DO $$
DECLARE
  super_code RECORD;
  promo_codes INTEGER;
  users_with_discount INTEGER;
BEGIN
  -- Check SUPER2025 code
  SELECT commission_rate, commission_type INTO super_code
  FROM referral_codes WHERE code = 'SUPER2025';
  
  -- Count promo codes with lifetime
  SELECT COUNT(*) INTO promo_codes
  FROM referral_codes 
  WHERE code_type = 'promotional' AND commission_type = 'lifetime';
  
  -- Count users with discount
  SELECT COUNT(*) INTO users_with_discount
  FROM users WHERE referral_discount_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '═════════════════════════════════════════════════';
  RAISE NOTICE '✅ REFERRAL SYSTEM UPDATED SUCCESSFULLY!';
  RAISE NOTICE '═════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Current Settings:';
  RAISE NOTICE '   SUPER2025 Commission: %', super_code.commission_rate;
  RAISE NOTICE '   SUPER2025 Type: %', super_code.commission_type;
  RAISE NOTICE '   Promo codes with lifetime: %', promo_codes;
  RAISE NOTICE '   Users with 10%% discount: %', users_with_discount;
  RAISE NOTICE '';
  RAISE NOTICE '🎁 Referral Benefits (NEW):';
  RAISE NOTICE '   • Referrer: 10%% lifetime commission';
  RAISE NOTICE '   • Referred User: 10%% discount on subscription';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Examples:';
  RAISE NOTICE '   User subscribes to $29.99/month plan:';
  RAISE NOTICE '   → Pays only: $26.99/month (10%% off)';
  RAISE NOTICE '   → Referrer earns: $2.70/month (10%% of $26.99)';
  RAISE NOTICE '   → Referrer earns this FOREVER (lifetime)';
  RAISE NOTICE '';
END $$;

