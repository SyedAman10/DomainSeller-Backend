const { query } = require('../config/database');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Escrow Payment Service
 * Handles verification and transfer of funds after domain transfer confirmation
 */

/**
 * Create a new escrow transaction (payment to platform account)
 * @param {Object} params - Transaction parameters
 * @returns {Object} Payment link details
 */
const createEscrowPayment = async ({
  domainName,
  amount,
  currency = 'USD',
  buyerEmail,
  buyerName,
  campaignId,
  userId,
  sellerStripeAccountId
}) => {
  try {
    console.log('💰 Creating ESCROW payment (platform account)...');
    console.log(`   Domain: ${domainName}`);
    console.log(`   Amount: ${amount} ${currency}`);
    console.log(`   Buyer: ${buyerName} (${buyerEmail})`);
    
    const amountInCents = Math.round(amount * 100);

    // Calculate platform fee (10%)
    const platformFeePercent = 0.10;
    const platformFeeAmount = amount * platformFeePercent;
    const sellerPayoutAmount = amount - platformFeeAmount;

    console.log(`   Platform Fee (10%): $${platformFeeAmount.toFixed(2)}`);
    console.log(`   Seller Payout: $${sellerPayoutAmount.toFixed(2)}`);

    // Create product in YOUR platform account (not seller's)
    const product = await stripe.products.create({
      name: `Domain: ${domainName}`,
      description: `Purchase of domain ${domainName} via escrow`,
      metadata: {
        domain: domainName,
        campaignId: campaignId,
        userId: userId,
        buyerEmail: buyerEmail,
        buyerName: buyerName,
        sellerStripeAccountId: sellerStripeAccountId,
        escrow: 'true'
      }
    });

    console.log(`✅ Product created in platform account: ${product.id}`);

    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amountInCents,
      currency: currency.toLowerCase()
    });

    console.log(`✅ Price created: ${price.id}`);

    // Create payment link (money goes to YOUR account)
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price: price.id,
        quantity: 1
      }],
      metadata: {
        domain: domainName,
        campaignId: campaignId,
        userId: userId,
        buyerEmail: buyerEmail,
        buyerName: buyerName,
        sellerStripeAccountId: sellerStripeAccountId,
        platformFee: platformFeeAmount.toFixed(2),
        sellerPayout: sellerPayoutAmount.toFixed(2),
        escrow: 'true'
      },
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: `Thank you for purchasing ${domainName}! Your payment is being held securely. The domain transfer verification process has begun. You'll receive updates via email.`
        }
      }
    });

    console.log(`✅ Escrow payment link created: ${paymentLink.id}`);
    console.log(`🔗 URL: ${paymentLink.url}`);

    // Store in transactions table
    // Note: campaign_id might be a string (legacy) or integer, handle both
    const campaignIdInt = campaignId ? (typeof campaignId === 'string' ? null : parseInt(campaignId)) : null;
    
    const transactionResult = await query(
      `INSERT INTO transactions 
        (
          campaign_id, 
          buyer_email, 
          buyer_name, 
          domain_name, 
          amount, 
          currency,
          payment_status,
          verification_status,
          platform_fee_amount,
          seller_payout_amount,
          stripe_payment_link_id,
          stripe_product_id,
          stripe_price_id,
          seller_stripe_id,
          user_id,
          created_at,
          updated_at
        )
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'pending_payment', $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING id`,
      [
        campaignIdInt,
        buyerEmail,
        buyerName,
        domainName,
        amount,
        currency,
        platformFeeAmount,
        sellerPayoutAmount,
        paymentLink.id,
        product.id,
        price.id,
        sellerStripeAccountId,
        userId
      ]
    );

    const transactionId = transactionResult.rows[0].id;

    // Log in verification history
    await query(
      `INSERT INTO verification_history 
        (transaction_id, action, previous_status, new_status, notes, created_at)
       VALUES ($1, 'transaction_created', NULL, 'pending_payment', 'Escrow payment link created', NOW())`,
      [transactionId]
    );

    console.log(`✅ Transaction created with ID: ${transactionId}`);

    return {
      success: true,
      transactionId: transactionId,
      paymentLinkId: paymentLink.id,
      paymentUrl: paymentLink.url,
      amount,
      currency,
      platformFee: platformFeeAmount,
      sellerPayout: sellerPayoutAmount,
      message: 'Escrow payment link created successfully'
    };
  } catch (error) {
    console.error('❌ Error creating escrow payment:', error.message);
    throw error;
  }
};

/**
 * Mark transaction as payment received and awaiting verification
 * @param {String} paymentIntentId - Stripe payment intent ID
 * @returns {Object} Updated transaction
 */
const markPaymentReceived = async (paymentIntentId) => {
  try {
    console.log(`💰 Marking payment received: ${paymentIntentId}`);

    const result = await query(
      `UPDATE transactions 
       SET 
         payment_status = 'paid',
         verification_status = 'payment_received',
         stripe_payment_intent_id = $1,
         paid_at = NOW(),
         updated_at = NOW()
       WHERE stripe_payment_link_id = (
         SELECT payment_link FROM checkout_sessions WHERE payment_intent = $1 LIMIT 1
       ) OR stripe_payment_intent_id = $1
       RETURNING *`,
      [paymentIntentId]
    );

    if (result.rows.length === 0) {
      // Try to find by metadata
      console.log('⚠️ Transaction not found by payment_intent, trying by payment_link...');
      return null;
    }

    const transaction = result.rows[0];

    // Log in verification history
    await query(
      `INSERT INTO verification_history 
        (transaction_id, action, previous_status, new_status, notes, created_at)
       VALUES ($1, 'payment_received', 'pending_payment', 'payment_received', 'Payment completed, awaiting verification', NOW())`,
      [transaction.id]
    );

    // Create admin notification
    await query(
      `INSERT INTO admin_notifications 
        (type, title, message, transaction_id, priority, created_at)
       VALUES ('payment_received', 'New Payment Awaiting Verification', $1, $2, 'high', NOW())`,
      [
        `Payment of $${transaction.amount} received for ${transaction.domain_name}. Verification required before transferring funds to seller.`,
        transaction.id
      ]
    );

    console.log(`✅ Transaction ${transaction.id} marked as payment received`);
    console.log(`📋 Verification status: ${transaction.verification_status}`);

    return transaction;
  } catch (error) {
    console.error('❌ Error marking payment received:', error);
    throw error;
  }
};

/**
 * Verify domain transfer and transfer funds to seller
 * @param {Number} transactionId - Transaction ID
 * @param {Number} adminUserId - Admin user ID performing verification
 * @param {Boolean} verified - Whether domain was successfully transferred
 * @param {String} notes - Verification notes
 * @returns {Object} Result with transfer or refund details
 */
const verifyAndTransfer = async (transactionId, adminUserId, verified, notes = '') => {
  try {
    console.log(`🔍 Processing verification for transaction ${transactionId}...`);
    console.log(`   Verified: ${verified}`);
    console.log(`   Admin: ${adminUserId}`);

    // Get transaction details
    const txResult = await query(
      `SELECT * FROM transactions WHERE id = $1`,
      [transactionId]
    );

    if (txResult.rows.length === 0) {
      throw new Error('Transaction not found');
    }

    const transaction = txResult.rows[0];

    if (transaction.verification_status === 'verified' || transaction.verification_status === 'funds_transferred') {
      throw new Error('Transaction already verified and processed');
    }

    if (transaction.payment_status !== 'paid') {
      throw new Error('Payment has not been received yet');
    }

    if (verified) {
      // ✅ DOMAIN TRANSFER VERIFIED - Transfer funds to seller
      console.log(`✅ Domain transfer verified! Transferring funds to seller...`);

      const sellerPayoutCents = Math.round(transaction.seller_payout_amount * 100);

      // Create transfer to seller's connected account
      const transfer = await stripe.transfers.create({
        amount: sellerPayoutCents,
        currency: transaction.currency.toLowerCase(),
        destination: transaction.seller_stripe_id,
        description: `Domain sale: ${transaction.domain_name}`,
        metadata: {
          transaction_id: transactionId,
          domain_name: transaction.domain_name,
          buyer_email: transaction.buyer_email,
          platform_fee: transaction.platform_fee_amount
        },
        transfer_group: `escrow_tx_${transactionId}`
      });

      console.log(`✅ Transfer created: ${transfer.id}`);
      console.log(`   Amount: $${transaction.seller_payout_amount}`);
      console.log(`   Destination: ${transaction.seller_stripe_id}`);

      // Update transaction
      await query(
        `UPDATE transactions 
         SET 
           verification_status = 'verified',
           transfer_status = 'completed',
           transfer_id = $1,
           verified_at = NOW(),
           verified_by = $2,
           verification_notes = $3,
           verification_method = 'admin_manual',
           updated_at = NOW()
         WHERE id = $4`,
        [transfer.id, adminUserId, notes, transactionId]
      );

      // Log in verification history
      await query(
        `INSERT INTO verification_history 
          (transaction_id, action, previous_status, new_status, performed_by, notes, metadata, created_at)
         VALUES ($1, 'domain_verified_funds_transferred', $2, 'verified', $3, $4, $5, NOW())`,
        [
          transactionId,
          transaction.verification_status,
          adminUserId,
          notes,
          JSON.stringify({ transfer_id: transfer.id, amount: transaction.seller_payout_amount })
        ]
      );

      // Update admin notification
      await query(
        `UPDATE admin_notifications 
         SET is_read = true, read_at = NOW(), read_by = $1
         WHERE transaction_id = $2 AND type = 'payment_received'`,
        [adminUserId, transactionId]
      );

      // Create new notification
      await query(
        `INSERT INTO admin_notifications 
          (type, title, message, transaction_id, priority, created_at)
         VALUES ('funds_transferred', 'Funds Transferred to Seller', $1, $2, 'normal', NOW())`,
        [
          `Domain ${transaction.domain_name}: Verification complete. $${transaction.seller_payout_amount} transferred to seller.`,
          transactionId
        ]
      );

      console.log(`✅ Verification complete! Funds transferred to seller.`);

      return {
        success: true,
        action: 'transferred',
        transferId: transfer.id,
        amount: transaction.seller_payout_amount,
        sellerStripeId: transaction.seller_stripe_id,
        message: 'Domain transfer verified and funds transferred to seller'
      };

    } else {
      // ❌ DOMAIN TRANSFER FAILED - Refund buyer
      console.log(`❌ Domain transfer verification failed. Issuing refund...`);

      if (!transaction.stripe_payment_intent_id) {
        throw new Error('No payment intent ID found for refund');
      }

      // Create refund
      const refund = await stripe.refunds.create({
        payment_intent: transaction.stripe_payment_intent_id,
        reason: 'requested_by_customer',
        metadata: {
          transaction_id: transactionId,
          domain_name: transaction.domain_name,
          reason: notes || 'Domain transfer verification failed'
        }
      });

      console.log(`✅ Refund created: ${refund.id}`);
      console.log(`   Amount: $${transaction.amount}`);

      // Update transaction
      await query(
        `UPDATE transactions 
         SET 
           verification_status = 'verification_failed',
           payment_status = 'refunded',
           refund_id = $1,
           verified_at = NOW(),
           verified_by = $2,
           verification_notes = $3,
           verification_method = 'admin_manual',
           updated_at = NOW()
         WHERE id = $4`,
        [refund.id, adminUserId, notes, transactionId]
      );

      // Log in verification history
      await query(
        `INSERT INTO verification_history 
          (transaction_id, action, previous_status, new_status, performed_by, notes, metadata, created_at)
         VALUES ($1, 'verification_failed_refund_issued', $2, 'verification_failed', $3, $4, $5, NOW())`,
        [
          transactionId,
          transaction.verification_status,
          adminUserId,
          notes,
          JSON.stringify({ refund_id: refund.id, amount: transaction.amount })
        ]
      );

      // Update admin notification
      await query(
        `UPDATE admin_notifications 
         SET is_read = true, read_at = NOW(), read_by = $1
         WHERE transaction_id = $2 AND type = 'payment_received'`,
        [adminUserId, transactionId]
      );

      // Create new notification
      await query(
        `INSERT INTO admin_notifications 
          (type, title, message, transaction_id, priority, created_at)
         VALUES ('refund_issued', 'Refund Issued to Buyer', $1, $2, 'high', NOW())`,
        [
          `Domain ${transaction.domain_name}: Verification failed. $${transaction.amount} refunded to buyer.`,
          transactionId
        ]
      );

      console.log(`✅ Refund issued to buyer.`);

      return {
        success: true,
        action: 'refunded',
        refundId: refund.id,
        amount: transaction.amount,
        message: 'Domain transfer failed and buyer refunded'
      };
    }
  } catch (error) {
    console.error('❌ Error in verify and transfer:', error);
    throw error;
  }
};

/**
 * Buyer confirms domain received
 * @param {Number} transactionId - Transaction ID
 * @returns {Object} Updated transaction
 */
const buyerConfirmReceived = async (transactionId) => {
  try {
    console.log(`✅ Buyer confirming domain received for transaction ${transactionId}`);

    const result = await query(
      `UPDATE transactions 
       SET 
         buyer_confirmed = true,
         buyer_confirmed_at = NOW(),
         verification_status = 'buyer_confirmed',
         updated_at = NOW()
       WHERE id = $1 AND payment_status = 'paid'
       RETURNING *`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      throw new Error('Transaction not found or payment not completed');
    }

    const transaction = result.rows[0];

    // Log in verification history
    await query(
      `INSERT INTO verification_history 
        (transaction_id, action, previous_status, new_status, notes, created_at)
       VALUES ($1, 'buyer_confirmed', $2, 'buyer_confirmed', 'Buyer confirmed domain receipt', NOW())`,
      [transactionId, transaction.verification_status]
    );

    // Create admin notification for final verification
    await query(
      `INSERT INTO admin_notifications 
        (type, title, message, transaction_id, priority, created_at)
       VALUES ('buyer_confirmed', 'Buyer Confirmed Domain Receipt', $1, $2, 'high', NOW())`,
      [
        `Buyer confirmed receipt of ${transaction.domain_name}. Ready for final admin verification and fund transfer.`,
        transactionId
      ]
    );

    console.log(`✅ Buyer confirmation recorded`);

    return {
      success: true,
      transaction: transaction,
      message: 'Buyer confirmation recorded. Awaiting final admin verification.'
    };
  } catch (error) {
    console.error('❌ Error recording buyer confirmation:', error);
    throw error;
  }
};

/**
 * Get pending verifications for admin dashboard
 * @returns {Array} Pending transactions
 */
const getPendingVerifications = async () => {
  try {
    const result = await query(`
      SELECT 
        t.*,
        u.username as seller_username,
        u.email as seller_email,
        u.first_name as seller_first_name,
        c.campaign_name,
        (SELECT COUNT(*) FROM verification_history vh WHERE vh.transaction_id = t.id) as history_count
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN campaigns c ON t.campaign_id = c.campaign_id
      WHERE t.verification_status IN ('payment_received', 'buyer_confirmed')
        AND t.payment_status = 'paid'
      ORDER BY 
        CASE 
          WHEN t.buyer_confirmed = true THEN 1 
          ELSE 2 
        END,
        t.paid_at DESC
    `);

    return result.rows;
  } catch (error) {
    console.error('❌ Error getting pending verifications:', error);
    throw error;
  }
};

/**
 * Get transaction verification history
 * @param {Number} transactionId - Transaction ID
 * @returns {Array} History records
 */
const getVerificationHistory = async (transactionId) => {
  try {
    const result = await query(`
      SELECT 
        vh.*,
        u.username as performed_by_username
      FROM verification_history vh
      LEFT JOIN users u ON vh.performed_by = u.id
      WHERE vh.transaction_id = $1
      ORDER BY vh.created_at DESC
    `, [transactionId]);

    return result.rows;
  } catch (error) {
    console.error('❌ Error getting verification history:', error);
    throw error;
  }
};

module.exports = {
  createEscrowPayment,
  markPaymentReceived,
  verifyAndTransfer,
  buyerConfirmReceived,
  getPendingVerifications,
  getVerificationHistory
};
