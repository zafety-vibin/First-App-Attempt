-- Migration 004: Add images table for BLOB storage
-- Feature: 003-create-a-notion (image upload)

CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,           -- Custom ID (img_timestamp_random)
  card_id TEXT NOT NULL,          -- FK to cards.id
  data BLOB NOT NULL,             -- Image binary data (compressed JPEG)
  mime_type TEXT NOT NULL,        -- 'image/jpeg', 'image/png', etc.
  size INTEGER NOT NULL,          -- File size in bytes
  width INTEGER NOT NULL,         -- Image width in pixels
  height INTEGER NOT NULL,        -- Image height in pixels
  created_at INTEGER NOT NULL,    -- Unix timestamp
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_images_card ON images(card_id);
