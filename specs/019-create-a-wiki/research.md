# Research & Technical Decisions: Wiki Portal

**Feature**: 019-create-a-wiki
**Date**: 2025-10-10
**Purpose**: Document technical decisions for wiki portal implementation

---

## Research Summary

Feature 019 preserves the existing card-based content architecture from Feature 003 as an optional wiki tool separate from the new database-centric system (Features 014+). Since Feature 003 is already implemented and the wiki reuses those patterns, research focuses on **separation architecture** and **integration points** rather than new technology selection.

---

## Decision 1: Separate Tables vs Separate Database Files

**Decision**: Use separate tables (`wiki_cards`, `wiki_hierarchy`) in the same SQLite file

**Rationale**:
- Simplifies backup/export (single file includes everything)
- Consistent with existing architecture (all campaign data in one DB)
- Clean separation via table namespacing prevents data mixing
- Single connection pool, simpler transaction management
- Campaign deletion can cascade to all related data easily

**Alternatives Considered**:
- **Separate SQLite files**: Rejected - complicates backup, requires managing multiple connections, harder to maintain referential integrity with campaigns table
- **Same tables with `is_wiki` flag**: Rejected - risks data mixing, harder to query, violates clean architectural separation principle

**Implementation**: Add `wiki_cards` and `wiki_hierarchy` tables to existing schema with FK to `campaigns` table

---

## Decision 2: Reuse Existing CardService vs WikiCardService

**Decision**: Create new `WikiCardService` separate from existing `CardService`

**Rationale**:
- Clear separation of concerns (database entities vs wiki content)
- Prevents accidental wiki/database data mixing
- Allows different business logic (e.g., wiki doesn't need AI context exclusion checks in service layer)
- Easier to maintain/test in isolation
- Future-proofs for wiki-specific features (versioning, templates)

**Alternatives Considered**:
- **Reuse CardService with table parameter**: Rejected - service becomes cluttered with conditional logic, harder to reason about which operations affect which system
- **Extend CardService via inheritance**: Rejected - unnecessary coupling, changes to database logic shouldn't affect wiki

**Implementation**: `WikiCardService.ts` mirrors CardService patterns but operates on `wiki_cards`/`wiki_hierarchy` tables

---

## Decision 3: Portal Navigation UI Pattern

**Decision**: Use route-based navigation with `<WikiPortal>` wrapper component that provides separate context/layout

**Rationale**:
- React Router supports nested routes cleanly
- Feels like navigating to different section (URL changes: `/campaign/:id/dashboard` → `/campaign/:id/wiki`)
- Browser back button works naturally
- Can lazy-load wiki components (code splitting)
- Sidebar can highlight active section (Dashboard vs Wiki)

**Alternatives Considered**:
- **Modal/drawer overlay**: Rejected - doesn't feel like "portal to different section", limited screen real estate
- **Tab component**: Rejected - feels too integrated with dashboard, loses portal feeling
- **Separate SPA**: Rejected - unnecessary complexity, requires separate auth/state management

**Implementation**: Add `/campaign/:id/wiki` and `/campaign/:id/wiki/:cardId` routes with `WikiPortal` layout wrapper

---

## Decision 4: "Back to Dashboard" State Preservation

**Decision**: Use `sessionStorage` to save dashboard scroll position, filters, active category before navigating to wiki

**Rationale**:
- Persists across wiki navigation but cleared on refresh (appropriate for prototype)
- Small data footprint (just position/filter state)
- Survives page changes within session
- Simple API, no server round-trip needed

**Alternatives Considered**:
- **URL query parameters**: Rejected - clutters URL, limited data size, poor UX
- **Redux/global state**: Rejected - overkill for simple position tracking, adds complexity
- **LocalStorage**: Rejected - persists across sessions unnecessarily, harder to clean up

**Implementation**: Save dashboard state to `sessionStorage.setItem('dashboardState', JSON.stringify({ scrollY, filters, categoryId }))` on wiki navigation, restore on "Back to Dashboard"

---

## Decision 5: TipTap Editor Configuration Reuse

**Decision**: Reuse existing TipTap configuration from Feature 003 with same extensions (headings, lists, tables, slash commands, database embeds)

**Rationale**:
- Already implemented and tested in Feature 003
- Familiar UX for users who used early card system
- Preserves all rich text capabilities (consistency)
- No additional dependencies or configuration needed

**Alternatives Considered**:
- **Simplified TipTap config**: Rejected - users expect full Feature 003 capabilities in wiki
- **Different rich text editor (Quill, Draft.js)**: Rejected - introduces inconsistency, requires reimplementing slash commands/database views

**Implementation**: Import and reuse `tiptapConfig.ts` from Feature 003, apply to wiki editor instances

---

## Decision 6: Information Level Filtering Architecture

**Decision**: Reuse Feature 004 `InformationLevelContext` and `ViewModeContext` with wiki-specific filter logic

**Rationale**:
- Consistent filtering UX across database and wiki
- Existing context/hooks already tested
- Same view mode toggle in sidebar works for both systems
- Player view filtering logic already proven

**Alternatives Considered**:
- **Separate wiki-specific view mode**: Rejected - confusing UX (two view mode toggles), unnecessary code duplication
- **No filtering in wiki**: Rejected - spec requires FR-023 to FR-028 for player view filtering

**Implementation**: `WikiCardTree` component subscribes to `ViewModeContext` and filters `wiki_cards` by `player_knowledge` field

---

## Decision 7: Slash Command Palette for Wiki

**Decision**: Reuse existing `SlashCommandPalette` component from Feature 003, configure with wiki-specific commands

**Rationale**:
- Already implements fuzzy search, keyboard navigation, command execution
- Wiki needs same slash commands (headings, lists, tables, database views)
- Consistent UX across card-based content
- Zero reimplementation cost

**Alternatives Considered**:
- **New wiki-specific slash command palette**: Rejected - pure code duplication
- **Simplified command set**: Rejected - spec FR-029 to FR-033 require full slash command support

**Implementation**: Pass wiki-specific command handlers to `<SlashCommandPalette commands={wikiCommands} onExecute={handleWikiCommand} />`

---

## Decision 8: Database View Embeds in Wiki Cards

**Decision**: Reuse existing `DatabaseView` component (table/list/gallery/kanban) from Feature 003, store embedded data as JSONB in `wiki_cards.content` field

**Rationale**:
- FR-034 to FR-040 require embedded database views in wiki
- Feature 003 already implements all 4 view types with CRUD operations
- Storing as JSONB within rich text content simplifies data model (no separate tables)
- TipTap supports custom nodes for embedded content

**Alternatives Considered**:
- **Separate tables for embedded databases**: Rejected - over-engineering for wiki use case, complicates queries
- **No database embeds in wiki**: Rejected - violates spec requirements

**Implementation**: TipTap custom node `DatabaseEmbed` renders `<DatabaseView />` component, stores schema + data as JSONB in content

---

## Decision 9: Auto-save Implementation

**Decision**: Use debounced auto-save (30-second delay) with optimistic UI updates and background async persistence

**Rationale**:
- Spec FR-012 requires 30-second auto-save interval
- Debouncing prevents save storms during active typing
- Optimistic updates provide instant feedback
- Async saves don't block editing (FR-058)

**Alternatives Considered**:
- **Immediate save on every change**: Rejected - excessive database writes, poor performance
- **Manual save only**: Rejected - violates FR-012 auto-save requirement
- **LocalStorage draft buffer**: Rejected - adds complexity, unnecessary for local prototype

**Implementation**: `useAutoSave` hook with 30s debounce timer, calls `WikiCardService.update()` in background, shows save indicator

---

## Decision 10: Versioning Strategy

**Decision**: Implement simple integer version counter with optional version history (1-deep backup)

**Rationale**:
- FR-013 requires version tracking for edit history
- Prototype doesn't need full version control (Git-style)
- 1-deep backup (current + previous version) supports undo/revert
- Integer `version` field in `wiki_cards` table is simple, fast

**Alternatives Considered**:
- **Full version history table**: Rejected - over-engineering for prototype, adds storage overhead
- **No versioning**: Rejected - violates FR-013 requirement
- **Snapshot-based versioning**: Rejected - complex to implement, unclear UX benefit

**Implementation**: `wiki_cards.version` INTEGER, `wiki_card_versions` table stores previous version on update (limit 1 backup per card)

---

## Decision 11: Circular Reference Prevention

**Decision**: Reuse existing circular reference validation from Feature 003's `CardService.validateHierarchy()`

**Rationale**:
- FR-018 requires circular reference prevention
- Feature 003 already implements adjacency list traversal for cycle detection
- Same algorithm works for `wiki_hierarchy` table
- Tested and proven logic

**Alternatives Considered**:
- **Reimplement validation**: Rejected - code duplication, risk of bugs
- **Allow circular references**: Rejected - violates FR-018, causes infinite loops in tree rendering

**Implementation**: `WikiCardService.validateHierarchy()` calls shared utility `detectCircularReference(parentId, childId, 'wiki_hierarchy')`

---

## Decision 12: Drag-and-Drop Reordering Library

**Decision**: Reuse `@dnd-kit` from Feature 003 for wiki card tree reordering

**Rationale**:
- FR-017 requires drag-and-drop reordering
- Feature 003 already uses `@dnd-kit` for card tree
- Same library supports tree-structured drag-and-drop with collision detection
- Accessible (keyboard support), performant

**Alternatives Considered**:
- **React Beautiful DnD**: Rejected - Feature 003 uses @dnd-kit, consistency preferred
- **Native HTML5 drag-and-drop**: Rejected - poor mobile support, limited customization

**Implementation**: `<WikiCardTree>` uses `@dnd-kit/core` with tree collision algorithm, updates `wiki_hierarchy.order_index` on drop

---

## Decision 13: AI Context Exclusion Enforcement

**Decision**: Implement exclusion at service layer - AI tools (Feature 017/018) import only from database tables, never query `wiki_cards`

**Rationale**:
- FR-048 to FR-051 require strict AI context exclusion
- Enforcement at service layer prevents accidental wiki queries
- Clear architectural boundary (databases = canon, wiki = optional GM tool)
- Future-proof: even if new AI features added, exclusion is baked into data access layer

**Alternatives Considered**:
- **Documentation-only exclusion**: Rejected - risk of future bugs where AI accidentally queries wiki
- **Database-level triggers/constraints**: Rejected - SQLite doesn't support granular query blocking, over-engineered

**Implementation**:
- `ImportService` (Feature 017) and `MCPServer` (Feature 018) whitelist database tables only in query logic
- Add comment in `WikiCardService`: `// IMPORTANT: This service is NEVER called by AI tools - wiki is NOT part of canon context`

---

## Decision 14: Performance Optimization Strategy

**Decision**: Defer performance optimization to implementation phase, focus on meeting FR-053 to FR-058 targets with simple approaches first

**Rationale**:
- Constitution Principle VI: Prototype-first, functionality over optimization
- Spec performance targets are reasonable for local prototype (200ms card creation, 300ms filtering)
- SQLite with proper indexes should meet targets without complex caching
- Premature optimization wastes time on unnecessary complexity

**Alternatives Considered**:
- **Redis caching layer**: Rejected - overkill for local prototype, adds deployment complexity
- **Aggressive memoization/virtualization**: Rejected - implement only if targets missed during testing

**Implementation**:
- Add indexes on `wiki_cards(campaign_id, player_knowledge)` and `wiki_hierarchy(parent_wiki_card_id, child_wiki_card_id)`
- Measure performance during E2E tests, optimize only if targets missed

---

## Integration Points with Existing Features

### Feature 003 (Card-Based Content Architecture) - **HEAVY REUSE**
- Reuse: CardTree component patterns, TipTap editor configuration, SlashCommandPalette, DatabaseView embeds, @dnd-kit integration
- New: WikiCardService (separate service), wiki-specific routes, wiki_cards/wiki_hierarchy tables

### Feature 004 (Information Level Filtering) - **CONTEXT REUSE**
- Reuse: InformationLevelContext, ViewModeContext, useFilteredCards hook pattern
- New: Filter logic queries wiki_cards table instead of cards table

### Feature 015 (Dashboard & Navigation) - **SIDEBAR INTEGRATION**
- Reuse: Existing sidebar layout
- New: "Wiki" button in sidebar, route switching logic, dashboard state preservation

### Features 017 & 018 (AI Tools) - **EXCLUSION ARCHITECTURE**
- No code reuse - explicit exclusion
- New: Documentation comments, service-layer table whitelisting to prevent wiki queries

---

## Dependencies Summary

**Existing Production Dependencies (Reused)**:
- React 18 + TypeScript 5.0+
- TipTap 2.x (rich text editor)
- @dnd-kit/core (drag-and-drop)
- Radix UI (accessible components)
- React Router v6 (routing)
- Better-SQLite3 (database)

**No New Dependencies Required** - All functionality achievable with existing tech stack

---

## Risk Assessment

**Low Risk**:
- Reusing proven Feature 003 architecture minimizes implementation risk
- Separate tables prevent data corruption/mixing
- AI exclusion enforced at service layer (architectural guarantee)

**Medium Risk**:
- Performance targets (FR-053 to FR-058) may require optimization during implementation - mitigated by adding indexes, measuring early

**High Risk**: None identified

---

## Next Steps (Phase 1)

1. Design `wiki_cards` and `wiki_hierarchy` table schemas (data-model.md)
2. Define API contracts for wiki CRUD operations (contracts/)
3. Extract test scenarios from spec acceptance scenarios (quickstart.md)
4. Update CLAUDE.md with wiki portal context

---

**References**:
- Feature 003 implementation: `specs/003-create-a-notion/`
- Feature 004 filtering patterns: `specs/004-create-a-tagging/`
- Feature 015 dashboard: `specs/015-create-the-dashboard/`
- TipTap docs: https://tiptap.dev/docs
- @dnd-kit docs: https://docs.dndkit.com/
