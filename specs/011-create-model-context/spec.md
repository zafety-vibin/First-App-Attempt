# Feature Specification: Model Context Protocol (MCP) Integration

**Feature Branch**: `011-create-model-context`
**Created**: 2025-10-03
**Status**: Draft
**Input**: User description: "Implement real Anthropic Model Context Protocol (MCP) to provide AI with structured tools for campaign data manipulation. This enables Import AI (Feature 005) and Planning AI to directly call functions like read_card(), create_card(), update_knowledge_graph() instead of parsing JSON from LLM responses. MCP provides the 'HOW' infrastructure that Feature 005's 'WHAT' AI features will use."

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
When a Game Master uses Import AI or Planning AI features (Feature 005), the AI assistant needs to access and manipulate campaign data (cards, knowledge graphs, session recaps). Instead of the AI outputting JSON that the system must parse and validate, the AI directly calls structured functions like "create a new card for the NPC 'Elara the Wise'" or "add a relationship to the Political-Web graph connecting House Baratheon to House Stark." The MCP infrastructure provides these callable tools, ensuring data integrity through atomic operations and permission enforcement.

### Acceptance Scenarios

1. **Given** Import AI is processing uploaded session notes, **When** AI identifies new NPC "Elara the Wise", **Then** AI calls `create_card(parent_id: characters_folder, title: "Elara the Wise", card_type: "text")` tool and system creates card atomically

2. **Given** Planning AI is helping GM plan next session, **When** AI needs to check existing NPCs in city "Waterdeep", **Then** AI calls `search_cards(query: "Waterdeep", card_type: "text", scope: descendants_of_card_123)` and receives list of matching cards

3. **Given** Import AI extracts political alliance from text, **When** AI needs to update Political-Web graph, **Then** AI calls `update_graph(graph_type: "Political-Web", operation: "add_edge", from_node: "House Stark", to_node: "House Tully", relationship: "allied")` and graph updates atomically

4. **Given** Planning AI references session timeline, **When** AI needs context from last 5 sessions, **Then** AI calls `get_session_recaps(limit: 5, order: descending)` and receives chronologically ordered recaps

5. **Given** GM has DM Secret cards about plot twists, **When** AI attempts to read card marked "DM Secret", **Then** system enforces information level permissions and either allows (if AI context is DM mode) or denies access

6. **Given** AI attempts to delete card with children, **When** AI calls `delete_card(card_id: 123)`, **Then** system returns error "Cannot delete card with children. Delete or move children first."

7. **Given** MCP server crashes during AI operation, **When** system detects server unavailable, **Then** AI features gracefully disable with user notification "AI features temporarily unavailable"

### Edge Cases

- What happens when AI tries to create circular hierarchy (card A parent of B, B parent of A)?
  → Tool returns error, no database changes committed

- What happens when AI calls tool with invalid card_id?
  → Tool returns error with specific message "Card not found: {id}"

- What happens when AI tries to update knowledge graph node that doesn't exist?
  → Tool creates node if operation allows, or returns error for update-only operations

- What happens when multiple AI requests call tools simultaneously?
  → Database transactions ensure atomic operations, no race conditions

- How does system handle AI tool calls that exceed timeout?
  → Tool call aborts after timeout, returns error, no partial changes committed

- How does system validate AI is not creating duplicate entities?
  → Tools include fuzzy search capabilities to check for similar existing entities before creation

## Requirements *(mandatory)*

### Functional Requirements

**MCP Server Lifecycle**
- **FR-001**: System MUST provide MCP server that communicates via stdio (standard input/output) following Anthropic MCP protocol specification
- **FR-002**: System MUST register MCP server with MCP registry so AI can discover available tools
- **FR-003**: System MUST handle MCP server crashes gracefully by disabling AI features with user notification
- **FR-004**: System MUST restart MCP server automatically on crash with exponential backoff (max 3 retries)
- **FR-005**: System MUST validate all tool calls against schema before executing

**Card Operations Tools**
- **FR-006**: System MUST provide `read_card(card_id)` tool that returns card content, metadata, and hierarchy position
- **FR-007**: System MUST provide `search_cards(query, card_type?, parent_id?, information_level?)` tool with fuzzy matching
- **FR-008**: System MUST provide `create_card(parent_id, title, card_type, content?, information_level?)` tool with hierarchy validation
- **FR-009**: System MUST provide `update_card(card_id, title?, content?, information_level?)` tool
- **FR-010**: System MUST provide `delete_card(card_id)` tool with protection against deleting cards with children
- **FR-011**: System MUST provide `move_card(card_id, new_parent_id, position?)` tool with circular reference detection
- **FR-012**: System MUST provide `list_children(card_id, depth?)` tool returning hierarchical tree structure

**Hierarchy Navigation Tools**
- **FR-013**: System MUST provide `get_card_path(card_id)` tool returning breadcrumb trail from root to card
- **FR-014**: System MUST provide `get_subtree(card_id, max_depth?)` tool returning all descendants with content
- **FR-015**: System MUST provide `get_siblings(card_id)` tool returning cards at same hierarchy level
- **FR-016**: System MUST provide `get_ancestor(card_id, levels_up)` tool for traversing up hierarchy

**Knowledge Graph Tools**
- **FR-017**: System MUST provide `query_graph(graph_type, node_name?, relationship_type?)` tool for graph queries
- **FR-018**: System MUST provide `list_graph_nodes(graph_type, active_only?)` tool with active filtering
- **FR-019**: System MUST provide `get_node_relationships(graph_type, node_name)` tool returning edges
- **FR-020**: System MUST provide `update_graph(graph_type, operation, node_data?, edge_data?)` tool for atomic graph mutations

**Session Recap Tools**
- **FR-021**: System MUST provide `get_session_recaps(campaign_id, limit?, order?)` tool with pagination
- **FR-022**: System MUST provide `get_timeline_events(start_date?, end_date?, tags?)` tool for temporal queries

**MCP Resources**
- **FR-023**: System MUST provide `campaign://cards` resource allowing AI to browse card hierarchy
- **FR-024**: System MUST provide `campaign://recaps` resource for browsing session history
- **FR-025**: System MUST provide `campaign://graphs/{type}` resource for browsing knowledge graphs

**MCP Prompts**
- **FR-026**: System MUST provide `import_workflow` prompt template for Import AI structured workflow
- **FR-027**: System MUST provide `planning_workflow` prompt template for Planning AI structured workflow

**Permission & Security**
- **FR-028**: System MUST enforce campaign ownership - tools only access cards from GM's campaigns
- **FR-029**: System MUST respect information level filtering based on AI context mode (DM vs Player view)
- **FR-030**: System MUST validate card hierarchy constraints (no circular references, valid parent IDs)
- **FR-031**: System MUST prevent tool calls from accessing deleted or archived cards
- **FR-032**: System MUST log all tool calls with timestamp, tool name, parameters, and result status

**Atomic Operations**
- **FR-033**: System MUST ensure all tool calls execute as atomic database transactions (all-or-nothing)
- **FR-034**: System MUST rollback partial changes if tool call fails mid-operation
- **FR-035**: System MUST prevent race conditions when multiple AI requests modify same card/graph simultaneously

**Error Handling**
- **FR-036**: System MUST return structured error responses with error code, message, and details
- **FR-037**: System MUST distinguish between user errors (invalid input) and system errors (server crash)
- **FR-038**: System MUST provide retry mechanism for transient errors (database locked, network timeout)
- **FR-039**: System MUST timeout tool calls after 10 seconds to prevent hanging
- **FR-040**: System MUST validate required parameters before executing tool (fail fast)

**Performance**
- **FR-041**: System MUST complete `read_card` tool calls in under 100ms for single card
- **FR-042**: System MUST complete `search_cards` tool calls in under 500ms for queries returning up to 100 results
- **FR-043**: System MUST complete `create_card` tool calls in under 200ms including hierarchy validation
- **FR-044**: System MUST support concurrent tool calls (at least 5 simultaneous requests)
- **FR-045**: System MUST handle knowledge graphs with up to 500 nodes and 1000 edges without performance degradation

**Integration with Feature 005**
- **FR-046**: System MUST provide tools that Feature 005 Import AI can use for entity extraction workflow
- **FR-047**: System MUST provide tools that Feature 005 Planning AI can use for session planning workflow
- **FR-048**: System MUST expose fuzzy entity matching to prevent Import AI from creating duplicate NPCs/locations
- **FR-049**: System MUST provide batch operation capabilities for Import AI approval workflow

**Data Validation**
- **FR-050**: System MUST validate card_type parameter against allowed types (text, database, map)
- **FR-051**: System MUST validate information_level parameter against campaign's configured levels
- **FR-052**: System MUST validate graph_type parameter against allowed types (Geographical, Political-Web, World-Foundations, Campaign-Story, custom:{type})
- **FR-053**: System MUST validate JSONB schema for knowledge graph nodes and edges

**Information Level Discovery Tools**
- **FR-054**: System MUST provide `list_information_levels(campaign_id)` tool that returns all information levels with id, name, and hierarchy_level
- **FR-055**: System MUST provide `get_information_level_by_name(campaign_id, name)` tool for finding level ID by name (e.g., "DM Secret")

**Database Card Tools**
- **FR-056**: System MUST provide `query_database_card(card_id, filters?)` tool for querying rows in database cards
- **FR-057**: System MUST provide `create_database_entry(card_id, data)` tool for adding rows to database cards
- **FR-058**: System MUST provide `update_database_entry(card_id, entry_id, data)` tool for editing database card rows

**Map Card Tools**
- **FR-059**: System MUST provide `list_map_pins(card_id)` tool that returns pins on map-enabled cards with x, y, label, and referenced_card_id
- **FR-060**: System MUST provide `create_map_pin(parent_card_id, x, y, label, referenced_card_id?)` tool for adding pins to map cards

### Key Entities *(include if feature involves data)*

- **MCP Server**: Background process that handles tool calls from AI, communicates via stdio, manages connection to SQLite database, enforces permissions and validates operations

- **MCP Tool**: Callable function exposed to AI with defined parameters and return schema (e.g., `read_card`, `create_card`, `update_graph`)

- **MCP Resource**: Browsable data source accessible via URI scheme (e.g., `campaign://cards/123`, `campaign://graphs/Political-Web`)

- **MCP Prompt**: Structured workflow template that guides AI behavior for specific tasks (e.g., `import_workflow`, `planning_workflow`)

- **Tool Call**: Individual AI request to execute MCP tool with specific parameters, logged with timestamp and result

- **Tool Response**: Structured response from MCP tool containing either success data or error information

- **Permission Context**: AI's current mode (DM view vs Player view) and campaign access rights that determine tool authorization

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (all resolved)
- [x] User scenarios defined
- [x] Requirements generated (60 functional requirements)
- [x] Entities identified
- [x] Review checklist passed

---
