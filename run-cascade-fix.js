const { query } = require('./config/database');
const fs = require('fs');

(async () => {
  try {
    console.log('🔧 Running database migration...\n');
    
    const sql = fs.readFileSync('./database/fix_cascade_delete_v2.sql', 'utf8');
    const result = await query(sql);
    
    console.log('✅ Database cleanup and migration successful!');
    console.log('✅ Foreign key constraints now use CASCADE delete');
    console.log('✅ Campaigns can now be deleted along with all related records\n');
    
    if (result.rows && result.rows.length > 0) {
      console.log('📊 Updated Constraints:');
      result.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}: ${row.delete_rule}`);
      });
    }
    
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    console.error(e);
    process.exit(1);
  }
})();

