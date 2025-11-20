/**
 * Setup Escrow Approvals Table
 * Automatically creates the escrow_approvals table in your database
 */

const { query } = require('./config/database');
require('dotenv').config();

async function setupEscrowApprovals() {
  console.log('🔧 Setting up escrow_approvals table...\n');

  try {
    // Create escrow_approvals table
    console.log('📋 Creating escrow_approvals table...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS escrow_approvals (
        id SERIAL PRIMARY KEY,
        campaign_id VARCHAR(255) NOT NULL,
        buyer_email VARCHAR(255) NOT NULL,
        buyer_name VARCHAR(255),
        domain_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        seller_email VARCHAR(255),
        seller_name VARCHAR(255),
        fee_payer VARCHAR(20) DEFAULT 'buyer',
        status VARCHAR(50) DEFAULT 'pending',
        user_id INTEGER,
        approved_at TIMESTAMP,
        approved_by INTEGER,
        escrow_transaction_id VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Table created successfully!');

    // Create indexes
    console.log('\n📊 Creating indexes...');
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_escrow_approvals_status 
      ON escrow_approvals(status)
    `);
    console.log('  ✅ Status index created');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_escrow_approvals_campaign 
      ON escrow_approvals(campaign_id)
    `);
    console.log('  ✅ Campaign index created');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_escrow_approvals_user 
      ON escrow_approvals(user_id)
    `);
    console.log('  ✅ User index created');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_escrow_approvals_created 
      ON escrow_approvals(created_at DESC)
    `);
    console.log('  ✅ Created date index created');

    // Verify table exists
    console.log('\n🔍 Verifying table...');
    const result = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'escrow_approvals'
      ORDER BY ordinal_position
    `);

    if (result.rows.length > 0) {
      console.log('✅ Table structure verified:');
      result.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nThe escrow_approvals table is ready to use!');
    console.log('\n✅ Notifications will automatically use your account email!');
    console.log('\nNext steps:');
    console.log('1. Restart your server: npm start');
    console.log('2. Test by sending email requesting payment');
    console.log('3. Check your email for approval notifications!');
    console.log('\nNote: Notifications will be sent to the email in your users table.');
    console.log('To use a different email, set notification_email on your campaigns.');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nDetails:', error);
    
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('\n⚠️  Missing dependency table. Make sure the users table exists first.');
    }
    
    console.log('\nIf you continue to have issues:');
    console.log('1. Check your database connection in .env');
    console.log('2. Make sure the users table exists');
    console.log('3. Run: node setup-escrow.js first (for other tables)');
    
    process.exit(1);
  }

  process.exit(0);
}

// Run setup
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 Escrow Approvals Table Setup');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log();

setupEscrowApprovals();

