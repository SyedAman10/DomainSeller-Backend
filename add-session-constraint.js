const { Pool } = require('pg');
require('dotenv').config();

async function addUniqueConstraint() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Add unique constraint on session_id for ON CONFLICT to work
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_session_id_unique ON landing_page_analytics(session_id)');
    console.log('✅ Added unique constraint on session_id!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addUniqueConstraint();

