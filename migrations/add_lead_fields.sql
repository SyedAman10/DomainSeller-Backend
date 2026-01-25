-- Add missing columns to generated_leads table
-- This migration adds all the detailed lead fields from the Apify actor

-- Personal information fields
ALTER TABLE generated_leads ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
ALTER TABLE generated_leads ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
ALTER TABLE generated_leads ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE generated_leads ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE generated_leads ADD COLUMN IF NOT EXISTS seniority VARCHAR(100);

-- Company detail fields
ALTER TABLE generated_leads ADD COLUMN IF NOT EXISTS company_domain VARCHAR(255);
ALTER TABLE generated_leads ADD COLUMN IF NOT EXISTS company_linkedin VARCHAR(500);
ALTER TABLE generated_leads ADD COLUMN IF NOT EXISTS company_phone VARCHAR(50);
ALTER TABLE generated_leads ADD COLUMN IF NOT EXISTS company_revenue_clean VARCHAR(100);
ALTER TABLE generated_leads ADD COLUMN IF NOT EXISTS company_total_funding VARCHAR(100);
ALTER TABLE generated_leads ADD COLUMN IF NOT EXISTS company_total_funding_clean VARCHAR(100);
ALTER TABLE generated_leads ADD COLUMN IF NOT EXISTS company_technologies TEXT;
ALTER TABLE generated_leads ADD COLUMN IF NOT EXISTS keywords TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_first_name ON generated_leads(first_name);
CREATE INDEX IF NOT EXISTS idx_leads_last_name ON generated_leads(last_name);
CREATE INDEX IF NOT EXISTS idx_leads_full_name ON generated_leads(full_name);
CREATE INDEX IF NOT EXISTS idx_leads_job_title ON generated_leads(job_title);
CREATE INDEX IF NOT EXISTS idx_leads_seniority ON generated_leads(seniority);
CREATE INDEX IF NOT EXISTS idx_leads_company_domain ON generated_leads(company_domain);

-- Add comments for documentation
COMMENT ON COLUMN generated_leads.first_name IS 'Contact first name from leads-finder actor';
COMMENT ON COLUMN generated_leads.last_name IS 'Contact last name from leads-finder actor';
COMMENT ON COLUMN generated_leads.full_name IS 'Contact full name from leads-finder actor';
COMMENT ON COLUMN generated_leads.job_title IS 'Contact job title from leads-finder actor';
COMMENT ON COLUMN generated_leads.seniority IS 'Contact seniority level (owner, c_suite, vp, etc.)';
COMMENT ON COLUMN generated_leads.company_domain IS 'Company domain name';
COMMENT ON COLUMN generated_leads.company_linkedin IS 'Company LinkedIn URL';
COMMENT ON COLUMN generated_leads.company_phone IS 'Company phone number';
COMMENT ON COLUMN generated_leads.company_revenue_clean IS 'Formatted company revenue (e.g., 1.7M)';
COMMENT ON COLUMN generated_leads.company_total_funding IS 'Company total funding amount';
COMMENT ON COLUMN generated_leads.company_total_funding_clean IS 'Formatted company funding (e.g., 400M)';
COMMENT ON COLUMN generated_leads.company_technologies IS 'Comma-separated list of technologies used by company';
COMMENT ON COLUMN generated_leads.keywords IS 'Comma-separated keywords related to company/contact';

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete: Added 13 new columns to generated_leads table';
END $$;
