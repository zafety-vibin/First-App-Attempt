-- Migration 024: Fix information level ID mismatch
-- Converts legacy underscore values (dm_only, common_knowledge, player_knowledge)
-- to correct information_levels table IDs (dm-secret, common-knowledge, player-knowledge)

-- Update all 13 category tables
UPDATE npcs SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE npcs SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE npcs SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

UPDATE locations SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE locations SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE locations SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

UPDATE factions SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE factions SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE factions SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

UPDATE session_recaps SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE session_recaps SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE session_recaps SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

UPDATE quests SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE quests SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE quests SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

UPDATE player_characters SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE player_characters SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE player_characters SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

UPDATE lore_entries SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE lore_entries SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE lore_entries SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

UPDATE world_rules SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE world_rules SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE world_rules SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

UPDATE planar_forces SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE planar_forces SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE planar_forces SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

UPDATE session_preps SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE session_preps SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE session_preps SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

UPDATE custom_mechanics SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE custom_mechanics SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE custom_mechanics SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

UPDATE items SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE items SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE items SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';

UPDATE creatures SET player_knowledge = 'dm-secret' WHERE player_knowledge = 'dm_only';
UPDATE creatures SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE creatures SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';
