const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query('SELECT id, user_id, registrar, sync_mode FROM registrar_accounts');
        console.log('ACCOUNTS:');
        res.rows.forEach(r => console.log(JSON.stringify(r)));

        const countRes = await pool.query('SELECT user_id, count(*) FROM domains GROUP BY user_id');
        console.log('DOMAIN_COUNTS:');
        countRes.rows.forEach(r => console.log(JSON.stringify(r)));

        await pool.end();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
