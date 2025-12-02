const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function fixColumns() {
  console.log('🔧 Fixing landing_page_analytics columns...\n');

  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const sqlPath = path.join(__dirname, 'database', 'fix_landing_page_id.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🔗 Connecting to database...\n');
    await pool.query(sql);

    console.log('✅ Fixed successfully!\n');
    console.log('Changes:');
    console.log('  ✓ Added duration_seconds column');
    console.log('  ✓ Made landing_page_id nullable (frontend uses domain instead)');
    console.log('  ✓ Added index on domain column\n');
    console.log('🎉 All analytics errors should be fixed now!');

  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixColumns();

