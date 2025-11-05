-- Migration 027: Cleanup information level values
-- Date: 2025-11-02
-- Issue: GenericEntityForm had wrong dropdown values ('public', 'partial', 'dm_only')
--        BulkActionsToolbar/QuickAddRow used underscore values
-- This migration converts all wrong values to correct hyphenated IDs

-- Convert 'public' to 'common-knowledge' (public = everyone can see)
-- Convert 'partial' to 'player-knowledge' (partial = some players know)
-- Re-run underscore conversions in case any snuck in after migration 024

-- NPCs
UPDATE npcs SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'public';
UPDATE npcs SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'partial';
UPDATE npcs SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE npcs SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE npcs SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

-- Locations
UPDATE locations SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'public';
UPDATE locations SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'partial';
UPDATE locations SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE locations SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE locations SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

-- Factions
UPDATE factions SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'public';
UPDATE factions SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'partial';
UPDATE factions SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE factions SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE factions SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

-- Session Recaps
UPDATE session_recaps SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'public';
UPDATE session_recaps SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'partial';
UPDATE session_recaps SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE session_recaps SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE session_recaps SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

-- Quests
UPDATE quests SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'public';
UPDATE quests SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'partial';
UPDATE quests SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE quests SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE quests SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

-- Player Characters
UPDATE player_characters SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'public';
UPDATE player_characters SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'partial';
UPDATE player_characters SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE player_characters SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE player_characters SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

-- Lore Entries
UPDATE lore_entries SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'public';
UPDATE lore_entries SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'partial';
UPDATE lore_entries SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE lore_entries SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE lore_entries SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

-- World Rules
UPDATE world_rules SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'public';
UPDATE world_rules SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'partial';
UPDATE world_rules SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE world_rules SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE world_rules SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

-- Planar Forces
UPDATE planar_forces SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'public';
UPDATE planar_forces SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'partial';
UPDATE planar_forces SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE planar_forces SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE planar_forces SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

-- Session Preps (always dm-secret by design, but clean just in case)
UPDATE session_preps SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'public';
UPDATE session_preps SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'partial';
UPDATE session_preps SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE session_preps SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE session_preps SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

-- Custom Mechanics
UPDATE custom_mechanics SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'public';
UPDATE custom_mechanics SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'partial';
UPDATE custom_mechanics SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE custom_mechanics SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE custom_mechanics SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

-- Items
UPDATE items SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'public';
UPDATE items SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'partial';
UPDATE items SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE items SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE items SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

-- Creatures
UPDATE creatures SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'public';
UPDATE creatures SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'partial';
UPDATE creatures SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE creatures SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE creatures SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';
