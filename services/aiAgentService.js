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
    description: 'Create a new email campaign for a domain. Use this when user wants to create, start, or set up a campaign.',
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

Be conversational, friendly, and proactive. When user wants to create a campaign, ask for:
- Domain name
- Campaign name (suggest one based on domain)
- Asking price
- (Optional) Target industry/keywords

Always confirm actions before executing them. Keep responses concise but informative.`;

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
         VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
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
        message: `✅ Campaign "${campaignName}" created successfully for ${domainName} at $${askingPrice}`
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

