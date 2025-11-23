# Wrldbldr MCP Manager - Project Summary

## Application Overview

**Wrldbldr MCP Manager** is a local-first TTRPG campaign management web application that transforms AI assistants into living, in-world experts on your custom game setting. Built as a fully local prototype using Docker, it solves the "plan twice" problem that plagues Game Masters: maintaining campaign notes in documents and then tediously rewriting them into structured databases.

The application provides a VVD-style wiki combined with AI-powered bulk import, structured knowledge graphs, and intelligent information filtering—enabling GMs to rapidly transform their existing notes into a rich, queryable campaign database while maintaining complete control over player-visible vs. secret information.

**Core Technology Stack**:
- **Frontend**: React 18 + TypeScript, Vite, TipTap (rich text), Konva.js (interactive maps), React Grid Layout (dashboards)
- **Backend**: Node.js 20 + Express, Better-SQLite3 (WAL mode), BaseCategoryService pattern
- **Infrastructure**: Docker Compose, Keycloak (OAuth 2.0), MCP integration
- **AI Integration**: BYOLLM (user's own LLM credentials), OpenAI/Anthropic SDK, OAuth 2.0 + PKCE

---

## Philosophy: AI-Oriented Database Architecture

### The Living In-World Expert

Traditional campaign management tools treat AI as a generic assistant that can only regurgitate what you explicitly tell it. **Wrldbldr's philosophy is fundamentally different**: the database structure itself is designed to transform AI into a **living expert on your specific campaign world**.

### Core Architectural Principles

#### 1. **Context Engineering Through Knowledge Graphs**

Generic LLM queries produce generic fantasy responses. To make AI truly useful for campaign-specific content, it needs **structured contextual understanding** of your world:

- **Geographical Graph**: Spatial relationships, location hierarchies, nested containment (continent → region → city → tavern)
- **Political-Web Graph**: NPC/faction relationships, power dynamics, alliances, rivalries
- **World-Foundations Graph**: Core setting differentiators—magic systems, cosmology, fundamental world quirks that make YOUR world unique
- **Campaign-Story Graph**: Timeline, causality, narrative arcs—what happened when and why

These graphs aren't just visualization tools. They're **AI context providers** that enable the LLM to understand your world's structure before generating content. When you ask for a new NPC, the AI sees the political web and creates someone who fits existing power dynamics. When generating a location, it understands geographic constraints and parent-child relationships.

#### 2. **Information Filtering as First-Class Architecture**

The database implements **tiered information visibility** at the schema level:

- **System**: Mechanical rules, metadata (always visible to AI)
- **Common Knowledge**: Public world facts all players know
- **Player Knowledge**: Secrets players have discovered in-game
- **DM Secret**: Hidden information that must never leak to players

This isn't just access control—it's **scoped AI context**. When the Player Portal queries the AI, it receives only player-accessible tiers, ensuring the assistant never accidentally spoils your plot twists. When you're planning as GM, the AI sees everything.

**SQL-layer filtering** ensures security: `WHERE player_knowledge IN ('system', 'common-knowledge', 'player-knowledge')` excludes dm-secret content at the database level, making it architecturally impossible for player-facing features to leak secrets.

#### 3. **Workflow-First Data Capture**

The database schema prioritizes **rapid note ingestion** over rigid structure:

- **Custom fields**: Add any property without code changes (NPC sexuality, faction tax rates, location weather patterns)
- **Rich text JSONB storage**: Notes captured in full fidelity as ProseMirror JSON
- **AI-powered extraction**: Upload messy notes → AI extracts structured entities → You approve → Instant database population
- **Batch operations**: Bulk tag, bulk visibility changes, bulk graph relationship creation

The architecture assumes **GMs already have notes** and optimizes for transforming existing work into structured data, not forcing manual data entry.

#### 4. **BaseCategoryService Uniformity**

All 13 content categories (NPCs, Locations, Factions, Session Recaps, Quests, Player Characters, Lore Entries, World Rules, Planar Forces, Session Prep, Custom Mechanics, Items, Creatures) extend a **standardized BaseCategoryService**:

```typescript
interface BaseCategoryService {
  create(data, options?)
  update(id, data, options?)
  delete(id, options?)
  findById(id)
  list(filters, pagination, sort?, order?, options?)
}
```

**Why this matters for AI**: Uniform CRUD means AI tools (MCP integration, External API) can perform ANY operation on ANY entity type with the same interface. The AI doesn't need 13 different protocols—it learns ONE pattern and applies it universally.

**Batch fetching** eliminates N+1 queries (98% reduction), ensuring AI context builds in <100ms even with hundreds of entities. When the AI needs to understand your campaign, it queries efficiently.

#### 5. **MCP & External API Integration**

The database exposes two AI-oriented interfaces:

- **MCP Tools (Feature 011)**: 29 specialized tools for Claude Desktop integration—card operations, hierarchy management, graph manipulation, information level changes
- **External API (Feature 018)**: REST endpoints for AI agents to query/create/update/delete across all 13 categories with conversational error messages

Both interfaces **respect information filtering**, **validate relationships**, and provide **AI-friendly responses**. The database isn't just queryable by AI—it's **designed for AI collaboration**.

### How It Works in Practice

**Scenario**: You've written 10 pages of notes about the "Shadow Syndicate" faction in Google Docs.

**Traditional Workflow** (The Problem):
1. Manually create faction entry
2. Manually create 15 NPC entries for faction members
3. Manually create location entries for faction hideouts
4. Manually draw relationship graph
5. Manually tag secret information as DM-only
6. **Time**: 2-3 hours of tedious data entry

**Wrldbldr Workflow** (The Solution):
1. Upload your Google Doc to AI Import (Feature 005)
2. AI extracts: 1 faction, 15 NPCs, 4 locations, 27 graph relationships
3. Review AI suggestions in approval UI
4. Click "Approve All" or edit specific extractions
5. **Time**: 5-10 minutes

**The AI Now Knows**:
- Shadow Syndicate's structure, goals, and relationships (Political-Web graph)
- Which NPCs are publicly known vs. secret operatives (Information Filtering)
- Where the faction operates geographically (Geographical graph)
- How the faction fits into your world's crime dynamics (World-Foundations context)

**Future AI Queries**:
- "Generate a street thug who works for the Shadow Syndicate" → AI creates NPC with correct faction alignment, appropriate location, and respect for existing power structure
- "Create a quest where players infiltrate the Syndicate" → AI references known locations, public vs. secret NPCs, and timeline
- Player Portal query: "What do we know about criminal organizations?" → AI response includes ONLY common-knowledge Syndicate info, zero secrets

---

## Feature Status

### ✅ Completed Features (Ready for Testing)

#### **002 - Authentication & Campaign Management** (2025-09-15)
Keycloak OAuth 2.0 authentication, protected routes, campaign CRUD, session tracking. Users can create multiple campaigns with isolated data.

#### **003 - Notion-Style Wiki Cards** (2025-09-20)
Hierarchical card system with TipTap rich text editor, drag-and-drop reordering, database views (Table/List/Gallery/Kanban), slash command palette. The foundation for all campaign content.

#### **004 - Information Filtering** (2025-09-25)
4-tier visibility system (System, Common Knowledge, Player Knowledge, DM Secret), view mode toggle (Player View / DM View), SQL-layer filtering middleware. Core security architecture for player-facing features.

#### **006 - Knowledge Graphs** (2025-10-05)
4 graph types (Geographical, Political-Web, World-Foundations, Campaign-Story), interactive visualization, toggle-based active filtering, 1-deep versioning. Provides AI with contextual understanding of relationships.

#### **007 - Interactive Map Canvas** (2025-10-08)
Konva.js-based map editor, BLOB image storage (10MB limit), pins/zones/layers, nested location navigation, absolute pixel coordinates. Visual worldbuilding with 21-create-a-geographic integration.

#### **008 - BYOLLM Configuration** (2025-10-12)
OAuth 2.0 + PKCE flow, AES-256-GCM credential encryption, multi-provider support (OpenAI, Anthropic, Ollama, LM Studio), rate limiting. Users control their own AI costs and privacy—**now exclusive to Player Portal** (Feature 009).

#### **014 - Database Standardization (BaseCategoryService)** (2025-10-22)
Refactored all 13 category services to extend BaseCategoryService abstract class. Uniform CRUD interface, standardized viewMode filtering, batch fetching (98% N+1 query reduction). **-7,110 lines of code** removed. Enables Feature 018 External API and simplifies MCP integration.

#### **015 - Interactive Dashboard** (2025-10-14)
React-grid-layout 12-column canvas, 7 functional widgets (Recent Activity, Session Countdown, Quick Stats, etc.), 13 category landing pages, **in-line table editing** (132 editable fields across 6 types), double-click to edit, 500ms auto-save, column resizing, quick-add row, bulk operations. Performance: <500ms canvas load.

#### **016 - Campaign Setup Wizard** (2025-10-19)
4-step wizard with theme selection (High Fantasy, Cyberpunk, Sci-Fi, Modern, Custom), themed category naming (e.g., "Corporations" for Cyberpunk factions), questionnaire-driven World-Foundations graph initialization. Atomic transaction service prevents race conditions.

#### **018 - External API for AI Tools** (2025-10-22)
Express server on port 3002 for Claude Desktop integration. 8 endpoint groups: health check, database query/create/update/delete across 13 categories, hierarchy navigation, session recap timeline, knowledge graphs. Two-phase delete confirmation (60s token expiry), dual audit logging (Winston + SQLite, 30-day retention), information level filtering (X-View-Mode header). **49/49 contract tests passing**. ExternalAPIService orchestrates all 13 standardized category services. AI-friendly error responses (VALIDATION_ERROR, NOT_FOUND, CONSTRAINT_VIOLATION, INTERNAL_ERROR).

#### **021 - Geographic Navigator** (2025-10-28)
Spatial scale-based visualization (plane → world → continent → region → city → district). 3 display modes: Ellipse distribution (flat layout for unpinned), Map Mode (parent location maps with child pins), Grid View (side-by-side comparison). Click-to-place pin workflow, breadcrumb navigation, client-side caching (51 nodes loaded once), map caching (instant second visits). Performance: <100ms scale transitions, <1s initial load.

#### **009 - Player Question Portal** (2025-11-23) ⚠️ **NOT TESTED YET**
AI-powered Q&A portal for players. Public portal (NO auth) at `/portal/:campaignId`, GM management at `/campaigns/:campaignId/portal/management` (protected).

**Backend**: 5 services (PortalConfigService, PortalPlayerService, PortalAIService, PortalTokenTrackerService, PortalConversationService), 2 route files (management protected, public open), 5 database tables.

**Security**: Reuses Feature 004 viewMode system—ZERO dm-secret content accessible (security audit passed). SQL-layer filtering ensures player queries only see: system, common-knowledge, player-knowledge.

**BYOLLM Integration**: Feature 008 **EXCLUSIVE** to portal (GM's LLM credentials, OAuth 2.0 + PKCE, AES-256-GCM encryption).

**Features**: Password protection (bcrypt, 10 salt rounds), 5 response styles (friendly-sage, scholarly-tome, tavern-gossip, factual, custom), unique character names (UNIQUE constraint), crypto session tokens (64-char hex, HTTP-only cookies), numbered [1][2][3] citations linking to /cards/{cardId}, per-player token usage monitoring.

**Frontend**: 13 components (7 GM portal, 6 player portal), 2 API client services, sidebar navigation tab.

**Testing Status**:
- ✅ 9 unit tests (tokens, unique names, password, citations, tracking)
- ✅ 4 integration tests (password flow, token persistence, filtering, card links)
- ✅ 3 component tests (PortalSettings, PlayerIdentity, CitationLink)
- ✅ 4 E2E tests created (complete flow, password protection, information filtering, citation navigation)
- ⚠️ **E2E tests require Docker execution - NOT YET RUN**
- ✅ Security audit approved (SECURITY_AUDIT.md)

**Status**: Implementation complete (62/62 tasks), ready for localhost testing with Docker.

---

### ⚠️ In Progress

#### **011 - MCP Integration** (Blocked)
29 tools across 8 categories (card, hierarchy, graph, recap, info-level, database, map, category operations), 3 resources (campaign://cards, recaps, graphs), 2 prompts (import_workflow, planning_workflow), 3 middleware layers (permissions, transactions 10s timeout, logging).

**Status**: Implementation complete but **requires MCP SDK v0.5.0 refactoring**. The SDK API changed between when this was designed and now. Blocked pending API updates.

---

### 📋 Planned Features (Draft Specs)

#### **005 - AI Import Workflows** (Draft)
SSE streaming AI sessions, entity extraction from uploaded files (PDF/DOCX/TXT/MD), Levenshtein deduplication (threshold 0.7), batch approval UI, batch revert. Convert messy notes → structured entities.

#### **010 - Public Campaign View** (Draft)
Shareable campaign URL with information filtering (only Common Knowledge visible), read-only wiki access, optional password protection.

#### **019 - Wiki Portal** (Draft)
Enhanced wiki navigation, full-text search, backlinks, [[wiki-style]] linking, markdown support.

#### **020 - Card Clipboard Operations** (Draft)
Copy/paste cards between campaigns, bulk card operations, template cards.

---

## Complete Feature Timeline

| # | Feature | Status | Date | Key Capabilities |
|---|---------|--------|------|------------------|
| 002 | Authentication & Campaigns | ✅ Complete | 2025-09-15 | Keycloak OAuth 2.0, campaign isolation |
| 003 | Notion-Style Wiki | ✅ Complete | 2025-09-20 | TipTap editor, hierarchical cards, database views |
| 004 | Information Filtering | ✅ Complete | 2025-09-25 | 4-tier visibility, SQL-layer filtering |
| 005 | AI Import Workflows | 📋 Draft | - | Entity extraction, bulk import |
| 006 | Knowledge Graphs | ✅ Complete | 2025-10-05 | 4 graph types, AI context provider |
| 007 | Interactive Maps | ✅ Complete | 2025-10-08 | Konva.js canvas, pins/zones/layers |
| 008 | BYOLLM Config | ✅ Complete | 2025-10-12 | OAuth 2.0 + PKCE, encrypted credentials |
| 009 | Player Portal | ✅ Complete (Untested) | 2025-11-23 | AI Q&A, info filtering, citations, token tracking |
| 010 | Public Campaign View | 📋 Draft | - | Shareable URLs, read-only wiki |
| 011 | MCP Integration | ⚠️ Blocked | - | 29 tools, needs SDK v0.5.0 refactor |
| 014 | BaseCategoryService | ✅ Complete | 2025-10-22 | Standardized CRUD, -7,110 lines code |
| 015 | Dashboard Canvas | ✅ Complete | 2025-10-14 | Grid layout, 7 widgets, in-line editing |
| 016 | Campaign Wizard | ✅ Complete | 2025-10-19 | 4-step setup, themed categories |
| 018 | External API | ✅ Complete | 2025-10-22 | AI tool integration, 49/49 tests passing |
| 019 | Wiki Portal | 📋 Draft | - | Enhanced navigation, search, backlinks |
| 020 | Card Clipboard | 📋 Draft | - | Copy/paste, bulk ops, templates |
| 021 | Geographic Navigator | ✅ Complete | 2025-10-28 | Scale-based spatial visualization |

---

## Testing Status Summary

**Backend Tests**: 30+ contract tests, 15+ integration tests, unit test coverage for all services
**Frontend Tests**: Component tests (CardTree, DatabaseView, SlashCommandPalette, widgets), E2E tests (auth, hierarchy, CRUD, view mode, AI workflows)
**Feature 009 Specific**: 9 unit + 4 integration + 3 component + 4 E2E tests created, **requires Docker execution**
**Feature 018 Specific**: 49/49 contract tests passing (100% coverage)

---

## Important Notes

### ⚠️ Feature 009 Player Portal - Testing Required

While **Feature 009 implementation is complete** (62/62 tasks), it has **NOT been tested end-to-end** with Docker running:

- **Unit tests created** but not executed
- **Integration tests created** but not executed
- **E2E tests created** but not executed
- **Security audit passed** based on code review
- **Requires Docker startup** to verify:
  - Database migration 029 executes correctly
  - Portal routes respond as expected
  - BYOLLM integration works with real LLM credentials
  - Information filtering prevents dm-secret leaks in practice
  - Citation links navigate correctly
  - Session token persistence works across refreshes

**Recommendation**: Before considering Feature 009 production-ready, execute full test suite with `docker-compose up --build` and run:
```bash
npm test                              # Unit + integration tests
npm test:e2e                          # E2E tests (Playwright)
npm test tests/contract/portal*.test.ts  # Contract validation
```

### 🔒 Security Architecture

The entire system is built on **information filtering as core security**. Player-facing features (Public Campaign View, Player Portal, future player wikis) all rely on SQL-layer filtering:

```sql
WHERE player_knowledge IN ('system', 'common-knowledge', 'player-knowledge')
```

This ensures **dm-secret content is architecturally impossible to leak**. All AI queries from player-facing features receive ONLY filtered context.

### 🏠 Local-First Philosophy

This is a **localhost prototype**, not a production SaaS:
- Single-user architecture (no multi-tenancy)
- SQLite database (data/ directory, persists with bind mount)
- Docker Compose orchestration (keycloak, backend, frontend)
- All AI credentials user-provided (BYOLLM)
- No cloud dependencies, no authentication beyond Keycloak login

---

## Quick Start

```bash
# Start all services (first time builds images)
docker-compose up --build

# IMPORTANT: After rebuilding backend, install sharp with platform binaries
docker exec wrldbldr-backend npm install --include=optional sharp
docker-compose restart backend

# Access application
# Frontend: http://localhost:3000
# External API: http://localhost:3002
# Keycloak: http://localhost:8080
```

**First-time setup**:
1. Login → Register new user
2. Create campaign (wizard guides you through setup)
3. Configure BYOLLM (Settings → BYOLLM) if using AI features
4. Start creating cards, building graphs, importing notes

**Test Player Portal** (Feature 009):
1. Navigate to `/campaigns/:campaignId/portal/management`
2. Click "Enable Portal"
3. Optionally set password and response style
4. Open `/portal/:campaignId` in incognito window
5. Enter character name → Ask questions → Verify AI responses

---

## Constitutional Principles (Governance)

1. **Workflow-First Design**: No "plan twice" - campaign content IS the wiki
2. **User Agency**: User owns all data locally in SQLite file
3. **Information Filtering**: 4-tier system is first-class architecture
4. **Knowledge Graph Architecture**: AI context provider, not just visualization
5. **BYOLLM & Privacy**: User's own LLM credentials only, local storage
6. **Local-Only & Prototype-First**: Feature functionality > optimization
7. **Transparency & User Approval**: AI assists, never acts autonomously

See `.specify/memory/constitution.md` for full governance document (v1.1.0).

---

## Project Vision

**Current State**: Functional prototype with 11 complete features, 1 untested feature, 4 draft features, 1 blocked feature.

**Near-Term Goals**:
1. Execute Feature 009 E2E tests with Docker
2. Resolve Feature 011 MCP SDK v0.5.0 blocking issue
3. Implement Feature 005 AI Import (highest workflow value)
4. Complete Feature 019 Wiki Portal (enhanced navigation)

**Long-Term Vision**:
Transform campaign management from "tedious data entry" to "AI-assisted knowledge base curation." Game Masters upload their existing notes, AI extracts structure, GMs approve and refine, and the database becomes a living expert on their unique world—ready to answer player questions, generate in-world content, and maintain narrative continuity without spoiling secrets.

---

**Version**: 1.0.0
**Last Updated**: 2025-11-23
**Repository**: localhost prototype (private)
**License**: Not yet determined
**Contact**: [Project maintainer information]
