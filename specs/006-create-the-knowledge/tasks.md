# Tasks: Knowledge Graph Architecture

**Feature**: 006-create-the-knowledge
**Input**: Design documents from `/specs/006-create-the-knowledge/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓
**Dependencies**: Feature 003 (Cards), Feature 004 (Information Filtering), Feature 005 (Planning AI integration)

## Task Summary
**Total Tasks**: 58
**Phases**: Database (4) → Types (3) → Tests (12) → Backend (16) → Frontend (15) → Integration (5) → Polish (3)

---

## Phase 3.1: Database Setup (4 tasks)
- [ ] **T001** Migration: KnowledgeGraph, GraphNode, GraphEdge, GraphVersion tables
- [ ] **T002** Migration: Seed 4 default graph types (World-Foundations, Political-Web, Geographical, Campaign-Story)
- [ ] **T003** Indexes for graph queries (graph_id, node_type, edge_type, version)
- [ ] **T004** JSON1 extension validation for JSONB graph storage

## Phase 3.2: Shared Types (3 tasks)
- [ ] **T005** [P] KnowledgeGraph, GraphNode, GraphEdge types
- [ ] **T006** [P] GraphVersion, GraphToggle types
- [ ] **T007** [P] CrossGraphQuery, GraphObservation types

## Phase 3.3: Tests First - TDD (12 tasks)
- [ ] **T008-T013** [P] Contract tests (6 contracts: graphs, nodes, edges, versions, toggles, cross-graph-query)
- [ ] **T014** [P] Unit test: Graph toggle for AI context
- [ ] **T015** [P] Unit test: 1-deep versioning logic
- [ ] **T016** [P] Unit test: Cross-graph observations
- [ ] **T017** [P] Integration test: Graph creation via Planning AI
- [ ] **T018** [P] Integration test: Information level filtering on nodes
- [ ] **T019** [P] Integration test: Graph version revert

## Phase 3.4: Backend Implementation (16 tasks)
### Models (4)
- [ ] **T020-T023** [P] KnowledgeGraph, GraphNode, GraphEdge, GraphVersion models

### Services (8)
- [ ] **T024** KnowledgeGraphService (CRUD for 4 graph types + custom)
- [ ] **T025** GraphNodeService (node CRUD, information level tagging)
- [ ] **T026** GraphEdgeService (edge CRUD, relationship management)
- [ ] **T027** GraphVersionService (1-deep versioning, revert logic)
- [ ] **T028** GraphToggleService (toggle graphs for AI context)
- [ ] **T029** CrossGraphQueryService (query multiple graphs, observation handling)
- [ ] **T030** GraphVisualizationService (generate D3/Cytoscape JSON)
- [ ] **T031** PlanningAI integration (extend Feature 005 to use graph toggles)

### Routes (4)
- [ ] **T032** Graph routes (GET, POST, PUT, DELETE /api/graphs)
- [ ] **T033** Node/Edge routes (CRUD /api/graphs/:id/nodes, /edges)
- [ ] **T034** Version routes (GET /versions, POST /revert)
- [ ] **T035** Cross-graph query routes (POST /api/graphs/query)

## Phase 3.5: Frontend Implementation (15 tasks)
### Core Components (6)
- [ ] **T036** GraphSummaryPanel (above Planning AI, shows active graphs)
- [ ] **T037** GraphToggleControls (checkboxes to enable/disable graphs for AI)
- [ ] **T038** GraphEditor (create/edit graph metadata, node/edge schemas)
- [ ] **T039** GraphNodeEditor (CRUD for nodes with information level selector)
- [ ] **T040** GraphEdgeEditor (CRUD for edges, relationship types)
- [ ] **T041** GraphVersionHistory (1-deep version, revert button)

### Visualization (3)
- [ ] **T042** GraphCanvasVisualization (optional D3.js/Cytoscape render)
- [ ] **T043** GraphNodePreview (hover preview for node details)
- [ ] **T044** CrossGraphObservationPanel (view/edit observations)

### Pages & API (6)
- [ ] **T045** GraphsPage (list all graphs, create new, toggle defaults)
- [ ] **T046** GraphDetailPage (view/edit specific graph)
- [ ] **T047** ContextEngineeringHelpPage (documentation for graph usage)
- [ ] **T048** [P] GraphService API client
- [ ] **T049** [P] GraphNodeService API client
- [ ] **T050** [P] CrossGraphQueryService API client

## Phase 3.6: Integration & Polish (8 tasks)
- [ ] **T051** Integrate graph toggles with Planning AI (Feature 005 extension)
- [ ] **T052** Integrate information level filtering with graph nodes
- [ ] **T053** Test cross-graph observations with Planning AI queries
- [ ] **T054** [P] Component test: GraphSummaryPanel, GraphToggleControls
- [ ] **T055** E2E test: Create graph via Planning AI → toggle → query
- [ ] **T056** E2E test: Revert graph version
- [ ] **T057** Validate quickstart.md
- [ ] **T058** Performance test: 100-node graph query <100ms

---

**Critical Path**: T001-T004 → T005-T007 → T008-T019 → T020-T035 → T036-T050 → T051-T058
**Dependencies**: Feature 005 (Planning AI) must be complete for graph update logic
