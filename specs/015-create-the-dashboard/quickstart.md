# Quickstart: Dashboard & Navigation UI

**Feature**: 015-create-the-dashboard
**Date**: 2025-01-10
**Estimated Time**: 20 minutes

## Overview

This quickstart validates Feature 015 by testing dashboard widgets, sidebar navigation, category landing pages, table views, entity forms, and information level filtering across all 13 category databases.

## Prerequisites

- Feature 014 (Database Foundation) running and APIs operational
- Feature 002 (Authentication) running: `docker-compose up`
- Backend tests passing: `cd backend && npm test`
- Frontend dev server running: `cd frontend && npm run dev`
- Test campaign with sample data (NPCs, Locations, Factions, Sessions, Quests, PCs)
- Valid Keycloak user token

## Environment Setup

```bash
# 1. Start all services
docker-compose up --build

# 2. Verify frontend dev server running
cd frontend && npm run dev

# Expected output:
# VITE v4.x.x  ready in XXXms
# Local:   http://localhost:3000
# Network: use `--host` to expose

# 3. Open browser to http://localhost:3000

# 4. Login with test credentials
# Username: testuser
# Password: testpassword
```

## Test Scenario 1: Dashboard Widget Display

**User Story**: As a GM with existing campaign content, I want to see accurate statistics and recent items in dashboard widgets so I have a quick overview of my campaign state.

**From Spec**: Acceptance Scenario 1 - Dashboard displays accurate counts and recent items

```bash
# Manual UI Test (perform in browser)

# 1. Navigate to campaign dashboard
Open browser → http://localhost:3000
Login → Select "Test Campaign"

# 2. Verify NPC Summary Widget displays:
- Total NPC count matches database
- Relationship breakdown (ally/hostile/neutral) shows correct counts
- 5 most recent NPCs listed with names, races, classes
- "View All NPCs" link present

# 3. Verify Location Explorer Widget displays:
- Total location count
- Location type breakdown (city/dungeon/region)
- 5 most recent locations
- "View All Locations" link

# 4. Verify Faction Power Widget displays:
- Total faction count
- Power level distribution (local/regional/global)
- 5 most active factions
- "View All Factions" link

# 5. Verify Quest Tracker Widget displays:
- Active quest count
- Completed quest count
- 5 active quests with names and quest givers
- "View All Quests" link

# 6. Verify Session Timeline Widget displays:
- Last session recap (name, date, summary excerpt)
- Next session prep (name, planned date)
- Current in-game date
- "View Recaps" and "View Prep" links

# 7. Verify Player Characters Widget displays:
- Active PC count
- Level range (e.g., "Level 3-7")
- 5 PCs with names, player names, classes, levels
- "View All PCs" link

# 8. Verify Recent Activity Widget displays:
- 10 most recently updated entities across all categories
- Each showing: entity name, category icon, relative time (e.g., "2 hours ago")
- Clicking entity navigates to detail page
```

**Validation**:
- ✅ All 7 widgets render without errors
- ✅ Counts match API responses (verify with browser DevTools Network tab)
- ✅ Recent items display correctly sorted by updated_at descending
- ✅ Links navigate to correct category landing pages

## Test Scenario 2: Sidebar Navigation and Category Access

**User Story**: As a GM, I want to navigate between categories using a sidebar organized by type so I can quickly find the content I need to edit.

**From Spec**: Acceptance Scenario 2 - Sidebar navigation to NPC category

```bash
# Manual UI Test

# 1. Verify sidebar structure
Sidebar displays 4 type sections:
- SETTING (Lore & History, World Rules)
- LIVING WORLD (NPCs, Locations, Factions & Organizations, Planar Forces*)
- CAMPAIGN (Session Prep Notes, Session Recaps, Quests & Plot Threads, Player Characters)
- EXTENDED (Custom Mechanics, Items & Equipment, Creatures & Monsters*)
  (* if enabled in campaign settings)

# 2. Test section collapse/expand
Click LIVING WORLD section header
Verify: Categories collapse/hide
Click again
Verify: Categories expand/show

# 3. Navigate to NPCs category
Click "NPCs" under LIVING WORLD
Verify: URL changes to /campaigns/{campaignId}/npcs
Verify: NPC category landing page loads
Verify: "NPCs" link highlighted in sidebar (active state)

# 4. Verify collap se state persists
Collapse SETTING section
Refresh page
Verify: SETTING remains collapsed (localStorage persistence)

# 5. Test ViewModeToggle in sidebar
Click view mode dropdown (top of sidebar)
Select "Player View"
Verify: All widgets/pages re-fetch with X-View-Mode: player_view header
Verify: DM-only entities hidden (check with existing dm_only NPC)
```

**Validation**:
- ✅ Sidebar renders 4 type sections with correct categories
- ✅ Collapse state persists across page refreshes
- ✅ Active category highlighted in sidebar
- ✅ View mode toggle triggers data re-fetch

## Test Scenario 3: Table View Sorting

**User Story**: As a GM viewing NPCs in a table, I want to sort by different columns so I can organize entities in a useful order.

**From Spec**: Acceptance Scenario 3 - Table sorting by column

```bash
# Manual UI Test

# 1. Navigate to NPCs table
Dashboard → Sidebar → NPCs

# 2. Verify default table displays all columns:
Columns visible: Name, Core Status, Player Knowledge, Tags, Race, Class, Level, Alignment, Relationship to Party, Faction, Updated At

# 3. Test sorting by Name (ascending)
Click "Name" column header
Verify: Sort arrow points up
Verify: NPCs sorted alphabetically A-Z

# 4. Test sorting by Name (descending)
Click "Name" column header again
Verify: Sort arrow points down
Verify: NPCs sorted reverse alphabetically Z-A

# 5. Test sorting by Updated At
Click "Updated At" column header
Verify: NPCs sorted by most recently updated first (descending default for timestamps)

# 6. Test sorting by Level
Click "Level" column header
Verify: NPCs sorted by level ascending (1, 2, 3, ...)
Click again
Verify: NPCs sorted by level descending (20, 19, 18, ...)

# 7. Verify sorted column highlighted
Current sorted column has visual indicator (highlight, arrow, different color)
```

**Validation**:
- ✅ Table columns sortable by clicking header
- ✅ Sort direction toggles (asc → desc → asc)
- ✅ Sorted column visually highlighted
- ✅ Sort persists during filter changes

## Test Scenario 4: Search and Filter

**User Story**: As a GM viewing NPCs, I want to search by name and filter by attributes so I can quickly find specific entities.

**From Spec**: Acceptance Scenario 4 - Table search and filter

```bash
# Manual UI Test

# 1. Test text search
NPCs table → Search box → Type "vex"
Wait 300ms (debounce delay)
Verify: Table shows only NPCs with "vex" in name or description
Verify: URL updates with ?search=vex

# 2. Test core status filter
Search box → Clear
Filter dropdown "Core Status" → Select "Active"
Verify: Table shows only active NPCs
Verify: Archived/Draft/Hidden NPCs hidden

# 3. Test player knowledge filter
Filter dropdown "Player Knowledge" → Select "Common Knowledge"
Verify: Table shows only NPCs with player_knowledge = 'common_knowledge'

# 4. Test tag filter
Filter dropdown "Tags" → Select "Plot Critical"
Verify: Table shows only NPCs tagged "plot_critical"

# 5. Test category-specific filter (race)
Filter dropdown "Race" → Select "Elf"
Verify: Table shows only NPCs with race = 'Elf'

# 6. Test combined filters (AND logic)
Core Status: Active AND Race: Elf
Verify: Table shows only active Elf NPCs

# 7. Verify active filter chips displayed
Active filters shown as removable chips above table:
[Active] [X]  [Elf] [X]

# 8. Test clear all filters
Click "Clear All Filters" button
Verify: All filters removed
Verify: Table shows all NPCs again

# 9. Verify filter persistence
Apply filter (Race: Elf)
Navigate away (click Dashboard)
Navigate back (Sidebar → NPCs)
Verify: Filter still applied (persisted in URL params)
```

**Validation**:
- ✅ Search updates table dynamically (debounced)
- ✅ Filters combine with AND logic
- ✅ Active filters displayed as removable chips
- ✅ Clear all filters resets view
- ✅ Filters persist across navigation (URL params)

## Test Scenario 5: Entity Creation Form

**User Story**: As a GM, I want to create a new NPC using a form with validation so I can add content to my campaign.

**From Spec**: Acceptance Scenario 5 - Create NPC form

```bash
# Manual UI Test

# 1. Navigate to NPC creation form
NPCs landing page → Click "Create New NPC" button

# 2. Verify form displays all fields
Universal fields visible: Name*, Description, Core Status, Player Knowledge, Tags
Category-specific fields visible: Race, Class, Level, Alignment, Appearance, Personality Traits, Motivation, Relationship to Party, Met Party, Art (file path)
Relationship fields visible: Faction (dropdown), Superior NPC (dropdown), Locations (multi-select)
DM-only fields visible: DM Secrets, DM Plot Relevance

# 3. Test required field validation (empty submission)
Leave Name empty
Leave Description empty
Click "Save" button
Verify: Validation errors display inline near Name and Description fields
Verify: "Name is required" error message visible
Verify: "Description is required" error message visible
Verify: Form does not submit

# 4. Test minimum length validation
Name field → Type "A" (1 character - assuming min 2)
Submit
Verify: "Name too short" or similar error

# 5. Test successful creation
Fill required fields:
- Name: "Gundren Rockseeker"
- Description: "A dwarf merchant seeking his lost mine"
Fill optional fields:
- Race: "Dwarf"
- Class: ["Fighter"] (multi-select)
- Level: 3
- Relationship to Party: "Ally"
- Met Party: 1 (checked)
- Faction: Select "Adventurers Guild" from dropdown
Click "Save" button

Verify: Form submits
Verify: Success notification: "Gundren Rockseeker created successfully"
Verify: Redirects to entity detail page showing new NPC
Verify: URL: /campaigns/{campaignId}/npcs/{newNPCId}

# 6. Verify NPC appears in table
Navigate back to NPCs table
Verify: "Gundren Rockseeker" appears in table (should be at top if sorted by updated_at desc)
```

**Validation**:
- ✅ Form displays all universal and category-specific fields
- ✅ Required fields validated on submission
- ✅ Validation errors display inline
- ✅ Successful creation shows notification and redirects to detail page
- ✅ New entity appears in table

## Test Scenario 6: Form Validation Errors

**User Story**: As a GM filling out an NPC form, I want immediate validation feedback so I know when I've made an error before submitting.

**From Spec**: Acceptance Scenario 6 - Required field validation

```bash
# Manual UI Test

# 1. Navigate to create NPC form
NPCs → Create New NPC

# 2. Test inline validation on blur
Name field → Click (focus)
Name field → Click outside (blur) without typing
Verify: "Name is required" error appears immediately (blur validation)

# 3. Test validation clearing
Name field → Type "Test NPC"
Verify: Error message disappears

# 4. Test invalid data type (level field)
Level field → Type "abc" (letters instead of number)
Blur
Verify: "Level must be a number" or field rejects non-numeric input

# 5. Test min/max validation
Level field → Type "0" (below minimum)
Submit
Verify: "Level must be at least 1" error

# 6. Test multisubmit prevention
Fill only Name: "Test"
Click "Save" button
Verify: Validation errors for Description appear
Verify: "Save" button disabled or shows loading spinner
Verify: Cannot click submit again while validating

# 7. Test dirty form detection
Fill Name: "Test NPC"
Fill Description: "Test description"
Navigate away (click Dashboard or different category)
Verify: Browser shows "Unsaved changes. Are you sure you want to leave?" confirmation dialog
Click "Cancel"
Verify: Stays on form page
```

**Validation**:
- ✅ Inline validation triggers on blur
- ✅ Validation errors clear when fixed
- ✅ Invalid data types rejected
- ✅ Min/max constraints enforced
- ✅ Dirty form detection warns before navigation

## Test Scenario 7: Entity Edit Form

**User Story**: As a GM, I want to edit an existing NPC so I can update campaign information.

**From Spec**: Acceptance Scenario 7 - Edit NPC from detail page

```bash
# Manual UI Test

# 1. Navigate to NPC detail page
NPCs table → Click "Gundren Rockseeker" row

# 2. Verify detail page displays all data
Name: "Gundren Rockseeker"
Description: "A dwarf merchant seeking his lost mine"
Race: "Dwarf"
Class: "Fighter"
Level: 3
... (all other fields)

# 3. Enter edit mode
Click "Edit" button
Verify: Form opens with all fields pre-filled with current data

# 4. Update fields
Name → "Gundren Rockseeker (Elder)"
Level → 4
DM Secrets → "Knows the location of Wave Echo Cave"

# 5. Test cancel without saving
Click "Cancel" button
Verify: Returns to detail page without saving changes
Verify: Name still "Gundren Rockseeker" (not updated)

# 6. Re-enter edit mode and save
Click "Edit" again
Name → "Gundren Rockseeker (Elder)"
Level → 4
Click "Save Changes"
Verify: Success notification: "Gundren Rockseeker (Elder) updated successfully"
Verify: Redirects back to detail page
Verify: Detail page shows updated data (Name: "Gundren Rockseeker (Elder)", Level: 4)

# 7. Verify updated_at timestamp changed
Detail page → Check "Updated At" field
Verify: Timestamp reflects current time (recently updated)

# 8. Verify changes reflected in table
Navigate to NPCs table
Verify: "Gundren Rockseeker (Elder)" name visible
Verify: Level column shows "4"
```

**Validation**:
- ✅ Edit form pre-fills with current data
- ✅ Cancel discards changes
- ✅ Save updates entity
- ✅ updated_at timestamp updated
- ✅ Changes visible in table and detail page

## Test Scenario 8: Enabled/Disabled Categories

**User Story**: As a GM with Creatures category disabled, I want that category hidden from my sidebar so I only see relevant content.

**From Spec**: Acceptance Scenario 8 - Category visibility based on campaign settings

```bash
# Manual UI Test

# Prerequisite: Configure test campaign settings
# Option A: Modify campaign_settings.enabled_categories in database
# Option B: Create new campaign with Creatures disabled via setup wizard (if implemented)

# Assume: Test campaign has creatures_enabled = false, planar_forces_enabled = true

# 1. Verify sidebar hides disabled category
Sidebar → EXTENDED section
Verify: "Creatures & Monsters" link NOT visible
Verify: "Custom Mechanics" and "Items & Equipment" still visible

# 2. Verify sidebar shows enabled optional category
Sidebar → LIVING WORLD section
Verify: "Planar Forces" link visible (enabled)

# 3. Test direct URL access to disabled category
Browser address bar → Enter /campaigns/{campaignId}/creatures
Verify: 404 error or redirect to dashboard
Verify: Error message: "Creatures category not enabled for this campaign"

# 4. Verify dashboard widgets respect enabled categories
Dashboard
Verify: No "Creatures Summary" widget (since creatures disabled)
Verify: Widgets only for enabled categories present

# 5. Test enabling category (if settings UI implemented)
Campaign Settings → Categories
Toggle "Creatures & Monsters" ON
Save settings
Refresh page
Sidebar → EXTENDED section
Verify: "Creatures & Monsters" now visible
```

**Validation**:
- ✅ Disabled categories hidden from sidebar
- ✅ Enabled optional categories visible
- ✅ Direct URL access to disabled category blocked
- ✅ Dashboard widgets respect enabled categories

## Test Scenario 9: Thematic Naming

**User Story**: As a GM running a Cyberpunk campaign, I want "Factions" labeled as "Corporations" in the UI so the terminology matches my setting.

**From Spec**: Acceptance Scenario 9 - Themed category labels

```bash
# Manual UI Test

# Prerequisite: Configure test campaign with Cyberpunk theme
# Modify campaign_settings.theme = 'cyberpunk' in database
# Or set during campaign creation wizard

# 1. Verify sidebar uses themed labels
Sidebar → LIVING WORLD section
Verify: "Corporations" displayed (instead of "Factions & Organizations")
Verify: "Districts" displayed (instead of "Locations")

# 2. Verify page headers use themed labels
Sidebar → Click "Corporations"
Page header
Verify: "Corporations" title (not "Factions")
Verify: "Create New Corporation" button (not "Create New Faction")

# 3. Verify breadcrumbs use themed labels
Detail page of a faction
Breadcrumb navigation
Verify: "Campaign > Corporations > [Entity Name]" (not "Factions")

# 4. Verify form labels use themed labels
Create Corporation form
Field labels
Verify: "Corporation Type" (not "Faction Type")

# 5. Verify API still uses internal names
Open browser DevTools → Network tab
Create new corporation
Check request payload
Verify: POST /factions (internal name, not /corporations)
Verify: Response JSON uses "faction_type" field name

# 6. Test theme switching (if settings UI implemented)
Campaign Settings → Theme → Select "High Fantasy"
Save
Sidebar
Verify: "Factions & Organizations" displayed (theme-appropriate label)
```

**Validation**:
- ✅ Sidebar labels match campaign theme
- ✅ Page headers use themed labels
- ✅ Breadcrumbs use themed labels
- ✅ Form labels use themed labels
- ✅ API requests use internal names (factions, not corporations)

## Test Scenario 10: Location Hierarchy Display

**User Story**: As a GM with nested locations, I want child locations displayed with clear parent relationships so I understand the geographic structure.

**From Spec**: Acceptance Scenario 10 - Parent-child location hierarchy

```bash
# Manual UI Test

# Prerequisite: Create location hierarchy
# Continent: Faerun (no parent)
# Region: Sword Coast (parent: Faerun)
# City: Waterdeep (parent: Sword Coast)

# 1. Create parent location
Locations → Create New Location
Name: "Faerun"
Location Type: "Continent"
Parent Location: (none)
Save

# 2. Create child location
Locations → Create New Location
Name: "Sword Coast"
Location Type: "Region"
Parent Location: Select "Faerun" from dropdown
Save

# 3. Create grandchild location
Locations → Create New Location
Name: "Waterdeep"
Location Type: "City"
Parent Location: Select "Sword Coast" from dropdown
Save

# 4. Verify table shows parent relationships
Locations table
Verify: "Waterdeep" row shows "Parent: Sword Coast" (or indentation if tree view)
Verify: "Sword Coast" row shows "Parent: Faerun"
Verify: "Faerun" row shows "Parent: None" or no parent indicator

# 5. Verify detail page shows parent chain
Click "Waterdeep" in table → Detail page
Relationship section
Verify: Parent Location: link to "Sword Coast"
Click "Sword Coast" link
Verify: Parent Location: link to "Faerun"
Click "Faerun" link
Verify: Parent Location: (none)

# 6. Verify reverse relationship (children)
Faerun detail page
Relationships section
Verify: "Child Locations: Sword Coast" link displayed
Click link
Verify: Navigates to Sword Coast detail page

# 7. Test circular reference prevention (backend validation)
Edit Faerun
Parent Location → Try to select "Waterdeep" (would create circle: Faerun → Sword Coast → Waterdeep → Faerun)
Save
Verify: Error message: "Circular reference detected. A location cannot be its own ancestor."
```

**Validation**:
- ✅ Table displays parent relationships clearly
- ✅ Detail page shows full parent chain
- ✅ Reverse relationships (children) displayed
- ✅ Circular reference validation prevents invalid hierarchies

## Test Scenario 11: Information Level Filtering in Player View

**User Story**: As a GM viewing my campaign in Player View mode, I want DM-only entities and fields hidden so I can preview what players see.

**From Spec**: Acceptance Scenario 11 - Information filtering respects view mode

```bash
# Manual UI Test

# Prerequisite: Create test NPC with DM-only content
NPCs → Create New NPC
Name: "The Hooded Stranger"
Description: "A mysterious cloaked figure"
Player Knowledge: "dm_only"
DM Secrets: "Actually the king in disguise"
Save

Create another NPC
Name: "Shopkeeper Anna"
Player Knowledge: "common_knowledge"
DM Secrets: "Spy for the thieves guild"
Save

# 1. Verify DM View shows all entities
Sidebar → ViewModeToggle → Select "DM View"
NPCs table
Verify: "The Hooded Stranger" visible in table
Verify: "Shopkeeper Anna" visible in table

# 2. Verify DM View shows DM fields
Click "Shopkeeper Anna" → Detail page
Verify: "DM Secrets" field visible with text "Spy for the thieves guild"

# 3. Switch to Player View
Sidebar → ViewModeToggle → Select "Player View"
Wait for page re-fetch

# 4. Verify Player View hides dm_only entities
NPCs table
Verify: "The Hooded Stranger" NOT visible (player_knowledge = dm_only)
Verify: "Shopkeeper Anna" still visible (player_knowledge = common_knowledge)

# 5. Verify Player View hides DM fields
Click "Shopkeeper Anna" → Detail page
Verify: "DM Secrets" field NOT visible (even though entity is player-visible)
Verify: "DM Plot Relevance" field NOT visible

# 6. Verify dashboard widgets respect view mode
Navigate to Dashboard (while still in Player View)
NPC Summary Widget
Verify: Total count excludes dm_only NPCs
Verify: Recent NPCs list excludes "The Hooded Stranger"

# 7. Verify filter options respect view mode
NPCs table → Filter dropdown "Player Knowledge"
Verify: "DM Only" option not present in Player View (or disabled)

# 8. Verify view mode persists across navigation
Dashboard → Sidebar → Locations
Verify: ViewModeToggle still shows "Player View" selected
Verify: dm_only locations hidden

# 9. Verify view mode persists across browser refresh
Refresh page (F5)
Verify: ViewModeToggle still shows "Player View"
Verify: dm_only content still hidden (persisted to localStorage)
```

**Validation**:
- ✅ DM View shows all entities and fields
- ✅ Player View hides dm_only entities
- ✅ Player View hides dm_* prefixed fields even on visible entities
- ✅ Dashboard widgets respect view mode
- ✅ View mode persists across navigation and refresh

## Cleanup

```bash
# Delete test campaign (CASCADE deletes all category entities)
# Via API:
curl -X DELETE "http://localhost:3001/campaigns/$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN"

# Verify all entities deleted
curl "http://localhost:3001/npcs?campaign_id=$CAMPAIGN_ID" \
  -H "Authorization: Bearer $TOKEN" | jq 'length'

# Expected: 0 (CASCADE delete removed all entities)
```

## Success Criteria

✅ **All 11 test scenarios pass**
✅ **Dashboard renders 7 widgets with accurate data**
✅ **Sidebar navigation functional with 4-type hierarchy and collapse persistence**
✅ **Category landing pages display stats, recent items, and filters**
✅ **Table view displays all prebuilt fields with sorting and filtering**
✅ **Entity create/edit forms validate and save correctly**
✅ **Information level filtering works (DM View vs Player View)**
✅ **Thematic naming displays correctly in UI while API uses internal names**
✅ **Location hierarchy displays parent-child relationships**
✅ **Enabled/disabled categories respected in sidebar and navigation**
✅ **All 13 categories accessible and functional**

## Troubleshooting

**Issue**: Widgets show "Loading..." indefinitely
**Solution**: Check browser DevTools Network tab for failed API calls. Verify Feature 014 backend running and APIs returning data. Check CORS headers.

**Issue**: Sidebar categories incorrect or missing
**Solution**: Verify campaign_settings.enabled_categories in database. Check campaign theme in campaign_settings.theme. Ensure thematic label mapping complete.

**Issue**: Table sorting not working
**Solution**: Verify sort parameter in URL (?sort=name:asc). Check API response includes sorted data. Verify table header click handlers attached.

**Issue**: Form validation not triggering
**Solution**: Check React Hook Form + Zod schema setup. Verify validation errors in component state. Check browser console for errors.

**Issue**: View mode toggle not filtering data
**Solution**: Verify X-View-Mode header sent with API requests. Check InformationLevelContext provides viewMode to all hooks. Verify localStorage key correct.

**Issue**: Themed labels showing internal names
**Solution**: Verify campaign_settings.category_labels JSON in database. Check ThematicNamingContext loading settings. Verify components use getCategoryLabel() function.

## Next Steps

- **Feature 016**: Knowledge Graph Integration (dashboard widgets for graphs)
- **Feature 017**: Campaign Setup Wizard (guided category and theme selection)
- **Future**: Gallery and Board views for categories (currently disabled with "Coming Soon")

---

**Status**: ✅ Quickstart complete - Ready for implementation validation (11 test scenarios from spec acceptance criteria)
