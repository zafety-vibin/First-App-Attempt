-- Migration 004: Add Information Levels table
-- Feature: 004-create-a-tagging
-- Creates information_levels table with 4 default levels

CREATE TABLE IF NOT EXISTS information_levels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  hierarchical INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('default', 'custom')),
  campaign_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Seed 4 default information levels
INSERT INTO information_levels (id, name, color, hierarchical, type, campaign_id) VALUES
  ('system', 'System', '#6B7280', 0, 'default', NULL),
  ('common-knowledge', 'Common Knowledge', '#3B82F6', 0, 'default', NULL),
  ('player-knowledge', 'Player Knowledge', '#10B981', 0, 'default', NULL),
  ('dm-secret', 'DM Secret', '#EF4444', 1, 'default', NULL);
