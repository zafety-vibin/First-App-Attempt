# Data Model: Card-Based Content Architecture

**Feature**: 003-create-a-notion
**Phase**: 1 (Design & Contracts)
**Date**: 2025-10-01
**Storage**: SQLite3 (extends feature 002 schema)

---

## Entity Relationship Diagram

```
┌─────────────┐
│   Setting   │ (NEW)
└──────┬──────┘
       │ 1:N
       ├──────────────────┐
       │                  │
┌──────▼──────┐    ┌──────▼──────┐
│  Campaign   │    │  Campaign   │ (from feature 002)
│  (002)      │    │  (002)      │
└──────┬──────┘    └──────┬──────┘
       │                  │
       │ 1:N              │ 1:N
       │                  │
┌──────▼──────────────────▼──────┐
│           Card (NEW)            │ ← Polymorphic (page, database, text, image)
│         (tree structure)        │
└──────┬──────────────────────────┘
       │ Self-referential (parent_id)
       │ 1:N (infinite nesting)
       │
       └─────────┐
                 │
         ┌───────▼────────┐
         │  Child Cards   │
         └────────────────┘
```

---

## Entities

### 1. Setting (NEW)

**Purpose**: Top-level organizational container representing a fictional world/setting. Allows GMs to organize multiple campaigns within shared worldbuilding.

**Storage**: `settings` table in SQLite

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,                    -- UUID v4
  owner_id TEXT NOT NULL,                 -- FK to users.user_id
  name TEXT NOT NULL,                     -- Setting name (e.g., "Forgotten Realms")
  description TEXT,                       -- Optional description
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_settings_owner ON settings(owner_id);
```

**Fields**:
- `id` (TEXT, PK): Unique setting identifier (UUID v4). Immutable.
- `owner_id` (TEXT, FK, NOT NULL): User who owns this setting. Immutable.
- `name` (TEXT, NOT NULL): Display name. Max 255 characters. Mutable.
- `description` (TEXT, NULLABLE): Optional rich description. Mutable.
- `created_at` (INTEGER, NOT NULL): Unix epoch seconds. Immutable.
- `updated_at` (INTEGER, NOT NULL): Unix epoch seconds. Mutable.

**Relationships**:
- One Setting belongs to one User (N:1 via `owner_id`)
- One Setting contains many Campaigns (1:N via `campaigns.setting_id`)

**Validation Rules**:
- `name` required, 1-255 characters
- `owner_id` must reference existing user

**State Transitions**: None (static container)

**Lifecycle**:
1. **Creation**: User creates setting via POST /api/settings
2. **Update**: User edits name/description via PUT /api/settings/:id
3. **Deletion**: User deletes setting → CASCADE deletes all campaigns and cards

**TypeScript Interface**:
```typescript
interface Setting {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 2. Campaign (EXTENDED from feature 002)

**Changes**: Add `setting_id` FK to link campaigns to settings.

**Updated Schema**:
```sql
-- Add to existing campaigns table from feature 002
ALTER TABLE campaigns ADD COLUMN setting_id TEXT;
ALTER TABLE campaigns ADD CONSTRAINT fk_setting FOREIGN KEY (setting_id) REFERENCES settings(id) ON DELETE CASCADE;
CREATE INDEX idx_campaigns_setting ON campaigns(setting_id);
```

**New Field**:
- `setting_id` (TEXT, FK, NULLABLE): References `settings.id`. NULL for legacy campaigns without setting.

**Updated Relationships**:
- One Campaign belongs to one Setting (N:1 via `setting_id`)
- One Campaign contains many root Cards (1:N via `cards.campaign_id` WHERE `cards.parent_id IS NULL`)

---

### 3. Card (NEW)

**Purpose**: Universal content unit. Polymorphic entity representing pages, databases, text blocks, images. Supports infinite nesting via adjacency list + materialized path.

**Storage**: `cards` table in SQLite

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,                    -- UUID v4
  type TEXT NOT NULL,                     -- 'page' | 'database' | 'text' | 'image'

  -- Hierarchy
  parent_id TEXT,                         -- FK to cards.id (NULL = root card)
  campaign_id TEXT NOT NULL,              -- FK to campaigns.id (always scoped to campaign)
  path TEXT NOT NULL,                     -- Materialized path: '/camp-id/card-id/child-id'
  position INTEGER NOT NULL,              -- Order within parent (0-indexed)
  depth INTEGER NOT NULL DEFAULT 0,       -- Nesting level (0=root, max 50)

  -- Content (polymorphic based on type)
  title TEXT,                             -- Card title (NULL for text/image cards)
  content TEXT,                           -- JSONB: ProseMirror JSON for rich text
  metadata TEXT,                          -- JSONB: Type-specific data

  -- Presentation (for page cards)
  cover_image_url TEXT,                   -- Cover image URL or upload path
  icon_emoji TEXT,                        -- Single emoji character

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (parent_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,

  CHECK (type IN ('page', 'database', 'text', 'image')),
  CHECK (depth >= 0 AND depth <= 50),
  CHECK (length(icon_emoji) <= 4)  -- Single emoji (may be multi-codepoint)
);

CREATE INDEX idx_cards_parent ON cards(parent_id);
CREATE INDEX idx_cards_campaign ON cards(campaign_id);
CREATE INDEX idx_cards_path ON cards(path);
CREATE INDEX idx_cards_position ON cards(parent_id, position);
CREATE INDEX idx_cards_type ON cards(type);
```

**Fields** (Common to all types):
- `id` (TEXT, PK): UUID v4. Immutable.
- `type` (TEXT, NOT NULL): Card type discriminator. Immutable (cannot change type).
- `parent_id` (TEXT, FK, NULLABLE): Parent card ID. NULL = root card. Mutable (move operation).
- `campaign_id` (TEXT, FK, NOT NULL): Campaign scope. Immutable.
- `path` (TEXT, NOT NULL): Materialized path for efficient subtree queries. Auto-calculated.
- `position` (INTEGER, NOT NULL): Order within parent. Mutable (reorder operation).
- `depth` (INTEGER, NOT NULL): Nesting level (0-50). Auto-calculated.
- `title` (TEXT, NULLABLE): Display title. NULL for text/image cards. Max 500 characters.
- `content` (TEXT, NULLABLE): Rich text as ProseMirror JSON string. Type-dependent.
- `metadata` (TEXT, NULLABLE): Type-specific JSONB data. Structure varies by type.
- `cover_image_url` (TEXT, NULLABLE): Cover image (page cards only). Max 2048 characters.
- `icon_emoji` (TEXT, NULLABLE): Icon emoji (page cards only). 1-4 characters (emoji with modifiers).
- `created_at` (INTEGER, NOT NULL): Unix epoch seconds. Immutable.
- `updated_at` (INTEGER, NOT NULL): Unix epoch seconds. Mutable.

**Type-Specific Metadata Structures**:

**Page Card** (`type='page'`):
```typescript
// metadata column (JSONB)
interface PageCardMetadata {
  // Empty or minimal - page cards use content for rich text
}
```

**Database Card** (`type='database'`):
```typescript
// metadata column (JSONB)
interface DatabaseCardMetadata {
  schema: {
    columns: DatabaseColumn[];
  };
  views: DatabaseView[];
  defaultViewId: string;
}

interface DatabaseColumn {
  id: string;              // UUID
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'entity-reference';
  required: boolean;
  defaultValue?: any;
  options?: {              // For select/multi-select
    choices: { id: string; label: string; color?: string }[];
  };
  entityType?: 'card';     // For entity-reference
}

interface DatabaseView {
  id: string;              // UUID
  name: string;
  type: 'table' | 'list' | 'gallery' | 'kanban';
  filter?: FilterRule[];
  sort?: SortRule[];
  groupBy?: string;        // Column ID for kanban
}

interface FilterRule {
  columnId: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'is-empty';
  value: any;
}

interface SortRule {
  columnId: string;
  direction: 'asc' | 'desc';
}
```

**Database Entry** (child page card of database card):
```typescript
// metadata column (JSONB) for page cards with parent_id = database card
interface DatabaseEntryMetadata {
  databaseId: string;      // Parent database card ID
  values: {
    [columnId: string]: any;  // Column ID → value mapping
  };
}
```

**Text Card** (`type='text'`):
```typescript
// No metadata - uses content for rich text
```

**Image Card** (`type='image'`):
```typescript
// metadata column (JSONB)
interface ImageCardMetadata {
  url: string;             // Image URL or upload path
  caption?: string;        // Optional caption
  width?: number;          // Original width (px)
  height?: number;         // Original height (px)
  size?: number;           // File size (bytes)
}
```

**Relationships**:
- One Card belongs to one Campaign (N:1 via `campaign_id`)
- One Card optionally belongs to one parent Card (N:1 via `parent_id`)
- One Card contains many child Cards (1:N self-referential)

**Validation Rules**:
- `type` must be 'page', 'database', 'text', or 'image'
- `depth` must be 0-50 (enforced in DB and application)
- `position` must be >= 0
- `path` must start with `/<campaign_id>/`
- `parent_id` cannot create circular reference (validated before update)
- Database entries must be page cards with parent = database card
- Entity references must point to existing cards

**State Transitions**: None (cards don't have workflow states)

**Lifecycle**:
1. **Creation**: User creates card via slash command or API → generates UUID, calculates path/depth, inserts
2. **Update**: User edits content, title, metadata → updates `updated_at`
3. **Move**: User drags card to new parent → validates circular ref, recalculates path/depth for entire subtree
4. **Reorder**: User drags card within parent → updates `position` for affected siblings
5. **Deletion**: User deletes card → CASCADE deletes entire subtree, warns if referenced by database entries

**TypeScript Interface**:
```typescript
interface Card {
  id: string;
  type: 'page' | 'database' | 'text' | 'image';
  parentId: string | null;
  campaignId: string;
  path: string;
  position: number;
  depth: number;
  title: string | null;
  content: any | null;      // ProseMirror JSON
  metadata: any | null;     // Type-specific
  coverImageUrl: string | null;
  iconEmoji: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Indexes & Performance

**Query Patterns**:
1. **Get root cards**: `SELECT * FROM cards WHERE campaign_id = ? AND parent_id IS NULL ORDER BY position`
   - Uses `idx_cards_campaign` + NULL check
2. **Get children of card**: `SELECT * FROM cards WHERE parent_id = ? ORDER BY position`
   - Uses `idx_cards_parent` + `idx_cards_position`
3. **Get subtree**: `SELECT * FROM cards WHERE path LIKE '/camp-id/card-id/%' ORDER BY path, position`
   - Uses `idx_cards_path` + pattern match
4. **Get database entries**: `SELECT * FROM cards WHERE parent_id = ? AND type = 'page'`
   - Uses `idx_cards_parent` + `idx_cards_type`
5. **Search by title**: `SELECT * FROM cards WHERE campaign_id = ? AND title LIKE ?`
   - Full table scan (acceptable for prototype, can add FTS5 later)

**Performance Characteristics**:
- **Insert**: O(1) - calculate path from parent, insert row
- **Move**: O(n) where n = subtree size - must update paths for all descendants
- **Delete**: O(n) where n = subtree size - CASCADE handles cleanup
- **Reorder**: O(k) where k = siblings count - update positions
- **Get children**: O(log n) - indexed on parent_id
- **Get subtree**: O(m) where m = subtree size - path index scan

**Scaling Limits** (acceptable for local prototype):
- 10,000 cards per campaign (tested in research, SQLite handles easily)
- 50 nesting levels (prevents stack overflow in recursive rendering)
- 100 columns per database (UI degrades beyond 50, but technically supported)
- 1,000 entries per database (inline view paginates at 10)

---

## Migration Strategy

**From Feature 002 to Feature 003**:
```sql
-- Migration 003: Add Settings and Cards

-- Step 1: Create settings table
CREATE TABLE settings (
  -- schema from above
);

-- Step 2: Add setting_id to campaigns
ALTER TABLE campaigns ADD COLUMN setting_id TEXT REFERENCES settings(id) ON DELETE CASCADE;
CREATE INDEX idx_campaigns_setting ON campaigns(setting_id);

-- Step 3: Create cards table
CREATE TABLE cards (
  -- schema from above
);

-- Step 4: Create default root card for existing campaigns
INSERT INTO cards (id, type, campaign_id, parent_id, path, position, depth, title)
SELECT
  lower(hex(randomblob(16))),  -- Generate UUID
  'page',
  id,
  NULL,
  '/' || id || '/' || lower(hex(randomblob(16))),
  0,
  0,
  name || ' Home'
FROM campaigns;
```

**Schema Version Tracking**:
```sql
-- Update schema_version table from feature 002
INSERT INTO schema_version (version, applied_at, description)
VALUES (3, strftime('%s', 'now'), 'Add Settings and Cards tables');
```

---

## Data Integrity Rules

1. **Referential Integrity**:
   - `FOREIGN KEY` constraints with `ON DELETE CASCADE`
   - Setting deletion cascades to campaigns → cards
   - Card deletion cascades to child cards

2. **Circular Reference Prevention**:
   - Application-level validation before move operation
   - Path-based check: `newParent.path.startsWith(card.path)` → ERROR

3. **Depth Limit**:
   - DB `CHECK` constraint: `depth <= 50`
   - Application validates before allowing nest operation

4. **Position Integrity**:
   - Application ensures no negative positions
   - Gaps in positions allowed (facilitates reordering)

5. **Type Safety**:
   - `CHECK` constraint on card types
   - Metadata structure validated in application layer

6. **Path Consistency**:
   - Path auto-calculated from parent's path + card ID
   - Move operation recalculates paths for entire subtree in transaction

---

## Constitutional Alignment

- **User Agency (II)**: User controls entire card hierarchy, unlimited nesting, user-defined database schemas
- **Information Filtering (III)**: Card entity ready for `filter_tag` column (feature 004 will add)
- **Knowledge Graph (IV)**: Entity-reference column type enables linking cards to future graph nodes (feature 006)
- **Local-Only (VI)**: SQLite with JSONB = portable, no external dependencies
- **Simplicity (VI)**: Single polymorphic table instead of separate tables per card type

---

## Future Extensions (Forward Compatibility)

**Feature 004 (Information Filtering)**:
```sql
ALTER TABLE cards ADD COLUMN filter_tag TEXT DEFAULT 'system';
CREATE INDEX idx_cards_filter ON cards(filter_tag);
```

**Feature 006 (Knowledge Graphs)**:
```sql
-- Cards will reference graph nodes via entity-reference columns
-- No schema changes needed - metadata column handles references
```

**Feature 007 (Interactive Maps)**:
```sql
-- Map card type will reuse image card with special metadata
-- OR add new type: CHECK (type IN ('page', 'database', 'text', 'image', 'map'))
```

**Feature 010 (Public View)**:
```sql
-- Cards already scoped to campaigns
-- Public URL filtering will use filter_tag column from feature 004
```

---

**Status**: ✓ Complete - 1 new entity (Setting), 1 extended entity (Campaign), 1 major new entity (Card with polymorphism)
