# Feature Specification: Geographic Map System

**Feature Branch**: `021-create-a-geographic`
**Created**: 2025-10-26
**Status**: Draft
**Input**: User description: "Create a geographic map system integrated with the Location category database for hierarchical worldbuilding and navigation. Core features: (1) Map Viewport Widget for dashboard - upload map images, pan/zoom/resize within widget viewport bounds, widget size determines viewport size not map zoom level, drag to reposition map within viewport, works with existing react-grid-layout dashboard; (2) Location Maps on database entries - add Maps tab to location detail pages, upload multiple maps per location at different scales (world map, city map, district map), store map images with location, add pins to maps that link to child locations or NPCs from category tables, pins stored as JSON in locations table with x/y pixel coordinates; (3) Geographic Hierarchy Navigator - new view page showing location hierarchy tree (uses parent_location_id relationships from locations table), click location in tree to display its map in canvas, breadcrumb navigation showing hierarchy path (Plane > World > Continent > City), map-to-map transitions by clicking pins (click city pin on continent map to load city's map with district pins), supports infinite nesting depth following parent_location_id chain; (4) Map Pin System - pins link to location or NPC category entries, click pin to navigate to linked entity's detail page, pins auto-hide based on information filtering (dm_only locations hidden in player view), pins show entity name on hover, optional pin icons/colors, pins positioned at absolute pixel coordinates on map image; (5) Faction Territory Regions - draw colored regions on maps representing faction territories, regions linked to faction_id from factions table, region colors customizable, regions show on mouseover which faction controls territory, optional region labels. Technical integration: extends existing Location category from Feature 014, uses existing parent_location_id hierarchy, integrates with information filtering from Feature 004, new dashboard widget added to WidgetRegistry from Feature 015, pan/zoom viewport contains Konva.js or similar canvas within widget bounds, map images stored per location. This is separate from Feature 007 wiki card maps - Feature 019 is database-specific for geographic worldbuilding with category integration."

## Execution Flow (main)
```
1. Parse user description from Input ✓
   → Extracted: Map Viewport Widget, Location Maps, Geographic Hierarchy Navigator, Map Pin System, Faction Territory Regions
2. Extract key concepts from description ✓
   → Identified: actors (Game Masters, Players), actions (upload maps, add pins, navigate hierarchy, draw regions), data (locations, NPCs, factions, maps, pins), constraints (information filtering, hierarchy relationships)
3. For each unclear aspect: ✓
   → Marked clarifications for image upload limits, pin icon options, performance targets
4. Fill User Scenarios & Testing section ✓
   → Primary user story defined, 18 acceptance scenarios, 8 edge cases
5. Generate Functional Requirements ✓
   → 72 testable requirements across 5 feature areas
6. Identify Key Entities ✓
   → Location (extended), MapPin, FactionRegion, GeographicHierarchyView, MapViewportWidget
7. Run Review Checklist
   → 3 clarifications needed, otherwise ready for planning
8. Return: SUCCESS (spec ready for planning with minor clarifications)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
A Game Master is building a high-fantasy campaign with a detailed world called Faerûn. They start at their campaign dashboard and click "+ Add Widget", selecting the "World Map Viewer" widget. They upload their hand-drawn continent map image. The map appears in a 3x4 widget viewport. They click and drag to pan the map, centering on the Sword Coast region, then scroll to zoom in slightly for better detail. They resize the widget to 6x8 grid units, which expands the viewport - now they can see more of the map at once without changing the zoom level.

Later, they navigate to their "Waterdeep" location in the Locations database table and open its detail page. They click the new "Maps" tab and upload three different map images: a city overview showing all wards, a harbor district detail map, and a castle ward detail map. On the city overview map, they add pins by clicking positions on the map: "Castle Ward" pin at the castle district linking to their Castle Ward location entry, "Dock Ward" pin at the harbor linking to Dock Ward, "Market Square" pin linking to a Market location. They also add NPC pins: "Mirt the Moneylender" positioned at his tavern, "Durnan" at the Yawning Portal. They draw faction territory regions using a polygon tool: a blue region covering the northern wards for the Lords' Alliance, and a red region in the Dock Ward for Zhentarim influence zones.

Next, they open the new Geographic Hierarchy Navigator view from the Locations category menu. They see a tree structure: Material Plane → Faerûn (World) → Sword Coast (Continent) → Waterdeep (City) → Castle Ward (District). Clicking "Faerûn" in the tree displays the world map (which they'd uploaded to the Faerûn location entry) with continent pins showing Sword Coast and other regions. Clicking the Sword Coast pin transitions to the Sword Coast map displaying city pins. Clicking the Waterdeep pin transitions to Waterdeep's city overview map with ward pins and faction territory regions. Clicking the Castle Ward pin transitions to the Castle Ward detailed map. The breadcrumb at the top shows "Material Plane > Faerûn > Sword Coast > Waterdeep > Castle Ward" with each level clickable to jump back.

When they mark the "Zhentarim Hideout" location as dm_only visibility and add a pin for it on the Dock Ward map, the pin appears in DM View but automatically disappears when they toggle to Player View. The red Zhentarim territory region also disappears in Player View since the faction is marked dm_only. Players can explore the map hierarchy, clicking pins to navigate between maps and viewing entity details, but never see the secret locations or faction territories.

### Acceptance Scenarios

**Map Viewport Widget (Dashboard)**:
1. **Given** I am on my campaign dashboard, **When** I add a Map Viewport Widget, **Then** I can upload a map image and see it displayed within the widget bounds
2. **Given** I have a Map Viewport Widget, **When** I resize the widget from 3x4 to 6x8 grid units, **Then** the viewport expands to show more of the map at once without changing the map's zoom level
3. **Given** I have a map in a widget, **When** I click and drag on the map, **Then** the map pans to reposition the visible portion within the viewport
4. **Given** I have a map in a widget, **When** I scroll with mouse wheel or use pinch gestures, **Then** the map zooms in or out while staying within the viewport
5. **Given** I have configured a map widget with specific pan/zoom state, **When** I reload the dashboard, **Then** the widget remembers my pan/zoom position

**Location Maps (Database Integration)**:
6. **Given** I am viewing a Location detail page, **When** I click the Maps tab, **Then** I see a maps interface where I can upload and manage maps for this location
7. **Given** I am on a location's Maps tab, **When** I upload three different map images, **Then** I can switch between the three maps using tabs or selectors
8. **Given** I have uploaded maps to multiple locations, **When** I view each location's Maps tab, **Then** I see only the maps associated with that specific location

**Map Pin System**:
9. **Given** I have a map displayed for a location, **When** I click a position on the map to add a pin, **Then** I can select an existing location or NPC to link to that pin
10. **Given** I am creating a pin, **When** I link it to a Location with dm_only visibility, **Then** the pin is created and automatically hidden when viewing in Player View
11. **Given** I have pins on a map, **When** I hover over a pin, **Then** I see the linked entity's name in a tooltip
12. **Given** I have pins on a map, **When** I click a pin, **Then** I navigate to the linked entity's detail page (Location or NPC)
13. **Given** I have created pins, **When** I drag a pin to a new position, **Then** the pin's coordinates update and it stays at the new position
14. **Given** I have pins with custom icons and colors, **When** I view the map, **Then** pins display with their assigned visual properties

**Geographic Hierarchy Navigator**:
15. **Given** I open the Geographic Hierarchy Navigator, **When** I view the location tree, **Then** locations are organized by parent_location_id showing the full hierarchy (Plane → World → Continent → City → District)
16. **Given** I am in the Geographic Navigator with the tree showing my world structure, **When** I click a location in the tree that has a map, **Then** that location's map displays in the canvas panel on the right
17. **Given** I am viewing a continent map in the Navigator, **When** I click a pin representing a city, **Then** the view transitions to show that city's map with its district pins, and the tree updates to highlight the city
18. **Given** I am navigating between map levels, **When** I click on a level in the breadcrumb (e.g., "Continent"), **Then** the view jumps back to that level's map
19. **Given** I have locations without maps in my hierarchy, **When** I click them in the Navigator tree, **Then** I see a message "No map available for this location" in the canvas panel
20. **Given** I am in Player View in the Navigator, **When** I view the hierarchy tree and maps, **Then** all dm_only locations and their pins are hidden

**Faction Territory Regions**:
21. **Given** I am viewing a location map with editing permissions, **When** I draw a polygon region and link it to a faction, **Then** the region appears colored on the map
22. **Given** I have faction regions on a map, **When** I hover over a region, **Then** I see which faction controls that territory
23. **Given** I have customized region colors, **When** I view faction territories, **Then** regions display in my chosen colors matching my campaign aesthetic
24. **Given** I have regions linked to dm_only factions, **When** I switch to Player View, **Then** those faction regions are hidden from the map

### Edge Cases
- What happens when a pin links to a location or NPC that is later deleted? (orphaned pin behavior needed)
- What happens when a location has no map image but has child locations with maps in the hierarchy navigator? (empty canvas with tree navigation still functional)
- What happens when a user uploads a very large map image? (unrestricted for prototype - may cause performance issues with very large files, to be monitored)
- What happens when pins are positioned outside the map image boundaries? (out-of-bounds handling needed)
- What happens when multiple pins occupy the exact same pixel coordinates? (stacking, offset, or visual indicator needed)
- What happens when a location is part of a circular parent_location_id relationship (A → B → C → A)? (cycle detection required)
- What happens when faction regions overlap on a map? (z-ordering, transparency, or other visual solution needed)
- What happens when navigating to a very deep hierarchy (20+ nested levels)? (performance and UI scrolling considerations)

## Requirements

### Functional Requirements

#### Map Viewport Widget (Dashboard)
- **FR-001**: Users MUST be able to add a Map Viewport Widget to their campaign dashboard
- **FR-002**: Map Viewport Widget MUST allow users to upload map images from their local filesystem
- **FR-003**: Map Viewport Widget MUST display uploaded map images within the widget's viewport bounds
- **FR-004**: Map Viewport Widget MUST support panning via click-and-drag to reposition the map within the viewport
- **FR-005**: Map Viewport Widget MUST support zooming via scroll wheel or pinch gestures
- **FR-006**: When widget is resized in the dashboard grid, the viewport size MUST change to match the new widget dimensions
- **FR-007**: Widget size (grid units) MUST determine the viewport size, NOT the map's zoom level
- **FR-008**: Map Viewport Widget MUST work within the existing react-grid-layout dashboard architecture without breaking other widgets
- **FR-009**: Map Viewport Widget MUST register in WidgetRegistry following the same pattern as existing widgets
- **FR-010**: Map Viewport Widget MUST persist uploaded map reference and viewport state (pan/zoom position) per user per campaign
- **FR-011**: Users MUST be able to remove or replace map images in the widget
- **FR-012**: Map Viewport Widget MUST support PNG, JPG, and WebP image formats
- **FR-013**: Map upload MUST have no file size restrictions for prototype/testing (note: production should enforce reasonable limits)

#### Location Maps (Database Integration)
- **FR-014**: Location detail pages MUST display a Maps tab alongside existing content
- **FR-015**: Maps tab MUST allow users to upload map images associated with that specific location
- **FR-016**: Each location MUST support multiple map images at different scales (e.g., world map, city map, district map)
- **FR-017**: When multiple maps exist for a location, users MUST be able to switch between them
- **FR-018**: Uploaded map images MUST be stored in persistent association with the location record
- **FR-019**: Users MUST be able to delete individual maps from a location without deleting the location itself
- **FR-020**: Map upload interface MUST show current maps for the location with thumbnails or previews

#### Map Pin System
- **FR-021**: Users MUST be able to add pins to any map displayed in the Maps tab
- **FR-022**: When adding a pin, users MUST click a position on the map to set its coordinates
- **FR-023**: Pin coordinates MUST be stored as absolute pixel positions (x, y) relative to the map image
- **FR-024**: Pins MUST link to either a Location entry OR an NPC entry from the category databases
- **FR-025**: When creating a pin, users MUST be able to search and select existing locations from the database
- **FR-026**: When creating a pin, users MUST be able to search and select existing NPCs from the database
- **FR-027**: Pins MUST display a hover tooltip showing the linked entity's name
- **FR-028**: Clicking a pin MUST navigate to the linked entity's detail page
- **FR-029**: Pin coordinates MUST remain accurate regardless of map zoom or pan level
- **FR-030**: Pins MUST support optional icons from a predefined set (castle, city, town, village, dungeon, cave, mountain, forest, desert, water, landmark, temple, tower, port, bridge, ruins, camp, mine, farm, other)
- **FR-031**: Pins MUST support optional custom colors to distinguish pin types visually
- **FR-032**: Pins linking to entities with dm_only visibility MUST automatically hide in Player View
- **FR-033**: Pins linking to entities with common_knowledge or player_knowledge visibility MUST be visible in both DM View and Player View
- **FR-034**: Users MUST be able to reposition pins by dragging them to new coordinates on the map
- **FR-035**: Users MUST be able to edit pin properties (linked entity, icon, color) after creation
- **FR-036**: Users MUST be able to delete pins from maps
- **FR-037**: Multiple pins MUST be able to link to the same location/NPC from different coordinate positions
- **FR-038**: Pins MUST be stored as JSON data in the locations table (not separate table)
- **FR-039**: System MUST handle orphaned pins gracefully when linked entities are deleted (show warning indicator, allow relinking, or auto-remove)

#### Geographic Hierarchy Navigator
- **FR-040**: System MUST provide a Geographic Hierarchy Navigator view accessible from the Locations category navigation
- **FR-041**: Navigator MUST display a tree structure of locations organized by parent_location_id relationships
- **FR-042**: Tree view MUST show location names and allow users to identify location types (Plane, World, Continent, City, etc.)
- **FR-043**: Tree view MUST visually indicate which locations have maps available
- **FR-044**: Users MUST be able to click any location in the tree to display its map in the canvas panel
- **FR-045**: When a location is selected in the tree, if it has a map, that map MUST display in the canvas panel
- **FR-046**: When a location is selected that has no map, the canvas panel MUST show a message "No map available for [Location Name]"
- **FR-047**: Navigator MUST display breadcrumb navigation showing the current hierarchy path (e.g., "Plane > World > Continent > City")
- **FR-048**: Each level in the breadcrumb MUST be clickable to jump back to that location's map
- **FR-049**: When viewing a map in the Navigator, clicking a pin MUST transition to the linked child location's map
- **FR-050**: Map transitions (clicking pins) MUST update both the tree selection and the breadcrumb path
- **FR-051**: Navigator MUST support unlimited nesting depth following parent_location_id chains
- **FR-052**: Users MUST be able to expand and collapse branches in the location tree
- **FR-053**: Navigator MUST respect information filtering - dm_only locations hidden in Player View
- **FR-054**: System MUST detect and handle circular parent_location_id references without crashing (show error or break cycle at detection point)

#### Faction Territory Regions
- **FR-055**: Users MUST be able to draw colored regions on location maps to represent faction territories
- **FR-056**: Regions MUST be defined as polygons created by clicking vertex points on the map
- **FR-057**: Each region MUST be linkable to a faction from the factions database table
- **FR-058**: Regions MUST display in customizable colors chosen by the user
- **FR-059**: When hovering over a faction region, users MUST see which faction controls that territory
- **FR-060**: Regions MUST support optional text labels displayed directly on the map
- **FR-061**: Regions linked to factions with dm_only visibility MUST be hidden in Player View
- **FR-062**: Regions linked to factions with visible status MUST appear in both DM View and Player View
- **FR-063**: When multiple regions overlap, the system MUST handle visual display (suggest: transparency or z-ordering)
- **FR-064**: Users MUST be able to edit region boundaries after creation (move vertices, add vertices, remove vertices)
- **FR-065**: Users MUST be able to change the faction linked to a region after creation
- **FR-066**: Users MUST be able to delete regions from maps
- **FR-067**: Regions MUST be stored as JSON data in the locations table alongside pins

#### Integration & Consistency
- **FR-068**: Geographic map system MUST extend the existing Location category from Feature 014 without breaking existing location functionality
- **FR-069**: Map system MUST use existing parent_location_id hierarchy without requiring schema changes to the locations table
- **FR-070**: Map pin visibility MUST respect information filtering system from Feature 004 (dm_view vs player_view)
- **FR-071**: Map Viewport Widget MUST register in the WidgetRegistry from Feature 015 following the same pattern as existing widgets
- **FR-072**: Geographic map system MUST remain completely separate from Feature 007 wiki card maps (two independent map systems with different purposes)

### Key Entities

**Location (Extended)**:
- Existing entity from Feature 014 Locations database
- Extended to store: map images, map pins (JSON array containing pin coordinates, linked entity references, visual properties), faction regions (JSON array containing polygon vertices, faction references, visual properties)
- Existing parent_location_id field enables geographic hierarchy navigation
- Existing player_knowledge field enables information filtering for pins and regions

**MapPin**:
- Represents a clickable point on a location's map
- Attributes: pixel coordinates (x, y relative to map image), linked entity ID, linked entity type (location or npc), optional icon identifier, optional color value, creation timestamp
- Not a separate database table - stored as JSON in locations table
- Respects information filtering based on linked entity's visibility

**FactionRegion**:
- Represents a colored territory polygon on a location's map
- Attributes: polygon vertices (array of x,y coordinate pairs), linked faction ID, region color, optional label text, z-order for overlap handling, creation timestamp
- Not a separate database table - stored as JSON in locations table
- Respects information filtering based on linked faction's visibility

**GeographicHierarchyView**:
- UI construct for navigating location hierarchy
- Not a persisted data entity
- Computed dynamically from parent_location_id relationships in locations table
- State includes: current selected location, breadcrumb navigation path, tree branch expansion states
- Displays maps from selected locations in integrated canvas panel

**MapViewportWidget**:
- Dashboard widget for displaying maps
- Attributes: map image reference, viewport pan offset (x, y), viewport zoom level, widget grid position and size
- Persisted in dashboard_configs table following Feature 015 widget persistence pattern
- Rendered within react-grid-layout grid system

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

### Clarifications Resolved
1. **FR-012**: Image formats: PNG, JPG, WebP (all 3 supported)
2. **FR-013**: File size: Unrestricted for prototype/testing (production will need limits)
3. **FR-030**: Pin icons: Predefined set of 20 icons (castle, city, town, village, dungeon, cave, mountain, forest, desert, water, landmark, temple, tower, port, bridge, ruins, camp, mine, farm, other)

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (3 clarifications noted)
- [x] User scenarios defined (primary story, 24 acceptance scenarios, 8 edge cases)
- [x] Requirements generated (72 functional requirements across 5 feature areas)
- [x] Entities identified (5 entities: Location extended, MapPin, FactionRegion, GeographicHierarchyView, MapViewportWidget)
- [x] Review checklist passed (pending 3 clarifications)

---

## Dependencies

**Required Features** (must be complete):
- Feature 014 (Locations database with parent_location_id hierarchy)
- Feature 015 (Dashboard widget system with WidgetRegistry and react-grid-layout)
- Feature 004 (Information filtering with dm_view/player_view modes)

**Related Features** (independent, not blocking):
- Feature 007 (Wiki card maps - separate system for freeform dungeon/building maps)

---

## Assumptions

1. Existing parent_location_id relationships in locations table are sufficient for building geographic hierarchy tree
2. JSON storage for pins and regions in locations table is acceptable for prototype (no separate junction tables)
3. Users will upload pre-created map images (system does not procedurally generate maps)
4. Map-to-map transitions load maps client-side using existing location data (no special backend streaming required)
5. Faction territory regions are visual/organizational only (no game mechanics, movement restrictions, or collision detection)
6. Geographic Hierarchy Navigator is a new dedicated page/view, not replacing the existing Locations database table view
7. Map Viewport Widget stores one map at a time (users can swap maps, but widget shows one map)
8. Performance assumption: Maps with up to 100 pins and 20 faction regions should render smoothly (specific benchmarks to be defined in planning phase)
9. Information filtering for map elements (pins, regions) uses existing Feature 004 logic based on linked entity/faction visibility
10. This feature focuses on geographic worldbuilding maps specifically for locations hierarchy - tactical battle maps and dungeon layouts remain in Feature 007's scope
