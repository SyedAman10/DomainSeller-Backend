-- Smart Lead Generation System - Database Schema
-- This table stores leads from various Apify actors with duplicate prevention

CREATE TABLE IF NOT EXISTS generated_leads (
  id SERIAL PRIMARY KEY,
  
  -- Company Information
  company_name VARCHAR(500),
  email VARCHAR(255),
  phone VARCHAR(100),
  website TEXT,
  
  -- Location Data
  location TEXT,
  city VARCHAR(255),
  country VARCHAR(100),
  
  -- Business Details
  industry VARCHAR(255),
  title VARCHAR(500),
  snippet TEXT,
  description TEXT,
  
  -- Social Media
  linkedin_url TEXT,
  facebook_url TEXT,
  twitter_url TEXT,
  
  -- Additional Info
  contact_person VARCHAR(255),
  employee_count INTEGER,
  revenue VARCHAR(100),
  founded_year INTEGER,
  
  -- Lead Quality Metrics
  confidence_score INTEGER DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  intent VARCHAR(10) CHECK (intent IN ('HOT', 'WARM', 'COLD')) DEFAULT 'WARM',
  
  -- Source Tracking
  query_used TEXT NOT NULL,
  source_actor VARCHAR(255) NOT NULL,
  run_id VARCHAR(255),
  
  -- Raw data for reference
  raw_data JSONB,
  
  -- Lead Status
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'rejected')),
  contacted_at TIMESTAMP,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Prevent duplicate leads based on email or website
  UNIQUE(email, website)
);

-- Indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_generated_leads_email ON generated_leads(email);
CREATE INDEX IF NOT EXISTS idx_generated_leads_website ON generated_leads(website);
CREATE INDEX IF NOT EXISTS idx_generated_leads_company ON generated_leads(company_name);
CREATE INDEX IF NOT EXISTS idx_generated_leads_query ON generated_leads(query_used);
CREATE INDEX IF NOT EXISTS idx_generated_leads_location ON generated_leads(location);
CREATE INDEX IF NOT EXISTS idx_generated_leads_industry ON generated_leads(industry);
CREATE INDEX IF NOT EXISTS idx_generated_leads_intent ON generated_leads(intent);
CREATE INDEX IF NOT EXISTS idx_generated_leads_status ON generated_leads(status);
CREATE INDEX IF NOT EXISTS idx_generated_leads_created ON generated_leads(created_at DESC);

-- Full-text search index for faster keyword matching
CREATE INDEX IF NOT EXISTS idx_generated_leads_search ON generated_leads 
USING GIN(to_tsvector('english', 
  COALESCE(company_name, '') || ' ' || 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '') || ' ' ||
  COALESCE(query_used, '')
));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_generated_leads_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_generated_leads_timestamp
  BEFORE UPDATE ON generated_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_generated_leads_timestamp();

-- Add comments for documentation
COMMENT ON TABLE generated_leads IS 'Stores leads generated from various Apify actors with smart caching and duplicate prevention';
COMMENT ON COLUMN generated_leads.confidence_score IS 'Lead quality score from 0-100';
COMMENT ON COLUMN generated_leads.intent IS 'Lead intent classification: HOT, WARM, or COLD';
COMMENT ON COLUMN generated_leads.source_actor IS 'Which Apify actor generated this lead';
COMMENT ON COLUMN generated_leads.query_used IS 'The keyword/query used to find this lead';
COMMENT ON COLUMN generated_leads.raw_data IS 'Original JSON data from the actor for reference';

-- Sample query to test
-- SELECT company_name, email, phone, website, confidence_score, intent 
-- FROM generated_leads 
-- WHERE query_used ILIKE '%tech%' 
-- ORDER BY confidence_score DESC, created_at DESC 
-- LIMIT 10;

