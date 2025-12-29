-- Create domain_buyer_leads table for storing scraped leads from search results
-- This table tracks potential domain buyers based on search intent

CREATE TABLE IF NOT EXISTS domain_buyer_leads (
  id SERIAL PRIMARY KEY,
  
  -- Source information
  source VARCHAR(50) NOT NULL DEFAULT 'google',
  query_used TEXT NOT NULL,
  
  -- SERP result data
  title TEXT NOT NULL,
  snippet TEXT,
  url TEXT NOT NULL,
  
  -- Intent classification
  intent VARCHAR(10) NOT NULL CHECK (intent IN ('HOT', 'WARM', 'COLD')),
  confidence_score INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  matched_keywords TEXT[], -- Array of keywords that matched
  
  -- Contact information (extracted from crawling)
  contact_email VARCHAR(255),
  author_name VARCHAR(255),
  profile_url TEXT,
  phone VARCHAR(50),
  
  -- Metadata
  country_code VARCHAR(10),
  language_code VARCHAR(10),
  position INTEGER, -- Position in search results
  
  -- Enrichment status
  crawled BOOLEAN DEFAULT false,
  crawl_attempted_at TIMESTAMP,
  crawl_error TEXT,
  
  -- Lead management
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'rejected', 'archived')),
  assigned_to INTEGER, -- User ID if assigned to sales rep
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_contacted_at TIMESTAMP,
  
  -- Prevent duplicates
  UNIQUE(url, query_used)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_domain_leads_intent ON domain_buyer_leads(intent);
CREATE INDEX IF NOT EXISTS idx_domain_leads_status ON domain_buyer_leads(status);
CREATE INDEX IF NOT EXISTS idx_domain_leads_created ON domain_buyer_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_leads_source ON domain_buyer_leads(source);
CREATE INDEX IF NOT EXISTS idx_domain_leads_query ON domain_buyer_leads(query_used);
CREATE INDEX IF NOT EXISTS idx_domain_leads_url ON domain_buyer_leads(url);
CREATE INDEX IF NOT EXISTS idx_domain_leads_email ON domain_buyer_leads(contact_email);

-- Create scraping sessions table to track Apify runs
CREATE TABLE IF NOT EXISTS lead_scraping_sessions (
  id SERIAL PRIMARY KEY,
  
  -- Apify details
  actor_id VARCHAR(255) NOT NULL,
  run_id VARCHAR(255) UNIQUE,
  
  -- Input parameters
  query TEXT NOT NULL,
  country_code VARCHAR(10),
  language_code VARCHAR(10),
  max_pages INTEGER DEFAULT 1,
  results_per_page INTEGER DEFAULT 10,
  date_range VARCHAR(50),
  
  -- Results
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_results INTEGER DEFAULT 0,
  hot_leads INTEGER DEFAULT 0,
  warm_leads INTEGER DEFAULT 0,
  cold_leads INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  
  -- Error tracking
  error_message TEXT,
  
  -- Cost tracking
  compute_units DECIMAL(10, 4),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraping_sessions_status ON lead_scraping_sessions(status);
CREATE INDEX IF NOT EXISTS idx_scraping_sessions_query ON lead_scraping_sessions(query);
CREATE INDEX IF NOT EXISTS idx_scraping_sessions_created ON lead_scraping_sessions(created_at DESC);

-- Add updated_at trigger for domain_buyer_leads
CREATE OR REPLACE FUNCTION update_domain_leads_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_domain_leads_updated ON domain_buyer_leads;
CREATE TRIGGER trigger_domain_leads_updated
  BEFORE UPDATE ON domain_buyer_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_domain_leads_timestamp();

-- Create view for lead statistics
CREATE OR REPLACE VIEW lead_stats AS
SELECT 
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE intent = 'HOT') as hot_leads,
  COUNT(*) FILTER (WHERE intent = 'WARM') as warm_leads,
  COUNT(*) FILTER (WHERE intent = 'COLD') as cold_leads,
  COUNT(*) FILTER (WHERE contact_email IS NOT NULL) as leads_with_email,
  COUNT(*) FILTER (WHERE status = 'new') as new_leads,
  COUNT(*) FILTER (WHERE status = 'contacted') as contacted_leads,
  COUNT(*) FILTER (WHERE status = 'qualified') as qualified_leads,
  COUNT(*) FILTER (WHERE status = 'converted') as converted_leads,
  COUNT(DISTINCT query_used) as unique_queries,
  COUNT(DISTINCT source) as unique_sources
FROM domain_buyer_leads;

COMMENT ON TABLE domain_buyer_leads IS 'Stores scraped leads of potential domain buyers from search results';
COMMENT ON TABLE lead_scraping_sessions IS 'Tracks Apify scraping sessions and their results';

