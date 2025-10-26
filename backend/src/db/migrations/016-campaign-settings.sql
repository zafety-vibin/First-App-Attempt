-- Migration 016: Campaign Settings Table
-- Feature: 016-create-a-campaign
-- Creates campaign_settings table for wizard configuration storage

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================================================
-- CAMPAIGN_SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaign_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL UNIQUE,
  theme TEXT NOT NULL CHECK (theme IN ('high_fantasy', 'cyberpunk', 'sci_fi', 'modern', 'custom')),
  category_labels TEXT NOT NULL, -- JSON object mapping internal→display names
  enabled_categories TEXT NOT NULL, -- JSON array of enabled category internal names
  wizard_answers TEXT, -- JSON array of World-Foundations questionnaire answers (preserved for later graph population)
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Index for fast wizard status lookups
CREATE INDEX IF NOT EXISTS idx_campaign_settings_campaign_id ON campaign_settings(campaign_id);
