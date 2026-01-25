const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const {
  checkDomainTransferLock,
  verifyDomainOwnership,
  getDomainAuthCode,
  initiateDomainTransfer,
  updateTransferStatus,
  getTransferStatus
} = require('../services/domainService');

/**
 * GET /api/domains/check-landing-page
 * Check if a domain has a landing page in the system
 * Query params:
 * - domain: Domain name to check (required)
 * - userId: User ID (required for user-specific check)
 */
router.get('/check-landing-page', async (req, res) => {
  console.log('\n🔍 Checking domain landing page...');
  
  try {
    const { domain, userId } = req.query;

    // Validation
    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'domain query parameter is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId query parameter is required'
      });
    }

    // Clean domain name
    const cleanDomain = domain.toLowerCase().trim();
    const userIdNum = parseInt(userId);

    console.log(`   Domain: ${cleanDomain}`);
    console.log(`   User ID: ${userIdNum}`);

    // Query campaigns table for landing page URL
    const result = await query(
      `SELECT 
        id,
        campaign_id,
        campaign_name,
        domain_name, 
        landing_page_url,
        include_landing_page,
        created_at, 
        updated_at
       FROM campaigns
       WHERE domain_name = $1 AND user_id = $2 AND landing_page_url IS NOT NULL AND landing_page_url != ''
       ORDER BY created_at DESC
       LIMIT 1`,
      [cleanDomain, userIdNum]
    );

    if (result.rows.length > 0) {
      const campaign = result.rows[0];
      console.log(`✅ Landing page found: ${campaign.landing_page_url}`);

      return res.json({
        success: true,
        exists: true,
        data: {
          id: campaign.id,
          campaignId: campaign.campaign_id,
          url: campaign.landing_page_url,
          domain: campaign.domain_name,
          campaignName: campaign.campaign_name,
          includeLandingPage: campaign.include_landing_page,
          createdAt: campaign.created_at,
          updatedAt: campaign.updated_at
        },
        message: `Landing page exists for ${cleanDomain}`
      });
    } else {
      console.log(`❌ No landing page found for: ${cleanDomain}`);

      return res.json({
        success: true,
        exists: false,
        data: null,
        message: `No landing page found for ${cleanDomain}`
      });
    }

  } catch (error) {
    console.error('❌ Error checking domain landing page:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check domain landing page',
      message: error.message
    });
  }
});

/**
 * POST /api/domains/check-lock-status
 * Check if a domain is locked for transfer via WHOIS lookup
 */
router.post('/check-lock-status', async (req, res) => {
  console.log('🔍 Checking domain lock status...');

  try {
    const { domainName } = req.body;

    if (!domainName) {
      return res.status(400).json({
        success: false,
        error: 'domainName is required'
      });
    }

    // Clean and validate domain name
    const cleanDomain = domainName.toLowerCase().trim();
    
    if (!cleanDomain.includes('.')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid domain name format'
      });
    }

    console.log(`   Domain: ${cleanDomain}`);

    // Check transfer lock status
    const lockStatus = await checkDomainTransferLock(cleanDomain);

    // If the check failed, return error response
    if (!lockStatus.success) {
      return res.status(503).json({
        success: false,
        domainName: cleanDomain,
        error: lockStatus.error,
        message: lockStatus.message,
        isLocked: null,
        canTransfer: null,
        status: 'unknown'
      });
    }

    // Parse status codes from WHOIS/RDAP data
    const statusCodes = lockStatus.lockStatus && lockStatus.lockStatus.length > 0 
      ? lockStatus.lockStatus 
      : ['ok'];

    res.json({
      success: lockStatus.success,
      domainName: cleanDomain,
      isLocked: lockStatus.isTransferLocked,
      status: lockStatus.isTransferLocked ? 'locked' : 'unlocked',
      statusCodes: statusCodes,
      canTransfer: lockStatus.canTransfer,
      registrar: lockStatus.registrar,
      expiryDate: lockStatus.expiryDate,
      nameservers: lockStatus.nameservers,
      message: lockStatus.message,
      unlockInstructions: lockStatus.unlockInstructions,
      dataSource: lockStatus.dataSource, // 'WHOIS' or 'RDAP'
      detailedInfo: {
        registrar: lockStatus.registrar,
        expiresOn: lockStatus.expiryDate,
        nameservers: lockStatus.nameservers
      }
    });

  } catch (error) {
    console.error('❌ Error checking lock status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check domain lock status',
      message: error.message
    });
  }
});

/**
 * POST /api/domains/add
 * Add a new domain to user's portfolio
 */
router.post('/add', async (req, res) => {
  console.log('➕ Adding new domain...');

  try {
    const {
      userId,
      name,
      value,
      category,
      keywords,
      registrar,
      registrarUrl,
      expiryDate,
      autoRenew
    } = req.body;

    // Validate required fields
    if (!userId || !name || !value || !category) {
      return res.status(400).json({
        success: false,
        error: 'userId, name, value, and category are required'
      });
    }

    // Clean domain name
    const cleanDomain = name.toLowerCase().trim();

    // Check if domain already exists for this user
    const existingDomain = await query(
      'SELECT * FROM domains WHERE user_id = $1 AND name = $2',
      [userId, cleanDomain]
    );

    if (existingDomain.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Domain already exists in your portfolio'
      });
    }

    // Generate verification code for ownership verification
    const verificationCode = `domain-verification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert domain
    const result = await query(
      `INSERT INTO domains 
        (user_id, name, value, category, keywords, registrar, registrar_url, 
         expiry_date, auto_renew, verification_code, status, transfer_locked, 
         created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Available', true, NOW(), NOW())
       RETURNING *`,
      [
        userId,
        cleanDomain,
        value,
        category,
        keywords || [],
        registrar || null,
        registrarUrl || null,
        expiryDate || null,
        autoRenew !== undefined ? autoRenew : true,
        verificationCode
      ]
    );

    console.log(`✅ Domain added: ${cleanDomain}`);

    res.status(201).json({
      success: true,
      message: 'Domain added successfully',
      domain: result.rows[0],
      nextSteps: {
        verifyOwnership: true,
        verificationCode,
        instructions: [
          'Add a TXT record to your domain\'s DNS:',
          `Name: @`,
          `Value: ${verificationCode}`,
          'Wait 5-10 minutes for DNS propagation',
          'Click "Verify Ownership" to complete verification'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Error adding domain:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add domain',
      message: error.message
    });
  }
});

/**
 * POST /api/domains/:domainId/verify
 * Verify domain ownership via DNS TXT record
 */
router.post('/:domainId/verify', async (req, res) => {
  console.log(`🔐 Verifying domain ownership...`);

  try {
    const { domainId } = req.params;

    // Get domain from database
    const domainResult = await query(
      'SELECT * FROM domains WHERE id = $1',
      [domainId]
    );

    if (domainResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Domain not found'
      });
    }

    const domain = domainResult.rows[0];

    if (domain.ownership_verified) {
      return res.json({
        success: true,
        message: 'Domain is already verified',
        verified: true,
        verifiedAt: domain.verified_at
      });
    }

    // Verify ownership
    const verificationResult = await verifyDomainOwnership(
      domain.name,
      domain.verification_code
    );

    if (verificationResult.verified) {
      // Update domain as verified
      await query(
        `UPDATE domains 
         SET ownership_verified = true, verified_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [domainId]
      );

      console.log(`✅ Domain ${domain.name} verified successfully`);

      return res.json({
        success: true,
        verified: true,
        message: 'Domain ownership verified successfully!',
        domain: domain.name
      });
    } else {
      return res.json({
        success: true,
        verified: false,
        message: verificationResult.message,
        instructions: verificationResult.instructions
      });
    }

  } catch (error) {
    console.error('❌ Error verifying domain:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify domain',
      message: error.message
    });
  }
});

/**
 * GET /api/domains/:domainId/transfer-lock
 * Check if domain has transfer lock enabled
 */
router.get('/:domainId/transfer-lock', async (req, res) => {
  console.log(`🔒 Checking domain transfer lock...`);

  try {
    const { domainId } = req.params;

    // Get domain from database
    const domainResult = await query(
      'SELECT * FROM domains WHERE id = $1',
      [domainId]
    );

    if (domainResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Domain not found'
      });
    }

    const domain = domainResult.rows[0];

    // Check transfer lock via WHOIS
    const lockStatus = await checkDomainTransferLock(domain.name);

    // Update domain record with lock status
    await query(
      `UPDATE domains 
       SET transfer_locked = $1, 
           registrar = COALESCE($2, registrar),
           updated_at = NOW()
       WHERE id = $3`,
      [lockStatus.isTransferLocked, lockStatus.registrar, domainId]
    );

    res.json({
      success: true,
      domain: domain.name,
      ...lockStatus
    });

  } catch (error) {
    console.error('❌ Error checking transfer lock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check transfer lock',
      message: error.message
    });
  }
});

/**
 * POST /api/domains/:domainId/check-transfer-ready
 * Comprehensive check if domain is ready for transfer
 */
router.post('/:domainId/check-transfer-ready', async (req, res) => {
  console.log(`✅ Checking if domain is ready for transfer...`);

  try {
    const { domainId } = req.params;

    // Get domain from database
    const domainResult = await query(
      'SELECT * FROM domains WHERE id = $1',
      [domainId]
    );

    if (domainResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Domain not found'
      });
    }

    const domain = domainResult.rows[0];
    const checks = {
      ownershipVerified: domain.ownership_verified,
      transferLockDisabled: false,
      hasAuthCode: !!domain.auth_code,
      isAvailable: domain.status === 'Available'
    };

    let readyForTransfer = true;
    const issues = [];
    const recommendations = [];

    // Check 1: Ownership verification
    if (!checks.ownershipVerified) {
      readyForTransfer = false;
      issues.push('Domain ownership not verified');
      recommendations.push('Verify domain ownership via DNS TXT record');
    }

    // Check 2: Transfer lock
    const lockStatus = await checkDomainTransferLock(domain.name);
    checks.transferLockDisabled = !lockStatus.isTransferLocked;
    checks.lockCheckDetails = lockStatus;

    if (lockStatus.isTransferLocked) {
      readyForTransfer = false;
      issues.push('Domain transfer is locked');
      recommendations.push('Unlock domain at your registrar before initiating transfer');
      if (lockStatus.unlockInstructions) {
        recommendations.push(...lockStatus.unlockInstructions.steps);
      }
    }

    // Check 3: Auth code
    if (!checks.hasAuthCode) {
      issues.push('Authorization code not set');
      recommendations.push('Obtain and save EPP/Auth code from your registrar');
    }

    // Check 4: Domain status
    if (!checks.isAvailable) {
      readyForTransfer = false;
      issues.push(`Domain status is "${domain.status}" (must be "Available")`);
    }

    // Update domain lock status
    await query(
      `UPDATE domains 
       SET transfer_locked = $1, updated_at = NOW()
       WHERE id = $2`,
      [lockStatus.isTransferLocked, domainId]
    );

    res.json({
      success: true,
      domain: domain.name,
      readyForTransfer,
      checks,
      issues: issues.length > 0 ? issues : null,
      recommendations: recommendations.length > 0 ? recommendations : null,
      message: readyForTransfer 
        ? '✅ Domain is ready for seamless transfer!'
        : '⚠️ Please resolve the issues below before initiating transfer'
    });

  } catch (error) {
    console.error('❌ Error checking transfer readiness:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check transfer readiness',
      message: error.message
    });
  }
});

/**
 * POST /api/domains/initiate-transfer
 * Initiate domain transfer after payment
 */
router.post('/initiate-transfer', async (req, res) => {
  console.log('🚀 Initiating domain transfer...');

  try {
    const {
      domainName,
      sellerId,
      buyerId,
      buyerEmail,
      authCode,
      paymentId,
      paymentType
    } = req.body;

    // Validate required fields
    if (!domainName || !sellerId || !buyerEmail) {
      return res.status(400).json({
        success: false,
        error: 'domainName, sellerId, and buyerEmail are required'
      });
    }

    // Get domain info
    const domainResult = await query(
      'SELECT * FROM domains WHERE name = $1 AND user_id = $2',
      [domainName, sellerId]
    );

    if (domainResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Domain not found or does not belong to this seller'
      });
    }

    const domain = domainResult.rows[0];

    // Use auth code from request or from domain record
    const finalAuthCode = authCode || domain.auth_code;

    if (!finalAuthCode) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required for transfer',
        message: 'Please provide the EPP/auth code from your registrar'
      });
    }

    // Initiate transfer
    const transferResult = await initiateDomainTransfer({
      domainName,
      sellerId,
      buyerId,
      buyerEmail,
      authCode: finalAuthCode,
      paymentId
    });

    if (!transferResult.success) {
      return res.status(400).json(transferResult);
    }

    // Update domain status
    await query(
      `UPDATE domains 
       SET status = 'Pending', updated_at = NOW()
       WHERE id = $1`,
      [domain.id]
    );

    // Update payment record if provided
    if (paymentId && paymentType === 'stripe') {
      await query(
        `UPDATE stripe_payments 
         SET transfer_id = $1, transfer_initiated = true, updated_at = NOW()
         WHERE id = $2`,
        [transferResult.transfer.id, paymentId]
      );
    }

    res.json({
      success: true,
      message: 'Domain transfer initiated successfully',
      transfer: transferResult.transfer,
      nextSteps: transferResult.nextSteps
    });

  } catch (error) {
    console.error('❌ Error initiating transfer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate transfer',
      message: error.message
    });
  }
});

/**
 * GET /api/domains/transfers/:transferId
 * Get transfer status
 */
router.get('/transfers/:transferId', async (req, res) => {
  console.log(`📊 Fetching transfer status...`);

  try {
    const { transferId } = req.params;

    const result = await getTransferStatus(transferId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    // Get transfer logs
    const logsResult = await query(
      `SELECT * FROM domain_transfer_logs 
       WHERE transfer_id = $1 
       ORDER BY created_at DESC`,
      [transferId]
    );

    res.json({
      success: true,
      transfer: result.transfer,
      logs: logsResult.rows
    });

  } catch (error) {
    console.error('❌ Error fetching transfer status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transfer status',
      message: error.message
    });
  }
});

/**
 * PUT /api/domains/transfers/:transferId/status
 * Update transfer status
 */
router.put('/transfers/:transferId/status', async (req, res) => {
  console.log(`📝 Updating transfer status...`);

  try {
    const { transferId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required'
      });
    }

    const validStatuses = [
      'initiated',
      'auth_provided',
      'pending_approval',
      'in_progress',
      'completed',
      'failed',
      'cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await updateTransferStatus(transferId, status, notes);

    if (!result.success) {
      return res.status(404).json(result);
    }

    // If transfer completed, update domain status
    if (status === 'completed') {
      await query(
        `UPDATE domains 
         SET status = 'Sold', updated_at = NOW()
         WHERE name = $1`,
        [result.transfer.domain_name]
      );

      // Update payment if linked
      if (result.transfer.payment_id) {
        await query(
          `UPDATE stripe_payments 
           SET transfer_completed_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [result.transfer.payment_id]
        );
      }
    }

    res.json({
      success: true,
      message: `Transfer status updated to ${status}`,
      transfer: result.transfer
    });

  } catch (error) {
    console.error('❌ Error updating transfer status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update transfer status',
      message: error.message
    });
  }
});

/**
 * GET /api/domains/user/:userId
 * Get all domains for a user
 */
router.get('/user/:userId', async (req, res) => {
  console.log(`📋 Fetching domains for user...`);

  try {
    const { userId } = req.params;
    const { status, verified } = req.query;

    let queryText = 'SELECT * FROM domains WHERE user_id = $1';
    const queryParams = [userId];

    if (status) {
      queryText += ` AND status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    if (verified !== undefined) {
      queryText += ` AND ownership_verified = $${queryParams.length + 1}`;
      queryParams.push(verified === 'true');
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      domains: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error fetching domains:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch domains',
      message: error.message
    });
  }
});

/**
 * GET /api/domains/transfers/user/:userId
 * Get all transfers for a user (as buyer or seller)
 */
router.get('/transfers/user/:userId', async (req, res) => {
  console.log(`📋 Fetching transfers for user...`);

  try {
    const { userId } = req.params;
    const { role } = req.query; // 'seller', 'buyer', or 'all'

    let queryText = `
      SELECT dt.*, 
        u1.username as seller_username,
        u1.email as seller_email,
        u2.username as buyer_username
      FROM domain_transfers dt
      LEFT JOIN users u1 ON dt.seller_id = u1.id
      LEFT JOIN users u2 ON dt.buyer_id = u2.id
      WHERE 
    `;

    if (role === 'seller') {
      queryText += 'dt.seller_id = $1';
    } else if (role === 'buyer') {
      queryText += 'dt.buyer_id = $1';
    } else {
      queryText += '(dt.seller_id = $1 OR dt.buyer_id = $1)';
    }

    queryText += ' ORDER BY dt.created_at DESC';

    const result = await query(queryText, [userId]);

    res.json({
      success: true,
      transfers: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error fetching transfers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transfers',
      message: error.message
    });
  }
});

module.exports = router;

