# Junction Tables Implementation Plan

## Current JSON Array Relationships → Junction Tables

Review this list and mark which ones to implement. Add any missing relationships you want.

---

## Factions (4 relationships)

### 1. faction_alliances
- **Connects**: Faction ↔ Faction (self-referential)
- **Current**: `allied_factions` JSON array
- **Direction**: Currently one-way (Faction A lists Faction B, but B might not list A)
- **With Junction**: Bidirectional (alliance is mutual)
- **Future Metadata**: alliance_type, alliance_strength, formed_date
- **Status**: ✅ IMPLEMENT

### 2. faction_rivalries
- **Connects**: Faction ↔ Faction (self-referential)
- **Current**: `rival_factions` JSON array
- **Direction**: Currently one-way
- **With Junction**: Bidirectional (rivalry is mutual)
- **Future Metadata**: rivalry_type, rivalry_intensity, conflict_history
- **Status**: ✅ IMPLEMENT

### 3. faction_members (Should in addition add a number field for total members, not just named connected NPCs.)
- **Connects**: Faction ↔ NPC
- **Current**: `key_members` JSON array in factions table
- **Direction**: Faction → NPC (NPC doesn't know which factions they're in)
- **With Junction**: Bidirectional (NPC can query "my factions")
- **Future Metadata**: role, rank, joined_date, loyalty_level
- **Status**: ✅ IMPLEMENT

### 4. faction_territory
- **Connects**: Faction ↔ Location
- **Current**: `territory` JSON array in factions table
- **Direction**: Faction → Location (one-way)
- **With Junction**: Bidirectional (location knows controlling faction)
- **Future Metadata**: control_type (owns/occupies/influences), control_strength
- **Status**: ✅ IMPLEMENT

---

## NPCs (1 relationship) (Need NPCs to NPCs for who knows/is associated with who, (<- Could make this even more granular with hierarchy relationships or familial consider adding to UX_TODO these relationship types to be added as optional fields in the wizard start up sequence.) Need NPCs to Player Character for who's met who,)

### 5. npc_locations
- **Connects**: NPC ↔ Location
- **Current**: `locations` JSON array in npcs table
- **Direction**: NPC → Location (one-way)
- **With Junction**: Bidirectional (location knows which NPCs are there)
- **Future Metadata**: presence_type (lives/works/visits), frequency
- **Status**: ✅ IMPLEMENT
- **Note**: Overlaps with location_notable_npcs - can be same table!

---

## Locations (3 relationships)

### 6. location_notable_npcs
- **Connects**: Location ↔ NPC
- **Current**: `notable_npcs` JSON array in locations table
- **Direction**: Location → NPC (one-way)
- **With Junction**: **MERGE with npc_locations** (same relationship, different direction)
- **Future Metadata**: Same as npc_locations
- **Status**: ⚠️ MERGE with #5 (npc_locations)

### 7. location_factions_present
- **Connects**: Location ↔ Faction
- **Current**: `factions_present` JSON array in locations table
- **Direction**: Location → Faction (one-way)
- **With Junction**: Bidirectional (faction knows their locations)
- **Future Metadata**: presence_type (controls/visits/operates), influence_level
- **Status**: ⚠️ REVIEW - Overlaps with faction_territory (#4)?
- **Question**: Is this the same as faction_territory or different? (territory = owns, factions_present = operates?)

### 8. location_connections 
- **Connects**: Location ↔ Location (self-referential)
- **Current**: `connected_locations` JSON array
- **Direction**: Currently one-way (Location A → Location B)
- **With Junction**: Bidirectional (roads/passages work both ways) (<- incorrect logic we should have two fields, one directional for the parent locaion, and one for any children) (Consider adding a third for nearby lateral locations, optional)
- **Future Metadata**: connection_type (road/tunnel/portal), travel_time, difficulty (<- should probably only be parent, child, or nearby?)
- **Status**: ✅ IMPLEMENT

---

## Session Recaps (4 relationships - Historical Records)

### 9. recap_npcs_encountered
- **Connects**: SessionRecap ↔ NPC
- **Current**: `npcs_encountered` JSON array
- **Direction**: SessionRecap → NPC (one-way, immutable)
- **With Junction**: Could be bidirectional (NPC shows "appeared in Session 3, 5, 7") (<- make optional perhaps)
- **Future Metadata**: interaction_type, importance_to_session
- **Status**: ✅ IMPLEMENT (useful for "NPC appearance history")

### 10. recap_locations_visited
- **Connects**: SessionRecap ↔ Location
- **Current**: `locations_visited` JSON array
- **Direction**: SessionRecap → Location (one-way, immutable)
- **With Junction**: Bidirectional (location shows "visited in Session 2, 4, 6") (<- make optional perhaps)
- **Future Metadata**: duration_in_location, events_at_location
- **Status**: ✅ IMPLEMENT

### 11. recap_quests_progressed
- **Connects**: SessionRecap ↔ Quest
- **Current**: `quests_progressed` JSON array
- **Direction**: SessionRecap → Quest (one-way)
- **With Junction**: Bidirectional (quest shows "progressed in Session 1, 3, 5") (<- don't make optional. I argue if players saw what sessions specific quests were advanced in it could give them insight into the plans/how dm does things.)
- **Future Metadata**: progress_type (started/advanced/completed), notes
- **Status**: ✅ IMPLEMENT

### 12. recap_loot_acquired
- **Connects**: SessionRecap ↔ Item
- **Current**: `loot_acquired` JSON array
- **Direction**: SessionRecap → Item (one-way)
- **With Junction**: Bidirectional (item shows "acquired in Session 7") (<- make optional perhaps)
- **Future Metadata**: acquired_by_pc, circumstances
- **Status**: ✅ IMPLEMENT

---

## Quests (2 relationships)

### 13. quest_related_npcs
- **Connects**: Quest ↔ NPC
- **Current**: `related_npcs` JSON array
- **Direction**: Quest → NPC (one-way)
- **With Junction**: Bidirectional (NPC shows "involved in Quest A, B") (<- don't make optional. I argue if players saw what npcs were involve in it could give them insight into the plans/how dm does things.)
- **Future Metadata**: role_in_quest (quest_giver/objective/ally/enemy)
- **Status**: ✅ IMPLEMENT

### 14. quest_related_locations
- **Connects**: Quest ↔ Location
- **Current**: `related_locations` JSON array
- **Direction**: Quest → Location (one-way)
- **With Junction**: Bidirectional (location shows "quests here: Quest X, Y") (<- make optional perhaps??? unsure)
- **Future Metadata**: location_role (starts_here/objective_here/takes_place_here)
- **Status**: ✅ IMPLEMENT

---

## Player Characters (2 relationships)

### 15. pc_faction_affiliations
- **Connects**: PlayerCharacter ↔ Faction
- **Current**: `faction_affiliations` JSON array
- **Direction**: PC → Faction (one-way)
- **With Junction**: Bidirectional (faction knows which PCs are members/allies)
- **Future Metadata**: affiliation_type (member/ally/enemy), reputation
- **Status**: ✅ IMPLEMENT

### 16. pc_allied_npcs (Consider adding rivals or enemies)
- **Connects**: PlayerCharacter ↔ NPC
- **Current**: `allied_npcs` JSON array
- **Direction**: PC → NPC (one-way)
- **With Junction**: Bidirectional (NPC knows which PCs they're allied with)
- **Future Metadata**: relationship_type (ally/friend/rival), trust_level
- **Status**: ✅ IMPLEMENT

---

## Lore Entries (3 relationships)

### 17. lore_entry_npcs
- **Connects**: LoreEntry ↔ NPC
- **Current**: `related_npcs` JSON array
- **Direction**: LoreEntry → NPC (one-way)
- **With Junction**: Bidirectional (NPC shows "mentioned in Lore: Ancient War, Lost Kingdom") (keep 1 way I think. something to be learned about that NPC, not just information)
- **Future Metadata**: relevance_type
- **Status**: ✅ IMPLEMENT

### 18. lore_entry_locations
- **Connects**: LoreEntry ↔ Location
- **Current**: `related_locations` JSON array
- **Direction**: LoreEntry → Location (one-way)
- **With Junction**: Bidirectional (location shows historical lore) (consider allowing functionality to add DM* to existing fields and make them secret columns. Could be useful for something like this that you want bidirectional but could want hidden or visible.)
- **Future Metadata**: relevance_type
- **Status**: ✅ IMPLEMENT

### 19. lore_entry_factions
- **Connects**: LoreEntry ↔ Faction
- **Current**: `related_factions` JSON array
- **Direction**: LoreEntry → Faction (one-way)
- **With Junction**: Bidirectional (faction shows historical lore) (consider allowing functionality to add DM* to existing fields and make them secret columns. Could be useful for something like this that you want bidirectional but could want hidden or visible.)
- **Future Metadata**: relevance_type
- **Status**: ✅ IMPLEMENT

---

## World Rules (1 relationship)

### 20. world_rule_relations
- **Connects**: WorldRule ↔ WorldRule (self-referential)
- **Current**: `related_rules` JSON array
- **Direction**: WorldRule → WorldRule (one-way)
- **With Junction**: Bidirectional (rules can reference each other)
- **Future Metadata**: relation_type (supersedes/contradicts/clarifies/builds_on) (in regards to future meta data will that appear in the field as text? How would that work with the UI and actually seeing the connection?)
- **Status**: ✅ IMPLEMENT

---

## Planar Forces (3 relationships)

### 21. planar_force_alliances
- **Connects**: PlanarForce ↔ PlanarForce (self-referential)
- **Current**: `allied_entities` JSON array
- **Direction**: PlanarForce → PlanarForce (one-way)
- **With Junction**: Bidirectional
- **Future Metadata**: alliance_type, cosmic_pact_details
- **Status**: ✅ IMPLEMENT

### 22. planar_force_rivalries
- **Connects**: PlanarForce ↔ PlanarForce (self-referential)
- **Current**: `rival_entities` JSON array
- **Direction**: PlanarForce → PlanarForce (one-way)
- **With Junction**: Bidirectional
- **Future Metadata**: conflict_type, war_duration
- **Status**: ✅ IMPLEMENT

### 23. planar_force_religious_orders
- **Connects**: PlanarForce ↔ CustomMechanic (or should it be → Faction?) (Yes, to faction I believe. We could add a religious association field to the faction schema, so we could name the faction whatever we wanted not necessarily X religion, and then relate the God/Otherworldly being to the faction.)
- **Current**: `religious_orders` JSON array (no FK validation!)
- **Direction**: PlanarForce → CustomMechanic (one-way)
- **With Junction**: Bidirectional
- **Future Metadata**: devotion_level, religious_practices
- **Status**: ⚠️ REVIEW - Should this connect to Factions instead?

---

## Session Prep (3 relationships - Planning Only)

### 24. session_prep_npcs
- **Connects**: SessionPrep ↔ NPC
- **Current**: `npcs_to_prep` JSON array
- **Direction**: SessionPrep → NPC (one-way, planning artifact)
- **With Junction**: Bidirectional (NPC shows "needs prep for Session X") (keep 1 way, planning doesn't appear in system databases. Pollutes data with hypotheticals.)
- **Future Metadata**: prep_priority, prep_notes
- **Status**: ⚠️ REVIEW - Temporary planning data, maybe keep as JSON?

### 25. session_prep_locations
- **Connects**: SessionPrep ↔ Location
- **Current**: `locations_to_prep` JSON array
- **Direction**: SessionPrep → Location (one-way) 
- **With Junction**: Bidirectional (keep 1 way, planning doesn't appear in system databases. Pollutes data with hypotheticals.)
- **Future Metadata**: prep_priority, prep_notes
- **Status**: ⚠️ REVIEW - Temporary planning data, maybe keep as JSON?

### 26. session_prep_quests (MISSING!)
- **Connects**: SessionPrep ↔ Quest
- **Current**: Migration has `quests_to_advance` but not in model?
- **Direction**: SessionPrep → Quest (keep 1 way, planning doesn't appear in system databases. Pollutes data with hypotheticals.)
- **Status**: ⚠️ CHECK if this exists

---

## Custom Mechanics (1 relationship)

### 27. custom_mechanic_relations
- **Connects**: CustomMechanic ↔ CustomMechanic OR WorldRule? (remove entirely I believe. This database is mostly meta information for rules and systems.)
- **Current**: `related_rules` JSON array (ambiguous!)
- **Direction**: CustomMechanic → ? (unclear)
- **With Junction**: Depends on target
- **Status**: ⚠️ CLARIFY - What does this connect to?

---

## Items (0 relationships) (I see them but they are not "proper". Why is PC a foreign key? I can't edit them to chose the relationship. It feels like these were hard coded or generated inside the schema and it's not pointing to an actual entity.)
- **Has Foreign Keys**: owner_npc_id, owner_pc_id, location_id (already proper!)
- **No JSON arrays**: ✅ Already normalized

---

## Creatures (1 relationship)

### 28. creature_habitats
- **Connects**: Creature ↔ Location
- **Current**: `habitats` JSON array
- **Direction**: Creature → Location (one-way)
- **With Junction**: Bidirectional (location shows "creatures here: Dragon, Troll")
- **Future Metadata**: habitat_frequency (common/uncommon/rare), time_of_day
- **Status**: ✅ IMPLEMENT

---

## MISSING RELATIONSHIPS (Add These?)

### Suggested Additions

**Items**:
- ❓ item_creature_drops: Item ↔ Creature (which creatures drop this item?) (optional)
- ❓ item_quest_rewards: Item ↔ Quest (which quests reward this item?) (optional)

**Creatures**:
- ❓ creature_factions: Creature ↔ Faction (faction's signature creature/mounts?) (no)
- ❓ creature_quests: Creature ↔ Quest (creatures as quest objectives?) (optional)

**Custom Mechanics**:
- ❓ mechanic_classes: CustomMechanic ↔ ??? (which classes use this mechanic?) (good idea...but unsure of custom mechanics database currently)
- ❓ mechanic_items: CustomMechanic ↔ Item (items with special mechanics?) (no, would be in item database)

**World Rules**:
- ❓ world_rule_locations: WorldRule ↔ Location (location-specific rules?) (optional)
- ❓ world_rule_planar_forces: WorldRule ↔ PlanarForce (deity-specific rules?) (optional)

---

## OVERLAPS TO RESOLVE

### location_notable_npcs vs npc_locations
- **Current**: Both exist as separate JSON arrays
- **locations.notable_npcs**: Location lists important NPCs
- **npcs.locations**: NPC lists where they appear
- **Resolution**: **MERGE into single table: `npc_locations`**
- **Metadata field**: `is_notable` BOOLEAN to mark important NPCs

### location_factions_present vs faction_territory
- **Current**: Both exist as separate JSON arrays
- **locations.factions_present**: Location lists factions operating there
- **factions.territory**: Faction lists locations they control
- **Resolution**: **MERGE into single table: `faction_locations`** (I argue against this. Should differentiate between contested or coexisting factions in the same location vs. factions that dominate an area. but we should make this more clear than it is currently)
- **Metadata fields**:
  - `control_type`: 'owns' | 'controls' | 'operates' | 'influences'
  - `control_strength`: 1-10

---

## SUMMARY COUNTS

**Total Junction Tables Proposed**: 28
- ✅ Implement: 22
- ⚠️ Review/Clarify: 6
- ❓ Suggested Additions: 8 (optional)

**Overlaps Resolved**: 2
- location_notable_npcs + npc_locations → npc_locations (with is_notable flag)
- location_factions_present + faction_territory → faction_locations (with control_type)

**Actual Tables After Merging**: 26

---

## YOUR TASK: Review and Edit

**Mark each with**:
- ✅ KEEP - Implement this
- ❌ REMOVE - Don't need this
- ➕ ADD - New relationship you want
- ❓ UNSURE - Need to discuss

**Add any missing relationships** you think should exist!
