# Feature 006: Knowledge Graphs - Implementation Guide

**Last Updated**: 2025-10-14
**Status**: Phase 3.5 - Frontend Implementation In Progress

---

## Table of Contents

1. [Overview](#overview)
2. [Design Decisions](#design-decisions)
3. [Confidence System](#confidence-system)
4. [Visualization Specifications](#visualization-specifications)
5. [Navigation & Routing](#navigation--routing)
6. [API Integration](#api-integration)
7. [Implementation Status](#implementation-status)

---

## Overview

Knowledge Graphs provide modular, graph-based memory systems for campaign management. Each graph type has unique visualization and confidence semantics.

### Four Graph Types

1. **Geographic Memory** - Location hierarchies (tree view)
2. **Political-Web Memory** - Faction/NPC relationships (network graph)
3. **Campaign-Story Memory** - Session timeline (sequential chain)
4. **World-Foundations Memory** - Immutable rules (table view)

---

## Design Decisions

### Key User Requirements

From conversation with user on 2025-10-14:

#### 1. No Planning AI Integration (for now)
- Original spec included Planning AI for graph creation
- **Changed**: Manual creation via forms and API calls only
- MCP tools will be added later to enable AI-assisted graph population
- GraphSummaryPanel is a dashboard widget, not in Planning AI tab

#### 2. Navigation Placement
- **Brain icon (🧠) button BETWEEN Dashboard and Wiki buttons**
- Takes user to `/campaigns/:id/graphs` (main list page)
- Should feel like a separate "mind space" with dream/mind theme
- Uses purple/violet gradients for "brain" aesthetic

#### 3. Confidence System Refinement
- **NOT based on real-world time** - uses in-game time from session_recaps
- Each graph type has **different confidence semantics**
- Users should see **BOTH** color badges (🟢🟡🔴) AND numeric scores (0.85)
- **No automatic stale warnings** - just counts of each confidence level
- Click count to see list of nodes at that level

#### 4. Dashboard Widget
- Shows graph overview with node counts
- Displays confidence distribution as **counts** (not percentages)
  - Format: "🟢 8 | 🟡 3 | 🔴 2"
- Widget is called "Knowledge Graphs Overview" (NOT "health")
- Links to main graphs page

#### 5. Cross-Graph References
- **No dedicated CrossGraphObservationPanel**
- Use text observations + AI intelligence to link across graphs
- Example: Political-Web node says "Lives in Waterdeep" → AI searches Geographic graph
- Keep graphs separate to avoid cross-pollution

#### 6. Default Toggle State
- New graphs start **toggled OFF** (no nodes yet)
- User toggles ON when ready to expose to AI

---

## Confidence System

### Confidence Formula

**Base calculation** (in-game time):
```
confidence = 1.0 * (1 - decay_rate * in_game_weeks_elapsed)
```

Where `in_game_weeks_elapsed` is calculated from `session_recaps.time_passed` aggregated across sessions.

### Graph-Specific Semantics

#### Political-Web Memory
- **Confidence = Relationship strength or conflict intensity**
- 1.0 = Sworn allies or sworn enemies (strongest relationships)
- 0.5 = Casual acquaintances or minor rivals
- 0.0 = Distant/irrelevant connections
- **Decay rate**: 0.1 (moderate decay)
- **User can manually set** to indicate relationship importance

#### Geographic Memory
- **Confidence = "Will this location be used again?"**
- 1.0 = Core location, will definitely reuse
- 0.5 = Might revisit
- 0.0 = One-time use, probably won't return
- **Decay rate**: 0.05 (slow decay - locations persist)
- **Manual management** to mark reusable vs one-time locations

#### Campaign-Story Memory
- **Confidence = Time since event (in-game time)**
- Decays with in-game time from session_recaps
- 1.0 = Recent events (current session)
- 0.5 = Few sessions ago
- 0.0 = Long ago events
- **Decay rate**: 0.2 (fast decay)
- Helps AI understand if old decisions are still relevant

#### World-Foundations Memory
- **NO confidence or decay**
- Immutable truths don't degrade
- Everything is always 1.0 confidence
- **Decay rate**: 0.0 (never decays)

### In-Game Time Tracking

Uses `session_recaps` table from Feature 014:
- `time_passed` (TEXT) - Delta between sessions
- `in_game_date_start` (TEXT)
- `in_game_date_end` (TEXT)

Backend calculates decay based on sum of `time_passed` values since node's `last_accessed`.

### Hybrid Approach (Option 3 from discussion)

- `last_accessed` = "last time GM viewed/edited this node" (real-world)
- `last_mentioned_session_id` = track in-game relevance
- **Confidence formula considers both**:
  - Real-time: For GM attention tracking
  - In-game time: For narrative relevance

---

## Visualization Specifications

### 1. Geographic Memory - Hierarchical Tree

**Visual Style**: Expanding tree with zoom controls

**Hierarchy Levels**:
```
Plane/World
  └─ Continent
      └─ Region
          └─ Settlement
              └─ Building/POI
```

**Node Creation UX**:
- Click "+ Add Root Location" for top-level nodes
- Each node has inline "+ Add" button
- Creates child node connected to correct parent automatically
- Opens inline text input for quick naming

**Features**:
- Expand/collapse chevrons (▶/▼)
- Zoom in/out (50% to 200%)
- Click node name to view details
- Details panel shows: type, parent, children count, confidence
- Color: Green/earth tones (#4ade80)

**Implementation**: `frontend/src/pages/GeographicGraphPage.tsx`

### 2. Political-Web Memory - Interactive Network

**Visual Style**: Force-directed graph (nodes and edges)

**Node Types**: NPCs, Factions, Organizations

**Edge Types**:
- Allies (green, solid line)
- Enemies (red, solid line)
- Serves (blue, dashed line with arrow)
- Neutral (gray, thin line)
- Custom (user-defined color and style)

**Node Creation UX**:
1. Click "+ Add Entity" button
2. Drag new node onto canvas
3. Drop where you want it positioned
4. Form appears to fill in:
   - Name
   - Type (NPC/Faction/etc.)
   - Observations
5. Complete form → node appears

**Relationship Creation**:
1. Click "Create Relationship" button
2. Click first node (source)
3. Drag to second node (target)
4. Form appears:
   - Relationship name (free text)
   - Relationship type (ally/enemy/serves/custom)
   - Directed vs undirected
   - Metadata
5. Complete → edge appears

**Features**:
- **Focus mode**: Click node once → fade out unconnected nodes
- Click off node or click again → restore all nodes
- Color-coded edges by relationship type
- Dashed lines for weak connections
- Solid lines for strong connections
- Confidence badge on each node
- Example: "Enemy type relationship" but named "X serves Y unwillingly"

**Implementation**: `frontend/src/pages/PoliticalWebPage.tsx` (TO DO)

### 3. Campaign-Story Memory - Sequential Timeline

**Visual Style**: Horizontal chain of session recaps

**Node Display**:
- Each session recap is a node in sequence
- Hover over node → read recap text
- Nodes connected sequentially (Session 1 → Session 2 → Session 3)

**Story Arc Nodes**:
- User can **manually** create "Story Arc" summary nodes
- Select 5-10 old sessions to group
- Arc node shows key events from those sessions
- User writes arc summary (AI can suggest but user decides)
- Older sessions can be "archived" under arc

**Node Creation**:
- **Automatic**: New session recap creates new node in chain
- **Manual**: User creates Story Arc by selecting session range
- **BE CAREFUL**: Observations should capture specific key events, not entire recap text

**Features**:
- Scroll timeline horizontally
- Zoom in/out to see more/fewer sessions
- Click session to expand full recap
- Story arcs visually distinct (larger, golden border)
- Confidence indicates time since session (in-game)

**Implementation**: `frontend/src/pages/CampaignStoryPage.tsx` (TO DO)

### 4. World-Foundations Memory - Simple Table

**Visual Style**: Searchable table of rules

**Columns**:
- Rule Name
- Category (homebrew, house rule, world law, etc.)
- Description
- Tags

**Features**:
- Search/filter by category or tags
- Add rule via form modal
- Edit/delete inline
- No confidence (always 1.0)
- No decay

**Implementation**: `frontend/src/pages/WorldFoundationsPage.tsx` (TO DO)

---

## Navigation & Routing

### URL Structure (Option B from discussion)

Separate routes per graph type:

```
/campaigns/:id/graphs                    → Main list page (GraphsListPage)
/campaigns/:id/graphs/geographic         → Geographic tree view
/campaigns/:id/graphs/political          → Political network view
/campaigns/:id/graphs/story              → Campaign story timeline
/campaigns/:id/graphs/foundations        → World foundations table
```

### Navigation Button Placement (Option B)

Horizontal button row at top:

```
[Dashboard] [🧠 Knowledge Graphs] [Wiki]
```

Alternative: Sidebar with thick separator line:
```
CAMPAIGN
  Dashboard
  Wiki
──────────────────  ← thick line
KNOWLEDGE
  🧠 Graphs
```

### Theme

**Mind/Dream aesthetic**:
- Purple/violet gradients: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Glassmorphism effects
- "Modular brains you plug into AI" concept
- Floating, ethereal feel

---

## API Integration

### Endpoints Used

**Graph CRUD**:
- `GET /api/campaigns/:campaignId/graphs` - List all graphs
- `POST /api/campaigns/:campaignId/graphs` - Create graph
- `GET /api/campaigns/:campaignId/graphs/:graphId` - Get graph with nodes
- `PATCH /api/campaigns/:campaignId/graphs/:graphId` - Update graph
- `DELETE /api/campaigns/:campaignId/graphs/:graphId` - Delete graph

**Node CRUD**:
- `GET /api/campaigns/:campaignId/graphs/:graphId/nodes` - List nodes
- `POST /api/campaigns/:campaignId/graphs/:graphId/nodes` - Create node
- `GET /api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId` - Get node (auto-reinforce)
- `PATCH /api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId` - Update node
- `DELETE /api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId` - Delete node

**Edge CRUD**:
- `GET /api/campaigns/:campaignId/graphs/:graphId/edges` - List edges
- `POST /api/campaigns/:campaignId/graphs/:graphId/edges` - Create edge
- `DELETE /api/campaigns/:campaignId/graphs/:graphId/edges/:edgeId` - Delete edge

**Toggles**:
- `POST /api/campaigns/:campaignId/graphs/:graphId/toggle` - Toggle on/off
- `GET /api/campaigns/:campaignId/graphs/active` - Get active graphs

**Confidence**:
- `POST /api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId/pin` - Pin entity
- `POST /api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId/unpin` - Unpin
- `POST /api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId/reinforce` - Reinforce
- `GET /api/campaigns/:campaignId/graphs/:graphId/stale` - Find stale entities

### Services

**Frontend**:
- `graphService.ts` - Graph-level operations
- `graphNodeService.ts` - Node and edge operations

**Backend**:
- `KnowledgeGraphService.ts` - Graph CRUD
- `GraphNodeService.ts` - Node CRUD with auto-reinforce
- `GraphEdgeService.ts` - Edge CRUD
- `GraphVersionService.ts` - 1-deep versioning
- `GraphToggleService.ts` - Toggle controls
- `ConfidenceDecayService.ts` - Confidence calculations

---

## Implementation Status

### ✅ Completed (Phase 3.1-3.4)

- [x] Database migration (4 tables: knowledge_graphs, graph_nodes, graph_edges, graph_versions)
- [x] TypeScript type definitions (KnowledgeGraph, GraphNode, GraphEdge, etc.)
- [x] Contract tests (8 files, 316 test cases)
- [x] Unit tests (4 files, 93 test cases)
- [x] Integration tests (4 files, 48 test cases)
- [x] Backend services (7 services)
- [x] Backend routes (7 route files, 26 endpoints)
- [x] API clients (graphService, graphNodeService)
- [x] Main navigation (brain icon button)
- [x] Routing for all 4 graph types
- [x] GraphsListPage (overview page)
- [x] Dashboard widget (KnowledgeGraphsWidget)

### ✅ In Progress (Phase 3.5)

- [x] **Phase 3.5.1**: Core Infrastructure
- [x] **Phase 3.5.2**: Dashboard Widget
- [x] **Phase 3.5.3**: Geographic Memory (Tree visualization) ← CURRENT
- [ ] **Phase 3.5.4**: Political-Web Memory (Network visualization)
- [ ] **Phase 3.5.5**: Campaign-Story Memory (Timeline visualization)
- [ ] **Phase 3.5.6**: World-Foundations Memory (Table view)
- [ ] **Phase 3.5.7**: Shared Components (ConfidenceBadge ✅, NodePinningControls)

### 📝 Pending (Phase 3.6)

- [ ] Integrate with Feature 005 (if Planning AI is re-added)
- [ ] E2E tests with Playwright
- [ ] Performance testing (100+ nodes per graph)
- [ ] Quickstart documentation validation
- [ ] MCP tool integration (for AI-assisted population)

---

## Component Architecture

### Shared Components

**ConfidenceBadge** ✅
- Location: `frontend/src/components/common/ConfidenceBadge.tsx`
- Props: `{ confidence: number, showValue?: boolean }`
- Displays: 🟢🟡🔴 with optional percentage
- Three sizes: sm, md, lg

**NodePinningControls** (TO DO)
- Pin/unpin button (📌)
- Reinforce button (⚡)
- Show last_accessed timestamp

**GraphNodeEditor** (TO DO)
- Form for creating/editing nodes
- Different fields per graph type
- Inline validation

**GraphEdgeEditor** (TO DO)
- Form for creating relationships
- Source/target node selectors
- Relationship type dropdown
- Metadata fields

### Page Components

1. **GraphsListPage** ✅
   - Grid of graph cards
   - Node/edge counts
   - Confidence distribution
   - Toggle controls
   - Navigate to detail pages

2. **GeographicGraphPage** ✅
   - Tree visualization
   - Expand/collapse
   - Zoom controls
   - Inline node creation
   - Details panel

3. **PoliticalWebPage** (TO DO)
   - Force-directed graph
   - Drag nodes
   - Create relationships
   - Focus mode
   - Legend

4. **CampaignStoryPage** (TO DO)
   - Timeline visualization
   - Session recap nodes
   - Story arc nodes
   - Hover to read
   - Scroll/zoom

5. **WorldFoundationsPage** (TO DO)
   - Table with search/filter
   - Add/edit/delete rules
   - Category grouping
   - No confidence display

---

## Styling Conventions

### Color Palette

**Graph Types**:
- Geographic: Green/earth tones (#4ade80, #22c55e)
- Political: Purple/red tones (#a855f7, #ef4444)
- Story: Blue/timeline tones (#3b82f6, #60a5fa)
- Foundations: Gold/scholarly tones (#f59e0b, #eab308)

**Confidence Levels**:
- High (≥0.7): Green #4ade80
- Medium (0.4-0.7): Yellow #fbbf24
- Low (<0.4): Red #f87171
- Pinned: Gold #f59e0b

**Mind Theme**:
- Primary gradient: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Background overlay: `rgba(255, 255, 255, 0.05)`
- Border: `rgba(255, 255, 255, 0.1)`
- Backdrop filter: `blur(10px)`

### Component Classes

```css
.brain-theme-bg { /* Purple gradient background */ }
.graph-card { /* Glassmorphism card */ }
.confidence-badge { /* Color-coded badge */ }
.tree-node { /* Hierarchical tree item */ }
.node-row { /* Horizontal node display */ }
.force-graph { /* Canvas for network */ }
.timeline-node { /* Session recap in timeline */ }
```

---

## Testing Checklist

### Geographic Memory
- [ ] Navigate to geographic page
- [ ] Add root location
- [ ] Add child locations
- [ ] Expand/collapse nodes
- [ ] Zoom in/out
- [ ] Edit location name
- [ ] Delete location (with children warning)
- [ ] Pin/unpin location
- [ ] View details panel
- [ ] Verify confidence badge colors

### Political-Web Memory
- [ ] Add entities (NPCs, factions)
- [ ] Drag nodes to position
- [ ] Create relationships
- [ ] Test focus mode (click to fade others)
- [ ] Edit relationship metadata
- [ ] Delete relationships
- [ ] Verify edge colors match types

### Campaign-Story Memory
- [ ] View session recap timeline
- [ ] Hover to read recap
- [ ] Create story arc
- [ ] Select sessions for arc
- [ ] Verify arc summary
- [ ] Scroll timeline
- [ ] Zoom timeline

### World-Foundations Memory
- [ ] Add rule
- [ ] Edit rule inline
- [ ] Delete rule
- [ ] Search rules
- [ ] Filter by category
- [ ] Verify no confidence display

### Dashboard Widget
- [ ] Add widget to dashboard
- [ ] Verify node counts
- [ ] Verify confidence distribution
- [ ] Click to navigate to graphs page
- [ ] Resize widget (compact/detailed views)

---

## Future Enhancements

### MCP Tools (Feature 011 Extension)

13 tools for AI-assisted graph operations:
1. `create_entities` - Batch node creation
2. `create_relations` - Batch edge creation
3. `add_observations` - Add observation text
4. `search_entities` - Query with confidence filtering
5. `get_entity` - Get single node (auto-reinforce)
6. `update_entity` - Modify node
7. `delete_entity` - Delete node
8. `pin_entity` - Set pinned flag
9. `reinforce_entity` - Update last_accessed
10. `list_graph_entities` - Paginated list
11. `list_entity_relations` - Get edges for node
12. `find_stale_entities` - Low confidence filter
13. `calculate_confidence` - On-demand calculation

### Planning AI Integration (Optional)

If Feature 005 is re-added:
- GraphSummaryPanel above Planning AI chat
- Toggle controls filter AI context
- AI mentions low-confidence entities with uncertainty
- Chat-based graph creation/updates

### Visualization Library Options

**Force-directed graph** (Political-Web):
- D3.js force simulation
- Cytoscape.js
- react-force-graph

**Timeline** (Campaign-Story):
- vis.js timeline
- react-chrono
- Custom SVG implementation

---

## Troubleshooting

### Common Issues

**Issue**: `lucide-react` import fails
**Solution**: Run `npm install lucide-react` in frontend directory, restart container

**Issue**: TypeScript "not all code paths return a value"
**Solution**: Add `return` statements before all `res.json()` calls

**Issue**: Graph not appearing in list
**Solution**: Check `toggle_state` - graphs start OFF by default

**Issue**: Confidence always shows 1.0
**Solution**: Ensure `last_accessed` is being updated, verify decay_rate is set

**Issue**: Nodes not forming tree structure
**Solution**: Verify `parent_location_id` is correctly set in node attributes

---

## References

- **Specs**: `/specs/006-create-the-knowledge/`
- **Contracts**: `/specs/006-create-the-knowledge/contracts/`
- **Backend**: `/backend/src/services/Knowledge*.ts`
- **Frontend**: `/frontend/src/pages/*GraphPage.tsx`
- **Tests**: `/backend/tests/contract/`, `/backend/tests/unit/`, `/backend/tests/integration/`

---

**Document End** - Last updated 2025-10-14 by Claude during Feature 006 implementation session
