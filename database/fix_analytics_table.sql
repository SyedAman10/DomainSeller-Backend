-- Drop and recreate landing_page_analytics table
DROP TABLE IF EXISTS landing_page_analytics CASCADE;

-- Create landing_page_analytics table (what frontend expects)
CREATE TABLE landing_page_analytics (
  id SERIAL PRIMARY KEY,
  landing_page_id VARCHAR(255) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  
  -- Visit metadata
  visitor_id VARCHAR(255),
  session_id VARCHAR(255),
  visit_timestamp TIMESTAMP DEFAULT NOW(),
  
  -- Visitor info
  ip_address VARCHAR(45),
  country VARCHAR(100),
  city VARCHAR(100),
  region VARCHAR(100),
  
  -- Device info
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  screen_resolution VARCHAR(50),
  
  -- Traffic source
  referrer_url TEXT,
  referrer_domain VARCHAR(255),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),
  
  -- Session data
  session_duration INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 1,
  is_bounce BOOLEAN DEFAULT false,
  
  -- Conversion tracking
  converted BOOLEAN DEFAULT false,
  conversion_type VARCHAR(50),
  conversion_value DECIMAL(10, 2),
  
  -- Domain tracking
  domain VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_analytics_landing_page ON landing_page_analytics(landing_page_id);
CREATE INDEX idx_analytics_user ON landing_page_analytics(user_id);
CREATE INDEX idx_analytics_timestamp ON landing_page_analytics(visit_timestamp);
CREATE INDEX idx_analytics_visitor ON landing_page_analytics(visitor_id);
CREATE INDEX idx_analytics_session ON landing_page_analytics(session_id);
CREATE INDEX idx_analytics_domain ON landing_page_analytics(domain);
