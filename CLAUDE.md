# Wrldbldr MCP Manager Development Guidelines

Auto-generated from feature plans. Last updated: 2025-10-22

## Mission

Wrldbldr MCP Manager is a TTRPG campaign management webapp that solves the "plan twice" problem for Game Masters. Built as a fully local prototype on localhost using Docker.

## Core Technology Stack

**Infrastructure**:
- Docker Compose 2.x for service orchestration
- Keycloak (Quay.io) for OAuth 2.0 authentication
- SQLite3 with Better-SQLite3 library (WAL mode enabled)

**Frontend**:
- React 18 + TypeScript 5.0+, Vite, React Router v6
- Auth: Keycloak-js, Axios with token injection
- UI Components: TipTap 2.x (rich text), Radix UI (dialogs/dropdowns/tabs), Konva.js + react-konva (interactive maps), react-grid-layout 1.3.4 (dashboard canvas), TanStack Table v8 (database tables), React Beautiful DnD (kanban boards), react-color (color picker), react-window (virtualization), Lucide React (icons)
- State Management: Context API (AuthContext, InformationLevelContext, ViewModeContext, AITabContext, BYOLLMContext)
- File Handling: PDF/DOCX/TXT/MD uploads (multipart/form-data)

**Backend**:
- Node.js 20 LTS + TypeScript 5.0+, Express 4.x, Better-SQLite3
- Auth: Keycloak Connect for token validation, CORS middleware
- AI: OpenAI SDK, Anthropic SDK, Server-Sent Events (SSE) streaming, pdf-parse, mammoth (DOCX), Levenshtein distance (deduplication threshold 0.7)
- MCP: @modelcontextprotocol/sdk (⚠️ needs v0.5.0 refactoring), Zod schemas, stdio transport (JSON-RPC)
- Logging: Winston with daily-rotate-file (Feature 018)
- Crypto: Node.js crypto (AES-256-GCM encryption, random IDs), jose (JWT handling)
- **BaseCategoryService** (Feature 014): Abstract base class enforcing uniform CRUD interface across all 13 category services (NPCService, FactionService, LocationService, SessionRecapService, QuestService, PlayerCharacterService, LoreEntryService, WorldRuleService, PlanarForceService, SessionPrepService, CustomMechanicService, ItemService, CreatureService). Standard interface: `create(data, options?)`, `update(id, data, options?)`, `delete(id, options?)`, `findById(id)`, `list(filters, pagination, sort?, order?)`. Optional ownership validation via OperationOptions. 60-70% code reduction per service (-7,110 lines total).

**Database Architecture**:
- SQLite JSON1 extension for JSONB columns (rich text, graph storage, database schemas)
- Adjacency list + materialized path for card hierarchy
- Foreign keys enforced (`PRAGMA foreign_keys = ON`) with CASCADE (campaign_id) and SET NULL (faction_id, superior_npc_id, etc.)
- Self-referential FKs with circular reference detection
- JSON arrays for many-to-many relationships (no junction tables in v1)
- Universal Fields (Feature 014): All 13 categories share 10 common fields (id, campaign_id, name, description, core_status, player_knowledge, tags, created_at, updated_at, custom_fields)
- Information filtering middleware: extractViewMode (X-View-Mode header), stripDmFields (player_view filtering), getPlayerKnowledgeFilter (SQL WHERE clause generation)
- Performance targets: <100ms single entity read, <500ms list queries (100 results)

**Feature-Specific Technologies**:
- 003: ProseMirror JSON format (rich text storage), @dnd-kit (tree reordering), cmdk (slash commands)
- 005: Hybrid active filtering (last 5 sessions + tag-based for Political-Web/Campaign-Story graphs)
- 007: BLOB storage for map images (10MB limit, client-side compression), absolute pixel coordinates
- 008: OAuth 2.0 Authorization Code Flow + PKCE, API key alternative, custom endpoint support (Ollama, LM Studio)
- 011: 29 MCP tools across 8 categories (card, hierarchy, graph, recap, info-level, database, map), 3 resources, 2 prompts, 3 middleware layers (permissions, transactions with 10s timeout, logging to mcp_tool_logs)
- 015: 7 dashboard widgets, in-line editing (132 fields, 6 types: text/textarea/number/dropdown/tags/player_knowledge), column resizing, quick-add row, bulk operations (select/delete/tag/visibility)
- 018: Express on port 3002 (separate from main app on 3001), dual audit logging (Winston + api_requests SQLite table, 30-day retention), two-phase delete confirmation (60s token expiry), ExternalAPIService orchestrating all 13 category services

## Project Structure

```
wrldbldr-mcp-manager/
├── docker-compose.yml          # 3 services: keycloak, backend (ports 3001/3002), frontend
├── data/                       # SQLite database (bind mount, persists)
│   └── wrldbldr-mcp-manager.db
├── logs/                       # Feature 018: Winston audit logs
│   └── external-api/           # Daily rotation: YYYY-MM-DD.log
├── keycloak/
│   ├── Dockerfile.keycloak
│   └── realm-export.json       # Pre-configured wrldbldr-mcp-manager realm
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── models/             # 27 models: User, Campaign, Session, Setting, Card, InformationLevel, 13 categories (NPC, Location, Faction, SessionRecap, Quest, PlayerCharacter, LoreEntry, WorldRule, PlanarForce, SessionPrep, CustomMechanic, Item, Creature), ImportSession, PlanningSession, KnowledgeGraph, GraphNode, GraphEdge, ImportBatch, CustomFieldDefinition, APIRequest
│   │   ├── services/           # BaseCategoryService + 13 category services + AuthService, CampaignService, DatabaseService, CardService, SettingService, InformationLevelService, ViewModeService, ImportService, PlanningService, KnowledgeGraphService, LLMService, EntityExtractionService, FileParserService, CustomFieldDefinitionService, ExternalAPIService, AuditLogService, BYOLLMConfigService, OAuthFlowService, ProviderClientService, EncryptionService, MCPConfigService
│   │   ├── middleware/         # keycloak.ts, cors.ts, errorHandler.ts, viewModeFilter.ts, multer.ts, informationFilter.ts, externalApiCors.ts (Feature 018), auditLogger.ts (Feature 018)
│   │   ├── routes/             # 13 category routes (npcs.ts, locations.ts, factions.ts, sessionRecaps.ts, quests.ts, playerCharacters.ts, loreEntries.ts, worldRules.ts, planarForces.ts, sessionPrep.ts, customMechanics.ts, items.ts, creatures.ts) + auth.ts, campaigns.ts, sessions.ts, cards.ts, settings.ts, database-cards.ts, information-levels.ts, view-mode.ts, import.ts, planning.ts, graphs.ts, health.ts, customFieldDefinitions.ts, external-api.ts (Feature 018 - 8 endpoint groups)
│   │   ├── mcp/                # MCP server (Feature 011 - ⚠️ needs API refactoring)
│   │   │   ├── server.ts       # MCP entry point (stdio transport, JSON-RPC)
│   │   │   ├── schemas/        # Zod schemas for 29 tools
│   │   │   ├── tools/          # 29 implementations (card, hierarchy, graph, recap, info-level, database, map, category)
│   │   │   ├── resources/      # 3 browsable resources (campaign://cards, recaps, graphs)
│   │   │   ├── prompts/        # 2 AI prompt templates (import_workflow, planning_workflow)
│   │   │   └── middleware/     # permissions.ts, transactions.ts (10s timeout), logging.ts
│   │   └── db/
│   │       ├── schema.sql      # Base schema
│   │       └── migrations/     # 19 migrations (003-019): cards, information levels, AI sessions, graphs, BYOLLM, MCP logs, 13 categories, dashboard, campaign settings, external API audit, session_number fix
│   └── tests/
│       ├── contract/           # 30+ contract tests (auth, campaigns, cards, settings, database-cards, information-levels, view-mode, import, planning, graphs, MCP tools, 13 categories, external-api [49/49 passing])
│       ├── integration/        # Auth flow, hierarchy validation, view mode filtering, AI workflows, MCP operations, information filtering, foreign keys, session prep, performance, Feature 018 scenarios (8 tests)
│       └── unit/               # Services, circular refs, deduplication, timeline conflicts, informationFilter middleware, ExternalAPIService, AuditLogService
└── frontend/
    ├── Dockerfile
    ├── src/
    │   ├── components/         # PublicLanding, CampaignManagement, CampaignHomepage, CardTree, CardEditor, SlashCommandPalette, DatabaseView (Table/List/Gallery/Kanban), PaintersEaselPalette, ViewModeToggle, SettingsInformationLevels, ImportAITab, PlanningAITab, KnowledgeGraphViewer, AIApprovalSummaryView, GraphNodeEditor, ActiveFilterToggle, DashboardPage, CategoryLandingPage, WidgetRegistry (7 widgets), BaseWidget, WidgetPicker, CategoryLandingCanvas, CategoryLandingTextEditor, EditableCell, QuickAddRow, BulkActionsToolbar, ActionsCell
    │   ├── pages/              # LandingPage, CampaignsPage, CampaignPage, CardPage, SettingsPage, 13 CategoryListPages, CategoryCreatePage, CategoryEditPage, CategoryDetailPage
    │   ├── services/           # keycloakService, apiClient, campaignService, cardService, settingService, databaseService, informationLevelService, importService, planningService, knowledgeGraphService
    │   ├── hooks/              # useAuth, useCampaigns, useKeycloak, useCards, useCardHierarchy, useDatabaseSchema, useSlashCommands, useInformationLevel, useViewMode, useFilteredCards, useImportSession, usePlanningSession, useSSEStream, useKnowledgeGraph, useActiveFilter, useDashboardCanvas, useCategoryLandingCanvas
    │   ├── contexts/           # AuthContext, CardContext, InformationLevelContext, ViewModeContext, AITabContext, BYOLLMContext
    │   ├── routes/             # AppRoutes with protected routes (28 routes total)
    │   └── config/             # keycloak.ts, tiptap.ts
    └── tests/
        ├── components/         # Component unit tests (CardTree, DatabaseView, SlashCommandPalette, PaintersEaselPalette, ViewModeToggle, AI tabs, GraphNodeEditor, widgets)
        └── e2e/                # Playwright tests (auth, card hierarchy, database CRUD, view mode, AI workflows, graph inspection)
```

## Commands

### Development
```bash
# Start all services (first time - builds images)
docker-compose up --build

# IMPORTANT: After rebuilding backend, install sharp with platform binaries
docker exec wrldbldr-backend npm install --include=optional sharp
docker-compose restart backend

# Start all services (subsequent runs)
docker-compose up

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f keycloak

# Run MCP server (Feature 011 - after API refactoring)
docker-compose exec backend npm run mcp

# Stop all services
docker-compose down

# Stop all services and remove volumes (reset database)
docker-compose down -v

# Feature 018: Test external API
curl http://localhost:3002/api/v1/external/health
curl http://localhost:3002/api/v1/external/campaigns/{campaign-id}/database/npcs
```

### Testing
```bash
# Backend tests (from backend/ directory)
npm test                    # All tests
npm test:contract           # Contract tests
npm test:integration        # Integration tests
npm test:unit               # Unit tests

# Feature 018: Run external API tests
npm test tests/contract/external-api.test.ts

# Frontend tests (from frontend/ directory)
npm test                    # Unit tests (Vitest)
npm test:e2e                # E2E tests (Playwright)
```

## Environment Variables

**Backend** (set in docker-compose.yml):
- `DATABASE_PATH`: /app/data/wrldbldr-mcp-manager.db
- `KEYCLOAK_URL`: http://keycloak:8080 (Docker network name)
- `KEYCLOAK_REALM`: wrldbldr-mcp-manager
- `KEYCLOAK_CLIENT_ID`: wrldbldr-mcp-manager-backend
- `CORS_ORIGIN`: http://localhost:3000
- `EXTERNAL_API_PORT`: 3002 (Feature 018)

**Frontend** (set in docker-compose.yml):
- `VITE_API_URL`: http://localhost:3001
- `VITE_KEYCLOAK_URL`: http://localhost:8080
- `VITE_KEYCLOAK_REALM`: wrldbldr-mcp-manager
- `VITE_KEYCLOAK_CLIENT_ID`: wrldbldr-mcp-manager-frontend

## Code Style

### TypeScript
- Strict mode enabled (`tsconfig.json`)
- Explicit return types for functions
- Interfaces over types for object shapes
- Use `unknown` instead of `any` when type is truly unknown

### React
- Functional components only (no class components)
- Use hooks for state management
- Context API for global state (AuthContext)
- Component file naming: PascalCase.tsx

### Backend
- REST API follows OpenAPI 3.0 spec (see /contracts/)
- Prepared statements for all SQL queries (prevents injection)
- Middleware order: CORS → JSON → Session → Keycloak → Routes
- Error responses: `{ error: string, details?: string }`
- **Category Services**: All extend BaseCategoryService with standard interface (Feature 014 standardization)

### Database
- SQLite with WAL mode enabled
- Foreign keys enforced (`PRAGMA foreign_keys = ON`)
- Unix timestamps (INTEGER) for all dates
- UUIDs (TEXT) for primary keys (campaigns, sessions)
- Keycloak sub (TEXT) for user_id (foreign key pattern)
- **Universal Fields**: All 13 categories share 10 common fields (Feature 014)

### Security
- No secrets in code or commits
- Keycloak handles password hashing
- Bearer tokens in Authorization header only
- CORS restricted to localhost:3000
- Feature 018: Localhost-only external API (no authentication, testing prototype)
- Public campaign passwords stored plaintext (prototype only - note for production: hash with bcrypt)

## Recent Changes

- **018-create-an-external** (2025-10-22): ✅ **COMPLETE** - External API on localhost:3002 for AI tools (Claude Desktop). 8 endpoint groups: health, database query/create/update/delete across 13 categories, hierarchy navigation, session recap timeline, knowledge graphs. Two-phase delete confirmation (60s token expiry), dual audit logging (Winston + SQLite, 30-day retention), information level filtering (X-View-Mode header), campaign isolation. ExternalAPIService orchestrates all 13 standardized category services. AI-friendly error responses (VALIDATION_ERROR, NOT_FOUND, CONSTRAINT_VIOLATION, INTERNAL_ERROR). Performance: <100ms queries, <200ms writes, <300ms hierarchy. Testing: 49/49 contract tests (100%), 8 integration, 2 unit. Technologies: Express 4.x, Winston, Better-SQLite3, uuid, crypto. Status: T001-T021 complete, ready for Claude Desktop. [See spec](specs/018-create-an-external/)

- **014-create-the-database** (2025-10-22): ✅ **STANDARDIZED** - Service layer refactoring for consistency. Created BaseCategoryService abstract base class enforcing uniform CRUD interface across all 13 category services. Standard methods: create(data, options?), update(id, data, options?), delete(id, options?), findById(id), list(filters, pagination, sort?, order?). Optional ownership validation via OperationOptions. Universal field handling: 10 shared fields auto-populated. JSON field parsing utilities. Removed async/await where unnecessary. Converted static methods to instance methods. Updated all 13 route files. Fixed models: session_number (SessionRecap), faction_id (Quest). Migration 019 created. Code reduction: **-7,110 lines** (60-70% per service). Impact: enables Feature 018 external API, Feature 011 MCP tools, future in-line editing. [See spec](specs/014-create-the-database/)

- **016-create-a-campaign** (2025-10-19): ✅ **CORE COMPLETE** - 4-Step Campaign Setup Wizard. Backend: campaign_settings table (theme, category_labels JSON), atomic transaction service, 3 wizard endpoints. Frontend: WizardContext (useReducer), 10 wizard components (Radix UI), theme constants (High Fantasy, Cyberpunk, Sci-Fi, Modern, Custom), hooks. Themed category naming (e.g., "Corporations" for Cyberpunk factions), World-Foundations graph with starter world rules from questionnaire. Race condition fix: Dashboard/category auto-creation handles 400 "already exists". Test skeletons created (T029-T041), full implementation deferred. Technologies: Radix UI, React Hook Form + Zod, SQLite JSON1, atomic transactions. [See spec](specs/016-create-a-campaign/)

- **015-create-the-dashboard** (2025-10-14): ✅ **COMPLETE** - Interactive Dashboard Canvas + In-Line Table Editing. Backend: 2 tables (dashboard_configs, category_landing_configs), 8 API routes, DashboardConfigService, CategoryLandingConfigService, widgetDataService. Frontend: react-grid-layout (12-col grid), 13 CategoryLandingPage components, 7 functional widgets, ViewModeToggle, **In-Line Editing System** (EditableCell, QuickAddRow, BulkActionsToolbar, ActionsCell). **132 editable fields** across 13 categories with 6 types (text, textarea, number, dropdown, tags, player_knowledge), double-click to edit, 500ms auto-save, column resizing (drag handles), quick-add row (collapsed/expanded), bulk operations (select/delete/tag/visibility). Routing: Dashboard, 13 category landings, 13 table views, entity create/edit/detail (28 total). Sidebar: 4 collapsible sections. Performance: <500ms canvas load. [See spec](specs/015-create-the-dashboard/)

**Earlier Features**:
- **011** (MCP): 29 tools across 8 categories, 3 resources, 2 prompts, 3 middleware layers. ⚠️ Needs MCP SDK v0.5.0 refactoring. [See spec](specs/011-create-model-context/)
- **008** (BYOLLM): OAuth 2.0 + PKCE, AES-256-GCM encryption, custom endpoints, rate limiting. [See spec](specs/008-create-byollm-configuration/)
- **007** (Maps): Konva.js canvas, BLOB storage, pins/zones/layers, nested navigation. [See spec](specs/007-create-the-interactive/)
- **006** (Knowledge Graphs): 4 graph types, toggle controls, 1-deep versioning, active filtering. [See spec](specs/006-create-the-knowledge/)
- **005** (AI): Import/Planning workflows, SSE streaming, entity extraction, Levenshtein deduplication. [See spec](specs/005-create-the-ai/)
- **004** (Information Filtering): 4 levels (System, Common Knowledge, Player Knowledge, DM Secret), view mode toggle. [See spec](specs/004-create-a-tagging/)
- **003** (Cards): Notion-like wiki, TipTap rich text, hierarchy, database views, slash commands. [See spec](specs/003-create-a-notion/)
- **002** (Auth): Keycloak OAuth 2.0, campaign management, session tracking. [See spec](specs/002-create-the-authentication/)

## Constitutional Principles

1. **Workflow-First Design**: No "plan twice" - campaign content IS the wiki
2. **User Agency**: User owns all data locally in SQLite file
3. **Information Filtering**: System, Common Knowledge, Player Knowledge, DM Secret (spec 004)
4. **Knowledge Graph Architecture**: 4 graph types with toggle controls (spec 006)
5. **BYOLLM & Privacy**: User's own LLM credentials only, local storage (spec 008)
6. **Local-Only & Prototype-First**: Everything on localhost via Docker, feature functionality over optimization
7. **Transparency & User Approval**: No autonomous AI edits, explicit publish workflow (spec 010)

See `/memory/constitution.md` for complete governance document.

## Testing

**Backend**: Vitest + Supertest
- **Contract tests**: 30+ files validating OpenAPI specs across Features 002-018 (auth, campaigns, cards, settings, database operations, information levels, view mode, AI import/planning, knowledge graphs, 13 categories, external API)
- **Integration tests**: Auth flow, card hierarchy validation, view mode filtering, AI approval workflows, batch revert, MCP atomic operations/permissions/concurrency, information filtering (X-View-Mode header, dm_* field stripping), foreign key connections (NPC→Faction, NPC→NPC, Location→Location, Quest→NPC/SessionRecap, Campaign CASCADE), session prep one-way linking, performance validation (100 entities per category), Feature 018 scenarios (conversational query/create/update, hierarchy navigation, timeline queries, delete confirmation, bulk filtering, audit logging)
- **Unit tests**: Service tests, circular reference detection, partial visibility logic, entity deduplication (Levenshtein), timeline conflict detection, informationFilter middleware, ExternalAPIService, AuditLogService

**Frontend**: Vitest + React Testing Library (unit tests), Playwright (E2E tests)
- Unit: CardTree, DatabaseView, SlashCommandPalette, PaintersEaselPalette, ViewModeToggle, ImportAITab, PlanningAITab, GraphNodeEditor, dashboard widgets
- E2E: Auth flow, card hierarchy (create → nest → database CRUD → view switching → drag reorder), view mode filtering, AI workflows (import session recap → upload → chat → approve → verify graphs → revert batch, planning session → chat → immediate updates), knowledge graph inspection

**Feature Highlights**:
- **Feature 018**: 49/49 contract tests passing (100% coverage)
- **Feature 014**: Performance validation (<100ms single read, <500ms list for 100 results)
- **Feature 011**: 10 test files created, blocked pending MCP SDK v0.5.0 refactoring (see specs/011-create-model-context/IMPLEMENTATION_NOTES.md)

**Run Tests**:
```bash
npm test                    # All tests
npm test:contract           # Contract tests
npm test:integration        # Integration tests
npm test:unit               # Unit tests
npm test tests/contract/external-api.test.ts  # Feature 018 (49/49)
```

## API Contracts

All API endpoints documented in OpenAPI 3.0 format at `/specs/{feature}/contracts/*.yaml`

**Coverage**:
- **Features 002-005**: Auth, campaigns (CRUD, sessions), cards (CRUD, move, reorder, subtree), settings, database-cards (schema, entry CRUD, views), information levels (CRUD, custom levels), view mode (X-View-Mode filtering), AI import (sessions, file upload, chat, approval, batch revert), AI planning (sessions, chat, immediate graph updates), knowledge graphs (CRUD, nodes/edges, active filtering)
- **Feature 011**: MCP tools (8 JSON Schema files defining 29 tools, 3 resources, 2 prompts). ⚠️ See IMPLEMENTATION_NOTES.md for v0.5.0 refactoring requirements
- **Feature 014**: 13 category CRUD endpoints (factions, npcs, locations, session-recaps, quests, player-characters, lore-entries, world-rules, planar-forces, session-prep, custom-mechanics, items, creatures, custom-field-definitions). Information filtering, pagination, FK validation, circular reference detection
- **Feature 018**: External API (external-api.yaml) - 8 endpoint groups: health check, database query/create/update/delete operations across 13 categories, hierarchy navigation (locations/NPCs), session recap timeline queries, knowledge graph operations. Two-phase delete confirmation, information filtering, campaign validation

**Validate Implementation**:
```bash
npm test:contract                                 # All contract tests
npm test tests/contract/external-api.test.ts     # Feature 018: 49/49 passing
```

## Quickstart

**Feature Setup Guides**: See `/specs/{feature}/quickstart.md` for detailed setup instructions
- 002 (Auth), 003 (Cards), 004 (Information Filtering), 005 (AI), 011 (MCP - ⚠️ requires API refactoring first), 014 (Categories), 015 (Dashboard), 018 (External API)

**TL;DR**:
1. `docker-compose up --build`
2. Open http://localhost:3000
3. Click Login → Register → Create setting → Create campaign → Create cards
4. Settings → Information Levels → Create custom level → Use painter's easel palette → Toggle view mode (⋮)
5. **Feature 018**: `curl http://localhost:3002/api/v1/external/health` - Test external API for Claude Desktop integration

<!-- MANUAL ADDITIONS START -->
<!-- Add project-specific notes, gotchas, or team agreements here -->
<!-- MANUAL ADDITIONS END -->
