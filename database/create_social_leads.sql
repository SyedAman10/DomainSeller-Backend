CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Links lead to the user who ran the scraper
    platform VARCHAR(50) NOT NULL, -- 'reddit', 'facebook', 'twitter'
    content TEXT,
    url TEXT,
    source_group_subreddit TEXT, -- Stores subreddit name or FB group name
    author_name TEXT,
    author_id TEXT,
    intent VARCHAR(50), -- 'buyer', 'seller', 'founder'
    score VARCHAR(20),  -- 'high', 'medium', 'low'
    context TEXT,
    outreach_draft TEXT,
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'approved', 'contacted', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries by user
CREATE INDEX idx_leads_user_id ON leads(user_id);