const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Run Stripe Database Migration
 * This script adds the necessary Stripe columns to the users table
 */

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runMigration() {
    console.log('🔧 Starting Stripe database migration...\n');

    try {
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'database', 'add_stripe_support.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📄 SQL file loaded:', sqlPath);
        console.log('🔗 Connecting to database...');

        // Execute the migration
        const result = await pool.query(sql);

        console.log('\n✅ Migration completed successfully!');
        console.log('\nChanges made:');
        console.log('  ✓ Added stripe_account_id column to users table');
        console.log('  ✓ Added stripe_enabled column to users table');
        console.log('  ✓ Added stripe_onboarding_completed column to users table');
        console.log('  ✓ Created stripe_payments table');
        console.log('  ✓ Created stripe_approvals table');
        console.log('  ✓ Created necessary indexes');
        console.log('\n🎉 Your database is now ready for Stripe Connect!\n');

    } catch (error) {
        console.error('\n❌ Migration failed:');
        console.error(error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the migration
runMigration();
