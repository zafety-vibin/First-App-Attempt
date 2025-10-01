# Implementation Plan: Information Level-Based Filtering System

**Branch**: `004-create-a-tagging` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-create-a-tagging/spec.md`
**Dependencies**: Feature 003 (Card-Based Content Architecture)

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
2. Fill Technical Context ✓
3. Resolve NEEDS CLARIFICATION items → Design Decisions ✓ (14 resolved via /clarify)
4. Fill Constitution Check ✓
5. Evaluate Constitution Check → PASS (conditional, noted)
6. Execute Phase 0 → research.md (IN PROGRESS)
7. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md update
8. Re-evaluate Constitution Check
9. Plan Phase 2 → Task generation approach
10. STOP - Ready for /tasks command
```

## Summary

**Primary Requirement**: Implement information level-based filtering system with four default levels (System, Common Knowledge, Player Knowledge, DM Secret) and user-defined custom levels. Each card has exactly ONE information level controlling visibility (DM View shows all, Player/General View hides hierarchical levels) and AI access (Player Portal AI accesses only Common/Player Knowledge, Import/Planning AI access all levels). UI includes painter's easel palette for setting default level on card creation, properties panel for editing existing cards, Settings page for managing custom levels. Database integration supports entry-level + column-level visibility with special "Player Knowledge" field for partial row visibility.

**Technical Approach**: Extend Card entity from feature 003 with `information_level_id` FK. Store default levels (4) and custom levels in `information_levels` table with name, color, hierarchical flag. View mode (DM/Player) stored in user session, persisted to localStorage. Client-side filtering hides cards before render (security: server validates on API responses). Painter's easel = React context providing current level, updates card creation defaults. Properties panel = inline editor for changing card level. Database columns get optional `hierarchical` boolean flag. Special "Player Knowledge" text column type enables partial visibility for secret entries. TipTap editor integration shows visual indicators (tint + icon) for DM Secret cards in DM View.

**Critical Clarifications Resolved**:
All 14 clarifications documented in spec.md Clarifications section (Session 2025-10-01)

## Technical Context

**Language/Version**:
- Backend: Node.js 20 LTS + TypeScript 5.0+ (from features 002-003)
- Frontend: React 18 + TypeScript 5.0+ (from features 002-003)
- Database: SQLite3 with JSON1 extension (from features 002-003)

**Primary Dependencies**:
- **React Context API**: Painter's easel palette state (current selected level)
- **localStorage**: Persist view mode (DM View vs Player/General View) across sessions
- **TipTap extensions**: Custom node decoration for secret card visual indicators (tint + icon)
- **React Portal**: Properties panel overlay for inline level editing
- **TanStack Table** (feature 003): Column-level hierarchical flag integration

**Storage**:
- SQLite3 `information_levels` table (4 default rows + custom user-created rows)
- Card entity extended with `information_level_id` FK (default to 'system' UUID)
- DatabaseColumn entity extended with `hierarchical` boolean flag (default false)
- User session stores current view_mode ('dm' | 'player')

**Testing**:
- Frontend: Vitest + React Testing Library (painter's easel context, view mode toggle, filter rendering)
- Backend: Vitest + Supertest (information level CRUD, view mode API filtering)
- E2E: Playwright (create card with level → toggle view → verify visibility, database partial visibility)

**Target Platform**:
- Same as features 002-003: localhost Docker deployment
- Browser: Chrome/Firefox/Edge (latest)

**Project Type**: Web (extends features 002-003 infrastructure)

**Performance Goals**:
- Information level filtering <50ms overhead per card render (client-side filtering)
- View mode toggle <200ms for campaigns with 10,000 cards (React context update + re-render)
- Painter's easel palette level change <16ms (60fps, no jank)
- Secret card visual indicator (tint + icon) <16ms render (CSS-based, no JS overhead)

**Constraints**:
- **Security**: Player/General View filtering MUST occur before card rendering (no secret content in DOM)
- **Client-side filtering**: Cards must filter client-side for performance, but server MUST validate on API responses
- **ONE level per card**: Cannot assign multiple levels simultaneously (simplifies logic, differs from generic tags)
- **Hierarchical precedence**: If card's level is hierarchical (DM Secret or custom hierarchical), card hidden in Player View regardless of other properties
- **Database complexity**: Entry-level + column-level + "Player Knowledge" field = 3-layer visibility logic

**Scale/Scope**:
- 1 user (GM) on localhost
- 4 default information levels (immutable)
- 20 custom information levels per campaign (reasonable limit, most campaigns use <5)
- 10,000 cards per campaign (feature 003 limit)
- 100 columns per database card (feature 003 limit), each can be marked hierarchical

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Workflow-First Design ✓ PASS
- Information levels eliminate "plan twice" for secret management (no separate player wiki rewrite)
- AI Import (feature 005) dynamically assigns levels during PDF import (bulk workflow)
- Painter's easel palette = fast level assignment during note creation (seconds matter)
- Database "Player Knowledge" field = partial visibility without duplicating entries

### II. User Agency & Full Customization ✓ PASS
- Users create custom information levels with names, colors, hierarchical flags (full control)
- Users decide when to promote secrets (DM Secret → Player Knowledge) as campaign evolves
- Users define which database columns are hierarchical (per-field secrecy)
- Users control AI context via level-based filtering (Player Portal vs Planning AI)

### III. Information Filtering & Access Control ✓ PASS
- **Core feature**: Implements tiered visibility system (System, Common Knowledge, Player Knowledge, DM Secret)
- **NOTE**: Constitution mentions "Visual censorship (black bars)" but clarified spec implements "complete hiding (not rendered)". **Resolution**: Complete hiding is stronger DM control than censorship bars, aligns with "always hidden from non-DMs" principle. User chose this in clarifications.
- Dynamic tier promotion (DM Secret → Player Knowledge) supported via properties panel
- Per-card level assignment with bulk editing (database toolbar actions)
- Level-scoped queries for AI interactions (Player Portal filters to Common/Player Knowledge)

### IV. Knowledge Graph Architecture ⚠️ PARTIAL (depends on feature 006)
- Information levels will integrate with knowledge graph queries (feature 006 will filter graph nodes by level)
- Graph relationship inference (feature 006) must respect current view mode (no secret nodes in player queries)
- **Note**: This feature MUST design with feature 006 integration in mind (graph nodes will have information_level_id FK)

### V. BYOLLM & Privacy ✓ PASS
- No LLM in information level architecture (pure filtering logic)
- Import AI (feature 005) level assignment uses user's own LLM credentials
- All level data stored locally in SQLite
- Player Portal AI (feature 009) filtering happens server-side with user's credentials

### VI. Local-Only & Prototype-First ✓ PASS
- Extends features 002-003's Docker + SQLite stack
- Client-side filtering acceptable (no optimization complexity)
- View mode persisted to localStorage (no server session management needed)
- Painter's easel palette = React context (simple state management)

### VII. Transparency & User Approval ✓ PASS
- User explicitly assigns levels (painter's easel, properties panel, context menu)
- Import AI (feature 005) level assignments require DM review before finalizing
- Custom level deletion shows warning: "Secrets may now be exposed in Player View"
- View mode toggle = user-initiated action (no automatic switching)

**Result**: ⚠️ CONDITIONAL PASS - Core feature fully aligned. Minor deviation: Constitution mentions "visual censorship (black bars)" but clarified spec implements complete hiding. This is acceptable (user chose complete hiding in clarifications, aligns with DM control principle). Feature 006 integration must be accommodated (graph nodes get information_level_id).

---

## Project Structure

### Documentation (this feature)
```
specs/004-create-a-tagging/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── information-levels.yaml    # Information Level CRUD
│   └── view-mode.yaml             # View mode toggle + filtering
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── models/             # User, Campaign, Session, Setting, Card, InformationLevel
│   ├── services/           # AuthService, CampaignService, CardService, InformationLevelService, ViewModeService
│   ├── middleware/         # keycloak.ts, cors.ts, errorHandler.ts, viewModeFilter.ts
│   ├── routes/             # auth.ts, campaigns.ts, cards.ts, settings.ts, information-levels.ts, view-mode.ts
│   └── db/
│       ├── schema.sql      # CREATE TABLE information_levels, ALTER TABLE cards ADD information_level_id, ALTER TABLE database_columns ADD hierarchical
│       └── migrations.ts   # Version tracking
└── tests/
    ├── contract/           # API contract tests (information-levels, view-mode filtering)
    ├── integration/        # View mode filtering E2E
    └── unit/               # InformationLevelService tests, filtering logic tests

frontend/
├── src/
│   ├── components/         # CardTree, CardEditor, SlashCommandPalette, DatabaseView, PaintersEaselPalette (NEW), ViewModeToggle (NEW), PropertiesPanel (extended), SettingsInformationLevels (NEW)
│   ├── pages/              # LandingPage, CampaignsPage, CampaignPage, CardPage, SettingsPage (extended)
│   ├── services/           # keycloakService, apiClient, campaignService, cardService, informationLevelService (NEW), viewModeService (NEW)
│   ├── hooks/              # useAuth, useCampaigns, useCards, useInformationLevel (NEW), useViewMode (NEW)
│   ├── contexts/           # AuthContext, CardContext, InformationLevelContext (NEW), ViewModeContext (NEW)
│   ├── routes/             # AppRoutes with protected routes
│   └── config/             # keycloak.ts, tiptap.ts
└── tests/
    ├── components/         # PaintersEaselPalette, ViewModeToggle, filtered CardTree rendering
    └── e2e/                # Create card with level → toggle view → verify visibility, database partial visibility
```

**Structure Decision**: Web application (frontend + backend) as per features 002-003. This feature extends existing architecture with new entities (InformationLevel), extended entities (Card, DatabaseColumn), new frontend components (painters easel, view mode toggle), and new contexts for global state management (current information level, current view mode).

---

## Design Decisions (Resolving NEEDS CLARIFICATION)

### Information Levels vs Tags Terminology
**Decision**: Call visibility control "Information Levels", reserve "tags" for future generic labeling feature.

**Rationale**:
- **User clarity**: "Level" implies hierarchy and exclusivity (ONE per card), "tag" implies multiple labels
- **AI behavior differentiation**: Levels control AI access, tags would be organizational metadata
- **Future extensibility**: Separate concepts allows adding generic tags later without confusion

### ONE Information Level Per Card
**Decision**: Cards have exactly ONE information level at any time (no multiple simultaneous levels).

**Rationale**:
- **Simplicity**: No complex precedence rules (which level wins for visibility?)
- **Clear semantics**: "This card IS Common Knowledge" vs "This card HAS Common Knowledge AND Player Knowledge"
- **Evolution workflow**: Users change level as content evolves (DM Secret → Player Knowledge when revealed)
- **Complexity**: Multiple levels = combinatorial explosion (4 defaults + N custom = 2^(4+N) combinations)

### Complete Hiding vs Visual Censorship
**Decision**: Player/General View completely hides hierarchical cards (not rendered), no black bars or censorship indicators.

**Rationale**:
- **User preference**: Clarified in session 2025-10-01, user chose complete hiding
- **Security**: No DOM exposure of secret content (scrapers/inspectors can't find hidden text)
- **UX simplicity**: No "teaser" effect encouraging players to ask "what's behind the bar?"
- **Constitution alignment**: DM Secret principle = "always hidden from non-DMs" (complete hiding stronger than visual censorship)

### Painter's Easel Palette Design
**Decision**: Bottom-left corner palette showing current selected level (small colored square), applies to `/page`, `/database`, etc. commands from SlashCommandPalette.

**Rationale**:
- **Workflow alignment**: Pre-setting level before rapid card creation (bulk note import workflow)
- **Artist metaphor**: "Choose brush before painting" = intuitive mental model
- **Non-intrusive**: Bottom-left doesn't block card editor, visible but not distracting
- **Keyboard accessible**: Click palette → arrow keys select level → Enter confirms
- **"+" button**: Palette includes "+" button navigating to Settings → Information Levels page for creating custom levels

### Database Visibility Logic (3-Layer)
**Decision**: Entry-level (card's information_level_id) + column-level (hierarchical flag) + "Player Knowledge" text field (partial visibility trigger).

**Rationale**:
- **User's Notion workflow**: Replicates existing DM practice ([DM] column prefix + "Player Knowledge?" checkbox)
- **Flexibility**: Entire database secret (all entries DM Secret) + selective reveal (check "Player Knowledge" field) + always-secret columns ([DM] Motivation)
- **Partial visibility**: "Player Knowledge" field filled → show entry name + that field only (player-safe summary without full secret entry)

**Visibility precedence**:
1. Column hierarchical flag → Column hidden in Player View (all rows, always)
2. Entry information_level_id hierarchical → Entire row hidden in Player View
3. Entry hierarchical BUT "Player Knowledge" field filled → Show entry name + Player Knowledge field (hierarchical columns still hidden)

### Custom Information Levels Deletion Handling
**Decision**: Delete level → cards revert to System with warning banner.

**Rationale**:
- **Safety**: Warning prevents accidental secret exposure ("Secrets may now be exposed")
- **User control**: DM can manually re-assign levels before deleting if concerned
- **Simplicity**: No orphaned state, no blocking deletion (user might want to consolidate levels)
- **Undo**: User can recreate level and bulk re-assign if mistake

---

## Phase 0: Outline & Research

**Status**: NOT STARTED (will create research.md with 8 critical areas)

### Critical Research Areas

1. **React Context for Painter's Easel Palette** (Provider pattern, default level state, integration with SlashCommandPalette)
2. **localStorage View Mode Persistence** (serialization, cross-tab sync issues, SSR considerations if future server-side rendering)
3. **Client-Side Card Filtering** (pre-render filtering with React useMemo, performance optimization for 10k cards)
4. **TipTap Secret Card Visual Indicators** (custom node decorations, CSS tint overlay technique, emoji icon positioning in top-right)
5. **Database Column Hierarchical Flag** (schema extension for database_columns table, column type metadata, TanStack Table integration)
6. **Database "Player Knowledge" Field** (special column type implementation, partial visibility query logic for server-side filtering)
7. **View Mode Toggle UI** (3-dot menu component library selection, dropdown keyboard navigation patterns, Ctrl+Shift+P shortcut implementation)
8. **Information Level API Filtering** (server-side validation strategy, view mode header propagation, response sanitization to prevent accidental secret leakage)

---

**Next Step**: Execute Phase 0 research to create research.md with detailed findings for each area.

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

**Status**: NOT STARTED

1. **Extract entities from feature spec** → `data-model.md`:
   - InformationLevel entity (id, name, color, hierarchical, type, campaign_id)
   - Card entity extension (information_level_id FK)
   - DatabaseColumn entity extension (hierarchical boolean)
   - ViewMode (user session state, not persistent entity)

2. **Generate API contracts** from functional requirements:
   - `/contracts/information-levels.yaml` - CRUD operations for custom levels
   - `/contracts/view-mode.yaml` - Toggle view mode, get filtered cards
   - Use OpenAPI 3.0 format consistent with features 002-003

3. **Generate contract tests** from contracts:
   - Test information level CRUD with validation
   - Test view mode filtering (DM sees all, Player hides hierarchical)
   - Test database partial visibility with "Player Knowledge" field
   - Tests must fail initially (TDD approach)

4. **Extract test scenarios** from user stories:
   - Create card with System level (default) → verify in both views
   - Create card with DM Secret → verify hidden in Player View
   - Toggle view mode → verify immediate filtering
   - Delete custom level → verify warning + revert to System
   - Database entry with "Player Knowledge" field → verify partial visibility

5. **Update CLAUDE.md incrementally**:
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add feature 004 technologies: React Context API, localStorage, TipTap node decorations
   - Update project structure with new components/contexts
   - Keep under 150 lines for token efficiency

**Output**: data-model.md, /contracts/*, failing contract tests, quickstart.md, updated CLAUDE.md

---

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P]
- Each user story → integration test task
- Implementation tasks to make tests pass

**Task Categories**:

1. **Database Setup** (2 tasks):
   - Create migration script for information_levels table + Card/DatabaseColumn extensions
   - Seed default levels (System, Common Knowledge, Player Knowledge, DM Secret)

2. **Backend Services** (3 tasks):
   - InformationLevelService (CRUD, validation, deletion with card reversion)
   - ViewModeService (filter cards by view mode, validate hierarchical hiding)
   - Card/DatabaseColumn service extensions (information_level_id FK handling)

3. **Backend Routes** (2 tasks):
   - `/api/information-levels` endpoints (GET, POST, PUT, DELETE)
   - `/api/view-mode` endpoints (POST /toggle, GET /cards with view-mode header)

4. **Frontend Core** (4 tasks):
   - InformationLevelContext + useInformationLevel hook (current selected level for painter's easel)
   - ViewModeContext + useViewMode hook (current DM/Player view, persist to localStorage)
   - InformationLevelService API client (CRUD operations)
   - ViewModeService API client (toggle, get filtered cards)

5. **Frontend Components** (5 tasks):
   - PaintersEaselPalette component (bottom-left, shows current level, "+" button, level selection dropdown)
   - ViewModeToggle component (top-right 3-dot menu, DM View / Player View options, Ctrl+Shift+P shortcut)
   - PropertiesPanel extension (add information level dropdown for editing card level)
   - SettingsInformationLevels page (list custom levels, create/edit/delete UI, warning on delete)
   - CardTree filtering (integrate useViewMode hook, client-side filter before render)

6. **Frontend Integration** (2 tasks):
   - TipTap editor secret indicators (CSS tint overlay + closed eye icon for DM Secret cards in DM View)
   - Database view filtering (TanStack Table integration for column hierarchical flag + "Player Knowledge" field partial visibility)

7. **Testing** (4 tasks):
   - Backend contract tests (information-levels, view-mode filtering)
   - Backend unit tests (filter logic, partial visibility query logic, card reversion on level deletion)
   - Frontend component tests (PaintersEaselPalette context integration, ViewModeToggle localStorage persistence, CardTree filtering)
   - E2E tests (create card with level → toggle view → verify visibility, database partial visibility workflow)

**Ordering Strategy**:
- TDD order: Contract tests → Model creation → Service implementation → Route wiring
- Dependency order: Backend services before frontend services, contexts before components
- Mark [P] for parallel execution (independent contract tests, independent component development)

**Estimated Output**: 22 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

---

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation against <50ms filtering overhead)

---

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

**Note**: Minor deviation from constitution wording ("visual censorship black bars" vs "complete hiding") is not a violation, as user explicitly chose complete hiding in clarifications and it aligns with stronger DM control principle.

---

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - 2025-10-01
- [x] Phase 1: Design complete (/plan command) - 2025-10-01
  - [x] research.md created (1000+ lines, 8 research areas)
  - [x] data-model.md created (InformationLevel entity, Card/DatabaseColumn extensions)
  - [x] contracts/information-levels.yaml created (OpenAPI 3.0)
  - [x] contracts/view-mode.yaml created (OpenAPI 3.0)
  - [x] quickstart.md created (6 workflows, 25-30 min guide)
  - [x] CLAUDE.md updated (feature 004 technologies added)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only) ✓
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (conditional, minor deviation noted and justified)
- [x] Post-Design Constitution Check: PASS (visual censorship deviation justified as stronger DM control)
- [x] All NEEDS CLARIFICATION resolved (14 via /clarify)
- [x] Complexity deviations documented (none, minor deviation addressed in Constitution Check)

---

*Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`*
