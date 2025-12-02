const { Pool } = require('pg');
require('dotenv').config();

async function fixConstraint() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Drop the index and add a proper unique constraint
    await pool.query('DROP INDEX IF EXISTS idx_session_id_unique');
    await pool.query('ALTER TABLE landing_page_analytics ADD CONSTRAINT session_id_unique UNIQUE (session_id)');
    console.log('✅ Added UNIQUE constraint on session_id!');
  } catch (error) {
    // If constraint already exists, that's fine
    if (error.message.includes('already exists')) {
      console.log('✅ UNIQUE constraint already exists!');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await pool.end();
  }
}

fixConstraint();

