# Implementation Plan: Interactive Map System

**Branch**: `007-create-the-interactive` | **Date**: 2025-10-01 | **Spec**: [specs/007-create-the-interactive/spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-create-the-interactive/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Implement interactive map system as card feature with background image uploads, Pin/Zone/Layer cards as children storing pixel-based coordinates, information filtering integration for pin visibility, tabbed multi-map support per card, nested map navigation, and `/map` slash command. Maps reuse existing card architecture with modular parent-child relationships.

## Technical Context
**Language/Version**: Node.js 20 LTS + TypeScript 5.0+ (backend), React 18 + TypeScript 5.0+ (frontend)
**Primary Dependencies**: Express 4.x, Better-SQLite3, multer (file uploads), React Router v6, Konva.js or Fabric.js (canvas manipulation), react-color (color picker), TipTap 2.x (reuse from Feature 003)
**Storage**: SQLite3 with BLOB for map images, JSON1 extension for coordinate arrays, extends cards table with map_enabled flag
**Testing**: Vitest + Supertest (backend), React Testing Library (frontend), Playwright (E2E)
**Target Platform**: Docker Compose localhost (3 services: Keycloak, backend, frontend)
**Project Type**: web (frontend + backend)
**Performance Goals**: < 1s map image upload for 5MB images, < 100ms pin add/move operations, smooth zoom/pan at 60fps
**Constraints**: Prototype-first (functionality over optimization), single-user local deployment, acceptable load times for large maps (500+ pins)
**Scale/Scope**: Support campaigns with 50+ map-enabled cards, 10+ maps per card, 500+ pins per map, 100+ zones per map

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Workflow-First Design ✓ PASS
Maps integrate with existing card workflow. `/map` slash command creates cards inline. Pin creation can reference existing cards or create new ones during map editing. No "plan twice" - users build maps as part of natural campaign organization.

### II. User Agency & Full Customization ✓ PASS
Users have complete control:
- Enable map interface on any card type
- Upload custom background images
- User-defined pin icon selection, labels, and references
- User-defined zone purposes and colors (color picker)
- User-defined layer names and organization
- Multiple maps per card with user-defined names
- Manual CRUD for all map elements

### III. Information Filtering & Access Control ✓ PASS
Pin cards inherit visibility from referenced card's information filter tags. DM Secret referenced cards = hidden pins in Player/General View. System, Common Knowledge, Player Knowledge = visible in both views. Integration with Feature 004 filtering system.

### IV. Knowledge Graph Architecture ✓ PASS
Maps complement knowledge graphs by providing spatial context. Pin references to location cards can be used by AI to understand geographical relationships. Map data can inform Geographical knowledge graph construction.

### V. BYOLLM & Privacy ✓ PASS
No LLM integration in this feature. Maps are purely user-created content stored locally in SQLite. Future AI features (auto-pin suggestions) would use user LLM credentials (Feature 008).

### VI. Local-Only & Prototype-First ✓ PASS
Single-user Docker Compose deployment. SQLite embedded database with BLOB storage for images. Feature functionality prioritized over performance optimization. Acceptable load times for prototype phase.

### VII. Transparency & User Approval ✓ PASS
All map content is user-created. No autonomous AI edits. Pin/Zone/Layer CRUD operations are explicit user actions. Orphaned pin warnings provide transparency about broken references.

**Initial Constitution Check**: PASS (all 7 principles satisfied)

## Project Structure

### Documentation (this feature)
```
specs/007-create-the-interactive/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── models/
│   │   ├── MapImage.ts
│   │   ├── PinCard.ts
│   │   ├── ZoneCard.ts
│   │   └── LayerCard.ts
│   ├── services/
│   │   ├── MapService.ts
│   │   ├── PinService.ts
│   │   ├── ZoneService.ts
│   │   ├── LayerService.ts
│   │   └── MapImageService.ts
│   ├── middleware/
│   │   └── mapImageUpload.ts (multer config)
│   ├── routes/
│   │   ├── maps.ts
│   │   ├── pins.ts
│   │   ├── zones.ts
│   │   └── layers.ts
│   └── db/
│       └── schema.sql (extend cards table, add map_images, pins, zones, layers tables)
└── tests/
    ├── contract/
    │   ├── maps.test.ts
    │   ├── pins.test.ts
    │   ├── zones.test.ts
    │   └── layers.test.ts
    ├── integration/
    │   ├── mapCreation.test.ts
    │   ├── nestedNavigation.test.ts
    │   ├── pinVisibilityFiltering.test.ts
    │   └── multiMapCard.test.ts
    └── unit/
        ├── MapService.test.ts
        ├── PinService.test.ts
        └── coordinatePreservation.test.ts

frontend/
├── src/
│   ├── components/
│   │   ├── MapInterface.tsx
│   │   ├── MapCanvas.tsx (Konva/Fabric wrapper)
│   │   ├── PinEditor.tsx
│   │   ├── ZoneEditor.tsx
│   │   ├── LayerManager.tsx
│   │   ├── MapTabs.tsx (multi-map switcher)
│   │   ├── MapSlashCommand.tsx (extend SlashCommandPalette)
│   │   └── OrphanedPinWarning.tsx
│   ├── pages/
│   │   └── MapPage.tsx
│   ├── services/
│   │   ├── mapService.ts
│   │   ├── pinService.ts
│   │   ├── zoneService.ts
│   │   └── layerService.ts
│   ├── hooks/
│   │   ├── useMap.ts
│   │   ├── usePins.ts
│   │   ├── useZones.ts
│   │   ├── useLayers.ts
│   │   └── useMapCoordinates.ts
│   └── contexts/
│       └── MapContext.tsx
└── tests/
    ├── components/
    │   ├── MapInterface.test.tsx
    │   ├── PinEditor.test.tsx
    │   └── MapTabs.test.tsx
    └── e2e/
        └── mapWorkflow.spec.ts
```

**Structure Decision**: Web application (Option 2). Feature extends existing backend/frontend structure established in Features 002-006. Maps integrate with card system from Feature 003 and information filtering from Feature 004.

## Phase 0: Outline & Research

### Research Topics

1. **Canvas Libraries for React**
   - Research Konva.js vs Fabric.js vs react-konva for interactive map canvas
   - Investigate zoom/pan performance with large background images
   - Evaluate drag-and-drop pin positioning capabilities
   - Determine polygon drawing tools for zones
   - Assess rendering performance with 500+ pins

2. **Image Storage Patterns in SQLite**
   - Research BLOB storage vs file system for uploaded map images
   - Investigate image compression strategies (client-side vs server-side)
   - Evaluate image serving performance from SQLite BLOB
   - Determine image size limits and chunking strategies
   - Assess thumbnail generation for database views

3. **Coordinate System Design**
   - Research absolute pixel coordinates vs percentage-based positioning
   - Investigate coordinate preservation across zoom levels
   - Evaluate coordinate transformation for image resize scenarios
   - Determine coordinate validation (pins outside image bounds)
   - Assess coordinate precision requirements (integer vs float)

4. **Pin Visibility Inheritance**
   - Research efficient information level filtering for pins (Feature 004 integration)
   - Investigate reactive updates when referenced card tags change
   - Evaluate query performance for pin filtering by view mode
   - Determine visual indicators for hidden pins in DM View
   - Assess cascade delete vs orphaned pin warning patterns

5. **Multi-Map Tab Management**
   - Research tab UI component libraries compatible with existing stack
   - Investigate state management for multiple maps per card
   - Evaluate map switching performance with large datasets
   - Determine independent pin/zone/layer isolation per map
   - Assess tab ordering and rename workflows

6. **Polygon Drawing for Zones**
   - Research click-to-add-vertex drawing patterns
   - Investigate polygon editing (add/remove/move vertices)
   - Evaluate polygon overlap rendering (semi-transparent overlays)
   - Determine color picker integration (react-color or alternative)
   - Assess polygon coordinate storage format (array of {x, y})

7. **Nested Map Navigation**
   - Research breadcrumb navigation patterns
   - Investigate circular reference detection (optional for prototype)
   - Evaluate parent-child relationship preservation on card move
   - Determine navigation history/back button behavior
   - Assess performance with deeply nested maps (5+ levels)

**Output**: research.md with all decisions, rationales, and alternatives considered

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### Entities (from spec.md Key Entities section)

1. **Map-Enabled Card** (extends existing Card entity from Feature 003)
   - map_enabled boolean flag
   - Has many Map Background Images
   - Parent to Pin cards, Zone cards, Layer cards
   - All existing card properties preserved

2. **Map Background Image**
   - Image ID (UUID)
   - Card reference (FK)
   - Map name (user-defined: "City Overview", "Ground Floor", etc.)
   - Image data (BLOB or file path)
   - Image dimensions (width, height in pixels)
   - Upload timestamp
   - File format (PNG, JPG, WebP)

3. **Pin Card** (extends existing Card entity as child)
   - Card type = "pin"
   - Map image reference (FK)
   - X coordinate (pixel, relative to map image)
   - Y coordinate (pixel, relative to map image)
   - Icon type (enum: marker, castle, landmark, npc, item, event, custom)
   - Label text (optional custom override)
   - Referenced card ID (FK to another card)
   - Layer reference (FK, optional)
   - Information level inheritance (computed from referenced card)

4. **Zone Card** (extends existing Card entity as child)
   - Card type = "zone"
   - Map image reference (FK)
   - Polygon coordinates (JSONB array of {x, y})
   - Zone purpose (free-form text)
   - Zone color (hex color code)
   - Zone metadata (JSONB optional)
   - Layer reference (FK, optional)

5. **Layer Card** (extends existing Card entity as child)
   - Card type = "layer"
   - Map image reference (FK)
   - Layer name (user-defined)
   - Toggle state (boolean, per-user/session)
   - Display order (integer)

6. **Orphaned Pin Warning** (UI component, no DB entity)

### API Contracts

Based on functional requirements, generate OpenAPI 3.0 specs for:

1. **maps.yaml** - Map-enabled card operations
   - POST /api/cards/{cardId}/maps - Enable map interface on card
   - POST /api/cards/{cardId}/maps/images - Upload map background image
   - GET /api/cards/{cardId}/maps/images - List all map images for card
   - GET /api/cards/{cardId}/maps/images/{imageId} - Get specific map image
   - PATCH /api/cards/{cardId}/maps/images/{imageId} - Update map name
   - DELETE /api/cards/{cardId}/maps/images/{imageId} - Delete map image

2. **pins.yaml** - Pin card CRUD
   - POST /api/cards/{cardId}/maps/{mapId}/pins - Create pin
   - GET /api/cards/{cardId}/maps/{mapId}/pins - List pins for map
   - PATCH /api/cards/{cardId}/maps/{mapId}/pins/{pinId} - Update pin (coordinates, icon, label)
   - DELETE /api/cards/{cardId}/maps/{mapId}/pins/{pinId} - Delete pin
   - GET /api/cards/{cardId}/maps/{mapId}/pins?view_mode=player - List filtered pins

3. **zones.yaml** - Zone card CRUD
   - POST /api/cards/{cardId}/maps/{mapId}/zones - Create zone
   - GET /api/cards/{cardId}/maps/{mapId}/zones - List zones for map
   - PATCH /api/cards/{cardId}/maps/{mapId}/zones/{zoneId} - Update zone (coordinates, color, purpose)
   - DELETE /api/cards/{cardId}/maps/{mapId}/zones/{zoneId} - Delete zone

4. **layers.yaml** - Layer card CRUD & toggle
   - POST /api/cards/{cardId}/maps/{mapId}/layers - Create layer
   - GET /api/cards/{cardId}/maps/{mapId}/layers - List layers for map
   - PATCH /api/cards/{cardId}/maps/{mapId}/layers/{layerId} - Update layer (name, toggle state)
   - DELETE /api/cards/{cardId}/maps/{mapId}/layers/{layerId} - Delete layer

### Contract Tests

Generate failing tests for each endpoint in backend/tests/contract/:
- maps.test.ts
- pins.test.ts
- zones.test.ts
- layers.test.ts

### Integration Test Scenarios

Extract from user stories:
1. **Map Creation Workflow**: GM opens location card → clicks "Add Map Interface" → uploads city map image → map interface enabled with thumbnail preview
2. **Pin Creation & Navigation**: GM enters map mode → clicks location on map → selects castle icon → references existing "Castle Ward" card → pin appears → clicks pin → navigates to Castle Ward card
3. **Information Filtering**: GM creates pin referencing DM Secret card → pin visible in DM View → switches to Player/General View → pin hidden → visual indicator in DM View
4. **Zone Drawing**: GM enters map mode → clicks "Add Zone" → clicks points on map to define polygon → sets zone color with color picker → zone renders as semi-transparent overlay
5. **Layer Toggle**: GM creates "Secret Locations" layer → assigns pins to layer → toggles layer off → pins hidden → toggles on → pins visible
6. **Multi-Map Tabs**: GM adds second map image to card → tabs appear above map → clicks tab → switches to second map → independent pins/zones
7. **Nested Navigation**: GM clicks pin on city map → navigates to district card with its own map → clicks "Enter Map" → views district map → clicks pin → navigates deeper
8. **Orphaned Pin Warning**: GM deletes card referenced by pin → warning notification appears → GM can delete orphaned pin or update reference
9. **Modular Move**: GM moves card with map interface to different page → all child pins/zones/layers move → coordinates preserved
10. **Performance**: GM uploads 5MB map image → loads within 1s → adds 500 pins → zoom/pan smooth at 60fps

### Quickstart Validation

Create quickstart.md with step-by-step validation of primary user story (spec.md lines 12):
- Step 1: Create "Waterdeep" location card in Locations database
- Step 2: Enable map interface on Waterdeep card
- Step 3: Upload city map background image
- Step 4: Enter map mode and add Castle Ward pin with castle icon
- Step 5: Add Blackstaff Tower pin with landmark icon
- Step 6: Create "Secret Locations" layer
- Step 7: Add Hidden Zhentarim Base pin (DM Secret card reference)
- Step 8: Draw district zones with polygon tool
- Step 9: Exit map mode, verify thumbnail preview
- Step 10: Switch to Player/General View, verify Zhentarim pin hidden
- Step 11: Click Castle Ward pin, navigate to district card
- Step 12: Verify nested map on Castle Ward card
- Step 13: Performance validation (upload timing, pin operations, zoom/pan)

### Agent File Update

Run `.specify/scripts/bash/update-agent-context.sh claude` to incrementally update CLAUDE.md with:
- New technologies: Konva.js or Fabric.js (canvas manipulation), multer (image uploads), react-color (color picker)
- New entities: MapImage, PinCard, ZoneCard, LayerCard (extend Card entity)
- New services: MapService, PinService, ZoneService, LayerService, MapImageService
- Recent changes entry for Feature 007

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, updated CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → extend Card model task [P]
- Map image upload → backend + frontend task
- Canvas integration → Konva/Fabric setup task
- Pin/Zone/Layer CRUD → backend + frontend tasks
- Information filtering integration → service extension task
- Multi-map tabs UI → frontend component task
- Nested navigation → routing task
- Orphaned pin warnings → UI + service task
- Integration test scenarios → E2E tasks

**Ordering Strategy**:
- TDD order: Contract tests before implementation
- Dependency order: Card model extension → Map images → Pins → Zones → Layers → UI components
- Feature 003 Card system must be functional (prerequisite check)
- Feature 004 Information filtering must be functional (prerequisite check)
- Mark [P] for parallel execution where independent

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | All principles satisfied | N/A |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented (N/A - no violations)

---
*Based on Constitution v1.1.0 - See `/.specify/memory/constitution.md`*
