const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || `noreply@${MAILGUN_DOMAIN}`;

/**
 * Send email notification to campaign owner
 */
async function sendNotification({ 
  to, 
  subject, 
  htmlContent, 
  textContent 
}) {
  try {
    console.log(`📧 Sending notification to: ${to}`);
    console.log(`   Subject: ${subject}`);

    const form = new FormData();
    form.append('from', MAILGUN_FROM_EMAIL);
    form.append('to', to);
    form.append('subject', subject);
    form.append('html', htmlContent);
    form.append('text', textContent || htmlContent.replace(/<[^>]*>/g, ''));

    const response = await axios.post(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      form,
      {
        auth: {
          username: 'api',
          password: MAILGUN_API_KEY
        },
        headers: form.getHeaders()
      }
    );
    
    console.log(`✅ Notification sent successfully!`);
    console.log(`   Message ID: ${response.data.id}`);
    
    return {
      success: true,
      messageId: response.data.id
    };
  } catch (error) {
    console.error('❌ Failed to send notification:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Notify user about new inbound reply (auto-response OFF)
 */
async function notifyNewReply({ 
  notificationEmail, 
  campaignName, 
  domainName,
  buyerEmail, 
  buyerMessage,
  suggestedResponse,
  draftId,
  dashboardUrl = 'https://3vltn.com/dashboard'
}) {
  const subject = `🔔 New Reply Received: ${domainName}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .message-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; border-radius: 4px; }
    .ai-response { background: #e8f4f8; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; border-radius: 4px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white !important; text-decoration: none; border-radius: 6px; margin: 10px 5px; font-weight: bold; }
    .button:hover { background: #5568d3; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .label { font-weight: bold; color: #667eea; margin-bottom: 5px; }
    .info { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>📨 New Reply Received!</h2>
      <p style="margin: 5px 0;">Campaign: ${campaignName}</p>
    </div>
    
    <div class="content">
      <div class="info">
        ℹ️ <strong>Auto-response is OFF</strong> - This reply requires your review and approval before sending.
      </div>
      
      <div class="message-box">
        <div class="label">👤 From: ${buyerEmail}</div>
        <div class="label">📬 Domain: ${domainName}</div>
        <div style="margin-top: 10px;">
          <strong>Message:</strong>
          <p>${buyerMessage}</p>
        </div>
      </div>
      
      <div class="ai-response">
        <div class="label">🤖 AI-Generated Response (Review Required)</div>
        <p>${suggestedResponse}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}/drafts/${draftId}" class="button">
          ✏️ Review & Edit Response
        </a>
        <a href="${dashboardUrl}/drafts/${draftId}/send" class="button" style="background: #4CAF50;">
          ✅ Send As-Is
        </a>
      </div>
      
      <p style="text-align: center; color: #666; font-size: 14px;">
        You can review, edit, and send this response from your dashboard.
      </p>
    </div>
    
    <div class="footer">
      <p>DomainSeller AI Agent • Automated Email Management</p>
      <p>You received this because auto-response is disabled for this campaign.</p>
    </div>
  </div>
</body>
</html>
  `;

  return await sendNotification({
    to: notificationEmail,
    subject,
    htmlContent
  });
}

/**
 * Notify user about auto-sent reply (auto-response ON)
 */
async function notifyAutoResponse({ 
  notificationEmail, 
  campaignName, 
  domainName,
  buyerEmail, 
  buyerMessage,
  aiResponse,
  dashboardUrl = 'https://3vltn.com/dashboard'
}) {
  const subject = `✅ Auto-Reply Sent: ${domainName}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .message-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; border-radius: 4px; }
    .ai-response { background: #e8f4f8; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; border-radius: 4px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white !important; text-decoration: none; border-radius: 6px; margin: 10px 5px; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .label { font-weight: bold; color: #4CAF50; margin-bottom: 5px; }
    .success { background: #d4edda; border: 1px solid #4CAF50; padding: 10px; border-radius: 4px; margin: 10px 0; color: #155724; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✅ Auto-Reply Sent Successfully!</h2>
      <p style="margin: 5px 0;">Campaign: ${campaignName}</p>
    </div>
    
    <div class="content">
      <div class="success">
        ✅ <strong>Auto-response is ON</strong> - AI has automatically replied to this message.
      </div>
      
      <div class="message-box">
        <div class="label">👤 From: ${buyerEmail}</div>
        <div class="label">📬 Domain: ${domainName}</div>
        <div style="margin-top: 10px;">
          <strong>Their Message:</strong>
          <p>${buyerMessage}</p>
        </div>
      </div>
      
      <div class="ai-response">
        <div class="label">🤖 AI Response (Already Sent)</div>
        <p>${aiResponse}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}/conversations" class="button">
          💬 View Full Conversation
        </a>
      </div>
      
      <p style="text-align: center; color: #666; font-size: 14px;">
        This is a notification only. The response has been sent automatically.
      </p>
    </div>
    
    <div class="footer">
      <p>DomainSeller AI Agent • Automated Email Management</p>
      <p>You received this as a confirmation that AI is handling your replies.</p>
    </div>
  </div>
</body>
</html>
  `;

  return await sendNotification({
    to: notificationEmail,
    subject,
    htmlContent
  });
}

/**
 * Notify user that a draft response was manually sent
 */
async function notifyManualSend({ 
  notificationEmail, 
  campaignName, 
  domainName,
  buyerEmail,
  sentResponse
}) {
  const subject = `✅ Response Sent: ${domainName}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4CAF50; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✅ Response Sent!</h2>
      <p style="margin: 5px 0;">Campaign: ${campaignName}</p>
    </div>
    
    <div class="content">
      <p><strong>To:</strong> ${buyerEmail}</p>
      <p><strong>Domain:</strong> ${domainName}</p>
      <p><strong>Message:</strong></p>
      <div style="background: white; padding: 15px; border-left: 4px solid #4CAF50; margin: 10px 0;">
        ${sentResponse}
      </div>
      <p style="text-align: center; color: #4CAF50; font-weight: bold;">
        ✅ Your response has been sent successfully!
      </p>
    </div>
    
    <div class="footer">
      <p>DomainSeller AI Agent</p>
    </div>
  </div>
</body>
</html>
  `;

  return await sendNotification({
    to: notificationEmail,
    subject,
    htmlContent
  });
}

module.exports = {
  sendNotification,
  notifyNewReply,
  notifyAutoResponse,
  notifyManualSend
};

