# Political-Web Memory: Complete Implementation Guide

## What is Political-Web Memory?

Political-Web memory tracks **who knows who, who influences whom, and how power flows** through your campaign's social landscape. Unlike other memories that track physical locations or immutable facts, Political-Web captures the living, breathing network of relationships that drive political intrigue, social dynamics, and character-driven storytelling.

---

## Why Use Political-Web Memory?

### Problem It Solves
You're 30 sessions into your campaign. Your players ask: "Who can help us get an audience with the High Mage?"

Without Political-Web, you're flipping through notes trying to remember:
- Who knows whom
- Who owes favors
- Who has political leverage
- Which factions are allied or opposed

With Political-Web, you visualize the **entire social network** at a glance and trace connection paths from your party to any NPC.

---

## Ring System (Party-Centric Layout)

Political-Web uses a **security ring model** where your party is at the center and entities are positioned in concentric rings based on their hierarchical importance:

| Ring | Radius | Entities | Color Guide | Purpose |
|------|--------|----------|-------------|---------|
| **Ring 0** | 0-50px | Party/PCs | 🟡 Gold (Party Green #10b981) | Party members locked at center - the reference frame |
| **Ring 1** | 75-125px | Faction Nodes | 🔵 Blue (varies by faction) | Collapsed factions - click to expand members |
| **Ring 2** | 125-150px | Leadership | 🔴 Red indicators | Faction leaders, BBEGs (NPC:leader) |
| **Ring 2.5** | 150-200px | Lieutenants | 🟠 Orange indicators | Second-in-command, advisors (NPC:lieutenant) |
| **Ring 3** | 200-250px | Members | 🟢 Green indicators | Common faction members (NPC:member, NPC:minor) |

**Node Type Hierarchy** (determines ring placement):
- `PC` → Ring 0 (locked, always visible when Party expanded)
- `NPC:leader` → Ring 2 (125-150px, closest to faction core)
- `NPC:lieutenant` → Ring 2.5 (150-200px, mid-level command)
- `NPC:member` → Ring 3 (200-250px, common members)
- `NPC:minor` → Ring 3 (200-250px, one-off NPCs)
- `NPC:mentioned` → Ring 3 (200-250px, not yet met)

**Special Cases**:
- **Tanner (PC + Writ Holder)**: Stays in Ring 0, gains metaball overlay when Nine Writs expanded
- **Unaffiliated NPCs**: Grouped under "Unaffiliated" faction for visibility
- **Standard Template Members (NPC:STM)**: Generated members using faction template

### Use Cases

**1. Intrigue-Heavy Campaigns**
- Court politics and noble houses
- Criminal underworld power struggles
- Religious schisms and theological debates
- Corporate espionage and trade wars

**2. Relationship-Driven Stories**
- Romance subplots across factions
- Mentor-student lineages
- Blood feuds spanning generations
- Secret societies and hidden agendas

**3. Faction Gameplay**
- Guild alliances and rivalries
- Political parties vying for control
- Military command structures
- Resistance movements vs oppressive regimes

**4. Social Navigation**
- "How do we get to the Queen?" → Trace relationship path
- "Who might know about the artifact?" → Find connected NPCs
- "Will this NPC help us?" → Check their faction alignment

---

## Core Principles

### PRINCIPLE 1: Every Entity Must Earn Its Place

**Rule:** An entity exists in Political-Web ONLY if it meets at least ONE criterion:

✅ **Has relationships** (at least 1 connection to another entity)
✅ **Met by party** (players have interacted with this NPC)
✅ **Faction has members** (organization entity links to NPCs)
✅ **Referenced by others** (mentioned in observations or relations)

**Examples:**

✓ **KEEP:** "Councilor Myra Cael"
- Has relations: member of → Sablemarrow Council
- Met by party: Yes
- Referenced: Other councilors mention her

✗ **REMOVE:** "Salt's End Power Transition"
- No relations, no members, just a concept
- **Fix:** Move to Merchant's Guild observations as text
- **OR:** Add edges: caused by → Captain's death, resulted in → Guild takeover

✓ **KEEP:** "Trinity of Light" (religious faction)
- **IF** you add: Trinity → worshipped by → [Cindrel, Veyla, citizens]
- Without worshippers, move to world-foundations as divine entity

**Why This Matters:**
- Prevents conceptual bloat (ideas that don't need graph nodes)
- Keeps AI context focused on actionable entities
- Forces you to make abstract concepts concrete through relationships

---

### PRINCIPLE 2: Explicit Relations > Observations

**Bad Practice:**
```
Galik Emberfuse (NPC)
Observations:
  - "Dwarf artificer who holds Writ of Ironhollow district"
  - "Wants Chrome Bishop technology"
  - "Conflicts with Sythra over industrialization"
Relations:
  - member of → Nine Arcane Writs
```

**Good Practice:**
```
Galik Emberfuse (NPC)
Observations:
  - "Dwarf artificer who worships Glimli (craft) and Valtheris (dark innovation)"
  - "Ambitious but morally flexible due to dual worship"
Relations:
  - member of → Nine Arcane Writs
  - governs → Ironhollow (cross-ref to geographic-memory)
  - desires technology from → Chrome Bishop
  - conflicts with → Sythra Amelindor
```

**Why Explicit Edges Matter:**

**Question:** "Who governs Ironhollow?"
- ❌ Text search through observations (slow, error-prone)
- ✅ Graph traversal: `governs` edges → Galik (instant, reliable)

**Question:** "Who opposes Galik?"
- ❌ Parse observations for conflict keywords
- ✅ Graph query: `conflicts with` edges → Sythra

**Question:** "How can we get Chrome Bishop tech?"
- ❌ Read every NPC's observations
- ✅ Follow `desires technology from` → Chrome Bishop → `allied with` → [Mechanist NPCs]

**When to Use Observations vs Relations:**

| Information Type | Use Observation | Use Relation |
|-----------------|-----------------|--------------|
| Physical description | ✅ "Pale skin, silver hair" | ❌ |
| Personality traits | ✅ "Ambitious, calculating" | ❌ |
| Character goals | ✅ "Seeks immortality" | ❌ |
| Power dynamics | ❌ | ✅ `commands`, `reports to` |
| Allegiances | ❌ | ✅ `member of`, `allied with` |
| Conflicts | ❌ | ✅ `opposes`, `seeks vengeance` |
| Knowledge | Sometimes | ✅ `knows about`, `expert on` |
| Locations | ✅ "Based in Veilshard" | ❌ (cross-memory) |
| Equipment/stats | ❌ (use database) | ❌ |

---

### PRINCIPLE 3: Cross-Memory Relations via Text Anchors

You **cannot** create edges between different memory graphs (Political-Web ↔ Geographic, etc.), but you can use **standardized text anchors** for AI cross-referencing.

**Anchor Pattern:**
```
Political-Web NPC: "Galik Emberfuse"
Observation: "Governs Ironhollow district in Veilshard"
                       ↑anchor↑           ↑anchor↑

Geographic-Memory Location: "Ironhollow"
Observation: "Industrial district governed by Galik Emberfuse"
                                                ↑anchor↑

World-Foundations Entity: "The Shattering"
Observation: "Altered reality 500 years ago, witnessed by The Orphaned Source"
                                                             ↑anchor↑
```

**Standardized Anchor Formats:**

```yaml
Location Anchors:
  - "Located in [FULL_LOCATION_NAME]"
  - "Based in [CITY], [REGION]"
  - "Governs [DISTRICT] in [CITY]"
  - "Rules from [FORTRESS/PALACE]"

Organization Anchors:
  - "Member of [FULL_ORGANIZATION_NAME]"
  - "Leads the [ORGANIZATION]"
  - "Former member of [ORGANIZATION]"

NPC Anchors:
  - "Allied with [FULL_NPC_NAME]"
  - "Reports to [SUPERIOR_NAME]"
  - "Commands [SUBORDINATE_NAME]"
  - "Daughter of [PARENT_NAME]"

Event Anchors (for campaign-story):
  - "Present during [EVENT_NAME]"
  - "Survived [BATTLE/CATASTROPHE]"
  - "Witnessed [MAJOR_EVENT]"

Status Anchors:
  - "Currently [PRESENT_TENSE_STATE]"
  - "As of Session [N], [STATUS]"
```

**AI Search Strategy:**
```python
# User asks: "Where is Galik?"
1. Search political-web for "Galik Emberfuse"
2. Extract location anchors: ["Ironhollow", "Veilshard"]
3. Search geographic-memory for "Ironhollow"
4. Return: "Galik governs Ironhollow district in Veilshard"

# User asks: "Who can introduce us to the High Mage?"
1. Find "High Mage" in political-web
2. Traverse edges: High Mage ← allied with ← Noble ← knows ← Party
3. Return: "You could ask Noble X, who is allied with the High Mage"
```

---

### PRINCIPLE 4: Hierarchical Entity Types

**Problem:** Flat entity types make filtering difficult

**Solution:** Use colon-separated hierarchical types

**Taxonomy (Updated for Ring System)**:
```
NPC:leader
  - Faction leaders, BBEGs, ruling figures
  - Ring 2 placement (125-150px, closest to faction)
  - Examples: Chrome Bishop, Lycara Tyrenthiel (High Mage)

NPC:lieutenant
  - Second-in-command, advisors, senior members
  - Ring 2.5 placement (150-200px, mid-level)
  - Examples: Altus (Mechanist Ascendant), City Watch Captain

NPC:member
  - Common faction members, active participants
  - Ring 3 placement (200-250px, outer ring)
  - Examples: Regular Writ holders, guild members

NPC:minor
  - One-off quest givers, shopkeepers met once
  - Ring 3 placement (200-250px, outer ring)
  - Examples: Jessa Coalbright (escort mission), merchants

NPC:mentioned
  - Name-dropped but never met
  - Ring 3 placement (200-250px, furthest out)
  - Examples: "The Crimson Duke", historical figures

NPC:STM (Standard Template Member)
  - Generated from faction template (for unnamed encounters)
  - Ring 3 placement (200-250px, outer ring)
  - Uses faction's standard member archetype

Organization:hierarchy
  - Formal command structures (Mechanist Order, Sablemarrow Council)
  - Clear ranks and reporting lines
  - Official membership

Organization:alliance
  - Loose coalitions (Druidic Resistance)
  - Temporary partnerships (Merchant Caravans)
  - Informal networks

Organization:concept
  - Abstract ideas (Technological Supremacy Movement)
  - Power vacuums (Salt's End Power Transition)
  - Ideological movements without formal structure

Faction:ideological
  - Belief-based groups (Mechanists vs Traditionalists)
  - Religious movements (Trinity worshippers)
  - Philosophical alignments

Faction:political
  - Government bodies (Nine Arcane Writs)
  - Ruling councils
  - Legislative factions

Faction:military
  - Army divisions
  - Mercenary companies
  - Resistance cells

Faction:criminal
  - Thieves' guilds
  - Smuggler networks
  - Assassination leagues
```

**Benefits:**

```python
# Filter queries
major_npcs = search_nodes("NPC:major")
all_npcs = search_nodes("NPC:")  # Matches NPC:major, NPC:minor, NPC:mentioned

# Exclude concepts when querying organizations
orgs = search_nodes("Organization:")
structured_orgs = [o for o in orgs if ":concept" not in o.type]

# Find formal power structures only
governments = search_nodes("Faction:political")
```

---

### PRINCIPLE 5: Relation Directionality Standards

**Consistent Vocabulary = AI-Readable Graph**

**Hierarchy Relations (Directed):**
```
commands (superior → subordinate)
  "High Mage commands Battle Mages"

reports to (subordinate → superior)
  "Battle Mages report to High Mage"

member of (individual → organization)
  "Galik member of Nine Writs"

contains member (organization → individual)
  "Nine Writs contains member Galik"

leads (individual → organization)
  "Lycara leads Nine Writs"
```

**Alliance Relations (Often Bidirectional):**
```
allied with (mutual support - use bidirectional)
  "Druid Circle allied with Nature Clerics"

supports (A helps B, not necessarily mutual)
  "Merchant Guild supports Sablemarrow Council"

trades with (mutual exchange)
  "Veilshard trades with Salt's End"

opposes (A against B, possibly mutual)
  "Mechanists oppose Magic Users"
```

**Power Relations (Directed):**
```
controls (has authority over entity/resource)
  "Chrome Bishop controls Vein Network"

governs (rules geographic area - cross-memory anchor)
  "Galik governs Ironhollow"

employs (pays for service)
  "Merchant employs bodyguards"

bound by pact (magical/formal contract)
  "Warlock bound by pact with Devil"
```

**Knowledge Relations (Directed):**
```
knows about (aware of existence/activity)
  "Pathik knows about secret tunnel"

expert on (deep knowledge/specialization)
  "Seraphina expert on Chrome Bishop tech"

taught by (student → teacher)
  "Apprentice taught by Master"

unaware of (explicit ignorance - useful for secrets)
  "Council unaware of traitor"

spies on (surveillance relationship)
  "Spy network spies on enemy faction"
```

**Emotional Relations (Directed):**
```
trusts / distrusts
  "Party trusts Councilor Myra"
  "Alric distrusts magic users"

seeks vengeance against
  "Seraphina seeks vengeance against Chrome Bishop"

indebted to (owes favor/life debt)
  "Jessa indebted to party"

sworn enemy of
  "Inquisitor sworn enemy of necromancers"
```

**Example Application:**
```
BEFORE:
Seraphina Vitalys (Revenant)
Relations:
  - seeks vengeance against → Chrome Bishop Proxies

AFTER:
Seraphina Vitalys (Revenant)
Relations:
  - seeks vengeance against → Chrome Bishop Proxies
  - expert on → Chrome Bishop Proxies (can identify their work)
  - former member of → Nine Arcane Writs
  - freed → Party (they rescued her)
  - indebted to → Party
  - knows about → Pink Goo Creation
  - knows about → Vein Network
```

**Why This Matters:**
```python
# AI query: "Who can identify Chrome Bishop technology?"
traverse_edges("expert on", target="Chrome Bishop")
→ Seraphina, Kephras, Altus

# AI query: "Who owes us favors?"
traverse_edges("indebted to", target="Party")
→ Seraphina, Jessa, Kephras (if you freed him)

# AI planning: "Can we trust this NPC?"
check_path(npc, "allied with | trusts", "Party")
check_path(npc, "distrusts | opposes", "Party")
```

---

## Building Your Political-Web: Step-by-Step

### Phase 1: Identify Core Entities (Start Small)

**Don't try to map your entire world at once.** Start with immediate campaign relevance:

**Tier 1: The Party**
- Create PC entity for each player character
- Lock these in the center (they're the anchor point)

**Tier 2: Direct Contacts (Met NPCs)**
- Quest givers the party has worked with
- Recurring allies and enemies
- Shopkeepers they visit regularly
- Authority figures they've encountered

**Tier 3: One Hop Away (Mentioned NPCs)**
- "The High Mage's apprentice"
- "The crime lord everyone fears"
- NPCs other NPCs reference

**Example Starting Point (Session 5):**
```
Party (5 PCs)
├─ Carp → allied with → Innkeeper (helped in Session 1)
├─ Lucifer → bound by pact → Unknown Patron
├─ All → employed by → Quest Giver Noble
└─ All → opposed by → Bandit Leader

Bandit Leader → leads → Bandit Gang (faction)
Quest Giver → member of → Local Council (organization)
```

**Expand Gradually:**
- After Session 10: Add faction leaders
- After Session 20: Add political structures
- After Session 30: Add distant power brokers

---

### Phase 2: Define Your Factions

**Faction = Group Identity for Metaball AOE Visualization**

Factions are **not** just organizations - they're the categorical lenses through which you view your political landscape.

**Campaign-Specific Examples:**

**High Fantasy Medieval:**
- Noble Houses (House Stark, House Lannister)
- Religious Orders (Paladins, Clerics of Light)
- Guilds (Thieves' Guild, Merchants' League)
- Military (King's Army, City Guard)
- Monsters (Orc Horde, Dragon Cult)

**Cyberpunk:**
- Megacorps (Arasaka, Militech)
- Gangs (Street Samurai, Netrunners)
- Government (NUSA, Night City Council)
- Underground (Fixers, Nomads)
- AI Factions (Rogue AIs, AI Rights Movement)

**Our Campaign (Geux - Tech vs Magic):**
- **Mechanist Order** (Chrome Bishop followers, anti-magic technologists)
- **Nine Arcane Writs** (Mage oligarchy ruling Veilshard)
- **Sablemarrow Council** (City government, tech-supremacist)
- **Saltborn** (River pirates, independent traders)
- **Druidic Resistance** (Nature magic vs industrialization)
- **The Party** (PCs - the lens through which we view all others)
- **Unaffiliated** (Orphaned NPCs, neutral merchants)

**How to Choose Factions:**

Ask yourself: **"What are the 5-7 major groups whose conflicts drive my story?"**

Don't include:
- ❌ Individual NPCs (they get colored BY faction, not ARE factions)
- ❌ Temporary alliances (use edges, not factions)
- ❌ Abstract concepts without members

Do include:
- ✅ Organizations with 3+ NPCs
- ✅ Ideological movements with followers
- ✅ Power structures players interact with

**Faction Entity Design:**

```yaml
Faction Entity: "Mechanist Order"
  entity_type: "Faction:military"

  Observations:
    - "Technological supremacist movement led by Chrome Bishop"
    - "Operates through Proxies and strongholds across Geux"
    - "Founded after the Shattering 500 years ago"
    - "Preaches order through machine transcendence"

  Relations:
    - led by → Chrome Bishop (if he's an NPC entity)
    - contains member → [Altus, Harmonic, Xi0, Casimir, Elira, ...]
    - opposes → Nine Arcane Writs
    - allied with → Sablemarrow Council (tech-aligned)

  Attributes:
    color: "#FF5733" (for metaball visualization)
    leader_npc_id: "chrome-bishop-npc-id" (links to NPC database)
    size: "large" (affects AOE radius)
    status: "active" | "dormant" | "defeated"
```

**Faction Without NPCs (Empty Factions):**

Sometimes you know a faction EXISTS but haven't detailed its members yet:

```yaml
Faction: "Trinity of Light"
  entity_type: "Faction:religious"

  Observations:
    - "Pantheon of three gods worshipped across Geux"
    - "Not yet detailed - add worshippers as campaign progresses"

  Relations: []  # Empty for now

  Attributes:
    status: "pending_members"
```

**Why Allow Empty Factions:**
- Placeholder for future development
- Visual reminder: "I need to add Trinity worshippers"
- Prevents forgetting about mentioned-but-not-detailed groups

**Faction Leader = NPC Link:**

Factions can reference a leader NPC:

```yaml
Faction: "Nine Arcane Writs"
  leader_npc_id: "lycara-tyrenthiel-id"  # Links to npcs database table

  Relations:
    - led by → Lycara Tyrenthiel (creates edge on graph)
    - contains member → [8 Writ holders]
```

**Clicking faction leader in UI:**
- Opens NPC detail from npcs database
- Or prompts: "Create NPC entry for faction leader?"
- Links faction entity (graph) to NPC entity (database)

---

### Phase 3: Map Relationships

**Start with structural relationships (easy to identify):**

**Step 1: Organizational Membership**
```
Every NPC → member of → Their primary faction
Every organization → contains member → NPCs

Galik → member of → Nine Arcane Writs
Nine Arcane Writs → contains member → Galik
```

**Step 2: Command Hierarchies**
```
Superior → commands → Subordinate
Subordinate → reports to → Superior

Chrome Bishop → commands → Altus
Altus → reports to → Chrome Bishop
```

**Step 3: Party Relationships**
```
For each NPC the party has met:

Party → allied with → Friendly NPC
Party → opposes → Enemy NPC
Neutral NPC → knows about → Party
Quest NPC → employed by → Party (if hired)
```

**Then add nuanced relationships:**

**Step 4: Political Dynamics**
```
Rival Writ Holders → competes with → Each other
Technologists → conflicts with → Traditionalists
Merchants → trades with → Multiple factions
```

**Step 5: Personal Bonds**
```
Apprentice → taught by → Master
NPC → trusts → Ally
NPC → distrusts → Suspicious figure
NPC → seeks vengeance → Betrayer
```

**Step 6: Knowledge Networks**
```
Spy → spies on → Enemy faction
Scholar → expert on → Historical event
NPC → unaware of → Secret the party knows
```

---

### Phase 4: Write Quality Observations

**Template for NPC Observations:**

```yaml
1. IDENTITY (who they are)
   - Race, class, level, role
   - "Dwarf artificer, Writ holder of Ironhollow"

2. POSITION (where they fit)
   - Location anchor: "Based in Veilshard"
   - Organization anchor: "Member of Nine Writs"
   - Rank: "Senior Writ holder with veto power"

3. PERSONALITY (how they act)
   - Core traits: "Ambitious, pragmatic, morally flexible"
   - Speaking style: "Direct and transactional"
   - Quirks: "Always tinkering with mechanical gadgets"

4. GOALS (what they want)
   - Short-term: "Acquire Chrome Bishop technology"
   - Long-term: "Build construct army to defend Ironhollow"
   - Secret: "Replace all biological guards with automatons"

5. RELATIONSHIPS (in text form)
   - "Allied with pragmatic council members"
   - "Conflicts with Sythra over industrialization"
   - "Secretly admires Chrome Bishop's vision"

6. KNOWLEDGE STATE (what they know)
   - "Aware of Chrome Bishop's technological supremacy"
   - "Knows about party's anomalous nature"
   - "Unaware that Sythra is planning sabotage"

7. STATUS (current state)
   - "Currently negotiating trade deal"
   - "As of Session 15, suspects party of theft"
   - "Recently lost political leverage after vote"

8. CROSS-MEMORY ANCHORS
   - "Governs Ironhollow district in Veilshard" (geographic)
   - "Researching The Shattering's effects on magic" (world-foundations)
   - "Present during the Basilica raid in Session 11" (campaign-story)
```

**Example - Good vs Bad:**

**❌ BAD:**
```
Galik
Observations:
  - "Dwarf"
  - "Mage"
  - "Ambitious"
```
*Why bad: Not actionable, no context, no anchors*

**✅ GOOD:**
```
Galik Emberfuse
Observations:
  - "Dwarf artificer (level 13) who holds Writ of Ironhollow district in Veilshard"
  - "Worships both Glimli (craft) and Valtheris (dark innovation), making him morally flexible"
  - "Building a construct army to defend his district from magical threats"
  - "Desperately wants Chrome Bishop technology to enhance his automatons"
  - "Conflicts with Sythra Amelindor over industrialization of green spaces"
  - "Currently planning to steal or reverse-engineer the recoiler device"
  - "As of Session 12, knows the party has Chrome Bishop artifacts"
  - "Unaware that his worship of Valtheris is being exploited by a devil cult"
```
*Why good: Actionable, establishes relationships, provides AI context, includes cross-memory anchors*

---

## Validation Checklist

Before finalizing your Political-Web, run these checks:

### ✓ Entity Validation
- [ ] Every entity has at least 1 relation (or is marked `status: pending_relations`)
- [ ] Every organization has at least 1 member OR leader
- [ ] No duplicate entities (same NPC listed twice)
- [ ] Entity types follow hierarchy pattern (`NPC:major`, not just `NPC`)

### ✓ Relation Validation
- [ ] No duplicate relations (same edge listed twice)
- [ ] Bidirectional relations are symmetric (`allied with` goes both ways)
- [ ] Hierarchies are consistent (`commands` ↔ `reports to` pairs exist)
- [ ] Cross-memory anchors are exact matches (check spelling)

### ✓ Observation Validation
- [ ] Every NPC has identity, position, and personality observations
- [ ] Major NPCs have goals and status observations
- [ ] Location anchors match geographic-memory entities
- [ ] Organization anchors match faction/organization entities
- [ ] No vague pronouns ("he", "they") - use full names for anchors

### ✓ Graph Quality
- [ ] No orphaned nodes (unless intentionally pending)
- [ ] Party has connections to enough NPCs for navigation
- [ ] Faction sizes are balanced (no 1 mega-faction dominating)
- [ ] Relationship density feels realistic (not everyone knows everyone)

---

---

## User Guide: Creating Your Own Political-Web

### Scenario 1: Classic D&D Campaign

**Your Setting:**
- Medieval fantasy kingdom
- Noble houses vying for throne
- Thieves' guild vs City Watch
- Religious order investigating heresy

**Your Factions:**
1. **The Party** (PCs)
2. **House Valerian** (Noble house, crown loyalists)
3. **House Darkmore** (Rival house, rebellion sympathizers)
4. **Thieves' Guild** (Criminal underworld)
5. **City Watch** (Law enforcement)
6. **The Purifiers** (Religious inquisitors)
7. **Common Folk** (Neutral NPCs)

**Sample Entities:**
```
Lord Valerian (NPC:leader)
  → member of → House Valerian
  → opposes → House Darkmore
  → employs → City Watch Captain

Thieves' Guild Master (NPC:major)
  → leads → Thieves' Guild
  → bribed → City Watch Lieutenant
  → allied with → House Darkmore (secretly)

Party Rogue (PC)
  → infiltrated → Thieves' Guild
  → knows about → Guild Master's true allegiance
  → trusted by → Guild Master (thinks rogue is loyal)
```

### Scenario 2: Cyberpunk Corporate War

**Your Setting:**
- Megacorps controlling city-states
- Netrunner collectives
- Street gangs
- Government puppets

**Your Factions:**
1. **The Crew** (PCs - edgerunners)
2. **Arasaka** (Japanese megacorp)
3. **Militech** (American megacorp)
4. **Netwatch** (Anti-AI government agency)
5. **Voodoo Boys** (Netrunner gang)
6. **NUSA** (Puppet government)
7. **Fixers** (Independent contractors)

**Sample Entities:**
```
Corpo Executive (NPC:leader)
  → leads → Arasaka West Coast Division
  → at war with → Militech
  → blackmails → NUSA Senator
  → employs → Fixer (party contact)

Rogue AI (NPC:major)
  → opposes → Netwatch
  → allied with → Voodoo Boys
  → spies on → Arasaka
  → unaware of → Party's existence (they're below its notice)

Party Netrunner (PC)
  → allied with → Voodoo Boys
  → hunted by → Netwatch
  → knows about → Rogue AI location
```

### Scenario 3: Political Intrigue (Game of Thrones-style)

**Your Setting:**
- Warring kingdoms
- Complex marriage alliances
- Betrayals and backstabbing
- Secret plots

**Your Factions:**
1. **The Party** (Adventurers caught in politics)
2. **Northern Kingdom** (Honorable but struggling)
3. **Southern Empire** (Wealthy, expansionist)
4. **Eastern Clans** (Mercenary culture)
5. **The Faith** (Religious power broker)
6. **Merchant Princes** (Economic power)
7. **Shadow Council** (Secret puppet masters)

**Sample Entities:**
```
Queen Regent (NPC:leader)
  → leads → Northern Kingdom
  → allied with → The Faith
  → owes debt to → Merchant Princes
  → manipulated by → Shadow Council
  → distrusts → Party (sees them as wildcard)

Spymaster (NPC:major)
  → member of → Shadow Council
  → spies on → All factions
  → blackmails → Queen Regent
  → secretly allied with → Party (information trade)

Party Diplomat (PC)
  → trusted by → Queen Regent
  → unaware of → Spymaster's true allegiance
  → engaged to → Southern Princess (marriage alliance plot)
```

---

## Advanced Features

### Faction Creation Workflow (UI)

**Step 1: Create Faction Entity**
```
Button: "+ Add Faction"

Modal Form:
  Name: [Mechanist Order________________]
  Type: [Organization:hierarchy ▼]
  Color: [#FF5733] (for metaball)
  Status: [Active ▼]

  [ ] This faction has a leader

  Observations:
  [Technological supremacist movement...]

  [Cancel] [Create Faction]
```

**Step 2: Link Leader (Optional)**
```
If "has a leader" checked:

  Leader:
  ( ) Existing NPC: [Search NPCs... ▼]
  ( ) Create new NPC

  If "Create new NPC":
    → Opens NPC creation form
    → After creation, automatically links:
       Faction ─[led by]→ New NPC
       New NPC ─[leads]→ Faction
```

**Step 3: Add Members**
```
Faction Detail Panel:

  Mechanist Order (10 members)
  [+ Add Member]

  Members:
    - Chrome Bishop (Leader)
    - Altus (Ascendant)
    - Harmonic (Ascendant)
    ...

  Add Member Modal:
    ( ) Link existing NPC: [Search... ▼]
    ( ) Create new NPC and add to faction
```

### Empty Faction Support

**Why Allow Empty Factions:**
- Mentioned but not detailed ("The Shadow Council controls everything!")
- Future expansion placeholder
- Known to exist but members unknown

**Example:**
```
Trinity of Light (Faction:religious)
  Members: 0
  Status: pending_members

  UI shows:
    [!] This faction has no members yet
    [+ Add First Member]

  Observations:
    "Pantheon of three gods worshipped across Geux"
    "TODO: Add Gods. Add worshipper NPCs as campaign progresses"
```

### Faction Leader Root Node

**Concept:** Faction entity can exist without leader, prompting creation of NPC or observation clarifying organizational structure (collective, decentralized network, meritocracy, etc.)

**Workflow:**
```
User creates "Thieves' Guild" faction with no leader

UI shows:
  Thieves' Guild
  Leader: [None]
  [+ Assign Leader]

  Options:
    1. Link to existing NPC
    2. Create new NPC as leader
       → Opens NPC form pre-filled:
          Name: [Guild Master___]
          Role: Leader of Thieves' Guild
          Faction: Thieves' Guild
    3. → Opens NPC form select: [Decentralized]
       → After creation:
          Thieves' Guild ─[led by]→ Decentralized Network
          [thieves guild NPCs] ─[together make-up]→ Thieves' Guild
           
     

The only thing to note about selecting decentralized is there will need to be organizational clarifiers in metadata or NPCs within the faction must all connect to the faction node directly with an active relationship that describes their involvement or job within. (refine further TODO)

```

---

**Best Practices**
```
✓ Add NPCs as you meet them (don't pre-plan everything)
✓ Create factions when you have 3+ members
✓ Use explicit edges instead of text descriptions
✓ Link to other memories with text anchors
✓ Create Standard Member Templates that describe the lowest ranking or least important unnamed NPC faction members to have ready when you need a random person from X faction

✗ Don't add every random NPC (only recurring ones) (Use Standard Member Template to assist)
✗ Don't create factions with 0-1 members (use Unaffiliated)
✗ Don't add plot events here (use Campaign-Story)
```

---

## Success Metrics

**You'll know Political-Web is working when:**

✅ You can visually identify party allies vs enemies at a glance [need to color code relationships by type, poor to good gradiant relationship color or key table with faction colors labels and arrow types labeled.]
✅ Clicking an NPC shows their faction affiliation clearly
✅ You can trace connection paths: "Party → Ally → Ally's contact → Target NPC"
✅ Faction bubbles help you see organizational membership
✅ Adding a new NPC with faction assignment is intuitive
✅ The graph scales gracefully to 50+ NPCs without chaos [almost there tbh]

---

## Next Steps

1. **Review this guide**
2. **Refine faction list** 
3. **Approve PC relationship assignments** 
4. **Begin implementation** 
