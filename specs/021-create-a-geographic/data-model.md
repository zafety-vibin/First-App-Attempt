# Data Model: Geographic Map System

**Feature**: 021-create-a-geographic
**Date**: 2025-10-26

## Overview

This feature extends the existing Location entity (Feature 014) with geographic map capabilities. No new database tables are created; map data is stored as JSON in the locations table. This document defines the JSON structures for maps, pins, and regions, plus UI state models for map rendering and navigation.

---

## Database Schema Changes

### Extended Location Table (Feature 014)

```sql
-- Add JSON columns to existing locations table
ALTER TABLE locations ADD COLUMN map_images TEXT DEFAULT '[]';  -- JSON array of map data
ALTER TABLE locations ADD COLUMN map_pins TEXT DEFAULT '[]';    -- JSON array of pin data
ALTER TABLE locations ADD COLUMN faction_regions TEXT DEFAULT '[]';  -- JSON array of region data

-- Note: Existing columns remain unchanged
-- id, campaign_id, name, description, core_status, player_knowledge, tags, created_at, updated_at, custom_fields
-- location_type, population, cultural_characteristics, map (legacy single map reference)
-- parent_location_id, notable_npcs, factions_present, connected_locations, dm_secrets
```

**Migration**: `backend/src/db/migrations/021-geographic-maps.sql`

**Rationale**:
- JSON storage sufficient for prototype (no need for separate tables)
- Atomic updates (map + pins + regions updated together)
- Consistent with existing architecture (custom_fields, tags use JSON)
- Better-SQLite3 JSON1 extension supports JSON queries

---

## JSON Data Structures

### 1. MapImage (stored in locations.map_images)

```typescript
interface MapImage {
  id: string;                    // UUID
  name: string;                  // User-provided name: "World Map", "City Detail"
  data: string;                  // Base64 data URL: "data:image/png;base64,..."
  width: number;                 // Image width in pixels
  height: number;                // Image height in pixels
  uploaded_at: number;           // Unix timestamp
}

// Example
{
  id: "map-001",
  name: "Faerûn World Map",
  data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  width: 2048,
  height: 1536,
  uploaded_at: 1730000000
}
```

**Storage**: Array in `locations.map_images` JSON column
```json
[
  { "id": "map-001", "name": "World Map", ... },
  { "id": "map-002", "name": "City Detail", ... }
]
```

**Validation Rules**:
- id: UUID format
- name: 1-100 characters
- data: Valid base64 data URL with image/* MIME type
- width: 100-10000 pixels
- height: 100-10000 pixels
- uploaded_at: Unix timestamp > 0

### 2. MapPin (stored in locations.map_pins)

```typescript
interface MapPin {
  id: string;                    // UUID
  map_id: string;                // References MapImage.id
  x: number;                     // Absolute pixel X coordinate
  y: number;                     // Absolute pixel Y coordinate
  linked_entity_type: 'location' | 'npc';  // Type of linked entity
  linked_entity_id: string;      // UUID of location or NPC
  icon: PinIconType | null;      // Optional icon identifier
  color: string | null;          // Hex color: "#FF0000"
  label: string | null;          // Optional text label
  created_at: number;            // Unix timestamp
}

type PinIconType =
  | 'castle' | 'city' | 'town' | 'village'
  | 'dungeon' | 'cave' | 'mountain' | 'forest'
  | 'desert' | 'water' | 'landmark' | 'temple'
  | 'tower' | 'port' | 'bridge' | 'ruins'
  | 'camp' | 'mine' | 'farm' | 'other';

// Example
{
  id: "pin-001",
  map_id: "map-001",
  x: 512,
  y: 384,
  linked_entity_type: "location",
  linked_entity_id: "loc-waterdeep",
  icon: "city",
  color: "#3B82F6",
  label: "Waterdeep",
  created_at: 1730000100
}
```

**Storage**: Array in `locations.map_pins` JSON column
```json
[
  { "id": "pin-001", "map_id": "map-001", "x": 512, "y": 384, ... },
  { "id": "pin-002", "map_id": "map-001", "x": 768, "y": 256, ... }
]
```

**Validation Rules**:
- id: UUID format
- map_id: Must reference existing MapImage.id in same location
- x: 0 <= x <= map.width
- y: 0 <= y <= map.height
- linked_entity_type: 'location' or 'npc'
- linked_entity_id: Must reference existing location or NPC in same campaign
- icon: One of 20 predefined types or null
- color: Hex color format "#RRGGBB" or null
- label: 0-50 characters or null
- created_at: Unix timestamp > 0

**Information Filtering**:
- Pins auto-hide when linked entity has player_knowledge='dm_only' and viewMode='player_view'
- Backend filters pins before sending to frontend (X-View-Mode header)

### 3. FactionRegion (stored in locations.faction_regions)

```typescript
interface FactionRegion {
  id: string;                    // UUID
  map_id: string;                // References MapImage.id
  vertices: Array<{x: number; y: number}>;  // Polygon vertices (min 3)
  faction_id: string;            // References factions.id
  color: string;                 // Hex color: "#FF0000"
  label: string | null;          // Optional text label
  z_order: number;               // Stacking order for overlaps (higher = on top)
  created_at: number;            // Unix timestamp
}

// Example
{
  id: "region-001",
  map_id: "map-001",
  vertices: [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
    { x: 200, y: 200 },
    { x: 100, y: 200 }
  ],
  faction_id: "faction-zhentarim",
  color: "#EF4444",
  label: "Zhentarim Territory",
  z_order: 1,
  created_at: 1730000200
}
```

**Storage**: Array in `locations.faction_regions` JSON column
```json
[
  { "id": "region-001", "map_id": "map-001", "vertices": [...], ... },
  { "id": "region-002", "map_id": "map-001", "vertices": [...], ... }
]
```

**Validation Rules**:
- id: UUID format
- map_id: Must reference existing MapImage.id in same location
- vertices: Array with 3+ vertices, each vertex has x (0 <= x <= map.width) and y (0 <= y <= map.height)
- faction_id: Must reference existing faction in same campaign
- color: Hex color format "#RRGGBB"
- label: 0-100 characters or null
- z_order: Integer >= 0
- created_at: Unix timestamp > 0

**Information Filtering**:
- Regions auto-hide when linked faction has player_knowledge='dm_only' and viewMode='player_view'
- Backend filters regions before sending to frontend (X-View-Mode header)

---

## UI State Models

### 1. Map Canvas State

```typescript
interface MapCanvasState {
  mapData: MapImage | null;
  pins: MapPin[];
  regions: FactionRegion[];
  imageLoaded: boolean;
  imageError: string | null;

  // Pan/zoom state
  scale: number;        // Zoom level: 0.1 to 5.0
  position: {x: number; y: number};  // Stage position offset

  // Selection state
  selectedPinId: string | null;
  selectedRegionId: string | null;

  // Edit mode state
  editMode: 'view' | 'add_pin' | 'draw_region' | 'edit_pin' | 'edit_region';
  tempRegionVertices: Array<{x: number; y: number}>;  // For region drawing
}
```

### 2. Geographic Navigator State

```typescript
interface GeographicNavigatorState {
  // Current view
  currentLocationId: string | null;
  currentMapIndex: number;  // Index into location's map_images array

  // Navigation history
  breadcrumb: Array<{
    locationId: string;
    locationName: string;
    mapIndex: number;
  }>;

  // Tree view state
  treeData: LocationTreeNode[];
  expandedNodes: Set<string>;  // Location IDs of expanded tree nodes

  // Loading state
  loading: boolean;
  error: string | null;

  // Preloaded data
  preloadedMaps: Record<string, MapImage[]>;  // locationId -> maps
}

interface LocationTreeNode {
  location: Location;
  children: LocationTreeNode[];
  depth: number;
  hasMap: boolean;
  hasCycle: boolean;  // True if circular parent_location_id reference
}
```

### 3. Dashboard Widget State

```typescript
interface MapViewportWidgetState {
  // Widget configuration (persisted in dashboard_configs.layout)
  selectedLocationId: string | null;
  selectedMapIndex: number;

  // Runtime state
  mapData: MapImage | null;
  pins: MapPin[];
  regions: FactionRegion[];
  scale: number;
  position: {x: number; y: number};
  loading: boolean;
  error: string | null;
}

// Widget config stored in dashboard_configs.layout JSON
interface MapViewportWidgetConfig {
  i: string;  // Instance ID: "map-viewport-1"
  x: number;
  y: number;
  w: number;
  h: number;
  widgetId: 'map-viewport';

  // Widget-specific config
  locationId: string | null;
  mapIndex: number;
  savedScale: number;
  savedPosition: {x: number; y: number};
}
```

### 4. Location Maps Tab State

```typescript
interface LocationMapsTabState {
  locationId: string;
  maps: MapImage[];
  currentMapIndex: number;

  // Pins for current map
  pins: MapPin[];

  // Regions for current map
  regions: FactionRegion[];

  // Upload state
  uploading: boolean;
  uploadProgress: number;
  uploadError: string | null;

  // Edit states
  pinEditorOpen: boolean;
  regionEditorOpen: boolean;
  editingPinId: string | null;
  editingRegionId: string | null;

  // Canvas state
  scale: number;
  position: {x: number; y: number};
}
```

### 5. Pin Editor State

```typescript
interface PinEditorState {
  mode: 'create' | 'edit';
  pin: Partial<MapPin>;

  // Entity search
  entitySearchTerm: string;
  entitySearchResults: Array<Location | NPC>;
  selectedEntity: {type: 'location' | 'npc'; id: string; name: string} | null;

  // Icon picker
  iconPickerOpen: boolean;

  // Color picker
  colorPickerOpen: boolean;

  // Validation
  validationErrors: Record<string, string>;
  submitting: boolean;
}
```

### 6. Region Editor State

```typescript
interface RegionEditorState {
  mode: 'draw' | 'edit';
  region: Partial<FactionRegion>;

  // Drawing state
  drawingVertices: Array<{x: number; y: number}>;
  isDrawing: boolean;

  // Faction search
  factionSearchTerm: string;
  factionSearchResults: Faction[];
  selectedFaction: {id: string; name: string} | null;

  // Color picker
  colorPickerOpen: boolean;

  // Validation
  validationErrors: Record<string, string>;
  submitting: boolean;
}
```

---

## Data Flow Patterns

### Map Upload Flow

```
User Selects File (PNG/JPG/WebP)
        ↓
Frontend: Read file as base64 data URL
        ↓
Frontend: Create MapImage object with dimensions
        ↓
POST /api/locations/:id/maps
  Body: { name, data, width, height }
        ↓
Backend: Validate base64 format and size (<10MB)
        ↓
Backend: Parse locations.map_images JSON
        ↓
Backend: Append new MapImage to array
        ↓
Backend: UPDATE locations SET map_images = ? WHERE id = ?
        ↓
Response: { success: true, map: {...} }
        ↓
Frontend: Update state, display new map
```

### Pin Creation Flow

```
User Clicks Position on Map (x, y)
        ↓
Frontend: Open PinEditor modal with coordinates
        ↓
User Searches for Entity (location or NPC)
        ↓
User Selects Icon, Color, Label (optional)
        ↓
User Clicks Save
        ↓
POST /api/locations/:id/pins
  Body: { map_id, x, y, linked_entity_type, linked_entity_id, icon, color, label }
        ↓
Backend: Validate coordinates within map bounds
        ↓
Backend: Validate linked entity exists in campaign
        ↓
Backend: Parse locations.map_pins JSON
        ↓
Backend: Append new MapPin to array
        ↓
Backend: UPDATE locations SET map_pins = ? WHERE id = ?
        ↓
Response: { success: true, pin: {...} }
        ↓
Frontend: Update state, render new pin
```

### Map-to-Map Navigation Flow

```
User Clicks Pin on Map
        ↓
Frontend: Check pin.linked_entity_type
        ↓
If 'npc': Navigate to /campaigns/:id/npcs/:npcId
        ↓
If 'location':
  ↓
  Frontend: Push current location+map to breadcrumb
  ↓
  Frontend: Fetch linked location's maps
  ↓
  GET /api/locations/:linkedLocationId/maps
  ↓
  Backend: Apply X-View-Mode filtering
  ↓
  Backend: Return map_images, map_pins, faction_regions JSON
  ↓
  Frontend: Set currentLocationId = linkedLocationId
  ↓
  Frontend: Set currentMapIndex = 0 (first map)
  ↓
  Frontend: Render new map with pins/regions
  ↓
  Frontend: Update breadcrumb display
```

### Hierarchy Tree Construction Flow

```
Frontend: GET /api/locations?campaign_id=...
        ↓
Backend: Return all locations for campaign (filtered by X-View-Mode)
        ↓
Frontend: Build tree from parent_location_id relationships
        ↓
Algorithm:
  1. Create map: locationId -> Location
  2. Create root nodes: locations with parent_location_id = null
  3. For each location, recursively add children:
     - Find locations where parent_location_id = current.id
     - Check for cycles: visited.has(current.id)
     - If cycle: mark hasCycle=true, stop recursion
     - Otherwise: recurse on children
  4. Calculate depth for each node
  5. Check hasMap: location.map_images.length > 0
        ↓
Return: LocationTreeNode[]
        ↓
Frontend: Render recursive tree component
```

---

## Validation Schemas (Zod)

### MapImage Schema

```typescript
import { z } from 'zod';

const MapImageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  data: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/),
  width: z.number().int().min(100).max(10000),
  height: z.number().int().min(100).max(10000),
  uploaded_at: z.number().int().positive(),
});
```

### MapPin Schema

```typescript
const MapPinSchema = z.object({
  id: z.string().uuid(),
  map_id: z.string().uuid(),
  x: z.number().min(0),
  y: z.number().min(0),
  linked_entity_type: z.enum(['location', 'npc']),
  linked_entity_id: z.string().uuid(),
  icon: z.enum([
    'castle', 'city', 'town', 'village',
    'dungeon', 'cave', 'mountain', 'forest',
    'desert', 'water', 'landmark', 'temple',
    'tower', 'port', 'bridge', 'ruins',
    'camp', 'mine', 'farm', 'other'
  ]).nullable(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).nullable(),
  label: z.string().max(50).nullable(),
  created_at: z.number().int().positive(),
});
```

### FactionRegion Schema

```typescript
const FactionRegionSchema = z.object({
  id: z.string().uuid(),
  map_id: z.string().uuid(),
  vertices: z.array(
    z.object({
      x: z.number().min(0),
      y: z.number().min(0),
    })
  ).min(3),
  faction_id: z.string().uuid(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  label: z.string().max(100).nullable(),
  z_order: z.number().int().min(0),
  created_at: z.number().int().positive(),
});
```

---

## Performance Considerations

### Base64 Storage Trade-offs

**Pros**:
- No file system management
- Atomic database transactions
- Simple backup (single DB file)
- No path references to break

**Cons**:
- Larger storage size (~33% larger than raw binary)
- Slower to encode/decode
- JSON parsing overhead

**Mitigation**:
- Limit map size to 10MB raw (~13MB base64)
- Client-side compression encouraged
- Cache decoded images in browser memory

### JSON Array Queries

**Challenge**: SQLite JSON1 functions can be slow for large arrays

**Mitigation**:
- Prototype scale: <100 maps, <500 pins per location (acceptable)
- If scaling needed: Extract to junction tables (future optimization)
- Current approach: Parse JSON in application layer (Better-SQLite3 fast)

---

**Status**: ✅ Data model complete - JSON structures defined, validation schemas specified, UI state models documented, data flow patterns mapped
