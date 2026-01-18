-- AI Agent Chat History and Memory
-- Store conversations with context and memory

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL REFERENCES ai_chat_sessions(session_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'function')),
  content TEXT,
  function_name VARCHAR(100),
  function_args JSONB,
  function_response JSONB,
  tokens_used INTEGER,
  model VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_agent_memory (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_key VARCHAR(100) NOT NULL,
  memory_value JSONB NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, memory_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session ON ai_chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON ai_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON ai_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memory_user ON ai_agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_key ON ai_agent_memory(user_id, memory_key);

COMMENT ON TABLE ai_chat_sessions IS 'AI agent chat sessions with users';
COMMENT ON TABLE ai_chat_messages IS 'Individual messages in AI conversations';
COMMENT ON TABLE ai_agent_memory IS 'Persistent memory for AI agent per user';

