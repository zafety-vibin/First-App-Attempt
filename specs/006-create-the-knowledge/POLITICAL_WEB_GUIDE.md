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

**Taxonomy:**
```
NPC:major
  - Recurring characters (Writ holders, Ascendants, quest givers across multiple sessions)
  - High-level NPCs (above level 10)
  - Campaign-critical figures (BBEG lieutenants, key allies)

NPC:minor
  - One-off quest givers (Jessa Coalbright - escort mission)
  - Shopkeepers met once (Verrum Thrynn - clockwork shop)
  - Low-level contacts (informants, messengers)

NPC:mentioned
  - Name-dropped but never met ("The Crimson Duke")
  - Historical figures referenced in lore
  - Pending introductions ("They work for someone called Shadewing")

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

## Implementation: Our Campaign Example

### Entities We're Creating

**Player Characters (5 - Center Anchors):**
1. Carp (Fighter) - Tank, leader
2. Lucifer (Warlock) - Soul magic specialist
3. Poggoo (Bard) - Face, information gatherer
4. Tanner (Ranger) - Scout, marked by mutation
5. Pathik (Rogue) - Thief, opportunist

**NPCs from Notion Import (52 total):**
- Shopkeepers (Verrum, Grelka, Luther, Yasmine, Karson, Fenwick) - Faction: Sablemarrow Merchants
- Council Members (Myra, Edrin, Jared, Brina, Alric) - Faction: Sablemarrow Council
- Writ Holders (Galik, Varzai, Lycara, Salinth, Sythra, Xevrin, Cindrel, Malvek) - Faction: Nine Arcane Writs
- Mechanists (Chrome Bishop, Altus, Harmonic, Xi0, Casimir, Elira, Kephras, Jason, Amor, Revel) - Faction: Mechanist Order
- Salt's End NPCs (Elora, Darius, Mother Gilda, Jessa) - Faction: Saltborn
- Dragons (Orphaned Source, Zerithas, Lyrianna) - Faction: Ancient Dragons
- Others (Jeffrey, Marthin, Ralvus, Sister Veyla, Lurtzic, Olwen, Veylith) - Faction: Unaffiliated

**Factions We're Creating (with AOE colors):**
1. **The Party** (Green) - 5 PCs
2. **Mechanist Order** (Chrome Silver) - 10+ NPCs, led by Chrome Bishop
3. **Nine Arcane Writs** (Purple) - 8 NPCs, led by Lycara
4. **Sablemarrow Council** (Steel Blue) - 5 NPCs, led by Alric
5. **Sablemarrow Merchants** (Gold) - 6 NPCs, no formal leader
6. **Saltborn** (Ocean Blue) - 4 NPCs, formerly led by Darius (dead)
7. **Ancient Dragons** (Prismatic) - 3 NPCs, led by Orphaned Source
8. **Druidic Resistance** (Forest Green) - 1 NPC (Sythra), pending expansion
9. **Unaffiliated** (Gray) - Orphaned NPCs, neutral contacts

**Why These Factions:**
- **Mechanist Order:** Primary antagonist faction, tech-supremacist
- **Nine Writs:** Magical oligarchy, political power in Veilshard
- **Sablemarrow Council:** City government, tech-aligned, anti-magic
- **Saltborn:** Independent pirates/traders, power vacuum after Darius
- **Ancient Dragons:** Cosmic-scale entities, ancient knowledge holders
- **Druidic Resistance:** Nature magic, opposes industrialization
- **The Party:** Center of the web, relationship anchor point
- **Unaffiliated:** Catch-all for neutral/orphaned NPCs

### Relationship Examples (Based on Your Data)

**Party → NPC Relationships:**

**Carp-Specific:**
```python
# Carp has interacted with most NPCs (appears in many "Met by Party" lists)
Carp → allied with → Councilor Myra (she's moderate, party-friendly)
Carp → knows about → Most Sablemarrow NPCs
Carp → won gamble from → The Man Who Gambled Against Time
```

**Lucifer-Specific:**
```python
# Lucifer has soul magic and warlock background
Lucifer → bound by pact → Unknown Patron (could be devil entity)
Lucifer → conflicted about → Varzai the Soulforger (necromancy parallels)
Lucifer → interests → Seraphina (both seek forbidden knowledge)
```

**Pathik-Specific:**
```python
# Pathik is a thief and risk-taker
Pathik → attempted theft from → The Man Who Gambled (forced to roll dice)
Pathik → trades with → Fenwick Calloway (black market goods)
Pathik → recruited → Jeffrey Trimbley (for Basilica heist)
```

**Whole Party Relationships:**
```python
# Everyone has met these NPCs
All Party → allied with → Jessa Coalbright (escort quest)
All Party → opposed by → Chrome Bishop Proxies
All Party → freed → Seraphina Vitalys (acid pit rescue)
All Party → knows about → Kephras (defector they spared)
All Party → killed → Zhaerith, Captain Darius (boss fights)
```

**Faction-Level Relationships:**
```python
# Organizations relating to each other
Mechanist Order → opposes → Nine Arcane Writs (tech vs magic)
Sablemarrow Council → allied with → Mechanist Order (shared ideology)
Nine Writs → governs → Veilshard city-state
Druidic Resistance → opposes → Sablemarrow Council (nature vs industry)
Saltborn → trades with → Merchant's Guild
Ancient Dragons → unaware of → The Party (cosmic entities, party insignificant)
```

**NPC Hierarchies:**
```python
# Mechanist Order command structure
Chrome Bishop → commands → [Altus, Harmonic, Xi0, "—"]
Altus → commands → [Casimir, Elira] (Executors)
Casimir → commands → Iron-Basilica guards
Revel Smith → interprets communications from → Chrome Bishop

# Nine Writs hierarchy
Lycara Tyrenthiel → leads → Nine Arcane Writs
Each Writ Holder → governs → Their district
Galik → governs → Ironhollow
Sythra → governs → Green districts
Xevrin → governs → Layer Deep (underground farms)
```

---

## Visualization Design: Party-Centric Layout

### Node Placement Rules

**1. Party Center (Fixed Positions):**
```
5 PCs evenly distributed in small circle (radius 100px)

    Carp (12 o'clock)
       |
Pathik --- Lucifer
(9)         (3)
       |
   Poggoo --- Tanner
   (7)        (5)
```

**2. NPC Proximity Algorithm:**
```python
def calculate_npc_distance_from_party(npc):
    """NPCs closer to party = stronger relationship"""

    base_distance = 300  # Default for met NPCs

    # Modifiers
    if has_edge(npc, "allied with", Party):
        distance = 200  # Close allies
    elif has_edge(npc, "opposes", Party):
        distance = 250  # Known enemies (still close - active conflict)
    elif has_edge(npc, "employed by", Party):
        distance = 180  # Quest givers/hirelings
    elif has_edge(npc, "knows about", Party):
        distance = 350  # Aware but not directly involved
    elif npc.met_party == False:
        distance = 500  # Unmet NPCs toward periphery

    # Faction membership pulls NPCs toward faction cluster
    if npc.faction:
        # NPCs pulled toward their faction's centroid
        # Distance from party balanced with faction cohesion
        pass

    return distance
```

**3. Faction Metaball AOE:**
```python
# Similar to World-Foundations but with different rules

Faction AOE radius = base_radius + (member_count * 15)

Mechanist Order (10 members):
  radius = 60 + (10 * 15) = 210px

Nine Arcane Writs (8 members):
  radius = 60 + (8 * 15) = 180px

Unaffiliated (30 members):
  radius = 60 + (30 * 15) = 510px  # Large blob of neutral NPCs
```

**4. Node Sizing:**
```python
PC nodes:
  size = 40px (larger than NPCs)
  always show name
  fixed position (locked)

NPC nodes (connection-based like World-Foundations):
  size = 20 + (connection_count * 3)
  max size = 60px
  no name until highlighted

Faction nodes (if we show them):
  size = Based on member count
  show name always
  clickable for zoom/filter
```

**5. Edge Rendering:**
```python
Party edges (show always):
  Party ─[allied with]→ NPC (green line)
  Party ─[opposes]→ NPC (red line)
  Party ─[employed]→ NPC (gold dashed)

NPC-to-NPC edges (show on selection):
  commands (thick arrow)
  member of (dashed line toward faction)
  allied with (solid line, bidirectional)
  conflicts with (red zigzag)
```

### Physics Rules (Different from World-Foundations)

**Constraints:**
1. **PCs are FIXED** (locked in center, never move)
2. **NPCs pulled toward:**
   - Party center (base attraction)
   - Faction centroid (if member)
   - Connected NPCs (edge springs)
3. **Faction cohesion:**
   - Same-faction NPCs have short ideal edge length
   - Cross-faction edges are longer
4. **Collision:**
   - Same-faction NPCs can overlap slightly
   - Different-faction NPCs maintain distance
5. **Reset View:**
   - Re-center on party
   - Pull rogue NPCs back to faction groups
   - No category separation like World-Foundations

**Visual Clarity Focus:**
```
GOAL: Show party's influence sphere

Center = Party (what players control)
Near = Allies/Enemies (active relationships)
Mid = Known NPCs (met but neutral)
Far = Distant NPCs (unmet, mentioned only)
Edge = Faction leaders/power brokers (future encounters)
```

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
Lord Valerian (NPC:major)
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
Corpo Executive (NPC:major)
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
Queen Regent (NPC:major)
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
    "TODO: Add worshipper NPCs as campaign progresses"
```

### Faction Leader Root Node

**Concept:** Faction entity can exist without leader, prompting creation

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
       → After creation:
          Thieves' Guild ─[led by]→ Guild Master
          Guild Master ─[leads]→ Thieves' Guild
```

---

## Info Panel Content (For "?" Icon on Page)

### What to Show Users

**Panel Title: "Political-Web Memory Guide"**

**Section 1: What is this?**
```
Political-Web tracks relationships, alliances, and power dynamics.

Use it to answer:
  • Who knows who?
  • How do we reach influential NPCs?
  • Which factions are allied or opposed?
  • Who has leverage over whom?
```

**Section 2: Party-Centric Layout**
```
Your party is at the CENTER.

Distance from center = Relationship importance:
  • Close: Direct allies, active enemies
  • Medium: Known contacts, neutral NPCs
  • Far: Unmet NPCs, distant power brokers

Colored bubbles = Factions
  • Click faction bubble to zoom and filter
  • Helps visualize organizational membership
```

**Section 3: Creating Entities**
```
Entity Types:
  • NPC:major - Recurring characters, key figures
  • NPC:minor - One-off quest givers, shopkeepers
  • NPC:mentioned - Name-dropped but never met
  • Faction - Organizations, alliances, movements

Every entity needs connections:
  • At least 1 relationship edge
  • OR mark as "pending_relations" for future
```

**Section 4: Relationship Types**
```
Hierarchy: commands, reports to, member of
Alliance: allied with, supports, trades with
Conflict: opposes, seeks vengeance, at war with
Knowledge: knows about, expert on, unaware of
Emotional: trusts, distrusts, indebted to
```

**Section 5: Best Practices**
```
✓ Add NPCs as you meet them (don't pre-plan everything)
✓ Create factions when you have 3+ members
✓ Use explicit edges instead of text descriptions
✓ Link to other memories with text anchors

✗ Don't add every random NPC (only recurring ones)
✗ Don't create factions with 0-1 members (use Unaffiliated)
✗ Don't add plot events here (use Campaign-Story)
```

---

## Implementation Plan: Our Build

### Phase 1: Data Import & Deduplication
1. Load 30 entities from pol-web-memory.db
2. Load 52 NPCs from Notion CSV (already in npcs table)
3. Deduplicate: Merge pol-web entities with matching npcs table entries
4. Load 5 PCs from player_characters table

### Phase 2: Faction System
1. Auto-detect factions from pol-web "member of" relations
2. Extract additional organizations (Mechanist Order, Merchant's Guild)
3. Create faction categories for metaball rendering
4. Assign colors to each faction
5. Calculate faction centroids based on member positions

### Phase 3: Relationship Mapping
1. Import 25 relations from pol-web-memory
2. Create Party-to-NPC edges based on "Met by Party" field
3. Assign specific PC relationships:
   - Pathik → recruited → Jeffrey (heist)
   - Lucifer → interests → Seraphina (soul magic)
   - Carp → allied with → Myra (moderate councilor)
4. Create NPC-to-NPC edges (hierarchies, conflicts)

### Phase 4: Political-Web Page (Frontend)
1. Copy World-Foundations structure
2. Modify layout: Fixed PC positions in center
3. NPC sizing: Smaller nodes, no text until highlight
4. Faction metaballs with different physics
5. Party-centric "All Fit" view
6. Info panel with usage guide

### Phase 5: Testing & Refinement
1. Stress test: 80+ nodes on canvas
2. Verify faction grouping works
3. Test relationship traversal
4. Refine physics for clarity

---

## Success Metrics

**You'll know Political-Web is working when:**

✅ You can visually identify party allies vs enemies at a glance
✅ Clicking an NPC shows their faction affiliation clearly
✅ You can trace connection paths: "Party → Ally → Ally's contact → Target NPC"
✅ Faction bubbles help you see organizational membership
✅ Adding a new NPC with faction assignment is intuitive
✅ The graph scales gracefully to 50+ NPCs without chaos

---

## Next Steps

1. **Review this guide** - Does it capture your vision?
2. **Refine faction list** - Are these the right 9 factions?
3. **Approve PC relationship assignments** - Should I proceed with Pathik→Jeffrey, Lucifer→Seraphina, etc.?
4. **Begin implementation** - Build the Political-Web page

Ready to proceed when you are!
