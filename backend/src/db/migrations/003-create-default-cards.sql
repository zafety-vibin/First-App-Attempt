-- Migration 003: Create default root cards
-- Feature: 003-create-a-notion
-- Description: Create default "Home" page card for existing campaigns

-- Create default root card for each existing campaign
-- Uses lower(hex(randomblob(16))) to generate UUID v4-like IDs
INSERT INTO cards (id, type, campaign_id, parent_id, path, position, depth, title)
SELECT
  lower(hex(randomblob(16))),                           -- Generate UUID for card
  'page',                                                -- Type: page card
  id,                                                    -- campaign_id from campaigns table
  NULL,                                                  -- parent_id NULL = root card
  '/' || id || '/' || lower(hex(randomblob(16))),       -- path: /campaign-id/card-id
  0,                                                     -- position: first card
  0,                                                     -- depth: root level
  name || ' Home'                                        -- title: "{Campaign Name} Home"
FROM campaigns
WHERE id NOT IN (
  SELECT campaign_id FROM cards WHERE parent_id IS NULL
);
-- Only create if campaign doesn't already have a root card
