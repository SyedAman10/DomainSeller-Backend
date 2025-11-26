const Stripe = require('stripe');
const { query } = require('../config/database');
require('dotenv').config();

/**
 * Stripe Connect Integration
 * Allows users to connect their Stripe accounts and receive payments directly
 */

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create Stripe Connect account for user (onboarding)
 * @param {String} userId - User ID
 * @param {String} email - User email
 * @param {String} country - User country (default: US)
 * @returns {Promise<Object>} Account link URL for onboarding
 */
const createConnectAccount = async (userId, email, country = 'US') => {
  console.log('🔗 Creating Stripe Connect account...');
  console.log(`   User ID: ${userId}`);
  console.log(`   Email: ${email}`);

  try {
    // Create a Connect account
    const account = await stripe.accounts.create({
      type: 'express', // Express accounts are easier for users
      country: country,
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    console.log(`✅ Stripe Connect account created: ${account.id}`);

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/settings/stripe/refresh`,
      return_url: `${process.env.FRONTEND_URL}/settings/stripe/success`,
      type: 'account_onboarding',
    });

    // Store Stripe account ID in database
    await query(
      `UPDATE users 
       SET stripe_account_id = $1,
           stripe_enabled = false,
           updated_at = NOW()
       WHERE id = $2`,
      [account.id, userId]
    );

    console.log(`✅ Onboarding URL generated`);

    return {
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
      message: 'Stripe Connect account created. Complete onboarding to activate.'
    };
  } catch (error) {
    console.error('❌ Error creating Stripe Connect account:', error.message);
    throw error;
  }
};

/**
 * Get account link for returning users (refresh onboarding)
 * @param {String} accountId - Stripe account ID
 * @returns {Promise<String>} Account link URL
 */
const refreshAccountLink = async (accountId) => {
  console.log(`🔄 Refreshing account link for: ${accountId}`);

  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL}/settings/stripe/refresh`,
      return_url: `${process.env.FRONTEND_URL}/settings/stripe/success`,
      type: 'account_onboarding',
    });

    return {
      success: true,
      onboardingUrl: accountLink.url
    };
  } catch (error) {
    console.error('❌ Error refreshing account link:', error.message);
    throw error;
  }
};

/**
 * Check if Stripe account is fully onboarded
 * @param {String} accountId - Stripe account ID
 * @returns {Promise<Object>} Account status
 */
const checkAccountStatus = async (accountId) => {
  console.log(`🔍 Checking Stripe account status: ${accountId}`);

  try {
    const account = await stripe.accounts.retrieve(accountId);

    const isComplete = account.details_submitted && 
                      account.charges_enabled && 
                      account.payouts_enabled;

    console.log(`   Details Submitted: ${account.details_submitted}`);
    console.log(`   Charges Enabled: ${account.charges_enabled}`);
    console.log(`   Payouts Enabled: ${account.payouts_enabled}`);
    console.log(`   Status: ${isComplete ? 'COMPLETE' : 'INCOMPLETE'}`);

    return {
      success: true,
      accountId: account.id,
      isComplete: isComplete,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements
    };
  } catch (error) {
    console.error('❌ Error checking account status:', error.message);
    throw error;
  }
};

/**
 * Create Stripe Payment Link for domain purchase
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} Payment link details
 */
const createPaymentLink = async (paymentData) => {
  const {
    domainName,
    amount,
    currency = 'USD',
    sellerStripeAccountId,
    buyerEmail,
    buyerName,
    campaignId,
    userId,
    applicationFeePercent = 0 // Platform fee (if you want to take a commission)
  } = paymentData;

  console.log('💳 CREATING STRIPE PAYMENT LINK');
  console.log(`   Domain: ${domainName}`);
  console.log(`   Amount: $${amount} ${currency}`);
  console.log(`   Seller Account: ${sellerStripeAccountId}`);
  console.log(`   Buyer: ${buyerName} (${buyerEmail})`);

  try {
    // Calculate application fee (your platform's commission)
    const amountInCents = Math.round(amount * 100);
    const applicationFeeAmount = Math.round(amountInCents * (applicationFeePercent / 100));

    // Create a product for this domain
    const product = await stripe.products.create(
      {
        name: domainName,
        description: `Premium domain name: ${domainName}`,
        metadata: {
          domain: domainName,
          campaignId: campaignId,
          userId: userId,
          buyerEmail: buyerEmail,
          buyerName: buyerName
        }
      },
      {
        stripeAccount: sellerStripeAccountId // Create product in connected account
      }
    );

    console.log(`✅ Product created: ${product.id}`);

    // Create a price for the product
    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: amountInCents,
        currency: currency.toLowerCase(),
      },
      {
        stripeAccount: sellerStripeAccountId
      }
    );

    console.log(`✅ Price created: ${price.id}`);

    // Create payment link
    const paymentLink = await stripe.paymentLinks.create(
      {
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        metadata: {
          domain: domainName,
          campaignId: campaignId,
          userId: userId,
          buyerEmail: buyerEmail,
          buyerName: buyerName
        },
        after_completion: {
          type: 'hosted_confirmation',
          hosted_confirmation: {
            custom_message: `Thank you for purchasing ${domainName}! The seller will contact you shortly to complete the domain transfer.`
          }
        },
        // Application fee if you want to take a commission
        ...(applicationFeeAmount > 0 && {
          application_fee_amount: applicationFeeAmount
        })
      },
      {
        stripeAccount: sellerStripeAccountId
      }
    );

    console.log(`✅ Payment link created: ${paymentLink.id}`);
    console.log(`🔗 URL: ${paymentLink.url}`);

    // Store in database
    await query(
      `INSERT INTO stripe_payments 
        (payment_link_id, campaign_id, buyer_email, buyer_name, domain_name, amount, currency, status, payment_url, user_id, stripe_account_id, product_id, price_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        paymentLink.id,
        campaignId,
        buyerEmail,
        buyerName,
        domainName,
        amount,
        currency,
        paymentLink.url,
        userId,
        sellerStripeAccountId,
        product.id,
        price.id
      ]
    );

    console.log('✅ Payment link stored in database');

    return {
      success: true,
      paymentLinkId: paymentLink.id,
      paymentUrl: paymentLink.url,
      amount,
      currency,
      message: 'Stripe payment link created successfully'
    };
  } catch (error) {
    console.error('❌ Error creating payment link:', error.message);
    throw error;
  }
};

/**
 * Get user's Stripe configuration
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Stripe config
 */
const getUserStripeConfig = async (userId) => {
  try {
    const result = await query(
      `SELECT stripe_enabled, stripe_account_id
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        enabled: false,
        accountId: null
      };
    }

    const user = result.rows[0];
    return {
      enabled: user.stripe_enabled || false,
      accountId: user.stripe_account_id
    };
  } catch (error) {
    console.error('Error fetching Stripe config:', error);
    return {
      enabled: false,
      accountId: null
    };
  }
};

/**
 * Enable Stripe for user after successful onboarding
 * @param {String} userId - User ID
 * @param {String} accountId - Stripe account ID
 */
const enableStripeForUser = async (userId, accountId) => {
  console.log(`✅ Enabling Stripe for user ${userId}`);

  try {
    // Verify account is complete
    const status = await checkAccountStatus(accountId);

    if (!status.isComplete) {
      throw new Error('Stripe account onboarding is not complete');
    }

    await query(
      `UPDATE users 
       SET stripe_enabled = true,
           updated_at = NOW()
       WHERE id = $1 AND stripe_account_id = $2`,
      [userId, accountId]
    );

    console.log('✅ Stripe enabled for user');

    return {
      success: true,
      message: 'Stripe enabled successfully'
    };
  } catch (error) {
    console.error('❌ Error enabling Stripe:', error.message);
    throw error;
  }
};

/**
 * Disconnect Stripe account
 * @param {String} userId - User ID
 */
const disconnectStripeAccount = async (userId) => {
  console.log(`🔌 Disconnecting Stripe account for user ${userId}`);

  try {
    await query(
      `UPDATE users 
       SET stripe_enabled = false,
           stripe_account_id = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    console.log('✅ Stripe account disconnected');

    return {
      success: true,
      message: 'Stripe account disconnected successfully'
    };
  } catch (error) {
    console.error('❌ Error disconnecting Stripe:', error.message);
    throw error;
  }
};

/**
 * Get payment link status
 * @param {String} paymentLinkId - Payment link ID
 */
const getPaymentLinkStatus = async (paymentLinkId) => {
  try {
    const result = await query(
      `SELECT * FROM stripe_payments WHERE payment_link_id = $1`,
      [paymentLinkId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching payment link:', error);
    throw error;
  }
};

/**
 * Update payment status (called by webhooks)
 * @param {String} paymentIntentId - Payment intent ID
 * @param {String} status - Payment status
 */
const updatePaymentStatus = async (paymentIntentId, status) => {
  console.log(`📝 Updating payment ${paymentIntentId} to status: ${status}`);

  try {
    const result = await query(
      `UPDATE stripe_payments 
       SET status = $1, 
           payment_intent_id = $2,
           updated_at = NOW()
       WHERE payment_link_id IN (
         SELECT payment_link_id FROM stripe_payments 
         WHERE payment_intent_id = $2 OR id IN (
           SELECT id FROM stripe_payments WHERE payment_url LIKE '%' || $2 || '%'
         )
       )
       RETURNING *`,
      [status, paymentIntentId]
    );

    if (result.rows.length === 0) {
      console.warn(`⚠️  Payment ${paymentIntentId} not found`);
      return null;
    }

    console.log(`✅ Payment status updated to: ${status}`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating payment status:', error);
    throw error;
  }
};

/**
 * Get all payments for a campaign
 * @param {String} campaignId - Campaign ID
 */
const getCampaignPayments = async (campaignId) => {
  try {
    const result = await query(
      `SELECT * FROM stripe_payments 
       WHERE campaign_id = $1
       ORDER BY created_at DESC`,
      [campaignId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error fetching campaign payments:', error);
    throw error;
  }
};

module.exports = {
  createConnectAccount,
  refreshAccountLink,
  checkAccountStatus,
  createPaymentLink,
  getUserStripeConfig,
  enableStripeForUser,
  disconnectStripeAccount,
  getPaymentLinkStatus,
  updatePaymentStatus,
  getCampaignPayments
};

