# Feature Specification: Dashboard & Navigation UI

**Feature Branch**: `015-create-the-dashboard`
**Created**: 2025-01-09
**Status**: Draft - Clarifications Resolved
**Input**: User description: "Create the Dashboard & Navigation UI for the hybrid campaign management system. Dashboard homepage displays 7 default widgets pulling from structured category tables. Sidebar navigation shows 4-type hierarchy (SETTING, LIVING WORLD, CAMPAIGN, EXTENDED) with collapsible category sections. Category landing pages show stats, recent items, and search/filter controls. Table view for all 13 categories with sortable columns. Entity detail pages display all fields with edit capability. Entity creation/edit forms with validation. Depends on Feature 014 (Database Foundation) APIs. NO knowledge graph visualizations (that's Feature 016), NO campaign wizard (that's Feature 017). Table view only - prepare architecture for future Gallery/Board view toggles but don't implement them. Reference specs/Architecture-Updates.md for 4-type hierarchy and category organization."

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

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

A Game Master logs into their campaign and lands on a dashboard showing key campaign information at a glance. They can see quick stats about their NPCs, locations, factions, and recent session activity through widgets. When they need to manage specific content, they navigate using a sidebar organized by content type (SETTING, LIVING WORLD, CAMPAIGN, EXTENDED). They can drill down into any category to see all entities in a sortable table, create new entities, or edit existing ones.

### Key Concept: Dashboard Data Sources

**Dashboard & Navigation (this feature)** displays data from structured databases:
- All 7 widgets pull from 13 category database tables (Feature 014)
- Sidebar navigation shows database categories organized by 4-type hierarchy
- Category landing pages, table views, and entity forms all interface with database system
- This is the CANON CONTEXT system - what AI tools use for planning and import

**Wiki Portal (Feature 018)** is accessed via sidebar button:
- Separate optional feature for GMs who want notion-like wiki building
- Feels like clicking a portal to a different website/section
- NOT part of canon context - outside AI context engineering
- Can be used for public/player view filtering but not for AI planning
- Uses existing card system from earlier work

**User education**: Dashboard makes it clear that database system is the source of truth for campaign state, while Wiki is an optional organizational tool.

**User Flow:**
1. User accesses campaign homepage
2. Dashboard displays widgets showing campaign statistics (active NPCs count, recent locations, upcoming quests, etc.)
3. User clicks on sidebar category (e.g., "NPCs" under LIVING WORLD)
4. Category landing page displays statistics, recent items, and search/filter controls
5. User views all NPCs in a table with sortable columns
6. User clicks on specific NPC to view detailed entity page
7. User edits NPC information using form
8. User creates new NPC using creation form
9. System validates required fields before saving

### Acceptance Scenarios

1. **Given** user has campaign with existing NPCs, locations, and session recaps, **When** user accesses campaign dashboard, **Then** widgets display accurate counts and recent items from each category

2. **Given** user is viewing dashboard, **When** user clicks "NPCs" in sidebar under "LIVING WORLD" section, **Then** system navigates to NPCs category landing page showing NPC statistics and table view

3. **Given** user is viewing NPCs table, **When** user clicks column header (e.g., "Name" or "Faction"), **Then** table sorts by that column in ascending/descending order

4. **Given** user is viewing NPCs table, **When** user types in search box, **Then** table filters to show only NPCs matching search criteria

5. **Given** user is viewing NPCs category landing page, **When** user clicks "Create New NPC" button, **Then** system displays NPC creation form with all required and optional fields

6. **Given** user is filling out NPC creation form, **When** user submits form without filling required fields (name, description), **Then** system displays validation errors and prevents submission

7. **Given** user is viewing NPC detail page, **When** user clicks "Edit" button, **Then** system displays edit form pre-filled with current NPC data

8. **Given** user has enabled "Creatures & Monsters" category but disabled "Planar Forces" category in campaign settings, **When** user views sidebar, **Then** "Creatures & Monsters" appears under EXTENDED and "Planar Forces" is hidden

9. **Given** campaign is themed as "Cyberpunk" with renamed categories, **When** user views sidebar, **Then** sidebar displays "Corporations" instead of "Factions" and "Districts" instead of "Locations"

10. **Given** user is viewing Locations table with parent-child hierarchy, **When** user views table, **Then** child locations display indented or show parent relationship clearly

11. **Given** user is viewing dashboard with information filtering set to "Player View", **When** dashboard displays entities, **Then** entities marked "DM Only" or "Secret" are filtered out from widgets

### Edge Cases

- What happens when user has 0 entities in a category (empty state display)?
- How does system handle sorting on columns with null values?
- What happens when user tries to create NPC with duplicate name?
- How does table pagination work for categories with 500+ entities?
- What happens when user has custom fields defined - do they appear in table columns?
- How does system handle very long entity names or descriptions in table cells?
- What happens when user deletes an entity that appears in a dashboard widget (widget updates in real-time or on refresh)?
- How does sidebar handle campaigns with all optional categories disabled?

## Requirements *(mandatory)*

### Functional Requirements

#### Dashboard Homepage Requirements

- **FR-001**: System MUST display campaign dashboard as the default landing page when user accesses a campaign
- **FR-002**: Dashboard MUST display 7 default widgets showing campaign statistics and recent activity
- **FR-003**: Dashboard widgets MUST include: NPC Summary (total count, breakdown by relationship_to_party, 5 most recent), Location Explorer (total count, breakdown by location_type, 5 most recent), Faction Power (total count, power level distribution, 5 most active), Quest Tracker (active/completed counts, 5 active quests), Session Timeline (last session recap, next session prep, in-game date), Player Characters (active PCs count, party level range, 5 PCs), Recent Activity (10 most recently updated entities across all categories)
- **FR-004**: Each widget MUST pull data from appropriate structured category tables (NPCs, Locations, Factions, Sessions, etc.)
- **FR-005**: Widgets MUST display accurate real-time counts and recent items
- **FR-006**: Dashboard MUST respect information level filtering based on current view mode (DM view vs Player view)
- **FR-007**: Widgets displaying entity lists MUST show at most 5 recent items per widget with "View All" link
- **FR-008**: Dashboard MUST display empty state when campaign has no content: "Get started by adding your first [category]"

#### Sidebar Navigation Requirements

- **FR-009**: System MUST display persistent sidebar navigation on all campaign pages
- **FR-010**: Sidebar MUST organize categories using 4-type hierarchy: SETTING, LIVING WORLD, CAMPAIGN, EXTENDED
- **FR-011**: Each type section MUST be collapsible with expand/collapse toggle
- **FR-012**: Sidebar MUST display all enabled categories for the campaign
- **FR-013**: Sidebar MUST hide categories disabled in campaign settings (e.g., Planar Forces if disabled, Creatures if disabled)
- **FR-014**: SETTING section MUST contain: Lore & History, World Rules
- **FR-015**: LIVING WORLD section MUST contain: NPCs, Locations, Factions & Organizations, Planar Forces (if enabled)
- **FR-016**: CAMPAIGN section MUST contain: Session Prep Notes, Session Recaps, Quests & Plot Threads, Player Characters
- **FR-017**: EXTENDED section MUST contain: Custom Mechanics, Items & Equipment, Creatures & Monsters (if enabled)
- **FR-018**: Sidebar category labels MUST display thematic names if campaign uses thematic naming (e.g., "Corporations" instead of "Factions" for Cyberpunk theme)
- **FR-019**: Active category MUST be visually highlighted in sidebar
- **FR-020**: Sidebar responsiveness DEFERRED: v1 is desktop-only, mobile support planned for future release

#### Category Landing Page Requirements

- **FR-021**: Each category MUST have a dedicated landing page accessible from sidebar
- **FR-022**: Category landing page MUST display category name (or themed name) as page header
- **FR-023**: Category landing page MUST display statistics panel showing: total count, count by status (active/archived/draft), recent activity timestamp
- **FR-024**: Category landing page MUST display "Recent Items" section showing 10 most recently updated entities
- **FR-025**: Recent items MUST show: entity name, last updated timestamp, core status (active/archived/draft)
- **FR-026**: Category landing page MUST display search input box for filtering entities
- **FR-027**: Category landing page MUST display "Create New [Category]" button (e.g., "Create New NPC")
- **FR-028**: Category landing page MUST display filter controls for: core status, player knowledge level, tags
- **FR-029**: Category landing page MUST display table view of all entities (default view)
- **FR-030**: Category landing page MUST include view toggle buttons for future view modes (Gallery, Board) but keep them disabled with tooltip: "Coming Soon"

#### Table View Requirements

- **FR-031**: Table view MUST display all entities in the selected category
- **FR-032**: Table MUST display columns for universal fields: name, core status, player knowledge, tags, updated timestamp
- **FR-033**: Table MUST display columns for ALL category-specific prebuilt fields from the database schema (not just selected "key" fields) - each category's table shows all fields defined in that category's default schema per Feature 014
- **FR-034**: Table columns MUST be sortable by clicking column headers
- **FR-035**: Table MUST support ascending/descending sort toggle on column click
- **FR-036**: Table MUST highlight currently sorted column
- **FR-037**: Table MUST display pagination controls when category has more than 50 entities, with 50 entities per page as default and user preference settings for 25/50/100 per page
- **FR-038**: Pagination MUST show: current page number, total pages, previous/next buttons, jump to page input
- **FR-039**: Table rows MUST be clickable to navigate to entity detail page
- **FR-040**: Table MUST support multi-select with checkboxes for bulk actions: Delete, Archive, Change Status (draft/active/archived)
- **FR-041**: Table MUST display empty state when category has 0 entities: "No [category] yet. Create your first one!"
- **FR-042**: Table MUST respect information level filtering - entities above user's view permission level are hidden
- **FR-043**: Table MUST support search/filter persistence: filters remain active when navigating away and returning

#### Entity Detail Page Requirements

- **FR-044**: Each entity MUST have a dedicated detail page accessible by clicking table row or direct URL
- **FR-045**: Detail page MUST display all universal fields: name, description, core status, player knowledge, tags, created timestamp, updated timestamp
- **FR-046**: Detail page MUST display all category-specific fields for that entity type
- **FR-047**: Detail page MUST display custom fields if entity has any
- **FR-048**: Detail page MUST display relationships to other entities as clickable links (e.g., NPC's faction links to Faction detail page)
- **FR-049**: Detail page MUST display "Edit" button to enter edit mode
- **FR-050**: Detail page MUST display "Delete" button with confirmation prompt: "Are you sure you want to delete [entity name]?"
- **FR-051**: Detail page MUST display breadcrumb navigation showing: Campaign > Category > Entity Name
- **FR-052**: Detail page MUST filter out DM-only fields (dm_secrets, dm_plot_relevance, etc.) when viewed in Player View mode
- **FR-053**: Detail page "View History" feature DEFERRED: version history not implemented in v1, button omitted or disabled with tooltip "Coming Soon"

#### Entity Creation Form Requirements

- **FR-054**: System MUST provide creation form for each category accessible via "Create New [Category]" button
- **FR-055**: Creation form MUST display all universal fields with appropriate input types: text input (name), text area (description), dropdown (core status, player knowledge), tag input (tags)
- **FR-056**: Creation form MUST display all category-specific fields with appropriate input types
- **FR-057**: Creation form MUST mark required fields with visual indicator (e.g., asterisk)
- **FR-058**: Creation form MUST validate required fields on submission: name and description are required for all categories
- **FR-059**: Creation form MUST display validation errors inline near the invalid field
- **FR-060**: Creation form MUST prevent submission until all required fields are valid
- **FR-061**: Creation form MUST support relationship field selection: dropdowns or search inputs for foreign keys (e.g., select NPC's faction from dropdown of existing factions)
- **FR-062**: Creation form MUST support multi-select for JSON array relationships (e.g., select multiple locations for NPC)
- **FR-063**: Creation form MUST display custom fields section if campaign has custom field definitions for this category
- **FR-064**: Creation form MUST support adding tags with autocomplete from existing campaign tags
- **FR-065**: Creation form MUST display "Save" and "Cancel" buttons
- **FR-066**: System MUST redirect to entity detail page after successful creation
- **FR-067**: System MUST display success notification: "[Entity name] created successfully"

#### Entity Edit Form Requirements

- **FR-068**: System MUST provide edit form accessible from entity detail page "Edit" button
- **FR-069**: Edit form MUST pre-fill all fields with current entity data
- **FR-070**: Edit form MUST use same field types and validation as creation form
- **FR-071**: Edit form MUST support updating all fields (universal, category-specific, custom)
- **FR-072**: Edit form MUST support updating relationships (change faction, add/remove locations, etc.)
- **FR-073**: Edit form MUST validate required fields on submission
- **FR-074**: Edit form MUST display validation errors inline
- **FR-075**: Edit form MUST prevent submission until all required fields are valid
- **FR-076**: Edit form MUST display "Save Changes" and "Cancel" buttons
- **FR-077**: System MUST update entity's updated_at timestamp on save
- **FR-078**: System MUST redirect back to entity detail page after successful save
- **FR-079**: System MUST display success notification: "[Entity name] updated successfully"
- **FR-080**: System MUST support "dirty form" detection: prompt "Unsaved changes. Are you sure you want to leave?" if user navigates away with unsaved edits

#### Relationship Display Requirements

- **FR-081**: System MUST display foreign key relationships as clickable entity links (e.g., NPC's faction_id displays as "Faction: Dragon Cult" linking to Dragon Cult detail page)
- **FR-082**: System MUST display JSON array relationships as comma-separated clickable links (e.g., NPC's locations displays as "Locations: City of Brass, Mountain Pass, Dragon's Lair" with each as clickable link)
- **FR-083**: System MUST display hierarchical relationships with indentation or tree structure (e.g., Location's parent_location_id shows parent chain: Continent > Region > City)
- **FR-084**: System MUST handle null/empty relationships gracefully: display "None" or blank instead of error
- **FR-085**: System MUST support reverse relationship lookup: entity detail page shows entities referencing it (e.g., Faction detail page shows "NPCs in this faction: [list]")
- **FR-086**: Reverse relationship display MUST NOT include session prep connections when viewing canonical entity (one-way connection enforcement)

#### Search and Filter Requirements

- **FR-087**: System MUST support text search across entity name and description fields
- **FR-088**: Search MUST be case-insensitive
- **FR-089**: Search MUST update results dynamically as user types (debounced)
- **FR-090**: System MUST support filtering by core status: active, archived, draft, hidden
- **FR-091**: System MUST support filtering by player knowledge level: common knowledge, player known, secret, dm only, custom levels
- **FR-092**: System MUST support filtering by tags: multi-select tag filter showing all tags used in category
- **FR-093**: System MUST support filtering by ALL category-specific prebuilt fields (same fields shown as table columns per FR-033) - filters combine with AND logic
- **FR-094**: System MUST display active filters as removable chips above table
- **FR-095**: System MUST support "Clear All Filters" button to reset to default view
- **FR-096**: Filters MUST combine with AND logic (entity must match all active filters)

#### Thematic Naming Requirements

- **FR-097**: System MUST display category labels based on campaign theme (High Fantasy, Cyberpunk, Sci-Fi, Modern, Custom)
- **FR-098**: System MUST map internal category names to themed display names using complete 13×4 mapping table (52 labels total) - mapping completed during planning phase and stored in campaign settings, partial example provided in Architecture-Updates.md
- **FR-099**: Thematic names MUST appear in: sidebar navigation, page headers, breadcrumbs, form labels, widget titles
- **FR-100**: System MUST use internal category names in: API calls, database queries, URLs

#### Information Level Filtering Requirements

- **FR-101**: System MUST respect view mode setting when displaying entities: DM View shows all, Player View filters
- **FR-102**: Player View MUST hide entities with player_knowledge = 'secret' or 'dm_only'
- **FR-103**: Player View MUST hide fields prefixed with dm_ (dm_secrets, dm_plot_relevance, etc.) even if entity is visible
- **FR-104**: Player View MUST include entities with player_knowledge = NULL (freely accessible content)
- **FR-105**: Dashboard widgets MUST respect information level filtering based on view mode
- **FR-106**: Table view MUST respect information level filtering - filtered entities don't appear in table
- **FR-107**: Search results MUST respect information level filtering
- **FR-108**: Entity detail pages MUST filter fields based on view mode (hide DM fields in Player View)

#### Empty State Requirements

- **FR-109**: System MUST display helpful empty states when categories have no content
- **FR-110**: Empty state MUST include: icon/illustration, message "No [category] yet", "Create your first [category]" call-to-action button
- **FR-111**: Dashboard widgets MUST display empty state when no data: "No [category] yet. Add your first one to see it here."
- **FR-112**: Category landing page MUST display empty state when category has 0 entities
- **FR-113**: Search/filter with no results MUST display: "No results found. Try adjusting your filters."

#### Performance Requirements

- **FR-114**: Dashboard MUST load and display widgets within 2 seconds with up to 1000 total entities across all categories
- **FR-115**: Category landing page MUST load within 1 second with up to 500 entities in that category
- **FR-116**: Table view with pagination MUST load page within 500ms
- **FR-117**: Entity detail page MUST load within 500ms
- **FR-118**: Search and filter operations MUST update results within 200ms (perceived as instant)

#### Dependency Requirements

- **FR-119**: Feature MUST depend on Feature 014 (Database Foundation) APIs for all entity CRUD operations
- **FR-120**: Feature MUST NOT implement knowledge graph visualizations (Feature 016 scope)
- **FR-121**: Feature MUST NOT implement campaign setup wizard (Feature 017 scope)
- **FR-122**: Feature MUST prepare architecture for future view modes (Gallery, Board) but NOT implement them - include disabled toggle buttons with "Coming Soon" state

### Key Entities *(include if feature involves data)*

This feature does NOT create new data entities. It consumes existing entities from Feature 014:

**Data Sources (from Feature 014):**
- **NPCs**: 13 structured category tables (npcs, locations, factions, lore_entries, world_rules, planar_forces, session_prep, session_recaps, quests, player_characters, custom_mechanics, items, creatures)
- **Campaign Settings**: Theme, category labels, enabled/disabled categories
- **Information Levels**: Default levels (common knowledge, player known, secret, dm only) and custom levels
- **Tags**: Campaign-wide tag collection
- **Custom Field Definitions**: Per-category custom field schemas

**UI State Entities (not persisted):**
- **Active Filters**: Current search text, status filters, tag filters, field filters
- **Sort State**: Current sorted column and direction (asc/desc)
- **Pagination State**: Current page number, page size
- **View Mode**: DM View vs Player View (persisted in user session)
- **Sidebar Collapse State**: Which type sections are expanded/collapsed (persisted in browser local storage)

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all 7 clarifications resolved)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked and resolved (7 clarifications answered)
- [x] User scenarios defined
- [x] Requirements generated (122 functional requirements)
- [x] Entities identified
- [x] Review checklist passed

---

## Clarification Resolutions

All 7 clarification questions have been RESOLVED by user input:

### 1. Dashboard Widget Specifications ✓ RESOLVED
**Decision**: Implement 7 specific widgets as recommended
- NPC Summary (count, relationship_to_party breakdown, 5 recent)
- Location Explorer (count, location_type breakdown, 5 recent)
- Faction Power (count, power level distribution, 5 active)
- Quest Tracker (active/completed counts, 5 active quests)
- Session Timeline (last recap, next prep, in-game date)
- Player Characters (count, level range, 5 PCs)
- Recent Activity (10 most recent across all categories)

**Updated Requirements**: FR-003

### 2. Table Column Configuration ✓ RESOLVED
**Decision**: Show ALL category-specific prebuilt fields from database schema (not just "key" fields)
- Tables display comprehensive field set defined in Feature 014 schemas
- Planning phase will reference Architecture-Updates.md (lines 140-856) for exact field lists
- No curated subset - full transparency of all prebuilt fields

**Updated Requirements**: FR-033, FR-093

### 3. Bulk Actions Specification ✓ RESOLVED
**Decision**: Implement Option B (Delete, Archive, Change Status)
- Delete: Remove selected entities with confirmation
- Archive: Change core_status to 'archived' for selected entities
- Change Status: Toggle between draft/active/archived for selected entities
- Advanced actions (Apply Tags, Change Player Knowledge) deferred to future version

**Updated Requirements**: FR-040

### 4. Pagination Size ✓ RESOLVED
**Decision**: 50 per page as default with user preference
- Default: 50 entities per page
- Pagination triggers when category has more than 50 entities
- User preference setting allows 25/50/100 options
- Preference persisted in user session

**Updated Requirements**: FR-037

### 5. Category-Specific Filters ✓ RESOLVED
**Decision**: All table columns (all prebuilt fields) are filterable
- Any field shown in table can be filtered
- Inherits field set from Question 2 resolution (ALL prebuilt fields)
- Filters combine with AND logic

**Updated Requirements**: FR-093

### 6. Mobile Sidebar Behavior ✓ RESOLVED
**Decision**: Desktop-only for v1, mobile support deferred
- v1 targets desktop users only
- Mobile/tablet responsive design planned for future release
- No hamburger menu or mobile-specific UI in initial implementation

**Updated Requirements**: FR-020

### 7. Thematic Naming Complete Mapping ✓ RESOLVED
**Decision**: Complete 13×4 mapping table created during planning phase
- Planning phase will complete all 52 labels (13 categories × 4 themes)
- Architecture-Updates.md provides partial examples as starting point
- Final mapping stored in campaign_settings table
- User feedback required during implementation to confirm labels

**Updated Requirements**: FR-098

---

## Dependencies

**Hard Dependencies (must exist before implementation):**
- Feature 014 (Structured Category Database System) - provides all 13 category APIs and schema definitions
- Authentication system (Feature 002) - provides user session and view mode
- Information Level system (Feature 004) - provides filtering logic

**Soft Dependencies (feature works without, but integrates if available):**
- Thematic naming configuration in campaign settings
- Custom field definitions per category
- Campaign-specific tag collections

**Blocks These Features:**
- Feature 016 (Knowledge Graph Integration) - needs dashboard to display graph widgets
- Feature 017 (Campaign Setup Wizard) - needs navigation structure to guide users

---

## Integration with Existing Features

This feature significantly changes the campaign access flow and integrates with multiple existing features. These integration points must be implemented during Feature 015.

### Settings Access (Feature 004 Integration)

**Current State**: Settings page exists at `/campaigns/:id/settings` from Feature 004 (Information Level system)

**Required Changes**:
- **FR-123**: Dashboard MUST include settings button/icon in header or sidebar
- **FR-124**: Settings button MUST navigate to `/campaigns/:id/settings` (existing route)
- **FR-125**: Settings button MUST be visible from dashboard and all category pages
- Settings page already includes information level management, no changes needed to settings page itself

### Post-Login Campaign Access Flow (Feature 002 Integration)

**OLD Flow** (pre-Feature 015):
1. User logs in → Campaign list page
2. User clicks campaign → Opens campaign root card in wiki/card editor

**NEW Flow** (Feature 015 architectural shift):
1. User logs in → Campaign list page
2. User clicks campaign → **Navigates to `/campaigns/:id/dashboard`** (this feature)
3. Dashboard displays with sidebar, widgets, and category navigation

**Required Changes**:
- **FR-126**: Campaign list "Open Campaign" action MUST navigate to `/campaigns/:id/dashboard` instead of card editor
- **FR-127**: Dashboard becomes the new campaign homepage and primary entry point
- **FR-128**: Wiki/card system (Features 003-004) becomes accessed via optional sidebar button (deferred to Feature 018)

### Create Campaign Flow (Feature 002 Integration)

**OLD Flow** (pre-Feature 015):
1. User clicks "Create Campaign"
2. Campaign created in database
3. System immediately opens card editor for new campaign root page
4. User begins editing wiki content

**NEW Flow** (Feature 015 architectural shift):
1. User clicks "Create Campaign"
2. Campaign created in database
3. System navigates to `/campaigns/:id/dashboard` for new campaign
4. User sees empty dashboard with "Get started" messaging
5. User begins by adding structured entities (NPCs, Locations, etc.) via sidebar

**Required Changes**:
- **FR-129**: "Create Campaign" success action MUST navigate to `/campaigns/:id/dashboard`
- **FR-130**: Empty dashboard MUST display onboarding messaging: "Welcome to your new campaign! Get started by adding your first [category]."
- **FR-131**: Empty dashboard MUST highlight primary categories to help new users (NPCs, Locations, Session Recaps)

### Campaign Navigation Architecture

**Routing Structure**:
```
/campaigns                          → Campaign list (Feature 002, unchanged)
/campaigns/:id/dashboard            → Dashboard (Feature 015, NEW default)
/campaigns/:id/settings             → Settings (Feature 004, existing)
/campaigns/:id/npcs                 → NPCs category landing (Feature 015)
/campaigns/:id/npcs/:npcId          → NPC detail page (Feature 015)
/campaigns/:id/locations            → Locations category (Feature 015)
... (all 13 categories follow same pattern)
/campaigns/:id/wiki                 → Wiki portal (Feature 018, deferred)
```

**Breadcrumb Examples** (FR-051 implementation reference):
- Dashboard: `Campaign Name > Dashboard`
- Category Landing: `Campaign Name > NPCs`
- Entity Detail: `Campaign Name > NPCs > Gandalf the Grey`
- Entity Edit: `Campaign Name > NPCs > Gandalf the Grey > Edit`

### User Education Requirements

**FR-132**: Dashboard MUST clearly communicate that structured categories (this feature) are the **canon context** for AI tools, while wiki system (Feature 018) is optional organizational content

**FR-133**: Empty dashboard MUST guide users toward structured content first: "Add your campaign's NPCs, Locations, and Factions to get started. These become the source of truth for AI-assisted planning."

**FR-134**: Settings button tooltip or help text MUST indicate: "Configure campaign theme, information levels, and category settings"

---

## Notes for Planning Phase

**UI/UX Considerations:**
- Sidebar must remain accessible on all pages (avoid full-page takeovers that hide navigation)
- Table views with 500+ rows need virtualization for performance
- Form validation should be client-side for immediate feedback, server-side for security
- Empty states are critical for onboarding new users - make them inviting and actionable
- Breadcrumb navigation helps users understand location in deep hierarchies (especially for locations with parent chains)
- ALL prebuilt fields display means tables may be wide - consider horizontal scroll or column toggling UX

**Architecture Preparation for Future:**
- View toggle buttons (Table/Gallery/Board) should be present but disabled, making future enhancement seamless
- Widget system should be modular to support customization later
- Table column visibility should be configurable (even if fixed in v1, prepare for user preferences)

**Testing Strategy:**
- Test with empty campaign (all empty states)
- Test with 1 entity per category (minimal state)
- Test with 500+ entities in one category (pagination, performance)
- Test with all optional categories disabled (Planar Forces OFF, Creatures OFF)
- Test with each theme (verify all labels change correctly)
- Test Player View filtering (verify DM fields and secret entities are hidden)
- Test relationship chains (parent locations 5 levels deep, faction → leader → faction loop detection)
- Test table with ALL fields displayed (horizontal scroll, sort, filter performance)

**Performance Targets (from FR-114 to FR-118):**
- Dashboard load: < 2 seconds (1000 total entities)
- Category landing: < 1 second (500 entities)
- Table pagination: < 500ms per page
- Entity detail: < 500ms
- Search/filter: < 200ms (perceived instant)

**Reference Documents for Planning:**
- Feature 014 database schemas: Architecture-Updates.md lines 140-856
- 4-Type Hierarchy: Architecture-Updates.md lines 56-95
- Information Level Filtering: Architecture-Updates.md lines 992-1042
- Thematic Naming: Architecture-Updates.md lines 1320-1362
