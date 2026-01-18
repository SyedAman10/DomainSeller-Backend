const express = require('express');
const router = express.Router();
const aiAgentService = require('../services/aiAgentService');

// ============================================================
// 🤖 AI AGENT ROUTES
// ============================================================

// Chat with AI Agent
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, userId } = req.body;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📥 POST /backend/ai-agent/chat`);
    console.log(`⏰ ${new Date().toISOString()}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`💬 Message: "${message}"`);
    console.log(`🆔 Session ID: ${sessionId || 'NEW'}`);

    if (!message || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Message and userId are required'
      });
    }

    // Chat with AI agent
    const result = await aiAgentService.chat(userId, message, sessionId);

    res.json(result);

  } catch (error) {
    console.error('❌ AI Agent Chat Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Sorry, I encountered an error. Please try again.'
    });
  }
});

// Get chat history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId } = req.query;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📥 GET /backend/ai-agent/history/${sessionId}`);
    console.log(`⏰ ${new Date().toISOString()}`);
    console.log(`${'='.repeat(80)}`);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const result = await aiAgentService.getChatHistory(userId, sessionId);
    res.json(result);

  } catch (error) {
    console.error('❌ Get History Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's recent sessions
router.get('/sessions', async (req, res) => {
  try {
    const { userId } = req.query;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📥 GET /backend/ai-agent/sessions`);
    console.log(`⏰ ${new Date().toISOString()}`);
    console.log(`${'='.repeat(80)}`);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const result = await aiAgentService.getRecentSession(userId);
    
    res.json({
      success: true,
      session: result
    });

  } catch (error) {
    console.error('❌ Get Sessions Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

