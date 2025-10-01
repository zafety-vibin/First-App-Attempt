# Feature Specification: Interactive Map System

**Feature Branch**: `007-create-the-interactive`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "Create the interactive map system including: Map interface as a card feature (any card can have map interface, especially location cards), upload background images to cards with map interface enabled, Pin cards as children with pixel-based coordinates and references to other cards (Location, NPC, Item, Event), predefined pin icon types, pin labels always visible, pins inherit visibility from referenced card's information filter tags (DM Secret cards = hidden pins in Player View), Zone cards with user-defined polygon areas and purposes (visual organization or game mechanics), Layer cards as organizational containers for pins with toggle on/off, /map slash command to create cards with map interface, cards can have multiple maps (buildings, zoom levels), database entries are expandable full-page cards that can have map interface, pins can link to other cards (which may also have maps - nested map navigation possible but not required for prototype), modular architecture where moving Map card moves all child pins/zones/layers with preserved coordinates, click pin to navigate to referenced card, default template may include placeholder world map image (not critical)."

---

## Clarifications (Session 2025-10-01)

### Q1: Multiple Map Switching UI (FR-011)
**Decision**: Use tabs view for switching between multiple maps on the same card.
**Rationale**: Tabs provide clear visual indication of available maps and are familiar UI pattern for users.

### Q2: Orphaned Pin Handling (FR-027)
**Decision**: Show a warning notification to the user when a pin references a deleted card.
**Rationale**: Alerts GM to broken references so they can decide whether to delete the orphaned pin or update the reference.

### Q3: Zone Colors (FR-047)
**Decision**: User-defined colors with color picker.
**Rationale**: Gives GMs full customization to match their campaign aesthetic or use colors meaningfully (e.g., red for danger zones, blue for water).

### Q4: Edit vs View Mode (FR-069)
**Decision**: Maps are always editable by the GM, not editable in Player View.
**Rationale**: GMs need quick access to make changes. Players view-only mode aligns with information filtering principles.

### Q5: Circular Reference Handling (FR-096)
**Decision**: Allow circular map references as long as parent-child relationships are respected. No special navigation handling.
**Rationale**: If it doesn't complicate implementation, support nested navigation naturally. If users create circular loops, that's acceptable for prototype.

---

## User Scenarios & Testing

### Primary User Story
A Game Master is building their Waterdeep campaign and wants to create an interactive city map. They open their "Waterdeep" location card in their Locations database and click "Add Map Interface." They upload a city map image showing all the districts. Now the card has both descriptive content (history, population, government) and an interactive map interface they can "enter" by clicking on it. In map mode, they add pins for key locations: they create a pin at the Castle Ward coordinates, choose the "castle" icon, and link it to their existing "Castle Ward" location card (which itself has a district map with more detailed pins). They add another pin for "Blackstaff Tower" with a "landmark" icon linking to that location card. They create a "Secret Locations" layer and add a pin for "Hidden Zhentarim Base" linked to a card tagged as DM Secret - this pin automatically becomes hidden in Player View. They draw polygon zones around each district using Zone cards for visual organization. When finished, they exit map mode and the Waterdeep card shows both content and map thumbnail. Later, when showing players, they switch to Player/General View and the Zhentarim base pin disappears. Players can click on the Castle Ward pin, which navigates to that location card, which also has its own detailed district map - creating nested exploration without losing the modular card architecture.

### Acceptance Scenarios
1. **Given** I have any card (page, location, database entry), **When** I enable map interface, **Then** the card gains map editing capabilities
2. **Given** I've enabled map interface on a card, **When** I upload a background image, **Then** the image becomes the map canvas
3. **Given** I have a card with map interface, **When** I click to enter map mode, **Then** I see the full map with editing tools for pins, zones, and layers
4. **Given** I'm in map editing mode, **When** I add a pin, **Then** I choose icon type, position it at pixel coordinates, label it, and reference an existing or new card
5. **Given** I create a pin referencing a DM Secret card, **When** I switch to Player/General View, **Then** that pin is automatically hidden
6. **Given** I create a pin referencing a card tagged as Player Knowledge, **When** I view the map, **Then** the pin is visible in both DM View and Player/General View
7. **Given** I add a pin to the map, **When** I click that pin in view mode, **Then** I navigate to the referenced card
8. **Given** I create a pin linking to another location card with its own map, **When** I click the pin and navigate to that card, **Then** I can enter that card's map (nested map navigation)
9. **Given** I want to organize pins, **When** I create a Layer card, **Then** I can add pins to that layer and toggle the layer on/off
10. **Given** I want to mark districts on my map, **When** I create Zone cards with polygon coordinates, **Then** those zones are drawn on the map with user-defined purposes (visual or mechanical)
11. **Given** I move a card with map interface to a different page, **When** I check the map, **Then** all child pins, zones, and layers move with it and coordinates are preserved
12. **Given** I have a location card, **When** I add multiple map images, **Then** I can have maps at different scales (city overview, specific building interior, etc.)
13. **Given** I have a Locations database, **When** I expand a database entry, **Then** it opens as a full-page card that can have map interface
14. **Given** I type `/map` in a card, **When** the command executes, **Then** a new card with map interface is created inline
15. **Given** the default campaign template is created, **When** I explore initial content, **Then** there may be a placeholder world map image (not critical for prototype)

### Edge Cases
- What happens when a pin references a card that is deleted?
- What happens when multiple pins reference the same card from different positions?
- What happens when a user uploads multiple images to a single card - which one becomes the map?
- What happens when zone polygons overlap?
- What happens when a pin is placed outside the image boundaries?
- What happens when map image is resized after pins are placed - do pixel coordinates still point correctly?
- What happens when a layer contains a pin referencing a DM Secret card, but the layer itself isn't secret?
- What happens when attempting infinite nested map navigation (map → pin → card with map → pin → same original card)?

## Requirements

### Functional Requirements

#### Map Interface as Card Feature
- **FR-001**: Any card MUST be able to have map interface enabled (page cards, location cards, database entries, etc.)
- **FR-002**: Location cards SHOULD particularly benefit from map interface capability
- **FR-003**: Cards with map interface MUST support both traditional card content (text, nested cards) and map visualization
- **FR-004**: Users MUST be able to enable map interface on existing cards without losing existing content
- **FR-005**: Cards with map interface MUST show map thumbnail or indicator in card preview
- **FR-006**: Users MUST be able to "enter" map mode by clicking on the card's map interface
- **FR-007**: Map mode MUST provide dedicated interface for viewing and editing maps separate from normal card editing

#### Background Image Upload & Management
- **FR-008**: Cards with map interface MUST allow users to upload background images
- **FR-009**: System MUST support common image formats (PNG, JPG, WebP) for map backgrounds
- **FR-010**: Cards MUST be able to have multiple map images (different scales, floors, zoom levels)
- **FR-011**: When multiple maps exist on a card, users MUST be able to switch between them with tabs
- **FR-012**: Uploaded map images MUST be stored as part of the card data
- **FR-013**: Users MUST be able to replace or remove map background images
- **FR-014**: Map images MUST display at appropriate size in map editing interface

#### Pin Cards - Structure & Coordinates
- **FR-015**: Pins MUST be implemented as Pin cards that are children of the map-enabled card
- **FR-016**: Pin cards MUST store pixel-based coordinates (x, y) relative to map image
- **FR-017**: Pin coordinates MUST use absolute pixel positioning to ensure pins remain at exact locations on the image
- **FR-018**: Pin coordinates MUST be preserved when the parent card is moved to a different location in the campaign
- **FR-019**: Pin cards MUST remain positioned correctly even if map image is viewed at different scales/zoom levels

#### Pin Cards - References & Navigation
- **FR-020**: Each Pin card MUST reference another card in the campaign
- **FR-021**: Pin cards MUST be able to reference cards of any type (Location, NPC, Item, Event, Page, etc.)
- **FR-022**: Users MUST be able to select existing cards to reference when creating pins
- **FR-023**: Users MUST be able to create new cards to reference when creating pins
- **FR-024**: Multiple pins MUST be able to reference the same card from different positions
- **FR-025**: Clicking a pin in map view mode MUST navigate to the referenced card
- **FR-026**: When a pin references a card that also has map interface, users MUST be able to navigate to that card's map (nested navigation)
- **FR-027**: System MUST show a warning notification to the user when a pin references a deleted card

#### Pin Cards - Visual Properties
- **FR-028**: Pin cards MUST have predefined icon types for visual representation
- **FR-029**: Predefined icon types MUST include at minimum: location marker, castle, landmark, character/NPC, item/treasure, event, custom/generic
- **FR-030**: Users MUST be able to select icon type when creating or editing pins
- **FR-031**: Pin cards MUST have labels (text) that are always visible on the map
- **FR-032**: Pin labels MUST display the name of the referenced card by default, with option to customize label text
- **FR-033**: Pin icons and labels MUST be clearly visible against map backgrounds

#### Pin Cards - Information Filtering Integration
- **FR-034**: Pin cards MUST inherit visibility from the information filter tags of their referenced card
- **FR-035**: When a pin references a card tagged as DM Secret, the pin MUST be hidden in Player/General View
- **FR-036**: When a pin references a card tagged as System, Common Knowledge, or Player Knowledge, the pin MUST be visible in both DM View and Player/General View
- **FR-037**: Pin visibility MUST update automatically when the referenced card's filter tags change
- **FR-038**: In DM View, all pins MUST be visible regardless of referenced card's tags
- **FR-039**: System MUST visually indicate which pins are hidden in Player/General View when viewing in DM View

#### Zone Cards - Structure & Purpose
- **FR-040**: Zones MUST be implemented as Zone cards that are children of the map-enabled card
- **FR-041**: Zone cards MUST store polygon coordinates defining the zone area on the map
- **FR-042**: Zone cards MUST use pixel-based coordinates for polygon vertices
- **FR-043**: Users MUST be able to draw zones by clicking points on the map to define polygon shapes
- **FR-044**: Zone cards MUST have user-defined purposes (visual organization, game mechanics, narrative areas, etc.)
- **FR-045**: Zone purpose MUST be free-form text or categories defined by the user
- **FR-046**: Zone cards MAY include metadata like faction control, encounter rates, travel time, environment type (user-defined)
- **FR-047**: Zones MUST render as semi-transparent overlays on the map with user-defined colors via color picker
- **FR-048**: Zone polygons MAY overlap - system supports multiple overlapping zones

#### Layer Cards - Organization & Toggle
- **FR-049**: Layers MUST be implemented as Layer cards that are children of the map-enabled card
- **FR-050**: Layer cards MUST serve as organizational containers for Pin cards
- **FR-051**: Users MUST be able to create multiple layers within a single map
- **FR-052**: Pin cards MUST be able to be assigned to specific layers
- **FR-053**: Users MUST be able to toggle layers on/off to show/hide all pins in that layer
- **FR-054**: Layer toggle state MUST be independent per user or view session
- **FR-055**: Layers MUST have user-defined names (e.g., "Secret Locations", "Active Plot Hooks", "Historical Sites")
- **FR-056**: Layers MAY contain Zone cards in addition to Pin cards for organizational purposes

#### Map Creation - Slash Command
- **FR-057**: System MUST provide `/map` slash command for inline card creation
- **FR-058**: `/map` command MUST create a new card with map interface enabled
- **FR-059**: `/map` command MUST prompt user to upload background image immediately after creation
- **FR-060**: Cards created via `/map` MUST be nested at the current cursor position like other slash commands

#### Map Editing Interface
- **FR-061**: Map editing interface MUST provide tools for: adding pins, creating zones, managing layers
- **FR-062**: Users MUST be able to add pins by clicking on the map to set coordinates
- **FR-063**: Users MUST be able to drag existing pins to reposition them
- **FR-064**: Users MUST be able to edit pin properties (icon, label, referenced card) after creation
- **FR-065**: Users MUST be able to delete pins, zones, or layers
- **FR-066**: Map editing interface MUST show all layers with toggle controls
- **FR-067**: Map editing interface MUST show all zones with edit/delete options
- **FR-068**: Users MUST be able to zoom in/out on map for precise pin placement
- **FR-069**: Maps MUST be always editable by the GM, and view-only in Player View

#### Map Viewing Interface
- **FR-070**: Map viewing interface MUST display background image with pins, zones, and active layers
- **FR-071**: Map viewing interface MUST respect current view mode (DM View vs Player/General View) for pin visibility
- **FR-072**: Clicking pins in view mode MUST navigate to referenced cards
- **FR-073**: View mode MUST support zooming/panning for large maps
- **FR-074**: View mode MUST show pin labels clearly
- **FR-075**: View mode MUST render zones as semi-transparent overlays with boundaries

#### Multiple Maps Per Card
- **FR-076**: Single cards MUST support multiple map images (different scales, floors, zoom levels)
- **FR-077**: Each map image MUST have independent sets of pins, zones, and layers
- **FR-078**: Users MUST be able to switch between multiple maps on the same card
- **FR-079**: Each map MUST have a user-defined name for identification (e.g., "City Overview", "Castle Ground Floor", "Castle Upper Floor")
- **FR-080**: Pins on one map MAY reference cards that have different map scales (e.g., city map pin links to building with detailed interior map)

#### Database Integration
- **FR-081**: Database entries MUST be expandable as full-page cards
- **FR-082**: Expanded database entry cards MUST support map interface like any other card
- **FR-083**: Locations database in default template SHOULD have entries with map interface capability
- **FR-084**: Database entries with map interface MUST show map thumbnail in database views (table, gallery, etc.)
- **FR-085**: Users MUST be able to enable map interface on database entries without leaving database context

#### Modular Architecture & Parent-Child Relationships
- **FR-086**: Pin cards MUST be children of the map-enabled card
- **FR-087**: Zone cards MUST be children of the map-enabled card
- **FR-088**: Layer cards MUST be children of the map-enabled card
- **FR-089**: When a map-enabled card is moved to a different page, all child pins, zones, and layers MUST move with it automatically
- **FR-090**: Pin coordinates MUST remain correct after parent card is moved
- **FR-091**: When a map-enabled card is deleted, all child pins, zones, and layers MUST be deleted (cascade deletion)
- **FR-092**: Users MUST be able to manually cut/paste Pin, Zone, or Layer cards between maps if needed

#### Nested Map Navigation
- **FR-093**: Pins MUST be able to reference cards that also have map interfaces
- **FR-094**: Users MUST be able to click a pin, navigate to the referenced card, and enter that card's map interface (nested navigation)
- **FR-095**: Nested map navigation is a supported feature but NOT required for initial prototype functionality
- **FR-096**: System MUST allow circular map references as long as parent-child relationships are respected, with no special navigation handling

#### Default Template Integration
- **FR-097**: Default campaign template MAY include a placeholder world map image (not critical for prototype)
- **FR-098**: If included, placeholder world map SHOULD be in a top-level "World" or "Setting" location card
- **FR-099**: Default Locations database SHOULD include at least one example location card with map interface to demonstrate functionality

### Key Entities

- **Map-Enabled Card**: Any card (page, location, database entry) with map interface feature enabled. Contains traditional card content (text, nested cards) plus map visualization capabilities. Stores one or more background images. Parent to Pin cards, Zone cards, and Layer cards. Can be moved without losing map data.

- **Map Background Image**: Image file (PNG, JPG, WebP) uploaded to a map-enabled card serving as the canvas for pins and zones. Multiple images can exist on one card for different scales/floors. Has user-defined name for identification when multiple maps exist.

- **Pin Card**: Child card of map-enabled card representing a point of interest. Stores pixel-based coordinates (x, y), icon type (predefined: marker, castle, landmark, NPC, item, event, custom), label text, and reference to another card in the campaign. Inherits visibility from referenced card's information filter tags (DM Secret cards = hidden pins in Player View). Can be assigned to Layer cards for organization.

- **Zone Card**: Child card of map-enabled card representing a defined area. Stores polygon coordinates (array of x,y vertices), user-defined purpose (visual organization, game mechanics, faction control, etc.), optional metadata. Renders as semi-transparent overlay on map. Multiple zones can overlap.

- **Layer Card**: Child card of map-enabled card serving as organizational container for Pin cards and Zone cards. Has user-defined name. Can be toggled on/off to show/hide contained pins/zones. Toggle state is per-user or per-session.

- **Pin Reference**: Relationship between a Pin card and another card in the campaign. Enables navigation by clicking the pin in map view. Multiple pins can reference the same card. Referenced cards can themselves have maps (nested navigation). When referenced card is deleted, pin becomes orphaned.

- **Map Interface**: Interactive editing and viewing mode for map-enabled cards. Provides tools for adding/editing/deleting pins, drawing zones, managing layers, zooming/panning. Separate from normal card editing interface. Entered by clicking on map thumbnail in card.

- **Map Coordinates**: Pixel-based x,y positioning system for pins and zone vertices. Uses absolute pixel coordinates relative to map background image to ensure pins stay at exact locations. Preserved when parent card is moved. Coordinates remain correct across different zoom levels.

- **Predefined Pin Icon**: Visual marker type for pins. Includes: location marker, castle, landmark, character/NPC, item/treasure, event, custom/generic. Selected when creating or editing pins. Displayed on map at pin coordinates.

- **Pin Label**: Always-visible text label for pins on map. Defaults to name of referenced card but can be customized. Displayed alongside pin icon at pin coordinates.

- **Pin Visibility Inheritance**: Mechanism where Pin cards automatically inherit visibility rules from their referenced card's information filter tags. DM Secret referenced cards result in hidden pins in Player/General View. System/Common Knowledge/Player Knowledge referenced cards result in visible pins in both views.

- **Nested Map Navigation**: Feature where clicking a pin can navigate to a card that also has map interface, allowing users to explore maps at different scales (continent → region → city → building → room). Not required for initial prototype but supported architecture.

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

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
