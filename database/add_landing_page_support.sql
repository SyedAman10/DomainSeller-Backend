-- =====================================================
-- LANDING PAGE SUPPORT - Database Schema
-- =====================================================
-- This adds landing page link support to campaigns
-- =====================================================

-- Add landing page fields to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS include_landing_page BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS landing_page_url TEXT;

-- Add comments
COMMENT ON COLUMN campaigns.include_landing_page IS 'Whether to include landing page link in initial emails';
COMMENT ON COLUMN campaigns.landing_page_url IS 'URL of the landing page for this domain';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Landing page support added to campaigns table!' AS status;

