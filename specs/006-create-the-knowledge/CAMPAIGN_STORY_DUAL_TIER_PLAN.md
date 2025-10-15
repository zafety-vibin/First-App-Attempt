# Campaign-Story Memory: Dual-Tier Implementation Plan

## Executive Summary

Implement dual-tier architecture for Campaign-Story memory system:
- **Tier 1 (Narrative)**: Permanent story content (sessions, events, decisions, plot threads)
- **Tier 2 (Metadata)**: Time-windowed audit logs (import batches, database changes)

This plan extends existing Feature 006 knowledge graph infrastructure with minimal schema changes.

---

## Current State Analysis

### Existing Infrastructure ✅
- `knowledge_graphs` table with graph_type support
- `graph_nodes` table with flexible node_type field
- `graph_edges` table with flexible edge_type field
- GraphNode.attributes JSONB for arbitrary data
- GraphNode.observations array for temporal content
- Confidence decay system with pinned flag
- Information level filtering integration

### What Already Works
- Campaign-Story graph type is recognized
- Node types are user-defined strings (can be "session_recap", "import_batch", etc.)
- Edge types are user-defined strings (can be "preceded_by", "logged_during_session", etc.)
- GraphNode.confidence calculated on-demand (not stored)
- GraphNode.pinned prevents decay

### What Needs Extension
1. **Temporal Anchors**: Add session_number, in_game_date, real_world_date to attributes
2. **Tier System**: Add tier field to distinguish narrative from metadata
3. **Pruning Mechanism**: Build service to auto-delete old metadata nodes
4. **Query Filtering**: Default to tier="narrative" in API responses
5. **Session Import Workflow**: Auto-create import_batch nodes on recap import
6. **Change Detection**: Track database changes between sessions

---

## Schema Extensions

### Option A: No Schema Migration (Use Attributes) ⭐ RECOMMENDED

**Leverage existing JSONB flexibility:**

```typescript
// Narrative Node
{
  node_type: "session_recap",
  name: "Session 5: The Fall of Zhaerith",
  attributes: {
    tier: "narrative",                    // NEW: tier discriminator
    session_number: 5,                    // NEW: temporal anchor
    in_game_date: "Day 6, March 15th",   // NEW: temporal anchor
    real_world_date: "2025-04-20",       // NEW: temporal anchor
    days_elapsed_total: 6                 // NEW: cumulative time
  },
  observations: [
    { text: "Party defeated Zhaerith...", created_at: 1713628800, last_accessed: 1713628800 }
  ],
  pinned: false, // Story nodes can be pinned to preserve confidence
  confidence: 1.0 // High confidence for player experience
}

// Metadata Node
{
  node_type: "import_batch",
  name: "Session 5 Import Batch",
  attributes: {
    tier: "metadata",                     // NEW: tier discriminator
    logged_session: 5,                    // NEW: which session this logs
    session_number: 5,                    // NEW: temporal anchor (same as logged_session)
    prune_after_session: 55,              // NEW: auto-deletion trigger
    import_date: "2025-04-20T14:30:00Z"   // NEW: when import occurred
  },
  observations: [
    { text: "Added NPC: Councilor Myra Cael to political-web-memory", ... },
    { text: "Updated Location: Null-Factorium corruption status", ... }
  ],
  pinned: false, // Never pin metadata
  confidence: 0.1 // Static low confidence
}
```

**Advantages:**
- ✅ Zero schema migration required
- ✅ Existing indexes and queries work unchanged
- ✅ JSONB attributes already flexible
- ✅ Fast implementation (days, not weeks)

**Disadvantages:**
- ❌ No database-level type safety on tier field
- ❌ Requires application-level validation
- ❌ Cannot create SQL index on attributes.tier directly

### Option B: Add Tier Column (Requires Migration)

```sql
ALTER TABLE graph_nodes ADD COLUMN tier TEXT CHECK(tier IN ('narrative', 'metadata'));
CREATE INDEX idx_graph_nodes_tier ON graph_nodes(tier);
```

**Advantages:**
- ✅ Database-level validation
- ✅ Direct SQL filtering: `WHERE tier = 'narrative'`
- ✅ Indexed queries faster

**Disadvantages:**
- ❌ Requires migration (backwards compatibility concerns)
- ❌ Slower to implement
- ❌ Must update all existing Campaign-Story nodes

**DECISION: Use Option A** - Leverage JSONB attributes for rapid prototyping.

---

## Implementation Phases

### Phase 1: Entity Type Taxonomy (Backend Models)

**Files to Create:**
- `backend/src/models/CampaignStoryEntities.ts`

**Content:**
```typescript
// Narrative Entity Types
export type NarrativeNodeType =
  | 'session_recap'
  | 'major_event'
  | 'player_decision'
  | 'plot_thread'
  | 'character_moment'
  | 'discovery'
  | 'quest_objective';

// Metadata Entity Types
export type MetadataNodeType =
  | 'import_batch'
  | 'database_addition_log'
  | 'database_modification_log'
  | 'clarification_note'
  | 'user_correction_log';

export type CampaignStoryNodeType = NarrativeNodeType | MetadataNodeType;

// Relationship Types
export type NarrativeRelationshipType =
  | 'preceded_by'
  | 'followed_by'
  | 'contains_event'
  | 'caused'
  | 'revealed'
  | 'led_to'
  | 'complicated_by'
  | 'resolved_by'
  | 'player_decided';

export type MetadataRelationshipType =
  | 'logged_during_session'
  | 'documents_addition'
  | 'documents_modification'
  | 'superseded_by'
  | 'expires_at_session';

export type BridgeRelationshipType = 'has_metadata_log';

export type CampaignStoryRelationshipType =
  | NarrativeRelationshipType
  | MetadataRelationshipType
  | BridgeRelationshipType;

// Temporal Anchor Interface
export interface TemporalAnchors {
  session_number: number;
  in_game_date?: string; // e.g., "Day 6, March 15th Year 500"
  real_world_date: string; // ISO 8601: "2025-04-20"
  days_elapsed_total?: number; // Cumulative in-game days
}

// Tier Discriminator
export type Tier = 'narrative' | 'metadata';

// Type Guards
export function isNarrativeNode(node_type: string): node_type is NarrativeNodeType {
  const narrativeTypes: NarrativeNodeType[] = [
    'session_recap', 'major_event', 'player_decision', 'plot_thread',
    'character_moment', 'discovery', 'quest_objective'
  ];
  return narrativeTypes.includes(node_type as NarrativeNodeType);
}

export function isMetadataNode(node_type: string): node_type is MetadataNodeType {
  const metadataTypes: MetadataNodeType[] = [
    'import_batch', 'database_addition_log', 'database_modification_log',
    'clarification_note', 'user_correction_log'
  ];
  return metadataTypes.includes(node_type as MetadataNodeType);
}

// Confidence Score Helpers
export function getDefaultConfidence(node_type: CampaignStoryNodeType): number {
  if (isMetadataNode(node_type)) return 0.1; // Static low confidence
  // Narrative nodes have variable confidence
  switch (node_type) {
    case 'session_recap':
    case 'player_decision':
      return 1.0; // Direct player experience
    case 'major_event':
    case 'discovery':
      return 0.9; // Witnessed events
    case 'plot_thread':
    case 'quest_objective':
      return 0.7; // Inferred from events
    case 'character_moment':
      return 0.8; // Observed character development
    default:
      return 0.5; // Fallback
  }
}
```

**Test:** Unit test for type guards and confidence helpers.

---

### Phase 2: Change Detection Service

**Files to Create:**
- `backend/src/services/DatabaseChangeDetectionService.ts`

**Purpose:** Track database modifications between sessions.

**Core Methods:**
```typescript
class DatabaseChangeDetectionService {
  // Take snapshot of current database state
  async captureSnapshot(campaignId: string): Promise<DatabaseSnapshot>;

  // Compare two snapshots and return diff
  async detectChanges(
    previousSnapshot: DatabaseSnapshot,
    currentSnapshot: DatabaseSnapshot
  ): Promise<DatabaseChanges>;

  // Filter changes by source (AI vs manual)
  filterChangesBySource(changes: DatabaseChanges, source: 'ai' | 'manual' | 'all'): DatabaseChanges;
}

interface DatabaseSnapshot {
  timestamp: number;
  session_number: number;
  entities: {
    npcs: { id: string; updated_at: number }[];
    locations: { id: string; updated_at: number }[];
    factions: { id: string; updated_at: number }[];
    items: { id: string; updated_at: number }[];
    // ... all category tables from Feature 014
  };
}

interface DatabaseChanges {
  additions: EntityChange[];
  modifications: EntityChange[];
}

interface EntityChange {
  entity_type: string; // 'npc', 'location', 'faction', etc.
  entity_id: string;
  entity_name: string;
  change_type: 'addition' | 'modification';
  memory_system: string; // 'political-web-memory', 'geographic-memory', etc.
  details: string; // Human-readable description
}
```

**Implementation:**
1. Query all Feature 014 category tables
2. Compare `created_at` timestamps against last session import timestamp
3. Compare `updated_at` timestamps to detect modifications
4. Build EntityChange objects with context

**Test:** Integration test comparing snapshots.

---

### Phase 3: Session Import Workflow Service

**Files to Create:**
- `backend/src/services/SessionImportService.ts`

**Purpose:** Orchestrate session recap import with automatic metadata logging.

**Workflow:**
```typescript
class SessionImportService {
  async importSessionRecap(
    campaignId: string,
    graphId: string,
    recapData: SessionRecapInput
  ): Promise<SessionImportResult> {
    // 1. Create narrative session_recap node
    const recapNode = await this.createSessionRecapNode(campaignId, graphId, recapData);

    // 2. Detect database changes since last session
    const changes = await this.detectChangesSinceLastSession(campaignId, recapNode.session_number);

    // 3. Create import_batch metadata node if changes exist
    let batchNode: GraphNode | null = null;
    if (changes.additions.length > 0 || changes.modifications.length > 0) {
      batchNode = await this.createImportBatchNode(campaignId, graphId, recapNode, changes);
    }

    // 4. Create bridge relationship: recap ─[has_metadata_log]→ batch
    if (batchNode) {
      await this.createBridgeEdge(graphId, recapNode.id, batchNode.id);
    }

    // 5. Link to previous session: prev ─[followed_by]→ current
    await this.linkToPreviousSession(graphId, recapNode);

    // 6. Check for pruning trigger
    await this.checkAndPruneOldMetadata(campaignId, graphId, recapNode.session_number);

    return { recapNode, batchNode, changes };
  }

  private async detectChangesSinceLastSession(
    campaignId: string,
    currentSessionNumber: number
  ): Promise<DatabaseChanges> {
    // Get previous session's import timestamp
    const previousSession = await this.getPreviousSessionRecap(campaignId, currentSessionNumber - 1);
    if (!previousSession) return { additions: [], modifications: [] };

    const previousTimestamp = previousSession.attributes.import_date || previousSession.created_at;

    // Capture current snapshot
    const currentSnapshot = await changeDetectionService.captureSnapshot(campaignId);

    // Filter entities created/modified after previous timestamp
    return this.buildChangesFromTimestamp(campaignId, previousTimestamp);
  }
}
```

**Test:** Integration test with mock database changes.

---

### Phase 4: Metadata Pruning Service

**Files to Create:**
- `backend/src/services/MetadataPruningService.ts`

**Purpose:** Auto-delete metadata nodes older than retention window.

**Core Logic:**
```typescript
class MetadataPruningService {
  private RETENTION_WINDOW = 50; // sessions

  async pruneOldMetadata(
    campaignId: string,
    graphId: string,
    currentSessionNumber: number
  ): Promise<PruneResult> {
    // Calculate prune target
    const pruneTarget = currentSessionNumber - this.RETENTION_WINDOW;
    if (pruneTarget <= 0) return { deleted: 0 }; // Too early to prune

    // Query metadata nodes eligible for pruning
    const eligibleNodes = await graphNodeService.listNodes(campaignId, graphId, {
      filters: {
        node_type: 'import_batch', // Only metadata nodes
        'attributes.prune_after_session': { $lte: currentSessionNumber }
      }
    });

    // Delete nodes and their edges
    let deleted = 0;
    for (const node of eligibleNodes) {
      await graphNodeService.deleteNode(campaignId, graphId, node.id);
      deleted++;
    }

    return { deleted, pruneTarget };
  }

  // Override retention window per campaign
  setRetentionWindow(sessions: number): void {
    this.RETENTION_WINDOW = sessions;
  }
}
```

**Test:** Unit test with mock old metadata nodes.

---

### Phase 5: Query Filtering Middleware

**Files to Modify:**
- `backend/src/routes/graph-nodes.ts`
- `backend/src/services/GraphNodeService.ts`

**Purpose:** Default API queries to narrative tier only.

**Middleware:**
```typescript
// Add query parameter: ?tier=narrative|metadata|all
router.get('/campaigns/:campaignId/graphs/:graphId/nodes', async (req, res) => {
  const { tier = 'narrative' } = req.query;

  // Validate tier
  if (!['narrative', 'metadata', 'all'].includes(tier as string)) {
    return res.status(400).json({ error: 'Invalid tier parameter' });
  }

  const filters: any = {};

  if (tier !== 'all') {
    // Filter by tier in attributes
    filters['attributes.tier'] = tier;
  }

  const nodes = await graphNodeService.listNodes(
    req.params.campaignId,
    req.params.graphId,
    { filters }
  );

  res.json(nodes);
});
```

**GraphNodeService Extension:**
```typescript
class GraphNodeService {
  async listNodes(
    campaignId: string,
    graphId: string,
    options?: {
      filters?: Record<string, any>;
      tier?: 'narrative' | 'metadata' | 'all'; // NEW
    }
  ): Promise<GraphNode[]> {
    let query = `SELECT * FROM graph_nodes WHERE graph_id = ?`;
    const params: any[] = [graphId];

    // Apply tier filter
    if (options?.tier && options.tier !== 'all') {
      // Use JSON_EXTRACT for SQLite JSONB querying
      query += ` AND JSON_EXTRACT(attributes, '$.tier') = ?`;
      params.push(options.tier);
    }

    // ... rest of query logic
  }
}
```

**Test:** Contract test verifying tier filtering.

---

### Phase 6: Frontend Campaign-Story Page

**Files to Modify:**
- `frontend/src/pages/CampaignStoryPage.tsx`

**Features:**
1. **Timeline visualization** with vis-timeline or similar library
2. **Tier toggle**: Show narrative only (default) or include metadata
3. **Session list** with expand/collapse for metadata logs
4. **Temporal anchors** displayed for each session

**Mock UI:**
```
┌─────────────────────────────────────────────────────────┐
│  Campaign Story Timeline                                │
│  ○ Narrative Only  ● Include Metadata Logs              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Session 3 ───> Session 4 ───> Session 5               │
│  Day 4          Day 5          Day 6                    │
│  2025-03-15     2025-03-29     2025-04-20               │
│                                                         │
│  [Expand Session 5]                                     │
│    • Party defeated Zhaerith                            │
│    • Vein of Flesh destroyed (2/12)                     │
│    • Chrome Bishop network silent                       │
│                                                         │
│    [Metadata Log]                                       │
│      Added: Councilor Myra Cael (Political-Web)        │
│      Updated: Null-Factorium corruption status          │
│      Modified: Zhaerith → Permanently Dead              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Test:** E2E test with Playwright.

---

## API Endpoints

### New Endpoints

**POST /api/campaigns/:campaignId/graphs/:graphId/sessions/import**
```json
{
  "session_number": 5,
  "in_game_date": "Day 6, March 15th Year 500",
  "real_world_date": "2025-04-20",
  "days_elapsed_total": 6,
  "observations": [
    "Party defeated Zhaerith the False Paragon",
    "Vein of Flesh permanently destroyed (2/12 Veins)"
  ],
  "detect_changes": true // Auto-create import_batch
}
```

**Response:**
```json
{
  "recap_node": { "id": "...", "name": "Session 5", ... },
  "batch_node": { "id": "...", "name": "Session 5 Import Batch", ... },
  "changes": {
    "additions": [...],
    "modifications": [...]
  }
}
```

**GET /api/campaigns/:campaignId/graphs/:graphId/nodes?tier=narrative**
- Query parameter: `tier=narrative|metadata|all`
- Defaults to `narrative`

**POST /api/campaigns/:campaignId/graphs/:graphId/metadata/prune**
```json
{
  "retention_window": 50 // Optional override
}
```

**Response:**
```json
{
  "deleted": 5,
  "prune_target_session": 5
}
```

---

## Testing Strategy

### Unit Tests
- `CampaignStoryEntities.test.ts` - Type guards, confidence helpers
- `DatabaseChangeDetectionService.test.ts` - Snapshot diff logic
- `MetadataPruningService.test.ts` - Pruning calculations

### Integration Tests
- `sessionImportWorkflow.test.ts` - Full import flow with change detection
- `metadataPruning.test.ts` - Pruning with real database state
- `tierFiltering.test.ts` - Query filtering by tier

### Contract Tests
- `campaign-story-import.contract.test.ts` - Session import endpoint
- `campaign-story-query.contract.test.ts` - Tier filtering endpoint

### E2E Tests
- `campaignStoryTimeline.e2e.test.ts` - Timeline visualization
- `sessionImportFlow.e2e.test.ts` - User imports session via UI

---

## Migration Path (Optional)

If we later decide to add `tier` column to `graph_nodes`:

```sql
-- Migration 006b: Add tier column to graph_nodes
ALTER TABLE graph_nodes ADD COLUMN tier TEXT CHECK(tier IN ('narrative', 'metadata'));
CREATE INDEX idx_graph_nodes_tier ON graph_nodes(tier);

-- Backfill existing Campaign-Story nodes
UPDATE graph_nodes
SET tier = CASE
  WHEN node_type IN ('session_recap', 'major_event', 'player_decision', 'plot_thread', 'character_moment', 'discovery', 'quest_objective')
    THEN 'narrative'
  WHEN node_type IN ('import_batch', 'database_addition_log', 'database_modification_log', 'clarification_note', 'user_correction_log')
    THEN 'metadata'
  ELSE NULL
END
WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE graph_type = 'Campaign-Story');
```

---

## Timeline Estimate

| Phase | Task | Estimate | Dependencies |
|-------|------|----------|--------------|
| 1 | Entity type taxonomy | 2 hours | None |
| 2 | Change detection service | 4 hours | Feature 014 tables |
| 3 | Session import workflow | 6 hours | Phase 1, 2 |
| 4 | Metadata pruning service | 3 hours | Phase 1 |
| 5 | Query filtering middleware | 3 hours | Phase 1 |
| 6 | Frontend timeline page | 8 hours | Phase 3, 5 |
| Testing | Unit + integration + E2E | 6 hours | All phases |
| **Total** | | **32 hours** (~4 days) | |

---

## Success Criteria

- ✅ Session recap import creates both narrative and metadata nodes
- ✅ Database changes automatically detected and logged
- ✅ Metadata nodes auto-prune after 50 sessions
- ✅ API queries default to narrative tier (metadata excluded)
- ✅ Frontend timeline shows sessions with expandable metadata logs
- ✅ Temporal anchors (in-game + real-world dates) tracked
- ✅ Bridge relationships link recaps to import batches
- ✅ AI temporal awareness: "Councilor Myra, who you met 12 sessions ago..."

---

## Next Steps

1. **Review this plan** - Confirm approach before implementation
2. **Start with Phase 1** - Entity taxonomy (quick win)
3. **Prototype Phase 3** - Session import workflow (core feature)
4. **Iterate on UI** - Timeline visualization (user-facing value)

Ready to begin implementation?
