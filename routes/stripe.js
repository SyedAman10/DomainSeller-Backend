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
    const { sendEmail } = require('../services/emailService');
    
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
        console.log(`   Payment Intent: ${session.payment_intent}`);
        console.log(`   Payment Link: ${session.payment_link}`);
        console.log(`   Customer Email: ${session.customer_details?.email}`);
        
        // Try to update by payment_intent first, then by payment_link
        let updatedPayment = null;
        
        if (session.payment_intent) {
          updatedPayment = await updatePaymentStatus(session.payment_intent, 'completed');
        }
        
        // If not found by payment_intent, try by payment_link
        if (!updatedPayment && session.payment_link) {
          console.log(`🔍 Trying to find payment by payment_link: ${session.payment_link}`);
          const paymentByLink = await query(
            `UPDATE stripe_payments 
             SET status = 'completed', 
                 payment_intent_id = $1,
                 updated_at = NOW()
             WHERE payment_link_id = $2
             RETURNING *`,
            [session.payment_intent, session.payment_link]
          );
          
          if (paymentByLink.rows.length > 0) {
            updatedPayment = paymentByLink.rows[0];
            console.log(`✅ Found and updated payment by payment_link`);
          }
        }
        
        if (updatedPayment) {
          
          // If we have payment info, notify the seller
          if (updatedPayment) {
            // Get seller info
            const sellerResult = await query(
              `SELECT u.email, u.first_name, u.username 
               FROM users u 
               WHERE u.id = $1`,
              [updatedPayment.user_id]
            );
            
            if (sellerResult.rows.length > 0) {
              const seller = sellerResult.rows[0];
              const sellerName = seller.first_name || seller.username || 'Seller';
              
              // Calculate amount in proper currency format
              const amount = updatedPayment.amount;
              const currency = updatedPayment.currency || 'USD';
              
              console.log(`📧 Notifying seller ${seller.email} about payment...`);
              
              // Send seller notification
              const sellerEmailHtml = `
                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
                  <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:30px;text-align:center;border-radius:16px 16px 0 0;">
                    <div style="font-size:60px;margin-bottom:10px;">💰</div>
                    <h1 style="color:white;margin:0;font-size:28px;">Payment Received!</h1>
                  </div>
                  
                  <div style="padding:40px;background:#f8fafc;border-radius:0 0 16px 16px;">
                    <p style="font-size:18px;color:#334155;margin:0 0 25px 0;">
                      Hi <strong>${sellerName}</strong>,
                    </p>
                    
                    <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 25px 0;">
                      Great news! You've received a payment for your domain.
                    </p>
                    
                    <div style="background:white;border:2px solid #10b981;border-radius:12px;padding:25px;margin:25px 0;">
                      <h3 style="margin:0 0 20px 0;color:#059669;font-size:18px;">💳 Payment Details</h3>
                      <table style="width:100%;border-collapse:collapse;">
                        <tr>
                          <td style="padding:10px 0;color:#64748b;font-size:14px;">Domain:</td>
                          <td style="padding:10px 0;color:#0f172a;font-weight:600;text-align:right;">${updatedPayment.domain_name}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;color:#64748b;font-size:14px;">Amount:</td>
                          <td style="padding:10px 0;color:#10b981;font-weight:700;font-size:20px;text-align:right;">$${amount} ${currency}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;color:#64748b;font-size:14px;">Buyer:</td>
                          <td style="padding:10px 0;color:#0f172a;font-weight:600;text-align:right;">${updatedPayment.buyer_name}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;color:#64748b;font-size:14px;">Buyer Email:</td>
                          <td style="padding:10px 0;color:#0f172a;text-align:right;">${updatedPayment.buyer_email}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;color:#64748b;font-size:14px;">Status:</td>
                          <td style="padding:10px 0;text-align:right;"><span style="background:#10b981;color:white;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;">PAID ✓</span></td>
                        </tr>
                      </table>
                    </div>
                    
                    <div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:12px;padding:20px;margin:25px 0;">
                      <h4 style="margin:0 0 10px 0;color:#92400e;font-size:16px;">🔑 Next Steps</h4>
                      <ol style="color:#78350f;margin:0;padding-left:20px;line-height:1.8;">
                        <li>Contact the buyer to initiate domain transfer</li>
                        <li>Use your domain registrar to transfer the domain</li>
                        <li>Confirm transfer completion with the buyer</li>
                      </ol>
                    </div>
                    
                    <div style="background:#eff6ff;border-radius:12px;padding:20px;margin:25px 0;">
                      <p style="margin:0;color:#1e40af;font-size:14px;">
                        💡 <strong>Tip:</strong> The payment has been deposited directly to your connected Stripe account. 
                        Payouts to your bank will follow your Stripe payout schedule.
                      </p>
                    </div>
                    
                    <p style="color:#64748b;font-size:14px;text-align:center;margin:30px 0 0 0;">
                      Thank you for using our platform!
                    </p>
                  </div>
                </div>
              `;
              
              await sendEmail({
                to: seller.email,
                subject: `💰 Payment Received: $${amount} for ${updatedPayment.domain_name}`,
                html: sellerEmailHtml,
                text: `Payment Received!\n\nHi ${sellerName},\n\nYou've received a payment of $${amount} ${currency} for ${updatedPayment.domain_name}.\n\nBuyer: ${updatedPayment.buyer_name} (${updatedPayment.buyer_email})\n\nNext steps:\n1. Contact the buyer to initiate domain transfer\n2. Use your domain registrar to transfer the domain\n3. Confirm transfer completion with the buyer\n\nThe payment has been deposited to your Stripe account.`,
                tags: ['payment-received', 'seller-notification', `campaign-${updatedPayment.campaign_id}`]
              });
              
              console.log(`✅ Seller notification sent to ${seller.email}`);
              
              // Also send buyer confirmation
              const buyerEmailHtml = `
                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;">
                  <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:30px;text-align:center;border-radius:16px 16px 0 0;">
                    <div style="font-size:60px;margin-bottom:10px;">✅</div>
                    <h1 style="color:white;margin:0;font-size:28px;">Payment Confirmed!</h1>
                  </div>
                  
                  <div style="padding:40px;background:#f8fafc;border-radius:0 0 16px 16px;">
                    <p style="font-size:18px;color:#334155;margin:0 0 25px 0;">
                      Hi <strong>${updatedPayment.buyer_name}</strong>,
                    </p>
                    
                    <p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 25px 0;">
                      Thank you for your purchase! Your payment has been successfully processed.
                    </p>
                    
                    <div style="background:white;border:2px solid #10b981;border-radius:12px;padding:25px;margin:25px 0;">
                      <h3 style="margin:0 0 20px 0;color:#059669;font-size:18px;">📋 Order Summary</h3>
                      <table style="width:100%;border-collapse:collapse;">
                        <tr>
                          <td style="padding:10px 0;color:#64748b;font-size:14px;">Domain Purchased:</td>
                          <td style="padding:10px 0;color:#0f172a;font-weight:600;text-align:right;">${updatedPayment.domain_name}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;color:#64748b;font-size:14px;">Amount Paid:</td>
                          <td style="padding:10px 0;color:#10b981;font-weight:700;font-size:20px;text-align:right;">$${amount} ${currency}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0;color:#64748b;font-size:14px;">Status:</td>
                          <td style="padding:10px 0;text-align:right;"><span style="background:#10b981;color:white;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600;">PAID ✓</span></td>
                        </tr>
                      </table>
                    </div>
                    
                    <div style="background:#dbeafe;border-radius:12px;padding:20px;margin:25px 0;">
                      <h4 style="margin:0 0 10px 0;color:#1e40af;font-size:16px;">📧 What Happens Next?</h4>
                      <p style="color:#1e3a8a;margin:0;line-height:1.6;">
                        The seller has been notified of your payment and will contact you shortly 
                        to complete the domain transfer. Please check your email for further instructions.
                      </p>
                    </div>
                    
                    <p style="color:#64748b;font-size:14px;text-align:center;margin:30px 0 0 0;">
                      Thank you for your purchase!
                    </p>
                  </div>
                </div>
              `;
              
              await sendEmail({
                to: updatedPayment.buyer_email,
                subject: `✅ Payment Confirmed: ${updatedPayment.domain_name}`,
                html: buyerEmailHtml,
                text: `Payment Confirmed!\n\nHi ${updatedPayment.buyer_name},\n\nThank you for your purchase of ${updatedPayment.domain_name} for $${amount} ${currency}.\n\nThe seller has been notified and will contact you shortly to complete the domain transfer.\n\nPlease check your email for further instructions.`,
                tags: ['payment-confirmed', 'buyer-notification', `campaign-${updatedPayment.campaign_id}`]
              });
              
              console.log(`✅ Buyer confirmation sent to ${updatedPayment.buyer_email}`);
            }
          }
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
      // Check if it's an installment plan suggestion (amount too high)
      if (paymentResult.suggestedAlternative === 'installments' && paymentResult.installmentPlan) {
        const plan = paymentResult.installmentPlan;
        return res.send(`
          <html>
            <head>
              <title>High-Value Domain - Installment Plan</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
            </head>
            <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:20px;background:#f1f5f9;">
              <div style="max-width:700px;margin:30px auto;background:white;padding:40px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.1);">
                <div style="text-align:center;margin-bottom:30px;">
                  <div style="font-size:64px;margin-bottom:15px;">💎</div>
                  <h1 style="color:#0f172a;margin:0;">High-Value Domain Sale</h1>
                  <p style="color:#64748b;font-size:18px;margin-top:10px;">Amount exceeds single payment limit</p>
                </div>
                
                <div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border:2px solid #f59e0b;padding:25px;border-radius:12px;margin:20px 0;">
                  <h3 style="margin:0 0 15px 0;color:#92400e;font-size:18px;">⚠️ Stripe Payment Limit</h3>
                  <p style="color:#78350f;margin:0;line-height:1.6;">
                    The domain <strong>${request.domain_name}</strong> is priced at <strong>$${request.amount.toLocaleString()}</strong>, 
                    which exceeds Stripe's maximum single payment limit of $999,999.99.
                  </p>
                </div>
                
                <div style="background:#f0fdf4;border:2px solid #22c55e;padding:25px;border-radius:12px;margin:20px 0;">
                  <h3 style="margin:0 0 15px 0;color:#166534;font-size:18px;">✅ Suggested: Installment Plan</h3>
                  <div style="background:white;padding:20px;border-radius:8px;">
                    <p style="margin:0 0 10px 0;color:#334155;"><strong>Total Amount:</strong> $${plan.totalAmount.toLocaleString()}</p>
                    <p style="margin:0 0 10px 0;color:#334155;"><strong>Number of Payments:</strong> ${plan.numberOfPayments}</p>
                    <p style="margin:0;color:#334155;"><strong>Amount Per Payment:</strong> ~$${plan.amountPerPayment.toLocaleString()}</p>
                  </div>
                </div>
                
                <div style="background:#eff6ff;border:2px solid #3b82f6;padding:25px;border-radius:12px;margin:20px 0;">
                  <h3 style="margin:0 0 15px 0;color:#1e40af;font-size:18px;">📧 Send This Message to Buyer</h3>
                  <p style="color:#64748b;font-size:14px;margin:0 0 15px 0;">Copy and send this message to ${request.buyer_name}:</p>
                  <div style="background:white;padding:20px;border-radius:8px;border-left:4px solid #3b82f6;">
                    <p style="color:#334155;line-height:1.8;margin:0;white-space:pre-wrap;">${paymentResult.buyerMessage}</p>
                  </div>
                  <button onclick="navigator.clipboard.writeText(\`${paymentResult.buyerMessage.replace(/`/g, '\\`')}\`);this.innerText='✓ Copied!';setTimeout(()=>this.innerText='📋 Copy Message',2000)" 
                          style="margin-top:15px;padding:12px 25px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:600;">
                    📋 Copy Message
                  </button>
                </div>
                
                <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:20px 0;">
                  <h4 style="margin:0 0 15px 0;color:#334155;">💡 Alternative Options:</h4>
                  <ul style="color:#64748b;margin:0;padding-left:20px;line-height:2;">
                    ${paymentResult.alternatives.map(alt => `<li>${alt}</li>`).join('')}
                  </ul>
                </div>
                
                <div style="text-align:center;margin-top:30px;">
                  <p style="color:#64748b;font-size:14px;">
                    Once the buyer agrees to the installment plan, create separate payment links for each installment.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `);
      }
      
      // Generic error
      res.status(500).send(`
        <html>
          <head><title>Error</title></head>
          <body style="font-family:Arial;padding:50px;text-align:center;">
            <h1>❌ Error Creating Payment Link</h1>
            <p>${paymentResult.message || 'Failed to create Stripe payment link'}</p>
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

/**
 * GET /api/stripe/payments/user/:userId
 * Get all payments for a user (seller dashboard)
 */
router.get('/payments/user/:userId', async (req, res) => {
  console.log(`📋 Fetching payments for user ${req.params.userId}...`);

  try {
    const { userId } = req.params;
    const { status, limit = 50 } = req.query;

    let queryText = `
      SELECT 
        sp.*,
        c.campaign_name,
        c.domain_name as campaign_domain
      FROM stripe_payments sp
      LEFT JOIN campaigns c ON sp.campaign_id = c.campaign_id
      WHERE sp.user_id = $1
    `;
    const queryParams = [userId];

    if (status) {
      queryText += ` AND sp.status = $2`;
      queryParams.push(status);
    }

    queryText += ` ORDER BY sp.created_at DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);

    const result = await query(queryText, queryParams);

    // Calculate totals
    const payments = result.rows;
    const totalReceived = payments
      .filter(p => p.status === 'completed' || p.status === 'succeeded')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const pendingAmount = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    res.json({
      success: true,
      data: {
        payments,
        summary: {
          totalPayments: payments.length,
          totalReceived,
          pendingAmount,
          completedCount: payments.filter(p => p.status === 'completed' || p.status === 'succeeded').length,
          pendingCount: payments.filter(p => p.status === 'pending').length,
          failedCount: payments.filter(p => p.status === 'failed').length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
      message: error.message
    });
  }
});

/**
 * GET /api/stripe/dashboard/:userId
 * Get seller dashboard summary
 */
router.get('/dashboard/:userId', async (req, res) => {
  console.log(`📊 Fetching dashboard for user ${req.params.userId}...`);

  try {
    const { userId } = req.params;

    // Get payment stats
    const paymentsResult = await query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status IN ('completed', 'succeeded') THEN amount ELSE 0 END) as total_received,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status IN ('completed', 'succeeded') THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
      FROM stripe_payments
      WHERE user_id = $1
    `, [userId]);

    // Get recent payments
    const recentPayments = await query(`
      SELECT 
        sp.*,
        c.campaign_name
      FROM stripe_payments sp
      LEFT JOIN campaigns c ON sp.campaign_id = c.campaign_id
      WHERE sp.user_id = $1
      ORDER BY sp.created_at DESC
      LIMIT 5
    `, [userId]);

    // Get pending approvals
    const pendingApprovals = await query(`
      SELECT 
        sa.*,
        c.campaign_name
      FROM stripe_approvals sa
      LEFT JOIN campaigns c ON sa.campaign_id = c.campaign_id
      WHERE sa.user_id = $1 AND sa.status = 'pending'
      ORDER BY sa.created_at DESC
    `, [userId]);

    // Get Stripe account status
    const stripeConfig = await getUserStripeConfig(userId);

    const stats = paymentsResult.rows[0];

    res.json({
      success: true,
      data: {
        stripeAccount: {
          connected: !!stripeConfig.accountId,
          enabled: stripeConfig.enabled,
          accountId: stripeConfig.accountId
        },
        summary: {
          totalPayments: parseInt(stats.total_payments) || 0,
          totalReceived: parseFloat(stats.total_received) || 0,
          pendingAmount: parseFloat(stats.pending_amount) || 0,
          completedCount: parseInt(stats.completed_count) || 0,
          pendingCount: parseInt(stats.pending_count) || 0
        },
        recentPayments: recentPayments.rows,
        pendingApprovals: pendingApprovals.rows
      }
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard',
      message: error.message
    });
  }
});

/**
 * POST /api/stripe/sync-payments/:userId
 * Sync payment statuses from Stripe (manual sync)
 */
router.post('/sync-payments/:userId', async (req, res) => {
  console.log(`🔄 Syncing payments for user ${req.params.userId}...`);

  try {
    const { userId } = req.params;

    // Get user's Stripe account
    const stripeConfig = await getUserStripeConfig(userId);

    if (!stripeConfig.accountId) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe account connected'
      });
    }

    // Get pending payments from database
    const pendingPayments = await query(
      `SELECT * FROM stripe_payments 
       WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );

    console.log(`📋 Found ${pendingPayments.rows.length} pending payments to check`);

    let updated = 0;
    let errors = [];

    for (const payment of pendingPayments.rows) {
      try {
        // Try to find this payment in Stripe by payment_link_id
        if (payment.payment_link_id) {
          // Get checkout sessions for this payment link
          const sessions = await stripe.checkout.sessions.list({
            payment_link: payment.payment_link_id,
            limit: 10
          }, {
            stripeAccount: stripeConfig.accountId
          });

          // Check if any session is completed
          const completedSession = sessions.data.find(s => 
            s.payment_status === 'paid' || s.status === 'complete'
          );

          if (completedSession) {
            // Update the payment status
            await query(
              `UPDATE stripe_payments 
               SET status = 'completed',
                   payment_intent_id = $1,
                   updated_at = NOW()
               WHERE id = $2`,
              [completedSession.payment_intent, payment.id]
            );
            
            console.log(`✅ Updated payment ${payment.id} (${payment.domain_name}) to completed`);
            updated++;
          }
        }
      } catch (err) {
        console.error(`❌ Error syncing payment ${payment.id}:`, err.message);
        errors.push({ paymentId: payment.id, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Synced ${updated} payments`,
      data: {
        checked: pendingPayments.rows.length,
        updated,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('❌ Error syncing payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync payments',
      message: error.message
    });
  }
});

/**
 * GET /api/stripe/balance/:userId
 * Get actual Stripe account balance from Stripe API
 */
router.get('/balance/:userId', async (req, res) => {
  console.log(`💰 Fetching Stripe balance for user ${req.params.userId}...`);

  try {
    const { userId } = req.params;

    // Get user's Stripe account
    const stripeConfig = await getUserStripeConfig(userId);

    if (!stripeConfig.accountId) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe account connected'
      });
    }

    // Get balance from Stripe
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeConfig.accountId
    });

    // Get recent payouts
    const payouts = await stripe.payouts.list({
      limit: 10
    }, {
      stripeAccount: stripeConfig.accountId
    });

    // Get recent charges/payments
    const charges = await stripe.charges.list({
      limit: 10
    }, {
      stripeAccount: stripeConfig.accountId
    });

    // Format balances
    const availableBalance = balance.available.map(b => ({
      amount: b.amount / 100,
      currency: b.currency.toUpperCase()
    }));

    const pendingBalance = balance.pending.map(b => ({
      amount: b.amount / 100,
      currency: b.currency.toUpperCase()
    }));

    res.json({
      success: true,
      data: {
        accountId: stripeConfig.accountId,
        available: availableBalance,
        pending: pendingBalance,
        totalAvailable: availableBalance.reduce((sum, b) => sum + b.amount, 0),
        totalPending: pendingBalance.reduce((sum, b) => sum + b.amount, 0),
        recentPayouts: payouts.data.map(p => ({
          id: p.id,
          amount: p.amount / 100,
          currency: p.currency.toUpperCase(),
          status: p.status,
          arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
          created: new Date(p.created * 1000).toISOString()
        })),
        recentCharges: charges.data.map(c => ({
          id: c.id,
          amount: c.amount / 100,
          currency: c.currency.toUpperCase(),
          status: c.status,
          description: c.description,
          customerEmail: c.billing_details?.email,
          created: new Date(c.created * 1000).toISOString()
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching Stripe balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Stripe balance',
      message: error.message
    });
  }
});

/**
 * GET /api/stripe/sold-domains/:userId
 * Get list of all sold domains with payment details
 */
router.get('/sold-domains/:userId', async (req, res) => {
  console.log(`🌐 Fetching sold domains for user ${req.params.userId}...`);

  try {
    const { userId } = req.params;

    const soldDomains = await query(`
      SELECT 
        sp.domain_name,
        sp.amount,
        sp.currency,
        sp.buyer_name,
        sp.buyer_email,
        sp.status,
        sp.created_at as sold_at,
        sp.updated_at,
        c.campaign_name,
        c.campaign_id
      FROM stripe_payments sp
      LEFT JOIN campaigns c ON sp.campaign_id = c.campaign_id
      WHERE sp.user_id = $1 
        AND sp.status IN ('completed', 'succeeded')
      ORDER BY sp.created_at DESC
    `, [userId]);

    const totalRevenue = soldDomains.rows.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);

    res.json({
      success: true,
      data: {
        soldDomains: soldDomains.rows,
        summary: {
          totalDomainsSold: soldDomains.rows.length,
          totalRevenue,
          averagePrice: soldDomains.rows.length > 0 
            ? (totalRevenue / soldDomains.rows.length).toFixed(2) 
            : 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching sold domains:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sold domains',
      message: error.message
    });
  }
});

/**
 * GET /api/stripe/transactions/:userId
 * Get all transactions (payments + approvals) for a user
 */
router.get('/transactions/:userId', async (req, res) => {
  console.log(`💳 Fetching transactions for user ${req.params.userId}...`);

  try {
    const { userId } = req.params;
    const { limit = 100 } = req.query;

    // Get payments
    const payments = await query(`
      SELECT 
        'payment' as type,
        sp.id,
        sp.domain_name,
        sp.amount,
        sp.currency,
        sp.buyer_name,
        sp.buyer_email,
        sp.status,
        sp.created_at,
        sp.updated_at,
        c.campaign_name
      FROM stripe_payments sp
      LEFT JOIN campaigns c ON sp.campaign_id = c.campaign_id
      WHERE sp.user_id = $1
    `, [userId]);

    // Get approvals
    const approvals = await query(`
      SELECT 
        'approval' as type,
        sa.id,
        sa.domain_name,
        sa.amount,
        sa.currency,
        sa.buyer_name,
        sa.buyer_email,
        sa.status,
        sa.created_at,
        sa.updated_at,
        c.campaign_name
      FROM stripe_approvals sa
      LEFT JOIN campaigns c ON sa.campaign_id = c.campaign_id
      WHERE sa.user_id = $1
    `, [userId]);

    // Combine and sort
    const transactions = [...payments.rows, ...approvals.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);

    res.json({
      success: true,
      data: {
        transactions,
        counts: {
          payments: payments.rows.length,
          approvals: approvals.rows.length,
          total: transactions.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      message: error.message
    });
  }
});

module.exports = router;

