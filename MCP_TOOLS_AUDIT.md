# MCP Tools Architecture Update Audit

**Date**: 2025-11-06
**Feature**: 011-create-model-context
**Status**: Needs comprehensive update for current architecture

---

## Executive Summary

MCP tools (Feature 011) were implemented in October 2025 before major architectural changes:
- Information level value unification (hyphens, not underscores)
- ViewMode system unification (informationFilter.ts deleted, merged to viewMode.ts)
- BaseCategoryService standardization across all 13 categories
- Junction tables replacing JSON arrays (28 tables)
- External API patterns from Feature 018

**Impact**: MCP tool documentation, schemas, and implementations reference outdated architecture. Tools may work but documentation misleads AI agents (Claude Desktop).

**Recommendation**: Update all 29 tools + 3 resources + 2 prompts before declaring Feature 011 complete.

---

## Critical Issues Found

### 1. Information Level Values - WRONG EVERYWHERE

**Location**: `backend/src/mcp/tools/index.ts:122-126`

**Current (WRONG)**:
```
**player_knowledge**: enum ['common_knowledge', 'player_knowledge', 'dm_only', custom]
  - common_knowledge: Public info everyone knows
  - player_knowledge: Players discovered in-game
  - dm_only: Hidden from player_view
```

**Should Be (CORRECT)**:
```
**player_knowledge**: enum ['common-knowledge', 'player-knowledge', 'dm-secret', 'system', custom]
  - system: Meta/structural (not in-world content)
  - common-knowledge: Public info everyone knows
  - player-knowledge: Players discovered in-game
  - dm-secret: Hidden from player_view (DM secrets)
  - custom: User-defined levels (UUID format)
```

**Affected Files** (estimated 10+):
- `backend/src/mcp/tools/index.ts` - Main documentation
- `backend/src/mcp/tools/info-level-tools.ts` - Lines 277-283, 429-431, 543-547
- All 13 category tool implementations (create/update operations)
- All category schemas (Zod validation)

**Impact**: AI agents using MCP tools send wrong values (`dm_only`), which fail validation or get converted by Migration 027.

---

### 2. ViewMode System References Deleted Files

**Location**: `backend/src/mcp/tools/` - Multiple tool implementations

**Problem**: Tools may reference `informationFilter.ts` which was deleted and merged into `viewMode.ts`.

**Current Architecture**:
- `backend/src/middleware/viewMode.ts` - Unified middleware
- Functions: `extractViewMode()`, `stripDmFields()`, `getPlayerKnowledgeFilter()`
- X-View-Mode header: `dm_view` or `player_view`

**What to Check**:
- Do MCP tools reference old `informationFilter` service?
- Do they document the X-View-Mode header correctly?
- Do they explain hierarchical flag filtering?

---

### 3. JSON Array Relationships vs Junction Tables

**Location**: All 13 category tool docs

**Problem**: Documentation shows relationships as JSON arrays, but actual implementation uses junction tables.

**Example - NPCs (index.ts:149+)**:
```
**Current Docs**:
- locations: array of location IDs

**Actual Implementation**:
- npc_locations junction table (npc_id, location_id)
- Frontend sees it as array (services populate from junction)
- But backend storage is relational, not JSON
```

**Impact**:
- Documentation technically correct from API perspective (arrays returned)
- But misleading about backend architecture
- Should note junction table pattern for transparency

**Affected**: All categories with relationships (11 of 13)

---

### 4. Session Prep Documentation

**Location**: `backend/src/mcp/tools/index.ts:89`

**Current**:
```
**session_prep** - DM planning notes (always dm_only, hidden from players)
```

**Should Be**:
```
**session_prep** - DM planning notes (always dm-secret, hidden from players)
```

Also check if canonical_status documentation is accurate (should be 'hypothetical').

---

### 5. BaseCategoryService Standardization Not Documented

**Problem**: MCP docs don't explain that all 13 categories follow identical CRUD patterns via BaseCategoryService.

**Benefits to Document**:
- Consistent `.list(filters, pagination, sort, order)` interface
- Standard filtering (campaign_id, core_status, player_knowledge, tags)
- Pagination (limit/offset)
- Information filtering via X-View-Mode header
- Foreign key validation
- Junction table population

**Impact**: AI agents don't know the API is consistent across categories.

---

### 6. External API Pattern (Feature 018) Not Referenced

**Problem**: MCP tools don't reference the conversational External API from Feature 018 (localhost:3002).

**Opportunity**:
- Feature 018 provides AI-friendly query/create/update/delete endpoints
- Could be documented as alternative to MCP tools for Claude Desktop
- Two-phase delete, information filtering, audit logging patterns established

**Question**: Should MCP tools reference External API or keep them separate?

---

## Files Requiring Updates

### High Priority (Blocking Feature 011 Completion)

1. **backend/src/mcp/tools/index.ts** (Main documentation)
   - Lines 122-127: Fix player_knowledge enum values
   - Line 89: Fix session_prep dm_only → dm-secret
   - Add BaseCategoryService pattern explanation
   - Add note about junction tables vs JSON arrays

2. **backend/src/mcp/tools/info-level-tools.ts** (Information level utilities)
   - Lines 277-283: Fix enum value docs
   - Lines 429-431: Fix mapping examples
   - Lines 543-547: Fix hierarchy_level → player_knowledge mapping

3. **backend/src/mcp/schemas/** (All Zod schemas - 29 files)
   - Check if player_knowledge validation uses correct values
   - Update enum constraints if hardcoded

### Medium Priority

4. **backend/src/mcp/tools/category-tools.ts** (13 category create/update operations)
   - Update default values (dm_only → dm-secret)
   - Document junction table behavior

5. **backend/src/mcp/prompts/** (2 prompt templates)
   - import_workflow.md
   - planning_workflow.md
   - Check if they reference old values

6. **backend/src/mcp/resources/** (3 browsable resources)
   - campaign://cards
   - campaign://recaps
   - campaign://graphs
   - Verify resource schemas match current data model

### Low Priority (Polish)

7. **backend/src/mcp/README.md** or equivalent
   - Add architecture overview
   - Reference Feature 018 External API
   - Document batch fetching optimizations (relevant for performance)

---

## Architecture Changes to Incorporate

### From Our Recent Work (2025-11-05/06)

1. **Information Levels** (Migration 024, 027):
   - Hyphenated IDs: common-knowledge, player-knowledge, dm-secret, system
   - Custom levels: UUID format
   - Hierarchical flag: 0 = visible in player_view, 1 = hidden

2. **ViewMode System**:
   - Unified to viewMode.ts middleware
   - informationFilter.ts deleted
   - X-View-Mode header: dm_view | player_view

3. **Junction Tables** (Migration 025, 026):
   - 28 junction tables replace JSON arrays
   - Services populate relationship arrays from junction tables
   - API still returns arrays (transparent to MCP clients)

4. **Batch Fetching** (Today's commits):
   - All 11 services with relationships use batch fetching
   - 98% query reduction
   - Sub-500ms list performance

5. **Session Prep**:
   - player_knowledge always 'dm-secret' (not dm_only)
   - canonical_status always 'hypothetical'

---

## Recommended Update Strategy

### Phase 1: Documentation (2-3 hours)
- Update index.ts main docs with correct values
- Update info-level-tools.ts mappings
- Add "Architecture Notes" section explaining current patterns

### Phase 2: Schema Validation (3-4 hours)
- Audit all 29 Zod schemas in `backend/src/mcp/schemas/`
- Update enum validations to accept hyphens
- Ensure backwards compatibility if needed

### Phase 3: Tool Implementations (4-6 hours)
- Review all 29 tool implementations
- Update any hardcoded default values
- Test each tool with Claude Desktop

### Phase 4: Testing (2-3 hours)
- Test tools with actual Claude Desktop
- Verify information filtering works correctly
- Test junction table relationship operations

**Total Effort**: 11-16 hours

---

## Code Execution MCP - Context Saving Opportunity

### What It Is

Per https://www.anthropic.com/engineering/code-execution-with-mcp:
- Claude can execute Python/JavaScript code in a sandboxed environment
- Results streamed back to Claude
- **Reduces context usage** by offloading computation

### Current Problem in VVD-Mimic

**Scenario**: AI wants to analyze campaign data
- **Old way**: Fetch all 200 NPCs → 50KB context → Claude processes in-prompt
- **New way**: Execute code that queries/filters/aggregates → return summary → 2KB context

### Opportunities for VVD-Mimic

#### 1. Campaign Analytics Queries
**Current**: Claude requests all entities, processes in context
**Better**: Execute SQL query via MCP code execution, return summary

Example:
```javascript
// Instead of sending 200 NPC records to Claude
// Execute this and send only results (10 lines vs 200 records):
const factionCounts = db.prepare(`
  SELECT
    f.name as faction,
    COUNT(DISTINCT fm.npc_id) as member_count
  FROM factions f
  LEFT JOIN faction_members fm ON f.id = fm.faction_id
  GROUP BY f.id
  ORDER BY member_count DESC
`).all();

return factionCounts; // [{faction: "Thieves Guild", member_count: 15}, ...]
```

**Context Savings**: 50KB → 1KB

#### 2. Knowledge Graph Analysis
**Current**: Fetch entire graph JSON, analyze in prompt
**Better**: Execute graph traversal code, return paths/insights

```javascript
// Find shortest path between two NPCs in Political-Web
const path = findShortestPath(graph, "Elara", "Corvus");
return path; // ["Elara", "Council", "Mages Guild", "Corvus"]
```

**Context Savings**: 100KB graph → 500 bytes path

#### 3. Entity Extraction Preprocessing
**Current**: Send entire recap text to Claude for entity extraction
**Better**: Pre-process text to extract candidate entities

```javascript
// Extract all proper nouns and capitalized phrases
const candidates = extractProperNouns(recapText);
return candidates; // ["Elara", "Accord Sanctum", "Corvus", ...]
```

**Context Savings**: 10KB text → 500 bytes candidates

#### 4. Relationship Graph Queries
**Current**: Send all faction relationships, Claude analyzes
**Better**: Execute graph query for specific question

```javascript
// "Which factions are allied with Thieves Guild?"
const allies = db.prepare(`
  SELECT f.name
  FROM faction_alliances fa
  JOIN factions f ON fa.allied_faction_id = f.id
  WHERE fa.faction_id = (SELECT id FROM factions WHERE name = 'Thieves Guild')
`).all();

return allies.map(a => a.name); // ["Merchants", "Beggars"]
```

**Context Savings**: 20KB all factions → 200 bytes result

---

## How to Implement Code Execution MCP

### Architecture Additions

**New MCP Tool**: `execute_campaign_query`

```typescript
// backend/src/mcp/tools/code-execution.ts
{
  name: "execute_campaign_query",
  description: "Execute JavaScript code to query/analyze campaign data efficiently",
  inputSchema: z.object({
    campaign_id: z.string(),
    code: z.string(), // JavaScript code to execute
    timeout_ms: z.number().default(5000),
  }),

  handler: async ({ campaign_id, code, timeout_ms }) => {
    // Sandbox execution environment
    const vm = require('vm');
    const sandbox = {
      db: DatabaseService.db,
      campaign_id,
      console: { log: (...args) => results.push(...args) },
      // Whitelist safe modules
      _: require('lodash'),
      // No fs, no process, no network
    };

    const results = [];
    const script = new vm.Script(code);
    const context = vm.createContext(sandbox);

    const timeout = setTimeout(() => {
      throw new Error('Execution timeout');
    }, timeout_ms);

    try {
      const result = script.runInContext(context, { timeout: timeout_ms });
      clearTimeout(timeout);
      return { success: true, result, logs: results };
    } catch (error) {
      clearTimeout(timeout);
      return { success: false, error: error.message };
    }
  }
}
```

### Example Usage

**Claude Desktop Conversation**:
```
User: "Which factions have the most NPCs?"

Claude (thinks): Instead of fetching all factions and NPCs, I'll execute a query.

Claude calls MCP tool:
execute_campaign_query({
  campaign_id: "...",
  code: `
    const results = db.prepare(\`
      SELECT f.name, COUNT(fm.npc_id) as count
      FROM factions f
      LEFT JOIN faction_members fm ON f.id = fm.faction_id
      WHERE f.campaign_id = ?
      GROUP BY f.id
      ORDER BY count DESC
      LIMIT 10
    \`).all(campaign_id);

    return results;
  `
})

Response: [
  { name: "Thieves Guild", count: 15 },
  { name: "City Guard", count: 12 },
  { name: "Merchants Association", count: 8 }
]

Claude: "The Thieves Guild has the most NPCs (15 members), followed by the City Guard (12) and Merchants Association (8)."
```

**Context Usage**:
- **Without code execution**: 50KB (all factions + all NPCs)
- **With code execution**: 500 bytes (3 results)
- **Savings**: 99% reduction

---

## Implementation Checklist

### Code Execution MCP Tool

- [ ] Create `backend/src/mcp/tools/code-execution.ts`
- [ ] Add vm2 or isolated-vm for safe sandboxing (vm module alone is unsafe)
- [ ] Whitelist safe operations (read-only DB queries, lodash, etc.)
- [ ] Blacklist dangerous operations (fs, process, network, eval, Function constructor)
- [ ] Add execution timeout (default 5s, max 30s)
- [ ] Add memory limit (max 100MB)
- [ ] Test with malicious code attempts (ensure sandbox holds)
- [ ] Register tool in MCP server

### Security Considerations

**CRITICAL**: Code execution is inherently risky. Mitigations:
1. **Read-only database access** - No INSERT/UPDATE/DELETE allowed
2. **Timeout enforcement** - Kill long-running code
3. **Memory limits** - Prevent DoS via infinite loops
4. **No filesystem access** - Can't read/write files
5. **No network access** - Can't exfiltrate data
6. **Whitelist approach** - Only allow specific modules

**Safe for localhost prototype**: Yes, single-user
**Safe for production multi-tenant**: Needs extensive hardening

---

## MCP Tools Requiring Updates (29 tools)

### Information Level Tools (3 tools)
1. `list_information_levels` - ✅ Likely works (just lists from DB)
2. `create_information_level` - Check default values
3. `update_information_level` - Check validation

### Card Tools (6 tools)
4. `create_card`
5. `update_card`
6. `delete_card`
7. `move_card`
8. `reorder_cards`
9. `get_card_subtree`

**Check**: Do they document player_knowledge enum correctly?

### Hierarchy Tools (2 tools)
10. `get_hierarchy_path`
11. `navigate_hierarchy`

**Check**: Still reference informationFilter?

### Graph Tools (4 tools)
12. `create_graph`
13. `update_graph`
14. `add_graph_node`
15. `add_graph_edge`

**Check**: Junction table pattern for edges?

### Recap Tools (3 tools)
16. `create_session_recap`
17. `update_session_recap`
18. `list_session_recaps`

**Check**: Junction tables for npcs_encountered, locations_visited, quests_progressed, loot_acquired

### Database Tools (6 tools)
19. `query_database`
20. `create_database_entry`
21. `update_database_entry`
22. `delete_database_entry`
23. `list_database_entries`
24. `batch_create_entries`

**Check**: Information filtering docs

### Category Tools (13 × 2 = 26, but grouped as 5 tools)
25. `create_category_entry` (used for all 13)
26. `update_category_entry`
27. `delete_category_entry`
28. `list_category_entries`
29. `get_category_entry`

**Check**:
- Junction table relationship fields documented as arrays (correct) but note backend storage
- player_knowledge enum values
- Session prep defaults

---

## Resources (3)

1. **campaign://cards**
   - Check schema matches current Card model

2. **campaign://recaps**
   - Check if junction table relationships included

3. **campaign://graphs**
   - Check graph schema (decay_rate, active filtering)

---

## Prompts (2)

1. **import_workflow** - `backend/src/mcp/prompts/import-workflow.md`
   - Check if references old information level values
   - Check if entity extraction mentions junction tables

2. **planning_workflow** - `backend/src/mcp/prompts/planning-workflow.md`
   - Check graph update instructions
   - Check information filtering guidance

---

## Testing Strategy

### Manual Testing (After Updates)

1. **Test with Claude Desktop**:
   - Connect MCP server: `docker-compose exec backend npm run mcp`
   - Test create_category_entry with new values
   - Test list_category_entries with view_mode filtering
   - Test relationship population (junction tables)

2. **Information Filtering**:
   - Create entity with player_knowledge='dm-secret'
   - Query with view_mode filter
   - Verify DM secrets hidden in player_view

3. **Junction Tables**:
   - Create quest with related_npcs
   - Verify junction table populated
   - Verify list_category_entries returns arrays correctly

### Automated Testing (If Time)

- Add MCP tool contract tests (similar to External API tests)
- Test all 29 tools programmatically
- Validate schemas against actual data

---

## Estimated Effort

| Task | Hours |
|------|-------|
| Update documentation (index.ts, info-level-tools.ts) | 2-3h |
| Update 29 Zod schemas | 3-4h |
| Update tool implementations (defaults, validation) | 4-6h |
| Test with Claude Desktop | 2-3h |
| Fix issues found during testing | 2-4h |
| **Total** | **13-20 hours** |

---

## Recommendation

**Option A: Update Before Feature 009**
- Ensures MCP tools work with current architecture
- Claude Desktop can assist with Feature 009 development
- 13-20 hours delay

**Option B: Update After Feature 009**
- Ship fun feature first
- MCP tools work but have wrong docs (non-critical if not using them)
- Update as Feature 011 completion task

**My Vote**: **Option B** - Feature 009 doesn't depend on MCP tools. Fix MCP as final polish before v1.0.

---

## Code Execution MCP - Implementation Plan

### If You Want Code Execution (4-6 hours)

**Step 1**: Install safe sandboxing library
```bash
npm install vm2  # Safer than native vm module
```

**Step 2**: Create execute_campaign_query tool (see example above)

**Step 3**: Add read-only database wrapper
```typescript
const readOnlyDb = {
  prepare: (sql: string) => {
    if (sql.match(/INSERT|UPDATE|DELETE|DROP|CREATE|ALTER/i)) {
      throw new Error('Only SELECT queries allowed');
    }
    return db.prepare(sql);
  }
};
```

**Step 4**: Test with Claude Desktop
- Run analytics queries
- Measure context savings
- Profile execution time

**Benefits**:
- 90-99% context reduction for analytical queries
- Faster responses (local execution vs sending 100KB to API)
- Enables complex aggregations without overwhelming context

**Risks**:
- Sandbox escape (use vm2, not vm)
- Infinite loops (enforce timeout)
- Memory exhaustion (limit heap size)

---

**Want me to**:
1. Start updating MCP tools now (13-20h)?
2. Build code execution MCP tool (4-6h)?
3. Defer both and start Feature 009?
