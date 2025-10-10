# Data Model: Structured Category Database Foundation

**Feature**: 014-create-the-database
**Date**: 2025-01-10

## Overview

This document defines the complete data model for 13 structured TTRPG category tables, including SQL schemas, TypeScript interfaces, relationships, validation rules, and constraints.

## Universal Fields

All 13 category tables inherit these 10 universal fields:

| Field | SQL Type | TypeScript Type | Required | Default | Description |
|-------|----------|-----------------|----------|---------|-------------|
| id | TEXT | string | YES | - | UUID primary key |
| campaign_id | TEXT | string | YES | - | Foreign key to campaigns table |
| name | TEXT | string | YES | - | Display name for entity |
| description | TEXT | string \| null | NO | null | Rich text content (markdown/HTML) |
| core_status | TEXT | 'active' \| 'archived' \| 'draft' \| 'hidden' | NO | 'active' | Entity lifecycle state |
| player_knowledge | TEXT | string \| null | NO | 'common_knowledge' | Information level for filtering |
| tags | TEXT | string[] | NO | '[]' | JSON array of tag strings |
| created_at | INTEGER | number | YES | CURRENT_TIMESTAMP | Unix epoch seconds |
| updated_at | INTEGER | number | YES | CURRENT_TIMESTAMP | Unix epoch seconds |
| custom_fields | TEXT | Record<string, any> | NO | '{}' | JSON object for user-defined fields |

### Universal Constraints

- `id`: PRIMARY KEY
- `campaign_id`: FOREIGN KEY REFERENCES campaigns(id) ON DELETE CASCADE
- `core_status`: CHECK (core_status IN ('active', 'archived', 'draft', 'hidden'))
- `player_knowledge`: NULL or references information_levels.name (soft constraint)
- `tags`: Valid JSON array (validated at service layer)
- `custom_fields`: Valid JSON object (validated at service layer)

---

## 1. NPCs Table

**Table Name**: `npcs`
**Purpose**: Non-player characters from shopkeepers to major villains

### Schema

```sql
CREATE TABLE IF NOT EXISTS npcs (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  race TEXT,
  class TEXT,  -- JSON array ["Fighter", "Ranger"]
  level INTEGER,
  alignment TEXT,
  appearance TEXT,
  personality_traits TEXT,
  motivation TEXT,
  relationship_to_party TEXT,
  met_party INTEGER DEFAULT 0,  -- Boolean: 0 = not met, 1 = met
  art TEXT,  -- File path or URL to character portrait

  -- Explicit connections (foreign keys)
  faction_id TEXT,
  superior_npc_id TEXT,  -- Parent in organizational hierarchy (chain of command)

  -- Many-to-many connections (JSON arrays)
  locations TEXT DEFAULT '[]',  -- Array of location IDs

  -- DM-only fields
  dm_secrets TEXT,
  dm_plot_relevance TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE SET NULL,
  FOREIGN KEY (superior_npc_id) REFERENCES npcs(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_npcs_campaign_id ON npcs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_npcs_core_status ON npcs(core_status);
CREATE INDEX IF NOT EXISTS idx_npcs_player_knowledge ON npcs(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_npcs_faction_id ON npcs(faction_id);
CREATE INDEX IF NOT EXISTS idx_npcs_superior_npc_id ON npcs(superior_npc_id);
```

### TypeScript Interface

```typescript
interface NPC {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;  // 'common_knowledge' | 'player_knowledge' | 'dm_only' | custom | null
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  race: string | null;
  class: string[] | null;  // JSON array
  level: number | null;
  alignment: string | null;
  appearance: string | null;
  personality_traits: string | null;
  motivation: string | null;
  relationship_to_party: string | null;
  met_party: 0 | 1;  // Boolean
  art: string | null;  // File path or URL

  // Explicit connections
  faction_id: string | null;
  superior_npc_id: string | null;  // Parent in hierarchy

  // Many-to-many connections
  locations: string[];  // Array of location IDs

  // DM-only fields
  dm_secrets: string | null;
  dm_plot_relevance: string | null;
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **Belongs To**: Faction (faction_id → factions.id) - SET NULL on delete
- **Belongs To**: Superior NPC (superior_npc_id → npcs.id) - SET NULL on delete
- **Has Many**: Subordinate NPCs (via superior_npc_id reverse lookup)
- **Has Many**: Locations (via locations JSON array - no FK constraint)

### Validation Rules

- `name`: Required, max 255 chars
- `class`: If provided, must be valid JSON array
- `level`: If provided, must be >= 1
- `met_party`: Must be 0 or 1
- `locations`: Must be valid JSON array of UUIDs
- `faction_id`: Must exist in factions table if not null
- `superior_npc_id`: Must exist in npcs table if not null, cannot create circular hierarchies (validated at service layer)

---

## 2. Locations Table

**Table Name**: `locations`
**Purpose**: Geographic areas, settlements, dungeons, landmarks

### Schema

```sql
CREATE TABLE IF NOT EXISTS locations (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  location_type TEXT,  -- e.g., city, dungeon, region, building
  population INTEGER,
  cultural_characteristics TEXT,
  map TEXT,  -- File path or URL to map image

  -- Explicit connections (self-referential foreign key)
  parent_location_id TEXT,

  -- Many-to-many connections (JSON arrays)
  notable_npcs TEXT DEFAULT '[]',  -- Array of NPC IDs
  factions_present TEXT DEFAULT '[]',  -- Array of faction IDs
  connected_locations TEXT DEFAULT '[]',  -- Array of location IDs

  -- DM-only fields
  dm_secrets TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locations_campaign_id ON locations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_locations_core_status ON locations(core_status);
CREATE INDEX IF NOT EXISTS idx_locations_player_knowledge ON locations(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_locations_parent_location_id ON locations(parent_location_id);
```

### TypeScript Interface

```typescript
interface Location {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  location_type: string | null;
  population: number | null;
  cultural_characteristics: string | null;
  map: string | null;  // File path or URL

  // Explicit connections
  parent_location_id: string | null;

  // Many-to-many connections
  notable_npcs: string[];
  factions_present: string[];
  connected_locations: string[];

  // DM-only fields
  dm_secrets: string | null;
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **Belongs To**: Parent Location (parent_location_id → locations.id) - SET NULL on delete
- **Has Many**: Child Locations (via parent_location_id reverse lookup)
- **Has Many**: NPCs, Factions, Connected Locations (via JSON arrays - no FK constraint)

### Validation Rules

- `name`: Required, max 255 chars
- `population`: If provided, must be >= 0
- `parent_location_id`: Cannot create circular references (validated at service layer)
- `notable_npcs`, `factions_present`, `connected_locations`: Must be valid JSON arrays

---

## 3. Factions Table

**Table Name**: `factions`
**Purpose**: Guilds, kingdoms, cults, corporations, organizations

### Schema

```sql
CREATE TABLE IF NOT EXISTS factions (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  faction_type TEXT,  -- e.g., guild, kingdom, cult, corporation
  power_level TEXT,  -- e.g., local, regional, national, global
  resources TEXT,
  beliefs TEXT,
  goals TEXT,
  methods TEXT,

  -- Explicit connections (foreign key)
  leader_id TEXT,

  -- Many-to-many connections (JSON arrays)
  key_members TEXT DEFAULT '[]',  -- Array of NPC IDs
  allied_factions TEXT DEFAULT '[]',  -- Array of faction IDs
  rival_factions TEXT DEFAULT '[]',  -- Array of faction IDs
  territory TEXT DEFAULT '[]',  -- Array of location IDs

  -- DM-only fields
  dm_true_agenda TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (leader_id) REFERENCES npcs(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_factions_campaign_id ON factions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_factions_core_status ON factions(core_status);
CREATE INDEX IF NOT EXISTS idx_factions_player_knowledge ON factions(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_factions_leader_id ON factions(leader_id);
```

### TypeScript Interface

```typescript
interface Faction {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  faction_type: string | null;
  power_level: string | null;
  resources: string | null;
  beliefs: string | null;
  goals: string | null;
  methods: string | null;

  // Explicit connections
  leader_id: string | null;

  // Many-to-many connections
  key_members: string[];
  allied_factions: string[];
  rival_factions: string[];
  territory: string[];

  // DM-only fields
  dm_true_agenda: string | null;
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **Belongs To**: Leader NPC (leader_id → npcs.id) - SET NULL on delete
- **Has Many**: NPCs (via npcs.faction_id reverse lookup)
- **Has Many**: Members, Allies, Rivals, Territory (via JSON arrays - no FK constraint)

### Validation Rules

- `name`: Required, max 255 chars
- `leader_id`: Must exist in npcs table if not null
- `key_members`, `allied_factions`, `rival_factions`, `territory`: Must be valid JSON arrays

---

## 4. Session Recaps Table

**Table Name**: `session_recaps`
**Purpose**: Canonical record of what actually happened in game sessions

### Schema

```sql
CREATE TABLE IF NOT EXISTS session_recaps (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  session_date INTEGER,  -- Unix timestamp of actual game session
  in_game_date_start TEXT,
  in_game_date_end TEXT,
  time_passed TEXT,  -- e.g., "3 days"
  summary TEXT,
  key_events TEXT,  -- JSON array of event descriptions
  player_decisions TEXT,  -- JSON array of major choices

  -- Canonical markers
  is_canon INTEGER DEFAULT 1,  -- Always 1 for session recaps
  canonical_status TEXT DEFAULT 'canon',  -- Always 'canon'

  -- Many-to-many connections (JSON arrays)
  npcs_encountered TEXT DEFAULT '[]',  -- Array of NPC IDs
  locations_visited TEXT DEFAULT '[]',  -- Array of location IDs
  quests_progressed TEXT DEFAULT '[]',  -- Array of quest IDs
  loot_acquired TEXT DEFAULT '[]',  -- Array of item IDs

  -- DM-only fields
  dm_consequences TEXT,
  dm_behind_scenes TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_recaps_campaign_id ON session_recaps(campaign_id);
CREATE INDEX IF NOT EXISTS idx_session_recaps_core_status ON session_recaps(core_status);
CREATE INDEX IF NOT EXISTS idx_session_recaps_player_knowledge ON session_recaps(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_session_recaps_session_date ON session_recaps(session_date);
```

### TypeScript Interface

```typescript
interface SessionRecap {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  session_date: number | null;
  in_game_date_start: string | null;
  in_game_date_end: string | null;
  time_passed: string | null;
  summary: string | null;
  key_events: string[] | null;  // JSON array
  player_decisions: string[] | null;  // JSON array

  // Canonical markers
  is_canon: 1;  // Always 1
  canonical_status: 'canon';  // Always 'canon'

  // Many-to-many connections
  npcs_encountered: string[];
  locations_visited: string[];
  quests_progressed: string[];
  loot_acquired: string[];

  // DM-only fields
  dm_consequences: string | null;
  dm_behind_scenes: string | null;
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **Has Many**: NPCs, Locations, Quests, Items (via JSON arrays - no FK constraint)

### Validation Rules

- `name`: Required, max 255 chars
- `session_date`: If provided, must be valid Unix timestamp
- `is_canon`: Always 1 (enforced at service layer)
- `canonical_status`: Always 'canon' (enforced at service layer)
- `key_events`, `player_decisions`, `npcs_encountered`, `locations_visited`, `quests_progressed`, `loot_acquired`: Must be valid JSON arrays

---

## 5. Quests Table

**Table Name**: `quests`
**Purpose**: Mission tracking, narrative threads, objectives

### Schema

```sql
CREATE TABLE IF NOT EXISTS quests (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  status TEXT DEFAULT 'not_started',  -- not_started, in_progress, completed, failed
  objectives TEXT DEFAULT '[]',  -- JSON array of objective descriptions
  rewards TEXT,

  -- Explicit connections (foreign keys)
  quest_giver_id TEXT,
  started_session_id TEXT,
  completed_session_id TEXT,

  -- Many-to-many connections (JSON arrays)
  related_npcs TEXT DEFAULT '[]',  -- Array of NPC IDs
  related_locations TEXT DEFAULT '[]',  -- Array of location IDs

  -- DM-only fields
  dm_true_objective TEXT,
  dm_consequences TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (quest_giver_id) REFERENCES npcs(id) ON DELETE SET NULL,
  FOREIGN KEY (started_session_id) REFERENCES session_recaps(id) ON DELETE SET NULL,
  FOREIGN KEY (completed_session_id) REFERENCES session_recaps(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quests_campaign_id ON quests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_quests_core_status ON quests(core_status);
CREATE INDEX IF NOT EXISTS idx_quests_player_knowledge ON quests(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_quests_quest_giver_id ON quests(quest_giver_id);
CREATE INDEX IF NOT EXISTS idx_quests_started_session_id ON quests(started_session_id);
CREATE INDEX IF NOT EXISTS idx_quests_completed_session_id ON quests(completed_session_id);
```

### TypeScript Interface

```typescript
interface Quest {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  objectives: string[];  // JSON array
  rewards: string | null;

  // Explicit connections
  quest_giver_id: string | null;
  started_session_id: string | null;
  completed_session_id: string | null;

  // Many-to-many connections
  related_npcs: string[];
  related_locations: string[];

  // DM-only fields
  dm_true_objective: string | null;
  dm_consequences: string | null;
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **Belongs To**: Quest Giver NPC (quest_giver_id → npcs.id) - SET NULL on delete
- **Belongs To**: Started Session (started_session_id → session_recaps.id) - SET NULL on delete
- **Belongs To**: Completed Session (completed_session_id → session_recaps.id) - SET NULL on delete
- **Has Many**: NPCs, Locations (via JSON arrays - no FK constraint)

### Validation Rules

- `name`: Required, max 255 chars
- `status`: Must be one of 'not_started', 'in_progress', 'completed', 'failed'
- `objectives`: Must be valid JSON array
- `quest_giver_id`, `started_session_id`, `completed_session_id`: Must exist in respective tables if not null

---

## 6. Player Characters Table

**Table Name**: `player_characters`
**Purpose**: PC roster and tracking

### Schema

```sql
CREATE TABLE IF NOT EXISTS player_characters (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  player_name TEXT,
  class TEXT,  -- JSON array ["Wizard", "Cleric"]
  level INTEGER,
  race TEXT,
  background TEXT,
  personality TEXT,
  goals TEXT,
  backstory TEXT,
  art TEXT,  -- File path or URL to character portrait

  -- Many-to-many connections (JSON arrays)
  faction_affiliations TEXT DEFAULT '[]',  -- Array of faction IDs
  allied_npcs TEXT DEFAULT '[]',  -- Array of NPC IDs

  -- DM-only fields
  dm_secrets TEXT,
  dm_plot_threads TEXT,
  dm_true_motivation TEXT,
  dm_consequences TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_player_characters_campaign_id ON player_characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_player_characters_core_status ON player_characters(core_status);
CREATE INDEX IF NOT EXISTS idx_player_characters_player_knowledge ON player_characters(player_knowledge);
```

### TypeScript Interface

```typescript
interface PlayerCharacter {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  player_name: string | null;
  class: string[] | null;  // JSON array
  level: number | null;
  race: string | null;
  background: string | null;
  personality: string | null;
  goals: string | null;
  backstory: string | null;
  art: string | null;  // File path or URL

  // Many-to-many connections
  faction_affiliations: string[];
  allied_npcs: string[];

  // DM-only fields
  dm_secrets: string | null;
  dm_plot_threads: string | null;
  dm_true_motivation: string | null;
  dm_consequences: string | null;
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **Has Many**: Factions, NPCs (via JSON arrays - no FK constraint)

### Validation Rules

- `name`: Required, max 255 chars
- `class`: If provided, must be valid JSON array
- `level`: If provided, must be >= 1
- `faction_affiliations`, `allied_npcs`: Must be valid JSON arrays

---

## 7. Lore Entries Table

**Table Name**: `lore_entries`
**Purpose**: Historical events, mythology, cultural traditions

### Schema

```sql
CREATE TABLE IF NOT EXISTS lore_entries (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  category TEXT,  -- e.g., history, mythology, culture, legend
  era_period TEXT,
  in_game_date TEXT,
  historical_accuracy TEXT,

  -- Many-to-many connections (JSON arrays)
  related_npcs TEXT DEFAULT '[]',  -- Array of NPC IDs
  related_locations TEXT DEFAULT '[]',  -- Array of location IDs
  related_factions TEXT DEFAULT '[]',  -- Array of faction IDs

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lore_entries_campaign_id ON lore_entries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_lore_entries_core_status ON lore_entries(core_status);
CREATE INDEX IF NOT EXISTS idx_lore_entries_player_knowledge ON lore_entries(player_knowledge);
```

### TypeScript Interface

```typescript
interface LoreEntry {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  category: string | null;
  era_period: string | null;
  in_game_date: string | null;
  historical_accuracy: string | null;

  // Many-to-many connections
  related_npcs: string[];
  related_locations: string[];
  related_factions: string[];
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **Has Many**: NPCs, Locations, Factions (via JSON arrays - no FK constraint)

### Validation Rules

- `name`: Required, max 255 chars
- `related_npcs`, `related_locations`, `related_factions`: Must be valid JSON arrays

---

## 8. World Rules Table

**Table Name**: `world_rules`
**Purpose**: Magic systems, cosmology, physics, social structures

### Schema

```sql
CREATE TABLE IF NOT EXISTS world_rules (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  rule_type TEXT,  -- e.g., magic, physics, social, cosmology
  exceptions TEXT,

  -- Many-to-many connections (JSON arrays)
  related_rules TEXT DEFAULT '[]',  -- Array of world_rule IDs (self-relation)

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_world_rules_campaign_id ON world_rules(campaign_id);
CREATE INDEX IF NOT EXISTS idx_world_rules_core_status ON world_rules(core_status);
CREATE INDEX IF NOT EXISTS idx_world_rules_player_knowledge ON world_rules(player_knowledge);
```

### TypeScript Interface

```typescript
interface WorldRule {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  rule_type: string | null;
  exceptions: string | null;

  // Many-to-many connections
  related_rules: string[];  // Self-relation
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **Has Many**: Related Rules (via JSON array self-relation - no FK constraint)

### Validation Rules

- `name`: Required, max 255 chars
- `related_rules`: Must be valid JSON array

---

## 9. Planar Forces Table

**Table Name**: `planar_forces`
**Purpose**: Deities, extraplanar entities (optional, default ON)

### Schema

```sql
CREATE TABLE IF NOT EXISTS planar_forces (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  entity_type TEXT,  -- e.g., deity, demon, celestial, elemental
  domains TEXT,  -- JSON array ["War", "Death", "Magic"]
  alignment TEXT,
  worshiper_base TEXT,
  plane_of_origin TEXT,
  base_of_power TEXT,  -- e.g., "Worship", "Souls", "Fear", "Ancient Magic"

  -- Explicit connections (foreign key)
  high_priest_id TEXT,

  -- Many-to-many connections (JSON arrays)
  allied_entities TEXT DEFAULT '[]',  -- Array of planar_force IDs
  rival_entities TEXT DEFAULT '[]',  -- Array of planar_force IDs
  religious_orders TEXT DEFAULT '[]',  -- Array of faction IDs

  -- DM-only fields
  dm_true_nature TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (high_priest_id) REFERENCES npcs(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_planar_forces_campaign_id ON planar_forces(campaign_id);
CREATE INDEX IF NOT EXISTS idx_planar_forces_core_status ON planar_forces(core_status);
CREATE INDEX IF NOT EXISTS idx_planar_forces_player_knowledge ON planar_forces(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_planar_forces_high_priest_id ON planar_forces(high_priest_id);
```

### TypeScript Interface

```typescript
interface PlanarForce {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  entity_type: string | null;
  domains: string[] | null;  // JSON array
  alignment: string | null;
  worshiper_base: string | null;
  plane_of_origin: string | null;
  base_of_power: string | null;

  // Explicit connections
  high_priest_id: string | null;

  // Many-to-many connections
  allied_entities: string[];
  rival_entities: string[];
  religious_orders: string[];

  // DM-only fields
  dm_true_nature: string | null;
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **Belongs To**: High Priest NPC (high_priest_id → npcs.id) - SET NULL on delete
- **Has Many**: Allied/Rival Entities, Religious Orders (via JSON arrays - no FK constraint)

### Validation Rules

- `name`: Required, max 255 chars
- `domains`: If provided, must be valid JSON array
- `high_priest_id`: Must exist in npcs table if not null
- `allied_entities`, `rival_entities`, `religious_orders`: Must be valid JSON arrays

---

## 10. Session Prep Table

**Table Name**: `session_prep`
**Purpose**: DM planning workspace - hypothetical content

### Schema

```sql
CREATE TABLE IF NOT EXISTS session_prep (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'dm_only',  -- Always dm_only for prep
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  planned_date INTEGER,  -- Unix timestamp
  status TEXT DEFAULT 'draft',  -- draft, ready, completed, cancelled
  planned_events TEXT,
  possible_encounters TEXT,
  plot_hooks TEXT,
  dm_notes TEXT,

  -- Canonical markers
  is_canon INTEGER DEFAULT 0,  -- Always 0 for session prep
  canonical_status TEXT DEFAULT 'hypothetical',  -- Always 'hypothetical'

  -- One-way JSON connections (NOT foreign keys)
  plot_threads TEXT DEFAULT '[]',  -- Array of quest IDs
  npcs_to_prep TEXT DEFAULT '[]',  -- Array of NPC IDs
  locations_to_prep TEXT DEFAULT '[]',  -- Array of location IDs

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_prep_campaign_id ON session_prep(campaign_id);
CREATE INDEX IF NOT EXISTS idx_session_prep_core_status ON session_prep(core_status);
CREATE INDEX IF NOT EXISTS idx_session_prep_planned_date ON session_prep(planned_date);
```

### TypeScript Interface

```typescript
interface SessionPrep {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: 'dm_only';  // Always dm_only
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  planned_date: number | null;
  status: 'draft' | 'ready' | 'completed' | 'cancelled';
  planned_events: string | null;
  possible_encounters: string | null;
  plot_hooks: string | null;
  dm_notes: string | null;

  // Canonical markers
  is_canon: 0;  // Always 0
  canonical_status: 'hypothetical';  // Always 'hypothetical'

  // One-way connections (JSON arrays, NOT foreign keys)
  plot_threads: string[];
  npcs_to_prep: string[];
  locations_to_prep: string[];
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **References** (one-way): Quests, NPCs, Locations (via JSON arrays - NO FK constraint, NO reverse lookup)

### Validation Rules

- `name`: Required, max 255 chars
- `player_knowledge`: Always 'dm_only' (enforced at service layer)
- `is_canon`: Always 0 (enforced at service layer)
- `canonical_status`: Always 'hypothetical' (enforced at service layer)
- `status`: Must be one of 'draft', 'ready', 'completed', 'cancelled'
- `plot_threads`, `npcs_to_prep`, `locations_to_prep`: Must be valid JSON arrays

### One-Way Connection Rules

- Session prep can reference canonical entities (NPCs, Locations, Quests)
- Canonical entities MUST NOT show reverse references to prep
- API MUST validate: cannot update canonical entities using session prep as source
- Stale IDs acceptable if referenced entities deleted (no ON DELETE CASCADE)

---

## 11. Custom Mechanics Table

**Table Name**: `custom_mechanics`
**Purpose**: House rules, homebrew systems

### Schema

```sql
CREATE TABLE IF NOT EXISTS custom_mechanics (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  mechanic_type TEXT,  -- e.g., house_rule, combat, skill, magic
  rules_text TEXT,
  prerequisites TEXT,
  source TEXT,

  -- Many-to-many connections (JSON arrays)
  related_rules TEXT DEFAULT '[]',  -- Array of custom_mechanic IDs (self-relation)

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_mechanics_campaign_id ON custom_mechanics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_custom_mechanics_core_status ON custom_mechanics(core_status);
CREATE INDEX IF NOT EXISTS idx_custom_mechanics_player_knowledge ON custom_mechanics(player_knowledge);
```

### TypeScript Interface

```typescript
interface CustomMechanic {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  mechanic_type: string | null;
  rules_text: string | null;
  prerequisites: string | null;
  source: string | null;

  // Many-to-many connections
  related_rules: string[];  // Self-relation
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **Has Many**: Related Rules (via JSON array self-relation - no FK constraint)

### Validation Rules

- `name`: Required, max 255 chars
- `related_rules`: Must be valid JSON array

---

## 12. Items Table

**Table Name**: `items`
**Purpose**: Weapons, armor, consumables, artifacts

### Schema

```sql
CREATE TABLE IF NOT EXISTS items (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  item_type TEXT,  -- e.g., weapon, armor, consumable, artifact, tool
  rarity TEXT,  -- e.g., common, uncommon, rare, very_rare, legendary, artifact
  properties TEXT,
  value TEXT,  -- e.g., "500 gold", "priceless"

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_campaign_id ON items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_items_core_status ON items(core_status);
CREATE INDEX IF NOT EXISTS idx_items_player_knowledge ON items(player_knowledge);
CREATE INDEX IF NOT EXISTS idx_items_owner_npc_id ON items(owner_npc_id);
CREATE INDEX IF NOT EXISTS idx_items_owner_pc_id ON items(owner_pc_id);
CREATE INDEX IF NOT EXISTS idx_items_location_id ON items(location_id);
```

### TypeScript Interface

```typescript
interface Item {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  item_type: string | null;
  rarity: string | null;
  properties: string | null;
  value: string | null;

  // Explicit connections (ownership)
  owner_npc_id: string | null;
  owner_pc_id: string | null;
  location_id: string | null;

  // DM-only fields
  dm_secret_properties: string | null;
  dm_true_nature: string | null;
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **Belongs To**: Owner NPC (owner_npc_id → npcs.id) - SET NULL on delete
- **Belongs To**: Owner PC (owner_pc_id → player_characters.id) - SET NULL on delete
- **Belongs To**: Location (location_id → locations.id) - SET NULL on delete

### Validation Rules

- `name`: Required, max 255 chars
- `owner_npc_id`, `owner_pc_id`, `location_id`: Must exist in respective tables if not null
- Cannot have multiple owners: if owner_npc_id set, owner_pc_id must be null and vice versa (validated at service layer)

---

## 13. Creatures Table

**Table Name**: `creatures`
**Purpose**: Bestiary - creatures separate from NPCs (optional, default OFF)

### Schema

```sql
CREATE TABLE IF NOT EXISTS creatures (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  custom_fields TEXT DEFAULT '{}',

  -- Category-specific fields
  creature_type TEXT,  -- e.g., beast, undead, dragon, aberration
  challenge_rating TEXT,  -- e.g., "1/4", "5", "20"
  abilities TEXT,  -- e.g., "Multiattack, Breath Weapon"

  -- Many-to-many connections (JSON arrays)
  habitats TEXT DEFAULT '[]',  -- Array of location IDs

  -- DM-only fields
  dm_behavior_notes TEXT,

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creatures_campaign_id ON creatures(campaign_id);
CREATE INDEX IF NOT EXISTS idx_creatures_core_status ON creatures(core_status);
CREATE INDEX IF NOT EXISTS idx_creatures_player_knowledge ON creatures(player_knowledge);
```

### TypeScript Interface

```typescript
interface Creature {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  creature_type: string | null;
  challenge_rating: string | null;
  abilities: string | null;

  // Many-to-many connections
  habitats: string[];

  // DM-only fields
  dm_behavior_notes: string | null;
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **Has Many**: Habitats (via JSON array - no FK constraint)

### Validation Rules

- `name`: Required, max 255 chars
- `habitats`: Must be valid JSON array

---

## 14. Custom Field Definitions Table

**Table Name**: `custom_field_definitions`
**Purpose**: Store schema metadata for user-defined custom fields

### Schema

```sql
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  category TEXT NOT NULL,  -- e.g., 'npcs', 'locations', 'factions'
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,  -- text, number, select, multi_select, date
  options TEXT,  -- JSON array for select/multi_select types
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Unique constraint: one definition per category+field_name per campaign
  UNIQUE (campaign_id, category, field_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_campaign_id ON custom_field_definitions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_category ON custom_field_definitions(category);
```

### TypeScript Interface

```typescript
interface CustomFieldDefinition {
  id: string;
  campaign_id: string;
  category: string;  // Table name: 'npcs', 'locations', etc.
  field_name: string;  // Actual field key in custom_fields JSON
  field_label: string;  // Human-readable label for UI
  field_type: 'text' | 'number' | 'select' | 'multi_select' | 'date';
  options: string[] | null;  // JSON array for select/multi_select
  created_at: number;
  updated_at: number;
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete

### Validation Rules

- `campaign_id`, `category`, `field_name`, `field_label`, `field_type`: Required
- `field_type`: Must be one of 'text', 'number', 'select', 'multi_select', 'date'
- `options`: Required if field_type is 'select' or 'multi_select'
- `options`: Must be valid JSON array if provided
- Unique constraint enforced: (campaign_id, category, field_name)

---

## Relationship Diagram

```
campaigns
    ├── npcs (cascade delete)
    │   ├── faction_id → factions (set null on delete)
    │   └── superior_npc_id → npcs (self-ref, set null on delete)
    ├── locations (cascade delete)
    │   └── parent_location_id → locations (self-ref, set null)
    ├── factions (cascade delete)
    │   └── leader_id → npcs (set null on delete)
    ├── session_recaps (cascade delete)
    ├── quests (cascade delete)
    │   ├── quest_giver_id → npcs (set null)
    │   ├── started_session_id → session_recaps (set null)
    │   └── completed_session_id → session_recaps (set null)
    ├── player_characters (cascade delete)
    ├── lore_entries (cascade delete)
    ├── world_rules (cascade delete)
    ├── planar_forces (cascade delete)
    │   └── high_priest_id → npcs (set null)
    ├── session_prep (cascade delete)
    ├── custom_mechanics (cascade delete)
    ├── items (cascade delete)
    │   ├── owner_npc_id → npcs (set null)
    │   ├── owner_pc_id → player_characters (set null)
    │   └── location_id → locations (set null)
    ├── creatures (cascade delete)
    └── custom_field_definitions (cascade delete)
```

---

## Information Level Filtering

### Middleware Behavior

**X-View-Mode: dm_view** (default):
- Return all entities regardless of player_knowledge value
- Include all dm_* prefixed fields

**X-View-Mode: player_view**:
- Filter WHERE clause: `player_knowledge IN ('common_knowledge', 'player_knowledge', null)`
- Exclude entities with player_knowledge = 'dm_only' or custom secret levels
- Strip all dm_* prefixed fields from response objects

### Field Stripping

DM-only fields to strip in player_view:
- dm_secrets (NPCs, Locations, Player Characters)
- dm_plot_relevance (NPCs)
- dm_true_agenda (Factions)
- dm_consequences (Session Recaps, Quests, Player Characters)
- dm_behind_scenes (Session Recaps)
- dm_true_objective (Quests)
- dm_plot_threads (Player Characters)
- dm_true_motivation (Player Characters)
- dm_true_nature (Planar Forces, Items)
- dm_behavior_notes (Creatures)
- dm_secret_properties (Items)
- dm_notes (Session Prep - but player_knowledge always dm_only anyway)

---

## State Transitions

### Core Status Lifecycle

```
draft → active → archived
  ↓       ↓
hidden ← ←
```

- **draft**: Work in progress, not shown in default lists
- **active**: Default state, visible in standard queries
- **archived**: Historical, shown only when explicitly filtered
- **hidden**: System use only, excluded from most queries

---

## Performance Indexes Summary

All 13 tables include:
- `campaign_id` - Filter by campaign (most queries)
- `core_status` - Filter active/archived entities
- `player_knowledge` - Information level filtering

Category-specific indexes:
- `npcs.faction_id` - Reverse lookup (all NPCs in faction)
- `npcs.superior_npc_id` - NPC hierarchy queries (chain of command)
- `locations.parent_location_id` - Location hierarchy queries
- `factions.leader_id` - Reverse lookup
- `quests.quest_giver_id`, `quests.started_session_id`, `quests.completed_session_id` - Quest relationships
- `session_recaps.session_date` - Timeline queries
- `planar_forces.high_priest_id` - Reverse lookup
- `items.owner_npc_id`, `items.owner_pc_id`, `items.location_id` - Ownership queries
- `session_prep.planned_date` - Planning timeline
- `custom_field_definitions.category` - Field lookups by table

---

## Migration Order

Tables must be created in this order to satisfy foreign key dependencies:

1. `campaigns` (existing - Feature 002)
2. `information_levels` (existing - Feature 004)
3. `factions` (leader_id can be null initially)
4. `npcs` (faction_id references factions)
5. Update `factions.leader_id` constraint (references npcs)
6. `locations` (parent_location_id references locations self)
7. `session_recaps`
8. `quests` (references npcs, session_recaps)
9. `player_characters`
10. `lore_entries`
11. `world_rules`
12. `planar_forces` (references npcs)
13. `session_prep`
14. `custom_mechanics`
15. `items` (references npcs, player_characters, locations)
16. `creatures`
17. `custom_field_definitions`

---

**Status**: ✅ Data model complete - 13 entities documented with schemas, interfaces, relationships, and validation rules
