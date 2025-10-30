/**
 * Create Test Campaign
 * Helper script to create a test campaign with proper user validation
 */

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTestCampaign() {
  console.log('🚀 Creating test campaign...\n');

  try {
    // Get first available user
    const users = await pool.query('SELECT id, email, username, first_name FROM users ORDER BY id LIMIT 1');
    
    if (users.rows.length === 0) {
      console.log('❌ No users found in database');
      console.log('💡 Create a user first before creating campaigns\n');
      await pool.end();
      return;
    }

    const user = users.rows[0];
    const displayName = user.username || user.first_name || user.email.split('@')[0];
    console.log(`✅ Using user: ${displayName} (${user.email}) - ID: ${user.id}\n`);

    // Create campaign
    const campaignData = {
      userId: user.id,
      domainName: 'example.com',
      campaignName: `Test Campaign ${new Date().toISOString().split('T')[0]}`,
      emailTone: 'professional',
      includePrice: true,
      maxEmailsPerDay: 50,
      followUpDays: 3
    };

    console.log('📤 Sending request to create campaign...');
    console.log('Data:', JSON.stringify(campaignData, null, 2));

    const response = await axios.post(`${BASE_URL}/api/campaigns`, campaignData);

    console.log('\n✅ Campaign created successfully!\n');
    console.log('Campaign ID:', response.data.campaign.campaign_id);
    console.log('Campaign Name:', response.data.campaign.campaign_name);
    console.log('Domain:', response.data.campaign.domain_name);
    console.log('Status:', response.data.campaign.status);
    console.log('\nFull response:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('\n❌ Error creating campaign:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  } finally {
    await pool.end();
  }
}

createTestCampaign();

