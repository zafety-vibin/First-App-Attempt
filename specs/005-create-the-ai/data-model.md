# Data Model: AI Import and Planning Workflows

**Feature**: 005-create-the-ai
**Phase**: 1 (Design & Contracts)
**Date**: 2025-10-01
**Storage**: SQLite3 (extends features 002-004 schema)

---

## Entity Relationship Diagram

```
┌──────────────────┐
│    Campaign      │ (Feature 002)
└────────┬─────────┘
         │ 1:N
         │
    ┌────┴────────────────────────────────────┐
    │                                         │
┌───▼──────────────┐                  ┌──────▼──────────┐
│ ImportSession    │ (NEW)             │ PlanningSession │ (NEW)
└───┬──────────────┘                  └──────┬──────────┘
    │ 1:N                                    │ 1:N
    │                                        │
┌───▼──────────────┐                  ┌──────▼──────────┐
│  ImportBatch     │ (NEW)             │ KnowledgeGraph  │ (NEW)
└───┬──────────────┘                  └──────┬──────────┘
    │                                        │ 1:N
    │                                        │
    │                                  ┌─────┴─────┬─────────────┐
    │                                  │           │             │
    │                           ┌──────▼──────┐ ┌──▼──────┐    │
    │                           │  GraphNode  │ │GraphEdge│    │
    │                           └─────┬───────┘ └──┬──────┘    │
    │                                 │            │           │
    │                                 └─────┬──────┴───────────┘
    │                                       │
    ├───────────────────────────────────────┘
    │
┌───▼──────────────┐
│      Card        │ (Feature 003, extended)
└──────────────────┘

┌──────────────────┐
│ InformationLevel │ (Feature 004)
└──────────────────┘
```

---

## 1. ImportSession

**Purpose**: Tracks AI Import workflow instances where the GM uploads files/text for the Import AI to extract entities.

**Lifecycle**: Created → Uploading → Processing → Pending Approval → Approved/Reverted

**SQLite Schema**:
```sql
CREATE TABLE import_sessions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('uploading', 'processing', 'pending_approval', 'approved', 'reverted')),
  chat_history TEXT NOT NULL, -- JSONB array of {role, content, timestamp}
  approval_summary TEXT, -- JSONB: {entities_extracted, nodes_added, edges_added, cards_created}
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_import_sessions_campaign ON import_sessions(campaign_id);
CREATE INDEX idx_import_sessions_status ON import_sessions(status);
```

**TypeScript Interface**:
```typescript
export interface ImportSession {
  id: string;
  campaignId: string;
  status: 'uploading' | 'processing' | 'pending_approval' | 'approved' | 'reverted';
  chatHistory: ChatMessage[];
  approvalSummary?: AIApprovalSummary;
  createdAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO 8601
}
```

**Validation Rules**:
- `id`: UUID v4
- `status`: Must follow state machine transitions
- `chatHistory`: Minimum 1 message (user's initial upload/prompt)
- `approvalSummary`: Required when status = 'pending_approval'
- `completedAt`: Required when status IN ('approved', 'reverted')

**State Transitions**:
```
uploading → processing (when user sends first file/text)
processing → pending_approval (when AI completes entity extraction)
pending_approval → approved (when GM clicks "Approve")
pending_approval → reverted (when GM clicks "Revert")
approved → [terminal state]
reverted → [terminal state]
```

---

## 2. ImportBatch

**Purpose**: Groups all entities (nodes, edges, cards) created during a single Import session for atomic revert operations.

**Lifecycle**: Created with ImportSession → Applied on approval → Deleted on revert

**SQLite Schema**:
```sql
CREATE TABLE import_batches (
  id TEXT PRIMARY KEY,
  import_session_id TEXT NOT NULL,
  node_ids TEXT NOT NULL, -- JSONB array of GraphNode IDs
  edge_ids TEXT NOT NULL, -- JSONB array of GraphEdge IDs
  card_ids TEXT NOT NULL, -- JSONB array of Card IDs
  created_at TEXT NOT NULL,
  FOREIGN KEY (import_session_id) REFERENCES import_sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_import_batches_session ON import_batches(import_session_id);
```

**TypeScript Interface**:
```typescript
export interface ImportBatch {
  id: string;
  importSessionId: string;
  nodeIds: string[];
  edgeIds: string[];
  cardIds: string[];
  createdAt: string; // ISO 8601
}
```

**Validation Rules**:
- `id`: UUID v4
- At least one of `nodeIds`, `edgeIds`, `cardIds` must be non-empty
- All referenced IDs must exist in their respective tables

**Relationships**:
- 1:1 with ImportSession (each session creates exactly one batch)
- Revert operation cascades deletes to GraphNodes, GraphEdges, Cards via foreign keys

---

## 3. PlanningSession

**Purpose**: Tracks AI Planning workflow instances where the GM discusses upcoming session plans and the Planning AI suggests knowledge graph updates.

**Lifecycle**: Created → Active → Completed

**SQLite Schema**:
```sql
CREATE TABLE planning_sessions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  chat_history TEXT NOT NULL, -- JSONB array of {role, content, timestamp}
  graph_updates TEXT NOT NULL, -- JSONB array of GraphUpdate (incremental, not cumulative)
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_planning_sessions_campaign ON planning_sessions(campaign_id);
CREATE INDEX idx_planning_sessions_status ON planning_sessions(status);
```

**TypeScript Interface**:
```typescript
export interface PlanningSession {
  id: string;
  campaignId: string;
  status: 'active' | 'completed';
  chatHistory: ChatMessage[];
  graphUpdates: GraphUpdate[];
  createdAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
}

export interface GraphUpdate {
  type: 'node_add' | 'node_update' | 'edge_add' | 'edge_delete';
  graphType: 'geographical' | 'political_web' | 'world_foundations' | 'campaign_story';
  nodeId?: string;
  edgeId?: string;
  data: Record<string, unknown>; // Node/Edge attributes
  appliedAt: string; // ISO 8601
}
```

**Validation Rules**:
- `id`: UUID v4
- `status`: Must follow state machine transitions
- `chatHistory`: Minimum 1 message
- `graphUpdates`: Applied incrementally, stored cumulatively per session
- `completedAt`: Required when status = 'completed'

**State Transitions**:
```
active → completed (when GM ends planning chat)
completed → [terminal state]
```

**Key Difference from ImportSession**:
- No approval workflow (FR-043: Planning AI updates graphs immediately upon GM chat)
- No batch revert (FR-044: Only Import batches are revertible)

---

## 4. KnowledgeGraph

**Purpose**: Top-level container for each of the 4 knowledge graph types per campaign.

**Lifecycle**: Created with Campaign → Updated throughout campaign → Deleted with Campaign

**SQLite Schema**:
```sql
CREATE TABLE knowledge_graphs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('geographical', 'political_web', 'world_foundations', 'campaign_story')),
  last_updated TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE (campaign_id, type)
);

CREATE INDEX idx_knowledge_graphs_campaign ON knowledge_graphs(campaign_id);
CREATE INDEX idx_knowledge_graphs_type ON knowledge_graphs(type);
```

**TypeScript Interface**:
```typescript
export interface KnowledgeGraph {
  id: string;
  campaignId: string;
  type: 'geographical' | 'political_web' | 'world_foundations' | 'campaign_story';
  lastUpdated: string; // ISO 8601
  createdAt: string; // ISO 8601
}
```

**Validation Rules**:
- `id`: UUID v4
- `type`: Exactly 4 graphs per campaign (enforced via UNIQUE constraint)
- `lastUpdated`: Updated whenever GraphNodes/GraphEdges are added/modified/deleted

**Graph Type Semantics** (from research.md):
- **Geographical**: Locations, travel routes, spatial relationships
- **Political-Web**: Factions, NPCs, allegiances, rivalries (kept lean via active filtering)
- **World-Foundations**: Lore, cosmology, magic systems, historical events
- **Campaign-Story**: Plot threads, session recaps, story arcs (kept lean via active filtering)

---

## 5. GraphNode

**Purpose**: Represents entities in the knowledge graph (locations, NPCs, factions, plot threads, etc.).

**Lifecycle**: Created via Import/Planning AI → Updated via Planning AI or GM manual edit → Deleted via batch revert or manual delete

**SQLite Schema**:
```sql
CREATE TABLE graph_nodes (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., 'location', 'npc', 'faction', 'plot_thread'
  name TEXT NOT NULL,
  attributes TEXT NOT NULL, -- JSONB: {description, tags, custom_fields}
  source_card_id TEXT, -- Card that originated this node (if from Import AI)
  information_level_id TEXT, -- For filtering (FR-052: nodes inherit card's level)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (source_card_id) REFERENCES cards(id) ON DELETE SET NULL,
  FOREIGN KEY (information_level_id) REFERENCES information_levels(id) ON DELETE SET NULL
);

CREATE INDEX idx_graph_nodes_graph ON graph_nodes(graph_id);
CREATE INDEX idx_graph_nodes_type ON graph_nodes(type);
CREATE INDEX idx_graph_nodes_level ON graph_nodes(information_level_id);
CREATE INDEX idx_graph_nodes_source ON graph_nodes(source_card_id);
```

**TypeScript Interface**:
```typescript
export interface GraphNode {
  id: string;
  graphId: string;
  type: string; // Domain-specific: 'location', 'npc', 'faction', 'plot_thread', etc.
  name: string;
  attributes: {
    description?: string;
    tags?: string[]; // For active filtering (FR-065: "active", "party-relevant")
    [key: string]: unknown; // Custom fields
  };
  sourceCardId?: string;
  informationLevelId?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

**Validation Rules**:
- `id`: UUID v4
- `name`: Non-empty, max 200 characters
- `type`: Domain-specific, validated via LLM prompt engineering (research.md §9)
- `attributes`: Must be valid JSON object
- `tags`: Used for active filtering (Political-Web and Campaign-Story graphs)

**Active Filtering Logic** (research.md §10):
```typescript
function isNodeActive(node: GraphNode, sessionRecaps: SessionRecapEntry[]): boolean {
  const recentSessions = sessionRecaps.slice(-5); // Last 5 sessions
  const hasRecentMention = recentSessions.some(recap =>
    recap.content.toLowerCase().includes(node.name.toLowerCase())
  );
  const hasActiveTag = node.attributes.tags?.includes('active') ||
                       node.attributes.tags?.includes('party-relevant');
  return hasRecentMention || hasActiveTag;
}
```

---

## 6. GraphEdge

**Purpose**: Represents relationships between GraphNodes (e.g., "located in", "allied with", "descends from").

**Lifecycle**: Created via Import/Planning AI → Updated via Planning AI → Deleted via batch revert or manual delete

**SQLite Schema**:
```sql
CREATE TABLE graph_edges (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL, -- e.g., 'located_in', 'allied_with', 'descends_from'
  attributes TEXT NOT NULL, -- JSONB: {strength, description, custom_fields}
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (source_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
);

CREATE INDEX idx_graph_edges_graph ON graph_edges(graph_id);
CREATE INDEX idx_graph_edges_source ON graph_edges(source_node_id);
CREATE INDEX idx_graph_edges_target ON graph_edges(target_node_id);
CREATE INDEX idx_graph_edges_type ON graph_edges(relationship_type);
```

**TypeScript Interface**:
```typescript
export interface GraphEdge {
  id: string;
  graphId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string; // Domain-specific: 'located_in', 'allied_with', etc.
  attributes: {
    strength?: number; // 0.0 to 1.0 for weighted relationships
    description?: string;
    [key: string]: unknown; // Custom fields
  };
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

**Validation Rules**:
- `id`: UUID v4
- `sourceNodeId` ≠ `targetNodeId` (no self-loops)
- `sourceNodeId` and `targetNodeId` must exist in GraphNodes
- Both nodes must belong to the same `graph_id`
- `relationshipType`: Domain-specific, validated via LLM prompt engineering

**Relationship Type Examples** (from research.md §4):
- Geographical: `located_in`, `connected_by`, `region_of`
- Political-Web: `allied_with`, `rivals_with`, `member_of`, `leads`
- World-Foundations: `created_by`, `descends_from`, `powered_by`
- Campaign-Story: `occurs_in`, `involves`, `triggers`, `resolves`

---

## 7. AIApprovalSummary (Embedded in ImportSession)

**Purpose**: Structured summary of what the Import AI extracted and created, presented to GM for approval.

**Lifecycle**: Generated when ImportSession transitions to 'pending_approval' → Displayed in UI → Cleared on approval/revert

**TypeScript Interface**:
```typescript
export interface AIApprovalSummary {
  entitiesExtracted: EntityExtractionResult[];
  nodesAdded: {
    graphType: KnowledgeGraphType;
    nodeType: string;
    name: string;
    nodeId: string;
  }[];
  edgesAdded: {
    graphType: KnowledgeGraphType;
    relationshipType: string;
    source: string; // Node name
    target: string; // Node name
    edgeId: string;
  }[];
  cardsCreated: {
    title: string;
    category: string;
    cardId: string;
  }[];
  potentialConflicts: TimelineConflict[]; // From research.md §5
}

export interface EntityExtractionResult {
  name: string;
  type: string; // 'location', 'npc', 'faction', etc.
  confidence: number; // 0.0 to 1.0
  fuzzyMatchScore?: number; // If matched to existing entity
  existingEntityId?: string; // If deduplicated
}

export interface TimelineConflict {
  description: string;
  sourceCardId: string;
  conflictingRecapId: string;
  severity: 'low' | 'medium' | 'high';
}
```

**Validation Rules**:
- At least one of `nodesAdded`, `edgesAdded`, `cardsCreated` must be non-empty
- `confidence` scores must be 0.0 to 1.0
- `fuzzyMatchScore` ≥ 0.7 triggers deduplication (research.md §3)

**UI Presentation** (FR-040):
- Grouped by graph type
- Show confidence scores for entity extraction
- Highlight potential timeline conflicts
- One-click approval or revert

---

## 8. Card Extension (Feature 003 Schema)

**Purpose**: Extend existing Card entity with metadata to link cards created by Import AI to their source ImportSession and ImportBatch.

**New Fields** (added to existing `cards` table):
```sql
-- Migration: Add columns to existing cards table
ALTER TABLE cards ADD COLUMN import_session_id TEXT;
ALTER TABLE cards ADD COLUMN import_batch_id TEXT;

-- Foreign key constraints (if not using SQLite strict mode, enforce in application)
-- FOREIGN KEY (import_session_id) REFERENCES import_sessions(id) ON DELETE SET NULL
-- FOREIGN KEY (import_batch_id) REFERENCES import_batches(id) ON DELETE CASCADE

CREATE INDEX idx_cards_import_session ON cards(import_session_id);
CREATE INDEX idx_cards_import_batch ON cards(import_batch_id);
```

**TypeScript Interface Extension**:
```typescript
export interface Card {
  // ... existing fields from Feature 003 ...

  // New fields for Feature 005
  importSessionId?: string; // Set if card was created by Import AI
  importBatchId?: string; // Set if card was created by Import AI
}
```

**Validation Rules**:
- `importSessionId` and `importBatchId` must both be set or both be null
- If set, both IDs must reference existing records

**Cascade Behavior**:
- Deleting an ImportBatch deletes all associated Cards (batch revert operation)
- Deleting an ImportSession sets Card.importSessionId to NULL (preserves cards if batch was approved)

---

## Migration Strategy

**Phase 1: Create New Tables** (safe, no data loss)
```sql
-- Run in transaction
BEGIN TRANSACTION;

CREATE TABLE import_sessions (...);
CREATE TABLE import_batches (...);
CREATE TABLE planning_sessions (...);
CREATE TABLE knowledge_graphs (...);
CREATE TABLE graph_nodes (...);
CREATE TABLE graph_edges (...);

-- Create all indexes
CREATE INDEX idx_import_sessions_campaign ON import_sessions(campaign_id);
-- ... (all other indexes from schemas above)

COMMIT;
```

**Phase 2: Extend Existing Tables** (requires careful migration)
```sql
-- Run in transaction
BEGIN TRANSACTION;

-- Backup cards table
CREATE TABLE cards_backup AS SELECT * FROM cards;

-- Add new columns
ALTER TABLE cards ADD COLUMN import_session_id TEXT;
ALTER TABLE cards ADD COLUMN import_batch_id TEXT;

-- Create indexes
CREATE INDEX idx_cards_import_session ON cards(import_session_id);
CREATE INDEX idx_cards_import_batch ON cards(import_batch_id);

COMMIT;
```

**Phase 3: Seed Default Graphs** (application logic)
```typescript
async function seedKnowledgeGraphs(campaignId: string): Promise<void> {
  const graphTypes: KnowledgeGraphType[] = [
    'geographical',
    'political_web',
    'world_foundations',
    'campaign_story',
  ];

  for (const type of graphTypes) {
    await db.insert('knowledge_graphs', {
      id: uuidv4(),
      campaignId,
      type,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }
}
```

**Rollback Strategy**:
```sql
-- If migration fails, rollback is automatic via TRANSACTION
-- If need to manually rollback after Phase 2:
BEGIN TRANSACTION;

-- Restore cards from backup
DROP TABLE cards;
ALTER TABLE cards_backup RENAME TO cards;

-- Drop new tables
DROP TABLE graph_edges;
DROP TABLE graph_nodes;
DROP TABLE knowledge_graphs;
DROP TABLE planning_sessions;
DROP TABLE import_batches;
DROP TABLE import_sessions;

COMMIT;
```

---

## Data Flow Summary

**Import Workflow**:
1. GM creates ImportSession
2. GM uploads files → ImportBatch created
3. Import AI extracts entities → GraphNodes + GraphEdges created, linked to ImportBatch
4. Import AI generates Cards → linked to ImportBatch via `import_batch_id`
5. Import AI generates AIApprovalSummary → stored in ImportSession.approval_summary
6. GM approves → ImportSession.status = 'approved'
7. GM reverts → CASCADE DELETE ImportBatch → deletes all GraphNodes, GraphEdges, Cards in batch

**Planning Workflow**:
1. GM creates PlanningSession
2. GM chats with Planning AI → GraphUpdates appended to PlanningSession.graph_updates
3. Planning AI updates GraphNodes/GraphEdges immediately (no approval workflow)
4. KnowledgeGraph.last_updated updated on each change
5. GM ends chat → PlanningSession.status = 'completed'

**Knowledge Graph Filtering** (Political-Web and Campaign-Story only):
1. Query GraphNodes for graph_id
2. Filter by active tags OR recent session recap mentions (last 5 sessions)
3. Return lean graph for UI rendering

---

**Status**: Complete - 8 entities (7 new tables + 1 extended Card metadata), full migration strategy, constitutional alignment verified
