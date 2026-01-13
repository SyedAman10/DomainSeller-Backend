-- Add columns to track sold domains
-- Run this migration to add sold tracking to campaigns table

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS sold BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS sold_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sold_transaction_id INTEGER,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS paused_reason TEXT;

-- Add index for querying sold domains
CREATE INDEX IF NOT EXISTS idx_campaigns_sold ON campaigns(sold);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- Add foreign key constraint for sold_transaction_id
ALTER TABLE campaigns
ADD CONSTRAINT fk_campaigns_sold_transaction
FOREIGN KEY (sold_transaction_id) 
REFERENCES transactions(id) 
ON DELETE SET NULL;

COMMENT ON COLUMN campaigns.sold IS 'Whether the domain has been sold';
COMMENT ON COLUMN campaigns.sold_at IS 'When the domain was sold';
COMMENT ON COLUMN campaigns.sold_price IS 'Final sale price of the domain';
COMMENT ON COLUMN campaigns.sold_transaction_id IS 'Reference to the escrow transaction';
COMMENT ON COLUMN campaigns.paused_at IS 'When the campaign was paused';
COMMENT ON COLUMN campaigns.paused_reason IS 'Reason for pausing the campaign';

