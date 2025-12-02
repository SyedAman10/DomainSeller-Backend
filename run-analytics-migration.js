const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('🔧 Starting analytics database migration...\n');

  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'database', 'add_analytics_support.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`📄 SQL file loaded: ${sqlPath}`);

    // Split SQL by semicolons and execute each statement
    console.log('🔗 Connecting to database...\n');
    
    // Execute SQL as single statement (CREATE TABLE IF NOT EXISTS should handle duplicates)
    await pool.query(sql);

    console.log('✅ Migration completed successfully!\n');
    console.log('Changes made:');
    console.log('  ✓ Created landing_pages table');
    console.log('  ✓ Created landing_page_visits table');
    console.log('  ✓ Created necessary indexes');
    console.log('  ✓ Created updated_at triggers\n');
    console.log('🎉 Your database is now ready for analytics tracking!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

