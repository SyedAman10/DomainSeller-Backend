#!/usr/bin/env node

/**
 * Domain Transfer System Setup Script
 * 
 * This script:
 * 1. Runs the database migration for domain transfers
 * 2. Verifies the installation
 * 3. Tests basic functionality
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

async function setupDomainTransfers() {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 DOMAIN TRANSFER SYSTEM SETUP');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Check database connection
    console.log('📡 Step 1: Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully\n');

    // Step 2: Run migration
    console.log('📋 Step 2: Running database migration...');
    const migrationPath = path.join(__dirname, 'database', 'add_domain_transfers.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(migrationSQL);
    console.log('✅ Database migration completed\n');

    // Step 3: Verify tables created
    console.log('🔍 Step 3: Verifying tables...');
    
    const tables = [
      'domain_transfers',
      'domain_transfer_logs',
      'domains'
    ];

    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);

      if (result.rows[0].exists) {
        console.log(`   ✅ Table "${table}" exists`);
      } else {
        console.log(`   ❌ Table "${table}" NOT found`);
      }
    }
    console.log('');

    // Step 4: Check domains table columns
    console.log('🔍 Step 4: Verifying domains table columns...');
    
    const domainColumns = [
      'transfer_locked',
      'auth_code',
      'registrar',
      'verification_code',
      'ownership_verified'
    ];

    for (const column of domainColumns) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'domains' 
          AND column_name = $1
        );
      `, [column]);

      if (result.rows[0].exists) {
        console.log(`   ✅ Column "domains.${column}" exists`);
      } else {
        console.log(`   ⚠️  Column "domains.${column}" NOT found (may be added separately)`);
      }
    }
    console.log('');

    // Step 5: Check views
    console.log('🔍 Step 5: Verifying views...');
    const viewResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'active_transfers'
      );
    `);

    if (viewResult.rows[0].exists) {
      console.log('   ✅ View "active_transfers" created\n');
    } else {
      console.log('   ⚠️  View "active_transfers" NOT found\n');
    }

    // Step 6: Test basic queries
    console.log('🧪 Step 6: Testing basic queries...');
    
    try {
      await pool.query('SELECT COUNT(*) FROM domain_transfers');
      console.log('   ✅ Can query domain_transfers table');
    } catch (err) {
      console.log('   ❌ Error querying domain_transfers:', err.message);
    }

    try {
      await pool.query('SELECT COUNT(*) FROM domain_transfer_logs');
      console.log('   ✅ Can query domain_transfer_logs table');
    } catch (err) {
      console.log('   ❌ Error querying domain_transfer_logs:', err.message);
    }

    try {
      await pool.query('SELECT * FROM active_transfers LIMIT 1');
      console.log('   ✅ Can query active_transfers view');
    } catch (err) {
      console.log('   ❌ Error querying active_transfers:', err.message);
    }
    console.log('');

    // Step 7: Summary
    console.log('='.repeat(70));
    console.log('✅ SETUP COMPLETE!');
    console.log('='.repeat(70));
    console.log('');
    console.log('📚 Next Steps:');
    console.log('');
    console.log('1. Install npm dependencies:');
    console.log('   npm install whois-json');
    console.log('');
    console.log('2. Restart your server:');
    console.log('   npm run dev');
    console.log('');
    console.log('3. Test the API endpoints:');
    console.log('   curl http://localhost:5000/backend/health');
    console.log('   curl http://localhost:5000/backend/domains/user/11');
    console.log('');
    console.log('4. Read the complete guide:');
    console.log('   cat DOMAIN_TRANSFER_GUIDE.md');
    console.log('');
    console.log('📋 Available Endpoints:');
    console.log('   POST   /backend/domains/add');
    console.log('   POST   /backend/domains/:domainId/verify');
    console.log('   GET    /backend/domains/:domainId/transfer-lock');
    console.log('   POST   /backend/domains/:domainId/check-transfer-ready');
    console.log('   POST   /backend/domains/initiate-transfer');
    console.log('   GET    /backend/domains/transfers/:transferId');
    console.log('   PUT    /backend/domains/transfers/:transferId/status');
    console.log('   GET    /backend/domains/user/:userId');
    console.log('   GET    /backend/domains/transfers/user/:userId');
    console.log('');
    console.log('🎉 Domain Transfer System is ready to use!');
    console.log('');

  } catch (error) {
    console.error('\n❌ SETUP FAILED:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup
setupDomainTransfers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

