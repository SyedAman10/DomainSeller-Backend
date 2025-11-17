-- Add escrow support to users and campaigns
-- This allows users to connect their escrow accounts and AI agent to send escrow payment links

-- Add escrow fields to users table (if it exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS escrow_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS escrow_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS escrow_api_key VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS escrow_api_secret VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS escrow_provider VARCHAR(50) DEFAULT 'escrow.com';

-- Add escrow fields to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS escrow_enabled BOOLEAN DEFAULT true;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS escrow_fee_payer VARCHAR(20) DEFAULT 'buyer'; -- 'buyer', 'seller', 'split'
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS asking_price DECIMAL(10, 2);

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Escrow fields
  escrow_email VARCHAR(255),
  escrow_enabled BOOLEAN DEFAULT false,
  escrow_api_key VARCHAR(500),
  escrow_api_secret VARCHAR(500),
  escrow_provider VARCHAR(50) DEFAULT 'escrow.com'
);

-- Create escrow_transactions table to track escrow payments
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(100) UNIQUE NOT NULL, -- Escrow.com transaction ID
  campaign_id VARCHAR(100) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  domain_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending', -- pending, funded, completed, cancelled
  escrow_url TEXT,
  fee_payer VARCHAR(20) DEFAULT 'buyer',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  user_id INTEGER REFERENCES users(id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_campaign ON escrow_transactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_buyer ON escrow_transactions(buyer_email);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_status ON escrow_transactions(status);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for escrow_transactions
DROP TRIGGER IF EXISTS update_escrow_transactions_updated_at ON escrow_transactions;
CREATE TRIGGER update_escrow_transactions_updated_at 
  BEFORE UPDATE ON escrow_transactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE escrow_transactions IS 'Tracks escrow payment transactions for domain sales';
COMMENT ON COLUMN users.escrow_email IS 'User escrow account email (usually same as their main email)';
COMMENT ON COLUMN users.escrow_enabled IS 'Whether user has connected their escrow account';
COMMENT ON COLUMN users.escrow_api_key IS 'Escrow.com API key (encrypted in production)';
COMMENT ON COLUMN campaigns.escrow_enabled IS 'Whether to offer escrow payment for this campaign';
COMMENT ON COLUMN campaigns.escrow_fee_payer IS 'Who pays escrow fees: buyer, seller, or split';

COMMIT;

