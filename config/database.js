const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

// Create Neon database connection
const sql = neon(process.env.DATABASE_URL);

/**
 * Execute a query against the Neon database
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} Query results
 */
const query = async (query, params = []) => {
  try {
    const result = await sql(query, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
const testConnection = async () => {
  try {
    const result = await sql`SELECT 1 as connection_test`;
    console.log('✅ Database connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

module.exports = {
  sql,
  query,
  testConnection
};

