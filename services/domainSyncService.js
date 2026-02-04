/**
 * ============================================================
 * DOMAIN SYNC SERVICE
 * ============================================================
 * 
 * Purpose: Synchronize domains from registrar accounts
 * Features:
 * - Auto-verify domains from connected registrars
 * - Detect new domains
 * - Detect removed domains (revoke verification)
 * - Keep ownership data in sync
 * ============================================================
 */

const { RegistrarAdapterFactory } = require('./registrarAdapters');
const { initializeSecurityServices } = require('./encryptionService');
const { query } = require('../config/database');

class DomainSyncService {
  constructor() {
    this.isRunning = false;
    this.securityServices = null;
  }

  /**
   * Initialize security services
   */
  async initialize() {
    if (!this.securityServices) {
      this.securityServices = initializeSecurityServices({ query });
    }
  }

  /**
   * Sync all domains for a specific registrar account
   * @param {number} registrarAccountId
   * @returns {Promise<object>} Sync statistics
   */
  async syncRegistrarAccount(registrarAccountId) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔄 Starting domain sync for account ${registrarAccountId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const stats = {
      found: 0,
      added: 0,
      updated: 0,
      removed: 0,
      errors: []
    };

    const startTime = Date.now();

    try {
      await this.initialize();

      // 1. Get registrar account details
      const accountResult = await query(
        `SELECT id, user_id, registrar, connection_status, sync_mode, last_sync_at
         FROM registrar_accounts
         WHERE id = $1`,
        [registrarAccountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Registrar account not found');
      }

      const account = accountResult.rows[0];
      const accountSyncMode = (account.sync_mode || 'full').trim().toLowerCase();

      console.log(`📋 Account: ${account.registrar} (User ID: ${account.user_id}) (Stored Mode: ${account.sync_mode})`);
      console.log(`⚙️  Active Sync Mode: ${accountSyncMode}`);

      if (account.connection_status === 'disconnected') {
        console.log('⚠️  Account is disconnected, skipping sync');
        return stats;
      }

      // If sync_mode is verify_only, divert to verification service
      if (accountSyncMode === 'verify_only' || accountSyncMode === 'verify') {
        console.log(`ℹ️  Diverting to verification service (User only wants to match existing domains)`);
        return await this.verifyExistingDomains(registrarAccountId);
      }

      console.log(`📅 Last sync: ${account.last_sync_at || 'Never'}`);

      // 2. Get decrypted credentials
      const credentials = await this.securityServices.credentials.getCredentials(registrarAccountId);

      // 3. Create registrar adapter
      const adapter = RegistrarAdapterFactory.create(account.registrar, credentials);

      // 4. Fetch domains from registrar
      console.log(`🌐 Fetching domains from ${account.registrar}...`);

      let registrarDomains;
      try {
        registrarDomains = await adapter.fetchDomains();
        stats.found = registrarDomains.length;
        console.log(`✅ Found ${registrarDomains.length} domains on ${account.registrar}`);

        // Log detailed information about what we received
        if (registrarDomains.length > 0) {
          console.log('\n📋 DETAILED DOMAIN INFORMATION FROM REGISTRAR:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          // Show first 3 domains as examples
          const sampleDomains = registrarDomains.slice(0, 3);
          sampleDomains.forEach((domain, idx) => {
            console.log(`\n📌 Domain ${idx + 1}: ${domain.name || domain}`);
            if (typeof domain === 'object') {
              console.log('   Available data:', JSON.stringify(domain, null, 2));
            }
          });

          if (registrarDomains.length > 3) {
            console.log(`\n   ... and ${registrarDomains.length - 3} more domains`);
          }
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }
      } catch (fetchError) {
        console.error(`❌ Failed to fetch domains:`, fetchError.message);

        // Update connection status
        await this.securityServices.credentials.updateConnectionStatus(
          registrarAccountId,
          'failed',
          fetchError.message
        );

        stats.errors.push(fetchError.message);

        // Log failed sync
        await this.securityServices.logger.logSync(
          registrarAccountId,
          'failed',
          stats,
          fetchError.message
        );

        throw fetchError;
      }

      // 5. Get current domains for this registrar account from our database
      const dbDomainsResult = await query(
        `SELECT id, name, status, last_seen_at
         FROM domains
         WHERE registrar_account_id = $1`,
        [registrarAccountId]
      );

      const dbDomains = dbDomainsResult.rows;
      const dbDomainNames = new Set(dbDomains.map(d => d.name.toLowerCase()));

      // Extract domain names (handle both string and object formats)
      const registrarDomainNames = new Set(
        registrarDomains.map(d => {
          const name = typeof d === 'string' ? d : (d.name || d.domain);
          return name.toLowerCase();
        })
      );

      // Create a map of domain name -> full domain data for later use
      const registrarDomainMap = new Map();
      registrarDomains.forEach(d => {
        const name = typeof d === 'string' ? d : (d.name || d.domain);
        registrarDomainMap.set(name.toLowerCase(), d);
      });

      console.log(`📊 Current database domains: ${dbDomains.length}`);

      // 6. Process new domains (not in our database)
      const newDomains = registrarDomains.filter(d => {
        const name = typeof d === 'string' ? d : (d.name || d.domain);
        return !dbDomainNames.has(name.toLowerCase());
      });

      if (newDomains.length > 0) {
        console.log(`➕ Adding ${newDomains.length} new domain(s)...`);

        for (const domainData of newDomains) {
          try {
            // Extract domain name and data
            const domainName = typeof domainData === 'string'
              ? domainData
              : (domainData.name || domainData.domain);

            // Extract additional domain information
            const expiryDate = domainData.expires ? new Date(domainData.expires) : null;
            const autoRenew = domainData.renewAuto !== undefined ? domainData.renewAuto : true;
            const transferLocked = domainData.locked !== undefined ? domainData.locked : true;
            const registrarName = account.registrar;

            console.log(`   📝 Processing: ${domainName}`);
            if (typeof domainData === 'object') {
              console.log(`      Expires: ${expiryDate || 'N/A'}`);
              console.log(`      Auto-renew: ${autoRenew}`);
              console.log(`      Transfer locked: ${transferLocked}`);
            }

            // Check if domain already exists for this user
            const existingDomain = await query(
              `SELECT id FROM domains WHERE user_id = $1 AND name = $2`,
              [account.user_id, domainName]
            );

            if (existingDomain.rows.length > 0) {
              // Update existing domain with registrar verification and additional data
              await query(
                `UPDATE domains 
                 SET registrar_account_id = $1,
                     verification_method = 'registrar_api',
                     verification_level = 3,
                     is_verified = true,
                     verified_at = NOW(),
                     auto_synced = true,
                     last_seen_at = NOW(),
                     expiry_date = COALESCE($4, expiry_date),
                     auto_renew = COALESCE($5, auto_renew),
                     transfer_locked = COALESCE($6, transfer_locked),
                     registrar = COALESCE($7, registrar),
                     updated_at = NOW()
                 WHERE id = $2`,
                [registrarAccountId, existingDomain.rows[0].id, expiryDate, autoRenew, transferLocked, registrarName]
              );
            } else {
              // Insert new domain with registrar verification and additional data
              // Note: value defaults to 0 and category to 'Other' since we don't have this info from registrar API
              await query(
                `INSERT INTO domains 
                  (name, user_id, value, category, registrar_account_id, verification_method, verification_level, is_verified,
                   verified_at, auto_synced, last_seen_at, status, expiry_date, auto_renew, transfer_locked, registrar, created_at, updated_at)
                 VALUES ($1, $2, 0, 'Other', $3, 'registrar_api', 3, true, NOW(), true, NOW(), 'Available', $4, $5, $6, $7, NOW(), NOW())`,
                [domainName, account.user_id, registrarAccountId, expiryDate, autoRenew, transferLocked, registrarName]
              );
            }

            // Log verification event
            await this.securityServices.logger.logVerification(
              domainName,
              account.user_id,
              'verified',
              {
                verificationMethod: 'registrar_api',
                registrarAccountId: registrarAccountId,
                newStatus: 'verified',
                reason: `Auto-verified via ${account.registrar} API`
              }
            );

            stats.added++;
            console.log(`   ✅ Added: ${domainName}`);
          } catch (error) {
            console.error(`   ❌ Failed to add ${domainName}:`, error.message);
            stats.errors.push(`Failed to add ${domainName}: ${error.message}`);
          }
        }
      }

      // 7. Update existing domains (still in registrar)
      const existingDomains = registrarDomains.filter(d => {
        const name = typeof d === 'string' ? d : (d.name || d.domain);
        return dbDomainNames.has(name.toLowerCase());
      });

      if (existingDomains.length > 0) {
        console.log(`🔄 Updating ${existingDomains.length} existing domain(s)...`);

        for (const domainData of existingDomains) {
          try {
            const domainName = typeof domainData === 'string'
              ? domainData
              : (domainData.name || domainData.domain);

            // Extract additional domain information for update
            const expiryDate = domainData.expires ? new Date(domainData.expires) : null;
            const autoRenew = domainData.renewAuto !== undefined ? domainData.renewAuto : null;
            const transferLocked = domainData.locked !== undefined ? domainData.locked : null;
            const registrarName = account.registrar;

            await query(
              `UPDATE domains
               SET last_seen_at = NOW(),
                   is_verified = true,
                   verified_at = NOW(),
                   expiry_date = COALESCE($3, expiry_date),
                   auto_renew = COALESCE($4, auto_renew),
                   transfer_locked = COALESCE($5, transfer_locked),
                   registrar = COALESCE($6, registrar),
                   updated_at = NOW()
               WHERE name = $1 AND registrar_account_id = $2`,
              [domainName, registrarAccountId, expiryDate, autoRenew, transferLocked, registrarName]
            );

            stats.updated++;
          } catch (error) {
            const domainName = typeof domainData === 'string'
              ? domainData
              : (domainData.name || domainData.domain);
            console.error(`   ❌ Failed to update ${domainName}:`, error.message);
            stats.errors.push(`Failed to update ${domainName}: ${error.message}`);
          }
        }

        console.log(`   ✅ Updated ${stats.updated} domain(s)`);
      }

      // 8. Handle removed domains (no longer in registrar)
      const removedDomains = dbDomains.filter(
        d => !registrarDomainNames.has(d.name.toLowerCase())
      );

      if (removedDomains.length > 0) {
        console.log(`⚠️  Found ${removedDomains.length} domain(s) no longer in ${account.registrar}`);

        for (const domain of removedDomains) {
          try {
            // Revoke verification but keep the domain record
            await query(
              `UPDATE domains
               SET registrar_account_id = NULL,
                   verification_method = NULL,
                   verification_level = 1,
                   updated_at = NOW()
               WHERE id = $1`,
              [domain.id]
            );

            // Log revocation event
            await this.securityServices.logger.logVerification(
              domain.name,
              account.user_id,
              'revoked',
              {
                verificationMethod: 'registrar_api',
                registrarAccountId: registrarAccountId,
                oldStatus: 'verified',
                newStatus: 'revoked',
                reason: `Domain no longer found in ${account.registrar} account`
              }
            );

            stats.removed++;
            console.log(`   🔻 Revoked: ${domain.name}`);
          } catch (error) {
            console.error(`   ❌ Failed to revoke ${domain.name}:`, error.message);
            stats.errors.push(`Failed to revoke ${domain.name}: ${error.message}`);
          }
        }
      }

      // 9. Update registrar account sync status
      const syncDuration = Date.now() - startTime;

      await query(
        `UPDATE registrar_accounts
         SET last_sync_at = NOW(),
             last_sync_status = 'success',
             last_sync_error = NULL,
             domains_count = $1,
             verified_domains_count = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [stats.found, stats.added + stats.updated, registrarAccountId]
      );

      // 10. Log sync history
      await this.securityServices.logger.logSync(
        registrarAccountId,
        'success',
        stats
      );

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SYNC COMPLETED SUCCESSFULLY');
      console.log(`📊 Statistics:`);
      console.log(`   • Domains found: ${stats.found}`);
      console.log(`   • New domains added: ${stats.added}`);
      console.log(`   • Existing domains updated: ${stats.updated}`);
      console.log(`   • Domains removed/revoked: ${stats.removed}`);
      console.log(`   • Errors: ${stats.errors.length}`);
      console.log(`   • Duration: ${syncDuration}ms`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return stats;
    } catch (error) {
      console.error('❌ Sync failed:', error);

      // Update account with error
      await query(
        `UPDATE registrar_accounts
         SET last_sync_status = 'failed',
             last_sync_error = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [error.message, registrarAccountId]
      );

      throw error;
    }
  }

  /**
   * Sync all active registrar accounts
   * Used by cron job
   */
  async syncAllAccounts() {
    if (this.isRunning) {
      console.log('⚠️  Sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      console.log('');
      console.log('════════════════════════════════════════════════════════════');
      console.log('🔄 STARTING BULK DOMAIN SYNC');
      console.log(`⏰ ${new Date().toISOString()}`);
      console.log('════════════════════════════════════════════════════════════');
      console.log('');

      // Get all active registrar accounts
      const accountsResult = await query(
        `SELECT id, user_id, registrar, sync_mode, last_sync_at
         FROM registrar_accounts
         WHERE connection_status = 'active'
         ORDER BY last_sync_at ASC NULLS FIRST`
      );

      const accounts = accountsResult.rows;
      console.log(`📋 Found ${accounts.length} active registrar account(s) to sync\n`);

      if (accounts.length === 0) {
        console.log('ℹ️  No accounts to sync');
        return;
      }

      const results = [];

      for (const account of accounts) {
        try {
          if (account.sync_mode === 'verify_only') {
            console.log(`\n🔄 Verifying existing domains for account ${account.id} (${account.registrar})...`);
            const stats = await this.verifyExistingDomains(account.id);
            results.push({ accountId: account.id, success: true, stats, mode: 'verify' });
          } else {
            console.log(`\n🔄 Syncing account ${account.id} (${account.registrar})...`);
            const stats = await this.syncRegistrarAccount(account.id);
            results.push({ accountId: account.id, success: true, stats, mode: 'sync' });
          }
        } catch (error) {
          console.error(`❌ Action failed for account ${account.id}:`, error.message);
          results.push({ accountId: account.id, success: false, error: error.message });
        }

        // Add delay between syncs to respect rate limits
        await this.delay(2000);
      }

      // Summary
      console.log('');
      console.log('════════════════════════════════════════════════════════════');
      console.log('✅ BULK SYNC COMPLETED');
      console.log('════════════════════════════════════════════════════════════');
      console.log('📊 Summary:');
      console.log(`   • Total accounts: ${accounts.length}`);
      console.log(`   • Successful: ${results.filter(r => r.success).length}`);
      console.log(`   • Failed: ${results.filter(r => !r.success).length}`);

      const totalAdded = results.reduce((sum, r) => sum + (r.stats?.added || 0), 0);
      const totalRemoved = results.reduce((sum, r) => sum + (r.stats?.removed || 0), 0);

      console.log(`   • Total new domains: ${totalAdded}`);
      console.log(`   • Total revoked domains: ${totalRemoved}`);
      console.log('════════════════════════════════════════════════════════════');
      console.log('');

      return results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync domains for a specific user
   */
  async syncUserDomains(userId) {
    console.log(`🔄 Syncing all registrar accounts for user ${userId}...`);

    const accountsResult = await query(
      `SELECT id FROM registrar_accounts
       WHERE user_id = $1 AND connection_status = 'active'`,
      [userId]
    );

    if (accountsResult.rows.length === 0) {
      console.log('ℹ️  No active registrar accounts found for this user');
      return { message: 'No active registrar accounts', synced: 0 };
    }

    const results = [];

    for (const account of accountsResult.rows) {
      try {
        if (account.sync_mode === 'verify_only') {
          console.log(`\n🔄 Verifying existing domains for account ${account.id} (User ID: ${userId})...`);
          const stats = await this.verifyExistingDomains(account.id);
          results.push({ accountId: account.id, success: true, stats, mode: 'verify' });
        } else {
          console.log(`\n🔄 Syncing account ${account.id} (User ID: ${userId})...`);
          const stats = await this.syncRegistrarAccount(account.id);
          results.push({ accountId: account.id, success: true, stats, mode: 'sync' });
        }
      } catch (error) {
        console.error(`❌ Action failed for account ${account.id}:`, error.message);
        results.push({ accountId: account.id, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Test registrar connection without syncing
   */
  async testConnection(registrarAccountId) {
    try {
      await this.initialize();

      const credentials = await this.securityServices.credentials.getCredentials(registrarAccountId);

      const accountResult = await query(
        `SELECT registrar FROM registrar_accounts WHERE id = $1`,
        [registrarAccountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Registrar account not found');
      }

      const registrar = accountResult.rows[0].registrar;
      const adapter = RegistrarAdapterFactory.create(registrar, credentials);

      console.log(`🔍 Testing connection to ${registrar}...`);
      const result = await adapter.testConnection();

      if (result.success) {
        await this.securityServices.credentials.updateConnectionStatus(
          registrarAccountId,
          'active',
          null
        );
      } else {
        await this.securityServices.credentials.updateConnectionStatus(
          registrarAccountId,
          'failed',
          result.message
        );
      }

      return result;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Verify existing domains in database against registrar account
   * This ONLY verifies domains that are already in the user's portfolio
   * It does NOT import new domains from the registrar
   * @param {number} registrarAccountId
   * @returns {Promise<object>} Verification statistics
   */
  async verifyExistingDomains(registrarAccountId) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Starting BULK VERIFICATION for account ${registrarAccountId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const stats = {
      totalInDatabase: 0,
      verified: 0,
      notFound: 0,
      errors: []
    };

    const startTime = Date.now();

    try {
      await this.initialize();

      // 1. Get registrar account details
      const accountResult = await query(
        `SELECT id, user_id, registrar, connection_status
         FROM registrar_accounts
         WHERE id = $1`,
        [registrarAccountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Registrar account not found');
      }

      const account = accountResult.rows[0];

      if (account.connection_status === 'disconnected') {
        throw new Error('Account is disconnected');
      }

      console.log(`📋 Account: ${account.registrar} (User ID: ${account.user_id})`);

      // 2. Get ALL domains for this user from database (not just ones linked to this registrar)
      const dbDomainsResult = await query(
        `SELECT id, name, verification_level, registrar_account_id
         FROM domains
         WHERE user_id = $1
         ORDER BY name`,
        [account.user_id]
      );

      const dbDomains = dbDomainsResult.rows;
      stats.totalInDatabase = dbDomains.length;

      console.log(`📊 Found ${dbDomains.length} domain(s) in your portfolio`);

      if (dbDomains.length === 0) {
        console.log('ℹ️  No domains to verify');
        return stats;
      }

      // 3. Get decrypted credentials
      const credentials = await this.securityServices.credentials.getCredentials(registrarAccountId);

      // 4. Create registrar adapter
      const adapter = RegistrarAdapterFactory.create(account.registrar, credentials);

      // 5. Fetch domains from registrar
      console.log(`🌐 Fetching domains from ${account.registrar}...`);

      let registrarDomains;
      try {
        registrarDomains = await adapter.fetchDomains();
        console.log(`✅ Found ${registrarDomains.length} domains on ${account.registrar}`);
      } catch (fetchError) {
        console.error(`❌ Failed to fetch domains:`, fetchError.message);

        // Update connection status
        await this.securityServices.credentials.updateConnectionStatus(
          registrarAccountId,
          'failed',
          fetchError.message
        );

        throw fetchError;
      }

      // 6. Create a Set of registrar domain names for quick lookup
      const registrarDomainNames = new Set(
        registrarDomains.map(d => {
          const name = typeof d === 'string' ? d : (d.name || d.domain);
          return name.toLowerCase();
        })
      );

      // Create a map of domain name -> full domain data
      const registrarDomainMap = new Map();
      registrarDomains.forEach(d => {
        const name = typeof d === 'string' ? d : (d.name || d.domain);
        registrarDomainMap.set(name.toLowerCase(), d);
      });

      console.log('\n🔍 Verifying domains...\n');

      // 7. Check each database domain against registrar
      for (const dbDomain of dbDomains) {
        const domainName = dbDomain.name.toLowerCase();

        if (registrarDomainNames.has(domainName)) {
          // Domain found in registrar - verify it
          try {
            const registrarData = registrarDomainMap.get(domainName);

            // Extract additional domain information
            const expiryDate = registrarData?.expires ? new Date(registrarData.expires) : null;
            const autoRenew = registrarData?.renewAuto !== undefined ? registrarData.renewAuto : null;
            const transferLocked = registrarData?.locked !== undefined ? registrarData.locked : null;
            const registrarName = account.registrar;

            await query(
              `UPDATE domains
               SET registrar_account_id = $1,
                   verification_method = 'registrar_api',
                   verification_level = 3,
                   is_verified = true,
                   verified_at = NOW(),
                   last_seen_at = NOW(),
                   expiry_date = COALESCE($3, expiry_date),
                   auto_renew = COALESCE($4, auto_renew),
                   transfer_locked = COALESCE($5, transfer_locked),
                   registrar = COALESCE($6, registrar),
                   updated_at = NOW()
               WHERE id = $2`,
              [registrarAccountId, dbDomain.id, expiryDate, autoRenew, transferLocked, registrarName]
            );

            // Log verification event
            await this.securityServices.logger.logVerification(
              dbDomain.name,
              account.user_id,
              'verified',
              {
                verificationMethod: 'registrar_api',
                registrarAccountId: registrarAccountId,
                newStatus: 'verified',
                reason: `Bulk verified via ${account.registrar} API`
              }
            );

            stats.verified++;
            console.log(`   ✅ ${dbDomain.name} - VERIFIED`);
          } catch (error) {
            console.error(`   ❌ ${dbDomain.name} - Error: ${error.message}`);
            stats.errors.push(`${dbDomain.name}: ${error.message}`);
          }
        } else {
          // Domain NOT found in registrar
          stats.notFound++;
          console.log(`   ⚠️  ${dbDomain.name} - NOT FOUND in ${account.registrar}`);
        }
      }

      // 8. Update registrar account stats
      await query(
        `UPDATE registrar_accounts
         SET last_sync_at = NOW(),
             last_sync_status = 'success',
             last_sync_error = NULL,
             verified_domains_count = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [stats.verified, registrarAccountId]
      );

      const duration = Date.now() - startTime;

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ BULK VERIFICATION COMPLETED');
      console.log(`📊 Statistics:`);
      console.log(`   • Total domains in portfolio: ${stats.totalInDatabase}`);
      console.log(`   • Verified: ${stats.verified}`);
      console.log(`   • Not found in ${account.registrar}: ${stats.notFound}`);
      console.log(`   • Errors: ${stats.errors.length}`);
      console.log(`   • Duration: ${duration}ms`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return stats;
    } catch (error) {
      console.error('❌ Bulk verification failed:', error);

      // Update account with error
      await query(
        `UPDATE registrar_accounts
         SET last_sync_status = 'failed',
             last_sync_error = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [error.message, registrarAccountId]
      );

      throw error;
    }
  }

  /**
   * Verify existing domains for a specific user across all connected registrars
   * @param {number} userId
   * @returns {Promise<Array>} Array of results
   */
  async verifyUserDomains(userId) {
    console.log(`🔄 Verifying existing domains across all accounts for user ${userId}...`);

    const accountsResult = await query(
      `SELECT id FROM registrar_accounts
       WHERE user_id = $1 AND connection_status = 'active'`,
      [userId]
    );

    if (accountsResult.rows.length === 0) {
      console.log('ℹ️  No active registrar accounts found for this user');
      return { message: 'No active registrar accounts', results: [] };
    }

    const results = [];

    for (const account of accountsResult.rows) {
      try {
        const stats = await this.verifyExistingDomains(account.id);
        results.push({ accountId: account.id, success: true, stats });
      } catch (error) {
        results.push({ accountId: account.id, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Helper: delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
const domainSyncService = new DomainSyncService();

module.exports = {
  DomainSyncService,
  domainSyncService
};
