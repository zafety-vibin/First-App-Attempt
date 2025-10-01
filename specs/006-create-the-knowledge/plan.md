
# Implementation Plan: Knowledge Graph Architecture

**Branch**: `006-create-the-knowledge` | **Date**: 2025-10-01 | **Spec**: [specs/006-create-the-knowledge/spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-create-the-knowledge/spec.md`

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

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Implement independent knowledge graph architecture with 4 graph types (World-Foundations, Political-Web, Geographical, Campaign-Story) and custom graph support. Graphs are entirely user-defined through Planning AI chat interface with toggle controls for AI context, 1-deep versioning, and cross-graph context via free-form observations. Includes Graph Summary Panel above Planning AI, Context Engineering help page, and optional canvas visualization.

## Technical Context
**Language/Version**: Node.js 20 LTS + TypeScript 5.0+ (backend), React 18 + TypeScript 5.0+ (frontend)
**Primary Dependencies**: Express 4.x, Better-SQLite3, React Router v6, Radix UI Dialog, Planning AI integration from Feature 005
**Storage**: SQLite3 with JSON1 extension for JSONB graph storage (nodes, edges, metadata)
**Testing**: Vitest + Supertest (backend), React Testing Library (frontend), Playwright (E2E)
**Target Platform**: Docker Compose localhost (3 services: Keycloak, backend, frontend)
**Project Type**: web (frontend + backend)
**Performance Goals**: < 100ms graph query/toggle, < 500ms graph save for typical graphs (50 nodes, 100 edges)
**Constraints**: Prototype-first (functionality over optimization), single-user local deployment
**Scale/Scope**: Support campaigns with 4+ graphs, 100+ nodes per graph, 200+ edges per graph

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Workflow-First Design ✓ PASS
Knowledge graphs eliminate "plan twice" problem by allowing AI-assisted graph construction from existing notes. Planning AI parses free-form text and builds structured graphs with user approval. No manual node-by-node entry required.

### II. User Agency & Full Customization ✓ PASS
Users have complete control:
- Create custom graph types with user-defined node/edge schemas
- Multiple instances of same graph type
- Toggle graphs on/off for AI queries (selective context)
- Manual CRUD operations for all graph elements
- User-defined maintenance rules (opt-in automation)

### III. Information Filtering & Access Control ✓ PASS
Graph nodes respect information level tagging from Feature 004. When graphs are used in AI queries or displayed in public view (Feature 010), nodes tagged as DM Secret are filtered out. Cross-references with existing filtering system.

### IV. Knowledge Graph Architecture ✓ PASS
This IS the knowledge graph architecture principle implementation. Provides all 4 documented graph types with World-Foundations default. All graphs optional via toggle controls. User-visible visualization and editing.

### V. BYOLLM & Privacy ✓ PASS
Graphs are queried/updated via Planning AI using user-provided LLM credentials (Feature 008 integration). No LLM calls without user API keys. All graph data stored locally in SQLite.

### VI. Local-Only & Prototype-First ✓ PASS
Single-user Docker Compose deployment. SQLite embedded database. Feature functionality prioritized over performance optimization. Acceptable load times for prototype phase.

### VII. Transparency & User Approval ✓ PASS
All AI-generated graph changes require explicit user approval. Import AI workflow (Feature 005) provides diff preview before saving. Planning AI immediate updates are scoped to user-approved conversations. 1-deep version backup enables undo.

**Initial Constitution Check**: PASS (all 7 principles satisfied)

## Project Structure

### Documentation (this feature)
```
specs/006-create-the-knowledge/
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
│   │   ├── KnowledgeGraph.ts
│   │   ├── GraphNode.ts
│   │   ├── GraphEdge.ts
│   │   ├── GraphVersion.ts
│   │   └── GraphMaintenanceRule.ts
│   ├── services/
│   │   ├── KnowledgeGraphService.ts
│   │   ├── GraphToggleService.ts
│   │   ├── GraphVersionService.ts
│   │   ├── GraphMaintenanceService.ts
│   │   └── CrossGraphQueryService.ts
│   ├── middleware/
│   │   └── graphFiltering.ts
│   ├── routes/
│   │   ├── graphs.ts
│   │   ├── graph-toggles.ts
│   │   └── graph-versions.ts
│   └── db/
│       └── schema.sql (extend with knowledge_graphs, graph_nodes, graph_edges, graph_versions tables)
└── tests/
    ├── contract/
    │   ├── graphs.test.ts
    │   ├── graph-toggles.test.ts
    │   └── graph-versions.test.ts
    ├── integration/
    │   ├── graphCreation.test.ts
    │   ├── crossGraphQuery.test.ts
    │   └── graphVersioning.test.ts
    └── unit/
        ├── KnowledgeGraphService.test.ts
        └── CrossGraphQueryService.test.ts

frontend/
├── src/
│   ├── components/
│   │   ├── GraphSummaryPanel.tsx
│   │   ├── GraphToggleControl.tsx
│   │   ├── ContextEngineeringHelp.tsx
│   │   ├── GraphCanvas.tsx (optional visualization)
│   │   ├── GraphNodeEditor.tsx
│   │   └── GraphVersionHistory.tsx
│   ├── pages/
│   │   ├── PlanningPage.tsx (extend with Graph Summary Panel)
│   │   └── ContextEngineeringPage.tsx
│   ├── services/
│   │   ├── knowledgeGraphService.ts
│   │   └── graphToggleService.ts
│   ├── hooks/
│   │   ├── useKnowledgeGraph.ts
│   │   ├── useGraphToggle.ts
│   │   └── useCrossGraphQuery.ts
│   └── contexts/
│       └── GraphContext.tsx
└── tests/
    ├── components/
    │   ├── GraphSummaryPanel.test.tsx
    │   └── ContextEngineeringHelp.test.tsx
    └── e2e/
        └── graphWorkflow.spec.ts
```

**Structure Decision**: Web application (Option 2). Feature extends existing backend/frontend structure established in Features 002-005. Graphs integrate with Planning AI workflow from Feature 005.

## Phase 0: Outline & Research

### Research Topics

1. **Graph Storage Patterns in SQLite**
   - Research adjacency list vs edge list vs materialized path for graph data
   - Investigate JSON1 extension capabilities for complex graph metadata
   - Evaluate indexing strategies for graph traversal queries
   - Determine if separate tables (nodes, edges) or JSONB blob approach

2. **Graph Versioning Strategies**
   - Research snapshot-based versioning (full graph copy)
   - Investigate delta-based versioning (store only changes)
   - Evaluate storage efficiency for 1-deep backup requirement
   - Determine restore workflow patterns

3. **Cross-Graph Query Patterns**
   - Research multi-graph join strategies
   - Investigate free-form observation parsing techniques
   - Evaluate fuzzy matching for cross-graph references
   - Determine context window strategies for LLM queries spanning multiple graphs

4. **Toggle State Persistence**
   - Research session-based toggle state (per-user session)
   - Investigate campaign-level toggle defaults
   - Evaluate per-query toggle override patterns
   - Determine simplest implementation for prototype

5. **Graph Visualization Libraries**
   - Research React-based graph visualization (react-force-graph, vis-network, cytoscape.js)
   - Evaluate canvas vs SVG rendering for 100+ node graphs
   - Investigate zoom/pan/filter UI patterns
   - Determine optional implementation approach (phase 2 vs phase 3)

6. **Planning AI Integration Points**
   - Research conversation-to-graph extraction patterns
   - Investigate LLM prompt strategies for node/edge generation
   - Evaluate structured output formats (JSON schema validation)
   - Determine approval workflow integration with existing Planning AI

7. **Maintenance Rule Automation**
   - Research time-based pruning strategies (archive old sessions)
   - Investigate graduated detail retention patterns
   - Evaluate user-defined rule DSL vs predefined templates
   - Determine opt-in automation safety patterns

**Output**: research.md with all decisions, rationales, and alternatives considered

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### Entities (from spec.md Key Entities section)

1. **Knowledge Graph**
   - Graph type (World-Foundations, Political-Web, Geographical, Campaign-Story, custom)
   - Graph name (unique per campaign)
   - Nodes collection (JSONB or separate table)
   - Edges collection (JSONB or separate table)
   - Creation timestamp
   - Last updated timestamp
   - Automatic maintenance rules (JSONB)
   - Toggle state (boolean)
   - Campaign reference (FK)
   - Current version reference
   - Backup version reference

2. **Graph Node**
   - Node ID (UUID)
   - Graph reference (FK)
   - Node type (user-defined: NPC, Location, Deity, Event, etc.)
   - Name
   - Attributes (JSONB free-form)
   - Observations (text for cross-graph context)
   - Information level (FK to information_levels from Feature 004)
   - Creation timestamp

3. **Graph Edge**
   - Edge ID (UUID)
   - Graph reference (FK)
   - Edge type/relationship label (user-defined)
   - Source node ID (FK)
   - Target node ID (FK)
   - Directionality (boolean: directed=true, undirected=false)
   - Metadata (JSONB optional)
   - Creation timestamp

4. **Graph Version**
   - Version ID (UUID)
   - Graph reference (FK)
   - Snapshot content (JSONB: full graph state)
   - Created timestamp
   - Version type (current | backup)

5. **Graph Summary Panel** (UI component, no DB entity)

6. **Context Engineering Help Page** (static content, no DB entity)

### API Contracts

Based on functional requirements, generate OpenAPI 3.0 specs for:

1. **graphs.yaml** - Knowledge graph CRUD
   - POST /api/campaigns/{campaignId}/graphs - Create graph (via Planning AI)
   - GET /api/campaigns/{campaignId}/graphs - List all graphs
   - GET /api/campaigns/{campaignId}/graphs/{graphId} - Get specific graph
   - PATCH /api/campaigns/{campaignId}/graphs/{graphId} - Update graph (nodes/edges)
   - DELETE /api/campaigns/{campaignId}/graphs/{graphId} - Delete graph

2. **graph-toggles.yaml** - Toggle control API
   - GET /api/campaigns/{campaignId}/graphs/toggles - Get all toggle states
   - PATCH /api/campaigns/{campaignId}/graphs/{graphId}/toggle - Toggle on/off

3. **graph-versions.yaml** - Versioning API
   - GET /api/campaigns/{campaignId}/graphs/{graphId}/versions - List versions (current + backup)
   - POST /api/campaigns/{campaignId}/graphs/{graphId}/versions/restore - Restore from backup

4. **graph-nodes.yaml** - Node CRUD (manual editing)
   - POST /api/campaigns/{campaignId}/graphs/{graphId}/nodes - Create node
   - PATCH /api/campaigns/{campaignId}/graphs/{graphId}/nodes/{nodeId} - Update node
   - DELETE /api/campaigns/{campaignId}/graphs/{graphId}/nodes/{nodeId} - Delete node

5. **graph-edges.yaml** - Edge CRUD (manual editing)
   - POST /api/campaigns/{campaignId}/graphs/{graphId}/edges - Create edge
   - PATCH /api/campaigns/{campaignId}/graphs/{graphId}/edges/{edgeId} - Update edge
   - DELETE /api/campaigns/{campaignId}/graphs/{graphId}/edges/{edgeId} - Delete edge

6. **cross-graph-query.yaml** - Multi-graph querying
   - POST /api/campaigns/{campaignId}/graphs/query - Query across multiple graphs with toggle filters

### Contract Tests

Generate failing tests for each endpoint in backend/tests/contract/:
- graphs.test.ts
- graph-toggles.test.ts
- graph-versions.test.ts
- graph-nodes.test.ts
- graph-edges.test.ts
- cross-graph-query.test.ts

### Integration Test Scenarios

Extract from user stories:
1. **Graph Creation Workflow**: GM opens Planning AI → requests new Political-Web graph → AI extracts nodes/edges from conversation → GM approves → graph created with World-Foundations as default
2. **Toggle Control**: GM views Graph Summary Panel → toggles off Geographical graph → Planning AI no longer references location data → GM re-enables → AI can query again
3. **Cross-Graph Context**: Political-Web NPC node has observation "current location: Waterdeep" → Planning AI query references both Political-Web and Geographical graphs → AI understands spatial context
4. **Version Restore**: GM updates Campaign-Story graph → realizes mistake → restores from backup version → graph returns to previous state
5. **Custom Graph Type**: GM creates custom "Magic System" graph → defines node types (Spell, School, Component) → Planning AI builds graph from conversation

### Quickstart Validation

Create quickstart.md with step-by-step validation of primary user story (spec.md lines 23-24):
- Step 1: Initialize campaign with default World-Foundations graph
- Step 2: Open Planning AI and request Political-Web graph creation
- Step 3: Verify Graph Summary Panel displays both graphs with toggle controls
- Step 4: Test cross-graph query (NPC location reference)
- Step 5: Toggle off World-Foundations, verify AI no longer uses it
- Step 6: Access Context Engineering help page
- Step 7: Create custom graph type
- Step 8: Update graph and restore from backup version
- Step 9: Test information level filtering (DM Secret nodes hidden in Player View)
- Step 10: Performance validation (graph query < 100ms, save < 500ms)

### Agent File Update

Run `.specify/scripts/bash/update-agent-context.sh claude` to incrementally update CLAUDE.md with:
- New technologies: Graph visualization library (TBD from research), graph storage patterns
- New entities: KnowledgeGraph, GraphNode, GraphEdge, GraphVersion
- New services: KnowledgeGraphService, CrossGraphQueryService
- Recent changes entry for Feature 006

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, updated CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P]
- Graph Summary Panel component → UI task
- Context Engineering help page → static content task
- Planning AI integration → service extension task
- Integration test scenarios → E2E task

**Ordering Strategy**:
- TDD order: Contract tests before implementation
- Dependency order: Models → Services → Routes → UI components
- Feature 005 Planning AI must be functional (prerequisite check)
- Mark [P] for parallel execution where independent

**Estimated Output**: 30-35 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | All principles satisfied | N/A |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A - no violations)

---
*Based on Constitution v1.1.0 - See `/.specify/memory/constitution.md`*
