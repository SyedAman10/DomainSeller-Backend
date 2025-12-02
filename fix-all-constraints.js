const { Pool } = require('pg');
require('dotenv').config();

async function fixAll() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Removing all unique constraints and rebuilding...\n');
    
    // Drop ALL existing unique constraints/indexes
    await pool.query('DROP INDEX IF EXISTS idx_domain_session_unique CASCADE');
    await pool.query('DROP INDEX IF EXISTS idx_landing_session_unique CASCADE');
    await pool.query('DROP INDEX IF EXISTS idx_session_id_unique CASCADE');
    await pool.query('ALTER TABLE landing_page_analytics DROP CONSTRAINT IF EXISTS session_id_unique CASCADE');
    
    console.log('✅ Removed old constraints');
    
    // Make session_id nullable again (in case it has NULLs)
    await pool.query('ALTER TABLE landing_page_analytics ALTER COLUMN session_id DROP NOT NULL');
    
    // Create simple unique index on session_id that allows NULLs
    await pool.query('CREATE UNIQUE INDEX idx_session_unique ON landing_page_analytics (session_id) WHERE session_id IS NOT NULL');
    
    console.log('✅ Created unique index on session_id (allows NULLs)');
    
    // Also create composite indexes without WHERE clause for other patterns
    await pool.query('CREATE UNIQUE INDEX idx_domain_session ON landing_page_analytics (domain, session_id) NULLS NOT DISTINCT');
    
    console.log('✅ Created composite unique index on (domain, session_id)');
    
    console.log('\n🎉 Should work now! Try again.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixAll();

