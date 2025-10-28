# Spatial Navigator Redesign
**Feature**: 021-create-a-geographic (Enhancement)
**Date**: 2025-10-28
**Status**: Architecture Planning

## Vision

Replace simple tree-list navigator with **scale-based spatial visualization** that integrates with existing Geographic knowledge graph.

## Core Concept

**Scale-Based Navigation**: Users navigate through geographic scales (Plane → World → Continent → Region → Settlement → Building) with spatial visualization at each level.

### Visualization Modes

**1. Ring Mode** (no parent map):
- Nodes distributed in circular/ring layout
- Node with most children positioned at bottom (material plane pattern)
- Click node → Zoom to next scale
- Example: Plane View showing multiple planes in ring

**2. Map Mode** (parent has map):
- Parent map displayed as background
- Pinned children shown at coordinates on map
- Unpinned children in sidebar toolbox
- Drag from sidebar → Drop on map → Pin to coordinates
- Example: Continent map with regions pinned to locations

### Data Architecture

**Geographic Graph** (existing):
- Nodes: Locations with `node_type` (plane, world, continent, region, settlement, building)
- Edges: Parent-child relationships (defines scale hierarchy)
- Already populated in campaign `1ceec234...`

**Map Coordinates** (new):
- Store x,y on locations table: `map_pin_x`, `map_pin_y` (nullable)
- Represents where this node is pinned on its **parent's** map
- Null = unpinned (shows in sidebar)

### Navigation Flow

```
1. Start: "Plane View"
   - Query: Geographic graph root nodes (no parent)
   - Display: Ring distribution of planes
   - Breadcrumb: "Plane View"

2. Click: "Material Plane"
   - Query: Children of Material Plane (Worlds)
   - Check: Does Material Plane have map?
   - If NO map: Ring distribution of worlds
   - If HAS map: Show map + pinned worlds + unpinned sidebar
   - Breadcrumb: "Plane View → Material Plane (World View)"

3. Click pinned "Faerûn" on map
   - Query: Children of Faerûn (Continents)
   - Check: Does Faerûn have map?
   - Display: Map mode or ring mode
   - Breadcrumb: "... → Material Plane → Faerûn (Continent View)"

4. Drag unpinned "Kara-Tur" from sidebar → Drop on Faerûn map at (x, y)
   - Update: location.map_pin_x = x, map_pin_y = y
   - Remove from unpinned sidebar
   - Render as pin on map
```

## Schema Changes

```sql
-- Migration 023: Spatial Navigator Coordinates
ALTER TABLE locations ADD COLUMN map_pin_x INTEGER DEFAULT NULL;
ALTER TABLE locations ADD COLUMN map_pin_y INTEGER DEFAULT NULL;

-- Represents where THIS location is pinned on its PARENT'S map
-- Null = unpinned (shows in sidebar toolbox)
-- Used only in Geographic Navigator, not Location Maps tab
```

## Component Architecture

### GeographicNavigatorPage (redesigned)
```
┌─────────────────────────────────────────────────┐
│ Breadcrumb: Plane View → Material → Faerûn     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Main Canvas (Konva):                           │
│  - Ring mode OR Map mode                        │
│  - Nodes as interactive circles                 │
│  - Drag-drop from sidebar                       │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│ Sidebar (collapsible):                          │
│ ┌─────────────────────┐                         │
│ │ Unpinned Nodes (3)  │                         │
│ │ • Kara-Tur          │← Draggable              │
│ │ • Maztica           │                         │
│ │ • Zakhara           │                         │
│ └─────────────────────┘                         │
│ Scale Actions:                                  │
│ [↑ Up] [Upload Map] [+ Add Child Node]         │
└─────────────────────────────────────────────────┘
```

### Components Needed
1. **ScaleCanvas** - Replaces current navigator canvas
   - Ring layout algorithm
   - Map background rendering
   - Node circles (pinned + unpinned preview)
   - Drag-drop zones

2. **UnpinnedSidebar** - Toolbox of nodes
   - List of children without coordinates
   - Draggable items
   - Count badge

3. **ScaleBreadcrumb** - Enhanced breadcrumb
   - Shows current scale level
   - Click to jump up hierarchy

4. **NodeCircle** - Konva component
   - Renders node as circle (not map pin icon)
   - Hover tooltip with preview
   - Click to zoom into children

## Implementation Phases

**Phase A: Data Layer** (2 hours)
- Migration 023: Add map_pin_x, map_pin_y columns
- Fetch geographic graph nodes/edges
- Build scale hierarchy from graph
- Store coordinate updates

**Phase B: Ring Layout** (2 hours)
- Circular distribution algorithm
- Most-children-at-bottom logic
- Konva rendering of node circles

**Phase C: Map + Sidebar Hybrid** (2 hours)
- Show parent map as background
- Render pinned children at coordinates
- Unpinned sidebar component
- Drag-drop from sidebar to map

**Phase D: Scale Transitions** (1.5 hours)
- Zoom animations
- Scale level tracking
- Breadcrumb updates
- Up/down navigation

**Phase E: Polish** (0.5 hours)
- Tooltips with previews
- Empty states
- Error handling

---

**Estimated**: 8 hours total

## Questions for User

Before I begin, please confirm:

1. **Migration 023 approach**: Add `map_pin_x`, `map_pin_y` to locations table? (stores where node is pinned on parent's map)

2. **Graph vs Locations**: Should I query geographic **graph** for navigation, or use locations `parent_location_id`? (You said graph, confirming)

3. **Map upload**: Use existing location Maps tab for uploading, or separate upload flow in navigator?

4. **Starting view**: Always start at "Plane View" (root nodes), or remember last viewed scale?

Once confirmed, I'll begin implementation! 🚀