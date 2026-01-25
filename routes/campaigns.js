const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { sendBatchEmails } = require('../services/emailService');
const { addLandingPageLink } = require('../services/emailTemplates');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================================================
// SPECIFIC ROUTES (must come BEFORE parameterized routes)
// ============================================================

/**
 * POST /api/campaigns/generate-ai-email
 * Generate personalized AI email templates for a campaign (initial + follow-ups)
 * These templates are saved and reused for all buyers in the campaign
 */
router.post('/generate-ai-email', async (req, res) => {
  console.log('\n🤖 AI EMAIL TEMPLATE GENERATION REQUEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const {
      campaignId,
      sampleBuyerInfo, // Optional: provide sample buyer for more relevant generation
      regenerate = false // Set to true to regenerate even if templates exist
    } = req.body;

    // Validation
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'campaignId is required'
      });
    }

    console.log(`📋 Campaign ID: ${campaignId}`);

    // Get campaign details
    const campaignResult = await query(
      `SELECT * FROM campaigns WHERE campaign_id = $1 OR id = $2`,
      [campaignId, parseInt(campaignId) || 0]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const campaign = campaignResult.rows[0];
    console.log(`✅ Campaign found: ${campaign.campaign_name}`);
    console.log(`🌐 Domain: ${campaign.domain_name}`);

    // Check if templates already exist
    if (campaign.email_template_subject && !regenerate) {
      console.log('📧 Email templates already exist for this campaign');
      
      const existingTemplates = {
        initial: {
          subject: campaign.email_template_subject,
          html: campaign.email_template_html,
          text: campaign.email_template_text
        }
      };

      // Parse follow-up templates if they exist
      if (campaign.followup_templates) {
        existingTemplates.followUps = campaign.followup_templates;
      }

      return res.json({
        success: true,
        templates: existingTemplates,
        message: 'Using existing email templates. Set regenerate=true to create new ones.',
        campaign: {
          id: campaign.campaign_id,
          name: campaign.campaign_name,
          domain: campaign.domain_name
        }
      });
    }

    // Get user details for signature
    const userResult = await query(
      `SELECT username, email FROM users WHERE id = $1`,
      [campaign.user_id]
    );

    const seller = userResult.rows[0] || { username: 'Domain Owner', email: '' };

    // Build sample buyer context (use provided or generic)
    const buyerName = sampleBuyerInfo?.full_name || sampleBuyerInfo?.first_name || '[Buyer Name]';
    const companyName = sampleBuyerInfo?.company_name || '[Company Name]';
    const jobTitle = sampleBuyerInfo?.job_title || 'decision maker';
    const industry = sampleBuyerInfo?.industry || campaign.target_industry || 'their industry';

    // Generate initial email
    console.log('🚀 Generating INITIAL email template...');
    
    const initialPrompt = `You are an expert domain sales email writer. Generate a professional, compelling INITIAL OUTREACH email to pitch the domain "${campaign.domain_name}".

CAMPAIGN DETAILS:
- Domain: ${campaign.domain_name}
- Asking Price: ${campaign.asking_price ? `$${campaign.asking_price.toLocaleString()}` : 'Negotiable'}
- Target Industry: ${campaign.target_industry || 'Any'}
- Campaign Description: ${campaign.description || 'N/A'}
- Landing Page: ${campaign.include_landing_page && campaign.landing_page_url ? campaign.landing_page_url : 'None'}

SELLER INFORMATION:
- Name: ${seller.username}
- Email: ${seller.email}

EMAIL WRITING GUIDELINES:
1. Use placeholders {{buyerName}} and {{companyName}} for personalization
2. Hook: Start with a compelling reason why this domain is valuable
3. Value: Explain domain benefits (branding, SEO, credibility, memorability)
4. Industry Relevance: Mention how it fits ${industry} businesses
5. Brevity: Keep it 3-4 short paragraphs
6. Professional but friendly tone
7. No pushy sales tactics
8. End with simple question or CTA
9. Don't mention price in initial email unless buyer is C-suite
10. If landing page exists, mention it naturally
11. Sign off with: "Best regards, ${seller.username}"

Generate TWO versions:
1. HTML (professionally formatted, clean design)
2. Plain text (readable, well-structured)

Return as JSON: { "subject": "...", "html": "...", "text": "..." }`;

    const initialCompletion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: initialPrompt },
        { role: 'user', content: `Generate the initial outreach email for ${campaign.domain_name}. Use {{buyerName}} and {{companyName}} as placeholders.` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 2000
    });

    const initialEmail = JSON.parse(initialCompletion.choices[0].message.content);
    console.log('✅ Initial email generated');
    console.log(`📧 Subject: ${initialEmail.subject}`);

    // Generate follow-up emails if enabled
    const followUpTemplates = [];
    
    if (campaign.include_follow_ups && campaign.follow_up_days && campaign.follow_up_days.length > 0) {
      console.log(`📨 Generating ${campaign.follow_up_days.length} follow-up email templates...`);
      
      const followUpTypes = [
        { type: 'value_add', focus: 'Share additional value and benefits of the domain' },
        { type: 'final_offer', focus: 'Create urgency with limited-time offer or other interested buyers' },
        { type: 'last_chance', focus: 'Final polite reminder and last chance to discuss' }
      ];

      for (let i = 0; i < Math.min(campaign.follow_up_days.length, 3); i++) {
        const day = campaign.follow_up_days[i];
        const followUpType = followUpTypes[i] || followUpTypes[followUpTypes.length - 1];

        console.log(`   Generating ${followUpType.type} (Day ${day})...`);

        const followUpPrompt = `Generate a ${followUpType.type.toUpperCase()} follow-up email for the domain ${campaign.domain_name}.

CONTEXT: This is follow-up #${i + 1}, sent ${day} days after the initial email. The buyer hasn't responded yet.

${followUpType.type === 'value_add' ? `
FOCUS: Share MORE VALUE
- Highlight additional benefits they might have missed
- Mention specific use cases for their industry
- Share domain statistics or market trends
- Keep tone helpful and informative, not pushy
` : ''}

${followUpType.type === 'final_offer' ? `
FOCUS: Create URGENCY
- Mention other interested buyers (if true)
- Offer limited-time pricing consideration
- Emphasize first-come-first-served nature
- Still professional, not desperate
` : ''}

${followUpType.type === 'last_chance' ? `
FOCUS: Polite FINAL REMINDER
- Acknowledge they're busy
- One last chance to discuss
- Open door for future contact
- Graceful close if no interest
- Professional and respectful exit
` : ''}

Use {{buyerName}} and {{companyName}} placeholders.
Keep it brief (2-3 paragraphs).
Sign off with: "Best regards, ${seller.username}"

Return as JSON: { "subject": "...", "html": "...", "text": "..." }`;

        const followUpCompletion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: followUpPrompt },
            { role: 'user', content: `Generate ${followUpType.type} follow-up email template.` }
          ],
          response_format: { type: "json_object" },
          temperature: 0.8,
          max_tokens: 1500
        });

        const followUpEmail = JSON.parse(followUpCompletion.choices[0].message.content);
        
        followUpTemplates.push({
          sequence: i + 1,
          days_after: day,
          type: followUpType.type,
          subject: followUpEmail.subject,
          html: followUpEmail.html,
          text: followUpEmail.text
        });

        console.log(`   ✅ ${followUpType.type} generated (Day ${day})`);
      }
    }

    // Add landing page links if enabled
    if (campaign.include_landing_page && campaign.landing_page_url) {
      console.log(`🌐 Adding landing page link: ${campaign.landing_page_url}`);
      
      initialEmail.html = addLandingPageLink(
        initialEmail.html, 
        campaign.landing_page_url, 
        campaign.domain_name, 
        'html'
      );
      initialEmail.text = addLandingPageLink(
        initialEmail.text, 
        campaign.landing_page_url, 
        campaign.domain_name, 
        'text'
      );

      // Add to follow-ups too
      followUpTemplates.forEach(followUp => {
        followUp.html = addLandingPageLink(
          followUp.html,
          campaign.landing_page_url,
          campaign.domain_name,
          'html'
        );
        followUp.text = addLandingPageLink(
          followUp.text,
          campaign.landing_page_url,
          campaign.domain_name,
          'text'
        );
      });
    }

    // Save templates to campaign
    console.log('💾 Saving email templates to campaign...');
    
    await query(
      `UPDATE campaigns 
       SET email_template_subject = $1,
           email_template_html = $2,
           email_template_text = $3,
           followup_templates = $4,
           templates_generated_at = NOW(),
           updated_at = NOW()
       WHERE campaign_id = $5`,
      [
        initialEmail.subject,
        initialEmail.html,
        initialEmail.text,
        JSON.stringify(followUpTemplates),
        campaign.campaign_id
      ]
    );

    console.log('✅ Templates saved to campaign');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ AI EMAIL TEMPLATE GENERATION COMPLETE\n');

    res.json({
      success: true,
      templates: {
        initial: {
          subject: initialEmail.subject,
          html: initialEmail.html,
          text: initialEmail.text
        },
        followUps: followUpTemplates
      },
      campaign: {
        id: campaign.campaign_id,
        name: campaign.campaign_name,
        domain: campaign.domain_name
      },
      message: `Generated ${1 + followUpTemplates.length} email templates for campaign`,
      usage: {
        initialEmail: 1,
        followUpEmails: followUpTemplates.length,
        totalTemplates: 1 + followUpTemplates.length
      }
    });

  } catch (error) {
    console.error('❌ Error generating AI email templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI email templates',
      message: error.message
    });
  }
});

/**
 * POST /api/campaigns/personalize-template
 * Personalize saved campaign templates with buyer information
 * Use this to quickly generate emails for buyers using campaign's saved templates
 */
router.post('/personalize-template', async (req, res) => {
  console.log('\n📝 PERSONALIZING EMAIL TEMPLATE');
  
  try {
    const { campaignId, buyers } = req.body;

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'campaignId is required'
      });
    }

    if (!buyers || !Array.isArray(buyers) || buyers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'buyers array is required'
      });
    }

    // Get campaign with templates
    const campaignResult = await query(
      `SELECT * FROM campaigns WHERE campaign_id = $1 OR id = $2`,
      [campaignId, parseInt(campaignId) || 0]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const campaign = campaignResult.rows[0];

    // Check if templates exist
    if (!campaign.email_template_subject) {
      return res.status(400).json({
        success: false,
        error: 'No email templates found for this campaign',
        message: 'Please generate AI email templates first using /generate-ai-email'
      });
    }

    console.log(`✅ Using templates from campaign: ${campaign.campaign_name}`);
    console.log(`📧 Personalizing for ${buyers.length} buyers`);

    // Personalize emails for each buyer
    const personalizedEmails = buyers.map(buyer => {
      const buyerName = buyer.full_name || buyer.first_name || buyer.contact_person || 'there';
      const companyName = buyer.company_name || '';

      // Replace placeholders in templates
      let personalizedSubject = campaign.email_template_subject
        .replace(/\{\{buyerName\}\}/g, buyerName)
        .replace(/\{\{companyName\}\}/g, companyName);

      let personalizedHtml = campaign.email_template_html
        .replace(/\{\{buyerName\}\}/g, buyerName)
        .replace(/\{\{companyName\}\}/g, companyName);

      let personalizedText = campaign.email_template_text
        .replace(/\{\{buyerName\}\}/g, buyerName)
        .replace(/\{\{companyName\}\}/g, companyName);

      return {
        to: buyer.email,
        subject: personalizedSubject,
        html: personalizedHtml,
        text: personalizedText,
        buyer: {
          id: buyer.id,
          name: buyerName,
          company: companyName,
          email: buyer.email
        }
      };
    });

    console.log(`✅ Personalized ${personalizedEmails.length} emails`);

    res.json({
      success: true,
      emails: personalizedEmails,
      campaign: {
        id: campaign.campaign_id,
        name: campaign.campaign_name,
        domain: campaign.domain_name
      },
      message: `Personalized ${personalizedEmails.length} emails using campaign templates`
    });

  } catch (error) {
    console.error('❌ Error personalizing templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to personalize templates',
      message: error.message
    });
  }
});

/**
 * POST /api/campaigns/send-batch
 * Send multiple emails at once (rate limited to 10 per batch)
 */
router.post('/send-batch', async (req, res) => {
  console.log('📧 Processing batch email send...');
  
  try {
    const { campaignId, emails } = req.body;

    if (!campaignId || !emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'campaignId and emails array are required'
      });
    }

    console.log(`🔍 Looking for campaign with ID: ${campaignId} (type: ${typeof campaignId})`);

    // Validate campaign exists - check both id (integer) and campaign_id (string)
    let campaign;
    if (typeof campaignId === 'number' || !isNaN(parseInt(campaignId))) {
      // If it's a number, search by id field first
      campaign = await query(
        'SELECT * FROM campaigns WHERE id = $1 OR campaign_id = $2',
        [campaignId, String(campaignId)]
      );
    } else {
      // If it's a string, search by campaign_id field
      campaign = await query(
        'SELECT * FROM campaigns WHERE campaign_id = $1 OR id = $2',
        [campaignId, parseInt(campaignId) || 0]
      );
    }

    if (campaign.rows.length === 0) {
      console.log(`❌ Campaign not found with ID: ${campaignId}`);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        message: `No campaign found with ID: ${campaignId}`,
        hint: 'Make sure you are using the correct campaign ID from the database'
      });
    }

    console.log(`✅ Campaign found: ${campaign.rows[0].campaign_id} (DB ID: ${campaign.rows[0].id})`);
    
    // Use the campaign_id string for all subsequent operations
    const actualCampaignId = campaign.rows[0].campaign_id;

    // Check if landing page should be included
    const includeLandingPage = campaign.rows[0].include_landing_page;
    const landingPageUrl = campaign.rows[0].landing_page_url;

    // Add landing page link to emails if enabled
    if (includeLandingPage && landingPageUrl) {
      console.log(`🌐 Adding landing page link to emails: ${landingPageUrl}`);
      
      emails = emails.map(email => {
        if (email.html) {
          email.html = addLandingPageLink(email.html, landingPageUrl, campaign.rows[0].domain_name, 'html');
        }
        if (email.text) {
          email.text = addLandingPageLink(email.text, landingPageUrl, campaign.rows[0].domain_name, 'text');
        }
        return email;
      });
    }

    // Get batch limit from env or default to 10
    const batchLimit = parseInt(process.env.EMAIL_BATCH_LIMIT) || 10;

    // Send emails via Mailgun
    const results = await sendBatchEmails(emails, batchLimit);

    // Store sent emails in database and schedule follow-ups
    const insertPromises = emails.slice(0, batchLimit).map(async (email, index) => {
      if (index < results.sent) {
        try {
          // Insert sent email (or update if already exists)
          await query(
            `INSERT INTO sent_emails 
              (campaign_id, buyer_email, email_subject, email_content, sent_at, status, user_id, buyer_id, buyer_name, domain_name)
             VALUES ($1, $2, $3, $4, NOW(), 'sent', $5, $6, $7, $8)
             ON CONFLICT (user_id, campaign_id, buyer_id) 
             DO UPDATE SET
               sent_at = NOW(),
               email_subject = EXCLUDED.email_subject,
               email_content = EXCLUDED.email_content,
               status = 'sent'`,
            [
              actualCampaignId, 
              email.to, 
              email.subject, 
              email.html || email.text,
              email.userId || campaign.rows[0].user_id || 0,
              email.buyerId || 'unknown',
              email.buyerName || email.to.split('@')[0],
              campaign.rows[0].domain_name || 'Unknown'
            ]
          );

          // Auto-schedule follow-ups if campaign has followUpSequence
          if (campaign.rows[0].follow_up_sequence) {
            const followUpSequence = typeof campaign.rows[0].follow_up_sequence === 'string' 
              ? JSON.parse(campaign.rows[0].follow_up_sequence)
              : campaign.rows[0].follow_up_sequence;

            if (Array.isArray(followUpSequence) && followUpSequence.length > 0) {
              console.log(`📅 Scheduling ${followUpSequence.length} follow-ups for ${email.to}`);

              for (const followUp of followUpSequence) {
                const daysAfter = followUp.daysAfter || followUp.day || 3;
                const scheduledDate = new Date();
                scheduledDate.setDate(scheduledDate.getDate() + daysAfter);

                // Prepare placeholders for dynamic content
                const placeholders = {
                  domain: campaign.rows[0].domain_name,
                  buyerName: email.buyerName || email.to.split('@')[0],
                  buyerEmail: email.to,
                  campaignName: campaign.rows[0].campaign_name
                };

                // Replace placeholders in subject
                const subject = (followUp.subject || `Follow-up: ${followUp.name}`)
                  .replace(/{domain}/g, placeholders.domain)
                  .replace(/{buyerName}/g, placeholders.buyerName)
                  .replace(/{buyerEmail}/g, placeholders.buyerEmail)
                  .replace(/{campaignName}/g, placeholders.campaignName);

                // Replace placeholders in content/body
                const content = (followUp.content || followUp.body || `Follow-up: ${followUp.name}`)
                  .replace(/{domain}/g, placeholders.domain)
                  .replace(/{buyerName}/g, placeholders.buyerName)
                  .replace(/{buyerEmail}/g, placeholders.buyerEmail)
                  .replace(/{campaignName}/g, placeholders.campaignName);

                await query(
                  `INSERT INTO scheduled_emails 
                    (campaign_id, buyer_email, email_subject, email_content, scheduled_for, status, user_id, buyer_id, buyer_name, domain_name)
                   VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9)`,
                  [
                    actualCampaignId,
                    email.to,
                    subject,
                    content,
                    scheduledDate.toISOString(),
                    email.userId || campaign.rows[0].user_id || 0,
                    email.buyerId || 'unknown',
                    email.buyerName || email.to.split('@')[0],
                    campaign.rows[0].domain_name
                  ]
                );

                console.log(`  ✅ ${followUp.name} scheduled for ${scheduledDate.toISOString().split('T')[0]}`);
              }
            }
          }
        } catch (error) {
          console.error('Error storing sent email or scheduling follow-ups:', error);
        }
      }
    });

    await Promise.all(insertPromises);

    // Update campaign status and scheduled count
    const scheduledCount = campaign.rows[0].follow_up_sequence 
      ? (typeof campaign.rows[0].follow_up_sequence === 'string'
          ? JSON.parse(campaign.rows[0].follow_up_sequence).length
          : campaign.rows[0].follow_up_sequence.length) * results.sent
      : 0;

    await query(
      `UPDATE campaigns 
       SET status = 'active', updated_at = NOW(), 
           total_emails_sent = total_emails_sent + $2,
           total_emails_scheduled = total_emails_scheduled + $3
       WHERE campaign_id = $1`,
      [actualCampaignId, results.sent, scheduledCount]
    );

    console.log(`✅ Batch complete: ${results.sent} sent, ${scheduledCount} follow-ups scheduled`);

    res.json({
      success: true,
      message: 'Batch emails processed and follow-ups scheduled',
      results: {
        total: results.total,
        sent: results.sent,
        failed: results.failed,
        followUpsScheduled: scheduledCount,
        batchLimit,
        errors: results.errors
      }
    });
  } catch (error) {
    console.error('Error sending batch emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send batch emails',
      message: error.message
    });
  }
});

/**
 * POST /api/campaigns/schedule-followup
 * Schedule a follow-up email
 */
router.post('/schedule-followup', async (req, res) => {
  console.log('📅 Scheduling follow-up email...');
  
  try {
    const { campaignId, buyerEmail, subject, body, scheduledFor, userId, buyerId, buyerName, domainName } = req.body;

    if (!campaignId || !buyerEmail || !subject || !body || !scheduledFor) {
      return res.status(400).json({
        success: false,
        error: 'campaignId, buyerEmail, subject, body, and scheduledFor are required'
      });
    }

    // Validate campaign exists - check both id (integer) and campaign_id (string)
    let campaign;
    if (typeof campaignId === 'number' || !isNaN(parseInt(campaignId))) {
      campaign = await query(
        'SELECT * FROM campaigns WHERE id = $1 OR campaign_id = $2',
        [campaignId, String(campaignId)]
      );
    } else {
      campaign = await query(
        'SELECT * FROM campaigns WHERE campaign_id = $1 OR id = $2',
        [campaignId, parseInt(campaignId) || 0]
      );
    }

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    const actualCampaignId = campaign.rows[0].campaign_id;

    // Insert into scheduled_emails
    const result = await query(
      `INSERT INTO scheduled_emails 
        (campaign_id, buyer_email, email_subject, email_content, scheduled_for, status, created_at, user_id, buyer_id, buyer_name, domain_name)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), $6, $7, $8, $9)
       RETURNING *`,
      [
        actualCampaignId, 
        buyerEmail, 
        subject, 
        body, 
        scheduledFor,
        userId || campaign.rows[0].user_id || 0,
        buyerId || 'unknown',
        buyerName || buyerEmail.split('@')[0],
        domainName || campaign.rows[0].domain_name || 'Unknown'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Follow-up email scheduled successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error scheduling follow-up:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule follow-up email',
      message: error.message
    });
  }
});

/**
 * PUT /api/campaigns/scheduled/:scheduledEmailId
 * Update a scheduled email's content, subject, or scheduled time
 */
router.put('/scheduled/:scheduledEmailId', async (req, res) => {
  console.log(`📝 Updating scheduled email ${req.params.scheduledEmailId}...`);
  
  try {
    const { scheduledEmailId } = req.params;
    const {
      emailSubject,
      emailContent,
      scheduledFor,
      buyerEmail,
      buyerName
    } = req.body;

    // Check if scheduled email exists
    const existing = await query(
      'SELECT * FROM scheduled_emails WHERE id = $1',
      [scheduledEmailId]
    );

    if (existing.rows.length === 0) {
      console.log(`❌ Scheduled email ${scheduledEmailId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Scheduled email not found',
        message: `No scheduled email found with ID: ${scheduledEmailId}`
      });
    }

    const currentEmail = existing.rows[0];

    // Don't allow updating emails that have already been sent
    if (currentEmail.status === 'sent') {
      console.log(`❌ Cannot update email that has already been sent`);
      return res.status(400).json({
        success: false,
        error: 'Cannot update sent email',
        message: 'This email has already been sent and cannot be modified'
      });
    }

    // Update scheduled email
    const result = await query(
      `UPDATE scheduled_emails SET
        email_subject = COALESCE($1, email_subject),
        email_content = COALESCE($2, email_content),
        scheduled_for = COALESCE($3, scheduled_for),
        buyer_email = COALESCE($4, buyer_email),
        buyer_name = COALESCE($5, buyer_name)
      WHERE id = $6
      RETURNING *`,
      [
        emailSubject,
        emailContent,
        scheduledFor,
        buyerEmail,
        buyerName,
        scheduledEmailId
      ]
    );

    console.log(`✅ Scheduled email ${scheduledEmailId} updated successfully`);

    res.json({
      success: true,
      message: 'Scheduled email updated successfully',
      scheduledEmail: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating scheduled email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update scheduled email',
      message: error.message
    });
  }
});

/**
 * POST /api/campaigns/replace
 * Delete existing campaign for a domain and create a new one
 */
router.post('/replace', async (req, res) => {
  console.log('🔄 Replace existing campaign...');
  
  try {
    const {
      userId,
      domainId,
      domainName,
      campaignName,
      emailTone,
      includePrice,
      maxEmailsPerDay,
      followUpSequence,
      followUpDays,
      includeLandingPage,
      landingPageUrl
    } = req.body;

    // Validate required fields
    if (!userId || !domainName || !campaignName) {
      return res.status(400).json({
        success: false,
        error: 'userId, domainName, and campaignName are required'
      });
    }

    console.log(`🔍 Looking for existing campaign for ${domainName}...`);

    // Find and delete existing active/draft campaigns for this domain
    const existing = await query(
      `DELETE FROM campaigns 
       WHERE user_id = $1 AND domain_name = $2 
       AND status IN ('active', 'draft')
       RETURNING *`,
      [userId, domainName]
    );

    if (existing.rows.length > 0) {
      console.log(`🗑️  Deleted ${existing.rows.length} existing campaign(s) for ${domainName}`);
    }

    // Generate unique campaign_id
    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new campaign
    const result = await query(
      `INSERT INTO campaigns 
        (campaign_id, user_id, domain_id, domain_name, campaign_name, email_tone, 
         include_price, max_emails_per_day, follow_up_sequence, follow_up_days, 
         include_landing_page, landing_page_url,
         status, created_at, updated_at, total_emails_sent, total_emails_scheduled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft', NOW(), NOW(), 0, 0)
       RETURNING *`,
      [
        campaignId,
        userId,
        domainId || null,
        domainName,
        campaignName,
        emailTone || 'professional',
        includePrice !== undefined ? includePrice : true,
        maxEmailsPerDay || 50,
        followUpSequence ? JSON.stringify(followUpSequence) : null,
        followUpDays || 3,
        includeLandingPage || false,
        landingPageUrl || null
      ]
    );

    console.log(`✅ New campaign created: ${campaignId}`);

    res.status(201).json({
      success: true,
      message: 'Campaign replaced successfully',
      deleted: existing.rows.length,
      campaign: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error replacing campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to replace campaign',
      message: error.message
    });
  }
});

// ============================================================
// GENERAL ROUTES
// ============================================================

/**
 * POST /api/campaigns
 * Create a new campaign
 */
router.post('/', async (req, res) => {
  console.log('🆕 Creating new campaign...');
  
  try {
    const {
      userId,
      domainId,
      domainName,
      campaignName,
      emailTone,
      includePrice,
      maxEmailsPerDay,
      followUpSequence,
      followUpDays,
      includeLandingPage,
      landingPageUrl
    } = req.body;

    // Validate required fields
    if (!userId || !domainName || !campaignName) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'userId, domainName, and campaignName are required'
      });
    }

    console.log(`📝 Campaign: ${campaignName} for ${domainName}`);

    // Check for existing campaign with same domain for this user
    const existingCampaign = await query(
      `SELECT * FROM campaigns 
       WHERE user_id = $1 AND domain_name = $2 
       AND status IN ('active', 'draft')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, domainName]
    );

    if (existingCampaign.rows.length > 0) {
      const existing = existingCampaign.rows[0];
      console.log(`⚠️ Campaign already exists for ${domainName}: ${existing.campaign_id}`);
      
      return res.status(409).json({
        success: false,
        error: 'Campaign already exists for this domain',
        message: `You already have an ${existing.status} campaign for ${domainName}`,
        existingCampaign: {
          id: existing.id,
          campaign_id: existing.campaign_id,
          campaign_name: existing.campaign_name,
          status: existing.status,
          created_at: existing.created_at,
          total_emails_sent: existing.total_emails_sent,
          total_emails_scheduled: existing.total_emails_scheduled
        },
        actions: {
          useExisting: `Use the existing campaign (ID: ${existing.id})`,
          replaceExisting: `POST /api/campaigns/replace to delete old and create new`,
          updateExisting: `PUT /api/campaigns/${existing.id} to update settings`
        },
        hint: 'To create a new campaign for this domain, use the /api/campaigns/replace endpoint'
      });
    }

    // ✅ CHECK IF DOMAIN HAS BEEN SOLD
    const soldCheck = await query(
      `SELECT sold, sold_at, sold_price, sold_transaction_id 
       FROM campaigns 
       WHERE domain_name = $1 AND sold = true 
       LIMIT 1`,
      [domainName]
    );

    if (soldCheck.rows.length > 0) {
      const soldInfo = soldCheck.rows[0];
      console.log(`❌ Domain ${domainName} has been SOLD - cannot create campaign`);
      
      return res.status(403).json({
        success: false,
        error: 'Domain already sold',
        message: `${domainName} was sold and cannot have new campaigns`,
        soldInfo: {
          soldAt: soldInfo.sold_at,
          soldPrice: soldInfo.sold_price ? `$${soldInfo.sold_price}` : 'Not disclosed',
          transactionId: soldInfo.sold_transaction_id
        },
        hint: 'This domain has been successfully sold via the escrow system'
      });
    }

    // Validate user exists
    const userCheck = await query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      console.log(`❌ User ID ${userId} not found`);
      
      // Get available user IDs
      const availableUsers = await query(
        'SELECT id, email, username FROM users ORDER BY id LIMIT 5'
      );
      
      const userList = availableUsers.rows.map(u => `${u.id} (${u.email})`).join(', ');
      
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: `User ID ${userId} does not exist`,
        availableUsers: availableUsers.rows.map(u => ({
          id: u.id,
          email: u.email,
          username: u.username
        })),
        hint: `Try using one of these user IDs: ${userList}`
      });
    }

    console.log(`✅ User validated: ${userCheck.rows[0].id}`);

    // Generate unique campaign_id
    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert new campaign
    const result = await query(
      `INSERT INTO campaigns 
        (campaign_id, user_id, domain_id, domain_name, campaign_name, email_tone, 
         include_price, max_emails_per_day, follow_up_sequence, follow_up_days, 
         include_landing_page, landing_page_url,
         status, created_at, updated_at, total_emails_sent, total_emails_scheduled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft', NOW(), NOW(), 0, 0)
       RETURNING *`,
      [
        campaignId,
        userId,
        domainId || null,
        domainName,
        campaignName,
        emailTone || 'professional',
        includePrice !== undefined ? includePrice : true,
        maxEmailsPerDay || 50,
        followUpSequence ? JSON.stringify(followUpSequence) : null,
        followUpDays || 3,
        includeLandingPage || false,
        landingPageUrl || null
      ]
    );

    console.log(`✅ Campaign created with ID: ${campaignId}`);

    // Get scheduled emails for this campaign
    const scheduledEmails = await query(
      `SELECT id, buyer_email, email_subject, scheduled_for, status 
       FROM scheduled_emails 
       WHERE campaign_id = $1 
       ORDER BY scheduled_for ASC`,
      [campaignId]
    );

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign: result.rows[0],
      scheduled: scheduledEmails.rows,
      scheduledCount: scheduledEmails.rows.length
    });
  } catch (error) {
    console.error('❌ Error creating campaign:', error);
    
    // Handle foreign key constraint errors
    if (error.code === '23503' && error.constraint === 'campaigns_user_id_fkey') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        message: 'The specified user ID does not exist',
        hint: 'Run "node check-users.js" to see available user IDs'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns
 * Get all campaigns for a user
 */
router.get('/', async (req, res) => {
  console.log('📋 Fetching all campaigns...');
  
  try {
    const { userId } = req.query;

    let queryText = 'SELECT * FROM campaigns ORDER BY created_at DESC';
    let params = [];

    if (userId) {
      queryText = 'SELECT * FROM campaigns WHERE user_id = $1 ORDER BY created_at DESC';
      params = [userId];
      console.log(`👤 Filtering by user ID: ${userId}`);
    }

    const result = await query(queryText, params);

    console.log(`✅ Found ${result.rows.length} campaigns`);

    res.json({
      success: true,
      count: result.rows.length,
      campaigns: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
      message: error.message
    });
  }
});

/**
 * DELETE /api/campaigns
 * Bulk delete campaigns (requires campaignIds array)
 */
router.delete('/', async (req, res) => {
  console.log('🗑️  Bulk deleting campaigns...');
  
  try {
    let { campaignIds, campaignId, userId } = req.body;

    // Handle both single campaignId and array campaignIds
    if (!campaignIds && campaignId) {
      // Convert single campaignId to array
      campaignIds = [campaignId];
      console.log(`   Converting single campaignId to array: [${campaignId}]`);
    }

    if (!campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'campaignIds array or campaignId is required',
        message: 'Provide campaignId (string) or campaignIds (array) to delete'
      });
    }

    console.log(`   Deleting ${campaignIds.length} campaign(s): ${campaignIds.join(', ')}`);
    if (userId) {
      console.log(`   Filtering by user ID: ${userId}`);
    }

    // Build query with user filter if provided
    let query_text = 'DELETE FROM campaigns WHERE campaign_id = ANY($1)';
    let params = [campaignIds];

    if (userId) {
      query_text += ' AND user_id = $2';
      params.push(userId);
    }

    query_text += ' RETURNING *';

    const result = await query(query_text, params);

    console.log(`✅ Deleted ${result.rows.length} campaign(s)`);

    res.json({
      success: true,
      message: `Successfully deleted ${result.rows.length} campaign(s)`,
      deleted: result.rows.length,
      campaigns: result.rows
    });
  } catch (error) {
    console.error('❌ Error bulk deleting campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaigns',
      message: error.message
    });
  }
});

/**
 * PUT /api/campaigns/:campaignId
 * Update campaign details
 */
router.put('/:campaignId', async (req, res) => {
  console.log(`📝 Updating campaign ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;
    const {
      campaignName,
      emailTone,
      includePrice,
      maxEmailsPerDay,
      followUpDays,
      followUpSequence,
      status
    } = req.body;

    // Check if campaign exists
    const existing = await query(
      'SELECT * FROM campaigns WHERE campaign_id = $1',
      [campaignId]
    );

    if (existing.rows.length === 0) {
      console.log(`❌ Campaign ${campaignId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Update campaign
    const result = await query(
      `UPDATE campaigns SET
        campaign_name = COALESCE($1, campaign_name),
        email_tone = COALESCE($2, email_tone),
        include_price = COALESCE($3, include_price),
        max_emails_per_day = COALESCE($4, max_emails_per_day),
        follow_up_days = COALESCE($5, follow_up_days),
        follow_up_sequence = COALESCE($6, follow_up_sequence),
        status = COALESCE($7, status),
        updated_at = NOW()
      WHERE campaign_id = $8
      RETURNING *`,
      [
        campaignName,
        emailTone,
        includePrice,
        maxEmailsPerDay,
        followUpDays,
        followUpSequence ? JSON.stringify(followUpSequence) : null,
        status,
        campaignId
      ]
    );

    console.log(`✅ Campaign ${campaignId} updated successfully`);

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      campaign: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign',
      message: error.message
    });
  }
});

/**
 * DELETE /api/campaigns/:campaignId
 * Delete a campaign
 */
router.delete('/:campaignId', async (req, res) => {
  console.log(`🗑️  Deleting campaign ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;

    const result = await query(
      'DELETE FROM campaigns WHERE campaign_id = $1 RETURNING *',
      [campaignId]
    );

    if (result.rows.length === 0) {
      console.log(`❌ Campaign ${campaignId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    console.log(`✅ Campaign ${campaignId} deleted successfully`);

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
      campaign: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign',
      message: error.message
    });
  }
});

// ============================================================
// PARAMETERIZED ROUTES (must come AFTER specific routes)
// ============================================================

/**
 * GET /api/campaigns/:campaignId/scheduled
 * Get scheduled emails for a specific campaign
 */
router.get('/:campaignId/scheduled', async (req, res) => {
  console.log(`📅 Fetching scheduled emails for campaign ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;

    // Get campaign - check both id (integer) and campaign_id (string)
    let campaign;
    if (!isNaN(parseInt(campaignId))) {
      campaign = await query(
        'SELECT * FROM campaigns WHERE id = $1 OR campaign_id = $2',
        [parseInt(campaignId), campaignId]
      );
    } else {
      campaign = await query(
        'SELECT * FROM campaigns WHERE campaign_id = $1',
        [campaignId]
      );
    }

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    const actualCampaignId = campaign.rows[0].campaign_id;

    // Get all scheduled emails for this campaign
    const scheduledEmails = await query(
      `SELECT 
        id,
        campaign_id,
        buyer_email,
        email_subject,
        email_content,
        scheduled_for,
        status,
        created_at,
        user_id,
        buyer_id,
        buyer_name,
        domain_name,
        EXTRACT(EPOCH FROM (scheduled_for - NOW())) as seconds_until_send,
        CASE 
          WHEN scheduled_for <= NOW() THEN 'ready'
          WHEN scheduled_for <= NOW() + INTERVAL '1 hour' THEN 'soon'
          ELSE 'waiting'
        END as send_status
       FROM scheduled_emails
       WHERE campaign_id = $1
       ORDER BY scheduled_for ASC`,
      [actualCampaignId]
    );

    console.log(`✅ Found ${scheduledEmails.rows.length} scheduled emails`);

    res.json({
      success: true,
      campaign: {
        id: campaign.rows[0].id,
        campaign_id: campaign.rows[0].campaign_id,
        campaign_name: campaign.rows[0].campaign_name,
        domain_name: campaign.rows[0].domain_name
      },
      count: scheduledEmails.rows.length,
      scheduled: scheduledEmails.rows
    });
  } catch (error) {
    console.error('Error fetching scheduled emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scheduled emails',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/:campaignId/stats
 * Get campaign statistics
 */
router.get('/:campaignId/stats', async (req, res) => {
  console.log(`📊 Fetching stats for campaign ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;

    // Get campaign info - check both id (integer) and campaign_id (string)
    let campaign;
    if (!isNaN(parseInt(campaignId))) {
      campaign = await query(
        'SELECT * FROM campaigns WHERE id = $1 OR campaign_id = $2',
        [parseInt(campaignId), campaignId]
      );
    } else {
      campaign = await query(
        'SELECT * FROM campaigns WHERE campaign_id = $1',
        [campaignId]
      );
    }

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    const actualCampaignId = campaign.rows[0].campaign_id;

    // Get sent emails count
    const sentEmails = await query(
      'SELECT COUNT(*) as count FROM sent_emails WHERE campaign_id = $1',
      [actualCampaignId]
    );

    // Get scheduled emails count
    const scheduledEmails = await query(
      `SELECT COUNT(*) as count FROM scheduled_emails 
       WHERE campaign_id = $1 AND status = 'pending'`,
      [actualCampaignId]
    );

    // Get engagement stats directly from sent_emails table
    const responseStats = await query(
      `SELECT 
        COUNT(CASE WHEN is_opened = true THEN 1 END) as opened,
        COUNT(CASE WHEN is_clicked = true THEN 1 END) as clicked,
        COUNT(CASE WHEN delivery_status = 'bounced' THEN 1 END) as bounced,
        COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered
       FROM sent_emails
       WHERE campaign_id = $1`,
      [actualCampaignId]
    );

    const sent = parseInt(sentEmails.rows[0].count);
    const delivered = parseInt(responseStats.rows[0].delivered);
    const opened = parseInt(responseStats.rows[0].opened);
    const clicked = parseInt(responseStats.rows[0].clicked);

    // Calculate rates
    const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(2) : 0;
    const clickRate = opened > 0 ? ((clicked / opened) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      campaign: campaign.rows[0],
      stats: {
        sent: sent,
        scheduled: parseInt(scheduledEmails.rows[0].count),
        delivered: delivered,
        opened: opened,
        clicked: clicked,
        bounced: parseInt(responseStats.rows[0].bounced),
        openRate: `${openRate}%`,
        clickRate: `${clickRate}%`
      }
    });
  } catch (error) {
    console.error('Error getting campaign stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/:campaignId
 * Get campaign details with buyers
 */
router.get('/:campaignId', async (req, res) => {
  console.log(`📄 Fetching campaign details for ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;

    // Get campaign
    const campaign = await query(
      'SELECT * FROM campaigns WHERE campaign_id = $1',
      [campaignId]
    );

    if (campaign.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Get buyers for this campaign
    const buyers = await query(
      'SELECT * FROM campaign_buyers WHERE campaign_id = $1',
      [campaignId]
    );

    res.json({
      success: true,
      campaign: campaign.rows[0],
      buyers: buyers.rows
    });
  } catch (error) {
    console.error('Error getting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaign details',
      message: error.message
    });
  }
});

/**
 * PUT /api/campaigns/:campaignId/ai-settings
 * Update AI agent settings for a campaign
 */
router.put('/:campaignId/ai-settings', async (req, res) => {
  console.log(`⚙️  Updating AI settings for campaign ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;
    const { 
      autoResponseEnabled, 
      notificationEmail,
      minimumPrice,
      negotiationStrategy,
      responseStyle,
      responseLength,
      customInstructions,
      highlightFeatures
    } = req.body;

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (typeof autoResponseEnabled === 'boolean') {
      updates.push(`auto_response_enabled = $${paramIndex++}`);
      values.push(autoResponseEnabled);
      console.log(`   Auto-response: ${autoResponseEnabled ? 'ON' : 'OFF'}`);
    }

    if (notificationEmail !== undefined) {
      updates.push(`notification_email = $${paramIndex++}`);
      values.push(notificationEmail || null);
      console.log(`   Notification email: ${notificationEmail || '(none)'}`);
    }

    if (minimumPrice !== undefined) {
      updates.push(`minimum_price = $${paramIndex++}`);
      values.push(minimumPrice || null);
      console.log(`   Minimum price: $${minimumPrice || 'not set'}`);
    }

    if (negotiationStrategy) {
      updates.push(`negotiation_strategy = $${paramIndex++}`);
      values.push(negotiationStrategy);
      console.log(`   Negotiation: ${negotiationStrategy}`);
    }

    if (responseStyle) {
      updates.push(`response_style = $${paramIndex++}`);
      values.push(responseStyle);
      console.log(`   Response style: ${responseStyle}`);
    }

    if (responseLength) {
      updates.push(`response_length = $${paramIndex++}`);
      values.push(responseLength);
      console.log(`   Response length: ${responseLength}`);
    }

    if (customInstructions !== undefined) {
      updates.push(`custom_instructions = $${paramIndex++}`);
      values.push(customInstructions || null);
      console.log(`   Custom instructions: ${customInstructions ? 'set' : 'none'}`);
    }

    if (highlightFeatures !== undefined) {
      updates.push(`highlight_features = $${paramIndex++}`);
      values.push(highlightFeatures || null);
      console.log(`   Highlight features: ${highlightFeatures ? 'set' : 'none'}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No settings provided',
        message: 'Provide at least one AI setting to update'
      });
    }

    values.push(campaignId);
    const queryText = `
      UPDATE campaigns 
      SET ${updates.join(', ')}
      WHERE campaign_id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    console.log('✅ AI settings updated successfully');

    res.json({
      success: true,
      message: 'AI settings updated successfully',
      campaign: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update AI settings',
      message: error.message
    });
  }
});

/**
 * GET /api/campaigns/:campaignId/ai-settings
 * Get AI agent settings for a campaign
 */
router.get('/:campaignId/ai-settings', async (req, res) => {
  console.log(`⚙️  Fetching AI settings for campaign ${req.params.campaignId}...`);
  
  try {
    const { campaignId } = req.params;

    const result = await query(
      `SELECT 
        campaign_id,
        campaign_name,
        auto_response_enabled,
        notification_email,
        minimum_price,
        negotiation_strategy,
        response_style,
        response_length,
        custom_instructions,
        highlight_features
       FROM campaigns 
       WHERE campaign_id = $1`,
      [campaignId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI settings',
      message: error.message
    });
  }
});

module.exports = router;
