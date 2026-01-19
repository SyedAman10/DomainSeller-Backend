const OpenAI = require('openai');
const pool = require('../config/database');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';

// Available functions for the AI agent
const AVAILABLE_FUNCTIONS = {
  createCampaign: {
    name: 'createCampaign',
    description: 'Create a new email campaign for a domain. Use this when user confirms they want to create a campaign and provides basic details.',
    parameters: {
      type: 'object',
      properties: {
        domainName: {
          type: 'string',
          description: 'The domain name for the campaign (e.g., "example.com")'
        },
        campaignName: {
          type: 'string',
          description: 'Name/title for the campaign'
        },
        askingPrice: {
          type: 'number',
          description: 'Asking price for the domain in USD'
        },
        targetIndustry: {
          type: 'string',
          description: 'Target industry or keywords for lead generation (optional)'
        }
      },
      required: ['domainName', 'campaignName', 'askingPrice']
    }
  },
  checkLandingPage: {
    name: 'checkLandingPage',
    description: 'Check if a landing page exists for a specific domain',
    parameters: {
      type: 'object',
      properties: {
        domainName: {
          type: 'string',
          description: 'The domain name to check for landing page'
        }
      },
      required: ['domainName']
    }
  },
  findMatchedBuyers: {
    name: 'findMatchedBuyers',
    description: 'Find potential buyers matched to a domain based on industry and keywords',
    parameters: {
      type: 'object',
      properties: {
        domainName: {
          type: 'string',
          description: 'The domain name to find buyers for'
        },
        targetIndustry: {
          type: 'string',
          description: 'Target industry for matching buyers'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of buyers to return (default: 50)'
        }
      },
      required: ['domainName']
    }
  },
  configureCampaignSettings: {
    name: 'configureCampaignSettings',
    description: 'Configure campaign settings including follow-ups, landing page, and email scheduling',
    parameters: {
      type: 'object',
      properties: {
        campaignId: {
          type: 'string',
          description: 'The campaign ID to configure'
        },
        includeFollowUps: {
          type: 'boolean',
          description: 'Whether to include follow-up emails'
        },
        followUpDays: {
          type: 'array',
          items: { type: 'number' },
          description: 'Days after initial email to send follow-ups (e.g., [3, 7, 14])'
        },
        includeLandingPage: {
          type: 'boolean',
          description: 'Whether to include landing page link in emails'
        },
        landingPageUrl: {
          type: 'string',
          description: 'Landing page URL if including'
        },
        scheduleDate: {
          type: 'string',
          description: 'Date to schedule emails (ISO format) or "now" for immediate send'
        },
        manualCompose: {
          type: 'boolean',
          description: 'Whether user wants to manually compose emails'
        }
      },
      required: ['campaignId']
    }
  },
  getUserCampaigns: {
    name: 'getUserCampaigns',
    description: 'Get all campaigns for the current user. Use this when user asks about their campaigns, domains, or wants to see what they have.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'draft', 'paused', 'all'],
          description: 'Filter campaigns by status (default: all)'
        }
      }
    }
  },
  getCampaignStats: {
    name: 'getCampaignStats',
    description: 'Get detailed statistics for a specific campaign. Use when user asks about campaign performance, emails sent, opens, clicks, etc.',
    parameters: {
      type: 'object',
      properties: {
        campaignId: {
          type: 'string',
          description: 'The campaign ID or domain name'
        }
      },
      required: ['campaignId']
    }
  }
};

// System prompt for the AI agent
const SYSTEM_PROMPT = `You are a helpful AI assistant for a domain selling platform. You help users:
1. Create email campaigns for their domains
2. View and manage their campaigns
3. Get insights about their domain portfolio
4. Understand campaign performance

CAMPAIGN CREATION FLOW - MANDATORY STEPS:
When user wants to create a campaign, you MUST follow ALL these steps IN ORDER. DO NOT create the campaign until you have ALL the information:

STEP 1: Gather BASIC information first
- Domain name
- Campaign name (suggest one based on domain)
- Asking price
- (Optional) Target industry/keywords

STEP 2: BEFORE creating campaign, ask about BUYER MATCHING
- "Would you like me to find matched buyers for this domain based on industry/keywords?"
- If yes, call findMatchedBuyers and show them how many matches were found
- Ask if they want to proceed with these buyers or search for different ones

STEP 3: Ask about LANDING PAGE
- "Do you have a landing page for this domain? If so, please provide the URL (e.g., https://yoursite.com/domains/example)"
- If they don't have one, offer to note this for future setup
- Explain that landing pages increase buyer engagement by 40%

STEP 4: Ask about FOLLOW-UP SETTINGS
- "Would you like to include follow-up emails? (Recommended - increases response rates by 3x)"
- If yes: "How many days between follow-ups? Default is 3, 7, and 14 days"
- Explain that follow-ups are crucial for domain sales

STEP 5: Ask about EMAIL COMPOSITION
- "Would you like to manually compose your email, or should I generate a professional one for you?"
- If manual: explain they'll compose it in the next step
- If auto-generate: explain we'll create a personalized email for each buyer

STEP 6: Ask about SCHEDULING
- "When should I schedule these emails?"
  - "Send immediately"
  - "Schedule for specific date/time"
- If scheduling, ask for the date and time

STEP 7: ONLY AFTER ALL ABOVE - Create the campaign
- Confirm ALL settings before creating
- Show a summary of what will be created
- Ask for final confirmation
- Then call createCampaign with status 'draft'

STEP 8: AFTER campaign creation - Configure it
- Call configureCampaignSettings with all the collected information
- Confirm the campaign is ready
- Explain next steps (emails will be sent, they can monitor in dashboard)

CRITICAL RULES:
- NEVER skip asking about buyers, landing page, follow-ups, email composition, and scheduling
- ALWAYS get explicit confirmation before creating the campaign
- If user seems uncertain about any option, explain the benefits
- Keep track of their answers and use them when creating/configuring the campaign

Be conversational, friendly, and consultative. Guide them through best practices but respect their choices. Keep responses concise but informative.`;

class AIAgentService {
  // Get or create chat session
  async getOrCreateSession(userId) {
    const sessionId = `session_${userId}_${Date.now()}`;
    
    const result = await pool.query(
      `INSERT INTO ai_chat_sessions (user_id, session_id, started_at, last_message_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING *`,
      [userId, sessionId]
    );
    
    return result.rows[0];
  }

  // Get recent session for user
  async getRecentSession(userId) {
    const result = await pool.query(
      `SELECT * FROM ai_chat_sessions
       WHERE user_id = $1 AND is_active = true
       ORDER BY last_message_at DESC
       LIMIT 1`,
      [userId]
    );
    
    return result.rows[0];
  }

  // Save message to database
  async saveMessage(sessionId, userId, role, content, metadata = {}) {
    await pool.query(
      `INSERT INTO ai_chat_messages 
       (session_id, user_id, role, content, function_name, function_args, function_response, tokens_used, model)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        sessionId,
        userId,
        role,
        content,
        metadata.function_name || null,
        metadata.function_args || null,
        metadata.function_response || null,
        metadata.tokens_used || null,
        metadata.model || AI_MODEL
      ]
    );

    // Update session
    await pool.query(
      `UPDATE ai_chat_sessions 
       SET last_message_at = NOW(), message_count = message_count + 1
       WHERE session_id = $1`,
      [sessionId]
    );
  }

  // Get conversation history
  async getConversationHistory(sessionId, limit = 20) {
    const result = await pool.query(
      `SELECT role, content, function_name, function_args, function_response
       FROM ai_chat_messages
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [sessionId, limit]
    );
    
    return result.rows.reverse();
  }

  // Get or set memory
  async getMemory(userId, key) {
    const result = await pool.query(
      `SELECT memory_value FROM ai_agent_memory
       WHERE user_id = $1 AND memory_key = $2
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId, key]
    );
    
    return result.rows[0]?.memory_value;
  }

  async setMemory(userId, key, value, expiresInDays = null) {
    const expiresAt = expiresInDays ? `NOW() + INTERVAL '${expiresInDays} days'` : 'NULL';
    
    await pool.query(
      `INSERT INTO ai_agent_memory (user_id, memory_key, memory_value, expires_at, updated_at)
       VALUES ($1, $2, $3, ${expiresAt}, NOW())
       ON CONFLICT (user_id, memory_key)
       DO UPDATE SET memory_value = $3, updated_at = NOW(), expires_at = ${expiresAt}`,
      [userId, key, JSON.stringify(value)]
    );
  }

  // Execute function call
  async executeFunction(functionName, args, userId) {
    console.log(`🔧 Executing function: ${functionName}`, args);
    
    switch (functionName) {
      case 'createCampaign':
        return await this.createCampaign(args, userId);
      
      case 'checkLandingPage':
        return await this.checkLandingPage(args, userId);
      
      case 'findMatchedBuyers':
        return await this.findMatchedBuyers(args, userId);
      
      case 'configureCampaignSettings':
        return await this.configureCampaignSettings(args, userId);
      
      case 'getUserCampaigns':
        return await this.getUserCampaigns(args, userId);
      
      case 'getCampaignStats':
        return await this.getCampaignStats(args, userId);
      
      default:
        return { error: `Unknown function: ${functionName}` };
    }
  }

  // Function implementations
  async createCampaign({ domainName, campaignName, askingPrice, targetIndustry }, userId) {
    try {
      const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await pool.query(
        `INSERT INTO campaigns 
         (campaign_id, user_id, campaign_name, domain_name, asking_price, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'draft', NOW(), NOW())
         RETURNING *`,
        [campaignId, userId, campaignName, domainName, askingPrice]
      );
      
      const campaign = result.rows[0];
      
      // Store target industry in memory if provided
      if (targetIndustry) {
        await this.setMemory(userId, `campaign_${campaign.id}_target`, { targetIndustry });
      }
      
      return {
        success: true,
        campaign: {
          id: campaign.id,
          campaignId: campaign.campaign_id,
          name: campaign.campaign_name,
          domain: campaign.domain_name,
          price: campaign.asking_price,
          status: campaign.status
        },
        message: `✅ Campaign "${campaignName}" created as DRAFT for ${domainName} at $${askingPrice}. Now let's configure the settings!`
      };
    } catch (error) {
      console.error('Error creating campaign:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserCampaigns({ status = 'all' }, userId) {
    try {
      let query = `
        SELECT 
          id,
          campaign_id,
          campaign_name,
          domain_name,
          asking_price,
          status,
          created_at,
          (SELECT COUNT(*) FROM sent_emails WHERE campaign_id = campaigns.campaign_id) as emails_sent,
          (SELECT COUNT(*) FROM sent_emails WHERE campaign_id = campaigns.campaign_id AND is_opened = true) as emails_opened
        FROM campaigns
        WHERE user_id = $1
      `;
      
      const params = [userId];
      
      if (status !== 'all') {
        query += ` AND status = $2`;
        params.push(status);
      }
      
      query += ` ORDER BY created_at DESC`;
      
      const result = await pool.query(query, params);
      
      return {
        success: true,
        campaigns: result.rows,
        count: result.rows.length,
        message: `Found ${result.rows.length} campaign(s)`
      };
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getCampaignStats({ campaignId }, userId) {
    try {
      // Try to find by ID or domain name
      const campaignQuery = await pool.query(
        `SELECT * FROM campaigns 
         WHERE user_id = $1 AND (id::text = $2 OR campaign_id = $2 OR domain_name ILIKE $2)
         LIMIT 1`,
        [userId, campaignId]
      );
      
      if (campaignQuery.rows.length === 0) {
        return { success: false, error: 'Campaign not found' };
      }
      
      const campaign = campaignQuery.rows[0];
      
      const statsQuery = await pool.query(
        `SELECT 
           COUNT(*) as total_sent,
           COUNT(*) FILTER (WHERE is_opened = true) as opened,
           COUNT(*) FILTER (WHERE is_clicked = true) as clicked,
           COUNT(*) FILTER (WHERE is_replied = true) as replied
         FROM sent_emails
         WHERE campaign_id = $1`,
        [campaign.campaign_id]
      );
      
      const stats = statsQuery.rows[0];
      
      return {
        success: true,
        campaign: {
          id: campaign.id,
          name: campaign.campaign_name,
          domain: campaign.domain_name,
          price: campaign.asking_price,
          status: campaign.status
        },
        stats: {
          totalSent: parseInt(stats.total_sent),
          opened: parseInt(stats.opened),
          clicked: parseInt(stats.clicked),
          replied: parseInt(stats.replied),
          openRate: stats.total_sent > 0 ? ((stats.opened / stats.total_sent) * 100).toFixed(1) : 0,
          clickRate: stats.total_sent > 0 ? ((stats.clicked / stats.total_sent) * 100).toFixed(1) : 0
        }
      };
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async checkLandingPage({ domainName }, userId) {
    try {
      // Check if a landing page exists for this domain
      // This is a placeholder - you can integrate with actual landing page service
      
      // For now, we'll return a simple response
      return {
        success: true,
        exists: false,
        message: `No landing page found for ${domainName}. You can create one to increase buyer engagement by up to 40%!`,
        suggestion: `Recommended URL format: https://yoursite.com/domains/${domainName}`
      };
    } catch (error) {
      console.error('Error checking landing page:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async findMatchedBuyers({ domainName, targetIndustry, limit = 50 }, userId) {
    try {
      let query = `
        SELECT 
          buyer_id,
          buyer_name,
          buyer_email,
          company_name,
          industry,
          country,
          city
        FROM buyers
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;
      
      // Filter by target industry if provided
      if (targetIndustry) {
        paramCount++;
        query += ` AND (industry ILIKE $${paramCount} OR keywords ILIKE $${paramCount})`;
        params.push(`%${targetIndustry}%`);
      }
      
      // Add limit
      paramCount++;
      query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
      params.push(limit);
      
      const result = await pool.query(query, params);
      
      return {
        success: true,
        buyers: result.rows,
        count: result.rows.length,
        message: `Found ${result.rows.length} matched buyers${targetIndustry ? ` in ${targetIndustry} industry` : ''}`
      };
    } catch (error) {
      console.error('Error finding matched buyers:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async configureCampaignSettings({
    campaignId,
    includeFollowUps = true,
    followUpDays = [3, 7, 14],
    includeLandingPage = false,
    landingPageUrl = null,
    scheduleDate = 'now',
    manualCompose = false
  }, userId) {
    try {
      // Find the campaign
      const campaignQuery = await pool.query(
        `SELECT * FROM campaigns 
         WHERE user_id = $1 AND (id::text = $2 OR campaign_id = $2)
         LIMIT 1`,
        [userId, campaignId]
      );
      
      if (campaignQuery.rows.length === 0) {
        return { success: false, error: 'Campaign not found' };
      }
      
      const campaign = campaignQuery.rows[0];
      
      // Update campaign settings
      await pool.query(
        `UPDATE campaigns 
         SET 
           include_followups = $1,
           followup_days = $2,
           include_landing_page = $3,
           landing_page_url = $4,
           manual_compose = $5,
           updated_at = NOW()
         WHERE id = $6`,
        [
          includeFollowUps,
          followUpDays ? `{${followUpDays.join(',')}}` : null,
          includeLandingPage,
          landingPageUrl,
          manualCompose,
          campaign.id
        ]
      );
      
      return {
        success: true,
        message: `✅ Campaign settings configured successfully!`,
        settings: {
          followUps: includeFollowUps ? `Enabled (${followUpDays.join(', ')} days)` : 'Disabled',
          landingPage: includeLandingPage ? landingPageUrl : 'Not included',
          scheduling: scheduleDate === 'now' ? 'Immediate send' : `Scheduled for ${scheduleDate}`,
          emailComposition: manualCompose ? 'Manual' : 'Auto-generated'
        },
        nextStep: manualCompose 
          ? 'Please compose your email in the campaign dashboard'
          : 'Emails are ready to be sent! Visit your dashboard to activate the campaign.'
      };
    } catch (error) {
      console.error('Error configuring campaign:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Main chat function
  async chat(userId, userMessage, sessionId = null) {
    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🤖 AI AGENT CHAT REQUEST`);
      console.log(`${'='.repeat(80)}`);
      console.log(`👤 User ID: ${userId}`);
      console.log(`💬 Message: "${userMessage}"`);
      console.log(`🆔 Session ID: ${sessionId || 'NEW'}`);
      
      // Get or create session
      let session;
      if (sessionId) {
        const result = await pool.query(
          'SELECT * FROM ai_chat_sessions WHERE session_id = $1 AND user_id = $2',
          [sessionId, userId]
        );
        session = result.rows[0];
      }
      
      if (!session) {
        session = await this.getOrCreateSession(userId);
        console.log(`✨ Created new session: ${session.session_id}`);
      }

      // Save user message
      await this.saveMessage(session.session_id, userId, 'user', userMessage);

      // Get conversation history
      const history = await this.getConversationHistory(session.session_id, 10);
      
      // Build messages for OpenAI
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(msg => ({
          role: msg.role,
          content: msg.content || (msg.function_response ? JSON.stringify(msg.function_response) : '')
        })),
        { role: 'user', content: userMessage }
      ];

      console.log(`📚 Context: ${messages.length} messages`);
      console.log(`🚀 Calling OpenAI (${AI_MODEL})...`);

      // Call OpenAI with function calling
      let response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: messages,
        functions: Object.values(AVAILABLE_FUNCTIONS),
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 1000
      });

      let assistantMessage = response.choices[0].message;
      console.log(`📊 Tokens used: ${response.usage.total_tokens}`);

      // Handle function calling
      if (assistantMessage.function_call) {
        const functionName = assistantMessage.function_call.name;
        const functionArgs = JSON.parse(assistantMessage.function_call.arguments);
        
        console.log(`🔧 Function call requested: ${functionName}`);
        console.log(`📝 Arguments:`, functionArgs);

        // Execute the function
        const functionResult = await this.executeFunction(functionName, functionArgs, userId);
        
        console.log(`✅ Function result:`, functionResult);

        // Save function call
        await this.saveMessage(
          session.session_id,
          userId,
          'function',
          null,
          {
            function_name: functionName,
            function_args: functionArgs,
            function_response: functionResult,
            tokens_used: response.usage.total_tokens,
            model: AI_MODEL
          }
        );

        // Get final response from AI with function result
        const finalResponse = await openai.chat.completions.create({
          model: AI_MODEL,
          messages: [
            ...messages,
            assistantMessage,
            {
              role: 'function',
              name: functionName,
              content: JSON.stringify(functionResult)
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        });

        assistantMessage = finalResponse.choices[0].message;
        console.log(`📊 Final tokens used: ${finalResponse.usage.total_tokens}`);
      }

      // Save assistant response
      await this.saveMessage(
        session.session_id,
        userId,
        'assistant',
        assistantMessage.content,
        {
          tokens_used: response.usage.total_tokens,
          model: AI_MODEL
        }
      );

      console.log(`✅ Response: "${assistantMessage.content}"`);
      console.log(`${'='.repeat(80)}\n`);

      return {
        success: true,
        sessionId: session.session_id,
        message: assistantMessage.content,
        tokensUsed: response.usage.total_tokens
      };

    } catch (error) {
      console.error('❌ AI Agent Error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Sorry, I encountered an error. Please try again.'
      };
    }
  }

  // Get chat history
  async getChatHistory(userId, sessionId, limit = 50) {
    try {
      const result = await pool.query(
        `SELECT 
           role,
           content,
           function_name,
           function_response,
           created_at
         FROM ai_chat_messages
         WHERE session_id = $1 AND user_id = $2
         ORDER BY created_at ASC
         LIMIT $3`,
        [sessionId, userId, limit]
      );

      return {
        success: true,
        messages: result.rows
      };
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new AIAgentService();

