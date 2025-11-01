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
  campaignId,
  dashboardUrl = 'https://3vltn.com'
}) {
  const subject = `🔔 New Reply Received: ${domainName}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #1e293b; 
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
    }
    .container { 
      max-width: 650px; 
      margin: 0 auto; 
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%); 
      color: white; 
      padding: 40px 30px;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
    }
    .header h2 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 5px 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content { 
      padding: 35px 30px;
      background: white;
    }
    .info-badge { 
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-left: 4px solid #f59e0b;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 0 0 25px 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .info-badge strong {
      color: #92400e;
    }
    .info-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    .message-box { 
      background: #f8fafc;
      padding: 20px;
      margin: 20px 0;
      border-left: 5px solid #1e40af;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(30, 64, 175, 0.1);
    }
    .message-box .label {
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 8px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .message-box .message-content {
      background: white;
      padding: 15px;
      border-radius: 6px;
      margin-top: 12px;
      color: #334155;
      line-height: 1.7;
      border: 1px solid #e2e8f0;
    }
    .ai-response { 
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      padding: 20px;
      margin: 25px 0;
      border-left: 5px solid #f59e0b;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
    }
    .ai-response .label {
      font-weight: 600;
      color: #92400e;
      margin-bottom: 12px;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ai-response .response-content {
      background: white;
      padding: 15px;
      border-radius: 6px;
      color: #334155;
      line-height: 1.7;
      border: 1px solid #fcd34d;
    }
    .button-container {
      text-align: center;
      margin: 35px 0 25px 0;
      padding: 20px 0;
    }
    .button { 
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      margin: 8px 6px;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
      transition: all 0.3s ease;
    }
    .button:hover { 
      background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
      box-shadow: 0 6px 16px rgba(30, 64, 175, 0.4);
      transform: translateY(-2px);
    }
    .button.primary { 
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
    }
    .button.primary:hover { 
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
    }
    .note {
      text-align: center;
      color: #64748b;
      font-size: 14px;
      margin: 20px 0 0 0;
      line-height: 1.6;
    }
    .footer { 
      text-align: center;
      padding: 30px;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: #cbd5e1;
      font-size: 13px;
    }
    .footer p {
      margin: 8px 0;
      line-height: 1.6;
    }
    .footer strong {
      color: #fbbf24;
      font-weight: 600;
    }
    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
      margin: 25px 0;
    }
    @media only screen and (max-width: 600px) {
      body { padding: 10px; }
      .header { padding: 30px 20px; }
      .content { padding: 25px 20px; }
      .button { display: block; margin: 10px 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>📨 New Reply Received!</h2>
      <p>Campaign: <strong>${campaignName}</strong></p>
      <p>Domain: <strong>${domainName}</strong></p>
    </div>
    
    <div class="content">
      <div class="info-badge">
        <span class="info-icon">⚠️</span>
        <div>
          <strong>Action Required</strong> - Auto-response is OFF. Please review and approve this reply before sending.
        </div>
      </div>
      
      <div class="message-box">
        <div class="label">
          <span>👤</span>
          <span>Buyer's Message</span>
        </div>
        <div style="color: #64748b; font-size: 14px; margin: 8px 0;">
          From: <strong style="color: #1e40af;">${buyerEmail}</strong>
        </div>
        <div class="message-content">
          ${buyerMessage.replace(/\n/g, '<br>')}
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="ai-response">
        <div class="label">
          <span>🤖</span>
          <span>AI-Generated Suggested Response</span>
        </div>
        <div class="response-content">
          ${suggestedResponse.replace(/\n/g, '<br>')}
        </div>
      </div>
      
      <div class="button-container">
        <a href="${dashboardUrl}/dashboard?draftId=${draftId}" class="button">
          ✏️ Review & Edit Response
        </a>
        <a href="${dashboardUrl}/dashboard?draftId=${draftId}&action=send" class="button primary">
          ✅ Send As-Is
        </a>
      </div>
      
      <p class="note">
        💡 You can review, edit, and customize this response from your dashboard before sending.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>DomainSeller</strong> AI Agent</p>
      <p>Intelligent Email Management • Powered by AI</p>
      <p style="margin-top: 15px; opacity: 0.8;">You received this notification because auto-response is disabled for this campaign.</p>
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
  campaignId,
  dashboardUrl = 'https://3vltn.com'
}) {
  const subject = `✅ Auto-Reply Sent: ${domainName}`;
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #1e293b; 
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
    }
    .container { 
      max-width: 650px; 
      margin: 0 auto; 
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%); 
      color: white; 
      padding: 40px 30px;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
    }
    .header h2 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 5px 0;
      opacity: 0.95;
      font-size: 16px;
    }
    .content { 
      padding: 35px 30px;
      background: white;
    }
    .success-badge { 
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border-left: 4px solid #10b981;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 0 0 25px 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .success-badge strong {
      color: #065f46;
    }
    .success-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    .message-box { 
      background: #f8fafc;
      padding: 20px;
      margin: 20px 0;
      border-left: 5px solid #10b981;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);
    }
    .message-box .label {
      font-weight: 600;
      color: #059669;
      margin-bottom: 8px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .message-box .message-content {
      background: white;
      padding: 15px;
      border-radius: 6px;
      margin-top: 12px;
      color: #334155;
      line-height: 1.7;
      border: 1px solid #e2e8f0;
    }
    .ai-response { 
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      padding: 20px;
      margin: 25px 0;
      border-left: 5px solid #1e40af;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(30, 64, 175, 0.15);
    }
    .ai-response .label {
      font-weight: 600;
      color: #1e3a8a;
      margin-bottom: 12px;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ai-response .response-content {
      background: white;
      padding: 15px;
      border-radius: 6px;
      color: #334155;
      line-height: 1.7;
      border: 1px solid #93c5fd;
    }
    .button-container {
      text-align: center;
      margin: 35px 0 25px 0;
      padding: 20px 0;
    }
    .button { 
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      margin: 8px 6px;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
      transition: all 0.3s ease;
    }
    .button:hover { 
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
      transform: translateY(-2px);
    }
    .note {
      text-align: center;
      color: #64748b;
      font-size: 14px;
      margin: 20px 0 0 0;
      line-height: 1.6;
    }
    .footer { 
      text-align: center;
      padding: 30px;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: #cbd5e1;
      font-size: 13px;
    }
    .footer p {
      margin: 8px 0;
      line-height: 1.6;
    }
    .footer strong {
      color: #fbbf24;
      font-weight: 600;
    }
    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
      margin: 25px 0;
    }
    @media only screen and (max-width: 600px) {
      body { padding: 10px; }
      .header { padding: 30px 20px; }
      .content { padding: 25px 20px; }
      .button { display: block; margin: 10px 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✅ Auto-Reply Sent Successfully!</h2>
      <p>Campaign: <strong>${campaignName}</strong></p>
      <p>Domain: <strong>${domainName}</strong></p>
    </div>
    
    <div class="content">
      <div class="success-badge">
        <span class="success-icon">✅</span>
        <div>
          <strong>Automated Response</strong> - AI has successfully replied to this buyer. Auto-response is ON.
        </div>
      </div>
      
      <div class="message-box">
        <div class="label">
          <span>👤</span>
          <span>Buyer's Message</span>
        </div>
        <div style="color: #64748b; font-size: 14px; margin: 8px 0;">
          From: <strong style="color: #059669;">${buyerEmail}</strong>
        </div>
        <div class="message-content">
          ${buyerMessage.replace(/\n/g, '<br>')}
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="ai-response">
        <div class="label">
          <span>🤖</span>
          <span>AI Response (Already Sent)</span>
        </div>
        <div class="response-content">
          ${aiResponse.replace(/\n/g, '<br>')}
        </div>
      </div>
      
      <div class="button-container">
        <a href="${dashboardUrl}/dashboard?campaignId=${campaignId}&view=conversations" class="button">
          💬 View Full Conversation
        </a>
      </div>
      
      <p class="note">
        📊 This is a confirmation notification. The AI response has been automatically sent to the buyer.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>DomainSeller</strong> AI Agent</p>
      <p>Intelligent Email Management • Powered by AI</p>
      <p style="margin-top: 15px; opacity: 0.8;">You received this as confirmation that AI is handling your email replies automatically.</p>
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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #1e293b; 
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
    }
    .container { 
      max-width: 650px; 
      margin: 0 auto; 
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%); 
      color: white; 
      padding: 40px 30px;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
    }
    .header h2 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 5px 0;
      opacity: 0.9;
      font-size: 16px;
    }
    .content { 
      padding: 35px 30px;
      background: white;
    }
    .success-badge { 
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border-left: 4px solid #10b981;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 0 0 25px 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .success-badge strong {
      color: #065f46;
    }
    .success-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    .info-box {
      background: #f8fafc;
      padding: 18px 20px;
      border-radius: 8px;
      margin: 20px 0;
      border: 1px solid #e2e8f0;
    }
    .info-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #64748b;
      min-width: 100px;
    }
    .info-value {
      color: #1e293b;
    }
    .message-box { 
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      padding: 20px;
      margin: 25px 0;
      border-left: 5px solid #f59e0b;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
    }
    .message-box .label {
      font-weight: 600;
      color: #92400e;
      margin-bottom: 12px;
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .message-box .message-content {
      background: white;
      padding: 15px;
      border-radius: 6px;
      color: #334155;
      line-height: 1.7;
      border: 1px solid #fcd34d;
    }
    .footer { 
      text-align: center;
      padding: 30px;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: #cbd5e1;
      font-size: 13px;
    }
    .footer p {
      margin: 8px 0;
      line-height: 1.6;
    }
    .footer strong {
      color: #fbbf24;
      font-weight: 600;
    }
    @media only screen and (max-width: 600px) {
      body { padding: 10px; }
      .header { padding: 30px 20px; }
      .content { padding: 25px 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✅ Response Sent Successfully!</h2>
      <p>Your manual response has been delivered</p>
    </div>
    
    <div class="content">
      <div class="success-badge">
        <span class="success-icon">✅</span>
        <div>
          <strong>Delivery Confirmed</strong> - Your response has been successfully sent to the buyer.
        </div>
      </div>
      
      <div class="info-box">
        <div class="info-row">
          <div class="info-label">📬 To:</div>
          <div class="info-value"><strong>${buyerEmail}</strong></div>
        </div>
        <div class="info-row">
          <div class="info-label">🏷️ Campaign:</div>
          <div class="info-value">${campaignName}</div>
        </div>
        <div class="info-row">
          <div class="info-label">🌐 Domain:</div>
          <div class="info-value"><strong>${domainName}</strong></div>
        </div>
      </div>
      
      <div class="message-box">
        <div class="label">
          <span>📤</span>
          <span>Your Message</span>
        </div>
        <div class="message-content">
          ${sentResponse.replace(/\n/g, '<br>')}
        </div>
      </div>
      
      <p style="text-align: center; color: #10b981; font-weight: 600; font-size: 16px; margin: 30px 0;">
        ✅ Your response has been delivered successfully!
      </p>
    </div>
    
    <div class="footer">
      <p><strong>DomainSeller</strong> AI Agent</p>
      <p>Intelligent Email Management • Powered by AI</p>
      <p style="margin-top: 15px; opacity: 0.8;">Manual reply confirmation</p>
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

