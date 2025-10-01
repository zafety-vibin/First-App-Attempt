# Quickstart: Knowledge Graph Architecture

**Feature**: 006-create-the-knowledge
**Date**: 2025-10-01
**Prerequisites**: Features 002-005 fully implemented

## Overview

This quickstart validates the complete Knowledge Graph Architecture workflow from the primary user story (spec.md lines 23-24). Tests default graph initialization, Planning AI graph creation, toggle controls, cross-graph context, versioning, and Context Engineering help.

**Test Campaign**: Waterdeep campaign with existing session data from Features 002-005

---

## Step 1: Initialize Campaign with Default World-Foundations Graph

**Actor**: GM
**Goal**: Verify default graph created on campaign initialization

1. Create new campaign: "Waterdeep: Dragon Heist"
2. Navigate to Planning AI page
3. Observe Graph Summary Panel above Planning AI chat

**Expected Result**:
- Graph Summary Panel displays 1 graph: "World Foundations"
- Graph type: World-Foundations
- Toggle state: ON (green indicator)
- Node count: 0, Edge count: 0
- Last updated: Campaign creation timestamp

**Validation**:
```sql
SELECT * FROM knowledge_graphs WHERE campaign_id = ? AND graph_type = 'World-Foundations';
-- Returns 1 row with graph_name='World Foundations', toggle_state=1
```

---

## Step 2: Access Context Engineering Help Page

**Actor**: GM
**Goal**: Understand knowledge graph philosophy and usage

1. Locate "?" icon next to Graph Summary Panel title
2. Click "?" icon
3. Observe Context Engineering help page

**Expected Result**:
- Page displays documentation covering:
  - Graph philosophy (distilled context for AI assistance)
  - Independence from cards (user-defined content)
  - Warning against over-engineering
  - All 4 graph types with examples:
    - World-Foundations: Setting differentiators, magic systems, world quirks
    - Political-Web: NPC/faction relationships, power dynamics
    - Geographical: Location hierarchies, spatial relationships
    - Campaign-Story: Timeline, events, cause-and-effect tracking
  - When to create each type
  - Toggle controls explanation
  - Cross-graph context via observations
  - Maintenance strategies
  - Custom graph types principles
  - Support for multiple graph instances

**Validation**:
- Help page is static content (no API call)
- Accessible from Planning page via "?" icon

---

## Step 3: Create Political-Web Graph via Planning AI

**Actor**: GM
**Goal**: Create new graph through chat interface

1. In Planning AI chat, type: "Create a Political-Web graph to track faction relationships in Waterdeep"
2. Planning AI responds with graph creation intent detection
3. GM confirms details:
   - Graph type: Political-Web
   - Graph name: "Waterdeep Factions"
   - Initial nodes: Lords' Alliance, Harpers, Zhentarim, Xanathar Guild
   - Initial edges: "allied with", "opposed to"
4. Preview shows proposed graph structure
5. GM approves creation

**Expected Result**:
- Graph Summary Panel now shows 2 graphs:
  - "World Foundations" (World-Foundations, toggle ON)
  - "Waterdeep Factions" (Political-Web, toggle ON)
- "Waterdeep Factions" shows: 4 nodes, 6 edges
- Backup version created (empty initial state)

**Validation**:
```sql
SELECT * FROM knowledge_graphs WHERE campaign_id = ? AND graph_name = 'Waterdeep Factions';
-- Returns 1 row with graph_type='Political-Web', toggle_state=1

SELECT COUNT(*) FROM graph_nodes WHERE graph_id = ?;
-- Returns 4

SELECT COUNT(*) FROM graph_edges WHERE graph_id = ?;
-- Returns 6

SELECT COUNT(*) FROM graph_versions WHERE graph_id = ?;
-- Returns 2 (current + backup)
```

---

## Step 4: Manually Add Node to Political-Web Graph

**Actor**: GM
**Goal**: Test manual CRUD operations

1. Navigate to "Waterdeep Factions" graph detail view
2. Click "Add Node" button
3. Fill form:
   - Node type: NPC
   - Name: Lord Dagult Neverember
   - Attributes (JSON): `{"title": "Open Lord of Waterdeep", "personality": "Ambitious", "goals": ["Maintain control", "Rebuild Neverwinter"]}`
   - Observations: "current location: Waterdeep; allied with: Lords' Alliance"
   - Information level: Player Knowledge
4. Save node
5. Create edge: Lord Neverember → Lords' Alliance, edge type: "leads", directed: true

**Expected Result**:
- Graph now shows: 5 nodes, 7 edges
- Lord Neverember node visible in node list
- Edge "leads" connects Neverember to Lords' Alliance
- Backup version created automatically

**Validation**:
```sql
SELECT * FROM graph_nodes WHERE name = 'Lord Dagult Neverember';
-- Returns 1 row with node_type='NPC', observations contains "current location: Waterdeep"

SELECT * FROM graph_edges WHERE edge_type = 'leads';
-- Returns 1 row connecting Neverember to Lords' Alliance

SELECT version_type FROM graph_versions WHERE graph_id = ? ORDER BY created_at DESC LIMIT 2;
-- Returns ['current', 'backup'] (backup is previous state)
```

---

## Step 5: Create Geographical Graph

**Actor**: GM
**Goal**: Create second graph for cross-graph testing

1. In Planning AI chat, type: "Create a Geographical graph for Waterdeep locations"
2. GM provides initial content:
   - Node type: Location
   - Nodes: Waterdeep (city), Castle Ward (district), Trades Ward (district), Yawning Portal (tavern)
   - Edges: "contains" (Waterdeep → wards → tavern hierarchy)
3. Approve creation

**Expected Result**:
- Graph Summary Panel shows 3 graphs:
  - "World Foundations" (0 nodes, 0 edges, toggle ON)
  - "Waterdeep Factions" (5 nodes, 7 edges, toggle ON)
  - "Waterdeep Locations" (4 nodes, 3 edges, toggle ON)

**Validation**:
```sql
SELECT COUNT(*) FROM knowledge_graphs WHERE campaign_id = ?;
-- Returns 3

SELECT graph_name, graph_type FROM knowledge_graphs WHERE campaign_id = ? ORDER BY created_at;
-- Returns: [('World Foundations', 'World-Foundations'), ('Waterdeep Factions', 'Political-Web'), ('Waterdeep Locations', 'Geographical')]
```

---

## Step 6: Test Cross-Graph Query

**Actor**: GM
**Goal**: Verify cross-graph context via observations

1. In Planning AI chat, ask: "Where is Lord Neverember currently located?"
2. Planning AI processes query using both toggled-on graphs:
   - Political-Web: Lord Neverember node with observation "current location: Waterdeep"
   - Geographical: Waterdeep location node with details

**Expected Result**:
- AI response: "Lord Dagult Neverember is currently in Waterdeep, the City of Splendors. As the Open Lord, he likely resides in Castle Ward where government buildings are located."
- Response shows cross-graph context usage:
  - From Political-Web: Neverember's location observation
  - From Geographical: Waterdeep location details, Castle Ward info
- Response metadata shows graphs_used: ["Waterdeep Factions", "Waterdeep Locations"]

**Validation**:
- POST /api/campaigns/{id}/graphs/query with query
- Response includes `graphs_used` array with both graph IDs
- Response includes `cross_references` showing observation match

---

## Step 7: Toggle Off World-Foundations Graph

**Actor**: GM
**Goal**: Test toggle controls and AI access filtering

1. In Graph Summary Panel, locate "World Foundations" graph
2. Click toggle button to turn OFF
3. Observe visual change (toggle indicator red/gray)
4. Ask Planning AI: "What are the core magic rules in this world?"

**Expected Result**:
- Toggle state changes to OFF
- AI response: "I don't have information about the magic system. The World Foundations graph is currently toggled off. Would you like me to access it?"
- Graph Summary Panel shows "World Foundations" toggle: OFF

**Validation**:
```sql
SELECT toggle_state FROM knowledge_graphs WHERE graph_name = 'World Foundations';
-- Returns 0 (toggled off)
```

**API Call**:
```
PATCH /api/campaigns/{id}/graphs/{world-foundations-id}/toggle
Body: {"toggle_state": false}
Response: {"toggle_state": false, "updated_at": 1696118400}
```

---

## Step 8: Toggle World-Foundations Back On

**Actor**: GM
**Goal**: Verify toggle can be re-enabled

1. Click toggle button for "World Foundations" to turn ON
2. Ask same question: "What are the core magic rules in this world?"

**Expected Result**:
- Toggle state changes to ON
- AI now includes World Foundations in context (even though empty)
- AI response: "The World Foundations graph is empty. Would you like to populate it with your campaign's magic system details?"

**Validation**:
```sql
SELECT toggle_state FROM knowledge_graphs WHERE graph_name = 'World Foundations';
-- Returns 1 (toggled on)
```

---

## Step 9: Update Political-Web Graph and Create Backup

**Actor**: GM
**Goal**: Test versioning workflow

1. Navigate to "Waterdeep Factions" graph
2. Via Planning AI or manual edit, add 2 new nodes:
   - Force Grey (NPC, leader of Harpers)
   - Davil Starsong (NPC, Zhentarim agent)
3. Add edges connecting them to factions
4. Verify backup created

**Expected Result**:
- Graph shows: 7 nodes, 9 edges (increased from 5 nodes, 7 edges)
- Updated timestamp changed
- Backup version contains previous state (5 nodes, 7 edges)

**Validation**:
```sql
SELECT COUNT(*) FROM graph_nodes WHERE graph_id = ?;
-- Returns 7

SELECT COUNT(*) FROM graph_versions WHERE graph_id = ? AND version_type = 'backup';
-- Returns 1

SELECT snapshot_content FROM graph_versions WHERE graph_id = ? AND version_type = 'backup';
-- JSON contains 5 nodes, 7 edges (previous state)

SELECT snapshot_content FROM graph_versions WHERE graph_id = ? AND version_type = 'current';
-- JSON contains 7 nodes, 9 edges (current state)
```

---

## Step 10: Restore from Backup Version

**Actor**: GM
**Goal**: Test version restore functionality

1. Navigate to "Waterdeep Factions" graph detail
2. Access "Version History"
3. View backup version details (5 nodes, 7 edges, timestamp before Step 9)
4. Click "Restore from Backup"
5. Confirm restoration

**Expected Result**:
- Graph reverts to 5 nodes, 7 edges
- Force Grey and Davil Starsong nodes deleted
- Current version now matches previous backup content
- New backup created with Step 9 state (7 nodes, 9 edges becomes new backup)

**Validation**:
```sql
SELECT COUNT(*) FROM graph_nodes WHERE graph_id = ?;
-- Returns 5 (restored)

SELECT name FROM graph_nodes WHERE graph_id = ? AND name IN ('Force Grey', 'Davil Starsong');
-- Returns 0 rows (deleted)

SELECT snapshot_content FROM graph_versions WHERE graph_id = ? AND version_type = 'current';
-- JSON contains 5 nodes, 7 edges (restored state)

SELECT snapshot_content FROM graph_versions WHERE graph_id = ? AND version_type = 'backup';
-- JSON contains 7 nodes, 9 edges (Step 9 state becomes backup)
```

---

## Step 11: Test Information Level Filtering

**Actor**: GM (creating DM Secret nodes) + Player (viewing filtered graph)

### 11A: Create DM Secret Node
1. Add node to Political-Web graph:
   - Name: "Xanathar's True Identity"
   - Node type: Secret
   - Attributes: `{"identity": "Beholder crime lord", "location": "Skullport beneath Waterdeep"}`
   - Information level: DM Secret
2. Save node

### 11B: View as Player
1. Switch view mode to Player View
2. Navigate to "Waterdeep Factions" graph
3. Observe nodes displayed

**Expected Result**:
- DM View: Shows all 6 nodes (5 previous + 1 DM Secret)
- Player View: Shows only 5 nodes (DM Secret node filtered out)
- No indication to player that a node is hidden

**Validation**:
```sql
-- DM View query
SELECT COUNT(*) FROM graph_nodes
WHERE graph_id = ?;
-- Returns 6

-- Player View query (with information level filtering)
SELECT COUNT(*) FROM graph_nodes n
JOIN information_levels il ON n.information_level_id = il.id
WHERE n.graph_id = ? AND il.hierarchical = 0;
-- Returns 5 (DM Secret has hierarchical=1)
```

**API Call**:
```
GET /api/campaigns/{id}/graphs/{graph-id}?include_nodes=true
Headers: X-View-Mode: player
Response: {nodes: [5 nodes], edges: [...]} (DM Secret node excluded)
```

---

## Step 12: Test Custom Graph Type

**Actor**: GM
**Goal**: Create custom graph type beyond the 4 documented types

1. In Planning AI chat, type: "Create a custom graph to track magic item ownership and locations"
2. GM specifies:
   - Graph type: custom:Magic-Items
   - Graph name: "Waterdeep Magic Items"
   - Node types: Item, Owner, Location
   - Edge types: "owned by", "stored at"
3. Approve creation

**Expected Result**:
- Graph Summary Panel shows 4 graphs:
  - World Foundations, Waterdeep Factions, Waterdeep Locations (existing)
  - "Waterdeep Magic Items" (custom:Magic-Items, toggle ON)
- Custom graph behaves identically to documented types (toggle, versioning, filtering)

**Validation**:
```sql
SELECT graph_type, graph_name FROM knowledge_graphs WHERE graph_name = 'Waterdeep Magic Items';
-- Returns ('custom:Magic-Items', 'Waterdeep Magic Items')

-- Custom graph supports all features
SELECT toggle_state, current_version_id, backup_version_id FROM knowledge_graphs WHERE graph_name = 'Waterdeep Magic Items';
-- Returns (1, [version-id], [version-id])
```

---

## Step 13: Test Multiple Instances of Same Type

**Actor**: GM
**Goal**: Create second Political-Web graph

1. In Planning AI chat, type: "Create another Political-Web graph for Baldur's Gate politics"
2. GM specifies:
   - Graph type: Political-Web
   - Graph name: "Baldur's Gate Factions"
3. Approve creation

**Expected Result**:
- Graph Summary Panel shows 5 graphs:
  - 2 Political-Web graphs: "Waterdeep Factions", "Baldur's Gate Factions"
  - Each graph is independent (separate nodes, edges, toggles, versions)

**Validation**:
```sql
SELECT COUNT(*) FROM knowledge_graphs WHERE campaign_id = ? AND graph_type = 'Political-Web';
-- Returns 2

SELECT graph_name FROM knowledge_graphs WHERE graph_type = 'Political-Web';
-- Returns ['Waterdeep Factions', 'Baldur's Gate Factions']

-- Verify independence
SELECT COUNT(*) FROM graph_nodes WHERE graph_id = (SELECT id FROM knowledge_graphs WHERE graph_name = 'Waterdeep Factions');
-- Returns 6 (from previous steps)

SELECT COUNT(*) FROM graph_nodes WHERE graph_id = (SELECT id FROM knowledge_graphs WHERE graph_name = 'Baldur's Gate Factions');
-- Returns 0 (new empty graph)
```

---

## Step 14: Test Graph Integration with Feature 010 (Public Campaign)

**Actor**: GM + Player
**Goal**: Verify graphs are filtered in public campaign view

### 14A: Enable Public Sharing
1. Navigate to Campaign Settings → Public Sharing
2. Enable public access
3. Publish campaign

### 14B: Access Public URL
1. Player navigates to public campaign URL
2. Access knowledge graphs (if exposed in public view)

**Expected Result**:
- Public view shows graphs with information level filtering applied
- DM Secret nodes excluded from all graphs
- Player sees: "Waterdeep Factions" with 5 nodes (not 6, DM Secret filtered)
- Published version snapshot includes filtered graphs

**Validation**:
```sql
SELECT snapshot_content FROM published_versions WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 1;
-- JSON includes graphs array with nodes filtered by information level
```

---

## Step 15: Performance Validation

**Goal**: Validate performance goals from Technical Context

### Test Case 15A: Graph Query Performance
1. Load "Waterdeep Factions" graph with 50 nodes, 100 edges
2. Measure API response time

**Expected Result**: < 100ms for GET /api/campaigns/{id}/graphs/{graph-id}

### Test Case 15B: Toggle Performance
1. Toggle graph on/off
2. Measure API response time

**Expected Result**: < 100ms for PATCH /api/campaigns/{id}/graphs/{graph-id}/toggle

### Test Case 15C: Graph Save Performance
1. Update graph with 10 new nodes, 20 new edges
2. Measure API response time (including backup creation)

**Expected Result**: < 500ms for PATCH /api/campaigns/{id}/graphs/{graph-id}

### Test Case 15D: Cross-Graph Query Performance
1. Query across 4 graphs (World-Foundations, Political-Web, Geographical, Campaign-Story)
2. Total nodes: 200, Total edges: 400
3. Measure API response time

**Expected Result**: < 1 second for POST /api/campaigns/{id}/graphs/query (includes LLM call)

**Validation Method**:
- Use backend timing logs
- Measure database query duration separately from LLM call
- Acceptable: Graph loading < 500ms, LLM call depends on provider

---

## Success Criteria

**Quickstart passes if**:
✓ All 15 steps complete without errors
✓ Default World-Foundations graph created on campaign init
✓ Planning AI successfully creates graphs via chat interface
✓ Toggle controls work (graphs excluded when toggled off)
✓ Cross-graph queries use observations for context
✓ Versioning maintains current + backup, restore works
✓ Information level filtering hides DM Secret nodes in Player View
✓ Custom graph types supported
✓ Multiple instances of same graph type allowed
✓ Graph Summary Panel displays real-time updates
✓ Context Engineering help page accessible and comprehensive
✓ Performance goals met (< 100ms query/toggle, < 500ms save)
✓ Integration with Features 004 (filtering) and 005 (Planning AI) works

**Failure Indicators**:
✗ Default graph not created on campaign init
✗ Toggle controls don't filter AI access
✗ Cross-graph queries fail to use observations
✗ Version restore fails or corrupts data
✗ DM Secret nodes visible in Player View
✗ Performance goals exceeded

---

## Rollback Procedure

If quickstart fails and needs rollback:

1. Delete test graphs:
   ```sql
   DELETE FROM graph_edges WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?);
   DELETE FROM graph_nodes WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?);
   DELETE FROM graph_versions WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?);
   DELETE FROM knowledge_graphs WHERE campaign_id = ?;
   ```

2. Drop tables if necessary:
   ```sql
   DROP TABLE IF EXISTS graph_versions;
   DROP TABLE IF EXISTS graph_edges;
   DROP TABLE IF EXISTS graph_nodes;
   DROP TABLE IF EXISTS knowledge_graphs;
   ```

3. Restart Docker containers to reset state

---

## Next Steps

After quickstart validation:
1. Review performance metrics (query times, backup size)
2. Note edge cases discovered during testing
3. Document any deviations from expected behavior
4. Proceed to `/tasks` command to generate implementation task list
5. Begin TDD implementation (contract tests → models → services → UI)

**Optional Future Enhancements** (not in scope for this feature):
- Graph visualization canvas (react-force-graph)
- Maintenance rule automation (time-based pruning)
- Graph import/export (JSON format)
- Graph diff view (comparing versions)
