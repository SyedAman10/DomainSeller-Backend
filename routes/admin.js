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
      LEFT JOIN campaigns c ON t.campaign_id = c.campaign_id
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
          <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:30px;text-align:center;border-radius:16px 16px 0 0;">
            <div style="font-size:60px;margin-bottom:10px;">💸</div>
            <h1 style="color:white;margin:0;font-size:28px;">Funds Transferred!</h1>
          </div>
          
          <div style="padding:40px;background:#f8fafc;border-radius:0 0 16px 16px;">
            <p style="font-size:18px;color:#334155;margin:0 0 25px 0;">
              Hi <strong>${sellerName}</strong>,
            </p>
            
            <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 25px 0;">
              Great news! The domain transfer for <strong>${transaction.domain_name}</strong> has been verified, 
              and your payment has been released to your Stripe account.
            </p>
            
            <div style="background:white;border:2px solid #10b981;border-radius:12px;padding:25px;margin:25px 0;">
              <h3 style="margin:0 0 20px 0;color:#059669;font-size:18px;">💳 Transfer Details</h3>
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:10px 0;color:#64748b;font-size:14px;">Domain:</td>
                  <td style="padding:10px 0;color:#0f172a;font-weight:600;text-align:right;">${transaction.domain_name}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#64748b;font-size:14px;">Total Sale:</td>
                  <td style="padding:10px 0;color:#334155;text-align:right;">$${transaction.amount}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#64748b;font-size:14px;">Platform Fee (10%):</td>
                  <td style="padding:10px 0;color:#ef4444;text-align:right;">-$${transaction.platform_fee_amount}</td>
                </tr>
                <tr style="border-top:2px solid #e5e7eb;">
                  <td style="padding:15px 0 10px 0;color:#059669;font-weight:700;font-size:16px;">Your Payout:</td>
                  <td style="padding:15px 0 10px 0;color:#10b981;font-weight:700;font-size:20px;text-align:right;">$${transaction.seller_payout_amount}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#64748b;font-size:14px;">Transfer ID:</td>
                  <td style="padding:10px 0;color:#64748b;font-size:12px;text-align:right;">${result.transferId}</td>
                </tr>
              </table>
            </div>
            
            <div style="background:#eff6ff;border-radius:12px;padding:20px;margin:25px 0;">
              <p style="margin:0;color:#1e40af;font-size:14px;">
                💡 <strong>Funds will appear in your Stripe balance within 1-2 business days.</strong> 
                You can check your Stripe dashboard for payout details.
              </p>
            </div>
            
            <p style="color:#64748b;font-size:14px;text-align:center;margin:30px 0 0 0;">
              Thank you for using our platform!
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: transaction.seller_email,
        subject: `💸 Funds Transferred: $${transaction.seller_payout_amount} for ${transaction.domain_name}`,
        html: sellerEmailHtml,
        text: `Funds Transferred!\n\nHi ${sellerName},\n\nThe domain transfer for ${transaction.domain_name} has been verified, and $${transaction.seller_payout_amount} has been transferred to your Stripe account.\n\nTotal Sale: $${transaction.amount}\nPlatform Fee: $${transaction.platform_fee_amount}\nYour Payout: $${transaction.seller_payout_amount}\n\nFunds will appear in your Stripe balance within 1-2 business days.`,
        tags: ['funds-transferred', 'seller-notification', `transaction-${transactionId}`]
      });

      // Notify buyer
      const buyerEmailHtml = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:30px;text-align:center;border-radius:16px 16px 0 0;">
            <div style="font-size:60px;margin-bottom:10px;">✅</div>
            <h1 style="color:white;margin:0;font-size:28px;">Transfer Complete!</h1>
          </div>
          
          <div style="padding:40px;background:#f8fafc;border-radius:0 0 16px 16px;">
            <p style="font-size:18px;color:#334155;margin:0 0 25px 0;">
              Hi <strong>${transaction.buyer_name}</strong>,
            </p>
            
            <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 25px 0;">
              Congratulations! The domain transfer for <strong>${transaction.domain_name}</strong> 
              has been successfully verified and completed.
            </p>
            
            <div style="background:white;border:2px solid #10b981;border-radius:12px;padding:25px;margin:25px 0;text-align:center;">
              <div style="font-size:48px;margin-bottom:15px;">🎉</div>
              <h2 style="margin:0;color:#059669;">You now own ${transaction.domain_name}</h2>
            </div>
            
            <p style="color:#64748b;font-size:14px;text-align:center;margin:30px 0 0 0;">
              Thank you for your purchase!
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: transaction.buyer_email,
        subject: `✅ Transfer Complete: ${transaction.domain_name} is Now Yours!`,
        html: buyerEmailHtml,
        text: `Transfer Complete!\n\nHi ${transaction.buyer_name},\n\nCongratulations! The domain transfer for ${transaction.domain_name} has been successfully verified and completed. You now own the domain!\n\nThank you for your purchase!`,
        tags: ['transfer-complete', 'buyer-notification', `transaction-${transactionId}`]
      });

      console.log('✅ Notification emails sent');

    } else {
      // ❌ VERIFICATION FAILED - Notify buyer about refund
      const buyerEmailHtml = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:30px;text-align:center;border-radius:16px 16px 0 0;">
            <div style="font-size:60px;margin-bottom:10px;">🔄</div>
            <h1 style="color:white;margin:0;font-size:28px;">Refund Processed</h1>
          </div>
          
          <div style="padding:40px;background:#f8fafc;border-radius:0 0 16px 16px;">
            <p style="font-size:18px;color:#334155;margin:0 0 25px 0;">
              Hi <strong>${transaction.buyer_name}</strong>,
            </p>
            
            <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 25px 0;">
              We regret to inform you that the domain transfer for <strong>${transaction.domain_name}</strong> 
              could not be completed. A full refund of <strong>$${transaction.amount}</strong> has been issued to your original payment method.
            </p>
            
            <div style="background:white;border:2px solid #3b82f6;border-radius:12px;padding:25px;margin:25px 0;">
              <h3 style="margin:0 0 15px 0;color:#1e40af;">💳 Refund Details</h3>
              <p style="margin:5px 0;color:#334155;"><strong>Amount Refunded:</strong> $${transaction.amount} ${transaction.currency}</p>
              <p style="margin:5px 0;color:#334155;"><strong>Refund ID:</strong> ${result.refundId}</p>
              <p style="margin:15px 0 5px 0;color:#64748b;font-size:14px;">Refunds typically appear in 5-10 business days.</p>
            </div>
            
            ${notes ? `
            <div style="background:#fef3c7;border-radius:12px;padding:20px;margin:25px 0;">
              <p style="margin:0;color:#92400e;"><strong>Note:</strong> ${notes}</p>
            </div>
            ` : ''}
            
            <p style="color:#64748b;font-size:14px;text-align:center;margin:30px 0 0 0;">
              If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: transaction.buyer_email,
        subject: `🔄 Refund Issued: ${transaction.domain_name}`,
        html: buyerEmailHtml,
        text: `Refund Issued\n\nHi ${transaction.buyer_name},\n\nThe domain transfer for ${transaction.domain_name} could not be completed. A full refund of $${transaction.amount} has been issued to your original payment method.\n\n${notes ? `Note: ${notes}\n\n` : ''}Refunds typically appear in 5-10 business days.\n\nIf you have any questions, please contact support.`,
        tags: ['refund-issued', 'buyer-notification', `transaction-${transactionId}`]
      });

      // Notify seller
      const sellerEmailHtml = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:30px;text-align:center;border-radius:16px 16px 0 0;">
            <div style="font-size:60px;margin-bottom:10px;">⚠️</div>
            <h1 style="color:white;margin:0;font-size:28px;">Transfer Failed - Buyer Refunded</h1>
          </div>
          
          <div style="padding:40px;background:#f8fafc;border-radius:0 0 16px 16px;">
            <p style="font-size:18px;color:#334155;margin:0 0 25px 0;">
              Hi <strong>${sellerName}</strong>,
            </p>
            
            <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 25px 0;">
              The domain transfer verification for <strong>${transaction.domain_name}</strong> has failed. 
              The buyer has been issued a full refund.
            </p>
            
            ${notes ? `
            <div style="background:#fef3c7;border-radius:12px;padding:20px;margin:25px 0;">
              <p style="margin:0;color:#92400e;"><strong>Reason:</strong> ${notes}</p>
            </div>
            ` : ''}
            
            <p style="color:#64748b;font-size:14px;text-align:center;margin:30px 0 0 0;">
              Please ensure domain transfers are completed promptly in the future.
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: transaction.seller_email,
        subject: `⚠️ Transfer Failed: ${transaction.domain_name}`,
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

