# Junction Tables - Final Implementation Specification

Based on user feedback from JUNCTION_TABLES_PLAN.md

---

## Design Principles

1. **DM* Prefix Pattern**: Table/field names starting with `dm_` are filtered in player_view
2. **Bidirectionality**: Hardcoded per relationship type (configurable UI later)
3. **Minimal Metadata**: Start with essentials, expand later
4. **One-Way Indicators**: Lore entries, session preps don't show reverse
5. **Keep Foreign Keys**: Existing FKs (faction_id, etc.) stay as-is

---

## Junction Tables to Implement (24 total)

### Factions (5 tables)

**1. faction_alliances**
```sql
CREATE TABLE faction_alliances (
  id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL,
  allied_faction_id TEXT NOT NULL,
  alliance_type TEXT, -- 'military' | 'trade' | 'political' | 'marriage'
  alliance_strength INTEGER CHECK (alliance_strength BETWEEN 1 AND 10),
  formed_date INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  FOREIGN KEY (allied_faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  UNIQUE(faction_id, allied_faction_id)
);
```
- **Bidirectional**: YES (alliance is mutual)
- **Replaces**: `allied_factions` JSON array

**2. faction_rivalries**
```sql
CREATE TABLE faction_rivalries (
  id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL,
  rival_faction_id TEXT NOT NULL,
  rivalry_type TEXT, -- 'territorial' | 'ideological' | 'historical' | 'economic'
  rivalry_intensity INTEGER CHECK (rivalry_intensity BETWEEN 1 AND 10),
  conflict_history TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  FOREIGN KEY (rival_faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  UNIQUE(faction_id, rival_faction_id)
);
```
- **Bidirectional**: YES (rivalry is mutual)
- **Replaces**: `rival_factions` JSON array

**3. faction_members**
```sql
CREATE TABLE faction_members (
  id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  role TEXT, -- 'leader' | 'lieutenant' | 'member' | 'informant'
  rank TEXT,
  joined_date INTEGER,
  loyalty_level INTEGER CHECK (loyalty_level BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  UNIQUE(faction_id, npc_id)
);
```
- **Bidirectional**: YES (NPC queries "my factions", Faction queries "my members")
- **Replaces**: `key_members` JSON array
- **Note**: Add `total_member_count INTEGER` to factions table for unnamed masses

**4. faction_territory**
```sql
CREATE TABLE faction_territory (
  id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  control_type TEXT CHECK (control_type IN ('owns', 'governs', 'controls')),
  control_strength INTEGER CHECK (control_strength BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(faction_id, location_id)
);
```
- **Bidirectional**: YES
- **Replaces**: `territory` JSON array
- **Note**: Separate from faction_presence (domination vs coexistence)

**5. faction_presence**
```sql
CREATE TABLE faction_presence (
  id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  presence_type TEXT CHECK (presence_type IN ('operates', 'contested', 'influences', 'hidden')),
  presence_strength INTEGER CHECK (presence_strength BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(faction_id, location_id)
);
```
- **Bidirectional**: YES
- **Replaces**: `factions_present` JSON array
- **Purpose**: Multiple factions in one location (coexistence/contest)

---

### NPCs (3 tables - including new ones)

**6. npc_locations**
```sql
CREATE TABLE npc_locations (
  id TEXT PRIMARY KEY,
  npc_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  presence_type TEXT CHECK (presence_type IN ('lives', 'works', 'visits', 'associated')),
  is_notable BOOLEAN DEFAULT 0, -- Mark important NPCs for location
  frequency TEXT, -- 'permanent' | 'frequent' | 'occasional' | 'rare'
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(npc_id, location_id)
);
```
- **Bidirectional**: YES
- **Replaces**: `locations` (npcs) + `notable_npcs` (locations) - MERGED
- **is_notable**: Marks NPCs important to location

**7. npc_npc_relationships** (NEW)
```sql
CREATE TABLE npc_npc_relationships (
  id TEXT PRIMARY KEY,
  npc_id TEXT NOT NULL,
  related_npc_id TEXT NOT NULL,
  relationship_type TEXT CHECK (relationship_type IN ('knows', 'family', 'friend', 'rival', 'enemy', 'mentor', 'student')),
  relationship_strength INTEGER CHECK (relationship_strength BETWEEN 1 AND 10),
  is_mutual BOOLEAN DEFAULT 1, -- For asymmetric relationships (A knows B, but B doesn't know A)
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  FOREIGN KEY (related_npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  UNIQUE(npc_id, related_npc_id)
);
```
- **Bidirectional**: Configurable via `is_mutual` field
- **New Feature**: Adds social graph to NPCs
- **Future**: Add to UX_TODO - hierarchy/familial relationship types

**8. npc_pc_encounters** (NEW)
```sql
CREATE TABLE npc_pc_encounters (
  id TEXT PRIMARY KEY,
  npc_id TEXT NOT NULL,
  pc_id TEXT NOT NULL,
  has_met BOOLEAN DEFAULT 1,
  first_met_session INTEGER, -- Session number
  relationship_status TEXT CHECK (relationship_status IN ('ally', 'neutral', 'suspicious', 'enemy')),
  trust_level INTEGER CHECK (trust_level BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  FOREIGN KEY (pc_id) REFERENCES player_characters(id) ON DELETE CASCADE,
  UNIQUE(npc_id, pc_id)
);
```
- **Bidirectional**: YES
- **New Feature**: Track which PCs have met which NPCs

---

### Locations (2 tables)

**9. location_connections**
```sql
CREATE TABLE location_connections (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  connected_location_id TEXT NOT NULL,
  connection_type TEXT CHECK (connection_type IN ('nearby', 'road', 'tunnel', 'portal', 'passage')),
  travel_time TEXT, -- '1 hour' | '3 days' | etc.
  difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'difficult', 'treacherous')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (connected_location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(location_id, connected_location_id)
);
```
- **Bidirectional**: YES (roads work both ways)
- **Replaces**: `connected_locations` JSON array
- **Purpose**: Lateral connections (separate from parent_location_id hierarchy)

**10. faction_presence** (already listed under Factions #5)

---

### Session Recaps (4 tables - DM-only entities, one-way junctions)

**11. recap_npcs_encountered**
```sql
CREATE TABLE recap_npcs_encountered (
  id TEXT PRIMARY KEY,
  session_recap_id TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  interaction_type TEXT, -- 'combat' | 'dialogue' | 'observed' | 'mentioned'
  importance_to_session TEXT CHECK (importance_to_session IN ('major', 'moderate', 'minor')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (session_recap_id) REFERENCES session_recaps(id) ON DELETE CASCADE,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  UNIQUE(session_recap_id, npc_id)
);
```
- **Bidirectional**: NO (one-way - recap→NPC only, NPC doesn't show reverse)
- **Replaces**: `npcs_encountered` JSON array

**12. recap_locations_visited**
```sql
CREATE TABLE recap_locations_visited (
  id TEXT PRIMARY KEY,
  session_recap_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  duration_in_location TEXT, -- 'brief' | 'moderate' | 'extended'
  events_at_location TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (session_recap_id) REFERENCES session_recaps(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(session_recap_id, location_id)
);
```
- **Bidirectional**: NO (one-way - recap→location only)
- **Replaces**: `locations_visited` JSON array

**13. recap_quests_progressed**
```sql
CREATE TABLE recap_quests_progressed (
  id TEXT PRIMARY KEY,
  session_recap_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  progress_type TEXT CHECK (progress_type IN ('started', 'advanced', 'completed', 'failed')),
  progress_notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (session_recap_id) REFERENCES session_recaps(id) ON DELETE CASCADE,
  FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
  UNIQUE(session_recap_id, quest_id)
);
```
- **Bidirectional**: YES (Quest SHOULD show "Session 1: started, Session 3: advanced")
- **Replaces**: `quests_progressed` JSON array
- **User note**: Players seeing quest session history gives insight into DM planning (feature not bug!)

**14. recap_loot_acquired**
```sql
CREATE TABLE recap_loot_acquired (
  id TEXT PRIMARY KEY,
  session_recap_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  acquired_by_pc_id TEXT, -- Which PC got it
  acquisition_method TEXT, -- 'looted' | 'purchased' | 'rewarded' | 'found'
  circumstances TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (session_recap_id) REFERENCES session_recaps(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (acquired_by_pc_id) REFERENCES player_characters(id) ON DELETE SET NULL,
  UNIQUE(session_recap_id, item_id)
);
```
- **Bidirectional**: NO (one-way - recap→item only)
- **Replaces**: `loot_acquired` JSON array

---

### Quests (2 tables)

**15. quest_related_npcs**
```sql
CREATE TABLE quest_related_npcs (
  id TEXT PRIMARY KEY,
  quest_id TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  role_in_quest TEXT CHECK (role_in_quest IN ('quest_giver', 'objective', 'ally', 'enemy', 'mentioned')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  UNIQUE(quest_id, npc_id)
);
```
- **Bidirectional**: YES (NPC shows "Involved in: Quest A, Quest B")
- **Replaces**: `related_npcs` JSON array
- **User note**: Players seeing NPC quest involvement is intentional

**16. quest_related_locations**
```sql
CREATE TABLE quest_related_locations (
  id TEXT PRIMARY KEY,
  quest_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  location_role TEXT CHECK (location_role IN ('starts_here', 'objective_here', 'takes_place_here')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(quest_id, location_id)
);
```
- **Bidirectional**: TBD (user unsure - can implement later)
- **Replaces**: `related_locations` JSON array

---

### Player Characters (2 tables)

**17. pc_faction_affiliations**
```sql
CREATE TABLE pc_faction_affiliations (
  id TEXT PRIMARY KEY,
  pc_id TEXT NOT NULL,
  faction_id TEXT NOT NULL,
  affiliation_type TEXT CHECK (affiliation_type IN ('member', 'ally', 'enemy', 'neutral')),
  reputation INTEGER CHECK (reputation BETWEEN -10 AND 10), -- Negative for enemy
  joined_date INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (pc_id) REFERENCES player_characters(id) ON DELETE CASCADE,
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  UNIQUE(pc_id, faction_id)
);
```
- **Bidirectional**: YES
- **Replaces**: `faction_affiliations` JSON array

**18. pc_npc_relationships** (renamed from pc_allied_npcs)
```sql
CREATE TABLE pc_npc_relationships (
  id TEXT PRIMARY KEY,
  pc_id TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  relationship_type TEXT CHECK (relationship_type IN ('ally', 'friend', 'rival', 'enemy', 'mentor', 'student', 'neutral')),
  trust_level INTEGER CHECK (trust_level BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (pc_id) REFERENCES player_characters(id) ON DELETE CASCADE,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  UNIQUE(pc_id, npc_id)
);
```
- **Bidirectional**: YES
- **Replaces**: `allied_npcs` JSON array
- **Expanded**: Now includes rivals/enemies per user suggestion

---

### Lore Entries (3 tables - one-way only)

**19. lore_entry_npcs**
```sql
CREATE TABLE lore_entry_npcs (
  id TEXT PRIMARY KEY,
  lore_entry_id TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  relevance_type TEXT, -- 'subject' | 'mentioned' | 'author' | 'witness'
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (lore_entry_id) REFERENCES lore_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  UNIQUE(lore_entry_id, npc_id)
);
```
- **Bidirectional**: NO (lore→NPC only, NPC doesn't show "mentioned in lore")
- **Replaces**: `related_npcs` JSON array
- **User note**: One-way because it's info TO BE LEARNED about NPC

**20. lore_entry_locations**
```sql
CREATE TABLE lore_entry_locations (
  id TEXT PRIMARY KEY,
  lore_entry_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  relevance_type TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (lore_entry_id) REFERENCES lore_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(lore_entry_id, location_id)
);
```
- **Bidirectional**: NO (one-way)
- **Replaces**: `related_locations` JSON array
- **User note**: Consider dm_* fields for hiding specific connections

**21. lore_entry_factions**
```sql
CREATE TABLE lore_entry_factions (
  id TEXT PRIMARY KEY,
  lore_entry_id TEXT NOT NULL,
  faction_id TEXT NOT NULL,
  relevance_type TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (lore_entry_id) REFERENCES lore_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  UNIQUE(lore_entry_id, faction_id)
);
```
- **Bidirectional**: NO (one-way)
- **Replaces**: `related_factions` JSON array

---

### World Rules (1 table)

**22. world_rule_relations**
```sql
CREATE TABLE world_rule_relations (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  related_rule_id TEXT NOT NULL,
  relation_type TEXT CHECK (relation_type IN ('supersedes', 'contradicts', 'clarifies', 'builds_on')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (rule_id) REFERENCES world_rules(id) ON DELETE CASCADE,
  FOREIGN KEY (related_rule_id) REFERENCES world_rules(id) ON DELETE CASCADE,
  UNIQUE(rule_id, related_rule_id)
);
```
- **Bidirectional**: YES
- **Replaces**: `related_rules` JSON array

---

### Planar Forces (3 tables)

**23. planar_force_alliances**
```sql
CREATE TABLE planar_force_alliances (
  id TEXT PRIMARY KEY,
  planar_force_id TEXT NOT NULL,
  allied_planar_force_id TEXT NOT NULL,
  alliance_type TEXT, -- 'cosmic_pact' | 'pantheon_member' | 'temporary_alliance'
  cosmic_pact_details TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (planar_force_id) REFERENCES planar_forces(id) ON DELETE CASCADE,
  FOREIGN KEY (allied_planar_force_id) REFERENCES planar_forces(id) ON DELETE CASCADE,
  UNIQUE(planar_force_id, allied_planar_force_id)
);
```
- **Bidirectional**: YES
- **Replaces**: `allied_entities` JSON array

**24. planar_force_rivalries**
```sql
CREATE TABLE planar_force_rivalries (
  id TEXT PRIMARY KEY,
  planar_force_id TEXT NOT NULL,
  rival_planar_force_id TEXT NOT NULL,
  conflict_type TEXT, -- 'cosmic_war' | 'ideological' | 'territorial' | 'ancient_grudge'
  war_duration_years INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (planar_force_id) REFERENCES planar_forces(id) ON DELETE CASCADE,
  FOREIGN KEY (rival_planar_force_id) REFERENCES planar_forces(id) ON DELETE CASCADE,
  UNIQUE(planar_force_id, rival_planar_force_id)
);
```
- **Bidirectional**: YES
- **Replaces**: `rival_entities` JSON array

**25. planar_force_worshipers** (renamed from religious_orders)
```sql
CREATE TABLE planar_force_worshipers (
  id TEXT PRIMARY KEY,
  planar_force_id TEXT NOT NULL,
  faction_id TEXT NOT NULL, -- Changed from custom_mechanics to factions!
  devotion_level TEXT CHECK (devotion_level IN ('primary_deity', 'pantheon_member', 'minor_worship', 'secret_cult')),
  religious_practices TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (planar_force_id) REFERENCES planar_forces(id) ON DELETE CASCADE,
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  UNIQUE(planar_force_id, faction_id)
);
```
- **Bidirectional**: YES
- **Replaces**: `religious_orders` JSON array (was CustomMechanic, now Faction!)
- **Add to factions**: `religious_association TEXT` field

---

### Creatures (1 table)

**26. creature_habitats**
```sql
CREATE TABLE creature_habitats (
  id TEXT PRIMARY KEY,
  creature_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  habitat_frequency TEXT CHECK (habitat_frequency IN ('common', 'uncommon', 'rare', 'legendary')),
  time_of_day TEXT CHECK (time_of_day IN ('any', 'day', 'night', 'dawn', 'dusk')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (creature_id) REFERENCES creatures(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(creature_id, location_id)
);
```
- **Bidirectional**: YES (location shows "Creatures: Dragon, Troll")
- **Replaces**: `habitats` JSON array

---

### Session Prep (3 tables - DM-only, one-way)

**27. dm_session_prep_npcs** (Note dm_ prefix!)
```sql
CREATE TABLE dm_session_prep_npcs (
  id TEXT PRIMARY KEY,
  session_prep_id TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  prep_priority INTEGER CHECK (prep_priority BETWEEN 1 AND 5),
  prep_notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (session_prep_id) REFERENCES session_preps(id) ON DELETE CASCADE,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  UNIQUE(session_prep_id, npc_id)
);
```
- **Bidirectional**: NO (one-way - prep→NPC, NPC doesn't show "Prepped in Session X")
- **Table Name**: Starts with `dm_` to hide entire table in player view!
- **Replaces**: `npcs_to_prep` JSON array

**28. dm_session_prep_locations**
```sql
CREATE TABLE dm_session_prep_locations (
  id TEXT PRIMARY KEY,
  session_prep_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  prep_priority INTEGER CHECK (prep_priority BETWEEN 1 AND 5),
  prep_notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (session_prep_id) REFERENCES session_preps(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(session_prep_id, location_id)
);
```
- **Bidirectional**: NO (one-way)
- **Table Name**: `dm_` prefix hides in player view
- **Replaces**: `locations_to_prep` JSON array

**29. dm_session_prep_quests**
```sql
CREATE TABLE dm_session_prep_quests (
  id TEXT PRIMARY KEY,
  session_prep_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  prep_priority INTEGER CHECK (prep_priority BETWEEN 1 AND 5),
  prep_notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (session_prep_id) REFERENCES session_preps(id) ON DELETE CASCADE,
  FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
  UNIQUE(session_prep_id, quest_id)
);
```
- **Bidirectional**: NO (one-way)
- **Table Name**: `dm_` prefix hides in player view
- **Check if exists**: Need to verify quests_to_advance exists in current schema

---

## Schema Changes to Existing Tables

### Factions Table - Add Fields
```sql
ALTER TABLE factions ADD COLUMN total_member_count INTEGER DEFAULT 0;
ALTER TABLE factions ADD COLUMN religious_association TEXT;
```

---

## Tables Removed/Not Converting

- ❌ **custom_mechanic_relations**: Removed entirely (per user)
- ✅ **session_preps JSON arrays**: Converting to dm_* junction tables

---

## Summary

**Total Junction Tables**: 29
- Factions: 5
- NPCs: 3 (including 2 NEW)
- Locations: 2
- Session Recaps: 4
- Quests: 2
- Player Characters: 2
- Lore Entries: 3
- World Rules: 1
- Planar Forces: 3
- Creatures: 1
- Session Prep (DM-only): 3

**New Fields**: 2 (factions.total_member_count, factions.religious_association)

**Removed JSON Arrays**: 27 fields across 13 tables

---

## Questions Remaining

**1. Session Prep Visibility Logic**

You said: "AI can see it but hide from user/UI"

**How**:
- Table name: `dm_session_prep_npcs` (dm_ prefix filters it)
- AI queries it anyway (bypass player_view filter)?
- OR: Show in DM view only, hide in player view?

**Need clarification**: Should AI respect player_view filter or bypass it?

**2. Location Connections - Confirmed Understanding?**

`connected_locations` = lateral travel routes (roads/portals), separate from parent_location_id hierarchy?

**3. Future Metadata Display**

For `relation_type` on world_rule_relations: Will show inline in chips like "Magic System (builds on), Spellcasting (clarifies)"

**Correct?**

---

## 🎯 Ready to Implement?

If those 3 clarifications check out, I'm ready to:
1. Create Migration 025 with all 29 junction tables
2. Migrate existing JSON data
3. Update services to query junctions
4. Build relationship UI

**Give me the go-ahead or clarify those 3 points!**