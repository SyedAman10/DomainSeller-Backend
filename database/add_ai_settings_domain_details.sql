-- Add domain details fields to campaign AI settings
-- Run with: psql -U <user> -d <db> -f database/add_ai_settings_domain_details.sql

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS ai_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS ai_registrar VARCHAR(255);

COMMENT ON COLUMN campaigns.ai_expiry_date IS 'Optional domain expiry date used by AI replies';
COMMENT ON COLUMN campaigns.ai_registrar IS 'Optional registrar info used by AI replies';
