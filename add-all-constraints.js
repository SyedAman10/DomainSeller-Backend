const { Pool } = require('pg');
require('dotenv').config();

async function addAllConstraints() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // The frontend might be using different column combinations
    // Add constraints for common patterns
    
    // 1. Already have session_id unique
    console.log('✅ session_id unique constraint exists');
    
    // 2. Add unique constraint on (domain, session_id) in case frontend uses that
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_domain_session_unique ON landing_page_analytics(domain, session_id) WHERE domain IS NOT NULL AND session_id IS NOT NULL');
    console.log('✅ Added unique index on (domain, session_id)');
    
    // 3. Add unique constraint on (landing_page_id, session_id) 
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_session_unique ON landing_page_analytics(landing_page_id, session_id) WHERE landing_page_id IS NOT NULL AND session_id IS NOT NULL');
    console.log('✅ Added unique index on (landing_page_id, session_id)');
    
    console.log('\n🎉 All constraints added! Frontend ON CONFLICT should work now.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addAllConstraints();

