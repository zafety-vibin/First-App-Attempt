-- Migration 014: Structured Category Database Foundation
-- Feature: 014-create-the-database
-- Creates 13 category tables + custom_field_definitions table

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1. FACTIONS TABLE (created first because NPCs reference it)
-- ============================================================================
CREATE TABLE IF NOT EXISTS factions (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active' CHECK (core_status IN ('active', 'archived', 'draft', 'hidden')),
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  faction_type TEXT,
  power_level TEXT,
  resources TEXT,
  beliefs TEXT,
  goals TEXT,
  methods TEXT,

  -- Explicit connections (leader_id added later after npcs table exists)
  leader_id TEXT,

  -- Many-to-many connections (JSON arrays)
  key_members TEXT DEFAULT '[]',
  allied_factions TEXT DEFAULT '[]',
  rival_factions TEXT DEFAULT '[]',
  territory TEXT DEFAULT '[]',

  -- DM-only fields
  dm_true_agenda TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. NPCS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS npcs (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active' CHECK (core_status IN ('active', 'archived', 'draft', 'hidden')),
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  race TEXT,
  class TEXT,  -- JSON array
  level INTEGER,
  alignment TEXT,
  appearance TEXT,
  personality_traits TEXT,
  motivation TEXT,
  relationship_to_party TEXT,
  met_party INTEGER DEFAULT 0,  -- Boolean
  art TEXT,

  -- Explicit connections (foreign keys)
  faction_id TEXT,
  superior_npc_id TEXT,

  -- Many-to-many connections (JSON arrays)
  locations TEXT DEFAULT '[]',

  -- DM-only fields
  dm_secrets TEXT,
  dm_plot_relevance TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE SET NULL,
  FOREIGN KEY (superior_npc_id) REFERENCES npcs(id) ON DELETE SET NULL
);

-- Now add leader_id foreign key constraint to factions table
-- SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we check if column needs FK
-- The FK is already defined in factions CREATE TABLE above, we just enable it here

-- ============================================================================
-- 3. LOCATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS locations (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active' CHECK (core_status IN ('active', 'archived', 'draft', 'hidden')),
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  location_type TEXT,
  population INTEGER,
  cultural_characteristics TEXT,
  map TEXT,

  -- Explicit connections (self-referential foreign key)
  parent_location_id TEXT,

  -- Many-to-many connections (JSON arrays)
  notable_npcs TEXT DEFAULT '[]',
  factions_present TEXT DEFAULT '[]',
  connected_locations TEXT DEFAULT '[]',

  -- DM-only fields
  dm_secrets TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- ============================================================================
-- 4. SESSION RECAPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_recaps (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active' CHECK (core_status IN ('active', 'archived', 'draft', 'hidden')),
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  session_date INTEGER,
  in_game_date_start TEXT,
  in_game_date_end TEXT,
  time_passed TEXT,
  summary TEXT,
  key_events TEXT,  -- JSON array
  player_decisions TEXT,  -- JSON array

  -- Canonical markers
  is_canon INTEGER DEFAULT 1,
  canonical_status TEXT DEFAULT 'canon',

  -- Many-to-many connections (JSON arrays)
  npcs_encountered TEXT DEFAULT '[]',
  locations_visited TEXT DEFAULT '[]',
  quests_progressed TEXT DEFAULT '[]',
  loot_acquired TEXT DEFAULT '[]',

  -- DM-only fields
  dm_consequences TEXT,
  dm_behind_scenes TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- ============================================================================
-- 5. QUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS quests (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active' CHECK (core_status IN ('active', 'archived', 'draft', 'hidden')),
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
  objectives TEXT DEFAULT '[]',  -- JSON array
  rewards TEXT,

  -- Explicit connections (foreign keys)
  quest_giver_id TEXT,
  started_session_id TEXT,
  completed_session_id TEXT,

  -- Many-to-many connections (JSON arrays)
  related_npcs TEXT DEFAULT '[]',
  related_locations TEXT DEFAULT '[]',

  -- DM-only fields
  dm_true_objective TEXT,
  dm_consequences TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (quest_giver_id) REFERENCES npcs(id) ON DELETE SET NULL,
  FOREIGN KEY (started_session_id) REFERENCES session_recaps(id) ON DELETE SET NULL,
  FOREIGN KEY (completed_session_id) REFERENCES session_recaps(id) ON DELETE SET NULL
);

-- ============================================================================
-- 6. PLAYER CHARACTERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_characters (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active' CHECK (core_status IN ('active', 'archived', 'draft', 'hidden')),
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  player_name TEXT,
  class TEXT,  -- JSON array
  level INTEGER,
  race TEXT,
  background TEXT,
  personality TEXT,
  goals TEXT,
  backstory TEXT,
  art TEXT,

  -- Many-to-many connections (JSON arrays)
  faction_affiliations TEXT DEFAULT '[]',
  allied_npcs TEXT DEFAULT '[]',

  -- DM-only fields
  dm_secrets TEXT,
  dm_plot_threads TEXT,
  dm_true_motivation TEXT,
  dm_consequences TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- ============================================================================
-- 7. LORE ENTRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS lore_entries (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active' CHECK (core_status IN ('active', 'archived', 'draft', 'hidden')),
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  category TEXT,
  era_period TEXT,
  in_game_date TEXT,
  historical_accuracy TEXT,

  -- Many-to-many connections (JSON arrays)
  related_npcs TEXT DEFAULT '[]',
  related_locations TEXT DEFAULT '[]',
  related_factions TEXT DEFAULT '[]',

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- ============================================================================
-- 8. WORLD RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS world_rules (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active' CHECK (core_status IN ('active', 'archived', 'draft', 'hidden')),
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  rule_type TEXT,
  exceptions TEXT,

  -- Many-to-many connections (JSON arrays, self-relation)
  related_rules TEXT DEFAULT '[]',

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- ============================================================================
-- 9. PLANAR FORCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS planar_forces (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active' CHECK (core_status IN ('active', 'archived', 'draft', 'hidden')),
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  entity_type TEXT,
  domains TEXT,  -- JSON array
  alignment TEXT,
  worshiper_base TEXT,
  plane_of_origin TEXT,
  base_of_power TEXT,

  -- Explicit connections (foreign key)
  high_priest_id TEXT,

  -- Many-to-many connections (JSON arrays)
  allied_entities TEXT DEFAULT '[]',
  rival_entities TEXT DEFAULT '[]',
  religious_orders TEXT DEFAULT '[]',

  -- DM-only fields
  dm_true_nature TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (high_priest_id) REFERENCES npcs(id) ON DELETE SET NULL
);

-- ============================================================================
-- 10. SESSION PREP TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_prep (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active' CHECK (core_status IN ('active', 'archived', 'draft', 'hidden')),
  player_knowledge TEXT DEFAULT 'dm_only',  -- Always dm_only
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  planned_date INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'completed', 'cancelled')),
  planned_events TEXT,
  possible_encounters TEXT,
  plot_hooks TEXT,
  dm_notes TEXT,

  -- Canonical markers
  is_canon INTEGER DEFAULT 0,
  canonical_status TEXT DEFAULT 'hypothetical',

  -- One-way JSON connections (NOT foreign keys)
  plot_threads TEXT DEFAULT '[]',
  npcs_to_prep TEXT DEFAULT '[]',
  locations_to_prep TEXT DEFAULT '[]',

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- ============================================================================
-- 11. CUSTOM MECHANICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_mechanics (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active' CHECK (core_status IN ('active', 'archived', 'draft', 'hidden')),
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  mechanic_type TEXT,
  rules_text TEXT,
  prerequisites TEXT,
  source TEXT,

  -- Many-to-many connections (JSON arrays, self-relation)
  related_rules TEXT DEFAULT '[]',

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- ============================================================================
-- 12. ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS items (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active' CHECK (core_status IN ('active', 'archived', 'draft', 'hidden')),
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  item_type TEXT,
  rarity TEXT,
  properties TEXT,
  value TEXT,

  -- Explicit connections (ownership tracking)
  owner_npc_id TEXT,
  owner_pc_id TEXT,
  location_id TEXT,

  -- DM-only fields
  dm_secret_properties TEXT,
  dm_true_nature TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_npc_id) REFERENCES npcs(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_pc_id) REFERENCES player_characters(id) ON DELETE SET NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- ============================================================================
-- 13. CREATURES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS creatures (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active' CHECK (core_status IN ('active', 'archived', 'draft', 'hidden')),
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  creature_type TEXT,
  challenge_rating TEXT,
  abilities TEXT,

  -- Many-to-many connections (JSON arrays)
  habitats TEXT DEFAULT '[]',

  -- DM-only fields
  dm_behavior_notes TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- ============================================================================
-- 14. CUSTOM FIELD DEFINITIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  category TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'multi_select', 'date')),
  options TEXT,  -- JSON array for select/multi_select
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Unique constraint
  UNIQUE (campaign_id, category, field_name)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- NPCs indexes
CREATE INDEX IF NOT EXISTS idx_npcs_campaign_id ON npcs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_npcs_core_status ON npcs(core_status);
CREATE INDEX IF NOT EXISTS idx_npcs_player_knowledge ON npcs(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_npcs_faction_id ON npcs(faction_id);
CREATE INDEX IF NOT EXISTS idx_npcs_superior_npc_id ON npcs(superior_npc_id);

-- Locations indexes
CREATE INDEX IF NOT EXISTS idx_locations_campaign_id ON locations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_locations_core_status ON locations(core_status);
CREATE INDEX IF NOT EXISTS idx_locations_player_knowledge ON locations(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_locations_parent_location_id ON locations(parent_location_id);

-- Factions indexes
CREATE INDEX IF NOT EXISTS idx_factions_campaign_id ON factions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_factions_core_status ON factions(core_status);
CREATE INDEX IF NOT EXISTS idx_factions_player_knowledge ON factions(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_factions_leader_id ON factions(leader_id);

-- Session Recaps indexes
CREATE INDEX IF NOT EXISTS idx_session_recaps_campaign_id ON session_recaps(campaign_id);
CREATE INDEX IF NOT EXISTS idx_session_recaps_core_status ON session_recaps(core_status);
CREATE INDEX IF NOT EXISTS idx_session_recaps_player_knowledge ON session_recaps(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_session_recaps_session_date ON session_recaps(session_date);

-- Quests indexes
CREATE INDEX IF NOT EXISTS idx_quests_campaign_id ON quests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_quests_core_status ON quests(core_status);
CREATE INDEX IF NOT EXISTS idx_quests_player_knowledge ON quests(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_quests_quest_giver_id ON quests(quest_giver_id);
CREATE INDEX IF NOT EXISTS idx_quests_started_session_id ON quests(started_session_id);
CREATE INDEX IF NOT EXISTS idx_quests_completed_session_id ON quests(completed_session_id);

-- Player Characters indexes
CREATE INDEX IF NOT EXISTS idx_player_characters_campaign_id ON player_characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_player_characters_core_status ON player_characters(core_status);
CREATE INDEX IF NOT EXISTS idx_player_characters_player_knowledge ON player_characters(player_knowledge);

-- Lore Entries indexes
CREATE INDEX IF NOT EXISTS idx_lore_entries_campaign_id ON lore_entries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_lore_entries_core_status ON lore_entries(core_status);
CREATE INDEX IF NOT EXISTS idx_lore_entries_player_knowledge ON lore_entries(player_knowledge);

-- World Rules indexes
CREATE INDEX IF NOT EXISTS idx_world_rules_campaign_id ON world_rules(campaign_id);
CREATE INDEX IF NOT EXISTS idx_world_rules_core_status ON world_rules(core_status);
CREATE INDEX IF NOT EXISTS idx_world_rules_player_knowledge ON world_rules(player_knowledge);

-- Planar Forces indexes
CREATE INDEX IF NOT EXISTS idx_planar_forces_campaign_id ON planar_forces(campaign_id);
CREATE INDEX IF NOT EXISTS idx_planar_forces_core_status ON planar_forces(core_status);
CREATE INDEX IF NOT EXISTS idx_planar_forces_player_knowledge ON planar_forces(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_planar_forces_high_priest_id ON planar_forces(high_priest_id);

-- Session Prep indexes
CREATE INDEX IF NOT EXISTS idx_session_prep_campaign_id ON session_prep(campaign_id);
CREATE INDEX IF NOT EXISTS idx_session_prep_core_status ON session_prep(core_status);
CREATE INDEX IF NOT EXISTS idx_session_prep_planned_date ON session_prep(planned_date);

-- Custom Mechanics indexes
CREATE INDEX IF NOT EXISTS idx_custom_mechanics_campaign_id ON custom_mechanics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_custom_mechanics_core_status ON custom_mechanics(core_status);
CREATE INDEX IF NOT EXISTS idx_custom_mechanics_player_knowledge ON custom_mechanics(player_knowledge);

-- Items indexes
CREATE INDEX IF NOT EXISTS idx_items_campaign_id ON items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_items_core_status ON items(core_status);
CREATE INDEX IF NOT EXISTS idx_items_player_knowledge ON items(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_items_owner_npc_id ON items(owner_npc_id);
CREATE INDEX IF NOT EXISTS idx_items_owner_pc_id ON items(owner_pc_id);
CREATE INDEX IF NOT EXISTS idx_items_location_id ON items(location_id);

-- Creatures indexes
CREATE INDEX IF NOT EXISTS idx_creatures_campaign_id ON creatures(campaign_id);
CREATE INDEX IF NOT EXISTS idx_creatures_core_status ON creatures(core_status);
CREATE INDEX IF NOT EXISTS idx_creatures_player_knowledge ON creatures(player_knowledge);

-- Custom Field Definitions indexes
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_campaign_id ON custom_field_definitions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_category ON custom_field_definitions(category);
