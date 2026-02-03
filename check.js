const { query } = require('./config/database');
query('SELECT id, user_id, sync_mode FROM registrar_accounts').then(r => {
    console.log('RESULTS:');
    r.rows.forEach(row => console.log(JSON.stringify(row)));
    process.exit(0);
});
