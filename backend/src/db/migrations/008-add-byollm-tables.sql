-- Migration 008: BYOLLM Configuration Tables
-- Feature: 008-create-byollm-configuration
-- Description: Tables for storing encrypted LLM provider credentials, OAuth sessions, and MCP configuration

-- Table 1: BYOLLM Configurations
-- Stores user's LLM provider account configuration (credentials, model selection, custom prompts)
CREATE TABLE IF NOT EXISTS byollm_configs (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK(scope IN ('global', 'campaign')),
  campaign_id TEXT,
  provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic', 'custom')),
  auth_method TEXT NOT NULL CHECK(auth_method IN ('oauth', 'api_key')),
  encrypted_credentials TEXT NOT NULL, -- Format: salt:iv:authTag:encrypted (AES-256-GCM)
  model_name TEXT NOT NULL,
  custom_endpoint_url TEXT,
  custom_system_prompt_import TEXT,
  custom_system_prompt_planning TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE(scope, campaign_id) -- One config per scope (global or specific campaign)
);

-- Table 2: Provider Credits Cache
-- Caches user's remaining credits/usage from provider API (5 minute TTL)
CREATE TABLE IF NOT EXISTS provider_credits (
  config_id TEXT PRIMARY KEY,
  balance REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  organization_name TEXT NOT NULL,
  last_fetched_at INTEGER NOT NULL,
  FOREIGN KEY (config_id) REFERENCES byollm_configs(id) ON DELETE CASCADE
);

-- Table 3: OAuth Sessions
-- Temporary storage for OAuth 2.0 PKCE flow (10 minute TTL, auto-cleanup)
CREATE TABLE IF NOT EXISTS oauth_sessions (
  state TEXT PRIMARY KEY, -- CSRF protection token
  code_verifier TEXT NOT NULL, -- PKCE code verifier (stored for code exchange)
  provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic')),
  scope TEXT NOT NULL CHECK(scope IN ('global', 'campaign')),
  campaign_id TEXT, -- NULL for global scope
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER NOT NULL, -- Auto-cleanup after 10 minutes
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Table 4: MCP Configuration
-- Automatic MCP (Model Context Protocol) settings for bulk operations
CREATE TABLE IF NOT EXISTS mcp_configs (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL,
  streaming_enabled INTEGER NOT NULL DEFAULT 1, -- 1 = true, 0 = false
  timeout_seconds INTEGER NOT NULL DEFAULT 30,
  retry_attempts INTEGER NOT NULL DEFAULT 3,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (config_id) REFERENCES byollm_configs(id) ON DELETE CASCADE,
  UNIQUE(config_id) -- One MCP config per BYOLLM config
);

-- Table 5: Custom Endpoint Configuration
-- Additional metadata for custom local LLM endpoints (Ollama, LM Studio, etc.)
CREATE TABLE IF NOT EXISTS custom_endpoint_configs (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL,
  base_url TEXT NOT NULL,
  auth_header_name TEXT, -- e.g., "Authorization" or "X-API-Key"
  auth_header_value TEXT, -- Encrypted API key or bearer token
  model_format TEXT NOT NULL DEFAULT 'openai_compatible', -- 'openai_compatible', 'anthropic_compatible', 'custom'
  supports_streaming INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (config_id) REFERENCES byollm_configs(id) ON DELETE CASCADE,
  UNIQUE(config_id) -- One custom endpoint config per BYOLLM config
);
