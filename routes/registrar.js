/**
 * ============================================================
 * REGISTRAR ACCOUNTS API ROUTES
 * ============================================================
 * 
 * Endpoints:
 * POST   /backend/registrar/connect         - Connect a registrar account
 * GET    /backend/registrar/accounts        - List user's registrar accounts
 * POST   /backend/registrar/test            - Test connection
 * POST   /backend/registrar/sync            - Trigger manual sync
 * DELETE /backend/registrar/disconnect      - Disconnect registrar
 * GET    /backend/registrar/supported       - List supported registrars
 * GET    /backend/registrar/stats           - Get sync statistics
 * ============================================================
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { RegistrarAdapterFactory } = require('../services/registrarAdapters');
const { initializeSecurityServices } = require('../services/encryptionService');
const { domainSyncService } = require('../services/domainSyncService');

// Initialize security services
let securityServices;
const getSecurityServices = () => {
  if (!securityServices) {
    securityServices = initializeSecurityServices({ query });
  }
  return securityServices;
};

/**
 * ============================================================
 * POST /backend/registrar/connect
 * Connect a new registrar account
 * ============================================================
 */
router.post('/connect', requireAuth, async (req, res) => {
  console.log('============================================================');
  console.log('📥 POST /backend/registrar/connect');
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log(`👤 User ID: ${req.user.id}`);
  console.log('============================================================');

  try {
    const { registrar, apiKey, apiSecret, username, clientIp } = req.body;

    // Validation
    if (!registrar || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: registrar and apiKey'
      });
    }

    // Check if registrar is supported
    if (!RegistrarAdapterFactory.isSupported(registrar)) {
      return res.status(400).json({
        success: false,
        message: `Registrar '${registrar}' is not supported yet`,
        supportedRegistrars: RegistrarAdapterFactory.getSupportedRegistrars()
      });
    }

    console.log(`🔌 Connecting ${registrar} for user ${req.user.id}...`);

    // Step 1: Store encrypted credentials
    const services = getSecurityServices();
    
    const accountId = await services.credentials.storeCredentials(
      req.user.id,
      registrar,
      apiKey,
      apiSecret
    );

    console.log(`✅ Credentials stored securely (Account ID: ${accountId})`);

    // Step 2: Test connection
    console.log(`🔍 Testing connection to ${registrar}...`);
    
    const credentials = { apiKey, apiSecret, username, clientIp };
    const adapter = RegistrarAdapterFactory.create(registrar, credentials);
    
    const connectionTest = await adapter.testConnection();

    if (!connectionTest.success) {
      // Connection failed - mark as failed and return error
      await services.credentials.updateConnectionStatus(accountId, 'failed', connectionTest.message);
      
      return res.status(400).json({
        success: false,
        message: 'Failed to connect to registrar',
        error: connectionTest.message,
        hint: connectionTest.hint,
        errorCode: connectionTest.errorCode,
        errorDetails: connectionTest.errorDetails,
        accountId: accountId
      });
    }

    console.log(`✅ Connection successful!`);

    // Step 3: Update status to active
    await services.credentials.updateConnectionStatus(accountId, 'active', null);

    // Step 4: Trigger initial domain sync (async)
    console.log(`🔄 Starting initial domain sync...`);
    
    // Run sync in background
    domainSyncService.syncRegistrarAccount(accountId)
      .then(stats => {
        console.log(`✅ Initial sync completed for account ${accountId}:`, stats);
      })
      .catch(err => {
        console.error(`❌ Initial sync failed for account ${accountId}:`, err);
      });

    // Return success immediately (don't wait for sync to complete)
    res.json({
      success: true,
      message: `Successfully connected ${registrar} account`,
      accountId: accountId,
      registrar: registrar,
      domainsCount: connectionTest.accountInfo?.domainsCount || 0,
      syncStatus: 'in_progress'
    });

  } catch (error) {
    console.error('❌ Error connecting registrar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect registrar account',
      error: error.message
    });
  }
});

/**
 * ============================================================
 * GET /backend/registrar/accounts
 * List all registrar accounts for current user
 * ============================================================
 */
router.get('/accounts', requireAuth, async (req, res) => {
  console.log('============================================================');
  console.log('📥 GET /backend/registrar/accounts');
  console.log(`👤 User ID: ${req.user.id}`);
  console.log('============================================================');

  try {
    const result = await query(
      `SELECT 
         id,
         registrar,
         connection_status,
         last_sync_at,
         last_sync_status,
         last_sync_error,
         domains_count,
         verified_domains_count,
         created_at,
         updated_at
       FROM registrar_accounts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    console.log(`✅ Found ${result.rows.length} registrar account(s)`);

    res.json({
      success: true,
      accounts: result.rows
    });

  } catch (error) {
    console.error('❌ Error fetching registrar accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registrar accounts',
      error: error.message
    });
  }
});

/**
 * ============================================================
 * POST /backend/registrar/test
 * Test connection for an existing registrar account
 * ============================================================
 */
router.post('/test', requireAuth, async (req, res) => {
  console.log('============================================================');
  console.log('📥 POST /backend/registrar/test');
  console.log(`👤 User ID: ${req.user.id}`);
  console.log('============================================================');

  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: accountId'
      });
    }

    // Verify ownership
    const ownershipCheck = await query(
      `SELECT id FROM registrar_accounts WHERE id = $1 AND user_id = $2`,
      [accountId, req.user.id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registrar account not found or access denied'
      });
    }

    // Test connection
    const result = await domainSyncService.testConnection(accountId);

    res.json(result);

  } catch (error) {
    console.error('❌ Error testing connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test connection',
      error: error.message
    });
  }
});

/**
 * ============================================================
 * POST /backend/registrar/sync
 * Manually trigger domain sync for a registrar account
 * ============================================================
 */
router.post('/sync', requireAuth, async (req, res) => {
  console.log('============================================================');
  console.log('📥 POST /backend/registrar/sync');
  console.log(`👤 User ID: ${req.user.id}`);
  console.log('============================================================');

  try {
    const { accountId } = req.body;

    // If no accountId provided, sync all accounts for this user
    if (!accountId) {
      console.log(`🔄 Syncing all accounts for user ${req.user.id}...`);
      const results = await domainSyncService.syncUserDomains(req.user.id);
      
      return res.json({
        success: true,
        message: 'Sync completed for all accounts',
        results: results
      });
    }

    // Verify ownership
    const ownershipCheck = await query(
      `SELECT id FROM registrar_accounts WHERE id = $1 AND user_id = $2`,
      [accountId, req.user.id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registrar account not found or access denied'
      });
    }

    // Trigger sync
    console.log(`🔄 Starting manual sync for account ${accountId}...`);
    const stats = await domainSyncService.syncRegistrarAccount(accountId);

    res.json({
      success: true,
      message: 'Domain sync completed',
      stats: stats
    });

  } catch (error) {
    console.error('❌ Error syncing domains:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync domains',
      error: error.message
    });
  }
});

/**
 * ============================================================
 * DELETE /backend/registrar/disconnect
 * Disconnect a registrar account
 * ============================================================
 */
router.delete('/disconnect', requireAuth, async (req, res) => {
  console.log('============================================================');
  console.log('📥 DELETE /backend/registrar/disconnect');
  console.log(`👤 User ID: ${req.user.id}`);
  console.log('============================================================');

  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: accountId'
      });
    }

    // Verify ownership
    const accountCheck = await query(
      `SELECT id, registrar FROM registrar_accounts WHERE id = $1 AND user_id = $2`,
      [accountId, req.user.id]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registrar account not found or access denied'
      });
    }

    const registrar = accountCheck.rows[0].registrar;

    // Step 1: Delete auto-synced domains (to prevent duplicates)
    console.log(`🗑️  Deleting auto-synced domains from ${registrar}...`);
    
    const deleteResult = await query(
      `DELETE FROM domains
       WHERE registrar_account_id = $1 AND auto_synced = true
       RETURNING id, name`,
      [accountId]
    );

    console.log(`✅ Deleted ${deleteResult.rows.length} auto-synced domain(s)`);

    // Step 2: Revoke verification for manually added domains (keep them, just remove registrar link)
    const revokeResult = await query(
      `UPDATE domains
       SET registrar_account_id = NULL,
           verification_method = NULL,
           verification_level = 1,
           updated_at = NOW()
       WHERE registrar_account_id = $1 AND auto_synced = false
       RETURNING name`,
      [accountId]
    );

    console.log(`✅ Revoked ${revokeResult.rows.length} manually-added domain(s)`);

    // Step 3: Log deletion and revocation events
    const services = getSecurityServices();
    
    // Log deletions
    for (const domain of deleteResult.rows) {
      await services.logger.logVerification(
        domain.name,
        req.user.id,
        'revoked',
        {
          verificationMethod: 'registrar_api',
          registrarAccountId: accountId,
          oldStatus: 'verified',
          newStatus: 'deleted',
          reason: `Domain deleted after disconnecting ${registrar} account (was auto-synced)`
        }
      );
    }
    
    // Log revocations for manually-added domains
    for (const domain of revokeResult.rows) {
      await services.logger.logVerification(
        domain.name,
        req.user.id,
        'revoked',
        {
          verificationMethod: 'registrar_api',
          registrarAccountId: accountId,
          oldStatus: 'verified',
          newStatus: 'revoked',
          reason: `User disconnected ${registrar} account (domain kept, verification revoked)`
        }
      );
    }

    // Step 4: Delete registrar account credentials
    await services.credentials.deleteCredentials(req.user.id, accountId);

    console.log(`✅ Disconnected ${registrar} account successfully`);

    res.json({
      success: true,
      message: `Successfully disconnected ${registrar} account`,
      domainsDeleted: deleteResult.rows.length,
      domainsRevoked: revokeResult.rows.length,
      totalAffected: deleteResult.rows.length + revokeResult.rows.length
    });

  } catch (error) {
    console.error('❌ Error disconnecting registrar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect registrar account',
      error: error.message
    });
  }
});

/**
 * ============================================================
 * GET /backend/registrar/supported
 * Get list of supported registrars
 * ============================================================
 */
router.get('/supported', async (req, res) => {
  try {
    const registrars = RegistrarAdapterFactory.getSupportedRegistrars();
    
    res.json({
      success: true,
      registrars: registrars
    });
  } catch (error) {
    console.error('❌ Error fetching supported registrars:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supported registrars',
      error: error.message
    });
  }
});

/**
 * ============================================================
 * GET /backend/registrar/stats
 * Get sync statistics for user's registrar accounts
 * ============================================================
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { accountId } = req.query;

    let statsQuery, params;

    if (accountId) {
      // Get stats for specific account
      statsQuery = `
        SELECT 
          ra.id,
          ra.registrar,
          ra.domains_count,
          ra.verified_domains_count,
          ra.last_sync_at,
          ra.last_sync_status,
          COUNT(d.id) as total_domains,
          COUNT(CASE WHEN d.verification_status = 'verified' THEN 1 END) as verified_domains
        FROM registrar_accounts ra
        LEFT JOIN domains d ON d.registrar_account_id = ra.id
        WHERE ra.id = $1 AND ra.user_id = $2
        GROUP BY ra.id
      `;
      params = [accountId, req.user.id];
    } else {
      // Get stats for all user's accounts
      statsQuery = `
        SELECT 
          ra.id,
          ra.registrar,
          ra.domains_count,
          ra.verified_domains_count,
          ra.last_sync_at,
          ra.last_sync_status,
          COUNT(d.id) as total_domains,
          COUNT(CASE WHEN d.verification_status = 'verified' THEN 1 END) as verified_domains
        FROM registrar_accounts ra
        LEFT JOIN domains d ON d.registrar_account_id = ra.id
        WHERE ra.user_id = $1
        GROUP BY ra.id
        ORDER BY ra.created_at DESC
      `;
      params = [req.user.id];
    }

    const result = await query(statsQuery, params);

    res.json({
      success: true,
      stats: result.rows
    });

  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

/**
 * ============================================================
 * GET /backend/registrar/sync-history
 * Get sync history for a registrar account
 * ============================================================
 */
router.get('/sync-history', requireAuth, async (req, res) => {
  try {
    const { accountId, limit = 50 } = req.query;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: accountId'
      });
    }

    // Verify ownership
    const ownershipCheck = await query(
      `SELECT id FROM registrar_accounts WHERE id = $1 AND user_id = $2`,
      [accountId, req.user.id]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Registrar account not found or access denied'
      });
    }

    // Get sync history
    const result = await query(
      `SELECT 
         id,
         sync_status,
         domains_found,
         domains_added,
         domains_removed,
         domains_updated,
         error_message,
         api_response_time_ms,
         started_at,
         completed_at
       FROM registrar_sync_history
       WHERE registrar_account_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [accountId, limit]
    );

    res.json({
      success: true,
      history: result.rows
    });

  } catch (error) {
    console.error('❌ Error fetching sync history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sync history',
      error: error.message
    });
  }
});

module.exports = router;
