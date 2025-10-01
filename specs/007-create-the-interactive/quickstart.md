# Quickstart: Interactive Map System Validation

**Feature**: 007-create-the-interactive
**Date**: 2025-10-01
**Purpose**: Step-by-step validation of primary user story (Waterdeep city map)

## Prerequisites

- Docker Compose running (keycloak, backend, frontend)
- Feature 003 (Card-Based Architecture) functional
- Feature 004 (Information Filtering) functional
- User logged in with GM/DM credentials
- Campaign created

---

## Validation Workflow

### Step 1: Create "Waterdeep" location card in Locations database

**Action**:
1. Navigate to Locations database
2. Click "Add Entry"
3. Title: "Waterdeep"
4. Add descriptive content (history, population, government)
5. Save card

**Expected Result**:
- Waterdeep card created and visible in database
- Card displays in table/list/gallery views
- Card can be expanded to full-page view

**Validation**: ✅ Waterdeep card exists and displays correctly

---

### Step 2: Enable map interface on Waterdeep card

**Action**:
1. Expand Waterdeep card to full-page view
2. Click "Add Map Interface" button (or similar UI control)
3. Confirm map interface enable action

**Expected Result**:
- Card now has `map_enabled = true`
- Map interface controls appear in card UI
- Card shows map thumbnail placeholder or upload prompt

**API Call**: `POST /api/cards/{waterdeepCardId}/maps`

**Validation**: ✅ Map interface enabled successfully

---

### Step 3: Upload city map background image

**Action**:
1. Click "Upload Map Image" button
2. Select city map image file (PNG/JPG/WebP, < 10MB)
3. Enter map name: "City Overview"
4. Confirm upload

**Expected Result**:
- Upload completes within 1 second (for ~5MB image)
- Map image stored in database as BLOB
- Image displays in map interface
- Image dimensions captured (width, height)

**API Call**: `POST /api/cards/{waterdeepCardId}/maps/images` (multipart/form-data)

**Validation**: ✅ Map image uploaded and displaying

---

### Step 4: Enter map mode and add Castle Ward pin with castle icon

**Action**:
1. Click on map thumbnail to "Enter Map Mode"
2. Map canvas loads with uploaded image
3. Click "Add Pin" button
4. Click location on map for Castle Ward
5. Select icon type: "castle"
6. In pin editor dialog:
   - Reference card: Select existing "Castle Ward" card (or create new)
   - Label: Default to "Castle Ward" (from referenced card title)
7. Save pin

**Expected Result**:
- Map canvas renders with Konva/Fabric
- Pin appears at clicked coordinates (x, y pixels)
- Castle icon displays at pin location
- Label "Castle Ward" displays alongside pin
- Pin is draggable for repositioning

**API Call**: `POST /api/cards/{waterdeepCardId}/maps/{mapImageId}/pins`

**Validation**: ✅ Castle Ward pin created and displaying correctly

---

### Step 5: Add Blackstaff Tower pin with landmark icon

**Action**:
1. Click "Add Pin" button
2. Click location on map for Blackstaff Tower
3. Select icon type: "landmark"
4. Reference card: Select or create "Blackstaff Tower" card
5. Label: Default to "Blackstaff Tower"
6. Save pin

**Expected Result**:
- Second pin appears on map
- Landmark icon displays
- Label "Blackstaff Tower" visible
- Both pins coexist on same map

**API Call**: `POST /api/cards/{waterdeepCardId}/maps/{mapImageId}/pins`

**Validation**: ✅ Blackstaff Tower pin created successfully

---

### Step 6: Create "Secret Locations" layer

**Action**:
1. Click "Add Layer" button in layer manager panel
2. Layer name: "Secret Locations"
3. Toggle state: ON (default)
4. Save layer

**Expected Result**:
- Layer appears in layer manager list
- Layer is active (toggle state = true)
- Layer ready to receive pin assignments

**API Call**: `POST /api/cards/{waterdeepCardId}/maps/{mapImageId}/layers`

**Validation**: ✅ "Secret Locations" layer created

---

### Step 7: Add Hidden Zhentarim Base pin (DM Secret card reference)

**Action**:
1. First, create "Hidden Zhentarim Base" card with `information_level_id` set to "DM Secret" (Feature 004)
2. Click "Add Pin" on map
3. Click location for Zhentarim base
4. Select icon type: "location marker"
5. Reference card: "Hidden Zhentarim Base" (DM Secret)
6. Assign to layer: "Secret Locations"
7. Save pin

**Expected Result**:
- Pin appears on map in DM View
- Pin has visual indicator (red outline/tint) showing it's hidden in Player View
- Pin assigned to "Secret Locations" layer
- Information level inheritance working

**API Call**: `POST /api/cards/{waterdeepCardId}/maps/{mapImageId}/pins`

**Validation**: ✅ Zhentarim Base pin created with DM Secret filtering

---

### Step 8: Draw district zones with polygon tool

**Action**:
1. Click "Add Zone" button
2. Zone drawing mode activated
3. Click vertices on map to outline "Castle Ward" district (polygon shape)
4. Double-click or "Finish Zone" to complete polygon
5. Color picker dialog opens
6. Select red color (#FF0000)
7. Purpose: "Castle Ward district boundaries"
8. Save zone
9. Repeat for additional districts (optional: Trade Ward, Dock Ward)

**Expected Result**:
- Zone renders as semi-transparent red overlay (opacity 0.3)
- Zone boundaries visible
- Multiple zones can overlap
- Zones don't block pin interactions

**API Call**: `POST /api/cards/{waterdeepCardId}/maps/{mapImageId}/zones`

**Validation**: ✅ District zones drawn and rendering correctly

---

### Step 9: Exit map mode, verify thumbnail preview

**Action**:
1. Click "Exit Map Mode" or breadcrumb to return to card view
2. Observe card in normal view

**Expected Result**:
- Card displays map thumbnail (smaller preview of map image)
- Thumbnail shows indication of map interface enabled
- Card content (text, nested cards) still visible alongside map
- Click thumbnail to re-enter map mode

**Validation**: ✅ Thumbnail preview displaying correctly

---

### Step 10: Switch to Player/General View, verify Zhentarim pin hidden

**Action**:
1. Click view mode toggle (Feature 004 integration)
2. Select "Player/General View"
3. Navigate to Waterdeep card
4. Enter map mode

**Expected Result**:
- Castle Ward pin: VISIBLE
- Blackstaff Tower pin: VISIBLE
- Hidden Zhentarim Base pin: HIDDEN (not rendered)
- Zones: VISIBLE (no filtering on zones in prototype)
- "Secret Locations" layer: VISIBLE in layer manager but Zhentarim pin hidden

**API Call**: `GET /api/cards/{waterdeepCardId}/maps/{mapImageId}/pins?view_mode=player`

**Validation**: ✅ Information filtering working correctly for pins

---

### Step 11: Click Castle Ward pin, navigate to district card

**Action**:
1. Return to DM View
2. Enter Waterdeep map mode
3. Click on Castle Ward pin

**Expected Result**:
- Navigation occurs: browser navigates to Castle Ward card page
- React Router URL updates: `/cards/{castleWardCardId}`
- Castle Ward card loads with content
- If Castle Ward card has map interface, "Enter Map" button visible

**Validation**: ✅ Pin click navigation working

---

### Step 12: Verify nested map on Castle Ward card

**Action**:
1. On Castle Ward card page, confirm map interface enabled
2. Click "Enter Map Mode"
3. View Castle Ward district map (more detailed than city overview)
4. Verify this map has its own independent pins/zones/layers

**Expected Result**:
- Castle Ward map loads (different image from Waterdeep city overview)
- Independent pins for buildings/locations within district
- Nested navigation supported (city → district → building possible)
- Breadcrumb shows: Waterdeep > Castle Ward

**Validation**: ✅ Nested map navigation working correctly

---

### Step 13: Performance validation

**Action**: Measure and validate performance metrics

**Tests**:
1. Upload 5MB map image → measure time
   - **Target**: < 1 second
   - **Result**: _____ ms ✅/❌

2. Add 50 pins to map → measure render time
   - **Target**: < 500ms for all pins to render
   - **Result**: _____ ms ✅/❌

3. Drag pin to new location → measure update time
   - **Target**: < 100ms for coordinate update
   - **Result**: _____ ms ✅/❌

4. Zoom in/out on map → measure frame rate
   - **Target**: 60fps smooth zoom/pan
   - **Result**: _____ fps ✅/❌

5. Switch between 3 maps on same card via tabs
   - **Target**: < 500ms tab switch load time
   - **Result**: _____ ms ✅/❌

**Validation**: ✅ Performance metrics within acceptable prototype ranges

---

## Additional Validation Tests

### Test A: Orphaned Pin Warning

**Action**:
1. Create pin referencing a test card
2. Delete the referenced test card
3. Return to map view

**Expected Result**:
- Pin remains on map but `pin_referenced_card_id = NULL`
- Warning notification displays: "Pin 'X' references a deleted card"
- Options: Delete pin, Update reference

**Validation**: ✅ Orphaned pin warning working

---

### Test B: Multiple Maps Per Card

**Action**:
1. On Waterdeep card, upload second map image: "Underground Sewers"
2. Verify tabs appear above map canvas
3. Click "Underground Sewers" tab
4. Add pins to sewer map
5. Switch back to "City Overview" tab

**Expected Result**:
- Tabs UI displays both map names
- Tab switching loads correct map and associated pins/zones/layers
- Pins on "City Overview" do NOT appear on "Underground Sewers" (independent data)

**API Call**: `POST /api/cards/{waterdeepCardId}/maps/images` (second upload)

**Validation**: ✅ Multi-map tabs working correctly

---

### Test C: Layer Toggle

**Action**:
1. In map mode, view "Secret Locations" layer in layer manager
2. Toggle layer OFF
3. Observe map
4. Toggle layer ON

**Expected Result**:
- Toggle OFF: All pins assigned to "Secret Locations" layer hidden (including Zhentarim base)
- Toggle ON: Pins reappear
- Layer toggle state persists during session

**API Call**: `POST /api/cards/{waterdeepCardId}/maps/{mapImageId}/layers/{layerId}/toggle`

**Validation**: ✅ Layer toggle working

---

### Test D: Modular Card Move

**Action**:
1. Move Waterdeep card to a different page in campaign
2. Verify map, pins, zones, layers all move with parent card
3. Enter map mode
4. Verify pin coordinates unchanged

**Expected Result**:
- Waterdeep card moves to new location in card hierarchy
- All child cards (pins, zones, layers) move automatically
- Pin coordinates still accurate (x, y preserved)
- Map interface fully functional at new location

**Validation**: ✅ Modular architecture preserves map data on move

---

### Test E: `/map` Slash Command

**Action**:
1. Create or navigate to any card
2. In card editor, type `/map`
3. Select `/map` command from slash command palette
4. Enter map name
5. Upload image prompt appears

**Expected Result**:
- New child card created with map interface enabled
- Card nested at cursor position
- Upload prompt for background image appears
- Card ready for pin/zone/layer additions

**Validation**: ✅ `/map` slash command working

---

## Success Criteria

✅ All 13 primary validation steps pass
✅ All 5 additional validation tests (A-E) pass
✅ Performance metrics within target ranges
✅ No console errors during workflow
✅ Information filtering integration working (Feature 004)
✅ Card hierarchy integration working (Feature 003)

---

## Known Limitations (Acceptable for Prototype)

- Polygon vertex editing (add/remove/move) deferred to post-prototype
- Circular reference detection not implemented (user responsible)
- Layer toggle state is global (not per-user, deferred to post-prototype)
- No virtual viewport clipping for 1000+ pins (acceptable performance degradation)
- Zone vertex drag-and-drop deferred (create/delete only)
- Tab reordering via drag-and-drop deferred (timestamp order only)

---

**Quickstart Validation Complete**: Feature 007 ready for implementation if all tests pass.
