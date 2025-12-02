const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function addTimestamp() {
  console.log('🔧 Adding timestamp column...\n');

  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const sqlPath = path.join(__dirname, 'database', 'add_timestamp_column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🔗 Connecting to database...\n');
    await pool.query(sql);

    console.log('✅ Column added successfully!\n');
    console.log('New columns:');
    console.log('  ✓ timestamp (TIMESTAMP)');
    console.log('  ✓ event_data (JSONB)');
    console.log('  ✓ metadata (JSONB)\n');
    console.log('🎉 Should work now!');

  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addTimestamp();

