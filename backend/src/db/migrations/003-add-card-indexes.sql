-- Migration 003: Add Card indexes
-- Feature: 003-create-a-notion
-- Description: Create indexes for efficient card queries

-- Index on parent_id for getting children of a card
CREATE INDEX IF NOT EXISTS idx_cards_parent ON cards(parent_id);

-- Index on campaign_id for getting all cards in campaign
CREATE INDEX IF NOT EXISTS idx_cards_campaign ON cards(campaign_id);

-- Index on path for efficient subtree queries (LIKE '/path/%')
CREATE INDEX IF NOT EXISTS idx_cards_path ON cards(path);

-- Composite index for reordering within parent
CREATE INDEX IF NOT EXISTS idx_cards_position ON cards(parent_id, position);

-- Index on card type for filtering by type
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type);
