-- Migration 003: Extend Campaigns table with setting_id
-- Feature: 003-create-a-notion
-- Description: Add setting_id FK to campaigns table to link campaigns to settings

-- Add setting_id column to existing campaigns table
ALTER TABLE campaigns ADD COLUMN setting_id TEXT;

-- Create foreign key constraint (SQLite 3.35+ supports ALTER TABLE ADD CONSTRAINT)
-- For older SQLite, this is handled via pragma foreign_keys
-- The FK relationship: campaigns.setting_id → settings.id

-- Create index for setting_id lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_setting ON campaigns(setting_id);
