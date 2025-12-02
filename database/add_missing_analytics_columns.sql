-- Add missing columns to landing_page_analytics
ALTER TABLE landing_page_analytics 
ADD COLUMN IF NOT EXISTS event_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS page_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS language VARCHAR(10),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

