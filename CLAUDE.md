# Wrldbldr MCP Manager Development Guidelines

Auto-generated from feature plans. Last updated: 2025-10-01

## Mission

Wrldbldr MCP Manager is a TTRPG campaign management webapp that solves the "plan twice" problem for Game Masters. Built as a fully local prototype on localhost using Docker.

## Active Technologies
- Backend: Node.js 20 LTS + TypeScript 5.0+, Frontend: React 18 + TypeScript 5.0+ + Backend: Express 4.x, Better-SQLite3, crypto (Node.js built-in for random IDs), Frontend: React Router v6, TipTap 2.x (reuse from Feature 003), existing card components (010-create-public-campaign)
- SQLite3 with Better-SQLite3 (extend campaigns table with public sharing config, add draft/published versions table) (010-create-public-campaign)

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
│   │   ├── models/             # User, Campaign, Session, Setting, Card, InformationLevel, ImportSession, PlanningSession, KnowledgeGraph, GraphNode, GraphEdge, ImportBatch
│   │   ├── services/           # AuthService, CampaignService, DatabaseService, CardService, SettingService, InformationLevelService, ViewModeService, ImportService, PlanningService, KnowledgeGraphService, LLMService (OpenAI/Anthropic), EntityExtractionService, FileParserService
│   │   ├── middleware/         # keycloak.ts, cors.ts, errorHandler.ts, viewModeFilter.ts, multer.ts
│   │   ├── routes/             # auth.ts, campaigns.ts, sessions.ts, cards.ts, settings.ts, database-cards.ts, information-levels.ts, view-mode.ts, import.ts, planning.ts, graphs.ts, health.ts
│   │   └── db/
│   │       ├── schema.sql      # CREATE TABLE statements (users, campaigns, sessions, settings, cards, information_levels, import_sessions, planning_sessions, knowledge_graphs, graph_nodes, graph_edges, import_batches)
│   │       └── migrations.ts   # Version tracking
│   └── tests/
│       ├── contract/           # API contract tests (auth, campaigns, cards, settings, database-cards, information-levels, view-mode, import, planning, graphs)
│       ├── integration/        # Auth flow, card hierarchy validation, view mode filtering, import approval workflow, batch revert, planning immediate updates, active filtering
│       └── unit/               # Service tests, circular reference detection, partial visibility logic, entity deduplication (Levenshtein), timeline conflict detection
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
- 010-create-public-campaign: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]
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

Run contract tests to validate implementation:
```bash
cd backend && npm test:contract
```

## Quickstart

**Feature 002 Setup**: See `/specs/002-create-the-authentication/quickstart.md`
**Feature 003 Setup**: See `/specs/003-create-a-notion/quickstart.md`
**Feature 004 Setup**: See `/specs/004-create-a-tagging/quickstart.md`
**Feature 005 Setup**: See `/specs/005-create-the-ai/quickstart.md`

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
