-- Add user_id column to generated_leads table for multi-tenant support
-- This ensures each user only sees their own generated leads

-- Add user_id column
ALTER TABLE generated_leads 
ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Add foreign key constraint to users table
ALTER TABLE generated_leads
ADD CONSTRAINT fk_generated_leads_user
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- Create index for fast user-based queries
CREATE INDEX IF NOT EXISTS idx_generated_leads_user_id ON generated_leads(user_id);

-- Create composite index for common queries (user + created_at)
CREATE INDEX IF NOT EXISTS idx_generated_leads_user_created 
ON generated_leads(user_id, created_at DESC);

-- Create composite index for user + keyword searches
CREATE INDEX IF NOT EXISTS idx_generated_leads_user_query 
ON generated_leads(user_id, query_used);

-- Update existing leads to assign them to admin user (user_id = 1)
-- WARNING: Adjust this based on your actual admin user ID!
UPDATE generated_leads 
SET user_id = 1 
WHERE user_id IS NULL;

-- Make user_id required going forward (but allow NULL for now for backward compatibility)
-- Uncomment this line after you've assigned all existing leads to a user:
-- ALTER TABLE generated_leads ALTER COLUMN user_id SET NOT NULL;

-- Add comment
COMMENT ON COLUMN generated_leads.user_id IS 'ID of the user who generated this lead (multi-tenant support)';

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete: Added user_id column to generated_leads table';
    RAISE NOTICE '📝 All existing leads assigned to user_id = 1';
    RAISE NOTICE '🔐 New leads will be filtered by user_id automatically';
END $$;
