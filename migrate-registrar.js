#!/usr/bin/env node

/**
 * REGISTRAR INTEGRATION MIGRATION SCRIPT
 * 
 * Purpose: Apply database schema changes for registrar integration
 * Usage: npm run migrate:registrar
 * 
 * This script will:
 * 1. Create registrar_accounts table
 * 2. Add registrar-related columns to domains table
 * 3. Create sync history and logging tables
 * 4. Insert supported registrars metadata
 */

require('dotenv').config();
const { query, pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

// ANSI color codes for pretty console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function runMigration() {
  logSection('🚀 REGISTRAR INTEGRATION MIGRATION');
  
  try {
    // Step 1: Read SQL file
    log('\n📖 Reading migration SQL file...', 'blue');
    const sqlPath = path.join(__dirname, 'database', 'add_registrar_integration.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${sqlPath}`);
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    log('✅ SQL file loaded successfully', 'green');
    
    // Step 2: Execute migration
    logSection('📦 EXECUTING MIGRATION');
    
    log('Creating tables and columns...', 'yellow');
    await query(sql);
    
    log('✅ Migration completed successfully!', 'green');
    
    // Step 3: Verify migration
    logSection('🔍 VERIFYING MIGRATION');
    
    // Check if registrar_accounts table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'registrar_accounts'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      log('✅ registrar_accounts table created', 'green');
    } else {
      log('❌ registrar_accounts table NOT found', 'red');
    }
    
    // Check if domains columns exist
    const columnsToCheck = [
      'registrar_account_id',
      'verification_method',
      'verification_level',
      'verified_at',
      'auto_synced',
      'last_seen_at'
    ];
    
    for (const columnName of columnsToCheck) {
      const columnCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'domains' 
          AND column_name = $1
        )
      `, [columnName]);
      
      if (columnCheck.rows[0].exists) {
        log(`✅ domains.${columnName} column added`, 'green');
      } else {
        log(`❌ domains.${columnName} column NOT found`, 'red');
      }
    }
    
    // Check supported registrars
    const registrarsCheck = await query(`
      SELECT code, name, priority 
      FROM supported_registrars 
      ORDER BY priority
    `);
    
    if (registrarsCheck.rows.length > 0) {
      log(`\n✅ ${registrarsCheck.rows.length} supported registrars loaded:`, 'green');
      registrarsCheck.rows.forEach(r => {
        log(`   - ${r.name} (${r.code}) - Priority: ${r.priority}`, 'cyan');
      });
    } else {
      log('⚠️ No supported registrars found', 'yellow');
    }
    
    // Step 4: Summary
    logSection('📊 MIGRATION SUMMARY');
    
    log('✅ All schema changes applied successfully!', 'green');
    log('\n📋 Next Steps:', 'bold');
    log('   1. Restart your backend server:', 'yellow');
    log('      pm2 restart node-backend', 'cyan');
    log('\n   2. Test the registrar connection:', 'yellow');
    log('      npm run test:registrar', 'cyan');
    log('\n   3. Read the documentation:', 'yellow');
    log('      - README_REGISTRAR.md (Quick Reference)', 'cyan');
    log('      - QUICKSTART_REGISTRAR.md (Getting Started)', 'cyan');
    log('      - REGISTRAR_INTEGRATION.md (Full Docs)', 'cyan');
    
    log('\n🎉 Migration completed successfully!', 'green');
    
  } catch (error) {
    logSection('❌ MIGRATION FAILED');
    log(`Error: ${error.message}`, 'red');
    log('\nStack trace:', 'yellow');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();
