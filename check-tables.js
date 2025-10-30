/**
 * Check Database Table Structure
 * This script will show you the columns in your existing tables
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTableStructure() {
  console.log('🔍 Checking database table structure...\n');

  try {
    // Check scheduled_emails table
    console.log('📋 SCHEDULED_EMAILS TABLE:');
    console.log('='.repeat(60));
    const scheduledEmailsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'scheduled_emails'
      ORDER BY ordinal_position;
    `);
    
    if (scheduledEmailsColumns.rows.length > 0) {
      scheduledEmailsColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('  ⚠️  Table not found or has no columns');
    }

    // Check sent_emails table
    console.log('\n📋 SENT_EMAILS TABLE:');
    console.log('='.repeat(60));
    const sentEmailsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sent_emails'
      ORDER BY ordinal_position;
    `);
    
    if (sentEmailsColumns.rows.length > 0) {
      sentEmailsColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('  ⚠️  Table not found or has no columns');
    }

    // Check campaigns table
    console.log('\n📋 CAMPAIGNS TABLE:');
    console.log('='.repeat(60));
    const campaignsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'campaigns'
      ORDER BY ordinal_position;
    `);
    
    if (campaignsColumns.rows.length > 0) {
      campaignsColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('  ⚠️  Table not found or has no columns');
    }

    // Check campaign_buyers table
    console.log('\n📋 CAMPAIGN_BUYERS TABLE:');
    console.log('='.repeat(60));
    const buyersColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'campaign_buyers'
      ORDER BY ordinal_position;
    `);
    
    if (buyersColumns.rows.length > 0) {
      buyersColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('  ⚠️  Table not found or has no columns');
    }

    console.log('\n✅ Table structure check complete!\n');
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();

