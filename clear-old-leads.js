const { query } = require('./config/database');

async function clearOldLeads() {
  try {
    console.log('🗑️  Clearing all old leads with incorrect mapping...');
    console.log('');

    // First, show how many leads we're about to delete
    const countResult = await query('SELECT COUNT(*) as count FROM generated_leads');
    const totalLeads = countResult.rows[0].count;

    console.log(`📊 Current leads in database: ${totalLeads}`);
    console.log('');

    if (totalLeads === 0) {
      console.log('✅ Database is already empty. Nothing to delete.');
      process.exit(0);
    }

    // Confirm deletion
    console.log('⚠️  WARNING: This will delete ALL leads from the database!');
    console.log('   This is necessary to clear the incorrectly mapped data.');
    console.log('');
    console.log('🔄 Proceeding with deletion in 3 seconds...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete all leads
    const deleteResult = await query('DELETE FROM generated_leads RETURNING id');
    const deletedCount = deleteResult.rows.length;

    console.log('');
    console.log('✅ Successfully deleted leads!');
    console.log(`   Removed: ${deletedCount} leads`);
    console.log('');
    console.log('🎉 Database is now clean and ready for correctly mapped leads!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Make sure backend code is updated (git pull)');
    console.log('   2. Restart backend: pm2 restart node-backend');
    console.log('   3. Test lead generation from frontend');
    console.log('   4. Verify all fields are populated correctly');
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error clearing leads:', error.message);
    process.exit(1);
  }
}

clearOldLeads();
