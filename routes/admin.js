const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const {
  verifyAndTransfer,
  buyerConfirmReceived,
  getPendingVerifications,
  getVerificationHistory
} = require('../services/escrowService');

/**
 * GET /api/admin/verifications/pending
 * Get all transactions awaiting verification
 */
router.get('/verifications/pending', async (req, res) => {
  console.log('📋 Fetching pending verifications...');

  try {
    const pending = await getPendingVerifications();

    res.json({
      success: true,
      count: pending.length,
      transactions: pending
    });
  } catch (error) {
    console.error('❌ Error fetching pending verifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending verifications',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/verifications/:transactionId
 * Get specific transaction details with verification history
 */
router.get('/verifications/:transactionId', async (req, res) => {
  console.log(`🔍 Fetching transaction ${req.params.transactionId}...`);

  try {
    const { transactionId } = req.params;

    // Get transaction
    const txResult = await query(`
      SELECT 
        t.*,
        u.username as seller_username,
        u.email as seller_email,
        u.first_name as seller_first_name,
        u.last_name as seller_last_name,
        c.campaign_name
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
    const history = await getVerificationHistory(transactionId);

    res.json({
      success: true,
      transaction: transaction,
      history: history
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
 * POST /api/admin/verifications/:transactionId/verify
 * Verify domain transfer and transfer funds OR refund buyer
 */
router.post('/verifications/:transactionId/verify', async (req, res) => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ ADMIN VERIFICATION: Transaction ${req.params.transactionId}`);
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const { transactionId } = req.params;
    const { verified, notes, adminUserId } = req.body;

    if (verified === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: verified (true/false)'
      });
    }

    if (!adminUserId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: adminUserId'
      });
    }

    console.log(`   Verified: ${verified}`);
    console.log(`   Admin: ${adminUserId}`);
    console.log(`   Notes: ${notes || 'None'}`);

    // Perform verification and transfer/refund
    const result = await verifyAndTransfer(transactionId, adminUserId, verified, notes);

    // Send notifications to buyer and seller
    const { sendEmail } = require('../services/emailService');
    
    // Get transaction details
    const txResult = await query(`
      SELECT 
        t.*,
        u.email as seller_email,
        u.first_name as seller_first_name,
        u.username as seller_username
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = $1
    `, [transactionId]);

    const transaction = txResult.rows[0];
    const sellerName = transaction.seller_first_name || transaction.seller_username || 'Seller';

    if (verified) {
      // ✅ DOMAIN VERIFIED - Notify seller about funds transfer
      const sellerEmailHtml = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#111827;padding:30px;text-align:center;border-radius:16px 16px 0 0;">
            <h1 style="color:#f9fafb;margin:0;font-size:28px;">Transfer Failed - Buyer Refunded</h1>
          </div>
          
          <div style="padding:40px;background:#0b0f14;color:#e5e7eb;border-radius:0 0 16px 16px;">
            <p style="font-size:18px;color:#e5e7eb;margin:0 0 25px 0;">
              Hi <strong>${sellerName}</strong>,
            </p>
            
            <p style="font-size:16px;color:#e5e7eb;line-height:1.6;margin:0 0 25px 0;">
              The domain transfer for <strong>${transaction.domain_name}</strong> could not be completed. The buyer has been issued a full refund.
            </p>
            
            <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:25px;margin:25px 0;">
              <h3 style="margin:0 0 15px 0;color:#e5e7eb;">Details</h3>
              <p style="margin:5px 0;color:#e5e7eb;"><strong>Domain:</strong> ${transaction.domain_name}</p>
              <p style="margin:5px 0;color:#e5e7eb;"><strong>Refund Amount:</strong> $${transaction.amount} ${transaction.currency}</p>
            </div>
            
            ${notes ? `
            <div style="background:#111827;border-radius:12px;padding:20px;margin:25px 0;border:1px solid #1f2937;">
              <p style="margin:0;color:#e5e7eb;"><strong>Note:</strong> ${notes}</p>
            </div>
            ` : ''}
            
            <p style="color:#94a3b8;font-size:14px;text-align:center;margin:30px 0 0 0;">
              Please contact support if you need assistance.
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: transaction.seller_email,
        subject: `Transfer Failed: ${transaction.domain_name}`,
        html: sellerEmailHtml,
        text: `Transfer Failed\n\nHi ${sellerName},\n\nThe domain transfer verification for ${transaction.domain_name} has failed. The buyer has been issued a full refund.\n\n${notes ? `Reason: ${notes}\n\n` : ''}Please ensure domain transfers are completed promptly in the future.`,
        tags: ['transfer-failed', 'seller-notification', `transaction-${transactionId}`]
      });

      console.log('✅ Notification emails sent');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ VERIFICATION COMPLETE: ${verified ? 'TRANSFERRED' : 'REFUNDED'}`);
    console.log('═══════════════════════════════════════════════════════════');

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('❌ Error processing verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process verification',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/notifications
 * Get all admin notifications
 */
router.get('/notifications', async (req, res) => {
  console.log('📬 Fetching admin notifications...');

  try {
    const { unreadOnly, limit = 50 } = req.query;

    let queryText = `
      SELECT 
        an.*,
        t.domain_name,
        t.amount,
        t.buyer_name
      FROM admin_notifications an
      LEFT JOIN transactions t ON an.transaction_id = t.id
    `;

    const queryParams = [];

    if (unreadOnly === 'true') {
      queryText += ` WHERE an.is_read = false`;
    }

    queryText += ` ORDER BY an.created_at DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);

    const result = await query(queryText, queryParams);

    // Get unread count
    const countResult = await query(
      'SELECT COUNT(*) as count FROM admin_notifications WHERE is_read = false'
    );

    res.json({
      success: true,
      notifications: result.rows,
      unreadCount: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/notifications/:notificationId/read
 * Mark notification as read
 */
router.post('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { adminUserId } = req.body;

    await query(
      `UPDATE admin_notifications 
       SET is_read = true, read_at = NOW(), read_by = $1
       WHERE id = $2`,
      [adminUserId, notificationId]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', async (req, res) => {
  console.log('📊 Fetching admin stats...');

  try {
    // Pending verifications
    const pendingResult = await query(`
      SELECT COUNT(*) as count, SUM(amount) as total_amount
      FROM transactions
      WHERE verification_status IN ('payment_received', 'buyer_confirmed')
        AND payment_status = 'paid'
    `);

    // Completed verifications (last 30 days)
    const completedResult = await query(`
      SELECT COUNT(*) as count, SUM(amount) as total_amount
      FROM transactions
      WHERE verification_status = 'verified'
        AND verified_at >= NOW() - INTERVAL '30 days'
    `);

    // Total platform fees collected
    const feesResult = await query(`
      SELECT SUM(platform_fee_amount) as total_fees
      FROM transactions
      WHERE verification_status = 'verified'
    `);

    // Failed verifications (last 30 days)
    const failedResult = await query(`
      SELECT COUNT(*) as count, SUM(amount) as total_refunded
      FROM transactions
      WHERE verification_status = 'verification_failed'
        AND verified_at >= NOW() - INTERVAL '30 days'
    `);

    res.json({
      success: true,
      stats: {
        pending: {
          count: parseInt(pendingResult.rows[0].count) || 0,
          amount: parseFloat(pendingResult.rows[0].total_amount) || 0
        },
        completed: {
          count: parseInt(completedResult.rows[0].count) || 0,
          amount: parseFloat(completedResult.rows[0].total_amount) || 0
        },
        platformFees: parseFloat(feesResult.rows[0].total_fees) || 0,
        failed: {
          count: parseInt(failedResult.rows[0].count) || 0,
          refunded: parseFloat(failedResult.rows[0].total_refunded) || 0
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin stats',
      message: error.message
    });
  }
});

module.exports = router;

