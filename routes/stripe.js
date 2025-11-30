const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const {
  createConnectAccount,
  refreshAccountLink,
  checkAccountStatus,
  getUserStripeConfig,
  enableStripeForUser,
  disconnectStripeAccount,
  getCampaignPayments,
  getPaymentLinkStatus,
  updatePaymentStatus
} = require('../services/stripeService');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/stripe/connect
 * Create Stripe Connect account and get onboarding link
 */
router.post('/connect', async (req, res) => {
  console.log('🔗 Initiating Stripe Connect onboarding...');
  console.log('📍 Request received at /stripe/connect');
  console.log('🌍 Origin:', req.headers.origin);
  console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));

  try {
    const { userId, email, country = 'US' } = req.body;

    if (!userId || !email) {
      console.log('❌ Missing required fields: userId or email');
      return res.status(400).json({
        success: false,
        error: 'userId and email are required'
      });
    }

    // Check if user already has a Stripe account
    const existingConfig = await getUserStripeConfig(userId);

    if (existingConfig.accountId) {
      // Refresh the onboarding link for existing account
      console.log(`ℹ️  User already has Stripe account: ${existingConfig.accountId}`);
      const refreshed = await refreshAccountLink(existingConfig.accountId);

      return res.json({
        success: true,
        accountId: existingConfig.accountId,
        onboardingUrl: refreshed.onboardingUrl,
        message: 'Existing account found. Complete onboarding to activate.'
      });
    }

    // Create new Stripe Connect account
    const result = await createConnectAccount(userId, email, country);

    res.json({
      success: true,
      accountId: result.accountId,
      onboardingUrl: result.onboardingUrl,
      message: result.message
    });
  } catch (error) {
    console.error('❌ Error connecting Stripe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect Stripe account',
      message: error.message
    });
  }
});

/**
 * GET /api/stripe/connect/status
 * Get user's Stripe account status (query parameter version for frontend compatibility)
 * This endpoint supports: /backend/stripe/connect/status?userId=11
 */
router.get('/connect/status', async (req, res) => {
  const { userId } = req.query;
  console.log(`🔍 Checking Stripe connection status for user ${userId}...`);

  try {
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId query parameter is required'
      });
    }

    const config = await getUserStripeConfig(userId);

    if (!config.accountId) {
      return res.json({
        success: true,
        stripe: {
          connected: false,
          enabled: false,
          accountId: null,
          isComplete: false
        }
      });
    }

    // Check account status on Stripe
    const status = await checkAccountStatus(config.accountId);

    // If account is complete but not enabled in DB, enable it
    if (status.isComplete && !config.enabled) {
      await enableStripeForUser(userId, config.accountId);
      config.enabled = true;
    }

    res.json({
      success: true,
      stripe: {
        connected: true,
        enabled: config.enabled,
        accountId: config.accountId,
        isComplete: status.isComplete,
        chargesEnabled: status.chargesEnabled,
        payoutsEnabled: status.payoutsEnabled,
        requirements: status.requirements
      }
    });
  } catch (error) {
    console.error('❌ Error verifying Stripe connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify Stripe connection',
      message: error.message
    });
  }
});

/**
 * POST /api/stripe/refresh
 * Refresh onboarding link for existing account
 */
router.post('/refresh', async (req, res) => {
  console.log('🔄 Refreshing Stripe onboarding link...');

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const config = await getUserStripeConfig(userId);

    if (!config.accountId) {
      return res.status(404).json({
        success: false,
        error: 'No Stripe account found for this user'
      });
    }

    const result = await refreshAccountLink(config.accountId);

    res.json({
      success: true,
      onboardingUrl: result.onboardingUrl
    });
  } catch (error) {
    console.error('❌ Error refreshing link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh onboarding link',
      message: error.message
    });
  }
});

/**
 * GET /api/stripe/status/:userId
 * Get user's Stripe account status
 */
router.get('/status/:userId', async (req, res) => {
  console.log(`🔍 Checking Stripe status for user ${req.params.userId}...`);

  try {
    const { userId } = req.params;

    const config = await getUserStripeConfig(userId);

    if (!config.accountId) {
      return res.json({
        success: true,
        stripe: {
          connected: false,
          enabled: false,
          accountId: null,
          isComplete: false
        }
      });
    }

    // Check account status on Stripe
    const status = await checkAccountStatus(config.accountId);

    // If account is complete but not enabled in DB, enable it
    if (status.isComplete && !config.enabled) {
      await enableStripeForUser(userId, config.accountId);
      config.enabled = true;
    }

    res.json({
      success: true,
      stripe: {
        connected: true,
        enabled: config.enabled,
        accountId: config.accountId,
        isComplete: status.isComplete,
        chargesEnabled: status.chargesEnabled,
        payoutsEnabled: status.payoutsEnabled,
        requirements: status.requirements
      }
    });
  } catch (error) {
    console.error('❌ Error fetching Stripe status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Stripe status',
      message: error.message
    });
  }
});

/**
 * POST /api/stripe/disconnect
 * Disconnect user's Stripe account
 */
router.post('/disconnect', async (req, res) => {
  console.log('🔌 Disconnecting Stripe account...');

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    await disconnectStripeAccount(userId);

    res.json({
      success: true,
      message: 'Stripe account disconnected successfully'
    });
  } catch (error) {
    console.error('❌ Error disconnecting Stripe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Stripe account',
      message: error.message
    });
  }
});

/**
 * GET /api/stripe/payments/:campaignId
 * Get all Stripe payments for a campaign
 */
router.get('/payments/:campaignId', async (req, res) => {
  console.log(`📋 Fetching Stripe payments for campaign ${req.params.campaignId}...`);

  try {
    const { campaignId } = req.params;

    const payments = await getCampaignPayments(campaignId);

    res.json({
      success: true,
      count: payments.length,
      payments: payments
    });
  } catch (error) {
    console.error('❌ Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
      message: error.message
    });
  }
});

/**
 * GET /api/stripe/payment/:paymentLinkId
 * Get specific payment link details
 */
router.get('/payment/:paymentLinkId', async (req, res) => {
  console.log(`🔍 Fetching payment link ${req.params.paymentLinkId}...`);

  try {
    const { paymentLinkId } = req.params;

    const payment = await getPaymentLinkStatus(paymentLinkId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment link not found'
      });
    }

    res.json({
      success: true,
      payment: payment
    });
  } catch (error) {
    console.error('❌ Error fetching payment link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment link',
      message: error.message
    });
  }
});

/**
 * POST /api/stripe/webhook
 * Stripe webhook endpoint for payment events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('📨 Stripe webhook received');

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📨 Event Type: ${event.type}`);

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
        await updatePaymentStatus(paymentIntent.id, 'succeeded');
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log(`❌ Payment failed: ${failedPayment.id}`);
        await updatePaymentStatus(failedPayment.id, 'failed');
        break;

      case 'checkout.session.completed':
        const session = event.data.object;
        console.log(`✅ Checkout completed: ${session.id}`);
        if (session.payment_intent) {
          await updatePaymentStatus(session.payment_intent, 'completed');
        }
        break;

      case 'account.updated':
        const account = event.data.object;
        console.log(`📝 Account updated: ${account.id}`);

        // Check if account is now fully onboarded
        if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
          // Update user status in database
          await query(
            `UPDATE users 
             SET stripe_enabled = true,
                 updated_at = NOW()
             WHERE stripe_account_id = $1`,
            [account.id]
          );
          console.log(`✅ Account ${account.id} is now fully enabled`);
        }
        break;

      default:
        console.log(`ℹ️  Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error.message
    });
  }
});

/**
 * GET /api/stripe/approvals/pending
 * Get all pending Stripe approval requests
 */
router.get('/approvals/pending', async (req, res) => {
  console.log('📋 Fetching pending Stripe approvals...');

  try {
    const { userId } = req.query;

    let queryText = `
      SELECT 
        sa.*,
        c.campaign_name,
        u.username as seller_username
      FROM stripe_approvals sa
      LEFT JOIN campaigns c ON sa.campaign_id = c.campaign_id
      LEFT JOIN users u ON sa.user_id = u.id
      WHERE sa.status = 'pending'
    `;

    const queryParams = [];

    if (userId) {
      queryText += ` AND sa.user_id = $1`;
      queryParams.push(userId);
    }

    queryText += ` ORDER BY sa.created_at DESC`;

    const result = await query(queryText, queryParams);

    res.json({
      success: true,
      approvals: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approvals',
      message: error.message
    });
  }
});

/**
 * POST /api/stripe/approvals/:id/approve
 * Approve a Stripe payment request and generate payment link
 */
router.post('/approvals/:id/approve', async (req, res) => {
  console.log(`✅ Approving Stripe request ${req.params.id}...`);

  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    // Get approval request
    const approval = await query(
      'SELECT * FROM stripe_approvals WHERE id = $1',
      [id]
    );

    if (approval.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Approval request not found'
      });
    }

    const request = approval.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Request already ${request.status}`
      });
    }

    // Get seller's Stripe account
    const userConfig = await getUserStripeConfig(request.user_id);

    if (!userConfig.enabled || !userConfig.accountId) {
      return res.status(400).json({
        success: false,
        error: 'Seller has not connected their Stripe account'
      });
    }

    // Create payment link
    const { createPaymentLink } = require('../services/stripeService');
    const { sendEmail } = require('../services/emailService');

    const paymentResult = await createPaymentLink({
      domainName: request.domain_name,
      amount: request.amount,
      currency: request.currency,
      sellerStripeAccountId: userConfig.accountId,
      buyerEmail: request.buyer_email,
      buyerName: request.buyer_name,
      campaignId: request.campaign_id,
      userId: request.user_id
    });

    if (paymentResult.success) {
      // Update approval status
      await query(
        `UPDATE stripe_approvals 
         SET status = 'approved',
             approved_at = NOW(),
             approved_by = $1,
             payment_link_id = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [approvedBy, paymentResult.paymentLinkId, id]
      );

      // Send payment link to buyer
      const emailContent =
        `Hi ${request.buyer_name},\n\n` +
        `Great news! Your secure payment link is ready.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💳 SECURE PAYMENT LINK\n\n` +
        `🔗 ${paymentResult.paymentUrl}\n\n` +
        `💰 Amount: $${request.amount} ${request.currency}\n` +
        `🛡️ Secured by Stripe\n` +
        `📋 Domain: ${request.domain_name}\n\n` +
        `Click the link above to complete your secure payment with your credit or debit card.\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sendEmail({
        to: request.buyer_email,
        subject: `Payment Link Ready: ${request.domain_name}`,
        html: emailContent.replace(/\n/g, '<br>'),
        text: emailContent,
        tags: [`campaign-${request.campaign_id}`, 'stripe-approved', 'payment-link']
      });

      console.log('✅ Approval complete and email sent to buyer');

      res.json({
        success: true,
        message: 'Stripe payment link created and sent',
        paymentUrl: paymentResult.paymentUrl,
        paymentLinkId: paymentResult.paymentLinkId
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create payment link'
      });
    }
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve request',
      message: error.message
    });
  }
});

/**
 * GET /api/stripe/approvals/:id/approve
 * Approve link (for email buttons) - GET version
 */
router.get('/approvals/:id/approve', async (req, res) => {
  console.log(`✅ Approving Stripe request ${req.params.id} (via GET)...`);

  try {
    const { id } = req.params;

    // Get approval request
    const approval = await query(
      'SELECT * FROM stripe_approvals WHERE id = $1',
      [id]
    );

    if (approval.rows.length === 0) {
      return res.status(404).send(`
        <html>
          <head><title>Not Found</title></head>
          <body style="font-family:Arial;padding:50px;text-align:center;">
            <h1>❌ Approval Request Not Found</h1>
            <p>This approval request doesn't exist or has been removed.</p>
          </body>
        </html>
      `);
    }

    const request = approval.rows[0];

    if (request.status !== 'pending') {
      return res.send(`
        <html>
          <head><title>Already Processed</title></head>
          <body style="font-family:Arial;padding:50px;text-align:center;">
            <h1>ℹ️ Already ${request.status === 'approved' ? 'Approved' : 'Declined'}</h1>
            <p>This request was already ${request.status} on ${new Date(request.updated_at).toLocaleString()}</p>
            ${request.status === 'approved' && request.payment_link_id ?
          `<p><strong>Payment Link ID:</strong> ${request.payment_link_id}</p>` : ''}
          </body>
        </html>
      `);
    }

    // Get seller's Stripe account
    const userConfig = await getUserStripeConfig(request.user_id);

    if (!userConfig.enabled || !userConfig.accountId) {
      return res.status(400).send(`
        <html>
          <head><title>Error</title></head>
          <body style="font-family:Arial;padding:50px;text-align:center;">
            <h1>❌ Error</h1>
            <p>Seller has not connected their Stripe account yet.</p>
          </body>
        </html>
      `);
    }

    // Create payment link
    const { createPaymentLink } = require('../services/stripeService');
    const { sendEmail } = require('../services/emailService');

    const paymentResult = await createPaymentLink({
      domainName: request.domain_name,
      amount: request.amount,
      currency: request.currency,
      sellerStripeAccountId: userConfig.accountId,
      buyerEmail: request.buyer_email,
      buyerName: request.buyer_name,
      campaignId: request.campaign_id,
      userId: request.user_id
    });

    if (paymentResult.success) {
      // Update approval status
      await query(
        `UPDATE stripe_approvals 
         SET status = 'approved',
             approved_at = NOW(),
             payment_link_id = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [paymentResult.paymentLinkId, id]
      );

      // Send payment link to buyer
      const emailContent =
        `Hi ${request.buyer_name},\n\n` +
        `Great news! Your secure payment link is ready.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💳 SECURE PAYMENT LINK\n\n` +
        `🔗 ${paymentResult.paymentUrl}\n\n` +
        `💰 Amount: $${request.amount} ${request.currency}\n` +
        `🛡️ Secured by Stripe\n` +
        `📋 Domain: ${request.domain_name}\n\n` +
        `Click the link above to complete your secure payment with your credit or debit card.\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await sendEmail({
        to: request.buyer_email,
        subject: `Payment Link Ready: ${request.domain_name}`,
        html: emailContent.replace(/\n/g, '<br>'),
        text: emailContent,
        tags: [`campaign-${request.campaign_id}`, 'stripe-approved', 'payment-link']
      });

      console.log('✅ Approval complete and email sent to buyer');

      // Return success page
      res.send(`
        <html>
          <head>
            <title>Approved!</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family:Arial,sans-serif;padding:20px;text-align:center;background:#f1f5f9;">
            <div style="max-width:600px;margin:50px auto;background:white;padding:40px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
              <div style="font-size:64px;margin-bottom:20px;">✅</div>
              <h1 style="color:#10b981;margin:0 0 20px 0;">Approved!</h1>
              <p style="color:#334155;font-size:18px;line-height:1.6;">
                The Stripe payment link has been sent to:<br>
                <strong>${request.buyer_email}</strong>
              </p>
              <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:30px 0;text-align:left;">
                <h3 style="margin:0 0 15px 0;color:#1e40af;">Transaction Details:</h3>
                <p style="margin:8px 0;color:#334155;"><strong>Domain:</strong> ${request.domain_name}</p>
                <p style="margin:8px 0;color:#334155;"><strong>Amount:</strong> $${request.amount} ${request.currency}</p>
                <p style="margin:8px 0;color:#334155;"><strong>Buyer:</strong> ${request.buyer_name}</p>
                <p style="margin:8px 0;color:#334155;"><strong>Payment Link:</strong> <a href="${paymentResult.paymentUrl}" target="_blank">${paymentResult.paymentUrl}</a></p>
              </div>
              <p style="color:#64748b;font-size:14px;">
                The buyer will receive an email with the payment link.<br>
                You can close this window.
              </p>
            </div>
          </body>
        </html>
      `);
    } else {
      res.status(500).send(`
        <html>
          <head><title>Error</title></head>
          <body style="font-family:Arial;padding:50px;text-align:center;">
            <h1>❌ Error Creating Payment Link</h1>
            <p>Failed to create Stripe payment link</p>
            <p><a href="javascript:history.back()">Go Back</a></p>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).send(`
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
 * POST /api/stripe/approvals/:id/decline
 * Decline a Stripe payment request
 */
router.post('/approvals/:id/decline', async (req, res) => {
  console.log(`❌ Declining Stripe request ${req.params.id}...`);

  try {
    const { id } = req.params;
    const { declinedBy, notes } = req.body;

    await query(
      `UPDATE stripe_approvals 
       SET status = 'declined',
           notes = $1,
           updated_at = NOW()
       WHERE id = $2 AND status = 'pending'`,
      [notes || 'Declined by admin', id]
    );

    res.json({
      success: true,
      message: 'Stripe payment request declined'
    });
  } catch (error) {
    console.error('Error declining request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decline request',
      message: error.message
    });
  }
});

/**
 * GET /api/stripe/approvals/:id/decline
 * Decline link (for email buttons) - GET version
 */
router.get('/approvals/:id/decline', async (req, res) => {
  console.log(`❌ Declining Stripe request ${req.params.id} (via GET)...`);

  try {
    const { id } = req.params;
    const { reason } = req.query;

    const result = await query(
      `UPDATE stripe_approvals 
       SET status = 'declined',
           notes = $1,
           updated_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [reason || 'Declined by admin', id]
    );

    if (result.rows.length === 0) {
      return res.send(`
        <html>
          <head><title>Already Processed</title></head>
          <body style="font-family:Arial;padding:50px;text-align:center;">
            <h1>ℹ️ Already Processed</h1>
            <p>This request has already been processed or doesn't exist.</p>
          </body>
        </html>
      `);
    }

    const request = result.rows[0];

    res.send(`
      <html>
        <head>
          <title>Declined</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family:Arial,sans-serif;padding:20px;text-align:center;background:#f1f5f9;">
          <div style="max-width:600px;margin:50px auto;background:white;padding:40px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
            <div style="font-size:64px;margin-bottom:20px;">❌</div>
            <h1 style="color:#dc2626;margin:0 0 20px 0;">Request Declined</h1>
            <p style="color:#334155;font-size:18px;line-height:1.6;">
              The Stripe payment request has been declined.
            </p>
            <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:30px 0;text-align:left;">
              <p style="margin:8px 0;color:#334155;"><strong>Domain:</strong> ${request.domain_name}</p>
              <p style="margin:8px 0;color:#334155;"><strong>Buyer:</strong> ${request.buyer_name} (${request.buyer_email})</p>
              <p style="margin:8px 0;color:#334155;"><strong>Amount:</strong> $${request.amount} ${request.currency}</p>
              ${reason ? `<p style="margin:8px 0;color:#334155;"><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            <p style="color:#64748b;font-size:14px;">
              No notification was sent to the buyer.<br>
              You can close this window.
            </p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error declining request:', error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family:Arial;padding:50px;text-align:center;">
          <h1>❌ Error</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
});

module.exports = router;

