const { query } = require('./config/database');

async function check() {
    try {
        const accounts = await query('SELECT id, user_id, registrar, sync_mode FROM registrar_accounts');
        console.log('--- Registrar Accounts ---');
        console.table(accounts.rows);

        const domainsCount = await query('SELECT user_id, COUNT(*) as count, SUM(CASE WHEN auto_synced = true THEN 1 ELSE 0 END) as auto_synced FROM domains GROUP BY user_id');
        console.log('\n--- Domains Summary ---');
        console.table(domainsCount.rows);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

check();
