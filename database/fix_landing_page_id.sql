-- Add duration_seconds column
ALTER TABLE landing_page_analytics 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

-- Make landing_page_id nullable (frontend doesn't always provide it)
ALTER TABLE landing_page_analytics 
ALTER COLUMN landing_page_id DROP NOT NULL;

-- Add index on domain for queries by domain name
CREATE INDEX IF NOT EXISTS idx_analytics_domain_lookup ON landing_page_analytics(domain);

