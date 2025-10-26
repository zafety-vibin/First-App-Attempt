# Quickstart: Geographic Map System

**Feature**: 021-create-a-geographic
**Estimated Time**: 5-10 minutes
**Prerequisites**: Features 014 (Location category), 015 (Dashboard), 004 (Information filtering) complete

## Setup

### 1. Start Docker Environment

```bash
docker-compose up --build
```

Wait for all services (keycloak, backend, frontend) to be ready.

### 2. Verify Prerequisites

- Navigate to http://localhost:3000
- Log in with test credentials
- Open an existing campaign
- Verify Dashboard loads with widgets
- Verify Locations category exists in sidebar

## 5-Minute Validation

### Test 1: Upload Map to Location

**Goal**: Verify map upload functionality

**Steps**:
1. Navigate to Locations category page
2. Click on any existing location (or create new: "Test Continent")
3. Click "Maps" tab (new tab next to Details)
4. Click "Upload Map" button
5. Select a PNG/JPG image file (<10MB recommended)
6. Enter map name: "Test World Map"
7. Click Save

**Expected Result**:
- ✅ Map uploads successfully
- ✅ Map displays in canvas within Maps tab
- ✅ Pan: Click and drag to reposition map
- ✅ Zoom: Scroll wheel zooms in/out
- ✅ Map name appears in tab selector if multiple maps exist

**Common Issues**:
- Image too large: Compress to <10MB or use smaller image
- Upload fails: Check browser console for base64 encoding errors
- Map doesn't display: Check image format (PNG, JPG, WebP only)

### Test 2: Add Pin to Map

**Goal**: Verify pin creation and entity linking

**Steps**:
1. On the Maps tab with a map displayed, click "Add Pin" button
2. Click a position on the map (e.g., center)
3. In Pin Editor modal:
   - Search for existing location: Type "Test City" (or create new location first)
   - Select entity from search results
   - Choose icon: "city"
   - Choose color: Blue (#3B82F6)
   - Enter label: "Test City"
4. Click Save

**Expected Result**:
- ✅ Pin appears at clicked position
- ✅ Pin displays with chosen icon and color
- ✅ Hover over pin shows tooltip with label
- ✅ Click pin navigates to linked entity's detail page
- ✅ Return to map: Pin still visible at same position

**Common Issues**:
- Pin not visible: Check coordinates are within map bounds
- Entity not found: Ensure linked location/NPC exists in campaign
- Click doesn't work: Check browser console for errors

### Test 3: Navigate Hierarchy Tree

**Goal**: Verify geographic hierarchy navigator

**Steps**:
1. Navigate to Locations category
2. Click "Geographic Navigator" link (new navigation option)
3. View location tree in left sidebar
4. Locations with maps show 🗺️ icon
5. Click a location with a map in the tree

**Expected Result**:
- ✅ Map displays in main panel (right side)
- ✅ Breadcrumb shows hierarchy path (e.g., "Material Plane > Faerûn > Sword Coast")
- ✅ Click breadcrumb level navigates back to that location's map
- ✅ If location has child location pins, clicking pin transitions to child map
- ✅ Tree updates to highlight current location

**Common Issues**:
- Tree doesn't render: Check parent_location_id relationships exist
- No maps visible: Ensure at least one location has an uploaded map
- Cycle detected: System shows warning if A → B → C → A relationship exists

### Test 4: Draw Faction Region

**Goal**: Verify faction territory drawing

**Steps**:
1. On location Maps tab, click "Add Region" button
2. Click 3+ points on map to draw polygon (minimum 3 vertices)
3. In Region Editor modal:
   - Search for existing faction: Type "Test Faction" (or use existing)
   - Select faction from search results
   - Choose color: Red (#EF4444)
   - Enter label: "Test Faction Territory"
4. Click Save

**Expected Result**:
- ✅ Region appears as colored polygon (30% opacity fill, solid stroke)
- ✅ Hover over region shows tooltip with faction name
- ✅ Region respects information filtering (hides in player view if faction is dm_only)
- ✅ Edit mode: Can drag vertices to adjust boundaries

**Common Issues**:
- Polygon doesn't close: Ensure 3+ vertices clicked before saving
- Region not visible: Check z_order if overlapping with other regions
- Color too bright: Semi-transparent fill should be 30% opacity

### Test 5: Dashboard Widget

**Goal**: Verify Map Viewport Widget integration

**Steps**:
1. Navigate to Campaign Dashboard
2. Click "+ Add Widget" button
3. Search for "Map Viewport" in widget picker
4. Click "3x3" size option
5. Widget appears on dashboard
6. Click widget settings (gear icon)
7. Select location with map from dropdown
8. Select map from dropdown

**Expected Result**:
- ✅ Map displays in widget viewport
- ✅ Pan/zoom works within widget bounds
- ✅ Resize widget (drag corner) → viewport expands/contracts
- ✅ Drag widget to new position → works without breaking
- ✅ Reload dashboard → widget remembers map selection and pan/zoom state

**Common Issues**:
- Widget not in picker: Check WidgetRegistry registration
- Map not loading: Check widget config API endpoint
- Pan/zoom broken: Check Konva Stage dimensions match widget size

## Test Scenarios (Extended)

### Scenario 1: Multi-Level Map Navigation

**Goal**: Test map-to-map transitions through pin clicks

**Setup**:
1. Create 3 locations: "World" (parent: null), "Continent" (parent: World), "City" (parent: Continent)
2. Upload map to each location
3. On World map: Add pin linking to Continent location
4. On Continent map: Add pin linking to City location

**Validation**:
1. Open Geographic Navigator
2. Click "World" in tree → World map displays
3. Click Continent pin on World map → Transitions to Continent map
4. Breadcrumb shows: "World > Continent"
5. Click City pin on Continent map → Transitions to City map
6. Breadcrumb shows: "World > Continent > City"
7. Click "World" in breadcrumb → Jumps back to World map
8. Tree highlighting updates with each transition

### Scenario 2: Information Filtering

**Goal**: Verify dm_only entities are hidden in player view

**Setup**:
1. Create location "Secret Base" with player_knowledge='dm_only'
2. Create NPC "Secret Agent" with player_knowledge='dm_only'
3. On parent location map: Add pin linking to Secret Base
4. On another map: Add pin linking to Secret Agent
5. Create faction "Shadow Council" with player_knowledge='dm_only'
6. On another map: Draw region linked to Shadow Council

**Validation**:
1. View maps in DM View (⋮ menu → DM View)
   - ✅ All pins and regions visible
2. Toggle to Player View (⋮ menu → Player View)
   - ✅ Secret Base pin disappears
   - ✅ Secret Agent pin disappears
   - ✅ Shadow Council region disappears
3. Toggle back to DM View
   - ✅ All pins and regions reappear

### Scenario 3: Orphaned Pin Handling

**Goal**: Verify graceful degradation for deleted entities

**Setup**:
1. Create location "Temporary City"
2. On parent map: Add pin linking to Temporary City
3. Delete "Temporary City" location

**Validation**:
1. View parent map
   - ✅ Orphaned pin still visible (grayed out)
   - ✅ Hover shows "[Deleted]" tooltip
   - ✅ Click pin shows error message or no navigation
2. Edit pin → Can relink to different entity or delete pin

### Scenario 4: Performance with 100+ Pins

**Goal**: Verify smooth rendering with many pins

**Setup**:
1. Create large map (2048x1536 or larger)
2. Add 100+ pins programmatically or manually
3. Mix of different icons and colors

**Validation**:
1. Open map in Maps tab
   - ✅ All pins render within 1 second
2. Pan map with mouse drag
   - ✅ Smooth 60fps movement (no lag)
3. Zoom in/out with scroll wheel
   - ✅ Smooth scaling (no frame drops)
4. Hover over pins
   - ✅ Tooltips appear instantly (<100ms)
5. Click pin to navigate
   - ✅ Navigation happens within 500ms

## Troubleshooting

### Map Won't Upload

**Symptoms**: Upload button click does nothing, or error message appears

**Checks**:
1. File format: Only PNG, JPG, WebP supported
2. File size: Must be <10MB for prototype (compress if needed)
3. Browser console: Look for base64 encoding errors
4. Network tab: Check POST request to `/api/locations/:id/maps` succeeded
5. Response: Should be 201 with map object, not 400/413 error

**Fix**:
- Compress image using online tools (tinypng.com, etc.)
- Convert to PNG or JPG if using unsupported format
- Check backend logs for validation errors

### Pins Not Appearing

**Symptoms**: Pin created successfully but not visible on map

**Checks**:
1. Coordinates: Verify x/y are within map dimensions (0 <= x <= width, 0 <= y <= height)
2. View mode: Check if linked entity is dm_only and current view is player_view
3. Z-index: Check if pin is behind other canvas layers
4. Zoom level: Pin may be off-screen if zoomed in (reset zoom)

**Fix**:
- Edit pin coordinates to be within bounds
- Toggle to DM View to see dm_only pins
- Reset pan/zoom state (Cmd/Ctrl + 0)

### Hierarchy Tree Empty

**Symptoms**: Geographic Navigator shows no locations in tree

**Checks**:
1. Locations exist: Verify Locations table has entries for this campaign
2. Information filtering: Check if all locations are dm_only and view is player_view
3. Circular references: Check backend response for cycles_detected array
4. Network request: Check GET `/api/campaigns/:id/locations/hierarchy` returns data

**Fix**:
- Create locations with player_knowledge != 'dm_only'
- Toggle to DM View
- Break circular parent_location_id chains if detected

### Widget Not Saving State

**Symptoms**: Dashboard widget forgets map selection or pan/zoom after reload

**Checks**:
1. Dashboard config API: Check PUT `/api/campaigns/:id/dashboard-config` succeeds
2. Browser console: Look for save errors
3. LocalStorage: Verify dashboard config is persisted
4. Debounce timing: Wait 500ms after last change before reloading

**Fix**:
- Check backend logs for dashboard_configs table errors
- Clear browser localStorage and retry
- Ensure user has permission to update dashboard config

## Next Steps

After validating the quickstart:

1. **Create complex hierarchy**: Build 5-10 level deep location tree (Plane → World → Continent → Region → City → District → Building)
2. **Add many pins**: Test with 100+ pins on a single map
3. **Draw overlapping regions**: Create multiple faction territories with different z-orders
4. **Stress test navigation**: Rapidly click pins to transition between 10+ maps
5. **Test information filtering**: Toggle view mode frequently while viewing maps with mixed visibility

## Support

**Documentation**:
- Full spec: `/specs/021-create-a-geographic/spec.md`
- Data model: `/specs/021-create-a-geographic/data-model.md`
- API contracts: `/specs/021-create-a-geographic/contracts/*.yaml`

**Common Commands**:
```bash
# View backend logs
docker-compose logs -f backend

# View frontend logs
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Reset database
docker-compose down -v && docker-compose up --build
```

---

**Status**: ✅ Quickstart complete - Feature ready for validation testing
