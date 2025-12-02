-- Add bounced column (frontend uses this instead of is_bounce)
ALTER TABLE landing_page_analytics 
ADD COLUMN IF NOT EXISTS bounced BOOLEAN DEFAULT false;

