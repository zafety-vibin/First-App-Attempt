# Implementation Plan: Wiki Portal

**Branch**: `019-create-a-wiki` | **Date**: 2025-10-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `C:/Users/zmanl/Projects/VVD-mimic/specs/019-create-a-wiki/spec.md`

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

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Wiki Portal preserves Feature 003's card-based architecture as optional GM organizational tool, separate from database-centric system (Features 014+). GMs access wiki via sidebar "Wiki" button that feels like navigating to different section (/campaign/:id/wiki route). Wiki reuses existing card components (hierarchical tree, TipTap rich text, slash commands, database embeds, drag-drop reordering) but operates on separate tables (wiki_cards, wiki_hierarchy) to prevent data mixing. Information level filtering applies for player view, but wiki content explicitly excluded from AI context engineering (AI tools query databases only). Supports all Feature 003 capabilities: rich text editing, hierarchy organization, embedded database views (table/list/gallery/kanban), auto-save, versioning. Clean separation: databases = canon context for AI, wiki = optional flexible notes.

## Technical Context

**Language/Version**: TypeScript 5.0+ (Node.js 20 LTS backend, React 18 frontend)

**Primary Dependencies**:
- React 18 + React Router v6 (portal navigation via routes)
- TipTap 2.x (reused from Feature 003 for rich text editing)
- @dnd-kit (reused for drag-drop hierarchy reordering)
- Radix UI (accessible components for context menus, dialogs)
- Better-SQLite3 (wiki_cards and wiki_hierarchy tables)
- Existing components: CardTree, SlashCommandPalette, DatabaseView (Feature 003)
- Existing contexts: InformationLevelContext, ViewModeContext (Feature 004)

**Storage**: SQLite with WAL mode, separate tables (wiki_cards, wiki_hierarchy), same DB file as databases

**Testing**: Vitest + React Testing Library (frontend unit), Vitest + Supertest (backend contract), Playwright (E2E portal workflows)

**Target Platform**: Docker localhost (existing setup), Chrome/Firefox/Safari browsers

**Project Type**: web (frontend + backend detected)

**Performance Goals**:
- Card creation <200ms (FR-053)
- Rich text rendering <100ms for 5000 words (FR-054)
- Hierarchy navigation <150ms (FR-055)
- Slash command palette <50ms (FR-056)
- View mode toggle <300ms for 100 cards (FR-057)
- Auto-save non-blocking (FR-058)

**Constraints**:
- Wiki content NOT used for AI context (Features 017/018 query databases only)
- Separate table architecture prevents accidental data mixing
- Portal navigation via React Router with sessionStorage state preservation
- Information level filtering applies but wiki excluded from canon context
- Auto-save every 30 seconds with debounce
- 1-deep version backup per card

**Scale/Scope**:
- Support 1000+ wiki cards per campaign
- 20-level deep hierarchy maximum (performance warning)
- 100+ rows in embedded database views (paginated)
- Session-only portal state (cleared on refresh acceptable for prototype)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I: Workflow-First Design** - ✅ PASS
Wiki provides optional flexible organization tool for GMs who want notion-like flexibility separate from structured databases. Does not force "plan twice" - GMs choose databases (structured, AI-queryable) or wiki (flexible notes) based on workflow needs.

**Principle II: User Agency & Full Customization** - ✅ PASS
Complete user control: optional feature (campaigns can function without wiki), manual wiki creation only (no auto-sync from databases), full rich text customization via TipTap, custom hierarchy organization, user-controlled information levels.

**Principle III: Information Filtering & Access Control** - ✅ PASS
Wiki respects information level filtering (dm_secret, player_knowledge, common_knowledge) for player view mode. Reuses Feature 004 filtering architecture. No new permission complexity.

**Principle IV: Knowledge Graph Architecture** - ✅ PASS
Not applicable - wiki does NOT interact with knowledge graphs. Graphs remain separate and query databases only, not wiki content.

**Principle V: BYOLLM & Privacy** - ✅ PASS
Not applicable - wiki has NO LLM integration. AI tools explicitly exclude wiki from queries (service-layer enforcement).

**Principle VI: Local-Only & Prototype-First** - ✅ PASS
Local SQLite storage (same DB file, separate tables). Portal navigation via sessionStorage (session-only acceptable for prototype). Performance targets prototype-appropriate (200-300ms targets).

**Principle VII: Transparency & User Approval** - ✅ PASS
All wiki operations user-initiated (manual card creation, explicit editing, user-controlled hierarchy). Auto-save with save indicators for transparency. Undo support via version backup.

**Overall Assessment**: PASS - No constitutional violations detected.

## Project Structure

### Documentation (this feature)
```
specs/019-create-a-wiki/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (14 technical decisions)
├── data-model.md        # Phase 1 output (WikiCard, WikiHierarchy schemas)
├── quickstart.md        # Phase 1 output (8 E2E test scenarios)
└── contracts/           # Phase 1 output
    ├── wiki-cards.yaml  # OpenAPI 3.0 spec (7 endpoints)
    └── README.md        # Contract documentation
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── models/
│   │   ├── WikiCard.ts            # NEW - WikiCard entity model
│   │   └── WikiHierarchy.ts       # NEW - WikiHierarchy entity model
│   ├── services/
│   │   └── WikiCardService.ts     # NEW - Separate from CardService (clean separation)
│   ├── routes/
│   │   └── wiki-cards.ts          # NEW - Wiki CRUD endpoints
│   └── db/
│       ├── schema.sql             # Extend - Add wiki_cards, wiki_hierarchy, wiki_card_versions tables
│       └── migrations/
│           └── 019-wiki-portal.sql # NEW - Migration script
└── tests/
    ├── contract/
    │   └── wiki-cards.test.ts     # NEW - API contract tests
    └── integration/
        └── wiki-portal.test.ts    # NEW - Portal navigation, AI exclusion validation

frontend/
├── src/
│   ├── components/
│   │   ├── WikiPortal.tsx         # NEW - Portal wrapper with "Back to Dashboard" button
│   │   ├── WikiCardTree.tsx       # NEW - Reuses CardTree patterns for wiki_cards table
│   │   ├── WikiCardEditor.tsx     # NEW - TipTap editor for wiki cards
│   │   └── WikiBreadcrumbs.tsx    # NEW - Breadcrumb navigation for wiki hierarchy
│   ├── pages/
│   │   ├── WikiHomePage.tsx       # NEW - Wiki root page (campaign wiki landing)
│   │   └── WikiCardPage.tsx       # NEW - Individual wiki card view/edit page
│   ├── services/
│   │   └── wikiCardService.ts     # NEW - API client for wiki endpoints
│   ├── hooks/
│   │   ├── useWikiCards.ts        # NEW - Wiki card state management
│   │   ├── useWikiHierarchy.ts    # NEW - Wiki hierarchy state management
│   │   └── usePortalState.ts      # NEW - sessionStorage for dashboard state preservation
│   ├── routes/
│   │   └── AppRoutes.tsx          # Extend - Add /campaign/:id/wiki routes
│   └── config/
│       └── wikiTiptapConfig.ts    # NEW - TipTap config (reused from Feature 003)
└── tests/
    ├── components/
    │   ├── WikiPortal.test.tsx    # NEW - Portal navigation tests
    │   ├── WikiCardTree.test.tsx  # NEW - Wiki tree rendering tests
    │   └── WikiCardEditor.test.tsx # NEW - Rich text editing tests
    └── e2e/
        ├── wiki-portal-navigation.spec.ts # NEW - Portal access, state preservation
        ├── wiki-card-operations.spec.ts # NEW - CRUD, hierarchy, filtering
        └── ai-context-exclusion.spec.ts # NEW - Validate AI tools ignore wiki
```

**Structure Decision**: Web application structure (frontend + backend). **Frontend-heavy feature** with substantial backend changes for separate wiki tables. Portal navigation via React Router routes (`/campaign/:id/wiki`), sessionStorage for dashboard state preservation. Backend adds new WikiCardService (separate from CardService to prevent data mixing), new API routes, and 3 new database tables.

## Phase 0: Outline & Research

**Research Complete** ✅ - See `research.md` (14 technical decisions documented)

**Key Decisions**:
1. Separate tables (wiki_cards, wiki_hierarchy) in same SQLite file
2. New WikiCardService (separate from CardService for clean architectural boundary)
3. Route-based portal navigation (`/campaign/:id/wiki` → WikiPortal wrapper)
4. sessionStorage for dashboard state preservation (scroll position, filters, category)
5. Reuse TipTap configuration from Feature 003 (all extensions including slash commands, database embeds)
6. Reuse InformationLevelContext and ViewModeContext from Feature 004
7. Reuse SlashCommandPalette component from Feature 003
8. Reuse DatabaseView component for embedded database views
9. Debounced auto-save (30s) with optimistic UI updates
10. Simple integer version counter with 1-deep backup (wiki_card_versions table)
11. Reuse circular reference validation from Feature 003
12. Reuse @dnd-kit for drag-drop reordering
13. AI context exclusion enforced at service layer (ImportService and MCPServer whitelist database tables only)
14. Defer performance optimization to implementation (indexes on campaign_id, player_knowledge)

**No unknowns remaining** - All technical context fully specified.

## Phase 1: Design & Contracts

**Phase 1 Complete** ✅ - All artifacts generated

### Data Model Summary

**2 New Tables**:
- `wiki_cards` (10 fields: wiki_card_id, campaign_id, user_id, title, content, player_knowledge, version, created_at, updated_at)
- `wiki_hierarchy` (5 fields: wiki_hierarchy_id, parent_wiki_card_id, child_wiki_card_id, order_index, created_at)
- `wiki_card_versions` (optional 1-deep backup table)

**Key Features**:
- Foreign keys: campaign_id → campaigns (CASCADE), user_id → users (SET NULL)
- CHECK constraints: title max 500 chars, player_knowledge enum, no self-reference in hierarchy
- UNIQUE constraint: (parent_wiki_card_id, child_wiki_card_id) to prevent duplicate relationships
- Indexes: campaign lookup, player_knowledge filtering, hierarchy navigation, sibling ordering

**TipTap Content Schema**: ProseMirror JSON format with custom `databaseEmbed` node for embedded database views (reuses Feature 003 DatabaseView component)

### API Contracts Summary

**7 REST Endpoints** (OpenAPI 3.0 spec):
- `GET /campaigns/{id}/wiki/cards` - List all cards (view mode filtered)
- `POST /campaigns/{id}/wiki/cards` - Create card
- `GET /campaigns/{id}/wiki/cards/{cardId}` - Get single card with breadcrumbs
- `PATCH /campaigns/{id}/wiki/cards/{cardId}` - Update card (creates version backup)
- `DELETE /campaigns/{id}/wiki/cards/{cardId}` - Delete card (cascade or orphan children)
- `POST /campaigns/{id}/wiki/cards/{cardId}/move` - Move to new parent (circular validation)
- `POST /campaigns/{id}/wiki/cards/reorder` - Reorder siblings

All endpoints require Bearer auth (Keycloak JWT), validate campaign ownership, respect information level filtering.

### Test Scenarios Summary

**8 E2E Scenarios** (quickstart.md):
1. Portal navigation & state preservation (8 steps)
2. Wiki card creation & rich text editing (11 steps)
3. Wiki hierarchy organization (9 steps)
4. Information level filtering (9 steps)
5. Slash commands & database embeds (10 steps)
6. AI context exclusion validation (10 steps)
7. Separate storage validation (10 steps)
8. Performance validation (6 steps)

**Success Criteria**: All 8 scenarios pass = Feature 019 implementation complete

### Agent Context Update

**CLAUDE.md updated** ✅ via `.specify/scripts/bash/update-agent-context.sh claude`

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Backend tasks: Database migration, WikiCard/WikiHierarchy models, WikiCardService, wiki-cards routes, contract tests
- Frontend tasks: WikiPortal layout, WikiCardTree, WikiCardEditor, route configuration, hooks, E2E tests
- Each contract endpoint → contract test task [P]
- Each entity (WikiCard, WikiHierarchy) → model creation task [P]
- Each test scenario → integration/E2E test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- **TDD order**: Tests before implementation
- **Dependency order**:
  1. Backend migration (wiki_cards, wiki_hierarchy tables)
  2. Backend models (WikiCard, WikiHierarchy) [P]
  3. Backend service (WikiCardService with circular validation)
  4. Backend routes (wiki-cards.ts)
  5. Backend contract tests [P]
  6. Frontend services (wikiCardService API client)
  7. Frontend hooks (useWikiCards, useWikiHierarchy, usePortalState) [P]
  8. Frontend components (WikiPortal, WikiCardTree, WikiCardEditor) [P]
  9. Frontend routes (add /wiki paths to AppRoutes)
  10. Frontend E2E tests (portal navigation, CRUD, AI exclusion)
- **Mark [P] for parallel execution** (independent files can be implemented concurrently)

**Estimated Output**: **38-42 numbered, ordered tasks** in tasks.md

**Breakdown Estimate**:
- Backend: 14 tasks (migration, 2 models, service, routes, 6 contract tests, 3 integration tests)
- Frontend: 20 tasks (portal layout, 4 components, 3 hooks, route config, 6 unit tests, 5 E2E tests)
- Documentation: 4 tasks (README updates, migration documentation, API docs, testing guide)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No violations detected - section empty.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - 14 technical decisions in research.md
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md, CLAUDE.md
- [x] Phase 2: Task planning approach described (/plan command) - 38-42 estimated tasks
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all 7 principles satisfied)
- [x] Post-Design Constitution Check: PASS (no violations introduced during design)
- [x] All NEEDS CLARIFICATION resolved (no unknowns in Technical Context)
- [x] Complexity deviations documented (none - no violations)

**Artifacts Generated**:
- [x] research.md (Phase 0) - 14 technical decisions, 8.6KB
- [x] data-model.md (Phase 1) - WikiCard/WikiHierarchy schemas, TypeScript interfaces, 21KB
- [x] contracts/ (Phase 1) - wiki-cards.yaml (OpenAPI 3.0, 7 endpoints), README.md
- [x] quickstart.md (Phase 1) - 8 E2E test scenarios, database verification queries, 11KB
- [x] CLAUDE.md updated (Phase 1) - Added Feature 019 context

**Next Command**: `/tasks` to generate tasks.md from Phase 1 artifacts

---

*Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`*
