# PlayerCharacterService - Junction Table Methods

## Complete Method Signatures

### Faction Affiliations

```typescript
// Get all faction IDs for a player character
getFactionAffiliations(pcId: string): string[]

// Add or update a faction affiliation
addFactionAffiliation(
  pcId: string,
  factionId: string,
  options?: {
    affiliation_type?: string;     // 'member' | 'ally' | 'enemy' | 'neutral'
    reputation?: number;            // -10 to 10
    joined_date?: number;           // Unix timestamp
  }
): void

// Remove a faction affiliation
removeFactionAffiliation(pcId: string, factionId: string): void

// Replace all faction affiliations
setFactionAffiliations(pcId: string, factionIds: string[]): void
```

### NPC Relationships

```typescript
// Get all NPC IDs related to a player character
getNPCRelationships(pcId: string): string[]

// Add or update an NPC relationship
addNPCRelationship(
  pcId: string,
  npcId: string,
  options?: {
    relationship_type?: string;    // 'ally' | 'friend' | 'rival' | 'enemy' | 'mentor' | 'student' | 'neutral' | 'romantic'
    trust_level?: number;          // 1-10
  }
): void

// Remove an NPC relationship
removeNPCRelationship(pcId: string, npcId: string): void

// Replace all NPC relationships
setNPCRelationships(pcId: string, npcIds: string[]): void
```

## Usage Examples

### Creating a Player Character with Relationships

```typescript
const pcService = new PlayerCharacterService(db);

// Create the base player character
const pc = await pcService.create({
  campaign_id: 'campaign-1',
  name: 'Thorgrim Ironhammer',
  player_name: 'John',
  level: 8,
  race: 'Dwarf',
  class: ['Fighter', 'Barbarian'],
  faction_affiliations: [],  // Empty for now
  allied_npcs: []            // Empty for now
});

// Add faction affiliations
pcService.addFactionAffiliation('pc-123', 'faction-1', {
  affiliation_type: 'member',
  reputation: 5,
  joined_date: Math.floor(Date.now() / 1000)
});

pcService.addFactionAffiliation('pc-123', 'faction-2', {
  affiliation_type: 'ally',
  reputation: 3
});

// Add NPC relationships
pcService.addNPCRelationship('pc-123', 'npc-1', {
  relationship_type: 'mentor',
  trust_level: 9
});

pcService.addNPCRelationship('pc-123', 'npc-2', {
  relationship_type: 'friend',
  trust_level: 7
});
```

### Retrieving Relationships

```typescript
const pcService = new PlayerCharacterService(db);

// Get the PC
const pc = pcService.findById('pc-123');

// Get related faction IDs
const factionIds = pcService.getFactionAffiliations('pc-123');
console.log(factionIds); // ['faction-1', 'faction-2']

// Get related NPC IDs
const npcIds = pcService.getNPCRelationships('pc-123');
console.log(npcIds); // ['npc-1', 'npc-2']

// Use the arrays to fetch full entities
const factions = factionIds.map(id => factionService.findById(id));
const npcs = npcIds.map(id => npcService.findById(id));
```

### Updating Relationships

```typescript
// Replace faction affiliations entirely
pcService.setFactionAffiliations('pc-123', ['faction-1', 'faction-3']);

// Replace NPC relationships entirely
pcService.setNPCRelationships('pc-123', ['npc-2', 'npc-3', 'npc-4']);

// Or update via the update() method
pcService.update('pc-123', {
  name: 'Thorgrim the Bold',
  faction_affiliations: ['faction-1', 'faction-3'],
  allied_npcs: ['npc-2', 'npc-3', 'npc-4']
});
```

### Removing Relationships

```typescript
// Remove a single relationship
pcService.removeFactionAffiliation('pc-123', 'faction-1');
pcService.removeNPCRelationship('pc-123', 'npc-1');

// Remove all relationships
pcService.setFactionAffiliations('pc-123', []);
pcService.setNPCRelationships('pc-123', []);
```

## API Integration

The relationships are exposed through the REST API:

```bash
# Get player character (includes arrays)
GET /api/player-characters/pc-123
# Response includes:
# {
#   "id": "pc-123",
#   "name": "Thorgrim Ironhammer",
#   "faction_affiliations": ["faction-1", "faction-2"],
#   "allied_npcs": ["npc-1", "npc-2"],
#   ...
# }

# Update player character with new relationships
PUT /api/player-characters/pc-123
{
  "faction_affiliations": ["faction-1", "faction-3"],
  "allied_npcs": ["npc-2", "npc-3", "npc-4"]
}
```

## Database Operations

### Read Junction Table

```typescript
// Query directly (for advanced usage)
const affiliations = db.prepare(`
  SELECT * FROM pc_faction_affiliations WHERE pc_id = ?
`).all('pc-123');
// Returns array with affiliation_type, reputation, joined_date, etc.
```

### Insert into Junction Table

```typescript
// Use service methods instead, but for reference:
db.prepare(`
  INSERT INTO pc_faction_affiliations (id, pc_id, faction_id, affiliation_type, reputation, joined_date, created_at)
  VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
  ON CONFLICT(pc_id, faction_id) DO UPDATE SET
    affiliation_type = excluded.affiliation_type,
    reputation = excluded.reputation,
    joined_date = excluded.joined_date,
    updated_at = strftime('%s', 'now')
`).run(uuid(), 'pc-123', 'faction-1', 'member', 5, timestamp);
```

### Delete from Junction Table

```typescript
// Remove single relationship
db.prepare(`
  DELETE FROM pc_faction_affiliations WHERE pc_id = ? AND faction_id = ?
`).run('pc-123', 'faction-1');

// Remove all relationships for PC (CASCADE handles this on PC delete)
db.prepare(`
  DELETE FROM pc_faction_affiliations WHERE pc_id = ?
`).run('pc-123');
```

## Performance Notes

1. **Query Pattern**: `SELECT faction_id FROM pc_faction_affiliations WHERE pc_id = ?`
   - Indexed by UNIQUE(pc_id, faction_id) constraint
   - Single query, no joins needed
   - Returns only IDs for efficient filtering

2. **Batch Updates**: `setFactionAffiliations()` does:
   - 1 DELETE query
   - N INSERT queries (one per faction)
   - Total: N+1 queries (acceptable for small arrays)

3. **Memory**: Arrays stay in memory, junction tables handle persistence

## Testing

The implementation is tested by:

1. **Contract Tests**: `playerCharacters.test.ts`
   - Create PC with faction_affiliations array
   - Create PC with allied_npcs array
   - Update faction_affiliations
   - Update allied_npcs
   - Arrays returned in responses

2. **Integration Tests**: (Future)
   - Relationship deletion cascades
   - FK constraint validation
   - Circular reference prevention (if applicable)

3. **Unit Tests**: (Future)
   - Service method isolation
   - Option parameter handling
   - Edge cases (empty arrays, duplicates, etc.)
