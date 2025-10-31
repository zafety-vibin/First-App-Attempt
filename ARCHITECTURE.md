# Wrldbldr MCP Manager - Comprehensive Architectural Overview

## Executive Summary

Wrldbldr MCP Manager is a TTRPG (Tabletop Role-Playing Game) campaign management webapp that solves the fundamental "plan twice" problem faced by Game Masters - the redundancy of planning content in one place then recreating it during play in another. This system unifies campaign preparation and execution into a single workflow where the content created during planning *is* the runtime resource.

Built as a fully local prototype on Docker, the system combines a Notion-inspired wiki card system with structured category databases, knowledge graphs for AI context engineering, and Model Context Protocol (MCP) integration for Claude Desktop. The architecture prioritizes user agency (complete data ownership), information filtering (DM vs player views), and workflow-first design where every piece of content serves both preparation and active play.

The system's key innovation lies in its dual data model: narrative content lives in hierarchical wiki cards (for free-form worldbuilding), while structured entities populate category databases (for queryable relationships). Four types of knowledge graphs distill this information into AI-optimized context, enabling intelligent planning assistance without compromising creative control.

## System Architecture

### Technology Stack

**Infrastructure Layer**
- **Docker Compose 2.x**: Service orchestration with 3 containers (Keycloak, Backend, Frontend)
- **Keycloak (Quay.io)**: OAuth 2.0 authentication provider with pre-configured realm
- **SQLite3 with Better-SQLite3**: Local database with WAL mode, JSON1 extension
  - *Why SQLite over PostgreSQL?* Local-first architecture, zero configuration, portable data file ownership, prototype simplicity
  - Single `.db` file contains entire campaign - user owns their data completely

**Frontend Stack (Port 3000)**
- **React 18 + TypeScript 5.0+**: Component-based UI with strict typing
- **Vite**: Build tool for fast HMR and optimized production builds
- **State Management**: Context API over Redux
  - *Why Context over Redux?* Simpler for prototype, less boilerplate, sufficient for current scale
  - 5 primary contexts: AuthContext, InformationLevelContext, ViewModeContext, AITabContext, BYOLLMContext
- **Rich Content Editing**:
  - TipTap 2.x for wiki cards (ProseMirror-based)
  - React-grid-layout for dashboard canvas
  - Konva.js for interactive maps (Feature 007 & 021)
- **UI Components**: Radix UI (accessible primitives), Lucide React (icons), TanStack Table v8 (data tables)

**Backend Stack (Ports 3001 & 3002)**
- **Node.js 20 LTS + Express 4.x**: REST API server
- **Port Architecture**:
  - Port 3001: Main application API (authenticated)
  - Port 3002: External API for AI tools (Feature 018, localhost-only)
  - *Why separate ports?* Isolation of concerns, different auth models, cleaner audit logging
- **Authentication**: Keycloak Connect for token validation, Bearer tokens only
- **AI Integration**:
  - OpenAI SDK & Anthropic SDK for LLM providers
  - Server-Sent Events (SSE) for streaming responses
  - BYOLLM support with encrypted credential storage (AES-256-GCM)
- **MCP Server**: @modelcontextprotocol/sdk for Claude Desktop integration
  - 29 tools across 8 categories
  - stdio transport (JSON-RPC over stdin/stdout)
  - ⚠️ Requires v0.5.0 SDK refactoring

### High-Level Data Flow

```
User Request → Frontend (React)
    ↓
HTTP Request with Bearer Token
    ↓
Express Middleware Chain:
1. CORS validation
2. JSON body parsing
3. Session management
4. Keycloak token validation
5. View mode extraction (X-View-Mode header)
6. Information filtering (player_knowledge levels)
    ↓
Route Handler → Service Layer
    ↓
BaseCategoryService (standardized CRUD)
    ↓
Better-SQLite3 (prepared statements)
    ↓
SQLite Database (foreign keys enforced)
    ↓
Response with filtered data
    ↓
Frontend Context Updates → UI Re-render
```

### Database Architecture

**Schema Design Philosophy**
- **Universal Fields Pattern**: All 13 categories share 10 common fields
  - `id` (UUID), `campaign_id`, `name`, `description`, `core_status`, `player_knowledge`, `tags`, `created_at`, `updated_at`, `custom_fields`
  - Enables BaseCategoryService abstraction (-7,110 lines of code)
- **Foreign Keys Enforced**: `PRAGMA foreign_keys = ON`
  - CASCADE on campaign deletion (everything deleted)
  - SET NULL on optional relationships (faction_id, superior_npc_id)
- **JSON Arrays over Junction Tables**:
  - *Why?* Simpler queries in v1 prototype, fewer joins, adequate for scale
  - Many-to-many stored as JSON arrays (e.g., `allied_factions`, `related_npcs`)
- **Adjacency List + Materialized Path**: Card hierarchy implementation
  - `parent_id` for tree structure
  - `position` for sibling ordering
  - `path` for efficient subtree queries

**Performance Characteristics**
- Target: <100ms single entity read, <500ms list queries (100 results)
- WAL mode for concurrent reads
- Indexes on foreign keys, campaign_id, updated_at
- JSON1 extension for efficient JSONB operations

## Feature Encyclopedia

### Feature 003: Notion-Inspired Wiki Cards

**What It Does**: Provides a hierarchical card system where everything (pages, databases, text, images) is a card. Supports infinite nesting, slash commands, and multiple database views.

**Why Designed This Way**:
- Cards as universal content unit enables consistent UI/UX
- ProseMirror JSON format for rich text storage (battle-tested, extensible)
- Separation from category databases allows narrative freedom

**Integration Points**:
- Cards can reference category entities via entity links
- Information levels apply to cards (System, Common Knowledge, Player Knowledge, DM Secret)
- Cards provide narrative context for AI planning

**Key Components**:
- `backend/src/services/CardService.ts`: CRUD operations, hierarchy management
- `frontend/src/components/CardTree.tsx`: Tree navigation UI
- `frontend/src/components/CardEditor.tsx`: TipTap-based rich text editor
- Database: `cards` table with self-referential parent_id

**Architectural Highlights**:
- Circular reference detection prevents infinite loops
- Materialized path enables efficient subtree operations
- Granular block storage (each paragraph/heading is separate) vs monolithic documents
  - *Why granular?* Better for AI context selection, version control, collaborative editing

### Feature 014: Category Database Standardization

**What It Does**: Provides 13 structured databases (NPCs, Locations, Factions, etc.) with standardized CRUD operations via BaseCategoryService pattern.

**Why Designed This Way**:
- Abstract base class enforces consistency across all categories
- 60-70% code reduction through inheritance
- Universal fields enable generic UI components

**Integration Points**:
- All categories filterable by information levels
- Foreign key relationships maintain referential integrity
- External API (Feature 018) exposes all categories

**Key Components**:
- `backend/src/services/BaseCategoryService.ts`: Abstract base class
- 13 category services extending base (NPCService, LocationService, etc.)
- Database: 13 tables with universal + category-specific fields

**Architectural Highlights**:
- Optional ownership validation via OperationOptions
- JSON field parsing utilities for tags, custom_fields
- Circular reference detection for self-referential FKs (NPC→NPC superior)

### Feature 004: Information Filtering System

**What It Does**: Implements 4-level information filtering (System, Common Knowledge, Player Knowledge, DM Secret) with dual view modes and custom user-defined levels.

**Why Designed This Way**:
- Dual systems accommodate different UI patterns:
  - Wiki cards: System 1 (now uses `dm_view` | `player_view`)
  - Category databases: System 2 (`dm_view` | `player_view`)
- *Note*: Values unified as of commit e071607, but separate middleware chains remain
- Custom levels per campaign stored in `information_levels` table

**Integration Points**:
- X-View-Mode header controls filtering
- Middleware strips dm_* fields in player view
- SQL WHERE clauses filter by player_knowledge
- **NEW**: EditableCell loads custom levels dynamically from InformationLevelContext

**Key Components**:
- `backend/src/middleware/informationFilter.ts`: Category filtering (System 2)
- `backend/src/middleware/viewModeFilter.ts`: Wiki filtering (System 1)
- `frontend/src/contexts/ViewModeContext.tsx`: UI state management
- `frontend/src/contexts/InformationLevelContext.tsx`: Custom level management
- `frontend/src/components/table/EditableCell.tsx`: Dynamic dropdown loading

**Architectural Highlights**:
- Information levels customizable per campaign
- Painter's easel palette for batch tagging
- View mode persists across navigation
- **NEW**: Custom levels appear in all 13 category database dropdowns (commit e071607)
- System level filtered from database dropdowns (wiki structural content only)

### Feature 005: AI Import & Planning Workflows

**What It Does**: Enables AI-assisted content import from documents and intelligent campaign planning through conversational interface.

**Why Designed This Way**:
- Import workflow separated from planning (different contexts)
- Entity extraction with Levenshtein deduplication (0.7 threshold)
- SSE streaming for real-time feedback
- Explicit approval workflow (no autonomous edits)

**Integration Points**:
- Import creates category entities and session recaps
- Planning updates knowledge graphs (Feature 006)
- Campaign Bible provides AI context (Feature 010)

**Key Components**:
- `frontend/src/components/ImportAITab.tsx`: Import UI
- `frontend/src/components/PlanningAITab.tsx`: Planning UI
- Backend services: Entity extraction, file parsing, deduplication

**Architectural Highlights**:
- PDF/DOCX/TXT/MD file support via multipart upload
- Batch revert capability for mistaken imports
- Timeline conflict detection for session chronology

### Feature 006: Knowledge Graph Architecture

**What It Does**: Provides 4 graph types (World-Foundations, Political-Web, Geographical, Campaign-Story) for AI context optimization.

**Why Designed This Way**:
- Graphs independent from cards/databases (user-defined distillation)
- Toggle controls per graph (granular AI access)
- No auto-sync prevents assumption errors
- Cross-graph context via node observations

**Integration Points**:
- Planning AI queries enabled graphs
- Import AI never touches graphs (OFF during import)
- Geographic Navigator uses Geographical graph (Feature 021)

**Key Components**:
- `backend/src/services/KnowledgeGraphService.ts`: Graph CRUD
- `frontend/src/components/KnowledgeGraphViewer.tsx`: Visualization
- Database: `knowledge_graphs`, `graph_nodes`, `graph_edges` tables

**Architectural Highlights**:
- 1-deep versioning for revert capability
- Active filtering (last 5 sessions + tagged content)
- Graduated detail retention for Campaign-Story (experimental)
- Multiple instances of same graph type supported

### Feature 007 & 021: Interactive Maps & Geographic Navigator

**What It Does**:
- Feature 007: Map attachments with pins/zones for locations
- Feature 021: Scale-based geographic visualization with spatial hierarchy

**Why Designed This Way**:
- Separate features for different use cases:
  - 007: Individual location maps (dungeon layouts, city districts)
  - 021: World-scale navigation (continents → regions → cities)
- Click-to-place over drag-drop (more precise, less error-prone)
- Client-side caching for instant scale transitions

**Integration Points**:
- Maps stored as BLOBs in locations table
- Geographic graph provides hierarchy
- Pins stored as absolute pixel coordinates (map_pin_x/y)

**Key Components**:
- `frontend/src/components/MapCanvas.tsx`: Konva.js canvas (Feature 007)
- `frontend/src/components/GeographicNavigator.tsx`: Scale navigator (Feature 021)
- `backend/src/services/GeographicNavigatorService.ts`: Hierarchy builder

**Architectural Highlights**:
- 3 visualization modes: Ellipse, Map, Grid
- Breadcrumb navigation maintains context
- Parent location maps as backgrounds for child nodes
- Pin/unpin workflow for spatial positioning

### Feature 011: MCP (Model Context Protocol) Tools

**What It Does**: Exposes 29 tools via MCP for Claude Desktop integration, enabling AI to query and manipulate campaign data.

**Why Designed This Way**:
- stdio transport for simple desktop integration
- Tool categories match user mental model
- 3-layer middleware (permissions, transactions, logging)
- Resources for browsable content

**Integration Points**:
- All category databases accessible
- Card hierarchy traversable
- Knowledge graphs queryable
- Map data retrievable

**Key Components**:
- `backend/src/mcp/server.ts`: MCP entry point
- `backend/src/mcp/tools/`: 29 tool implementations
- `backend/src/mcp/schemas/`: Zod validation schemas

**Architectural Highlights**:
- 10-second transaction timeout prevents deadlocks
- Atomic operations for consistency
- Tool call logging to mcp_tool_logs table
- ⚠️ Awaiting SDK v0.5.0 for production readiness

### Feature 015: Dashboard & In-Line Editing

**What It Does**: Provides customizable dashboard with drag-drop widgets and in-line table editing for all 13 categories.

**Why Designed This Way**:
- React-grid-layout for flexible canvas
- 132 editable fields with 6 input types
- Double-click to edit (discoverable UX)
- 500ms auto-save debounce

**Integration Points**:
- Dashboard configs per campaign
- Category landing pages with widgets
- View mode filtering applies to tables

**Key Components**:
- `frontend/src/components/DashboardPage.tsx`: Main dashboard
- `frontend/src/components/EditableCell.tsx`: In-line editing
- `frontend/src/components/WidgetRegistry.tsx`: 7 widget types
- Database: `dashboard_configs`, `category_landing_configs` tables

**Architectural Highlights**:
- Column resizing with drag handles
- Quick-add row (collapsed/expanded states)
- Bulk operations (select/delete/tag/visibility)
- Widget data aggregation from multiple sources

### Feature 018: External API for AI Tools

**What It Does**: Provides localhost-only API on port 3002 for conversational database operations via Claude Desktop.

**Why Designed This Way**:
- Separate port for isolation and audit clarity
- No authentication (localhost prototype only)
- Two-phase delete confirmation (safety)
- AI-friendly error responses

**Integration Points**:
- ExternalAPIService orchestrates all 13 categories
- Information filtering via X-View-Mode
- Dual audit logging (Winston + SQLite)

**Key Components**:
- `backend/src/services/ExternalAPIService.ts`: Service orchestration
- `backend/src/routes/external-api.ts`: 8 endpoint groups
- `backend/src/services/AuditLogService.ts`: Request logging

**Architectural Highlights**:
- <100ms query performance target
- Conversational operation support (create → update flow)
- Hierarchy navigation for locations/NPCs
- Session timeline queries with chronological ordering

## Orchestration & Integration

### Information Filtering Across Systems

The 4-level information system permeates the entire architecture:

```
User Toggle (⋮ menu) → ViewModeContext
    ↓
X-View-Mode Header on API Requests
    ↓
Middleware Extraction & Storage
    ↓
Service Layer Filtering:
- Wiki Cards: System 1 (dm/player values)
  - Cards filtered by information_level field
  - Entire subtrees hidden if parent is secret

- Category Databases: System 2 (dm_view/player_view values)
  - SQL WHERE clause: player_knowledge IN (...)
  - dm_* fields stripped from responses

- Knowledge Graphs: Toggle-based
  - Each graph independently toggled ON/OFF
  - Planning AI only queries enabled graphs

- External API: Header-based
  - Same filtering as main API
  - Audit logs capture view mode
```

### AI Context Engineering

The system constructs AI context from multiple sources:

```
Campaign Bible (Feature 010)
- World rules, themes, tone
- Character motivations
- Plot threads
    +
Knowledge Graphs (Feature 006)
- World-Foundations: Magic, pantheon, cosmology
- Political-Web: Active relationships
- Geographical: Spatial context
- Campaign-Story: Narrative threads
    +
Category Databases (Feature 014)
- Structured entity data
- Foreign key relationships
- Custom fields
    +
Wiki Cards (Feature 003)
- Narrative descriptions
- Rich text content
- Hierarchical organization
    ↓
Context Construction:
1. Planning AI assembles relevant pieces
2. Token budget management (graphs toggleable)
3. Cross-graph observations link contexts
4. Prompt engineering emphasizes consistency
    ↓
AI Response Generation
```

### Dual Data Models

The system intentionally maintains two complementary data models:

**Wiki Cards (Narrative Model)**
- Free-form content organization
- Rich text with embedded media
- Hierarchical nesting
- Best for: Lore, descriptions, session notes, worldbuilding

**Category Databases (Structured Model)**
- Standardized fields
- Foreign key relationships
- Queryable attributes
- Best for: NPCs, locations, items, game mechanics

**When to Use Which:**
- Creating a city? Location in database, lore in wiki card
- Designing an NPC? Stats in database, backstory in wiki
- Tracking a quest? Quest in database, narrative in session recaps

The models reference each other via entity links but remain independent, allowing GMs to use either or both as fits their workflow.

## Architectural Decision Records

### Why SQLite?

**Decision**: Use SQLite over PostgreSQL for data persistence

**Context**:
- Target users are individual GMs, not organizations
- Data sovereignty is a core principle
- Prototype needs rapid iteration

**Consequences**:
- ✅ Zero configuration required
- ✅ Entire campaign in single portable file
- ✅ Perfect for local-first architecture
- ✅ Excellent performance for single-user workload
- ❌ No concurrent write scaling (not needed)
- ❌ Limited to single machine (acceptable for prototype)

### Why Dual View Mode Systems? (HISTORICAL - NOW UNIFIED)

**Decision**: ~~Maintain separate view mode values for wiki (dm/player) vs databases (dm_view/player_view)~~

**Context**:
- Features developed iteratively
- Different UI patterns emerged
- Refactoring would break existing data

**Consequences**:
- ✅ Each system optimized for its use case
- ✅ Backward compatibility maintained
- ❌ Conceptual overhead for developers
- ❌ Two middleware chains to maintain

**Resolution** (commit d890ece): ✅ **UNIFIED**
- Values standardized to `dm_view` | `player_view` everywhere
- informationFilter.ts deleted, merged into viewMode.ts
- Single middleware chain now serves both wiki and database systems
- req.viewMode is canonical property (req.categoryViewMode for backward compat)
- 17 route files updated to use unified imports
- Architecture.md Refactoring Priority #1 complete

### Why No Junction Tables?

**Decision**: Use JSON arrays for many-to-many relationships instead of junction tables

**Context**:
- Prototype simplicity priority
- Most relationships have <100 items
- SQLite JSON1 extension available

**Consequences**:
- ✅ Simpler queries (no complex joins)
- ✅ Easier bulk operations
- ✅ Sufficient for current scale
- ❌ No relationship metadata (e.g., alliance strength)
- ❌ Less efficient for large datasets
- ❌ Harder to maintain referential integrity

**Future**: Migrate to junction tables when adding relationship metadata

### Why BaseCategoryService Abstraction?

**Decision**: Create abstract base class for all 13 category services

**Context**:
- 13 categories with similar CRUD patterns
- Code duplication exceeding 7,000 lines
- Need consistent API for Feature 018

**Consequences**:
- ✅ 60-70% code reduction
- ✅ Enforced consistency
- ✅ Easier to add new categories
- ✅ Single point for common logic
- ❌ Some categories need workarounds for unique fields
- ❌ Inheritance complexity

### Why Feature 018 External API on Separate Port?

**Decision**: Run external API on port 3002 separate from main API on 3001

**Context**:
- Different authentication models (none vs Keycloak)
- Need clear audit separation
- Potential future deployment differences

**Consequences**:
- ✅ Clean separation of concerns
- ✅ Independent scaling possible
- ✅ Clearer audit logs
- ✅ Easier to disable in production
- ❌ Additional service complexity
- ❌ Duplicate route definitions

### Click-to-Place vs Drag-Drop (Geographic Navigator)

**Decision**: Use click-to-place for positioning nodes on maps

**Context**:
- Drag-drop often imprecise with zoom/pan
- Users need exact positioning
- Undo/redo complexity

**Consequences**:
- ✅ Precise coordinate calculation
- ✅ Clear two-step workflow (select → click)
- ✅ No accidental moves
- ❌ Less discoverable UX
- ❌ Extra click required

### Granular Blocks vs Monolithic Documents (Wiki)

**Decision**: Store each paragraph/heading as separate block in wiki cards

**Context**:
- AI needs selective context
- Collaborative editing considered
- Version control requirements

**Consequences**:
- ✅ Granular AI context selection
- ✅ Better for future collaboration
- ✅ Efficient partial updates
- ✅ Block-level permissions possible
- ❌ More complex storage model
- ❌ Reconstruction overhead

## Code Organization Philosophy

### Service Layer Pattern

All business logic lives in service classes:
- **One service per domain**: CampaignService, CardService, etc.
- **Services are singletons**: Instantiated once, imported everywhere
- **No business logic in routes**: Routes only validate and delegate
- **Database access only in services**: Encapsulated SQL queries

### Frontend State Management

Context API chosen over Redux:
- **One context per concern**: Auth, ViewMode, InformationLevel
- **Contexts compose**: Components can use multiple contexts
- **Local state preferred**: Use useState for component-specific state
- **No prop drilling**: Contexts eliminate deep prop passing

### Route Organization

Backend routes organized by feature:
- **One file per feature**: campaigns.ts, cards.ts, npcs.ts
- **RESTful conventions**: GET/POST/PUT/DELETE with standard paths
- **Middleware composition**: Each route specifies its middleware chain
- **Consistent error format**: `{ error: string, details?: string }`

### Component Hierarchy

Frontend components follow containment pattern:
- **Pages**: Top-level route components
- **Components**: Reusable UI elements
- **Hooks**: Custom React hooks for logic
- **Services**: API client functions
- **Contexts**: Global state providers

## Maintenance Guide

### Known Technical Debt

1. **MCP SDK Version**: Currently on deprecated version, awaiting v0.5.0 stable release
2. **TypeScript Errors**: Shared types outside rootDir causing compilation warnings
3. **Test Coverage**: E2E tests incomplete for Features 016, 021
4. **Password Storage**: Campaign passwords stored plaintext (prototype only)
5. **Rate Limiting**: Not implemented for external API
6. **Caching Strategy**: No Redis/Memcached, relies on SQLite page cache

### Refactoring Priorities

1. **Unify View Mode Systems**: ~~Merge dm/player and dm_view/player_view~~ **✅ COMPLETE** (commit d890ece)
   - ✅ Values unified: `dm_view`/`player_view` everywhere (wiki and databases)
   - ✅ Frontend context uses unified values
   - ✅ Backend middleware simplified
   - ✅ Middleware chains merged: informationFilter.ts deleted, unified into viewMode.ts
   - ✅ Single source of truth: viewMode.ts handles both wiki and database filtering
   - ✅ 17 route files updated to use unified imports
   - ✅ hierarchy-navigator.ts refactored to use LocationService (no raw SQL)
   - ✅ Backward compatibility: Both req.viewMode and req.categoryViewMode set during transition
   - **Future cleanup**: Remove categoryViewMode property after verifying all routes use viewMode
2. **Extract Shared Types**: Move to proper shared package
3. **Add Junction Tables**: For relationship metadata
4. **Implement Caching Layer**: For frequently accessed data
5. **Add WebSocket Support**: For real-time collaboration prep

### Performance Considerations

**Current Bottlenecks**:
- Large knowledge graphs (>1000 nodes) slow Planning AI
- Geographic Navigator initial load with >100 locations
- Dashboard with >10 widgets requires optimization
- Session recap imports >10MB need streaming

**Optimization Opportunities**:
- Implement virtual scrolling for large tables
- Add database query result caching
- Lazy load dashboard widgets
- Stream large file processing
- Index additional query patterns

### Future Enhancements

**Planned Features**:
- Real-time collaboration for campaigns
- Mobile companion app for players
- Advanced map features (fog of war, measurement tools)
- Asset marketplace for content

**Architecture Evolution**:
- Microservices for AI workloads
- GraphQL for flexible queries
- WebRTC for voice/video
- Vector database for semantic search
- Edge deployment for multi-region

## Developer Onboarding

### Where to Start Reading

1. **CLAUDE.md**: High-level feature overview and recent changes
2. **docker-compose.yml**: Service architecture and dependencies
3. **backend/src/services/BaseCategoryService.ts**: Core abstraction pattern
4. **frontend/src/contexts/**: State management approach
5. **specs/*/spec.md**: Feature requirements and philosophy

### Key Patterns to Learn

1. **Service Pattern**: All business logic in services
2. **Context Pattern**: Global state via React Context
3. **Middleware Chains**: Request processing pipeline
4. **Universal Fields**: Shared across all categories
5. **Information Filtering**: Dual view mode systems
6. **Knowledge Graphs**: AI context optimization

### Common Pitfalls

1. **Don't skip BaseCategoryService**: Always extend for new categories
2. **Remember dual view modes**: Different values for different systems
3. **Check foreign keys**: ON DELETE behavior matters
4. **Parse JSON fields**: Tags and custom_fields need parsing
5. **Test both view modes**: Player view strips fields
6. **Toggle graphs appropriately**: Only enable needed context

### Debugging Tips

1. **Database issues**: Check `/data/wrldbldr-mcp-manager.db` with SQLite browser
2. **Auth problems**: Verify Keycloak is running on port 8080
3. **API errors**: Check both ports 3001 and 3002
4. **View mode issues**: Inspect X-View-Mode header
5. **Graph queries**: Verify graph toggles in Planning AI
6. **MCP tools**: Check stderr for debug output (stdout is for protocol)

## Constitutional Principles

The system adheres to these core principles:

1. **Workflow-First Design**: Campaign content IS the wiki - no duplicate work
2. **User Agency**: Complete data ownership via local SQLite file
3. **Information Filtering**: Selective revelation for player vs DM views
4. **Knowledge Graph Architecture**: AI context through curated distillation
5. **BYOLLM & Privacy**: User's own API keys, encrypted storage
6. **Local-Only & Prototype-First**: Docker simplicity over cloud complexity
7. **Transparency & User Approval**: No autonomous AI edits, explicit workflows

## System Performance Metrics

**Current Performance** (as of Feature 021):
- Single entity read: <100ms (target met)
- List 100 entities: <500ms (target met)
- Geographic Navigator: <100ms cached transitions
- Dashboard load: <500ms with 5 widgets
- AI streaming: <2s to first token
- Knowledge graph query: <200ms for 1000 nodes
- Wiki card tree: <150ms for 100 cards

**Resource Usage**:
- Backend memory: ~200MB baseline
- Frontend bundle: ~2.5MB gzipped
- SQLite database: ~10MB per 1000 entities
- Docker images: ~1.5GB total

## Conclusion

Wrldbldr MCP Manager represents a carefully orchestrated system that bridges the gap between campaign preparation and execution. Its dual data model (narrative wiki + structured databases), sophisticated information filtering, and AI context engineering create a unique solution to the Game Master's workflow problem.

The architecture prioritizes user agency and data ownership while maintaining flexibility for different GM styles. The local-first approach with SQLite and Docker ensures users maintain complete control over their creative content, while the MCP integration and external API enable powerful AI assistance without sacrificing privacy.

As a prototype, the system successfully demonstrates the viability of unified campaign management. The modular architecture, standardized patterns, and clear separation of concerns position it well for future evolution toward production readiness, whether as a local tool, SaaS platform, or hybrid deployment.

The key insight driving the architecture is that campaign management isn't just about storing information - it's about making that information actionable during planning and play. Every architectural decision, from granular wiki blocks to toggleable knowledge graphs, serves the mission of eliminating the "plan twice" (creating notes on something like google docs then having to retype the same information into database fields and etc. on one of these campaign management services. MCP quickly and intelligently adds your notes and retains exact wording when available.) problem and creates comprehensive AI context to create a living in-world assistant to one's unique campaign and setting.