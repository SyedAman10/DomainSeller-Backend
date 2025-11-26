/**
 * Email Templates Service
 * Generates formatted email content with optional landing page links
 */

/**
 * Add landing page section to email content
 * @param {String} content - Original email content (HTML or text)
 * @param {String} landingPageUrl - Landing page URL
 * @param {String} domainName - Domain name
 * @param {String} format - 'html' or 'text'
 * @returns {String} Email content with landing page link
 */
const addLandingPageLink = (content, landingPageUrl, domainName, format = 'html') => {
  if (!landingPageUrl) {
    return content;
  }

  if (format === 'html') {
    const landingPageSection = `
<div style="margin: 30px 0; padding: 25px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; border: 2px solid #cbd5e1;">
  <h3 style="margin: 0 0 15px 0; color: #1e3a8a; font-size: 18px; text-align: center;">
    🌐 View ${domainName} Landing Page
  </h3>
  <p style="margin: 0 0 20px 0; color: #475569; text-align: center; line-height: 1.6;">
    Check out the premium features and details of this domain:
  </p>
  <div style="text-align: center;">
    <a href="${landingPageUrl}" 
       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
      🔗 Visit Landing Page
    </a>
  </div>
  <p style="margin: 20px 0 0 0; color: #64748b; text-align: center; font-size: 13px;">
    Or copy this link: <a href="${landingPageUrl}" style="color: #3b82f6;">${landingPageUrl}</a>
  </p>
</div>`;

    // Insert before closing tags or at the end
    if (content.includes('</body>')) {
      return content.replace('</body>', `${landingPageSection}</body>`);
    } else if (content.includes('</html>')) {
      return content.replace('</html>', `${landingPageSection}</html>`);
    } else {
      return content + landingPageSection;
    }
  } else {
    // Plain text format
    const landingPageSection = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 VIEW ${domainName.toUpperCase()} LANDING PAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check out the premium features and details of this domain:

🔗 ${landingPageUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return content + landingPageSection;
  }
};

/**
 * Generate initial campaign email with landing page
 * @param {Object} params - Email parameters
 * @returns {Object} Email content (html and text)
 */
const generateCampaignEmail = (params) => {
  const {
    buyerName,
    domainName,
    sellerName,
    emailContent,
    includeLandingPage,
    landingPageUrl
  } = params;

  // If custom content is provided, use it
  let htmlContent = emailContent || `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1e293b; background: #f1f5f9; margin: 0; padding: 20px; }
    .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h2 { margin: 0; font-size: 28px; }
    .content { padding: 35px 30px; }
    .footer { text-align: center; padding: 25px; background: #f8fafc; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Premium Domain Available: ${domainName}</h2>
    </div>
    <div class="content">
      <p>Hi ${buyerName},</p>
      <p>I'm reaching out about <strong>${domainName}</strong>, a premium domain that would be perfect for your business.</p>
      <p>This domain offers excellent branding potential and could significantly boost your online presence.</p>
      <p>Would you be interested in learning more?</p>
      <p>Best regards,<br>${sellerName}</p>
    </div>
    <div class="footer">
      <p>Reply to this email if you'd like more information</p>
    </div>
  </div>
</body>
</html>`;

  let textContent = emailContent ? emailContent.replace(/<[^>]*>/g, '') : `
Hi ${buyerName},

I'm reaching out about ${domainName}, a premium domain that would be perfect for your business.

This domain offers excellent branding potential and could significantly boost your online presence.

Would you be interested in learning more?

Best regards,
${sellerName}`;

  // Add landing page link if enabled
  if (includeLandingPage && landingPageUrl) {
    htmlContent = addLandingPageLink(htmlContent, landingPageUrl, domainName, 'html');
    textContent = addLandingPageLink(textContent, landingPageUrl, domainName, 'text');
  }

  return {
    html: htmlContent,
    text: textContent
  };
};

module.exports = {
  addLandingPageLink,
  generateCampaignEmail
};

