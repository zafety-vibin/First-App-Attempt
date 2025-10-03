# Research: AI Import and Planning Workflows (Part 2)

**Continuation from research.md line 570**
**Updated**: 2025-10-03 - References to MCPService corrected to LLMOrchestrationService

---

## Research Area 3: Entity Extraction & Deduplication

### Problem Statement
Import AI must extract characters, locations, factions, events from unstructured notes, then deduplicate against existing campaign cards to distinguish updates from new additions. Need fuzzy matching ("Dagult Neverember" vs "Lord Neverember"), confidence scoring, and single-pass extraction strategy.

### Research Findings

**LLM-Based NER (Named Entity Recognition)** more flexible than rule-based for D&D content.

**Prompt Template for Entity Extraction**:
```typescript
export function buildEntityExtractionPrompt(existingCards: Card[]): string {
  const existingCharacters = existingCards
    .filter((c) => c.type === 'page' && c.metadata?.entityType === 'character')
    .map((c) => c.title);

  const existingLocations = existingCards
    .filter((c) => c.type === 'page' && c.metadata?.entityType === 'location')
    .map((c) => c.title);

  return `
You are an entity extraction assistant for a D&D campaign wiki. Extract ALL mentioned entities from user notes.

EXISTING CHARACTERS IN CAMPAIGN: ${existingCharacters.join(', ') || 'None'}
EXISTING LOCATIONS IN CAMPAIGN: ${existingLocations.join(', ') || 'None'}

For each entity you find, classify as:
- **UPDATE** if it matches an existing entity (fuzzy match names, aliases, titles)
- **NEW** if it's a new entity not yet in the campaign

Entity types:
- characters (NPCs, player characters, monsters with names)
- locations (cities, buildings, regions, dungeons)
- factions (organizations, guilds, political groups)
- events (battles, meetings, plot developments)

Return JSON:
{
  "characters": [
    { "name": "Dagult Neverember", "type": "update", "existingName": "Lord Neverember", "confidence": 0.9, "context": "mentioned as leader of Council" }
  ],
  "locations": [...],
  "factions": [...],
  "events": [...]
}

Rules:
- Use "confidence" (0.0-1.0) for uncertain matches
- Include "context" snippet from notes for clarification
- For UPDATE, provide "existingName" from the campaign
- Do NOT extract generic terms (e.g., "the party", "the council" unless specific name given)
`;
}
```

**Fuzzy Matching Algorithm** (Levenshtein distance):
```typescript
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function fuzzyMatch(extracted: string, existing: string): number {
  const distance = levenshteinDistance(extracted.toLowerCase(), existing.toLowerCase());
  const maxLength = Math.max(extracted.length, existing.length);
  return 1 - distance / maxLength; // 0.0 (no match) to 1.0 (exact match)
}

export function findBestMatch(extractedName: string, existingNames: string[]): {
  match: string | null;
  confidence: number;
} {
  let bestMatch: string | null = null;
  let bestConfidence = 0;

  for (const existing of existingNames) {
    const confidence = fuzzyMatch(extractedName, existing);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = existing;
    }
  }

  // Threshold: 0.7+ confidence = likely match
  return bestConfidence >= 0.7 ? { match: bestMatch, confidence: bestConfidence } : { match: null, confidence: 0 };
}
```

**Deduplication Service**:
```typescript
interface ExtractedEntity {
  name: string;
  type: 'character' | 'location' | 'faction' | 'event';
  confidence: number;
  context: string;
}

interface DeduplicatedEntity extends ExtractedEntity {
  action: 'update' | 'create';
  existingCardId?: string;
  existingName?: string;
}

export class EntityDeduplicationService {
  async deduplicate(
    extracted: ExtractedEntity[],
    existingCards: Card[]
  ): Promise<DeduplicatedEntity[]> {
    const results: DeduplicatedEntity[] = [];

    for (const entity of extracted) {
      const relevantCards = existingCards.filter(
        (c) => c.metadata?.entityType === entity.type
      );

      const existingNames = relevantCards.map((c) => c.title);
      const { match, confidence } = findBestMatch(entity.name, existingNames);

      if (match) {
        const existingCard = relevantCards.find((c) => c.title === match);
        results.push({
          ...entity,
          action: 'update',
          existingCardId: existingCard?.id,
          existingName: match,
          confidence,
        });
      } else {
        results.push({
          ...entity,
          action: 'create',
          confidence: 1.0,
        });
      }
    }

    return results;
  }

  // Identify entities needing clarification (confidence < 0.8)
  identifyClarifications(deduplicated: DeduplicatedEntity[]): DeduplicatedEntity[] {
    return deduplicated.filter((e) => e.confidence < 0.8);
  }
}
```

**LLM Clarification Prompt**:
```typescript
export function buildClarificationPrompt(uncertainEntities: DeduplicatedEntity[]): string {
  const questions = uncertainEntities.map((entity, i) => {
    if (entity.action === 'update') {
      return `${i + 1}. You mentioned "${entity.name}" (context: ${entity.context}). Is this the same as existing "${entity.existingName}"? (Confidence: ${Math.round(entity.confidence * 100)}%)`;
    } else {
      return `${i + 1}. You mentioned "${entity.name}" (context: ${entity.context}). Is this a new entity or does it refer to something already in the campaign?`;
    }
  });

  return `
I need clarification on ${questions.length} entities before proceeding:

${questions.join('\n')}

Please answer each question clearly.
`;
}
```

**Single-Pass Extraction** (comprehensive):
```typescript
// Single comprehensive pass preferred for prototype
export async function extractEntitiesComprehensive(
  notes: string,
  existingCards: Card[],
  llmService: LLMOrchestrationService
): Promise<ExtractedEntity[]> {
  const systemPrompt = buildEntityExtractionPrompt(existingCards);

  const prompt = `
Extract ALL entities from these notes in a single pass:

${notes}

Be thorough. Don't miss any characters, locations, factions, or significant events.
`;

  const response = await llmService.completion(prompt, systemPrompt);
  const parsed = JSON.parse(response);

  return [
    ...parsed.characters,
    ...parsed.locations,
    ...parsed.factions,
    ...parsed.events,
  ];
}
```

### Decision
**LLM-based NER** with structured JSON output. **Single-pass comprehensive extraction** (not multi-pass) to minimize latency. **Fuzzy matching with Levenshtein distance** (threshold 0.7+). **Confidence scoring** (0.0-1.0) from LLM or fuzzy match. **Clarification phase** for entities <0.8 confidence. Deduplication service compares extracted entities against existing cards filtered by `metadata.entityType`.

### Alternatives Considered
- **Rule-based NER (spaCy, Stanford NER)**: Misses D&D-specific entities (character titles, fantasy locations). Rejected.
- **Multi-pass extraction**: Phase 1 characters, Phase 2 locations, etc. Too slow (3-5 LLM calls). Rejected.
- **Embeddings-based similarity**: Requires vector DB, overkill for <500 cards. Future enhancement. Rejected for prototype.
- **No deduplication**: Always create new cards. Defeats purpose of Import workflow. Rejected.

### Implementation Notes
- **LLM model choice**: GPT-4 recommended for entity extraction accuracy, GPT-3.5-turbo acceptable for cost
- **Context window**: Truncate notes >8k tokens, summarize middle sections with "... [content omitted] ..."
- **Entity classification**: Store `metadata.entityType` on cards for filtering during deduplication
- **Manual override**: User can mark "definitely new" or "definitely update X" during clarification

---

## Research Area 4: Knowledge Graph Storage in SQLite

### Problem Statement
Need to store four knowledge graphs (Geographical, Political-Web, World-Foundations, Campaign-Story) with nodes (entities), edges (relationships), and efficient querying for Planning AI context assembly. Must support graph traversal (BFS/DFS for relationship inference), active-party-relevant filtering for Political-Web/Campaign-Story, and GM inspection/editing.

### Research Findings

**Storage Strategies Compared**:
1. **Single JSONB column**: Entire graph in one JSON blob
2. **Normalized tables**: `graph_nodes`, `graph_edges` with FKs
3. **External graph DB**: Neo4j, ArangoDB

**Decision**: **Normalized tables** for query flexibility and incremental updates.

**Database Schema** (Feature 005 will create these tables):
```sql
-- Knowledge graph container
CREATE TABLE knowledge_graphs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('geographical', 'political-web', 'world-foundations', 'campaign-story')),
  last_updated TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE (campaign_id, type)
);

-- Graph nodes (entities in the graph)
CREATE TABLE graph_nodes (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'character', 'location', 'faction', 'event', 'concept', 'lore'
  name TEXT NOT NULL,
  attributes TEXT NOT NULL, -- JSONB: { description, aliases, properties }
  source_card_id TEXT, -- Card that created this node
  information_level_id TEXT, -- For tier-filtered queries (Feature 004 integration)
  created_at TEXT NOT NULL,
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (source_card_id) REFERENCES cards(id) ON DELETE SET NULL,
  FOREIGN KEY (information_level_id) REFERENCES information_levels(id)
);

CREATE INDEX idx_graph_nodes_graph_id ON graph_nodes(graph_id);
CREATE INDEX idx_graph_nodes_type ON graph_nodes(type);
CREATE INDEX idx_graph_nodes_name ON graph_nodes(name);

-- Graph edges (relationships between nodes)
CREATE TABLE graph_edges (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL, -- 'allies', 'enemies', 'located_in', 'member_of', 'caused_by'
  attributes TEXT NOT NULL, -- JSONB: { strength, active, description }
  source_card_id TEXT, -- Card that created this edge
  created_at TEXT NOT NULL,
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (from_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (to_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (source_card_id) REFERENCES cards(id) ON DELETE SET NULL
);

CREATE INDEX idx_graph_edges_graph_id ON graph_edges(graph_id);
CREATE INDEX idx_graph_edges_from_node ON graph_edges(from_node_id);
CREATE INDEX idx_graph_edges_to_node ON graph_edges(to_node_id);
CREATE INDEX idx_graph_edges_relationship ON graph_edges(relationship_type);
```

**TypeScript Models**:
```typescript
export interface KnowledgeGraph {
  id: string;
  campaignId: string;
  type: 'geographical' | 'political-web' | 'world-foundations' | 'campaign-story';
  lastUpdated: string;
  createdAt: string;
}

export interface GraphNode {
  id: string;
  graphId: string;
  type: 'character' | 'location' | 'faction' | 'event' | 'concept' | 'lore';
  name: string;
  attributes: {
    description?: string;
    aliases?: string[];
    properties?: Record<string, unknown>;
  };
  sourceCardId?: string;
  informationLevelId?: string;
  createdAt: string;
}

export interface GraphEdge {
  id: string;
  graphId: string;
  fromNodeId: string;
  toNodeId: string;
  relationshipType: string; // 'allies', 'enemies', 'located_in', 'member_of', 'caused_by', 'parent_of', 'ruled_by'
  attributes: {
    strength?: number; // 0.0-1.0
    active?: boolean; // For Political-Web/Campaign-Story filtering
    description?: string;
  };
  sourceCardId?: string;
  createdAt: string;
}
```

**Graph Query Service** (Feature 005 will implement, Feature 011's handlers will call):
```typescript
import { db } from '../db';

export class GraphService {
  // Get all nodes and edges for a graph
  async getGraph(graphId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const nodes = await db.prepare('SELECT * FROM graph_nodes WHERE graph_id = ?').all(graphId);
    const edges = await db.prepare('SELECT * FROM graph_edges WHERE graph_id = ?').all(graphId);

    return {
      nodes: nodes.map((n) => ({ ...n, attributes: JSON.parse(n.attributes) })),
      edges: edges.map((e) => ({ ...e, attributes: JSON.parse(e.attributes) })),
    };
  }

  // Get neighboring nodes (BFS for relationship inference)
  async getNeighbors(nodeId: string, depth = 1): Promise<GraphNode[]> {
    if (depth === 0) return [];

    const edges = await db.prepare(
      'SELECT * FROM graph_edges WHERE from_node_id = ? OR to_node_id = ?'
    ).all(nodeId, nodeId);

    const neighborIds = new Set<string>();
    edges.forEach((edge) => {
      if (edge.from_node_id !== nodeId) neighborIds.add(edge.from_node_id);
      if (edge.to_node_id !== nodeId) neighborIds.add(edge.to_node_id);
    });

    const neighbors = await db.prepare(
      `SELECT * FROM graph_nodes WHERE id IN (${Array.from(neighborIds).map(() => '?').join(',')})`
    ).all(...Array.from(neighborIds));

    if (depth > 1) {
      const deeperNeighbors = await Promise.all(
        Array.from(neighborIds).map((id) => this.getNeighbors(id, depth - 1))
      );
      return [...neighbors, ...deeperNeighbors.flat()];
    }

    return neighbors.map((n) => ({ ...n, attributes: JSON.parse(n.attributes) }));
  }

  // Filter active nodes (Political-Web, Campaign-Story)
  async getActiveNodes(graphId: string): Promise<GraphNode[]> {
    const edges = await db.prepare(
      'SELECT * FROM graph_edges WHERE graph_id = ? AND json_extract(attributes, "$.active") = 1'
    ).all(graphId);

    const activeNodeIds = new Set<string>();
    edges.forEach((edge) => {
      activeNodeIds.add(edge.from_node_id);
      activeNodeIds.add(edge.to_node_id);
    });

    if (activeNodeIds.size === 0) return [];

    const nodes = await db.prepare(
      `SELECT * FROM graph_nodes WHERE id IN (${Array.from(activeNodeIds).map(() => '?').join(',')})`
    ).all(...Array.from(activeNodeIds));

    return nodes.map((n) => ({ ...n, attributes: JSON.parse(n.attributes) }));
  }

  // Add node with deduplication
  async addNode(node: Omit<GraphNode, 'id' | 'createdAt'>): Promise<GraphNode> {
    // Check if node with same name already exists
    const existing = await db.prepare(
      'SELECT * FROM graph_nodes WHERE graph_id = ? AND name = ?'
    ).get(node.graphId, node.name);

    if (existing) {
      return { ...existing, attributes: JSON.parse(existing.attributes) };
    }

    const id = generateUUID();
    const createdAt = new Date().toISOString();

    await db.prepare(`
      INSERT INTO graph_nodes (id, graph_id, type, name, attributes, source_card_id, information_level_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      node.graphId,
      node.type,
      node.name,
      JSON.stringify(node.attributes),
      node.sourceCardId || null,
      node.informationLevelId || null,
      createdAt
    );

    return { id, ...node, createdAt };
  }

  // Add edge with deduplication
  async addEdge(edge: Omit<GraphEdge, 'id' | 'createdAt'>): Promise<GraphEdge> {
    // Check if edge already exists
    const existing = await db.prepare(`
      SELECT * FROM graph_edges
      WHERE graph_id = ? AND from_node_id = ? AND to_node_id = ? AND relationship_type = ?
    `).get(edge.graphId, edge.fromNodeId, edge.toNodeId, edge.relationshipType);

    if (existing) {
      // Update attributes if different
      await db.prepare(`
        UPDATE graph_edges SET attributes = ? WHERE id = ?
      `).run(JSON.stringify(edge.attributes), existing.id);

      return { ...existing, attributes: JSON.parse(existing.attributes) };
    }

    const id = generateUUID();
    const createdAt = new Date().toISOString();

    await db.prepare(`
      INSERT INTO graph_edges (id, graph_id, from_node_id, to_node_id, relationship_type, attributes, source_card_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      edge.graphId,
      edge.fromNodeId,
      edge.toNodeId,
      edge.relationshipType,
      JSON.stringify(edge.attributes),
      edge.sourceCardId || null,
      createdAt
    );

    return { id, ...edge, createdAt };
  }
}
```

**Political-Web "Active Party-Relevant" Filtering**:
```typescript
export async function updatePoliticalWebGraph(
  graphId: string,
  importedCards: Card[],
  sessionRecaps: Card[]
): Promise<void> {
  const graphService = new GraphService();

  // Get last 5 session recaps (recent = active)
  const recentRecaps = sessionRecaps.slice(-5);
  const recentCardIds = new Set(recentRecaps.map((r) => r.id));

  // Extract relationships from imported cards
  for (const card of importedCards) {
    const relationships = await extractRelationshipsFromCard(card);

    for (const rel of relationships) {
      // Only add if card is from recent sessions OR explicitly marked active
      const isRecent = recentCardIds.has(card.id);
      const isExplicitlyActive = card.metadata?.activeStoryThread === true;

      if (isRecent || isExplicitlyActive) {
        const fromNode = await graphService.addNode({
          graphId,
          type: 'faction',
          name: rel.from,
          attributes: { description: '' },
          sourceCardId: card.id,
        });

        const toNode = await graphService.addNode({
          graphId,
          type: 'faction',
          name: rel.to,
          attributes: { description: '' },
          sourceCardId: card.id,
        });

        await graphService.addEdge({
          graphId,
          fromNodeId: fromNode.id,
          toNodeId: toNode.id,
          relationshipType: rel.type,
          attributes: {
            active: true,
            strength: rel.strength,
            description: rel.description,
          },
          sourceCardId: card.id,
        });
      }
    }
  }

  // Mark old edges as inactive (mentioned >5 sessions ago)
  await db.prepare(`
    UPDATE graph_edges
    SET attributes = json_set(attributes, '$.active', 0)
    WHERE graph_id = ?
    AND source_card_id NOT IN (${recentCardIds.size > 0 ? Array.from(recentCardIds).map(() => '?').join(',') : 'NULL'})
  `).run(graphId, ...Array.from(recentCardIds));
}
```

### Decision
**Normalized tables** (`graph_nodes`, `graph_edges`) with JSONB `attributes` column for flexible properties. **SQLite JSON1 extension** for querying graph attributes. **Active filtering** via `attributes.active` boolean flag (Political-Web, Campaign-Story). **BFS neighbor queries** for relationship inference (depth 1-2). **Node/edge deduplication** by name and relationship type. Indexes on `graph_id`, `type`, `name`, `from_node_id`, `to_node_id`.

### Alternatives Considered
- **Single JSONB column**: Harder to query, requires full graph reload for updates. Rejected.
- **Neo4j graph DB**: Overkill for prototype, adds deployment complexity. Future enhancement. Rejected.
- **SQLite FTS5 for graph search**: Full-text search on node names/descriptions. Good future addition. Not needed for prototype.

### Implementation Notes
- **Graph size limits**: 10k nodes per graph type (Political-Web/Campaign-Story stay lean <1k)
- **Cascade deletion**: Deleting graph deletes all nodes/edges (ON DELETE CASCADE)
- **Information level integration**: `graph_nodes.information_level_id` for tier-filtered queries (Feature 004)
- **Source tracking**: `source_card_id` allows showing "this relationship from Session 8 recap"

---

## Research Area 5: Timeline Consistency Validation

### Problem Statement
Import AI must maintain strict consistency with established story events from Session Recaps database. Need to detect contradictions (event A after B, but B references A as past), parse dates/day counts, and validate timeline coherence using LLM-based checking.

### Research Findings

**Session Recaps as Authoritative Source**:
```typescript
interface SessionRecapEntry {
  sessionNumber: number;
  date: string; // Real-world date (YYYY-MM-DD)
  inWorldDate?: string; // In-game date (e.g., "15th of Mirtul, 1492 DR")
  dayCount?: number; // Days since campaign start
  events: string[]; // List of events that occurred
  notes: string; // Full session recap content
}

// Stored in Card.metadata for database entries in "Session Recaps" database
```

**Timeline Extraction Prompt**:
```typescript
export function buildTimelineExtractionPrompt(notes: string): string {
  return `
Extract timeline information from these session notes:

${notes}

Return JSON:
{
  "sessionNumber": <number>,
  "date": "<YYYY-MM-DD>", // Real-world session date
  "inWorldDate": "<in-game date if mentioned>",
  "dayCount": <days since campaign start, if mentioned>,
  "events": ["event 1", "event 2", ...],
  "timeReferences": ["morning", "three days later", "before the battle"]
}

Be precise about time references and sequencing.
`;
}
```

**Contradiction Detection Prompt**:
```typescript
export function buildContradictionCheckPrompt(
  newEvents: string[],
  existingTimeline: SessionRecapEntry[]
): string {
  const timelineContext = existingTimeline.map((recap) => `
Session ${recap.sessionNumber} (${recap.date}):
- In-world: ${recap.inWorldDate || 'Unknown'}
- Events: ${recap.events.join('; ')}
`).join('\n');

  return `
You are a timeline consistency checker for a D&D campaign.

EXISTING TIMELINE (Sessions 1-${existingTimeline.length}):
${timelineContext}

NEW EVENTS TO IMPORT:
${newEvents.join('\n')}

Check for contradictions:
1. Do new events reference past events that don't exist in timeline?
2. Do new events contradict established facts (e.g., character died in Session 3, but alive in new event)?
3. Are temporal references consistent (e.g., "three days after the battle" - which battle)?

Return JSON:
{
  "contradictions": [
    { "event": "...", "issue": "...", "severity": "high|medium|low" }
  ],
  "warnings": [
    { "event": "...", "issue": "..." }
  ],
  "isConsistent": true|false
}
`;
}
```

**Timeline Service**:
```typescript
import { db } from '../db';
import { LLMOrchestrationService } from './LLMOrchestrationService';

export class TimelineService {
  constructor(private llmService: LLMOrchestrationService) {}

  async getSessionRecaps(campaignId: string): Promise<SessionRecapEntry[]> {
    // Find "Session Recaps" database card
    const sessionRecapsDB = await db.prepare(`
      SELECT * FROM cards
      WHERE campaign_id = ? AND type = 'database' AND title = 'Session Recaps'
    `).get(campaignId);

    if (!sessionRecapsDB) return [];

    // Get all entries (child cards)
    const entries = await db.prepare(`
      SELECT * FROM cards
      WHERE parent_id = ? AND type = 'page'
      ORDER BY json_extract(metadata, '$.sessionNumber') ASC
    `).all(sessionRecapsDB.id);

    return entries.map((entry) => {
      const metadata = JSON.parse(entry.metadata);
      return {
        sessionNumber: metadata.sessionNumber || 0,
        date: metadata.date || '',
        inWorldDate: metadata.inWorldDate,
        dayCount: metadata.dayCount,
        events: metadata.events || [],
        notes: entry.content || '',
      };
    });
  }

  async extractTimeline(notes: string): Promise<SessionRecapEntry> {
    const prompt = buildTimelineExtractionPrompt(notes);
    const response = await this.llmService.completion(prompt, 'You are a timeline extraction assistant.');
    return JSON.parse(response);
  }

  async checkConsistency(
    newEvents: string[],
    campaignId: string
  ): Promise<{
    contradictions: Array<{ event: string; issue: string; severity: string }>;
    warnings: Array<{ event: string; issue: string }>;
    isConsistent: boolean;
  }> {
    const existingTimeline = await this.getSessionRecaps(campaignId);
    const prompt = buildContradictionCheckPrompt(newEvents, existingTimeline);

    const response = await this.llmService.completion(
      prompt,
      'You are a timeline consistency checker. Be strict about contradictions.'
    );

    return JSON.parse(response);
  }

  async validateImport(
    notes: string,
    campaignId: string
  ): Promise<{ valid: boolean; issues: string[] }> {
    const extracted = await this.extractTimeline(notes);
    const check = await this.checkConsistency(extracted.events, campaignId);

    if (!check.isConsistent) {
      return {
        valid: false,
        issues: check.contradictions.map((c) => `${c.event}: ${c.issue}`),
      };
    }

    if (check.warnings.length > 0) {
      return {
        valid: true,
        issues: check.warnings.map((w) => `Warning: ${w.event}: ${w.issue}`),
      };
    }

    return { valid: true, issues: [] };
  }
}
```

**Integration with Import Workflow**:
```typescript
export async function importSessionRecap(
  notes: string,
  campaignId: string,
  llmService: LLMOrchestrationService
): Promise<{ approved: boolean; clarifications: string[] }> {
  const timelineService = new TimelineService(llmService);

  // Validate timeline consistency
  const validation = await timelineService.validateImport(notes, campaignId);

  if (!validation.valid) {
    // Block import, require clarification
    return {
      approved: false,
      clarifications: [
        'Timeline inconsistencies detected:',
        ...validation.issues,
        'Please clarify these events before proceeding.',
      ],
    };
  }

  if (validation.issues.length > 0) {
    // Warnings: allow import but show to user
    return {
      approved: true,
      clarifications: [
        'Timeline warnings (proceeding with import):',
        ...validation.issues,
      ],
    };
  }

  return { approved: true, clarifications: [] };
}
```

**Day Count Calculation** (if in-world dates not used):
```typescript
export function calculateDayCount(
  sessionRecaps: SessionRecapEntry[],
  newDayOffset?: number
): number {
  if (sessionRecaps.length === 0) return 0;

  const lastRecap = sessionRecaps[sessionRecaps.length - 1];
  const lastDayCount = lastRecap.dayCount || 0;

  // If new session specifies "3 days later", add offset
  return lastDayCount + (newDayOffset || 0);
}
```

### Decision
**LLM-based contradiction detection** with Session Recaps as authoritative timeline. **Prompt-based timeline extraction** for dates, day counts, events. **Validation before import approval** - block if contradictions detected, warn if minor inconsistencies. **Session Recaps database** stores timeline metadata in JSONB (`metadata.sessionNumber`, `metadata.events`, `metadata.dayCount`). **Rule-based day count calculation** if LLM extracts relative time ("3 days later").

### Alternatives Considered
- **Rule-based timeline validation**: Can't detect semantic contradictions ("character alive after death"). Rejected.
- **Manual timeline entry**: User specifies dates/events explicitly. Too tedious, defeats Import automation. Rejected.
- **No validation**: Risk of timeline inconsistencies. Rejected (contradicts spec FR-040).

### Implementation Notes
- **Hybrid approach**: LLM extracts timeline, rule-based calculates day counts
- **Severity levels**: High (block import), Medium (warn, allow), Low (informational)
- **User override**: GM can approve import despite contradictions (with warning confirmation)
- **Future enhancement**: Visual timeline UI showing all sessions on calendar

---

## Research Area 6: Diff & Revert Mechanism

### Problem Statement
Users must be able to revert most recent import batch to restore state before import. Need immutable state snapshots for "before" state, atomic rollback (all cards reverted or none), and session-scoped revert (lost on page refresh acceptable for prototype).

### Research Findings

**Immer for Immutable State**:
```typescript
import { produce, enablePatches, Patch, produceWithPatches } from 'immer';
enablePatches();

interface ImportBatch {
  id: string;
  sessionId: string;
  createdCardIds: string[];
  updatedCardIds: string[];
  beforeState: Card[]; // Snapshot of updated cards before changes
  patches: Patch[]; // Immer patches for granular revert
  createdAt: string;
}

export class ImportBatchService {
  // Create snapshot before import execution
  async createBatch(
    sessionId: string,
    cardsToUpdate: Card[]
  ): Promise<ImportBatch> {
    const batchId = generateUUID();

    return {
      id: batchId,
      sessionId,
      createdCardIds: [], // Populated after create
      updatedCardIds: cardsToUpdate.map((c) => c.id),
      beforeState: cardsToUpdate.map((c) => ({ ...c })), // Deep copy
      patches: [],
      createdAt: new Date().toISOString(),
    };
  }

  // Execute import with state tracking
  async executeImport(
    batch: ImportBatch,
    updates: Array<{ cardId: string; content: string; metadata: any }>,
    creates: Array<{ title: string; content: string; parentId: string; metadata: any }>
  ): Promise<ImportBatch> {
    const createdCards: Card[] = [];

    // Create new cards
    for (const create of creates) {
      const card = await CardService.createCard({
        id: generateUUID(),
        campaignId: batch.sessionId,
        title: create.title,
        content: create.content,
        parentId: create.parentId,
        metadata: create.metadata,
        type: 'page',
      });
      createdCards.push(card);
    }

    // Update existing cards with Immer patches
    const patches: Patch[] = [];
    for (const update of updates) {
      const card = await db.prepare('SELECT * FROM cards WHERE id = ?').get(update.cardId);

      const [updatedCard, cardPatches] = produceWithPatches(card, (draft) => {
        draft.content = update.content;
        draft.metadata = JSON.stringify(update.metadata);
        draft.updated_at = new Date().toISOString();
      });

      await db.prepare(`
        UPDATE cards SET content = ?, metadata = ?, updated_at = ? WHERE id = ?
      `).run(updatedCard.content, updatedCard.metadata, updatedCard.updated_at, card.id);

      patches.push(...cardPatches);
    }

    return {
      ...batch,
      createdCardIds: createdCards.map((c) => c.id),
      patches,
    };
  }

  // Revert batch
  async revertBatch(batchId: string): Promise<{ revertedCount: number }> {
    const batch = await this.getBatch(batchId);
    if (!batch) throw new Error('Batch not found');

    // Delete created cards
    for (const cardId of batch.createdCardIds) {
      await db.prepare('DELETE FROM cards WHERE id = ?').run(cardId);
    }

    // Restore updated cards from beforeState
    for (const card of batch.beforeState) {
      await db.prepare(`
        UPDATE cards SET content = ?, metadata = ?, updated_at = ? WHERE id = ?
      `).run(card.content, card.metadata, card.updated_at, card.id);
    }

    return { revertedCount: batch.createdCardIds.length + batch.beforeState.length };
  }

  // Store batch in memory (session-scoped, not persisted)
  private batches = new Map<string, ImportBatch>();

  async saveBatch(batch: ImportBatch): Promise<void> {
    this.batches.set(batch.id, batch);
  }

  async getBatch(batchId: string): Promise<ImportBatch | null> {
    return this.batches.get(batchId) || null;
  }

  async getMostRecentBatch(sessionId: string): Promise<ImportBatch | null> {
    const sessionBatches = Array.from(this.batches.values())
      .filter((b) => b.sessionId === sessionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return sessionBatches[0] || null;
  }
}
```

**Alternative: Database Transactions** (SQLite):
```typescript
// REJECTED: Database transactions (can't undo after commit)
// Immer snapshots better for session-scoped revert

export async function executeImportAtomic(
  updates: CardUpdate[],
  creates: CardCreate[]
): Promise<{ success: boolean }> {
  return db.transaction(() => {
    try {
      for (const update of updates) {
        db.prepare('UPDATE cards SET content = ? WHERE id = ?').run(update.content, update.id);
      }

      for (const create of creates) {
        db.prepare('INSERT INTO cards (...) VALUES (...)').run(...);
      }

      return { success: true };
    } catch (error) {
      // Transaction auto-rollback on error
      throw error;
    }
  })();
}
```

**Frontend Revert UI**:
```typescript
import { useState } from 'react';
import { importService } from '../services/importService';

export function RevertButton({ sessionId }: { sessionId: string }) {
  const [isReverting, setIsReverting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  async function handleRevert() {
    setIsReverting(true);

    try {
      const result = await importService.revertMostRecent(sessionId);
      alert(`Reverted ${result.revertedCount} cards to previous state`);
      setShowConfirmation(false);
    } catch (error) {
      console.error('Revert failed:', error);
      alert('Failed to revert import. Please try again.');
    } finally {
      setIsReverting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirmation(true)}
        className="revert-button"
        disabled={isReverting}
      >
        Revert Last Import
      </button>

      {showConfirmation && (
        <div className="confirmation-modal">
          <p>Revert most recent import batch? This will:</p>
          <ul>
            <li>Delete all newly created cards</li>
            <li>Restore all updated cards to previous state</li>
          </ul>
          <p>This action cannot be undone.</p>

          <button onClick={handleRevert} disabled={isReverting}>
            {isReverting ? 'Reverting...' : 'Confirm Revert'}
          </button>
          <button onClick={() => setShowConfirmation(false)}>Cancel</button>
        </div>
      )}
    </>
  );
}
```

### Decision
**Immer for state snapshots** - store `beforeState` array of updated cards before changes. **In-memory batch storage** (not persisted to DB, lost on page refresh - acceptable for prototype). **Atomic revert** - delete all created cards, restore all updated cards from `beforeState`. **Session-scoped** - only most recent batch per session can be reverted. **Confirmation modal** before revert execution.

### Alternatives Considered
- **Database transactions with rollback**: Can't undo after commit, requires audit log table. Too complex for prototype. Rejected.
- **Full state snapshots in DB**: Persists across page refresh, but adds DB bloat. Future enhancement. Rejected for prototype.
- **Immer patches for granular revert**: Overengineered for batch revert. Full snapshot simpler. Rejected.

### Implementation Notes
- **Memory limits**: Store only last 3 batches per session to prevent memory bloat
- **Cascade effects**: Reverting card creation also deletes child cards (cascade delete)
- **Warning for relationships**: If reverted cards are referenced by newer cards, show warning
- **Future enhancement**: Persist batches to `import_batches` table for multi-session history

---

## Research Area 7: File Parsing (PDF, DOCX, MD)

### Problem Statement
Import workflow must support file uploads (.txt, .md, .docx, .pdf). Need text extraction from PDFs (no OCR for prototype), DOCX conversion to Markdown, and MD parsing (already used in Feature 003).

### Research Findings

**NPM Libraries Compared**:
- `pdf-parse`: PDF text extraction, Node.js only
- `mammoth`: DOCX to HTML/Markdown, Node.js and browser
- `markdown-it`: MD parsing (already in use)
- `pdfjs-dist`: PDF rendering and text extraction, browser-compatible

**Decision**: **Server-side parsing** with `pdf-parse` and `mammoth`.

**FileParseService**:
```typescript
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import MarkdownIt from 'markdown-it';
import fs from 'fs/promises';

export class FileParseService {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt();
  }

  async parseFile(filePath: string, mimeType: string): Promise<string> {
    switch (mimeType) {
      case 'application/pdf':
        return this.parsePDF(filePath);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.parseDOCX(filePath);
      case 'text/markdown':
        return this.parseMarkdown(filePath);
      case 'text/plain':
        return this.parsePlainText(filePath);
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  async parsePDF(filePath: string): Promise<string> {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  async parseDOCX(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  async parseMarkdown(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    return content; // Return raw Markdown, no parsing needed
  }

  async parsePlainText(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  // Handle large files (chunk processing for >10MB)
  async parseLargeFile(filePath: string, mimeType: string): Promise<string> {
    const stats = await fs.stat(filePath);
    const sizeMB = stats.size / 1024 / 1024;

    if (sizeMB > 10) {
      console.warn(`Large file detected: ${sizeMB.toFixed(2)}MB`);
      // For prototype: proceed anyway, future: implement chunking
    }

    return this.parseFile(filePath, mimeType);
  }
}
```

**API Route for File Upload**:
```typescript
import express from 'express';
import multer from 'multer';
import { FileParseService } from '../services/FileParseService';

const router = express.Router();
const upload = multer({ dest: '/tmp/uploads/' });
const fileParseService = new FileParseService();

router.post('/api/import/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const parsedText = await fileParseService.parseFile(req.file.path, req.file.mimetype);

    res.json({
      sessionId: req.body.sessionId,
      content: parsedText,
      filename: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error('File parse error:', error);
    res.status(500).json({ error: 'Failed to parse file' });
  } finally {
    // Clean up uploaded file
    await fs.unlink(req.file.path);
  }
});

export default router;
```

**Frontend File Upload Component**:
```typescript
import { useState } from 'react';
import { importService } from '../services/importService';

export function FileUpload({ sessionId }: { sessionId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Unsupported file type. Please upload .txt, .md, .docx, or .pdf');
      return;
    }

    // Validate file size (<20MB)
    const maxSizeMB = 20;
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File too large. Maximum size: ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);

    try {
      const result = await importService.uploadFile(sessionId, file, (progress) => {
        setUploadProgress(progress);
      });

      console.log('Uploaded file:', result.filename);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <div className="file-upload">
      <input
        type="file"
        accept=".txt,.md,.docx,.pdf"
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      {isUploading && (
        <div className="upload-progress">
          <progress value={uploadProgress} max={100} />
          <span>{uploadProgress}%</span>
        </div>
      )}
    </div>
  );
}
```

**Handling Large Files** (chunking for >10MB):
```typescript
// Future enhancement: chunk large files for processing
export async function parseLargeFileChunked(
  filePath: string,
  chunkSizeMB = 5
): Promise<string[]> {
  const stats = await fs.stat(filePath);
  const chunkSize = chunkSizeMB * 1024 * 1024;
  const chunks: string[] = [];

  const fileHandle = await fs.open(filePath, 'r');
  const buffer = Buffer.alloc(chunkSize);

  let bytesRead = 0;
  while (bytesRead < stats.size) {
    const { bytesRead: read } = await fileHandle.read(buffer, 0, chunkSize, bytesRead);
    chunks.push(buffer.slice(0, read).toString('utf-8'));
    bytesRead += read;
  }

  await fileHandle.close();
  return chunks;
}
```

### Decision
**Server-side parsing** with `pdf-parse` (PDF), `mammoth` (DOCX), native `fs` (TXT/MD). **Upload to `/tmp/uploads/` with multer**. **File size limit 20MB** for prototype. **No OCR** for scanned PDFs (text-based PDFs only). **Cleanup uploaded files** after parsing. **Progress indicators** via frontend upload component.

### Alternatives Considered
- **Client-side parsing (pdfjs-dist)**: Works in browser but complex, server-side simpler. Rejected.
- **OCR for scanned PDFs (tesseract.js)**: Too slow for prototype, adds complexity. Future enhancement. Rejected.
- **Google Docs API for DOCX**: Requires OAuth, adds dependency. Mammoth sufficient. Rejected.

### Implementation Notes
- **MIME type validation**: Check `file.mimetype` before parsing
- **Chunking for large files**: Future enhancement for >20MB PDFs
- **Error handling**: Show user-friendly error for corrupt files ("Unable to parse file")
- **Security**: Validate file content (not just extension) to prevent malicious uploads

---

## Research Area 8: Default Template Structure

(Continuing exactly as original from lines 1831-2083...)

### Problem Statement
System must provide default campaign template with Session Recaps database and 5 other standard databases/pages (Characters/NPCs, Locations, Factions, Plot Threads, Lore). Template instantiated on campaign creation. Import AI uses template knowledge for content placement.

### Research Findings

**Default Template Schema**:
```typescript
export interface DefaultTemplate {
  databases: DatabaseTemplate[];
  pages: PageTemplate[];
}

export interface DatabaseTemplate {
  title: string;
  icon: string;
  columns: DatabaseColumn[];
  views: DatabaseView[];
}

export interface PageTemplate {
  title: string;
  icon: string;
  content: string;
}

export const DEFAULT_CAMPAIGN_TEMPLATE: DefaultTemplate = {
  databases: [
    {
      title: 'Session Recaps',
      icon: '📅',
      columns: [
        { id: 'session-number', name: 'Session #', type: 'number', required: true },
        { id: 'date', name: 'Date', type: 'date', required: true },
        { id: 'in-world-date', name: 'In-World Date', type: 'text', required: false },
        { id: 'day-count', name: 'Day Count', type: 'number', required: false },
        { id: 'summary', name: 'Summary', type: 'text', required: true },
      ],
      views: [
        { id: 'table', name: 'Table', type: 'table', sortBy: 'session-number', sortOrder: 'asc' },
      ],
    },
    {
      title: 'Characters & NPCs',
      icon: '👤',
      columns: [
        { id: 'name', name: 'Name', type: 'text', required: true },
        { id: 'race', name: 'Race', type: 'text', required: false },
        { id: 'class', name: 'Class', type: 'text', required: false },
        { id: 'faction', name: 'Faction', type: 'select', required: false, options: { choices: [] } },
        { id: 'location', name: 'Location', type: 'entity-reference', required: false, entityType: 'card' },
        { id: 'status', name: 'Status', type: 'select', required: false, options: {
          choices: [
            { id: 'alive', label: 'Alive', color: 'green' },
            { id: 'dead', label: 'Dead', color: 'red' },
            { id: 'unknown', label: 'Unknown', color: 'gray' },
          ]
        }},
      ],
      views: [
        { id: 'table', name: 'Table', type: 'table', sortBy: 'name', sortOrder: 'asc' },
      ],
    },
    {
      title: 'Locations',
      icon: '🗺️',
      columns: [
        { id: 'name', name: 'Name', type: 'text', required: true },
        { id: 'type', name: 'Type', type: 'select', required: false, options: {
          choices: [
            { id: 'city', label: 'City', color: 'blue' },
            { id: 'town', label: 'Town', color: 'cyan' },
            { id: 'dungeon', label: 'Dungeon', color: 'purple' },
            { id: 'region', label: 'Region', color: 'green' },
            { id: 'building', label: 'Building', color: 'orange' },
          ]
        }},
        { id: 'parent-location', name: 'Parent Location', type: 'entity-reference', required: false },
      ],
      views: [
        { id: 'table', name: 'Table', type: 'table', sortBy: 'name', sortOrder: 'asc' },
      ],
    },
    {
      title: 'Factions',
      icon: '⚔️',
      columns: [
        { id: 'name', name: 'Name', type: 'text', required: true },
        { id: 'type', name: 'Type', type: 'select', required: false, options: {
          choices: [
            { id: 'guild', label: 'Guild', color: 'blue' },
            { id: 'government', label: 'Government', color: 'purple' },
            { id: 'military', label: 'Military', color: 'red' },
            { id: 'criminal', label: 'Criminal', color: 'gray' },
            { id: 'religious', label: 'Religious', color: 'yellow' },
          ]
        }},
        { id: 'alignment', name: 'Alignment', type: 'select', required: false, options: {
          choices: [
            { id: 'ally', label: 'Ally', color: 'green' },
            { id: 'neutral', label: 'Neutral', color: 'gray' },
            { id: 'enemy', label: 'Enemy', color: 'red' },
          ]
        }},
      ],
      views: [
        { id: 'table', name: 'Table', type: 'table', sortBy: 'name', sortOrder: 'asc' },
      ],
    },
    {
      title: 'Lore',
      icon: '📚',
      columns: [
        { id: 'title', name: 'Title', type: 'text', required: true },
        { id: 'category', name: 'Category', type: 'select', required: false, options: {
          choices: [
            { id: 'magic', label: 'Magic System', color: 'purple' },
            { id: 'history', label: 'History', color: 'brown' },
            { id: 'religion', label: 'Religion', color: 'yellow' },
            { id: 'culture', label: 'Culture', color: 'blue' },
            { id: 'item', label: 'Legendary Item', color: 'orange' },
          ]
        }},
      ],
      views: [
        { id: 'table', name: 'Table', type: 'table', sortBy: 'title', sortOrder: 'asc' },
      ],
    },
  ],
  pages: [
    {
      title: 'Plot Threads',
      icon: '🧵',
      content: `# Plot Threads

## Active Threads
-

## Resolved Threads
-

## Potential Hooks
- `,
    },
  ],
};
```

**Template Instantiation** (on campaign creation):
```typescript
import { db } from '../db';
import { DEFAULT_CAMPAIGN_TEMPLATE } from '../config/defaultTemplate';

export async function createCampaignWithTemplate(
  userId: string,
  campaignName: string
): Promise<Campaign> {
  // Create campaign
  const campaignId = generateUUID();
  await db.prepare(`
    INSERT INTO campaigns (id, name, owner_id, created_at)
    VALUES (?, ?, ?, ?)
  `).run(campaignId, campaignName, userId, new Date().toISOString());

  // Create default databases
  for (const dbTemplate of DEFAULT_CAMPAIGN_TEMPLATE.databases) {
    const dbCardId = generateUUID();

    await db.prepare(`
      INSERT INTO cards (id, campaign_id, title, type, icon, metadata, created_at)
      VALUES (?, ?, ?, 'database', ?, ?, ?)
    `).run(
      dbCardId,
      campaignId,
      dbTemplate.title,
      dbTemplate.icon,
      JSON.stringify({
        schema: { columns: dbTemplate.columns },
        views: dbTemplate.views,
        defaultViewId: dbTemplate.views[0]?.id,
      }),
      new Date().toISOString()
    );
  }

  // Create default pages
  for (const pageTemplate of DEFAULT_CAMPAIGN_TEMPLATE.pages) {
    const pageCardId = generateUUID();

    await db.prepare(`
      INSERT INTO cards (id, campaign_id, title, type, icon, content, created_at)
      VALUES (?, ?, ?, 'page', ?, ?, ?)
    `).run(
      pageCardId,
      campaignId,
      pageTemplate.title,
      pageTemplate.icon,
      pageTemplate.content,
      new Date().toISOString()
    );
  }

  return { id: campaignId, name: campaignName, ownerId: userId };
}
```

**Import AI Template Knowledge Prompt**:
```typescript
export function buildTemplateContextPrompt(campaignStructure: Card[]): string {
  const sessionRecapsDB = campaignStructure.find((c) => c.title === 'Session Recaps' && c.type === 'database');
  const charactersDB = campaignStructure.find((c) => c.title === 'Characters & NPCs' && c.type === 'database');
  const locationsDB = campaignStructure.find((c) => c.title === 'Locations' && c.type === 'database');

  return `
This campaign has the following default databases:
- **Session Recaps** (ID: ${sessionRecapsDB?.id}): For session summaries and timeline
- **Characters & NPCs** (ID: ${charactersDB?.id}): For characters, NPCs, monsters
- **Locations** (ID: ${locationsDB?.id}): For cities, buildings, regions, dungeons
- **Factions** (ID: ...): For organizations, guilds, political groups
- **Lore** (ID: ...): For magic systems, history, religion, legendary items

And pages:
- **Plot Threads**: For active and resolved story threads

When determining placement for imported content:
1. Session recaps → "Session Recaps" database
2. Characters/NPCs → "Characters & NPCs" database
3. Locations → "Locations" database
4. Factions → "Factions" database
5. Lore/world-building → "Lore" database
6. Plot threads → "Plot Threads" page

If user has CUSTOM structure (renamed databases, additional pages), prefer custom structure over defaults.
`;
}
```

### Decision
**Hardcoded template in TypeScript** (`config/defaultTemplate.ts`). **Instantiate on campaign creation** via `createCampaignWithTemplate()`. **6 default structures**: Session Recaps, Characters/NPCs, Locations, Factions, Lore (databases), Plot Threads (page). **Import AI uses template knowledge** via prompt context. **Users can deviate** - AI adapts to custom structure by searching existing cards.

### Alternatives Considered
- **YAML config file**: More flexible for customization, but adds parsing complexity. Rejected for prototype.
- **Admin UI for template editing**: Too complex for prototype. Future enhancement. Rejected.
- **No default template**: Requires users to set up structure manually. Defeats Import automation. Rejected.

### Implementation Notes
- **Template versioning**: Add `templateVersion` to campaigns table for future migrations
- **Custom templates**: Future feature - save campaign as template for reuse
- **Import AI fallback**: If template databases deleted, create entries as standalone pages

---

## Research Area 9: LLM Prompt Engineering

(Continuing from lines 2084-2368 with LLMOrchestrationService updates...)

### Problem Statement
Need system prompts for Import (entity extraction, placement, formatting) vs Planning (graph updates, context assembly, consistency) contexts. Context assembly must include Session Recaps, information levels, custom instructions. Few-shot examples for entity extraction. Consistency prompts for timeline validation and wording preservation.

### Research Findings

**System Prompt Structure**:
```typescript
export interface SystemPromptConfig {
  role: string; // "Import AI" | "Planning AI"
  capabilities: string[];
  constraints: string[];
  examples?: FewShotExample[];
  customInstructions?: string;
}

export interface FewShotExample {
  input: string;
  output: string;
}
```

**Import AI System Prompt**:
```typescript
export function buildImportSystemPrompt(
  campaignContext: {
    existingCards: Card[];
    sessionRecaps: SessionRecapEntry[];
    informationLevels: InformationLevel[];
    customInstructions?: string;
  }
): string {
  const templateContext = buildTemplateContextPrompt(campaignContext.existingCards);

  return `
You are an Import AI assistant for a D&D campaign wiki. Your role is to help Game Masters import unstructured notes into their campaign wiki.

## Capabilities
- Extract entities (characters, locations, factions, events) from unstructured text
- Distinguish between updates to existing content and new content creation
- Determine appropriate placement based on campaign structure
- Improve formatting while preserving exact wording
- Maintain strict consistency with established story timeline

## Constraints
- NEVER autonomously change content without user approval
- NEVER rephrase or reword unless user explicitly approves
- NEVER update knowledge graphs (graphs OFF during import)
- ASK clarifying questions BEFORE presenting approval summary
- RESPECT established timeline from Session Recaps database

## Campaign Context
${templateContext}

## Existing Session Recaps (Timeline Authority)
${campaignContext.sessionRecaps.map((r) => `Session ${r.sessionNumber}: ${r.events.join('; ')}`).join('\n')}

## Information Levels (for tier-scoped content)
${campaignContext.informationLevels.map((l) => `- ${l.name}: ${l.hierarchical ? 'DM Secret' : 'Visible to players'}`).join('\n')}

## Custom Instructions
${campaignContext.customInstructions || 'None'}

## Process
1. Analyze provided notes
2. Extract all entities (characters, locations, factions, events)
3. Search existing campaign to determine updates vs new additions
4. Ask clarifying questions for uncertain classifications
5. Present approval summary with proposed changes
6. Execute import only after explicit user approval

## Few-Shot Examples

**Example 1: Character Update**
Input: "Lord Neverember revealed his secret alliance with the Zhentarim"
Output:
{
  "entities": [
    {
      "name": "Dagult Neverember",
      "type": "character",
      "action": "update",
      "existingCardId": "char-001",
      "changes": "Add secret alliance with Zhentarim",
      "confidence": 0.9,
      "reasoning": "Found existing character 'Lord Neverember' (fuzzy match)"
    },
    {
      "name": "Zhentarim",
      "type": "faction",
      "action": "update",
      "existingCardId": "faction-002",
      "changes": "Add relationship with Neverember",
      "confidence": 1.0
    }
  ],
  "placement": "Session Recaps database (new session entry)",
  "clarifications": []
}

**Example 2: New Location**
Input: "The party discovered Blackstaff Tower in the Dock Ward"
Output:
{
  "entities": [
    {
      "name": "Blackstaff Tower",
      "type": "location",
      "action": "create",
      "confidence": 1.0,
      "parent": "Waterdeep" // if exists
    },
    {
      "name": "Dock Ward",
      "type": "location",
      "action": "update",
      "existingCardId": "loc-015",
      "changes": "Add Blackstaff Tower as child location"
    }
  ],
  "placement": "Locations database",
  "clarifications": ["Is this the same Blackstaff Tower from Forgotten Realms lore?"]
}

Be thorough, precise, and conservative. When in doubt, ask for clarification.
`;
}
```

**Planning AI System Prompt**:
```typescript
export function buildPlanningSystemPrompt(
  campaignContext: {
    sessionRecaps: SessionRecapEntry[];
    graphs: KnowledgeGraph[];
    informationLevels: InformationLevel[];
    customInstructions?: string;
  }
): string {
  return `
You are a Planning AI assistant for a D&D campaign. Your role is to help Game Masters plan sessions and answer campaign questions using knowledge graph context.

## Capabilities
- Process imports to update four knowledge graphs (Geographical, Political-Web, World-Foundations, Campaign-Story)
- Answer campaign questions using graph context
- Provide context-aware encounter hooks and plot suggestions
- Maintain distinction between established canon (Session Recaps) and hypotheticals
- Keep Political-Web and Campaign-Story graphs lean (active party-relevant content only)

## Constraints
- NEVER autonomously edit cards without explicit user approval
- NEVER confuse hypotheticals with established canon
- ASK permission before processing imports and updating graphs
- ONLY include active party-relevant content in Political-Web/Campaign-Story graphs
- PRIORITIZE consistency over generation

## Knowledge Graphs
- **Geographical**: Locations, regions, spatial relationships (can be comprehensive)
- **Political-Web**: Active party-relevant political relationships ONLY (lean)
- **Campaign-Story**: Active story threads from Session Recaps ONLY (lean)
- **World-Foundations**: Core world-building, magic systems, lore (comprehensive)

## Campaign Timeline (Authoritative Source)
${campaignContext.sessionRecaps.map((r) => `Session ${r.sessionNumber} (${r.date}): ${r.events.join('; ')}`).join('\n')}

## Custom Instructions
${campaignContext.customInstructions || 'None'}

## Process for Graph Updates
1. Detect recent imports since last graph update
2. Ask user permission to process imports
3. Extract relationships from imported content
4. For Political-Web/Campaign-Story: only add if active and party-relevant (last 5 sessions OR explicitly marked active)
5. Update graphs with new nodes/edges
6. Summarize changes to user

## Process for Planning Questions
1. Check if graphs are up-to-date (process pending imports if needed)
2. Query relevant graph context
3. Reference Session Recaps for established canon
4. Provide context-aware response
5. Clearly mark suggestions vs facts

## Example: Active Party-Relevant Filtering (Political-Web)
**INCLUDE**: "Zhentarim allied with Neverember (Session 12 - recent)"
**EXCLUDE**: "War of the Silver Marches (Session 2, not mentioned since)"

Be helpful, context-aware, and conservative. Never autonomous edits.
`;
}
```

**Context Assembly for Planning Queries**:
```typescript
export async function assemblePlanningContext(
  query: string,
  campaignId: string,
  llmService: LLMOrchestrationService
): Promise<string> {
  const timelineService = new TimelineService(llmService);
  const graphService = new GraphService();

  // Get Session Recaps
  const sessionRecaps = await timelineService.getSessionRecaps(campaignId);

  // Get all graphs (using Feature 011 handlers)
  const graphs = await Promise.all([
    dispatchToolCall('query_graph', { campaign_id: campaignId, graph_type: 'Geographical', query: '' }),
    dispatchToolCall('query_graph', { campaign_id: campaignId, graph_type: 'Political-Web', query: '', active_only: true }),
    dispatchToolCall('query_graph', { campaign_id: campaignId, graph_type: 'World-Foundations', query: '' }),
    dispatchToolCall('query_graph', { campaign_id: campaignId, graph_type: 'Campaign-Story', query: '', active_only: true }),
  ]);

  const politicalWebActive = JSON.parse(graphs[1].content[0].text);
  const campaignStoryActive = JSON.parse(graphs[3].content[0].text);

  return `
## User Question
${query}

## Session Recaps Timeline (Established Canon)
${sessionRecaps.map((r) => `Session ${r.sessionNumber}: ${r.events.join('; ')}`).join('\n')}

## Geographical Graph (${graphs[0].nodes.length} locations)
${graphs[0].nodes.slice(0, 20).map((n) => `- ${n.name}: ${n.attributes.description}`).join('\n')}
${graphs[0].nodes.length > 20 ? '... [truncated]' : ''}

## Political-Web Graph (${politicalWebActive.length} active relationships)
${politicalWebActive.map((n) => `- ${n.name}`).join('\n')}

## Campaign-Story Graph (${campaignStoryActive.length} active threads)
${campaignStoryActive.map((n) => `- ${n.name}: ${n.attributes.description}`).join('\n')}

## World-Foundations Graph (${graphs[2].nodes.length} lore entries)
${graphs[2].nodes.slice(0, 10).map((n) => `- ${n.name}: ${n.attributes.description}`).join('\n')}

Use this context to provide an accurate, consistent response.
`;
}
```

**Variable Substitution Pattern**:
```typescript
export function substitutePromptVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return result;
}

// Example usage
const template = `
You are analyzing content for campaign: {{campaignName}}.
Custom instructions: {{customInstructions}}
`;

const prompt = substitutePromptVariables(template, {
  campaignName: 'Waterdeep Dragon Heist',
  customInstructions: 'Always ask for dates',
});
```

### Decision
**Structured system prompts** with role, capabilities, constraints, examples, custom instructions. **Import AI prompt** includes template context, Session Recaps timeline, existing cards. **Planning AI prompt** includes graph context (active-filtered), Session Recaps, custom instructions. **Few-shot examples** for entity extraction (2-3 examples). **Variable substitution** for dynamic prompt assembly. **Context truncation** for long graphs (first 20 nodes, "... [truncated]").

### Alternatives Considered
- **LangChain prompt templates**: Adds framework dependency, overkill for structured prompts. Rejected.
- **Dynamic prompt generation**: Build prompts from scratch each time. Too error-prone. Rejected.
- **No few-shot examples**: Lower entity extraction accuracy. Examples improve consistency. Rejected.

### Implementation Notes
- **Token limits**: Truncate context if total prompt >8k tokens (summarize middle sections)
- **Custom instructions storage**: `settings` table with `campaign_id` FK, `key = 'ai_custom_instructions'`
- **Prompt versioning**: Add version prefix to prompts for future A/B testing
- **Testing**: Unit tests for prompt assembly, validate JSON output schema

---

## Research Area 10: Graph Filtering - "Active Party-Relevant"

(Final section, lines 2369-2621, unchanged from original...)

### Problem Statement
Political-Web and Campaign-Story graphs must stay lean with only active party-relevant content. Need algorithm to determine "active" (mentioned in last N sessions OR explicitly marked) and "party-relevant" (relates to player characters). Automatic pruning vs manual GM curation. UI for marking relationships/threads as inactive.

### Research Findings

**Filtering Criteria**:
1. **Time-based**: Mentioned in last N sessions (N=5 default)
2. **Tag-based**: Explicitly marked `active: true` in metadata
3. **Hybrid**: Time-based with manual override

**Decision**: **Hybrid approach** - time-based default + manual override.

**Active Filtering Algorithm**:
```typescript
export interface ActiveFilteringConfig {
  recentSessionCount: number; // Default: 5
  autoMarkInactive: boolean; // Default: true
}

export class GraphFilteringService {
  constructor(
    private graphService: GraphService,
    private config: ActiveFilteringConfig = { recentSessionCount: 5, autoMarkInactive: true }
  ) {}

  async updateActiveStatus(
    graphId: string,
    sessionRecaps: SessionRecapEntry[]
  ): Promise<{ markedInactive: number; markedActive: number }> {
    const graph = await this.graphService.getGraph(graphId);

    // Get recent session card IDs
    const recentRecaps = sessionRecaps.slice(-this.config.recentSessionCount);
    const recentCardIds = new Set(recentRecaps.map((r) => r.id));

    let markedInactive = 0;
    let markedActive = 0;

    for (const edge of graph.edges) {
      const isRecent = edge.sourceCardId && recentCardIds.has(edge.sourceCardId);
      const isManuallyActive = edge.attributes.active === true;

      if (isManuallyActive) {
        // Manual override: keep active even if old
        continue;
      }

      if (!isRecent && this.config.autoMarkInactive) {
        // Mark as inactive (not mentioned recently)
        await this.graphService.updateEdge(edge.id, {
          ...edge,
          attributes: { ...edge.attributes, active: false },
        });
        markedInactive++;
      } else if (isRecent && !edge.attributes.active) {
        // Mark as active (mentioned recently)
        await this.graphService.updateEdge(edge.id, {
          ...edge,
          attributes: { ...edge.attributes, active: true },
        });
        markedActive++;
      }
    }

    return { markedInactive, markedActive };
  }

  // Query only active edges/nodes
  async getActiveSubgraph(graphId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const edges = await db.prepare(`
      SELECT * FROM graph_edges
      WHERE graph_id = ? AND json_extract(attributes, '$.active') = 1
    `).all(graphId);

    const nodeIds = new Set<string>();
    edges.forEach((edge) => {
      nodeIds.add(edge.from_node_id);
      nodeIds.add(edge.to_node_id);
    });

    if (nodeIds.size === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes = await db.prepare(`
      SELECT * FROM graph_nodes
      WHERE id IN (${Array.from(nodeIds).map(() => '?').join(',')})
    `).all(...Array.from(nodeIds));

    return {
      nodes: nodes.map((n) => ({ ...n, attributes: JSON.parse(n.attributes) })),
      edges: edges.map((e) => ({ ...e, attributes: JSON.parse(e.attributes) })),
    };
  }
}
```

**Party-Relevant Detection** (LLM-based):
```typescript
export async function isPartyRelevant(
  relationship: { from: string; to: string; type: string; description: string },
  playerCharacters: string[],
  llmService: LLMOrchestrationService
): Promise<boolean> {
  const prompt = `
Does this relationship involve or directly affect the player characters?

Player characters: ${playerCharacters.join(', ')}

Relationship: ${relationship.from} ${relationship.type} ${relationship.to}
Description: ${relationship.description}

Answer YES if:
- Any player character is involved
- The relationship directly impacts the party's goals
- The relationship was revealed/changed by party actions

Answer NO if:
- It's background world politics unrelated to the party
- It's historical lore with no current relevance

Return JSON: { "relevant": true|false, "reasoning": "..." }
`;

  const response = await llmService.completion(prompt, 'You are a party-relevance filter.');
  const parsed = JSON.parse(response);
  return parsed.relevant;
}
```

**Manual Override UI** (Planning Chat):
```typescript
export function GraphEditorChatCommands() {
  const commands = [
    {
      command: '/graph mark-active <relationship>',
      description: 'Manually mark a relationship as active',
      handler: async (relationshipName: string) => {
        const edge = await findEdgeByName(relationshipName);
        if (!edge) {
          return `Relationship "${relationshipName}" not found`;
        }

        await graphService.updateEdge(edge.id, {
          ...edge,
          attributes: { ...edge.attributes, active: true },
        });

        return `Marked "${relationshipName}" as active (will remain active even if not mentioned recently)`;
      },
    },
    {
      command: '/graph mark-inactive <relationship>',
      description: 'Manually mark a relationship as inactive',
      handler: async (relationshipName: string) => {
        const edge = await findEdgeByName(relationshipName);
        if (!edge) {
          return `Relationship "${relationshipName}" not found`;
        }

        await graphService.updateEdge(edge.id, {
          ...edge,
          attributes: { ...edge.attributes, active: false },
        });

        return `Marked "${relationshipName}" as inactive (hidden from context)`;
      },
    },
  ];

  return commands;
}
```

**Settings UI for Filtering Config**:
```typescript
export function GraphFilteringSettings() {
  const [config, setConfig] = useState<ActiveFilteringConfig>({
    recentSessionCount: 5,
    autoMarkInactive: true,
  });

  async function saveConfig() {
    await settingsService.update('graph_filtering_config', config);
  }

  return (
    <div className="graph-filtering-settings">
      <h3>Graph Filtering Settings</h3>

      <label>
        Recent Session Count (for "active" determination):
        <input
          type="number"
          value={config.recentSessionCount}
          onChange={(e) => setConfig({ ...config, recentSessionCount: parseInt(e.target.value) })}
          min={1}
          max={20}
        />
      </label>

      <label>
        <input
          type="checkbox"
          checked={config.autoMarkInactive}
          onChange={(e) => setConfig({ ...config, autoMarkInactive: e.target.checked })}
        />
        Automatically mark old relationships as inactive
      </label>

      <button onClick={saveConfig}>Save Settings</button>
    </div>
  );
}
```

**Pruning Old Inactive Edges** (optional cleanup):
```typescript
export async function pruneInactiveEdges(graphId: string, olderThanDays = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const result = await db.prepare(`
    DELETE FROM graph_edges
    WHERE graph_id = ?
    AND json_extract(attributes, '$.active') = 0
    AND created_at < ?
  `).run(graphId, cutoffDate.toISOString());

  return result.changes || 0;
}
```

### Decision
**Hybrid time-based + tag-based filtering**. Default: relationships active if mentioned in last 5 sessions OR manually marked `active: true`. **Automatic inactive marking** when session count exceeds threshold (configurable). **Manual override** via Planning chat commands (`/graph mark-active`, `/graph mark-inactive`). **Settings UI** for adjusting `recentSessionCount` (1-20). **Optional pruning** of inactive edges >90 days old (GM-triggered, not automatic).

### Alternatives Considered
- **Pure time-based**: No manual override, inflexible. Rejected.
- **Pure tag-based**: Requires manual curation for everything. Too tedious. Rejected.
- **LLM-based relevance for every relationship**: Too slow, expensive. Hybrid approach sufficient. Rejected.
- **Automatic pruning**: Risk of losing lore. Make pruning manual/opt-in. Rejected for auto.

### Implementation Notes
- **Graph size monitoring**: Show GM warning if Political-Web/Campaign-Story >1000 nodes (lean intent violated)
- **Batch updates**: Run active status updates once per Planning session, not real-time
- **Party character list**: Store in campaign settings (`settings.playerCharacters: string[]`)
- **Future enhancement**: Canvas UI for visualizing active vs inactive relationships (color coding)

---

## Summary of Research Findings

| Area | Decision | Key Technology | Performance Target | Notes |
|------|----------|---------------|-------------------|-------|
| 1. LLM Streaming & Function Calling | OpenAI/Anthropic SDKs + Feature 011 handlers | OpenAI function calling, Zod conversion | <10s entity extraction | Reuse dispatchToolCall() from Feature 011 |
| 2. Pull-Down Tab UI | Radix Dialog + Context | Slack-style overlay | <300ms open animation | Z-index 1000-1001 |
| 3. Entity Extraction | LLM NER + Levenshtein | Single-pass comprehensive | <10s for 5000 words | Confidence <0.8 = clarify |
| 4. Graph Storage | Normalized tables | SQLite + JSON1 | <100ms graph query | 10k node limit per type |
| 5. Timeline Consistency | LLM-based contradiction check | Session Recaps authority | <5s validation | Block on contradictions |
| 6. Diff & Revert | Immer snapshots | In-memory batches | <500ms revert | Session-scoped only |
| 7. File Parsing | pdf-parse + mammoth | Server-side parsing | <5s for 10MB file | No OCR for prototype |
| 8. Default Template | Hardcoded TypeScript | 6 databases/pages | <1s instantiation | Template on campaign create |
| 9. Prompt Engineering | Structured prompts | Few-shot examples | N/A | Variable substitution |
| 10. Graph Filtering | Hybrid time+tag | Last 5 sessions default | <100ms active query | Manual override supported |

**Critical Integration Points**:
- Feature 004 (Information Filtering): `graph_nodes.information_level_id` for tier-scoped queries
- Feature 008 (BYOLLM Configuration): API credentials from `byollm_configs` table (BLOCKING dependency)
- Feature 003 (Card Architecture): Import creates/updates cards, graphs reference `source_card_id`
- **Feature 011 (MCP Integration)**: 24 tool handlers callable via `dispatchToolCall()`, Zod schemas for function calling conversion

**Performance Validation**:
- Import workflow: 5000 words → <30s total (10s extraction + 5s validation + 10s clarification + 5s approval)
- Planning graph update: 50 cards → <30s (LLM-dependent)
- Revert operation: 100 cards → <500ms (in-memory snapshot restore)

**Status**: ✓ All 10 research areas complete (updated 2025-10-03 post-Feature 011). Ready for Phase 1 (data model, contracts, quickstart).
