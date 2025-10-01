# Implementation Plan: Card-Based Content Architecture

**Branch**: `003-create-a-notion` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-create-a-notion/spec.md`
**Dependencies**: Feature 002 (Authentication & Campaign Management)

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
2. Fill Technical Context (IN PROGRESS)
3. Resolve NEEDS CLARIFICATION items → Design Decisions
4. Fill Constitution Check
5. Evaluate Constitution Check → PASS/FAIL
6. Execute Phase 0 → research.md
7. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md update
8. Re-evaluate Constitution Check
9. Plan Phase 2 → Task generation approach
10. STOP - Ready for /tasks command
```

## Summary

**Primary Requirement**: Implement Notion-inspired card-based content architecture where everything (pages, databases, text, images) is a card. Support infinite nesting, user-defined database schemas with multiple views (table, list, gallery, kanban), rich text editing, slash commands for content creation, and complete organizational freedom within the hierarchy: Setting/World → Campaign → Cards.

**Technical Approach**: Extend existing SQLite schema with Setting, Card, and DatabaseColumn tables using adjacency list pattern for infinite hierarchy. Store rich text as JSON (TipTap/ProseMirror format). Use JSONB columns for flexible database card schemas and view configurations. Implement React-based card renderer with drag-and-drop reordering, slash command palette (Cmd+K pattern), and multiple database view components. Prevent circular references via path validation. Integrate with feature 002's Campaign entity as parent to root cards.

**Critical Clarifications Resolved**:
1. **FR-005**: Cards NOT shareable across campaigns - always campaign-scoped (simplifies permissions, aligns with local-only)
2. **FR-017**: Page cards support cover images + emoji icons (Notion parity, user agency)
3. **FR-020**: Column types MVP: text, number, date, select, multi-select, entity-reference (formula/checkbox deferred to future)
4. **FR-026**: Database views support filter + sort (search deferred, simple string matching acceptable for prototype)
5. **FR-028**: Inline databases show first 10 entries with "View all" link (pagination performance)
6. **FR-031**: Media cards: images only in MVP (video/audio/PDF future enhancement)
7. **FR-034**: Slash commands MVP: /page, /database, /text, /image, /heading1-3 (headings for structure)
8. **FR-039**: Entity references show preview on hover, backlinks panel deferred (link integrity priority)
9. **FR-040**: Referenced card deletion shows warning with affected cards list, allows force delete (orphaned refs show broken link icon)
10. **FR-041**: Default campaign template: blank page card as root (user builds from scratch, maximum agency)
11. **FR-042**: Custom templates deferred (user can duplicate campaigns as workaround)

## Technical Context

**Language/Version**:
- Backend: Node.js 20 LTS + TypeScript 5.0+ (from feature 002)
- Frontend: React 18 + TypeScript 5.0+ (from feature 002)
- Database: SQLite3 with JSON1 extension enabled

**Primary Dependencies**:
- **Rich Text Editor**: TipTap 2.x (ProseMirror-based, extensible, React integration, collaborative editing ready)
- **Drag & Drop**: @dnd-kit (modern, accessible, tree reordering support)
- **Command Palette**: cmdk (Vercel's command menu, used by Linear/GitHub)
- **Database Views**: TanStack Table v8 (headless table, sorting, filtering), React Beautiful DnD (kanban)
- **Icons**: Lucide React (consistent icon set, emoji picker for page icons)

**Storage**:
- SQLite3 with JSON1 extension for JSONB columns (rich text content, database schemas, view configs)
- Adjacency list for card hierarchy (parent_id FK pattern)
- Materialized path for efficient subtree queries (path column: "/setting-id/campaign-id/card-id/child-card-id")

**Testing**:
- Frontend: Vitest + React Testing Library (card component rendering, slash command interactions)
- Backend: Vitest + Supertest (card CRUD, hierarchy validation, circular reference detection)
- E2E: Playwright (create card → nest cards → database CRUD → view switching → drag reorder)

**Target Platform**:
- Same as feature 002: localhost Docker deployment
- Browser: Chrome/Firefox/Edge (latest) - TipTap requires modern ES6+

**Project Type**: Web (extends feature 002 infrastructure)

**Performance Goals**:
- Card tree rendering <100ms for 1000 cards (virtualization for large lists)
- Database view switch <200ms (client-side filtering/sorting)
- Rich text editor load <50ms (lazy load TipTap extensions)
- Slash command menu open <16ms (60fps, no jank)
- Deep nesting: limit to 50 levels (prevents pathological recursion)

**Constraints**:
- **Infinite nesting risk**: Must prevent circular references and stack overflow
- **Rich text portability**: JSON format must be version-stable (migration path for TipTap updates)
- **Database schema flexibility**: User-defined schemas can't break SQL (JSONB validation required)
- **SQLite JSON**: JSON1 extension must be enabled in Better-SQLite3
- **Local-only**: No collaborative editing in MVP (but TipTap architecture supports future Y.js integration)
- **Single-user**: No concurrent edit conflict resolution needed (feature 002 guarantee)

**Scale/Scope**:
- 1 user (GM) on localhost
- 10 settings/worlds per user (most GMs run 1-3)
- 100 campaigns per setting (most have <10)
- 10,000 cards per campaign (Notion handles millions, 10k is safe for local SQLite)
- 100 columns per database card (practical limit, UI degrades beyond 50)
- 1,000 entries per database card (inline view paginates at 10)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Workflow-First Design ✓ PASS
- Cards ARE the wiki content (no separate export/publish step until spec 010)
- Drag-and-drop organization matches mental model
- Slash commands provide fast, keyboard-driven content creation
- Database cards eliminate need to "plan structure twice" - schema evolves with content
- TipTap inline editing = WYSIWYG workflow

### II. User Agency & Full Customization ✓ PASS
- Complete freedom to organize hierarchy (Setting → Campaign → Cards → ∞)
- User-defined database schemas (columns, types, views)
- Rich text = full formatting control
- No enforced templates beyond optional defaults
- Emoji icons + cover images = visual personalization
- Local SQLite = user owns all content, can backup/export JSON

### III. Information Filtering & Access Control ⚠️ PARTIAL (depends on spec 004)
- Card entity ready for filter_tag column (spec 004 will add System/Common/Player/DM Secret)
- Architecture supports tagging (JSONB metadata column for extensibility)
- Public view (spec 010) will filter cards by tag
- **Note**: This feature MUST design with spec 004 integration in mind

### IV. Knowledge Graph Architecture ⚠️ PARTIAL (depends on spec 006)
- Card entity can reference knowledge graph nodes (entity_reference column type)
- Adjacency list hierarchy compatible with graph traversal
- **Note**: Spec 006 will add graph-specific tables, cards will link to graph nodes

### V. BYOLLM & Privacy ✓ PASS
- No LLM in card architecture (pure CRUD)
- All content stored locally in SQLite
- Rich text JSON format = portable, no vendor lock-in
- Future AI features (spec 005) will read cards, not modify without approval

### VI. Local-Only & Prototype-First ✓ PASS
- Extends feature 002's Docker + SQLite stack
- TipTap runs client-side (no server rendering needed)
- Drag-and-drop purely frontend (order persisted to SQLite)
- No optimization complexity: pagination simple (LIMIT/OFFSET), no caching layer

### VII. Transparency & User Approval ✓ PASS
- User explicitly creates/deletes cards (slash commands + UI buttons)
- Circular reference prevention warns user before blocking
- Card deletion shows impacted references (approval required for cascade)
- No auto-organization or AI-suggested structure

**Result**: ⚠️ CONDITIONAL PASS - Card architecture must accommodate spec 004 (filter tags) and spec 006 (graph references). Design decisions below ensure compatibility.

---

## Design Decisions (Resolving NEEDS CLARIFICATION)

### Hierarchy & Sharing (FR-005)
**Decision**: Cards are campaign-scoped, NOT shareable across campaigns. Setting/World serves as organizational container only.

**Rationale**:
- **Simplicity**: No cross-campaign permission complexity (who can edit shared card?)
- **Local-only alignment**: Single-user prototype doesn't need sharing
- **Workaround**: User can duplicate cards manually if needed
- **Future**: If multi-user needed, implement proper references + permissions

### Page Card Metadata (FR-017)
**Decision**: Page cards support cover image (uploaded or URL) + emoji icon (like Notion)

**Rationale**:
- **User agency**: Visual customization enhances ownership
- **Notion parity**: Users expect this from Notion-inspired UI
- **Implementation**: cover_image_url (TEXT nullable), icon_emoji (TEXT nullable, single emoji)

### Database Column Types (FR-020)
**Decision**: MVP column types: text, number, date, select, multi-select, entity-reference. Defer: checkbox, URL, file, formula.

**Rationale**:
- **80% coverage**: These types handle most TTRPG use cases (characters, locations, items, sessions)
- **Complexity**: Formula requires expression parser, file upload requires storage strategy
- **Prototype-first**: Start with core types, add advanced types in iteration

### Database Filtering & Sorting (FR-026)
**Decision**: Support filter + sort in database views. Defer search (simple string contains acceptable).

**Rationale**:
- **Workflow value**: GMs need to filter "Active NPCs" or sort "Sessions by Date"
- **Client-side**: TanStack Table handles filter/sort without backend complexity
- **Search**: Full-text search requires SQLite FTS5, deferred to future

### Inline Database Display (FR-028)
**Decision**: Inline databases show first 10 entries + "View all X entries" link to full-page view

**Rationale**:
- **Performance**: 10 entries = <100ms render, avoids lag on large databases
- **UX**: User sees preview, clicks through for full interaction
- **Pagination**: Simple LIMIT 10 OFFSET 0 query

### Media Types (FR-031)
**Decision**: MVP supports image cards only. Defer video, audio, PDF.

**Rationale**:
- **Common case**: TTRPG campaigns heavily use images (maps, character art, handouts)
- **Complexity**: Video requires player controls, audio = streaming, PDF = viewer library
- **Future**: Media card type extensible (type column: 'image' | 'video' | 'audio' | 'pdf')

### Slash Commands (FR-034)
**Decision**: MVP slash commands: /page, /database, /text, /image, /heading1, /heading2, /heading3

**Rationale**:
- **Core needs**: Pages + databases = structure, text + images = content, headings = organization
- **Extensibility**: Command palette architecture supports adding more (spec 007 will add /map)

### Entity Reference UI (FR-039)
**Decision**: Entity references show preview on hover (card title + type). Defer backlinks panel.

**Rationale**:
- **Immediate value**: Hover preview confirms link target without navigation
- **Complexity**: Backlinks panel requires reverse indexing all references
- **Future**: Backlinks enhance navigation but not MVP-critical

### Card Deletion Handling (FR-040)
**Decision**: Deleting referenced card shows warning with list of affected cards. Allow force delete → orphaned refs show broken link icon.

**Rationale**:
- **User approval**: Warning prevents accidental data loss (transparency principle)
- **Graceful degradation**: Broken link icon = clear feedback, doesn't break UI
- **Cascade option**: Future enhancement could offer "delete + update refs"

### Default Campaign Template (FR-041)
**Decision**: Default campaign creates single blank page card as root (no starter databases)

**Rationale**:
- **Maximum agency**: User builds structure from scratch (Constitution II)
- **No assumptions**: We don't know if they need Characters, Locations, Sessions databases
- **Discoverability**: Quickstart guide shows creating first database

### Custom Templates (FR-042)
**Decision**: Defer custom templates. Workaround: duplicate existing campaign.

**Rationale**:
- **Complexity**: Template system = serialize card tree + schema, deserialize on create
- **Prototype-first**: Single-user can copy/paste or duplicate campaigns manually
- **Future**: Template marketplace could be community feature

---

## Phase 0: Outline & Research

**Status**: ✓ COMPLETE (research.md created with 10 critical areas, 1072 lines)

### Critical Research Areas

1. **Tree Hierarchy Patterns** (Adjacency List vs Nested Sets vs Materialized Path)
2. **Rich Text Editor Selection** (TipTap vs Slate vs Draft.js)
3. **Rich Text JSON Storage Format** (ProseMirror JSON structure, versioning)
4. **Circular Reference Detection Algorithm** (DFS cycle detection, path validation)
5. **Database Card Schema Storage** (JSONB structure for columns + views)
6. **SQLite JSON1 Extension** (JSONB functions, indexing, query performance)
7. **Drag-and-Drop Tree Reordering** (@dnd-kit tree implementation, position calculation)
8. **Command Palette UX Pattern** (cmdk integration, keyboard navigation, fuzzy search)
9. **Database View Rendering** (TanStack Table config, kanban board DnD)
10. **Entity Reference Resolution** (FK integrity, cascade delete, orphan handling)

---

## Phase 1: Contracts & Data Model

**Status**: ✓ COMPLETE

**Artifacts Created**:
- `data-model.md` - Setting, Campaign (extended), Card entities with SQL schemas
- `contracts/cards.yaml` - Card CRUD, move, reorder, subtree operations (OpenAPI 3.0)
- `contracts/settings.yaml` - Setting CRUD operations (OpenAPI 3.0)
- `contracts/database-cards.yaml` - Database schema management, entry CRUD, view operations (OpenAPI 3.0)
- `quickstart.md` - 15-minute setup guide with slash commands demo
- `CLAUDE.md` updated - Added feature 003 technologies and project structure

---

## Phase 2: Task Generation Planning

**Status**: Ready for /tasks command

**Implementation Approach**:

### Task Categories

1. **Database Setup** (2 tasks):
   - Create migration script for Setting + Card tables
   - Enable SQLite JSON1 extension, add indexes

2. **Backend Services** (5 tasks):
   - SettingService (CRUD)
   - CardService (CRUD, move, reorder, subtree queries, circular ref validation)
   - DatabaseService (schema management, entry CRUD, view filtering)
   - Campaign migration (add setting_id FK)
   - Error handling for depth limits, circular refs

3. **Backend Routes** (3 tasks):
   - `/api/settings` endpoints
   - `/api/cards` endpoints (CRUD, move, reorder, subtree, search)
   - `/api/cards/:id/schema`, `/api/cards/:id/entries` endpoints

4. **Frontend Core** (4 tasks):
   - CardContext + useCards hook
   - CardService API client
   - SettingService API client
   - DatabaseService API client

5. **Frontend Components** (8 tasks):
   - CardTree component (sidebar hierarchy with @dnd-kit)
   - CardEditor component (TipTap integration, ProseMirror JSON)
   - SlashCommandPalette component (cmdk, /page, /database, /text, /image, /heading1-3)
   - DatabaseView component (table view with TanStack Table)
   - DatabaseListView component
   - DatabaseGalleryView component
   - DatabaseKanbanView component (React Beautiful DnD)
   - EntityReferencePreview component (hover preview)

6. **Frontend Pages** (2 tasks):
   - SettingsPage (list, create, edit, delete settings)
   - CardPage (full-page card view with editor + children sidebar)

7. **Testing** (4 tasks):
   - Backend contract tests (cards, settings, database-cards)
   - Backend unit tests (circular ref detection, path calculation, depth validation)
   - Frontend component tests (CardTree, SlashCommandPalette, DatabaseView)
   - E2E tests (create card → nest → database CRUD → view switching → drag reorder)

**Total Estimated Tasks**: 28

**Critical Path Dependencies**:
- Database Setup → Backend Services → Backend Routes
- Backend Routes → Frontend Services → Frontend Components
- Frontend Core → Frontend Pages
- All implementation → Testing

**Parallel Work Opportunities**:
- Frontend components can develop against mock data while backend builds
- Database views (table/list/gallery/kanban) can be built in parallel
- Contract tests can be written alongside implementation

**Risk Areas Requiring Extra Attention**:
1. Circular reference detection (must be bulletproof)
2. Path recalculation on move operation (transactional, entire subtree)
3. TipTap editor initialization (lazy loading, extension config)
4. Drag-and-drop tree reordering (complex state management)
5. Database view filtering/sorting (client-side performance with 1000+ entries)

---

**Next Command**: `/tasks` - Generate `tasks.md` from this plan
