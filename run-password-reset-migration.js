const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('🔧 Starting password reset database migration...\n');

  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'database', 'add_password_reset.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`📄 SQL file loaded: ${sqlPath}`);

    // Connect to database
    console.log('🔗 Connecting to database...\n');
    await pool.query(sql);

    console.log('✅ Migration completed successfully!\n');
    console.log('Changes made:');
    console.log('  ✓ Added password_hash column to users table');
    console.log('  ✓ Added reset_token column to users table');
    console.log('  ✓ Added reset_token_expires column to users table');
    console.log('  ✓ Created necessary indexes');
    console.log('  ✓ Created updated_at trigger\n');
    console.log('🎉 Your database is now ready for password reset functionality!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

