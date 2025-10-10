# Feature Specification: Campaign Setup Wizard

**Feature Branch**: `016-create-a-campaign`
**Created**: 2025-01-10
**Status**: Draft
**Input**: User description: "Create a campaign setup wizard that guides new users through 4 configuration steps: (1) Style Selection - choose from 5 preset themes (High Fantasy, Cyberpunk, Sci-Fi, Modern, Custom) that automatically apply thematic naming to all 13 categories (e.g., 'Pantheon' vs 'Corporations' for Planar Forces), (2) Category Toggles - enable/disable optional categories (Planar Forces default ON, Creatures default OFF) while 11 core categories remain mandatory, (3) Knowledge Graph Selection - recommend World-Foundations graph for new campaigns with option to defer other graphs (Political-Web, Geographical, Campaign-Story) to later, (4) World-Foundations Setup - guided questionnaire to define world constants (magic system rules, technology level, cosmology, social structures) that populate initial world_rules entries. System must persist all configuration to campaign_settings table with theme and category_labels JSON. Wizard should display after campaign creation but before first content is added. Must support going back to previous steps. Style-based thematic naming applies to UI only - backend and AI tools always use internal category names (npcs, factions, etc). Wizard creates empty campaign structure with configured categories and optional starter World-Foundations graph entries. NO template campaigns, NO multi-user setup, NO data import during wizard - these are future enhancements. Depends on Feature 013 (structured categories), Feature 014 (UI components), Feature 015 (World-Foundations graph creation). Reference Architecture-Updates.md lines 1494-1519 for complete scope and lines 1320-1362 for thematic naming mappings."

## Execution Flow (main)
```
1. Parse user description from Input
   → Extracted: 4-step wizard, 5 preset themes, category toggles, knowledge graph selection, World-Foundations setup
2. Extract key concepts from description
   → Actors: Game Masters (new campaign creators)
   → Actions: Select style, toggle categories, choose graphs, configure world rules
   → Data: Campaign settings with theme and category labels
   → Constraints: No templates, no multi-user, no data import, UI-only naming
3. For each unclear aspect:
   → No clarifications needed - comprehensive description provided
4. Fill User Scenarios & Testing section
   → Scenarios cover: Complete wizard flow, theme selection, category toggles, World-Foundations setup, navigation
5. Generate Functional Requirements
   → 51 requirements covering wizard steps, theme application, category configuration, graph setup, persistence
6. Identify Key Entities
   → CampaignSettings entity with theme and category_labels JSON
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

A Game Master creates their first campaign and is immediately presented with a setup wizard. They select "Cyberpunk" as their style, which automatically renames all categories to fit the theme (e.g., "Corporations" instead of "Factions", "Districts" instead of "Locations"). They decide to disable the Creatures category since their cyberpunk setting doesn't need a bestiary. The wizard recommends setting up a World-Foundations knowledge graph, so they answer a few questions about their world's technology level and cosmology, which creates starter world rule entries. After completing the wizard, they land on their campaign homepage where the sidebar displays their themed category names. The system stored all these preferences in the campaign settings, and the backend continues to use internal names (factions, locations) for consistency.

**Note:** This wizard configures the database system (Feature 014) which is the CANON CONTEXT for AI tools. The optional Wiki Portal (Feature 018) is accessed separately after wizard completion and is not part of canon context.

### Acceptance Scenarios

**Scenario 1: Complete wizard flow with High Fantasy theme**
1. **Given** a user has just created a new campaign
2. **When** they enter the campaign for the first time
3. **Then** wizard displays Step 1: Style Selection with 5 theme options
4. **And** "High Fantasy" is not pre-selected (no default)
5. **When** they select "High Fantasy"
6. **Then** system shows preview of themed names (Pantheon, Kingdoms, Realms, Artifacts)
7. **When** they click Next
8. **Then** wizard displays Step 2: Category Toggles
9. **And** Planar Forces is enabled by default, Creatures is disabled by default
10. **And** 11 core categories are disabled/grayed out (cannot be toggled off)
11. **When** they enable Creatures category
12. **Then** category count shows "13 categories enabled"
13. **When** they click Next
14. **Then** wizard displays Step 3: Knowledge Graph Selection
15. **And** World-Foundations graph is recommended (highlighted)
16. **When** they select "Set up World-Foundations now"
17. **Then** wizard displays Step 4: World-Foundations Questionnaire
18. **When** they answer questions about magic system, technology level, cosmology
19. **Then** system shows summary of starter world rules to be created
20. **When** they click Finish
21. **Then** system persists settings to campaign_settings table
22. **And** system creates starter world_rules entries based on questionnaire
23. **And** wizard closes, campaign homepage displays with themed sidebar labels

**Scenario 2: Custom theme with manual naming**
1. **Given** user is on Step 1: Style Selection
2. **When** they select "Custom" theme
3. **Then** system displays all 13 category name inputs with default internal names
4. **When** they rename "Planar Forces" to "Spirits"
5. **And** rename "Factions" to "Clans"
6. **Then** system updates category_labels JSON with custom mappings
7. **When** they complete wizard
8. **Then** sidebar displays "Spirits" and "Clans" instead of default names
9. **And** backend API continues using internal names "planar_forces" and "factions"

**Scenario 3: Skip World-Foundations graph setup**
1. **Given** user is on Step 3: Knowledge Graph Selection
2. **When** they select "Set up later"
3. **Then** wizard skips Step 4 (World-Foundations Questionnaire)
4. **And** wizard proceeds directly to Finish
5. **Then** system persists settings without creating world_rules entries
6. **And** campaign homepage displays normally without initial world rules

**Scenario 4: Navigate back to change style**
1. **Given** user is on Step 3: Knowledge Graph Selection
2. **When** they click Back button
3. **Then** wizard navigates to Step 2: Category Toggles
4. **And** previous category toggle selections are preserved
5. **When** they click Back again
6. **Then** wizard navigates to Step 1: Style Selection
7. **And** previous style selection is preserved
8. **When** they change from "High Fantasy" to "Sci-Fi"
9. **Then** themed names update (Colonies, Sectors, Tech, Archives)
10. **When** they click Next twice to return to Step 3
11. **Then** wizard flow continues with new theme applied

### Edge Cases

**Theme selection edge cases:**
- What happens if user doesn't select any theme? (Expected: Cannot proceed to Step 2 until theme selected)
- What happens if user closes wizard mid-way? (Expected: Progress lost, wizard restarts on next campaign entry)
- What happens if campaign already has settings? (Expected: Wizard does not display, user goes directly to homepage)

**Category toggle edge cases:**
- What happens if user tries to disable core category? (Expected: Toggle is disabled/grayed out, cannot be changed)
- What happens if user disables both optional categories? (Expected: Allowed, only 11 core categories enabled)
- What happens if themed name for category is very long? (Expected: UI truncates gracefully with ellipsis)

**World-Foundations setup edge cases:**
- What happens if user answers some questions but not all? (Expected: Optional answers, system creates world rules only for answered questions)
- What happens if user changes World-Foundations choice on Step 3 after answering questions? (Expected: Questionnaire answers preserved if they go back, discarded if they choose "Set up later")
- What happens if World-Foundations graph creation fails? (Expected: Show error, allow retry or skip)

**Navigation edge cases:**
- What happens if user clicks Back on Step 1? (Expected: No Back button on first step)
- What happens if user refreshes page mid-wizard? (Expected: Progress lost, wizard restarts)
- What happens if user has unsaved changes and clicks browser back? (Expected: Browser confirmation prompt)

**Persistence edge cases:**
- What happens if campaign_settings table write fails? (Expected: Show error, prevent wizard completion)
- What happens if world_rules creation succeeds but settings save fails? (Expected: Rollback world_rules, show error)
- What happens if theme is "Custom" but user leaves default names? (Expected: Allowed, category_labels JSON stores defaults)

---

## Requirements *(mandatory)*

### Functional Requirements

**Wizard Flow Requirements:**

- **FR-001**: System MUST display wizard immediately after campaign creation before any content is added
- **FR-002**: System MUST NOT display wizard if campaign already has settings in campaign_settings table
- **FR-003**: Wizard MUST consist of exactly 4 sequential steps: Style Selection, Category Toggles, Knowledge Graph Selection, World-Foundations Setup
- **FR-004**: System MUST allow users to navigate back to previous steps using Back button
- **FR-005**: System MUST preserve user selections when navigating back
- **FR-006**: System MUST prevent proceeding to next step until current step requirements are met
- **FR-007**: System MUST display step progress indicator showing "Step X of 4"
- **FR-008**: System MUST allow wizard to be completed in one session only (no save-and-resume)

**Step 1: Style Selection Requirements:**

- **FR-009**: System MUST offer exactly 5 preset theme options: High Fantasy, Cyberpunk, Sci-Fi, Modern, Custom
- **FR-010**: System MUST display theme name, description, and preview of themed category labels for each theme
- **FR-011**: System MUST apply following themed names for High Fantasy: NPCs→Characters, Locations→Realms, Factions→Kingdoms, Planar Forces→Pantheon, Items→Artifacts
- **FR-012**: System MUST apply following themed names for Cyberpunk: Locations→Districts, Factions→Corporations, Quests→Missions, Player Characters→Runners, Items→Gear
- **FR-013**: System MUST apply following themed names for Sci-Fi: Lore→Archives, World Rules→Physics, Locations→Sectors, Planar Forces→Cosmic Forces, Quests→Objectives, Player Characters→Crew, Custom Mechanics→Tech Mods, Items→Tech, Creatures→Xenofauna
- **FR-014**: System MUST apply following themed names for Modern: Lore→Background, Locations→Places, Factions→Organizations, Planar Forces→Beliefs, Quests→Tasks, Items→Equipment
- **FR-015**: System MUST display all 13 category name inputs with default internal names when Custom theme selected
- **FR-016**: System MUST allow users to edit any category name in Custom theme
- **FR-017**: System MUST validate custom category names are not empty and ≤50 characters
- **FR-018**: System MUST NOT proceed to Step 2 until user selects one theme option

**Step 2: Category Toggles Requirements:**

- **FR-019**: System MUST display all 13 categories with theme-appropriate labels
- **FR-020**: System MUST mark following categories as mandatory (cannot be disabled): Lore, World Rules, NPCs, Locations, Factions, Session Prep, Session Recaps, Quests, Player Characters, Custom Mechanics, Items (11 core categories)
- **FR-021**: System MUST mark following categories as optional with toggle controls: Planar Forces, Creatures (2 optional categories)
- **FR-022**: System MUST set Planar Forces toggle to enabled by default
- **FR-023**: System MUST set Creatures toggle to disabled by default
- **FR-024**: System MUST display category count (e.g., "13 categories enabled", "12 categories enabled")
- **FR-025**: System MUST allow users to toggle optional categories on/off
- **FR-026**: System MUST disable/gray out toggle controls for mandatory categories with tooltip "Core category cannot be disabled"

**Step 3: Knowledge Graph Selection Requirements:**

- **FR-027**: System MUST display 4 knowledge graph options: World-Foundations (recommended), Political-Web, Geographical, Campaign-Story
- **FR-028**: System MUST visually highlight World-Foundations as recommended with badge or styling
- **FR-029**: System MUST display description for each graph type explaining its purpose
- **FR-030**: System MUST offer 2 radio button choices for World-Foundations: "Set up now" (default), "Set up later"
- **FR-031**: System MUST show checkboxes for other 3 graphs with label "Set up later" (all unchecked by default)
- **FR-032**: System MUST explain that Political-Web, Geographical, and Campaign-Story can be set up after wizard completion
- **FR-033**: System MUST skip Step 4 (World-Foundations Questionnaire) if user selects "Set up later"
- **FR-034**: System MUST proceed to Step 4 if user selects "Set up now" for World-Foundations

**Step 4: World-Foundations Setup Requirements:**

- **FR-035**: System MUST display guided questionnaire with 4-6 questions about world constants
- **FR-036**: System MUST include questions about: magic system existence and rules, technology level, cosmology/planar structure, social structures/governance
- **FR-037**: System MUST provide multiple choice or short text input for each question
- **FR-038**: System MUST allow all questions to be skipped (optional answers)
- **FR-039**: System MUST display summary of starter world_rules entries to be created based on answers
- **FR-040**: System MUST create 1 world_rules entry per answered question upon wizard completion
- **FR-041**: System MUST populate world_rules with: name (derived from question), description (user's answer), rule_type (category from question), player_knowledge (default 'common_knowledge')

**Persistence and Completion Requirements:**

- **FR-042**: System MUST persist all wizard selections to campaign_settings table with following structure: campaign_id (FK), theme (TEXT: high_fantasy, cyberpunk, sci_fi, modern, custom), category_labels (TEXT: JSON object mapping internal names to display names), created_at, updated_at
- **FR-043**: System MUST store category enabled/disabled state (if Planar Forces or Creatures disabled, record in settings)
- **FR-044**: System MUST create empty campaign structure with configured categories
- **FR-045**: System MUST create World-Foundations knowledge graph entry if user selected "Set up now"
- **FR-046**: System MUST create starter world_rules entries based on questionnaire answers
- **FR-047**: System MUST redirect user to campaign homepage after successful wizard completion
- **FR-048**: System MUST display campaign homepage with themed category labels in sidebar navigation
- **FR-049**: System MUST use internal category names (npcs, factions, planar_forces, etc.) in all backend APIs and database queries
- **FR-050**: System MUST use themed category labels (display names from category_labels JSON) in all frontend UI elements
- **FR-051**: System MUST support rollback if persistence fails (e.g., world_rules created but settings save fails, rollback world_rules)

### Key Entities

**CampaignSettings:**
- **Purpose**: Stores campaign configuration from wizard including theme and category display names
- **Attributes**:
  - campaign_id (FK to campaigns table)
  - theme (TEXT: high_fantasy, cyberpunk, sci_fi, modern, custom)
  - category_labels (TEXT: JSON object mapping internal category names to display names)
  - enabled_categories (TEXT: JSON array of enabled category internal names, defaults to all 13)
  - created_at (INTEGER: Unix timestamp)
  - updated_at (INTEGER: Unix timestamp)
- **Relationships**: Belongs to one Campaign

**WorldRule (starter entries):**
- **Purpose**: Initial world constant entries created from World-Foundations questionnaire
- **Attributes**:
  - Inherits 10 universal fields (id, campaign_id, name, description, core_status, player_knowledge, tags, created_at, updated_at, custom_fields)
  - rule_type (TEXT: cosmology, magic_system, technology_level, physics, social_structure)
  - exceptions (TEXT: optional)
- **Relationships**: Belongs to one Campaign, feeds World-Foundations knowledge graph

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs) - focused on wizard flow and user experience
- [x] Focused on user value and business needs - onboarding experience for new campaigns
- [x] Written for non-technical stakeholders - uses plain language
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous - 51 FRs with clear acceptance criteria
- [x] Success criteria are measurable - wizard completion, settings persistence verified
- [x] Scope is clearly bounded - NO templates, NO multi-user, NO data import in v1
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated (51 FRs)
- [x] Entities identified (CampaignSettings, WorldRule starter entries)
- [x] Review checklist passed

---

## Dependencies and Assumptions

**Dependencies:**
- Feature 013 (Structured Categories): 13 category tables must exist before wizard can configure them
- Feature 014 (Dashboard & UI): UI components required for wizard interface, sidebar navigation with themed labels
- Feature 015 (World-Foundations Graph Creation): Knowledge graph creation logic for World-Foundations setup

**Assumptions:**
- Campaigns table exists with campaign creation functionality
- User is authenticated via Keycloak (Feature 002)
- Frontend routing can detect "first entry" to campaign to trigger wizard
- campaign_settings table can be created via migration
- Theme mappings are hardcoded in v1 (future: customizable theme templates)
- World-Foundations questionnaire is simple (4-6 questions) - complex wizard builder is future work

**Non-Goals:**
- Template campaigns with pre-populated content (future enhancement)
- Multi-user campaign setup (collaborative wizard) - single GM only in v1
- Data import during wizard (importing existing content) - v1 starts with blank slate
- Theme customization beyond "Custom" option - preset themes are fixed in v1
- Wizard save-and-resume functionality - must complete in one session
- Advanced World-Foundations questionnaire with conditional logic - simple questions only
- Other knowledge graph setup wizards (Political-Web, Geographical, Campaign-Story) - deferred to post-wizard

---

**References:**
- Architecture document: `specs/Architecture-Updates.md`
- Feature 016 scope: Architecture-Updates.md lines 1494-1519
- Thematic naming mappings: Architecture-Updates.md lines 1320-1362
- 4-Type Hierarchy (SETTING, LIVING WORLD, CAMPAIGN, EXTENDED): Architecture-Updates.md lines 56-95
- Campaign settings table structure: Architecture-Updates.md lines 1338-1347
