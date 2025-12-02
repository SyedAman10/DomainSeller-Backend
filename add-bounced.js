const { Pool } = require('pg');
require('dotenv').config();

async function addBounced() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query('ALTER TABLE landing_page_analytics ADD COLUMN IF NOT EXISTS bounced BOOLEAN DEFAULT false');
    console.log('✅ Added bounced column!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addBounced();

