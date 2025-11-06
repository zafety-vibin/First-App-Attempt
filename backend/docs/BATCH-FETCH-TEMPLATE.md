# Batch Fetch Implementation Template

Use this template to add batch fetching optimization to remaining category services.

## Quick Reference: Services Needing Optimization

| Service | Junction Tables | Priority |
|---------|----------------|----------|
| ✅ QuestService | 2 | HIGH |
| ✅ SessionPrepService | 3 | HIGH |
| ✅ SessionRecapService | 4 | HIGH |
| NPCService | 3 | MEDIUM |
| FactionService | 5 | MEDIUM |
| PlayerCharacterService | 2 | LOW |
| LoreEntryService | 3 | LOW |
| LocationService | 1 | LOW |
| WorldRuleService | 1 | LOW |
| PlanarForceService | 3 | LOW |
| CreatureService | 1 | LOW |

## Step-by-Step Implementation

### Step 1: Add Batch Method (After Existing Getter)

```typescript
/**
 * Get related items for single entity
 * @param entityId - Entity ID
 * @returns Array of related IDs
 */
getRelatedItems(entityId: string): string[] {
  const rows = this.db
    .prepare('SELECT related_id FROM junction_table WHERE entity_id = ?')
    .all(entityId) as { related_id: string }[];

  return rows.map(r => r.related_id);
}

/**
 * Batch fetch related items for multiple entities (N+1 query optimization)
 * @param entityIds - Array of entity IDs
 * @returns Map of entity_id -> array of related IDs
 */
protected batchGetRelatedItems(entityIds: string[]): Map<string, string[]> {
  if (entityIds.length === 0) return new Map();

  const placeholders = entityIds.map(() => '?').join(',');
  const rows = this.db.prepare(`
    SELECT entity_id, related_id
    FROM junction_table
    WHERE entity_id IN (${placeholders})
  `).all(...entityIds) as { entity_id: string; related_id: string }[];

  const map = new Map<string, string[]>();
  rows.forEach(row => {
    if (!map.has(row.entity_id)) {
      map.set(row.entity_id, []);
    }
    map.get(row.entity_id)!.push(row.related_id);
  });

  return map;
}
```

### Step 2: Update list() Method

**Before:**
```typescript
const entities = rows.map((row) => {
  const entity = this.parseJsonFields(row, jsonFields);
  entity.related_items = this.getRelatedItems(entity.id);  // N+1 problem!
  return entity;
});
```

**After:**
```typescript
// Batch fetch all relationships at once (N+1 query optimization)
const entityIds = rows.map((r: any) => r.id);
const itemsMap = this.batchGetRelatedItems(entityIds);

const entities = rows.map((row) => {
  const entity = this.parseJsonFields(row, jsonFields);
  entity.related_items = itemsMap.get(entity.id) || [];  // Fallback to empty array
  return entity;
});
```

### Step 3: Repeat for Each Junction Table

If your service has multiple junction tables (e.g., FactionService with 5 tables):

1. Create 5 batch methods (one per junction table)
2. Call all 5 in list() method
3. Map results to entity fields

```typescript
// Example: FactionService with 5 junction tables
const factionIds = rows.map((r: any) => r.id);
const alliesMap = this.batchGetAllies(factionIds);
const rivalsMap = this.batchGetRivals(factionIds);
const membersMap = this.batchGetMembers(factionIds);
const territoryMap = this.batchGetTerritory(factionIds);
const presenceMap = this.batchGetPresence(factionIds);

const factions = rows.map((row) => {
  const faction = this.parseJsonFields(row, jsonFields);
  faction.allies = alliesMap.get(faction.id) || [];
  faction.rivals = rivalsMap.get(faction.id) || [];
  faction.members = membersMap.get(faction.id) || [];
  faction.territory = territoryMap.get(faction.id) || [];
  faction.presence = presenceMap.get(faction.id) || [];
  return faction;
});
```

## Junction Table Reference

### NPCService (3 tables)

```typescript
// backend/src/services/NPCService.ts

protected batchGetNPCLocations(npcIds: string[]): Map<string, string[]> {
  // Table: npc_locations (npc_id, location_id)
}

protected batchGetNPCRelationships(npcIds: string[]): Map<string, string[]> {
  // Table: npc_relationships (npc_id, related_npc_id)
}

protected batchGetPCEncounters(npcIds: string[]): Map<string, string[]> {
  // Table: npc_pc_encounters (npc_id, pc_id)
}
```

### FactionService (5 tables)

```typescript
// backend/src/services/FactionService.ts

protected batchGetAllies(factionIds: string[]): Map<string, string[]> {
  // Table: faction_allies (faction_id, ally_faction_id)
}

protected batchGetRivals(factionIds: string[]): Map<string, string[]> {
  // Table: faction_rivals (faction_id, rival_faction_id)
}

protected batchGetMembers(factionIds: string[]): Map<string, string[]> {
  // Table: faction_members (faction_id, npc_id)
}

protected batchGetTerritory(factionIds: string[]): Map<string, string[]> {
  // Table: faction_territory (faction_id, location_id)
}

protected batchGetPresence(factionIds: string[]): Map<string, string[]> {
  // Table: faction_presence (faction_id, location_id)
}
```

### PlayerCharacterService (2 tables)

```typescript
// backend/src/services/PlayerCharacterService.ts

protected batchGetFactionAffiliations(pcIds: string[]): Map<string, string[]> {
  // Table: pc_faction_affiliations (pc_id, faction_id)
}

protected batchGetNPCRelationships(pcIds: string[]): Map<string, string[]> {
  // Table: pc_npc_relationships (pc_id, npc_id)
}
```

### LoreEntryService (3 tables)

```typescript
// backend/src/services/LoreEntryService.ts

protected batchGetRelatedNPCs(loreIds: string[]): Map<string, string[]> {
  // Table: lore_entry_npcs (lore_entry_id, npc_id)
}

protected batchGetRelatedLocations(loreIds: string[]): Map<string, string[]> {
  // Table: lore_entry_locations (lore_entry_id, location_id)
}

protected batchGetRelatedFactions(loreIds: string[]): Map<string, string[]> {
  // Table: lore_entry_factions (lore_entry_id, faction_id)
}
```

### LocationService (1 table)

```typescript
// backend/src/services/LocationService.ts

protected batchGetConnectedLocations(locationIds: string[]): Map<string, string[]> {
  // Table: location_connections (location_id, connected_location_id)
}
```

### WorldRuleService (1 table)

```typescript
// backend/src/services/WorldRuleService.ts

protected batchGetRelatedRules(ruleIds: string[]): Map<string, string[]> {
  // Table: world_rule_relationships (rule_id, related_rule_id)
}
```

### PlanarForceService (3 tables)

```typescript
// backend/src/services/PlanarForceService.ts

protected batchGetAlliances(forceIds: string[]): Map<string, string[]> {
  // Table: planar_force_alliances (force_id, ally_force_id)
}

protected batchGetRivalries(forceIds: string[]): Map<string, string[]> {
  // Table: planar_force_rivalries (force_id, rival_force_id)
}

protected batchGetWorshipers(forceIds: string[]): Map<string, string[]> {
  // Table: planar_force_worshipers (force_id, npc_id)
}
```

### CreatureService (1 table)

```typescript
// backend/src/services/CreatureService.ts

protected batchGetHabitats(creatureIds: string[]): Map<string, string[]> {
  // Table: creature_habitats (creature_id, location_id)
}
```

## Common Mistakes to Avoid

### 1. ❌ Forgetting Empty Array Check
```typescript
// BAD: Will crash if no entities
const map = this.batchGet(entityIds);
```

```typescript
// GOOD: Always check for empty input
protected batchGet(entityIds: string[]): Map<string, string[]> {
  if (entityIds.length === 0) return new Map();
  // ...
}
```

### 2. ❌ Not Initializing Map Keys
```typescript
// BAD: Will throw error on first push
map.get(row.entity_id).push(row.related_id);
```

```typescript
// GOOD: Always initialize before pushing
if (!map.has(row.entity_id)) {
  map.set(row.entity_id, []);
}
map.get(row.entity_id)!.push(row.related_id);
```

### 3. ❌ Forgetting Fallback in list()
```typescript
// BAD: Will be undefined for entities with no relationships
entity.related_items = itemsMap.get(entity.id);
```

```typescript
// GOOD: Always provide fallback
entity.related_items = itemsMap.get(entity.id) || [];
```

### 4. ❌ Not Using Prepared Statements
```typescript
// BAD: SQL injection vulnerability
const query = `SELECT * FROM table WHERE id IN (${entityIds.join(',')})`;
```

```typescript
// GOOD: Parameterized query
const placeholders = entityIds.map(() => '?').join(',');
const rows = this.db.prepare(`... IN (${placeholders})`).all(...entityIds);
```

## Testing Checklist

After implementing batch optimization:

- [ ] TypeScript compiles without errors
- [ ] Existing contract tests still pass
- [ ] List endpoint returns same data structure
- [ ] Performance improves 90%+ for 100+ entities
- [ ] Empty result sets don't crash
- [ ] Entities with no relationships get empty arrays

## Performance Verification

Run this query analysis on your service:

```typescript
// Add logging to count queries
let queryCount = 0;
db.prepare = ((original) => {
  return function(sql: string) {
    queryCount++;
    return original.call(this, sql);
  };
})(db.prepare.bind(db));

// Run list() with 100 entities
service.list({ campaign_id }, { limit: 100, offset: 0 });

console.log(`Total queries: ${queryCount}`);
// Target: 2 + N junction tables (e.g., 5 for FactionService)
```

## Commit Message Template

```
perf: Add batch fetching for [ServiceName] junction tables

Fixes N+1 query problem in [ServiceName].list() by replacing individual
relationship lookups with batch SQL IN queries.

Before: 100 entities → [N] queries (1 + 100*M junction tables)
After:  100 entities → [N] queries (1 + M batch queries)
Performance improvement: [X]% query reduction

- Add batch[Relationship]() methods for each junction table
- Update list() to use batch fetching
- Maintain backward compatibility (same return types)

Closes #[issue-number]
```

---

**Next service to optimize:** NPCService (3 junction tables, commonly queried)
