-- Add timestamp column (frontend expects this instead of visit_timestamp)
ALTER TABLE landing_page_analytics 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT NOW();

-- Also add any other potentially missing columns
ALTER TABLE landing_page_analytics 
ADD COLUMN IF NOT EXISTS event_data JSONB,
ADD COLUMN IF NOT EXISTS metadata JSONB;

