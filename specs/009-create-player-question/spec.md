# Feature Specification: Player Question Portal

**Feature Branch**: `009-create-player-question`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "Create Player Question Portal including: Public Q&A interface per campaign accessible via Player Portal tab that opens new page with shareable URL (no login required, relies on wiki-side auth for GM), first-time visitors asked 'Who are you in-game?' for lightweight account linkage, per-player conversation history persists across sessions, uses GM's BYOLLM credentials with prominent warning to set player expectations, GM monitoring panel shows per-player question logs and token usage (reviewed when logging in, no real-time notifications), portal only accesses Common Knowledge and Player Knowledge tagged content (filters out System and DM Secret), knowledge graphs accessible with DM Secret filtering, Session Recaps accessible but each piece verified not DM Secret before use, Items database integration with 'Held By' field for inventory queries (party member names), GM-configurable response style (Friendly Sage, Scholarly Tome, Tavern Gossip, Factual, Custom prompt), AI responses include clickable citations linking to source cards, DM Preview Mode shows filtered player view for testing, GM can enable/disable portal and optionally password-protect it, multiple players use portal simultaneously with isolated conversations, separate portal URLs per campaign (no multi-campaign switching), no rate limiting or question complexity limits (trust-based, GM monitoring only), AI says 'I don't have information' rather than hallucinating."

---

## User Scenarios & Testing

### Primary User Story
A Game Master has been running their Waterdeep campaign for 10 sessions. They've imported notes, tagged world-building as Common Knowledge, revealed information as Player Knowledge, and kept secrets as DM Secret. They've configured their Political-Web knowledge graph and set up an Items database with a "Held By" field tracking which party member owns each item. They click the "Player Portal" tab which opens a new page showing GM controls: "Portal Status: Disabled | Password Protection: None | Response Style: Friendly Sage". They enable the portal, set a password ("dragonborn"), choose "Friendly Sage" response style, and copy the shareable URL. They paste it in their group Discord. Between sessions, player Sarah opens the link, enters the password, and sees: "Waterdeep Campaign - Player Portal | Who are you in-game?" She types "Sarah (playing Lyra the Rogue)". Her identity is saved via lightweight account linkage. She asks: "Who rules Waterdeep?" The AI responds using Common Knowledge + Player Knowledge + filtered Political-Web graph: "Waterdeep is ruled by the Lords of Waterdeep, a council of masked nobles. Lord Dagult Neverember serves as Open Lord. You met him in Session 3 at the palace.[1][2]" The [1][2] are clickable citations linking to the "Waterdeep Government" and "Session 3 Recap" cards. She asks: "What magic items does our party have?" The AI queries the Items database filtering for "Held By" matching party members: "Your party possesses: +1 Longsword (Lyra), Wand of Magic Missiles (Finn), Bag of Holding (shared), Potion of Healing x3 (party supplies).[3]" She asks about the Zhentarim - AI gives general Common Knowledge but NOT the hidden base location (that card is DM Secret). She asks about "our upcoming plans" but that's in DM-only session notes, so AI responds: "I don't have information about that." Her conversation history persists - when she returns tomorrow, the chat is still there. Later, the GM logs in and checks the monitoring panel: "Sarah (Lyra): 8 questions, 4,200 tokens | Finn's player: 3 questions, 1,500 tokens | Total: 5,700 tokens". The GM used their own BYOLLM credentials. A warning on the portal settings had reminded: "Player Portal uses your LLM credentials. Set expectations with players about usage to avoid excessive token consumption." The GM toggles "DM Preview Mode" to test a question and verify no secrets leak. Each player has their own isolated conversation the GM can review. The system is trust-based with no rate limits - players respect the GM's tokens because expectations were set clearly.

### Acceptance Scenarios
1. **Given** I'm a GM, **When** I click Player Portal tab, **Then** I see portal management page with enable/disable toggle, password protection option, response style selector, public URL, and DM Preview Mode
2. **Given** I enable Player Portal, **When** I copy the URL, **Then** I can share it with players for public access
3. **Given** I set password protection, **When** players access portal, **Then** they must enter password before using Q&A interface
4. **Given** I'm a player opening portal for first time, **When** I access URL, **Then** I'm asked "Who are you in-game?" to establish lightweight account linkage
5. **Given** I identify myself as a player, **When** I ask questions, **Then** my conversation history persists across sessions and I can return to it
6. **Given** I ask about in-world lore, **When** information is tagged Common Knowledge, **Then** AI responds with that content plus clickable citations
7. **Given** I ask about revealed information, **When** information is tagged Player Knowledge, **Then** AI responds with that content plus clickable citations
8. **Given** I ask about party inventory, **When** Items database has "Held By" field with party member names, **Then** AI lists those items with citations
9. **Given** I ask about something in knowledge graphs, **When** graph nodes reference non-secret cards, **Then** AI can use that graph context in responses
10. **Given** I ask about something in Session Recaps, **When** recap content is not DM Secret, **Then** AI can reference that session information
11. **Given** I ask about secrets, **When** information is tagged DM Secret, **Then** AI does NOT include it in responses at all
12. **Given** I ask about meta information, **When** information is tagged System, **Then** AI does NOT include it (System is wiki structure, not in-world)
13. **Given** AI doesn't find relevant information, **When** it responds, **Then** it says "I don't have information about that" rather than making things up
14. **Given** I'm a GM, **When** I select response style, **Then** I can choose: Friendly Sage, Scholarly Tome, Tavern Gossip, Factual, or Custom (with my own system prompt)
15. **Given** I'm a GM, **When** I toggle DM Preview Mode, **Then** I see exactly what players see with only filtered content (no secrets)
16. **Given** I'm a GM, **When** I log in and check monitoring panel, **Then** I see per-player question logs, token usage per player, total usage, and timestamps (no real-time notifications)
17. **Given** I'm a GM without BYOLLM configuration, **When** portal is accessed, **Then** players see error explaining GM must configure BYOLLM first
18. **Given** multiple players use portal simultaneously, **When** they ask questions, **Then** each has isolated conversation history identified by their player name
19. **Given** I'm a player, **When** I click citation links in responses, **Then** I navigate to the actual source cards (if I have access)
20. **Given** I'm a GM, **When** I disable portal, **Then** players can't access it but conversation history is preserved for when I re-enable
21. **Given** I have multiple campaigns, **When** I access portals, **Then** each campaign has separate portal URL with no cross-campaign switching

### Edge Cases
- What happens when player tries to access portal without password when password protection is enabled?
- What happens when GM disables portal while players are actively using it?
- What happens when Items database "Held By" field has typos or names not matching party members?
- What happens when Session Recap contains both Player Knowledge and DM Secret information mixed together?
- What happens when player asks extremely long question consuming many tokens?
- What happens when knowledge graph node references a card that has been deleted?
- What happens when GM changes response style while players have active conversations?
- What happens when player identity conflicts (two players claim same character name)?

## Requirements

### Functional Requirements

#### Portal Access & Architecture
- **FR-001**: System MUST provide Player Portal tab in campaign navigation
- **FR-002**: Player Portal tab MUST open new page with unique public URL per campaign
- **FR-003**: Portal access MUST NOT require login (relies on wiki-side authentication for GM verification)
- **FR-004**: Portal URL MUST be shareable to players outside main application
- **FR-005**: Each campaign MUST have separate portal URL with no multi-campaign switching capability
- **FR-006**: Portal MUST be per-campaign with independent configuration per campaign

#### Player Identification & Account Linkage
- **FR-007**: First-time portal visitors MUST be asked "Who are you in-game?" to establish identity
- **FR-008**: Player identification MUST use lightweight account linkage (not full authentication)
- **FR-009**: Player identity MUST persist across sessions via lightweight mechanism
- **FR-010**: Player identity MUST include in-game character name or player name
- **FR-011**: System MUST remember player identity for subsequent portal visits
- **FR-012**: Multiple players MUST be able to use portal simultaneously with separate identities

#### GM Controls & Configuration
- **FR-013**: GM MUST have portal management interface with enable/disable toggle
- **FR-014**: GM MUST be able to enable or disable portal at any time
- **FR-015**: Disabling portal MUST preserve all conversation history for when re-enabled
- **FR-016**: GM MUST be able to set optional password protection for portal
- **FR-017**: When password protection enabled, players MUST enter password before accessing Q&A interface
- **FR-018**: GM MUST be able to change or remove password at any time
- **FR-019**: GM MUST be able to select response style from predefined options: Friendly Sage, Scholarly Tome, Tavern Gossip, Factual
- **FR-020**: GM MUST be able to create Custom response style by writing custom system prompt
- **FR-021**: Response style configuration MUST affect AI personality and tone in portal responses
- **FR-022**: GM MUST see public portal URL for easy sharing

#### BYOLLM Integration & Token Usage
- **FR-023**: Player Portal MUST use GM's BYOLLM credentials for all AI operations
- **FR-024**: Portal settings MUST display prominent warning: "Player Portal uses your LLM credentials. Set expectations with players about usage to avoid excessive token consumption."
- **FR-025**: Portal MUST be blocked if GM has not configured BYOLLM
- **FR-026**: When BYOLLM not configured, portal MUST display error with link to Settings: "GM must configure BYOLLM for Player Portal to function"
- **FR-027**: System MUST NOT implement automatic rate limiting or question complexity limits (trust-based approach)
- **FR-028**: Token usage MUST be tracked per player and aggregated for campaign
- **FR-029**: GM MUST rely on monitoring and player communication to manage token usage

#### Information Filtering - Tag-Based Access
- **FR-030**: Player Portal AI MUST only access cards tagged as Common Knowledge or Player Knowledge
- **FR-031**: Player Portal AI MUST NOT access cards tagged as System (meta/structural information not in-world)
- **FR-032**: Player Portal AI MUST NOT access cards tagged as DM Secret under any circumstances
- **FR-033**: Information filtering MUST match exactly what Player/General View shows (same filtering rules)
- **FR-034**: AI responses MUST be grounded entirely in accessible Common Knowledge + Player Knowledge content

#### Information Filtering - Knowledge Graph Access
- **FR-035**: Player Portal AI MAY query knowledge graphs when answering questions
- **FR-036**: Knowledge graph queries MUST filter out nodes/edges that reference DM Secret cards
- **FR-037**: Political-Web graph MUST be filtered to exclude any DM Secret relationships or entities
- **FR-038**: Campaign-Story graph MUST be filtered to exclude any DM Secret plot threads or events
- **FR-039**: Geographical graph MUST be filtered to exclude any DM Secret location nodes
- **FR-040**: World-Foundations graph MAY be fully accessible (foundational world rules typically Common Knowledge)
- **FR-041**: Graph filtering MUST check each node's referenced card tags before including in AI context

#### Information Filtering - Session Recaps Access
- **FR-042**: Player Portal AI MUST have access to Session Recaps database for timeline and story context
- **FR-043**: System MUST verify each piece of Session Recap content is not tagged DM Secret before AI uses it
- **FR-044**: Session Recap filtering MUST be granular (individual entries or sections checked for DM Secret tags)
- **FR-045**: AI MUST NOT reveal any DM Secret information even if it appears in Session Recaps

#### Items Database Integration
- **FR-046**: Default campaign template MUST include Items database
- **FR-047**: Items database MUST have "Held By" field for tracking item ownership
- **FR-048**: "Held By" field MUST support player character names and "party" for shared items
- **FR-049**: When player asks about party inventory, Portal AI MUST query Items database filtered by party member names
- **FR-050**: Inventory queries MUST match "Held By" field against known party member names from player identities
- **FR-051**: Inventory responses MUST list items with owner information and clickable citations to item cards
- **FR-052**: Inventory queries MUST respect information filtering (DM Secret items not revealed even if in Items database)

#### Conversation History & Persistence
- **FR-053**: Each player MUST have separate conversation history isolated from other players
- **FR-054**: Conversation history MUST persist across sessions (players can return and continue conversations)
- **FR-055**: Conversation persistence MUST be enabled by OAuth-based BYOLLM configuration
- **FR-056**: Players MUST be able to view their own complete question/answer history
- **FR-057**: Players MUST NOT be able to view other players' conversations
- **FR-058**: Conversation history MUST include questions, AI responses, citations, and timestamps
- **FR-059**: System MUST preserve conversation history even when portal is temporarily disabled

#### AI Response Behavior
- **FR-060**: AI responses MUST be grounded in available Common Knowledge + Player Knowledge content only
- **FR-061**: When AI doesn't find relevant information, it MUST respond "I don't have information about that" rather than hallucinating
- **FR-062**: AI MUST NOT invent or fabricate information not present in accessible cards
- **FR-063**: AI responses MUST include clickable citations linking to source cards
- **FR-064**: Citations MUST be displayed as numbered references [1][2] that link to actual source cards
- **FR-065**: Citation links MUST navigate to the referenced card when clicked
- **FR-066**: AI responses MUST follow GM-configured response style (personality and tone)
- **FR-067**: Response style MUST be applied via system prompt that shapes AI behavior

#### GM Monitoring Panel
- **FR-068**: GM MUST have monitoring panel accessible from portal management interface
- **FR-069**: Monitoring panel MUST show per-player question logs (all questions each player has asked)
- **FR-070**: Monitoring panel MUST show token usage per player
- **FR-071**: Monitoring panel MUST show total token usage across all players for the campaign
- **FR-072**: Monitoring panel MUST show timestamps for all questions
- **FR-073**: Monitoring panel MUST update when GM logs in (reviewed on login, no real-time notifications)
- **FR-074**: GM MUST be able to see complete conversation history for each player
- **FR-075**: Monitoring provides oversight since GM's credentials are being used by players

#### DM Preview Mode
- **FR-076**: Portal management interface MUST include "DM Preview Mode" toggle
- **FR-077**: DM Preview Mode MUST show exactly what players see (filtered content only, no DM Secrets)
- **FR-078**: DM Preview Mode MUST allow GM to test questions and verify no spoilers leak
- **FR-079**: DM Preview Mode MUST be clearly indicated in UI to distinguish from normal GM view
- **FR-080**: GM MUST be able to ask test questions in Preview Mode to validate information filtering

#### Multi-Player Support
- **FR-081**: Portal MUST support multiple players using it simultaneously
- **FR-082**: Each player conversation MUST be isolated and private from other players
- **FR-083**: Player identities MUST be tracked separately per player
- **FR-084**: Concurrent conversations MUST not interfere with each other
- **FR-085**: System MUST reject duplicate character names with error: "Character name already in use. Please choose a different name."

#### Trust-Based Usage Model
- **FR-086**: System MUST NOT implement automatic rate limiting per player
- **FR-087**: System MUST NOT implement automatic question length or complexity limits
- **FR-088**: Portal operates on trust-based model where GM sets expectations with players
- **FR-089**: GM monitoring provides visibility into usage for managing player behavior
- **FR-090**: Prominent warning to GM ensures they understand players will use their tokens

### Key Entities

- **Player Portal**: Public Q&A interface per campaign. Contains unique public URL, enable/disable state, optional password protection, response style configuration (Friendly Sage/Scholarly Tome/Tavern Gossip/Factual/Custom), GM BYOLLM credentials reference. Only accesses Common Knowledge + Player Knowledge tagged content. Filters out System and DM Secret tags.

- **Player Identity**: Lightweight account linkage for portal users. Contains in-game character name or player name, conversation history reference, token usage tracking. Established via "Who are you in-game?" prompt on first visit. Persists across sessions. Isolated per player.

- **Portal Conversation**: Per-player chat history in Player Portal. Contains player identity, question/response pairs, citations, timestamps, token usage per question. Persists across sessions via OAuth-enabled storage. Completely isolated from other players' conversations.

- **Response Style Configuration**: GM-defined AI personality for portal. Options: Friendly Sage (warm helpful librarian), Scholarly Tome (formal academic), Tavern Gossip (casual storyteller), Factual (straightforward), Custom (GM writes system prompt). Applied to all portal AI responses. Affects tone and presentation.

- **GM Monitoring Panel**: Interface showing all portal usage. Displays per-player question logs, token usage (per player and total), timestamps, full conversation histories. Reviewed when GM logs in (no real-time notifications). Enables oversight since GM pays tokens.

- **DM Preview Mode**: Testing toggle in portal management. Shows filtered player view with no DM Secrets. Allows GM to ask test questions and verify information filtering works correctly. Clearly indicated in UI to avoid confusion with normal view.

- **Items Database Integration**: Connection between portal and Items database for inventory queries. "Held By" field tracks ownership via player character names or "party". Portal AI queries Items database filtering by party member names. Responses include items with owner info and citations.

- **Information Filtering System**: Mechanism ensuring portal only accesses non-secret content. Filters cards by tags (only Common Knowledge + Player Knowledge). Filters knowledge graph nodes/edges by referenced card tags. Validates Session Recap content piece-by-piece for DM Secret tags. Prevents any secret leakage.

- **Clickable Citation**: Numbered reference in AI response linking to source card. Format: [1][2] at end of statement. Clicking citation navigates to actual source card. Provides transparency about information sources. Multiple citations can reference same card.

- **Password Protection**: Optional security for portal access. GM sets password in portal settings. Players must enter password before accessing Q&A interface. GM can change or remove password anytime. Per-campaign configuration.

- **Token Usage Tracking**: Monitoring system recording BYOLLM token consumption per portal conversation. Tracked per player with aggregated campaign total. Displayed in GM monitoring panel. Enables GM to see cost of portal usage. No automatic limiting (trust-based).

- **Lightweight Account Linkage**: Simple persistent identity mechanism for players. Established via "Who are you in-game?" prompt. Stored via session mechanism (cookies, local storage, or lightweight DB). Does not require full authentication. Enables conversation history persistence.

- **Session Recap Verification**: Granular filtering process for Session Recaps. Each piece of recap content checked for DM Secret tag before AI can use it. Prevents mixed-content Session Recaps from leaking secrets. Validates at content piece level, not just entire recap card level.

- **Trust-Based Usage Model**: No automatic rate limits or complexity restrictions. Relies on GM setting clear expectations with players about token usage. GM monitoring provides visibility. Players respect GM's credentials through social contract.

---

## Clarifications (Session 2025-10-01)

### Q1: Duplicate Character Name Handling (FR-085)
**Decision**: Force unique names - reject duplicate character names with error message.
**Rationale**: Prevents confusion in monitoring panel and conversation tracking. Campaigns don't typically have multiple players with identical character names. Simple validation at identity creation time.
**Implementation**: When player submits "Who are you in-game?" response, check if name already exists in portal_players table for that campaign. If exists, reject with error: "Character name already in use. Please choose a different name."

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all resolved)
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
- [ ] Review checklist passed (blocked by 1 clarification)

---
