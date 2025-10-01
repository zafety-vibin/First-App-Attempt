# Quickstart Guide: AI Import & Planning Workflows

**Feature**: 005-create-the-ai
**Phase**: 1 (Design & Contracts)
**Date**: 2025-10-01
**Purpose**: Step-by-step validation workflows for AI Import and Planning features

---

## Prerequisites

- Feature 002 (Authentication & Campaign Management) implemented
- Feature 003 (Card-Based Architecture) implemented
- Feature 004 (Information Filtering) implemented
- Feature 008 (BYOLLM Configuration) implemented
- Campaign with ID `campaign-123` exists
- Session Recaps database page with 2+ entries
- GM has configured OpenAI or Anthropic credentials via Feature 008

---

## Workflow 1: Import Session Recap (End-to-End)

**FR Coverage**: FR-001 to FR-042 (Import AI workflow with approval)

### Setup
1. Prepare a session recap markdown file:
   ```markdown
   # Session 12: Into the Shadowfell

   The party entered the Shadowfell through the portal in Ravenloft's crypt.
   They met Elara Moonwhisper, an elven ranger who offered to guide them.

   In the Raven Queen's temple, they learned of a plot by the Dusk Council
   to overthrow her. Elara revealed she's secretly allied with the Council.

   The party accepted a quest to retrieve the Soul Shard from the Fortress
   of Eternal Night.
   ```

### Test Steps

#### 1.1 Create Import Session
```bash
curl -X POST http://localhost:3000/api/import/session \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign-123"
  }'
```

**Expected Response** (201):
```json
{
  "id": "import-session-001",
  "campaignId": "campaign-123",
  "status": "uploading",
  "chatHistory": [],
  "createdAt": "2025-10-01T10:00:00Z"
}
```

**Validation**:
- ✅ Import session created in `import_sessions` table
- ✅ Status = 'uploading'
- ✅ chatHistory is empty array

---

#### 1.2 Upload Session Recap File
```bash
curl -X POST http://localhost:3000/api/import/upload \
  -F "sessionId=import-session-001" \
  -F "file=@session-12-recap.md"
```

**Expected Response** (200):
```json
{
  "sessionId": "import-session-001",
  "batchId": "import-batch-001",
  "status": "processing"
}
```

**Validation**:
- ✅ Import session status updated to 'processing'
- ✅ ImportBatch created with ID `import-batch-001`
- ✅ File parsed (MD format recognized)
- ✅ File content added to chatHistory as system message

---

#### 1.3 Chat with Import AI - Initial Extraction
```bash
curl -X POST http://localhost:3000/api/import/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "import-session-001",
    "message": "Extract all NPCs, locations, and factions from this session recap. Create appropriate knowledge graph nodes."
  }'
```

**Expected Response** (200, SSE stream):
```
data: {"type": "chunk", "content": "I've analyzed the session recap and found:\n\n"}

data: {"type": "chunk", "content": "**NPCs:**\n- Elara Moonwhisper (elven ranger, guide)\n\n"}

data: {"type": "chunk", "content": "**Locations:**\n- Shadowfell\n- Raven Queen's Temple\n- Fortress of Eternal Night\n\n"}

data: {"type": "chunk", "content": "**Factions:**\n- Dusk Council (plotting against Raven Queen)\n\n"}

data: {"type": "chunk", "content": "I'll create nodes in the appropriate graphs."}

data: {"type": "done", "sessionId": "import-session-001"}
```

**Validation**:
- ✅ LLM streaming works (SSE events received)
- ✅ Import AI identifies entities correctly
- ✅ Chat message added to chatHistory
- ✅ AI response added to chatHistory

---

#### 1.4 Get Approval Summary
```bash
curl -X GET "http://localhost:3000/api/import/approval-summary?sessionId=import-session-001"
```

**Expected Response** (200):
```json
{
  "entitiesExtracted": [
    {
      "name": "Elara Moonwhisper",
      "type": "npc",
      "confidence": 0.95,
      "fuzzyMatchScore": null,
      "existingEntityId": null
    },
    {
      "name": "Shadowfell",
      "type": "location",
      "confidence": 0.98,
      "fuzzyMatchScore": 0.85,
      "existingEntityId": "node-shadowfell-001"
    },
    {
      "name": "Raven Queen's Temple",
      "type": "location",
      "confidence": 0.92
    },
    {
      "name": "Fortress of Eternal Night",
      "type": "location",
      "confidence": 0.90
    },
    {
      "name": "Dusk Council",
      "type": "faction",
      "confidence": 0.94
    }
  ],
  "nodesAdded": [
    {
      "graphType": "political_web",
      "nodeType": "npc",
      "name": "Elara Moonwhisper",
      "nodeId": "node-elara-001"
    },
    {
      "graphType": "geographical",
      "nodeType": "location",
      "name": "Raven Queen's Temple",
      "nodeId": "node-temple-001"
    },
    {
      "graphType": "geographical",
      "nodeType": "location",
      "name": "Fortress of Eternal Night",
      "nodeId": "node-fortress-001"
    },
    {
      "graphType": "political_web",
      "nodeType": "faction",
      "name": "Dusk Council",
      "nodeId": "node-council-001"
    }
  ],
  "edgesAdded": [
    {
      "graphType": "political_web",
      "relationshipType": "allied_with",
      "source": "Elara Moonwhisper",
      "target": "Dusk Council",
      "edgeId": "edge-001"
    },
    {
      "graphType": "geographical",
      "relationshipType": "located_in",
      "source": "Raven Queen's Temple",
      "target": "Shadowfell",
      "edgeId": "edge-002"
    },
    {
      "graphType": "geographical",
      "relationshipType": "located_in",
      "source": "Fortress of Eternal Night",
      "target": "Shadowfell",
      "edgeId": "edge-003"
    }
  ],
  "cardsCreated": [
    {
      "title": "Elara Moonwhisper",
      "category": "NPCs",
      "cardId": "card-elara-001"
    },
    {
      "title": "Dusk Council",
      "category": "Factions",
      "cardId": "card-council-001"
    }
  ],
  "potentialConflicts": [
    {
      "description": "Session Recap #11 states the Dusk Council was disbanded. This recap suggests they are still active.",
      "sourceCardId": "card-council-001",
      "conflictingRecapId": "recap-session-11",
      "severity": "medium"
    }
  ]
}
```

**Validation**:
- ✅ Entities extracted with confidence scores
- ✅ Fuzzy matching detected existing "Shadowfell" node (score 0.85 ≥ 0.7 threshold)
- ✅ 4 new nodes created (Elara, Temple, Fortress, Dusk Council)
- ✅ 3 edges created (relationships inferred from text)
- ✅ 2 cards created (NPCs and Factions categories)
- ✅ Timeline conflict detected (Dusk Council contradiction)
- ✅ Import session status = 'pending_approval'

---

#### 1.5 Approve Import
```bash
curl -X POST http://localhost:3000/api/import/approve \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "import-session-001"
  }'
```

**Expected Response** (200):
```json
{
  "sessionId": "import-session-001",
  "status": "approved",
  "batchId": "import-batch-001"
}
```

**Database Validation**:
```sql
-- Verify nodes were created
SELECT * FROM graph_nodes WHERE id IN ('node-elara-001', 'node-temple-001', 'node-fortress-001', 'node-council-001');
-- Expected: 4 rows

-- Verify edges were created
SELECT * FROM graph_edges WHERE id IN ('edge-001', 'edge-002', 'edge-003');
-- Expected: 3 rows

-- Verify cards were created
SELECT * FROM cards WHERE id IN ('card-elara-001', 'card-council-001');
-- Expected: 2 rows with import_batch_id = 'import-batch-001'

-- Verify import session status
SELECT status, completed_at FROM import_sessions WHERE id = 'import-session-001';
-- Expected: status = 'approved', completed_at = [timestamp]
```

**Validation**:
- ✅ Import session status = 'approved'
- ✅ Import session completedAt timestamp set
- ✅ All nodes, edges, cards committed to database
- ✅ Cards linked to import_batch_id
- ✅ Knowledge graphs lastUpdated timestamps updated

---

## Workflow 2: Import Character Notes with Revert

**FR Coverage**: FR-001 to FR-046 (Import with batch revert)

### Setup
1. Prepare character notes text file:
   ```
   Character: Theron Blackwood
   Race: Human
   Class: Paladin
   Background: Theron was a knight of the Silver Order before his fall from grace.
   He now seeks redemption by serving the Raven Queen.
   ```

### Test Steps

#### 2.1 Create Import Session and Upload
```bash
# Create session
SESSION_ID=$(curl -X POST http://localhost:3000/api/import/session \
  -H "Content-Type: application/json" \
  -d '{"campaignId": "campaign-123"}' | jq -r '.id')

# Upload text
curl -X POST http://localhost:3000/api/import/upload \
  -F "sessionId=$SESSION_ID" \
  -F "text=Character: Theron Blackwood..." \
  -F "fileName=theron-notes.txt"
```

#### 2.2 Chat and Extract
```bash
curl -X POST http://localhost:3000/api/import/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"message\": \"Extract this character and create nodes for Theron and the Silver Order faction.\"
  }"
```

#### 2.3 Approve Import
```bash
BATCH_ID=$(curl -X POST http://localhost:3000/api/import/approve \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION_ID\"}" | jq -r '.batchId')
```

**Database State**:
```sql
-- Verify 2 new nodes created
SELECT COUNT(*) FROM graph_nodes WHERE source_card_id IN (
  SELECT id FROM cards WHERE import_batch_id = '$BATCH_ID'
);
-- Expected: 2 (Theron, Silver Order)
```

---

#### 2.4 Revert Import Batch
```bash
curl -X POST http://localhost:3000/api/import/revert \
  -H "Content-Type: application/json" \
  -d "{
    \"batchId\": \"$BATCH_ID\"
  }"
```

**Expected Response** (200):
```json
{
  "batchId": "import-batch-002",
  "deletedCounts": {
    "nodes": 2,
    "edges": 0,
    "cards": 2
  }
}
```

**Database Validation**:
```sql
-- Verify nodes deleted
SELECT COUNT(*) FROM graph_nodes WHERE id IN (
  SELECT json_each.value FROM import_batches, json_each(node_ids) WHERE import_batches.id = '$BATCH_ID'
);
-- Expected: 0

-- Verify cards deleted
SELECT COUNT(*) FROM cards WHERE import_batch_id = '$BATCH_ID';
-- Expected: 0

-- Verify batch still exists (for audit)
SELECT * FROM import_batches WHERE id = '$BATCH_ID';
-- Expected: 1 row (batch record preserved)

-- Verify import session status
SELECT status FROM import_sessions WHERE id = '$SESSION_ID';
-- Expected: 'reverted'
```

**Validation**:
- ✅ All nodes in batch deleted (cascade)
- ✅ All edges referencing deleted nodes deleted (cascade)
- ✅ All cards in batch deleted
- ✅ Import session status = 'reverted'
- ✅ Batch record preserved for audit trail

---

## Workflow 3: Planning Session with Graph Updates

**FR Coverage**: FR-043, FR-066 to FR-070 (Planning AI workflow)

### Test Steps

#### 3.1 Create Planning Session
```bash
curl -X POST http://localhost:3000/api/planning/session \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign-123",
    "initialPrompt": "I am planning session 13. The party will confront the Dusk Council at the Fortress of Eternal Night."
  }'
```

**Expected Response** (201):
```json
{
  "id": "planning-session-001",
  "campaignId": "campaign-123",
  "status": "active",
  "chatHistory": [
    {
      "role": "user",
      "content": "I am planning session 13. The party will confront the Dusk Council...",
      "timestamp": "2025-10-01T11:00:00Z"
    }
  ],
  "graphUpdates": [],
  "createdAt": "2025-10-01T11:00:00Z"
}
```

---

#### 3.2 Chat with Planning AI
```bash
curl -X POST http://localhost:3000/api/planning/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "planning-session-001",
    "message": "What NPCs should I introduce as Dusk Council members? Add them to the graph."
  }'
```

**Expected Response** (200, SSE stream):
```
data: {"type": "chunk", "content": "For the Dusk Council confrontation, I recommend introducing:\n\n"}

data: {"type": "chunk", "content": "1. **Lord Varis Shadowmere** - Council leader, master of shadow magic\n"}

data: {"type": "graph_update", "update": {"type": "node_add", "graphType": "political_web", "nodeId": "node-varis-001", "data": {"name": "Lord Varis Shadowmere", "type": "npc", "attributes": {"description": "Council leader, master of shadow magic", "tags": ["active", "party-relevant"]}}}}

data: {"type": "chunk", "content": "2. **Seraphine the Whisperer** - Council spy master\n"}

data: {"type": "graph_update", "update": {"type": "node_add", "graphType": "political_web", "nodeId": "node-seraphine-001", "data": {"name": "Seraphine the Whisperer", "type": "npc", "attributes": {"description": "Council spy master", "tags": ["active"]}}}}

data: {"type": "graph_update", "update": {"type": "edge_add", "graphType": "political_web", "edgeId": "edge-varis-council", "data": {"sourceNodeId": "node-varis-001", "targetNodeId": "node-council-001", "relationshipType": "leads", "attributes": {"strength": 1.0}}}}

data: {"type": "graph_update", "update": {"type": "edge_add", "graphType": "political_web", "edgeId": "edge-seraphine-council", "data": {"sourceNodeId": "node-seraphine-001", "targetNodeId": "node-council-001", "relationshipType": "member_of", "attributes": {"strength": 0.9}}}}

data: {"type": "chunk", "content": "\nI've added both to the Political-Web graph with relationships to the Dusk Council."}

data: {"type": "done", "sessionId": "planning-session-001"}
```

**Database Validation**:
```sql
-- Verify nodes created immediately (no approval workflow)
SELECT * FROM graph_nodes WHERE id IN ('node-varis-001', 'node-seraphine-001');
-- Expected: 2 rows

-- Verify edges created
SELECT * FROM graph_edges WHERE id IN ('edge-varis-council', 'edge-seraphine-council');
-- Expected: 2 rows

-- Verify graph updates recorded in planning session
SELECT graph_updates FROM planning_sessions WHERE id = 'planning-session-001';
-- Expected: JSONB array with 4 updates (2 node_add, 2 edge_add)

-- Verify knowledge graph lastUpdated
SELECT last_updated FROM knowledge_graphs WHERE campaign_id = 'campaign-123' AND type = 'political_web';
-- Expected: Timestamp ≥ planning session creation time
```

**Validation**:
- ✅ Planning AI generates NPCs based on context
- ✅ Graph updates applied immediately during chat (no approval)
- ✅ SSE stream includes "graph_update" events
- ✅ graphUpdates array in PlanningSession populated incrementally
- ✅ Knowledge graph lastUpdated timestamp updated

---

#### 3.3 Complete Planning Session
```bash
curl -X PATCH http://localhost:3000/api/planning/session/planning-session-001 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

**Expected Response** (200):
```json
{
  "id": "planning-session-001",
  "campaignId": "campaign-123",
  "status": "completed",
  "chatHistory": [...],
  "graphUpdates": [
    {
      "type": "node_add",
      "graphType": "political_web",
      "nodeId": "node-varis-001",
      "data": {...},
      "appliedAt": "2025-10-01T11:05:00Z"
    },
    ...
  ],
  "createdAt": "2025-10-01T11:00:00Z",
  "completedAt": "2025-10-01T11:10:00Z"
}
```

**Validation**:
- ✅ Planning session status = 'completed'
- ✅ Planning session completedAt timestamp set
- ✅ All graph updates preserved in session record

---

## Workflow 4: Knowledge Graph Inspection (Active Filtering)

**FR Coverage**: FR-065, FR-066 (Active filtering for Political-Web and Campaign-Story)

### Setup
- Political-Web graph has 10 NPCs and 5 factions from previous imports
- Last 5 session recaps mention: "Elara Moonwhisper", "Dusk Council", "Lord Varis Shadowmere"
- 3 NPCs have `tags: ["active"]`
- 2 NPCs have `tags: ["party-relevant"]`

### Test Steps

#### 4.1 Get Full Political-Web Graph
```bash
curl -X GET "http://localhost:3000/api/graphs/political_web?campaignId=campaign-123&filter=all"
```

**Expected Response** (200):
```json
{
  "graph": {
    "id": "graph-political-web-001",
    "campaignId": "campaign-123",
    "type": "political_web",
    "lastUpdated": "2025-10-01T11:10:00Z",
    "createdAt": "2025-10-01T09:00:00Z"
  },
  "nodes": [...], // 15 nodes total (10 NPCs + 5 factions)
  "edges": [...], // 20 edges
  "filterApplied": "all"
}
```

**Validation**:
- ✅ All nodes returned (no filtering)
- ✅ Total count: 15 nodes

---

#### 4.2 Get Active-Filtered Political-Web Graph
```bash
curl -X GET "http://localhost:3000/api/graphs/political_web?campaignId=campaign-123&filter=active"
```

**Expected Response** (200):
```json
{
  "graph": {...},
  "nodes": [
    {
      "id": "node-elara-001",
      "name": "Elara Moonwhisper",
      "attributes": {
        "tags": ["active", "party-relevant"]
      },
      ...
    },
    {
      "id": "node-council-001",
      "name": "Dusk Council",
      "attributes": {
        "tags": ["active"]
      },
      ...
    },
    {
      "id": "node-varis-001",
      "name": "Lord Varis Shadowmere",
      "attributes": {
        "tags": ["active", "party-relevant"]
      },
      ...
    },
    ... // 2 more nodes with tags or recent mentions
  ],
  "edges": [...], // Edges connecting active nodes only
  "filterApplied": "active"
}
```

**Validation**:
- ✅ Only 5 nodes returned (down from 15)
- ✅ Elara, Dusk Council, Varis included (mentioned in last 5 session recaps)
- ✅ 2 additional nodes included (have "active" or "party-relevant" tags)
- ✅ Edges filtered to only connect active nodes
- ✅ 10 inactive NPCs/factions excluded from response

**Active Filtering Logic**:
```typescript
// Verified implementation matches research.md §10
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

## Workflow 5: Manual Graph Editing via UI

**FR Coverage**: FR-080 to FR-081 (GM manual graph CRUD operations)

### Test Steps

#### 5.1 Create Node Manually
```bash
curl -X POST http://localhost:3000/api/graphs/world_foundations/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign-123",
    "nodeType": "lore",
    "name": "The Weave of Souls",
    "attributes": {
      "description": "Ancient magic system that binds souls to the Shadowfell",
      "tags": []
    }
  }'
```

**Expected Response** (201):
```json
{
  "id": "node-weave-001",
  "graphId": "graph-world-foundations-001",
  "type": "lore",
  "name": "The Weave of Souls",
  "attributes": {
    "description": "Ancient magic system that binds souls to the Shadowfell",
    "tags": []
  },
  "sourceCardId": null,
  "informationLevelId": null,
  "createdAt": "2025-10-01T12:00:00Z",
  "updatedAt": "2025-10-01T12:00:00Z"
}
```

**Validation**:
- ✅ Node created in World-Foundations graph
- ✅ No sourceCardId (manually created, not from Import AI)
- ✅ Knowledge graph lastUpdated timestamp updated

---

#### 5.2 Update Node Manually
```bash
curl -X PATCH http://localhost:3000/api/graphs/world_foundations/nodes/node-weave-001 \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "description": "Ancient magic system that binds souls to the Shadowfell. Used by the Raven Queen.",
      "tags": ["core-lore"]
    }
  }'
```

**Expected Response** (200):
```json
{
  "id": "node-weave-001",
  "attributes": {
    "description": "Ancient magic system that binds souls to the Shadowfell. Used by the Raven Queen.",
    "tags": ["core-lore"]
  },
  "updatedAt": "2025-10-01T12:05:00Z",
  ...
}
```

**Validation**:
- ✅ Node attributes updated (merged with existing)
- ✅ updatedAt timestamp updated

---

#### 5.3 Create Edge Manually
```bash
curl -X POST http://localhost:3000/api/graphs/world_foundations/edges \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign-123",
    "sourceNodeId": "node-weave-001",
    "targetNodeId": "node-raven-queen-001",
    "relationshipType": "created_by",
    "attributes": {
      "strength": 1.0,
      "description": "The Raven Queen created the Weave of Souls"
    }
  }'
```

**Expected Response** (201):
```json
{
  "id": "edge-weave-raven-001",
  "graphId": "graph-world-foundations-001",
  "sourceNodeId": "node-weave-001",
  "targetNodeId": "node-raven-queen-001",
  "relationshipType": "created_by",
  "attributes": {
    "strength": 1.0,
    "description": "The Raven Queen created the Weave of Souls"
  },
  "createdAt": "2025-10-01T12:10:00Z",
  "updatedAt": "2025-10-01T12:10:00Z"
}
```

**Validation**:
- ✅ Edge created between two nodes in same graph
- ✅ Relationship type is domain-specific (World-Foundations: "created_by")

---

#### 5.4 Delete Node Manually
```bash
curl -X DELETE http://localhost:3000/api/graphs/world_foundations/nodes/node-weave-001
```

**Expected Response** (204):
```
(No content)
```

**Database Validation**:
```sql
-- Verify node deleted
SELECT COUNT(*) FROM graph_nodes WHERE id = 'node-weave-001';
-- Expected: 0

-- Verify edges cascade deleted
SELECT COUNT(*) FROM graph_edges WHERE source_node_id = 'node-weave-001' OR target_node_id = 'node-weave-001';
-- Expected: 0
```

**Validation**:
- ✅ Node deleted
- ✅ All edges referencing the node cascade deleted

---

## Workflow 6: Custom AI Instructions via Campaign Settings

**FR Coverage**: FR-048 (System prompt injection via Campaign Settings UI)

### Setup
- Campaign Settings UI has "AI Instructions" text area
- GM can customize system prompts for Import AI and Planning AI

### Test Steps

#### 6.1 Configure Custom Instructions (UI Mock)
```json
// Campaign settings payload
{
  "campaignId": "campaign-123",
  "aiInstructions": {
    "importAI": "You are an AI assistant helping a GM import session notes for a dark fantasy campaign set in Ravenloft. Always prioritize extracting NPCs with tragic backstories. For locations, emphasize gothic horror atmosphere.",
    "planningAI": "You are an AI assistant helping a GM plan sessions for a narrative-heavy campaign. Focus on character development and moral dilemmas. Suggest NPCs that challenge the party's ethics."
  }
}
```

**Expected Behavior**:
- ✅ Campaign settings saved to `campaigns` table (extend schema with `ai_instructions` JSONB column)
- ✅ Import AI loads custom system prompt from campaign settings before processing
- ✅ Planning AI loads custom system prompt from campaign settings before chat

---

#### 6.2 Test Custom Instructions in Import Session
```bash
# Create import session with custom instructions
SESSION_ID=$(curl -X POST http://localhost:3000/api/import/session \
  -H "Content-Type: application/json" \
  -d '{"campaignId": "campaign-123"}' | jq -r '.id')

# Upload text
curl -X POST http://localhost:3000/api/import/upload \
  -F "sessionId=$SESSION_ID" \
  -F "text=A mysterious stranger arrived at the village, seeking redemption for past sins." \
  -F "fileName=stranger.txt"

# Chat
curl -X POST http://localhost:3000/api/import/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"message\": \"Extract the NPC and create a node.\"
  }"
```

**Expected AI Response** (influenced by custom instructions):
```
I've extracted the following NPC with a tragic backstory:

**Name**: The Stranger
**Type**: NPC
**Backstory**: Seeking redemption for past sins (tragic element emphasized per campaign style)
**Atmosphere**: Mysterious, dark fantasy tone

Creating node in Political-Web graph...
```

**Validation**:
- ✅ Import AI response reflects custom system prompt (emphasizes "tragic backstories")
- ✅ LLM context includes campaign-specific instructions
- ✅ Entity extraction aligns with campaign theme (dark fantasy, Ravenloft)

---

#### 6.3 Test Custom Instructions in Planning Session
```bash
# Create planning session
PLANNING_ID=$(curl -X POST http://localhost:3000/api/planning/session \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign-123",
    "initialPrompt": "The party is about to decide whether to ally with the Dusk Council or the Raven Queen."
  }' | jq -r '.id')

# Chat with Planning AI
curl -X POST http://localhost:3000/api/planning/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$PLANNING_ID\",
    \"message\": \"What moral dilemmas should I introduce?\"
  }"
```

**Expected AI Response** (influenced by custom instructions):
```
For this decision, I recommend introducing moral dilemmas that challenge the party's ethics:

1. **The Dusk Council's Offer**: They promise to restore the party's fallen comrade, but require them to betray the Raven Queen. This tests loyalty vs. personal loss.

2. **The Raven Queen's Demand**: She asks the party to execute a member of the Dusk Council who is actually innocent. This tests justice vs. pragmatism.

I'll add a new NPC to represent this moral complexity...
```

**Validation**:
- ✅ Planning AI response reflects custom system prompt (emphasizes "moral dilemmas")
- ✅ Suggestions align with "narrative-heavy campaign" theme
- ✅ LLM context includes campaign-specific instructions

---

## Success Criteria

### All Workflows Must Pass:
- ✅ Workflow 1: Import session recap end-to-end (FR-001 to FR-042)
- ✅ Workflow 2: Import with batch revert (FR-044 to FR-046)
- ✅ Workflow 3: Planning session with immediate graph updates (FR-043, FR-066 to FR-070)
- ✅ Workflow 4: Knowledge graph active filtering (FR-065, FR-066)
- ✅ Workflow 5: Manual graph CRUD operations (FR-080 to FR-081)
- ✅ Workflow 6: Custom AI instructions (FR-048)

### Performance Benchmarks:
- Entity extraction: < 5 seconds for 500-word recap
- LLM streaming: First chunk within 2 seconds
- Graph query (active filter): < 200ms for 100-node graph
- Batch revert: < 1 second for 50-entity batch

### Data Integrity:
- Fuzzy matching prevents duplicate entities (threshold 0.7)
- Timeline conflict detection against Session Recaps
- Cascade deletes maintain referential integrity
- JSONB validation for all JSON columns

---

## Troubleshooting

### Issue: Import AI Not Extracting Entities
**Symptom**: Approval summary shows 0 entities extracted
**Fix**:
1. Check LLM system prompt in campaign settings
2. Verify LLM credentials (Feature 008)
3. Increase confidence threshold (default 0.6)

### Issue: Active Filtering Returns Too Many Nodes
**Symptom**: Active filter returns > 20% of total nodes
**Fix**:
1. Verify last 5 session recaps are populated
2. Check node tags (remove stale "active" tags)
3. Reduce session window (5 → 3 sessions)

### Issue: Batch Revert Fails
**Symptom**: Nodes/edges not deleted after revert
**Fix**:
1. Check foreign key constraints (CASCADE DELETE enabled)
2. Verify import_batch_id links in cards table
3. Re-run migration script for Phase 2 (Card extension)

---

**End of Quickstart Guide**
