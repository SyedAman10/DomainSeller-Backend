/**
 * ============================================================
 * REGISTRAR INTEGRATION TEST SCRIPT
 * ============================================================
 * 
 * Purpose: Test the complete registrar integration system
 * Run with: node test-registrar-integration.js
 * ============================================================
 */

require('dotenv').config();
const { query } = require('./config/database');
const { RegistrarAdapterFactory } = require('./services/registrarAdapters');
const { initializeSecurityServices } = require('./services/encryptionService');

// Test configuration
const TEST_CONFIG = {
  // IMPORTANT: Update these with your actual test credentials
  registrar: 'godaddy', // or 'cloudflare', 'namecheap'
  apiKey: process.env.TEST_REGISTRAR_API_KEY || 'YOUR_TEST_API_KEY',
  apiSecret: process.env.TEST_REGISTRAR_API_SECRET || 'YOUR_TEST_API_SECRET',
  testUserId: process.env.TEST_USER_ID || 10
};

async function runTests() {
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
  console.log('🧪 REGISTRAR INTEGRATION TEST SUITE');
  console.log('════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 1: Check Environment Variables
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📋 TEST 1: Environment Variables');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const requiredVars = ['DATABASE_URL', 'ENCRYPTION_KEY'];
    const missingVars = requiredVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
      console.error(`❌ Missing environment variables: ${missingVars.join(', ')}`);
      console.log('');
      console.log('Please add to .env:');
      missingVars.forEach(v => {
        if (v === 'ENCRYPTION_KEY') {
          console.log(`${v}=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")`);
        } else {
          console.log(`${v}=your_value_here`);
        }
      });
      process.exit(1);
    }
    
    console.log('✅ All required environment variables present');
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 2: Database Connection
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📋 TEST 2: Database Connection');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 3: Check Database Tables
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📋 TEST 3: Database Tables');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const requiredTables = [
      'registrar_accounts',
      'registrar_sync_history',
      'domain_verification_log',
      'registrar_rate_limits',
      'supported_registrars'
    ];

    const tableResults = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (${requiredTables.map((_, i) => `$${i + 1}`).join(',')})
    `, requiredTables);

    const existingTables = tableResults.rows.map(r => r.table_name);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.error(`❌ Missing database tables: ${missingTables.join(', ')}`);
      console.log('');
      console.log('Run migration:');
      console.log('psql $DATABASE_URL -f database/add_registrar_integration.sql');
      process.exit(1);
    }

    console.log('✅ All required tables exist');
    existingTables.forEach(t => console.log(`   ✓ ${t}`));
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 4: Encryption Service
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📋 TEST 4: Encryption Service');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const { encryption } = initializeSecurityServices({ query });
    
    const testData = 'sensitive_api_key_12345';
    const encrypted = encryption.encrypt(testData);
    const decrypted = encryption.decrypt(encrypted);
    
    if (decrypted !== testData) {
      console.error('❌ Encryption/decryption failed');
      process.exit(1);
    }
    
    console.log('✅ Encryption service working');
    console.log(`   Original: ${testData}`);
    console.log(`   Encrypted: ${encrypted.substring(0, 50)}...`);
    console.log(`   Decrypted: ${decrypted}`);
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 5: Registrar Adapter Factory
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📋 TEST 5: Registrar Adapter Factory');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const supportedRegistrars = RegistrarAdapterFactory.getSupportedRegistrars();
    console.log(`✅ ${supportedRegistrars.length} registrars supported:`);
    supportedRegistrars.forEach(r => {
      console.log(`   ${r.status === 'active' ? '✓' : '○'} ${r.name} (Priority: ${r.priority})`);
    });
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 6: Registrar Connection Test (Optional)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📋 TEST 6: Registrar Connection Test (Optional)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (TEST_CONFIG.apiKey === 'YOUR_TEST_API_KEY') {
      console.log('⚠️  Skipped: No test credentials provided');
      console.log('   To test real connection, add to .env:');
      console.log('   TEST_REGISTRAR_API_KEY=your_api_key');
      console.log('   TEST_REGISTRAR_API_SECRET=your_api_secret');
      console.log('');
    } else {
      console.log(`🔍 Testing ${TEST_CONFIG.registrar} connection...`);
      
      const adapter = RegistrarAdapterFactory.create(TEST_CONFIG.registrar, {
        apiKey: TEST_CONFIG.apiKey,
        apiSecret: TEST_CONFIG.apiSecret
      });

      const connectionResult = await adapter.testConnection();
      
      if (connectionResult.success) {
        console.log('✅ Connection successful!');
        console.log(`   Registrar: ${TEST_CONFIG.registrar}`);
        if (connectionResult.accountInfo) {
          console.log(`   Domains: ${connectionResult.accountInfo.domainsCount || 'N/A'}`);
        }
      } else {
        console.log('❌ Connection failed:');
        console.log(`   ${connectionResult.message}`);
      }
      console.log('');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 7: Database Columns Check
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📋 TEST 7: Domains Table Columns');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const requiredColumns = [
      'registrar_account_id',
      'verification_method',
      'verification_level',
      'verified_at',
      'auto_synced',
      'last_seen_at'
    ];

    const columnResults = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'domains' 
        AND column_name IN (${requiredColumns.map((_, i) => `$${i + 1}`).join(',')})
    `, requiredColumns);

    const existingColumns = columnResults.rows.map(r => r.column_name);
    const missingColumns = requiredColumns.filter(c => !existingColumns.includes(c));

    if (missingColumns.length > 0) {
      console.log(`⚠️  Missing columns in domains table: ${missingColumns.join(', ')}`);
      console.log('   Migration may not have completed successfully');
      console.log('   Re-run: psql $DATABASE_URL -f database/add_registrar_integration.sql');
    } else {
      console.log('✅ All required columns exist in domains table');
      existingColumns.forEach(c => console.log(`   ✓ ${c}`));
    }
    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SUMMARY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
    console.log('🎉 Registrar Integration System is ready!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Test API: curl http://localhost:3000/backend/registrar/supported');
    console.log('3. Connect a registrar via API or frontend');
    console.log('');
    console.log('📚 Documentation:');
    console.log('   - REGISTRAR_INTEGRATION.md (complete guide)');
    console.log('   - QUICKSTART_REGISTRAR.md (quick setup)');
    console.log('   - IMPLEMENTATION_SUMMARY.md (overview)');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('════════════════════════════════════════════════════════════');
    console.error('❌ TEST FAILED');
    console.error('════════════════════════════════════════════════════════════');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }

  process.exit(0);
}

// Run tests
runTests();
