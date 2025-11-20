const axios = require('axios');
const { query } = require('../config/database');
require('dotenv').config();

/**
 * Escrow.com API Integration
 * Generates secure escrow payment links for domain transactions
 */

const ESCROW_API_URL = process.env.ESCROW_API_URL || 'https://api.escrow.com/2017-09-01';
const ESCROW_EMAIL = process.env.ESCROW_EMAIL;
const ESCROW_API_KEY = process.env.ESCROW_API_KEY;

/**
 * Generate escrow payment link for a domain sale
 * @param {Object} transactionData - Transaction details
 * @returns {Promise<Object>} Escrow transaction details with payment link
 */
const createEscrowTransaction = async (transactionData) => {
  const {
    domainName,
    buyerEmail,
    buyerName,
    sellerEmail,
    sellerName,
    amount,
    currency = 'USD',
    campaignId,
    userId,
    feePayer = 'buyer' // 'buyer', 'seller', or 'split'
  } = transactionData;

  console.log('💰 CREATING ESCROW TRANSACTION');
  console.log(`   Domain: ${domainName}`);
  console.log(`   Buyer: ${buyerName} (${buyerEmail})`);
  console.log(`   Seller: ${sellerName} (${sellerEmail})`);
  console.log(`   Amount: $${amount} ${currency}`);
  console.log(`   Fee Payer: ${feePayer}`);

  try {
    // Check if user has escrow configured
    const userConfig = await getUserEscrowConfig(userId);
    
    if (!userConfig.enabled) {
      console.warn('⚠️  User has not connected escrow account - using manual link');
      return generateManualEscrowLink(transactionData);
    }

    // Use Escrow.com API to create transaction
    const escrowData = {
      parties: [
        {
          role: 'buyer',
          customer: {
            name: buyerName,
            email: buyerEmail
          }
        },
        {
          role: 'seller',
          customer: {
            name: sellerName,
            email: sellerEmail
          }
        }
      ],
      currency: currency,
      description: `Purchase of domain name: ${domainName}`,
      items: [
        {
          title: domainName,
          description: `Domain name: ${domainName}`,
          type: 'domain_name',
          inspection_period: 259200, // 3 days in seconds
          quantity: 1,
          schedule: [
            {
              amount: parseFloat(amount),
              payer_customer: buyerEmail,
              beneficiary_customer: sellerEmail
            }
          ],
          fees: [
            {
              type: 'escrow',
              payer_customer: feePayer === 'buyer' ? buyerEmail : 
                              feePayer === 'seller' ? sellerEmail : 
                              null // split
            }
          ]
        }
      ]
    };

    console.log('🚀 Calling Escrow.com API...');

    let response;
    if (ESCROW_API_KEY && userConfig.apiKey) {
      // Make actual API call if configured
      response = await axios.post(
        `${ESCROW_API_URL}/transaction`,
        escrowData,
        {
          auth: {
            username: userConfig.email || ESCROW_EMAIL,
            password: userConfig.apiKey || ESCROW_API_KEY
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const transactionId = response.data.id;
      const escrowUrl = `https://www.escrow.com/transaction/${transactionId}`;

      console.log(`✅ Escrow transaction created: ${transactionId}`);
      console.log(`🔗 Payment URL: ${escrowUrl}`);

      // Store in database
      await query(
        `INSERT INTO escrow_transactions 
          (transaction_id, campaign_id, buyer_email, domain_name, amount, currency, status, escrow_url, fee_payer, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)
         RETURNING id`,
        [transactionId, campaignId, buyerEmail, domainName, amount, currency, escrowUrl, feePayer, userId]
      );

      return {
        success: true,
        transactionId,
        escrowUrl,
        amount,
        currency,
        feePayer,
        message: 'Escrow transaction created successfully'
      };
    } else {
      // Fallback to manual escrow link
      console.warn('⚠️  Escrow API not configured - generating manual link');
      return generateManualEscrowLink(transactionData);
    }

  } catch (error) {
    console.error('❌ Error creating escrow transaction:', error.response?.data || error.message);
    
    // Fallback to manual escrow link
    console.log('📝 Falling back to manual escrow link...');
    return generateManualEscrowLink(transactionData);
  }
};

/**
 * Generate a manual escrow link (for users without API access)
 * Since Escrow.com doesn't support pre-filled links, we provide their domain transaction page
 */
const generateManualEscrowLink = (transactionData) => {
  const {
    domainName,
    buyerEmail,
    sellerEmail,
    amount,
    currency = 'USD',
    feePayer = 'buyer'
  } = transactionData;

  // Escrow.com's main domain transaction page (verified working URL)
  // Users will need to manually enter details there
  const escrowUrl = `https://www.escrow.com/domains`;

  console.log(`✅ Manual escrow link generated`);
  console.log(`🔗 URL: ${escrowUrl}`);
  console.log(`   Domain: ${domainName}`);
  console.log(`   Amount: ${amount} ${currency}`);
  console.log(`   Buyer: ${buyerEmail}`);
  console.log(`   Seller: ${sellerEmail}`);

  return {
    success: true,
    escrowUrl,
    amount,
    currency,
    feePayer,
    domainName,
    buyerEmail,
    sellerEmail,
    isManual: true,
    message: 'Manual escrow instructions generated (API not configured)'
  };
};

/**
 * Get user's escrow configuration
 */
const getUserEscrowConfig = async (userId) => {
  try {
    const result = await query(
      `SELECT escrow_enabled, escrow_email, escrow_api_key, escrow_provider
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        enabled: false,
        email: null,
        apiKey: null,
        provider: 'escrow.com'
      };
    }

    const user = result.rows[0];
    return {
      enabled: user.escrow_enabled || false,
      email: user.escrow_email,
      apiKey: user.escrow_api_key,
      provider: user.escrow_provider || 'escrow.com'
    };
  } catch (error) {
    console.error('Error fetching escrow config:', error);
    return {
      enabled: false,
      email: null,
      apiKey: null,
      provider: 'escrow.com'
    };
  }
};

/**
 * Update user's escrow account settings
 */
const updateUserEscrowAccount = async (userId, escrowData) => {
  const {
    escrowEmail,
    escrowApiKey,
    escrowApiSecret,
    escrowProvider = 'escrow.com',
    enabled = true
  } = escrowData;

  console.log(`🔧 Updating escrow account for user ${userId}...`);

  try {
    const result = await query(
      `UPDATE users 
       SET escrow_email = $1,
           escrow_api_key = $2,
           escrow_api_secret = $3,
           escrow_provider = $4,
           escrow_enabled = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, escrow_email, escrow_enabled, escrow_provider`,
      [escrowEmail, escrowApiKey, escrowApiSecret, escrowProvider, enabled, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    console.log('✅ Escrow account updated successfully');

    return {
      success: true,
      user: result.rows[0]
    };
  } catch (error) {
    console.error('❌ Error updating escrow account:', error);
    throw error;
  }
};

/**
 * Get escrow transaction status
 */
const getEscrowTransactionStatus = async (transactionId) => {
  try {
    const result = await query(
      `SELECT * FROM escrow_transactions WHERE transaction_id = $1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching escrow transaction:', error);
    throw error;
  }
};

/**
 * Update escrow transaction status (called by webhooks)
 */
const updateEscrowTransactionStatus = async (transactionId, status) => {
  console.log(`📝 Updating escrow transaction ${transactionId} to status: ${status}`);

  try {
    const result = await query(
      `UPDATE escrow_transactions 
       SET status = $1, updated_at = NOW()
       WHERE transaction_id = $2
       RETURNING *`,
      [status, transactionId]
    );

    if (result.rows.length === 0) {
      console.warn(`⚠️  Transaction ${transactionId} not found`);
      return null;
    }

    console.log(`✅ Transaction status updated to: ${status}`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating transaction status:', error);
    throw error;
  }
};

/**
 * Get all escrow transactions for a campaign
 */
const getCampaignEscrowTransactions = async (campaignId) => {
  try {
    const result = await query(
      `SELECT * FROM escrow_transactions 
       WHERE campaign_id = $1
       ORDER BY created_at DESC`,
      [campaignId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error fetching campaign escrow transactions:', error);
    throw error;
  }
};

module.exports = {
  createEscrowTransaction,
  generateManualEscrowLink,
  getUserEscrowConfig,
  updateUserEscrowAccount,
  getEscrowTransactionStatus,
  updateEscrowTransactionStatus,
  getCampaignEscrowTransactions
};

