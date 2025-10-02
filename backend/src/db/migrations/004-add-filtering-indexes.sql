-- Migration 004: Add filtering indexes
-- Feature: 004-create-a-tagging
-- Creates indexes to optimize view mode filtering queries

-- Index for querying information levels by campaign
-- Used in: GET /api/information-levels?campaign_id=X
CREATE INDEX idx_information_levels_campaign ON information_levels(campaign_id);

-- Index for filtering hierarchical vs non-hierarchical levels
-- Used in: Player View filtering (WHERE hierarchical = 0)
CREATE INDEX idx_information_levels_hierarchical ON information_levels(hierarchical);

-- Index for filtering cards by information level
-- Used in: GET /api/cards with view mode filtering JOIN
CREATE INDEX idx_cards_information_level ON cards(information_level_id);
