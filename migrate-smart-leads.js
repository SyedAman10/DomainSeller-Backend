/**
 * Migration Script: Smart Lead Generation System
 * 
 * This script sets up the database for the smart lead generation system
 * Run this once to create the necessary tables and indexes
 */

const { query } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('\n🚀 Running Smart Lead Generation Migration...\n');

  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'database', 'create_generated_leads.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Executing SQL migration...');
    
    // Execute the migration
    await query(sql);

    console.log('✅ Tables created successfully');
    console.log('✅ Indexes created successfully');
    console.log('✅ Triggers created successfully');

    // Test the table by checking if it exists
    const testResult = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'generated_leads'
    `);

    if (parseInt(testResult.rows[0].count) > 0) {
      console.log('✅ Verified: generated_leads table exists');
      
      // Get column count
      const columnResult = await query(`
        SELECT COUNT(*) as column_count 
        FROM information_schema.columns 
        WHERE table_name = 'generated_leads'
      `);
      
      console.log(`✅ Table has ${columnResult.rows[0].column_count} columns`);
      
      // Get index count
      const indexResult = await query(`
        SELECT COUNT(*) as index_count 
        FROM pg_indexes 
        WHERE tablename = 'generated_leads'
      `);
      
      console.log(`✅ Table has ${indexResult.rows[0].index_count} indexes`);
      
    } else {
      throw new Error('Table verification failed');
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Make sure APIFY_API_KEY is set in your .env file');
    console.log('2. Restart your server: pm2 restart all');
    console.log('3. Test the endpoint: POST /backend/leads/generate');
    console.log('\n📚 Read SMART_LEAD_GENERATION_API.md for full documentation\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\nDetails:', error.message);
    
    if (error.code === '42P07') {
      console.log('\n⚠️  Table already exists. This is OK if you\'ve run this before.');
      console.log('   To reset, run: DROP TABLE generated_leads CASCADE;');
    }

    process.exit(1);
  }
}

// Run migration
runMigration();

