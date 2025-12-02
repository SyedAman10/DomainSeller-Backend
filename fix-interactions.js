const { Pool } = require('pg');
require('dotenv').config();

async function fixInteractions() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Drop default, then change type
    await pool.query('ALTER TABLE landing_page_analytics ALTER COLUMN interactions DROP DEFAULT');
    await pool.query('ALTER TABLE landing_page_analytics ALTER COLUMN interactions TYPE JSONB USING CASE WHEN interactions IS NULL THEN \'[]\'::jsonb ELSE interactions::text::jsonb END');
    await pool.query('ALTER TABLE landing_page_analytics ALTER COLUMN interactions SET DEFAULT \'[]\'::jsonb');
    console.log('✅ Changed interactions to JSONB!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixInteractions();
