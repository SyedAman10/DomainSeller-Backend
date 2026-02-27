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

    console.log(`   Platform Fee (5%): $${platformFeeAmount.toFixed(2)}`);
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

    // Try to find transaction by payment_intent_id first
    const result = await query(
      `UPDATE transactions 
       SET 
         payment_status = 'paid',
         verification_status = 'payment_received',
         stripe_payment_intent_id = $1,
         paid_at = NOW(),
         updated_at = NOW()
       WHERE stripe_payment_intent_id = $1 OR id = (
         SELECT id FROM transactions 
         WHERE stripe_payment_link_id IS NOT NULL 
         AND stripe_payment_intent_id IS NULL
         ORDER BY created_at DESC 
         LIMIT 1
       )
       RETURNING *`,
      [paymentIntentId]
    );

    if (result.rows.length === 0) {
      console.log(`📝 Note: Payment ${paymentIntentId} not found in escrow transactions table (this is normal for non-escrow payments)`);
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

      let transfer;
      
      // Check if we're in test mode and should simulate the transfer
      const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('_test_');
      const skipTransferInTest = process.env.SKIP_STRIPE_TRANSFER_IN_TEST === 'true';
      
      if (isTestMode && skipTransferInTest) {
        console.log('⚠️  TEST MODE: Simulating transfer (SKIP_STRIPE_TRANSFER_IN_TEST=true)');
        console.log(`   Would transfer: $${transaction.seller_payout_amount} to ${transaction.seller_stripe_id}`);
        
        // Simulate a successful transfer
        transfer = {
          id: `simulated_tr_${Date.now()}`,
          amount: sellerPayoutCents,
          currency: transaction.currency.toLowerCase(),
          destination: transaction.seller_stripe_id,
          object: 'transfer',
          created: Math.floor(Date.now() / 1000),
          description: `[SIMULATED] Domain sale: ${transaction.domain_name}`,
          metadata: {
            transaction_id: transactionId,
            domain_name: transaction.domain_name,
            buyer_email: transaction.buyer_email,
            platform_fee: transaction.platform_fee_amount,
            simulated: true
          }
        };
        
        console.log(`✅ Transfer simulated: ${transfer.id}`);
      } else {
        // Real transfer
        try {
          // Create transfer to seller's connected account
          transfer = await stripe.transfers.create({
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
        } catch (stripeError) {
          if (stripeError.code === 'balance_insufficient') {
            console.error('❌ INSUFFICIENT BALANCE IN TEST MODE');
            console.log('\n💡 TEST MODE SOLUTION:');
            console.log('   Option 1: Add SKIP_STRIPE_TRANSFER_IN_TEST=true to .env to simulate transfers');
            console.log('   Option 2: Add funds using test card 4000000000000077\n');
            console.log('   Steps for Option 2:');
            console.log('   1. Go to: https://dashboard.stripe.com/test/payments');
            console.log('   2. Create a payment with card 4000000000000077');
            console.log('   3. Amount: At least $' + transaction.seller_payout_amount);
            console.log('   4. Try verification again after payment completes\n');
            
            // Update transaction to indicate manual action needed
            await query(
              `UPDATE transactions 
               SET 
                 verification_status = 'pending_manual_transfer',
                 verification_notes = $1,
                 verified_at = NOW(),
                 verified_by = $2,
                 updated_at = NOW()
               WHERE id = $3`,
              [
                `${notes}\n\n[ADMIN ACTION REQUIRED] Insufficient balance in Stripe test mode. Either add SKIP_STRIPE_TRANSFER_IN_TEST=true to .env or add test funds using card 4000000000000077.`,
                adminUserId,
                transactionId
              ]
            );

            // Log in history
            await query(
              `INSERT INTO verification_history 
                (transaction_id, action, previous_status, new_status, performed_by, notes, created_at)
               VALUES ($1, 'verification_approved_pending_transfer', $2, 'pending_manual_transfer', $3, $4, NOW())`,
              [
                transactionId,
                transaction.verification_status,
                adminUserId,
                'Verification approved but transfer failed due to insufficient test mode balance. Set SKIP_STRIPE_TRANSFER_IN_TEST=true or add test funds.'
              ]
            );

            throw new Error(
              'Test mode: Insufficient balance. Add SKIP_STRIPE_TRANSFER_IN_TEST=true to .env or use test card 4000000000000077.'
            );
          }

          // Re-throw other errors
          throw stripeError;
        }
      }
      
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

      // Send notifications to buyer and seller
      try {
        const { sendEmail } = require('./emailService');

        const sellerResult = await query(
          `SELECT email, first_name, username 
           FROM users 
           WHERE id = $1`,
          [transaction.user_id]
        );

        const seller = sellerResult.rows[0] || {};
        const sellerName = seller.first_name || seller.username || 'Seller';

        if (seller.email) {
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
                  The domain transfer for <strong>${transaction.domain_name}</strong> has been verified, 
                  and your payout has been transferred to your Stripe account.
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
                      <td style="padding:10px 0;color:#64748b;font-size:12px;text-align:right;">${transfer.id}</td>
                    </tr>
                  </table>
                </div>
                
                <div style="background:#eff6ff;border-radius:12px;padding:20px;margin:25px 0;">
                  <p style="margin:0;color:#1e40af;font-size:14px;">
                    💡 <strong>Funds will appear in your Stripe balance within 1-2 business days.</strong>
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
            subject: `💸 Funds Transferred: $${transaction.seller_payout_amount} for ${transaction.domain_name}`,
            html: sellerEmailHtml,
            text: `Funds Transferred!\n\nHi ${sellerName},\n\nThe domain transfer for ${transaction.domain_name} has been verified, and $${transaction.seller_payout_amount} has been transferred to your Stripe account.\n\nTotal Sale: $${transaction.amount}\nPlatform Fee: $${transaction.platform_fee_amount}\nYour Payout: $${transaction.seller_payout_amount}\n\nFunds will appear in your Stripe balance within 1-2 business days.`,
            tags: ['funds-transferred', 'seller-notification', `transaction-${transactionId}`]
          });
        }

        if (transaction.buyer_email) {
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
                  has been verified and completed.
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
            text: `Transfer Complete!\n\nHi ${transaction.buyer_name},\n\nThe domain transfer for ${transaction.domain_name} has been verified and completed. You now own the domain!\n\nThank you for your purchase!`,
            tags: ['transfer-complete', 'buyer-notification', `transaction-${transactionId}`]
          });
        }
      } catch (notifyError) {
        console.error('❌ Failed to send transfer notification emails:', notifyError.message);
      }

      // ✅ MARK DOMAIN AS SOLD AND PAUSE CAMPAIGNS
      console.log(`📋 Marking domain ${transaction.domain_name} as sold...`);
      
      // Pause all campaigns for this domain
      const pausedCampaigns = await query(
        `UPDATE campaigns 
         SET 
           status = 'paused',
           paused_at = NOW(),
           paused_reason = 'Domain sold via escrow transaction',
           updated_at = NOW()
         WHERE domain_name = $1 AND status != 'paused'
         RETURNING campaign_id, campaign_name`,
        [transaction.domain_name]
      );

      if (pausedCampaigns.rows.length > 0) {
        console.log(`✅ Paused ${pausedCampaigns.rows.length} campaign(s) for ${transaction.domain_name}`);
        pausedCampaigns.rows.forEach(campaign => {
          console.log(`   - ${campaign.campaign_name} (${campaign.campaign_id})`);
        });
      }

      // Mark domain as sold (if you have a domains table)
      // If not, you can use the campaign status as the source of truth
      try {
        await query(
          `UPDATE campaigns 
           SET 
             sold = true,
             sold_at = NOW(),
             sold_price = $1,
             sold_transaction_id = $2
           WHERE domain_name = $3`,
          [transaction.amount, transactionId, transaction.domain_name]
        );
        console.log(`✅ Domain ${transaction.domain_name} marked as SOLD`);
      } catch (err) {
        // Columns might not exist yet, that's okay
        console.log(`⚠️ Could not mark as sold (columns may need to be added): ${err.message}`);
      }

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
      LEFT JOIN campaigns c ON c.id = t.campaign_id
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
