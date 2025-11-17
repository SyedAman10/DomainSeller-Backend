/**
 * Check Domain Prices Setup
 * Verify that domains table exists and has price values set
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkDomainPrices() {
  console.log('🔍 CHECKING DOMAIN PRICES SETUP');
  console.log('═'.repeat(60));
  console.log('');

  try {
    // Check if domains table exists
    console.log('📋 Checking if domains table exists...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'domains'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ domains table does NOT exist');
      console.log('');
      console.log('Creating domains table...');
      
      await pool.query(`
        CREATE TABLE domains (
          id SERIAL PRIMARY KEY,
          domain_name VARCHAR(255) UNIQUE NOT NULL,
          value DECIMAL(10, 2),
          registrar VARCHAR(100),
          expiry_date DATE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      console.log('✅ domains table created!');
    } else {
      console.log('✅ domains table exists');
    }
    
    console.log('');

    // Check if value column exists
    console.log('📋 Checking if value column exists...');
    const columnCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'domains' AND column_name = 'value';
    `);

    if (columnCheck.rows.length === 0) {
      console.log('❌ value column does NOT exist');
      console.log('Adding value column...');
      
      await pool.query(`
        ALTER TABLE domains ADD COLUMN value DECIMAL(10, 2);
      `);
      
      console.log('✅ value column added!');
    } else {
      console.log('✅ value column exists');
    }
    
    console.log('');

    // Show current domains and their prices
    console.log('📊 Current Domains:');
    console.log('─'.repeat(60));
    
    const domains = await pool.query(`
      SELECT 
        d.domain_name,
        d.value as domain_value,
        c.campaign_id,
        c.asking_price,
        c.minimum_price
      FROM domains d
      LEFT JOIN campaigns c ON c.domain_name = d.domain_name
      ORDER BY d.domain_name;
    `);

    if (domains.rows.length === 0) {
      console.log('⚠️  No domains found in database');
      console.log('');
      console.log('To add a domain with price:');
      console.log(`
INSERT INTO domains (domain_name, value) 
VALUES ('example.com', 5000);
      `);
    } else {
      console.log('');
      console.log('Domain Name              | Domain Value | Campaign Price');
      console.log('─'.repeat(60));
      
      domains.rows.forEach(row => {
        const domainName = (row.domain_name || '').padEnd(24);
        const domainValue = row.domain_value ? `$${row.domain_value}`.padEnd(12) : 'not set'.padEnd(12);
        const campaignPrice = row.asking_price || row.minimum_price || 'not set';
        
        console.log(`${domainName} | ${domainValue} | ${campaignPrice}`);
      });
      
      console.log('');
      
      // Check for domains without prices
      const noPrices = domains.rows.filter(r => !r.domain_value && !r.asking_price && !r.minimum_price);
      
      if (noPrices.length > 0) {
        console.log('⚠️  DOMAINS WITHOUT PRICES:');
        console.log('');
        noPrices.forEach(row => {
          console.log(`❌ ${row.domain_name} - No price set anywhere!`);
          console.log(`   Fix with:`);
          console.log(`   UPDATE domains SET value = 5000 WHERE domain_name = '${row.domain_name}';`);
          console.log(`   OR`);
          console.log(`   UPDATE campaigns SET asking_price = 5000 WHERE domain_name = '${row.domain_name}';`);
          console.log('');
        });
      } else {
        console.log('✅ All domains have prices set!');
      }
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('💡 PRICE PRIORITY:');
    console.log('═'.repeat(60));
    console.log('');
    console.log('When buyer asks for payment link, system checks in this order:');
    console.log('1. campaign.asking_price (campaign-specific price)');
    console.log('2. campaign.minimum_price (minimum acceptable)');
    console.log('3. domains.value (domain\'s default price)');
    console.log('');
    console.log('Best Practice:');
    console.log('- Set domains.value = default price for the domain');
    console.log('- Set campaign.asking_price = specific price for this campaign (optional)');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

checkDomainPrices();

