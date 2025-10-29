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

  try {
    const form = new FormData();
    form.append('from', MAILGUN_FROM_EMAIL);
    form.append('to', to);
    form.append('subject', subject);
    
    if (html) {
      form.append('html', html);
    }
    if (text) {
      form.append('text', text);
    }

    // Add tags for tracking
    tags.forEach(tag => form.append('o:tag', tag));

    // Enable tracking
    form.append('o:tracking', 'yes');
    form.append('o:tracking-clicks', 'yes');
    form.append('o:tracking-opens', 'yes');

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

    console.log(`✅ Email sent to ${to}:`, response.data.id);
    return {
      success: true,
      messageId: response.data.id,
      message: response.data.message
    };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.response?.data || error.message);
    throw {
      success: false,
      error: error.response?.data?.message || error.message
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

