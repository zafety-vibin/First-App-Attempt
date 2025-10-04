-- Migration 005: Extend cards table with import metadata
-- Feature: 005-create-the-ai
-- Date: 2025-10-03

-- Add columns to existing cards table for tracking import session/batch origin
ALTER TABLE cards ADD COLUMN import_session_id TEXT;
ALTER TABLE cards ADD COLUMN import_batch_id TEXT;

-- Create indexes for import metadata
CREATE INDEX IF NOT EXISTS idx_cards_import_session ON cards(import_session_id);
CREATE INDEX IF NOT EXISTS idx_cards_import_batch ON cards(import_batch_id);

-- Note: Foreign key constraints enforced in application code
-- FOREIGN KEY (import_session_id) REFERENCES import_sessions(id) ON DELETE SET NULL
-- FOREIGN KEY (import_batch_id) REFERENCES import_batches(id) ON DELETE CASCADE
