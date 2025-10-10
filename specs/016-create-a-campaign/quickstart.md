# Quickstart: Campaign Setup Wizard

## Overview

This guide provides manual test scenarios for the Campaign Setup Wizard (Feature 016). The wizard guides new users through 4 configuration steps to set up campaign theme, category toggles, knowledge graph selection, and optional World-Foundations questionnaire.

## Prerequisites

1. **Backend Running**: `docker-compose up backend`
2. **Frontend Running**: `docker-compose up frontend`
3. **User Authenticated**: Login via Keycloak at http://localhost:3000/login
4. **No Existing Campaign Settings**: Create a fresh campaign before testing

## Test Data

### Test User
- **Username**: `testuser`
- **Password**: `testpass123`
- **Email**: `testuser@wrldbldr.com`

### Test Campaign
Create via Campaigns page:
- **Name**: "Test Wizard Campaign"
- **Description**: "Testing campaign setup wizard"

---

## Test Scenario 1: Complete Wizard Flow with High Fantasy Theme

**Objective**: Verify full wizard flow from style selection through World-Foundations setup with High Fantasy theme.

### Steps

1. **Navigate to New Campaign**
   - Click "Create Campaign" button on Campaigns page
   - Enter campaign name: "High Fantasy Adventure"
   - Click "Create"
   - **Expected**: Redirected to campaign page, wizard displays immediately

2. **Verify Step 1: Style Selection**
   - **Expected**: Wizard header shows "Step 1 of 4"
   - **Expected**: 5 theme cards displayed: High Fantasy, Cyberpunk, Sci-Fi, Modern, Custom
   - **Expected**: No theme is pre-selected
   - **Expected**: "Next" button is disabled
   - **Expected**: No "Back" button visible

3. **Preview High Fantasy Theme**
   - Hover over "High Fantasy" theme card
   - **Expected**: Preview shows themed category names:
     - Pantheon (Planar Forces)
     - Kingdoms (Factions)
     - Realms (Locations)
     - Artifacts (Items)

4. **Select High Fantasy Theme**
   - Click "High Fantasy" theme card
   - **Expected**: Card highlights with blue border
   - **Expected**: "Next" button becomes enabled
   - Click "Next"

5. **Verify Step 2: Category Toggles**
   - **Expected**: Wizard header shows "Step 2 of 4"
   - **Expected**: All 13 categories displayed with High Fantasy labels
   - **Expected**: Category count shows "13 categories enabled"
   - **Expected**: 11 core categories are displayed with disabled toggle (grayed out):
     - Lore, World Rules, Characters (NPCs), Realms (Locations), Kingdoms (Factions), Session Prep, Session Recaps, Quests, Player Characters, Custom Mechanics, Artifacts (Items)
   - **Expected**: 2 optional categories have enabled toggles:
     - Pantheon (Planar Forces) - enabled by default
     - Beasts (Creatures) - disabled by default

6. **Toggle Optional Categories**
   - Hover over disabled toggle for "Lore" category
   - **Expected**: Tooltip displays "Core category cannot be disabled"
   - Click toggle for "Beasts (Creatures)" to enable
   - **Expected**: Toggle switches to enabled state
   - **Expected**: Category count updates to "13 categories enabled"
   - **Expected**: "Next" button remains enabled
   - Click "Next"

7. **Verify Step 3: Knowledge Graph Selection**
   - **Expected**: Wizard header shows "Step 3 of 4"
   - **Expected**: 4 knowledge graph options displayed:
     - World-Foundations (recommended badge)
     - Political-Web
     - Geographical
     - Campaign-Story
   - **Expected**: World-Foundations has 2 radio buttons:
     - "Set up now" (selected by default)
     - "Set up later"
   - **Expected**: Other 3 graphs have unchecked checkboxes with label "Set up later"
   - **Expected**: Informational text: "Political-Web, Geographical, and Campaign-Story can be set up after wizard completion"

8. **Select World-Foundations Setup**
   - Verify "Set up now" is selected for World-Foundations
   - **Expected**: "Next" button enabled
   - Click "Next"

9. **Verify Step 4: World-Foundations Questionnaire**
   - **Expected**: Wizard header shows "Step 4 of 4"
   - **Expected**: 4 questions displayed:
     1. "Does magic exist in your world? If yes, describe how it works."
     2. "What is the technology level of your world?"
     3. "Describe the cosmology or planar structure"
     4. "What are the major social structures or governance systems?"
   - **Expected**: All questions marked as optional
   - **Expected**: Question 2 is multiple choice dropdown with 8 options

10. **Answer Questionnaire**
    - Question 1 (text area): "Magic flows through ley lines. Mages must channel energy from these lines. Overuse causes corruption."
    - Question 2 (dropdown): Select "Medieval / Renaissance"
    - Question 3 (text area): "Material plane connected to Feywild and Shadowfell via ancient portals. Gods reside in Celestial Realm."
    - Question 4 (text area): "Feudal kingdoms with hereditary nobility. Some city-states have elected councils."
    - **Expected**: Summary panel below shows "4 world rules will be created"
    - **Expected**: "Finish" button enabled

11. **Complete Wizard**
    - Click "Finish"
    - **Expected**: Loading spinner displays
    - **Expected**: After 1-2 seconds, wizard closes
    - **Expected**: Redirected to campaign homepage

12. **Verify Campaign Settings Persisted**
    - **Expected**: Sidebar navigation shows High Fantasy labels:
      - Characters (not NPCs)
      - Realms (not Locations)
      - Kingdoms (not Factions)
      - Pantheon (not Planar Forces)
      - Artifacts (not Items)
      - Beasts (not Creatures)
    - Click "Knowledge Graphs" in sidebar
    - **Expected**: World-Foundations graph exists with toggle state "enabled"
    - Click World-Foundations graph
    - **Expected**: 4 world rules entries visible:
      - "Magic System Rules" (description matches Question 1 answer)
      - "Technology Level" (description: "Medieval / Renaissance")
      - "Cosmology" (description matches Question 3 answer)
      - "Social Structures" (description matches Question 4 answer)

---

## Test Scenario 2: Custom Theme with Manual Naming

**Objective**: Verify custom theme allows user-defined category names and persists correctly.

### Steps

1. **Create New Campaign**
   - Create campaign: "Custom Setting Campaign"
   - **Expected**: Wizard displays at Step 1

2. **Select Custom Theme**
   - Click "Custom" theme card
   - **Expected**: UI expands to show 13 text input fields
   - **Expected**: All inputs pre-filled with default names (NPCs, Locations, Factions, etc.)
   - **Expected**: "Next" button enabled (defaults valid)

3. **Customize Category Names**
   - Change "Planar Forces" input to "Spirits"
   - Change "Factions" input to "Clans"
   - Change "NPCs" input to "Denizens"
   - Change "Locations" input to "Territories"
   - **Expected**: Changes reflected in input fields
   - **Expected**: "Next" button remains enabled

4. **Test Validation**
   - Clear "Items" input (leave empty)
   - **Expected**: "Next" button becomes disabled
   - **Expected**: Validation error: "All category names must be filled in"
   - Re-enter "Items" value: "Relics"
   - **Expected**: "Next" button re-enables
   - Enter very long name (51+ characters) in "Lore" input
   - **Expected**: Character count indicator shows "51/50"
   - **Expected**: "Next" button disabled
   - **Expected**: Validation error: "Category name must be 50 characters or less"
   - Shorten "Lore" to "Chronicles" (10 characters)
   - **Expected**: Validation passes, "Next" button enabled

5. **Complete Wizard**
   - Click "Next" through Steps 2-3
   - Select "Set up later" for World-Foundations on Step 3
   - **Expected**: Wizard skips Step 4, shows "Step 3 of 3" instead of "Step 3 of 4"
   - Click "Finish"
   - **Expected**: Wizard completes, redirected to homepage

6. **Verify Custom Labels**
   - Check sidebar navigation
   - **Expected**: Custom names displayed:
     - Denizens (not NPCs)
     - Territories (not Locations)
     - Clans (not Factions)
     - Spirits (not Planar Forces)
     - Relics (not Items)
     - Chronicles (not Lore)

7. **Verify Backend Uses Internal Names**
   - Open browser DevTools → Network tab
   - Click "Denizens" category in sidebar
   - **Expected**: API request to `/api/campaigns/{id}/categories/npcs` (internal name)
   - **Expected**: Response includes internal name "npcs" in JSON
   - Check database directly (SQLite):
     ```sql
     SELECT category_labels FROM campaign_settings WHERE campaign_id = ?;
     ```
   - **Expected**: JSON shows mappings: `{"npcs": "Denizens", "factions": "Clans", ...}`

---

## Test Scenario 3: Skip World-Foundations Graph Setup

**Objective**: Verify wizard can be completed without World-Foundations setup, skipping Step 4.

### Steps

1. **Create New Campaign**
   - Create campaign: "No World Foundations Campaign"
   - **Expected**: Wizard displays at Step 1

2. **Select Theme and Categories**
   - Select "Cyberpunk" theme (Step 1)
   - Click "Next"
   - Disable "Creatures" toggle on Step 2 (already disabled by default, keep disabled)
   - **Expected**: Category count shows "12 categories enabled"
   - Click "Next"

3. **Skip World-Foundations Setup**
   - On Step 3, select "Set up later" radio button for World-Foundations
   - **Expected**: Wizard header updates to "Step 3 of 3" (Step 4 will be skipped)
   - **Expected**: Informational text changes: "You can set up World-Foundations later from the Knowledge Graphs page"
   - Click "Finish" (not "Next")

4. **Verify Immediate Completion**
   - **Expected**: Wizard submits without showing Step 4
   - **Expected**: Redirected to campaign homepage
   - **Expected**: Loading time <1 second (no world rules created)

5. **Verify No World-Foundations Graph**
   - Click "Knowledge Graphs" in sidebar
   - **Expected**: No World-Foundations graph entry exists
   - **Expected**: Empty state message: "No knowledge graphs set up yet"

6. **Verify Settings Persisted**
   - Check sidebar categories
   - **Expected**: Cyberpunk labels displayed (Districts, Corporations, etc.)
   - **Expected**: "Creatures" category not visible (disabled)
   - **Expected**: 12 categories total in sidebar

---

## Test Scenario 4: Navigate Back to Change Style

**Objective**: Verify back navigation preserves state and allows changing selections.

### Steps

1. **Create New Campaign**
   - Create campaign: "Back Navigation Test"
   - **Expected**: Wizard displays at Step 1

2. **Progress to Step 3**
   - Select "High Fantasy" theme (Step 1) → Next
   - Enable "Beasts (Creatures)" toggle (Step 2) → Next
   - **Expected**: Now at Step 3: Knowledge Graph Selection
   - **Expected**: World-Foundations "Set up now" selected by default

3. **Navigate Back to Step 2**
   - Click "Back" button
   - **Expected**: Wizard displays Step 2: Category Toggles
   - **Expected**: "Beasts (Creatures)" toggle still enabled (state preserved)
   - **Expected**: "Next" and "Back" buttons both visible

4. **Navigate Back to Step 1**
   - Click "Back" button
   - **Expected**: Wizard displays Step 1: Style Selection
   - **Expected**: "High Fantasy" theme still selected (state preserved)
   - **Expected**: Only "Next" button visible (no "Back" on first step)

5. **Change Theme Selection**
   - Click "Sci-Fi" theme card
   - **Expected**: "High Fantasy" deselects, "Sci-Fi" highlights
   - **Expected**: Preview shows Sci-Fi labels: Archives, Sectors, Tech Mods, Xenofauna
   - Click "Next"

6. **Verify Theme Change Applied**
   - **Expected**: Now at Step 2 with Sci-Fi labels:
     - Archives (Lore)
     - Sectors (Locations)
     - Crew (Player Characters)
     - Tech Mods (Custom Mechanics)
     - Xenofauna (Creatures)
   - **Expected**: Previous toggle state reset (Xenofauna disabled by default)

7. **Continue Forward**
   - Click "Next" (Step 2 → Step 3)
   - **Expected**: Previous World-Foundations choice still preserved ("Set up now")
   - Click "Next" (Step 3 → Step 4)
   - **Expected**: Step 4 displays questionnaire
   - **Expected**: No previous answers (questionnaire state not preserved across theme change)

8. **Test Mid-Wizard Back Navigation**
   - Click "Back" on Step 4
   - **Expected**: Returns to Step 3
   - Change World-Foundations to "Set up later"
   - Click "Next"
   - **Expected**: Returns to Step 4 (answers preserved during this back/forward)
   - Click "Back" again
   - Change World-Foundations to "Set up now"
   - **Expected**: "Next" button enabled
   - Click "Finish" directly from Step 3
   - **Expected**: Error or disabled state (cannot finish from Step 3 if "Set up now" selected)

9. **Complete Wizard**
   - Change World-Foundations to "Set up later"
   - Click "Finish"
   - **Expected**: Wizard completes with Sci-Fi theme
   - **Expected**: Sidebar shows Sci-Fi labels

---

## Test Scenario 5: Edge Cases

### 5a. Wizard Already Completed

**Objective**: Verify wizard does not display if campaign already configured.

1. **Use Existing Configured Campaign**
   - Navigate to campaign from Scenario 1 (already has settings)
   - **Expected**: Wizard does NOT display
   - **Expected**: Immediately shown campaign homepage with themed sidebar

2. **Verify API Response**
   - Open DevTools → Network tab
   - Navigate to campaign URL
   - **Expected**: GET `/api/campaigns/{id}/wizard/status` returns:
     ```json
     {
       "shouldShowWizard": false,
       "existingSettings": { /* settings object */ }
     }
     ```

### 5b. Close Wizard Mid-Way

**Objective**: Verify progress is lost if wizard closed before completion.

1. **Create New Campaign**
   - Create campaign: "Abandoned Wizard"
   - Progress to Step 3 (select theme, toggle categories)

2. **Close Browser Tab**
   - Close browser tab or window
   - Reopen browser, login
   - Navigate to "Abandoned Wizard" campaign

3. **Verify State Reset**
   - **Expected**: Wizard displays again at Step 1
   - **Expected**: No selections preserved (fresh wizard state)
   - **Expected**: No campaign_settings record in database

### 5c. Mandatory Category Toggle Attempt

**Objective**: Verify core categories cannot be disabled.

1. **Create New Campaign**
   - Progress to Step 2

2. **Attempt to Disable Core Category**
   - Try to click toggle for "Lore" (core category)
   - **Expected**: Toggle does not change state (grayed out)
   - Hover over toggle
   - **Expected**: Tooltip: "Core category cannot be disabled"

3. **Verify All Mandatory Categories**
   - Test all 11 core categories:
     - Lore, World Rules, NPCs, Locations, Factions, Session Prep, Session Recaps, Quests, Player Characters, Custom Mechanics, Items
   - **Expected**: All toggles disabled/grayed out

### 5d. Transaction Failure Rollback

**Objective**: Verify atomic transaction rollback on persistence error.

⚠️ **Note**: Requires backend code modification to simulate error.

1. **Simulate Database Error**
   - Modify backend `completeWizard` handler to throw error after world_rules insert
   - Or: Set database file to read-only permissions

2. **Complete Wizard**
   - Answer World-Foundations questionnaire
   - Click "Finish"

3. **Verify Error Handling**
   - **Expected**: Error message displayed: "Failed to save campaign settings. Please try again."
   - **Expected**: Wizard remains open (does not redirect)
   - **Expected**: User can retry or go back

4. **Verify Rollback**
   - Check database:
     ```sql
     SELECT * FROM campaign_settings WHERE campaign_id = ?;
     SELECT * FROM world_rules WHERE campaign_id = ?;
     SELECT * FROM knowledge_graphs WHERE campaign_id = ?;
     ```
   - **Expected**: No rows inserted (all rolled back)

5. **Restore Database**
   - Remove read-only permissions or fix code
   - Click "Finish" again in wizard
   - **Expected**: Success, wizard completes normally

### 5e. Answer Length Validation

**Objective**: Verify 1000-character limit on questionnaire answers.

1. **Create New Campaign**
   - Progress to Step 4 (World-Foundations questionnaire)

2. **Test Character Limit**
   - Paste text >1000 characters into Question 1 textarea
   - **Expected**: Character counter shows "1001/1000" (red)
   - **Expected**: Validation error: "Answer must be 1000 characters or less"
   - **Expected**: "Finish" button disabled

3. **Fix Validation**
   - Remove characters to get under 1000
   - **Expected**: Character counter shows "999/1000" (green)
   - **Expected**: "Finish" button re-enables

### 5f. Browser Refresh During Wizard

**Objective**: Verify unsaved progress lost on page refresh.

1. **Create New Campaign**
   - Progress to Step 3
   - Answer some questionnaire questions

2. **Refresh Page**
   - Press F5 or Cmd+R to refresh browser

3. **Verify State Lost**
   - **Expected**: Warning banner before refresh: "Wizard progress is not saved automatically. Are you sure you want to leave?"
   - Confirm refresh
   - **Expected**: Page reloads, wizard resets to Step 1
   - **Expected**: No selections preserved

---

## API Testing with cURL

### Check Wizard Status

```bash
# Get JWT token from login
TOKEN="your_jwt_token_here"

# Check if wizard should display
curl -X GET \
  http://localhost:3001/api/campaigns/1/wizard/status \
  -H "Authorization: Bearer $TOKEN"

# Expected Response (should show):
# {
#   "shouldShowWizard": true,
#   "existingSettings": null
# }

# Expected Response (already configured):
# {
#   "shouldShowWizard": false,
#   "existingSettings": { ... }
# }
```

### Get Theme Configurations

```bash
curl -X GET \
  http://localhost:3001/api/campaigns/1/wizard/themes \
  -H "Authorization: Bearer $TOKEN"

# Expected Response: Array of 5 theme descriptors with labels
```

### Complete Wizard (with World-Foundations)

```bash
curl -X POST \
  http://localhost:3001/api/campaigns/1/wizard/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "high_fantasy",
    "categoryLabels": {
      "npcs": "Characters",
      "locations": "Realms",
      "factions": "Kingdoms",
      "planar_forces": "Pantheon",
      "items": "Artifacts",
      "creatures": "Beasts",
      "lore": "Lore",
      "world_rules": "World Rules",
      "session_prep": "Session Prep",
      "session_recaps": "Session Recaps",
      "quests": "Quests",
      "player_characters": "Player Characters",
      "custom_mechanics": "Custom Mechanics"
    },
    "enabledCategories": [
      "npcs", "locations", "factions", "planar_forces", "items",
      "creatures", "lore", "world_rules", "session_prep",
      "session_recaps", "quests", "player_characters", "custom_mechanics"
    ],
    "worldFoundationsAnswers": [
      {
        "questionId": 1,
        "answer": "Magic flows through ley lines."
      },
      {
        "questionId": 2,
        "answer": "Medieval / Renaissance"
      }
    ]
  }'

# Expected Response (201):
# {
#   "success": true,
#   "settings": { ... },
#   "worldFoundationsGraph": { ... },
#   "worldRulesCreated": 2
# }
```

### Complete Wizard (without World-Foundations)

```bash
curl -X POST \
  http://localhost:3001/api/campaigns/1/wizard/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "theme": "cyberpunk",
    "categoryLabels": {
      "locations": "Districts",
      "factions": "Corporations",
      "quests": "Missions",
      "player_characters": "Runners",
      "items": "Gear",
      "npcs": "NPCs",
      "planar_forces": "Planar Forces",
      "creatures": "Creatures",
      "lore": "Lore",
      "world_rules": "World Rules",
      "session_prep": "Session Prep",
      "session_recaps": "Session Recaps",
      "custom_mechanics": "Custom Mechanics"
    },
    "enabledCategories": [
      "npcs", "locations", "factions", "items", "lore",
      "world_rules", "session_prep", "session_recaps", "quests",
      "player_characters", "custom_mechanics"
    ]
  }'

# Expected Response (201):
# {
#   "success": true,
#   "settings": { ... },
#   "worldFoundationsGraph": null,
#   "worldRulesCreated": 0
# }
```

---

## Database Verification

### Check Campaign Settings

```sql
-- Verify settings created
SELECT id, campaign_id, theme, category_labels, enabled_categories, created_at
FROM campaign_settings
WHERE campaign_id = 1;

-- Expected: Single row with JSON category_labels and enabled_categories
```

### Check World Rules

```sql
-- Verify world rules created from questionnaire
SELECT id, campaign_id, name, description, rule_type, player_knowledge
FROM world_rules
WHERE campaign_id = 1;

-- Expected: 0-4 rows depending on questionnaire answers
-- rule_type should be: cosmology, magic_system, technology_level, or social_structure
```

### Check Knowledge Graphs

```sql
-- Verify World-Foundations graph created
SELECT id, campaign_id, graph_type, toggle_state
FROM knowledge_graphs
WHERE campaign_id = 1 AND graph_type = 'world_foundations';

-- Expected: Single row if "Set up now" selected, no row if "Set up later"
```

---

## Troubleshooting

### Wizard Not Displaying

**Problem**: Campaign shows homepage instead of wizard.

**Solutions**:
1. Check campaign_settings table - settings may already exist
2. Verify API call to `/wizard/status` returns `shouldShowWizard: true`
3. Check browser console for React routing errors
4. Clear localStorage and session storage

### "Next" Button Stays Disabled

**Problem**: Cannot proceed to next step despite completing current step.

**Solutions**:
1. **Step 1**: Ensure theme is selected (card highlighted)
2. **Step 1 (Custom)**: Check all 13 category name inputs filled and ≤50 chars
3. Check browser console for validation errors
4. Verify wizard state in React DevTools

### Theme Labels Not Applied

**Problem**: Sidebar shows default names instead of themed labels.

**Solutions**:
1. Verify `category_labels` JSON in campaign_settings table
2. Check frontend `CategoryLabelsContext` is populated
3. Ensure API response includes category_labels in settings object
4. Clear browser cache and reload

### World Rules Not Created

**Problem**: Questionnaire answers not appearing in world_rules table.

**Solutions**:
1. Verify "Set up now" was selected in Step 3
2. Check questionnaire answers were provided (optional but required for creation)
3. Verify transaction completed successfully (no rollback)
4. Check backend logs for world_rules INSERT errors

### Transaction Rollback Error

**Problem**: "Failed to save campaign settings" error on wizard completion.

**Solutions**:
1. Check database file permissions (needs write access)
2. Verify foreign key constraints (campaigns.id must exist)
3. Check database disk space
4. Review backend logs for SQL errors
5. Verify transaction timeout not exceeded (default 10s)

---

## Success Criteria

All scenarios should pass with:
- ✅ Wizard displays immediately after campaign creation
- ✅ All 5 themes apply correct category labels
- ✅ Optional categories can be toggled, core categories cannot
- ✅ World-Foundations setup can be skipped
- ✅ Back navigation preserves state
- ✅ Wizard completion persists settings atomically
- ✅ Sidebar reflects themed category names
- ✅ Backend uses internal category names in API
- ✅ World rules created match questionnaire answers
- ✅ Transaction rollback on failure (no partial data)
