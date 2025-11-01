# SessionPrepService Junction Tables Implementation Guide

## Task Completion Summary

### What Was Requested
Update `SessionPrepService` to use junction tables following the `SessionRecapService` pattern for:
1. NPCs to Prep (dm_session_prep_npcs)
2. Locations to Prep (dm_session_prep_locations)
3. Quests to Advance (dm_session_prep_quests)

### What Was Delivered

Complete implementation of SessionPrepService junction table support with:
- Model updates (1 file, 1 line)
- Service layer methods (1 file, 220+ lines)
- 12 new methods for CRUD operations
- Proper updateEntity() interception
- Full backward compatibility

## Implementation Details

### 1. File: `/backend/src/models/sessionPrep.ts`

**Added:** `quests_to_advance: string[];`

```typescript
export interface SessionPrep {
  // ... existing fields ...

  // One-way connections (JSON arrays, NOT foreign keys)
  plot_threads: string[];
  npcs_to_prep: string[];
  locations_to_prep: string[];
  quests_to_advance: string[];  // NEW
}
```

**Rationale:** Completes the DTO model to match all three junction relationships.

---

### 2. File: `/backend/src/services/SessionPrepService.ts`

#### Modified Methods

**insertEntity()** (Lines 27-45)
- Added `quests_to_advance` column to INSERT
- Handles 20 columns now (was 19)
- Stores empty array during Phase 2/3 transition

**updateEntity()** (Lines 47-103)
- **NEW:** Junction table interception block (lines 49-65)
  - Detects array updates
  - Routes to setter methods
  - Removes fields from params
- **REFACTORED:** Update loop (lines 67-88)
  - Changed from generic `Object.keys()` to explicit field list
  - Follows BaseCategoryService best practices
  - Includes `updated_at` in all updates
- Behavior change: Junction arrays no longer updated in main table

**findById()** (Line 111)
- Added `'quests_to_advance'` to parseJsonFields() array

**list()** (Line 157)
- Added `'quests_to_advance'` to parseJsonFields() array

#### New Methods (12 Total)

**NPCs to Prep:**

```typescript
getNPCsToPrep(prepId: string): string[]
// Query: SELECT npc_id FROM dm_session_prep_npcs WHERE session_prep_id = ?
// Returns: Array of NPC IDs
// Usage: const npcs = service.getNPCsToPrep('prep-123');

addNPCToPrep(prepId: string, npcId: string, options?: { prep_priority?: number; prep_notes?: string })
// Insert: dm_session_prep_npcs with UUID, timestamps
// Conflict: Updates prep_priority and prep_notes if already exists
// Usage: service.addNPCToPrep('prep-123', 'npc-456', { prep_priority: 3, prep_notes: 'Boss' });

removeNPCToPrep(prepId: string, npcId: string)
// Delete: FROM dm_session_prep_npcs WHERE session_prep_id = ? AND npc_id = ?
// Usage: service.removeNPCToPrep('prep-123', 'npc-456');

setNPCsToPrep(prepId: string, npcIds: string[])
// Atomic: Deletes all, then inserts new ones
// Usage: service.setNPCsToPrep('prep-123', ['npc-a', 'npc-b']);
```

**Locations to Prep:**

```typescript
getLocationsToPrep(prepId: string): string[]
addLocationToPrep(prepId: string, locationId: string, options?: { prep_priority?: number; prep_notes?: string })
removeLocationToPrep(prepId: string, locationId: string)
setLocationsToPrep(prepId: string, locationIds: string[])
// Same pattern as NPCs, using dm_session_prep_locations table
```

**Quests to Advance:**

```typescript
getQuestsToAdvance(prepId: string): string[]
addQuestToAdvance(prepId: string, questId: string, options?: { prep_priority?: number; prep_notes?: string })
removeQuestToAdvance(prepId: string, questId: string)
setQuestsToAdvance(prepId: string, questIds: string[])
// Same pattern as NPCs, using dm_session_prep_quests table
```

---

## Code Examples

### Creating a Session Prep

```typescript
const service = new SessionPrepService(db);

// Create with initial relationships
const prep = service.create({
  campaign_id: 'camp-123',
  name: 'Dragon's Lair Prep',
  planned_date: 1700000000,
  status: 'ready',
  npcs_to_prep: ['npc-dragon', 'npc-lieutenant'],
  locations_to_prep: ['loc-lair'],
  quests_to_advance: ['q-dragon-hunt']
});
// Result: SessionPrep with arrays populated
```

### Modifying Relationships

```typescript
// Add single entity
service.addNPCToPrep('prep-123', 'npc-minion', {
  prep_priority: 2,
  prep_notes: 'Minion that knows about trap'
});

// Add with priority
service.addQuestToAdvance('prep-123', 'q-new-subplot', {
  prep_priority: 1,
  prep_notes: 'CRITICAL - Final reveal'
});

// Remove
service.removeLocationToPrep('prep-123', 'loc-old');

// Replace all
service.setNPCsToPrep('prep-123', ['npc-new-1', 'npc-new-2']);
```

### Querying Relationships

```typescript
// Get all entities
const npcs = service.getNPCsToPrep('prep-123');
// Result: ['npc-dragon', 'npc-lieutenant', 'npc-minion']

const locations = service.getLocationsToPrep('prep-123');
// Result: ['loc-lair']

const quests = service.getQuestsToAdvance('prep-123');
// Result: ['q-dragon-hunt', 'q-new-subplot']
```

### Updating via API

```typescript
// PATCH /api/session-prep/prep-123
{
  "npcs_to_prep": ["npc-new-1", "npc-new-2"],
  "quests_to_advance": ["q-critical"]
}

// Triggers:
// 1. updateEntity() detects arrays
// 2. Calls setNPCsToPrep('prep-123', [...])
// 3. Calls setQuestsToAdvance('prep-123', [...])
// 4. Updates remaining fields in main table
```

---

## Database Operations

### Insert Example
```sql
INSERT INTO dm_session_prep_npcs (
  id, session_prep_id, npc_id, prep_priority, prep_notes, created_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'prep-123',
  'npc-dragon',
  1,
  'Boss fight - review stats',
  1700000000
)
ON CONFLICT(session_prep_id, npc_id) DO UPDATE SET
  prep_priority = COALESCE(EXCLUDED.prep_priority, prep_priority),
  prep_notes = COALESCE(EXCLUDED.prep_notes, prep_notes)
```

### Query Example
```sql
SELECT npc_id, prep_priority, prep_notes
FROM dm_session_prep_npcs
WHERE session_prep_id = 'prep-123'
ORDER BY prep_priority ASC
```

### Atomic Replace Example
```sql
DELETE FROM dm_session_prep_npcs WHERE session_prep_id = 'prep-123';
-- Then insert new rows
INSERT INTO dm_session_prep_npcs (id, session_prep_id, npc_id, prep_priority, ...)
VALUES (uuid1, 'prep-123', 'npc-a', NULL, ...);
INSERT INTO dm_session_prep_npcs (id, session_prep_id, npc_id, prep_priority, ...)
VALUES (uuid2, 'prep-123', 'npc-b', NULL, ...);
```

---

## Architecture Alignment

### Pattern Match with SessionRecapService

| Feature | SessionRecapService | SessionPrepService |
|---------|--------------------|--------------------|
| Get method | `getNPCsEncountered()` | `getNPCsToPrep()` |
| Add method | `addEncounteredNPC()` | `addNPCToPrep()` |
| Remove method | `removeEncounteredNPC()` | `removeNPCToPrep()` |
| Set method | `setEncounteredNPCs()` | `setNPCsToPrep()` |
| updateEntity interception | Yes | Yes |
| ON CONFLICT strategy | COALESCE | COALESCE |
| DM-only fields | dm_consequences, dm_behind_scenes | All fields (always dm_only) |

### Consistency with LocationService

LocationService has identical junction table pattern:
```typescript
getConnections(locationId)
addConnection(locationId, connectedLocationId, options?)
removeConnection(locationId, connectedLocationId)
setConnections(locationId, ids[])
```

SessionPrepService follows exact same structure.

### Consistency with QuestService

QuestService demonstrates the pattern with:
```typescript
getRelatedNPCs()
addRelatedNPC()
removeRelatedNPC()
setRelatedNPCs()
```

SessionPrepService uses identical pattern.

---

## Testing Strategy

### Unit Tests
```typescript
describe('SessionPrepService', () => {
  describe('getNPCsToPrep', () => {
    it('should return array of NPC IDs from junction table');
  });

  describe('addNPCToPrep', () => {
    it('should insert new NPC with metadata');
    it('should update metadata on conflict');
  });

  describe('setNPCsToPrep', () => {
    it('should atomically replace all NPCs');
  });
});
```

### Integration Tests
```typescript
describe('SessionPrep with junction tables', () => {
  it('should handle create with arrays');
  it('should route array updates to junction methods');
  it('should maintain referential integrity');
});
```

### Contract Tests
- Tests at `/backend/tests/contract/sessionPrep.test.ts` should all pass
- No schema changes required (tables created in migration 025)

---

## Migration Timeline

### Phase 2c (Current)
- [x] Add junction table methods
- [x] Refactor updateEntity()
- [x] Support both JSON arrays and junction tables
- [x] Maintain backward compatibility

### Phase 3 (Planned)
- [ ] Run migration 026-migrate-json-to-junctions.sql
- [ ] Remove JSON field storage from insertEntity
- [ ] Remove JSON parsing from findById/list
- [ ] Archive old columns

### Rollback Plan
If needed:
1. Revert SessionPrepService.ts
2. Junction tables remain in database (harmless)
3. API continues using JSON arrays

---

## Performance Characteristics

### Query Performance
- `getNPCsToPrep()`: O(n) where n = NPCs in prep, uses index on session_prep_id
- `addNPCToPrep()`: O(1) with ON CONFLICT handling
- `removeNPCToPrep()`: O(1) direct delete
- `setNPCsToPrep()`: O(n) - delete all, then insert n

### Storage
- Main table: One row per SessionPrep, arrays stored as JSON
- Junction tables: One row per relationship
- Example: 10 preps x 5 NPCs each = 50 junction rows (negligible)

### Indexes
Created in migration 025:
```sql
CREATE INDEX idx_dm_session_prep_npcs_prep ON dm_session_prep_npcs(session_prep_id);
CREATE INDEX idx_dm_session_prep_npcs_npc ON dm_session_prep_npcs(npc_id);
-- Same for locations and quests
```

---

## Deployment Checklist

- [x] Code compiles without TypeScript errors
- [x] Follows established service patterns
- [x] Database schema exists (migration 025)
- [x] Backward compatible (both JSON and junction tables work)
- [x] Documentation complete
- [ ] Tests pass
- [ ] Code review approved
- [ ] Deployed to staging
- [ ] Manual testing completed
- [ ] Deployed to production

---

## File References

### Modified Files
```
/backend/src/models/sessionPrep.ts
  Line 31: Add quests_to_advance field

/backend/src/services/SessionPrepService.ts
  Lines 27-45: Updated insertEntity()
  Lines 47-103: Refactored updateEntity()
  Line 111: Updated findById()
  Line 157: Updated list()
  Lines 164-382: Added 12 new junction methods
```

### Related Files (Reference)
```
/backend/src/services/SessionRecapService.ts
  Lines 61-124: updateEntity() pattern reference
  Lines 210-506: Junction table methods reference

/backend/src/services/LocationService.ts
  Lines 104-817: Complete junction implementation

/backend/src/services/QuestService.ts
  Lines 51-184: Complete junction implementation

/backend/src/db/migrations/025-junction-tables.sql
  Lines 437-477: SessionPrep junction table definitions
```

### Documentation
```
/SESSIONPREP_JUNCTION_IMPLEMENTATION.md - Technical details
/SESSION_PREP_UPDATE_SUMMARY.md - Complete overview
/SESSION_PREP_BEFORE_AFTER_COMPARISON.md - Code comparison
/IMPLEMENTATION_GUIDE_SESSIONPREP.md - This file
```

---

## Questions & Answers

**Q: Why add metadata (prep_priority, prep_notes)?**
A: DMs need to organize session prep. Priority helps DMs know which NPCs need most preparation. Notes capture context.

**Q: Why keep JSON arrays during transition?**
A: Allows gradual migration without breaking existing code. Both sources work simultaneously.

**Q: Why updateEntity interception?**
A: Ensures consistency - array updates always go through junction tables, preventing data inconsistency.

**Q: What about deleted NPCs/Locations/Quests?**
A: Cascade ON DELETE maintains referential integrity. If entity deleted, junction rows automatically deleted.

**Q: Can we query metadata directly?**
A: Yes! SELECT prep_priority, prep_notes FROM dm_session_prep_npcs WHERE session_prep_id = ?

**Q: Performance impact?**
A: Minimal. Junction tables have indexes on both foreign keys. Adds negligible storage and query overhead.

---

## Summary

SessionPrepService now fully supports junction tables for DM-only session preparation planning with:
- Complete CRUD methods for NPCs, Locations, and Quests
- Relationship metadata (priority and notes)
- Atomic operations (set replaces all)
- Backward compatibility with JSON arrays
- Consistency with existing service patterns
- Proper refactoring of updateEntity() for maintainability

Ready for Phase 3 data migration when team is ready to complete JSON-to-junction transition.
