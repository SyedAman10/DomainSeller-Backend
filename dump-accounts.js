const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const accountRes = await pool.query('SELECT * FROM registrar_accounts');
    console.log('--- ALL REGISTRAR ACCOUNTS ---');
    accountRes.rows.forEach(r => console.log(JSON.stringify(r)));
    await pool.end();
}
run();
