-- Create chatbot sessions table
CREATE TABLE IF NOT EXISTS chatbot_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    conversation_history JSONB DEFAULT '[]'::jsonb,
    message_count INTEGER DEFAULT 0,
    lead_score INTEGER,
    lead_classification VARCHAR(50), -- 'hot', 'warm', 'cold'
    qualification_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    scored_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_session_id ON chatbot_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_user_email ON chatbot_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_lead_classification ON chatbot_sessions(lead_classification);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_lead_score ON chatbot_sessions(lead_score);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_created_at ON chatbot_sessions(created_at DESC);

-- Create a view for hot leads (quick access to high-priority leads)
CREATE OR REPLACE VIEW hot_leads AS
SELECT 
    session_id,
    user_email,
    user_name,
    lead_score,
    qualification_data,
    message_count,
    created_at,
    updated_at,
    scored_at
FROM chatbot_sessions
WHERE lead_classification = 'hot'
ORDER BY lead_score DESC, updated_at DESC;

-- Create a view for lead summary statistics
CREATE OR REPLACE VIEW lead_statistics AS
SELECT 
    lead_classification,
    COUNT(*) as count,
    AVG(lead_score) as avg_score,
    AVG(message_count) as avg_messages,
    MAX(lead_score) as max_score,
    MIN(lead_score) as min_score
FROM chatbot_sessions
WHERE lead_score IS NOT NULL
GROUP BY lead_classification;

COMMENT ON TABLE chatbot_sessions IS '3VLTN Chatbot conversation sessions with lead qualification data';
COMMENT ON COLUMN chatbot_sessions.session_id IS 'Unique identifier for the chat session';
COMMENT ON COLUMN chatbot_sessions.conversation_history IS 'Full conversation history in JSON format';
COMMENT ON COLUMN chatbot_sessions.lead_score IS 'Calculated lead score (0-8+ points)';
COMMENT ON COLUMN chatbot_sessions.lead_classification IS 'Lead quality: hot (4+), warm (2-3), cold (0-1)';
COMMENT ON COLUMN chatbot_sessions.qualification_data IS 'Extracted qualification data (portfolio size, pain points, etc.)';

