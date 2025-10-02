-- Migration 005: Extend Cards table with information level FK
-- Feature: 004-create-a-tagging
-- Adds information_level_id column to cards table

-- Add information_level_id column with default 'system'
-- Note: Foreign key constraint is enforced at application level (SQLite limitations)
-- InformationLevelService validates levels before assignment
-- CardService prevents deletion of levels in use
ALTER TABLE cards ADD COLUMN information_level_id TEXT DEFAULT 'system' NOT NULL;
