# Quickstart: Information Level-Based Filtering System

**Feature**: 004-create-a-tagging
**Target**: Developers implementing tiered visibility system
**Time to Complete**: 25-30 minutes
**Prerequisites**: Features 002 (Authentication) and 003 (Card Architecture) running

---

## Overview

This guide demonstrates the Information Level-Based Filtering System through hands-on workflows. You'll create custom information levels, use the painter's easel palette for default level selection, toggle between DM View and Player View, and configure database partial visibility.

**What You'll Build**:
1. Custom information level "Major Spoilers" (hierarchical)
2. Cards with different information levels (System, Common Knowledge, DM Secret, Major Spoilers)
3. Database with hierarchical columns and "Player Knowledge" field for partial visibility
4. View mode toggling workflow (DM View ↔ Player View)

---

## Workflow 1: Create Custom Information Level

**Goal**: Create "Major Spoilers" custom level and mark it hierarchical (hidden in Player View)

### Step 1.1: Navigate to Settings

```typescript
// User flow: Click Settings icon (⚙️) in top-right toolbar
// → Settings modal opens with tabs: General | Information Levels | Campaign
// → Click "Information Levels" tab
```

**Expected UI**:
```
Settings → Information Levels
┌─────────────────────────────────────────────────┐
│ Default Information Levels (4)                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ ⚪ System         #6B7280  Non-hierarchical │ │
│ │ 🔵 Common Knowledge #3B82F6  Non-hierarchical │ │
│ │ 🟢 Player Knowledge #10B981  Non-hierarchical │ │
│ │ 🔴 DM Secret       #EF4444  Hierarchical     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Custom Information Levels (0)                   │
│ [+ Create Custom Level]                         │
└─────────────────────────────────────────────────┘
```

### Step 1.2: Create Custom Level

Click **[+ Create Custom Level]** → Form appears:

```typescript
// Form fields:
{
  name: "Major Spoilers",           // Text input, max 100 chars
  color: "#FF5733",                 // Color picker (hex)
  hierarchical: true,               // Checkbox "Hide in Player View"
  campaign_id: "abc-123-xyz"        // Auto-filled (current campaign)
}
```

**API Call**:
```http
POST /api/information-levels
Content-Type: application/json
Authorization: Bearer {keycloak_token}

{
  "name": "Major Spoilers",
  "color": "#FF5733",
  "hierarchical": true,
  "campaign_id": "abc-123-xyz"
}
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Major Spoilers",
  "color": "#FF5733",
  "hierarchical": true,
  "type": "custom",
  "campaign_id": "abc-123-xyz",
  "created_at": "2025-10-01T14:30:00Z",
  "updated_at": "2025-10-01T14:30:00Z"
}
```

### Step 1.3: Verify in UI

**Expected UI Update**:
```
Custom Information Levels (1)
┌─────────────────────────────────────────────┐
│ 🟠 Major Spoilers  #FF5733  Hierarchical    │
│    [Edit] [Delete]                          │
└─────────────────────────────────────────────┘
```

**Painter's Easel Palette** (bottom-left) auto-updates with new level:
```
┌───────────────────┐
│ ⚪ System         │
│ 🔵 Common Knowl…  │
│ 🟢 Player Knowl…  │
│ 🔴 DM Secret      │
│ 🟠 Major Spoilers │ ← NEW
└───────────────────┘
```

---

## Workflow 2: Use Painter's Easel Palette for Card Creation

**Goal**: Create 4 cards with different information levels using palette default selection

### Step 2.1: Select Default Level

**User Flow**:
1. Click **"Major Spoilers"** in painter's easel palette (bottom-left)
2. Palette highlights selected level (orange border)
3. Type `/page` in canvas
4. New page card created with `information_level_id = "550e8400-e29b-41d4-a716-446655440000"` (Major Spoilers)

**Code Path**:
```typescript
// contexts/InformationLevelContext.tsx
const { currentLevel } = useInformationLevel(); // currentLevel.id = "550e8400..."

// components/Canvas/SlashCommandHandler.tsx
async function handlePageCommand() {
  const newCard = await createCard({
    type: 'page',
    information_level_id: currentLevel.id, // Uses palette selection
    campaign_id: campaignId,
  });
}
```

### Step 2.2: Create Cards with Different Levels

Click palette levels between `/page` commands:

| Command | Palette Selection | Result Card |
|---------|------------------|-------------|
| Select **System** → `/page` → Enter title "Campaign Overview" | ⚪ System | `information_level_id = 'system'` |
| Select **Common Knowledge** → `/page` → Enter title "World Map" | 🔵 Common Knowledge | `information_level_id = 'common-knowledge'` |
| Select **DM Secret** → `/page` → Enter title "Plot Twist Notes" | 🔴 DM Secret | `information_level_id = 'dm-secret'` |
| Select **Major Spoilers** → `/page` → Enter title "Endgame Reveal" | 🟠 Major Spoilers | `information_level_id = '550e8400...'` |

### Step 2.3: Verify Visual Indicators (DM View)

**DM View** (default) shows all 4 cards with visual indicators for hierarchical levels:

```
Canvas (DM View - shows all 4 cards)
┌──────────────────────────────────────────┐
│ ⚪ Campaign Overview       [System]      │ ← No indicator (non-hierarchical)
│ 🔵 World Map              [Common Knowl…]│ ← No indicator
│ 🔴 Plot Twist Notes       [DM Secret]    │ ← Light red tint + 👁️‍🗨️ icon
│ 🟠 Endgame Reveal         [Major Spoil…] │ ← Light orange tint + 👁️‍🗨️ icon
└──────────────────────────────────────────┘
```

**CSS Visual Indicators** (applied in DM View):
```css
/* components/CardNode/CardNode.module.css */
.card[data-hierarchical="true"] {
  background: linear-gradient(
    to right,
    var(--level-color-10),  /* 10% opacity tint */
    transparent
  );
}

.card[data-hierarchical="true"]::after {
  content: '👁️‍🗨️';
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 14px;
  opacity: 0.6;
}
```

---

## Workflow 3: Toggle View Mode and Verify Filtering

**Goal**: Switch between DM View and Player View, verify hierarchical cards hidden

### Step 3.1: Toggle to Player View

**Method 1: 3-Dot Menu (⋮)**
1. Click **⋮** icon in top-right toolbar
2. Dropdown menu appears:
   ```
   ┌──────────────────────┐
   │ ✓ DM View           │ ← Current (checkmark)
   │   Player/General View│
   │ ──────────────────── │
   │   Settings           │
   │   Export Campaign    │
   └──────────────────────┘
   ```
3. Click **"Player/General View"** → View mode switches

**Method 2: Keyboard Shortcut**
```
Ctrl+Shift+P (Windows/Linux)
Cmd+Shift+P (macOS)
```

**State Update**:
```typescript
// contexts/ViewModeContext.tsx
function toggleViewMode() {
  const newMode = viewMode === 'dm' ? 'player' : 'dm';
  setViewMode(newMode); // Updates React state
  localStorage.setItem('vvd-mimic:view-mode', newMode); // Persists
}
```

### Step 3.2: Verify Player View Filtering

**Player View** hides hierarchical cards (DM Secret, Major Spoilers):

```
Canvas (Player View - shows 2 cards)
┌──────────────────────────────────────────┐
│ ⚪ Campaign Overview       [System]      │
│ 🔵 World Map              [Common Knowl…]│
│                                          │ ← Plot Twist Notes HIDDEN
│                                          │ ← Endgame Reveal HIDDEN
└──────────────────────────────────────────┘
```

**Client-Side Filtering**:
```typescript
// hooks/useFilteredCards.ts
export function useFilteredCards(cards: Card[], levels: InformationLevel[]) {
  const { viewMode } = useViewMode();

  const filteredCards = useMemo(() => {
    if (viewMode === 'dm') return cards; // Show all in DM View

    const hierarchicalIds = new Set(
      levels.filter(l => l.hierarchical).map(l => l.id)
    );

    return cards.filter(
      card => !hierarchicalIds.has(card.information_level_id)
    );
  }, [cards, levels, viewMode]);

  return filteredCards;
}
```

### Step 3.3: Test API Filtering

**Server-Side Validation** (security layer):

```bash
# DM View - returns all 4 cards
curl -H "Authorization: Bearer {token}" \
     -H "X-View-Mode: dm" \
     http://localhost:3001/api/cards?campaign_id=abc-123-xyz

# Response: 4 cards (all visible)

# Player View - returns 2 cards
curl -H "Authorization: Bearer {token}" \
     -H "X-View-Mode: player" \
     http://localhost:3001/api/cards?campaign_id=abc-123-xyz

# Response: 2 cards (hierarchical filtered server-side)
```

**Server Middleware**:
```typescript
// middleware/viewModeFilter.ts
export async function filterCardsByViewMode(cards: any[], viewMode: 'dm' | 'player') {
  if (viewMode === 'dm') return cards;

  const hierarchicalLevels = await db.prepare(
    'SELECT id FROM information_levels WHERE hierarchical = 1'
  ).all();

  const hierarchicalIds = new Set(hierarchicalLevels.map(l => l.id));
  return cards.filter(card => !hierarchicalIds.has(card.information_level_id));
}
```

### Step 3.4: Test Secret Card 404

**Attempt to GET secret card in Player View** → Returns 404 (not 403):

```bash
# Get Plot Twist Notes card ID (DM Secret)
CARD_ID="def-456-abc"

# DM View - returns card
curl -H "Authorization: Bearer {token}" \
     -H "X-View-Mode: dm" \
     http://localhost:3001/api/cards/${CARD_ID}

# Response: 200 OK with card data

# Player View - returns 404
curl -H "Authorization: Bearer {token}" \
     -H "X-View-Mode: player" \
     http://localhost:3001/api/cards/${CARD_ID}

# Response: 404 Not Found (don't reveal secret exists)
```

---

## Workflow 4: Database Partial Visibility with Player Knowledge Field

**Goal**: Create database with hierarchical columns and "Player Knowledge" field for partial visibility of secret entries

### Step 4.1: Create Database with Hierarchical Columns

**User Flow**:
1. Select **System** in painter's easel palette
2. Type `/database` → Enter title "NPC Database"
3. Define schema with 5 columns:

```typescript
// Database schema metadata (stored in Card.metadata JSONB)
{
  type: 'database',
  schema: {
    columns: [
      { id: 'col-1', name: 'Name', type: 'text', required: true, hierarchical: false },
      { id: 'col-2', name: 'Location', type: 'text', required: false, hierarchical: false },
      { id: 'col-3', name: '[DM] True Motives', type: 'text', required: false, hierarchical: true }, // Hidden in Player View
      { id: 'col-4', name: '[DM] Secret Allegiance', type: 'select', required: false, hierarchical: true }, // Hidden in Player View
      { id: 'col-5', name: 'Player Knowledge', type: 'player-knowledge-text', required: false, hierarchical: false } // Special type
    ]
  }
}
```

**Validation**: Only ONE `player-knowledge-text` column allowed per database (enforced client-side).

### Step 4.2: Add Database Entries with Mixed Information Levels

Add 4 database entries:

| Entry | Information Level | Values | Player View Behavior |
|-------|------------------|--------|---------------------|
| "Merchant Aldric" | System | Name="Merchant Aldric", Location="Market Square", True Motives="", Secret Allegiance="", Player Knowledge="" | **Shows all columns except hierarchical** (Name + Location visible) |
| "Guard Captain Thora" | Common Knowledge | Name="Guard Captain Thora", Location="City Gates", True Motives="Corrupt, taking bribes", Secret Allegiance="Thieves Guild", Player Knowledge="" | **Shows all columns except hierarchical** |
| "Mysterious Stranger" | DM Secret | Name="Mysterious Stranger", Location="Tavern", True Motives="Spy for BBEG", Secret Allegiance="Evil Empire", Player Knowledge="" | **ENTIRE ENTRY HIDDEN** (no Player Knowledge field filled) |
| "Bartender Jorin" | DM Secret | Name="Bartender Jorin", Location="The Prancing Pony", True Motives="Secretly a dragon", Secret Allegiance="Ancient Dragon Council", Player Knowledge="Seems trustworthy and helpful" | **PARTIAL VISIBILITY** (Name + Player Knowledge field only) |

**API Call** (create "Bartender Jorin" entry):
```http
POST /api/cards/{database_id}/entries
Content-Type: application/json
Authorization: Bearer {token}

{
  "information_level_id": "dm-secret",
  "title": "Bartender Jorin",
  "values": {
    "col-1": "Bartender Jorin",
    "col-2": "The Prancing Pony",
    "col-3": "Secretly a dragon",
    "col-4": "option-ancient-dragon-council",
    "col-5": "Seems trustworthy and helpful"
  }
}
```

### Step 4.3: Verify 3-Layer Visibility in Player View

**DM View** - Shows all 4 entries, all columns visible:

```
NPC Database (DM View)
┌─────────────────┬──────────────┬─────────────────┬──────────────────┬────────────────────────┐
│ Name            │ Location     │ [DM] True Motives│ [DM] Secret Alleg│ Player Knowledge       │
├─────────────────┼──────────────┼─────────────────┼──────────────────┼────────────────────────┤
│ Merchant Aldric │ Market Sq…   │                 │                  │                        │
│ Guard Cap Thora │ City Gates   │ Corrupt, bribes │ Thieves Guild    │                        │
│ Mysterious Str… │ Tavern       │ Spy for BBEG    │ Evil Empire      │                        │ ← Red tint + 👁️‍🗨️ (DM Secret)
│ Bartender Jorin │ The Prancin…│ Secretly dragon │ Ancient Dragons  │ Seems trustworthy…     │ ← Red tint + 👁️‍🗨️
└─────────────────┴──────────────┴─────────────────┴──────────────────┴────────────────────────┘
```

**Player View** - 3-layer filtering logic:

```
NPC Database (Player View)
┌─────────────────┬──────────────┬────────────────────────┐
│ Name            │ Location     │ Player Knowledge       │  ← Hierarchical columns REMOVED from header
├─────────────────┼──────────────┼────────────────────────┤
│ Merchant Aldric │ Market Sq…   │                        │  ← System level, non-hierarchical columns visible
│ Guard Cap Thora │ City Gates   │                        │  ← Common Knowledge, non-hierarchical columns visible
│                 │              │                        │  ← "Mysterious Stranger" ENTIRE ENTRY HIDDEN (no Player Knowledge)
│ Bartender Jorin │              │ Seems trustworthy…     │  ← PARTIAL VISIBILITY (Name + Player Knowledge only)
└─────────────────┴──────────────┴────────────────────────┘
```

**Visibility Logic Table**:

| Entry | Entry Level | Col Hierarchical | Player Knowledge Field | Player View Result |
|-------|-------------|------------------|----------------------|-------------------|
| Merchant Aldric | System (non-hier) | Cols 3-4 hierarchical | Empty | Shows Name + Location (hierarchical cols hidden) |
| Guard Captain Thora | Common Knowledge (non-hier) | Cols 3-4 hierarchical | Empty | Shows Name + Location |
| Mysterious Stranger | DM Secret (hierarchical) | Cols 3-4 hierarchical | Empty | **ENTIRE ENTRY HIDDEN** |
| Bartender Jorin | DM Secret (hierarchical) | Cols 3-4 hierarchical | "Seems trustworthy…" | **PARTIAL: Name + Player Knowledge only** |

**Server-Side Filtering Code**:
```typescript
// routes/cards.ts - GET /cards/{database_id}/entries
export async function getDatabaseEntries(req: ViewModeRequest, res: Response) {
  const { database_id } = req.params;
  const { viewMode } = req;

  const database = await db.get('SELECT metadata FROM cards WHERE id = ?', database_id);
  const schema = JSON.parse(database.metadata).schema;

  let entries = await db.all(
    'SELECT * FROM database_entries WHERE database_id = ?',
    database_id
  );

  if (viewMode === 'player') {
    // Step 1: Filter hierarchical columns from schema
    const filteredSchema = {
      columns: schema.columns.filter(col => !col.hierarchical)
    };

    // Step 2: Filter hierarchical entries (with partial visibility override)
    const hierarchicalLevels = new Set(
      (await db.all('SELECT id FROM information_levels WHERE hierarchical = 1'))
        .map(l => l.id)
    );

    const playerKnowledgeCol = schema.columns.find(col => col.type === 'player-knowledge-text');

    entries = entries.filter(entry => {
      if (!hierarchicalLevels.has(entry.information_level_id)) {
        return true; // Non-hierarchical entry → show with non-hierarchical columns
      }

      // Hierarchical entry → check Player Knowledge field
      if (playerKnowledgeCol && entry.values[playerKnowledgeCol.id]) {
        entry.partial_visibility = true; // Flag for client rendering
        entry.values = { // Override: only show Name + Player Knowledge
          [schema.columns[0].id]: entry.values[schema.columns[0].id], // Name column
          [playerKnowledgeCol.id]: entry.values[playerKnowledgeCol.id]
        };
        return true;
      }

      return false; // Hierarchical entry without Player Knowledge → hide entirely
    });

    return res.json({ entries, schema: filteredSchema });
  }

  return res.json({ entries, schema });
}
```

---

## Workflow 5: Bulk Operations and Custom Level Deletion

**Goal**: Delete "Major Spoilers" custom level and verify card reversion to System

### Step 5.1: Verify Cards Using Custom Level

**Current State**:
- 1 card ("Endgame Reveal") has `information_level_id = "550e8400..."` (Major Spoilers)

### Step 5.2: Delete Custom Level

**User Flow**:
1. Settings → Information Levels → Click **[Delete]** next to "Major Spoilers"
2. Confirmation dialog appears:
   ```
   Delete "Major Spoilers"?
   ⚠️ 1 card currently uses this information level.
   All cards will revert to System level.
   Secrets may be exposed in Player View!

   [Cancel] [Delete and Revert]
   ```
3. Click **[Delete and Revert]**

**API Call**:
```http
DELETE /api/information-levels/550e8400-e29b-41d4-a716-446655440000?confirm=true
Authorization: Bearer {token}
```

**Server-Side Logic**:
```typescript
// services/InformationLevelService.ts
export async function deleteInformationLevel(id: string) {
  // Step 1: Find cards using this level
  const cards = await db.all(
    'SELECT id FROM cards WHERE information_level_id = ?',
    id
  );

  // Step 2: Revert cards to 'system'
  await db.run(
    'UPDATE cards SET information_level_id = \'system\' WHERE information_level_id = ?',
    id
  );

  // Step 3: Delete level
  await db.run('DELETE FROM information_levels WHERE id = ?', id);

  return {
    reverted_cards_count: cards.length,
    warning: `Information Level 'Major Spoilers' was deleted. ${cards.length} card(s) reverted to System. Secrets may now be exposed in Player View.`
  };
}
```

**Response**:
```json
{
  "reverted_cards_count": 1,
  "warning": "Information Level 'Major Spoilers' was deleted. 1 card(s) reverted to System. Secrets may now be exposed in Player View."
}
```

### Step 5.3: Verify Card Reversion

**UI Toast Notification**:
```
⚠️ Information Level "Major Spoilers" deleted.
1 card reverted to System.
Secrets may now be exposed in Player View.
```

**Canvas Update**:
- "Endgame Reveal" card now shows **⚪ System** label
- Card loses hierarchical visual indicators (no tint, no 👁️‍🗨️ icon)
- **Now visible in Player View** (System is non-hierarchical)

**Database Query Verification**:
```sql
-- Before deletion
SELECT information_level_id FROM cards WHERE title = 'Endgame Reveal';
-- Result: '550e8400-e29b-41d4-a716-446655440000'

-- After deletion
SELECT information_level_id FROM cards WHERE title = 'Endgame Reveal';
-- Result: 'system'
```

---

## Workflow 6: Cross-Tab View Mode Synchronization

**Goal**: Verify view mode persists across tabs and syncs in real-time

### Step 6.1: Open Two Browser Tabs

1. **Tab A**: Canvas in DM View (shows all 4 cards)
2. **Tab B**: Same campaign in DM View

### Step 6.2: Toggle View Mode in Tab A

1. **Tab A**: Click ⋮ → Select "Player/General View"
2. **Tab A** UI updates: Hides hierarchical cards

### Step 6.3: Verify Tab B Auto-Sync

**Expected Behavior**: Tab B automatically switches to Player View within 500ms

**Implementation**:
```typescript
// contexts/ViewModeContext.tsx
useEffect(() => {
  function handleStorageChange(e: StorageEvent) {
    if (e.key === 'vvd-mimic:view-mode' && e.newValue) {
      setViewMode(e.newValue as ViewMode); // Auto-sync from other tabs
    }
  }
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

**Verification**:
- Tab B canvas updates to show only 2 non-hierarchical cards
- No manual refresh required
- View mode toggle (⋮ menu) shows checkmark on "Player/General View"

---

## Testing Checklist

After completing all workflows, verify these behaviors:

### Information Levels
- [ ] 4 default levels exist and are immutable (cannot delete or change hierarchical flag)
- [ ] Custom levels can be created with unique names and valid hex colors
- [ ] Custom levels can be marked hierarchical
- [ ] Deleting custom level reverts all cards to System and shows warning
- [ ] Painter's easel palette updates immediately when custom level created

### Painter's Easel Palette
- [ ] Palette shows all available levels (default + custom)
- [ ] Clicking level highlights it (visual indicator)
- [ ] New cards created with `/page`, `/database`, `/text`, `/image` use selected level
- [ ] Palette selection persists across page refreshes (localStorage)

### View Mode Filtering
- [ ] DM View shows all cards with visual indicators for hierarchical levels (tint + 👁️‍🗨️)
- [ ] Player View hides all hierarchical cards (DM Secret, custom hierarchical levels)
- [ ] Toggling view mode via ⋮ menu updates canvas immediately
- [ ] Keyboard shortcut (Ctrl+Shift+P) works for toggle
- [ ] View mode persists across page refreshes
- [ ] Cross-tab synchronization works (change in Tab A updates Tab B)

### Database Visibility
- [ ] Hierarchical columns hidden in Player View (all rows)
- [ ] Non-hierarchical entries show non-hierarchical columns in Player View
- [ ] Hierarchical entries without Player Knowledge field hidden entirely in Player View
- [ ] Hierarchical entries with Player Knowledge field show Name + Player Knowledge only
- [ ] Only ONE `player-knowledge-text` column allowed per database (validation error on create)

### API Security
- [ ] Server-side filtering occurs before API response (inspect network traffic)
- [ ] Secret cards return 404 (not 403) in Player View
- [ ] `X-View-Mode` header defaults to 'dm' if omitted
- [ ] Invalid view mode values treated as 'dm' (safe default)

### Performance
- [ ] Client-side filtering completes in <50ms for 100 cards (useMemo optimization)
- [ ] No visual flicker when toggling view mode
- [ ] Painter's easel palette renders in <100ms with 10 custom levels
- [ ] Database with 100 entries renders partial visibility in <200ms

---

## Troubleshooting

### Issue: Custom level not appearing in painter's easel palette
**Cause**: React Context not refreshed after creation
**Fix**: Call `refreshLevels()` after POST `/api/information-levels`:
```typescript
await fetch('/api/information-levels', { method: 'POST', body: JSON.stringify(levelData) });
await refreshLevels(); // Refresh context
```

### Issue: Hierarchical cards still visible in Player View
**Cause**: Client-side filtering disabled or server not sending correct response
**Fix**: Verify `X-View-Mode` header sent with API requests:
```typescript
// hooks/useCards.ts
const response = await fetch('/api/cards?campaign_id=...', {
  headers: {
    'X-View-Mode': viewMode, // Ensure header present
    'Authorization': `Bearer ${token}`
  }
});
```

### Issue: Database partial visibility not working
**Cause**: Player Knowledge column ID mismatch or server not recognizing `player-knowledge-text` type
**Fix**: Verify column type in database schema:
```typescript
const playerKnowledgeCol = schema.columns.find(col => col.type === 'player-knowledge-text');
console.log('Player Knowledge column:', playerKnowledgeCol); // Should not be undefined
```

### Issue: Cross-tab sync not working
**Cause**: localStorage write failing or `storage` event listener not registered
**Fix**: Check browser console for localStorage errors and verify listener:
```typescript
// Manually test localStorage write
localStorage.setItem('vvd-mimic:view-mode', 'player');
console.log(localStorage.getItem('vvd-mimic:view-mode')); // Should log 'player'
```

---

**Status**: ✓ Quickstart Complete - 6 workflows covering creation, filtering, partial visibility, deletion, and cross-tab sync
