/**
 * Setup Escrow Integration
 * This script sets up the database tables for escrow functionality
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupEscrow() {
  console.log('🔧 ESCROW INTEGRATION SETUP');
  console.log('═'.repeat(60));
  console.log('');

  try {
    // Read the SQL migration file
    const sqlFile = path.join(__dirname, 'database', 'add_escrow_support.sql');
    
    if (!fs.existsSync(sqlFile)) {
      throw new Error('Migration file not found: ' + sqlFile);
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📂 Running database migration...');
    console.log('   File: database/add_escrow_support.sql');
    console.log('');

    // Execute the SQL
    await pool.query(sql);

    console.log('✅ Database migration completed successfully!');
    console.log('');
    console.log('📋 Created/Updated:');
    console.log('   - users table (added escrow columns)');
    console.log('   - campaigns table (added escrow columns)');
    console.log('   - escrow_transactions table (new)');
    console.log('');

    // Verify tables exist
    console.log('🔍 Verifying tables...');
    
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('users', 'campaigns', 'escrow_transactions')
      ORDER BY table_name
    `);

    console.log('');
    console.log('✅ Tables verified:');
    tablesCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check escrow columns
    console.log('');
    console.log('🔍 Checking escrow columns...');

    const columnsCheck = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          column_name LIKE 'escrow%' 
          OR column_name = 'asking_price'
        )
      ORDER BY table_name, column_name
    `);

    console.log('');
    console.log('✅ Escrow columns:');
    let currentTable = '';
    columnsCheck.rows.forEach(row => {
      if (row.table_name !== currentTable) {
        console.log(`\n   ${row.table_name}:`);
        currentTable = row.table_name;
      }
      console.log(`     ✓ ${row.column_name} (${row.data_type})`);
    });

    console.log('');
    console.log('═'.repeat(60));
    console.log('🎉 ESCROW INTEGRATION SETUP COMPLETE!');
    console.log('═'.repeat(60));
    console.log('');
    console.log('📖 Next Steps:');
    console.log('');
    console.log('1. (Optional) Add Escrow.com credentials to .env:');
    console.log('   ESCROW_EMAIL=your-email@example.com');
    console.log('   ESCROW_API_KEY=your_api_key');
    console.log('');
    console.log('2. Connect user escrow accounts:');
    console.log('   POST /backend/escrow/connect');
    console.log('');
    console.log('3. Set campaign asking prices:');
    console.log('   PUT /backend/escrow/campaign/:campaignId/settings');
    console.log('');
    console.log('4. Test it! Have a buyer ask: "How can I pay?"');
    console.log('   The AI will automatically send an escrow link!');
    console.log('');
    console.log('📚 Read ESCROW_INTEGRATION_GUIDE.md for full details');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR SETTING UP ESCROW:');
    console.error('═'.repeat(60));
    console.error(error.message);
    console.error('');
    console.error('Stack:', error.stack);
    console.error('');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupEscrow();

