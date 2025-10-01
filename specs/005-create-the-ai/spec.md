# Feature Specification: AI Import and Planning Workflows

**Feature Branch**: `005-create-the-ai`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "Create the AI Import and Planning workflows including: Import workflow (bulk note parsing, entity extraction, update vs addition detection, card creation/updates with user approval, graphs OFF, consistency with established story/timeline, revert functionality) and Planning workflow (session planning assistant, knowledge graph context, user-invoked graph updates from imports, graphs ON, context-aware suggestions without autonomous edits). Import uses pull-down tab interface accessible from any page. AI searches existing campaign structure to determine appropriate placement. Batch operations with single approval summary after clarifications. Planning AI explicitly invoked to parse imports and update four knowledge graphs (Geographical, Political-Web, World-Foundations, Campaign-Story). Political-Web and Campaign-Story graphs stay lean with only active/relevant content. Both workflows require BYOLLM configuration and use MCP protocol. Session Recaps database is default template, serves as authoritative timeline source. Revert limited to most recent import batch."

---

## User Scenarios & Testing

### Primary User Story - Import Workflow
A Game Master has 50 pages of campaign notes scattered across Google Docs, Obsidian, and text files. They open their campaign in VVD-mimic and pull down the Import tab from the top of any page, revealing the AI chat interface that overlays the current view. They paste their session notes from last week's game. The AI analyzes the content, searches existing campaign cards, and says: "I found updates to 3 existing NPCs in your Characters database, 2 new locations to add to your Locations page, and 1 new faction. I also see this should go in your Session Recaps database as Session 12. I have some questions: You mention 'the Council voted' - is this the Council of Lords from Session 8, or a new council?" The GM clarifies inline. The AI then presents: "Here's what I'll do: update Dagult Neverember's card with his new secret, add Blackstaff Tower to Locations, create the Zhentarim faction page under Factions, and add Session 12 recap to your database. The content will use proper headers and formatting. Approve?" The GM reviews and approves. Cards are updated/created instantly as a single batch. At the end, the GM has added content to appropriate pages and created new pages when necessary to build closer toward a completed and searchable wiki from their unstructured notes, with all changes respecting their custom campaign structure.

### Primary User Story - Planning Workflow
A Game Master is preparing for next week's session. They pull down the Planning tab and ask: "The party is heading to Waterdeep next session. What plot threads are active there?" The Planning AI searches the wiki, but first says: "I notice you've made several imports since I last updated the knowledge graphs. Should I process those changes first to give you the most accurate context?" The GM approves. The AI reads recent imports, updates the four knowledge graphs (Geographical, Political-Web, World-Foundations, Campaign-Story), keeping Political-Web and Campaign-Story lean with only active party-relevant content. Then it responds: "Based on Session Recaps 1-12 and your Waterdeep content, here are 3 active plot threads: The Zhentarim's new interest in the party (Session 12), Lord Neverember's secret alliance (Session 8), and the missing artifact from Session 4. The political web shows tension between the Lords' Alliance and Zhentarim. Would you like me to suggest encounter hooks?" The AI provides suggestions but makes NO autonomous edits to cards. The GM can then ask follow-up questions, explore hypotheticals, or request content generation - all with full context from updated graphs and absolute consistency with established timeline.

### Acceptance Scenarios - Import Workflow
1. **Given** I am on any campaign page, **When** I pull down the Import tab from the top, **Then** the AI chat interface overlays my current view
2. **Given** the Import interface is open, **When** I paste text or upload files (.txt, .md, .docx, .pdf), **Then** the AI analyzes the content in context of my current campaign
3. **Given** I've provided notes to import, **When** the AI analyzes content, **Then** it searches all existing campaign cards to distinguish updates from new additions
4. **Given** the AI finds content to import, **When** determining placement, **Then** it uses knowledge of my custom campaign structure and default templates
5. **Given** the AI is uncertain about classification or references, **When** it needs clarification, **Then** it asks all clarifying questions BEFORE presenting the approval summary
6. **Given** all clarifications are resolved, **When** the AI presents approval summary, **Then** it shows which cards will be updated, which will be created, where they'll be placed, and what formatting improvements will be applied
7. **Given** the AI proposes wording changes, **When** presenting for approval, **Then** I must explicitly approve new wording before proceeding
8. **Given** I approve the import, **When** execution occurs, **Then** all card updates/creations happen as a single atomic batch
9. **Given** I've completed an import batch, **When** I need to undo changes, **Then** I can revert to the state before the most recent import batch
10. **Given** I'm importing session recaps, **When** the AI processes content, **Then** it maintains strict consistency with established story timeline from Session Recaps database
11. **Given** knowledge graphs exist, **When** Import workflow is active, **Then** the AI does NOT update graphs (graphs OFF)
12. **Given** I import unformatted text, **When** cards are created, **Then** content has improved formatting (headers, structure) while preserving exact wording unless I approved changes

### Acceptance Scenarios - Planning Workflow
1. **Given** I am on any campaign page, **When** I pull down the Planning tab from the top, **Then** the AI chat interface overlays my current view with Planning context
2. **Given** Planning interface is open, **When** I ask a campaign question, **Then** the AI checks if recent imports need processing before responding
3. **Given** recent imports exist unprocessed, **When** Planning AI detects them, **Then** it asks permission to process imports and update knowledge graphs first
4. **Given** I approve graph updates, **When** Planning AI processes imports, **Then** it reads changes and updates all four knowledge graphs (Geographical, Political-Web, World-Foundations, Campaign-Story)
5. **Given** Planning AI updates Political-Web and Campaign-Story graphs, **When** adding relationships/nodes, **Then** it only includes active party-relevant content (keeps graphs lean and focused)
6. **Given** knowledge graphs are updated, **When** I ask planning questions, **Then** AI provides context-aware responses using graph data and Session Recaps timeline
7. **Given** Planning AI suggests content or encounters, **When** providing suggestions, **Then** it does NOT autonomously edit any cards
8. **Given** I discuss hypothetical scenarios with Planning AI, **When** those scenarios don't actually occur in-game, **Then** the AI maintains clear distinction between hypotheticals and established canon from Session Recaps
9. **Given** Planning AI has full graph context, **When** I request content generation, **Then** it provides suggestions consistent with established world/story without making autonomous changes
10. **Given** I want to implement Planning AI suggestions, **When** I approve specific content, **Then** I manually add it to cards or the AI creates new cards only with explicit approval

### Edge Cases
- What happens when Import AI can't determine if content is an update or new addition?
- What happens when Planning AI detects contradictions between recent imports and established Session Recaps timeline?
- What happens when user tries to revert import batch after refreshing the page or starting new session?
- What happens when Political-Web graph would become too large - how does AI decide what's "active party-relevant"?
- What happens when Import and Planning workflows are used simultaneously (user switches tabs mid-operation)?
- What happens when BYOLLM configuration is missing or API fails during import/planning?
- What happens when user uploads 10 different files at once to Import workflow?

## Requirements

### Functional Requirements

#### Shared Interface & Access
- **FR-001**: System MUST provide pull-down tab interface accessible from top of every campaign page
- **FR-002**: Pull-down tab MUST reveal Import or Planning AI chat interface that overlays current page view
- **FR-003**: Users MUST be able to seamlessly switch between wiki content and Import/Planning interfaces
- **FR-004**: System MUST provide separate tabs for Import workflow and Planning workflow
- **FR-005**: Both workflows MUST require BYOLLM configuration before activation
- **FR-006**: System MUST display clear error message when Import or Planning is attempted without BYOLLM credentials
- **FR-007**: Both workflows MUST use MCP protocol for bulk operations with streaming responses
- **FR-008**: Both workflows MUST be campaign-scoped (operate within current campaign context)
- **FR-009**: System MUST maintain session state for both Import and Planning across multiple exchanges within same session

#### BYOLLM & MCP Integration
- **FR-010**: System MUST use user-provided LLM API credentials for both Import and Planning workflows
- **FR-011**: System MUST use MCP protocol for entity extraction, batch operations, and knowledge graph updates
- **FR-012**: System MUST provide progress indicators during MCP bulk operations
- **FR-013**: System MUST support cancellation of in-progress MCP operations
- **FR-014**: System MUST handle API failures gracefully with retry options and clear error messages

#### Import Workflow - Content Analysis
- **FR-015**: Import AI MUST support text paste, file upload (.txt, .md, .docx, .pdf), and URL input
- **FR-016**: Import AI MUST analyze provided content and extract entities (characters, locations, factions, items, events, plot threads)
- **FR-017**: Import AI MUST search all existing campaign cards before proposing any changes
- **FR-018**: Import AI MUST distinguish between updates to existing cards and creation of new cards
- **FR-019**: Import AI MUST understand user's custom campaign structure and card organization by searching the wiki
- **FR-020**: Import AI MUST use default campaign template knowledge as fallback when custom structure is unclear
- **FR-021**: Import AI MUST propose appropriate placement for new content based on existing structure (e.g., "add to Locations page", "create entry in NPCs database")
- **FR-022**: Import AI MUST detect when content belongs in default databases (Session Recaps, Characters, Locations, Factions, etc.)

#### Import Workflow - Clarification & Approval
- **FR-023**: Import AI MUST ask all clarifying questions BEFORE presenting approval summary
- **FR-024**: Import AI MUST resolve uncertainties about entity classification, references, and content placement during clarification phase
- **FR-025**: Import AI MUST present approval summary showing: cards to update, cards to create, placement locations, formatting improvements, and any wording changes
- **FR-026**: Import AI MUST NOT create or update any cards without explicit user approval
- **FR-027**: When Import AI suggests wording changes for clarity, users MUST approve new wording explicitly
- **FR-028**: Users MUST be able to review and modify proposed actions in approval summary before final approval
- **FR-029**: Import AI MUST support batch processing of multiple uploaded files into single approval summary

#### Import Workflow - Execution & Reversion
- **FR-030**: Approved import actions MUST execute as a single atomic batch (all cards created/updated at once)
- **FR-031**: Users MUST be able to revert the most recent import batch to restore state before import
- **FR-032**: System MUST limit revert functionality to most recent import batch only (not deep history)
- **FR-033**: Revert functionality MUST be available within current session (may not persist after page refresh)
- **FR-034**: After batch execution, users MUST be able to edit or delete individual cards normally
- **FR-035**: Users MUST be able to select multiple imported cards and cut/paste to correct locations if AI placement was incorrect

#### Import Workflow - Content Formatting & Consistency
- **FR-036**: Import AI MUST improve formatting with headers, subheaders, and structure for readability
- **FR-037**: Import AI MUST preserve original content meaning and exact wording unless user approves changes
- **FR-038**: Import AI MUST NOT autonomously reword or rephrase content without explicit approval
- **FR-039**: When importing unformatted text, Import AI MUST add formatting while preserving all original information
- **FR-040**: Import AI MUST maintain strict consistency with established story events from Session Recaps database
- **FR-041**: Import AI MUST track campaign timeline explicitly with dates or day counts when possible
- **FR-042**: Import AI MUST use Session Recaps database as authoritative source for what has actually occurred in-game
- **FR-043**: Import AI MUST NOT update knowledge graphs (graphs OFF during import)
- **FR-044**: Import AI MUST place relationship information in appropriate wiki content for later Planning AI processing

#### Import Workflow - Flexibility & Adaptation
- **FR-045**: Import AI MUST adapt to user's active editing on wiki side during import sessions
- **FR-046**: Import AI MUST support incremental imports (e.g., "import characters first, locations later") within same content batch
- **FR-047**: Import AI MUST determine correct placement by searching wiki each time (no learning/preference memory)
- **FR-048**: Import AI MUST support customization via [NEEDS CLARIFICATION: environment file, system prompt injection, campaign settings?]

#### Planning Workflow - Graph Update & Management
- **FR-049**: Planning AI MUST be explicitly invoked by user to process imports and update knowledge graphs
- **FR-050**: Planning AI MUST detect when recent imports have occurred since last graph update
- **FR-051**: Planning AI MUST ask user permission before processing imports and updating graphs
- **FR-052**: Planning AI MUST update all four knowledge graphs when processing imports: Geographical, Political-Web, World-Foundations, Campaign-Story
- **FR-053**: Planning AI MUST keep Political-Web graph lean with only active party-relevant relationships (not exhaustive world politics)
- **FR-054**: Planning AI MUST keep Campaign-Story graph lean with only active story threads and events relevant to current campaign
- **FR-055**: Planning AI MUST use Session Recaps database as authoritative timeline when building Campaign-Story graph
- **FR-056**: Planning AI MUST extract relationship information from imported wiki content to build/update graphs
- **FR-057**: Planning AI MUST NOT add inactive or purely lore-based relationships to Political-Web graph (only active party-relevant content)

#### Planning Workflow - Context-Aware Assistance
- **FR-058**: Planning AI MUST use updated knowledge graphs to provide context-aware responses
- **FR-059**: Planning AI MUST reference Session Recaps timeline to maintain consistency with established story
- **FR-060**: Planning AI MUST distinguish between established canon (from Session Recaps) and hypothetical scenarios discussed in planning
- **FR-061**: Planning AI MUST NOT leak planned/hypothetical content into suggestions as if it actually occurred
- **FR-062**: Planning AI MUST prioritize consistency over generation/suggestions
- **FR-063**: Planning AI MUST provide encounter hooks, plot suggestions, and content generation based on graph context
- **FR-064**: Planning AI MUST answer campaign questions using Geographical, Political-Web, World-Foundations, and Campaign-Story graph knowledge

#### Planning Workflow - User Approval & Non-Autonomous Behavior
- **FR-065**: Planning AI MUST NOT autonomously edit any cards without explicit user approval
- **FR-066**: Planning AI MUST provide suggestions and generation without making changes to wiki content
- **FR-067**: When user approves Planning AI suggestions, Planning AI MUST create new cards or update existing cards only with explicit approval
- **FR-068**: Planning AI MUST clearly indicate when content is a suggestion vs actual wiki content
- **FR-069**: Users MUST be able to manually implement Planning AI suggestions or request AI to create approved content

#### Default Template & Structure
- **FR-070**: System MUST provide default campaign template with Session Recaps database
- **FR-071**: Session Recaps database MUST serve as authoritative timeline source for both Import and Planning workflows
- **FR-072**: Default template MUST include standard databases and pages for [NEEDS CLARIFICATION: Characters/NPCs, Locations, Factions, Items, Plot Threads?]
- **FR-073**: Import and Planning AI MUST understand default template structure for content placement and context
- **FR-074**: Users MUST be able to deviate from default template with AI adapting to custom structures

#### Knowledge Graph Architecture
- **FR-075**: System MUST support four knowledge graph types: Geographical, Political-Web, World-Foundations, Campaign-Story
- **FR-076**: Geographical graph MUST represent locations, regions, and spatial relationships
- **FR-077**: Political-Web graph MUST represent active party-relevant political relationships, alliances, and conflicts
- **FR-078**: World-Foundations graph MUST represent core world-building elements, rules, and lore
- **FR-079**: Campaign-Story graph MUST represent active story threads, events, and narrative connections from Session Recaps
- **FR-080**: Knowledge graphs MUST be updated only by Planning AI when user explicitly invokes processing
- **FR-081**: Knowledge graphs MUST [NEEDS CLARIFICATION: be visible to users for inspection/editing, or purely AI-internal?]

### Key Entities

- **Import Session**: Represents an active Import workflow session. Contains uploaded content, chat history, clarifications, proposed actions (updates/creates), approval state, and batch execution status. Supports revert to pre-import state for most recent batch only.

- **Planning Session**: Represents an active Planning workflow session. Contains chat history, knowledge graph update state (pending/current), user questions, AI suggestions, and clear distinction between established canon and hypotheticals discussed.

- **Knowledge Graph**: Represents one of four graph types (Geographical, Political-Web, World-Foundations, Campaign-Story). Contains nodes, edges/relationships, last updated timestamp, and source content references. Political-Web and Campaign-Story graphs maintain lean structure with only active party-relevant content.

- **Graph Node**: Represents an entity within a knowledge graph (location, character, faction, event, concept). Has type, name, attributes, and connections to other nodes. References source wiki cards.

- **Graph Edge**: Represents a relationship between two Graph Nodes. Has relationship type, directionality, strength/relevance, and source content reference. Only included in Political-Web/Campaign-Story if active and party-relevant.

- **Session Recap Entry**: Represents a single game session record in Session Recaps database. Contains session number, date, timeline information (in-world dates/day counts), events summary, and serves as authoritative source for what has actually occurred in campaign.

- **Import Batch**: Represents a single atomic import operation. Contains list of created cards, updated cards, timestamp, and revert state. Only most recent batch can be reverted within session.

- **AI Approval Summary**: Represents the approval interface presented to user before import execution. Contains proposed card updates, proposed card creations, placement locations, formatting changes, wording changes requiring approval, and user approval status.

- **BYOLLM Configuration**: Represents user's LLM API credentials and settings. Required for both Import and Planning workflows. Contains API key, model selection, MCP protocol settings, and optional custom system prompt/environment file.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (4 clarifications needed)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (blocked by clarifications)

---
