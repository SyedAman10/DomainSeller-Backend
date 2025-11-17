const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const {
  updateUserEscrowAccount,
  getUserEscrowConfig,
  getCampaignEscrowTransactions,
  getEscrowTransactionStatus,
  updateEscrowTransactionStatus
} = require('../services/escrowService');

/**
 * POST /api/escrow/connect
 * Connect user's escrow account
 */
router.post('/connect', async (req, res) => {
  console.log('🔗 Connecting escrow account...');

  try {
    const {
      userId,
      escrowEmail,
      escrowApiKey,
      escrowApiSecret,
      escrowProvider = 'escrow.com'
    } = req.body;

    // Validation
    if (!userId || !escrowEmail) {
      return res.status(400).json({
        success: false,
        error: 'userId and escrowEmail are required'
      });
    }

    // Update user's escrow settings
    const result = await updateUserEscrowAccount(userId, {
      escrowEmail,
      escrowApiKey,
      escrowApiSecret,
      escrowProvider,
      enabled: true
    });

    console.log(`✅ Escrow account connected for user ${userId}`);

    res.json({
      success: true,
      message: 'Escrow account connected successfully',
      user: {
        id: result.user.id,
        escrow_email: result.user.escrow_email,
        escrow_enabled: result.user.escrow_enabled,
        escrow_provider: result.user.escrow_provider
      }
    });
  } catch (error) {
    console.error('❌ Error connecting escrow account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect escrow account',
      message: error.message
    });
  }
});

/**
 * POST /api/escrow/disconnect
 * Disconnect user's escrow account
 */
router.post('/disconnect', async (req, res) => {
  console.log('🔌 Disconnecting escrow account...');

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Disable escrow for user
    await query(
      `UPDATE users 
       SET escrow_enabled = false,
           escrow_api_key = NULL,
           escrow_api_secret = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    console.log(`✅ Escrow account disconnected for user ${userId}`);

    res.json({
      success: true,
      message: 'Escrow account disconnected successfully'
    });
  } catch (error) {
    console.error('❌ Error disconnecting escrow account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect escrow account',
      message: error.message
    });
  }
});

/**
 * GET /api/escrow/status/:userId
 * Get user's escrow account status
 */
router.get('/status/:userId', async (req, res) => {
  console.log(`🔍 Fetching escrow status for user ${req.params.userId}...`);

  try {
    const { userId } = req.params;

    const config = await getUserEscrowConfig(userId);

    res.json({
      success: true,
      escrow: {
        enabled: config.enabled,
        email: config.email,
        provider: config.provider,
        hasApiKey: !!config.apiKey
      }
    });
  } catch (error) {
    console.error('❌ Error fetching escrow status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch escrow status',
      message: error.message
    });
  }
});

/**
 * GET /api/escrow/transactions/:campaignId
 * Get all escrow transactions for a campaign
 */
router.get('/transactions/:campaignId', async (req, res) => {
  console.log(`📋 Fetching escrow transactions for campaign ${req.params.campaignId}...`);

  try {
    const { campaignId } = req.params;

    const transactions = await getCampaignEscrowTransactions(campaignId);

    res.json({
      success: true,
      count: transactions.length,
      transactions: transactions
    });
  } catch (error) {
    console.error('❌ Error fetching escrow transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch escrow transactions',
      message: error.message
    });
  }
});

/**
 * GET /api/escrow/transaction/:transactionId
 * Get specific escrow transaction details
 */
router.get('/transaction/:transactionId', async (req, res) => {
  console.log(`🔍 Fetching escrow transaction ${req.params.transactionId}...`);

  try {
    const { transactionId } = req.params;

    const transaction = await getEscrowTransactionStatus(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      transaction: transaction
    });
  } catch (error) {
    console.error('❌ Error fetching escrow transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch escrow transaction',
      message: error.message
    });
  }
});

/**
 * POST /api/escrow/webhook
 * Webhook endpoint for Escrow.com status updates
 */
router.post('/webhook', async (req, res) => {
  console.log('📨 Escrow.com webhook received');
  console.log('Payload:', JSON.stringify(req.body, null, 2));

  try {
    const { transaction_id, status, event } = req.body;

    if (!transaction_id) {
      return res.status(400).json({
        success: false,
        error: 'transaction_id is required'
      });
    }

    // Map Escrow.com status to our status
    let mappedStatus = status;
    
    // Common Escrow.com webhook events:
    // - transaction.created
    // - transaction.funded
    // - transaction.completed
    // - transaction.cancelled
    
    if (event) {
      if (event.includes('funded')) mappedStatus = 'funded';
      else if (event.includes('completed')) mappedStatus = 'completed';
      else if (event.includes('cancelled')) mappedStatus = 'cancelled';
    }

    // Update transaction status in database
    await updateEscrowTransactionStatus(transaction_id, mappedStatus);

    console.log(`✅ Updated transaction ${transaction_id} to status: ${mappedStatus}`);

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('❌ Error processing escrow webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
      message: error.message
    });
  }
});

/**
 * PUT /api/escrow/campaign/:campaignId/settings
 * Update escrow settings for a campaign
 */
router.put('/campaign/:campaignId/settings', async (req, res) => {
  console.log(`⚙️  Updating escrow settings for campaign ${req.params.campaignId}...`);

  try {
    const { campaignId } = req.params;
    const { escrowEnabled, escrowFeePayer, askingPrice } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (escrowEnabled !== undefined) {
      updates.push(`escrow_enabled = $${paramCount++}`);
      values.push(escrowEnabled);
    }

    if (escrowFeePayer) {
      updates.push(`escrow_fee_payer = $${paramCount++}`);
      values.push(escrowFeePayer);
    }

    if (askingPrice !== undefined) {
      updates.push(`asking_price = $${paramCount++}`);
      values.push(askingPrice);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    values.push(campaignId);

    const result = await query(
      `UPDATE campaigns 
       SET ${updates.join(', ')}
       WHERE campaign_id = $${paramCount}
       RETURNING campaign_id, campaign_name, escrow_enabled, escrow_fee_payer, asking_price`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    console.log('✅ Campaign escrow settings updated');

    res.json({
      success: true,
      message: 'Campaign escrow settings updated successfully',
      campaign: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating campaign escrow settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign escrow settings',
      message: error.message
    });
  }
});

module.exports = router;

