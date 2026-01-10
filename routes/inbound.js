const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { generateAIResponse, analyzeBuyerIntent } = require('../services/aiAgent');
const { sendEmail } = require('../services/emailService');
const { 
  notifyNewReply, 
  notifyAutoResponse, 
  notifyManualSend 
} = require('../services/notificationService');
const { createEscrowTransaction } = require('../services/escrowService');

/**
 * GET /api/inbound/mailgun
 * Test endpoint - Mailgun webhook should use POST, but this allows browser testing
 */
router.get('/mailgun', (req, res) => {
  console.log('ℹ️  GET request received at /inbound/mailgun');
  console.log('   This is a test endpoint. Mailgun webhooks use POST.');
  
  res.status(200).json({
    success: true,
    message: 'Mailgun webhook endpoint is active',
    note: 'This endpoint accepts POST requests from Mailgun',
    instructions: {
      mailgunRoute: 'Configure in Mailgun Dashboard > Receiving > Routes',
      expression: 'match_recipient("admin@mail.3vltn.com") OR match_recipient("info@mail.3vltn.com")',
      forwardTo: `${req.protocol}://${req.get('host')}/inbound/mailgun`,
      method: 'POST (not GET)',
      testCommand: `curl -X POST ${req.protocol}://${req.get('host')}/inbound/mailgun -d "sender=test@example.com" -d "recipient=admin@mail.3vltn.com" -d "subject=Test" -d "body-plain=Test message"`
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/inbound/mailgun
 * Webhook for receiving inbound emails from Mailgun
 */
router.post('/mailgun', async (req, res) => {
  const startTime = Date.now(); // Track processing time
  
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📨 INBOUND EMAIL RECEIVED FROM MAILGUN WEBHOOK');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log(`🌐 Request Method: ${req.method}`);
  console.log(`📡 Request Path: ${req.path}`);
  console.log(`🔗 Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  console.log(`📋 Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`📦 Body Keys:`, Object.keys(req.body));
  console.log('════════════════════════════════════════════════════════════');

  try {
    const {
      sender,
      recipient,
      subject,
      'body-plain': bodyText,
      'body-html': bodyHtml,
      'stripped-text': strippedText,
      'In-Reply-To': inReplyTo,
      'References': references
    } = req.body;

    console.log(`📧 From: ${sender}`);
    console.log(`📬 To: ${recipient}`);
    console.log(`📝 Subject: ${subject}`);
    console.log(`💬 Message: ${(strippedText || bodyText || '').substring(0, 100)}...`);
    console.log(`🔑 In-Reply-To: ${inReplyTo || 'N/A'}`);
    console.log(`🔗 References: ${references || 'N/A'}`);

    // Extract buyer email
    const buyerEmail = sender;
    const buyerName = sender.split('@')[0].split('<')[0].trim() || 'there';
    
    console.log(`👤 Extracted Buyer: ${buyerName} <${buyerEmail}>`);

    // Find the campaign this is replying to
    console.log('🔍 Looking for related campaign in database...');
    console.log(`   Searching sent_emails and scheduled_emails for: ${buyerEmail}`);
    
    // Try to find campaign by checking sent_emails or scheduled_emails
    const campaignLookup = await query(
      `SELECT DISTINCT 
        c.id,
        c.campaign_id,
        c.campaign_name,
        c.domain_name,
        c.email_tone,
        c.user_id,
        c.created_at,
        c.auto_response_enabled,
        c.notification_email,
        c.minimum_price,
        c.asking_price,
        c.escrow_enabled,
        c.escrow_fee_payer,
        c.negotiation_strategy,
        c.response_style,
        c.response_length,
        c.custom_instructions,
        c.highlight_features,
        d.value as domain_value
       FROM campaigns c
       LEFT JOIN sent_emails se ON se.campaign_id = c.campaign_id
       LEFT JOIN scheduled_emails sch ON sch.campaign_id = c.campaign_id
       LEFT JOIN domains d ON d.name = c.domain_name
       WHERE se.buyer_email = $1 OR sch.buyer_email = $1
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [buyerEmail]
    );

    if (campaignLookup.rows.length === 0) {
      console.log('⚠️  No campaign found for this buyer');
      console.log('   This could mean:');
      console.log('   1. No email was sent to this buyer yet');
      console.log('   2. Buyer email does not match what was sent');
      console.log('   3. Campaign was deleted');
      console.log('\n   💡 TIP: Check sent_emails table for this buyer email');
      
      return res.status(200).json({
        success: true,
        message: 'Email received but no campaign found',
        buyerEmail: buyerEmail,
        debug: {
          searchedFor: buyerEmail,
          timestamp: new Date().toISOString()
        }
      });
    }

    const campaign = campaignLookup.rows[0];
    console.log(`✅ Found Campaign: ${campaign.campaign_name}`);
    console.log(`   Campaign ID: ${campaign.campaign_id}`);
    console.log(`   Domain: ${campaign.domain_name}`);
    console.log(`   User ID: ${campaign.user_id}`);
    console.log(`   Auto-Response: ${campaign.auto_response_enabled !== false ? 'ENABLED ✅' : 'DISABLED ❌'}`);
    console.log(`   Notification Email: ${campaign.notification_email || 'Not set'}`);

    // Store the inbound message
    const messageContent = strippedText || bodyText || 'No message content';
    
    await query(
      `INSERT INTO email_conversations 
        (campaign_id, buyer_email, buyer_name, direction, subject, message_content, received_at, user_id, domain_name)
       VALUES ($1, $2, $3, 'inbound', $4, $5, NOW(), $6, $7)
       RETURNING id`,
      [
        campaign.campaign_id,
        buyerEmail,
        buyerName,
        subject,
        messageContent,
        campaign.user_id,
        campaign.domain_name
      ]
    );

    console.log('💾 Stored inbound message in database');

    // 🛑 FREEZE ALL SCHEDULED EMAILS FOR THIS BUYER
    console.log('🛑 Buyer replied - freezing all scheduled emails...');
    
    const frozenResult = await query(
      `UPDATE scheduled_emails 
       SET status = 'paused' 
       WHERE campaign_id = $1 
         AND buyer_email = $2 
         AND status = 'pending'
       RETURNING id, email_subject, scheduled_for`,
      [campaign.campaign_id, buyerEmail]
    );

    if (frozenResult.rows.length > 0) {
      console.log(`   ❄️  Paused ${frozenResult.rows.length} scheduled email(s)`);
      frozenResult.rows.forEach(email => {
        console.log(`      - "${email.email_subject}" (was scheduled for ${email.scheduled_for})`);
      });
    } else {
      console.log('   ℹ️  No scheduled emails to pause');
    }

    // Analyze buyer intent
    const intent = analyzeBuyerIntent(messageContent);
    console.log('🔍 Buyer Intent Analysis:');
    console.log(`   Sentiment: ${intent.sentiment}`);
    console.log(`   Interested: ${intent.isInterested}`);
    console.log(`   Price Objection: ${intent.isPriceObjection}`);
    console.log(`   Ready to Buy: ${intent.isReady}`);
    console.log(`   Wants Payment Link: ${intent.wantsPaymentLink}`);
    console.log(`   Not Interested: ${intent.isNotInterested}`);

    // If buyer is not interested, don't reply
    if (intent.isNotInterested) {
      console.log('🛑 Buyer is not interested - skipping AI response');
      return res.status(200).json({
        success: true,
        message: 'Buyer not interested - no reply sent'
      });
    }

    // Get user information for signature
    console.log(`🔍 Fetching user info for user_id: ${campaign.user_id}...`);
    
    let sellerName = 'Domain Seller';
    let sellerEmail = '';
    
    try {
      const userInfo = await query(
        'SELECT username, email, first_name, last_name FROM users WHERE id = $1',
        [campaign.user_id]
      );

      console.log(`   Query returned ${userInfo.rows.length} row(s)`);
      
      if (userInfo.rows.length > 0) {
        console.log(`   Raw user data:`, JSON.stringify(userInfo.rows[0], null, 2));
        
        const user = userInfo.rows[0];
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        // Priority: full name (first + last), then username, then fallback
        sellerName = fullName || user.username || 'Domain Seller';
        sellerEmail = user.email || '';
        
        console.log(`✅ User found: ${sellerName} (${sellerEmail})`);
      } else {
        console.warn(`⚠️  No user found with ID: ${campaign.user_id}`);
        console.warn(`   Using fallback: ${sellerName}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching user info:`, error.message);
      console.log(`   Using fallback: ${sellerName}`);
    }

    console.log(`👤 Final Seller Info: ${sellerName} (${sellerEmail})`);

    // Get conversation history
    const history = await query(
      `SELECT direction, message_content, received_at
       FROM email_conversations
       WHERE campaign_id = $1 AND buyer_email = $2
       ORDER BY received_at ASC
       LIMIT 10`,
      [campaign.campaign_id, buyerEmail]
    );

    const conversationHistory = history.rows.map(msg => ({
      role: msg.direction === 'inbound' ? 'buyer' : 'seller',
      content: msg.message_content,
      timestamp: msg.received_at
    }));

    // Generate AI response
    console.log('🤖 Generating AI response...');
    console.log(`   Model: ${process.env.AI_MODEL || 'gpt-4o-mini'}`);
    console.log(`   OpenAI Key: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ MISSING'}`);
    console.log(`   Response Style: ${campaign.response_style || 'professional'}`);
    console.log(`   Response Length: ${campaign.response_length || 'medium'}`);
    
    const aiResponse = await generateAIResponse({
      buyerMessage: messageContent,
      domainName: campaign.domain_name,
      buyerName: buyerName,
      sellerName: sellerName,
      sellerEmail: sellerEmail,
      conversationHistory: conversationHistory,
      campaignInfo: {
        emailTone: campaign.email_tone,
        minimumPrice: campaign.minimum_price,
        negotiationStrategy: campaign.negotiation_strategy,
        responseStyle: campaign.response_style,
        responseLength: campaign.response_length,
        customInstructions: campaign.custom_instructions,
        highlightFeatures: campaign.highlight_features
      }
    });

    if (!aiResponse.success) {
      console.warn('⚠️  AI generation failed, using fallback response');
      console.warn(`   Error: ${aiResponse.error || 'Unknown error'}`);
    } else {
      console.log('✅ AI Response Generated Successfully');
      console.log(`   Length: ${aiResponse.reply.length} characters`);
      console.log(`   Tokens Used: ${aiResponse.tokensUsed || 'N/A'}`);
      console.log(`   Preview: ${aiResponse.reply.substring(0, 100)}...`);
    }

    let responseText = aiResponse.reply;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STRIPE INTEGRATION - Require admin approval before sending payment link
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let requiresApproval = false;
    let approvalMessage = '';
    let hasPriceNegotiation = false;
    let negotiatedPrice = null;
    
    // Get campaign pricing info
    const askingPrice = campaign.asking_price || campaign.minimum_price || campaign.domain_value;
    
    // Check if buyer made a counter-offer (price mentioned but different from asking)
    if (intent.hasPriceOffer && intent.offeredPrice && askingPrice) {
      if (intent.offeredPrice < askingPrice) {
        console.log(`💰 PRICE NEGOTIATION DETECTED!`);
        console.log(`   Asking Price: $${askingPrice}`);
        console.log(`   Buyer's Offer: $${intent.offeredPrice}`);
        console.log(`   Difference: -$${askingPrice - intent.offeredPrice} (${Math.round((1 - intent.offeredPrice/askingPrice) * 100)}% discount)`);
        
        hasPriceNegotiation = true;
        negotiatedPrice = intent.offeredPrice;
        requiresApproval = true;
      }
    }
    
    if (intent.wantsPaymentLink || intent.isReady) {
      console.log('💰 Buyer wants payment link - ADMIN APPROVAL REQUIRED');
      
      requiresApproval = true;
      
      // Add approval message to response
      approvalMessage = `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⏳ **PAYMENT LINK PENDING**\n\n` +
        `Thank you for your interest! I'm preparing your secure payment link. ` +
        `You'll receive it within a few hours. If you have any questions in the meantime, feel free to ask!\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      
      responseText += approvalMessage;
      console.log('⏳ Stripe payment link requires admin approval - not generating yet');
      
      // Store approval request
      try {
        // Get campaign pricing info (askingPrice already defined above)
        
        if (askingPrice) {
          // Store pending approval in database
          const approvalResult = await query(
            `INSERT INTO stripe_approvals 
              (campaign_id, buyer_email, buyer_name, domain_name, amount, currency, seller_email, seller_name, status, user_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, NOW())
             RETURNING id`,
            [
              campaign.campaign_id,
              buyerEmail,
              buyerName,
              campaign.domain_name,
              askingPrice,
              'USD',
              sellerEmail,
              sellerName,
              campaign.user_id
            ]
          );
          
          const approvalId = approvalResult.rows[0].id;
          console.log(`✅ Stripe approval request stored (ID: ${approvalId})`);
          
          // Store approval ID for notification
          intent.approvalId = approvalId;
        } else {
          console.warn('⚠️  No pricing info available');
        }
      } catch (error) {
        console.error('❌ Error storing Stripe approval:', error);
      }
    }

    const autoResponseEnabled = campaign.auto_response_enabled !== false; // Default to true if null
    
    // Use notification_email if set, otherwise use seller's email (campaign owner)
    const notificationEmail = campaign.notification_email || sellerEmail;

    console.log(`⚙️  Auto-response: ${autoResponseEnabled ? 'ON' : 'OFF'}`);
    console.log(`📧 Admin notification email: ${notificationEmail}`);
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MODE 1: AUTO-RESPONSE ENABLED (Send immediately)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (autoResponseEnabled) {
      console.log('🚀 AUTO-RESPONSE MODE: Sending reply immediately...');
      
      // Store the AI response
      await query(
        `INSERT INTO email_conversations 
          (campaign_id, buyer_email, buyer_name, direction, subject, message_content, received_at, user_id, domain_name, ai_generated)
         VALUES ($1, $2, $3, 'outbound', $4, $5, NOW(), $6, $7, true)`,
        [
          campaign.campaign_id,
          buyerEmail,
          buyerName,
          `Re: ${subject}`,
          responseText,
          campaign.user_id,
          campaign.domain_name
        ]
      );

      console.log('💾 Stored AI response in database');

      // Send the AI response via email
      console.log('📤 Sending AI-generated response...');
      
      await sendEmail({
        to: buyerEmail,
        subject: `Re: ${subject}`,
        html: responseText.replace(/\n/g, '<br>'),
        text: responseText,
        tags: [`campaign-${campaign.campaign_id}`, 'ai-reply', 'inbound-response']
      });

      console.log('✅ AI response sent successfully!');
      console.log('\n📊 PROCESSING SUMMARY:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Inbound email stored in database`);
      console.log(`✅ ${frozenResult.rows.length} scheduled emails paused`);
      console.log(`✅ AI response generated (${aiResponse.reply.length} chars)`);
      console.log(`✅ AI response sent to buyer: ${buyerEmail}`);
      console.log(`✅ Admin notification sent to: ${notificationEmail}`);
      console.log(`📧 Campaign: ${campaign.campaign_name}`);
      console.log(`🌐 Domain: ${campaign.domain_name}`);
      console.log(`👤 Buyer: ${buyerName} <${buyerEmail}>`);
      console.log(`⏰ Processed in: ${Date.now() - startTime}ms`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // ALWAYS send notification to admin with full conversation thread
      if (notificationEmail) {
        console.log(`📧 Sending FULL THREAD notification to admin ${notificationEmail}...`);
        
        // Get full conversation history
        const fullThread = await query(
          `SELECT direction, message_content, received_at, ai_generated
           FROM email_conversations
           WHERE campaign_id = $1 AND buyer_email = $2
           ORDER BY received_at ASC`,
          [campaign.campaign_id, buyerEmail]
        );
        
        await notifyAutoResponse({
          notificationEmail,
          campaignName: campaign.campaign_name,
          domainName: campaign.domain_name,
          buyerEmail,
          buyerName,
          buyerMessage: messageContent,
          aiResponse: responseText,
          campaignId: campaign.campaign_id,
          conversationThread: fullThread.rows,
          requiresApproval: requiresApproval,
          askingPrice: askingPrice,
          approvalId: intent.approvalId || null,
          hasPriceNegotiation: hasPriceNegotiation,
          negotiatedPrice: negotiatedPrice,
          userId: campaign.user_id
        });
        console.log('✅ Admin notification with full thread sent!');
      } else {
        console.warn('⚠️  No notification email configured - admin won\'t be notified!');
      }

      console.log('════════════════════════════════════════════════════════════\n');

      return res.status(200).json({
        success: true,
        message: 'Email processed and AI response sent',
        campaign: campaign.campaign_name,
        domain: campaign.domain_name,
        mode: 'auto',
        responseSent: true,
        notificationSent: !!notificationEmail,
        intent: intent
      });
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MODE 2: AUTO-RESPONSE DISABLED (Draft for review)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    else {
      console.log('📝 MANUAL-REVIEW MODE: Creating draft for review...');
      
      // Store as draft response
      const draftResult = await query(
        `INSERT INTO draft_responses 
          (campaign_id, buyer_email, buyer_name, inbound_message, suggested_response, subject, status, user_id, domain_name)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
         RETURNING id`,
        [
          campaign.campaign_id,
          buyerEmail,
          buyerName,
          messageContent,
          responseText,
          `Re: ${subject}`,
          campaign.user_id,
          campaign.domain_name
        ]
      );

      const draftId = draftResult.rows[0].id;
      console.log(`💾 Draft created with ID: ${draftId}`);

      // Send notification to user for manual review
      if (notificationEmail) {
        console.log(`📧 Sending review notification to ${notificationEmail}...`);
        await notifyNewReply({
          notificationEmail,
          campaignName: campaign.campaign_name,
          domainName: campaign.domain_name,
          buyerEmail,
          buyerMessage: messageContent,
          suggestedResponse: responseText,
          draftId,
          campaignId: campaign.campaign_id
        });
        console.log('✅ Review notification sent!');
      } else {
        console.log('⚠️  No notification email configured - user won\'t be notified');
      }

      console.log('════════════════════════════════════════════════════════════\n');

      return res.status(200).json({
        success: true,
        message: 'Draft response created for manual review',
        campaign: campaign.campaign_name,
        domain: campaign.domain_name,
        mode: 'manual',
        draftId,
        notificationSent: !!notificationEmail,
        requiresReview: true,
        intent: intent
      });
    }

  } catch (error) {
    console.error('❌ Error processing inbound email:', error);
    console.error('Stack:', error.stack);
    console.log('════════════════════════════════════════════════════════════\n');
    
    res.status(200).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/inbound/thread/:campaignId/:buyerEmail
 * Get email thread/conversation for a specific buyer in a campaign
 */
router.get('/thread/:campaignId/:buyerEmail', async (req, res) => {
  console.log('💬 Fetching email thread...');
  
  try {
    const { campaignId, buyerEmail } = req.params;

    // Get campaign info
    const campaign = await query(
      'SELECT * FROM campaigns WHERE campaign_id = $1 OR id = $2',
      [campaignId, parseInt(campaignId) || 0]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const actualCampaignId = campaign.rows[0].campaign_id;

    // Get all messages in the conversation
    const messages = await query(
      `SELECT 
        id,
        direction,
        subject,
        message_content,
        received_at,
        ai_generated,
        buyer_name
       FROM email_conversations
       WHERE campaign_id = $1 AND buyer_email = $2
       ORDER BY received_at ASC`,
      [actualCampaignId, buyerEmail]
    );

    // Format as thread
    const thread = messages.rows.map((msg, index) => ({
      id: msg.id,
      index: index + 1,
      from: msg.direction === 'inbound' ? msg.buyer_name || buyerEmail : 'You (AI Agent)',
      to: msg.direction === 'inbound' ? 'You' : msg.buyer_name || buyerEmail,
      direction: msg.direction,
      subject: msg.subject,
      message: msg.message_content,
      timestamp: msg.received_at,
      isAiGenerated: msg.ai_generated || false,
      timeAgo: getTimeAgo(msg.received_at)
    }));

    res.json({
      success: true,
      campaign: {
        id: campaign.rows[0].id,
        campaign_id: campaign.rows[0].campaign_id,
        campaign_name: campaign.rows[0].campaign_name,
        domain_name: campaign.rows[0].domain_name
      },
      buyer: {
        email: buyerEmail,
        name: messages.rows[0]?.buyer_name || buyerEmail.split('@')[0]
      },
      thread: thread,
      messageCount: thread.length,
      latestMessage: thread[thread.length - 1] || null
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email thread',
      message: error.message
    });
  }
});

/**
 * GET /api/inbound/threads/:campaignId
 * Get all email threads for a campaign (grouped by buyer)
 */
router.get('/threads/:campaignId', async (req, res) => {
  console.log('💬 Fetching all email threads for campaign...');
  
  try {
    const { campaignId } = req.params;

    // Get campaign info
    const campaign = await query(
      'SELECT * FROM campaigns WHERE campaign_id = $1 OR id = $2',
      [campaignId, parseInt(campaignId) || 0]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const actualCampaignId = campaign.rows[0].campaign_id;

    // Get all threads grouped by buyer
    const threads = await query(
      `SELECT 
        buyer_email,
        buyer_name,
        COUNT(*) as message_count,
        MAX(received_at) as last_message_at,
        COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as buyer_messages,
        COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as your_messages,
        COUNT(CASE WHEN ai_generated = true THEN 1 END) as ai_messages
       FROM email_conversations
       WHERE campaign_id = $1
       GROUP BY buyer_email, buyer_name
       ORDER BY last_message_at DESC`,
      [actualCampaignId]
    );

    const threadsList = threads.rows.map(thread => ({
      buyerEmail: thread.buyer_email,
      buyerName: thread.buyer_name || thread.buyer_email.split('@')[0],
      messageCount: parseInt(thread.message_count),
      buyerMessages: parseInt(thread.buyer_messages),
      yourMessages: parseInt(thread.your_messages),
      aiMessages: parseInt(thread.ai_messages),
      lastMessageAt: thread.last_message_at,
      timeAgo: getTimeAgo(thread.last_message_at)
    }));

    res.json({
      success: true,
      campaign: {
        id: campaign.rows[0].id,
        campaign_id: campaign.rows[0].campaign_id,
        campaign_name: campaign.rows[0].campaign_name,
        domain_name: campaign.rows[0].domain_name
      },
      threads: threadsList,
      totalThreads: threadsList.length
    });
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email threads',
      message: error.message
    });
  }
});

// Helper function to calculate time ago
function getTimeAgo(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now - then) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return then.toLocaleDateString();
}

/**
 * GET /api/inbound/paused/:campaignId
 * Get all paused emails for a campaign
 */
router.get('/paused/:campaignId', async (req, res) => {
  console.log('⏸️  Fetching paused emails...');
  
  try {
    const { campaignId } = req.params;

    const campaign = await query(
      'SELECT * FROM campaigns WHERE campaign_id = $1 OR id = $2',
      [campaignId, parseInt(campaignId) || 0]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const actualCampaignId = campaign.rows[0].campaign_id;

    const pausedEmails = await query(
      `SELECT * FROM scheduled_emails 
       WHERE campaign_id = $1 AND status = 'paused'
       ORDER BY scheduled_for ASC`,
      [actualCampaignId]
    );

    res.json({
      success: true,
      campaign: {
        id: campaign.rows[0].id,
        campaign_id: campaign.rows[0].campaign_id,
        campaign_name: campaign.rows[0].campaign_name
      },
      pausedEmails: pausedEmails.rows,
      count: pausedEmails.rows.length
    });
  } catch (error) {
    console.error('Error fetching paused emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch paused emails',
      message: error.message
    });
  }
});

/**
 * POST /api/inbound/resume/:emailId
 * Resume a paused email (change status back to pending)
 */
router.post('/resume/:emailId', async (req, res) => {
  console.log('▶️  Resuming paused email...');
  
  try {
    const { emailId } = req.params;

    const result = await query(
      `UPDATE scheduled_emails 
       SET status = 'pending' 
       WHERE id = $1 AND status = 'paused'
       RETURNING *`,
      [emailId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Paused email not found'
      });
    }

    console.log(`✅ Email resumed: "${result.rows[0].email_subject}"`);

    res.json({
      success: true,
      message: 'Email resumed successfully',
      email: result.rows[0]
    });
  } catch (error) {
    console.error('Error resuming email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume email',
      message: error.message
    });
  }
});

/**
 * POST /api/inbound/resume-all/:campaignId/:buyerEmail
 * Resume all paused emails for a specific buyer
 */
router.post('/resume-all/:campaignId/:buyerEmail', async (req, res) => {
  console.log('▶️  Resuming all paused emails for buyer...');
  
  try {
    const { campaignId, buyerEmail } = req.params;

    const campaign = await query(
      'SELECT * FROM campaigns WHERE campaign_id = $1 OR id = $2',
      [campaignId, parseInt(campaignId) || 0]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const actualCampaignId = campaign.rows[0].campaign_id;

    const result = await query(
      `UPDATE scheduled_emails 
       SET status = 'pending' 
       WHERE campaign_id = $1 
         AND buyer_email = $2 
         AND status = 'paused'
       RETURNING *`,
      [actualCampaignId, buyerEmail]
    );

    console.log(`✅ Resumed ${result.rows.length} email(s) for ${buyerEmail}`);

    res.json({
      success: true,
      message: `Resumed ${result.rows.length} email(s)`,
      resumedCount: result.rows.length,
      emails: result.rows
    });
  } catch (error) {
    console.error('Error resuming emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume emails',
      message: error.message
    });
  }
});

/**
 * GET /api/inbound/conversations/:campaignId
 * Get conversation history for a campaign
 */
router.get('/conversations/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const conversations = await query(
      `SELECT 
        ec.*,
        c.campaign_name,
        c.domain_name
       FROM email_conversations ec
       JOIN campaigns c ON ec.campaign_id = c.campaign_id
       WHERE ec.campaign_id = $1
       ORDER BY ec.received_at DESC`,
      [campaignId]
    );

    res.json({
      success: true,
      count: conversations.rows.length,
      conversations: conversations.rows
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/inbound/conversations/buyer/:buyerEmail
 * Get conversation history for a specific buyer
 */
router.get('/conversations/buyer/:buyerEmail', async (req, res) => {
  try {
    const { buyerEmail } = req.params;

    const conversations = await query(
      `SELECT 
        ec.*,
        c.campaign_name,
        c.domain_name
       FROM email_conversations ec
       JOIN campaigns c ON ec.campaign_id = c.campaign_id
       WHERE ec.buyer_email = $1
       ORDER BY ec.received_at DESC`,
      [buyerEmail]
    );

    res.json({
      success: true,
      count: conversations.rows.length,
      buyer: buyerEmail,
      conversations: conversations.rows
    });
  } catch (error) {
    console.error('Error fetching buyer conversations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/inbound/drafts
 * Get all pending draft responses (for dashboard)
 */
router.get('/drafts', async (req, res) => {
  console.log('📋 Fetching pending drafts...');
  
  try {
    const { userId, status } = req.query;
    
    let queryText = `
      SELECT 
        dr.*,
        c.campaign_name
      FROM draft_responses dr
      JOIN campaigns c ON dr.campaign_id = c.campaign_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (userId) {
      params.push(parseInt(userId));
      queryText += ` AND dr.user_id = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      queryText += ` AND dr.status = $${params.length}`;
    }
    
    queryText += ` ORDER BY dr.received_at DESC`;
    
    const result = await query(queryText, params);
    
    res.json({
      success: true,
      count: result.rows.length,
      drafts: result.rows
    });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch drafts',
      message: error.message
    });
  }
});

/**
 * GET /api/inbound/drafts/:draftId
 * Get a specific draft response
 */
router.get('/drafts/:draftId', async (req, res) => {
  console.log(`📄 Fetching draft ${req.params.draftId}...`);
  
  try {
    const { draftId } = req.params;
    
    const result = await query(
      `SELECT 
        dr.*,
        c.campaign_name
       FROM draft_responses dr
       JOIN campaigns c ON dr.campaign_id = c.campaign_id
       WHERE dr.id = $1`,
      [draftId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }
    
    res.json({
      success: true,
      draft: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch draft',
      message: error.message
    });
  }
});

/**
 * PUT /api/inbound/drafts/:draftId
 * Edit a draft response before sending
 */
router.put('/drafts/:draftId', async (req, res) => {
  console.log(`✏️  Editing draft ${req.params.draftId}...`);
  
  try {
    const { draftId } = req.params;
    const { editedResponse, subject } = req.body;
    
    if (!editedResponse) {
      return res.status(400).json({
        success: false,
        error: 'Edited response is required'
      });
    }
    
    const result = await query(
      `UPDATE draft_responses 
       SET edited_response = $1,
           subject = COALESCE($2, subject),
           status = 'edited'
       WHERE id = $3
       RETURNING *`,
      [editedResponse, subject, draftId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }
    
    console.log(`✅ Draft updated successfully`);
    
    res.json({
      success: true,
      message: 'Draft updated successfully',
      draft: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update draft',
      message: error.message
    });
  }
});

/**
 * POST /api/inbound/drafts/:draftId/send
 * Send a draft response (use edited version if available)
 */
router.post('/drafts/:draftId/send', async (req, res) => {
  console.log(`📤 Sending draft ${req.params.draftId}...`);
  
  try {
    const { draftId } = req.params;
    
    // Get draft details
    const draftResult = await query(
      `SELECT 
        dr.*,
        c.campaign_name,
        c.notification_email
       FROM draft_responses dr
       JOIN campaigns c ON dr.campaign_id = c.campaign_id
       WHERE dr.id = $1`,
      [draftId]
    );
    
    if (draftResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }
    
    const draft = draftResult.rows[0];
    
    if (draft.status === 'sent') {
      return res.status(400).json({
        success: false,
        error: 'This draft has already been sent'
      });
    }
    
    // Use edited response if available, otherwise use suggested response
    const responseToSend = draft.edited_response || draft.suggested_response;
    const subjectToSend = draft.subject;
    
    console.log(`   To: ${draft.buyer_email}`);
    console.log(`   Subject: ${subjectToSend}`);
    console.log(`   Response: ${responseToSend.substring(0, 50)}...`);
    
    // Send the email
    await sendEmail({
      to: draft.buyer_email,
      subject: subjectToSend,
      html: responseToSend.replace(/\n/g, '<br>'),
      text: responseToSend,
      tags: [`campaign-${draft.campaign_id}`, 'manual-reply', 'draft-sent']
    });
    
    console.log('✅ Email sent successfully!');
    
    // Store in conversation history
    await query(
      `INSERT INTO email_conversations 
        (campaign_id, buyer_email, buyer_name, direction, subject, message_content, received_at, user_id, domain_name, ai_generated)
       VALUES ($1, $2, $3, 'outbound', $4, $5, NOW(), $6, $7, false)`,
      [
        draft.campaign_id,
        draft.buyer_email,
        draft.buyer_name,
        subjectToSend,
        responseToSend,
        draft.user_id,
        draft.domain_name
      ]
    );
    
    // Update draft status
    await query(
      `UPDATE draft_responses 
       SET status = 'sent', sent_at = NOW()
       WHERE id = $1`,
      [draftId]
    );
    
    console.log('💾 Stored in conversation history and marked as sent');
    
    // Send confirmation notification
    if (draft.notification_email) {
      await notifyManualSend({
        notificationEmail: draft.notification_email,
        campaignName: draft.campaign_name,
        domainName: draft.domain_name,
        buyerEmail: draft.buyer_email,
        sentResponse: responseToSend
      });
      console.log('✅ Confirmation notification sent');
    }
    
    res.json({
      success: true,
      message: 'Response sent successfully',
      draft: {
        ...draft,
        status: 'sent',
        sent_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error sending draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send draft',
      message: error.message
    });
  }
});

/**
 * DELETE /api/inbound/drafts/:draftId
 * Discard a draft response
 */
router.delete('/drafts/:draftId', async (req, res) => {
  console.log(`🗑️  Discarding draft ${req.params.draftId}...`);
  
  try {
    const { draftId } = req.params;
    
    const result = await query(
      `UPDATE draft_responses 
       SET status = 'discarded'
       WHERE id = $1
       RETURNING *`,
      [draftId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Draft not found'
      });
    }
    
    console.log('✅ Draft discarded');
    
    res.json({
      success: true,
      message: 'Draft discarded successfully'
    });
  } catch (error) {
    console.error('Error discarding draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to discard draft',
      message: error.message
    });
  }
});

/**
 * POST /api/inbound/test
 * Test endpoint to simulate an inbound email (for debugging)
 */
router.post('/test', async (req, res) => {
  console.log('\n🧪 TEST ENDPOINT HIT - Simulating inbound email');
  console.log('════════════════════════════════════════════════════════════');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  res.json({
    success: true,
    message: 'Test endpoint working',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/inbound/webhook-status
 * Check if webhook is properly configured and receiving requests
 */
router.get('/webhook-status', async (req, res) => {
  console.log('🔍 Checking webhook status...');
  
  try {
    // Check recent inbound emails
    const recentEmails = await query(
      `SELECT 
        campaign_id,
        buyer_email,
        direction,
        received_at,
        subject
       FROM email_conversations
       WHERE direction = 'inbound'
       ORDER BY received_at DESC
       LIMIT 10`
    );
    
    // Check if Mailgun is configured
    const mailgunConfigured = !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN);
    
    res.json({
      success: true,
      webhookUrl: `${req.protocol}://${req.get('host')}/inbound/mailgun`,
      alternateWebhookUrl: `${req.protocol}://${req.get('host')}/backend/inbound/mailgun`,
      mailgunConfigured: mailgunConfigured,
      mailgunDomain: process.env.MAILGUN_DOMAIN || 'NOT_CONFIGURED',
      recentInboundEmails: recentEmails.rows.length,
      lastInboundEmail: recentEmails.rows[0] || null,
      instructions: {
        step1: 'Log into Mailgun dashboard: https://app.mailgun.com',
        step2: `Go to Receiving > Routes`,
        step3: `Create a route that forwards to: ${req.protocol}://${req.get('host')}/inbound/mailgun`,
        step4: `Set Expression: match_recipient("admin@mail.3vltn.com") OR match_recipient("info@mail.3vltn.com")`,
        step5: 'Test by sending an email to admin@mail.3vltn.com or replying to a campaign email'
      }
    });
  } catch (error) {
    console.error('Error checking webhook status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

