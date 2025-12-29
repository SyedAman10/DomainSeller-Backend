-- =====================================================
-- FIX REFERRAL CODE AUTO-GENERATION
-- =====================================================
-- This fixes the trigger to generate referral codes AFTER insert
-- when the user ID is available
-- =====================================================

-- 1. Drop the old trigger and function
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON users;
DROP FUNCTION IF EXISTS auto_generate_referral_code();

-- 2. Create new AFTER INSERT trigger function
CREATE OR REPLACE FUNCTION auto_generate_referral_code_after_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_code VARCHAR(20);
  v_username VARCHAR(100);
  v_counter INTEGER := 0;
BEGIN
  -- Only generate if referral_code is NULL
  IF NEW.referral_code IS NULL THEN
    v_username := COALESCE(NEW.username, 'USER');
    
    -- Generate unique code
    LOOP
      IF v_counter = 0 THEN
        v_code := UPPER(SUBSTRING(v_username FROM 1 FOR 6)) || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      ELSE
        v_code := UPPER(SUBSTRING(v_username FROM 1 FOR 5)) || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
      END IF;
      
      -- Check if code already exists
      IF NOT EXISTS (SELECT 1 FROM users WHERE referral_code = v_code) 
         AND NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code) THEN
        EXIT;
      END IF;
      
      v_counter := v_counter + 1;
      
      -- Prevent infinite loop
      IF v_counter > 100 THEN
        -- Use fallback code with user ID
        v_code := 'REF' || LPAD(NEW.id::TEXT, 6, '0') || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
        EXIT;
      END IF;
    END LOOP;
    
    -- Update the user with the generated code
    UPDATE users SET referral_code = v_code WHERE id = NEW.id;
    
    RAISE NOTICE 'Generated referral code % for user % (ID: %)', v_code, v_username, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the AFTER INSERT trigger
CREATE TRIGGER trigger_auto_generate_referral_code
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code_after_insert();

-- 4. Generate codes for existing users without referral codes
DO $$
DECLARE
  user_record RECORD;
  v_code VARCHAR(20);
  v_counter INTEGER;
BEGIN
  FOR user_record IN SELECT id, username FROM users WHERE referral_code IS NULL
  LOOP
    v_counter := 0;
    
    -- Generate unique code for this user
    LOOP
      IF v_counter = 0 THEN
        v_code := UPPER(SUBSTRING(COALESCE(user_record.username, 'USER') FROM 1 FOR 6)) || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      ELSE
        v_code := UPPER(SUBSTRING(COALESCE(user_record.username, 'USER') FROM 1 FOR 5)) || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
      END IF;
      
      -- Check if code already exists
      IF NOT EXISTS (SELECT 1 FROM users WHERE referral_code = v_code) 
         AND NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = v_code) THEN
        EXIT;
      END IF;
      
      v_counter := v_counter + 1;
      
      -- Prevent infinite loop
      IF v_counter > 100 THEN
        -- Use fallback code with user ID
        v_code := 'REF' || LPAD(user_record.id::TEXT, 6, '0') || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
        EXIT;
      END IF;
    END LOOP;
    
    -- Update user with generated code
    UPDATE users SET referral_code = v_code WHERE id = user_record.id;
    
    RAISE NOTICE 'Generated referral code % for existing user % (ID: %)', v_code, user_record.username, user_record.id;
  END LOOP;
  
  RAISE NOTICE '✅ Referral code generation complete!';
END $$;

-- 5. Verify the fix
DO $$
DECLARE
  total_users INTEGER;
  users_with_codes INTEGER;
  users_without_codes INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM users;
  SELECT COUNT(*) INTO users_with_codes FROM users WHERE referral_code IS NOT NULL;
  SELECT COUNT(*) INTO users_without_codes FROM users WHERE referral_code IS NULL;
  
  RAISE NOTICE '📊 Referral Code Statistics:';
  RAISE NOTICE '   Total Users: %', total_users;
  RAISE NOTICE '   Users with Codes: %', users_with_codes;
  RAISE NOTICE '   Users without Codes: %', users_without_codes;
  
  IF users_without_codes > 0 THEN
    RAISE WARNING '⚠️  There are still % users without referral codes!', users_without_codes;
  ELSE
    RAISE NOTICE '✅ All users have referral codes!';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═════════════════════════════════════════════════';
  RAISE NOTICE '✅ REFERRAL CODE FIX APPLIED SUCCESSFULLY!';
  RAISE NOTICE '═════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was fixed:';
  RAISE NOTICE '   1. Changed trigger from BEFORE to AFTER INSERT';
  RAISE NOTICE '   2. Now generates codes after user ID is available';
  RAISE NOTICE '   3. Generated codes for all existing users';
  RAISE NOTICE '   4. Added fallback code generation';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 New users will automatically get referral codes';
  RAISE NOTICE '📝 Existing users have been updated';
  RAISE NOTICE '';
END $$;

