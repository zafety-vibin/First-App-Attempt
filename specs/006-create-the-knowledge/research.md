# Research Findings: Knowledge Graph Architecture

**Feature**: 006-create-the-knowledge
**Date**: 2025-10-01
**Phase**: Phase 0 - Technical Research

---

## 1. Graph Storage Patterns in SQLite

**Decision**: Separate tables for nodes and edges with JSONB attributes, adjacency list pattern

**Rationale**:
- Separate tables enable proper foreign key constraints and indexing
- JSONB for attributes allows user-defined schemas without ALTER TABLE
- Adjacency list pattern (edges reference source/target node IDs) enables efficient traversal
- JSON1 extension provides querying capabilities for free-form attributes

**Implementation**:
```sql
CREATE TABLE knowledge_graphs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  graph_type TEXT NOT NULL, -- World-Foundations, Political-Web, etc.
  graph_name TEXT NOT NULL,
  toggle_state INTEGER NOT NULL DEFAULT 1 CHECK(toggle_state IN (0,1)),
  maintenance_rules TEXT, -- JSONB
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  current_version_id TEXT,
  backup_version_id TEXT,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, graph_name)
);

CREATE TABLE graph_nodes (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  node_type TEXT NOT NULL, -- user-defined: NPC, Location, etc.
  name TEXT NOT NULL,
  attributes TEXT NOT NULL, -- JSONB free-form
  observations TEXT, -- free-form text for cross-graph context
  information_level_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (information_level_id) REFERENCES information_levels(id)
);

CREATE TABLE graph_edges (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  edge_type TEXT NOT NULL, -- user-defined relationship label
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  directed INTEGER NOT NULL DEFAULT 1 CHECK(directed IN (0,1)),
  metadata TEXT, -- JSONB optional
  created_at INTEGER NOT NULL,
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (source_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
);

CREATE INDEX idx_graph_nodes_graph_id ON graph_nodes(graph_id);
CREATE INDEX idx_graph_edges_graph_id ON graph_edges(graph_id);
CREATE INDEX idx_graph_edges_source ON graph_edges(source_node_id);
CREATE INDEX idx_graph_edges_target ON graph_edges(target_node_id);
```

**Alternatives Considered**:
- **Single JSONB blob per graph**: Simpler but loses referential integrity, harder to query, no indexes
- **Materialized path**: Good for hierarchies but graphs have arbitrary connections
- **Graph database (Neo4j)**: Overkill for prototype, adds deployment complexity, violates Local-Only principle

---

## 2. Graph Versioning Strategies

**Decision**: Snapshot-based versioning with full graph copy (1 current + 1 backup)

**Rationale**:
- Simplest implementation for prototype (no delta computation)
- 1-deep backup requirement makes storage overhead acceptable
- Full snapshot enables instant restore without replay logic
- JSONB storage makes serialization straightforward

**Implementation**:
```sql
CREATE TABLE graph_versions (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  snapshot_content TEXT NOT NULL, -- JSONB: {nodes: [...], edges: [...], metadata: {...}}
  version_type TEXT NOT NULL CHECK(version_type IN ('current', 'backup')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_graph_versions_current ON graph_versions(graph_id, version_type)
  WHERE version_type = 'current';
CREATE UNIQUE INDEX idx_graph_versions_backup ON graph_versions(graph_id, version_type)
  WHERE version_type = 'backup';
```

**Workflow**:
1. Before update: Copy current version to backup (delete old backup)
2. Apply update to nodes/edges tables
3. Create new current version snapshot
4. Update knowledge_graphs.current_version_id and backup_version_id

**Restore Workflow**:
1. Load backup version snapshot
2. Delete all nodes/edges for graph
3. Recreate nodes/edges from snapshot
4. Swap backup → current version

**Alternatives Considered**:
- **Delta-based versioning**: More storage-efficient but complex to implement, restore requires replay
- **Full version history**: Violates 1-deep requirement, unnecessary for prototype
- **Git-style diffing**: Overkill for prototype, adds complexity

---

## 3. Cross-Graph Query Patterns

**Decision**: Free-form observation text with LLM-based interpretation, no hard linking

**Rationale**:
- Spec explicitly states "entirely free-form; Planning AI interprets"
- No complex join logic or foreign key constraints needed
- LLM context window can include multiple graph serializations
- User flexibility in defining cross-graph relationships

**Implementation Pattern**:
```typescript
// Service method
async queryCrossGraph(campaignId: string, query: string, toggledGraphIds: string[]): Promise<string> {
  // 1. Load all toggled graphs with nodes and edges
  const graphs = await this.loadGraphs(campaignId, toggledGraphIds);

  // 2. Filter nodes by information level (if Player View)
  const filteredGraphs = this.applyInformationFiltering(graphs, viewMode);

  // 3. Serialize graphs to context
  const graphContext = filteredGraphs.map(g => ({
    name: g.graph_name,
    type: g.graph_type,
    nodes: g.nodes.map(n => ({
      type: n.node_type,
      name: n.name,
      attributes: JSON.parse(n.attributes),
      observations: n.observations
    })),
    edges: g.edges.map(e => ({
      type: e.edge_type,
      source: e.source_node_id,
      target: e.target_node_id
    }))
  }));

  // 4. Build LLM prompt with graph context + user query
  const prompt = `
You have access to the following knowledge graphs:
${JSON.stringify(graphContext, null, 2)}

User query: ${query}

Answer the query using information from the provided graphs. Pay attention to observations in nodes for cross-graph references (e.g., "current location: Waterdeep").
`;

  // 5. Call LLM via Planning AI service
  return await PlanningAIService.chat(campaignId, prompt);
}
```

**Cross-Graph Example**:
- Political-Web node: `{name: "Lord Neverember", attributes: {...}, observations: "current location: Waterdeep"}`
- Geographical node: `{name: "Waterdeep", attributes: {description: "City of Splendors"}, ...}`
- LLM interprets the observation and connects the graphs contextually

**Alternatives Considered**:
- **Hard foreign key links**: Violates spec's "free-form" requirement, adds schema complexity
- **Separate cross-graph table**: Overkill for prototype, not needed per spec
- **Fuzzy string matching**: Not needed, LLM does interpretation naturally

---

## 4. Toggle State Persistence

**Decision**: Campaign-level toggle state stored in knowledge_graphs table, no session overrides

**Rationale**:
- Spec says "Persistence approach uses easiest implementation"
- Campaign-level state is simplest (no session management)
- Single source of truth reduces bugs
- User can manually toggle before each Planning AI session

**Implementation**:
```sql
-- Already in knowledge_graphs table from Research #1
toggle_state INTEGER NOT NULL DEFAULT 1 CHECK(toggle_state IN (0,1))
```

**Service Logic**:
```typescript
async getActiveGraphs(campaignId: string): Promise<KnowledgeGraph[]> {
  return db.prepare(`
    SELECT * FROM knowledge_graphs
    WHERE campaign_id = ? AND toggle_state = 1
  `).all(campaignId);
}

async toggleGraph(graphId: string, state: boolean): Promise<void> {
  // Before toggle off: Create backup version
  if (!state) {
    await this.createBackupVersion(graphId);
  }

  db.prepare(`
    UPDATE knowledge_graphs
    SET toggle_state = ?, updated_at = ?
    WHERE id = ?
  `).run(state ? 1 : 0, Date.now(), graphId);
}
```

**Alternatives Considered**:
- **Session-based toggles**: More complex, requires session state management, not needed for prototype
- **Per-query toggle override**: Adds API complexity, spec doesn't require it
- **User preference table**: Overkill for boolean flag

---

## 5. Graph Visualization Libraries

**Decision**: Deferred to Phase 3+ (optional), recommend react-force-graph if implemented

**Rationale**:
- Spec explicitly states "optional canvas visualization"
- Core functionality (graph CRUD, toggles, versioning) is priority
- Can validate feature without visualization
- React-force-graph has good 3D/2D support and WebGL performance

**Recommendation for Future Implementation**:
- **Library**: react-force-graph (https://github.com/vasturiano/react-force-graph)
- **Rendering**: Canvas via force-directed layout
- **Features**: Zoom, pan, node click for editing, edge highlighting
- **Integration**: Separate component, optional page in frontend

**Quick Prototype Approach** (if needed for validation):
- Simple D3.js force-directed layout
- SVG rendering for < 50 nodes
- No zoom/pan for prototype

**Alternatives Considered**:
- **vis-network**: Heavyweight, dated UI
- **cytoscape.js**: Complex API, overkill for prototype
- **Manual canvas drawing**: Too much implementation work

**Decision**: Start without visualization, add if users request during validation

---

## 6. Planning AI Integration Points

**Decision**: Extend existing Planning AI workflow from Feature 005 with graph-aware prompts

**Rationale**:
- Feature 005 already has Planning AI chat interface and SSE streaming
- Reuse existing LLM service and conversation state
- Graph context injection is additive, not disruptive

**Integration Points**:

### 6A. Graph Creation Flow
```typescript
// User: "Create a Political-Web graph tracking faction relationships"
// Planning AI detects graph creation intent via system prompt

async handleGraphCreationRequest(campaignId: string, userMessage: string): Promise<void> {
  const systemPrompt = `
You are helping a Game Master create a knowledge graph for their TTRPG campaign.

Available graph types: World-Foundations, Political-Web, Geographical, Campaign-Story, or custom

User request: ${userMessage}

Extract:
1. Graph type
2. Graph name
3. Node types (e.g., Faction, NPC, Location)
4. Edge types (e.g., "allied with", "at war with")
5. Initial content from user's description

Respond in JSON format:
{
  "graph_type": "...",
  "graph_name": "...",
  "node_types": ["...", "..."],
  "edge_types": ["...", "..."],
  "initial_nodes": [{name: "...", type: "...", attributes: {...}}],
  "initial_edges": [{source: "...", target: "...", type: "..."}]
}
`;

  const llmResponse = await LLMService.chat(systemPrompt, userMessage);
  const graphData = JSON.parse(llmResponse);

  // Show approval UI with preview
  return graphData; // Frontend displays for user approval
}
```

### 6B. Graph Update Flow
```typescript
// User: "Add the Zhentarim faction and mark them as enemies of the Harpers"
// Planning AI updates existing graph

async handleGraphUpdateRequest(
  campaignId: string,
  graphId: string,
  userMessage: string
): Promise<void> {
  // Load current graph state
  const graph = await this.getGraph(graphId);

  const systemPrompt = `
You are updating an existing knowledge graph.

Current graph state:
${JSON.stringify(graph, null, 2)}

User request: ${userMessage}

Extract changes in JSON format:
{
  "nodes_to_add": [{...}],
  "nodes_to_update": [{id: "...", changes: {...}}],
  "nodes_to_delete": ["id1", "id2"],
  "edges_to_add": [{...}],
  "edges_to_delete": ["id1"]
}
`;

  const llmResponse = await LLMService.chat(systemPrompt, userMessage);
  const changes = JSON.parse(llmResponse);

  // Create backup before applying
  await GraphVersionService.createBackup(graphId);

  // Apply changes
  await this.applyGraphChanges(graphId, changes);
}
```

### 6C. Cross-Graph Query Injection
```typescript
// When user chats with Planning AI, inject toggled graphs as context

async chatWithPlanningAI(campaignId: string, userMessage: string): Promise<string> {
  // Get toggled-on graphs
  const activeGraphs = await KnowledgeGraphService.getActiveGraphs(campaignId);

  const graphContext = this.serializeGraphsForContext(activeGraphs);

  const systemPrompt = `
You are a planning assistant for a TTRPG Game Master.

Knowledge graphs available:
${graphContext}

Use the knowledge graphs to provide context-aware answers. Reference specific nodes, edges, and observations when relevant.

User question: ${userMessage}
`;

  return await LLMService.chat(systemPrompt, userMessage);
}
```

**Structured Output Format**:
- Use JSON Schema validation for LLM responses
- OpenAI function calling / Anthropic tools for structured extraction
- Fallback to regex parsing if needed

**Alternatives Considered**:
- **Separate graph creation UI**: Not needed, spec requires chat-based interface
- **Manual node-by-node entry**: Violates Workflow-First principle
- **Natural language parsing without LLM**: Too brittle, LLM is better for intent extraction

---

## 7. Maintenance Rule Automation

**Decision**: Deferred to Phase 3+ (opt-in automation), provide manual pruning tools first

**Rationale**:
- Spec states "opt-in" and "user can preview, modify, or disable"
- Core graph functionality is priority
- Manual pruning validates use cases before automation
- Simplifies initial implementation

**Recommendation for Future Implementation**:

### Predefined Template Rules
```typescript
interface MaintenanceRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  config: {
    strategy: 'time-based' | 'tag-based' | 'graduated-detail';
    params: Record<string, any>;
  };
}

// Example: Time-based pruning
const timeBasedPruning: MaintenanceRule = {
  name: "Archive Old Sessions",
  description: "Keep only last N session recaps in Campaign-Story graph",
  strategy: 'time-based',
  params: {
    retention_count: 10,
    archive_older: true
  }
};

// Example: Graduated detail retention
const graduatedDetail: MaintenanceRule = {
  name: "Graduated Detail",
  description: "Recent sessions: full detail. 10+ sessions ago: summary only. 50+ sessions: archive",
  strategy: 'graduated-detail',
  params: {
    tiers: [
      {age_threshold: 0, detail_level: 'full'},
      {age_threshold: 10, detail_level: 'summary'},
      {age_threshold: 50, detail_level: 'archived'}
    ]
  }
};
```

### Execution Pattern
```typescript
async applyMaintenanceRules(graphId: string): Promise<void> {
  const graph = await this.getGraph(graphId);

  if (!graph.maintenance_rules) return;

  const rules: MaintenanceRule[] = JSON.parse(graph.maintenance_rules);
  const enabledRules = rules.filter(r => r.enabled);

  for (const rule of enabledRules) {
    // Preview changes first
    const preview = await this.previewRuleExecution(graphId, rule);

    // User approval required
    const approved = await this.requestUserApproval(preview);

    if (approved) {
      await this.executeRule(graphId, rule);
    }
  }
}
```

**Manual Pruning Tools** (implement first):
- UI to select nodes by age/tag and delete batch
- Preview before deletion
- Backup created before pruning

**Alternatives Considered**:
- **Fully automatic**: Violates Transparency & User Approval principle
- **AI-suggested pruning**: Interesting but not in spec, defer to user feedback
- **No maintenance features**: Users will need this for large campaigns, manual tools sufficient for prototype

---

## Summary of Decisions

| Research Topic | Decision | Key Rationale |
|----------------|----------|---------------|
| Graph Storage | Separate tables (nodes, edges) with JSONB attributes | Proper constraints, indexing, user-defined schemas |
| Versioning | Snapshot-based (full copy), 1 current + 1 backup | Simplest for prototype, instant restore |
| Cross-Graph Queries | Free-form observations + LLM interpretation | Per spec, no hard linking needed |
| Toggle Persistence | Campaign-level state in knowledge_graphs table | Simplest implementation |
| Visualization | Deferred (optional), recommend react-force-graph | Not required for core functionality |
| Planning AI Integration | Extend Feature 005 with graph-aware prompts | Reuse existing infrastructure |
| Maintenance Rules | Deferred (opt-in), manual pruning tools first | Validate use cases before automation |

**All NEEDS CLARIFICATION resolved**: No ambiguities remain from Technical Context.

**Ready for Phase 1**: Design artifacts (data-model.md, contracts, quickstart.md)
