# Data Model: Information Level-Based Filtering System

**Feature**: 004-create-a-tagging
**Phase**: 1 (Design & Contracts)
**Date**: 2025-10-01
**Storage**: SQLite3 (extends features 002-003 schema)

---

## Entity Relationship Diagram

```
┌──────────────────┐
│ InformationLevel │ (NEW)
└────────┬─────────┘
         │ 1:N
         │
┌────────▼─────────┐
│      Card        │ (EXTENDED from feature 003)
│  (all types)     │
└────────┬─────────┘
         │
         │ 1:N (for database cards)
         │
┌────────▼─────────┐
│ DatabaseColumn   │ (EXTENDED metadata)
└──────────────────┘

┌──────────────────┐
│    ViewMode      │ (User session state, not persisted entity)
└──────────────────┘
```

---

## Entities

### 1. InformationLevel (NEW)

**Purpose**: Represents visibility classification for cards. Controls which cards are visible in Player/General View and which content AI workflows can access.

**Storage**: `information_levels` table in SQLite

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS information_levels (
  id TEXT PRIMARY KEY,                    -- UUID v4
  name TEXT NOT NULL UNIQUE,              -- Level name (e.g., "System", "DM Secret")
  color TEXT NOT NULL,                    -- Hex color for UI palette (e.g., "#gray", "#red")
  hierarchical INTEGER NOT NULL DEFAULT 0,-- 1 if restricts visibility in Player View, 0 otherwise
  type TEXT NOT NULL CHECK (type IN ('default', 'custom')), -- 'default' for 4 built-in levels, 'custom' for user-created
  campaign_id TEXT,                       -- NULL for default levels (global), UUID for custom levels (campaign-scoped)
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_information_levels_campaign ON information_levels(campaign_id);
CREATE INDEX idx_information_levels_hierarchical ON information_levels(hierarchical);

-- Seed 4 default levels (run once on database initialization)
INSERT INTO information_levels (id, name, color, hierarchical, type, campaign_id) VALUES
  ('system', 'System', '#6B7280', 0, 'default', NULL),           -- Gray, non-hierarchical
  ('common-knowledge', 'Common Knowledge', '#3B82F6', 0, 'default', NULL), -- Blue, non-hierarchical
  ('player-knowledge', 'Player Knowledge', '#10B981', 0, 'default', NULL), -- Green, non-hierarchical
  ('dm-secret', 'DM Secret', '#EF4444', 1, 'default', NULL);     -- Red, hierarchical
```

**Fields**:
- `id` (TEXT, PK): UUID v4 for custom levels, hardcoded strings for default levels ('system', 'common-knowledge', 'player-knowledge', 'dm-secret'). Immutable.
- `name` (TEXT, NOT NULL, UNIQUE): Display name. Max 100 characters. Mutable for custom levels, immutable for defaults.
- `color` (TEXT, NOT NULL): Hex color code for painter's easel palette. Mutable.
- `hierarchical` (INTEGER, NOT NULL, DEFAULT 0): 1 = hides cards in Player View, 0 = visible in all views. Mutable for custom levels, immutable for defaults (only 'dm-secret' is 1).
- `type` (TEXT, NOT NULL): 'default' for 4 built-in levels, 'custom' for user-created. Immutable.
- `campaign_id` (TEXT, FK, NULLABLE): NULL for default levels (shared across all campaigns), campaign UUID for custom levels (scoped to campaign). Immutable.
- `created_at` (INTEGER, NOT NULL): Unix epoch seconds. Immutable.
- `updated_at` (INTEGER, NOT NULL): Unix epoch seconds. Mutable.

**Relationships**:
- One InformationLevel has many Cards (1:N via `cards.information_level_id`)
- One Campaign has many custom InformationLevels (1:N via `information_levels.campaign_id`)

**Validation Rules**:
- `name` required, 1-100 characters, unique across campaign (custom levels) or globally (default levels)
- `color` required, valid hex color format (e.g., "#RRGGBB")
- `hierarchical` must be 0 or 1
- `type` must be 'default' or 'custom'
- Default levels (`type='default'`) cannot be deleted or have `hierarchical` changed
- Custom levels (`type='custom'`) must have `campaign_id` (not NULL)

**State Transitions**: None (static classification, no workflow states)

**Lifecycle**:
1. **Creation (Default)**: 4 default levels seeded on database initialization
2. **Creation (Custom)**: User creates custom level via Settings → Information Levels page → POST /api/information-levels
3. **Update**: User edits custom level name/color/hierarchical flag via PUT /api/information-levels/:id
4. **Deletion**: User deletes custom level → all cards with that level revert to 'system' → warning displayed

**TypeScript Interface**:
```typescript
interface InformationLevel {
  id: string;
  name: string;
  color: string;
  hierarchical: boolean;
  type: 'default' | 'custom';
  campaignId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 2. Card (EXTENDED from feature 003)

**Changes**: Add `information_level_id` FK to link cards to information levels. Default to 'system' level on creation.

**Updated Schema**:
```sql
-- Add to existing cards table from feature 003
ALTER TABLE cards ADD COLUMN information_level_id TEXT DEFAULT 'system' NOT NULL;
ALTER TABLE cards ADD CONSTRAINT fk_information_level FOREIGN KEY (information_level_id) REFERENCES information_levels(id) ON DELETE RESTRICT;
CREATE INDEX idx_cards_information_level ON cards(information_level_id);
```

**New Field**:
- `information_level_id` (TEXT, FK, NOT NULL, DEFAULT 'system'): References `information_levels.id`. Mutable (user can change via properties panel).

**Updated Relationships**:
- One Card belongs to one InformationLevel (N:1 via `information_level_id`)

**Validation Rules**:
- `information_level_id` must reference existing information level
- Cannot set to NULL (cards always have a level)
- ON DELETE RESTRICT: Cannot delete information level if cards reference it (must revert cards to 'system' first)

**Behavior on Custom Level Deletion**:
When custom information level deleted:
1. Find all cards with `information_level_id = deleted_level_id`
2. UPDATE cards SET information_level_id = 'system' WHERE information_level_id = deleted_level_id
3. Display warning: "Information Level '[name]' was deleted. X cards reverted to System. Secrets may now be exposed in Player View."
4. DELETE FROM information_levels WHERE id = deleted_level_id

**TypeScript Interface Extension**:
```typescript
interface Card {
  // ...existing fields from feature 003
  information_level_id: string; // NEW
  information_level?: InformationLevel; // Optional joined data
}
```

---

### 3. DatabaseColumn (EXTENDED metadata)

**Changes**: Add `hierarchical` boolean flag to DatabaseColumn metadata (stored in Card.metadata JSONB for database cards). Hierarchical columns hidden in Player View regardless of entry information level.

**Updated Metadata Structure**:
```typescript
interface DatabaseColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'entity-reference' | 'player-knowledge-text'; // NEW type added
  required: boolean;
  hierarchical: boolean; // NEW: marks column as always secret (hidden in Player View)
  defaultValue?: any;
  options?: {
    choices: { id: string; label: string; color?: string }[];
  };
  entityType?: 'card';
}
```

**NEW Column Type: player-knowledge-text**:
Special text column type that enables partial visibility for secret database entries. When database entry is DM Secret AND this field has content, Player View shows entry name + this field only (all other columns hidden).

**Rules**:
- Each database can have at most ONE `player-knowledge-text` column (validation error on create if already exists)
- This column itself is NOT hierarchical (visible in Player View when entry is visible)
- Hierarchical columns are ALWAYS hidden in Player View, even for non-secret entries

**Visibility Logic (3-Layer)**:

1. **Column-level** (highest precedence): If column is hierarchical → hidden in Player View (all rows, always)
2. **Entry-level**: If entry's `information_level_id` is hierarchical (DM Secret or custom hierarchical) → entire row hidden in Player View
3. **Partial visibility override**: If entry is hierarchical AND `player-knowledge-text` column has content → show entry name + that field only

**Example Scenarios**:

| Entry Level | Column Hierarchical | Player Knowledge Field | Player View Shows |
|-------------|-------------------|----------------------|-------------------|
| System      | No                | N/A                  | Entry + all columns |
| System      | Yes (column)      | N/A                  | Entry + all columns except hierarchical column |
| DM Secret   | No                | Empty                | **Entry hidden entirely** |
| DM Secret   | No                | "Seems trustworthy"  | Entry name + "Seems trustworthy" only |
| DM Secret   | Yes (column)      | "Seems trustworthy"  | Entry name + "Seems trustworthy" (hierarchical column still hidden) |

**No Schema Migration Required**: DatabaseColumn metadata is already stored in Card.metadata JSONB (feature 003), adding `hierarchical: boolean` field doesn't require schema change.

---

### 4. ViewMode (User Session State)

**Purpose**: Represents current content visibility context for user. Two types: DM View (shows all content) and Player/General View (hides hierarchical information levels).

**Storage**: NOT a persistent database entity. Stored in:
- **Client-side**: localStorage with key `vvd-mimic:view-mode`, value `'dm' | 'player'`
- **Server-side**: Request header `X-View-Mode: dm | player` on every API call

**State Management**:
- React Context API: `ViewModeContext` provides `viewMode`, `setViewMode`, `toggleViewMode`
- Default: `'dm'` (safer, shows all content)
- Persistence: localStorage syncs across page refreshes
- Cross-tab sync: `storage` event listener updates context when view mode changes in other tabs

**TypeScript Interface**:
```typescript
type ViewMode = 'dm' | 'player';

interface ViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}
```

**Behavior**:
- **DM View**: All cards visible, hierarchical cards show visual indicator (tint + icon)
- **Player View**: Hierarchical cards completely hidden (not rendered), database hierarchical columns hidden

---

## Indexes & Performance

**Query Patterns**:
1. **Get available information levels for campaign**: `SELECT * FROM information_levels WHERE campaign_id IS NULL OR campaign_id = ? ORDER BY type, name`
   - Uses `idx_information_levels_campaign`
2. **Get hierarchical information levels**: `SELECT id FROM information_levels WHERE hierarchical = 1`
   - Uses `idx_information_levels_hierarchical`
3. **Get cards by information level**: `SELECT * FROM cards WHERE information_level_id = ?`
   - Uses `idx_cards_information_level`
4. **Filter cards for Player View**: `SELECT cards.* FROM cards JOIN information_levels ON cards.information_level_id = information_levels.id WHERE cards.campaign_id = ? AND information_levels.hierarchical = 0`
   - Uses `idx_cards_campaign` + `idx_information_levels_hierarchical`

**Performance Characteristics**:
- **Information level lookup**: O(1) - indexed on id
- **Hierarchical check**: O(1) - indexed on hierarchical flag
- **Client-side filtering (10k cards)**: O(n) but memoized, ~15ms with Set lookup
- **Server-side filtering**: O(n) but cached hierarchical level IDs, ~50ms overhead

**Scaling Limits** (acceptable for local prototype):
- 4 default information levels (fixed)
- 20 custom information levels per campaign (reasonable limit, most campaigns use <5)
- 10,000 cards per campaign (feature 003 limit), all filtered in <200ms
- 100 columns per database card (feature 003 limit), hierarchical flag on each

---

## Migration Strategy

**From Feature 003 to Feature 004**:
```sql
-- Migration 004: Add Information Levels

-- Step 1: Create information_levels table
CREATE TABLE information_levels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  hierarchical INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('default', 'custom')),
  campaign_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_information_levels_campaign ON information_levels(campaign_id);
CREATE INDEX idx_information_levels_hierarchical ON information_levels(hierarchical);

-- Step 2: Seed default information levels
INSERT INTO information_levels (id, name, color, hierarchical, type, campaign_id) VALUES
  ('system', 'System', '#6B7280', 0, 'default', NULL),
  ('common-knowledge', 'Common Knowledge', '#3B82F6', 0, 'default', NULL),
  ('player-knowledge', 'Player Knowledge', '#10B981', 0, 'default', NULL),
  ('dm-secret', 'DM Secret', '#EF4444', 1, 'default', NULL);

-- Step 3: Add information_level_id to cards table
ALTER TABLE cards ADD COLUMN information_level_id TEXT DEFAULT 'system' NOT NULL;
ALTER TABLE cards ADD CONSTRAINT fk_information_level FOREIGN KEY (information_level_id) REFERENCES information_levels(id) ON DELETE RESTRICT;
CREATE INDEX idx_cards_information_level ON cards(information_level_id);

-- Step 4: No database_columns table schema change (hierarchical stored in JSONB metadata)
-- Frontend will add hierarchical: false to all existing database columns on first read
```

**Schema Version Tracking**:
```sql
-- Update schema_version table from features 002-003
INSERT INTO schema_version (version, applied_at, description)
VALUES (4, strftime('%s', 'now'), 'Add Information Levels and extend Cards');
```

---

## Data Integrity Rules

1. **Referential Integrity**:
   - `FOREIGN KEY` constraints with `ON DELETE RESTRICT` for information_levels (cannot delete if cards reference it)
   - `ON DELETE CASCADE` for custom levels when campaign deleted
   - Cards must revert to 'system' before deleting custom level (application-level enforcement)

2. **Default Level Protection**:
   - Application-level validation: Cannot DELETE or UPDATE `hierarchical` for `type='default'` levels
   - Database constraint: `CHECK (type IN ('default', 'custom'))`

3. **Custom Level Scoping**:
   - Custom levels MUST have `campaign_id` (NOT NULL for type='custom')
   - Default levels MUST have `campaign_id = NULL`
   - Application validates level belongs to campaign before assigning to card

4. **Hierarchical Flag Consistency**:
   - Only 'dm-secret' default level has `hierarchical = 1`
   - Custom levels can be hierarchical (user choice)
   - Application enforces at least one non-hierarchical level exists (prevent locking out all content)

5. **Player Knowledge Field Uniqueness**:
   - Application validates: Each database can have at most ONE `player-knowledge-text` column
   - Error on create if column type `player-knowledge-text` already exists in database schema

6. **View Mode Security**:
   - Server-side filtering MUST occur before API response (client-side filtering is UX optimization only)
   - Return 404 for secret cards in Player View, not 403 (don't reveal existence)

---

## Constitutional Alignment

- **User Agency (II)**: Users create custom information levels with full control (name, color, hierarchical flag)
- **Information Filtering (III)**: Core feature implements tiered visibility system with DM/Player views
- **BYOLLM & Privacy (V)**: All level data stored locally in SQLite, AI workflows (features 005, 009) respect level filtering
- **Local-Only (VI)**: Simple SQLite schema, no complex optimization (client-side filtering acceptable)

---

## Future Extensions (Forward Compatibility)

**Feature 005 (AI Import & Planning)**:
- Import AI will read `information_level_id` to determine which cards to include in context
- Planning AI will have full access to all levels (DM tool)
- Import AI will dynamically assign levels during PDF import

**Feature 006 (Knowledge Graphs)**:
- Graph nodes will have `information_level_id` FK (same schema extension as Cards)
- Graph queries will filter nodes by view mode
- Relationship inference will respect hierarchical levels (no secret nodes in player queries)

**Feature 009 (Player Portal AI)**:
- Player Portal AI will query: `SELECT * FROM cards WHERE information_level_id IN ('common-knowledge', 'player-knowledge')`
- Excludes System (meta/structural) and DM Secret (restricted)

**Feature 010 (Public View)**:
- Public campaign URLs will use Player View filtering by default
- URL parameter can override to DM View with password authentication

---

**Status**: ✓ Complete - 1 new entity (InformationLevel), 2 extended entities (Card, DatabaseColumn metadata), 1 session state (ViewMode)
