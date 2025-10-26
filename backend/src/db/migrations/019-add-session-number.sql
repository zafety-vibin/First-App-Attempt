-- Migration: 019-add-session-number.sql
-- Fix: Add missing session_number column to session_recaps table
-- Date: 2025-01-10

ALTER TABLE session_recaps ADD COLUMN session_number INTEGER;

-- Create index for session timeline queries
CREATE INDEX IF NOT EXISTS idx_session_recaps_session_number ON session_recaps(session_number);
