/**
 * Check Available Users
 * This script shows what user IDs exist in your database
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkUsers() {
  console.log('🔍 Checking users table...\n');

  try {
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Users table does not exist in your database');
      console.log('\n💡 Options:');
      console.log('1. Remove the foreign key constraint from campaigns table');
      console.log('2. Create a users table');
      console.log('3. Use user_id from an existing auth system\n');
      await pool.end();
      return;
    }

    // Get all users
    const users = await pool.query('SELECT id, email, username, first_name FROM users ORDER BY id LIMIT 10');

    if (users.rows.length === 0) {
      console.log('⚠️  Users table exists but is EMPTY');
      console.log('\n📝 To create a test user, run:');
      console.log('INSERT INTO users (email, name) VALUES (\'test@example.com\', \'Test User\') RETURNING id;\n');
    } else {
      console.log('✅ Found users in database:\n');
      console.log('ID | Email | Username');
      console.log('-'.repeat(60));
      users.rows.forEach(user => {
        console.log(`${user.id} | ${user.email || 'N/A'} | ${user.username || user.first_name || 'N/A'}`);
      });
      console.log('\n💡 Use any of these user IDs when creating campaigns\n');
    }

    // Check campaigns table constraint
    const constraint = await pool.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'campaigns' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'user_id';
    `);

    if (constraint.rows.length > 0) {
      console.log('🔗 Foreign Key Info:');
      console.log(`   campaigns.user_id → ${constraint.rows[0].foreign_table_name}.${constraint.rows[0].foreign_column_name}`);
      console.log(`   Constraint: ${constraint.rows[0].constraint_name}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();

