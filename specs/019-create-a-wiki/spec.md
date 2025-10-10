# Feature Specification: Wiki Portal

**Feature Branch**: `019-create-a-wiki`
**Created**: 2025-01-10
**Status**: Draft
**Input**: User description: "Create a Wiki Portal as a separate optional feature that preserves existing card-based wiki functionality from Feature 003. Game Masters can access wiki via sidebar button that feels like clicking a portal to a different website/section (separate from main campaign database system). Wiki uses existing card system (hierarchical cards with rich text editing, notion-like features) for GMs who want flexible wiki-building separate from structured databases. Wiki is NOT part of canon context for AI tools - databases (Feature 014) are canon context, wiki is optional organizational tool. Accessed via 'Wiki' button in sidebar, opens to campaign root page. 'Back to Dashboard' button at top to return to database view. Wiki and database coexist in same DB file but separate tables (wiki_cards, wiki_hierarchy for clean separation). Information level filtering (player_knowledge field) available in wiki for public/player view filtering but NOT used for AI context engineering. Supports all existing Feature 003 capabilities: hierarchical cards, rich text editing with TipTap, slash commands, database views (table/list/gallery/kanban), drag-and-drop reordering. Performance: same as Feature 003 targets. Dependencies: Feature 003 (card system architecture), Feature 004 (information levels for filtering), Feature 015 (sidebar navigation). Purpose: Preserve valuable wiki work from earlier features while keeping databases as primary canon context system. Both systems serve different needs: databases for structured AI-queryable data, wiki for flexible GM notes/organization."

## Execution Flow (main)
```
1. Parse user description from Input
   → Extracted: Wiki Portal, optional feature, preserves Feature 003, separate from databases
2. Extract key concepts from description
   → Actors: Game Masters wanting flexible wiki organization
   → Actions: Navigate to wiki, create/edit cards, organize hierarchy, filter by info levels
   → Data: Wiki cards (separate from database entities)
   → Constraints: NOT for AI context, separate tables, optional tool
3. For each unclear aspect:
   → No clarifications needed - comprehensive description provided
4. Fill User Scenarios & Testing section
   → Scenarios cover: Portal navigation, card creation, rich text editing, hierarchy organization, info level filtering
5. Generate Functional Requirements
   → Requirements covering portal access, card operations, editing, organization, filtering, performance
6. Identify Key Entities
   → WikiCard, WikiHierarchy (separate from database entities)
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

A Game Master is managing their Greyhaven campaign using the database system for structured data (NPCs, locations, factions). They want to also maintain freeform GM notes, world-building ideas, and player handouts that don't fit neatly into database categories. From their campaign dashboard, they click the "Wiki" button in the sidebar. The interface transitions to wiki view, feeling like entering a different section of the application. They see their campaign root wiki page. They create a new card called "Session Planning Notes" and use rich text editing to write detailed prep notes with headings, lists, and embedded tables. They create child cards for individual session plans, organizing them in a hierarchy. They mark some cards as "DM Secret" for their eyes only, and others as "Player Knowledge" for public viewing. When done, they click "Back to Dashboard" at the top and return to the database view. The wiki remains separate - AI tools (Feature 017/018) query databases only, not wiki content. The wiki serves as flexible GM organization space outside the canon context system, complementing the structured database approach.

**Note:** Wiki is NOT part of canon context for AI tools. Databases (Feature 014) are canon context. Wiki is optional organizational tool for GMs who want notion-like flexibility separate from structured data.

### Acceptance Scenarios

**Scenario 1: Access wiki portal from dashboard**
1. **Given** GM is on campaign dashboard (database view)
2. **When** they click "Wiki" button in sidebar
3. **Then** interface transitions to wiki view
4. **And** displays campaign root wiki page
5. **And** "Back to Dashboard" button appears at top
6. **And** sidebar shows wiki-specific navigation
7. **When** they click "Back to Dashboard"
8. **Then** interface transitions back to database view
9. **And** returns to previous dashboard location

**Scenario 2: Create and edit wiki cards**
1. **Given** GM is in wiki view
2. **When** they click "New Card" button
3. **Then** system creates new wiki card
4. **And** opens rich text editor
5. **When** they type title "Session Planning Notes"
6. **And** add rich text content with headings, lists, tables
7. **And** click Save
8. **Then** card is persisted in wiki_cards table
9. **And** card appears in wiki hierarchy
10. **When** they reopen card for editing
11. **Then** all content is preserved with formatting intact

**Scenario 3: Organize wiki card hierarchy**
1. **Given** GM has root wiki card "World Building"
2. **When** they create child card "Geography"
3. **And** create child card "History"
4. **And** nest "Geography" under "World Building"
5. **Then** hierarchy is established: World Building → Geography
6. **When** they drag "History" card to reorder
7. **Then** wiki_hierarchy table reflects new order
8. **When** they navigate to "World Building" card
9. **Then** system shows child cards Geography and History

**Scenario 4: Information level filtering in wiki**
1. **Given** GM has 5 wiki cards with mixed information levels
2. **And** 2 cards marked "dm_secret"
3. **And** 3 cards marked "player_knowledge"
4. **When** they toggle view mode to "Player View"
5. **Then** system filters wiki cards by player_knowledge field
6. **And** displays only 3 player-visible cards
7. **And** hides 2 DM secret cards
8. **When** they toggle back to "DM View"
9. **Then** all 5 cards are visible

**Scenario 5: Use slash commands in wiki**
1. **Given** GM is editing wiki card content
2. **When** they type "/" in editor
3. **Then** slash command palette appears
4. **When** they select "/table"
5. **Then** table is inserted at cursor
6. **When** they type "/heading1"
7. **Then** text is formatted as H1 heading
8. **When** they type "/database"
9. **Then** embedded database view (table/list/gallery/kanban) is inserted

**Scenario 6: Create database views within wiki cards**
1. **Given** GM has wiki card "NPC Reference"
2. **When** they use slash command "/database"
3. **Then** system prompts for database view type (table/list/gallery/kanban)
4. **When** they select "table" view
5. **Then** embedded table interface appears
6. **When** they add columns (Name, Role, Location)
7. **And** add 5 rows of NPC data
8. **Then** data is stored as structured JSONB within wiki card
9. **When** they switch view to "kanban"
10. **Then** same data renders as kanban board with configurable columns

**Scenario 7: Separate storage for wiki and databases**
1. **Given** GM has database entities (12 NPCs in npcs table)
2. **And** GM has wiki cards (8 cards in wiki_cards table)
3. **When** they delete wiki card "Session Notes"
4. **Then** wiki_cards table removes 1 entry
5. **And** database entities remain unchanged (still 12 NPCs)
6. **When** they delete NPC "Marcus" from database
7. **Then** npcs table removes 1 entry
8. **And** wiki cards remain unchanged (still 7 cards)
9. **When** campaign is exported
10. **Then** backup includes both wiki_cards and database tables (clean separation, same file)

**Scenario 8: Wiki NOT used for AI context**
1. **Given** GM has 10 wiki cards with detailed world-building notes
2. **And** GM has 15 database NPCs
3. **When** AI tool (Feature 018) queries "show all NPCs"
4. **Then** AI queries npcs database table only
5. **And** AI returns 15 database NPCs
6. **And** AI does NOT search wiki_cards table
7. **When** GM uses stateless import (Feature 017) to import session notes
8. **Then** import writes to database tables only
9. **And** import does NOT create wiki cards
10. **When** GM explicitly wants content in wiki
11. **Then** GM manually creates wiki cards separate from import/database operations

### Edge Cases

**Portal navigation edge cases:**
- What happens if user navigates to wiki with unsaved dashboard changes? (Expected: Warning prompt to save or discard)
- What happens if user has wiki open in one tab and dashboard in another? (Expected: Warning about multiple tabs, suggest single tab workflow)
- What happens if "Back to Dashboard" is clicked with unsaved wiki changes? (Expected: Save prompt before navigation)

**Card creation/editing edge cases:**
- What happens if card title exceeds character limit (500 chars)? (Expected: Validation error, show limit)
- What happens if rich text content is very large (>1MB)? (Expected: Warning, suggest splitting into multiple cards)
- What happens if user tries to create card with duplicate name? (Expected: Allow duplicates with warning, suggest unique names)
- What happens if card save fails (database error)? (Expected: Error message, preserve unsaved content in memory for retry)

**Hierarchy organization edge cases:**
- What happens if user creates circular reference (card A → card B → card A)? (Expected: Validation error, prevent circular hierarchy)
- What happens if user moves card with 50 children? (Expected: Confirm bulk move, warn about performance)
- What happens if user deletes parent card? (Expected: Prompt for cascade delete or orphan children)
- What happens if drag-drop reordering conflicts with hierarchy rules? (Expected: Prevent invalid drop, show helper text)

**Information level filtering edge cases:**
- What happens if all wiki cards are DM secret in Player View? (Expected: Show empty state message "No player-visible content")
- What happens if user forgets to set information level? (Expected: Default to "common_knowledge", editable later)
- What happens if information level is changed on card with 20 children? (Expected: Prompt to apply recursively or single card only)

**Database view edge cases:**
- What happens if embedded database has 200+ rows? (Expected: Pagination, warn about performance)
- What happens if kanban column has 100+ cards? (Expected: Virtualized scrolling, performance warning)
- What happens if database schema is changed after data entry? (Expected: Migrate existing data to new schema, validate)
- What happens if user switches view type (table → kanban) with complex data? (Expected: Data transformation with validation, warn if data loss)

**Slash command edge cases:**
- What happens if slash command palette triggered but no commands match? (Expected: Show "No commands found", allow text entry)
- What happens if user types "/" mid-sentence? (Expected: Smart detection, only trigger palette at word boundaries)
- What happens if user spam-clicks slash commands? (Expected: Debounce, prevent duplicate inserts)

**Storage edge cases:**
- What happens if wiki_cards table reaches 10,000 cards? (Expected: Performance warning, suggest archiving old cards)
- What happens if database export includes 5GB of data? (Expected: Progress indicator, stream export to prevent memory issues)
- What happens if wiki and database have conflicting IDs? (Expected: Separate ID spaces (wiki_card_id vs database_entity_id), no conflicts)

**Performance edge cases:**
- What happens if card hierarchy is 20 levels deep? (Expected: Warn about depth, suggest flattening hierarchy)
- What happens if single card has 100+ child cards? (Expected: Paginate children, virtualize rendering)
- What happens if rich text editor has 10,000 words? (Expected: Performance warning, suggest splitting content)

---

## Requirements *(mandatory)*

### Functional Requirements

**Portal Access & Navigation Requirements:**

- **FR-001**: System MUST provide "Wiki" button in sidebar visible from all campaign dashboard views
- **FR-002**: Clicking "Wiki" button MUST transition interface to wiki view (feels like portal to separate section)
- **FR-003**: Wiki view MUST display "Back to Dashboard" button at top for returning to database view
- **FR-004**: "Back to Dashboard" MUST preserve user's previous dashboard location (category, filters, scroll position)
- **FR-005**: System MUST show unsaved changes warning if navigating away from wiki with unsaved edits
- **FR-006**: System MUST support wiki access from any campaign (multi-campaign wiki management)

**Wiki Card Creation & Editing Requirements:**

- **FR-007**: System MUST allow creation of new wiki cards from wiki view
- **FR-008**: Wiki cards MUST support rich text editing with TipTap editor (headings, lists, tables, formatting)
- **FR-009**: System MUST persist wiki card content in wiki_cards table (separate from database entities)
- **FR-010**: Wiki cards MUST have title field (required, max 500 characters)
- **FR-011**: Wiki cards MUST have rich text content field (optional, supports formatting)
- **FR-012**: System MUST auto-save wiki card edits every 30 seconds
- **FR-013**: System MUST show save indicator (saving, saved, error) for user feedback
- **FR-014**: Wiki cards MUST support versioning (track edit history for undo/revert)

**Hierarchy Organization Requirements:**

- **FR-015**: Wiki cards MUST support parent-child hierarchical relationships
- **FR-016**: System MUST persist hierarchy in wiki_hierarchy table (separate from database hierarchy)
- **FR-017**: System MUST support drag-and-drop reordering of wiki cards
- **FR-018**: System MUST prevent circular references in wiki hierarchy (validation)
- **FR-019**: System MUST support moving cards with confirmation for cards with children (cascade move)
- **FR-020**: Deleting parent card MUST prompt for cascade delete or orphan children
- **FR-021**: System MUST display breadcrumb navigation for wiki card hierarchy
- **FR-022**: System MUST support expanding/collapsing wiki card tree (all levels)

**Information Level Filtering Requirements:**

- **FR-023**: Wiki cards MUST include player_knowledge field (dm_secret, player_knowledge, common_knowledge)
- **FR-024**: System MUST filter wiki cards based on view mode (DM View shows all, Player View filters)
- **FR-025**: Information level filtering MUST apply to wiki cards only (NOT used for AI context engineering)
- **FR-026**: System MUST default new wiki cards to "common_knowledge" if not specified
- **FR-027**: System MUST allow bulk information level updates for multiple cards
- **FR-028**: Information level changes MUST support recursive application to child cards (optional)

**Slash Command Requirements:**

- **FR-029**: Wiki editor MUST support slash commands triggered by typing "/"
- **FR-030**: Slash command palette MUST show available commands (headings, lists, tables, database views, etc.)
- **FR-031**: Slash commands MUST insert formatted content at cursor position
- **FR-032**: System MUST support custom slash commands (configurable by GM)
- **FR-033**: Slash command palette MUST filter commands as user types (fuzzy search)

**Database View Embed Requirements:**

- **FR-034**: Wiki cards MUST support embedding database views (table, list, gallery, kanban)
- **FR-035**: Embedded database views MUST store data as structured JSONB within wiki card
- **FR-036**: Embedded databases MUST support schema definition (column names, types)
- **FR-037**: Embedded databases MUST support CRUD operations on rows (create, read, update, delete)
- **FR-038**: System MUST allow switching view types (table ↔ list ↔ gallery ↔ kanban) for same data
- **FR-039**: Embedded database views MUST support pagination for large datasets (100+ rows)
- **FR-040**: Kanban views MUST support drag-and-drop between columns

**Separate Storage Requirements:**

- **FR-041**: Wiki cards MUST be stored in wiki_cards table (separate from database entity tables)
- **FR-042**: Wiki hierarchy MUST be stored in wiki_hierarchy table (separate from database hierarchy)
- **FR-043**: Wiki and database MUST coexist in same SQLite file (clean separation via tables)
- **FR-044**: Deleting wiki cards MUST NOT affect database entities
- **FR-045**: Deleting database entities MUST NOT affect wiki cards
- **FR-046**: Campaign export MUST include both wiki and database tables
- **FR-047**: Campaign delete MUST cascade to both wiki and database tables (clean removal)

**AI Context Exclusion Requirements:**

- **FR-048**: AI tools (Feature 018) MUST query database tables only (NOT wiki_cards)
- **FR-049**: Stateless import (Feature 017) MUST write to database tables only (NOT wiki_cards)
- **FR-050**: Wiki content MUST be excluded from AI context engineering
- **FR-051**: System documentation MUST clearly state: "Databases = canon context, Wiki = optional GM tool"
- **FR-052**: Wiki MUST be optional (campaigns can function without wiki usage)

**Performance Requirements:**

- **FR-053**: Wiki card creation MUST complete within 200ms
- **FR-054**: Rich text editing MUST render within 100ms for cards up to 5000 words
- **FR-055**: Hierarchy navigation (expand/collapse) MUST respond within 150ms
- **FR-056**: Slash command palette MUST appear within 50ms of typing "/"
- **FR-057**: View mode toggle (DM ↔ Player) MUST filter cards within 300ms for 100 cards
- **FR-058**: Auto-save MUST not block editing (async background save)

### Key Entities

**WikiCard:**
- **Purpose**: Represents flexible, freeform GM content separate from structured database entities
- **Attributes**:
  - wiki_card_id (INTEGER: primary key, auto-increment)
  - campaign_id (INTEGER: FK to campaigns)
  - user_id (TEXT: Keycloak sub, creator)
  - title (TEXT: card title, max 500 chars, required)
  - content (TEXT: rich text JSON from TipTap editor, optional)
  - player_knowledge (TEXT: dm_secret, player_knowledge, common_knowledge, default common_knowledge)
  - created_at (INTEGER: Unix timestamp)
  - updated_at (INTEGER: Unix timestamp)
  - version (INTEGER: edit version for history tracking)
- **Relationships**: Belongs to one Campaign, belongs to one User (creator), has many WikiHierarchy entries
- **Lifecycle**: Created on wiki card creation, updated on edits, soft deleted on user delete (preserve hierarchy)

**WikiHierarchy:**
- **Purpose**: Tracks parent-child relationships between wiki cards (separate from database hierarchy)
- **Attributes**:
  - wiki_hierarchy_id (INTEGER: primary key, auto-increment)
  - parent_wiki_card_id (INTEGER: FK to wiki_cards, nullable for root cards)
  - child_wiki_card_id (INTEGER: FK to wiki_cards)
  - order_index (INTEGER: sibling order for reordering)
  - created_at (INTEGER: Unix timestamp)
- **Relationships**: Parent WikiCard (optional), Child WikiCard (required)
- **Lifecycle**: Created on card nesting, updated on reordering, deleted on card delete (cascade rules apply)

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs) - focused on wiki portal user experience
- [x] Focused on user value and business needs - flexible GM organization tool
- [x] Written for non-technical stakeholders - uses plain language
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous - 58 FRs with clear acceptance criteria
- [x] Success criteria are measurable - performance targets, feature completeness verified
- [x] Scope is clearly bounded - Optional wiki tool, NOT for AI context, separate from databases
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated (58 FRs)
- [x] Entities identified (WikiCard, WikiHierarchy)
- [x] Review checklist passed

---

## Dependencies and Assumptions

**Dependencies:**
- Feature 003 (Card-Based Content Architecture): Wiki reuses card system patterns (hierarchical structure, rich text editing)
- Feature 004 (Information Level Filtering): Wiki uses player_knowledge field for view mode filtering
- Feature 015 (Dashboard & Navigation): Wiki integrates with sidebar navigation

**Assumptions:**
- Wiki is optional feature - campaigns can function without wiki usage
- GMs understand databases are canon context, wiki is separate organizational tool
- Same DB file acceptable for wiki and database tables (clean separation via table names)
- TipTap rich text editor supports all needed formatting (headings, lists, tables, embedded databases)
- Information level filtering sufficient for wiki (no complex permission model needed)
- Auto-save every 30 seconds acceptable (balance between save frequency and server load)

**Non-Goals:**
- Real-time collaborative editing of wiki cards (single-user edit at a time)
- Wiki-specific AI features (AI tools query databases only, not wiki)
- Automatic wiki generation from database data (manual wiki creation only)
- Wiki publishing to external sites (internal campaign tool only)
- Wiki search separate from database search (unified search acceptable for future)
- Wiki templates or starter content (empty slate, GM creates all)
- Import/export of wiki-only content (campaign export includes everything)
- Wiki-specific permissions beyond information levels (campaign ownership sufficient)
- Cross-linking between wiki cards and database entities (separate systems)
- Wiki activity feed or change log (version history per card only)

---

**References:**
- Card system architecture: Feature 003 (specs/003-create-a-notion/)
- Information level filtering: Feature 004 (specs/004-create-a-tagging/)
- Dashboard navigation: Feature 015 (specs/015-create-the-dashboard/)
- Database system (canon context): Feature 014 (specs/014-create-the-database/)
- AI tools (database only): Feature 017 (specs/017-create-a-stateless/), Feature 018 (specs/018-create-an-external/)
