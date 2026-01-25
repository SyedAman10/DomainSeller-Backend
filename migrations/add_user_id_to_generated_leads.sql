-- Add user_id column to generated_leads table for multi-tenant support
-- This ensures each user only sees their own generated leads

-- Add user_id column (nullable for now)
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

-- Assign existing leads to the first admin user IF one exists
-- Otherwise, leave them as NULL (orphaned leads)
DO $$
DECLARE
  first_user_id INTEGER;
BEGIN
  -- Get the first user ID (usually admin)
  SELECT id INTO first_user_id 
  FROM users 
  WHERE role = 'admin' OR role = 'user'
  ORDER BY id ASC 
  LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    -- Update existing leads to assign them to first user
    UPDATE generated_leads 
    SET user_id = first_user_id 
    WHERE user_id IS NULL;
    
    RAISE NOTICE '✅ Assigned existing leads to user_id = %', first_user_id;
  ELSE
    RAISE NOTICE '⚠️  No users found - existing leads remain unassigned (user_id = NULL)';
    RAISE NOTICE '💡 Create a user first, then run: UPDATE generated_leads SET user_id = YOUR_USER_ID WHERE user_id IS NULL;';
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN generated_leads.user_id IS 'ID of the user who generated this lead (multi-tenant support)';

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete: Added user_id column to generated_leads table';
    RAISE NOTICE '🔐 New leads will be filtered by user_id automatically';
END $$;
