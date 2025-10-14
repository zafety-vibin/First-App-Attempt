-- Migration 015: Dashboard Canvas System
-- Feature: 015-create-the-dashboard
-- Creates dashboard_configs and category_landing_configs tables for canvas layouts

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1. DASHBOARD CONFIGS TABLE
-- ============================================================================
-- Stores dashboard canvas layout per user per campaign
CREATE TABLE IF NOT EXISTS dashboard_configs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  layout TEXT NOT NULL, -- JSON string of react-grid-layout configuration
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign key constraints with CASCADE delete
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

  -- Unique constraint: one config per user+campaign combination
  UNIQUE(campaign_id, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_campaign_user
  ON dashboard_configs(campaign_id, user_id);

-- ============================================================================
-- 2. CATEGORY LANDING CONFIGS TABLE
-- ============================================================================
-- Stores category landing page canvas layout + text content per user per campaign per category
CREATE TABLE IF NOT EXISTS category_landing_configs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL, -- 'npcs', 'locations', 'factions', etc.
  layout TEXT NOT NULL, -- JSON string of react-grid-layout configuration
  title TEXT, -- User-editable category title override (max 200 chars)
  description TEXT, -- User-editable rich text description (TipTap JSON)
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign key constraints with CASCADE delete
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

  -- Unique constraint: one config per user+campaign+category combination
  UNIQUE(campaign_id, user_id, category)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_category_landing_configs_campaign_user_category
  ON category_landing_configs(campaign_id, user_id, category);