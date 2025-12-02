const { Pool } = require('pg');
require('dotenv').config();

async function addAction() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query('ALTER TABLE landing_page_analytics ADD COLUMN IF NOT EXISTS action VARCHAR(255)');
    console.log('✅ Added action column!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addAction();

