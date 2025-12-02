-- =====================================================
-- LANDING PAGE ANALYTICS - Database Schema
-- =====================================================
-- This creates tables for tracking landing page analytics
-- =====================================================

-- Create landing_pages table first
CREATE TABLE IF NOT EXISTS landing_pages (
  id SERIAL PRIMARY KEY,
  landing_page_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  campaign_id VARCHAR(255) REFERENCES campaigns(campaign_id) ON DELETE SET NULL,
  
  domain_name VARCHAR(255) NOT NULL,
  page_title VARCHAR(255),
  page_url TEXT NOT NULL,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create landing_page_visits table
CREATE TABLE IF NOT EXISTS landing_page_visits (
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
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
