const { query } = require('./config/database');

async function fixAccounts() {
    try {
        console.log('🔄 Updating all registrar accounts to verify_only mode...');
        const result = await query("UPDATE registrar_accounts SET sync_mode = 'verify_only'");
        console.log(`✅ Updated ${result.rowCount} account(s)`);

        console.log('🔄 Changing default sync_mode to verify_only for future accounts...');
        await query("ALTER TABLE registrar_accounts ALTER COLUMN sync_mode SET DEFAULT 'verify_only'");
        console.log('✅ Default changed');

        process.exit(0);
    } catch (error) {
        console.error('❌ Update failed:', error);
        process.exit(1);
    }
}

fixAccounts();
