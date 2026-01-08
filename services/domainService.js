const axios = require('axios');
const { query } = require('../config/database');
const dns = require('dns').promises;
const whois = require('whois-json');

/**
 * Domain Service
 * Handles domain verification, transfer lock checking, and transfer management
 */

/**
 * Check domain transfer lock status using WHOIS
 * @param {string} domainName - The domain name to check
 * @returns {Object} - Transfer lock status and details
 */
const checkDomainTransferLock = async (domainName) => {
  try {
    console.log(`🔍 Checking transfer lock status for: ${domainName}`);

    // Get WHOIS data
    const whoisData = await whois(domainName);
    
    // DEBUG: Log the entire WHOIS response to understand what we're getting
    console.log('📋 WHOIS Data Keys:', Object.keys(whoisData));
    console.log('📋 Domain Status Fields:', {
      domainStatus: whoisData.domainStatus,
      status: whoisData.status,
      'Domain Status': whoisData['Domain Status'],
      'domain status': whoisData['domain status'],
      DomainStatus: whoisData.DomainStatus
    });
    
    // Check for common transfer lock indicators
    const transferLockIndicators = [
      'clientTransferProhibited',
      'serverTransferProhibited',
      'transfer-lock',
      'transferProhibited'
    ];

    let isLocked = false;
    let lockStatus = [];
    let allStatuses = [];

    // Try multiple possible status field names (WHOIS data format varies)
    const possibleStatusFields = [
      whoisData.domainStatus,
      whoisData.status,
      whoisData['Domain Status'],
      whoisData['domain status'],
      whoisData.DomainStatus,
      whoisData.StatusList,
      whoisData.statuslist
    ];

    // Find the first non-empty status field
    let foundStatuses = null;
    for (const field of possibleStatusFields) {
      if (field !== undefined && field !== null && field !== '') {
        foundStatuses = field;
        break;
      }
    }

    if (foundStatuses) {
      // Convert to array if not already
      const statusArray = Array.isArray(foundStatuses) 
        ? foundStatuses 
        : [foundStatuses];

      // Store all statuses for debugging
      allStatuses = statusArray;
      console.log('📋 Found Status Array:', statusArray);

      statusArray.forEach(status => {
        const statusStr = typeof status === 'string' ? status.toLowerCase() : String(status).toLowerCase();
        
        // Check each indicator
        transferLockIndicators.forEach(indicator => {
          if (statusStr.includes(indicator.toLowerCase())) {
            isLocked = true;
            lockStatus.push(status);
            console.log(`🔒 LOCK DETECTED: "${status}" contains "${indicator}"`);
          }
        });
      });
    } else {
      console.log('⚠️ WARNING: No domain status field found in WHOIS data');
    }

    // Log final determination
    console.log(`🔐 Final Lock Status for ${domainName}:`, {
      isLocked,
      lockStatuses: lockStatus,
      allStatuses: allStatuses,
      canTransfer: !isLocked
    });

    return {
      success: true,
      domain: domainName,
      isTransferLocked: isLocked,
      lockStatus: lockStatus.length > 0 ? lockStatus : allStatuses,
      canTransfer: !isLocked,
      registrar: whoisData.registrar || whoisData.registrarName || 'Unknown',
      expiryDate: whoisData.expirationDate || whoisData.registryExpiryDate,
      nameservers: whoisData.nameServer || whoisData.nameServers || [],
      message: isLocked 
        ? '⚠️ Domain transfer is LOCKED. You must unlock it at your registrar before transfer.'
        : '✅ Domain is UNLOCKED and ready for transfer.',
      unlockInstructions: isLocked ? getUnlockInstructions(whoisData.registrar) : null
    };

  } catch (error) {
    console.error(`❌ Error checking transfer lock for ${domainName}:`, error.message);
    return {
      success: false,
      domain: domainName,
      error: error.message,
      message: 'Unable to verify transfer lock status. Please check manually with your registrar.',
      canTransfer: null
    };
  }
};

/**
 * Get domain unlock instructions based on registrar
 * @param {string} registrar - Domain registrar name
 * @returns {Object} - Instructions for unlocking domain
 */
const getUnlockInstructions = (registrar) => {
  const registrarLower = (registrar || '').toLowerCase();
  
  const instructions = {
    godaddy: {
      steps: [
        'Log in to your GoDaddy account',
        'Go to "My Products" → "Domains"',
        'Click on the domain you want to unlock',
        'Scroll down to "Additional Settings"',
        'Toggle "Domain Lock" to OFF',
        'Confirm the change'
      ],
      estimatedTime: '5 minutes',
      url: 'https://www.godaddy.com/help/unlock-my-domain-410'
    },
    namecheap: {
      steps: [
        'Log in to your Namecheap account',
        'Go to Domain List',
        'Click "Manage" next to your domain',
        'Find "Domain Lock" section',
        'Click "Unlock" or toggle the switch to OFF',
        'Confirm the unlock'
      ],
      estimatedTime: '5 minutes',
      url: 'https://www.namecheap.com/support/knowledgebase/article.aspx/268/37/how-to-unlock-a-domain/'
    },
    cloudflare: {
      steps: [
        'Log in to Cloudflare Registrar',
        'Select your domain',
        'Go to Configuration',
        'Find "Transfer Lock"',
        'Disable transfer lock',
        'Save changes'
      ],
      estimatedTime: '3 minutes',
      url: 'https://developers.cloudflare.com/registrar/account-options/transfer-lock/'
    },
    default: {
      steps: [
        'Log in to your domain registrar account',
        'Navigate to your domain management page',
        'Look for "Domain Lock", "Transfer Lock", or "Registrar Lock"',
        'Disable/unlock the domain',
        'Save your changes',
        'Wait a few minutes for the change to propagate'
      ],
      estimatedTime: '5-10 minutes',
      url: null
    }
  };

  // Try to match registrar
  for (const [key, value] of Object.entries(instructions)) {
    if (registrarLower.includes(key)) {
      return value;
    }
  }

  return instructions.default;
};

/**
 * Verify domain ownership via DNS TXT record
 * @param {string} domainName - Domain to verify
 * @param {string} verificationCode - Unique code to check in DNS
 * @returns {Object} - Verification result
 */
const verifyDomainOwnership = async (domainName, verificationCode) => {
  try {
    console.log(`🔐 Verifying ownership of ${domainName}`);

    // Look for TXT record with verification code
    const txtRecords = await dns.resolveTxt(domainName);
    
    let verified = false;
    txtRecords.forEach(record => {
      const recordStr = Array.isArray(record) ? record.join('') : record;
      if (recordStr.includes(verificationCode)) {
        verified = true;
      }
    });

    return {
      success: true,
      verified,
      domain: domainName,
      message: verified 
        ? '✅ Domain ownership verified successfully!'
        : '❌ Verification code not found in DNS records.',
      instructions: !verified ? {
        steps: [
          `Add a TXT record to ${domainName} with the value:`,
          `domain-verification=${verificationCode}`,
          'Wait 5-10 minutes for DNS propagation',
          'Try verification again'
        ]
      } : null
    };

  } catch (error) {
    console.error(`❌ Error verifying ${domainName}:`, error.message);
    return {
      success: false,
      verified: false,
      domain: domainName,
      error: error.message,
      message: 'Failed to verify domain ownership'
    };
  }
};

/**
 * Get domain transfer authorization code (EPP code)
 * This would typically integrate with registrar APIs
 * @param {string} domainName - Domain name
 * @param {string} registrar - Registrar name
 * @param {Object} credentials - API credentials for registrar
 * @returns {Object} - Auth code info
 */
const getDomainAuthCode = async (domainName, registrar, credentials) => {
  // Note: This is a placeholder - actual implementation would need registrar-specific API integrations
  console.log(`🔑 Requesting auth code for ${domainName} from ${registrar}`);
  
  return {
    success: false,
    message: 'Manual retrieval required',
    instructions: {
      steps: [
        'Log in to your domain registrar',
        'Go to domain management',
        'Request "Authorization Code" or "EPP Code"',
        'The code will be emailed to the domain admin contact',
        'Provide this code to the buyer for transfer'
      ]
    }
  };
};

/**
 * Initiate domain transfer
 * @param {Object} transferData - Transfer information
 * @returns {Object} - Transfer initiation result
 */
const initiateDomainTransfer = async (transferData) => {
  const {
    domainName,
    sellerId,
    buyerId,
    buyerEmail,
    authCode,
    paymentId
  } = transferData;

  try {
    console.log(`🚀 Initiating transfer for ${domainName}`);

    // 1. Check transfer lock status
    const lockStatus = await checkDomainTransferLock(domainName);
    
    if (!lockStatus.success) {
      return {
        success: false,
        step: 'lock_check',
        error: 'Failed to verify domain transfer status',
        details: lockStatus
      };
    }

    if (lockStatus.isTransferLocked) {
      return {
        success: false,
        step: 'lock_check',
        error: 'Domain is locked',
        message: 'The domain transfer lock must be disabled before initiating transfer.',
        unlockInstructions: lockStatus.unlockInstructions
      };
    }

    // 2. Create transfer record in database
    const transferResult = await query(
      `INSERT INTO domain_transfers 
        (domain_name, seller_id, buyer_id, buyer_email, auth_code, payment_id, 
         status, transfer_step, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'initiated', 'auth_code_provided', NOW(), NOW())
       RETURNING *`,
      [domainName, sellerId, buyerId, buyerEmail, authCode, paymentId]
    );

    const transfer = transferResult.rows[0];

    // 3. Send transfer instructions to buyer
    const { sendEmail } = require('./emailService');
    
    await sendEmail({
      to: buyerEmail,
      subject: `Domain Transfer Instructions: ${domainName}`,
      html: generateTransferInstructionsEmail(domainName, authCode, lockStatus),
      text: `Transfer Instructions for ${domainName}\n\nAuth Code: ${authCode}\n\nThe domain is unlocked and ready for transfer.`,
      tags: ['domain-transfer', `domain-${domainName}`]
    });

    return {
      success: true,
      transfer,
      message: 'Domain transfer initiated successfully',
      nextSteps: [
        'Buyer will initiate transfer at their registrar',
        'Seller must approve transfer request',
        'Transfer typically completes in 5-7 days'
      ]
    };

  } catch (error) {
    console.error(`❌ Error initiating transfer:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate transfer instructions email
 */
const generateTransferInstructionsEmail = (domainName, authCode, lockStatus) => {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;border-radius:16px 16px 0 0;">
        <div style="font-size:60px;margin-bottom:10px;">🔐</div>
        <h1 style="color:white;margin:0;font-size:28px;">Domain Transfer Ready!</h1>
      </div>
      
      <div style="padding:40px;background:#f8fafc;border-radius:0 0 16px 16px;">
        <p style="font-size:18px;color:#334155;margin:0 0 25px 0;">
          Great news! Your domain <strong>${domainName}</strong> is ready for transfer.
        </p>
        
        <div style="background:white;border:2px solid #667eea;border-radius:12px;padding:25px;margin:25px 0;">
          <h3 style="margin:0 0 15px 0;color:#667eea;">🔑 Authorization Code (EPP Code)</h3>
          <div style="background:#f1f5f9;padding:15px;border-radius:8px;font-family:monospace;font-size:18px;color:#1e293b;font-weight:600;">
            ${authCode || 'Contact seller for auth code'}
          </div>
          <p style="color:#64748b;font-size:14px;margin:10px 0 0 0;">
            ⚠️ Keep this code secure - it's required to transfer the domain
          </p>
        </div>

        <div style="background:#d1fae5;border:2px solid #10b981;border-radius:12px;padding:20px;margin:25px 0;">
          <h4 style="margin:0 0 15px 0;color:#065f46;">✅ Transfer Lock Status</h4>
          <p style="margin:0;color:#065f46;font-weight:600;">
            ${lockStatus.message}
          </p>
          ${lockStatus.isTransferLocked ? `
            <div style="margin-top:15px;padding-top:15px;border-top:1px solid #10b981;">
              <p style="margin:0 0 10px 0;color:#065f46;font-weight:600;">Unlock Instructions:</p>
              <ol style="margin:0;padding-left:20px;color:#065f46;">
                ${lockStatus.unlockInstructions?.steps.map(step => `<li>${step}</li>`).join('') || ''}
              </ol>
            </div>
          ` : ''}
        </div>
        
        <div style="background:#eff6ff;border-radius:12px;padding:20px;margin:25px 0;">
          <h4 style="margin:0 0 15px 0;color:#1e40af;">📋 Transfer Steps</h4>
          <ol style="color:#1e40af;margin:0;padding-left:20px;line-height:1.8;">
            <li>Log in to your domain registrar account</li>
            <li>Find "Transfer Domain In" or similar option</li>
            <li>Enter the domain name: <strong>${domainName}</strong></li>
            <li>Provide the authorization code above</li>
            <li>Confirm and pay any transfer fees (usually includes 1-year renewal)</li>
            <li>Wait for seller to approve the transfer</li>
            <li>Transfer completes in 5-7 days</li>
          </ol>
        </div>

        <div style="background:#fef3c7;border-radius:12px;padding:20px;margin:25px 0;">
          <h4 style="margin:0 0 10px 0;color:#92400e;">⚡ Pro Tips</h4>
          <ul style="color:#78350f;margin:0;padding-left:20px;line-height:1.8;">
            <li>Transfer is usually free but may include a 1-year renewal at receiving registrar</li>
            <li>Domain will remain active during transfer</li>
            <li>The seller must approve the transfer within 5 days</li>
            <li>Keep your email accessible for transfer confirmation</li>
          </ul>
        </div>

        <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:25px 0;">
          <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">
            <strong>Domain:</strong> ${domainName}<br>
            <strong>Registrar:</strong> ${lockStatus.registrar}<br>
            <strong>Status:</strong> Ready for Transfer<br>
            <strong>Estimated Time:</strong> 5-7 days
          </p>
        </div>
        
        <p style="color:#64748b;font-size:14px;text-align:center;margin:30px 0 0 0;">
          Questions? Contact the seller or your new registrar's support team.
        </p>
      </div>
    </div>
  `;
};

/**
 * Update domain transfer status
 */
const updateTransferStatus = async (transferId, status, notes = null) => {
  try {
    const result = await query(
      `UPDATE domain_transfers 
       SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, notes, transferId]
    );

    return {
      success: true,
      transfer: result.rows[0]
    };

  } catch (error) {
    console.error('❌ Error updating transfer status:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get transfer status
 */
const getTransferStatus = async (transferId) => {
  try {
    const result = await query(
      `SELECT dt.*, 
        u1.email as seller_email, u1.username as seller_username,
        u2.email as buyer_email_from_user, u2.username as buyer_username
       FROM domain_transfers dt
       LEFT JOIN users u1 ON dt.seller_id = u1.id
       LEFT JOIN users u2 ON dt.buyer_id = u2.id
       WHERE dt.id = $1`,
      [transferId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Transfer not found'
      };
    }

    return {
      success: true,
      transfer: result.rows[0]
    };

  } catch (error) {
    console.error('❌ Error getting transfer status:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  checkDomainTransferLock,
  verifyDomainOwnership,
  getDomainAuthCode,
  initiateDomainTransfer,
  updateTransferStatus,
  getTransferStatus,
  getUnlockInstructions
};

