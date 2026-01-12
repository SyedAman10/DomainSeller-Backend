const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { buyerConfirmReceived } = require('../services/escrowService');

/**
 * GET /api/buyer/confirm/:transactionId/:token
 * Buyer confirms domain receipt (from email link)
 */
router.get('/confirm/:transactionId/:token', async (req, res) => {
  console.log('✅ BUYER CONFIRMATION RECEIVED');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`   Transaction ID: ${req.params.transactionId}`);
  console.log(`   Token: ${req.params.token}`);

  try {
    const { transactionId, token } = req.params;

    // Get transaction
    const txResult = await query(`
      SELECT * FROM transactions WHERE id = $1
    `, [transactionId]);

    if (txResult.rows.length === 0) {
      return res.send(`
        <html>
          <head><title>Transaction Not Found</title></head>
          <body style="font-family:Arial;padding:50px;text-align:center;">
            <h1>❌ Transaction Not Found</h1>
            <p>This transaction doesn't exist or has been removed.</p>
          </body>
        </html>
      `);
    }

    const transaction = txResult.rows[0];

    // Verify token (simple hash of transaction details)
    const crypto = require('crypto');
    const expectedToken = crypto
      .createHash('sha256')
      .update(`${transaction.id}-${transaction.buyer_email}-${transaction.domain_name}`)
      .digest('hex')
      .substring(0, 16);

    if (token !== expectedToken) {
      return res.send(`
        <html>
          <head><title>Invalid Link</title></head>
          <body style="font-family:Arial;padding:50px;text-align:center;">
            <h1>⚠️ Invalid Confirmation Link</h1>
            <p>This confirmation link is not valid. Please use the link from your email.</p>
          </body>
        </html>
      `);
    }

    if (transaction.payment_status !== 'paid') {
      return res.send(`
        <html>
          <head><title>Payment Not Completed</title></head>
          <body style="font-family:Arial;padding:50px;text-align:center;">
            <h1>⚠️ Payment Not Completed</h1>
            <p>The payment for this transaction has not been completed yet.</p>
          </body>
        </html>
      `);
    }

    if (transaction.buyer_confirmed) {
      return res.send(`
        <html>
          <head>
            <title>Already Confirmed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family:Arial,sans-serif;padding:20px;background:#f1f5f9;">
            <div style="max-width:600px;margin:50px auto;background:white;padding:40px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.1);text-align:center;">
              <div style="font-size:64px;margin-bottom:20px;">✅</div>
              <h1 style="color:#10b981;margin:0 0 20px 0;">Already Confirmed</h1>
              <p style="color:#334155;font-size:16px;line-height:1.6;">
                You already confirmed receipt of <strong>${transaction.domain_name}</strong> on 
                ${new Date(transaction.buyer_confirmed_at).toLocaleDateString()}.
              </p>
              <p style="color:#64748b;font-size:14px;margin-top:30px;">
                The verification process is underway. You'll receive a final confirmation email once complete.
              </p>
            </div>
          </body>
        </html>
      `);
    }

    // Record buyer confirmation
    await buyerConfirmReceived(transactionId);

    // Send notifications
    const { sendEmail } = require('../services/emailService');

    // Notify seller
    const sellerResult = await query(
      'SELECT email, first_name, username FROM users WHERE id = $1',
      [transaction.user_id]
    );

    if (sellerResult.rows.length > 0) {
      const seller = sellerResult.rows[0];
      const sellerName = seller.first_name || seller.username || 'Seller';

      const sellerEmailHtml = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);padding:30px;text-align:center;border-radius:16px 16px 0 0;">
            <div style="font-size:60px;margin-bottom:10px;">📬</div>
            <h1 style="color:white;margin:0;font-size:28px;">Buyer Confirmed Receipt</h1>
          </div>
          
          <div style="padding:40px;background:#f8fafc;border-radius:0 0 16px 16px;">
            <p style="font-size:18px;color:#334155;margin:0 0 25px 0;">
              Hi <strong>${sellerName}</strong>,
            </p>
            
            <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 25px 0;">
              Great news! <strong>${transaction.buyer_name}</strong> has confirmed receipt of 
              <strong>${transaction.domain_name}</strong>.
            </p>
            
            <div style="background:white;border:2px solid #3b82f6;border-radius:12px;padding:25px;margin:25px 0;">
              <h3 style="margin:0 0 15px 0;color:#1e40af;">📋 Transaction Details</h3>
              <p style="margin:8px 0;color:#334155;"><strong>Domain:</strong> ${transaction.domain_name}</p>
              <p style="margin:8px 0;color:#334155;"><strong>Sale Amount:</strong> $${transaction.amount}</p>
              <p style="margin:8px 0;color:#334155;"><strong>Your Payout:</strong> $${transaction.seller_payout_amount}</p>
            </div>
            
            <div style="background:#dbeafe;border-radius:12px;padding:20px;margin:25px 0;">
              <h4 style="margin:0 0 10px 0;color:#1e40af;">⏳ What's Next?</h4>
              <p style="color:#1e3a8a;margin:0;line-height:1.6;">
                Our admin team will perform a final verification to ensure the domain transfer was successful. 
                Once verified, the funds will be released to your Stripe account.
              </p>
            </div>
            
            <p style="color:#64748b;font-size:14px;text-align:center;margin:30px 0 0 0;">
              You'll receive another email once the funds are transferred.
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        to: seller.email,
        subject: `📬 Buyer Confirmed: ${transaction.domain_name}`,
        html: sellerEmailHtml,
        text: `Buyer Confirmed Receipt!\n\nHi ${sellerName},\n\n${transaction.buyer_name} has confirmed receipt of ${transaction.domain_name}.\n\nOur admin team will perform a final verification, and then the funds ($${transaction.seller_payout_amount}) will be released to your Stripe account.\n\nYou'll receive another email once complete.`,
        tags: ['buyer-confirmed', 'seller-notification', `transaction-${transactionId}`]
      });
    }

    console.log('✅ Buyer confirmation recorded and notifications sent');
    console.log('═══════════════════════════════════════════════════════════');

    // Success page
    res.send(`
      <html>
        <head>
          <title>Confirmation Received</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family:Arial,sans-serif;padding:20px;background:#f1f5f9;">
          <div style="max-width:600px;margin:50px auto;background:white;padding:40px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
            <div style="text-align:center;">
              <div style="font-size:80px;margin-bottom:20px;">🎉</div>
              <h1 style="color:#10b981;margin:0 0 20px 0;">Thank You!</h1>
              <p style="color:#334155;font-size:18px;line-height:1.6;margin:0 0 30px 0;">
                Your confirmation that you've received <strong>${transaction.domain_name}</strong> has been recorded.
              </p>
            </div>
            
            <div style="background:#f0fdf4;padding:25px;border-radius:12px;margin:25px 0;border:2px solid #10b981;">
              <h3 style="margin:0 0 15px 0;color:#059669;">✅ What Happens Next?</h3>
              <ol style="color:#166534;margin:0;padding-left:20px;line-height:1.8;">
                <li>Our admin team will perform a final verification</li>
                <li>Once verified, the seller will receive payment</li>
                <li>You'll receive a final confirmation email</li>
              </ol>
            </div>
            
            <div style="background:#dbeafe;border-radius:12px;padding:20px;margin:25px 0;">
              <p style="margin:0;color:#1e40af;font-size:14px;">
                💡 <strong>This helps protect both buyers and sellers</strong> by ensuring domain transfers 
                are completed successfully before funds are released.
              </p>
            </div>
            
            <div style="text-align:center;margin-top:30px;">
              <p style="color:#64748b;font-size:14px;">You can close this page now.</p>
              <p style="color:#64748b;font-size:14px;margin-top:15px;">
                Questions? Contact us at <a href="mailto:support@3vltn.com">support@3vltn.com</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ Error processing buyer confirmation:', error);
    res.send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family:Arial;padding:50px;text-align:center;">
          <h1>❌ Error</h1>
          <p>${error.message}</p>
          <p><a href="javascript:history.back()">Go Back</a></p>
        </body>
      </html>
    `);
  }
});

/**
 * POST /api/buyer/confirm/:transactionId
 * Buyer confirms domain receipt (API version)
 */
router.post('/confirm/:transactionId', async (req, res) => {
  console.log(`✅ API: Buyer confirming transaction ${req.params.transactionId}`);

  try {
    const { transactionId } = req.params;
    const { buyerEmail, token } = req.body;

    // Get transaction
    const txResult = await query(`
      SELECT * FROM transactions WHERE id = $1 AND buyer_email = $2
    `, [transactionId, buyerEmail]);

    if (txResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found or email mismatch'
      });
    }

    const transaction = txResult.rows[0];

    // Verify token
    const crypto = require('crypto');
    const expectedToken = crypto
      .createHash('sha256')
      .update(`${transaction.id}-${transaction.buyer_email}-${transaction.domain_name}`)
      .digest('hex')
      .substring(0, 16);

    if (token !== expectedToken) {
      return res.status(403).json({
        success: false,
        error: 'Invalid confirmation token'
      });
    }

    if (transaction.buyer_confirmed) {
      return res.json({
        success: true,
        message: 'Already confirmed',
        confirmedAt: transaction.buyer_confirmed_at
      });
    }

    // Record confirmation
    const result = await buyerConfirmReceived(transactionId);

    res.json(result);
  } catch (error) {
    console.error('❌ Error in buyer confirmation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record confirmation',
      message: error.message
    });
  }
});

/**
 * GET /api/buyer/transaction/:transactionId/:token
 * Get transaction status (for buyer tracking)
 */
router.get('/transaction/:transactionId/:token', async (req, res) => {
  try {
    const { transactionId, token } = req.params;

    // Get transaction
    const txResult = await query(`
      SELECT 
        id,
        domain_name,
        amount,
        currency,
        payment_status,
        verification_status,
        buyer_confirmed,
        buyer_confirmed_at,
        created_at,
        paid_at
      FROM transactions 
      WHERE id = $1
    `, [transactionId]);

    if (txResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    const transaction = txResult.rows[0];

    // Verify token
    const crypto = require('crypto');
    const expectedToken = crypto
      .createHash('sha256')
      .update(`${transaction.id}-${transactionId}`)
      .digest('hex')
      .substring(0, 16);

    if (token !== expectedToken) {
      return res.status(403).json({
        success: false,
        error: 'Invalid token'
      });
    }

    res.json({
      success: true,
      transaction: transaction
    });
  } catch (error) {
    console.error('❌ Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction',
      message: error.message
    });
  }
});

/**
 * Utility function to generate buyer confirmation link
 * @param {Number} transactionId - Transaction ID
 * @param {String} buyerEmail - Buyer email
 * @param {String} domainName - Domain name
 * @returns {String} Confirmation URL
 */
function generateBuyerConfirmationLink(transactionId, buyerEmail, domainName) {
  const crypto = require('crypto');
  const token = crypto
    .createHash('sha256')
    .update(`${transactionId}-${buyerEmail}-${domainName}`)
    .digest('hex')
    .substring(0, 16);

  const baseUrl = process.env.BACKEND_URL || 'https://api.3vltn.com';
  return `${baseUrl}/buyer/confirm/${transactionId}/${token}`;
}

module.exports = router;
module.exports.generateBuyerConfirmationLink = generateBuyerConfirmationLink;

