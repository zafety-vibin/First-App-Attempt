# Data Model: Knowledge Graph Architecture

**Feature**: 006-create-the-knowledge
**Date**: 2025-10-01
**Phase**: Phase 1 - Entity Design

---

## Entity Relationship Diagram

```
campaigns (from Feature 002)
    ↓ 1:N
knowledge_graphs
    ↓ 1:N
graph_nodes ←→ graph_edges (many-to-many via edges)
    ↓ 1:2
graph_versions (current + backup)

graph_nodes → information_levels (from Feature 004)
```

---

## Entities

### 1. KnowledgeGraph

**Description**: Independent graph entity containing user-defined nodes and edges. Separate from card architecture. Four documented types (World-Foundations, Political-Web, Geographical, Campaign-Story) plus custom types.

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| campaign_id | TEXT | NOT NULL, FK → campaigns(id) | Campaign reference |
| graph_type | TEXT | NOT NULL | World-Foundations \| Political-Web \| Geographical \| Campaign-Story \| custom:{name} |
| graph_name | TEXT | NOT NULL | Unique per campaign (e.g., "Faerun Politics", "Waterdeep Map") |
| toggle_state | INTEGER | NOT NULL, DEFAULT 1, CHECK IN (0,1) | 1=toggled on (AI can access), 0=toggled off |
| maintenance_rules | TEXT | NULLABLE | JSONB: User-defined automatic maintenance config (opt-in) |
| created_at | INTEGER | NOT NULL, DEFAULT current timestamp | Unix timestamp |
| updated_at | INTEGER | NOT NULL, DEFAULT current timestamp | Unix timestamp |
| current_version_id | TEXT | NULLABLE, FK → graph_versions(id) | Reference to current version |
| backup_version_id | TEXT | NULLABLE, FK → graph_versions(id) | Reference to backup version (1-deep) |

**Indexes**:
- PRIMARY KEY on id
- UNIQUE INDEX on (campaign_id, graph_name)
- INDEX on campaign_id

**Constraints**:
- FOREIGN KEY campaign_id → campaigns(id) ON DELETE CASCADE
- UNIQUE constraint on (campaign_id, graph_name) - no duplicate graph names per campaign

**Initial Data**:
- On campaign creation, insert 1 default World-Foundations graph:
  ```sql
  INSERT INTO knowledge_graphs (id, campaign_id, graph_type, graph_name, toggle_state, created_at, updated_at)
  VALUES (uuid(), campaign_id, 'World-Foundations', 'World Foundations', 1, timestamp, timestamp);
  ```

---

### 2. GraphNode

**Description**: Node within a knowledge graph. User-defined node type, attributes, and observations. Supports information level tagging for filtering.

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| graph_id | TEXT | NOT NULL, FK → knowledge_graphs(id) | Parent graph reference |
| node_type | TEXT | NOT NULL | User-defined (e.g., NPC, Location, Deity, Event, Faction, Spell) |
| name | TEXT | NOT NULL | Node name (e.g., "Lord Neverember", "Waterdeep", "The Sundering") |
| attributes | TEXT | NOT NULL, DEFAULT '{}' | JSONB free-form user-defined content |
| observations | TEXT | NULLABLE | Free-form text for cross-graph context (e.g., "current location: Waterdeep") |
| information_level_id | TEXT | NULLABLE, FK → information_levels(id) | Information level for filtering (null = Common Knowledge) |
| created_at | INTEGER | NOT NULL, DEFAULT current timestamp | Unix timestamp |

**Indexes**:
- PRIMARY KEY on id
- INDEX on graph_id
- INDEX on information_level_id (for filtering queries)

**Constraints**:
- FOREIGN KEY graph_id → knowledge_graphs(id) ON DELETE CASCADE
- FOREIGN KEY information_level_id → information_levels(id) ON DELETE SET NULL

**Example Data**:
```json
{
  "id": "node-123",
  "graph_id": "graph-political-web",
  "node_type": "NPC",
  "name": "Lord Dagult Neverember",
  "attributes": {
    "title": "Open Lord of Waterdeep",
    "faction": "Lords' Alliance",
    "personality": "Ambitious, pragmatic",
    "goals": ["Maintain control of Waterdeep", "Rebuild Neverwinter"]
  },
  "observations": "current location: Waterdeep; allied with: Harpers faction",
  "information_level_id": "level-player-knowledge",
  "created_at": 1696118400
}
```

---

### 3. GraphEdge

**Description**: Relationship between two nodes in a graph. User-defined edge type and optional metadata. Supports directed and undirected edges.

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| graph_id | TEXT | NOT NULL, FK → knowledge_graphs(id) | Parent graph reference |
| edge_type | TEXT | NOT NULL | User-defined relationship label (e.g., "allied with", "contains", "caused by") |
| source_node_id | TEXT | NOT NULL, FK → graph_nodes(id) | Source node |
| target_node_id | TEXT | NOT NULL, FK → graph_nodes(id) | Target node |
| directed | INTEGER | NOT NULL, DEFAULT 1, CHECK IN (0,1) | 1=directed edge (source→target), 0=undirected (bidirectional) |
| metadata | TEXT | NULLABLE | JSONB optional data (e.g., {"strength": 0.8, "travel_time": "3 days"}) |
| created_at | INTEGER | NOT NULL, DEFAULT current timestamp | Unix timestamp |

**Indexes**:
- PRIMARY KEY on id
- INDEX on graph_id
- INDEX on source_node_id
- INDEX on target_node_id

**Constraints**:
- FOREIGN KEY graph_id → knowledge_graphs(id) ON DELETE CASCADE
- FOREIGN KEY source_node_id → graph_nodes(id) ON DELETE CASCADE
- FOREIGN KEY target_node_id → graph_nodes(id) ON DELETE CASCADE

**Example Data**:
```json
{
  "id": "edge-456",
  "graph_id": "graph-political-web",
  "edge_type": "allied with",
  "source_node_id": "node-neverember",
  "target_node_id": "node-harpers",
  "directed": 0,
  "metadata": {"alliance_strength": 0.7, "since": 1492},
  "created_at": 1696118400
}
```

---

### 4. GraphVersion

**Description**: Snapshot of entire graph state for versioning. System maintains current version + 1 backup version per graph.

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| graph_id | TEXT | NOT NULL, FK → knowledge_graphs(id) | Parent graph reference |
| snapshot_content | TEXT | NOT NULL | JSONB: Full graph state {nodes: [...], edges: [...], metadata: {...}} |
| version_type | TEXT | NOT NULL, CHECK IN ('current', 'backup') | Version type |
| created_at | INTEGER | NOT NULL, DEFAULT current timestamp | Unix timestamp |

**Indexes**:
- PRIMARY KEY on id
- UNIQUE INDEX on (graph_id, version_type) WHERE version_type = 'current'
- UNIQUE INDEX on (graph_id, version_type) WHERE version_type = 'backup'

**Constraints**:
- FOREIGN KEY graph_id → knowledge_graphs(id) ON DELETE CASCADE
- UNIQUE constraint enforces 1 current + 1 backup per graph

**Example Data**:
```json
{
  "id": "version-789",
  "graph_id": "graph-political-web",
  "snapshot_content": {
    "nodes": [
      {
        "id": "node-123",
        "node_type": "NPC",
        "name": "Lord Neverember",
        "attributes": {...},
        "observations": "...",
        "information_level_id": "..."
      }
    ],
    "edges": [
      {
        "id": "edge-456",
        "edge_type": "allied with",
        "source_node_id": "node-123",
        "target_node_id": "node-789",
        "directed": 0,
        "metadata": {...}
      }
    ],
    "metadata": {
      "graph_type": "Political-Web",
      "graph_name": "Faerun Politics",
      "node_count": 25,
      "edge_count": 42
    }
  },
  "version_type": "backup",
  "created_at": 1696118400
}
```

---

## SQL Schema

```sql
-- ============================================================================
-- Knowledge Graph Tables
-- ============================================================================

-- Knowledge Graphs
CREATE TABLE IF NOT EXISTS knowledge_graphs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  graph_type TEXT NOT NULL,
  graph_name TEXT NOT NULL,
  toggle_state INTEGER NOT NULL DEFAULT 1 CHECK(toggle_state IN (0,1)),
  maintenance_rules TEXT, -- JSONB
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  current_version_id TEXT,
  backup_version_id TEXT,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, graph_name)
);

CREATE INDEX idx_knowledge_graphs_campaign ON knowledge_graphs(campaign_id);

-- Graph Nodes
CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  name TEXT NOT NULL,
  attributes TEXT NOT NULL DEFAULT '{}', -- JSONB
  observations TEXT,
  information_level_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (information_level_id) REFERENCES information_levels(id) ON DELETE SET NULL
);

CREATE INDEX idx_graph_nodes_graph ON graph_nodes(graph_id);
CREATE INDEX idx_graph_nodes_info_level ON graph_nodes(information_level_id);

-- Graph Edges
CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  edge_type TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  directed INTEGER NOT NULL DEFAULT 1 CHECK(directed IN (0,1)),
  metadata TEXT, -- JSONB
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (source_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
);

CREATE INDEX idx_graph_edges_graph ON graph_edges(graph_id);
CREATE INDEX idx_graph_edges_source ON graph_edges(source_node_id);
CREATE INDEX idx_graph_edges_target ON graph_edges(target_node_id);

-- Graph Versions
CREATE TABLE IF NOT EXISTS graph_versions (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  snapshot_content TEXT NOT NULL, -- JSONB
  version_type TEXT NOT NULL CHECK(version_type IN ('current', 'backup')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_graph_versions_current ON graph_versions(graph_id, version_type)
  WHERE version_type = 'current';
CREATE UNIQUE INDEX idx_graph_versions_backup ON graph_versions(graph_id, version_type)
  WHERE version_type = 'backup';

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE TRIGGER update_knowledge_graphs_timestamp
AFTER UPDATE ON knowledge_graphs
FOR EACH ROW
BEGIN
  UPDATE knowledge_graphs SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;
```

---

## Validation Rules

### KnowledgeGraph
- `graph_name` must be unique per campaign
- `graph_type` must match pattern: `World-Foundations|Political-Web|Geographical|Campaign-Story|custom:.*`
- `toggle_state` must be 0 or 1
- `maintenance_rules` if present, must be valid JSON

### GraphNode
- `name` must not be empty
- `attributes` must be valid JSON (default: `{}`)
- `observations` max length: 2000 characters
- If `information_level_id` is null, node is treated as Common Knowledge

### GraphEdge
- `source_node_id` and `target_node_id` must belong to same graph
- `edge_type` must not be empty
- `directed` must be 0 or 1
- `metadata` if present, must be valid JSON

### GraphVersion
- Each graph can have at most 1 current version and 1 backup version
- `snapshot_content` must be valid JSON
- Snapshot must include: nodes array, edges array, metadata object

---

## State Transitions

### Graph Creation
```
Campaign Created (Feature 002)
  ↓
Default World-Foundations Graph Created (toggle_state=1)
  ↓
User Creates Additional Graphs via Planning AI
  ↓
Graphs Persisted with Nodes/Edges
```

### Graph Update Workflow
```
User Chats with Planning AI
  ↓
Planning AI Suggests Changes (nodes/edges to add/update/delete)
  ↓
User Approves Changes
  ↓
System Creates Backup Version (current → backup)
  ↓
System Applies Changes to Nodes/Edges
  ↓
System Creates New Current Version
  ↓
Update knowledge_graphs.updated_at
```

### Toggle State Transitions
```
Graph Toggled ON (toggle_state=1)
  ↓
Planning AI Can Query/Update Graph
  ↓
User Toggles OFF (toggle_state=0)
  ↓
Planning AI Cannot Access Graph (filtered out)
  ↓
User Can Still Manually Edit
```

### Version Restore
```
User Requests Restore from Backup
  ↓
System Loads Backup Version Snapshot
  ↓
System Deletes All Current Nodes/Edges
  ↓
System Recreates Nodes/Edges from Snapshot
  ↓
System Swaps Version IDs (backup becomes current)
  ↓
Graph Restored to Previous State
```

---

## Integration Points

### Feature 004 (Information Filtering)
- GraphNode.information_level_id links to information_levels table
- View mode filtering applies to graph nodes
- DM View: Show all nodes
- Player View: Hide nodes with hierarchical=true information levels

### Feature 005 (Planning AI)
- Planning AI chat interface creates/updates graphs
- LLM service extracts structured graph data from conversations
- SSE streaming for real-time graph updates

### Feature 008 (BYOLLM Configuration)
- Graph queries use user-provided LLM credentials
- No graph functionality if LLM unavailable

### Feature 010 (Public Campaign View)
- Public URLs filter graph nodes by information level
- Published versions include filtered graph snapshots
- Toggle state not exposed to public view (all graphs included in snapshot)

---

## Performance Considerations

**Query Optimization**:
- Indexes on graph_id for fast node/edge lookups
- Indexes on source_node_id and target_node_id for edge traversal
- Index on information_level_id for filtering queries

**Storage Estimates**:
- Typical campaign: 4 graphs, 50 nodes per graph, 100 edges per graph
- Node size: ~500 bytes (name + attributes + observations)
- Edge size: ~200 bytes (type + metadata)
- Total per campaign: (50 * 500 + 100 * 200) * 4 = ~180 KB
- Versions: 2 snapshots per graph * ~45 KB = 90 KB
- **Total: ~270 KB per campaign** (acceptable for SQLite)

**Scalability Limits** (prototype):
- Max nodes per graph: 500 (performance degrades beyond this)
- Max edges per graph: 1000
- Max graphs per campaign: 20

---

## TypeScript Interfaces

```typescript
interface KnowledgeGraph {
  id: string;
  campaign_id: string;
  graph_type: 'World-Foundations' | 'Political-Web' | 'Geographical' | 'Campaign-Story' | `custom:${string}`;
  graph_name: string;
  toggle_state: boolean;
  maintenance_rules: MaintenanceRule[] | null;
  created_at: number;
  updated_at: number;
  current_version_id: string | null;
  backup_version_id: string | null;
  nodes?: GraphNode[]; // Loaded optionally
  edges?: GraphEdge[]; // Loaded optionally
}

interface GraphNode {
  id: string;
  graph_id: string;
  node_type: string;
  name: string;
  attributes: Record<string, any>; // Free-form user-defined
  observations: string | null;
  information_level_id: string | null;
  created_at: number;
}

interface GraphEdge {
  id: string;
  graph_id: string;
  edge_type: string;
  source_node_id: string;
  target_node_id: string;
  directed: boolean;
  metadata: Record<string, any> | null;
  created_at: number;
}

interface GraphVersion {
  id: string;
  graph_id: string;
  snapshot_content: GraphSnapshot;
  version_type: 'current' | 'backup';
  created_at: number;
}

interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    graph_type: string;
    graph_name: string;
    node_count: number;
    edge_count: number;
    snapshot_timestamp: number;
  };
}

interface MaintenanceRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  strategy: 'time-based' | 'tag-based' | 'graduated-detail';
  params: Record<string, any>;
}
```

---

**Ready for Contract Generation**: All entities defined with fields, constraints, and validation rules.
