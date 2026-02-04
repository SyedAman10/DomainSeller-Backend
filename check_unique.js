const { Client } = require('pg');
const connectionString = 'postgresql://neondb_owner:npg_DMS1obqeA0gx@ep-wild-voice-a5pk94wz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function checkSchema() {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        const res = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint 
      WHERE conrelid = 'generated_leads'::regclass;
    `);
        res.rows.forEach(r => {
            if (r.def.includes('UNIQUE')) console.log(`UQ: ${r.def}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkSchema();
