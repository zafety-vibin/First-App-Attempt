# Research: Model Context Protocol (MCP) Integration

**Feature**: 011-create-model-context
**Date**: 2025-10-03
**Status**: Complete

## Research Questions

### 1. Tool Timeout Value
**Question**: What timeout value prevents hanging while allowing complex queries?

**Decision**: **10 seconds**

**Rationale**:
- Complex graph queries (500 nodes + 1000 edges) may need 2-3 seconds
- Search queries with fuzzy matching need 1-2 seconds
- 10s provides 3-5x safety margin for worst-case scenarios
- Anthropic MCP examples typically use 5-30s timeouts
- Local SQLite operations rarely exceed 1s, making 10s conservative

**Alternatives Considered**:
- 5s: Too aggressive, may timeout legitimate complex queries
- 30s: Too permissive, poor UX for truly hanging operations
- 60s: Unacceptable wait time for user-facing AI features

### 2. Graph Node/Edge JSONB Schema
**Question**: What attributes are required vs optional for knowledge graph nodes/edges?

**Decision**: **Use existing schema from Feature 006 (no changes needed)**

**Rationale**:
- Feature 006 already defines graph schema in `knowledge_graphs`, `graph_nodes`, `graph_edges` tables
- MCP tools simply expose existing CRUD operations, don't change data model
- Existing schema supports user-defined attributes via JSONB (flexible)
- MCP validation uses existing schema as source of truth

**Existing Schema** (from Feature 006):
- **Nodes**: id, graph_id, name, node_type, attributes (JSONB), information_level_id, created_at, updated_at
- **Edges**: id, graph_id, from_node_id, to_node_id, relationship_type, attributes (JSONB), created_at, updated_at

**Alternatives Considered**:
- Define new stricter schema: Rejected - breaks existing graphs, violates "no new data structures" principle
- Validate node_type enum: Rejected - Feature 006 allows custom types like "custom:{type}"

---

## MCP SDK Best Practices

### Research Task 1: @modelcontextprotocol/sdk Tool Registration Patterns

**Source**: Anthropic MCP SDK documentation, GitHub examples

**Key Findings**:
1. **Tool registration uses decorators or explicit registration**:
   ```typescript
   server.tool('read_card', {
     description: 'Read a campaign card by ID',
     schema: ReadCardSchema,
     handler: async (params) => { /* implementation */ }
   });
   ```

2. **Schema validation with Zod**:
   - MCP SDK integrates with Zod for runtime schema validation
   - Define input schema, SDK validates before calling handler
   - Automatic error responses for invalid inputs

3. **Error handling pattern**:
   ```typescript
   if (!card) {
     return {
       isError: true,
       content: [{
         type: 'text',
         text: JSON.stringify({
           error: 'NOT_FOUND',
           message: `Card not found: ${cardId}`
         })
       }]
     };
   }
   ```

4. **Stdio communication**:
   - MCP server reads from stdin, writes to stdout (JSON-RPC)
   - SDK handles message framing automatically
   - Logging must go to stderr (stdout reserved for protocol)

**Recommendation**: Use explicit tool registration with Zod schemas. Follow error response pattern for consistency.

### Research Task 2: Atomic Transaction Patterns with Better-SQLite3

**Source**: Better-SQLite3 documentation, SQLite transaction docs

**Key Findings**:
1. **Transaction wrapper pattern**:
   ```typescript
   const transaction = db.transaction((params) => {
     // Multiple statements here
     db.prepare('INSERT INTO cards ...').run(...);
     db.prepare('UPDATE parent SET ...').run(...);
   });

   try {
     transaction(params); // All-or-nothing
   } catch (error) {
     // Rollback automatic on exception
   }
   ```

2. **Isolation levels**:
   - SQLite uses serializable isolation by default
   - WAL mode (already enabled) allows concurrent reads during write

3. **Nested transaction limitation**:
   - SQLite doesn't support nested transactions
   - Use savepoints for nested rollback points

4. **Deadlock prevention**:
   - Acquire locks in consistent order
   - Keep transactions short (<100ms ideal)

**Recommendation**: Create middleware that wraps all tool handlers in db.transaction(). Catch errors and let transaction auto-rollback.

### Research Task 3: Permission Enforcement Integration

**Source**: Existing CardService.ts, ViewModeService.ts patterns

**Key Findings**:
1. **Campaign ownership check** (existing pattern in CardService):
   ```typescript
   const card = db.prepare('SELECT * FROM cards WHERE id = ? AND campaign_id = ?')
     .get(cardId, campaignId);
   ```

2. **Information level filtering** (existing pattern in ViewModeService):
   - X-View-Mode header determines filtering mode
   - MCP tools need equivalent "context" parameter
   - Filter at query level, not post-query

3. **Permission context injection**:
   - MCP tools receive campaign_id from AI context (Feature 005 responsible)
   - User ID available from BYOLLM session (Feature 008)
   - Information level from AI's current view mode

**Recommendation**: Create permissions middleware that injects WHERE campaign_id = ? into all queries. Separate information level filter applied per tool.

---

## Integration Patterns

### Pattern 1: Tool Call Flow
```
AI (Feature 005) → MCP Server (stdio) → Tool Handler → Permissions Middleware →
Transaction Middleware → CardService/GraphService → SQLite → Response → AI
```

### Pattern 2: Concurrent Request Handling
- Node.js single-threaded, handles concurrency via event loop
- Better-SQLite3 synchronous, but WAL mode allows concurrent reads
- Transaction middleware serializes writes automatically
- Target: 5 concurrent tool calls (validated via integration test)

### Pattern 3: Fuzzy Entity Matching
**Problem**: Import AI might create duplicate NPCs if "Gandalf" and "Gandalf the Grey" both exist

**Solution**: Use Levenshtein distance (existing pattern from Feature 005 research):
```typescript
// search_cards tool includes similarity threshold
searchCards({ query: 'Gandalf', similarity: 0.8 })
// Returns existing "Gandalf the Grey" as potential match
```

**Implementation**: SQLite doesn't have built-in Levenshtein. Options:
1. Implement in JavaScript, filter results post-query (acceptable for <1000 cards)
2. Use full-text search with LIKE %query% (faster, less accurate)

**Recommendation**: Use LIKE for speed, optionally apply JS Levenshtein if results < 100.

---

## Decision Summary

| Question | Decision | Rationale |
|----------|----------|-----------|
| Tool timeout | 10 seconds | 3-5x margin for complex queries, conservative for local SQLite |
| Graph schema | No changes (use Feature 006 schema) | MCP exposes existing operations, doesn't change data model |
| SDK usage | @modelcontextprotocol/sdk with Zod schemas | Official SDK, built-in validation, stdio handling |
| Transactions | Middleware wrapping all handlers in db.transaction() | Automatic rollback, consistent pattern |
| Permissions | Inject campaign_id into queries, filter by info level | Reuses existing CardService/ViewModeService patterns |
| Fuzzy matching | SQL LIKE + optional Levenshtein | Balance speed vs accuracy |
| Concurrency | Node.js event loop + WAL mode | Handles 5 concurrent reads/writes naturally |

---

## Open Questions
None - all NEEDS CLARIFICATION resolved.

## Next Phase
Proceed to Phase 1: Design & Contracts (data-model.md, contracts, quickstart.md)
