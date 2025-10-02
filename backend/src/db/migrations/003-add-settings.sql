-- Migration 003: Add Settings table
-- Feature: 003-create-a-notion
-- Description: Create settings table for world/universe containers

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,                    -- UUID v4
  owner_id TEXT NOT NULL,                 -- FK to users.user_id
  name TEXT NOT NULL,                     -- Setting name (e.g., "Forgotten Realms")
  description TEXT,                       -- Optional description
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_settings_owner ON settings(owner_id);
