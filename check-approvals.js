// Check if payment links were actually created
require('dotenv').config();
const { query } = require('./config/database');

async function checkApprovals() {
  console.log('\n🔍 CHECKING RECENT APPROVALS\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    const result = await query(`
      SELECT 
        id,
        domain_name,
        amount,
        status,
        payment_link_id,
        created_at,
        updated_at
      FROM stripe_approvals
      WHERE id IN (13, 14, 15)
      ORDER BY id DESC
    `);
    
    console.log(`Found ${result.rows.length} recent approvals:\n`);
    
    result.rows.forEach(approval => {
      console.log(`📋 Approval #${approval.id}`);
      console.log(`   Domain: ${approval.domain_name}`);
      console.log(`   Amount: $${approval.amount}`);
      console.log(`   Status: ${approval.status}`);
      console.log(`   Payment Link ID: ${approval.payment_link_id || '❌ NOT SET'}`);
      console.log(`   Created: ${approval.created_at}`);
      console.log(`   Updated: ${approval.updated_at}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const noLinks = result.rows.filter(r => !r.payment_link_id);
    if (noLinks.length > 0) {
      console.log('⚠️  Some approvals have NO payment link created!');
      console.log('   This means the approval URL was never accessed\n');
    }
    
    const withLinks = result.rows.filter(r => r.payment_link_id);
    if (withLinks.length > 0) {
      console.log('✅ Approvals with payment links:');
      withLinks.forEach(a => {
        console.log(`\n   Approval #${a.id} - ${a.domain_name}`);
        console.log(`   Payment Link ID: ${a.payment_link_id}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkApprovals();

