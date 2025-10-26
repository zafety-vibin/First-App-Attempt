-- Migration 021: Geographic Map System
-- Feature: 021-create-a-geographic
-- Date: 2025-10-26
--
-- Extends locations table with geographic map capabilities:
-- - map_images: JSON array of map data (base64, dimensions)
-- - map_pins: JSON array of clickable pins (coordinates, linked entities)
-- - faction_regions: JSON array of territory polygons (vertices, faction links)

-- Add map storage columns to locations table
ALTER TABLE locations ADD COLUMN map_images TEXT DEFAULT '[]';
ALTER TABLE locations ADD COLUMN map_pins TEXT DEFAULT '[]';
ALTER TABLE locations ADD COLUMN faction_regions TEXT DEFAULT '[]';

-- Note: No new tables created - all data stored as JSON in existing locations table
-- This keeps the architecture simple and atomic (location + maps updated together)
-- Relies on SQLite JSON1 extension for JSON operations

-- Example data structures:
-- map_images: [{"id": "uuid", "name": "World Map", "data": "data:image/png;base64,...", "width": 2048, "height": 1536, "uploaded_at": 1730000000}]
-- map_pins: [{"id": "uuid", "map_id": "map-001", "x": 512, "y": 384, "linked_entity_type": "location", "linked_entity_id": "loc-123", "icon": "city", "color": "#3B82F6", "label": "Waterdeep"}]
-- faction_regions: [{"id": "uuid", "map_id": "map-001", "vertices": [{"x": 100, "y": 100}, {"x": 200, "y": 100}, {"x": 150, "y": 200}], "faction_id": "faction-123", "color": "#FF0000", "label": "Lords' Alliance Territory", "z_order": 1}]
