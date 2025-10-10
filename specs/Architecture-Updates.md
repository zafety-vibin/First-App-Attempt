# Hybrid Architecture: Structured Categories + Free-Form Wiki

**Last Updated:** 2025-01-09
**Status:** Approved for Implementation
**Related Features:** 013 (Database), 014 (Dashboard/UI), 015 (Knowledge Graphs), 016 (Campaign Wizard)

---

## Table of Contents
1. [Core Principles](#core-principles)
2. [The 4-Type Hierarchy](#the-4-type-hierarchy)
3. [Database Architecture](#database-architecture)
4. [13 Category Schemas](#13-category-schemas)
5. [Universal Field Requirements](#universal-field-requirements)
6. [Relationship System](#relationship-system)
7. [Knowledge Graph Integration](#knowledge-graph-integration)
8. [Information Level Filtering](#information-level-filtering)
9. [Session Prep vs Canon Isolation](#session-prep-vs-canon-isolation)
10. [Custom Fields System](#custom-fields-system)
11. [Tagging Principles](#tagging-principles)
12. [Wiki Section](#wiki-section)
13. [Thematic Naming](#thematic-naming)
14. [Migration Strategy](#migration-strategy)
15. [Feature Breakdown](#feature-breakdown)

---

## Core Principles

### The Problem We're Solving

**Current approach (notion-lite everywhere):**
- ✅ Maximum flexibility
- ❌ No structure for AI context
- ❌ Poor discoverability and querying
- ❌ Manual graph management

**New hybrid approach:**
- ✅ Structured categories for common TTRPG content (NPCs, locations, factions)
- ✅ Queryable fields with type safety
- ✅ AI-friendly schemas with clear context
- ✅ Free-form wiki for unique world-building
- ✅ Automatic relationship visualization

### Design Philosophy

**Structured where performance matters, flexible where creativity matters.**

- **13 Pre-defined categories**: Handle 95% of TTRPG content with optimized schemas
- **Wiki section**: Human edited -> An optional page editor tool to create your own wiki for your campaign that is not used in the context considerations of AI assistants on the webapp. (allows complete customization without concern of wiki "system" information like navigation pages, public facing explainers and overviews, or intentionally misleading public information like secrets from messing up an AI's true understanding of the campaign state)
- **Knowledge graphs**: Provide AI context without manual maintenance [Human Note: How much without manual assistance to be determined.]
- **User agency**: Users choose which categories to enable, how to organize within them [Human Note: Plans on adding additional category creation BUT NOT TYPE by a user. Landing page of user created category won't support things like prebuilt widgets when compared to something like landing page for NPCs which is default.]

---

## The 4-Type Hierarchy

**FIXED structure** - users cannot add/remove types, but can enable/disable categories within types.

```
📜 SETTING (Foundational World-Building)
├─ Lore & History
└─ World Rules

🌍 LIVING WORLD (Dynamic Entities)
├─ NPCs
├─ Locations
├─ Factions & Organizations
└─ Planar Forces (optional, default ON)

📅 CAMPAIGN (Session & Story Management)
├─ Session Prep Notes
├─ Session Recaps
├─ Quests & Plot Threads
└─ Player Characters

⚙️ EXTENDED (Homebrew & Custom Content)
├─ Custom Mechanics
├─ Items & Equipment
└─ Creatures & Monsters (optional, default OFF)
```

### Why 4 Types?

**Conceptual organization:**
- **SETTING**: Things that rarely change (world rules, history)
- **LIVING WORLD**: Things that evolve (NPCs grow, factions rise/fall, locations change)
- **CAMPAIGN**: Things tied to sessions (what happened, what's planned, active quests)
- **EXTENDED**: Things outside the core (homebrew rules, items, bestiaries)

**AI context separation:**
- World-Foundations graph pulls from SETTING
- Political-Web and Geographical graphs pull from LIVING WORLD
- Campaign-Story graph pulls from CAMPAIGN (Session Recaps only)

---

## Database Architecture

### Hybrid Approach

**13 Structured Tables** (one per category)
- Pre-defined columns for standard fields
- `custom_fields` JSON column for user additions
- Fast queries, type safety, clear AI context
- Foreign key relationships between entities

**Cards Table** (repurposed for Wiki)
- Free-form notion-lite editing
- User-created pages
- Hierarchical organization
- Public-facing option

**Benefits:**
- Performance: Direct column access for common queries (e.g., `SELECT * FROM npcs WHERE race = 'Elf'`)
- Flexibility: Users can add custom fields via JSON (e.g., `custom_fields: {"magicalAffinity": "Fire"}`)
- AI clarity: Schema is self-documenting, tools know what fields exist

### Why NOT Polymorphic?

**Polymorphic (everything in cards table with JSON):**
- ❌ Slower queries (parsing JSON for every filter)
- ❌ No type safety (typos in JSON keys don't error)
- ❌ Hard to enforce required fields
- ❌ Complex indexing

**Structured tables:**
- ✅ Fast column-based queries
- ✅ Database enforces field types and requirements
- ✅ Easy indexing on common fields
- ✅ Clear schema for AI tools

**Hybrid compromise:**
- Standard fields → columns (fast, typed)
- User additions → `custom_fields` JSON (flexible)
- Wiki content → cards table (free-form)

---

## 13 Category Schemas

### Universal Fields (ALL categories)

**Every table MUST include:**
```sql
id                  TEXT PRIMARY KEY
campaign_id         TEXT NOT NULL (FK → campaigns)
name                TEXT NOT NULL
description         TEXT
core_status         TEXT DEFAULT 'active' -- [active, archived, draft, hidden]
player_knowledge    TEXT DEFAULT 'common_knowledge' -- [common_knowledge, player_known, secret, dm_only, <custom>]
tags                TEXT -- JSON array of tag strings
created_at          INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
updated_at          INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
custom_fields       TEXT -- JSON object for user-added fields
```

---

### 📜 SETTING Type

#### 1. Lore & History (`lore_entries` table)

**Purpose:** Foundational world-building, mythology, historical events

**Schema:**
```sql
CREATE TABLE lore_entries (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT, -- JSON array
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  custom_fields TEXT, -- JSON

  -- Category-specific fields
  category TEXT NOT NULL, -- [creation_myth, historical_event, cultural_tradition, legend, world_rule]
  era_period TEXT,
  in_game_date TEXT,
  historical_accuracy TEXT, -- [true, exaggerated, false_legend, unknown]

  -- Relations (stored as JSON arrays of IDs)
  related_npcs TEXT, -- JSON array of NPC IDs
  related_locations TEXT, -- JSON array of Location IDs
  related_factions TEXT, -- JSON array of Faction IDs

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

**Indexes:**
```sql
CREATE INDEX idx_lore_campaign ON lore_entries(campaign_id);
CREATE INDEX idx_lore_status ON lore_entries(core_status);
CREATE INDEX idx_lore_knowledge ON lore_entries(player_knowledge);
CREATE INDEX idx_lore_category ON lore_entries(category);
```

**Knowledge Graph:** Feeds World-Foundations memory

---

#### 2. World Rules (`world_rules` table)

**Purpose:** System constants, cosmology, planar structure, magic systems

**Schema:**
```sql
CREATE TABLE world_rules (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  custom_fields TEXT,

  -- Category-specific fields
  rule_type TEXT NOT NULL, -- [cosmology, magic_system, technology_level, physics, social_structure]
  exceptions TEXT,

  -- Relations
  related_rules TEXT, -- JSON array of other World Rule IDs (self-relation)

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

**Indexes:**
```sql
CREATE INDEX idx_worldrules_campaign ON world_rules(campaign_id);
CREATE INDEX idx_worldrules_type ON world_rules(rule_type);
CREATE INDEX idx_worldrules_status ON world_rules(core_status);
```

**Knowledge Graph:** PRIMARY source for World-Foundations memory

---

### 🌍 LIVING WORLD Type

#### 3. NPCs (`npcs` table)

**Purpose:** All non-player characters from shopkeepers to villains

**Schema:**
```sql
CREATE TABLE npcs (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  custom_fields TEXT,

  -- Identity
  race TEXT,
  class TEXT, -- JSON array for multi-class
  level INTEGER,
  alignment TEXT,

  -- Appearance & Personality
  appearance TEXT,
  personality_traits TEXT,
  motivation TEXT,

  -- Relationships
  faction_id TEXT, -- Single FK to factions table
  locations TEXT, -- JSON array of Location IDs
  relationships TEXT, -- JSON array of {npc_id, relationship_type}
  relationship_to_party TEXT, -- [ally, neutral, hostile, unknown]

  -- DM-Only Fields (filtered by player_knowledge)
  dm_secrets TEXT, -- player_knowledge='dm_only'
  dm_plot_relevance TEXT, -- player_knowledge='dm_only'

  -- Media
  art_url TEXT,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE SET NULL
);
```

**Indexes:**
```sql
CREATE INDEX idx_npcs_campaign ON npcs(campaign_id);
CREATE INDEX idx_npcs_status ON npcs(core_status);
CREATE INDEX idx_npcs_knowledge ON npcs(player_knowledge);
CREATE INDEX idx_npcs_faction ON npcs(faction_id);
CREATE INDEX idx_npcs_relationship_party ON npcs(relationship_to_party);
CREATE INDEX idx_npcs_race ON npcs(race);
```

**Knowledge Graph:** Feeds Political-Web memory

---

#### 4. Locations (`locations` table)

**Purpose:** Geographic areas, settlements, dungeons, landmarks

**Schema:**
```sql
CREATE TABLE locations (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  core_status TEXT DEFAULT 'active', -- [active, abandoned, destroyed, hidden, unexplored]
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  custom_fields TEXT,

  -- Category-specific
  location_type TEXT NOT NULL, -- [continent, region, kingdom, city, town, village, dungeon, landmark, building]

  -- Hierarchy
  parent_location_id TEXT, -- Self-FK for hierarchical nesting

  -- Characteristics
  population TEXT, -- e.g., "~5,000" or "Uninhabited"
  cultural_characteristics TEXT, -- Government, economy, architecture

  -- Connections
  notable_npcs TEXT, -- JSON array of NPC IDs
  factions_present TEXT, -- JSON array of Faction IDs
  connected_locations TEXT, -- JSON array of {location_id, connection_type} for travel routes

  -- DM-Only
  dm_secrets TEXT,

  -- Media
  map_image_url TEXT,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_location_id) REFERENCES locations(id) ON DELETE SET NULL
);
```

**Indexes:**
```sql
CREATE INDEX idx_locations_campaign ON locations(campaign_id);
CREATE INDEX idx_locations_status ON locations(core_status);
CREATE INDEX idx_locations_knowledge ON locations(player_knowledge);
CREATE INDEX idx_locations_type ON locations(location_type);
CREATE INDEX idx_locations_parent ON locations(parent_location_id);
```

**Knowledge Graph:** Feeds Geographical memory

---

#### 5. Factions & Organizations (`factions` table)

**Purpose:** Guilds, kingdoms, cults, corporations, political entities

**Schema:**
```sql
CREATE TABLE factions (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  core_status TEXT DEFAULT 'active', -- [active, defunct, rising, declining, hidden]
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  custom_fields TEXT,

  -- Category-specific
  faction_type TEXT NOT NULL, -- [political, religious, criminal, military, trade, social, secret_society]

  -- Power & Influence
  power_level TEXT, -- [local, regional, continental, global]
  resources TEXT,

  -- Relationships
  leader_id TEXT, -- FK to npcs
  key_members TEXT, -- JSON array of NPC IDs
  allied_factions TEXT, -- JSON array of Faction IDs
  rival_factions TEXT, -- JSON array of Faction IDs
  territory TEXT, -- JSON array of Location IDs

  -- Goals
  beliefs TEXT,
  goals TEXT,
  methods TEXT,

  -- DM-Only
  dm_true_agenda TEXT,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (leader_id) REFERENCES npcs(id) ON DELETE SET NULL
);
```

**Indexes:**
```sql
CREATE INDEX idx_factions_campaign ON factions(campaign_id);
CREATE INDEX idx_factions_status ON factions(core_status);
CREATE INDEX idx_factions_knowledge ON factions(player_knowledge);
CREATE INDEX idx_factions_type ON factions(faction_type);
CREATE INDEX idx_factions_leader ON factions(leader_id);
CREATE INDEX idx_factions_power ON factions(power_level);
```

**Knowledge Graph:** Feeds Political-Web memory

---

#### 6. Planar Forces (`planar_forces` table) - OPTIONAL (default ON)

**Purpose:** Deities, divine hierarchies, extraplanar entities, cosmological forces

**Schema:**
```sql
CREATE TABLE planar_forces (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  core_status TEXT DEFAULT 'active', -- [active, forgotten, ascended, fallen, imprisoned]
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  custom_fields TEXT,

  -- Category-specific
  entity_type TEXT NOT NULL, -- [greater_deity, lesser_deity, demigod, archfey, demon_lord, celestial, elemental_lord, outer_entity]

  -- Domains & Power
  domains TEXT, -- JSON array: [death, life, war, knowledge, nature, trickery, etc.]
  alignment TEXT,
  worshiper_base TEXT,
  plane_of_origin TEXT,

  -- Relationships
  allied_entities TEXT, -- JSON array of Planar Force IDs
  rival_entities TEXT, -- JSON array of Planar Force IDs
  high_priest_id TEXT, -- FK to npcs
  religious_orders TEXT, -- JSON array of Faction IDs

  -- DM-Only
  dm_true_nature TEXT,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (high_priest_id) REFERENCES npcs(id) ON DELETE SET NULL
);
```

**Indexes:**
```sql
CREATE INDEX idx_planar_campaign ON planar_forces(campaign_id);
CREATE INDEX idx_planar_status ON planar_forces(core_status);
CREATE INDEX idx_planar_type ON planar_forces(entity_type);
```

**Note:** Named "Planar Forces" instead of "Gods & Religion" to support broader cosmologies (fey courts, demon princes, elemental lords, outer entities).

---

### 📅 CAMPAIGN Type

#### 7. Session Prep Notes (`session_prep` table)

**Purpose:** DM planning workspace - what you EXPECT to happen

**Schema:**
```sql
CREATE TABLE session_prep (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL, -- "Session [#]"
  description TEXT,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'dm_only', -- Prep notes are always DM-only
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  custom_fields TEXT,

  -- Session metadata
  planned_date INTEGER, -- Unix timestamp
  status TEXT NOT NULL, -- [planning, ready, in_progress, completed, cancelled]

  -- Planning content
  planned_events TEXT,
  plot_threads TEXT, -- JSON array of Quest IDs
  npcs_to_prep TEXT, -- JSON array of NPC IDs
  locations_to_prep TEXT, -- JSON array of Location IDs
  possible_encounters TEXT,
  plot_hooks TEXT,
  dm_notes TEXT,

  -- CRITICAL: Canon marker
  is_canon INTEGER DEFAULT 0, -- Always FALSE (0)
  canonical_status TEXT DEFAULT 'hypothetical',

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

**Indexes:**
```sql
CREATE INDEX idx_prep_campaign ON session_prep(campaign_id);
CREATE INDEX idx_prep_status ON session_prep(status);
CREATE INDEX idx_prep_date ON session_prep(planned_date);
```

**Knowledge Graph:** NONE - does NOT feed campaign-story memory

**CRITICAL RULE:** AI tools CANNOT use prep notes to update canonical NPCs/Locations. System enforced.

---

#### 8. Session Recaps (`session_recaps` table)

**Purpose:** Canon record of what ACTUALLY happened

**Schema:**
```sql
CREATE TABLE session_recaps (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL, -- "Session [#]: [Memorable Title]"
  description TEXT,
  core_status TEXT DEFAULT 'active', -- Active for most recent, archived for past
  player_knowledge TEXT DEFAULT 'player_known', -- Recaps are usually player-visible
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  custom_fields TEXT,

  -- Session metadata
  session_date INTEGER NOT NULL, -- Real-world date (Unix timestamp)
  in_game_date_start TEXT NOT NULL,
  in_game_date_end TEXT NOT NULL,
  time_passed TEXT, -- Computed or entered

  -- What happened (rich text)
  summary TEXT NOT NULL,
  key_events TEXT,
  player_decisions TEXT,

  -- Relations
  npcs_encountered TEXT, -- JSON array of NPC IDs
  locations_visited TEXT, -- JSON array of Location IDs
  quests_progressed TEXT, -- JSON array of Quest IDs
  loot_acquired TEXT, -- JSON array of Item IDs

  -- DM-Only fields
  dm_consequences TEXT,
  dm_behind_scenes TEXT,

  -- CRITICAL: Canon marker
  is_canon INTEGER DEFAULT 1, -- Always TRUE (1)
  canonical_status TEXT DEFAULT 'canon',

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

**Indexes:**
```sql
CREATE INDEX idx_recaps_campaign ON session_recaps(campaign_id);
CREATE INDEX idx_recaps_status ON session_recaps(core_status);
CREATE INDEX idx_recaps_session_date ON session_recaps(session_date);
CREATE INDEX idx_recaps_canon ON session_recaps(is_canon);
```

**Knowledge Graph:** YES - ONLY source for Campaign-Story memory

---

#### 9. Quests & Plot Threads (`quests` table)

**Purpose:** Mission tracking, narrative threads, objectives

**Schema:**
```sql
CREATE TABLE quests (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'player_known',
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  custom_fields TEXT,

  -- Quest-specific
  status TEXT NOT NULL, -- [active, completed, failed, on_hold, hidden]

  -- Details
  quest_giver_id TEXT, -- FK to npcs
  objectives TEXT, -- JSON array of {text, completed: bool}
  rewards TEXT,

  -- Relations
  related_npcs TEXT, -- JSON array of NPC IDs
  related_locations TEXT, -- JSON array of Location IDs

  -- Tracking
  started_session_id TEXT, -- FK to session_recaps
  completed_session_id TEXT, -- FK to session_recaps

  -- DM-Only
  dm_true_objective TEXT,
  dm_consequences TEXT,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (quest_giver_id) REFERENCES npcs(id) ON DELETE SET NULL,
  FOREIGN KEY (started_session_id) REFERENCES session_recaps(id) ON DELETE SET NULL,
  FOREIGN KEY (completed_session_id) REFERENCES session_recaps(id) ON DELETE SET NULL
);
```

**Indexes:**
```sql
CREATE INDEX idx_quests_campaign ON quests(campaign_id);
CREATE INDEX idx_quests_status ON quests(status);
CREATE INDEX idx_quests_giver ON quests(quest_giver_id);
```

---

#### 10. Player Characters (`player_characters` table)

**Purpose:** Player character roster and tracking

**Schema:**
```sql
CREATE TABLE player_characters (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  core_status TEXT DEFAULT 'active', -- [active, retired, deceased]
  player_knowledge TEXT DEFAULT 'common_knowledge', -- Characters are public
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  custom_fields TEXT,

  -- PC-specific
  player_name TEXT NOT NULL, -- Real player's name
  class TEXT, -- JSON array for multi-class
  level INTEGER,

  -- Character details
  race TEXT,
  background TEXT,
  personality TEXT,
  goals TEXT,
  backstory TEXT,

  -- Relationships
  faction_affiliations TEXT, -- JSON array of Faction IDs
  allied_npcs TEXT, -- JSON array of NPC IDs

  -- DM-Only secrets
  dm_secrets TEXT, -- Hidden backstory, real identity
  dm_plot_threads TEXT, -- JSON array of Quest IDs involving this PC
  dm_true_motivation TEXT,
  dm_consequences TEXT,

  -- Media
  art_url TEXT,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

**Indexes:**
```sql
CREATE INDEX idx_pcs_campaign ON player_characters(campaign_id);
CREATE INDEX idx_pcs_status ON player_characters(core_status);
CREATE INDEX idx_pcs_player ON player_characters(player_name);
```

---

### ⚙️ EXTENDED Type

#### 11. Custom Mechanics (`custom_mechanics` table)

**Purpose:** House rules, homebrew systems, special rules

**Schema:**
```sql
CREATE TABLE custom_mechanics (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  custom_fields TEXT,

  -- Category-specific
  mechanic_type TEXT NOT NULL, -- [house_rule, custom_class, spell, combat_rule, crafting_system, character_option]

  -- Details
  rules_text TEXT,
  prerequisites TEXT,
  related_rules TEXT, -- JSON array of Custom Mechanic IDs (self-relation)
  source TEXT, -- [homebrew, official, adapted]

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

**Indexes:**
```sql
CREATE INDEX idx_mechanics_campaign ON custom_mechanics(campaign_id);
CREATE INDEX idx_mechanics_type ON custom_mechanics(mechanic_type);
CREATE INDEX idx_mechanics_source ON custom_mechanics(source);
```

---

#### 12. Items & Equipment (`items` table)

**Purpose:** All items - weapons, armor, consumables, artifacts

**Schema:**
```sql
CREATE TABLE items (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  custom_fields TEXT,

  -- Item-specific
  item_type TEXT NOT NULL, -- [weapon, armor, consumable, wondrous_item, quest_item, artifact]
  rarity TEXT NOT NULL, -- [common, uncommon, rare, very_rare, legendary, artifact]

  -- Properties
  properties TEXT,
  value INTEGER, -- GP cost (-1 for priceless, 0 for worthless)

  -- Ownership
  owner_npc_id TEXT, -- FK to npcs
  owner_pc_id TEXT, -- FK to player_characters
  location_id TEXT, -- FK to locations (if not owned)

  -- DM-Only
  dm_secret_properties TEXT,
  dm_true_nature TEXT,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_npc_id) REFERENCES npcs(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_pc_id) REFERENCES player_characters(id) ON DELETE SET NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);
```

**Indexes:**
```sql
CREATE INDEX idx_items_campaign ON items(campaign_id);
CREATE INDEX idx_items_type ON items(item_type);
CREATE INDEX idx_items_rarity ON items(rarity);
CREATE INDEX idx_items_owner_npc ON items(owner_npc_id);
CREATE INDEX idx_items_owner_pc ON items(owner_pc_id);
CREATE INDEX idx_items_location ON items(location_id);
```

**Note:** Shop generation feature can query by rarity without AI (e.g., `SELECT * FROM items WHERE rarity = 'common' AND owner_npc_id IS NULL AND owner_pc_id IS NULL`)

---

#### 13. Creatures & Monsters (`creatures` table) - OPTIONAL (default OFF)

**Purpose:** Bestiary - creatures separate from NPCs

**Schema:**
```sql
CREATE TABLE creatures (
  -- Universal fields
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  core_status TEXT DEFAULT 'active',
  player_knowledge TEXT DEFAULT 'common_knowledge',
  tags TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  custom_fields TEXT,

  -- Creature-specific
  creature_type TEXT NOT NULL, -- [beast, monstrosity, undead, construct, aberration, etc.]

  -- Stats
  challenge_rating REAL,
  abilities TEXT,

  -- Relations
  habitats TEXT, -- JSON array of Location IDs

  -- DM-Only
  dm_behavior_notes TEXT,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

**Indexes:**
```sql
CREATE INDEX idx_creatures_campaign ON creatures(campaign_id);
CREATE INDEX idx_creatures_type ON creatures(creature_type);
CREATE INDEX idx_creatures_cr ON creatures(challenge_rating);
```

**Note:** Can be consolidated into NPCs with "NPC Type: Monster" if bestiaries aren't critical.

---

## Universal Field Requirements

**EVERY table MUST have these fields:**

1. **id** (TEXT PRIMARY KEY) - Unique identifier (UUID or similar)
2. **campaign_id** (TEXT NOT NULL, FK) - Which campaign this entity belongs to
3. **name** (TEXT NOT NULL) - Primary identifier for display
4. **description** (TEXT) - Core content (rich text stored as HTML or markdown)
5. **core_status** (TEXT DEFAULT 'active') - [active, archived, draft, hidden]
6. **player_knowledge** (TEXT DEFAULT 'common_knowledge') - Information level
7. **tags** (TEXT) - JSON array of cross-cutting tag strings
8. **created_at** (INTEGER NOT NULL) - Unix timestamp
9. **updated_at** (INTEGER NOT NULL) - Unix timestamp
10. **custom_fields** (TEXT) - JSON object for user-added fields

**Why these fields?**

- **For AI Context:** Name and description provide semantic understanding
- **For Filtering:** core_status and player_knowledge enable access control
- **For Discovery:** tags enable cross-database thematic connections
- **For Flexibility:** custom_fields allow users to extend schemas without migrations

---

## Relationship System 

### Types of Relationships

**1. Foreign Key (One-to-Many)**
- Example: `npcs.faction_id → factions.id`
- An NPC belongs to ONE faction
- A faction has MANY NPCs

**2. JSON Array (Many-to-Many)**
- Example: `npcs.locations` → JSON array of Location IDs
- An NPC can be found in MANY locations
- A location can have MANY notable NPCs

**3. JSON Objects with Metadata (Many-to-Many with attributes)**
- Example: `npcs.relationships` → `[{npc_id: "123", relationship_type: "rival"}]`
- An NPC can have MANY relationships to other NPCs
- Each relationship has a type (ally, rival, family, etc.)

**4. Self-Relations**
- Example: `locations.parent_location_id → locations.id`
- A location can have a parent location
- A location can have many child locations (computed)

### Junction Tables (for complex many-to-many) [Human note: It seems we may be confusing when relationships or what types of relationships specifically are supported in this system. Adding to the knowledge graph should have dynamic relationships defined by the user content's use case and what they are tracking. HOWEVER things like the NPCs database table, it can handle "relationships" in the sense you can connect two things or many things to one thing in a hierarchy fashion e.g. "Add a relationship field named 'parent location' and do a self database connection to another location entity with dual-connection toggled on (so not just a 1 way connection) and you set the column created that is 'calculated' (the connection back) to be named 'children location' and you can use the named 'parent location' column to define every location's parent following a hierarchy back to something like continent or world or galaxy", BUT it cannot or rather should not "name" that connection and the name of the column containing the field should be what makes the connection clear. If you wanted to do something like "rival NPC relation" you could but the column wouldn't just be "relationships" with various types you can't see on a table connecting two entities, no it should be the column that names what that connection is. Reformat or reconfigure anything about this specification that may be affected by this understanding. KNOWLEDGE GRAPHS are for dynamic named relationship types. DATABASES are for connections. Does that make sense?]

**When to use:**
- If relationship attributes are complex
- If relationship itself needs to be queryable

**Example:**
```sql
CREATE TABLE npc_relationships (
  id TEXT PRIMARY KEY,
  npc_a_id TEXT NOT NULL,
  npc_b_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL, -- [ally, rival, family, mentor, romantic, etc.]
  strength INTEGER, -- 1-10 scale
  notes TEXT,
  created_at INTEGER,

  FOREIGN KEY (npc_a_id) REFERENCES npcs(id) ON DELETE CASCADE,
  FOREIGN KEY (npc_b_id) REFERENCES npcs(id) ON DELETE CASCADE
);
```

**For v1: Use JSON arrays.** Junction tables are optimization for later if needed.

### Cascade Behavior

**ON DELETE CASCADE:**
- If a campaign is deleted, ALL entities in that campaign are deleted

**ON DELETE SET NULL:**
- If an NPC is deleted, their faction_id is cleared (not deleted)
- If a faction leader is deleted, faction.leader_id is set to NULL (faction remains)

---

## Knowledge Graph Integration

### The Four Graph Types

**1. World-Foundations Memory**
- **Purpose:** Core rules, magic systems, world constants
- **Sources:** Lore & History (world rules), World Rules (all entries), Custom Mechanics (fundamental systems)
- **Used by AI for:** Consistency enforcement ("Does this follow the world's magic rules?")
- **Visualization:** Not displayed (used for AI context only)

**2. Campaign-Story Memory**
- **Purpose:** Temporal timeline of events
- **Sources:** Session Recaps ONLY (canonical events)
- **Used by AI for:** "What has happened so far", timeline queries
- **Visualization:** Timeline chain on dashboard
- **CRITICAL:** Session Prep does NOT populate this graph

**3. Political-Web Memory**
- **Purpose:** Faction dynamics and NPC relationships
- **Sources:** NPCs (relationships), Factions (allied/rival relationships)
- **Used by AI for:** Social dynamics, "Who are X's allies?"
- **Visualization:** Interactive network graph on dashboard

**4. Geographical Memory**
- **Purpose:** Spatial relationships and location hierarchies
- **Sources:** Locations (parent/child, connected locations)
- **Used by AI for:** "Where is X relative to Y?", travel routes
- **Visualization:** Hierarchy tree on dashboard

### Graph Population Strategy

**Hybrid auto-population with review:** [Human note: We need to specify exactly HOW this auto-population is occurring. I'm expecting AI to do the noticing and connecting, not hard code, when doing things like importing notes or when using MCP tools conversationally to add/update/delete content as needed. My perfect system entails conversationally describing what goals you have for a memory system and AI helping you track specifically, or at least in a more nuanced approach to add everything, and the knowledge graphs are read and used frequently but not necessarily edited frequently with just additions and additions of content. I believe the memory graphs need to solve a user's expectations and desires instead of being "if you use these it will improve your AI!" my understanding is there is still some direction you must be giving the use case of a system or graph because otherwise it will just lead to weirdness if the graphs are unclear but also if it IS clear but you haven't updated the knowledge graphs and you've moved on in your story your planning or generation may be focused on old content. So there is a balancing act to be maintained and some benefits to auto-population. There's also considerations like visualization tools with the graphs. You could probably create a comprehensive and manageable political-web memory that may not be usable for an AI assistant to derive much meaning from BUT could be a useful visualization for a human user to see every connection and who's important in the story etc. CRITICAL NOTE: I don't believe the knowledge graphs are implemented yet, are they? I think I saw you mention they were ready but I'm not sure if that's the case.]

**On entity creation/update:**
1. System analyzes relationships in the entity
2. Suggests graph updates (nodes to add, edges to create)
3. Shows suggestion popup: "Political-Web updates: Add node Lord Blackwood, Add edge Blackwood ←rival→ Silverhand"
4. User can: [Accept] [Edit] [Skip]

**For Session Recaps (Campaign-Story):**
- Auto-population is safer (recaps are canon)
- System suggests: "Session 5 node created, Timeline: Session 4 → Session 5, Events link to Chrome Bishop"
- User can still review before accepting

**Storage:**
- Graphs stored in existing `knowledge_graphs` table (Feature 005/006)
- Nodes and edges stored as JSON
- Graph queries use JSON1 extension or load into memory for visualization

---

## Information Level Filtering

### The Four Default Levels

1. **Common Knowledge** - Everyone knows this (gods, major cities, common history)
2. **Player Known** - Players know from sessions (NPCs they've met, places visited)
3. **Secret** - Hidden but not DM-specific (secret faction agenda known to members)
4. **DM Only** - Purely DM knowledge (NPC's real identity, future plot hooks)

Human Addition will need clarification probably-> Content with a null information tier is not necessarily secret but not necessarily known by every NPCs. It is available for use by the player questions portal and should include things like descriptions of locations or "knowledge that is freely accessible if someone cares to ask".

### Custom Levels

Users can create custom levels:
- "Thieves' Guild Members Only"
- "Royal Court Knowledge"
- "Arcane Scholars"

**Stored in:** `information_levels` table (Feature 004)

### Filtering Rules

**Player Portal queries:**
```sql
SELECT * FROM npcs
WHERE campaign_id = ?
AND player_knowledge IN ('common_knowledge', 'player_known');
```

**DM view queries:**
```sql
SELECT * FROM npcs
WHERE campaign_id = ?;
-- No filtering, show all
```

**Field-level filtering:**
- Fields prefixed `dm_*` are ALWAYS filtered out in player view, regardless of entity's `player_knowledge`
- Example: Even if NPC has `player_knowledge: 'player_known'`, the `dm_secrets` field is hidden from players

### Enforcement

**Backend API layer:**
- All queries MUST include information level filtering
- Middleware checks `X-View-Mode` header (dm_view vs player_view)
- Responses filter out restricted content before sending

**AI tool layer:**
- MCP tools receive `view_mode` parameter
- Tools apply same filtering logic as API

---

## Session Prep vs Canon Isolation

### The Problem

**Without isolation:**
- GM creates Session 5 Prep: "Chrome Bishop will reveal his identity"
- AI sees this as fact
- AI updates NPC "Chrome Bishop" with new information
- But session hasn't happened yet!

**With isolation:**
- Session Prep marked `is_canon: false` and `canonical_status: 'hypothetical'`
- AI tools CANNOT use prep content to update canonical entities
- Only Session Recaps (`is_canon: true`) update canon

### System Enforcement

**In AI tool handlers:**
```typescript
async function updateNPC(params: {source_type, source_id, npc_id, updates}) {
  // Check source type
  const source = await getSource(params.source_type, params.source_id);

  // ENFORCE: Cannot update canon from prep
  if (source.canonical_status === 'hypothetical' && params.target_is_canon) {
    throw new Error('Cannot update canonical content from prep notes. Convert prep to recap first.');
  }

  // Proceed with update
  await db.update('npcs', params.npc_id, params.updates);
}
```

**In import workflows:** [Human Note: Should just ask the user to clarify if they are adding prep or canon content with a menu and not try and guess.]
```typescript
// User uploads "Session 5 Prep.pdf"
const importType = determineImportType(file); // Returns 'session_prep' or 'session_recap'

if (importType === 'session_prep') {
  // AI can ONLY create/update other prep notes
  allowedTargets = ['session_prep'];
} else if (importType === 'session_recap') {
  // AI can update canonical NPCs, Locations, etc.
  allowedTargets = ['npcs', 'locations', 'factions', 'quests', 'session_recaps'];
}
```

### User Workflow

**Before session:**
1. Create Session 5 Prep
2. Plan encounters, link NPCs to prep [Human Note: ONE WAY CONNECTION ONLY! ONLY VIEWABLE ON PREP DATABASE!]
3. Prep notes marked hypothetical

**After session:**
1. Create Session 5 Recap
2. Record what ACTUALLY happened
3. Recap marked canon
4. Campaign-Story graph updates from recap

**Both can coexist:**
- Prep: "Plan for Chrome Bishop reveal"
- Recap: "Chrome Bishop actually fled without revealing identity"
- AI uses Recap for context, ignores Prep

---

## Custom Fields System

### Purpose

Allow users to extend any category with custom fields without database migrations.

**Example:**
- User wants "Magical Affinity" field for NPCs
- User adds custom field: `{name: "magicalAffinity", type: "select", options: ["Fire", "Water", "Air", "Earth"]}`
- Field stored in `npcs.custom_fields` JSON: `{"magicalAffinity": "Fire"}`
- Field appears in NPC forms automatically

### Storage Format

**In `custom_fields` column (JSON):**
```json
{
  "magicalAffinity": "Fire",
  "threatLevel": "High",
  "lastSeenDate": "2025-01-05"
}
```

**Field Definition (stored per-campaign, per-category):**
```json
{
  "category": "npcs",
  "fields": [
    {
      "name": "magicalAffinity",
      "label": "Magical Affinity",
      "type": "select",
      "options": ["Fire", "Water", "Air", "Earth"],
      "required": false
    },
    {
      "name": "threatLevel",
      "label": "Threat Level",
      "type": "select",
      "options": ["Low", "Medium", "High"],
      "required": false
    }
  ]
}
```

**Stored in:** New `custom_field_definitions` table or campaign settings JSON

### Querying Custom Fields

**SQLite JSON1 extension:**
```sql
SELECT * FROM npcs
WHERE json_extract(custom_fields, '$.magicalAffinity') = 'Fire';
```

**Performance note:** Custom field queries are slower than column queries. Encourage users to use standard fields when possible.

### Best Practices (from spec)

**DO:**
- Add semantic value (e.g., "Magical Affinity" adds game-relevant info)
- Use structured data types (select, number, date)
- Clear field names
- Avoid redundancy with standard fields

**DON'T:**
- Create 20+ fields (information overload)
- Use vague names ("Stuff", "Notes")
- Duplicate existing standard fields
- Bury critical info in custom fields (use standard fields for important data)

---

## Tagging Principles

### Purpose

Tags create **cross-cutting themes** that connect content across different databases.

**Example:**
- Tag "Plot Critical" might appear on:
  - NPC "Chrome Bishop" (plot critical character)
  - Quest "Destroy the Dragon Cult" (plot critical quest)
  - Location "Hidden Laboratory" (plot critical location)
  - Session Recap "Session 12: The Reveal" (plot critical event)

**Value:** Filter by "Plot Critical" tag → see all essential campaign elements across categories

### Tag Discipline

**The Filter Test:**
Before adding a tag, ask: "If I filter by this tag, do I want THIS entry in the results?"

**DO tag:**
- ✅ Exceptional, not common (in a magical world, only tag "Magical" for exceptionally magical things)
- ✅ Narrative function (Plot Critical, Quest Hook, Red Herring)
- ✅ Cross-database themes (Political, Conspiracy, Ancient)

**DON'T tag:**
- ❌ Expected features (don't tag every dungeon as "Combat")
- ❌ Redundant info (if item_type is "Consumable", don't also tag "Consumable")
- ❌ Too granular ("Blue Eyes", "Wears Hats")

### Suggested Tag Categories [Human note: Still not in love with these tags. Consider a system that parses user notes for things like what intended theme the user is going for or asking the user outright and formatting things like tags appropriately for things like intended game feel.]

**Story Function:**
- Plot Critical
- Quest Hook
- Red Herring
- MacGuffin

**Conflict Type:**
- Political
- Personal
- Religious
- Economic
- Magical

**Atmosphere:**
- Mystery
- Horror
- Epic
- Tragic
- Comedic

**Status:**
- Active Threat
- Resolved
- Ongoing Investigation

**Thematic:**
- Conspiracy
- Technological
- Ancient
- Forbidden
- Cursed

**Implementation:**
- Tags stored as JSON array: `["plot_critical", "conspiracy", "political"]`
- Frontend shows as clickable chips
- Global search can filter by tags
- Tag autocomplete suggests existing tags

---

## Wiki Section

### Purpose

**What Wiki is for:**
- Unique world-building that doesn't fit structured categories
- Public-facing content for players and non-players
- Custom databases and tables within pages
- Narrative prose and lore documents

**What Wiki is NOT for:**
- Primary NPC/Location/Faction storage (use structured categories)
- AI context (AI relies on structured data + knowledge graphs)

### Relationship to Structured Categories

**Wiki can LINK to structured entities:**
```markdown
In the northern territories, the [[@Chrome Bishop]] leads the [[@Dragon Cult]].
```

**"Turn link into text" feature:**
- User selects `[[@Chrome Bishop]]`
- Clicks "Turn into text"
- System embeds NPC card data:
  ```
  Chrome Bishop (NPC)
  Race: Human | Class: Cleric | Faction: Dragon Cult
  Description: A mysterious religious figure with a cybernetic body...
  ```

**Wiki can have custom databases:** [Human Note: While databases may seem functional because they're already implemented and we should let the user have them if they wish to display something public about their campaign via a database, it should always been specified somewhere that WIKI CONTENT =/= CONTEXT USED BY WEBAPP SYSTEMS and is fundamentally separate so a user is free to manipulate the wiki how they desire without worrying about "how the AI understands it" and can do things like *lie* about a NPC's mentioned motivations for the public viewed page because their motivations are secret. etc. AI won't read the lie and consider it canon because it is part of the wiki. Because of this consider adding player edits to the wiki if they wish to build what they encounter in their sessions into the wiki.] 
- User creates page "Magic Items Catalog"
- Inserts database block (like Notion)
- Columns: Name, Rarity, Location, Notes
- This is separate from structured Items table

### Public-Facing Toggle

**Campaign setting:** "Allow players to view Wiki"
- If enabled, wiki pages respect `player_knowledge` filtering
- Pages marked `player_knowledge: dm_only` are hidden
- Links to NPCs with `dm_secrets` show public info only

**Use case:**
- GM creates wiki page "World History"
- Sets `player_knowledge: common_knowledge`
- Players can read it for lore immersion

### AI Interaction with Wiki

**AI can help build wiki:**
- "Create a wiki page summarizing Session 5"
- AI generates formatted page with headings, paragraphs

**AI does NOT use wiki for context:**
- Reason: Wiki content is unstructured, hard to parse consistently
- AI relies on structured categories + knowledge graphs for decision-making
- Wiki is human-readable documentation, not machine-queryable data

---

## Thematic Naming

### Purpose

Rename categories to fit campaign setting without changing underlying database structure.

**Example:**

| Category | High Fantasy | Cyberpunk | Sci-Fi | Modern |
|----------|--------------|-----------|--------|--------|
| Lore & History | "Lore" | "History" | "Archives" | "Background" |
| Planar Forces | "Pantheon" | (hidden) | "Factions" | "Beliefs" |
| Factions | "Kingdoms" | "Corporations" | "Colonies" | "Organizations" |
| Items | "Artifacts" | "Gear" | "Tech" | "Equipment" |
| Locations | "Realms" | "Districts" | "Sectors" | "Places" |

### Implementation

**Campaign settings table:**
```sql
CREATE TABLE campaign_settings (
  campaign_id TEXT PRIMARY KEY,
  theme TEXT, -- [high_fantasy, cyberpunk, sci_fi, modern, custom]
  category_labels TEXT, -- JSON: {"npcs": "Characters", "factions": "Corporations", ...}

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

**Frontend:**
- Displays label from `category_labels` JSON
- Sidebar shows "Corporations" instead of "Factions"

**Backend/AI:**
- Always uses internal name "factions"
- MCP tools expose "factions" schema
- Database table is always `factions`

**Result:**
- User sees "Corporations" in UI
- AI internally knows it's querying `factions` table
- Consistency maintained

---

## Migration Strategy

### Approach: Blank Slate (v1)

**For new campaigns:**
1. Campaign created with structured tables from day 1
2. Setup wizard guides category selection
3. No migration needed

**For existing campaigns (with cards):**
1. **Option A:** Keep cards as legacy wiki content
   - All existing cards move to Wiki section
   - User manually recreates important entities in structured categories
   - No automated migration

2. **Option B:** Offer migration tool (future, not v1)
   - Script attempts to categorize cards by metadata
   - Extract NPCs, Locations, Factions from cards
   - Populate structured tables
   - Show diff for user review before committing

**Recommendation for v1: Option A (blank slate)**
- Simpler implementation
- Avoids complex data transformation logic
- Users in testing phase don't have critical data to lose
- Migration tool can be Feature 017 if users request it

### Preserving Existing Work

**What stays:**
- `cards` table remains (repurposed for wiki)
- All existing card data preserved
- Users can still view old cards
- Old cards can be read-only or editable in wiki

**What changes:**
- New campaigns create structured tables
- Dashboard pulls from structured tables (not cards)
- Knowledge graphs read from structured tables

**Coexistence:**
- Both systems can run in parallel
- Old campaigns: cards-based
- New campaigns: structured tables
- No forced migration

---

## Feature Breakdown

### Feature 013: Structured Category Database System (Foundation)

**Scope:**
- Create 13 database tables with schemas
- Universal fields (name, description, status, player_knowledge, tags, custom_fields)
- Basic CRUD services for each category
- Relationship system (foreign keys, JSON arrays)
- Migration 14: Create all tables
- Backend services: NPCService, LocationService, FactionService, etc.
- REST API endpoints for CRUD operations
- **NO UI** (just API layer)

**Success Criteria:**
- Can create/read/update/delete entities in all 13 categories via API
- Relationships work (NPC → Faction, Location → Parent) [Human Note: ask for clarifications on this further if needed based on what I said above]
- Information level filtering enforced at query level
- Custom fields stored and retrieved correctly

**Non-goals:**
- Dashboard UI
- Knowledge graphs
- Campaign wizard
- Wiki linking

---

### Feature 014: Dashboard & Navigation UI

**Scope:**
- Dashboard homepage with 7 default widgets
- Sidebar navigation (4-type hierarchy)
- Category landing pages (stats, recent items, search/filter)
- Table view for all categories
- Entity detail pages
- Entity creation/edit forms

**Depends on:**
- Feature 013 (needs tables and APIs to exist)

**Success Criteria:**
- Dashboard renders with widgets pulling real data
- Sidebar navigation works
- Can view entities in table format
- Can create/edit entities via UI forms

**Non-goals:**
- Knowledge graph visualizations (Feature 015)
- Campaign wizard (Feature 016)
- Gallery/Board views (future)
- Modular widget customization (future)

---

### Feature 015: Knowledge Graph Integration

**Scope:**
- Graph creation wizards (World-Foundations, Campaign-Story, Political-Web, Geographical)
- Auto-population suggestions when entities created/updated
- Dashboard graph widgets (Political-Web network, Campaign-Story timeline, Geographical tree)
- Graph query API for AI tools

**Depends on:**
- Feature 013 (structured data to populate graphs)
- Feature 014 (dashboard to display graph widgets)
- Feature 005/006 (existing knowledge graph tables)

**Success Criteria:**
- World-Foundations wizard guides user through setup
- Creating NPC with faction suggests Political-Web update
- Graph widgets display on dashboard
- AI tools can query graphs for context

**Non-goals:**
- Manual graph editing (future)
- Graph versioning (future)
- Cross-graph queries (future)

---

### Feature 016: Campaign Setup Wizard

**Scope:**
- Campaign creation wizard with steps:
  1. Style selection (High Fantasy, Cyberpunk, Sci-Fi, Modern, Custom)
  2. Category toggles (enable/disable Planar Forces, Creatures)
  3. Knowledge graph selection (World-Foundations recommended)
  4. World-Foundations setup (magic system, tech level, constants)
- Thematic naming based on style
- Campaign settings persistence

**Depends on:**
- Feature 013 (categories to toggle)
- Feature 015 (World-Foundations wizard)

**Success Criteria:**
- New users guided through campaign setup
- Categories renamed based on style
- World-Foundations graph created during setup
- Campaign configured before first content added

**Non-goals:**
- Template campaigns (future)
- Multi-step tutorials (future)
- Importing starter content (future)

---

## Implementation Order

**Recommended sequence:** [Human Note: REALLY NEED TO CONSIDER OTHER FEATURES ORDER AND NOT JUST NEW STUFF]

1. **Feature 013** (Database Foundation) - 1-2 weeks
   - Blocking: Nothing (can start immediately)
   - Delivers: API layer for all 13 categories

2. **Feature 014** (Dashboard & UI) - 2-3 weeks
   - Blocking: Feature 013 (needs APIs)
   - Delivers: User-facing interface

3. **Feature 015** (Knowledge Graphs) - 1-2 weeks
   - Blocking: Features 013, 014 (needs data and dashboard)
   - Delivers: Graph visualizations and AI context

4. **Feature 016** (Campaign Wizard) - 1 week
   - Blocking: Features 013, 015 (needs categories and World-Foundations)
   - Delivers: Onboarding experience

**Total: 5-8 weeks for full hybrid system**

---

## Open Questions / Decisions Needed

1. **Custom category creation in v1?**
   - Current answer: No, use Wiki for custom content
   - Could revisit if users strongly request

2. **Junction tables for relationships?**
   - Current answer: Use JSON arrays (simpler)
   - Could add junction tables if performance issues arise

3. **Migration tool priority?**
   - Current answer: Not in v1 (blank slate approach)
   - Could be Feature 017 if users have critical data to migrate [Human Note: There are no users. This is all a test build and the only user is me lol]

4. **Gallery/Board views?**
   - Current answer: Not in v1 (Table view only) [Human Note: Should at least prepare architecture/components for other views like the button you'll press to toggle to the other view etc.]
   - Future Phase 2 enhancement

5. **Real-time collaboration?**
   - Current answer: Not in scope [Human Note: This is a test build yea just focusing on getting it working is #1, but at least give guidance on if this feature needs to be included in REAL PRODUCT LAUNCH considerations just due to the architectural challenges of a live session editing being fundamentally different than running it locally like I am right now testing.] 
   - Future consideration for multi-GM campaigns

---

## References

- **Original Categories Document:** User-provided comprehensive schema specification
- **Feature 005:** Knowledge Graphs (existing)
- **Feature 004:** Information Level Filtering (existing)
- **Feature 003:** Card System (to be repurposed for Wiki)

---

**END OF ARCHITECTURE DOCUMENT**
