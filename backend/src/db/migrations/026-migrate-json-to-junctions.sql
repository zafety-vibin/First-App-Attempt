-- Migration 026: Migrate JSON array data to junction tables
-- Phase 2 of junction tables implementation
-- Converts existing relationship data from JSON arrays to proper junction tables

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================================================
-- FACTION RELATIONSHIPS
-- ============================================================================

-- 1. Migrate allied_factions → faction_alliances
-- Only migrate IDs that actually exist in factions table (skip orphaned IDs)
INSERT INTO faction_alliances (id, faction_id, allied_faction_id, created_at)
SELECT
  lower(hex(randomblob(16))), -- Generate UUID
  f.id,
  json_each.value,
  f.created_at
FROM factions f, json_each(f.allied_factions)
WHERE f.allied_factions != '[]' AND f.allied_factions IS NOT NULL
  AND json_each.value IN (SELECT id FROM factions); -- Validate FK exists

-- 2. Migrate rival_factions → faction_rivalries
INSERT INTO faction_rivalries (id, faction_id, rival_faction_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  f.id,
  json_each.value,
  f.created_at
FROM factions f, json_each(f.rival_factions)
WHERE f.rival_factions != '[]' AND f.rival_factions IS NOT NULL
  AND json_each.value IN (SELECT id FROM factions); -- Validate FK exists

-- 3. Migrate key_members → faction_members
INSERT INTO faction_members (id, faction_id, npc_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  f.id,
  json_each.value,
  f.created_at
FROM factions f, json_each(f.key_members)
WHERE f.key_members != '[]' AND f.key_members IS NOT NULL
  AND json_each.value IN (SELECT id FROM npcs); -- Validate FK exists

-- 4. Migrate territory → faction_territory
INSERT INTO faction_territory (id, faction_id, location_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  f.id,
  json_each.value,
  f.created_at
FROM factions f, json_each(f.territory)
WHERE f.territory != '[]' AND f.territory IS NOT NULL
  AND json_each.value IN (SELECT id FROM locations); -- Validate FK exists

-- ============================================================================
-- NPC RELATIONSHIPS
-- ============================================================================

-- 5. Migrate npcs.locations → npc_locations
INSERT INTO npc_locations (id, npc_id, location_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  n.id,
  json_each.value,
  n.created_at
FROM npcs n, json_each(n.locations)
WHERE n.locations != '[]' AND n.locations IS NOT NULL
  AND json_each.value IN (SELECT id FROM locations); -- Validate FK exists

-- ============================================================================
-- LOCATION RELATIONSHIPS
-- ============================================================================

-- 6. Migrate notable_npcs → npc_locations (with is_notable=1)
INSERT INTO npc_locations (id, npc_id, location_id, is_notable, created_at)
SELECT
  lower(hex(randomblob(16))),
  json_each.value, -- npc_id
  l.id, -- location_id
  1, -- is_notable
  l.created_at
FROM locations l, json_each(l.notable_npcs)
WHERE l.notable_npcs != '[]' AND l.notable_npcs IS NOT NULL
  AND json_each.value IN (SELECT id FROM npcs) -- Validate FK exists
ON CONFLICT(npc_id, location_id) DO UPDATE SET is_notable = 1; -- Merge with existing npc_locations

-- 7. Migrate factions_present → faction_presence
INSERT INTO faction_presence (id, faction_id, location_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  json_each.value,
  l.id,
  l.created_at
FROM locations l, json_each(l.factions_present)
WHERE l.factions_present != '[]' AND l.factions_present IS NOT NULL
  AND json_each.value IN (SELECT id FROM factions); -- Validate FK exists

-- 8. Migrate connected_locations → location_connections
INSERT INTO location_connections (id, location_id, connected_location_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  l.id,
  json_each.value,
  l.created_at
FROM locations l, json_each(l.connected_locations)
WHERE l.connected_locations != '[]' AND l.connected_locations IS NOT NULL
  AND json_each.value IN (SELECT id FROM locations); -- Validate FK exists

-- ============================================================================
-- SESSION RECAP RELATIONSHIPS
-- ============================================================================

-- 9. Migrate npcs_encountered → recap_npcs_encountered
INSERT INTO recap_npcs_encountered (id, session_recap_id, npc_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  s.id,
  json_each.value,
  s.created_at
FROM session_recaps s, json_each(s.npcs_encountered)
WHERE s.npcs_encountered != '[]' AND s.npcs_encountered IS NOT NULL
  AND json_each.value IN (SELECT id FROM npcs); -- Validate FK exists

-- 10. Migrate locations_visited → recap_locations_visited
INSERT INTO recap_locations_visited (id, session_recap_id, location_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  s.id,
  json_each.value,
  s.created_at
FROM session_recaps s, json_each(s.locations_visited)
WHERE s.locations_visited != '[]' AND s.locations_visited IS NOT NULL
  AND json_each.value IN (SELECT id FROM locations); -- Validate FK exists

-- 11. Migrate quests_progressed → recap_quests_progressed
INSERT INTO recap_quests_progressed (id, session_recap_id, quest_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  s.id,
  json_each.value,
  s.created_at
FROM session_recaps s, json_each(s.quests_progressed)
WHERE s.quests_progressed != '[]' AND s.quests_progressed IS NOT NULL
  AND json_each.value IN (SELECT id FROM quests); -- Validate FK exists

-- 12. Migrate loot_acquired → recap_loot_acquired
INSERT INTO recap_loot_acquired (id, session_recap_id, item_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  s.id,
  json_each.value,
  s.created_at
FROM session_recaps s, json_each(s.loot_acquired)
WHERE s.loot_acquired != '[]' AND s.loot_acquired IS NOT NULL
  AND json_each.value IN (SELECT id FROM items); -- Validate FK exists

-- ============================================================================
-- QUEST RELATIONSHIPS
-- ============================================================================

-- 13. Migrate quest.related_npcs → quest_related_npcs
INSERT INTO quest_related_npcs (id, quest_id, npc_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  q.id,
  json_each.value,
  q.created_at
FROM quests q, json_each(q.related_npcs)
WHERE q.related_npcs != '[]' AND q.related_npcs IS NOT NULL
  AND json_each.value IN (SELECT id FROM npcs); -- Validate FK exists

-- 14. Migrate quest.related_locations → quest_related_locations
INSERT INTO quest_related_locations (id, quest_id, location_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  q.id,
  json_each.value,
  q.created_at
FROM quests q, json_each(q.related_locations)
WHERE q.related_locations != '[]' AND q.related_locations IS NOT NULL
  AND json_each.value IN (SELECT id FROM locations); -- Validate FK exists

-- ============================================================================
-- PLAYER CHARACTER RELATIONSHIPS
-- ============================================================================

-- 15. Migrate faction_affiliations → pc_faction_affiliations
INSERT INTO pc_faction_affiliations (id, pc_id, faction_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  p.id,
  json_each.value,
  p.created_at
FROM player_characters p, json_each(p.faction_affiliations)
WHERE p.faction_affiliations != '[]' AND p.faction_affiliations IS NOT NULL
  AND json_each.value IN (SELECT id FROM factions); -- Validate FK exists

-- 16. Migrate allied_npcs → pc_npc_relationships
INSERT INTO pc_npc_relationships (id, pc_id, npc_id, relationship_type, created_at)
SELECT
  lower(hex(randomblob(16))),
  p.id,
  json_each.value,
  'ally', -- Default type since old data was "allied_npcs"
  p.created_at
FROM player_characters p, json_each(p.allied_npcs)
WHERE p.allied_npcs != '[]' AND p.allied_npcs IS NOT NULL
  AND json_each.value IN (SELECT id FROM npcs); -- Validate FK exists

-- ============================================================================
-- LORE ENTRY RELATIONSHIPS
-- ============================================================================

-- 17. Migrate lore_entry.related_npcs → lore_entry_npcs
INSERT INTO lore_entry_npcs (id, lore_entry_id, npc_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  l.id,
  json_each.value,
  l.created_at
FROM lore_entries l, json_each(l.related_npcs)
WHERE l.related_npcs != '[]' AND l.related_npcs IS NOT NULL
  AND json_each.value IN (SELECT id FROM npcs); -- Validate FK exists

-- 18. Migrate lore_entry.related_locations → lore_entry_locations
INSERT INTO lore_entry_locations (id, lore_entry_id, location_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  l.id,
  json_each.value,
  l.created_at
FROM lore_entries l, json_each(l.related_locations)
WHERE l.related_locations != '[]' AND l.related_locations IS NOT NULL
  AND json_each.value IN (SELECT id FROM locations); -- Validate FK exists

-- 19. Migrate lore_entry.related_factions → lore_entry_factions
INSERT INTO lore_entry_factions (id, lore_entry_id, faction_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  l.id,
  json_each.value,
  l.created_at
FROM lore_entries l, json_each(l.related_factions)
WHERE l.related_factions != '[]' AND l.related_factions IS NOT NULL
  AND json_each.value IN (SELECT id FROM factions); -- Validate FK exists

-- ============================================================================
-- WORLD RULE RELATIONSHIPS
-- ============================================================================

-- 20. Migrate world_rules.related_rules → world_rule_relations
INSERT INTO world_rule_relations (id, rule_id, related_rule_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  w.id,
  json_each.value,
  w.created_at
FROM world_rules w, json_each(w.related_rules)
WHERE w.related_rules != '[]' AND w.related_rules IS NOT NULL
  AND json_each.value IN (SELECT id FROM world_rules); -- Validate FK exists

-- ============================================================================
-- PLANAR FORCE RELATIONSHIPS
-- ============================================================================

-- 21. Migrate planar_forces.allied_entities → planar_force_alliances
INSERT INTO planar_force_alliances (id, planar_force_id, allied_planar_force_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  p.id,
  json_each.value,
  p.created_at
FROM planar_forces p, json_each(p.allied_entities)
WHERE p.allied_entities != '[]' AND p.allied_entities IS NOT NULL
  AND json_each.value IN (SELECT id FROM planar_forces); -- Validate FK exists

-- 22. Migrate planar_forces.rival_entities → planar_force_rivalries
INSERT INTO planar_force_rivalries (id, planar_force_id, rival_planar_force_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  p.id,
  json_each.value,
  p.created_at
FROM planar_forces p, json_each(p.rival_entities)
WHERE p.rival_entities != '[]' AND p.rival_entities IS NOT NULL
  AND json_each.value IN (SELECT id FROM planar_forces); -- Validate FK exists

-- 23. Migrate planar_forces.religious_orders → planar_force_worshipers
-- NOTE: religious_orders currently points to custom_mechanics, changing to factions
-- Skip migration if data points to wrong table - will be handled manually
-- INSERT INTO planar_force_worshipers (id, planar_force_id, faction_id, created_at)
-- (Skipped - old data may reference custom_mechanics instead of factions)

-- ============================================================================
-- CREATURE RELATIONSHIPS
-- ============================================================================

-- 24. Migrate creatures.habitats → creature_habitats
INSERT INTO creature_habitats (id, creature_id, location_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  c.id,
  json_each.value,
  c.created_at
FROM creatures c, json_each(c.habitats)
WHERE c.habitats != '[]' AND c.habitats IS NOT NULL
  AND json_each.value IN (SELECT id FROM locations); -- Validate FK exists

-- ============================================================================
-- SESSION PREP RELATIONSHIPS (Check if fields exist first)
-- ============================================================================

-- 25. Migrate session_preps.npcs_to_prep → dm_session_prep_npcs
-- Only run if column exists (may not be in all schemas)
INSERT INTO dm_session_prep_npcs (id, session_prep_id, npc_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  s.id,
  json_each.value,
  s.created_at
FROM session_preps s, json_each(s.npcs_to_prep)
WHERE s.npcs_to_prep != '[]' AND s.npcs_to_prep IS NOT NULL
  AND json_each.value IN (SELECT id FROM npcs); -- Validate FK exists

-- 26. Migrate session_preps.locations_to_prep → dm_session_prep_locations
INSERT INTO dm_session_prep_locations (id, session_prep_id, location_id, created_at)
SELECT
  lower(hex(randomblob(16))),
  s.id,
  json_each.value,
  s.created_at
FROM session_preps s, json_each(s.locations_to_prep)
WHERE s.locations_to_prep != '[]' AND s.locations_to_prep IS NOT NULL
  AND json_each.value IN (SELECT id FROM locations); -- Validate FK exists

-- ============================================================================
-- VERIFICATION - Count migrated rows
-- ============================================================================

-- Log migration results (commented out for production, uncomment for debugging)
-- SELECT 'faction_alliances' as table_name, COUNT(*) as rows FROM faction_alliances
-- UNION ALL SELECT 'faction_rivalries', COUNT(*) FROM faction_rivalries
-- UNION ALL SELECT 'faction_members', COUNT(*) FROM faction_members
-- UNION ALL SELECT 'faction_territory', COUNT(*) FROM faction_territory
-- UNION ALL SELECT 'faction_presence', COUNT(*) FROM faction_presence
-- UNION ALL SELECT 'npc_locations', COUNT(*) FROM npc_locations
-- UNION ALL SELECT 'location_connections', COUNT(*) FROM location_connections
-- UNION ALL SELECT 'recap_npcs_encountered', COUNT(*) FROM recap_npcs_encountered
-- UNION ALL SELECT 'recap_locations_visited', COUNT(*) FROM recap_locations_visited
-- UNION ALL SELECT 'recap_quests_progressed', COUNT(*) FROM recap_quests_progressed
-- UNION ALL SELECT 'recap_loot_acquired', COUNT(*) FROM recap_loot_acquired
-- UNION ALL SELECT 'quest_related_npcs', COUNT(*) FROM quest_related_npcs
-- UNION ALL SELECT 'quest_related_locations', COUNT(*) FROM quest_related_locations
-- UNION ALL SELECT 'pc_faction_affiliations', COUNT(*) FROM pc_faction_affiliations
-- UNION ALL SELECT 'pc_npc_relationships', COUNT(*) FROM pc_npc_relationships
-- UNION ALL SELECT 'lore_entry_npcs', COUNT(*) FROM lore_entry_npcs
-- UNION ALL SELECT 'lore_entry_locations', COUNT(*) FROM lore_entry_locations
-- UNION ALL SELECT 'lore_entry_factions', COUNT(*) FROM lore_entry_factions
-- UNION ALL SELECT 'world_rule_relations', COUNT(*) FROM world_rule_relations
-- UNION ALL SELECT 'planar_force_alliances', COUNT(*) FROM planar_force_alliances
-- UNION ALL SELECT 'planar_force_rivalries', COUNT(*) FROM planar_force_rivalries
-- UNION ALL SELECT 'creature_habitats', COUNT(*) FROM creature_habitats;

-- ============================================================================
-- NOTES
-- ============================================================================
-- After this migration runs successfully:
-- 1. JSON array fields will still exist in original tables (for rollback safety)
-- 2. Services need to be updated to query junction tables instead
-- 3. Once services are updated and tested, JSON fields can be dropped in future migration
-- 4. npc_npc_relationships and npc_pc_encounters are new - no data to migrate
