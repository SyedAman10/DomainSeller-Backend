-- =====================================================
-- DOMAIN TRANSFERS - Database Schema
-- =====================================================
-- This script adds domain transfer tracking and management
-- Run this migration to enable domain transfer features
-- =====================================================

-- 1. Create domain_transfers table
CREATE TABLE IF NOT EXISTS domain_transfers (
  id SERIAL PRIMARY KEY,
  domain_name VARCHAR(255) NOT NULL,
  seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  buyer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  buyer_email VARCHAR(255) NOT NULL,
  auth_code VARCHAR(255), -- EPP/Authorization code
  payment_id INTEGER, -- Reference to stripe_payments or escrow_transactions
  payment_type VARCHAR(20), -- 'stripe', 'escrow', 'other'
  
  -- Transfer status tracking
  status VARCHAR(50) DEFAULT 'initiated', -- initiated, auth_provided, pending_approval, in_progress, completed, failed, cancelled
  transfer_step VARCHAR(100), -- Current step in transfer process
  
  -- Transfer lock status
  was_locked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMP,
  lock_check_result JSONB, -- Store full lock check response
  
  -- Important dates
  initiated_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP, -- Transfer expiry (usually 5-7 days)
  
  -- Additional info
  notes TEXT,
  registrar VARCHAR(255),
  new_registrar VARCHAR(255), -- Where buyer is transferring to
  
  -- Verification
  ownership_verified BOOLEAN DEFAULT false,
  verification_code VARCHAR(100),
  verified_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for domain_transfers
CREATE INDEX IF NOT EXISTS idx_domain_transfers_domain ON domain_transfers(domain_name);
CREATE INDEX IF NOT EXISTS idx_domain_transfers_seller ON domain_transfers(seller_id);
CREATE INDEX IF NOT EXISTS idx_domain_transfers_buyer ON domain_transfers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_domain_transfers_status ON domain_transfers(status);
CREATE INDEX IF NOT EXISTS idx_domain_transfers_buyer_email ON domain_transfers(buyer_email);

-- 2. Add transfer-related fields to domains table
ALTER TABLE domains ADD COLUMN IF NOT EXISTS transfer_locked BOOLEAN DEFAULT true;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS auth_code VARCHAR(255);
ALTER TABLE domains ADD COLUMN IF NOT EXISTS registrar VARCHAR(255);
ALTER TABLE domains ADD COLUMN IF NOT EXISTS registrar_url VARCHAR(500);
ALTER TABLE domains ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS nameservers TEXT[];
ALTER TABLE domains ADD COLUMN IF NOT EXISTS verification_code VARCHAR(100);
ALTER TABLE domains ADD COLUMN IF NOT EXISTS ownership_verified BOOLEAN DEFAULT false;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

-- 3. Create domain_transfer_logs table for audit trail
CREATE TABLE IF NOT EXISTS domain_transfer_logs (
  id SERIAL PRIMARY KEY,
  transfer_id INTEGER REFERENCES domain_transfers(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- status_change, email_sent, lock_checked, etc.
  event_data JSONB,
  message TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_logs_transfer ON domain_transfer_logs(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_logs_event_type ON domain_transfer_logs(event_type);

-- 4. Add transfer tracking to stripe_payments
ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS transfer_id INTEGER REFERENCES domain_transfers(id);
ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS transfer_initiated BOOLEAN DEFAULT false;
ALTER TABLE stripe_payments ADD COLUMN IF NOT EXISTS transfer_completed_at TIMESTAMP;

-- 5. Add transfer tracking to escrow_transactions (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'escrow_transactions') THEN
    ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS transfer_id INTEGER;
    ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS transfer_initiated BOOLEAN DEFAULT false;
    ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS transfer_completed_at TIMESTAMP;
  END IF;
END $$;

-- 6. Create function to automatically set expiry date for transfers
CREATE OR REPLACE FUNCTION set_transfer_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.initiated_at + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic expiry setting
DROP TRIGGER IF EXISTS trigger_set_transfer_expiry ON domain_transfers;
CREATE TRIGGER trigger_set_transfer_expiry
  BEFORE INSERT ON domain_transfers
  FOR EACH ROW
  EXECUTE FUNCTION set_transfer_expiry();

-- 7. Create function to log transfer events
CREATE OR REPLACE FUNCTION log_transfer_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO domain_transfer_logs (transfer_id, event_type, event_data, message)
    VALUES (
      NEW.id,
      'status_change',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'old_step', OLD.transfer_step,
        'new_step', NEW.transfer_step
      ),
      format('Status changed from %s to %s', OLD.status, NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic transfer logging
DROP TRIGGER IF EXISTS trigger_log_transfer_event ON domain_transfers;
CREATE TRIGGER trigger_log_transfer_event
  AFTER UPDATE ON domain_transfers
  FOR EACH ROW
  EXECUTE FUNCTION log_transfer_event();

-- 8. Sample view for active transfers
CREATE OR REPLACE VIEW active_transfers AS
SELECT 
  dt.*,
  u1.username as seller_username,
  u1.email as seller_email,
  u2.username as buyer_username,
  d.value as domain_value,
  d.registrar as current_registrar
FROM domain_transfers dt
LEFT JOIN users u1 ON dt.seller_id = u1.id
LEFT JOIN users u2 ON dt.buyer_id = u2.id
LEFT JOIN domains d ON d.name = dt.domain_name
WHERE dt.status IN ('initiated', 'auth_provided', 'pending_approval', 'in_progress')
ORDER BY dt.created_at DESC;

COMMENT ON TABLE domain_transfers IS 'Tracks domain transfer process from seller to buyer';
COMMENT ON TABLE domain_transfer_logs IS 'Audit log for all domain transfer events';
COMMENT ON VIEW active_transfers IS 'View of all currently active domain transfers';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Domain transfers schema created successfully!';
  RAISE NOTICE '📋 Tables created: domain_transfers, domain_transfer_logs';
  RAISE NOTICE '👀 Views created: active_transfers';
  RAISE NOTICE '🔧 Triggers created: transfer expiry, event logging';
END $$;

