# AI Context Reference Guide
**Wrldbldr MCP Manager - Database Schema, MCP Tools, and Knowledge Graphs**

---

## 1. Database Schemas (13 Categories)

All categories share **universal fields** plus category-specific fields. Database is the **source of truth** for all campaign data.

### Universal Fields (All Categories)

```
id                  TEXT PRIMARY KEY (UUID)
campaign_id         TEXT (foreign key → campaigns)
name                TEXT (required)
description         TEXT
core_status         TEXT (active|archived|draft|hidden)
player_knowledge    TEXT (common_knowledge|partial|dm_only)
tags                TEXT[] (JSON array)
created_at          INTEGER (unix timestamp)
updated_at          INTEGER (unix timestamp)
custom_fields       TEXT{} (JSON object)
```

---

### 1.1 NPCs (Non-Player Characters)

**Purpose**: Track all non-player characters in the campaign.

**Category-Specific Fields**:
```
race                    TEXT
class                   TEXT[] (JSON array, supports multi-class)
level                   INTEGER
alignment               TEXT
appearance              TEXT
personality_traits      TEXT
motivation              TEXT
relationship_to_party   TEXT
met_party               INTEGER (0/1 boolean)
art                     TEXT (image URL or path)
```

**Explicit Relationships (Foreign Keys)**:
```
faction_id          TEXT → factions.id (SET NULL on delete)
superior_npc_id     TEXT → npcs.id (SET NULL on delete, self-referential)
```

**Many-to-Many (JSON Arrays)**:
```
locations           TEXT[] (location IDs)
```

**DM-Only Fields**:
```
dm_secrets          TEXT
dm_plot_relevance   TEXT
```

---

### 1.2 Locations

**Purpose**: Track places, regions, cities, dungeons, and geographical areas.

**Category-Specific Fields**:
```
location_type               TEXT (city, dungeon, wilderness, region, etc.)
population                  INTEGER
cultural_characteristics    TEXT
map                         TEXT (image URL or path)
```

**Explicit Relationships (Foreign Keys)**:
```
parent_location_id      TEXT → locations.id (SET NULL, hierarchical nesting)
```

**Many-to-Many (JSON Arrays)**:
```
notable_npcs            TEXT[] (NPC IDs)
factions_present        TEXT[] (Faction IDs)
connected_locations     TEXT[] (Location IDs for travel routes)
```

**DM-Only Fields**:
```
dm_secrets              TEXT
```

---

### 1.3 Factions

**Purpose**: Track organizations, guilds, political groups, and alliances.

**Category-Specific Fields**:
```
faction_type        TEXT (guild, political, religious, criminal, etc.)
power_level         TEXT
resources           TEXT
beliefs             TEXT
goals               TEXT
methods             TEXT
```

**Explicit Relationships (Foreign Keys)**:
```
leader_id           TEXT → npcs.id (SET NULL)
```

**Many-to-Many (JSON Arrays)**:
```
key_members         TEXT[] (NPC IDs)
allied_factions     TEXT[] (Faction IDs)
rival_factions      TEXT[] (Faction IDs)
territory           TEXT[] (Location IDs)
```

**DM-Only Fields**:
```
dm_true_agenda      TEXT
```

---

### 1.4 Quests

**Purpose**: Track objectives, missions, and story goals.

**Category-Specific Fields**:
```
status              TEXT (not_started|in_progress|completed|failed)
objectives          TEXT[] (JSON array)
rewards             TEXT
```

**Explicit Relationships (Foreign Keys)**:
```
quest_giver_id          TEXT → npcs.id (SET NULL)
started_session_id      TEXT → session_recaps.id (SET NULL)
completed_session_id    TEXT → session_recaps.id (SET NULL)
```

**Many-to-Many (JSON Arrays)**:
```
related_npcs        TEXT[] (NPC IDs)
related_locations   TEXT[] (Location IDs)
```

**DM-Only Fields**:
```
dm_true_objective   TEXT
dm_consequences     TEXT
```

---

### 1.5 Session Recaps

**Purpose**: Record summaries of completed game sessions (always canonical).

**Category-Specific Fields**:
```
session_date            INTEGER (unix timestamp)
in_game_date_start      TEXT
in_game_date_end        TEXT
time_passed             TEXT
summary                 TEXT
key_events              TEXT[] (JSON array)
player_decisions        TEXT[] (JSON array)
```

**Canonical Markers** (hardcoded):
```
is_canon                INTEGER (always 1)
canonical_status        TEXT (always 'canon')
```

**Many-to-Many (JSON Arrays)**:
```
npcs_encountered        TEXT[] (NPC IDs)
locations_visited       TEXT[] (Location IDs)
quests_progressed       TEXT[] (Quest IDs)
loot_acquired           TEXT[] (Item IDs)
```

**DM-Only Fields**:
```
dm_consequences         TEXT
dm_behind_scenes        TEXT
```

---

### 1.6 Session Prep

**Purpose**: Plan upcoming sessions (always hypothetical, DM-only).

**Category-Specific Fields**:
```
planned_date            INTEGER (unix timestamp)
status                  TEXT (draft|ready|completed|cancelled)
planned_events          TEXT
possible_encounters     TEXT
plot_hooks              TEXT
dm_notes                TEXT
```

**Canonical Markers** (hardcoded):
```
is_canon                INTEGER (always 0)
canonical_status        TEXT (always 'hypothetical')
player_knowledge        TEXT (always 'dm_only')
```

**One-Way JSON Connections** (NOT foreign keys, stale IDs acceptable):
```
plot_threads            TEXT[]
npcs_to_prep            TEXT[] (NPC IDs)
locations_to_prep       TEXT[] (Location IDs)
```

---

### 1.7 Player Characters

**Purpose**: Track the player party roster.

**Category-Specific Fields**:
```
player_name         TEXT
class               TEXT[] (JSON array, multi-class)
level               INTEGER
race                TEXT
background          TEXT
personality         TEXT
goals               TEXT
backstory           TEXT
art                 TEXT (image URL or path)
```

**Many-to-Many (JSON Arrays)**:
```
faction_affiliations    TEXT[] (Faction IDs)
allied_npcs             TEXT[] (NPC IDs)
```

**DM-Only Fields**:
```
dm_secrets              TEXT
dm_plot_threads         TEXT
dm_true_motivation      TEXT
dm_consequences         TEXT
```

---

### 1.8 Lore Entries

**Purpose**: Track world history, legends, and knowledge.

**Category-Specific Fields**:
```
category                TEXT (history, legend, mythology, etc.)
era_period              TEXT
in_game_date            TEXT
historical_accuracy     TEXT
```

**Many-to-Many (JSON Arrays)**:
```
related_npcs            TEXT[] (NPC IDs)
related_locations       TEXT[] (Location IDs)
related_factions        TEXT[] (Faction IDs)
```

---

### 1.9 World Rules

**Purpose**: Document custom mechanics, homebrew rules, and campaign-specific systems.

**Category-Specific Fields**:
```
rule_type           TEXT (mechanic, spell, ability, system, etc.)
exceptions          TEXT
```

**Many-to-Many (JSON Arrays)**:
```
related_rules       TEXT[] (World Rule IDs, self-referential)
```

---

### 1.10 Planar Forces

**Purpose**: Track gods, cosmic entities, and otherworldly powers.

**Category-Specific Fields**:
```
entity_type         TEXT (deity, demon lord, celestial, etc.)
domains             TEXT[] (JSON array)
alignment           TEXT
worshiper_base      TEXT
plane_of_origin     TEXT
base_of_power       TEXT
```

**Explicit Relationships (Foreign Keys)**:
```
high_priest_id      TEXT → npcs.id (SET NULL)
```

**Many-to-Many (JSON Arrays)**:
```
allied_entities     TEXT[] (Planar Force IDs)
rival_entities      TEXT[] (Planar Force IDs)
religious_orders    TEXT[] (Faction IDs)
```

**DM-Only Fields**:
```
dm_true_nature      TEXT
```

---

### 1.11 Custom Mechanics

**Purpose**: Track homebrew game mechanics and custom rules.

**Category-Specific Fields**:
```
mechanic_type       TEXT
rules_text          TEXT
prerequisites       TEXT
source              TEXT
```

**Many-to-Many (JSON Arrays)**:
```
related_rules       TEXT[] (World Rule IDs)
```

---

### 1.12 Items

**Purpose**: Track equipment, magic items, and treasures.

**Category-Specific Fields**:
```
item_type           TEXT (weapon, armor, consumable, artifact, etc.)
rarity              TEXT
properties          TEXT
value               TEXT
```

**Explicit Relationships (Foreign Keys)**:
```
owner_npc_id        TEXT → npcs.id (SET NULL)
owner_pc_id         TEXT → player_characters.id (SET NULL)
location_id         TEXT → locations.id (SET NULL)
```

**DM-Only Fields**:
```
dm_secret_properties    TEXT
dm_true_nature          TEXT
```

---

### 1.13 Creatures

**Purpose**: Bestiary of monsters and creatures.

**Category-Specific Fields**:
```
creature_type       TEXT (beast, dragon, undead, etc.)
challenge_rating    TEXT
abilities           TEXT
```

**Many-to-Many (JSON Arrays)**:
```
habitats            TEXT[] (Location IDs)
```

**DM-Only Fields**:
```
dm_behavior_notes   TEXT
```

---

## 2. MCP Tool Documentation

**What is MCP?** Model Context Protocol (Anthropic's official SDK) provides structured AI tool calls for Feature 005's Import/Planning AI workflows.

### 2.1 Card Operations (6 tools)

**Cards** are the wiki-style content organization system from Feature 003.

| Tool | Description | Capabilities |
|------|-------------|--------------|
| `read_card` | Read a campaign card by ID | Get title, content (ProseMirror JSON), metadata, hierarchy position |
| `create_card` | Create new card | Create text/database/map cards with hierarchy validation |
| `update_card` | Update card | Modify title, content, or information level |
| `delete_card` | Delete card | Delete with protection against orphaning children |
| `search_cards` | Search cards | Fuzzy text search with filtering (type, parent, info level) |
| `move_card` | Move card | Change parent with circular reference detection |

---

### 2.2 Database Card Operations (3 tools)

**Database cards** are structured tables within the wiki (NPC rosters, quest logs, etc.).

| Tool | Description | Capabilities |
|------|-------------|--------------|
| `query_database_card` | Query rows in database card | Filter, sort, paginate structured data |
| `create_database_entry` | Add row to database | Create new entries with schema validation |
| `update_database_entry` | Update row | Partial updates with schema validation |

---

### 2.3 Knowledge Graph Operations (4 tools)

**Knowledge graphs** are AI context layers (Political-Web, Geographical, World-Foundations, Campaign-Story).

| Tool | Description | Capabilities |
|------|-------------|--------------|
| `query_graph` | Query knowledge graph | Get nodes and edges by type, name, or relationship |
| `list_graph_nodes` | List all nodes | Get full node list with optional active filtering |
| `get_node_relationships` | Get node edges | Trace relationships (incoming/outgoing) |
| `update_graph` | Atomic graph mutation | Add/update/delete nodes and edges in single operation |

**Graph Types**:
- **World-Foundations**: Core world-building (magic systems, pantheons, cosmology)
- **Political-Web**: Active party-relevant political relationships
- **Geographical**: Locations and spatial relationships
- **Campaign-Story**: Story threads, events, narrative timeline
- **Custom**: User-defined graph types (custom:{type})

---

### 2.4 Session Recap Queries (2 tools)

| Tool | Description | Capabilities |
|------|-------------|--------------|
| `get_session_recaps` | Get session history | Fetch recaps with date range and pagination |
| `get_timeline_events` | Extract timeline | Get chronological key events from recaps |

---

### 2.5 Hierarchy Navigation (5 tools)

Navigate the card tree structure:

| Tool | Description |
|------|-------------|
| `get_card_path` | Get breadcrumb path from root to card |
| `get_subtree` | Get all descendants of a card |
| `get_children` | Get immediate children |
| `get_siblings` | Get sibling cards at same level |
| `get_ancestor_chain` | Get all parent cards up to root |

---

### 2.6 Information Level Discovery (2 tools)

**Information levels** are Feature 004's DM/Player visibility system.

| Tool | Description |
|------|-------------|
| `list_information_levels` | Get all info levels for campaign |
| `get_level_by_name` | Get specific level by name (e.g., "Player Knowledge") |

---

### 2.7 Map Card Operations (2 tools)

**Map cards** are Feature 007's interactive maps with pins/zones.

| Tool | Description |
|------|-------------|
| `list_map_pins` | Get all pins on a map card |
| `create_map_pin` | Add pin to map with coordinates |

---

### 2.8 MCP Resources (3 browsable)

**Resources** are browsable datasets Claude can explore:

| Resource | URI | Description |
|----------|-----|-------------|
| Campaign Cards | `campaign://cards` | Browse full card tree |
| Session Recaps | `campaign://recaps` | Browse session history |
| Knowledge Graphs | `campaign://graphs` | Browse all graph types |

---

### 2.9 MCP Prompts (2 templates)

**Prompts** are AI workflow templates:

| Prompt | Description |
|--------|-------------|
| `import_workflow` | Template for Import AI session (file upload → entity extraction → approval) |
| `planning_workflow` | Template for Planning AI session (chat → immediate graph updates) |

---

## 3. Example Notes Space

════════════════════════════════════════════════════════════ 

SESSION [15] - [Veilshard’s Way] 

════════════════════════════════════════════════════════════STORY SO FAR: The party was expertly fleeced of their information by Galik Emberfuse who is quite smug with himself and proud of Jeffery, his assistant, for such a successful catch. The party left with plans of revenge and establishing themselves more in the chaotic lifestyle of Veilshard. The opportunity of the city is undeniable but many fall chasing the high life.

IMMEDIATE SITUATION: The group has just left Galik’s party and may search for a tavern to coop up. They seek to settle themselves in the city just enough to maybe stake their claim.

CURRENT PARTY STATUS: 
- Location: Veilshard, Ironhollow
- Active Quests: None, but opportunity is ripe in the city.  
- Party Resources/Items: Previous equipment 
- NPC Relationships: Galik Emberfuse - Unfriendly, Varzai - Neutral 

THIS SESSION'S GOALS: 
- Primary objective: Establish themselves in Veilshard. Get a job going and some income.
- Secondary objectives: Find out more information about the writ holders. Individual schemes
- Optional encounters: [Things that might happen] 

NPCS THIS SESSION: 
Too many possible NPCs to list, but there is a goal and actions for 4 of the 8 writholders with a consequence at the end of the week. 

POTENTIAL ENCOUNTERS: 
- Combat: Combat possible during Carp’s guild of the writless quest (crime)
- Social: Many many opportunities as the city is completely open to the players finally
- Exploration: There are 8 separate burgs to explore and 8 different leaders to meet.

DM NOTES: 
- Rules reminders: Using a mix of dnd 5e and princes system
- Player-specific hooks: The echo splice recorder may be discovered to be a monitoring tool this session.
- Consequences from previous sessions: Negative relationship start with Galik Emberfuse

════════════════════════════════════════════════════════════ 

Recap: 

Last time we were with our heroes they had journeyed toward the town of Karburn, after seeing the western portion of it aflame. Making their way across the bridge, to the western gate, they aided the townsfolk and local guard in dousing the fires. After saving a man named Fenn, who owned a tavern in town, they battled against two Goblin Flameskulls - the cause of the fires. They received pay, and met with the Half-Fullers brewer’s guild owner - Mr. Hops. They made a deal to retrieve Kruthik eggs in exchange for gold, and found a place to rest their heads - Fenn’s own tavern. 

---

Narration: Waking up in the Tumbledown Bullywug, where did each of you stay? Skold, where did you wake up? Downstairs, breakfast isn’t really served. No one is here at this hour, and Fenn is clearing away. 

Market is being erected in eastern side of town. Western there’s a lot of people helping rebuild and clear rubble. The fire was quenched shortly after their battle. 

--

If Silk is questioned: Hob the Goblin, his cousin. Big family. He was exiled because he was meant to take over the clan, and his plan was to march them north to the sistercliffs (where he was found). He was a part of the Fallrock clan. He hated how little land they had to hunt, and the Underdark consistently pestered them. 

---

The Old Crown inn and tavern is one of the oldest buildings in Karburn, but has a lot of refurbishment since the war. Comfortable and clean inside. 

Very tall, skinny human woman named Aphey. She’s awkward and crushes on Basil.

----

The Town Hall is not exceptionally large, but has a waiting room and a few people inside. QUEST x2

Guards stationed all about. There’s a bar that serves waiting customers, almost like a private tavern. The waiter is a little too well dressed, and can also lead people upstairs.

==================

The Goblin Camp

Benjen explaining the goblin threat. They’re mostly in the mountains, but there’s an assortment of them that have been harassing the fishermen. The fire has been the boldest thing they’ve done, but until then they’ve been sending out scouts to try and set fire to fishing boats or fire arrows upon them before scuttling back to the mountain. There’s a camp of them in the woods that they’ve been meaning to clear, and will soon, but he needs his soldiers back home. (silk would know the leader of this group as Goblin translated to Spit, it’s a red haired Bugbear)

If they head west along the riverbank, they’ll reach the site where the fishermen don’t stray past. 

They’ll have to track the goblins as they move around this part of the woodland.

If they find out where the camp is, they can fight or try and convince the goblins to come out and win allies. Some goblins are turned to stone, and the others are having fun by practising arrows at them. A caged rattled, with a cloth over it. 

The Fishermen’s Woe

Alvid would explain the terror of the Shaking Shipwreck. He was fishing in the pier by the old lighthouse. His friend, a younger, blonde man, got attacked by a figure. They couldn’t see who!

---

Goblin Camp loot:

Official: 150 gold. 

At the camp: Any goblin set of ears. 30g a piece. 40g for the bugbear.

Various food supplies. Also 42 gold can be found around camp

Stone pile (pebble and wetstone)

---

## 4. Knowledge Graph Structure

### 4.1 Graph Types and Purpose

| Graph Type | Purpose | When to Create | Example Nodes |
|------------|---------|----------------|---------------|
| **World-Foundations** | Core worldbuilding (created by default) | Campaign start | Magic System, Deity, Plane, Species, Fundamental Rule |
| **Political-Web** | Active political relationships (user-created) | When intrigue/factions become important | NPC, Faction, Organization |
| **Geographical** | Spatial relationships (user-created) | When travel/logistics matter | Continent, Region, City, Dungeon |
| **Campaign-Story** | Narrative threads (user-created) | When tracking story arcs | Story Thread, Event, Quest, Character Arc |
| **Custom:{type}** | User-defined | Any specialized need | Completely custom node types |

---

### 4.2 Graph Node Structure

```json
{
  "id": 42,
  "name": "Lord Neverember",
  "node_type": "NPC",
  "attributes": {
    "role": "Open Lord of Waterdeep",
    "motivation": "Maintain power, expand influence",
    "current_location": "Waterdeep",  // Cross-graph observation
    "party_relationship": "Distrustful ally"
  },
  "information_level_id": null  // Visible to players
}
```

---

### 4.3 Graph Edge Structure

```json
{
  "id": 123,
  "from_node_id": 42,  // Lord Neverember
  "to_node_id": 88,     // Zhentarim faction
  "relationship_type": "secretly affiliated with",
  "attributes": {
    "strength": "moderate",
    "discovered_by_party": false
  }
}
```

---

### 4.4 Graph Relationships by Type

**Political-Web Example Edges**:
- "allied with", "opposes", "controls", "influences", "secretly affiliated with", "rival of"

**Geographical Example Edges**:
- "contains", "adjacent to", "travel distance", "ruled by", "connected via"

**World-Foundations Example Edges**:
- "governed by", "connected to", "belongs to", "derives from", "worshipped by"

**Campaign-Story Example Edges**:
- "leads to", "caused by", "conflicts with", "resolves", "references", "foreshadows"

---

### 4.5 Cross-Graph Context via Observations

**Problem**: Hard-linking graphs creates tight coupling and complexity.

**Solution**: Free-form observations in node attributes enable cross-graph references.

**Example**:

Political-Web node for "Lord Neverember" includes:
```json
{
  "attributes": {
    "current_location": "Waterdeep"  // References Geographical graph
  }
}
```

When Planning AI processes this with both Political-Web and Geographical graphs toggled on:
1. Reads "current_location: Waterdeep" observation
2. Queries Geographical graph for Waterdeep node
3. Combines political context + geographic context in response

**Key Principle**: AI interprets observations; no rigid schema required.

---

## 5. How AI Builds Context: Databases vs Knowledge Graphs

### 5.1 The Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI CONTEXT BUILDING                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │    DATABASES     │              │ KNOWLEDGE GRAPHS │        │
│  │  (Source of      │              │  (Focus Layer)   │        │
│  │   Truth)         │              │                  │        │
│  └────────┬─────────┘              └────────┬─────────┘        │
│           │                                  │                  │
│           │ All campaign data                │ Distilled        │
│           │ (13 categories)                  │ relationships    │
│           │ Foreign keys                     │ for AI context   │
│           │ Full details                     │                  │
│           │                                  │                  │
│  ┌────────▼──────────────────────────────────▼─────────┐        │
│  │              PLANNING AI QUERY                      │        │
│  │  "What happens if party exposes Neverember's        │        │
│  │   Zhentarim ties?"                                  │        │
│  └────────┬───────────────────────────────────────────┘        │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────────┐            │
│  │  CONTEXT ASSEMBLY PROCESS                       │            │
│  │                                                 │            │
│  │  1. Check Political-Web graph toggle: ON       │            │
│  │  2. Query Political-Web: Neverember node       │            │
│  │     → "secretly affiliated with" → Zhentarim   │            │
│  │  3. Follow edges: Zhentarim → City Watch       │            │
│  │  4. Read observation: "current_location:       │            │
│  │     Waterdeep"                                 │            │
│  │  5. Check Geographical graph toggle: ON        │            │
│  │  6. Query Geographical: Waterdeep node         │            │
│  │     → "contains" → Noble District              │            │
│  │  7. Fetch full details from DATABASES:         │            │
│  │     - NPC: Lord Neverember (faction_id)        │            │
│  │     - Faction: Zhentarim (goals, methods)      │            │
│  │     - Faction: City Watch (members[])          │            │
│  │     - Location: Waterdeep (factions_present[]) │            │
│  │  8. Fetch Session Recaps: "last 5 sessions"    │            │
│  │     (timeline context)                         │            │
│  │  9. Combine: Political relationships +         │            │
│  │     Geographic context + Full NPC details +    │            │
│  │     Recent session history                     │            │
│  └─────────────────────────────────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Key Principles

#### Databases = Source of Truth
- **All** campaign data stored in 13 categories
- Full entity details (descriptions, stats, dm_notes)
- Foreign key relationships (explicit connections)
- JSON array relationships (many-to-many)
- **Import AI** writes here (via approval workflow)
- **Planning AI** reads here for entity details

#### Knowledge Graphs = Focus Layer
- **Distilled** relationships for AI context
- User defines what's important for planning
- Lean and focused (avoid over-engineering)
- Toggle controls per graph (enable/disable AI access)
- **Planning AI** reads + writes here (immediate updates)
- **Import AI** read but may not write (to avoid adding unnecessary bulk to knowledge graph. focused on one import to the database, keep graphs clean)

---

### 5.3 Example Workflow: Managing Faction Dynamics

**Scenario**: GM wants Planning AI to help with political intrigue.

#### Step 1: Database Foundation (Import AI)
1. Import session recap → Creates NPCs, Factions, Locations in databases
2. Foreign keys automatically link: `NPC.faction_id → Faction.id`
3. Full details stored: NPC descriptions, Faction goals, Location descriptions

#### Step 2: Graph Creation (Planning AI)
1. GM: "Create a Political-Web graph for Waterdeep intrigue"
2. Planning AI guides: "Which NPCs/factions should I track?"
3. GM defines nodes:
   - Lord Neverember (NPC node)
   - Zhentarim (Faction node)
   - City Watch (Faction node)
   - Harpers (Faction node)
4. Planning AI asks: "What relationships exist?"
5. GM defines edges:
   - Neverember → "secretly affiliated with" → Zhentarim
   - Harpers → "opposes" → Zhentarim
   - Zhentarim → "infiltrates" → City Watch

#### Step 3: Planning Query (Planning AI)
GM: "What happens if party exposes Neverember's Zhentarim ties?"

**AI Process**:
1. **Graph Query**: Political-Web toggled ON
   - Reads Neverember node
   - Follows "secretly affiliated with" edge → Zhentarim
   - Finds Zhentarim → "infiltrates" → City Watch
   - Finds Harpers → "opposes" → Zhentarim

2. **Database Query**: Fetch full details
   - `SELECT * FROM npcs WHERE name = 'Lord Neverember'` → motivation, personality, dm_secrets
   - `SELECT * FROM factions WHERE name = 'Zhentarim'` → goals, methods, dm_true_agenda
   - `SELECT * FROM factions WHERE name = 'Harpers'` → goals, methods

3. **Context Assembly**:
   - Graph provides: **WHAT relationships to focus on** (Neverember-Zhentarim-CityWatch triangle)
   - Database provides: **FULL details** (motivations, goals, secrets, descriptions)
   - Session Recaps provide: **timeline context** (what party already knows)

4. **AI Response**:
   - Traces cascading consequences through graph relationships
   - Enriches with full entity details from database
   - Suggests plot developments consistent with faction goals

---

### 5.4 Why This Architecture?

#### Problem: Context Window Limits
- Can't fit all 50 NPCs, 30 locations, 15 factions into every query
- Need to focus AI on **what's relevant right now**

#### Solution: Graphs as Focus Layer
- Political-Web: "These 8 NPCs/factions are party-relevant for intrigue"
- Campaign-Story: "These 5 story threads are active and unresolved"
- Geographical: "These 6 locations are currently important"

#### Toggle Controls
- **Toggle ON** = AI can query and update this graph
- **Toggle OFF** = AI ignores this graph (no context pollution)
- Example: Toggle off Campaign-Story when discussing pure worldbuilding

#### Active Filtering
- Political-Web: Hybrid time-based (last 5 sessions) + tag-based ("active", "party-relevant")
- Campaign-Story: Only unresolved story threads
- Geographical: Regions party has interacted with

---

### 5.5 Import AI vs Planning AI

| Feature | Import AI | Planning AI |
|---------|-----------|-------------|
| **Purpose** | Ingest content into databases | Plan sessions and build graphs |
| **Databases** | ✅ Writes (via approval) | ✅ Reads (for entity details) |
| **Graphs** | ❌ Never touches | ✅ Reads + Writes |
| **Workflow** | Upload file → Extract entities → Approve → Write to DB | Chat → Query graphs + DB → Suggest content → Update graphs on request |
| **User Approval** | Required before writing | Required before writing |

---

### 5.6 Context Engineering Best Practices

#### 1. Keep Graphs Lean
- ❌ Bad: 50 NPC nodes in Political-Web
- ✅ Good: 8 party-relevant NPCs in Political-Web

#### 2. Use Observations for Cross-Graph Context
- ❌ Bad: Hard-link Political-Web nodes to Geographical nodes
- ✅ Good: Add "current_location: Waterdeep" observation, let AI interpret

#### 3. Stay in Your Lane
- Political-Web: Political relationships only (not locations)
- Geographical: Spatial relationships only (not politics)
- World-Foundations: Core worldbuilding only (not current events)
- Campaign-Story: Narrative threads only (not static lore)

#### 4. Prune Resolved Content
- Archive completed quests from Campaign-Story
- Remove defeated NPCs from Political-Web (unless consequences linger)
- Use graduated detail retention (recent = full detail, distant = merged summary)

#### 5. Use Toggle Controls
- Discussing pure mechanics? Toggle off Political-Web and Campaign-Story
- Planning session intrigue? Toggle on Political-Web and Geographical
- Building new pantheon? Toggle on World-Foundations only

---

## 6. Data Flow Summary

```
┌─────────────────────────────────────────────────────────┐
│                   CONTENT INGESTION                     │
│                                                         │
│  User uploads session recap (Import AI)                │
│         ↓                                               │
│  LLM extracts: NPCs, Locations, Factions, Quests       │
│         ↓                                               │
│  User approves                                          │
│         ↓                                               │
│  Writes to DATABASES (13 categories)                   │
│         ↓                                               │
│  Databases = Source of Truth                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   PLANNING CONTEXT                      │
│                                                         │
│  User: "Create Political-Web graph" (Planning AI)      │
│         ↓                                               │
│  Planning AI guides graph creation                      │
│         ↓                                               │
│  User defines nodes, edges, observations                │
│         ↓                                               │
│  KNOWLEDGE GRAPH created (focus layer)                 │
│         ↓                                               │
│  User toggles graph ON                                  │
│         ↓                                               │
│  User: "What if party exposes Neverember?"             │
│         ↓                                               │
│  Planning AI:                                           │
│    1. Queries GRAPH (what to focus on)                 │
│    2. Queries DATABASES (full entity details)          │
│    3. Queries SESSION RECAPS (timeline context)        │
│    4. Combines all context                             │
│         ↓                                               │
│  AI response with cascading consequences                │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Quick Reference

### Database Query Example
```sql
-- Get all Harpers NPCs in Waterdeep
SELECT n.* FROM npcs n
WHERE n.faction_id = (SELECT id FROM factions WHERE name = 'Harpers')
AND n.locations LIKE '%waterdeep-id%'
AND n.player_knowledge != 'dm_only'
ORDER BY n.met_party DESC;
```

### MCP Tool Call Example
```json
{
  "tool": "query_graph",
  "input": {
    "campaign_id": "abc123",
    "graph_type": "Political-Web",
    "node_name": "Lord Neverember",
    "active_only": true
  }
}
```

### Graph Update Example
```json
{
  "tool": "update_graph",
  "input": {
    "campaign_id": "abc123",
    "graph_type": "Political-Web",
    "operation": "add_edge",
    "edge_data": {
      "from_node": "Lord Neverember",
      "to_node": "Zhentarim",
      "relationship_type": "secretly affiliated with",
      "attributes": {
        "strength": "moderate",
        "discovered_by_party": false
      }
    }
  }
}
```

---

## 8. Revision History

| Date | Change |
|------|--------|
| 2025-10-13 | Initial documentation created for Feature 015 planning |

---

**End of AI Context Reference Guide**
