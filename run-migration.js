/**
 * Database Migration Script
 * Adds 13 new columns to the generated_leads table
 */

const { query } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...\n');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_lead_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Loaded migration: add_lead_fields.sql');
    console.log('━'.repeat(60));
    
    // Execute the migration
    console.log('\n⏳ Executing migration...\n');
    await query(migrationSQL);
    
    console.log('\n━'.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Added columns:');
    console.log('   • first_name');
    console.log('   • last_name');
    console.log('   • full_name');
    console.log('   • job_title');
    console.log('   • seniority');
    console.log('   • company_domain');
    console.log('   • company_linkedin');
    console.log('   • company_phone');
    console.log('   • company_revenue_clean');
    console.log('   • company_total_funding');
    console.log('   • company_total_funding_clean');
    console.log('   • company_technologies');
    console.log('   • keywords');
    console.log('\n🎉 Database is now ready for lead generation!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    console.error('\n💡 Tip: Check if the database connection is working');
    console.error('💡 Tip: Verify that the generated_leads table exists\n');
    process.exit(1);
  }
}

runMigration();
