const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || `noreply@${MAILGUN_DOMAIN}`;

/**
 * Send email via Mailgun API
 * @param {Object} emailData - Email configuration
 * @returns {Promise<Object>} Mailgun response
 */
const sendEmail = async (emailData) => {
  const { to, subject, text, html, tags = [] } = emailData;

  console.log('============================================================');
  console.log('📧 SENDING EMAIL');
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  console.log(`📨 To: ${to}`);
  console.log(`📝 Subject: ${subject}`);
  console.log(`🏷️  Tags: ${tags.join(', ') || 'none'}`);
  console.log(`🌐 Mailgun Domain: ${MAILGUN_DOMAIN}`);
  console.log(`📮 From: ${MAILGUN_FROM_EMAIL}`);
  console.log('============================================================');

  try {
    // Validate required configuration
    if (!MAILGUN_API_KEY) {
      console.error('❌ MAILGUN_API_KEY is not configured!');
      throw new Error('MAILGUN_API_KEY environment variable is required');
    }
    if (!MAILGUN_DOMAIN) {
      console.error('❌ MAILGUN_DOMAIN is not configured!');
      throw new Error('MAILGUN_DOMAIN environment variable is required');
    }

    // Check if using sandbox domain
    if (MAILGUN_DOMAIN.includes('sandbox')) {
      console.warn('⚠️  WARNING: Using Mailgun SANDBOX domain!');
      console.warn('⚠️  Recipient must be in authorized recipients list');
      console.warn('⚠️  Add recipient at: https://app.mailgun.com/app/sending/domains');
    }

    // Set Reply-To to sandbox domain for AI agent to receive replies
    const replyToEmail = `noreply@${MAILGUN_DOMAIN}`;
    console.log(`📧 Reply-To set to: ${replyToEmail}`);

    const form = new FormData();
    form.append('from', MAILGUN_FROM_EMAIL);
    form.append('to', to);
    form.append('subject', subject);
    form.append('h:Reply-To', replyToEmail); // ← AI agent will receive replies here!
    
    if (html) {
      form.append('html', html);
      console.log(`📄 Content: HTML (${html.length} characters)`);
    }
    if (text) {
      form.append('text', text);
      console.log(`📄 Content: Text (${text.length} characters)`);
    }

    // Add tags for tracking
    tags.forEach(tag => form.append('o:tag', tag));

    // Enable tracking
    form.append('o:tracking', 'yes');
    form.append('o:tracking-clicks', 'yes');
    form.append('o:tracking-opens', 'yes');

    console.log('🚀 Sending request to Mailgun API...');
    
    const response = await axios.post(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      form,
      {
        auth: {
          username: 'api',
          password: MAILGUN_API_KEY
        },
        headers: {
          ...form.getHeaders()
        }
      }
    );

    console.log(`✅ SUCCESS! Email sent to ${to}`);
    console.log(`📬 Message ID: ${response.data.id}`);
    console.log(`💬 Mailgun Response: ${response.data.message}`);
    console.log('============================================================\n');
    
    return {
      success: true,
      messageId: response.data.id,
      message: response.data.message
    };
  } catch (error) {
    console.log('============================================================');
    console.error(`❌ FAILED to send email to ${to}`);
    console.error(`🔴 Error Type: ${error.name || 'Unknown'}`);
    
    if (error.response) {
      // Mailgun API returned an error
      console.error(`📡 HTTP Status: ${error.response.status}`);
      console.error(`💬 Mailgun Message: ${error.response.data?.message || 'No message'}`);
      console.error(`📋 Full Response:`, JSON.stringify(error.response.data, null, 2));
      
      // Specific error handling
      if (error.response.status === 401) {
        console.error('🔑 AUTHENTICATION ERROR: Invalid API key');
      } else if (error.response.status === 400) {
        console.error('⚠️  BAD REQUEST: Check email format and parameters');
      } else if (error.response.status === 403) {
        console.error('🚫 FORBIDDEN: Check domain authorization or sandbox recipient list');
      } else if (error.response.status === 404) {
        console.error('🔍 NOT FOUND: Domain may not exist or be configured');
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('🌐 NETWORK ERROR: No response from Mailgun');
      console.error('📡 Possible causes: Internet connection, DNS issues, or Mailgun downtime');
    } else {
      // Something else happened
      console.error(`💥 Error Message: ${error.message}`);
    }
    
    console.log('============================================================\n');
    
    throw {
      success: false,
      error: error.response?.data?.message || error.message,
      statusCode: error.response?.status,
      details: error.response?.data
    };
  }
};

/**
 * Send batch emails with rate limiting
 * @param {Array} emails - Array of email objects
 * @param {number} batchLimit - Maximum emails per batch
 * @returns {Promise<Object>} Results summary
 */
const sendBatchEmails = async (emails, batchLimit = 10) => {
  const results = {
    total: emails.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  // Limit batch size
  const batch = emails.slice(0, batchLimit);
  
  for (const email of batch) {
    try {
      await sendEmail(email);
      results.sent++;
      
      // Add small delay between emails to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.failed++;
      results.errors.push({
        email: email.to,
        error: error.error || error.message
      });
    }
  }

  return results;
};

/**
 * Verify Mailgun webhook signature
 * @param {Object} webhookData - Webhook data from Mailgun
 * @returns {boolean} True if signature is valid
 */
const verifyWebhookSignature = (timestamp, token, signature) => {
  const crypto = require('crypto');
  const encodedToken = crypto
    .createHmac('sha256', MAILGUN_API_KEY)
    .update(timestamp + token)
    .digest('hex');
  
  return encodedToken === signature;
};

module.exports = {
  sendEmail,
  sendBatchEmails,
  verifyWebhookSignature
};

