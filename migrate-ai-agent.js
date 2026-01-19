const pool = require('./config/database');
const fs = require('fs');

async function runMigration() {
  console.log('🚀 Starting AI Agent database migration...');
  
  try {
    const migrationSQL = fs.readFileSync('./database/create_ai_agent.sql', 'utf8');
    
    console.log('📝 Executing SQL migration...');
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Created tables:');
    console.log('   - ai_chat_sessions');
    console.log('   - ai_chat_messages');
    console.log('   - ai_agent_memory');
    console.log('\n🎉 AI Agent is ready to use!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

