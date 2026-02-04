const { Client } = require('pg');
const connectionString = 'postgresql://neondb_owner:npg_DMS1obqeA0gx@ep-wild-voice-a5pk94wz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function findConstraint() {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        const res = await client.query(`
      SELECT conname
      FROM pg_constraint 
      WHERE conrelid = 'generated_leads'::regclass AND contype = 'u';
    `);
        console.log('CONSTRAINTS:');
        res.rows.forEach(r => console.log(r.conname));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

findConstraint();
