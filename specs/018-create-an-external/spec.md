# Feature Specification: External API for Conversational Database Operations

**Feature Branch**: `018-create-an-external`
**Created**: 2025-01-10
**Status**: Draft
**Input**: User description: "Create an external API that allows AI tools like Claude Desktop to perform conversational operations on campaign databases for testing purposes. Game Masters want to test conversational AI workflows where they can chat with an AI assistant to query, create, update, and delete campaign data (NPCs, locations, factions, session recaps, etc.) as an alternative to the stateless import workflow (Feature 017). System provides read and write access to 13 category database tables from Feature 014. AI can query database entries, create new entries, update existing entries, delete entries, navigate hierarchies (for categories that support parent-child relationships), query session recap timelines, and work with knowledge graphs. API runs on localhost for testing only with NO authentication (prototype security model). Enables developers to connect Claude Desktop or other AI tools to test conversational database operations. User can ask AI questions like 'Show me all NPCs in the Thieves Guild faction' or 'Create a new location called The Rusty Anchor tavern in the Docks district' and AI performs database operations conversationally. System respects information level filtering (player_knowledge field) and campaign ownership permissions. All operations are auditable with logging. Performance targets: fast response times for single operations, reasonable performance for bulk operations. Purpose: Testing alternative AI interaction pattern (conversational chat) vs Feature 017 (stateless type-selection). Both approaches exist for comparison during prototype development. Dependencies: Feature 014 (13 category database tables). Reference: This is separate from wiki card operations which will remain for Feature 019 (Wiki Portal). Localhost only, development testing use case, NOT for production."

## Execution Flow (main)
```
1. Parse user description from Input
   → Extracted: External API, conversational operations, AI tools, localhost testing, database access
2. Extract key concepts from description
   → Actors: Developers testing AI workflows, AI assistants (Claude Desktop)
   → Actions: Query, create, update, delete, navigate hierarchies, work with recaps/graphs
   → Data: 13 category database tables, session recaps, knowledge graphs
   → Constraints: Localhost only, no auth, testing prototype, audit logging
3. For each unclear aspect:
   → No clarifications needed - comprehensive description provided
4. Fill User Scenarios & Testing section
   → Scenarios cover: Conversational queries, create operations, update operations, hierarchy navigation, audit logging
5. Generate Functional Requirements
   → Requirements covering capabilities, permissions, logging, performance, testing workflow
6. Identify Key Entities
   → APIRequest (audit logging), no new data entities (operates on existing database tables)
7. Run Review Checklist
   → SUCCESS - Clear requirements, no ambiguities
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

A developer is testing conversational AI workflows for campaign management. They start their localhost backend with the external API enabled and configure Claude Desktop to connect to it. In Claude Desktop, they type: "Show me all NPCs in my Greyhaven campaign." The AI queries the NPCs database, filtering by campaign ownership and the developer's information level permissions, and returns a list of 12 NPCs with their names, descriptions, and affiliations. The developer then says: "Create a new NPC named Marcus the Merchant in the Traders Guild faction." The AI creates the NPC in the database and confirms the creation. The developer asks: "What session recaps mention Marcus?" even though they just created him. The AI queries the session_recaps table and returns empty results since Marcus is new. The developer continues testing by asking the AI to update Marcus's description, navigate the location hierarchy to find all districts in Greyhaven city, and query their Political-Web knowledge graph for faction relationships. All operations are logged for audit. This conversational workflow contrasts with Feature 017's stateless import where users select a type upfront - both approaches exist for testing which feels more natural for different use cases.

**Note:** This API operates on databases (Feature 014) which are the CANON CONTEXT. Wiki card operations (Feature 003) remain separate for Feature 019 (Wiki Portal) and are not part of this testing API.

### Acceptance Scenarios

**Scenario 1: Conversational query for database entries**
1. **Given** developer has configured Claude Desktop to connect to localhost API
2. **And** developer has a campaign with 8 locations in the database
3. **When** they ask AI: "Show me all locations in my campaign"
4. **Then** AI queries locations database filtered by campaign ownership
5. **And** AI returns list of 8 locations with names, descriptions, and types
6. **When** they ask follow-up: "Which locations are taverns?"
7. **Then** AI filters query to location_type = 'tavern'
8. **And** AI returns 2 tavern locations

**Scenario 2: Conversational create operation**
1. **Given** developer is chatting with AI via Claude Desktop
2. **When** they say: "Create a new faction called The Red Hand, they're a thieves guild operating in the shadows"
3. **Then** AI extracts entity details (name: The Red Hand, faction_type: thieves guild, description: operating in the shadows)
4. **And** AI creates faction entry in factions database
5. **And** AI confirms creation with faction ID
6. **When** they immediately query: "Show me all factions"
7. **Then** AI returns list including newly created The Red Hand faction

**Scenario 3: Conversational update operation**
1. **Given** developer has NPC "Sir Gareth" in database with description "A noble knight"
2. **When** they say: "Update Sir Gareth's description to say he's a fallen knight corrupted by dark magic"
3. **Then** AI identifies existing NPC by name search
4. **And** AI updates description field in npcs table
5. **And** AI confirms update
6. **When** they query: "Tell me about Sir Gareth"
7. **Then** AI returns updated description showing corruption

**Scenario 4: Navigate hierarchy conversationally**
1. **Given** developer has location hierarchy: Greyhaven (city) → Docks (district) → Rusty Anchor (tavern)
2. **When** they ask: "What districts are in Greyhaven city?"
3. **Then** AI queries locations where parent_location = Greyhaven ID
4. **And** AI returns Docks district (and any other districts)
5. **When** they ask: "What locations are in the Docks?"
6. **Then** AI queries locations where parent_location = Docks ID
7. **And** AI returns Rusty Anchor tavern

**Scenario 5: Query session recap timeline**
1. **Given** developer has 5 session recaps in chronological order
2. **When** they ask: "What happened in my last 3 sessions?"
3. **Then** AI queries session_recaps table ordered by session_number descending, limit 3
4. **And** AI returns summaries of sessions 5, 4, and 3
5. **When** they ask: "Which sessions mentioned the Dragon of Ash Peak?"
6. **Then** AI searches session recap content for "Dragon of Ash Peak"
7. **And** AI returns session 2 and session 4

**Scenario 6: Conversational delete operation**
1. **Given** developer has item "Broken Sword" they no longer need
2. **When** they say: "Delete the Broken Sword item"
3. **Then** AI identifies item in items table
4. **And** AI asks for confirmation: "Are you sure you want to delete Broken Sword?"
5. **When** developer confirms: "Yes, delete it"
6. **Then** AI deletes item from database
7. **And** AI confirms deletion

**Scenario 7: Bulk query with filtering**
1. **Given** developer has 50 NPCs across multiple factions
2. **When** they ask: "Show me all NPCs in the Thieves Guild faction"
3. **Then** AI queries npcs table where affiliations contains "Thieves Guild"
4. **And** AI returns 8 matching NPCs
5. **When** they ask: "Which of those are marked as DM secret?"
6. **Then** AI filters previous results where player_knowledge = 'dm_secret'
7. **And** AI returns 3 secret NPCs

**Scenario 8: Audit logging of operations**
1. **Given** developer performs 5 conversational operations (2 queries, 2 creates, 1 update)
2. **When** testing session completes
3. **Then** system has logged all 5 operations with timestamps, operation types, parameters, and results
4. **When** developer reviews audit log
5. **Then** log shows complete trace of conversational workflow for debugging
6. **And** log includes campaign_id and user_id for each operation
7. **And** log includes execution times for performance analysis

### Edge Cases

**Query edge cases:**
- What happens if AI query matches 200+ database entries? (Expected: Return paginated results, prompt user to narrow query)
- What happens if user asks ambiguous query like "Show me the thing"? (Expected: AI asks clarifying question about what entity type)
- What happens if query references non-existent campaign? (Expected: Error, explain campaign not found)
- What happens if query syntax is unclear? (Expected: AI attempts interpretation, asks for clarification if needed)
- What happens if query spans multiple categories? (Expected: AI queries each relevant category, aggregates results)

**Create edge cases:**
- What happens if user tries to create duplicate entry? (Expected: AI warns about potential duplicate, asks for confirmation)
- What happens if user provides insufficient information for create? (Expected: AI asks for required fields like name)
- What happens if user tries to create entry in category that doesn't exist? (Expected: Error, list valid categories)
- What happens if create violates data constraints? (Expected: Error, explain constraint violation)
- What happens if user creates with invalid parent reference? (Expected: Error, suggest valid parents)

**Update edge cases:**
- What happens if AI cannot find entity to update? (Expected: AI reports entity not found, suggest similar names)
- What happens if update would violate data constraints? (Expected: Error, explain constraint violation)
- What happens if user wants to update 10 entities at once? (Expected: AI processes batch update, reports success count)
- What happens if update affects referenced entities? (Expected: AI warns about impact, asks for confirmation)
- What happens if user provides ambiguous update target? (Expected: AI asks which entity they mean if multiple matches)

**Delete edge cases:**
- What happens if user tries to delete referenced entity (e.g., location with child locations)? (Expected: AI warns about references, asks for cascade confirmation)
- What happens if user accidentally says "delete all NPCs"? (Expected: AI requires explicit confirmation for bulk destructive operations)
- What happens if delete would orphan child records? (Expected: AI explains orphaning, offers cascade or cancel)

**Permission edge cases:**
- What happens if user tries to access another user's campaign? (Expected: Denied, campaign ownership check fails)
- What happens if user tries to query dm_secret entries while in player view mode? (Expected: Filtered out per information level rules)
- What happens if user is not authenticated? (Expected: N/A for localhost testing, but logged as anonymous for audit)

**API connection edge cases:**
- What happens if Claude Desktop loses connection mid-conversation? (Expected: Reconnect on next request, warn about lost context)
- What happens if localhost API is not running? (Expected: Connection error, clear message to start API)
- What happens if API request times out? (Expected: Error response, allow retry)
- What happens if API returns malformed response? (Expected: AI handles gracefully, reports error to user)

**Performance edge cases:**
- What happens if query takes longer than expected? (Expected: Show progress indicator, timeout after reasonable period)
- What happens if bulk operation affects 100+ rows? (Expected: Process in batches, report progress)
- What happens if database is locked? (Expected: Retry with backoff, report if persistent failure)

**Conversational flow edge cases:**
- What happens if user changes topic mid-conversation? (Expected: AI adapts, maintains context where relevant)
- What happens if user references "the last NPC I created"? (Expected: AI maintains conversation context to resolve reference)
- What happens if user asks for undo after create/update/delete? (Expected: Explain no undo, suggest manual reversal if possible)

---

## Requirements *(mandatory)*

### Functional Requirements

**Core Capability Requirements:**

- **FR-001**: System MUST provide external API accessible via localhost for AI tools to connect
- **FR-002**: System MUST support conversational queries of all 13 category database tables (NPCs, Locations, Factions, Session Recaps, Quests, Player Characters, Lore, World Rules, Planar Forces, Session Prep, Custom Mechanics, Items, Creatures)
- **FR-003**: System MUST support conversational create operations for all 13 categories
- **FR-004**: System MUST support conversational update operations for all 13 categories
- **FR-005**: System MUST support conversational delete operations for all 13 categories with confirmation prompts for destructive actions
- **FR-006**: System MUST support hierarchy navigation queries for categories with parent-child relationships
- **FR-007**: System MUST support session recap timeline queries (chronological ordering, search, filter by content)
- **FR-008**: System MUST support knowledge graph operations (query graphs, query nodes, query relationships)
- **FR-009**: System MUST support bulk operations (query multiple entries, batch updates, batch creates)
- **FR-010**: System MUST maintain conversation context across multiple AI requests within same session

**Permission & Security Requirements:**

- **FR-011**: System MUST enforce campaign ownership permissions (users can only access their own campaigns)
- **FR-012**: System MUST enforce information level filtering (respect player_knowledge field based on view mode)
- **FR-013**: System MUST run on localhost only (127.0.0.1 or localhost domain)
- **FR-014**: System MUST NOT require authentication (testing prototype model)
- **FR-015**: System MUST document security limitations prominently (NOT for production use, localhost testing only)
- **FR-016**: System MUST prevent accidental bulk destructive operations (require explicit confirmation for "delete all", "update all")

**Audit & Logging Requirements:**

- **FR-017**: System MUST log all API operations (queries, creates, updates, deletes) with timestamps
- **FR-018**: System MUST log operation parameters (entity type, filters, values, query text) for debugging
- **FR-019**: System MUST log operation results (success/failure, affected rows, error messages, result summaries)
- **FR-020**: System MUST log campaign_id and user_id for all operations (audit trail)
- **FR-021**: System MUST log execution times for performance analysis
- **FR-022**: System MUST persist audit logs for at least duration of testing session

**Performance Requirements:**

- **FR-023**: System MUST respond to single-entity queries within 100ms (e.g., "show me NPC Sir Gareth")
- **FR-024**: System MUST respond to bulk queries within 500ms for up to 100 results (e.g., "show all NPCs")
- **FR-025**: System MUST respond to create/update/delete operations within 200ms
- **FR-026**: System MUST respond to hierarchy navigation within 300ms for 3-level deep queries
- **FR-027**: System MUST handle timeout gracefully if operation exceeds expected duration

**Error Handling & Debugging Requirements:**

- **FR-028**: System MUST provide clear error messages with debugging information (no generic errors)
- **FR-029**: System MUST distinguish between user errors (invalid request) and system errors (database failure)
- **FR-030**: System MUST suggest corrections for common mistakes (e.g., misspelled entity names, invalid categories)
- **FR-031**: System MUST handle AI request parsing failures gracefully
- **FR-032**: System MUST validate all operations before execution (prevent invalid database states)

**Testing & Development Requirements:**

- **FR-033**: System MUST support AI tools connecting via standard protocols (enable Claude Desktop integration)
- **FR-034**: System MUST provide health check endpoint for connection verification
- **FR-035**: System MUST run alongside main application (separate process or port, non-blocking)
- **FR-036**: System MUST provide clear startup/shutdown procedures in documentation
- **FR-037**: System MUST include example conversation flows in documentation

**Comparison & Alternative Testing:**

- **FR-038**: System MUST enable testing of conversational workflow as alternative to Feature 017 (stateless import)
- **FR-039**: System MUST support same database operations as Feature 017 but via chat instead of type-selection UI
- **FR-040**: System MUST operate on same 13 category tables as Feature 017 (consistent data access)
- **FR-041**: System MUST allow side-by-side comparison testing (both APIs can run concurrently)

### Key Entities

**APIRequest (audit logging):**
- **Purpose**: Tracks all external API operations for debugging and audit
- **Attributes**:
  - operation_type (TEXT: query, create, update, delete, navigate_hierarchy, query_recap, query_graph, bulk_operation)
  - campaign_id (INTEGER: FK to campaigns)
  - user_id (TEXT: Keycloak sub)
  - entity_type (TEXT: one of 13 categories, or session_recap, or knowledge_graph, or null for multi-entity queries)
  - parameters (TEXT: JSON of query filters, create values, update fields, conversational query text)
  - result_status (TEXT: success, error, partial_success)
  - result_summary (TEXT: count of rows affected, error message if failed, result preview)
  - execution_time_ms (INTEGER: performance tracking)
  - created_at (INTEGER: Unix timestamp)
- **Relationships**: Belongs to one Campaign, belongs to one User
- **Lifecycle**: Created for every API operation, persisted indefinitely for audit (or session duration for testing)

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs) - focused on capabilities and testing workflow
- [x] Focused on user value and business needs - testing conversational AI patterns for prototype
- [x] Written for non-technical stakeholders - uses plain language
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous - 41 FRs with clear acceptance criteria
- [x] Success criteria are measurable - performance targets, operation logging verified
- [x] Scope is clearly bounded - Localhost testing only, NOT production, conversational alternative to Feature 017
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated (41 FRs)
- [x] Entities identified (APIRequest for audit logging)
- [x] Review checklist passed

---

## Dependencies and Assumptions

**Dependencies:**
- Feature 014 (Structured Categories): 13 category database tables must exist for API to operate on
- Campaign ownership model: Users must have campaigns to query/modify
- Information level system (Feature 004): player_knowledge filtering must be available

**Assumptions:**
- Developers have Claude Desktop or similar AI tool that can connect to localhost APIs
- Localhost environment has necessary ports available (e.g., 3002 separate from main app 3001)
- AI tools can interpret natural language requests and map to database operations
- Conversational workflow will be compared to Feature 017's stateless import during prototype testing
- Audit logging is sufficient for debugging without real-time monitoring dashboard
- No authentication is acceptable risk for localhost testing (documented prominently)
- AI maintains conversation context within same session (not across sessions/restarts)

**Non-Goals:**
- Production-ready security (authentication, authorization beyond basic campaign ownership)
- Multi-user real-time collaboration on API operations
- Rate limiting or abuse prevention (localhost testing assumption)
- Complex query builder UI (purely conversational interface via AI)
- Webhook or event streaming for real-time updates
- API versioning or backwards compatibility (prototype testing)
- Web-based UI for API operations (AI tool provides interface)
- Integration with external AI services beyond localhost connection
- Wiki card operations (Feature 003) - those remain separate for Feature 019 (Wiki Portal)
- Transaction rollback for multi-step conversational workflows
- Automated testing suite for conversational flows
- API documentation beyond developer setup guide

---

**References:**
- Database schemas: Feature 014 (specs/014-create-the-database/)
- Stateless import alternative: Feature 017 (specs/017-create-a-stateless/)
- Information level filtering: Feature 004 (specs/004-create-a-tagging/)
- Knowledge graph architecture: Feature 006 (specs/006-create-the-knowledge/)
- Wiki card operations: Feature 003 (specs/003-create-a-notion/) - separate from this API, for Feature 019
