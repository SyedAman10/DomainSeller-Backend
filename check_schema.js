const { Client } = require('pg');
const connectionString = 'postgresql://neondb_owner:npg_DMS1obqeA0gx@ep-wild-voice-a5pk94wz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function checkSchema() {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        const res = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'generated_leads'
      ORDER BY ordinal_position;
    `);
        console.log('COLUMNS:');
        res.rows.forEach(r => console.log(`${r.column_name} (${r.data_type}) ${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`));

        const constraints = await client.query(`
      SELECT 
        conname, 
        pg_get_constraintdef(oid) as def
      FROM pg_constraint 
      WHERE conrelid = 'generated_leads'::regclass;
    `);
        console.log('\nCONSTRAINTS:');
        constraints.rows.forEach(r => console.log(`${r.conname}: ${r.def}`));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkSchema();
