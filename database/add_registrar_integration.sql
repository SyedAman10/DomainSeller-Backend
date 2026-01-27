-- ============================================================
-- REGISTRAR INTEGRATION SCHEMA
-- ============================================================
-- Purpose: Enable users to connect registrar accounts for bulk
--          domain verification and automatic ownership sync
-- ============================================================

-- 1. REGISTRAR ACCOUNTS TABLE
-- Stores encrypted credentials for registrar API connections
CREATE TABLE IF NOT EXISTS registrar_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registrar VARCHAR(50) NOT NULL, -- 'godaddy', 'cloudflare', 'namecheap', etc.
    
    -- Encrypted credentials (AES-256)
    encrypted_api_key TEXT NOT NULL,
    encrypted_api_secret TEXT,
    
    -- Connection metadata
    connection_status VARCHAR(20) DEFAULT 'active', -- 'active', 'disconnected', 'failed'
    last_sync_at TIMESTAMP,
    last_sync_status VARCHAR(20), -- 'success', 'failed', 'rate_limited'
    last_sync_error TEXT,
    
    -- Domain count tracking
    domains_count INTEGER DEFAULT 0,
    verified_domains_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, registrar)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_registrar_accounts_user_id ON registrar_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_registrar_accounts_status ON registrar_accounts(connection_status);

-- 2. ENHANCED DOMAINS TABLE
-- Add registrar connection support to existing domains table
DO $$ 
BEGIN
    -- Add registrar_account_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'domains' 
        AND column_name = 'registrar_account_id'
    ) THEN
        ALTER TABLE domains ADD COLUMN registrar_account_id INTEGER REFERENCES registrar_accounts(id) ON DELETE SET NULL;
    END IF;

    -- Add verification_method column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'domains' 
        AND column_name = 'verification_method'
    ) THEN
        ALTER TABLE domains ADD COLUMN verification_method VARCHAR(30) DEFAULT 'dns_txt';
        -- Values: 'registrar_api', 'dns_txt', 'nameserver', 'manual'
    END IF;

    -- Add verification_level column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'domains' 
        AND column_name = 'verification_level'
    ) THEN
        ALTER TABLE domains ADD COLUMN verification_level INTEGER DEFAULT 1;
        -- 3 = registrar_api (highest), 2 = nameserver, 1 = dns_txt
    END IF;

    -- Add verified_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'domains' 
        AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE domains ADD COLUMN verified_at TIMESTAMP;
    END IF;

    -- Add auto_synced column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'domains' 
        AND column_name = 'auto_synced'
    ) THEN
        ALTER TABLE domains ADD COLUMN auto_synced BOOLEAN DEFAULT FALSE;
        -- TRUE if domain was auto-discovered via registrar sync
    END IF;

    -- Add last_seen_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'domains' 
        AND column_name = 'last_seen_at'
    ) THEN
        ALTER TABLE domains ADD COLUMN last_seen_at TIMESTAMP;
        -- Updated each time domain is found in registrar sync
    END IF;
END $$;

-- Index for registrar account lookups
CREATE INDEX IF NOT EXISTS idx_domains_registrar_account ON domains(registrar_account_id);
CREATE INDEX IF NOT EXISTS idx_domains_verification_method ON domains(verification_method);
CREATE INDEX IF NOT EXISTS idx_domains_auto_synced ON domains(auto_synced);

-- 3. REGISTRAR SYNC HISTORY
-- Track all sync operations for auditing and debugging
CREATE TABLE IF NOT EXISTS registrar_sync_history (
    id SERIAL PRIMARY KEY,
    registrar_account_id INTEGER NOT NULL REFERENCES registrar_accounts(id) ON DELETE CASCADE,
    
    -- Sync results
    sync_status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'partial'
    domains_found INTEGER DEFAULT 0,
    domains_added INTEGER DEFAULT 0,
    domains_removed INTEGER DEFAULT 0,
    domains_updated INTEGER DEFAULT 0,
    
    -- Error tracking
    error_message TEXT,
    api_response_time_ms INTEGER,
    
    -- Timestamps
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Additional metadata (JSON for flexibility)
    metadata JSONB
);

-- Index for querying sync history
CREATE INDEX IF NOT EXISTS idx_sync_history_account ON registrar_sync_history(registrar_account_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON registrar_sync_history(started_at DESC);

-- 4. DOMAIN VERIFICATION LOG
-- Security audit trail for verification changes
CREATE TABLE IF NOT EXISTS domain_verification_log (
    id SERIAL PRIMARY KEY,
    domain_name VARCHAR(255) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(30) NOT NULL, -- 'verified', 'revoked', 'updated', 'transferred'
    verification_method VARCHAR(30),
    registrar_account_id INTEGER REFERENCES registrar_accounts(id) ON DELETE SET NULL,
    
    -- Change tracking
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    
    -- Context
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_verification_log_domain ON domain_verification_log(domain_name);
CREATE INDEX IF NOT EXISTS idx_verification_log_user ON domain_verification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_log_created_at ON domain_verification_log(created_at DESC);

-- 5. REGISTRAR API RATE LIMITS
-- Track and enforce rate limits per registrar
CREATE TABLE IF NOT EXISTS registrar_rate_limits (
    id SERIAL PRIMARY KEY,
    registrar_account_id INTEGER NOT NULL REFERENCES registrar_accounts(id) ON DELETE CASCADE,
    
    -- Rate limit tracking
    endpoint VARCHAR(100),
    requests_count INTEGER DEFAULT 0,
    window_start TIMESTAMP DEFAULT NOW(),
    window_duration_minutes INTEGER DEFAULT 60,
    
    -- Limit enforcement
    limit_reached BOOLEAN DEFAULT FALSE,
    reset_at TIMESTAMP,
    
    UNIQUE(registrar_account_id, endpoint, window_start)
);

-- Index for rate limit checks
CREATE INDEX IF NOT EXISTS idx_rate_limits_account ON registrar_rate_limits(registrar_account_id);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE registrar_accounts IS 'Stores encrypted registrar API credentials for bulk domain verification';
COMMENT ON COLUMN registrar_accounts.encrypted_api_key IS 'AES-256 encrypted API key';
COMMENT ON COLUMN registrar_accounts.encrypted_api_secret IS 'AES-256 encrypted API secret';
COMMENT ON COLUMN registrar_accounts.connection_status IS 'Current connection health status';
COMMENT ON COLUMN registrar_accounts.domains_count IS 'Total domains found in last sync';

COMMENT ON TABLE registrar_sync_history IS 'Audit trail of all registrar sync operations';
COMMENT ON TABLE domain_verification_log IS 'Security log for domain ownership verification changes';
COMMENT ON TABLE registrar_rate_limits IS 'Track API rate limits to prevent throttling';

-- ============================================================
-- INITIAL DATA
-- ============================================================

-- Insert supported registrars metadata (optional reference table)
CREATE TABLE IF NOT EXISTS supported_registrars (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    priority INTEGER DEFAULT 99, -- Lower = higher priority
    api_docs_url TEXT,
    supports_auto_sync BOOLEAN DEFAULT TRUE,
    rate_limit_per_hour INTEGER,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial registrars
INSERT INTO supported_registrars (code, name, priority, api_docs_url, rate_limit_per_hour) VALUES
    ('godaddy', 'GoDaddy', 1, 'https://developer.godaddy.com/doc/endpoint/domains', 60),
    ('cloudflare', 'Cloudflare', 1, 'https://api.cloudflare.com/', 1200),
    ('namecheap', 'Namecheap', 2, 'https://www.namecheap.com/support/api/', 20),
    ('dynadot', 'Dynadot', 3, 'https://www.dynadot.com/domain/api.html', 30),
    ('porkbun', 'Porkbun', 3, 'https://porkbun.com/api/json/v3/documentation', 60)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- COMPLETED
-- ============================================================
-- Migration created: add_registrar_integration.sql
-- Run with: psql -U your_user -d your_db -f add_registrar_integration.sql
