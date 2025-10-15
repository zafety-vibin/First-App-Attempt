# Tasks: Knowledge Graph Architecture

**Feature**: 006-create-the-knowledge
**Input**: Design documents from `/specs/006-create-the-knowledge/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓
**Dependencies**: Feature 003 (Cards), Feature 004 (Information Filtering), Feature 005 (Planning AI integration)

## Task Summary
**Total Tasks**: 79 (includes 21 confidence decay tasks)
**Phases**: Database (6) → Types (5) → Tests (20) → Backend (21) → Frontend (17) → Integration (10)

---

## Phase 3.1: Database Setup (6 tasks)
- [ ] **T001** Migration: KnowledgeGraph, GraphNode, GraphEdge, GraphVersion tables
- [ ] **T002** Migration: Add confidence decay fields (GraphNode.last_accessed, GraphNode.pinned, KnowledgeGraph.decay_rate)
- [ ] **T003** Migration: Seed 4 default graph types with decay rates (World-Foundations=0.0, Political-Web=0.1, Geographical=0.05, Campaign-Story=0.2)
- [ ] **T004** Migration: Update observations to JSONB array format [{text, created_at, last_accessed}]
- [ ] **T005** Indexes for graph queries (graph_id, node_type, edge_type, version, last_accessed, pinned)
- [ ] **T006** JSON1 extension validation for JSONB graph storage

## Phase 3.2: Shared Types (5 tasks)
- [ ] **T007** [P] KnowledgeGraph, GraphNode, GraphEdge types (with confidence decay fields)
- [ ] **T008** [P] GraphVersion, GraphToggle types
- [ ] **T009** [P] CrossGraphQuery, GraphObservation types
- [ ] **T010** [P] ConfidenceDecayConfig type (decay_rate, reinforcement, pinning)
- [ ] **T011** [P] StaleEntityWarning, ConfidenceBadge UI types

## Phase 3.3: Tests First - TDD (20 tasks)
- [ ] **T012-T017** [P] Contract tests (6 contracts: graphs, nodes, edges, versions, toggles, cross-graph-query)
- [ ] **T018** [P] Contract test: confidence-decay.json (decay formula, reinforcement, pinning)
- [ ] **T019** [P] Contract test: graph-tools.json (13 MCP tools)
- [ ] **T020** [P] Unit test: ConfidenceDecayService.calculateConfidence()
- [ ] **T021** [P] Unit test: ConfidenceDecayService.reinforceEntity()
- [ ] **T022** [P] Unit test: ConfidenceDecayService.pinEntity()
- [ ] **T023** [P] Unit test: Graph toggle for AI context
- [ ] **T024** [P] Unit test: 1-deep versioning logic
- [ ] **T025** [P] Unit test: Cross-graph observations
- [ ] **T026** [P] Integration test: Confidence decay over time (0 weeks, 5 weeks, 10 weeks)
- [ ] **T027** [P] Integration test: Reinforcement resets confidence to 1.0
- [ ] **T028** [P] Integration test: Pinned entities maintain confidence 1.0
- [ ] **T029** [P] Integration test: Graph creation via Planning AI
- [ ] **T030** [P] Integration test: Information level filtering on nodes
- [ ] **T031** [P] Integration test: Graph version revert

## Phase 3.4: Backend Implementation (21 tasks)
### Models (4)
- [ ] **T032-T035** [P] KnowledgeGraph, GraphNode, GraphEdge, GraphVersion models (with confidence decay fields)

### Services (12)
- [ ] **T036** KnowledgeGraphService (CRUD for 4 graph types + custom, decay_rate management)
- [ ] **T037** GraphNodeService (node CRUD, information level tagging, last_accessed updates)
- [ ] **T038** GraphEdgeService (edge CRUD, relationship management)
- [ ] **T039** GraphVersionService (1-deep versioning, revert logic)
- [ ] **T040** GraphToggleService (toggle graphs for AI context)
- [ ] **T041** CrossGraphQueryService (query multiple graphs, observation handling)
- [ ] **T042** GraphVisualizationService (generate D3/Cytoscape JSON)
- [ ] **T043** ConfidenceDecayService (calculateConfidence, reinforceEntity, pinEntity, findStaleEntities)
- [ ] **T044** Update GraphNodeService to auto-reinforce on read operations
- [ ] **T045** Update search_entities to support confidence filtering (<0.4, 0.4-0.7, >0.7)
- [ ] **T046** PlanningAI integration (extend Feature 005 to use graph toggles and confidence filtering)
- [ ] **T047** MCP tools: pin_entity, reinforce_entity, find_stale_entities, calculate_confidence (Feature 011 extension)

### Routes (5)
- [ ] **T048** Graph routes (GET, POST, PUT, DELETE /api/graphs)
- [ ] **T049** Node/Edge routes (CRUD /api/graphs/:id/nodes, /edges, with confidence in responses)
- [ ] **T050** Version routes (GET /versions, POST /revert)
- [ ] **T051** Cross-graph query routes (POST /api/graphs/query)
- [ ] **T052** Confidence routes (POST /api/graphs/:id/nodes/:nodeId/pin, POST /reinforce, GET /stale)

## Phase 3.5: Frontend Implementation (17 tasks)
### Core Components (8)
- [ ] **T053** GraphSummaryPanel (above Planning AI, shows active graphs)
- [ ] **T054** GraphToggleControls (checkboxes to enable/disable graphs for AI)
- [ ] **T055** GraphEditor (create/edit graph metadata, node/edge schemas, decay_rate config)
- [ ] **T056** GraphNodeEditor (CRUD for nodes with information level selector, confidence badge)
- [ ] **T057** GraphEdgeEditor (CRUD for edges, relationship types)
- [ ] **T058** GraphVersionHistory (1-deep version, revert button)
- [ ] **T059** ConfidenceBadge component (color-coded: green >0.7, yellow 0.4-0.7, red <0.4)
- [ ] **T060** NodePinningControls (pin/unpin button, reinforcement button)

### Visualization (3)
- [ ] **T061** GraphCanvasVisualization (optional D3.js/Cytoscape render with confidence coloring)
- [ ] **T062** GraphNodePreview (hover preview for node details with confidence and last_accessed)
- [ ] **T063** CrossGraphObservationPanel (view/edit observations)

### Pages & API (6)
- [ ] **T064** GraphsPage (list all graphs, create new, toggle defaults, stale entity warnings)
- [ ] **T065** GraphDetailPage (view/edit specific graph with confidence filtering)
- [ ] **T066** ContextEngineeringHelpPage (documentation for graph usage and confidence decay)
- [ ] **T067** [P] GraphService API client (with confidence endpoints)
- [ ] **T068** [P] GraphNodeService API client (with pin/reinforce operations)
- [ ] **T069** [P] CrossGraphQueryService API client

## Phase 3.6: Integration & Polish (10 tasks)
- [ ] **T070** Integrate graph toggles with Planning AI (Feature 005 extension)
- [ ] **T071** Integrate information level filtering with graph nodes
- [ ] **T072** Test cross-graph observations with Planning AI queries
- [ ] **T073** [P] Component test: GraphSummaryPanel, GraphToggleControls, ConfidenceBadge
- [ ] **T074** E2E test: Create graph via Planning AI → toggle → query
- [ ] **T075** E2E test: Confidence decay workflow (create node → wait → check decay → pin → reinforce)
- [ ] **T076** E2E test: Revert graph version
- [ ] **T077** E2E test: Stale entity detection and warning display
- [ ] **T078** Validate quickstart.md with confidence decay examples
- [ ] **T079** Performance test: 100-node graph query with confidence calculation <100ms

---

**Critical Path**: T001-T006 → T007-T011 → T012-T031 → T032-T052 → T053-T069 → T070-T079
**Dependencies**: Feature 005 (Planning AI) must be complete for graph update logic, Feature 011 (MCP) for tool extensions
