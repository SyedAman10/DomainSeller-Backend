const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function addEnhancedAnalytics() {
  console.log('🔧 Adding enhanced analytics features...\n');

  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const sqlPath = path.join(__dirname, 'database', 'add_enhanced_analytics.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🔗 Connecting to database...\n');
    await pool.query(sql);

    console.log('✅ Enhanced analytics added!\n');
    console.log('New features:');
    console.log('  ✓ Scroll tracking columns');
    console.log('  ✓ Click tracking columns');
    console.log('  ✓ Geolocation columns (latitude, longitude)');
    console.log('  ✓ Landing page leads table');
    console.log('  ✓ Landing page clicks table');
    console.log('  ✓ All necessary indexes\n');
    console.log('🎉 Enhanced analytics ready!');

  } catch (error) {
    console.error('❌ Failed:', error.message);
  } finally {
    await pool.end();
  }
}

addEnhancedAnalytics();

