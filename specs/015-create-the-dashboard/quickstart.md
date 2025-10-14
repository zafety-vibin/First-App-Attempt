# Quickstart: Dashboard Canvas System

**Feature**: 015-create-the-dashboard
**Date**: 2025-01-13
**Estimated Time**: 10 minutes

## Overview

This quickstart validates Feature 015 by exploring the interactive dashboard canvas system with drag-and-drop widgets, navigating category landing pages, and testing the canvas persistence and view mode filtering.

### What is the Dashboard Canvas System?

The Dashboard Canvas System is an interactive, customizable homepage for your campaign. Instead of a static layout, you get a flexible grid where you can:
- **Add widgets** that show real-time campaign statistics
- **Drag and drop** widgets to rearrange them
- **Resize** widgets to emphasize what matters most
- **Customize** each category landing page with its own canvas

Think of it as a customizable control panel for your entire campaign.

### What are Category Landing Pages?

Each of the 13 category types (NPCs, Locations, Factions, etc.) has its own dedicated landing page with:
- A **category-specific canvas** showing filtered widgets relevant to that category
- A **rich text editor** for adding category descriptions and notes
- Quick access to the **database table view** for that category

### What are Widgets?

Widgets are modular dashboard components that display campaign data. There are 7 widget types:

1. **NPC Summary** - Total NPC count, relationship breakdown, recent NPCs
2. **Location Explorer** - Total locations, type breakdown, recent locations
3. **Faction Power** - Total factions, power distribution, active factions
4. **Quest Tracker** - Active/completed quest counts, in-progress quests
5. **Session Timeline** - Last session recap, next prep, in-game date
6. **Player Characters** - Active PC count, level range, party roster
7. **Recent Activity** - Recent updates across all categories

Widgets adapt to their size:
- **Compact mode** (1x1, 2x2 grid cells): Shows key metrics only
- **Detailed mode** (3x3+ grid cells): Shows full data with lists

## Prerequisites

- Feature 002 (Authentication) running: `docker-compose up`
- Feature 014 (Database Foundation) tables exist (13 category tables)
- Backend migration 015 applied: `015-dashboard-canvas.sql`
- Campaign with some existing entities (NPCs, Locations, etc.) for widget data

## Quick Start (5 minutes)

### 1. Start the Application

```bash
# Start all services
docker-compose up

# Wait for services to be ready (30-60 seconds)
# Expected output:
# backend_1   | Server started on http://localhost:3001
# frontend_1  | ➜  Local:   http://localhost:3000/
```

### 2. Access Dashboard

1. Login at http://localhost:3000
2. Select a campaign from your campaign list
3. You'll automatically land on the **Dashboard** (http://localhost:3000/campaigns/{id}/dashboard)

### 3. Add Your First Widget

**Empty State**:
- If this is your first time, you'll see: "Welcome to your Campaign Dashboard"
- Click **"+ Add Your First Widget"** button

**Widget Picker Modal Opens**:
1. Browse the 7 available widgets
2. Click on any widget (e.g., **"NPC Summary"**)
3. Widget appears on the canvas at default size (3x3)

### 4. Customize Your Dashboard

**Drag to Reorder**:
- Hover over a widget header (where the title is)
- When the widget header becomes draggable, click and drag it to a new position
- Other widgets automatically shift to make room

**Resize a Widget**:
- Hover over the **bottom-right corner** of any widget
- Look for the **resize grip handle** (diagonal lines icon)
- Click and drag to resize
- Minimum size: 1 column × 1 row
- Maximum size: 12 columns × 50 rows

**Delete a Widget**:
- Click the **× button** in the top-right corner of any widget
- Widget is immediately removed from the canvas

**Reset Layout**:
- Click the **↻ button** in the dashboard header
- Confirms: "Reset dashboard to default layout?"
- Removes all widgets (cannot be undone)

**Auto-Save**:
- All changes save automatically after 500ms
- You'll see "Saving..." indicator in the header briefly
- No manual save button needed

### 5. Explore Category Landing Pages

**Navigate to a Category**:
1. Look at the sidebar (left side of screen)
2. Categories are organized into 4 sections:
   - **SETTING**: Lore & History, World Rules
   - **LIVING WORLD**: NPCs, Locations, Factions, Planar Forces
   - **CAMPAIGN**: Session Prep, Session Recaps, Quests, Player Characters
   - **EXTENDED**: Custom Mechanics, Items, Creatures
3. Click any category (e.g., **"NPCs"**)

**Category Landing Page Features**:
- **Category Canvas**: Shows widgets filtered to that category (e.g., only NPC-related widgets on NPCs page)
- **Rich Text Editor**: Below the canvas, add notes and descriptions using TipTap editor
- **Database Button**: Click to view the full table view of all entities in this category

**Try the Rich Text Editor**:
1. Type some text in the editor area
2. Use formatting: **Bold**, *Italic*, bullet lists
3. Changes save automatically (500ms debounce)

**View Database Table**:
1. Click the **"Database"** button (top-right of category landing page)
2. Opens table view at `/campaigns/{id}/npcs/database`
3. Shows all NPCs in a sortable table with pagination

### 6. Toggle View Mode

**DM View vs Player View**:
- Look for the **eye icon** (👁️) in the top-right corner of any page
- **Open eye** = DM View (shows all content including secrets)
- **Closed eye** = Player View (hides DM-only content)

**Test Information Filtering**:
1. On the dashboard, toggle to **Player View** (closed eye)
2. Widgets now filter out entities with `player_knowledge = 'dm_only'`
3. Any entities marked as "Secret" or "DM Only" disappear from widget lists
4. Toggle back to **DM View** (open eye) to see all content

### 7. Test Canvas Persistence

**Verify Auto-Save Works**:
1. Add 2-3 widgets to your dashboard
2. Drag them around to create a custom layout
3. **Refresh the page** (F5 or Ctrl+R)
4. Your layout should persist exactly as you left it

**Per-User Configuration**:
- Each user has their own dashboard layout for each campaign
- If multiple GMs use the same campaign, they each get independent layouts

## Features Summary

### Dashboard Canvas
- **All widgets available**: All 7 widget types can be added
- **Unlimited widgets**: Add multiple instances of the same widget type
- **Grid system**: 12-column grid with 10px row height
- **Responsive breakpoints**: lg (1200px+), md (768px+), sm (<768px)

### Category Landing Pages
- **13 category pages**: One for each database category
- **Filtered widgets**: Widget picker shows only relevant widgets per category
- **Rich text editor**: TipTap editor for category descriptions
- **Database access**: Quick link to table view

### Widget System
- **7 widget types**: NPC Summary, Location Explorer, Faction Power, Quest Tracker, Session Timeline, Player Characters, Recent Activity
- **Size-adaptive rendering**:
  - Compact (1x1, 2x2): Key metrics only
  - Detailed (3x3+): Full data with lists
- **Real-time data**: Widgets pull from Feature 014 category APIs
- **Information filtering**: Respects dm_view vs player_view

### Canvas Controls
- **Drag-drop reordering**: Click and drag widget headers
- **Resize**: Drag bottom-right corner grip handle
- **Add widgets**: Widget picker modal
- **Remove widgets**: × button in widget header
- **Reset layout**: ↻ button (confirmation required)
- **Auto-save**: 500ms debounced saves

### Information Filtering
- **View Mode Toggle**: Eye icon switches between DM and Player view
- **DM View**: Shows all content including secrets
- **Player View**:
  - Hides entities with `player_knowledge = 'dm_only'` or `'secret'`
  - Strips `dm_*` fields from visible entities
  - Includes entities with `player_knowledge = NULL` (freely accessible)

## Widget Types Reference

### 1. NPC Summary Widget
**Compact Mode (1x1, 2x2)**:
- Total NPC count

**Detailed Mode (3x3+)**:
- Total NPC count
- Breakdown by `relationship_to_party`: Ally, Neutral, Enemy, Unknown
- 5 most recently updated NPCs with clickable links

### 2. Location Explorer Widget
**Compact Mode**:
- Total location count

**Detailed Mode**:
- Total location count
- Breakdown by `location_type`: City, Wilderness, Dungeon, Plane, etc.
- 5 most recent locations with clickable links

### 3. Faction Power Widget
**Compact Mode**:
- Total faction count

**Detailed Mode**:
- Total faction count
- Power level distribution (if `power_level` field populated)
- 5 most active factions

### 4. Quest Tracker Widget
**Compact Mode**:
- Active quest count
- Completed quest count

**Detailed Mode**:
- Active / Completed / On Hold counts
- 5 in-progress quests with clickable links
- Progress indicators

### 5. Session Timeline Widget
**Compact Mode**:
- Last session date
- Next session date

**Detailed Mode**:
- Last session recap (title and date)
- Next session prep (title and date)
- Current in-game date (if tracked)
- Session counter

### 6. Player Characters Widget
**Compact Mode**:
- Active PC count

**Detailed Mode**:
- Active PC count
- Party level range (e.g., "Levels 5-7")
- 5 player characters with names and classes

### 7. Recent Activity Widget
**Compact Mode**:
- Recent update count (last 24 hours)

**Detailed Mode**:
- 10 most recently updated entities across ALL categories
- Shows entity name, category, and timestamp
- Clickable links to entity detail pages

## Troubleshooting

### Widgets Not Loading

**Problem**: Widgets show "Loading..." indefinitely or display error messages

**Solutions**:
```bash
# 1. Check backend is running
docker-compose ps

# Expected: backend service status "Up"

# 2. Check backend logs for API errors
docker-compose logs backend | tail -50

# 3. Verify Feature 014 category tables exist
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('npcs', 'locations', 'factions');"

# Expected: Returns table names

# 4. Verify campaign has some entities
curl http://localhost:3001/api/npcs?campaign_id={CAMPAIGN_ID} \
  -H "Authorization: Bearer $TOKEN"

# Expected: Returns NPC array (even if empty)
```

### Canvas Has Tiny Scrollbar

**Problem**: Dashboard canvas shows a small scrollbar at the bottom

**Solution**:
- This is expected behavior when widgets extend beyond 12 columns
- Refresh the page to recalculate layout
- Or reset the layout using the ↻ button

### Cannot Resize Widgets Below 1 Column

**Problem**: Widget won't shrink smaller than 1 column wide

**Solution**:
- This is working as intended
- Minimum size enforced: 1 column × 1 row (ensures widgets remain usable)
- Widgets will automatically adapt to compact mode when small

### Old Widgets Won't Shrink After Resize

**Problem**: Widgets created before a certain date have fixed sizes

**Solution**:
- Click the **↻ Reset Layout** button in the dashboard header
- Confirm the reset
- Re-add widgets from the picker (they'll have correct min/max sizes)

### Layout Doesn't Persist After Page Refresh

**Problem**: Dashboard layout resets to empty on page refresh

**Solutions**:
```bash
# 1. Check browser local storage isn't being cleared
# Open DevTools → Application → Local Storage → http://localhost:3000
# Look for keys like "dashboard-config-{campaignId}"

# 2. Check backend save operation
docker-compose logs backend | grep "PUT /api/dashboard-configs"

# Expected: 200 status codes

# 3. Check database table exists
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "SELECT COUNT(*) FROM dashboard_configs;"

# Expected: Non-zero count
```

### Widget Picker Shows No Widgets

**Problem**: Widget picker modal opens but is empty

**Solution**:
- Check browser console for JavaScript errors (F12 → Console tab)
- Verify `WidgetRegistry.tsx` is loaded:
```bash
ls -l frontend/src/components/dashboard/WidgetRegistry.tsx
```

### Category Landing Page Shows Wrong Widgets

**Problem**: NPCs landing page shows quest widgets, or other mismatched widgets

**Expected Behavior**:
- This is actually intentional in v1
- Widget picker on category landing pages shows **all** widgets (not filtered)
- Filtering was planned but not implemented in initial version
- Workaround: Manually select only relevant widgets for each category

## Edge Cases

### Empty Campaign (No Entities)

**Behavior**:
- Widgets display empty states: "No {category} yet. Add your first one to see it here."
- Dashboard shows empty state with "Add Your First Widget" button
- Category landing pages show empty tables

**Test**:
1. Create a brand new campaign
2. Access dashboard immediately
3. Add widgets → All show empty states
4. Add some entities (NPCs, Locations) via category pages
5. Return to dashboard → Widgets now show data

### Campaign with 500+ Entities

**Performance**:
- Widgets should still load in <500ms
- Widget data APIs use pagination internally (limit 10 for "recent" lists)
- Table views use pagination (50 per page default)

**Test**:
1. Create campaign with 500 NPCs (use bulk import or scripts)
2. Load dashboard
3. Verify widgets load quickly
4. Verify "View All" links navigate to full table views

### Multiple Users on Same Campaign

**Behavior**:
- Each user has their own independent dashboard layout
- User A's layout doesn't affect User B's layout
- Category landing page configurations are also per-user

**Test**:
1. User A logs in → Customizes dashboard (3 widgets)
2. User B logs in to same campaign → Sees default empty dashboard
3. User B adds 5 widgets
4. User A refreshes → Still sees their 3 widgets

### Very Long Entity Names in Widgets

**Behavior**:
- Widget cards truncate long names with ellipsis (`...`)
- Hover for full name (tooltip)
- Click to navigate to detail page

**Test**:
1. Create NPC with 200-character name
2. Add NPC Summary widget
3. Widget shows truncated name: "This is an extremely long NPC name with..."

### Deleting an Entity That Appears in Widget

**Behavior**:
- Widget auto-updates on next page refresh
- Deleted entity no longer appears in widget lists
- Widget counts decrement automatically

**Test**:
1. Add NPC Summary widget showing 5 recent NPCs
2. Delete one of those NPCs via table view
3. Return to dashboard → Refresh page
4. Widget now shows 4 NPCs, deleted one is gone

## Success Criteria

You've successfully completed the quickstart when:

✅ Dashboard loads with empty state or saved layout
✅ Widget picker opens and shows all 7 widget types
✅ Widgets can be added to canvas
✅ Widgets can be dragged to reorder
✅ Widgets can be resized via bottom-right grip
✅ Widgets can be deleted via × button
✅ Layout persists after page refresh
✅ "Saving..." indicator appears during auto-save
✅ Reset button clears all widgets
✅ All 13 category landing pages accessible from sidebar
✅ Category landing pages show canvas + rich text editor
✅ Database button navigates to table view
✅ View mode toggle switches between DM and Player view
✅ Player view filters out DM-only entities from widgets
✅ Rich text editor saves content automatically

## Next Steps

After validating the dashboard canvas system:

1. **Feature 016**: Knowledge Graph Visualizations (integrate graph widgets into dashboard)
2. **Feature 017**: Campaign Setup Wizard (guides users through adding first entities)
3. **Feature 018**: Wiki Portal (optional notion-like wiki accessible from sidebar)

---

## Cleanup

```bash
# To reset dashboard layout for testing
# 1. Via UI: Click ↻ Reset Layout button on dashboard

# 2. Via Database (nuclear option):
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "DELETE FROM dashboard_configs WHERE campaign_id = '{CAMPAIGN_ID}';"
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "DELETE FROM category_landing_configs WHERE campaign_id = '{CAMPAIGN_ID}';"

# 3. Refresh browser page
```

---

**Status**: ✅ Quickstart complete - Ready for user testing

**Questions or issues?** Check logs:
```bash
docker-compose logs frontend  # React/UI errors
docker-compose logs backend   # API errors
```
