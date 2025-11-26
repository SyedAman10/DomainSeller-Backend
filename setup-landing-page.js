#!/usr/bin/env node
/**
 * Setup script for landing page support
 * Run this to add landing page fields to campaigns table
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function setupLandingPage() {
  console.log('🚀 Setting up landing page support...\n');

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'database', 'add_landing_page_support.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Running migration: add_landing_page_support.sql\n');

    // Execute SQL
    const result = await pool.query(sql);

    console.log('✅ Landing page support added successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Changes Made:');
    console.log('   ✓ Added include_landing_page field to campaigns');
    console.log('   ✓ Added landing_page_url field to campaigns');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 Usage:');
    console.log('   When creating a campaign, include:');
    console.log('   {');
    console.log('     "includeLandingPage": true,');
    console.log('     "landingPageUrl": "https://yourdomain.com"');
    console.log('   }');
    console.log('');

  } catch (error) {
    console.error('❌ Error setting up landing page support:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupLandingPage();

