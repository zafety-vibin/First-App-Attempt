# Quickstart: Card-Based Content Architecture

**Feature**: 003-create-a-notion | **Time to complete**: 15 minutes
**Prerequisites**: Feature 002 (Authentication & Campaign Management) running

---

## Overview

This guide demonstrates VVD-mimic's card-based content system inspired by Notion. You'll learn to:

1. Create a Setting (world/universe container)
2. Create nested page cards with infinite hierarchy
3. Build a database card with custom schema (e.g., Characters database)
4. Add database entries and switch between views (table, list, gallery, kanban)
5. Use slash commands for rapid content creation

---

## Step 1: Start the Application

```bash
# From project root
docker-compose up

# Wait for services to start (30-60 seconds)
# - Keycloak: http://localhost:8080
# - Backend API: http://localhost:3001
# - Frontend: http://localhost:3000
```

Open http://localhost:3000 in your browser. Login with your Keycloak account from Feature 002.

---

## Step 2: Create a Setting (World Container)

**User Flow**:

1. After login, click **"New Setting"** button on dashboard
2. Enter setting details:
   - **Name**: `Forgotten Realms`
   - **Description**: `High fantasy setting with magic and ancient civilizations`
3. Click **"Create Setting"**

**What Happened**:
- SQLite creates row in `settings` table
- Owner linked to your Keycloak user ID
- Setting now appears in sidebar

**API Call** (for reference):
```bash
curl -X POST http://localhost:3001/api/settings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Forgotten Realms",
    "description": "High fantasy setting with magic and ancient civilizations"
  }'
```

---

## Step 3: Create Campaign in Setting

**User Flow**:

1. Click into **Forgotten Realms** setting
2. Click **"New Campaign"** button
3. Enter campaign details:
   - **Name**: `Waterdeep Dragon Heist`
   - **Setting**: Forgotten Realms (pre-selected)
4. Click **"Create Campaign"**

**What Happened**:
- Campaign created with `setting_id` FK to Forgotten Realms
- Default root page card auto-created: "Waterdeep Dragon Heist Home"
- Campaign appears in sidebar under Forgotten Realms

---

## Step 4: Create First Page Card with Slash Command

**User Flow**:

1. Click into **Waterdeep Dragon Heist** campaign
2. You see the default "Home" page card (blank)
3. Click inside the page editor
4. Type `/page` → Press Enter
5. Name the page: `Campaign Overview`
6. Press Enter to create

**What Happened**:
- Slash command palette opened (cmdk library)
- New page card created as child of Home page
- Card hierarchy: Home → Campaign Overview
- TipTap editor initialized for rich text

**Expected UI**:
```
🏠 Waterdeep Dragon Heist Home
  └─ 📄 Campaign Overview  ← New page card (nested)
```

**Try Adding Content**:
- Type into editor: `# Welcome to Waterdeep!` → Auto-formatted as Heading 1
- Type: `/heading2` → Create H2: `Session Notes`
- Type: `/text` → Create text block: `Our party arrived in the city...`

---

## Step 5: Create Nested Pages (Infinite Hierarchy)

**User Flow**:

1. Inside "Campaign Overview" page, type `/page`
2. Name it: `Locations`
3. Open "Locations" page, type `/page` again
4. Name it: `Yawning Portal Inn`
5. Continue nesting...

**Expected Hierarchy**:
```
🏠 Home
  └─ 📄 Campaign Overview
       └─ 📄 Locations
            └─ 📄 Yawning Portal Inn
                 └─ 📄 Taproom (level 4)
                      └─ 📄 ... (up to 50 levels)
```

**What Happened**:
- Adjacency list stores parent-child relationships
- Materialized path auto-calculated: `/campaign-id/home-id/overview-id/locations-id/inn-id`
- Depth tracked (max 50 levels enforced)

---

## Step 6: Create Database Card (Characters Database)

**User Flow**:

1. Navigate back to Home page
2. Type `/database` → Press Enter
3. Name the database: `Characters`
4. Define columns (prompted in modal):
   - **Name** (text, required)
   - **Level** (number)
   - **Class** (select: Fighter, Wizard, Rogue)
   - **Status** (select: Active, Inactive, Dead)
   - **Player** (text)
5. Click **"Create Database"**

**What Happened**:
- Database card created with `type='database'`
- Schema stored in `metadata` JSONB column:
  ```json
  {
    "schema": {
      "columns": [
        { "id": "col-1", "name": "Name", "type": "text", "required": true },
        { "id": "col-2", "name": "Level", "type": "number", "required": false },
        { "id": "col-3", "name": "Class", "type": "select", "options": { "choices": [...] } },
        { "id": "col-4", "name": "Status", "type": "select", "options": { "choices": [...] } },
        { "id": "col-5", "name": "Player", "type": "text", "required": false }
      ]
    },
    "views": [
      { "id": "view-1", "name": "All Characters", "type": "table" }
    ],
    "defaultViewId": "view-1"
  }
  ```
- Default "All Characters" table view created

**Expected UI**:
```
🏠 Home
  └─ 📄 Campaign Overview
  └─ 🗄️ Characters (Database)  ← Inline table view (empty)
```

---

## Step 7: Add Database Entries

**User Flow**:

1. Click **"New Entry"** button in Characters database
2. Fill in column values:
   - **Name**: `Gandalf the Grey`
   - **Level**: `20`
   - **Class**: `Wizard`
   - **Status**: `Active`
   - **Player**: `Alice`
3. Click **"Create Entry"**
4. Repeat for more characters:
   - Aragorn (Ranger, Level 18, Active)
   - Gimli (Fighter, Level 17, Active)

**What Happened**:
- Each entry is a **page card** with `parent_id = database_id`
- Entry metadata stored in card's `metadata.values`:
  ```json
  {
    "databaseId": "db-card-uuid",
    "values": {
      "col-1": "Gandalf the Grey",
      "col-2": 20,
      "col-3": "choice-id-wizard",
      "col-4": "choice-id-active",
      "col-5": "Alice"
    }
  }
  ```
- Entries appear in table view immediately

**Expected Table View**:
| Name             | Level | Class  | Status | Player |
|------------------|-------|--------|--------|--------|
| Gandalf the Grey | 20    | Wizard | Active | Alice  |
| Aragorn          | 18    | Ranger | Active | Bob    |
| Gimli            | 17    | Fighter| Active | Charlie|

---

## Step 8: Switch Database Views

**User Flow**:

1. Click **"+ New View"** in Characters database
2. Create **List View**:
   - Name: `Active Characters`
   - Type: `List`
   - Filter: `Status = Active`
   - Sort: `Level DESC`
3. Click **"Create View"**
4. Switch to List View from dropdown

**Expected List View**:
```
Active Characters (List View)

• Gandalf the Grey
  Level: 20 | Class: Wizard | Player: Alice

• Aragorn
  Level: 18 | Class: Ranger | Player: Bob

• Gimli
  Level: 17 | Class: Fighter | Player: Charlie
```

**Create Gallery View**:

1. Click **"+ New View"**
2. Create **Gallery View**:
   - Name: `Character Gallery`
   - Type: `Gallery`
   - (No filter/sort for now)
3. Click **"Create View"**

**Expected Gallery View**:
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Gandalf   │ │   Aragorn   │ │    Gimli    │
│   the Grey  │ │             │ │             │
│             │ │             │ │             │
│  Wizard L20 │ │ Ranger L18  │ │ Fighter L17 │
└─────────────┘ └─────────────┘ └─────────────┘
```

**Create Kanban View**:

1. Click **"+ New View"**
2. Create **Kanban View**:
   - Name: `By Status`
   - Type: `Kanban`
   - Group By: `Status`
3. Click **"Create View"**

**Expected Kanban View**:
```
┌─────────┐  ┌──────────┐  ┌──────┐
│ Active  │  │ Inactive │  │ Dead │
├─────────┤  ├──────────┤  ├──────┤
│ Gandalf │  │          │  │      │
│ Aragorn │  │          │  │      │
│ Gimli   │  │          │  │      │
└─────────┘  └──────────┘  └──────┘
```

---

## Step 9: Use Entity References (Link Cards)

**User Flow**:

1. Add new column to Characters database:
   - Name: `Home Location`
   - Type: `Entity Reference`
   - Entity Type: `Card`
2. Click into Gandalf entry
3. In "Home Location" column, search for "Yawning Portal Inn"
4. Select the card

**What Happened**:
- Entity reference stored as card UUID in `metadata.values`:
  ```json
  {
    "col-6": "card-uuid-yawning-portal"
  }
  ```
- Hover over link shows preview: "Yawning Portal Inn (Page)"

**Expected Display**:
| Name             | Home Location          |
|------------------|------------------------|
| Gandalf the Grey | 🏠 Yawning Portal Inn  |  ← Clickable link with hover preview

---

## Step 10: Drag & Drop Reordering

**User Flow**:

1. Navigate to Home page sidebar
2. Drag "Characters" database above "Campaign Overview"
3. Release

**What Happened**:
- `position` fields updated for both cards
- New order persisted to SQLite
- UI re-renders immediately

**Expected Hierarchy**:
```
🏠 Home
  └─ 🗄️ Characters (Database)  ← Moved up
  └─ 📄 Campaign Overview
       └─ 📄 Locations
```

**Try Moving Cards Between Parents**:
1. Drag "Yawning Portal Inn" to Home page
2. Path recalculated: `/campaign-id/home-id/inn-id`
3. Depth updated: `depth=1` (was 3)

---

## Step 11: Testing Slash Commands

**Available Commands**:

| Command      | Description                     | Example Output           |
|--------------|---------------------------------|--------------------------|
| `/page`      | Create nested page card         | New page card created    |
| `/database`  | Create database card            | Database schema modal    |
| `/text`      | Insert text block               | Empty paragraph block    |
| `/image`     | Insert image card               | Image upload prompt      |
| `/heading1`  | Insert H1 heading               | # Heading text           |
| `/heading2`  | Insert H2 heading               | ## Heading text          |
| `/heading3`  | Insert H3 heading               | ### Heading text         |

**Try Creating Content Fast**:

1. Open any page
2. Type: `/heading1` → "Session 1 Notes"
3. Type: `/text` → "The party met at the Yawning Portal..."
4. Type: `/image` → Upload map image
5. Type: `/page` → Create "Combat Encounters" nested page

**Workflow Speed Test**:
- Can you create 5 nested pages + 1 database + 3 entries in under 2 minutes using only slash commands? (Target: yes)

---

## Step 12: Verify Data Persistence

**Test Data Survival**:

1. Restart Docker containers:
   ```bash
   docker-compose down
   docker-compose up
   ```
2. Login again at http://localhost:3000
3. Navigate to Forgotten Realms → Waterdeep Dragon Heist
4. Verify all cards, databases, entries preserved

**Check SQLite Directly**:

```bash
# From project root
sqlite3 data/vvd-mimic.db

-- List all settings
SELECT id, name FROM settings;

-- List all cards for a campaign
SELECT id, type, title, depth, path FROM cards WHERE campaign_id = 'YOUR_CAMPAIGN_UUID';

-- View database schema
SELECT id, title, metadata FROM cards WHERE type = 'database';

-- List database entries
SELECT id, title, metadata FROM cards WHERE parent_id = 'YOUR_DATABASE_UUID';
```

---

## Troubleshooting

### Issue: Slash commands not appearing
- **Check**: TipTap editor loaded? Open browser console for errors
- **Fix**: Refresh page, ensure frontend container running

### Issue: "Maximum nesting depth exceeded"
- **Cause**: Tried to nest beyond 50 levels
- **Fix**: Move card higher in hierarchy or delete intermediate cards

### Issue: "Cannot move card into its own subtree"
- **Cause**: Tried to move parent card into its child (circular reference)
- **Fix**: Move child card out first, then move parent

### Issue: Database entries not appearing
- **Check**: Entries are page cards with `parent_id = database_id`
- **Fix**: Check `cards` table for entries:
  ```sql
  SELECT * FROM cards WHERE parent_id = 'YOUR_DATABASE_UUID' AND type = 'page';
  ```

### Issue: Rich text content lost on refresh
- **Cause**: ProseMirror JSON not saved to `content` column
- **Fix**: Check backend logs for save errors, verify JSON1 extension enabled

---

## Next Steps

Now that you have the card architecture working:

1. **Feature 004**: Add information filtering (System, Common, Player, DM Secret tags)
2. **Feature 005**: Import content via AI (PDF → cards, world description → database)
3. **Feature 006**: Build knowledge graph (entities, relationships, auto-linking)
4. **Feature 007**: Create interactive maps (cards on maps, click to navigate)
5. **Feature 010**: Publish public view (filter by tag, share URL)

---

## API Testing (Optional)

**Test Card CRUD**:

```bash
# Get root cards for campaign
curl -X GET "http://localhost:3001/api/cards?campaign_id=YOUR_CAMPAIGN_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create page card
curl -X POST http://localhost:3001/api/cards \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "page",
    "campaign_id": "YOUR_CAMPAIGN_UUID",
    "parent_id": null,
    "position": 0,
    "title": "Test Page",
    "content": {
      "type": "doc",
      "content": [
        { "type": "paragraph", "content": [{ "type": "text", "text": "Hello world" }] }
      ]
    }
  }'

# Get card subtree
curl -X GET "http://localhost:3001/api/cards/CARD_UUID/subtree" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Move card
curl -X PATCH "http://localhost:3001/api/cards/CARD_UUID/move" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_parent_id": "NEW_PARENT_UUID",
    "position": 0
  }'

# Delete card (with force for referenced cards)
curl -X DELETE "http://localhost:3001/api/cards/CARD_UUID?force=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Test Database Operations**:

```bash
# Get database schema
curl -X GET "http://localhost:3001/api/cards/DATABASE_UUID/schema" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Add column
curl -X POST "http://localhost:3001/api/cards/DATABASE_UUID/columns" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "col-new",
    "name": "Hit Points",
    "type": "number",
    "required": false
  }'

# Create database entry
curl -X POST "http://localhost:3001/api/cards/DATABASE_UUID/entries" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Legolas",
    "values": {
      "col-1": "Legolas",
      "col-2": 19,
      "col-3": "choice-id-ranger",
      "col-4": "choice-id-active"
    }
  }'

# List entries with view filter
curl -X GET "http://localhost:3001/api/cards/DATABASE_UUID/entries?view_id=VIEW_UUID&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Quickstart Complete!** You now understand VVD-mimic's card architecture. Features 004-010 will build on this foundation.
