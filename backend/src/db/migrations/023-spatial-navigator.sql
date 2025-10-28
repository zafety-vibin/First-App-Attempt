/**
 * Migration 023: Spatial Navigator Coordinates
 * Feature: 021-create-a-geographic (Spatial Navigator Enhancement)
 *
 * Adds map_pin_x and map_pin_y columns to locations table.
 * These store where a child location is pinned on its PARENT'S map in the Geographic Navigator.
 *
 * Example: "Solus" (continent) is pinned at (512, 384) on "World of Geux" (world) map
 * - Solus.parent_location_id = WorldOfGeux.id
 * - Solus.map_pin_x = 512
 * - Solus.map_pin_y = 384
 *
 * NULL = unpinned (shows in sidebar toolbox, user can drag to map)
 */

-- Add spatial navigator pin coordinates
ALTER TABLE locations ADD COLUMN map_pin_x INTEGER DEFAULT NULL;
ALTER TABLE locations ADD COLUMN map_pin_y INTEGER DEFAULT NULL;

-- Note: These are different from map_pins JSON column
-- map_pins = pins ON this location's maps (linking to other entities)
-- map_pin_x/y = where THIS location is pinned on its parent's map
