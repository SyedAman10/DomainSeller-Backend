const { Pool } = require('pg');
require('dotenv').config();

async function addInteractions() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query('ALTER TABLE landing_page_analytics ADD COLUMN IF NOT EXISTS interactions INTEGER DEFAULT 0');
    console.log('✅ Added interactions column!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addInteractions();

