require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    // Get users table columns
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('USERS TABLE COLUMNS:');
    cols.rows.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
    
    // Get sample user
    const users = await pool.query('SELECT * FROM users LIMIT 1');
    console.log('\nSAMPLE USER:');
    console.log(JSON.stringify(users.rows[0], null, 2));
    
  } catch (err) {
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

check();

