-- Enhanced Analytics Tables and Columns

-- 1. Add enhanced columns to landing_page_analytics
ALTER TABLE landing_page_analytics 
ADD COLUMN IF NOT EXISTS scroll_depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_scroll_depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_to_first_click INTEGER,
ADD COLUMN IF NOT EXISTS clicks_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- 2. Create leads table
CREATE TABLE IF NOT EXISTS landing_page_leads (
  id SERIAL PRIMARY KEY,
  landing_page_id VARCHAR(255),
  visitor_id VARCHAR(255),
  session_id VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  message TEXT,
  captured_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(50),
  status VARCHAR(50) DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create clicks table
CREATE TABLE IF NOT EXISTS landing_page_clicks (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255),
  domain VARCHAR(255),
  x_position INTEGER,
  y_position INTEGER,
  element_type VARCHAR(100),
  element_text TEXT,
  clicked_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_landing_page ON landing_page_leads(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON landing_page_leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_visitor ON landing_page_leads(visitor_id);
CREATE INDEX IF NOT EXISTS idx_leads_session ON landing_page_leads(session_id);
CREATE INDEX IF NOT EXISTS idx_clicks_session ON landing_page_clicks(session_id);
CREATE INDEX IF NOT EXISTS idx_clicks_domain ON landing_page_clicks(domain);

