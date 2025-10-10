# Data Model: Wiki Portal

**Feature**: 019-create-a-wiki
**Date**: 2025-10-10
**Purpose**: Define entities, relationships, and data schemas for wiki portal

---

## Entity Overview

This feature introduces **2 new database tables** to support wiki functionality separate from the database-centric system (Features 014+):

1. **wiki_cards** - Stores wiki card content (title, rich text, information level)
2. **wiki_hierarchy** - Stores parent-child relationships between wiki cards

**Key Design Principle**: Complete separation from database entities via table namespacing. Wiki and database coexist in same SQLite file but use distinct tables.

---

## Database Schema (SQLite)

### Table: wiki_cards

Stores flexible, freeform GM content separate from structured database entities.

```sql
CREATE TABLE wiki_cards (
  wiki_card_id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,  -- Keycloak sub (creator)
  title TEXT NOT NULL CHECK(length(title) <= 500),
  content TEXT,  -- TipTap rich text JSON (nullable for empty cards)
  player_knowledge TEXT NOT NULL DEFAULT 'common_knowledge' CHECK(player_knowledge IN ('dm_secret', 'player_knowledge', 'common_knowledge')),
  version INTEGER NOT NULL DEFAULT 1,  -- Edit version for history tracking
  created_at INTEGER NOT NULL,  -- Unix timestamp
  updated_at INTEGER NOT NULL,  -- Unix timestamp
  FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Performance indexes
CREATE INDEX idx_wiki_cards_campaign ON wiki_cards(campaign_id);
CREATE INDEX idx_wiki_cards_player_knowledge ON wiki_cards(campaign_id, player_knowledge);
CREATE INDEX idx_wiki_cards_user ON wiki_cards(user_id);
CREATE INDEX idx_wiki_cards_updated ON wiki_cards(updated_at DESC);
```

**Field Descriptions**:
- `wiki_card_id`: Primary key, auto-increment
- `campaign_id`: FK to campaigns table (cascade delete on campaign removal)
- `user_id`: Creator's Keycloak sub (SET NULL on user deletion to preserve content)
- `title`: Card title, max 500 characters (enforced via CHECK constraint)
- `content`: TipTap ProseMirror JSON format for rich text, nullable
- `player_knowledge`: Information level (dm_secret/player_knowledge/common_knowledge)
- `version`: Integer version counter for edit history tracking
- `created_at`: Creation timestamp (Unix epoch)
- `updated_at`: Last modification timestamp (Unix epoch)

**Validation Rules**:
- `title` required, max 500 chars
- `player_knowledge` must be one of 3 valid values (CHECK constraint)
- `version` defaults to 1, increments on each update
- Timestamps required (set by application layer)

---

### Table: wiki_hierarchy

Tracks parent-child relationships between wiki cards (separate from database hierarchy).

```sql
CREATE TABLE wiki_hierarchy (
  wiki_hierarchy_id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_wiki_card_id INTEGER,  -- NULL for root cards
  child_wiki_card_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,  -- Sibling ordering
  created_at INTEGER NOT NULL,
  FOREIGN KEY (parent_wiki_card_id) REFERENCES wiki_cards(wiki_card_id) ON DELETE CASCADE,
  FOREIGN KEY (child_wiki_card_id) REFERENCES wiki_cards(wiki_card_id) ON DELETE CASCADE,
  UNIQUE(parent_wiki_card_id, child_wiki_card_id),  -- Prevent duplicate relationships
  CHECK(parent_wiki_card_id != child_wiki_card_id)  -- Prevent self-reference
);

-- Performance indexes
CREATE INDEX idx_wiki_hierarchy_parent ON wiki_hierarchy(parent_wiki_card_id);
CREATE INDEX idx_wiki_hierarchy_child ON wiki_hierarchy(child_wiki_card_id);
CREATE INDEX idx_wiki_hierarchy_order ON wiki_hierarchy(parent_wiki_card_id, order_index);
```

**Field Descriptions**:
- `wiki_hierarchy_id`: Primary key, auto-increment
- `parent_wiki_card_id`: FK to wiki_cards (NULL for root cards)
- `child_wiki_card_id`: FK to wiki_cards (NOT NULL - every entry must reference a child)
- `order_index`: Integer for sibling ordering (0-indexed, updated on drag-drop reorder)
- `created_at`: Relationship creation timestamp

**Validation Rules**:
- `child_wiki_card_id` required
- `parent_wiki_card_id` nullable (root cards have NULL parent)
- UNIQUE constraint on (parent, child) pair prevents duplicate relationships
- CHECK constraint prevents self-reference (card cannot be own parent)
- Circular reference prevention enforced at application layer (adjacency list traversal)

---

### Table: wiki_card_versions (Optional - 1-deep backup)

Stores previous version of wiki card for undo/revert functionality.

```sql
CREATE TABLE wiki_card_versions (
  version_id INTEGER PRIMARY KEY AUTOINCREMENT,
  wiki_card_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  player_knowledge TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,  -- Timestamp of this version
  FOREIGN KEY (wiki_card_id) REFERENCES wiki_cards(wiki_card_id) ON DELETE CASCADE
);

-- Keep only 1 previous version per card (application-enforced)
CREATE INDEX idx_wiki_versions_card ON wiki_card_versions(wiki_card_id);
```

**Usage**: On update to `wiki_cards`, application layer inserts current state into `wiki_card_versions`, deletes old version (limit 1 backup per card).

---

## TypeScript Interfaces

### WikiCard Entity

```typescript
/**
 * WikiCard - Flexible GM content separate from structured database entities
 * Used for freeform wiki notes, not part of AI canon context
 */
interface WikiCard {
  wiki_card_id: number;
  campaign_id: number;
  user_id: string;  // Keycloak sub
  title: string;  // Max 500 chars
  content: string | null;  // TipTap JSON (ProseMirror document format)
  player_knowledge: 'dm_secret' | 'player_knowledge' | 'common_knowledge';
  version: number;
  created_at: number;  // Unix timestamp
  updated_at: number;  // Unix timestamp
}

/**
 * WikiCard with parsed TipTap content for frontend rendering
 */
interface WikiCardWithParsedContent extends WikiCard {
  parsedContent: JSONContent;  // TipTap ProseMirror JSON parsed
}

/**
 * WikiCard create payload
 */
interface CreateWikiCardPayload {
  campaign_id: number;
  title: string;
  content?: string;  // Optional - can create empty card
  player_knowledge?: 'dm_secret' | 'player_knowledge' | 'common_knowledge';  // Defaults to common_knowledge
}

/**
 * WikiCard update payload
 */
interface UpdateWikiCardPayload {
  title?: string;
  content?: string;
  player_knowledge?: 'dm_secret' | 'player_knowledge' | 'common_knowledge';
}
```

---

### WikiHierarchy Entity

```typescript
/**
 * WikiHierarchy - Parent-child relationships for wiki card tree structure
 */
interface WikiHierarchy {
  wiki_hierarchy_id: number;
  parent_wiki_card_id: number | null;  // NULL for root cards
  child_wiki_card_id: number;
  order_index: number;  // Sibling ordering
  created_at: number;
}

/**
 * Create hierarchy relationship payload
 */
interface CreateWikiHierarchyPayload {
  parent_wiki_card_id: number | null;
  child_wiki_card_id: number;
  order_index?: number;  // Defaults to 0 (or max + 1 for siblings)
}

/**
 * Update hierarchy (reorder) payload
 */
interface UpdateWikiHierarchyPayload {
  order_index: number;
}

/**
 * Move card payload (change parent)
 */
interface MoveWikiCardPayload {
  child_wiki_card_id: number;
  new_parent_wiki_card_id: number | null;  // NULL to move to root
  order_index?: number;
}
```

---

### WikiCardTree (Frontend State)

```typescript
/**
 * Hierarchical tree representation for frontend rendering
 * Built from wiki_cards + wiki_hierarchy tables
 */
interface WikiCardTreeNode {
  card: WikiCard;
  children: WikiCardTreeNode[];
  depth: number;
  isExpanded: boolean;  // Frontend UI state
  isSelected: boolean;  // Multi-select state
}

/**
 * Root-level wiki tree state
 */
interface WikiCardTree {
  campaign_id: number;
  rootCards: WikiCardTreeNode[];  // Cards with NULL parent
  totalCards: number;
  viewMode: 'dm_view' | 'player_view';  // From InformationLevelContext
}
```

---

## TipTap Content Schema (ProseMirror JSON)

Wiki cards store rich text content as TipTap/ProseMirror JSON in the `content` field.

### Example: Simple Rich Text

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Session Planning Notes" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Planning for session 5 - " },
        { "type": "text", "marks": [{ "type": "bold" }], "text": "Dragon encounter" }
      ]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            { "type": "paragraph", "content": [{ "type": "text", "text": "Prepare dragon stat block" }] }
          ]
        },
        {
          "type": "listItem",
          "content": [
            { "type": "paragraph", "content": [{ "type": "text", "text": "Design lair map" }] }
          ]
        }
      ]
    }
  ]
}
```

### Example: Embedded Database View

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "NPC Reference" }]
    },
    {
      "type": "databaseEmbed",
      "attrs": {
        "viewType": "table",
        "schema": {
          "columns": [
            { "id": "name", "type": "text", "label": "Name" },
            { "id": "role", "type": "text", "label": "Role" },
            { "id": "location", "type": "text", "label": "Location" }
          ]
        },
        "data": [
          { "name": "Marcus", "role": "Guard Captain", "location": "Greyhaven" },
          { "name": "Elena", "role": "Merchant", "location": "Market District" }
        ]
      }
    }
  ]
}
```

**TipTap Custom Node**: `databaseEmbed` is a custom ProseMirror node that renders Feature 003's `<DatabaseView>` component.

---

## Relationships

### WikiCard ↔ Campaign
- **Type**: Many-to-One (many wiki cards per campaign)
- **FK**: `wiki_cards.campaign_id` → `campaigns.campaign_id`
- **Cascade**: ON DELETE CASCADE (delete all wiki cards when campaign deleted)

### WikiCard ↔ User
- **Type**: Many-to-One (many wiki cards per user/creator)
- **FK**: `wiki_cards.user_id` → `users.user_id`
- **Cascade**: ON DELETE SET NULL (preserve wiki content when user deleted, orphan cards)

### WikiHierarchy ↔ WikiCard (Parent)
- **Type**: Many-to-One (many hierarchy entries per parent card)
- **FK**: `wiki_hierarchy.parent_wiki_card_id` → `wiki_cards.wiki_card_id`
- **Cascade**: ON DELETE CASCADE (delete hierarchy when parent deleted)
- **Nullable**: Yes (root cards have NULL parent)

### WikiHierarchy ↔ WikiCard (Child)
- **Type**: One-to-One (each hierarchy entry references one child card)
- **FK**: `wiki_hierarchy.child_wiki_card_id` → `wiki_cards.wiki_card_id`
- **Cascade**: ON DELETE CASCADE (delete hierarchy when child deleted)
- **Nullable**: No (every hierarchy entry must reference a child)

---

## State Transitions

### WikiCard Lifecycle

```
[Created]
   ↓ (user creates card)
[Draft]
   ↓ (user edits content)
[Editing]
   ↓ (auto-save after 30s debounce)
[Saved]
   ↓ (user continues editing)
[Editing] → [Saved] (loop)
   ↓ (user changes information level)
[Information Level Updated]
   ↓ (user deletes card)
[Soft Deleted] (future - not implemented yet)
   ↓ (cascade from campaign delete)
[Hard Deleted]
```

### WikiHierarchy Lifecycle

```
[Created]
   ↓ (user nests card under parent)
[Established]
   ↓ (user reorders siblings)
[Reordered] (order_index updated)
   ↓ (user moves card to new parent)
[Moved] (parent_wiki_card_id updated, new order_index)
   ↓ (user deletes parent or child card)
[Deleted] (cascade delete from FK constraints)
```

---

## Validation Rules Summary

### WikiCard Validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `title` | Required, max 500 chars | DB CHECK constraint + app validation |
| `content` | Optional, valid TipTap JSON | App validation (TipTap schema) |
| `player_knowledge` | Must be dm_secret, player_knowledge, or common_knowledge | DB CHECK constraint |
| `campaign_id` | Must reference existing campaign | DB FK constraint |
| `user_id` | Must reference existing user (or NULL) | DB FK constraint (SET NULL) |
| `version` | Integer >= 1 | App validation (increment on update) |

### WikiHierarchy Validation

| Field | Rule | Enforcement |
|-------|------|-------------|
| `parent_wiki_card_id` | Must reference existing wiki card (or NULL) | DB FK constraint |
| `child_wiki_card_id` | Required, must reference existing wiki card | DB FK constraint + NOT NULL |
| Circular reference | No card can be ancestor of itself | App layer (adjacency list traversal) |
| Self-reference | `parent_wiki_card_id` != `child_wiki_card_id` | DB CHECK constraint |
| Duplicate relationship | Unique (parent, child) pair | DB UNIQUE constraint |

---

## Performance Considerations

### Database Indexes

**wiki_cards**:
- `idx_wiki_cards_campaign`: Filter cards by campaign (primary query pattern)
- `idx_wiki_cards_player_knowledge`: Filter by campaign + information level (view mode toggle)
- `idx_wiki_cards_user`: Find cards by creator
- `idx_wiki_cards_updated`: Order by last updated (recent activity)

**wiki_hierarchy**:
- `idx_wiki_hierarchy_parent`: Find children of a parent (tree navigation)
- `idx_wiki_hierarchy_child`: Find parent of a child (breadcrumbs, validation)
- `idx_wiki_hierarchy_order`: Order siblings by index (tree rendering)

### Query Patterns

**Get wiki tree for campaign** (most common):
```sql
-- Step 1: Get all cards for campaign
SELECT * FROM wiki_cards WHERE campaign_id = ? AND player_knowledge IN (/* filtered by view mode */);

-- Step 2: Get all hierarchy relationships
SELECT * FROM wiki_hierarchy WHERE child_wiki_card_id IN (/* card IDs from step 1 */) ORDER BY order_index;
```

**Performance target**: <300ms for 100 cards (FR-057)

**Get card with breadcrumb path**:
```sql
-- Recursive CTE to get ancestor chain
WITH RECURSIVE ancestors AS (
  SELECT parent_wiki_card_id, child_wiki_card_id, 1 as depth
  FROM wiki_hierarchy
  WHERE child_wiki_card_id = ?

  UNION ALL

  SELECT h.parent_wiki_card_id, h.child_wiki_card_id, a.depth + 1
  FROM wiki_hierarchy h
  INNER JOIN ancestors a ON h.child_wiki_card_id = a.parent_wiki_card_id
  WHERE a.depth < 20  -- Prevent infinite loops
)
SELECT * FROM ancestors;
```

**Circular reference detection** (before insert/update):
```sql
-- Check if proposed parent is descendant of child
WITH RECURSIVE descendants AS (
  SELECT child_wiki_card_id, 1 as depth
  FROM wiki_hierarchy
  WHERE parent_wiki_card_id = ?  -- Proposed child

  UNION ALL

  SELECT h.child_wiki_card_id, d.depth + 1
  FROM wiki_hierarchy h
  INNER JOIN descendants d ON h.parent_wiki_card_id = d.child_wiki_card_id
  WHERE d.depth < 20
)
SELECT 1 FROM descendants WHERE child_wiki_card_id = ?;  -- Proposed parent
-- If returns row: circular reference detected
```

---

## Migration Strategy

### Adding Tables to Existing Database

```sql
-- Migration: 019-add-wiki-portal.sql

BEGIN TRANSACTION;

-- Create wiki_cards table
CREATE TABLE wiki_cards (
  wiki_card_id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK(length(title) <= 500),
  content TEXT,
  player_knowledge TEXT NOT NULL DEFAULT 'common_knowledge' CHECK(player_knowledge IN ('dm_secret', 'player_knowledge', 'common_knowledge')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_wiki_cards_campaign ON wiki_cards(campaign_id);
CREATE INDEX idx_wiki_cards_player_knowledge ON wiki_cards(campaign_id, player_knowledge);
CREATE INDEX idx_wiki_cards_user ON wiki_cards(user_id);
CREATE INDEX idx_wiki_cards_updated ON wiki_cards(updated_at DESC);

-- Create wiki_hierarchy table
CREATE TABLE wiki_hierarchy (
  wiki_hierarchy_id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_wiki_card_id INTEGER,
  child_wiki_card_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (parent_wiki_card_id) REFERENCES wiki_cards(wiki_card_id) ON DELETE CASCADE,
  FOREIGN KEY (child_wiki_card_id) REFERENCES wiki_cards(wiki_card_id) ON DELETE CASCADE,
  UNIQUE(parent_wiki_card_id, child_wiki_card_id),
  CHECK(parent_wiki_card_id != child_wiki_card_id)
);

CREATE INDEX idx_wiki_hierarchy_parent ON wiki_hierarchy(parent_wiki_card_id);
CREATE INDEX idx_wiki_hierarchy_child ON wiki_hierarchy(child_wiki_card_id);
CREATE INDEX idx_wiki_hierarchy_order ON wiki_hierarchy(parent_wiki_card_id, order_index);

-- Create wiki_card_versions table (optional)
CREATE TABLE wiki_card_versions (
  version_id INTEGER PRIMARY KEY AUTOINCREMENT,
  wiki_card_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  player_knowledge TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (wiki_card_id) REFERENCES wiki_cards(wiki_card_id) ON DELETE CASCADE
);

CREATE INDEX idx_wiki_versions_card ON wiki_card_versions(wiki_card_id);

COMMIT;
```

---

## References

- Feature 003 (Card architecture): `specs/003-create-a-notion/data-model.md`
- Feature 004 (Information levels): `specs/004-create-a-tagging/data-model.md`
- TipTap ProseMirror schema: https://tiptap.dev/docs/editor/api/schema
- SQLite JSON1 extension: https://www.sqlite.org/json1.html
- Recursive CTE patterns: https://www.sqlite.org/lang_with.html
