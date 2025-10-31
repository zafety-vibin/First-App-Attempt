-- Migration 025: Junction Tables for Relationships
-- Architecture Refactoring Priority #3
-- Converts JSON array relationships to proper junction tables with referential integrity

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================================================
-- FACTIONS RELATIONSHIPS (5 tables)
-- ============================================================================

-- 1. Faction Alliances (bidirectional)
CREATE TABLE IF NOT EXISTS faction_alliances (
  id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL,
  allied_faction_id TEXT NOT NULL,
  alliance_type TEXT CHECK (alliance_type IN ('military', 'trade', 'political', 'marriage')),
  alliance_strength INTEGER CHECK (alliance_strength BETWEEN 1 AND 10),
  formed_date INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  FOREIGN KEY (allied_faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  UNIQUE(faction_id, allied_faction_id),
  CHECK(faction_id != allied_faction_id) -- Prevent self-alliance
);

-- 2. Faction Rivalries (bidirectional)
CREATE TABLE IF NOT EXISTS faction_rivalries (
  id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL,
  rival_faction_id TEXT NOT NULL,
  rivalry_type TEXT CHECK (rivalry_type IN ('territorial', 'ideological', 'historical', 'economic')),
  rivalry_intensity INTEGER CHECK (rivalry_intensity BETWEEN 1 AND 10),
  conflict_history TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  FOREIGN KEY (rival_faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  UNIQUE(faction_id, rival_faction_id),
  CHECK(faction_id != rival_faction_id) -- Prevent self-rivalry
);

-- 3. Faction Members (bidirectional)
CREATE TABLE IF NOT EXISTS faction_members (
  id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  role TEXT CHECK (role IN ('leader', 'lieutenant', 'member', 'informant', 'recruit')),
  rank TEXT,
  joined_date INTEGER,
  loyalty_level INTEGER CHECK (loyalty_level BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  UNIQUE(faction_id, npc_id)
);

-- 4. Faction Territory (bidirectional - faction controls location)
CREATE TABLE IF NOT EXISTS faction_territory (
  id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  control_type TEXT CHECK (control_type IN ('owns', 'governs', 'controls', 'claims')),
  control_strength INTEGER CHECK (control_strength BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(faction_id, location_id)
);

-- 5. Faction Presence (bidirectional - factions operating in location)
CREATE TABLE IF NOT EXISTS faction_presence (
  id TEXT PRIMARY KEY,
  faction_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  presence_type TEXT CHECK (presence_type IN ('operates', 'contested', 'influences', 'hidden')),
  presence_strength INTEGER CHECK (presence_strength BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(faction_id, location_id)
);

-- Add new fields to factions table
ALTER TABLE factions ADD COLUMN total_member_count INTEGER DEFAULT 0;
ALTER TABLE factions ADD COLUMN religious_association TEXT;

-- ============================================================================
-- NPC RELATIONSHIPS (3 tables)
-- ============================================================================

-- 6. NPC Locations (bidirectional - merges notable_npcs + locations)
CREATE TABLE IF NOT EXISTS npc_locations (
  id TEXT PRIMARY KEY,
  npc_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  presence_type TEXT CHECK (presence_type IN ('lives', 'works', 'visits', 'associated')),
  is_notable BOOLEAN DEFAULT 0, -- Mark important NPCs for location
  frequency TEXT CHECK (frequency IN ('permanent', 'frequent', 'occasional', 'rare')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(npc_id, location_id)
);

-- 7. NPC to NPC Relationships (NEW - bidirectional with asymmetry support)
CREATE TABLE IF NOT EXISTS npc_npc_relationships (
  id TEXT PRIMARY KEY,
  npc_id TEXT NOT NULL,
  related_npc_id TEXT NOT NULL,
  relationship_type TEXT CHECK (relationship_type IN ('knows', 'family', 'friend', 'rival', 'enemy', 'mentor', 'student', 'spouse', 'sibling', 'parent', 'child')),
  relationship_strength INTEGER CHECK (relationship_strength BETWEEN 1 AND 10),
  is_mutual BOOLEAN DEFAULT 1, -- 0 = A knows B but B doesn't know A
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  FOREIGN KEY (related_npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  UNIQUE(npc_id, related_npc_id),
  CHECK(npc_id != related_npc_id) -- Prevent self-relationship
);

-- 8. NPC to PC Encounters (NEW - bidirectional)
CREATE TABLE IF NOT EXISTS npc_pc_encounters (
  id TEXT PRIMARY KEY,
  npc_id TEXT NOT NULL,
  pc_id TEXT NOT NULL,
  has_met BOOLEAN DEFAULT 1,
  first_met_session INTEGER,
  relationship_status TEXT CHECK (relationship_status IN ('ally', 'neutral', 'suspicious', 'enemy', 'friend')),
  trust_level INTEGER CHECK (trust_level BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  FOREIGN KEY (pc_id) REFERENCES player_characters(id) ON DELETE CASCADE,
  UNIQUE(npc_id, pc_id)
);

-- ============================================================================
-- LOCATION RELATIONSHIPS (1 table - parent_location_id FK already exists)
-- ============================================================================

-- 9. Location Connections (bidirectional - lateral travel routes)
CREATE TABLE IF NOT EXISTS location_connections (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  connected_location_id TEXT NOT NULL,
  connection_type TEXT CHECK (connection_type IN ('nearby', 'road', 'tunnel', 'portal', 'passage', 'river')),
  travel_time TEXT, -- Free text: '1 hour', '3 days', etc.
  difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'difficult', 'treacherous')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (connected_location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(location_id, connected_location_id),
  CHECK(location_id != connected_location_id) -- Prevent self-connection
);

-- ============================================================================
-- SESSION RECAP RELATIONSHIPS (4 tables - historical records)
-- ============================================================================

-- 10. Recap NPCs Encountered (one-way - recap→NPC only)
CREATE TABLE IF NOT EXISTS recap_npcs_encountered (
  id TEXT PRIMARY KEY,
  session_recap_id TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  interaction_type TEXT CHECK (interaction_type IN ('combat', 'dialogue', 'observed', 'mentioned')),
  importance_to_session TEXT CHECK (importance_to_session IN ('major', 'moderate', 'minor')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (session_recap_id) REFERENCES session_recaps(id) ON DELETE CASCADE,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  UNIQUE(session_recap_id, npc_id)
);

-- 11. Recap Locations Visited (one-way - recap→location only)
CREATE TABLE IF NOT EXISTS recap_locations_visited (
  id TEXT PRIMARY KEY,
  session_recap_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  duration_in_location TEXT CHECK (duration_in_location IN ('brief', 'moderate', 'extended')),
  events_at_location TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (session_recap_id) REFERENCES session_recaps(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(session_recap_id, location_id)
);

-- 12. Recap Quests Progressed (bidirectional - quest shows session history)
CREATE TABLE IF NOT EXISTS recap_quests_progressed (
  id TEXT PRIMARY KEY,
  session_recap_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  progress_type TEXT CHECK (progress_type IN ('started', 'advanced', 'completed', 'failed', 'abandoned')),
  progress_notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (session_recap_id) REFERENCES session_recaps(id) ON DELETE CASCADE,
  FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
  UNIQUE(session_recap_id, quest_id)
);

-- 13. Recap Loot Acquired (one-way - recap→item only)
CREATE TABLE IF NOT EXISTS recap_loot_acquired (
  id TEXT PRIMARY KEY,
  session_recap_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  acquired_by_pc_id TEXT, -- Which PC got it
  acquisition_method TEXT CHECK (acquisition_method IN ('looted', 'purchased', 'rewarded', 'found', 'crafted')),
  circumstances TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (session_recap_id) REFERENCES session_recaps(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (acquired_by_pc_id) REFERENCES player_characters(id) ON DELETE SET NULL,
  UNIQUE(session_recap_id, item_id)
);

-- ============================================================================
-- QUEST RELATIONSHIPS (2 tables)
-- ============================================================================

-- 14. Quest Related NPCs (bidirectional)
CREATE TABLE IF NOT EXISTS quest_related_npcs (
  id TEXT PRIMARY KEY,
  quest_id TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  role_in_quest TEXT CHECK (role_in_quest IN ('quest_giver', 'objective', 'ally', 'enemy', 'mentioned', 'witness')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  UNIQUE(quest_id, npc_id)
);

-- 15. Quest Related Locations (bidirectional - TBD)
CREATE TABLE IF NOT EXISTS quest_related_locations (
  id TEXT PRIMARY KEY,
  quest_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  location_role TEXT CHECK (location_role IN ('starts_here', 'objective_here', 'takes_place_here')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(quest_id, location_id)
);

-- ============================================================================
-- PLAYER CHARACTER RELATIONSHIPS (2 tables)
-- ============================================================================

-- 16. PC Faction Affiliations (bidirectional)
CREATE TABLE IF NOT EXISTS pc_faction_affiliations (
  id TEXT PRIMARY KEY,
  pc_id TEXT NOT NULL,
  faction_id TEXT NOT NULL,
  affiliation_type TEXT CHECK (affiliation_type IN ('member', 'ally', 'enemy', 'neutral')),
  reputation INTEGER CHECK (reputation BETWEEN -10 AND 10), -- Negative for enemies
  joined_date INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (pc_id) REFERENCES player_characters(id) ON DELETE CASCADE,
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  UNIQUE(pc_id, faction_id)
);

-- 17. PC NPC Relationships (bidirectional - includes allies/rivals/enemies)
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

-- ============================================================================
-- LORE ENTRY RELATIONSHIPS (3 tables - one-way only)
-- ============================================================================

-- 18. Lore Entry NPCs (one-way - lore→NPC, not reverse)
CREATE TABLE IF NOT EXISTS lore_entry_npcs (
  id TEXT PRIMARY KEY,
  lore_entry_id TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  relevance_type TEXT CHECK (relevance_type IN ('subject', 'mentioned', 'author', 'witness', 'participant')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (lore_entry_id) REFERENCES lore_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  UNIQUE(lore_entry_id, npc_id)
);

-- 19. Lore Entry Locations (one-way - lore→location, not reverse)
CREATE TABLE IF NOT EXISTS lore_entry_locations (
  id TEXT PRIMARY KEY,
  lore_entry_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  relevance_type TEXT CHECK (relevance_type IN ('subject', 'setting', 'mentioned', 'origin')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (lore_entry_id) REFERENCES lore_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(lore_entry_id, location_id)
);

-- 20. Lore Entry Factions (one-way - lore→faction, not reverse)
CREATE TABLE IF NOT EXISTS lore_entry_factions (
  id TEXT PRIMARY KEY,
  lore_entry_id TEXT NOT NULL,
  faction_id TEXT NOT NULL,
  relevance_type TEXT CHECK (relevance_type IN ('subject', 'mentioned', 'founded_by', 'destroyed_by')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (lore_entry_id) REFERENCES lore_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  UNIQUE(lore_entry_id, faction_id)
);

-- ============================================================================
-- WORLD RULES RELATIONSHIPS (1 table)
-- ============================================================================

-- 21. World Rule Relations (bidirectional - self-referential)
CREATE TABLE IF NOT EXISTS world_rule_relations (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  related_rule_id TEXT NOT NULL,
  relation_type TEXT CHECK (relation_type IN ('supersedes', 'contradicts', 'clarifies', 'builds_on', 'exceptions')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (rule_id) REFERENCES world_rules(id) ON DELETE CASCADE,
  FOREIGN KEY (related_rule_id) REFERENCES world_rules(id) ON DELETE CASCADE,
  UNIQUE(rule_id, related_rule_id),
  CHECK(rule_id != related_rule_id)
);

-- ============================================================================
-- PLANAR FORCES RELATIONSHIPS (3 tables)
-- ============================================================================

-- 22. Planar Force Alliances (bidirectional - self-referential)
CREATE TABLE IF NOT EXISTS planar_force_alliances (
  id TEXT PRIMARY KEY,
  planar_force_id TEXT NOT NULL,
  allied_planar_force_id TEXT NOT NULL,
  alliance_type TEXT CHECK (alliance_type IN ('cosmic_pact', 'pantheon_member', 'temporary_alliance', 'divine_marriage')),
  cosmic_pact_details TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (planar_force_id) REFERENCES planar_forces(id) ON DELETE CASCADE,
  FOREIGN KEY (allied_planar_force_id) REFERENCES planar_forces(id) ON DELETE CASCADE,
  UNIQUE(planar_force_id, allied_planar_force_id),
  CHECK(planar_force_id != allied_planar_force_id)
);

-- 23. Planar Force Rivalries (bidirectional - self-referential)
CREATE TABLE IF NOT EXISTS planar_force_rivalries (
  id TEXT PRIMARY KEY,
  planar_force_id TEXT NOT NULL,
  rival_planar_force_id TEXT NOT NULL,
  conflict_type TEXT CHECK (conflict_type IN ('cosmic_war', 'ideological', 'territorial', 'ancient_grudge', 'divine_feud')),
  war_duration_years INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (planar_force_id) REFERENCES planar_forces(id) ON DELETE CASCADE,
  FOREIGN KEY (rival_planar_force_id) REFERENCES planar_forces(id) ON DELETE CASCADE,
  UNIQUE(planar_force_id, rival_planar_force_id),
  CHECK(planar_force_id != rival_planar_force_id)
);

-- 24. Planar Force Worshipers (bidirectional - connects to Factions now!)
CREATE TABLE IF NOT EXISTS planar_force_worshipers (
  id TEXT PRIMARY KEY,
  planar_force_id TEXT NOT NULL,
  faction_id TEXT NOT NULL,
  devotion_level TEXT CHECK (devotion_level IN ('primary_deity', 'pantheon_member', 'minor_worship', 'secret_cult')),
  religious_practices TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (planar_force_id) REFERENCES planar_forces(id) ON DELETE CASCADE,
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE CASCADE,
  UNIQUE(planar_force_id, faction_id)
);

-- ============================================================================
-- CREATURE RELATIONSHIPS (1 table)
-- ============================================================================

-- 25. Creature Habitats (bidirectional)
CREATE TABLE IF NOT EXISTS creature_habitats (
  id TEXT PRIMARY KEY,
  creature_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  habitat_frequency TEXT CHECK (habitat_frequency IN ('common', 'uncommon', 'rare', 'legendary')),
  time_of_day TEXT CHECK (time_of_day IN ('any', 'day', 'night', 'dawn', 'dusk')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (creature_id) REFERENCES creatures(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  UNIQUE(creature_id, location_id)
);

-- ============================================================================
-- SESSION PREP RELATIONSHIPS (3 tables - DM-only via dm_ prefix)
-- ============================================================================

-- 26. DM Session Prep NPCs (one-way - prep→NPC, NPC doesn't show reverse)
CREATE TABLE IF NOT EXISTS dm_session_prep_npcs (
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

-- 27. DM Session Prep Locations (one-way - prep→location, location doesn't show reverse)
CREATE TABLE IF NOT EXISTS dm_session_prep_locations (
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

-- 28. DM Session Prep Quests (one-way - prep→quest, quest doesn't show reverse)
CREATE TABLE IF NOT EXISTS dm_session_prep_quests (
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

-- ============================================================================
-- DATA MIGRATION - Move existing JSON arrays to junction tables
-- ============================================================================

-- NOTE: Data migration will be implemented in Phase 2
-- For now, we're creating empty junction tables
-- Existing JSON arrays will remain until migration script is ready
-- This allows incremental rollout and testing

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Faction relationships
CREATE INDEX IF NOT EXISTS idx_faction_alliances_faction ON faction_alliances(faction_id);
CREATE INDEX IF NOT EXISTS idx_faction_alliances_allied ON faction_alliances(allied_faction_id);
CREATE INDEX IF NOT EXISTS idx_faction_rivalries_faction ON faction_rivalries(faction_id);
CREATE INDEX IF NOT EXISTS idx_faction_rivalries_rival ON faction_rivalries(rival_faction_id);
CREATE INDEX IF NOT EXISTS idx_faction_members_faction ON faction_members(faction_id);
CREATE INDEX IF NOT EXISTS idx_faction_members_npc ON faction_members(npc_id);
CREATE INDEX IF NOT EXISTS idx_faction_territory_faction ON faction_territory(faction_id);
CREATE INDEX IF NOT EXISTS idx_faction_territory_location ON faction_territory(location_id);
CREATE INDEX IF NOT EXISTS idx_faction_presence_faction ON faction_presence(faction_id);
CREATE INDEX IF NOT EXISTS idx_faction_presence_location ON faction_presence(location_id);

-- NPC relationships
CREATE INDEX IF NOT EXISTS idx_npc_locations_npc ON npc_locations(npc_id);
CREATE INDEX IF NOT EXISTS idx_npc_locations_location ON npc_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_npc_npc_relationships_npc ON npc_npc_relationships(npc_id);
CREATE INDEX IF NOT EXISTS idx_npc_npc_relationships_related ON npc_npc_relationships(related_npc_id);
CREATE INDEX IF NOT EXISTS idx_npc_pc_encounters_npc ON npc_pc_encounters(npc_id);
CREATE INDEX IF NOT EXISTS idx_npc_pc_encounters_pc ON npc_pc_encounters(pc_id);

-- Location relationships
CREATE INDEX IF NOT EXISTS idx_location_connections_location ON location_connections(location_id);
CREATE INDEX IF NOT EXISTS idx_location_connections_connected ON location_connections(connected_location_id);

-- Session recap relationships
CREATE INDEX IF NOT EXISTS idx_recap_npcs_recap ON recap_npcs_encountered(session_recap_id);
CREATE INDEX IF NOT EXISTS idx_recap_npcs_npc ON recap_npcs_encountered(npc_id);
CREATE INDEX IF NOT EXISTS idx_recap_locations_recap ON recap_locations_visited(session_recap_id);
CREATE INDEX IF NOT EXISTS idx_recap_locations_location ON recap_locations_visited(location_id);
CREATE INDEX IF NOT EXISTS idx_recap_quests_recap ON recap_quests_progressed(session_recap_id);
CREATE INDEX IF NOT EXISTS idx_recap_quests_quest ON recap_quests_progressed(quest_id);
CREATE INDEX IF NOT EXISTS idx_recap_loot_recap ON recap_loot_acquired(session_recap_id);
CREATE INDEX IF NOT EXISTS idx_recap_loot_item ON recap_loot_acquired(item_id);

-- Quest relationships
CREATE INDEX IF NOT EXISTS idx_quest_npcs_quest ON quest_related_npcs(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_npcs_npc ON quest_related_npcs(npc_id);
CREATE INDEX IF NOT EXISTS idx_quest_locations_quest ON quest_related_locations(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_locations_location ON quest_related_locations(location_id);

-- Player character relationships
CREATE INDEX IF NOT EXISTS idx_pc_factions_pc ON pc_faction_affiliations(pc_id);
CREATE INDEX IF NOT EXISTS idx_pc_factions_faction ON pc_faction_affiliations(faction_id);
CREATE INDEX IF NOT EXISTS idx_pc_npcs_pc ON pc_npc_relationships(pc_id);
CREATE INDEX IF NOT EXISTS idx_pc_npcs_npc ON pc_npc_relationships(npc_id);

-- Lore entry relationships
CREATE INDEX IF NOT EXISTS idx_lore_npcs_lore ON lore_entry_npcs(lore_entry_id);
CREATE INDEX IF NOT EXISTS idx_lore_npcs_npc ON lore_entry_npcs(npc_id);
CREATE INDEX IF NOT EXISTS idx_lore_locations_lore ON lore_entry_locations(lore_entry_id);
CREATE INDEX IF NOT EXISTS idx_lore_locations_location ON lore_entry_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_lore_factions_lore ON lore_entry_factions(lore_entry_id);
CREATE INDEX IF NOT EXISTS idx_lore_factions_faction ON lore_entry_factions(faction_id);

-- World rule relationships
CREATE INDEX IF NOT EXISTS idx_world_rule_relations_rule ON world_rule_relations(rule_id);
CREATE INDEX IF NOT EXISTS idx_world_rule_relations_related ON world_rule_relations(related_rule_id);

-- Planar force relationships
CREATE INDEX IF NOT EXISTS idx_planar_alliances_planar ON planar_force_alliances(planar_force_id);
CREATE INDEX IF NOT EXISTS idx_planar_alliances_allied ON planar_force_alliances(allied_planar_force_id);
CREATE INDEX IF NOT EXISTS idx_planar_rivalries_planar ON planar_force_rivalries(planar_force_id);
CREATE INDEX IF NOT EXISTS idx_planar_rivalries_rival ON planar_force_rivalries(rival_planar_force_id);
CREATE INDEX IF NOT EXISTS idx_planar_worshipers_planar ON planar_force_worshipers(planar_force_id);
CREATE INDEX IF NOT EXISTS idx_planar_worshipers_faction ON planar_force_worshipers(faction_id);

-- Creature relationships
CREATE INDEX IF NOT EXISTS idx_creature_habitats_creature ON creature_habitats(creature_id);
CREATE INDEX IF NOT EXISTS idx_creature_habitats_location ON creature_habitats(location_id);

-- Session prep relationships (dm_ prefix tables)
CREATE INDEX IF NOT EXISTS idx_dm_prep_npcs_prep ON dm_session_prep_npcs(session_prep_id);
CREATE INDEX IF NOT EXISTS idx_dm_prep_npcs_npc ON dm_session_prep_npcs(npc_id);
CREATE INDEX IF NOT EXISTS idx_dm_prep_locations_prep ON dm_session_prep_locations(session_prep_id);
CREATE INDEX IF NOT EXISTS idx_dm_prep_locations_location ON dm_session_prep_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_dm_prep_quests_prep ON dm_session_prep_quests(session_prep_id);
CREATE INDEX IF NOT EXISTS idx_dm_prep_quests_quest ON dm_session_prep_quests(quest_id);
