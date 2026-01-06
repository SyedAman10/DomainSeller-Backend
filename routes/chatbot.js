const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { 
  generateChatbotResponse, 
  scoreLeadFromConversation,
  getFinalMessage 
} = require('../services/chatbotService');

/**
 * POST /backend/chatbot/message
 * Send a message to the chatbot and get a response
 * 
 * Body:
 * {
 *   "message": "User's message",
 *   "sessionId": "unique-session-id" (optional, will be created if not provided),
 *   "userEmail": "user@example.com" (optional),
 *   "userName": "John Doe" (optional)
 * }
 */
router.post('/message', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { message, sessionId, userEmail, userName } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('🤖 CHATBOT MESSAGE REQUEST');
    console.log(`   Message: ${message}`);
    console.log(`   Session ID: ${sessionId || 'NEW SESSION'}`);
    console.log(`   User Email: ${userEmail || 'N/A'}`);
    console.log('='.repeat(60));

    // Get or create session
    let session;
    let conversationHistory = [];

    if (sessionId) {
      // Fetch existing session
      const sessionResult = await client.query(
        `SELECT * FROM chatbot_sessions WHERE session_id = $1`,
        [sessionId]
      );

      if (sessionResult.rows.length > 0) {
        session = sessionResult.rows[0];
        conversationHistory = session.conversation_history || [];
        console.log(`   ✅ Found existing session with ${conversationHistory.length} messages`);
      } else {
        console.log('   ⚠️  Session ID provided but not found, creating new session');
      }
    }

    if (!session) {
      // Create new session
      const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const insertResult = await client.query(
        `INSERT INTO chatbot_sessions (session_id, user_email, user_name, conversation_history, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [newSessionId, userEmail || null, userName || null, JSON.stringify([])]
      );

      session = insertResult.rows[0];
      console.log(`   ✅ Created new session: ${newSessionId}`);
    }

    // Add user message to history
    conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Generate chatbot response
    const chatbotResult = await generateChatbotResponse({
      userMessage: message,
      conversationHistory: conversationHistory,
      sessionId: session.session_id
    });

    if (!chatbotResult.success) {
      throw new Error(chatbotResult.error || 'Failed to generate response');
    }

    // Add bot response to history
    conversationHistory.push({
      role: 'assistant',
      content: chatbotResult.response,
      intent: chatbotResult.intent,
      timestamp: new Date().toISOString()
    });

    // Update session in database
    await client.query(
      `UPDATE chatbot_sessions 
       SET conversation_history = $1, 
           updated_at = NOW(),
           message_count = message_count + 1
       WHERE session_id = $2`,
      [JSON.stringify(conversationHistory), session.session_id]
    );

    console.log('✅ Session updated successfully');

    // Auto-score after 3+ messages (to capture early drop-offs)
    let autoScore = null;
    const messageCount = conversationHistory.length;
    
    if (messageCount >= 3 && messageCount % 2 === 0) { // Score every 2 messages after 3
      try {
        const leadScore = scoreLeadFromConversation(conversationHistory);
        
        // Update score in database
        await client.query(
          `UPDATE chatbot_sessions 
           SET lead_score = $1,
               lead_classification = $2,
               qualification_data = $3,
               scored_at = NOW()
           WHERE session_id = $4`,
          [
            leadScore.score,
            leadScore.classification,
            JSON.stringify(leadScore.qualificationData),
            session.session_id
          ]
        );
        
        autoScore = {
          score: leadScore.score,
          classification: leadScore.classification
        };
        
        console.log(`🎯 Auto-scored: ${leadScore.score} (${leadScore.classification})`);
      } catch (error) {
        console.error('⚠️  Auto-scoring failed:', error.message);
      }
    }

    res.json({
      success: true,
      sessionId: session.session_id,
      response: chatbotResult.response,
      intent: chatbotResult.intent,
      messageCount: conversationHistory.length,
      autoScore: autoScore // Include auto-score if available
    });

  } catch (error) {
    console.error('❌ Chatbot message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process message'
    });
  } finally {
    client.release();
  }
});

/**
 * POST /backend/chatbot/score
 * Score the current conversation and classify the lead
 * 
 * Body:
 * {
 *   "sessionId": "unique-session-id" (required)
 * }
 */
router.post('/score', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 LEAD SCORING REQUEST');
    console.log(`   Session ID: ${sessionId}`);
    console.log('='.repeat(60));

    // Fetch session
    const sessionResult = await client.query(
      `SELECT * FROM chatbot_sessions WHERE session_id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const session = sessionResult.rows[0];
    const conversationHistory = session.conversation_history || [];

    if (conversationHistory.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Not enough conversation data to score (minimum 2 messages required)'
      });
    }

    // Score the lead
    const leadScore = scoreLeadFromConversation(conversationHistory);

    // Update session with lead score
    await client.query(
      `UPDATE chatbot_sessions 
       SET lead_score = $1,
           lead_classification = $2,
           qualification_data = $3,
           scored_at = NOW()
       WHERE session_id = $4`,
      [
        leadScore.score,
        leadScore.classification,
        JSON.stringify(leadScore.qualificationData),
        sessionId
      ]
    );

    // Get final message based on classification
    const finalMessage = getFinalMessage(
      leadScore.classification,
      process.env.CONTACT_NAME || 'our team',
      process.env.SIGNUP_LINK || 'https://3vltn.com/signup'
    );

    console.log('✅ Lead scored successfully');
    console.log(`   Score: ${leadScore.score}`);
    console.log(`   Classification: ${leadScore.classification}`);

    res.json({
      success: true,
      sessionId: sessionId,
      leadScore: leadScore,
      finalMessage: finalMessage,
      recommendedAction: leadScore.followUpAction
    });

  } catch (error) {
    console.error('❌ Lead scoring error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to score lead'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /backend/chatbot/session/:sessionId
 * Get full session details including conversation history and score
 */
router.get('/session/:sessionId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { sessionId } = req.params;

    const sessionResult = await client.query(
      `SELECT * FROM chatbot_sessions WHERE session_id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const session = sessionResult.rows[0];

    res.json({
      success: true,
      session: {
        sessionId: session.session_id,
        userEmail: session.user_email,
        userName: session.user_name,
        conversationHistory: session.conversation_history,
        messageCount: session.message_count,
        leadScore: session.lead_score,
        leadClassification: session.lead_classification,
        qualificationData: session.qualification_data,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        scoredAt: session.scored_at
      }
    });

  } catch (error) {
    console.error('❌ Get session error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get session'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /backend/chatbot/leads
 * Get all scored leads with optional filtering
 * 
 * Query params:
 * - classification: hot, warm, cold
 * - minScore: minimum score
 * - limit: number of results (default 50)
 * - includeUnscored: include sessions without scores (default false)
 */
router.get('/leads', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { classification, minScore, limit = 50, includeUnscored = 'false' } = req.query;

    let query = `SELECT * FROM chatbot_sessions WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (includeUnscored === 'false') {
      query += ` AND lead_score IS NOT NULL`;
    }

    if (classification) {
      query += ` AND lead_classification = $${paramCount}`;
      params.push(classification);
      paramCount++;
    }

    if (minScore) {
      query += ` AND lead_score >= $${paramCount}`;
      params.push(parseInt(minScore));
      paramCount++;
    }

    query += ` ORDER BY lead_score DESC NULLS LAST, updated_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await client.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      leads: result.rows.map(row => ({
        sessionId: row.session_id,
        userEmail: row.user_email,
        userName: row.user_name,
        leadScore: row.lead_score,
        leadClassification: row.lead_classification,
        qualificationData: row.qualification_data,
        messageCount: row.message_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        scoredAt: row.scored_at
      }))
    });

  } catch (error) {
    console.error('❌ Get leads error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get leads'
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /backend/chatbot/session/:sessionId
 * Delete a chatbot session (for testing/cleanup)
 */
router.delete('/session/:sessionId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { sessionId } = req.params;

    const result = await client.query(
      `DELETE FROM chatbot_sessions WHERE session_id = $1 RETURNING session_id`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session deleted successfully',
      sessionId: result.rows[0].session_id
    });

  } catch (error) {
    console.error('❌ Delete session error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete session'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /backend/chatbot/conversations
 * Get all conversations including unscored ones
 * 
 * Query params:
 * - minMessages: minimum message count (default 1)
 * - hasEmail: filter by email presence (true/false)
 * - limit: number of results (default 100)
 */
router.get('/conversations', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { minMessages = 1, hasEmail, limit = 100 } = req.query;

    let query = `SELECT * FROM chatbot_sessions WHERE message_count >= $1`;
    const params = [parseInt(minMessages)];
    let paramCount = 2;

    if (hasEmail === 'true') {
      query += ` AND user_email IS NOT NULL`;
    } else if (hasEmail === 'false') {
      query += ` AND user_email IS NULL`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await client.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      conversations: result.rows.map(row => ({
        sessionId: row.session_id,
        userEmail: row.user_email,
        userName: row.user_name,
        messageCount: row.message_count,
        leadScore: row.lead_score,
        leadClassification: row.lead_classification,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        hasScore: row.lead_score !== null
      }))
    });

  } catch (error) {
    console.error('❌ Get conversations error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get conversations'
    });
  } finally {
    client.release();
  }
});

/**
 * POST /backend/chatbot/score-all
 * Score all unscored conversations that have 2+ messages
 */
router.post('/score-all', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('📊 BATCH SCORING - Starting...');
    console.log('='.repeat(60));

    // Get all unscored sessions with 2+ messages
    const result = await client.query(
      `SELECT session_id, conversation_history 
       FROM chatbot_sessions 
       WHERE lead_score IS NULL 
       AND message_count >= 2`
    );

    const sessions = result.rows;
    console.log(`   Found ${sessions.length} unscored conversations`);

    let scored = 0;
    let failed = 0;

    for (const session of sessions) {
      try {
        const conversationHistory = session.conversation_history || [];
        
        if (conversationHistory.length < 2) {
          continue;
        }

        const leadScore = scoreLeadFromConversation(conversationHistory);

        await client.query(
          `UPDATE chatbot_sessions 
           SET lead_score = $1,
               lead_classification = $2,
               qualification_data = $3,
               scored_at = NOW()
           WHERE session_id = $4`,
          [
            leadScore.score,
            leadScore.classification,
            JSON.stringify(leadScore.qualificationData),
            session.session_id
          ]
        );

        scored++;
        console.log(`   ✓ Scored ${session.session_id}: ${leadScore.score} (${leadScore.classification})`);

      } catch (error) {
        failed++;
        console.error(`   ✗ Failed to score ${session.session_id}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 BATCH SCORING COMPLETE`);
    console.log(`   Scored: ${scored}`);
    console.log(`   Failed: ${failed}`);
    console.log('='.repeat(60));

    res.json({
      success: true,
      totalFound: sessions.length,
      scored: scored,
      failed: failed
    });

  } catch (error) {
    console.error('❌ Batch scoring error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to batch score'
    });
  } finally {
    client.release();
  }
});

module.exports = router;

