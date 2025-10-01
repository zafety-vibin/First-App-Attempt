# Data Model: Interactive Map System

**Feature**: 007-create-the-interactive
**Date**: 2025-10-01
**Phase**: Phase 1 (Design & Contracts)

## Overview

Interactive Map System extends the existing Card entity from Feature 003 with map interface capabilities. Maps use the modular parent-child card architecture: a map-enabled card is the parent, and Pin/Zone/Layer cards are children. This preserves existing card hierarchy benefits (move parent → children move automatically, delete parent → cascade delete children).

---

## Entity 1: Map-Enabled Card

**Description**: Extends existing Card entity with map interface flag

**Schema Extension** (extend existing `cards` table):
```sql
ALTER TABLE cards ADD COLUMN map_enabled INTEGER NOT NULL DEFAULT 0 CHECK(map_enabled IN (0,1));
```

**TypeScript Interface** (extends existing Card interface):
```typescript
interface Card {
  // ... existing card properties from Feature 003
  map_enabled: boolean;
}
```

**Validation Rules**:
- `map_enabled` can be toggled on any card type (page, location, database entry)
- Toggling map_enabled to false does NOT delete child map images/pins/zones/layers (soft disable)
- Toggling map_enabled to true enables map interface features

**Relationships**:
- Has many MapImage (1:N)
- Parent to PinCard, ZoneCard, LayerCard via card hierarchy

---

## Entity 2: MapImage

**Description**: Background image for map visualization

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS map_images (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  map_name TEXT NOT NULL,
  image_data BLOB NOT NULL,
  image_width INTEGER NOT NULL,
  image_height INTEGER NOT NULL,
  mime_type TEXT NOT NULL CHECK(mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
  uploaded_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  display_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_map_images_card_id ON map_images(card_id);
CREATE INDEX idx_map_images_display_order ON map_images(card_id, display_order);
```

**TypeScript Interface**:
```typescript
interface MapImage {
  id: string; // UUID
  card_id: string; // FK to cards
  map_name: string; // User-defined: "City Overview", "Ground Floor", etc.
  image_data: Buffer; // BLOB storage
  image_width: number; // Pixel dimensions
  image_height: number;
  mime_type: 'image/png' | 'image/jpeg' | 'image/webp';
  uploaded_at: number; // Unix timestamp
  display_order: number; // For tab ordering
}
```

**Validation Rules**:
- `map_name` required, max 100 characters
- `image_data` max 10MB (enforced at upload)
- `image_width` and `image_height` extracted from image metadata on upload
- `mime_type` validated on upload
- `display_order` defaults to max(display_order) + 1 for new images

**Business Rules**:
- Deleting card cascades to delete all map_images
- Multiple map_images per card supported (tabs UI)
- At least one map_image required to use map interface (enforced in UI)

---

## Entity 3: PinCard

**Description**: Point of interest on map, implemented as child card

**Schema** (extends existing `cards` table):
```sql
-- No new table needed, use existing cards table with special fields
-- Add columns to cards table for pin-specific data
ALTER TABLE cards ADD COLUMN pin_map_image_id TEXT;
ALTER TABLE cards ADD COLUMN pin_x INTEGER;
ALTER TABLE cards ADD COLUMN pin_y INTEGER;
ALTER TABLE cards ADD COLUMN pin_icon_type TEXT CHECK(pin_icon_type IN ('marker', 'castle', 'landmark', 'npc', 'item', 'event', 'custom'));
ALTER TABLE cards ADD COLUMN pin_label_override TEXT;
ALTER TABLE cards ADD COLUMN pin_referenced_card_id TEXT;
ALTER TABLE cards ADD COLUMN pin_layer_id TEXT;

CREATE INDEX idx_cards_pin_map_image ON cards(pin_map_image_id) WHERE card_type = 'pin';
CREATE INDEX idx_cards_pin_layer ON cards(pin_layer_id) WHERE card_type = 'pin';

ALTER TABLE cards ADD FOREIGN KEY (pin_map_image_id) REFERENCES map_images(id) ON DELETE CASCADE;
ALTER TABLE cards ADD FOREIGN KEY (pin_referenced_card_id) REFERENCES cards(id) ON DELETE SET NULL;
ALTER TABLE cards ADD FOREIGN KEY (pin_layer_id) REFERENCES cards(id) ON DELETE SET NULL;
```

**TypeScript Interface** (extends Card):
```typescript
interface PinCard extends Card {
  card_type: 'pin';
  pin_map_image_id: string; // FK to map_images
  pin_x: number; // Absolute pixel X coordinate
  pin_y: number; // Absolute pixel Y coordinate
  pin_icon_type: 'marker' | 'castle' | 'landmark' | 'npc' | 'item' | 'event' | 'custom';
  pin_label_override?: string; // Optional custom label (defaults to referenced card title)
  pin_referenced_card_id: string | null; // FK to another card (can be orphaned if deleted)
  pin_layer_id?: string; // FK to LayerCard (optional)
}
```

**Validation Rules**:
- `card_type` must be 'pin'
- `pin_map_image_id` required
- `pin_x` and `pin_y` required (can be outside image bounds, shows warning)
- `pin_icon_type` required
- `pin_referenced_card_id` can be NULL (orphaned pin)
- `pin_layer_id` optional (NULL = not assigned to layer)

**Business Rules**:
- PinCard is a child of the map-enabled card in card hierarchy
- Multiple pins can reference the same card (different positions)
- When referenced card deleted, `pin_referenced_card_id` SET NULL → orphaned pin warning
- Pin visibility inherited from referenced card's `information_level_id` (Feature 004 integration)
- Deleting parent card cascades to delete all child PinCards

**Computed Properties**:
```typescript
interface PinCardWithVisibility extends PinCard {
  is_visible_in_player_view: boolean; // Computed from referenced card's information level
  display_label: string; // pin_label_override || referenced_card.title
  is_orphaned: boolean; // pin_referenced_card_id === NULL
}
```

---

## Entity 4: ZoneCard

**Description**: Polygon area on map, implemented as child card

**Schema** (extends existing `cards` table):
```sql
ALTER TABLE cards ADD COLUMN zone_map_image_id TEXT;
ALTER TABLE cards ADD COLUMN zone_coordinates TEXT; -- JSONB array of {x, y}
ALTER TABLE cards ADD COLUMN zone_color TEXT; -- Hex color code
ALTER TABLE cards ADD COLUMN zone_purpose TEXT;
ALTER TABLE cards ADD COLUMN zone_metadata TEXT; -- JSONB optional
ALTER TABLE cards ADD COLUMN zone_layer_id TEXT;

CREATE INDEX idx_cards_zone_map_image ON cards(zone_map_image_id) WHERE card_type = 'zone';

ALTER TABLE cards ADD FOREIGN KEY (zone_map_image_id) REFERENCES map_images(id) ON DELETE CASCADE;
ALTER TABLE cards ADD FOREIGN KEY (zone_layer_id) REFERENCES cards(id) ON DELETE SET NULL;
```

**TypeScript Interface** (extends Card):
```typescript
interface ZoneCard extends Card {
  card_type: 'zone';
  zone_map_image_id: string; // FK to map_images
  zone_coordinates: Array<{ x: number; y: number }>; // Polygon vertices
  zone_color: string; // Hex color code (e.g., "#FF0000")
  zone_purpose?: string; // Free-form text
  zone_metadata?: Record<string, any>; // Optional user-defined metadata
  zone_layer_id?: string; // FK to LayerCard (optional)
}
```

**Validation Rules**:
- `card_type` must be 'zone'
- `zone_map_image_id` required
- `zone_coordinates` must have at least 3 vertices (triangle minimum)
- `zone_color` must be valid hex color code (regex: `^#[0-9A-F]{6}$`)
- `zone_purpose` max 500 characters
- `zone_metadata` valid JSON object

**Business Rules**:
- ZoneCard is a child of the map-enabled card in card hierarchy
- Zones can overlap (multiple zones with overlapping coordinates)
- Deleting parent card cascades to delete all child ZoneCards
- Zones render as semi-transparent overlays (opacity 0.3)

---

## Entity 5: LayerCard

**Description**: Organizational container for pins and zones, implemented as child card

**Schema** (extends existing `cards` table):
```sql
ALTER TABLE cards ADD COLUMN layer_map_image_id TEXT;
ALTER TABLE cards ADD COLUMN layer_name TEXT;
ALTER TABLE cards ADD COLUMN layer_toggle_state INTEGER NOT NULL DEFAULT 1 CHECK(layer_toggle_state IN (0,1));
ALTER TABLE cards ADD COLUMN layer_display_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_cards_layer_map_image ON cards(layer_map_image_id) WHERE card_type = 'layer';

ALTER TABLE cards ADD FOREIGN KEY (layer_map_image_id) REFERENCES map_images(id) ON DELETE CASCADE;
```

**TypeScript Interface** (extends Card):
```typescript
interface LayerCard extends Card {
  card_type: 'layer';
  layer_map_image_id: string; // FK to map_images
  layer_name: string; // User-defined: "Secret Locations", "Active Plot Hooks"
  layer_toggle_state: boolean; // On/off per user session
  layer_display_order: number; // For UI ordering
}
```

**Validation Rules**:
- `card_type` must be 'layer'
- `layer_map_image_id` required
- `layer_name` required, max 100 characters
- `layer_toggle_state` defaults to true (on)
- `layer_display_order` defaults to max(layer_display_order) + 1

**Business Rules**:
- LayerCard is a child of the map-enabled card in card hierarchy
- Pins/Zones reference LayerCard via `pin_layer_id`/`zone_layer_id`
- Toggling layer off hides all pins/zones assigned to that layer
- Deleting layer sets `pin_layer_id`/`zone_layer_id` to NULL (pins/zones unassigned but not deleted)
- Layer toggle state is per-user/session (future: user_id FK, for now global state)

---

## Relationships Diagram

```
Card (map_enabled=true)
  ├─> MapImage (1:N)
  │     └─> PinCard (N:1 via pin_map_image_id)
  │     └─> ZoneCard (N:1 via zone_map_image_id)
  │     └─> LayerCard (N:1 via layer_map_image_id)
  │
  └─> Card Hierarchy (parent_id from Feature 003)
        ├─> PinCard (child)
        ├─> ZoneCard (child)
        └─> LayerCard (child)

PinCard
  ├─> references Card via pin_referenced_card_id (N:1, nullable)
  └─> optional LayerCard via pin_layer_id (N:1, nullable)

ZoneCard
  └─> optional LayerCard via zone_layer_id (N:1, nullable)

LayerCard
  └─> contains PinCards and ZoneCards (1:N)
```

---

## Migration Strategy

**Phase 1**: Extend `cards` table with new columns
- Add columns for map_enabled, pin_*, zone_*, layer_* fields
- All columns nullable or have defaults (backward compatible)
- Existing cards unaffected (map_enabled=false by default)

**Phase 2**: Create `map_images` table
- Standalone table for BLOB storage
- Foreign key to cards(id)

**Phase 3**: Add indexes
- Optimize queries for map-specific card types
- Conditional indexes on card_type for pin/zone/layer

**Rollback Plan**:
- Drop map_images table
- Drop added card columns (ALTER TABLE DROP COLUMN)
- No impact on existing card data

---

## Query Patterns

### Get all pins for map (with visibility filtering)
```sql
SELECT
  pins.*,
  referenced.information_level_id,
  referenced.title AS referenced_card_title
FROM cards AS pins
JOIN map_images ON pins.pin_map_image_id = map_images.id
LEFT JOIN cards AS referenced ON pins.pin_referenced_card_id = referenced.id
WHERE pins.card_type = 'pin'
  AND map_images.id = ?
  AND (
    ? = 'dm' -- DM View: show all pins
    OR referenced.information_level_id NOT IN (
      SELECT id FROM information_levels WHERE name = 'DM Secret'
    ) -- Player View: filter DM Secret
  )
ORDER BY pins.created_at;
```

### Get all zones for map
```sql
SELECT *
FROM cards
WHERE card_type = 'zone'
  AND zone_map_image_id = ?
ORDER BY created_at;
```

### Get layers for map with toggle state
```sql
SELECT *
FROM cards
WHERE card_type = 'layer'
  AND layer_map_image_id = ?
ORDER BY layer_display_order;
```

### Get orphaned pins (missing referenced card)
```sql
SELECT *
FROM cards
WHERE card_type = 'pin'
  AND pin_referenced_card_id IS NULL;
```

---

## Data Validation Summary

| Entity | Required Fields | Constraints | Cascade Behavior |
|--------|-----------------|-------------|------------------|
| MapImage | card_id, map_name, image_data, dimensions, mime_type | 10MB max, valid mime type | DELETE card → DELETE map_images |
| PinCard | pin_map_image_id, pin_x, pin_y, pin_icon_type | Valid icon type, coordinates can be outside bounds | DELETE parent → DELETE pin, DELETE referenced card → SET NULL |
| ZoneCard | zone_map_image_id, zone_coordinates, zone_color | Min 3 vertices, valid hex color | DELETE parent → DELETE zone |
| LayerCard | layer_map_image_id, layer_name | Name max 100 chars | DELETE parent → DELETE layer, DELETE layer → SET NULL on pins/zones |

---

**Phase 1 Data Model Complete**: Ready to generate API contracts.
