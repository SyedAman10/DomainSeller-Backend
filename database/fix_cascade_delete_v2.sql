-- Step 1: Clean up orphaned records first
-- Delete sent_emails that reference non-existent campaigns
DELETE FROM sent_emails 
WHERE campaign_id NOT IN (SELECT campaign_id FROM campaigns);

-- Delete scheduled_emails that reference non-existent campaigns
DELETE FROM scheduled_emails 
WHERE campaign_id NOT IN (SELECT campaign_id FROM campaigns);

-- Delete email_conversations that reference non-existent campaigns (if table exists)
DELETE FROM email_conversations 
WHERE campaign_id NOT IN (SELECT campaign_id FROM campaigns);

-- Step 2: Drop existing foreign key constraints
ALTER TABLE scheduled_emails 
DROP CONSTRAINT IF EXISTS scheduled_emails_campaign_id_fkey;

ALTER TABLE sent_emails 
DROP CONSTRAINT IF EXISTS sent_emails_campaign_id_fkey;

ALTER TABLE email_conversations 
DROP CONSTRAINT IF EXISTS email_conversations_campaign_id_fkey;

-- Step 3: Add new foreign key constraints with CASCADE delete
ALTER TABLE scheduled_emails 
ADD CONSTRAINT scheduled_emails_campaign_id_fkey 
FOREIGN KEY (campaign_id) 
REFERENCES campaigns(campaign_id) 
ON DELETE CASCADE;

ALTER TABLE sent_emails 
ADD CONSTRAINT sent_emails_campaign_id_fkey 
FOREIGN KEY (campaign_id) 
REFERENCES campaigns(campaign_id) 
ON DELETE CASCADE;

ALTER TABLE email_conversations 
ADD CONSTRAINT email_conversations_campaign_id_fkey 
FOREIGN KEY (campaign_id) 
REFERENCES campaigns(campaign_id) 
ON DELETE CASCADE;

-- Verification query
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('scheduled_emails', 'sent_emails', 'email_conversations')
ORDER BY tc.table_name;

