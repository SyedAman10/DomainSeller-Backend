/**
 * Add User ID Migration Script
 * Adds user_id column to generated_leads table for multi-tenant support
 */

const { query } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function addUserIdMigration() {
  try {
    console.log('🔄 Starting user_id migration...\n');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add_user_id_to_generated_leads.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Loaded migration: add_user_id_to_generated_leads.sql');
    console.log('━'.repeat(60));
    
    // Execute the migration
    console.log('\n⏳ Executing migration...\n');
    await query(migrationSQL);
    
    console.log('\n━'.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Changes made:');
    console.log('   • Added user_id column to generated_leads');
    console.log('   • Added foreign key constraint to users table');
    console.log('   • Created indexes for user_id queries');
    console.log('   • Assigned existing leads to user_id = 1');
    console.log('\n🔐 Multi-tenant support is now enabled!');
    console.log('   Each user will only see their own generated leads.\n');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    const verifyResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'generated_leads' AND column_name = 'user_id'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification successful: user_id column exists');
      console.log(`   Type: ${verifyResult.rows[0].data_type}`);
      console.log(`   Nullable: ${verifyResult.rows[0].is_nullable}`);
    } else {
      console.log('⚠️  Warning: Could not verify user_id column');
    }
    
    // Count leads by user
    console.log('\n📈 Lead distribution:');
    const statsResult = await query(`
      SELECT 
        user_id, 
        COUNT(*) as lead_count 
      FROM generated_leads 
      GROUP BY user_id 
      ORDER BY user_id
    `);
    
    if (statsResult.rows.length > 0) {
      statsResult.rows.forEach(row => {
        console.log(`   User ${row.user_id || 'NULL'}: ${row.lead_count} leads`);
      });
    } else {
      console.log('   No leads in database yet');
    }
    
    console.log('\n✨ Done! You can now use userId filtering in your API calls.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    console.error('\n💡 Troubleshooting tips:');
    console.error('   • Check if database connection is working');
    console.error('   • Verify that generated_leads table exists');
    console.error('   • Ensure users table exists (foreign key requirement)');
    console.error('   • Check if user_id column already exists (rerun safe)\n');
    process.exit(1);
  }
}

addUserIdMigration();
