# Wrldbldr MCP Manager Development Guidelines

Auto-generated from feature plans. Last updated: 2025-10-14

## Mission

Wrldbldr MCP Manager is a TTRPG campaign management webapp that solves the "plan twice" problem for Game Masters. Built as a fully local prototype on localhost using Docker.

## Active Technologies
- Backend: Node.js 20 LTS + TypeScript 5.0+, Frontend: React 18 + TypeScript 5.0+ + Backend: Express 4.x, Better-SQLite3, crypto (Node.js built-in for random IDs), Frontend: React Router v6, TipTap 2.x (reuse from Feature 003), existing card components (010-create-public-campaign)
- SQLite3 with Better-SQLite3 (extend campaigns table with public sharing config, add draft/published versions table) (010-create-public-campaign)
- TypeScript 5.0+ (Node.js 20 LTS) + @modelcontextprotocol/sdk (official Anthropic MCP SDK), Better-SQLite3 (existing), zod (schema validation) (011-create-model-context)
- SQLite3 (existing database, mcp_tool_logs table added) (011-create-model-context)

**Infrastructure** (002-create-the-authentication):
- Docker Compose 2.x for service orchestration
- Keycloak official image (Quay.io) for OAuth 2.0 authentication
- SQLite3 with Better-SQLite3 library (WAL mode enabled)

**Frontend** (002-create-the-authentication):
- React 18 + TypeScript 5.0+
- Vite for dev server and build
- React Router v6 for routing
- Keycloak-js for OAuth 2.0 client
- Axios for HTTP client with token injection

**Frontend** (003-create-a-notion):
- TipTap 2.x for rich text editing (ProseMirror-based)
- @dnd-kit for drag-and-drop tree reordering
- cmdk (Vercel's command menu) for slash commands
- TanStack Table v8 for database table views
- React Beautiful DnD for kanban boards
- Lucide React for icons + emoji picker

**Frontend** (004-create-a-tagging):
- React Context API for InformationLevelContext and ViewModeContext
- localStorage for view mode persistence with cross-tab sync via storage event
- TipTap custom node decorations for secret visual indicators
- Radix UI Dropdown Menu for accessible view mode toggle
- react-window for virtualizing large filtered card lists

**Frontend** (005-create-the-ai):
- Radix UI Dialog for pull-down tab UI (Import AI and Planning AI tabs)
- React Context API for AITabContext (Import/Planning state management)
- EventSource for Server-Sent Events (SSE) streaming from LLM
- File upload components for PDF, DOCX, TXT, MD (multipart/form-data)
- Knowledge graph visualization (Political-Web active filtering)

**Frontend** (007-create-the-interactive):
- Konva.js + react-konva for interactive map canvas (zoom, pan, drag-drop pins)
- react-color for zone color picker
- Radix UI Tabs for multi-map switching
- Canvas-based rendering for 500+ pins with 60fps performance

**Frontend** (008-create-byollm-configuration):
- Radix UI Dropdown Menu for provider selection (OpenAI, Anthropic, Custom Endpoint)
- axios for OAuth flow initiation and API requests
- EventSource for real-time retry notifications during rate limit handling
- React Context API for BYOLLMContext (active configuration, credits, connection status)
- Masked input components for API key entry (security)
- 11 new components: BYOLLMSettings, ProviderSelector, OAuthButton, APIKeyInput, CreditsDisplay, ModelSelector, CustomEndpointConfig, ConnectionTest, CustomSystemPrompt, ScopeSelector, PrivacyNotice, BYOLLMBlockingError

**Backend** (002-create-the-authentication):
- Node.js 20 LTS + TypeScript 5.0+
- Express 4.x for REST API
- Keycloak Connect for token validation
- Better-SQLite3 for database operations
- CORS middleware for localhost:3000 ↔ localhost:3001

**Backend** (003-create-a-notion):
- SQLite JSON1 extension for JSONB columns (rich text, database schemas)
- Adjacency list + materialized path for card hierarchy
- ProseMirror JSON format for rich text storage

**Backend** (004-create-a-tagging):
- Express middleware pattern for X-View-Mode header filtering
- SQLite indexes on information_level_id and hierarchical flag
- Server-side view mode validation before API responses

**Backend** (005-create-the-ai):
- OpenAI SDK for GPT-3.5/GPT-4 streaming (user-provided credentials)
- Anthropic SDK for Claude streaming (user-provided credentials)
- pdf-parse for PDF file parsing
- mammoth for DOCX file parsing
- multer for multipart/form-data file uploads
- Server-Sent Events (SSE) for LLM streaming responses
- Levenshtein distance algorithm for entity deduplication (fuzzy matching threshold 0.7)
- SQLite JSON1 extension for graph JSONB storage (nodes, edges, chat history)
- Active filtering: hybrid time-based (last 5 sessions) + tag-based for Political-Web/Campaign-Story graphs

**Backend** (007-create-the-interactive):
- multer for map image uploads (multipart/form-data, 10MB limit)
- SQLite BLOB storage for map images with client-side compression
- Extends cards table with map_enabled flag and pin/zone/layer columns
- New table: map_images with BLOB image_data
- Absolute pixel coordinates (x, y integers) for pins and zone vertices

**Backend** (008-create-byollm-configuration):
- Node.js crypto module for AES-256-GCM encryption (prototype-level, local credentials only)
- axios for provider API calls (OpenAI, Anthropic, Custom Endpoint)
- jose for JWT handling during OAuth 2.0 flows
- OAuth 2.0 Authorization Code Flow + PKCE (Proof Key for Code Exchange) for OpenAI and Anthropic
- 3 new tables: byollm_configs (encrypted credentials, model config, custom prompts), provider_credits (cached balance, org name, 5min TTL), oauth_sessions (state, code_verifier, 10min TTL)
- New services: BYOLLMConfigService (CRUD, scope resolution global/campaign), OAuthFlowService (initiate, callback, token exchange), ProviderClientService (credits, models, connection test), EncryptionService (AES-256-GCM encrypt/decrypt), MCPConfigService (automatic streaming, timeout, retry)
- Rate limit handling: exponential backoff with jitter, respect Retry-After header, max 3 retries, user notification
- Credentials NEVER transmitted to Wrldbldr MCP Manager servers (direct user → provider API calls only)

**Backend** (011-create-model-context):
- @modelcontextprotocol/sdk for structured AI tool calls (⚠️ needs API refactoring to v0.5.0 patterns)
- Zod for runtime schema validation (29 tools across 8 categories)
- stdio transport for JSON-RPC communication (no network exposure)
- 3 middleware layers: permissions (campaign ownership + information level filtering), transactions (10s timeout with automatic rollback), logging (mcp_tool_logs audit trail)
- New table: mcp_tool_logs (tool_name, campaign_id, user_id, parameters, result_status, error_message, execution_time_ms, created_at)
- Reuses existing services: CardService, KnowledgeGraphService, InformationLevelService (no duplication)
- 29 tools: 6 card operations, 5 hierarchy navigation, 4 knowledge graph operations, 2 session recap queries, 2 information level discovery, 3 database card operations, 2 map card operations, 3 resources, 2 prompts

**Backend** (014-create-the-database):
- Better-SQLite3 with 14 new tables: 13 category tables (factions, npcs, locations, session_recaps, quests, player_characters, lore_entries, world_rules, planar_forces, session_prep, custom_mechanics, items, creatures) + custom_field_definitions support table
- Universal fields pattern: 10 common fields across all categories (id, campaign_id, name, description, core_status, player_knowledge, tags, created_at, updated_at, custom_fields)
- Information filtering middleware: extractViewMode (X-View-Mode header), stripDmFields (player_view response filtering), getPlayerKnowledgeFilter (SQL WHERE clause generation)
- Foreign key relationships: explicit FK columns with CASCADE (campaign_id) and SET NULL (faction_id, superior_npc_id, parent_location_id, quest_giver_id, etc.)
- Self-referential FKs with circular reference detection: superior_npc_id, parent_location_id, related_rules
- JSON arrays for many-to-many: locations[], key_members[], allied_factions[], npcs_to_prep[], etc. (no junction tables in v1)
- Session prep one-way linking: npcs_to_prep/locations_to_prep reference canonical entities without reverse lookups
- Canonical enforcement: SessionRecap always is_canon=1/canonical_status='canon', SessionPrep always is_canon=0/canonical_status='hypothetical'/player_knowledge='dm_only'
- 14 service classes: NPCService, LocationService, FactionService, SessionRecapService, QuestService, PlayerCharacterService, LoreEntryService, WorldRuleService, PlanarForceService, SessionPrepService, CustomMechanicService, ItemService, CreatureService, CustomFieldDefinitionService
- Performance targets: <100ms single entity read, <500ms list queries (100 results)

**Frontend** (015-create-the-dashboard):
- react-grid-layout 1.3.4 + react-resizable 3.0.4 for drag-drop canvas (12-column grid, 10px rows, responsive breakpoints lg/md/sm)
- TipTap 2.x for category landing page rich text editor (reuse from Feature 003)
- 7 widget components with size-adaptive rendering (compact 1x1/2x2, detailed 3x3+)
- ViewModeToggle with eye icon (open=DM, closed=Player) for information filtering integration
- useDashboardCanvas and useCategoryLandingCanvas hooks for canvas state management with 500ms debounced auto-save
- WidgetRegistry with 7 widgets: NPCSummaryWidget, LocationExplorerWidget, FactionPowerWidget, QuestTrackerWidget, SessionTimelineWidget, PlayerCharactersWidget, RecentActivityWidget
- BaseWidget wrapper component with drag handle and remove button
- WidgetPicker modal for adding widgets to canvas
- CategoryLandingCanvas and CategoryLandingTextEditor components for 13 category pages

**Backend** (015-create-the-dashboard):
- Better-SQLite3 with 2 new tables: dashboard_configs (dashboard layouts), category_landing_configs (category canvas + rich text descriptions)
- JSONB layout format for react-grid-layout configuration persistence
- 8 REST API routes: GET/POST/PUT/DELETE for dashboard configs and category landing configs
- Per-user per-campaign layout persistence with CASCADE delete on campaign_id and user_id foreign keys
- DashboardConfigService and CategoryLandingConfigService for CRUD operations
- widgetDataService with 7 API integrations fetching from Feature 014 category tables
- Migration 015-dashboard-canvas.sql creating both tables with proper indexes and unique constraints

**Testing** (002-create-the-authentication):
- Vitest + React Testing Library (frontend unit tests)
- Playwright (frontend E2E tests)
- Vitest + Supertest (backend contract tests)

**Testing** (003-create-a-notion):
- Frontend: Vitest + React Testing Library (card components, slash commands)
- Backend: Vitest + Supertest (card CRUD, hierarchy validation, circular ref detection)
- E2E: Playwright (create card → nest → database CRUD → view switching → drag reorder)

**Testing** (004-create-a-tagging):
- Frontend: Vitest (InformationLevelContext, ViewModeContext, useFilteredCards hook)
- Backend: Vitest + Supertest (information levels CRUD, view mode filtering, partial visibility)
- E2E: Playwright (create custom level → assign to card → toggle view mode → verify filtering → database partial visibility → delete level)

**Testing** (005-create-the-ai):
- Frontend: Vitest (AITabContext, SSE streaming hooks, file upload components)
- Backend: Vitest + Supertest (import/planning sessions, approval summary, batch revert, active filtering)
- E2E: Playwright (import session recap → upload file → chat with AI → approve → verify graph nodes → revert batch → planning session → verify immediate updates)

**Testing** (007-create-the-interactive):
- Frontend: Vitest (MapCanvas, PinEditor, ZoneEditor, LayerManager, MapTabs components)
- Backend: Vitest + Supertest (map image upload, pin/zone/layer CRUD, orphaned pin detection)
- E2E: Playwright (enable map → upload image → add pins → draw zones → toggle layers → nested navigation → information filtering)

**Testing** (008-create-byollm-configuration):
- Frontend: Vitest (BYOLLMSettings, ProviderSelector, OAuthButton, APIKeyInput, CreditsDisplay, ModelSelector, CustomEndpointConfig, ConnectionTest, BYOLLMBlockingError components)
- Backend: Vitest + Supertest (BYOLLM config CRUD, OAuth flow initiate/callback, provider API calls, encryption/decryption, connection test, rate limit retry)
- E2E: Playwright (blocking error → Settings → OAuth flow → authorize → view credits → select model → test connection → save → verify Import AI accessible)

**Testing** (011-create-model-context):
- Backend: Vitest + Supertest (7 contract tests for tool categories, 3 integration tests for atomic operations/permissions/concurrency)
- 10 test files created, cannot run until MCP SDK API corrections applied
- See specs/011-create-model-context/IMPLEMENTATION_NOTES.md for refactoring guide

**Testing** (014-create-the-database):
- Backend: Vitest + Supertest (14 contract tests for category CRUD operations with information filtering, pagination, foreign key validation, circular reference detection)
- Unit tests: information filter middleware (extractViewMode, stripDmFields, stripDmFieldsFromArray, getPlayerKnowledgeFilter, buildWhereClause)
- Integration tests: informationFiltering (X-View-Mode header filtering, dm_* field stripping), foreignKeyConnections (NPC→Faction, NPC→NPC, Location→Location, Quest→NPC/SessionRecap, Campaign CASCADE), sessionPrepOneWay (one-way references, stale IDs acceptable, hypothetical marker enforcement), performance (100 entities per category, <100ms single read, <500ms list)
- Performance validation: All 13 categories tested for single entity read (<100ms) and list queries (<500ms for 100 results)
- No E2E tests (backend-only feature, UI integration deferred to future features)

## Project Structure

```
wrldbldr-mcp-manager/
├── docker-compose.yml          # Orchestrates 3 services: keycloak, backend, frontend
├── data/                       # SQLite database (bind mount, persists)
│   └── wrldbldr-mcp-manager.db
├── keycloak/
│   ├── Dockerfile.keycloak
│   └── realm-export.json       # Pre-configured wrldbldr-mcp-manager realm
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── models/             # User, Campaign, Session, Setting, Card, InformationLevel, ImportSession, PlanningSession, KnowledgeGraph, GraphNode, GraphEdge, ImportBatch, NPC, Location, Faction, SessionRecap, Quest, PlayerCharacter, LoreEntry, WorldRule, PlanarForce, SessionPrep, CustomMechanic, Item, Creature, CustomFieldDefinition
│   │   ├── services/           # AuthService, CampaignService, DatabaseService, CardService, SettingService, InformationLevelService, ViewModeService, ImportService, PlanningService, KnowledgeGraphService, LLMService (OpenAI/Anthropic), EntityExtractionService, FileParserService, NPCService, LocationService, FactionService, SessionRecapService, QuestService, PlayerCharacterService, LoreEntryService, WorldRuleService, PlanarForceService, SessionPrepService, CustomMechanicService, ItemService, CreatureService, CustomFieldDefinitionService
│   │   ├── middleware/         # keycloak.ts, cors.ts, errorHandler.ts, viewModeFilter.ts, multer.ts, informationFilter.ts
│   │   ├── routes/             # auth.ts, campaigns.ts, sessions.ts, cards.ts, settings.ts, database-cards.ts, information-levels.ts, view-mode.ts, import.ts, planning.ts, graphs.ts, health.ts, npcs.ts, locations.ts, factions.ts, sessionRecaps.ts, quests.ts, playerCharacters.ts, loreEntries.ts, worldRules.ts, planarForces.ts, sessionPrep.ts, customMechanics.ts, items.ts, creatures.ts, customFieldDefinitions.ts
│   │   ├── mcp/                # Model Context Protocol server (Feature 011 - ⚠️ needs API refactoring)
│   │   │   ├── server.ts       # MCP server entry point (stdio transport, JSON-RPC)
│   │   │   ├── schemas/        # Zod schemas for 29 tools (card, hierarchy, graph, recap, info-level, database, map)
│   │   │   ├── tools/          # 29 tool implementations across 8 categories
│   │   │   ├── resources/      # 3 browsable resources (campaign://cards, recaps, graphs)
│   │   │   ├── prompts/        # 2 AI prompt templates (import_workflow, planning_workflow)
│   │   │   └── middleware/     # permissions.ts, transactions.ts (10s timeout), logging.ts (mcp_tool_logs audit)
│   │   └── db/
│   │       ├── schema.sql      # CREATE TABLE statements (users, campaigns, sessions, settings, cards, information_levels, import_sessions, planning_sessions, knowledge_graphs, graph_nodes, graph_edges, import_batches, mcp_tool_logs, factions, npcs, locations, session_recaps, quests, player_characters, lore_entries, world_rules, planar_forces, session_prep, custom_mechanics, items, creatures, custom_field_definitions)
│   │       └── migrations/
│   │           ├── migrations.ts   # Version tracking
│   │           ├── 011-mcp-tool-logs.sql  # Tool call audit logging table
│   │           └── 014-category-tables.sql  # 13 category tables + custom_field_definitions table
│   └── tests/
│       ├── contract/           # API contract tests (auth, campaigns, cards, settings, database-cards, information-levels, view-mode, import, planning, graphs, mcp tools, npcs, locations, factions, sessionRecaps, quests, playerCharacters, loreEntries, worldRules, planarForces, sessionPrep, customMechanics, items, creatures, customFieldDefinitions)
│       ├── integration/        # Auth flow, card hierarchy validation, view mode filtering, import approval workflow, batch revert, planning immediate updates, active filtering, mcp atomic operations/permissions/concurrency, informationFiltering, foreignKeyConnections, sessionPrepOneWay, performance
│       └── unit/               # Service tests, circular reference detection, partial visibility logic, entity deduplication (Levenshtein), timeline conflict detection, informationFilter middleware
└── frontend/
    ├── Dockerfile
    ├── src/
    │   ├── components/         # PublicLanding, CampaignManagement, CampaignHomepage, CardTree, CardEditor, SlashCommandPalette, DatabaseView (Table/List/Gallery/Kanban), PaintersEaselPalette, ViewModeToggle, SettingsInformationLevels, ImportAITab, PlanningAITab, KnowledgeGraphViewer, AIApprovalSummaryView, GraphNodeEditor, ActiveFilterToggle
    │   ├── pages/              # LandingPage, CampaignsPage, CampaignPage, CardPage, SettingsPage
    │   ├── services/           # keycloakService, apiClient, campaignService, cardService, settingService, databaseService, informationLevelService, importService, planningService, knowledgeGraphService
    │   ├── hooks/              # useAuth, useCampaigns, useKeycloak, useCards, useCardHierarchy, useDatabaseSchema, useSlashCommands, useInformationLevel, useViewMode, useFilteredCards, useImportSession, usePlanningSession, useSSEStream, useKnowledgeGraph, useActiveFilter
    │   ├── contexts/           # AuthContext, CardContext, InformationLevelContext, ViewModeContext, AITabContext
    │   ├── routes/             # AppRoutes with protected routes
    │   └── config/             # keycloak.ts, tiptap.ts
    └── tests/
        ├── components/         # Component unit tests (CardTree, DatabaseView, SlashCommandPalette, PaintersEaselPalette, ViewModeToggle, ImportAITab, PlanningAITab, GraphNodeEditor)
        └── e2e/                # Playwright auth flow, card hierarchy, database CRUD, view mode filtering, import session workflow, planning session workflow, knowledge graph inspection tests
```

## Commands

### Development
```bash
# Start all services (first time - builds images)
docker-compose up --build

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
```

### Testing
```bash
# Backend tests (from backend/ directory)
npm test                    # All tests
npm test:contract           # Contract tests
npm test:integration        # Integration tests
npm test:unit               # Unit tests

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

### Database
- SQLite with WAL mode enabled
- Foreign keys enforced (`PRAGMA foreign_keys = ON`)
- Unix timestamps (INTEGER) for all dates
- UUIDs (TEXT) for primary keys (campaigns, sessions)
- Keycloak sub (TEXT) for user_id (foreign key pattern)

### Security
- No secrets in code or commits
- Keycloak handles password hashing
- Bearer tokens in Authorization header only
- CORS restricted to localhost:3000
- Public campaign passwords stored plaintext (prototype only - note for production: hash with bcrypt)

## Recent Changes

- **016-create-a-campaign** (2025-10-19): ✅ **CORE COMPLETE** - 4-Step Campaign Setup Wizard. Backend: campaign_settings table (theme, category_labels JSON), atomic transaction service (settings + graph + world_rules), 3 wizard endpoints (status, themes, complete). Frontend: WizardContext (React useReducer), 10 wizard components (Radix UI Dialog/Switch/Tooltip), theme constants (High Fantasy, Cyberpunk, Sci-Fi, Modern, Custom), useWizardStatus/useWizardCompletion hooks, integrated into DashboardPage. Wizard applies themed category naming (e.g., "Corporations" for Cyberpunk factions), creates World-Foundations graph with starter world rules from questionnaire. Race condition fix: Dashboard/category landing auto-creation handles 400 "already exists" with refetch retry. Test skeletons created (T029-T041), full test implementation deferred. Technologies: Radix UI primitives, React Hook Form + Zod validation (client + server), SQLite JSON1 extension, atomic transactions.

- **015-create-the-dashboard** (2025-10-14): ✅ **COMPLETE** - Interactive Dashboard Canvas System with full CRUD routing. Full-stack feature with drag-and-drop widget canvas for campaign dashboard and 13 category landing pages. **Backend**: 2 tables (dashboard_configs, category_landing_configs with JSONB layouts), 8 API routes (GET/POST/PUT/DELETE), DashboardConfigService, CategoryLandingConfigService, widgetDataService with 7 API integrations to Feature 014 tables, migration 015-dashboard-canvas.sql. **Frontend**: DashboardPage with react-grid-layout (12-col grid, 10px rows, responsive lg/md/sm), 13 CategoryLandingPage components with CategoryLandingCanvas + CategoryLandingTextEditor (TipTap), WidgetRegistry with 7 functional widgets (NPC Summary, Location Explorer, Faction Power, Quest Tracker, Session Timeline, Player Characters, Recent Activity), BaseWidget wrapper with drag handle/remove button, WidgetPicker modal, size-adaptive rendering (compact 1x1/2x2, detailed 3x3+), auto-save with 500ms debounce, ViewModeToggle with eye icon (open=DM, closed=Player), information filtering integration. **Routing** (28 total): Dashboard (/campaigns/:id/dashboard), 13 category landings (/campaigns/:id/:category), 13 table views (/campaigns/:id/:category/database via GenericCategoryListView), entity create (/campaigns/:id/:category/create via CategoryCreatePageRoute), entity edit (/campaigns/:id/:category/:entityId/edit via CategoryEditPageRoute), entity detail (/campaigns/:id/:category/:entityId via GenericCategoryDetailView). **Canvas Features**: drag-drop reordering, resize 1x1 to 12x50, delete widgets, per-user-campaign persistence (localStorage + backend sync). **Navigation**: Sidebar with 4 collapsible sections (SETTING, LIVING WORLD, CAMPAIGN, EXTENDED), Dashboard/Wiki links, thematic labels support. **Performance**: <500ms canvas load, <100ms widget resize, 500ms debounced save. **Technologies**: react-grid-layout 1.3.4, react-resizable 3.0.4, TipTap 2.x, Better-SQLite3, Express 4.x. **Status**: 29/49 tasks complete (T001-T022, T023-T026 sidebar already existed, T027 category pages, T028-T031 CRUD routes, T032-T033 App.tsx routing), automated tests deferred.

- **014-create-the-database** (2025-10-12): Structured Category Database Foundation. Backend-only feature creating 13 specialized category tables + custom_field_definitions support table. Universal fields pattern with 10 common fields (id, campaign_id, name, description, core_status, player_knowledge, tags, created_at, updated_at, custom_fields) across all categories. 13 categories: Factions (political organizations, alliances, agendas), NPCs (non-player characters with race/class/faction), Locations (places with types and hierarchies), SessionRecaps (canonical session summaries with timelines), Quests (objectives with status tracking), PlayerCharacters (PC roster with backgrounds), LoreEntries (world knowledge organized by category), WorldRules (custom mechanics and homebrew rules), PlanarForces (gods, cosmic entities, otherworldly powers), SessionPrep (hypothetical planning always dm_only), CustomMechanics (homebrew game mechanics), Items (equipment with ownership tracking), Creatures (bestiary with stat blocks). Information filtering middleware with X-View-Mode header (dm_view vs player_view) for automatic dm_* field stripping in responses. Foreign key relationships: explicit FK columns with CASCADE (campaign_id → campaigns) and SET NULL (faction_id → factions, superior_npc_id → npcs, parent_location_id → locations, quest_giver_id → npcs, started_session_id/completed_session_id → session_recaps). Self-referential FKs with circular reference detection (superior_npc_id, parent_location_id, related_rules). JSON arrays for many-to-many relationships without junction tables (locations[], key_members[], allied_factions[], npcs_to_prep[], locations_to_prep[]). Session prep one-way linking: references to canonical entities (NPCs, locations, quests) without reverse lookup fields, stale IDs acceptable after deletion. Canonical enforcement: SessionRecap hardcoded to is_canon=1/canonical_status='canon' (always canonical), SessionPrep hardcoded to is_canon=0/canonical_status='hypothetical'/player_knowledge='dm_only' (always hypothetical and DM-only). 14 TypeScript model interfaces, 14 service classes with CRUD operations, 14 REST route files (GET list, POST create, GET by ID, PUT update, DELETE), informationFilter middleware (extractViewMode, stripDmFields, getPlayerKnowledgeFilter, applyInformationFilter, buildWhereClause). Testing: 14 contract tests (category CRUD, pagination, filtering, FK validation, circular detection), 4 integration tests (informationFiltering, foreignKeyConnections, sessionPrepOneWay, performance), 1 unit test file (informationFilter middleware). Performance targets: <100ms single entity read, <500ms list queries (100 results). No frontend components (backend-only, UI integration deferred to future features). Database migration: 014-category-tables.sql with all 14 tables and indexes. Technologies: Better-SQLite3, Express 4.x middleware pattern, prepared statements for SQL injection prevention, JSON1 extension for JSONB fields (tags, custom_fields, class, locations arrays).

- **011-create-model-context** (2025-10-03): Model Context Protocol (MCP) integration for structured AI tool calls. Implements Anthropic's MCP SDK to provide 29 tools across 8 categories for Feature 005's AI workflows: card operations (read, create, update, delete, search, move), hierarchy navigation (path, subtree, children, siblings, ancestor), knowledge graphs (query, list nodes, relationships, atomic updates), session recaps (get recaps, timeline events), information level discovery (list levels, get by name), database card operations (query, create entry, update entry), map card operations (list pins, create pin), plus 3 browsable resources (campaign://cards, recaps, graphs) and 2 AI prompt templates (import_workflow, planning_workflow). Middleware provides permissions (campaign ownership + information level filtering), atomic transactions (10s timeout, automatic rollback), and logging (mcp_tool_logs audit trail). All operations reuse existing services. Performance targets: <100ms single card read, <500ms search (100 results), 5 concurrent calls. **Status**: Spec complete (60 FRs), 41 files created (~6,400 lines), needs MCP SDK v0.5.0 API corrections - see specs/011-create-model-context/IMPLEMENTATION_NOTES.md for refactoring guide. Technologies: @modelcontextprotocol/sdk, zod, stdio transport, Better-SQLite3 WAL mode.

- 010-create-public-campaign: Added Backend: Node.js 20 LTS + TypeScript 5.0+, Frontend: React 18 + TypeScript 5.0+ + Backend: Express 4.x, Better-SQLite3, crypto (Node.js built-in for random IDs), Frontend: React Router v6, TipTap 2.x (reuse from Feature 003), existing card components

- **006-create-the-knowledge**: Formalized Knowledge Graph Architecture with separate tables (knowledge_graphs, graph_nodes, graph_edges, graph_versions). Toggle controls for selective AI context (campaign-level toggle_state). 1-deep versioning (current + backup) with restore functionality. Cross-graph queries via free-form observations (LLM interpretation). Graph Summary Panel above Planning AI showing all graphs with toggle controls, node/edge counts, last updated. Context Engineering help page. Chat-based graph creation via Planning AI. Manual node/edge CRUD operations. Custom graph types support (custom:{type}). Multiple instances of same graph type. GraphVersion entity for snapshots. GraphToggleService, GraphVersionService, CrossGraphQueryService. Adjacency list pattern with JSONB attributes for user-defined schemas. Information level filtering integration (DM Secret nodes hidden in Player View). Default World-Foundations graph on campaign init. Performance: <100ms query/toggle, <500ms save for 50 nodes/100 edges.

- **005-create-the-ai**: Added AI Import and Planning workflows. 8 new entities: ImportSession, ImportBatch, PlanningSession, KnowledgeGraph, GraphNode, GraphEdge (7 new tables + Card extension with import metadata). 4 knowledge graph types per campaign: Geographical, Political-Web, World-Foundations, Campaign-Story. Import AI workflow: upload files (PDF/DOCX/TXT/MD) → LLM entity extraction → approval summary with fuzzy deduplication (Levenshtein threshold 0.7) → GM approval → atomic batch revert. Planning AI workflow: chat with Planning AI → immediate graph updates (no approval). Active filtering for Political-Web and Campaign-Story graphs: hybrid time-based (last 5 session recaps) + tag-based ("active", "party-relevant"). Pull-down tab UI with Radix UI Dialog. Server-Sent Events (SSE) for LLM streaming. OpenAI/Anthropic SDK integration (user credentials via Feature 008). Timeline consistency validation against Session Recaps. Custom AI instructions via Campaign Settings (system prompt injection). GM manual graph CRUD operations. SQLite JSON1 extension for graph JSONB storage.

- **007-create-the-interactive**: Interactive map system as card feature. Konva.js canvas for map rendering. Pin/Zone/Layer cards as children of map-enabled cards. BLOB storage for map images (10MB limit, client-side compression). Absolute pixel coordinates for pins/zones. Tabs for multiple maps per card. Information filtering integration (pins inherit visibility from referenced cards). Nested map navigation via pin references. /map slash command. Orphaned pin warnings when referenced cards deleted. Modular parent-child architecture preserves coordinates on card move. Performance: <1s upload, <100ms pin operations, 60fps zoom/pan for 500+ pins.

- **008-create-byollm-configuration**: BYOLLM (Bring Your Own LLM) configuration system. Implements Constitution Principle V (NON-NEGOTIABLE): user MUST provide own LLM credentials, stored locally with AES-256-GCM encryption (prototype-level), NEVER transmitted to Wrldbldr MCP Manager servers. OAuth 2.0 Authorization Code Flow + PKCE for OpenAI and Anthropic providers. API key alternative for Anthropic. Custom Endpoint support for local LLMs (Ollama, LM Studio) with OpenAI-compatible format. 3 new tables: byollm_configs (encrypted credentials, model config, custom prompts per scope), provider_credits (cached balance, org name, 5min TTL), oauth_sessions (PKCE state/verifier, 10min TTL). Credits/usage display prevents surprise costs. Model selection with context window info. Connection test validates bulk MCP operations. Custom system prompts for Import/Planning AI (text input or file upload). Global vs per-campaign configuration scopes (campaign overrides global). Blocking errors prevent Import/Planning AI usage without valid config. Rate limit handling: exponential backoff + jitter, respect Retry-After header, max 3 retries, user notification. Graceful failure with manual retry on API errors. OAuth token refresh automatic. All provider API calls direct from user machine (not proxied). Performance: OAuth flow <3s, connection test <5s, credits refresh <2s.

## Constitutional Principles

1. **Workflow-First Design**: No "plan twice" - campaign content IS the wiki
2. **User Agency**: User owns all data locally in SQLite file
3. **Information Filtering**: System, Common Knowledge, Player Knowledge, DM Secret (spec 004)
4. **Knowledge Graph Architecture**: 4 graph types with toggle controls (spec 006)
5. **BYOLLM & Privacy**: User's own LLM credentials only, local storage (spec 008)
6. **Local-Only & Prototype-First**: Everything on localhost via Docker, feature functionality over optimization
7. **Transparency & User Approval**: No autonomous AI edits, explicit publish workflow (spec 010)

See `/memory/constitution.md` for complete governance document.

## API Contracts

All API endpoints documented in OpenAPI 3.0 format:

**Feature 002 (Authentication & Campaign Management)**:
- `/specs/002-create-the-authentication/contracts/auth.yaml`
- `/specs/002-create-the-authentication/contracts/campaigns.yaml`
- `/specs/002-create-the-authentication/contracts/sessions.yaml`

**Feature 003 (Card-Based Content Architecture)**:
- `/specs/003-create-a-notion/contracts/cards.yaml` - Card CRUD, move, reorder, subtree operations
- `/specs/003-create-a-notion/contracts/settings.yaml` - Setting CRUD operations
- `/specs/003-create-a-notion/contracts/database-cards.yaml` - Database schema management, entry CRUD, view operations

**Feature 004 (Information Level-Based Filtering)**:
- `/specs/004-create-a-tagging/contracts/information-levels.yaml` - Information level CRUD, custom level management
- `/specs/004-create-a-tagging/contracts/view-mode.yaml` - View mode filtering endpoints with X-View-Mode header

**Feature 005 (AI Import & Planning Workflows)**:
- `/specs/005-create-the-ai/contracts/import.yaml` - Import session CRUD, file upload, chat, approval, batch revert
- `/specs/005-create-the-ai/contracts/planning.yaml` - Planning session CRUD, chat with immediate graph updates
- `/specs/005-create-the-ai/contracts/knowledge-graphs.yaml` - Knowledge graph CRUD, node/edge operations, active filtering

**Feature 011 (Model Context Protocol Integration)**:
- `/specs/011-create-model-context/contracts/*.json` - 8 JSON Schema files defining 29 MCP tools + resources + prompts
- See IMPLEMENTATION_NOTES.md for API refactoring requirements

**Feature 014 (Structured Category Database Foundation)**:
- `/specs/014-create-the-database/contracts/factions.yaml` - Faction CRUD operations
- `/specs/014-create-the-database/contracts/npcs.yaml` - NPC CRUD operations with faction/superior linking
- `/specs/014-create-the-database/contracts/locations.yaml` - Location CRUD with hierarchy
- `/specs/014-create-the-database/contracts/session-recaps.yaml` - Session recap CRUD (canonical enforcement)
- `/specs/014-create-the-database/contracts/quests.yaml` - Quest CRUD with quest giver and session linking
- `/specs/014-create-the-database/contracts/player-characters.yaml` - Player character CRUD
- `/specs/014-create-the-database/contracts/lore-entries.yaml` - Lore entry CRUD
- `/specs/014-create-the-database/contracts/world-rules.yaml` - World rule CRUD with related rules
- `/specs/014-create-the-database/contracts/planar-forces.yaml` - Planar force CRUD
- `/specs/014-create-the-database/contracts/session-prep.yaml` - Session prep CRUD (hypothetical enforcement, one-way linking)
- `/specs/014-create-the-database/contracts/custom-mechanics.yaml` - Custom mechanic CRUD
- `/specs/014-create-the-database/contracts/items.yaml` - Item CRUD with ownership tracking
- `/specs/014-create-the-database/contracts/creatures.yaml` - Creature CRUD
- `/specs/014-create-the-database/contracts/custom-field-definitions.yaml` - Custom field definition CRUD

Run contract tests to validate implementation:
```bash
cd backend && npm test:contract
```

## Quickstart

**Feature 002 Setup**: See `/specs/002-create-the-authentication/quickstart.md`
**Feature 003 Setup**: See `/specs/003-create-a-notion/quickstart.md`
**Feature 004 Setup**: See `/specs/004-create-a-tagging/quickstart.md`
**Feature 005 Setup**: See `/specs/005-create-the-ai/quickstart.md`
**Feature 011 Setup**: See `/specs/011-create-model-context/quickstart.md` (⚠️ requires API refactoring first)
**Feature 014 Setup**: See `/specs/014-create-the-database/quickstart.md`
**Feature 015 Setup**: See `/specs/015-create-the-dashboard/quickstart.md`

**TL;DR**:
1. `docker-compose up --build`
2. Open http://localhost:3000
3. Click Login → Register → Create setting → Create campaign → Create cards
4. Settings → Information Levels → Create custom level → Use painter's easel palette → Toggle view mode (⋮)
5. Campaign Homepage → Import AI tab → Upload session recap → Chat with AI → Approve → View knowledge graphs
6. Campaign Homepage → Planning AI tab → Chat about session plans → View immediate graph updates → Toggle active filter

<!-- MANUAL ADDITIONS START -->
<!-- Add project-specific notes, gotchas, or team agreements here -->
<!-- MANUAL ADDITIONS END -->
