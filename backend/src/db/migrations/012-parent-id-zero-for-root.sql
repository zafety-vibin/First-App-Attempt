-- Migration 012: Change root cards from parent_id = NULL to parent_id = 0
-- This makes it easier for AI to understand and use (0 instead of null)
-- Date: 2025-10-05

-- Update existing root cards (parent_id IS NULL) to use parent_id = 0
UPDATE cards
SET parent_id = 0
WHERE parent_id IS NULL;

-- Note: We keep the column nullable in schema for flexibility,
-- but all root cards will use 0 as the standard sentinel value
