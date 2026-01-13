const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * GET /api/sales/seller/:userId
 * Get all sold domains and transaction details for a seller
 */
router.get('/seller/:userId', async (req, res) => {
  console.log(`💰 Fetching sales for seller ${req.params.userId}...`);

  try {
    const { userId } = req.params;
    const { status } = req.query; // Optional filter: 'completed', 'pending', 'all'

    let whereClause = 't.user_id = $1';
    
    if (status === 'completed') {
      whereClause += " AND t.transfer_status = 'completed'";
    } else if (status === 'pending') {
      whereClause += " AND t.transfer_status IS NULL AND t.payment_status = 'paid'";
    }

    const sales = await query(`
      SELECT 
        t.id as transaction_id,
        t.domain_name,
        t.amount as total_amount,
        t.currency,
        t.platform_fee_amount,
        t.seller_payout_amount,
        t.buyer_name,
        t.buyer_email,
        t.payment_status,
        t.verification_status,
        t.transfer_status,
        t.transfer_id,
        t.buyer_confirmed,
        t.buyer_confirmed_at,
        t.paid_at,
        t.verified_at,
        t.created_at,
        t.updated_at,
        c.campaign_name,
        c.campaign_id,
        c.sold,
        c.sold_at,
        u.username as seller_username,
        u.email as seller_email,
        u.first_name as seller_first_name,
        u.last_name as seller_last_name
      FROM transactions t
      LEFT JOIN campaigns c ON c.id = t.campaign_id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
    `, [userId]);

    // Calculate summary
    const completed = sales.rows.filter(s => s.transfer_status === 'completed');
    const pending = sales.rows.filter(s => s.payment_status === 'paid' && !s.transfer_status);
    
    const totalRevenue = completed.reduce((sum, s) => sum + parseFloat(s.seller_payout_amount || 0), 0);
    const totalPending = pending.reduce((sum, s) => sum + parseFloat(s.seller_payout_amount || 0), 0);

    res.json({
      success: true,
      data: {
        sales: sales.rows,
        summary: {
          totalSold: completed.length,
          totalPending: pending.length,
          totalRevenue: totalRevenue.toFixed(2),
          totalPendingRevenue: totalPending.toFixed(2),
          averagePrice: completed.length > 0 
            ? (totalRevenue / completed.length).toFixed(2) 
            : '0.00'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching seller sales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales',
      message: error.message
    });
  }
});

/**
 * GET /api/sales/transaction/:transactionId
 * Get detailed transaction information
 */
router.get('/transaction/:transactionId', async (req, res) => {
  console.log(`🔍 Fetching transaction ${req.params.transactionId}...`);

  try {
    const { transactionId } = req.params;

    // Get transaction details
    const txResult = await query(`
      SELECT 
        t.*,
        u.username as seller_username,
        u.email as seller_email,
        u.first_name as seller_first_name,
        u.last_name as seller_last_name,
        c.campaign_name,
        c.campaign_id,
        c.sold,
        c.sold_at,
        c.sold_price
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN campaigns c ON c.id = t.campaign_id
      WHERE t.id = $1
    `, [transactionId]);

    if (txResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    const transaction = txResult.rows[0];

    // Get verification history
    const historyResult = await query(`
      SELECT 
        vh.*,
        u.username as performed_by_username,
        u.email as performed_by_email
      FROM verification_history vh
      LEFT JOIN users u ON vh.performed_by = u.id
      WHERE vh.transaction_id = $1
      ORDER BY vh.created_at ASC
    `, [transactionId]);

    res.json({
      success: true,
      data: {
        transaction: transaction,
        history: historyResult.rows
      }
    });

  } catch (error) {
    console.error('❌ Error fetching transaction details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction details',
      message: error.message
    });
  }
});

/**
 * GET /api/sales/domain/:domainName
 * Check if a specific domain is sold and get sale details
 */
router.get('/domain/:domainName', async (req, res) => {
  console.log(`🔍 Checking sold status for ${req.params.domainName}...`);

  try {
    const { domainName } = req.params;

    // Check campaigns table first (primary source of truth)
    const campaignResult = await query(`
      SELECT 
        id,
        campaign_id,
        campaign_name,
        domain_name,
        sold,
        sold_at,
        sold_price,
        sold_transaction_id,
        status,
        paused_at,
        paused_reason
      FROM campaigns
      WHERE domain_name = $1 AND sold = TRUE
      LIMIT 1
    `, [domainName.toLowerCase()]);

    if (campaignResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          isSold: false,
          domainName: domainName
        }
      });
    }

    const campaign = campaignResult.rows[0];

    // Get transaction details if available
    let transaction = null;
    if (campaign.sold_transaction_id) {
      const txResult = await query(`
        SELECT 
          id,
          domain_name,
          amount,
          currency,
          buyer_name,
          buyer_email,
          payment_status,
          verification_status,
          transfer_status,
          paid_at,
          verified_at
        FROM transactions
        WHERE id = $1
      `, [campaign.sold_transaction_id]);

      if (txResult.rows.length > 0) {
        transaction = txResult.rows[0];
      }
    }

    res.json({
      success: true,
      data: {
        isSold: true,
        domainName: domainName,
        soldAt: campaign.sold_at,
        soldPrice: campaign.sold_price,
        campaign: {
          id: campaign.id,
          campaignId: campaign.campaign_id,
          campaignName: campaign.campaign_name,
          status: campaign.status
        },
        transaction: transaction
      }
    });

  } catch (error) {
    console.error('❌ Error checking domain sold status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check domain status',
      message: error.message
    });
  }
});

/**
 * GET /api/sales/stats/:userId
 * Get sales statistics for a seller
 */
router.get('/stats/:userId', async (req, res) => {
  console.log(`📊 Fetching sales stats for user ${req.params.userId}...`);

  try {
    const { userId } = req.params;

    // Get all transactions
    const allTransactions = await query(`
      SELECT 
        payment_status,
        verification_status,
        transfer_status,
        amount,
        seller_payout_amount,
        platform_fee_amount,
        paid_at,
        verified_at,
        created_at
      FROM transactions
      WHERE user_id = $1
    `, [userId]);

    const transactions = allTransactions.rows;

    // Calculate stats
    const stats = {
      total: {
        count: transactions.length,
        revenue: 0,
        fees: 0
      },
      completed: {
        count: 0,
        revenue: 0,
        fees: 0
      },
      pending: {
        count: 0,
        revenue: 0,
        fees: 0
      },
      awaitingVerification: {
        count: 0,
        revenue: 0
      },
      thisMonth: {
        count: 0,
        revenue: 0
      },
      thisYear: {
        count: 0,
        revenue: 0
      }
    };

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    transactions.forEach(tx => {
      const payout = parseFloat(tx.seller_payout_amount || 0);
      const fee = parseFloat(tx.platform_fee_amount || 0);
      const txDate = new Date(tx.created_at);

      stats.total.revenue += payout;
      stats.total.fees += fee;

      if (tx.transfer_status === 'completed') {
        stats.completed.count++;
        stats.completed.revenue += payout;
        stats.completed.fees += fee;
      } else if (tx.payment_status === 'paid') {
        if (tx.verification_status === 'payment_received' || tx.verification_status === 'buyer_confirmed') {
          stats.awaitingVerification.count++;
          stats.awaitingVerification.revenue += payout;
        }
        stats.pending.count++;
        stats.pending.revenue += payout;
        stats.pending.fees += fee;
      }

      if (txDate.getMonth() === thisMonth && txDate.getFullYear() === thisYear) {
        stats.thisMonth.count++;
        stats.thisMonth.revenue += payout;
      }

      if (txDate.getFullYear() === thisYear) {
        stats.thisYear.count++;
        stats.thisYear.revenue += payout;
      }
    });

    // Round all values
    Object.keys(stats).forEach(key => {
      if (stats[key].revenue !== undefined) {
        stats[key].revenue = parseFloat(stats[key].revenue.toFixed(2));
      }
      if (stats[key].fees !== undefined) {
        stats[key].fees = parseFloat(stats[key].fees.toFixed(2));
      }
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching sales stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

module.exports = router;

