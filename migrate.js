#!/usr/bin/env node
/**
 * Database Migration Runner
 * 
 * Usage:
 *   node migrate.js
 *   npm run migrate
 * 
 * This script runs all pending database migrations
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create database connection pool
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Log with colors
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  await pool.query(query);
  log('✓ Migrations tracking table ready', 'green');
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations() {
  try {
    const result = await pool.query(
      'SELECT filename FROM schema_migrations ORDER BY applied_at ASC'
    );
    return result.rows.map(row => row.filename);
  } catch (error) {
    return [];
  }
}

/**
 * Get list of migration files
 */
function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, 'database');
  
  if (!fs.existsSync(migrationsDir)) {
    log('✗ Database migrations directory not found!', 'red');
    return [];
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Alphabetical order
  
  return files;
}

/**
 * Run a single migration file
 */
async function runMigration(filename) {
  const filepath = path.join(__dirname, 'database', filename);
  const sql = fs.readFileSync(filepath, 'utf8');
  
  log(`\n→ Running: ${filename}`, 'cyan');
  
  try {
    // Begin transaction
    await pool.query('BEGIN');
    
    // Execute migration SQL
    await pool.query(sql);
    
    // Record migration
    await pool.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    );
    
    // Commit transaction
    await pool.query('COMMIT');
    
    log(`✓ Success: ${filename}`, 'green');
    return true;
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    log(`✗ Failed: ${filename}`, 'red');
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  log('\n' + '='.repeat(60), 'bright');
  log('DATABASE MIGRATION', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  
  try {
    // Test database connection
    log('→ Testing database connection...', 'cyan');
    await pool.query('SELECT NOW()');
    log('✓ Connected to database', 'green');
    
    // Create migrations table
    log('\n→ Setting up migrations tracking...', 'cyan');
    await createMigrationsTable();
    
    // Get migrations
    const appliedMigrations = await getAppliedMigrations();
    const allMigrations = getMigrationFiles();
    
    if (allMigrations.length === 0) {
      log('\n⚠ No migration files found!', 'yellow');
      return;
    }
    
    log(`\n→ Found ${allMigrations.length} migration file(s)`, 'cyan');
    log(`→ Already applied: ${appliedMigrations.length}`, 'cyan');
    
    // Find pending migrations
    const pendingMigrations = allMigrations.filter(
      file => !appliedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      log('\n✓ All migrations are up to date!', 'green');
      log('='.repeat(60) + '\n', 'bright');
      return;
    }
    
    log(`\n→ Pending migrations: ${pendingMigrations.length}`, 'yellow');
    log('─'.repeat(60), 'bright');
    
    // Run pending migrations
    let successCount = 0;
    let failCount = 0;
    
    for (const migration of pendingMigrations) {
      const success = await runMigration(migration);
      if (success) {
        successCount++;
      } else {
        failCount++;
        break; // Stop on first error
      }
    }
    
    // Summary
    log('\n' + '─'.repeat(60), 'bright');
    log('MIGRATION SUMMARY', 'bright');
    log('─'.repeat(60), 'bright');
    log(`✓ Successful: ${successCount}`, 'green');
    if (failCount > 0) {
      log(`✗ Failed: ${failCount}`, 'red');
    }
    log('='.repeat(60) + '\n', 'bright');
    
    if (failCount > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    log('\n✗ Migration failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    log(error.stack, 'red');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Show migration status
 */
async function status() {
  log('\n' + '='.repeat(60), 'bright');
  log('MIGRATION STATUS', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  
  try {
    await pool.query('SELECT NOW()');
    log('✓ Database connected', 'green');
    
    await createMigrationsTable();
    
    const applied = await getAppliedMigrations();
    const all = getMigrationFiles();
    const pending = all.filter(f => !applied.includes(f));
    
    log(`\n📊 Status:`, 'cyan');
    log(`   Total migrations: ${all.length}`);
    log(`   Applied: ${applied.length}`, 'green');
    log(`   Pending: ${pending.length}`, pending.length > 0 ? 'yellow' : 'green');
    
    if (applied.length > 0) {
      log(`\n✓ Applied migrations:`, 'green');
      applied.forEach(m => log(`   - ${m}`, 'green'));
    }
    
    if (pending.length > 0) {
      log(`\n⏳ Pending migrations:`, 'yellow');
      pending.forEach(m => log(`   - ${m}`, 'yellow'));
    }
    
    log('\n' + '='.repeat(60) + '\n', 'bright');
    
  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'red');
  } finally {
    await pool.end();
  }
}

/**
 * Rollback last migration
 */
async function rollback() {
  log('\n⚠️  ROLLBACK NOT IMPLEMENTED', 'yellow');
  log('Manual rollback required for safety', 'yellow');
  log('Please create a new migration to undo changes\n', 'yellow');
  process.exit(0);
}

// CLI handling
const command = process.argv[2];

switch (command) {
  case 'status':
    status();
    break;
  case 'rollback':
    rollback();
    break;
  case 'up':
  case 'migrate':
  default:
    migrate();
    break;
}

