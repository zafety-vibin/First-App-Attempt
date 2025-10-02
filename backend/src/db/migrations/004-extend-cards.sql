-- Migration 004: Extend Cards table with information level FK
-- Feature: 004-create-a-tagging
-- Adds information_level_id column to cards table

-- Add information_level_id column with default 'system'
ALTER TABLE cards ADD COLUMN information_level_id TEXT DEFAULT 'system' NOT NULL;

-- Add foreign key constraint to information_levels table
-- ON DELETE RESTRICT prevents deleting levels with cards still using them
ALTER TABLE cards ADD CONSTRAINT fk_information_level
  FOREIGN KEY (information_level_id) REFERENCES information_levels(id) ON DELETE RESTRICT;
