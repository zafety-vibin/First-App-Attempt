# Feature Specification: Knowledge Graph Architecture

**Feature Branch**: `006-create-the-knowledge`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "Create the knowledge graph architecture including: four graph types (World-Foundations created by default with campaign template, Political-Web/Geographical/Campaign-Story user-created), graph independence from cards (user-defined content, no auto-sync), graph summary panel above Planning AI with node/edge counts and toggle controls to enable/disable AI access per graph, Context Engineering help page accessible via ? icon explaining graph philosophy and over-engineering warnings, chat-based graph creation/updates via Planning AI, versioning with 1-deep backup for revert, cross-graph context through free-form node observations, multi-graph queries when toggled on, optional dedicated view for basic canvas visualization with draggable nodes (or skip if complex), graduated detail retention for Campaign-Story (user-defined freeform experimentation), automatic maintenance rules (opt-in user-configured), users can create multiple instances of same graph type, custom graph types fully supported. Toggle state persistence and visualization approach use easiest implementation."

---

## User Scenarios & Testing

### Primary User Story
A Game Master has been using VVD-mimic for 3 months and has 12 sessions of content imported. Their campaign has grown to include 50 NPCs, 30 locations, 15 factions, and complex political intrigue. The default World-Foundations graph has been tracking core world rules, magic systems, and pantheon relationships since day one, built gradually through Planning AI conversations where the GM defined each magic school's mechanics and deity relationships. Above the Planning AI chat, a graph summary panel shows: "World-Foundations (23 nodes, 45 edges, updated 2 days ago) [Toggle ON]". Now the GM wants better Planning AI context for their political intrigue plotline. They click the "?" icon, opening the Context Engineering help page which explains: "Political-Web graph tracks active party-relevant political relationships. The graph is independent from your cards - you define exactly what information goes into each node and relationship. Think: what's the best distillation of your content for planning assistance? Warning: Too many relationship types can confuse AI queries. Too many nodes consume context. Keep it lean and focused." The GM creates a Political-Web graph via Planning AI chat, defining 8 key NPCs with their allegiances, motivations, and observations like "current location: Waterdeep" for cross-graph context. The graph summary now shows both graphs with toggles. When discussing pure worldbuilding, they toggle off Political-Web. When asking "What happens if the party exposes Neverember's Zhentarim ties?", they toggle on both Political-Web and Geographical (also user-created), and Planning AI uses observations in nodes to trace cascading consequences across the alliance network and geographic regions. If the GM makes a mistake updating a graph, they can revert to the previous version (1 backup deep).

### Acceptance Scenarios
1. **Given** I start a new campaign, **When** the default template is created, **Then** an empty World-Foundations graph is automatically initialized
2. **Given** I'm on the Planning page, **When** I look above the chat, **Then** I see a graph summary panel listing all my graphs with node counts, edge counts, last updated timestamps, and toggle buttons
3. **Given** I want to prevent AI from accessing a graph, **When** I toggle that graph off, **Then** Planning AI does not query or update that graph during our conversation
4. **Given** I'm discussing locations with Geographical graph toggled off, **When** Planning AI responds, **Then** it doesn't add unintended content to the Geographical graph
5. **Given** I click the "?" help icon on Planning page, **When** the Context Engineering page opens, **Then** I see graph philosophy, over-engineering warnings, descriptions of all four graph types, and custom graph guidance
6. **Given** I want to create a Political-Web graph, **When** I tell Planning AI to create it, **Then** I define all content (nodes, edges, attributes) through conversation with full control
7. **Given** I'm defining a Political-Web node, **When** I add information, **Then** I can include free-form observations like "current location: Waterdeep" that Planning AI interprets for cross-graph context
8. **Given** I have Political-Web and Geographical graphs both toggled on, **When** I ask Planning AI about political figures, **Then** it uses observations in Political-Web nodes to reference Geographical graph for regional context
9. **Given** I update a graph, **When** changes are saved, **Then** the system preserves the previous version as a backup (1 version deep)
10. **Given** I made a mistake updating a graph, **When** I ask to revert, **Then** Planning AI restores the previous version
11. **Given** I delete a card that inspired a graph node, **When** checking the graph, **Then** the node remains unchanged (graphs are independent from cards)
12. **Given** I want to create a Campaign-Story graph, **When** I configure it, **Then** I can define graduated detail retention rules in free-form (recent sessions full detail, mid-range key info, distant merged) for experimentation
13. **Given** I want automatic graph maintenance, **When** I configure rules, **Then** I can set opt-in rules like "keep last 10 sessions, archive older" that Planning AI applies only when enabled
14. **Given** I have a large multi-region campaign, **When** I want separate political contexts, **Then** I can create multiple Political-Web graphs (e.g., "Political-Web: Waterdeep", "Political-Web: Baldur's Gate")
15. **Given** I need a specialized graph, **When** I tell Planning AI, **Then** I can create custom graph types with user-defined node types, edge types, and schemas
16. **Given** I want to visualize a graph, **When** I request it from Planning AI, **Then** I see a basic canvas with draggable nodes and edge connections (if visualization is implemented)

### Edge Cases
- What happens when user creates two graphs with the same name?
- What happens when all graphs are toggled off and user asks Planning AI a question?
- What happens when user tries to revert a graph that has no previous version (newly created)?
- What happens when graduated detail retention rules conflict (e.g., "keep last 10" and "archive sessions older than 30 days")?
- What happens when user asks Planning AI to update a graph that's toggled off?
- What happens when cross-graph observation references a graph that doesn't exist or is toggled off?
- What happens when automatic maintenance rule tries to prune the only remaining node in a graph?

## Requirements

### Functional Requirements

#### Default Template & Graph Initialization
- **FR-001**: System MUST create an empty World-Foundations graph automatically when initializing default campaign template
- **FR-002**: World-Foundations graph MUST be empty at creation, ready to accept user-defined content via Planning AI
- **FR-003**: System MUST NOT create Geographical, Political-Web, or Campaign-Story graphs by default (user-created only)
- **FR-004**: Users MUST create Geographical, Political-Web, and Campaign-Story graphs explicitly via Planning AI conversation

#### Graph Summary Panel & Toggle Controls
- **FR-005**: System MUST display graph summary panel above Planning AI chat interface
- **FR-006**: Graph summary panel MUST show each graph with: graph name, node count, edge count, last updated timestamp, and toggle button
- **FR-007**: Each graph MUST have a toggle button to enable/disable AI access
- **FR-008**: When graph is toggled off, Planning AI MUST NOT query that graph during conversations
- **FR-009**: When graph is toggled off, Planning AI MUST NOT update that graph during conversations
- **FR-010**: When graph is toggled off, users MUST still be able to manually update it by explicitly requesting changes
- **FR-011**: Toggle state persistence MUST use easiest implementation approach (session-scoped or persistent)
- **FR-012**: Graph summary panel MUST update counts and timestamps in real-time as graphs change

#### Context Engineering Help Page
- **FR-013**: System MUST provide Context Engineering help page accessible via "?" icon on Planning page
- **FR-014**: Help page MUST describe knowledge graph philosophy: "What's the best distillation of your content for planning assistance while maintaining consistency?"
- **FR-015**: Help page MUST explain that graphs are independent from cards with entirely user-defined content
- **FR-016**: Help page MUST warn: "Too many relationship types can confuse AI queries. Too many nodes consume context. Keep it lean and focused."
- **FR-017**: Help page MUST describe all four graph types: World-Foundations, Political-Web, Geographical, Campaign-Story
- **FR-018**: Help page MUST explain when to create each graph type with example use cases
- **FR-019**: Help page MUST explain World-Foundations is created by default; others are user-created after content exists
- **FR-020**: Help page MUST explain graphs OFF (Import AI never touches graphs) vs graphs ON (Planning AI with toggle controls)
- **FR-021**: Help page MUST provide examples of cross-graph context through free-form node observations
- **FR-022**: Help page MUST explain graph maintenance strategies: pruning, archiving, automatic rules
- **FR-023**: Help page MUST explain custom graph types and context engineering principles for designing them
- **FR-024**: Help page MUST explain that users can create multiple instances of the same graph type

#### Graph Independence & User Control
- **FR-025**: Graphs MUST be independent entities completely separate from cards
- **FR-026**: Graph content MUST be entirely user-defined through Planning AI conversations
- **FR-027**: Users MUST have 100% control over all graph node and edge content
- **FR-028**: Graph nodes MAY contain unique information not present in any card
- **FR-029**: System MUST NOT automatically sync graph content when cards are created, updated, or deleted
- **FR-030**: Deleting cards MUST NOT affect corresponding graph nodes (no cascade deletion)
- **FR-031**: Updating cards MUST NOT automatically update corresponding graph nodes
- **FR-032**: Users MAY manually update graph nodes to reflect card changes, but this is entirely optional
- **FR-033**: Users MUST understand that graphs exist to improve AI generations through distilled context

#### Graph Types & Structure

##### World-Foundations Graph
- **FR-034**: World-Foundations graph MUST represent core world-building: magic systems, pantheons, cosmology, fundamental rules, species, historical eras
- **FR-035**: World-Foundations graph MUST be campaign-agnostic foundational lore that doesn't change with story progression
- **FR-036**: World-Foundations node types are user-defined, examples include: Magic System, Deity, Plane of Existence, Species, Fundamental Rule, Cosmology Concept
- **FR-037**: World-Foundations edge types are user-defined, examples include: "governed by", "connected to", "belongs to", "derives from"
- **FR-038**: Planning AI MUST use World-Foundations graph to maintain consistency with established world rules when providing suggestions

##### Political-Web Graph
- **FR-039**: Political-Web graph MUST be user-created via Planning AI conversation (not in default template)
- **FR-040**: Political-Web graph MUST track active party-relevant political relationships, alliances, conflicts, and influence
- **FR-041**: Political-Web node types are user-defined, examples include: NPC, Faction, Organization, Political Entity
- **FR-042**: Political-Web edge types are user-defined, examples include: "allied with", "opposes", "controls", "influences", "secretly affiliated with", "rival of"
- **FR-043**: Political-Web graph SHOULD remain lean with only party-relevant content (NPCs/factions party has interacted with)
- **FR-044**: Political-Web graph SHOULD avoid including location nodes; use observations like "current location: Waterdeep" instead for cross-graph context
- **FR-045**: Planning AI MUST use Political-Web graph to trace political consequences and suggest intrigue-based content

##### Campaign-Story Graph
- **FR-046**: Campaign-Story graph MUST be user-created via Planning AI conversation (not in default template)
- **FR-047**: Campaign-Story graph MUST represent story threads, events, narrative connections, and timeline
- **FR-048**: Campaign-Story node types are user-defined, examples include: Story Thread, Event, Quest, Character Arc, Plot Point, Session Milestone
- **FR-049**: Campaign-Story edge types are user-defined, examples include: "leads to", "caused by", "conflicts with", "resolves", "references", "foreshadows"
- **FR-050**: Campaign-Story graph SHOULD use Session Recaps as reference material, but content is entirely user-defined
- **FR-051**: Campaign-Story graph SHOULD track timeline with in-world dates or day counts when available
- **FR-052**: Campaign-Story graph SHOULD remain lean with active/unresolved story threads
- **FR-053**: Campaign-Story graph MUST support archiving resolved story threads
- **FR-054**: Campaign-Story graph MUST support user-defined graduated detail retention in free-form (recent full detail, mid-range key info, distant merged/summarized)
- **FR-055**: Graduated detail retention structure MUST be user-configurable for research and experimentation (no predefined templates)
- **FR-056**: Planning AI MUST use Campaign-Story graph to maintain story consistency and suggest narrative-appropriate content

##### Geographical Graph
- **FR-057**: Geographical graph MUST be user-created via Planning AI conversation (not in default template)
- **FR-058**: Geographical graph MUST represent locations, regions, and spatial relationships
- **FR-059**: Geographical node types are user-defined, examples include: Continent, Region, City, Town, District, Landmark, Dungeon, Wilderness Area
- **FR-060**: Geographical edge types are user-defined, examples include: "contains", "adjacent to", "travel distance", "ruled by", "connected via"
- **FR-061**: Geographical graph MUST support hierarchical containment (continent → region → city → district)
- **FR-062**: Geographical edges MAY include metadata like travel time or distance
- **FR-063**: Planning AI MUST use Geographical graph to provide location-aware suggestions and travel logistics

##### Custom Graph Types
- **FR-064**: Users MUST be able to create entirely custom graph types beyond the four documented types
- **FR-065**: Custom graphs MUST allow completely user-defined node types, edge types, and schemas
- **FR-066**: Planning AI MUST guide users through custom graph creation using context engineering principles
- **FR-067**: System MUST support custom graph types with the same features as documented types (toggles, versioning, multi-graph queries)

#### Multiple Graph Instances
- **FR-068**: Users MUST be able to create multiple instances of the same graph type
- **FR-069**: Each graph instance MUST have a unique name to distinguish it (e.g., "Political-Web: Waterdeep", "Political-Web: Baldur's Gate")
- **FR-070**: Each graph instance MUST have independent toggle controls, versioning, and content
- **FR-071**: Planning AI MUST be able to query multiple instances of the same graph type simultaneously when toggled on

#### Graph Creation & Updates via Planning AI
- **FR-072**: Users MUST create graphs through Planning AI conversation (chat-based interface)
- **FR-073**: Planning AI MUST guide users through defining: graph type, graph name, scope, node types, edge types, initial content
- **FR-074**: Planning AI MUST allow users to define all node and edge content entirely through conversation
- **FR-075**: Users MUST be able to add free-form observations to nodes for cross-graph context (e.g., "current location: Waterdeep")
- **FR-076**: Planning AI MUST ask clarifying questions during graph creation (e.g., "Should this be 'allied with' or 'secretly affiliated with'?")
- **FR-077**: Users MUST approve graph structure and content before Planning AI finalizes creation
- **FR-078**: Users MUST update graphs through Planning AI conversation (chat-based interface)
- **FR-079**: Planning AI MUST allow adding, editing, or removing individual nodes and edges via conversation
- **FR-080**: Planning AI MUST present proposed changes for user approval before applying updates
- **FR-081**: Import AI MUST NOT create, query, or update graphs (graphs OFF during import)

#### Graph Versioning & Reversion
- **FR-082**: System MUST preserve previous version when graph is updated (1 version deep backup)
- **FR-083**: System MUST store only current version + 1 backup version per graph (not full version history)
- **FR-084**: Users MUST be able to revert graph to previous version via Planning AI conversation
- **FR-085**: Revert functionality MUST restore entire graph state (all nodes, edges, metadata) from backup
- **FR-086**: System MUST replace current backup with new backup when user makes another update after revert

#### Cross-Graph Context & Observations
- **FR-087**: Graph nodes MUST support free-form observations (text attributes) for cross-graph context
- **FR-088**: Planning AI MUST interpret observations to make cross-graph references when multiple graphs are toggled on
- **FR-089**: Example observation: Political-Web NPC node includes "current location: Waterdeep", enabling Planning AI to reference Geographical graph for regional context
- **FR-090**: Observations MUST be entirely user-defined free-form text (no structured format required)
- **FR-091**: Planning AI MUST be responsible for interpreting how to best use observations for cross-referencing

#### Graph Querying & AI Integration
- **FR-092**: Planning AI MUST query only graphs that are toggled on in graph summary panel
- **FR-093**: Planning AI MUST support multi-graph queries when multiple graphs are toggled on
- **FR-094**: Planning AI MUST use free-form observations in nodes to make cross-graph references
- **FR-095**: Planning AI MUST maintain consistency by keeping each graph focused on its domain ("stay in their lane")
- **FR-096**: Planning AI MUST trace relationships within graphs to provide context-aware suggestions
- **FR-097**: Planning AI MUST combine information from multiple toggled-on graphs to make nuanced decisions
- **FR-098**: Import AI MUST NOT query graphs (graphs OFF during import)

#### Automatic Maintenance Rules
- **FR-099**: Users MUST be able to configure automatic maintenance rules for graphs (opt-in, not enabled by default)
- **FR-100**: Maintenance rule examples: "keep last N sessions and archive older", "prune nodes older than X days", graduated detail retention
- **FR-101**: Maintenance rules MUST be user-defined and configurable per graph
- **FR-102**: Planning AI MUST apply maintenance rules only when user explicitly enables them
- **FR-103**: Planning AI MUST notify users when automatic maintenance rules are triggered
- **FR-104**: Users MUST be able to preview maintenance rule effects before applying
- **FR-105**: Users MUST be able to disable or modify maintenance rules at any time

#### Graph Visualization (Optional)
- **FR-106**: Graph visualization is optional and SHOULD use easiest implementation approach
- **FR-107**: If implemented, Planning AI SHOULD be capable of generating graph visualizations via conversation
- **FR-108**: If implemented, visualizations SHOULD use basic canvas-based rendering in dedicated view
- **FR-109**: If implemented, canvas SHOULD be much larger than nodes and connections to allow free arrangement
- **FR-110**: If implemented, users SHOULD be able to drag nodes around canvas to rearrange layout
- **FR-111**: If implemented, visualization SHOULD show node labels and edge connections
- **FR-112**: If implemented, visualization design SHOULD be simple and universal (works for any graph type, not type-specific layouts)
- **FR-113**: If visualization proves too complex to implement, it MAY be deferred to future development

#### Performance & Context Management
- **FR-114**: Graph summary panel MUST display node count and edge count for user awareness of graph size
- **FR-115**: Context Engineering help page MUST warn users about over-engineering (too many nodes/edges consume context, too many relationship types confuse queries)
- **FR-116**: System SHOULD rely on users and Planning AI suggestions to identify unwieldy graphs (no automatic warnings or hard limits)
- **FR-117**: Planning AI MAY suggest pruning strategies when graphs become large or complex during conversation

#### Graph Persistence
- **FR-118**: Graphs MUST be persisted as part of campaign data
- **FR-119**: System MUST persist current version and 1 backup version for each graph
- **FR-120**: Graph persistence MUST include: graph type, graph name, nodes, edges, metadata, creation date, last updated timestamp, automatic maintenance rules, toggle state (if persisted)
- **FR-121**: Graph data MUST be stored independently from card data (separate entities)

### Key Entities

- **Knowledge Graph**: Independent entity separate from cards. Contains graph type (World-Foundations, Political-Web, Geographical, Campaign-Story, or custom), graph name (unique identifier, especially for multiple instances of same type), nodes collection, edges collection, creation date, last updated timestamp, automatic maintenance rules (user-defined, opt-in), current version data, 1 backup version, and toggle state. Entirely user-defined content through Planning AI conversations.

- **Graph Node**: Entity within a knowledge graph. Has user-defined node type (varies by graph: NPC, Location, Deity, Event, Magic System, etc.), name, attributes (free-form user-defined content), observations (free-form text for cross-graph context like "current location: Waterdeep"), creation date. No automatic card sourcing or syncing.

- **Graph Edge**: Relationship between two nodes. Has user-defined edge type/relationship label (varies by graph: "allied with", "contains", "caused by", "governed by", etc.), source node reference, target node reference, directionality (directed/undirected), optional metadata (e.g., travel time, relationship strength), creation date. All content entirely user-defined.

- **Graph Version**: Saved snapshot of entire graph state for revert functionality. Contains complete copy of all nodes, edges, metadata, and timestamp. System maintains current version + 1 backup version per graph (not full history).

- **Graph Summary Panel**: UI component displayed above Planning AI chat interface. Shows each graph with name, node count, edge count, last updated timestamp, and toggle button. Updates in real-time as graphs change. Controls which graphs Planning AI can access.

- **Graph Toggle State**: Boolean state per graph indicating whether Planning AI has access for querying and updating. When toggled off, Planning AI cannot query or update that graph automatically. User can still manually request changes to toggled-off graphs. Persistence approach uses easiest implementation.

- **Graph Maintenance Rule**: User-defined automatic maintenance configuration for a graph. Contains rule definition (e.g., "keep last 10 sessions and archive older", graduated detail retention structure, pruning criteria), parameters, enabled status (opt-in). Planning AI applies only when user enables. User can preview, modify, or disable at any time.

- **Context Engineering Help Page**: Static documentation page accessible via "?" icon on Planning page. Explains graph philosophy (distilled context for AI assistance), independence from cards, over-engineering warnings, all four graph types with examples, when to create each type, toggle controls, cross-graph context via observations, maintenance strategies, custom graph principles, and support for multiple graph instances.

- **Cross-Graph Observation**: Free-form text information included in graph node attributes that enables multi-graph queries without hard linking. Example: Political-Web NPC node includes "current location: Waterdeep", allowing Planning AI to reference Geographical graph when both are toggled on. Entirely free-form; Planning AI interprets how to use for cross-referencing.

- **Graph Creation Session**: Planning AI conversation where user creates a new graph. Contains graph type selection, graph name definition, scope definition, node type definitions, edge type definitions, initial content, clarifications, and user approval state. Entirely chat-based interface.

- **Graph Update Session**: Planning AI conversation where user updates existing graph. Contains nodes/edges to add/edit/remove, clarifications, preview of changes, user approval, and backup creation before applying changes.

- **Custom Graph Type**: User-defined graph type beyond the four documented types. Contains completely custom node types, edge types, and schema. Planning AI guides creation using context engineering principles. Supports all standard features (toggles, versioning, multi-instance, maintenance rules).

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all clarifications resolved)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (all resolved)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
