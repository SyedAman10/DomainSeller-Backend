const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runFix() {
  console.log('🔧 Fixing analytics table name...\n');

  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'database', 'fix_analytics_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`📄 SQL file loaded: ${sqlPath}`);

    console.log('🔗 Connecting to database...\n');
    await pool.query(sql);

    console.log('✅ Fix completed successfully!\n');
    console.log('Changes made:');
    console.log('  ✓ Created landing_page_analytics table (frontend expects this name)');
    console.log('  ✓ Copied data from landing_page_visits if it existed\n');
    console.log('🎉 Your frontend should now work correctly!');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runFix();

