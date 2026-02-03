const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
    const res = await pool.query('SELECT id, user_id, registrar, sync_mode FROM registrar_accounts');
    console.log('ID\tUSER_ID\tREGISTRAR\tMODE');
    res.rows.forEach(r => console.log(`${r.id}\t${r.user_id}\t${r.registrar}\t${r.sync_mode}`));
    await pool.end();
}
run();
