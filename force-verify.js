const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log('Force updating all accounts to verify_only...');
        const res = await pool.query("UPDATE registrar_accounts SET sync_mode = 'verify_only'");
        console.log(`Updated ${res.rowCount} accounts.`);

        // Check account for user 59
        const checkRes = await pool.query("SELECT sync_mode FROM registrar_accounts WHERE user_id = 59");
        console.log('Account 59 sync_mode:', checkRes.rows[0]?.sync_mode);

        await pool.end();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
