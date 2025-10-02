-- Migration 003: Add Cards table
-- Feature: 003-create-a-notion
-- Description: Create cards table with polymorphic card types, adjacency list hierarchy, and materialized path

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,                    -- UUID v4
  type TEXT NOT NULL,                     -- 'page' | 'database' | 'text' | 'image'

  -- Hierarchy (adjacency list + materialized path hybrid)
  parent_id TEXT,                         -- FK to cards.id (NULL = root card)
  campaign_id TEXT NOT NULL,              -- FK to campaigns.id (always scoped to campaign)
  path TEXT NOT NULL,                     -- Materialized path: '/campaign-id/card-id/child-id'
  position INTEGER NOT NULL,              -- Order within parent (0-indexed)
  depth INTEGER NOT NULL DEFAULT 0,       -- Nesting level (0=root, max 50)

  -- Content (polymorphic based on type)
  title TEXT,                             -- Card title (NULL for text/image cards)
  content TEXT,                           -- JSONB: ProseMirror JSON for rich text
  metadata TEXT,                          -- JSONB: Type-specific data

  -- Presentation (for page cards)
  cover_image_url TEXT,                   -- Cover image URL or upload path
  icon_emoji TEXT,                        -- Single emoji character

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (parent_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,

  CHECK (type IN ('page', 'database', 'text', 'image')),
  CHECK (depth >= 0 AND depth <= 50),
  CHECK (length(icon_emoji) <= 4)  -- Single emoji (may be multi-codepoint)
);
