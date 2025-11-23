-- Migration 029: Add Player Question Portal tables
-- Date: 2025-11-06
-- Feature: 009-create-player-question

-- Portal configuration per campaign
CREATE TABLE IF NOT EXISTS portal_configs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  password_hash TEXT,
  response_style TEXT NOT NULL DEFAULT 'friendly-sage' CHECK(response_style IN ('friendly-sage', 'scholarly-tome', 'tavern-gossip', 'factual', 'custom')),
  custom_system_prompt TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_configs_campaign ON portal_configs(campaign_id);

-- Lightweight player identity (no password, just session token)
CREATE TABLE IF NOT EXISTS portal_players (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  session_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, character_name)
);

CREATE INDEX IF NOT EXISTS idx_portal_players_campaign ON portal_players(campaign_id);
CREATE INDEX IF NOT EXISTS idx_portal_players_token ON portal_players(session_token);

-- Per-player conversation container
CREATE TABLE IF NOT EXISTS portal_conversations (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL UNIQUE,
  campaign_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES portal_players(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_conversations_player ON portal_conversations(player_id);
CREATE INDEX IF NOT EXISTS idx_portal_conversations_campaign ON portal_conversations(campaign_id);

-- Individual Q&A messages with citations
CREATE TABLE IF NOT EXISTS portal_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  citations TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES portal_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES portal_players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_conversation ON portal_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_created ON portal_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_portal_messages_player ON portal_messages(player_id);

-- Token usage tracking per message
CREATE TABLE IF NOT EXISTS portal_token_usage (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES portal_players(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES portal_messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_token_usage_player ON portal_token_usage(player_id);
CREATE INDEX IF NOT EXISTS idx_portal_token_usage_campaign ON portal_token_usage(campaign_id);
CREATE INDEX IF NOT EXISTS idx_portal_token_usage_message ON portal_token_usage(message_id);
