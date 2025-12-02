const { Pool } = require('pg');
require('dotenv').config();

async function debugConstraint() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check current constraints
    const constraints = await pool.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conrelid = 'landing_page_analytics'::regclass
    `);
    
    console.log('Current constraints:', constraints.rows);
    
    // Check for NULL session_ids
    const nullCheck = await pool.query('SELECT COUNT(*) FROM landing_page_analytics WHERE session_id IS NULL');
    console.log('Rows with NULL session_id:', nullCheck.rows[0].count);
    
    // Delete rows with NULL session_id if any
    if (parseInt(nullCheck.rows[0].count) > 0) {
      await pool.query('DELETE FROM landing_page_analytics WHERE session_id IS NULL');
      console.log('✅ Deleted rows with NULL session_id');
    }
    
    // Drop existing constraint if exists
    await pool.query('ALTER TABLE landing_page_analytics DROP CONSTRAINT IF EXISTS session_id_unique');
    
    // Add NOT NULL constraint first
    await pool.query('ALTER TABLE landing_page_analytics ALTER COLUMN session_id SET NOT NULL');
    
    // Then add UNIQUE constraint
    await pool.query('ALTER TABLE landing_page_analytics ADD CONSTRAINT session_id_unique UNIQUE (session_id)');
    
    console.log('✅ Fixed! Added UNIQUE constraint on session_id with NOT NULL');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugConstraint();

