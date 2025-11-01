# Junction Tables Implementation - PlayerCharacterService

## Overview

Updated `PlayerCharacterService` to use junction tables for many-to-many relationships, following the exact pattern established by `FactionService`.

## Database Schema

### PC Faction Affiliations (pc_faction_affiliations)
```sql
CREATE TABLE IF NOT EXISTS pc_faction_affiliations (
  id TEXT PRIMARY KEY,
  pc_id TEXT NOT NULL,
  faction_id TEXT NOT NULL,
  affiliation_type TEXT CHECK (affiliation_type IN ('member', 'ally', 'enemy', 'neutral')),
  reputation INTEGER CHECK (reputation BETWEEN -10 AND 10),
  joined_date INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (pc_id) REFERENCES player_characters(id) ON DELETE CASCADE,
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  UNIQUE(pc_id, faction_id)
);
```

### PC NPC Relationships (pc_npc_relationships)
```sql
CREATE TABLE IF NOT EXISTS pc_npc_relationships (
  id TEXT PRIMARY KEY,
  pc_id TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  relationship_type TEXT CHECK (relationship_type IN ('ally', 'friend', 'rival', 'enemy', 'mentor', 'student', 'neutral', 'romantic')),
  trust_level INTEGER CHECK (trust_level BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (pc_id) REFERENCES player_characters(id) ON DELETE CASCADE,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  UNIQUE(pc_id, npc_id)
);
```

## Service Methods

### Faction Affiliations

#### `getFactionAffiliations(pcId: string): string[]`
Retrieves all faction IDs affiliated with the player character.

```typescript
const factionIds = pcService.getFactionAffiliations('pc-123');
// Returns: ['faction-1', 'faction-2']
```

#### `addFactionAffiliation(pcId: string, factionId: string, options?): void`
Adds or updates a faction affiliation with optional metadata.

```typescript
pcService.addFactionAffiliation('pc-123', 'faction-1', {
  affiliation_type: 'member',
  reputation: 5,
  joined_date: 1698768000 // Unix timestamp
});
```

**Options:**
- `affiliation_type`: 'member' | 'ally' | 'enemy' | 'neutral'
- `reputation`: -10 to 10 (negative for enemies)
- `joined_date`: Unix timestamp (optional)

#### `removeFactionAffiliation(pcId: string, factionId: string): void`
Removes a faction affiliation relationship.

```typescript
pcService.removeFactionAffiliation('pc-123', 'faction-1');
```

#### `setFactionAffiliations(pcId: string, factionIds: string[]): void`
Replaces all faction affiliations (delete all, add new).

```typescript
pcService.setFactionAffiliations('pc-123', ['faction-1', 'faction-2']);
```

### NPC Relationships

#### `getNPCRelationships(pcId: string): string[]`
Retrieves all NPC IDs related to the player character.

```typescript
const npcIds = pcService.getNPCRelationships('pc-123');
// Returns: ['npc-1', 'npc-2', 'npc-3']
```

#### `addNPCRelationship(pcId: string, npcId: string, options?): void`
Adds or updates an NPC relationship with optional metadata.

```typescript
pcService.addNPCRelationship('pc-123', 'npc-1', {
  relationship_type: 'ally',
  trust_level: 8
});
```

**Options:**
- `relationship_type`: 'ally' | 'friend' | 'rival' | 'enemy' | 'mentor' | 'student' | 'neutral' | 'romantic'
- `trust_level`: 1-10

#### `removeNPCRelationship(pcId: string, npcId: string): void`
Removes an NPC relationship.

```typescript
pcService.removeNPCRelationship('pc-123', 'npc-1');
```

#### `setNPCRelationships(pcId: string, npcIds: string[]): void`
Replaces all NPC relationships (delete all, add new).

```typescript
pcService.setNPCRelationships('pc-123', ['npc-1', 'npc-2']);
```

## updateEntity() Integration

The `updateEntity()` method automatically intercepts `faction_affiliations` and `allied_npcs` fields when updating a player character:

```typescript
// When updating with these fields:
pcService.update('pc-123', {
  name: 'Updated Name',
  faction_affiliations: ['faction-1', 'faction-2'],  // Handled by setFactionAffiliations
  allied_npcs: ['npc-1', 'npc-2']                    // Handled by setNPCRelationships
});

// The updateEntity() method:
// 1. Extracts faction_affiliations → calls setFactionAffiliations()
// 2. Extracts allied_npcs → calls setNPCRelationships()
// 3. Updates remaining fields in player_characters table
// 4. Does NOT store arrays in JSON columns (they go to junction tables)
```

## Pattern Differences from FactionService

### FactionService (5 junction tables)
- `faction_alliances` (faction-to-faction bidirectional)
- `faction_rivalries` (faction-to-faction bidirectional)
- `faction_members` (faction-to-npc)
- `faction_territory` (faction-to-location)
- `faction_presence` (faction-to-location)

### PlayerCharacterService (2 junction tables)
- `pc_faction_affiliations` (pc-to-faction)
- `pc_npc_relationships` (pc-to-npc)

## API Response Format

The API continues to return `faction_affiliations` and `allied_npcs` as JSON arrays for backward compatibility:

```json
{
  "id": "pc-123",
  "name": "Thorgrim Ironhammer",
  "faction_affiliations": ["faction-1", "faction-2"],
  "allied_npcs": ["npc-1", "npc-2"],
  ...
}
```

Behind the scenes:
1. Data is stored in junction tables (pc_faction_affiliations, pc_npc_relationships)
2. When returning from `findById()` or `list()`, arrays are reconstructed from junction tables
3. The conversion happens in `rowToPlayerCharacter()` which calls `parseJsonFields()`

## JSON Field Handling

### Removed from JSON Parsing
- `faction_affiliations` - Now in `pc_faction_affiliations` junction table
- `allied_npcs` - Now in `pc_npc_relationships` junction table

### Still JSON Parsed
- `tags` - Remains in `player_characters` table as JSON
- `custom_fields` - Remains in `player_characters` table as JSON
- `class` - Remains in `player_characters` table as JSON

## Database Inserts

When creating a new player character, empty JSON arrays are still stored for backward compatibility:

```typescript
// In insertEntity():
JSON.stringify(data.faction_affiliations || [])  // Stores []
JSON.stringify(data.allied_npcs || [])           // Stores []
```

The actual relationships go into junction tables via the routes or API updates.

## Deletion Behavior

When a player character is deleted:
1. `ON DELETE CASCADE` on foreign keys in junction tables automatically deletes all relationships
2. No manual cleanup needed

```typescript
protected deleteEntity(id: string): void {
  this.db.prepare('DELETE FROM player_characters WHERE id = ?').run(id);
  // Junction table rows are automatically deleted by CASCADE
}
```

## Code Quality

### Type Safety
- New `PlayerCharacterRow` interface for database rows
- Proper TypeScript types for all methods
- Type-safe option objects for relationship metadata

### Documentation
- JSDoc comments on all public methods
- Clear parameter descriptions
- Example usage patterns

### Consistency
- Follows FactionService pattern exactly
- Uses `ON CONFLICT ... DO UPDATE` for upsert behavior
- Consistent naming conventions

### Performance
- Single query to get relationships: `SELECT faction_id FROM pc_faction_affiliations WHERE pc_id = ?`
- Batched inserts when setting multiple relationships
- Proper indexes via UNIQUE constraints

## Testing Notes

Contract tests in `playerCharacters.test.ts` validate:
- Creating PCs with faction_affiliations array
- Creating PCs with allied_npcs array
- Updating faction_affiliations
- Updating allied_npcs
- View mode filtering (dm_* fields stripped in player_view)
- Array format consistency in responses

All tests expect arrays to be returned, which continues to work via the `rowToPlayerCharacter()` conversion method.

## Migration Status

- Junction tables created in migration `025-junction-tables.sql`
- Data migration handled in migration `026-migrate-json-to-junctions.sql`
- PlayerCharacterService implementation complete
- All TypeScript code compiles without errors

## Phase 2c Status

This is **Phase 2c** of the junction table refactoring:
- Phase 2a: NPCService (complete)
- Phase 2b: FactionService (complete)
- Phase 2c: PlayerCharacterService (complete)

Remaining services to update: LocationService, SessionRecapService, QuestService
