
# Implementation Plan: Player Question Portal

**Branch**: `009-create-player-question` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
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

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Feature 009 provides Player Question Portal, a public Q&A interface per campaign where players can ask in-world questions and receive AI responses grounded in Common Knowledge and Player Knowledge content only (DM Secrets filtered out). Portal accessible via shareable URL with optional password protection, no login required. Lightweight account linkage via "Who are you in-game?" prompt establishes player identity with unique character name enforcement (rejects duplicates). Uses GM's BYOLLM credentials with prominent warning about token usage. Per-player conversation history persists across sessions. GM monitoring panel shows question logs and token usage per player. Response style configurable (Friendly Sage, Scholarly Tome, Tavern Gossip, Factual, Custom). AI responses include clickable citations linking to source cards. DM Preview Mode allows testing filtered view. Items database integration for inventory queries via "Held By" field. Knowledge graph access with DM Secret filtering. Session Recap access with granular content verification. Trust-based usage model (no automatic rate limits). Multiple players supported with isolated conversations.

## Technical Context
**Language/Version**: Node.js 20 LTS, TypeScript 5.0+
**Primary Dependencies**: Express 4.x, Better-SQLite3, React 18, axios, uuid (portal URL generation), express-session (lightweight player identity), bcrypt (optional password hashing)
**Storage**: SQLite database with new tables (portal_configs, portal_players, portal_conversations, portal_messages, portal_token_usage)
**Testing**: Vitest (backend services, frontend components), Supertest (API endpoints), Playwright (E2E portal flow)
**Target Platform**: Docker Compose localhost environment (Linux container, Windows/Mac host)
**Project Type**: web (frontend + backend)
**Performance Goals**: Portal response <3 seconds, concurrent access for 5+ players, citation generation <100ms
**Constraints**: Uses GM's BYOLLM credentials (no separate portal credentials), information filtering MUST prevent any DM Secret leakage, unique character names enforced per campaign
**Scale/Scope**: Support 10 concurrent players per campaign portal, 100+ questions per player conversation history, token tracking for all usage

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Workflow-First Design
**Status**: ✅ PASS
**Rationale**: Player Portal extends campaign workflow by giving players direct access to world information. Portal tab in campaign navigation provides quick access. "Who are you in-game?" prompt integrates naturally. Citations link back to source cards (wiki IS the reference). Players don't maintain separate notes - portal is the canonical source.

### II. User Agency & Control
**Status**: ✅ PASS
**Rationale**: GM has complete control over portal (enable/disable, password protection, response style). Players control their own questions and conversation history. GM monitoring provides visibility into usage. Trust-based model respects player agency while protecting GM's token budget. DM Preview Mode allows GM to test before sharing. Citations give players agency to verify sources.

### III. Information Filtering
**Status**: ✅ PASS (CRITICAL - Core feature)
**Rationale**: **Portal directly implements Information Filtering (Feature 004 integration).**
- Portal AI ONLY accesses Common Knowledge + Player Knowledge cards
- System and DM Secret tags completely filtered out
- Knowledge graph nodes filtered by referenced card tags
- Session Recaps verified piece-by-piece for DM Secret content
- Items database respects information levels
- DM Preview Mode shows exact filtered view players see
- No secret leakage possible (same filtering as Player/General View)

### IV. Knowledge Graph Architecture
**Status**: ✅ PASS
**Rationale**: Portal AI queries knowledge graphs (Feature 006 integration) to answer player questions with rich context. Graph filtering ensures DM Secret nodes excluded. Political-Web, Campaign-Story, Geographical, World-Foundations graphs all accessible with appropriate filtering. Citations link to graph node source cards. Enhances player experience by providing structured lore access.

### V. BYOLLM & Privacy
**Status**: ✅ PASS
**Rationale**: Portal uses GM's BYOLLM credentials (Feature 008 dependency). Prominent warning ensures GM understands players will consume their tokens. No separate portal API credentials (local-only principle maintained). All AI calls use GM's configured provider. Trust-based usage model aligns with privacy-first approach. Token tracking provides transparency.

### VI. Local-Only Prototype
**Status**: ✅ PASS
**Rationale**: Docker Compose localhost deployment. SQLite local storage for portal configurations and conversations. Public URLs are localhost URLs (e.g., http://localhost:3000/portal/{campaign-id}). No external portal hosting. Players access portal on same network or via localhost. Prototype-first focus on functionality over deployment complexity.

### VII. Transparency & No Autonomous AI
**Status**: ✅ PASS
**Rationale**: Portal AI is reactive (only responds to player questions). No autonomous updates or changes. Citations provide full transparency about information sources. GM sees all player questions in monitoring panel. DM Preview Mode allows GM to verify responses before enabling portal. "I don't have information" response prevents hallucination. All AI behavior controlled by GM's response style configuration.

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
│   │   ├── portal-config.model.ts          # Portal configuration per campaign
│   │   ├── portal-player.model.ts          # Lightweight player identity
│   │   ├── portal-conversation.model.ts    # Per-player conversation
│   │   ├── portal-message.model.ts         # Individual Q&A messages
│   │   └── portal-token-usage.model.ts     # Token tracking per player
│   ├── services/
│   │   ├── portal-config.service.ts        # Portal CRUD, enable/disable, password
│   │   ├── portal-player.service.ts        # Player identity, unique name validation
│   │   ├── portal-conversation.service.ts  # Conversation CRUD, history
│   │   ├── portal-ai.service.ts            # AI question answering with filtering
│   │   ├── information-filter.service.ts   # Reuse Feature 004 filtering (Common+Player only)
│   │   ├── citation-generator.service.ts   # Generate clickable citations from sources
│   │   ├── token-tracker.service.ts        # Track token usage per player/campaign
│   │   └── session-recap-filter.service.ts # Granular Session Recap filtering
│   └── api/
│       ├── portal-management.routes.ts     # GM portal management endpoints
│       └── portal-public.routes.ts         # Public player Q&A endpoints
└── tests/
    ├── contract/
    │   └── portal.contract.test.ts         # API contract tests from OpenAPI
    ├── integration/
    │   └── portal-filtering.integration.test.ts # Information filtering validation
    └── unit/
        ├── portal-ai.service.test.ts
        ├── citation-generator.service.test.ts
        └── portal-player.service.test.ts

frontend/
├── src/
│   ├── components/
│   │   ├── portal/
│   │   │   ├── PortalManagement.tsx        # GM portal management UI
│   │   │   ├── PortalSettings.tsx          # Enable/disable, password, response style
│   │   │   ├── PortalMonitoring.tsx        # Per-player logs, token usage
│   │   │   ├── DMPreviewMode.tsx           # Test portal with filtered view
│   │   │   ├── PlayerPortal.tsx            # Public player Q&A interface
│   │   │   ├── PlayerIdentity.tsx          # "Who are you in-game?" prompt
│   │   │   ├── PortalChat.tsx              # Chat interface with citations
│   │   │   ├── ResponseStyleSelector.tsx   # Response style configuration
│   │   │   └── PasswordProtection.tsx      # Password entry UI
│   │   └── citations/
│   │       └── CitationLink.tsx            # Clickable citation component
│   ├── pages/
│   │   ├── PortalManagementPage.tsx        # GM portal management page
│   │   └── PlayerPortalPage.tsx            # Public player portal page
│   └── services/
│       └── portal.service.ts               # Frontend API client for portal endpoints
└── tests/
    ├── integration/
    │   └── portal-flow.integration.test.tsx # Portal E2E flow test
    └── unit/
        ├── PortalManagement.test.tsx
        ├── PlayerPortal.test.tsx
        └── CitationLink.test.tsx
```

**Structure Decision**: Web application structure selected. Backend provides portal management API (GM controls), public portal API (player Q&A), AI service with information filtering, citation generation, and token tracking. Frontend provides GM management interface (enable/disable, monitoring, preview) and public player interface (identity, chat, citations).

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - Lightweight account linkage mechanism (session storage, cookies, or DB table)
   - Public URL generation and security for per-campaign portals
   - Information filtering integration with Feature 004 (ViewModeService reuse)
   - Citation generation from AI response sources
   - Token usage tracking and aggregation
   - Concurrent player access handling
   - Session Recap granular content filtering strategy
   - Items database "Held By" field querying

2. **Generate and dispatch research agents**:
   ```
   Task: "Research lightweight account linkage for public portal (session, cookies, lightweight DB)"
   Task: "Research public URL generation per campaign with optional password protection"
   Task: "Research Feature 004 ViewModeService reuse for portal information filtering"
   Task: "Research citation generation and card linking from AI response sources"
   Task: "Research token usage tracking per player with aggregation"
   Task: "Research concurrent access patterns for multiple players using portal simultaneously"
   Task: "Research Session Recap granular filtering (piece-by-piece DM Secret detection)"
   Task: "Research Items database querying for 'Held By' field inventory questions"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - PortalConfig entity (campaign, enabled, password, response style, URL)
   - PortalPlayer entity (campaign, character name unique, conversation FK)
   - PortalConversation entity (player FK, messages, token usage)
   - PortalMessage entity (conversation FK, question, response, citations, timestamp)
   - PortalTokenUsage entity (player FK, campaign FK, token count, aggregated)

2. **Generate API contracts** from functional requirements:
   - POST /api/portal/config (create/update portal configuration)
   - GET /api/portal/config (get portal config for campaign)
   - PUT /api/portal/config/enable (enable/disable portal)
   - PUT /api/portal/config/password (set/remove password)
   - PUT /api/portal/config/response-style (set response style)
   - GET /api/portal/monitoring (get per-player logs and token usage)
   - POST /api/portal/public/{campaign-id}/identify (player identity creation)
   - POST /api/portal/public/{campaign-id}/ask (player question)
   - GET /api/portal/public/{campaign-id}/history (player conversation history)
   - POST /api/portal/preview (DM Preview Mode test question)
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
   - Add Frontend (009): PortalManagement, PlayerPortal, CitationLink components
   - Add Backend (009): Portal services, information filtering, citation generation, token tracking
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
- Information filtering service → implementation task (Feature 004 integration)
- Citation generator service → implementation task
- Token tracker service → implementation task
- Portal AI service → implementation task (depends on filtering, citations, tokens)
- Backend API routes → implementation tasks (depends on services)
- Frontend components → implementation tasks [P] (9 components: PortalManagement, PortalSettings, PortalMonitoring, DMPreviewMode, PlayerPortal, PlayerIdentity, PortalChat, ResponseStyleSelector, PasswordProtection, CitationLink)
- Frontend service → implementation task (portal.service.ts)
- Integration tests → test tasks (portal filtering, E2E flow)
- Quickstart validation → final validation task

**Ordering Strategy**:
- TDD order: Contract tests before implementation
- Dependency order:
  1. Models (PortalConfig, PortalPlayer, PortalConversation, PortalMessage, PortalTokenUsage)
  2. Information filtering service (Feature 004 ViewModeService integration)
  3. Citation generator service (independent, parallel)
  4. Token tracker service (independent, parallel)
  5. Session Recap filter service (depends on filtering service)
  6. Portal AI service (depends on filtering, citations, token tracker)
  7. Portal player service (unique name validation)
  8. Portal config service (enable/disable, password, response style)
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
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command - core deliverables: plan, research, data-model)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none - no violations)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
