-- Fix foreign key constraints to allow cascading deletes
-- This allows deleting campaigns without manually deleting related records first

-- 1. Drop existing foreign key constraint on scheduled_emails
ALTER TABLE scheduled_emails 
DROP CONSTRAINT IF EXISTS scheduled_emails_campaign_id_fkey;

-- 2. Add new foreign key constraint with CASCADE delete
ALTER TABLE scheduled_emails 
ADD CONSTRAINT scheduled_emails_campaign_id_fkey 
FOREIGN KEY (campaign_id) 
REFERENCES campaigns(campaign_id) 
ON DELETE CASCADE;

-- 3. Drop existing foreign key constraint on sent_emails (if exists)
ALTER TABLE sent_emails 
DROP CONSTRAINT IF EXISTS sent_emails_campaign_id_fkey;

-- 4. Add new foreign key constraint with CASCADE delete for sent_emails
ALTER TABLE sent_emails 
ADD CONSTRAINT sent_emails_campaign_id_fkey 
FOREIGN KEY (campaign_id) 
REFERENCES campaigns(campaign_id) 
ON DELETE CASCADE;

-- 5. Fix email_conversations table if it exists
ALTER TABLE email_conversations 
DROP CONSTRAINT IF EXISTS email_conversations_campaign_id_fkey;

ALTER TABLE email_conversations 
ADD CONSTRAINT email_conversations_campaign_id_fkey 
FOREIGN KEY (campaign_id) 
REFERENCES campaigns(campaign_id) 
ON DELETE CASCADE;

-- Verify the constraints
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('scheduled_emails', 'sent_emails', 'email_conversations')
  AND rc.delete_rule = 'CASCADE';

