-- Migration 028: Add composite indexes to junction tables
-- Date: 2025-11-05
-- Issue: Junction tables have single-column indexes, but queries filter on both columns
-- Fix: Add composite indexes for WHERE faction_id = ? AND allied_faction_id = ? patterns

-- Faction relationships (4 tables)
CREATE INDEX IF NOT EXISTS idx_faction_alliances_composite ON faction_alliances(faction_id, allied_faction_id);
CREATE INDEX IF NOT EXISTS idx_faction_rivalries_composite ON faction_rivalries(faction_id, rival_faction_id);
CREATE INDEX IF NOT EXISTS idx_faction_members_composite ON faction_members(faction_id, npc_id);
CREATE INDEX IF NOT EXISTS idx_faction_territory_composite ON faction_territory(faction_id, location_id);
CREATE INDEX IF NOT EXISTS idx_faction_presence_composite ON faction_presence(faction_id, location_id);

-- NPC relationships (3 tables)
CREATE INDEX IF NOT EXISTS idx_npc_locations_composite ON npc_locations(npc_id, location_id);
CREATE INDEX IF NOT EXISTS idx_npc_npc_relationships_composite ON npc_npc_relationships(npc_id, related_npc_id);
CREATE INDEX IF NOT EXISTS idx_npc_pc_encounters_composite ON npc_pc_encounters(npc_id, pc_id);

-- Location relationships (1 table)
CREATE INDEX IF NOT EXISTS idx_location_connections_composite ON location_connections(location_id, connected_location_id);

-- Session Recap relationships (4 tables)
CREATE INDEX IF NOT EXISTS idx_recap_npcs_encountered_composite ON recap_npcs_encountered(recap_id, npc_id);
CREATE INDEX IF NOT EXISTS idx_recap_locations_visited_composite ON recap_locations_visited(recap_id, location_id);
CREATE INDEX IF NOT EXISTS idx_recap_quests_progressed_composite ON recap_quests_progressed(recap_id, quest_id);
CREATE INDEX IF NOT EXISTS idx_recap_loot_acquired_composite ON recap_loot_acquired(recap_id, item_id);

-- Quest relationships (2 tables)
CREATE INDEX IF NOT EXISTS idx_quest_related_npcs_composite ON quest_related_npcs(quest_id, npc_id);
CREATE INDEX IF NOT EXISTS idx_quest_related_locations_composite ON quest_related_locations(quest_id, location_id);

-- Player Character relationships (2 tables)
CREATE INDEX IF NOT EXISTS idx_pc_faction_affiliations_composite ON pc_faction_affiliations(pc_id, faction_id);
CREATE INDEX IF NOT EXISTS idx_pc_npc_relationships_composite ON pc_npc_relationships(pc_id, npc_id);

-- Lore Entry relationships (3 tables)
CREATE INDEX IF NOT EXISTS idx_lore_entry_npcs_composite ON lore_entry_npcs(lore_entry_id, npc_id);
CREATE INDEX IF NOT EXISTS idx_lore_entry_locations_composite ON lore_entry_locations(lore_entry_id, location_id);
CREATE INDEX IF NOT EXISTS idx_lore_entry_factions_composite ON lore_entry_factions(lore_entry_id, faction_id);

-- World Rule relationships (1 table)
CREATE INDEX IF NOT EXISTS idx_world_rule_relations_composite ON world_rule_relations(world_rule_id, related_rule_id);

-- Planar Force relationships (3 tables)
CREATE INDEX IF NOT EXISTS idx_planar_force_alliances_composite ON planar_force_alliances(planar_force_id, allied_force_id);
CREATE INDEX IF NOT EXISTS idx_planar_force_rivalries_composite ON planar_force_rivalries(planar_force_id, rival_force_id);
CREATE INDEX IF NOT EXISTS idx_planar_force_worshipers_composite ON planar_force_worshipers(planar_force_id, npc_id);

-- Creature relationships (1 table)
CREATE INDEX IF NOT EXISTS idx_creature_habitats_composite ON creature_habitats(creature_id, location_id);

-- Session Prep relationships (3 tables - DM prefix)
CREATE INDEX IF NOT EXISTS idx_dm_session_prep_npcs_composite ON dm_session_prep_npcs(session_prep_id, npc_id);
CREATE INDEX IF NOT EXISTS idx_dm_session_prep_locations_composite ON dm_session_prep_locations(session_prep_id, location_id);
CREATE INDEX IF NOT EXISTS idx_dm_session_prep_quests_composite ON dm_session_prep_quests(session_prep_id, quest_id);

-- Total: 28 composite indexes added (one per junction table)
