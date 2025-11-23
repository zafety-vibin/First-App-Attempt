
# Implementation Plan: Player Question Portal

**Branch**: `009-create-player-question` | **Date**: 2025-10-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-create-player-question/spec.md`

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
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
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
Feature 009 provides Player Question Portal, a public Q&A interface per campaign where players ask in-world questions and receive AI responses grounded in Common Knowledge and Player Knowledge content only (DM Secrets filtered out). Portal accessible via shareable URL with optional password protection, no login required. Lightweight account linkage via "Who are you in-game?" prompt establishes player identity with unique character name enforcement. Uses GM's BYOLLM credentials (Feature 008) with prominent warning. Per-player conversation history persists across sessions. GM monitoring panel shows question logs and token usage. Response style configurable (Friendly Sage, Scholarly Tome, Tavern Gossip, Factual, Custom). AI responses include clickable citations linking to source cards. DM Preview Mode allows testing filtered view. Items database integration for inventory queries. Knowledge graph access with information level filtering. Session Recap access respecting player_knowledge field. Trust-based usage model.

## Technical Context
**Language/Version**: Node.js 20 LTS, TypeScript 5.0+
**Primary Dependencies**: Express 4.x, Better-SQLite3, React 18, TanStack Table v8, axios, uuid (portal URL generation), crypto (session tokens), bcrypt (password hashing), @anthropic-ai/sdk, openai
**Storage**: SQLite database with new tables (portal_configs, portal_players, portal_conversations, portal_messages, portal_token_usage)
**Testing**: Vitest (backend services, frontend components), Supertest (API endpoints), Playwright (E2E portal flow)
**Target Platform**: Docker Compose localhost environment (Linux container, Windows/Mac host)
**Project Type**: web (frontend + backend)
**Performance Goals**: Portal response <3 seconds, concurrent access for 5+ players, citation generation <100ms
**Constraints**: Uses GM's BYOLLM credentials (no separate portal credentials), information filtering MUST prevent any DM Secret leakage, unique character names enforced per campaign
**Scale/Scope**: Support 10 concurrent players per campaign portal, 100+ questions per player conversation history, token tracking for all usage

**Current Architecture Context** (as of 2025-11-05):
- **ViewMode System**: Unified middleware in `backend/src/middleware/viewMode.ts` with `extractViewMode()`, `stripDmFields()`, `getPlayerKnowledgeFilter()`. X-View-Mode header sets `dm_view` or `player_view`.
- **Information Levels**: Stored in `information_levels` table with IDs like `common-knowledge`, `player-knowledge`, `dm-secret`, `system`. Custom levels supported with `hierarchical` flag.
- **BaseCategoryService**: All 13 categories extend BaseCategoryService with standardized `.list(filters, pagination, sort?, order?)` that respects view mode filtering.
- **Session Recaps**: SessionRecapService extends BaseCategoryService, has `player_knowledge` field, filtered via standard view mode middleware.
- **Junction Tables**: 28 junction tables implemented (Feature 014+), relationships stored in proper relational structure, not JSON arrays.
- **Batch Fetching**: All 11 category services use batch fetching pattern (N+1 queries eliminated, 98%+ reduction). Template: `backend/docs/BATCH-FETCH-TEMPLATE.md`.
- **External API**: Feature 018 provides localhost:3002 AI-friendly API pattern with two-phase delete, audit logging, information filtering.
- **BYOLLM**: Feature 008 provides BYOLLMConfigService with OAuth flow, encrypted credentials (AES-256-GCM), custom endpoints, provider clients. **EXCLUSIVE to Player Portal** (all other AI features removed).

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Workflow-First Design
**Status**: ✅ PASS
**Rationale**: Player Portal extends campaign workflow by giving players direct access to world information between sessions. Portal tab in campaign navigation provides quick access. "Who are you in-game?" prompt integrates naturally. Citations link back to source cards (wiki IS the reference). Players don't maintain separate notes - portal is the canonical source. Eliminates "plan twice" for players asking lore questions.

### II. User Agency & Full Customization
**Status**: ✅ PASS
**Rationale**: GM has complete control over portal (enable/disable, password protection, response style selector with Custom option). Players control their own questions and conversation history. GM monitoring provides visibility into usage. Trust-based model respects player agency while protecting GM's token budget. DM Preview Mode allows GM to test before sharing. Citations give players agency to verify sources. Custom information levels work with portal filtering.

### III. Information Filtering & Access Control
**Status**: ✅ PASS (CRITICAL - Core feature)
**Rationale**: Portal directly implements Information Filtering (Feature 004 integration).
- Portal AI ONLY accesses cards tagged as common-knowledge or player-knowledge
- system and dm-secret tags completely filtered out via existing viewMode middleware
- Knowledge graph nodes filtered by referenced card player_knowledge field
- Session Recaps filtered via SessionRecapService.list() with player_view mode
- Items database respects player_knowledge field
- DM Preview Mode shows exact filtered view players see
- No secret leakage possible (same filtering as category list views)
- Custom hierarchical levels filtered automatically via hierarchical flag query

### IV. Knowledge Graph Architecture
**Status**: ✅ PASS
**Rationale**: Portal AI queries knowledge graphs (Feature 006 integration) to answer player questions with rich context. Graph filtering ensures nodes with player_knowledge = 'dm-secret' or custom hierarchical levels excluded. Political-Web, Campaign-Story, Geographical, World-Foundations graphs all accessible with appropriate filtering. Citations link to graph node source cards. Enhances player experience by providing structured lore access. Graphs optional per query (user controls context).

### V. BYOLLM & Privacy
**Status**: ✅ PASS (Feature 008 dependency - EXCLUSIVE to Player Portal)
**Rationale**: Portal uses GM's BYOLLM credentials from BYOLLMConfigService. **IMPORTANT**: As of 2025-11-05, BYOLLM (Feature 008) is ONLY used by Player Portal - all other AI features removed (Feature 017 stateless API scrapped, chat import/planning removed in favor of Claude Desktop MCP). GM configures BYOLLM API keys exclusively for player Q&A. Prominent warning ensures GM understands players will consume their tokens. No separate portal API credentials (local-only principle maintained). All AI calls use GM's configured provider (OpenAI/Anthropic/custom). Trust-based usage model aligns with privacy-first approach. Token tracking provides transparency. Conversation history stored locally in SQLite.

### VI. Local-Only & Prototype-First
**Status**: ✅ PASS
**Rationale**: Docker Compose localhost deployment. SQLite local storage for portal configurations and conversations. Public URLs are localhost URLs (e.g., http://localhost:3000/portal/{campaign-id}). No external portal hosting. Players access portal on same network or via localhost. Prototype-first focus on functionality over deployment complexity. No rate limiting complexity (trust-based).

### VII. Transparency & User Approval
**Status**: ✅ PASS
**Rationale**: Portal AI is reactive (only responds to player questions). No autonomous updates or changes. Citations provide full transparency about information sources. GM sees all player questions in monitoring panel. DM Preview Mode allows GM to verify responses before enabling portal. "I don't have information" response prevents hallucination. All AI behavior controlled by GM's response style configuration. No AI writes to database.

## Project Structure

### Documentation (this feature)
```
specs/009-create-player-question/
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
│   │   ├── PortalConfig.ts              # Portal configuration per campaign
│   │   ├── PortalPlayer.ts              # Lightweight player identity
│   │   ├── PortalConversation.ts        # Per-player conversation
│   │   ├── PortalMessage.ts             # Individual Q&A messages
│   │   └── PortalTokenUsage.ts          # Token tracking per player
│   ├── services/
│   │   ├── PortalConfigService.ts       # Portal CRUD, enable/disable, password
│   │   ├── PortalPlayerService.ts       # Player identity, unique name validation
│   │   ├── PortalConversationService.ts # Conversation CRUD, history
│   │   ├── PortalAIService.ts           # AI question answering with filtering
│   │   ├── CitationGeneratorService.ts  # Generate clickable citations from sources
│   │   └── PortalTokenTrackerService.ts # Track token usage per player/campaign
│   ├── middleware/
│   │   └── (reuse existing viewMode.ts) # Information filtering via extractViewMode, getPlayerKnowledgeFilter
│   └── routes/
│       ├── portal-management.ts         # GM portal management endpoints
│       └── portal-public.ts             # Public player Q&A endpoints
└── tests/
    ├── contract/
    │   └── portal.contract.test.ts      # API contract tests from OpenAPI
    ├── integration/
    │   └── portal-filtering.integration.test.ts # Information filtering validation
    └── unit/
        ├── PortalAIService.test.ts
        ├── CitationGeneratorService.test.ts
        └── PortalPlayerService.test.ts

frontend/
├── src/
│   ├── components/
│   │   └── portal/
│   │       ├── PortalManagement.tsx     # GM portal management UI
│   │       ├── PortalSettings.tsx       # Enable/disable, password, response style
│   │       ├── PortalMonitoring.tsx     # Per-player logs, token usage
│   │       ├── DMPreviewMode.tsx        # Test portal with filtered view
│   │       ├── PlayerPortal.tsx         # Public player Q&A interface
│   │       ├── PlayerIdentity.tsx       # "Who are you in-game?" prompt
│   │       ├── PortalChat.tsx           # Chat interface with citations
│   │       ├── ResponseStyleSelector.tsx # Response style configuration
│   │       ├── PasswordProtection.tsx   # Password entry UI
│   │       └── CitationLink.tsx         # Clickable citation component
│   ├── pages/
│   │   ├── PortalManagementPage.tsx     # GM portal management page
│   │   └── PlayerPortalPage.tsx         # Public player portal page
│   └── services/
│       └── portalService.ts             # Frontend API client for portal endpoints
└── tests/
    ├── integration/
    │   └── portal-flow.integration.test.tsx # Portal E2E flow test
    └── unit/
        ├── PortalManagement.test.tsx
        ├── PlayerPortal.test.tsx
        └── CitationLink.test.tsx
```

**Structure Decision**: Web application structure selected. Backend provides portal management API (GM controls), public portal API (player Q&A), AI service with information filtering (reusing viewMode middleware), citation generation, and token tracking. Frontend provides GM management interface (enable/disable, monitoring, preview) and public player interface (identity, chat, citations). Reuses existing BaseCategoryService pattern for querying cards, Session Recaps, Items database. Reuses BYOLLMConfigService for AI credentials.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Player identity session mechanism (crypto random tokens vs express-session)
   - Public URL generation and security for per-campaign portals
   - Citation generation from AI response sources (card linking)
   - Token usage tracking and aggregation pattern
   - Concurrent player access handling (SQLite write locks)
   - Items database "Held By" field querying pattern

2. **Generate and dispatch research agents**:
   ```
   Task: "Research player identity session mechanism - crypto random tokens in portal_players table vs express-session"
   Task: "Research public URL generation per campaign with optional password protection (bcrypt)"
   Task: "Research citation generation pattern - link AI responses to source cards by ID"
   Task: "Research token usage tracking per player with campaign aggregation (portal_token_usage table)"
   Task: "Research concurrent SQLite access for multiple players (WAL mode, read-heavy pattern)"
   Task: "Research Items database query pattern for 'Held By' field via BaseCategoryService"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - PortalConfig entity (campaign, enabled, password_hash, response_style, portal_url)
   - PortalPlayer entity (campaign, character_name UNIQUE, session_token, conversation FK)
   - PortalConversation entity (player FK, created_at, updated_at)
   - PortalMessage entity (conversation FK, role, content, citations JSONB, token_count, timestamp)
   - PortalTokenUsage entity (campaign FK, player FK, total_tokens, aggregated)

2. **Generate API contracts** from functional requirements:
   - POST /api/campaigns/:campaignId/portal/config (create/update portal configuration)
   - GET /api/campaigns/:campaignId/portal/config (get portal config)
   - PUT /api/campaigns/:campaignId/portal/enable (enable/disable portal)
   - PUT /api/campaigns/:campaignId/portal/password (set/remove password)
   - PUT /api/campaigns/:campaignId/portal/response-style (set response style)
   - GET /api/campaigns/:campaignId/portal/monitoring (get per-player logs and token usage)
   - POST /api/portal/public/:campaignId/identify (player identity creation)
   - POST /api/portal/public/:campaignId/ask (player question)
   - GET /api/portal/public/:campaignId/history (player conversation history)
   - POST /api/campaigns/:campaignId/portal/preview (DM Preview Mode test question)
   - Output OpenAPI 3.0 schema to `/contracts/portal.yaml`

3. **Generate contract tests** from contracts:
   - One test file per endpoint group (management, public, monitoring)
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Primary user story → integration test scenario in quickstart.md
   - 21 acceptance scenarios → validation steps
   - Edge cases → error handling validation

5. **Update CLAUDE.md incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add Frontend (009): PortalManagement, PlayerPortal, CitationLink components
   - Add Backend (009): Portal services, viewMode filtering reuse, citation generation, token tracking
   - Add Testing (009): Vitest, Supertest, Playwright portal flow
   - Add Recent Changes entry for Feature 009

**Output**: data-model.md, /contracts/portal.yaml, failing tests, quickstart.md, CLAUDE.md updates

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract endpoint → contract test task [P]
- Each entity (PortalConfig, PortalPlayer, PortalConversation, PortalMessage, PortalTokenUsage) → model creation task [P]
- viewMode middleware integration → verification task (already exists)
- Citation generator service → implementation task
- Token tracker service → implementation task
- Portal AI service → implementation task (depends on viewMode, citations, tokens, BYOLLMConfigService)
- Backend API routes → implementation tasks (depends on services)
- Frontend components → implementation tasks [P] (10 components: PortalManagement, PortalSettings, PortalMonitoring, DMPreviewMode, PlayerPortal, PlayerIdentity, PortalChat, ResponseStyleSelector, PasswordProtection, CitationLink)
- Frontend service → implementation task (portalService.ts)
- Integration tests → test tasks (portal filtering, E2E flow)
- Quickstart validation → final validation task

**Ordering Strategy**:
- TDD order: Contract tests before implementation
- Dependency order:
  1. Database migration (portal tables)
  2. Models (PortalConfig, PortalPlayer, PortalConversation, PortalMessage, PortalTokenUsage)
  3. viewMode middleware verification (already exists, verify player_view filtering)
  4. Citation generator service (independent, parallel)
  5. Token tracker service (independent, parallel)
  6. Portal player service (unique name validation)
  7. Portal config service (enable/disable, password, response style)
  8. Portal AI service (depends on viewMode, citations, token tracker, BYOLLMConfigService)
  9. Portal conversation service (history, messages)
  10. Backend API routes (depends on all services)
  11. Frontend components [P] (many can be parallel)
  12. Frontend service (depends on backend routes)
  13. Integration tests (depends on frontend + backend)
  14. Quickstart validation (depends on everything)
- Mark [P] for parallel execution (independent components)

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, information filtering validation, citation verification, token tracking validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No violations detected. All constitutional principles pass for Feature 009.

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
- [ ] Post-Design Constitution Check: PASS (pending Phase 1)
- [ ] All NEEDS CLARIFICATION resolved (pending Phase 0)
- [x] Complexity deviations documented (none - no violations)

---
*Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`*
