const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { generateAIResponse, analyzeBuyerIntent } = require('../services/aiAgent');
const { sendEmail } = require('../services/emailService');

/**
 * POST /api/inbound/mailgun
 * Webhook for receiving inbound emails from Mailgun
 */
router.post('/mailgun', async (req, res) => {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('📨 INBOUND EMAIL RECEIVED');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
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

    // Extract buyer email
    const buyerEmail = sender;
    const buyerName = sender.split('@')[0].split('<')[0].trim() || 'there';

    // Find the campaign this is replying to
    console.log('🔍 Looking for related campaign...');
    
    // Try to find campaign by checking sent_emails or scheduled_emails
    const campaignLookup = await query(
      `SELECT DISTINCT 
        c.id,
        c.campaign_id,
        c.campaign_name,
        c.domain_name,
        c.email_tone,
        c.user_id,
        c.created_at
       FROM campaigns c
       LEFT JOIN sent_emails se ON se.campaign_id = c.campaign_id
       LEFT JOIN scheduled_emails sch ON sch.campaign_id = c.campaign_id
       WHERE se.buyer_email = $1 OR sch.buyer_email = $1
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [buyerEmail]
    );

    if (campaignLookup.rows.length === 0) {
      console.log('⚠️  No campaign found for this buyer');
      return res.status(200).json({
        success: true,
        message: 'Email received but no campaign found'
      });
    }

    const campaign = campaignLookup.rows[0];
    console.log(`✅ Found Campaign: ${campaign.campaign_name}`);
    console.log(`   Domain: ${campaign.domain_name}`);

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

    // Analyze buyer intent
    const intent = analyzeBuyerIntent(messageContent);
    console.log('🔍 Buyer Intent Analysis:');
    console.log(`   Sentiment: ${intent.sentiment}`);
    console.log(`   Interested: ${intent.isInterested}`);
    console.log(`   Price Objection: ${intent.isPriceObjection}`);
    console.log(`   Ready to Buy: ${intent.isReady}`);
    console.log(`   Not Interested: ${intent.isNotInterested}`);

    // If buyer is not interested, don't reply
    if (intent.isNotInterested) {
      console.log('🛑 Buyer is not interested - skipping AI response');
      return res.status(200).json({
        success: true,
        message: 'Buyer not interested - no reply sent'
      });
    }

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
    
    const aiResponse = await generateAIResponse({
      buyerMessage: messageContent,
      domainName: campaign.domain_name,
      buyerName: buyerName,
      conversationHistory: conversationHistory,
      campaignInfo: {
        emailTone: campaign.email_tone
      }
    });

    if (!aiResponse.success) {
      console.warn('⚠️  AI generation failed, using fallback response');
    }

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
        aiResponse.reply,
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
      html: aiResponse.reply.replace(/\n/g, '<br>'),
      text: aiResponse.reply,
      tags: [`campaign-${campaign.campaign_id}`, 'ai-reply', 'inbound-response']
    });

    console.log('✅ AI response sent successfully!');
    console.log('════════════════════════════════════════════════════════════\n');

    res.status(200).json({
      success: true,
      message: 'Email processed and AI response sent',
      campaign: campaign.campaign_name,
      domain: campaign.domain_name,
      intent: intent,
      aiGenerated: !aiResponse.usingFallback
    });

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

module.exports = router;

