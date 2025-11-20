-- Create escrow_approvals table for admin approval workflow
CREATE TABLE IF NOT EXISTS escrow_approvals (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  buyer_name VARCHAR(255),
  domain_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  seller_email VARCHAR(255),
  seller_name VARCHAR(255),
  fee_payer VARCHAR(20) DEFAULT 'buyer',
  status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, declined
  user_id INTEGER,
  approved_at TIMESTAMP,
  approved_by INTEGER,
  escrow_transaction_id VARCHAR(255),  -- Set after approval
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_escrow_approvals_status ON escrow_approvals(status);
CREATE INDEX IF NOT EXISTS idx_escrow_approvals_campaign ON escrow_approvals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_escrow_approvals_user ON escrow_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_escrow_approvals_created ON escrow_approvals(created_at DESC);

-- Add comment
COMMENT ON TABLE escrow_approvals IS 'Stores pending escrow link requests requiring admin approval';

