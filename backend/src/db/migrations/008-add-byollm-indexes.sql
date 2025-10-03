-- Migration 008: BYOLLM Indexes
-- Feature: 008-create-byollm-configuration
-- Description: Indexes for efficient BYOLLM configuration queries

-- Index for scope-based queries (global vs campaign-specific)
CREATE INDEX IF NOT EXISTS idx_byollm_configs_scope ON byollm_configs(scope);

-- Index for campaign-specific config lookups
CREATE INDEX IF NOT EXISTS idx_byollm_configs_campaign_id ON byollm_configs(campaign_id);

-- Index for provider-based queries
CREATE INDEX IF NOT EXISTS idx_byollm_configs_provider ON byollm_configs(provider);

-- Index for OAuth session cleanup (expired sessions)
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires_at ON oauth_sessions(expires_at);

-- Index for OAuth session provider lookups
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_provider ON oauth_sessions(provider);
