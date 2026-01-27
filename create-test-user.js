/**
 * ============================================================
 * CREATE TEST USER SCRIPT
 * ============================================================
 * 
 * Purpose: Create a test user for registrar integration testing
 * Usage: node create-test-user.js
 * ============================================================
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { query } = require('./config/database');

async function createTestUser() {
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('👤 CREATING TEST USER');
  console.log('════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Test user details
    const testUser = {
      email: 'test@3vltn.com',
      password: 'test123',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser'
    };

    console.log('📋 Test User Details:');
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Password: ${testUser.password}`);
    console.log(`   Username: ${testUser.username}`);
    console.log('');

    // Check if user already exists
    console.log('🔍 Checking if user already exists...');
    const existingUser = await query(
      'SELECT id, email, username FROM users WHERE email = $1 OR username = $2',
      [testUser.email, testUser.username]
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ Test user already exists!');
      console.log(`   User ID: ${existingUser.rows[0].id}`);
      console.log(`   Email: ${existingUser.rows[0].email}`);
      console.log(`   Username: ${existingUser.rows[0].username}`);
      console.log('');
      console.log('💡 Use this user ID for testing:');
      console.log(`   X-User-Id: ${existingUser.rows[0].id}`);
      console.log('');
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    console.log('✅ Password hashed');
    console.log('');

    // Create user
    console.log('👤 Creating test user...');
    const result = await query(
      `INSERT INTO users 
        (email, password, first_name, last_name, username, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, email, username, first_name, last_name`,
      [
        testUser.email,
        hashedPassword,
        testUser.firstName,
        testUser.lastName,
        testUser.username
      ]
    );

    const newUser = result.rows[0];

    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ TEST USER CREATED SUCCESSFULLY!');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 User Details:');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Username: ${newUser.username}`);
    console.log(`   Name: ${newUser.first_name} ${newUser.last_name}`);
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Password: ${testUser.password}`);
    console.log('');
    console.log('🧪 For API Testing, use this header:');
    console.log(`   X-User-Id: ${newUser.id}`);
    console.log('');
    console.log('📝 Example API Call:');
    console.log(`   curl -X POST https://api.3vltn.com/backend/registrar/connect \\`);
    console.log(`     -H "X-User-Id: ${newUser.id}" \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"registrar":"godaddy","apiKey":"YOUR_KEY","apiSecret":"YOUR_SECRET"}'`);
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('════════════════════════════════════════════════════════════');
    console.error('❌ FAILED TO CREATE TEST USER');
    console.error('════════════════════════════════════════════════════════════');
    console.error('');
    console.error('Error:', error.message);
    console.error('');

    if (error.message.includes('duplicate key')) {
      console.log('ℹ️  User might already exist. Try checking:');
      console.log('   SELECT id, email, username FROM users;');
      console.log('');
    } else if (error.message.includes('relation "users" does not exist')) {
      console.log('ℹ️  Users table does not exist.');
      console.log('   You may need to run migrations first.');
      console.log('');
    }

    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
      console.error('');
    }

    process.exit(1);
  }
}

// Run
console.log('');
console.log('Starting test user creation...');
console.log('');

createTestUser();
