# PlayerCharacterService Junction Table Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                  │
│  POST/PUT /api/player-characters                                    │
│  Request Body: { faction_affiliations: [...], allied_npcs: [...] } │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PLAYERCHARACTERSERVICE                           │
│                   (backend/src/services)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  create(data) ──────────────────────────┐                           │
│  update(id, data) ──────┐               │                           │
│  findById(id) ──────────┤               │                           │
│  list(filters) ─────────┤               │                           │
│                         │               │                           │
│                    updateEntity()        insertEntity()             │
│                         │               │                           │
│         ┌───────────────┴───────┬───────┴──────┐                   │
│         │                       │              │                    │
│         ▼                       ▼              ▼                    │
│    Intercept             Update Player    Insert Player            │
│    faction_affils   ──→  Characters Tbl   Characters Tbl           │
│    allied_npcs          (Update Query)    (Insert Query)           │
│         │                       │              │                    │
│         │                       └───────┬──────┘                    │
│         │                              │                            │
│         ├──────────────┐         ┌─────▼────────────────────┐      │
│         │              │         │                          │      │
│         ▼              ▼         ▼                          ▼      │
│  setFactionAffs   setNPCRels  Standard Columns    faction_affiliations
│  └─ DELETE        └─ DELETE    - name             allied_npcs
│  └─ INSERT N        └─ INSERT  - level            (empty arrays)
│      times              N times - race
│                               - etc.
└──────────────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│   PLAYER_      │  │  PC_FACTION_    │  │  PC_NPC_         │
│ CHARACTERS TBL │  │AFFILIATIONS TBL │  │RELATIONSHIPS TBL │
│                │  │                 │  │                  │
│ id (PK)        │  │ id (PK)         │  │ id (PK)          │
│ campaign_id    │  │ pc_id (FK)      │  │ pc_id (FK)       │
│ name           │  │ faction_id (FK) │  │ npc_id (FK)      │
│ level          │  │ affiliation_type│  │ relationship_type│
│ race           │  │ reputation      │  │ trust_level      │
│ faction_..     │  │ joined_date     │  │ created_at       │
│ allied_npc     │  │ created_at      │  │ updated_at       │
│ dm_* fields    │  │ updated_at      │  │                  │
│ created_at     │  │                 │  │ UNIQUE(pc_id,    │
│ updated_at     │  │ UNIQUE(pc_id,   │  │        npc_id)   │
│                │  │        faction) │  │                  │
└────────────────┘  └─────────────────┘  └──────────────────┘
     ▲                    ▲                    ▲
     │                    │                    │
     │ ON DELETE CASCADE  │ ON DELETE CASCADE  │
     │                    │                    │
     └────────────────────┴────────────────────┘
```

## Method Call Flow

### Get Relationships

```
findById(pcId: string)
    │
    ├─ SELECT * FROM player_characters WHERE id = ?
    │      Returns: PlayerCharacterRow
    │
    └─ rowToPlayerCharacter(row)
           │
           ├─ parseJsonFields() for JSON columns
           │      - tags
           │      - custom_fields
           │      - class
           │      - faction_affiliations (empty [])
           │      - allied_npcs (empty [])
           │
           └─ RETURN PlayerCharacter object
                  with empty arrays in JSON fields
                  (actual data in junction tables)
```

### Update Relationships

```
update(pcId: string, data: Partial<PlayerCharacter>)
    │
    ├─ Validate data
    │
    └─ updateEntity(pcId, data)
           │
           ├─ IF faction_affiliations in data
           │     │
           │     └─ setFactionAffiliations(pcId, data.faction_affiliations)
           │            │
           │            ├─ DELETE FROM pc_faction_affiliations WHERE pc_id = ?
           │            │
           │            └─ FOR EACH factionId in factionIds:
           │                   addFactionAffiliation(pcId, factionId)
           │                   └─ INSERT ... ON CONFLICT DO UPDATE
           │
           ├─ IF allied_npcs in data
           │     │
           │     └─ setNPCRelationships(pcId, data.allied_npcs)
           │            │
           │            ├─ DELETE FROM pc_npc_relationships WHERE pc_id = ?
           │            │
           │            └─ FOR EACH npcId in npcIds:
           │                   addNPCRelationship(pcId, npcId)
           │                   └─ INSERT ... ON CONFLICT DO UPDATE
           │
           └─ UPDATE player_characters SET [remaining fields] WHERE id = ?
                  (faction_affiliations and allied_npcs NOT updated here)
```

## Database Query Patterns

### Pattern 1: Read Relationships

```sql
-- Get faction IDs for a PC
SELECT faction_id FROM pc_faction_affiliations WHERE pc_id = 'pc-123'
RESULT: ['faction-1', 'faction-2']

-- Get NPC IDs for a PC
SELECT npc_id FROM pc_npc_relationships WHERE pc_id = 'pc-123'
RESULT: ['npc-1', 'npc-2', 'npc-3']
```

### Pattern 2: Upsert Relationship

```sql
-- Add/Update faction affiliation
INSERT INTO pc_faction_affiliations (id, pc_id, faction_id, affiliation_type, reputation, joined_date, created_at)
VALUES (uuid(), 'pc-123', 'faction-1', 'member', 5, 1698768000, now())
ON CONFLICT(pc_id, faction_id) DO UPDATE SET
  affiliation_type = COALESCE(excluded.affiliation_type, affiliation_type),
  reputation = COALESCE(excluded.reputation, reputation),
  joined_date = COALESCE(excluded.joined_date, joined_date),
  updated_at = now()
```

### Pattern 3: Delete Relationship

```sql
-- Remove faction affiliation
DELETE FROM pc_faction_affiliations WHERE pc_id = 'pc-123' AND faction_id = 'faction-1'

-- Remove all affiliations for PC
DELETE FROM pc_faction_affiliations WHERE pc_id = 'pc-123'
```

### Pattern 4: Cascading Delete

```sql
-- When PC is deleted
DELETE FROM player_characters WHERE id = 'pc-123'

-- Cascade deletes all relationships (automatic via FK)
-- - All rows in pc_faction_affiliations with pc_id = 'pc-123'
-- - All rows in pc_npc_relationships with pc_id = 'pc-123'
```

## Response Object Structure

### API Response (GET /api/player-characters/pc-123)

```json
{
  "id": "pc-123",
  "campaign_id": "campaign-1",
  "name": "Thorgrim Ironhammer",

  // Standard columns
  "player_name": "John",
  "class": ["Fighter", "Barbarian"],
  "level": 8,
  "race": "Dwarf",
  "background": "Soldier",
  "personality": "Gruff but loyal",
  "goals": "Protect the clan",
  "backstory": "...",
  "art": "/images/thorgrim.png",

  // Relationships (reconstructed from junction tables)
  "faction_affiliations": ["faction-1", "faction-2"],
  "allied_npcs": ["npc-1", "npc-2"],

  // JSON columns
  "tags": ["dwarf", "fighter", "tank"],
  "custom_fields": {
    "favorite_drink": "Ale",
    "catchphrase": "By my beard!"
  },

  // DM-only fields
  "dm_secrets": "Actually a prince in hiding",
  "dm_plot_threads": "Reveal in act 3",
  "dm_true_motivation": "Reclaim throne",
  "dm_consequences": "May be corrupted by power",

  // Metadata
  "core_status": "active",
  "player_knowledge": "common_knowledge",
  "created_at": 1698768000,
  "updated_at": 1698789000
}
```

## Service Method Tree

```
PlayerCharacterService
├── Inherited from BaseCategoryService
│   ├── create()
│   ├── update()
│   ├── delete()
│   └── list()
│
├── Overridden Methods
│   ├── validateCategoryFields()
│   ├── insertEntity()
│   ├── updateEntity() ─────────────────┐ JUNCTION TABLE INTERCEPTION
│   ├── deleteEntity()                  │
│   ├── findById()                      │
│   ├── list()                          │
│   └── rowToPlayerCharacter()          ┘
│
└── New Faction Affiliation Methods
    ├── getFactionAffiliations()
    ├── addFactionAffiliation()
    ├── removeFactionAffiliation()
    └── setFactionAffiliations()

└── New NPC Relationship Methods
    ├── getNPCRelationships()
    ├── addNPCRelationship()
    ├── removeNPCRelationship()
    └── setNPCRelationships()
```

## Type Safety Pyramid

```
                    PlayerCharacter (Model)
                     /              \
                   /                  \
            PlayerCharacterRow      OperationOptions
             (DB Row Type)           (Partial Type)
             /        |      \
           /          |       \
    tags  custom_fields class  faction_affiliations...
    (JSON) (JSON)      (JSON)  (JSON placeholders)
                                        │
                                        ▼
                            Actual Data in Junction Tables
                         pc_faction_affiliations
                         pc_npc_relationships
```

## Comparison: Before vs After

### Before (JSON Arrays)

```
player_characters Table:
┌─────────────┬──────────────┬──────────────┐
│ id          │ name         │ faction_..   │
├─────────────┼──────────────┼──────────────┤
│ pc-123      │ Thorgrim     │ ["f1","f2"]  │
└─────────────┴──────────────┴──────────────┘

Problems:
- No referential integrity (f1, f2 might not exist)
- Can't query "all factions with member pc-123"
- Can't store metadata (affiliation_type, reputation)
- Duplicate data in JSON
- No CASCADE delete support
```

### After (Junction Tables)

```
player_characters Table:
┌─────────────┬──────────────┐
│ id          │ name         │
├─────────────┼──────────────┤
│ pc-123      │ Thorgrim     │
└─────────────┴──────────────┘

pc_faction_affiliations Table:
┌─────────────┬────────────┬─────────────┬────────────┐
│ id          │ pc_id      │ faction_id  │ rep        │
├─────────────┼────────────┼─────────────┼────────────┤
│ aff-1       │ pc-123     │ f1          │ 5          │
│ aff-2       │ pc-123     │ f2          │ 3          │
└─────────────┴────────────┴─────────────┴────────────┘

Benefits:
✓ Foreign key constraints (data integrity)
✓ Easy queries (all factions with member)
✓ Metadata storage (affiliation_type, reputation)
✓ No data duplication
✓ CASCADE delete support
✓ Proper database normalization
```

## Transaction Safety

```
update(pcId, { faction_affiliations: [...] })

BEGIN IMPLICIT TRANSACTION
  ├─ Validate data
  ├─ DELETE FROM pc_faction_affiliations WHERE pc_id = ?
  ├─ INSERT INTO pc_faction_affiliations VALUES (...)
  ├─ INSERT INTO pc_faction_affiliations VALUES (...)
  ├─ UPDATE player_characters SET ... WHERE id = ?
END IMPLICIT TRANSACTION

// If any query fails, entire transaction rolls back
// PC either has all new affiliations or none (no half-state)
```

## Performance Characteristics

```
Operation              Queries   Time (est)   Notes
─────────────────────────────────────────────────────
create()                  1      <1ms        Insert PC
findById()                1      <1ms        Select PC
update() (no relations)   1      <1ms        Update columns
update() (w/ relations)   N+2    <5ms        DELETE + N INSERT + UPDATE
delete()                  1      <1ms        Delete PC (cascade auto)
list()                    2      <50ms       COUNT + SELECT
getFactionAffiliations()  1      <1ms        SELECT faction_id
addFactionAffiliation()   1      <1ms        INSERT ... ON CONFLICT
removeFactionAffiliation() 1     <1ms        DELETE
setFactionAffiliations()  N+1    <5ms        DELETE + N INSERT
```

## Conclusion

The architecture provides:
1. **Data Integrity**: Foreign keys and constraints
2. **Flexibility**: Metadata storage on relationships
3. **Queryability**: Easy to find relationships
4. **Safety**: CASCADE deletes, transactions
5. **Performance**: Indexed queries
6. **Backward Compatibility**: API unchanged
7. **Type Safety**: Full TypeScript coverage
