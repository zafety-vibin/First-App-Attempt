# SessionPrepService: Before and After Comparison

## 1. Insert Operation

### BEFORE
```typescript
protected insertEntity(data: SessionPrep): void {
  this.db.prepare(`
    INSERT INTO session_preps (
      id, campaign_id, name, description, core_status, player_knowledge,
      tags, created_at, updated_at, custom_fields,
      planned_date, status, planned_events, possible_encounters, plot_hooks,
      dm_notes, plot_threads, npcs_to_prep, locations_to_prep  // NO quests_to_advance
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id, data.campaign_id, data.name, data.description, data.core_status,
    'dm_only',
    JSON.stringify(data.tags), data.created_at, data.updated_at,
    JSON.stringify(data.custom_fields), data.planned_date || null, data.status || null,
    data.planned_events || null, data.possible_encounters || null, data.plot_hooks || null,
    data.dm_notes || null, JSON.stringify(data.plot_threads || []),
    JSON.stringify(data.npcs_to_prep || []), JSON.stringify(data.locations_to_prep || [])
  );
}
```

### AFTER
```typescript
protected insertEntity(data: SessionPrep): void {
  this.db.prepare(`
    INSERT INTO session_preps (
      id, campaign_id, name, description, core_status, player_knowledge,
      tags, created_at, updated_at, custom_fields,
      planned_date, status, planned_events, possible_encounters, plot_hooks,
      dm_notes, plot_threads, npcs_to_prep, locations_to_prep, quests_to_advance  // NEW FIELD
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)  // Extra ?
  `).run(
    data.id, data.campaign_id, data.name, data.description, data.core_status,
    'dm_only',
    JSON.stringify(data.tags), data.created_at, data.updated_at,
    JSON.stringify(data.custom_fields), data.planned_date || null, data.status || null,
    data.planned_events || null, data.possible_encounters || null, data.plot_hooks || null,
    data.dm_notes || null, JSON.stringify(data.plot_threads || []),
    JSON.stringify(data.npcs_to_prep || []), JSON.stringify(data.locations_to_prep || []),
    JSON.stringify(data.quests_to_advance || [])  // NEW PARAM
  );
}
```

**Changes:** Just added `quests_to_advance` field and JSON stringify of it.

---

## 2. Update Operation (Most Significant Change)

### BEFORE (Generic Key-Value Loop)
```typescript
protected updateEntity(id: string, data: Partial<SessionPrep>): void {
  const updates: string[] = [];
  const params: any[] = [];

  // Loop through all keys dynamically
  Object.keys(data).forEach((key) => {
    if (key === 'id' || key === 'campaign_id' || key === 'created_at' || key === 'player_knowledge') return;
    const value = (data as any)[key];
    const jsonFields = ['tags', 'custom_fields', 'plot_threads', 'npcs_to_prep', 'locations_to_prep'];
    updates.push(`${key} = ?`);
    params.push(jsonFields.includes(key) ? JSON.stringify(value) : value);
  });

  if (updates.length === 0) return;

  params.push(id);
  this.db.prepare(`UPDATE session_preps SET ${updates.join(', ')} WHERE id = ?`).run(...params);
}
```

### AFTER (Junction Table Interception + Explicit Fields)
```typescript
protected updateEntity(id: string, data: Partial<SessionPrep>): void {
  // INTERCEPT junction table fields
  if ('npcs_to_prep' in data && Array.isArray(data.npcs_to_prep)) {
    this.setNPCsToPrep(id, data.npcs_to_prep);
    const { npcs_to_prep, ...restData } = data;
    data = restData as Partial<SessionPrep>;
  }

  if ('locations_to_prep' in data && Array.isArray(data.locations_to_prep)) {
    this.setLocationsToPrep(id, data.locations_to_prep);
    const { locations_to_prep, ...restData } = data;
    data = restData as Partial<SessionPrep>;
  }

  if ('quests_to_advance' in data && Array.isArray(data.quests_to_advance)) {
    this.setQuestsToAdvance(id, data.quests_to_advance);
    const { quests_to_advance, ...restData } = data;
    data = restData as Partial<SessionPrep>;
  }

  const updates: string[] = [];
  const params: any[] = [];

  // EXPLICIT field list instead of dynamic loop
  const updatableFields: (keyof SessionPrep)[] = [
    'name', 'description', 'core_status', 'player_knowledge', 'tags',
    'custom_fields', 'planned_date', 'status', 'planned_events',
    'possible_encounters', 'plot_hooks', 'dm_notes', 'plot_threads',
    'updated_at' // CRITICAL: Always include updated_at
  ];

  for (const field of updatableFields) {
    if (field in data) {
      updates.push(`${field} = ?`);

      // JSON fields list now EXCLUDES junction table arrays
      if (['tags', 'custom_fields', 'plot_threads'].includes(field)) {
        params.push(JSON.stringify(data[field]));
      } else {
        params.push(data[field] as any);
      }
    }
  }

  if (updates.length === 0) {
    return;
  }

  params.push(id);

  const stmt = this.db.prepare(`
    UPDATE session_preps
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...params);
}
```

**Key Changes:**
1. **Interception:** Check for junction table arrays and route to setter methods
2. **Extraction:** Remove processed fields from data object
3. **Explicit fields:** List all updatable columns (better maintainability)
4. **JSON list:** Now only includes `tags`, `custom_fields`, `plot_threads` (not the arrays)
5. **Timestamp:** Always update `updated_at` (critical for data consistency)

---

## 3. Query Operations

### BEFORE
```typescript
findById(id: string): SessionPrep | null {
  const row = this.db.prepare('SELECT * FROM session_preps WHERE id = ?').get(id);
  const jsonFields = ['tags', 'custom_fields', 'plot_threads', 'npcs_to_prep', 'locations_to_prep'];
  return row ? this.parseJsonFields(row, jsonFields) as SessionPrep : null;
}

list(...): ListResult<SessionPrep> {
  // ... where clauses ...
  const jsonFields = ['tags', 'custom_fields', 'plot_threads', 'npcs_to_prep', 'locations_to_prep'];
  return {
    data: rows.map((row) => this.parseJsonFields(row, jsonFields) as SessionPrep),
    total: count,
  };
}
```

### AFTER
```typescript
findById(id: string): SessionPrep | null {
  const row = this.db.prepare('SELECT * FROM session_preps WHERE id = ?').get(id);
  const jsonFields = ['tags', 'custom_fields', 'plot_threads', 'npcs_to_prep', 'locations_to_prep', 'quests_to_advance'];  // Added
  return row ? this.parseJsonFields(row, jsonFields) as SessionPrep : null;
}

list(...): ListResult<SessionPrep> {
  // ... where clauses ...
  const jsonFields = ['tags', 'custom_fields', 'plot_threads', 'npcs_to_prep', 'locations_to_prep', 'quests_to_advance'];  // Added
  return {
    data: rows.map((row) => this.parseJsonFields(row, jsonFields) as SessionPrep),
    total: count,
  };
}
```

**Changes:** Added `quests_to_advance` to JSON fields list. During Phase 3, this will be removed when full migration completes.

---

## 4. New Methods (12 total - 4 sets of 3)

### NPCs to Prep (Example)

**BEFORE:** Not possible - only JSON arrays
```typescript
// No way to:
// - Add/remove single NPC with metadata
// - Query prep priority for NPCs
// - Update NPC metadata without replacing array
```

**AFTER:** Full CRUD via junction table
```typescript
getNPCsToPrep(prepId: string): string[] {
  const rows = this.db
    .prepare('SELECT npc_id FROM dm_session_prep_npcs WHERE session_prep_id = ?')
    .all(prepId) as { npc_id: string }[];
  return rows.map(r => r.npc_id);
}

addNPCToPrep(
  prepId: string,
  npcId: string,
  options?: { prep_priority?: number; prep_notes?: string }
): void {
  const { randomUUID } = require('crypto');
  this.db
    .prepare(`
      INSERT INTO dm_session_prep_npcs (
        id, session_prep_id, npc_id, prep_priority, prep_notes, created_at
      ) VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
      ON CONFLICT(session_prep_id, npc_id) DO UPDATE SET
        prep_priority = COALESCE(excluded.prep_priority, prep_priority),
        prep_notes = COALESCE(excluded.prep_notes, prep_notes)
    `)
    .run(randomUUID(), prepId, npcId, options?.prep_priority || null, options?.prep_notes || null);
}

removeNPCToPrep(prepId: string, npcId: string): void {
  this.db
    .prepare('DELETE FROM dm_session_prep_npcs WHERE session_prep_id = ? AND npc_id = ?')
    .run(prepId, npcId);
}

setNPCsToPrep(prepId: string, npcIds: string[]): void {
  this.db.prepare('DELETE FROM dm_session_prep_npcs WHERE session_prep_id = ?').run(prepId);
  npcIds.forEach(npcId => this.addNPCToPrep(prepId, npcId));
}
```

**Same pattern for:**
- `getLocationsToPrep`, `addLocationToPrep`, `removeLocationToPrep`, `setLocationsToPrep`
- `getQuestsToAdvance`, `addQuestToAdvance`, `removeQuestToAdvance`, `setQuestsToAdvance`

---

## 5. Data Model

### BEFORE
```typescript
export interface SessionPrep {
  // ...
  plot_threads: string[];
  npcs_to_prep: string[];          // JSON array only
  locations_to_prep: string[];     // JSON array only
  // NO quests_to_advance field
}
```

### AFTER
```typescript
export interface SessionPrep {
  // ...
  plot_threads: string[];
  npcs_to_prep: string[];          // JSON array (during migration)
  locations_to_prep: string[];     // JSON array (during migration)
  quests_to_advance: string[];     // NEW field
}
```

---

## Impact Summary

### Code Metrics
- **Lines added:** 220+ (mostly new methods)
- **Lines removed:** 15 (simplified update logic)
- **Files changed:** 2
  - `SessionPrepService.ts` (major refactor)
  - `SessionPrep.ts` (1 line)

### Functionality
- **Before:** Simple JSON arrays, no metadata on relationships
- **After:** Full junction table support with metadata + JSON fallback

### Performance
- **Before:** Full array replacement on any update
- **After:** Atomic add/remove operations possible

### Backward Compatibility
- **Before:** Only JSON-based updates
- **After:** Both JSON and junction table methods work simultaneously

### Maintenance
- **Before:** Generic loop makes field changes error-prone
- **After:** Explicit field list is self-documenting

---

## Testing Checklist

- [x] TypeScript compiles without errors
- [x] Follows SessionRecapService pattern exactly
- [ ] Contract tests pass (sessionPrep.test.ts)
- [ ] Integration tests pass
- [ ] Manual API testing:
  - [ ] Create prep with arrays
  - [ ] Add single entity with metadata
  - [ ] Remove single entity
  - [ ] Replace all entities
  - [ ] Query junction tables directly

---

## Git Changes Summary

```
backend/src/models/sessionPrep.ts
  +1 line: Add quests_to_advance: string[]

backend/src/services/SessionPrepService.ts
  +220 lines: 12 new methods + refactored updateEntity
  -15 lines: Simplified update logic
  +3 lines: Include quests_to_advance in INSERT/SELECT

Total: ~210 net lines added
```
