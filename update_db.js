const { Client } = require('pg');
const connectionString = 'postgresql://neondb_owner:npg_DMS1obqeA0gx@ep-wild-voice-a5pk94wz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function updateSchema() {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        console.log('Dropping old constraint...');
        await client.query('ALTER TABLE generated_leads DROP CONSTRAINT IF EXISTS generated_leads_email_website_key');

        console.log('Adding new per-user unique constraint...');
        // We use COALESCE for email and website because they might be null, but UNIQUE constraints handle NULLs differently.
        // In Postgres, UNIQUE (email, website, user_id) allows multiple rows where email is null.
        // However, the INSERT query uses (email, website) as conflict target.
        // If we want per-user unique leads, we should include user_id.
        await client.query('ALTER TABLE generated_leads ADD CONSTRAINT fetched_leads_unique_user_lead UNIQUE (email, website, user_id)');

        console.log('Schema updated successfully!');
    } catch (err) {
        console.error('Error updating schema:', err);
    } finally {
        await client.end();
    }
}

updateSchema();
