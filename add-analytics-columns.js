const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function addColumns() {
  console.log('🔧 Adding missing columns to landing_page_analytics...\n');

  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const sqlPath = path.join(__dirname, 'database', 'add_missing_analytics_columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`📄 SQL file loaded: ${sqlPath}`);

    console.log('🔗 Connecting to database...\n');
    await pool.query(sql);

    console.log('✅ Columns added successfully!\n');
    console.log('New columns:');
    console.log('  ✓ event_type (VARCHAR 100)');
    console.log('  ✓ page_type (VARCHAR 100)');
    console.log('  ✓ user_agent (TEXT)');
    console.log('  ✓ language (VARCHAR 10)');
    console.log('  ✓ timezone (VARCHAR 50)\n');
    console.log('🎉 Frontend should now work without errors!');

  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addColumns();

