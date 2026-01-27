/**
 * ============================================================
 * REGISTRAR INTEGRATION MIGRATION SCRIPT
 * ============================================================
 * 
 * Purpose: Automatically run the registrar integration migration
 * Usage: node migrate-registrar.js
 * 
 * What it does:
 * - Creates registrar_accounts table
 * - Creates registrar_sync_history table
 * - Creates domain_verification_log table
 * - Creates registrar_rate_limits table
 * - Creates supported_registrars table
 * - Adds verification columns to domains table
 * - Creates domain_verification_tokens table
 * - Populates initial registrar data
 * ============================================================
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./config/database');

async function runMigration() {
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('🔄 REGISTRAR INTEGRATION MIGRATION');
  console.log('════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Check if database connection is available
    console.log('📊 Testing database connection...');
    await query('SELECT NOW()');
    console.log('✅ Database connected');
    console.log('');

    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'add_registrar_integration.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    console.log('📄 Reading migration file...');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`✅ Migration file loaded (${migrationSQL.length} characters)`);
    console.log('');

    // Execute migration
    console.log('🚀 Running migration...');
    console.log('');
    
    await query(migrationSQL);
    
    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Verify tables were created
    console.log('🔍 Verifying created tables...');
    
    const tables = [
      'registrar_accounts',
      'registrar_sync_history',
      'domain_verification_log',
      'registrar_rate_limits',
      'supported_registrars',
      'domain_verification_tokens'
    ];

    for (const table of tables) {
      const result = await query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );

      if (result.rows[0].exists) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} (not found!)`);
      }
    }

    console.log('');

    // Check domains table columns
    console.log('🔍 Verifying domains table columns...');
    
    const columns = [
      'registrar_account_id',
      'verification_method',
      'verification_level',
      'verified_at',
      'auto_synced',
      'last_seen_at'
    ];

    const columnResult = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'domains' 
        AND column_name = ANY($1::text[])
    `, [columns]);

    const foundColumns = columnResult.rows.map(r => r.column_name);
    
    for (const col of columns) {
      if (foundColumns.includes(col)) {
        console.log(`   ✅ ${col}`);
      } else {
        console.log(`   ⚠️  ${col} (not found - may already exist with different name)`);
      }
    }

    console.log('');

    // Check supported registrars data
    console.log('🔍 Checking supported registrars...');
    const registrarsResult = await query('SELECT code, name FROM supported_registrars ORDER BY priority');
    
    if (registrarsResult.rows.length > 0) {
      console.log(`   ✅ Found ${registrarsResult.rows.length} registrar(s):`);
      registrarsResult.rows.forEach(r => {
        console.log(`      • ${r.name} (${r.code})`);
      });
    } else {
      console.log('   ⚠️  No registrars found (may need manual insert)');
    }

    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('🎉 SETUP COMPLETE!');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('');
    console.log('1. Generate encryption key:');
    console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.log('');
    console.log('2. Add to .env:');
    console.log('   ENCRYPTION_KEY=<generated_key>');
    console.log('');
    console.log('3. Restart server:');
    console.log('   npm start');
    console.log('');
    console.log('4. Test the system:');
    console.log('   npm run test:registrar');
    console.log('');
    console.log('5. Connect a registrar:');
    console.log('   POST /backend/registrar/connect');
    console.log('');
    console.log('📚 Documentation:');
    console.log('   • REGISTRAR_INTEGRATION.md - Complete guide');
    console.log('   • QUICKSTART_REGISTRAR.md - Quick setup');
    console.log('   • README_REGISTRAR.md - Quick reference');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('════════════════════════════════════════════════════════════');
    console.error('❌ MIGRATION FAILED');
    console.error('════════════════════════════════════════════════════════════');
    console.error('');
    console.error('Error:', error.message);
    console.error('');

    if (error.message.includes('already exists')) {
      console.log('ℹ️  Some tables may already exist. This is usually safe.');
      console.log('   The migration uses IF NOT EXISTS for safety.');
      console.log('');
      console.log('   To force re-run migration:');
      console.log('   1. Backup your data');
      console.log('   2. Drop tables manually');
      console.log('   3. Run migration again');
      console.log('');
    } else if (error.message.includes('permission denied')) {
      console.log('ℹ️  Database permission issue.');
      console.log('   Make sure your database user has CREATE TABLE permissions.');
      console.log('');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('ℹ️  Database connection issue.');
      console.log('   Check your DATABASE_URL in .env file.');
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

// Run migration
console.log('');
console.log('Starting registrar integration migration...');
console.log('');

runMigration();
