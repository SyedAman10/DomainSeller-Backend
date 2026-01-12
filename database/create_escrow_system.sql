-- Complete Escrow Verification System Setup
-- Creates all necessary tables for escrow payment flow

-- Create transactions table (main escrow payment table)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER,
    buyer_email VARCHAR(255) NOT NULL,
    buyer_name VARCHAR(255) NOT NULL,
    domain_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Payment tracking
    payment_status VARCHAR(50) DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    stripe_payment_link_id VARCHAR(255),
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    paid_at TIMESTAMP,
    
    -- Verification tracking
    verification_status VARCHAR(50) DEFAULT 'pending_payment',
    verification_method VARCHAR(50),
    verified_at TIMESTAMP,
    verified_by INTEGER,
    verification_notes TEXT,
    
    -- Buyer confirmation
    buyer_confirmed BOOLEAN DEFAULT FALSE,
    buyer_confirmed_at TIMESTAMP,
    
    -- Transfer tracking
    transfer_status VARCHAR(50),
    transfer_id VARCHAR(255),
    refund_id VARCHAR(255),
    
    -- Seller info
    user_id INTEGER NOT NULL,
    seller_stripe_id VARCHAR(255),
    
    -- Platform fees
    platform_fee_amount DECIMAL(10,2),
    seller_payout_amount DECIMAL(10,2),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_verification_status ON transactions(verification_status);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_email ON transactions(buyer_email);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_campaign_id ON transactions(campaign_id);

-- Create verification history table for audit trail
CREATE TABLE IF NOT EXISTS verification_history (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id),
    action VARCHAR(100) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    performed_by INTEGER,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verification_history_transaction ON verification_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_created ON verification_history(created_at DESC);

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    transaction_id INTEGER REFERENCES transactions(id),
    priority VARCHAR(20) DEFAULT 'normal',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    read_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_transaction ON admin_notifications(transaction_id);

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'Main escrow payment transactions table';
COMMENT ON COLUMN transactions.verification_status IS 'Possible values: pending_payment, payment_received, pending_verification, buyer_confirmed, verified, verification_failed, funds_transferred';
COMMENT ON COLUMN transactions.verification_method IS 'Possible values: buyer_confirms, admin_manual, auto_whois';
COMMENT ON COLUMN transactions.transfer_status IS 'Possible values: pending, completed, failed';
COMMENT ON COLUMN transactions.payment_status IS 'Possible values: pending, paid, refunded';

COMMENT ON TABLE verification_history IS 'Audit trail for all verification actions';
COMMENT ON TABLE admin_notifications IS 'Notifications for admin dashboard';

-- Insert sample statuses for reference
-- Status Flow:
-- 1. pending_payment -> payment_received (webhook)
-- 2. payment_received -> buyer_confirmed (buyer clicks link)
-- 3. buyer_confirmed -> verified (admin verification)
-- 4. verified -> funds_transferred (automatic transfer to seller)
-- OR verification_failed -> refund_issued (if transfer failed)

SELECT 'Escrow Verification System Tables Created Successfully!' as status;

