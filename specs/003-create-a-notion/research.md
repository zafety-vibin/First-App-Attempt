# Research: Card-Based Content Architecture

**Feature**: 003-create-a-notion
**Phase**: 0 (Research & Technical Decisions)
**Date**: 2025-10-01
**Context**: Notion-inspired card system with infinite nesting, rich text, user-defined databases

---

## 1. Tree Hierarchy Patterns (Adjacency List vs Nested Sets vs Materialized Path)

### Decision
Use **Adjacency List with Materialized Path** hybrid approach for card hierarchy storage.

### Rationale
- **Adjacency List**: Simple parent_id FK enables easy insertions, updates, single-node queries
- **Materialized Path**: Path column (`/setting-id/campaign-id/card-id`) enables fast subtree queries
- **Hybrid**: Combines best of both - simple writes (adjacency), fast reads (materialized path)
- **Infinite nesting support**: Both patterns handle unlimited depth
- **SQLite compatibility**: No CTEs needed for simple queries (Better-SQLite3 supports CTEs but avoid complexity)

**Rejected Alternatives**:
- **Nested Sets**: Complex insert/delete (renumber all nodes), fragile with concurrent writes
- **Pure Adjacency**: Recursive queries for subtrees (inefficient for deep nesting)
- **Closure Table**: Additional table overhead, overkill for single-user prototype

### Implementation Approach

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,                    -- UUID v4
  type TEXT NOT NULL,                     -- 'page' | 'database' | 'text' | 'image'
  parent_id TEXT,                         -- FK to cards.id (NULL for root cards)
  campaign_id TEXT NOT NULL,              -- FK to campaigns.id

  -- Hierarchy fields
  path TEXT NOT NULL,                     -- Materialized path: '/camp-id/card-id/child-id'
  position INTEGER NOT NULL,              -- Order within parent (0-indexed)
  depth INTEGER NOT NULL DEFAULT 0,       -- Nesting level (0 = root, max 50)

  -- Common fields
  title TEXT,                             -- Nullable for text/image cards
  content TEXT,                           -- JSONB for rich text (TipTap JSON)
  metadata TEXT,                          -- JSONB for type-specific data

  -- Timestamps
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (parent_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CHECK (depth <= 50),                    -- Prevent stack overflow
  CHECK (type IN ('page', 'database', 'text', 'image'))
);

CREATE INDEX idx_cards_parent ON cards(parent_id);
CREATE INDEX idx_cards_campaign ON cards(campaign_id);
CREATE INDEX idx_cards_path ON cards(path);  -- Enables fast subtree queries
CREATE INDEX idx_cards_position ON cards(parent_id, position);  -- Reorder optimization
```

**Path Calculation on Insert**:
```typescript
// backend/src/services/CardService.ts
async function createCard(data: CreateCardInput): Promise<Card> {
  const { parentId, campaignId, type, title, content } = data;

  let path: string;
  let depth: number;
  let position: number;

  if (parentId) {
    // Get parent to build path
    const parent = await db.prepare('SELECT path, depth FROM cards WHERE id = ?').get(parentId);
    if (!parent) throw new Error('Parent card not found');
    if (parent.depth >= 50) throw new Error('Maximum nesting depth exceeded');

    path = `${parent.path}/${cardId}`;
    depth = parent.depth + 1;

    // Get last position in parent
    const lastPos = db.prepare(
      'SELECT MAX(position) as max FROM cards WHERE parent_id = ?'
    ).get(parentId);
    position = (lastPos?.max ?? -1) + 1;
  } else {
    // Root card
    path = `/${campaignId}/${cardId}`;
    depth = 0;

    const lastPos = db.prepare(
      'SELECT MAX(position) as max FROM cards WHERE campaign_id = ? AND parent_id IS NULL'
    ).get(campaignId);
    position = (lastPos?.max ?? -1) + 1;
  }

  // Insert with calculated path/depth
  db.prepare(`
    INSERT INTO cards (id, type, parent_id, campaign_id, path, position, depth, title, content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(cardId, type, parentId, campaignId, path, position, depth, title, JSON.stringify(content));

  return getCardById(cardId);
}
```

**Subtree Query**:
```typescript
// Get all descendants of a card
function getCardSubtree(cardId: string): Card[] {
  const card = db.prepare('SELECT path FROM cards WHERE id = ?').get(cardId);
  if (!card) return [];

  // All cards whose path starts with parent's path
  return db.prepare(`
    SELECT * FROM cards
    WHERE path LIKE ?
    ORDER BY path, position
  `).all(`${card.path}/%`);
}
```

**Circular Reference Prevention**:
```typescript
// Before allowing parent_id change (move operation)
function validateMove(cardId: string, newParentId: string): void {
  const card = db.prepare('SELECT path FROM cards WHERE id = ?').get(cardId);
  const newParent = db.prepare('SELECT path FROM cards WHERE id = ?').get(newParentId);

  // Check if newParent is descendant of card (circular reference)
  if (newParent.path.startsWith(`${card.path}/`)) {
    throw new Error('Cannot move card into its own subtree (circular reference)');
  }
}
```

### Pitfalls to Avoid
1. **Path updates on move**: When moving card, must update path for entire subtree (recursive update)
2. **Orphaned cards**: Ensure ON DELETE CASCADE properly cleans up subtrees
3. **Position gaps**: Don't rely on continuous positions (0, 1, 2...) - allow gaps for future insertions
4. **Depth check**: Enforce depth limit in DB CHECK constraint AND application layer
5. **Path length**: SQLite TEXT unlimited, but long paths (50 levels deep) = large strings

### References
- [Materialized Path Pattern](https://www.sqlite.org/draft/queryplanner-ng.html#_using_explicit_programming)
- [Adjacency List Performance](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/Hierarchical-Queries.html)
- [Managing Hierarchical Data in MySQL](http://mikehillyer.com/articles/managing-hierarchical-data-in-mysql/)

---

## 2. Rich Text Editor Selection (TipTap vs Slate vs Draft.js)

### Decision
Use **TipTap 2.x** (ProseMirror-based editor with React integration)

### Rationale
- **Modern architecture**: Built on ProseMirror (proven, extensible, used by NYTimes, Dropbox)
- **React integration**: Official @tiptap/react package, hooks-based API
- **Extensibility**: Plugin system for slash commands, mentions, custom nodes
- **Collaborative ready**: Y.js integration available (future multi-user support)
- **JSON storage**: Native ProseMirror JSON format (portable, versionable)
- **Lightweight**: Core ~50KB, extensions loaded on demand
- **Active development**: Maintained by GitLab, frequent releases

**Rejected Alternatives**:
- **Slate**: Lower-level (more control but more code), smaller ecosystem
- **Draft.js**: Facebook deprecated, no longer maintained
- **Quill**: Less extensible, harder to customize slash commands
- **Lexical**: Too new (Meta's Draft.js replacement), unstable API

### Implementation Approach

**Frontend Installation**:
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link
```

**Basic Editor Component** (`frontend/src/components/editor/TipTapEditor.tsx`):
```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { SlashCommands } from './extensions/SlashCommands';

interface TipTapEditorProps {
  content: any;  // ProseMirror JSON
  onChange: (content: any) => void;
  placeholder?: string;
}

export function TipTapEditor({ content, onChange, placeholder }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,  // Headings, bold, italic, lists, etc.
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
      SlashCommands,  // Custom extension (see section 8)
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());  // Emit ProseMirror JSON
    },
  });

  if (!editor) return null;

  return (
    <div className="editor-container">
      <EditorContent editor={editor} />
    </div>
  );
}
```

**Storing JSON in SQLite**:
```typescript
// backend/src/services/CardService.ts
function updateCardContent(cardId: string, content: any): void {
  // content is ProseMirror JSON object
  db.prepare(`
    UPDATE cards SET content = ?, updated_at = ? WHERE id = ?
  `).run(
    JSON.stringify(content),  // Store as JSON string
    Math.floor(Date.now() / 1000),
    cardId
  );
}

function getCard(cardId: string): Card {
  const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  return {
    ...row,
    content: row.content ? JSON.parse(row.content) : null,  // Parse back to object
  };
}
```

### Pitfalls to Avoid
1. **JSON format migration**: ProseMirror JSON structure can change with TipTap updates - version content schema
2. **XSS risk**: Sanitize HTML when rendering (use TipTap's built-in sanitization, avoid dangerouslySetInnerHTML)
3. **Large documents**: TipTap can lag with 10,000+ nodes - paginate long cards or virtualize rendering
4. **Server-side rendering**: TipTap requires DOM, won't work in SSR (acceptable for local app)
5. **Extension conflicts**: Load extensions in correct order (Placeholder after StarterKit)

### ProseMirror JSON Format Example
```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Campaign Overview" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "The adventurers arrive in " },
        { "type": "text", "marks": [{ "type": "bold" }], "text": "Waterdeep" },
        { "type": "text", "text": "..." }
      ]
    }
  ]
}
```

### References
- [TipTap Documentation](https://tiptap.dev/docs/editor/introduction)
- [ProseMirror Guide](https://prosemirror.net/docs/guide/)
- [TipTap React Example](https://tiptap.dev/docs/editor/api/introduction)

---

## 3. Rich Text JSON Storage Format (ProseMirror JSON structure, versioning)

### Decision
Store rich text as **ProseMirror JSON in SQLite TEXT column**, with version field for migration path.

### Rationale
- **Portability**: JSON = export/import friendly, no vendor lock-in
- **Queryability**: SQLite JSON1 extension enables searching within content
- **Version control**: Git-friendly (JSON diffs readable), enables content history (future)
- **Size**: JSON more compact than HTML (no closing tags), gzips well
- **Type safety**: TypeScript interfaces for TipTap nodes/marks

### Implementation Approach

**Content Column Definition**:
```sql
CREATE TABLE cards (
  -- ...other columns
  content TEXT,                           -- JSONB (ProseMirror JSON)
  content_version INTEGER DEFAULT 1,      -- Schema version for migrations
  -- ...
);
```

**Versioned Content Schema** (TypeScript):
```typescript
// backend/src/types/CardContent.ts
export interface CardContentV1 {
  version: 1;
  editor: 'tiptap';
  tiptapVersion: string;  // e.g., "2.1.0"
  doc: {
    type: 'doc';
    content: ProseMirrorNode[];
  };
}

export type CardContent = CardContentV1;  // Union type for future versions

// Example storage
const content: CardContentV1 = {
  version: 1,
  editor: 'tiptap',
  tiptapVersion: '2.1.0',
  doc: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }
    ]
  }
};
```

**Migration Strategy** (Future-Proofing):
```typescript
// backend/src/services/ContentMigration.ts
function migrateContent(content: string, fromVersion: number, toVersion: number): string {
  let parsed = JSON.parse(content);

  // Apply migrations sequentially
  if (fromVersion === 1 && toVersion === 2) {
    // Example: TipTap 2.x → 3.x migration
    parsed = migrateV1toV2(parsed);
  }

  return JSON.stringify(parsed);
}

// Run on server startup or background job
function migrateAllCards() {
  const cards = db.prepare('SELECT id, content, content_version FROM cards WHERE content_version < ?').all(CURRENT_VERSION);

  for (const card of cards) {
    const migrated = migrateContent(card.content, card.content_version, CURRENT_VERSION);
    db.prepare('UPDATE cards SET content = ?, content_version = ? WHERE id = ?').run(migrated, CURRENT_VERSION, card.id);
  }
}
```

**Searching Content** (using SQLite JSON1 extension):
```sql
-- Find cards containing specific text
SELECT * FROM cards
WHERE json_extract(content, '$.doc.content') LIKE '%Waterdeep%';

-- Find cards with headings
SELECT * FROM cards
WHERE EXISTS (
  SELECT 1 FROM json_each(json_extract(content, '$.doc.content'))
  WHERE json_extract(value, '$.type') = 'heading'
);
```

### Pitfalls to Avoid
1. **JSON size**: Large documents (1MB+) slow to parse - consider splitting very long cards
2. **Escaping**: Ensure proper JSON escaping when storing (use JSON.stringify, not string concat)
3. **NULL handling**: Distinguish between NULL (no content) and empty doc ({ type: 'doc', content: [] })
4. **Validation**: Validate JSON structure before saving (ProseMirror schema validation)
5. **Indexes**: Don't index content column directly (too large) - use full-text search table if needed

### References
- [SQLite JSON1 Extension](https://www.sqlite.org/json1.html)
- [ProseMirror Schema](https://prosemirror.net/docs/guide/#schema)
- [JSON Schema Versioning](https://embeddedartistry.com/blog/2018/06/25/json-schema-versioning/)

---

(continuing with remaining 7 research areas in next section due to length...)

## 4. Circular Reference Detection Algorithm

### Decision
Use **path-based cycle detection** during move operations, with explicit depth limit (50 levels).

### Rationale
- **Materialized path advantage**: Path string contains full ancestry, easy to check if target is descendant
- **O(1) check**: Simple string prefix check (`newParent.path.startsWith(card.path)`)
- **Explicit limit**: Depth constraint prevents stack overflow in recursive rendering
- **User-friendly error**: Show clear message when circular reference attempted

### Implementation Approach

**Move Validation** (see section 1 for code example):
```typescript
function validateMove(cardId: string, newParentId: string | null): void {
  if (!newParentId) return;  // Moving to root is always safe

  const card = db.prepare('SELECT path, depth FROM cards WHERE id = ?').get(cardId);
  const newParent = db.prepare('SELECT path, depth FROM cards WHERE id = ?').get(newParentId);

  // Check 1: Circular reference
  if (newParent.path.startsWith(`${card.path}/`)) {
    throw new Error('Cannot move card into its own subtree');
  }

  // Check 2: Depth limit
  const subtreeDepth = db.prepare(
    'SELECT MAX(depth) - ? as maxDepth FROM cards WHERE path LIKE ?'
  ).get(card.depth, `${card.path}/%`);

  const newDepth = newParent.depth + 1;
  const wouldExceedLimit = newDepth + (subtreeDepth?.maxDepth || 0) > 50;

  if (wouldExceedLimit) {
    throw new Error('Move would exceed maximum nesting depth (50 levels)');
  }
}
```

### Pitfalls to Avoid
1. **Self-reference**: Check `newParentId !== cardId` (card can't be its own parent)
2. **Path mutation during move**: Must update paths atomically (transaction required)
3. **Frontend validation**: Also validate in UI to show immediate feedback

### References
- [Cycle Detection Algorithms](https://en.wikipedia.org/wiki/Cycle_detection)

---

## 5. Database Card Schema Storage (JSONB structure for columns + views)

### Decision
Store database card schemas as **JSONB in metadata column**, using structured format for columns and view configurations.

### Rationale
- **Flexibility**: User-defined schemas can't be predetermined in SQL
- **SQLite JSON1**: Enables querying column definitions, view configs
- **Type safety**: TypeScript interfaces for schema structure
- **No dynamic tables**: Avoids creating tables per database card (complexity nightmare)

### Implementation Approach

**Schema Structure** (TypeScript):
```typescript
// Stored in cards.metadata for type='database'
interface DatabaseCardMetadata {
  schema: {
    columns: DatabaseColumn[];
  };
  views: DatabaseView[];
  defaultViewId: string;
}

interface DatabaseColumn {
  id: string;              // UUID
  name: string;            // User-defined name
  type: 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'entity-reference';
  required: boolean;
  defaultValue?: any;
  options?: {              // For select/multi-select
    choices: { id: string; label: string; color?: string }[];
  };
  entityType?: string;     // For entity-reference: 'card' | 'user' (future)
}

interface DatabaseView {
  id: string;              // UUID
  name: string;            // "Table View", "Active NPCs", etc.
  type: 'table' | 'list' | 'gallery' | 'kanban';
  filter?: FilterRule[];   // Optional filters
  sort?: SortRule[];       // Optional sorting
  groupBy?: string;        // Column ID for grouping (kanban)
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

**Example Storage**:
```json
{
  "schema": {
    "columns": [
      {
        "id": "col-1",
        "name": "Name",
        "type": "text",
        "required": true
      },
      {
        "id": "col-2",
        "name": "Status",
        "type": "select",
        "required": false,
        "options": {
          "choices": [
            { "id": "active", "label": "Active", "color": "green" },
            { "id": "retired", "label": "Retired", "color": "gray" }
          ]
        }
      },
      {
        "id": "col-3",
        "name": "Location",
        "type": "entity-reference",
        "entityType": "card"
      }
    ]
  },
  "views": [
    {
      "id": "view-1",
      "name": "All Characters",
      "type": "table",
      "sort": [{ "columnId": "col-1", "direction": "asc" }]
    },
    {
      "id": "view-2",
      "name": "Active NPCs",
      "type": "kanban",
      "groupBy": "col-2",
      "filter": [{ "columnId": "col-2", "operator": "equals", "value": "active" }]
    }
  ],
  "defaultViewId": "view-1"
}
```

**Database Entry Storage**:
Database entries are page cards with parent_id = database card ID. Entry data stored in entries.metadata:

```typescript
// Stored in cards.metadata for page cards that are database entries
interface DatabaseEntryMetadata {
  databaseId: string;      // Parent database card ID
  values: {
    [columnId: string]: any;  // Column ID → value mapping
  };
}
```

Example entry:
```json
{
  "databaseId": "db-card-123",
  "values": {
    "col-1": "Bruenor Battlehammer",
    "col-2": "active",
    "col-3": "card-456"  // Reference to another card
  }
}
```

### Pitfalls to Avoid
1. **Schema validation**: Must validate column types match values (e.g., number column = numeric value)
2. **Orphaned columns**: When deleting column, must handle existing entry values (delete or preserve?)
3. **Reference integrity**: Entity-reference columns must validate referenced card exists
4. **View consistency**: Ensure filter/sort columnIds exist in schema
5. **JSON size**: Large schemas (100 columns) = large JSON - acceptable for prototype

### References
- [Flexible Schema Patterns](https://www.mongodb.com/docs/manual/data-modeling/flexible-schema/)
- [SQLite JSON Functions](https://www.sqlite.org/json1.html)

---

## 6. SQLite JSON1 Extension (JSONB functions, indexing, query performance)

### Decision
Enable SQLite JSON1 extension in Better-SQLite3 for JSON querying capabilities.

### Rationale
- **Built-in**: JSON1 extension included in SQLite 3.38+ (Better-SQLite3 uses recent SQLite)
- **Querying**: `json_extract()`, `json_each()` enable filtering/searching JSON columns
- **Indexing**: Can create indexes on extracted JSON values
- **Performance**: Native C implementation faster than JavaScript JSON parsing

### Implementation Approach

**Enable Extension** (Better-SQLite3 auto-includes JSON1 in recent versions):
```typescript
// backend/src/services/DatabaseService.ts
import Database from 'better-sqlite3';

export const db = new Database(process.env.DATABASE_PATH);

// Verify JSON1 available
const hasJSON1 = db.prepare("SELECT json('{}')").get();
if (!hasJSON1) {
  console.error('SQLite JSON1 extension not available');
  process.exit(1);
}
```

**Query Database Entries by Column Value**:
```sql
-- Find all entries in database card 'db-123' where Status = 'active'
SELECT * FROM cards
WHERE parent_id = 'db-123'
  AND json_extract(metadata, '$.values.col-2') = 'active';
```

**Index on JSON Field** (for performance):
```sql
-- Index on entry values for specific column (if frequently filtered)
CREATE INDEX idx_card_entry_status
ON cards(json_extract(metadata, '$.values.col-2'))
WHERE parent_id = 'db-123';  -- Partial index for specific database
```

**Count Entries per Database**:
```sql
SELECT parent_id, COUNT(*) as entry_count
FROM cards
WHERE parent_id IN (SELECT id FROM cards WHERE type = 'database')
GROUP BY parent_id;
```

### Pitfalls to Avoid
1. **JSON path syntax**: Use `$.` notation (e.g., `$.schema.columns[0].name`)
2. **Type coercion**: `json_extract()` returns TEXT - cast for comparisons (`CAST(json_extract(...) AS INTEGER)`)
3. **NULL vs missing**: `json_extract()` returns NULL for missing keys
4. **Performance**: Avoid `json_each()` on large JSON arrays (O(n) iteration)
5. **Index size**: Indexing JSON fields increases database size

### References
- [SQLite JSON1 Documentation](https://www.sqlite.org/json1.html)
- [Better-SQLite3 JSON Support](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)

---

## 7. Drag-and-Drop Tree Reordering (@dnd-kit tree implementation, position calculation)

### Decision
Use **@dnd-kit** for accessible, performant drag-and-drop with tree reordering support.

### Rationale
- **Modern**: React 18 compatible, hooks-based API
- **Accessible**: Keyboard navigation, screen reader support
- **Tree support**: Sortable tree example in docs
- **Performance**: Virtual scrolling compatible (large card lists)
- **Lightweight**: ~20KB minified

**Rejected**: React Beautiful DnD (deprecated), React DnD (lower-level, more boilerplate)

### Implementation Approach

**Installation**:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Card Tree Component** (`frontend/src/components/cards/CardTree.tsx`):
```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableCard({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardRenderer card={card} />
      {card.children && (
        <CardTree cards={card.children} parentId={card.id} />
      )}
    </div>
  );
}

function CardTree({ cards, parentId }: { cards: Card[]; parentId?: string }) {
  const [items, setItems] = useState(cards);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex(c => c.id === active.id);
      const newIndex = items.findIndex(c => c.id === over.id);

      setItems(arrayMove(items, oldIndex, newIndex));

      // Update positions in backend
      updateCardPositions(parentId, items.map(c => c.id));
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(c => c.id)} strategy={verticalListSortingStrategy}>
        {items.map(card => <SortableCard key={card.id} card={card} />)}
      </SortableContext>
    </DndContext>
  );
}
```

**Backend Position Update**:
```typescript
// backend/src/services/CardService.ts
function reorderCards(parentId: string | null, orderedIds: string[]): void {
  const stmt = db.prepare('UPDATE cards SET position = ? WHERE id = ?');

  const transaction = db.transaction((ids) => {
    ids.forEach((id, index) => {
      stmt.run(index, id);
    });
  });

  transaction(orderedIds);
}
```

### Pitfalls to Avoid
1. **Nested drag**: @dnd-kit requires careful setup for nested sortable contexts
2. **Position gaps**: Allow non-continuous positions (0, 10, 20...) for future insertions between
3. **Optimistic updates**: Update UI immediately, rollback on API error
4. **Large lists**: Virtualize card lists if >100 cards in one parent

### References
- [@dnd-kit Documentation](https://docs.dndkit.com/)
- [Sortable Tree Example](https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/presets-sortable-tree--all-features)

---

## 8. Command Palette UX Pattern (cmdk integration, keyboard navigation, fuzzy search)

### Decision
Use **cmdk** (Vercel's command menu library) for slash command palette.

### Rationale
- **Modern UX**: Same pattern as Linear, GitHub, Raycast
- **Keyboard-first**: Arrow keys, enter, escape navigation
- **Fuzzy search**: Built-in filtering
- **Lightweight**: ~5KB
- **Composable**: Works with TipTap extensions

### Implementation Approach

**Installation**:
```bash
npm install cmdk
```

**Slash Command Extension** (`frontend/src/components/editor/extensions/SlashCommands.tsx`):
```typescript
import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { Command } from 'cmdk';
import tippy from 'tippy.js';

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('slashCommands'),
        props: {
          handleKeyDown: (view, event) => {
            if (event.key === '/') {
              // Show command palette
              const component = new ReactRenderer(CommandPalette, {
                editor: this.editor,
              });

              tippy(view.dom, {
                getReferenceClientRect: () => view.coordsAtPos(view.state.selection.from),
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            }
          },
        },
      }),
    ];
  },
});

function CommandPalette({ editor }: { editor: Editor }) {
  const items = [
    { label: 'Page', icon: <FileIcon />, action: () => insertCard('page') },
    { label: 'Database', icon: <TableIcon />, action: () => insertCard('database') },
    { label: 'Text', icon: <TypeIcon />, action: () => insertCard('text') },
    { label: 'Image', icon: <ImageIcon />, action: () => insertCard('image') },
    { label: 'Heading 1', icon: <H1Icon />, action: () => editor.chain().focus().setHeading({ level: 1 }).run() },
    { label: 'Heading 2', icon: <H2Icon />, action: () => editor.chain().focus().setHeading({ level: 2 }).run() },
  ];

  return (
    <Command>
      <Command.Input placeholder="Search commands..." />
      <Command.List>
        {items.map(item => (
          <Command.Item key={item.label} onSelect={item.action}>
            {item.icon} {item.label}
          </Command.Item>
        ))}
      </Command.List>
    </Command>
  );
}
```

### Pitfalls to Avoid
1. **Focus management**: Command palette must return focus to editor after selection
2. **Escape key**: Must close palette and return to editor
3. **Position**: Use tippy.js for correct positioning near cursor
4. **Mobile**: Slash commands less useful on mobile - provide toolbar alternative

### References
- [cmdk Documentation](https://cmdk.paco.me/)
- [TipTap Custom Extensions](https://tiptap.dev/docs/editor/extensions/custom-extensions)

---

## 9. Database View Rendering (TanStack Table config, kanban board DnD)

### Decision
Use **TanStack Table v8** for table/list views, **React Beautiful DnD** for kanban boards.

### Rationale
- **TanStack Table**: Headless table library, built-in sorting/filtering, performant
- **React Beautiful DnD**: Mature drag-and-drop for kanban (despite deprecation notice, still works well)
- **Separation of concerns**: Rendering logic separate from data management

### Implementation Approach

**Table View** (`frontend/src/components/database/TableView.tsx`):
```typescript
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel } from '@tanstack/react-table';

function TableView({ entries, columns, view }: DatabaseViewProps) {
  const table = useReactTable({
    data: entries,
    columns: columns.map(col => ({
      accessorKey: `values.${col.id}`,
      header: col.name,
      cell: (info) => <CellRenderer column={col} value={info.getValue()} />,
    })),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      sorting: view.sort || [],
    },
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                {header.column.columnDef.header}
                {header.column.getIsSorted() && <SortIcon />}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Kanban View** (simplified):
```typescript
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

function KanbanView({ entries, groupByColumn }: DatabaseViewProps) {
  const groups = groupEntriesByColumn(entries, groupByColumn);

  const onDragEnd = (result) => {
    // Update entry's column value
    updateEntryValue(result.draggableId, groupByColumn.id, result.destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="kanban-board">
        {Object.entries(groups).map(([groupId, entries]) => (
          <Droppable key={groupId} droppableId={groupId}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                <h3>{groupId}</h3>
                {entries.map((entry, index) => (
                  <Draggable key={entry.id} draggableId={entry.id} index={index}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                        <EntryCard entry={entry} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
```

### Pitfalls to Avoid
1. **Performance**: Large tables (1000+ rows) need virtualization (TanStack Virtual)
2. **Column types**: Must render appropriate cell component per column type (text input, select dropdown, date picker)
3. **Filter UI**: Need UI for adding/editing filters (not just applying them)
4. **Mobile**: Tables don't work well on mobile - switch to list view automatically

### References
- [TanStack Table v8 Docs](https://tanstack.com/table/v8/docs/guide/introduction)
- [React Beautiful DnD](https://github.com/atlassian/react-beautiful-dnd)

---

## 10. Entity Reference Resolution (FK integrity, cascade delete, orphan handling)

### Decision
Store entity references as **array of card IDs in JSONB**, validate on write, handle deletions with orphan detection + warning.

### Rationale
- **Flexibility**: JSONB array allows multi-select references without junction table
- **Type safety**: Validate referenced IDs exist before saving
- **Cascade handling**: ON DELETE CASCADE for cards cleans up references automatically (for parent/child)
- **Orphan prevention**: For entity-reference columns, check if deletion would orphan references

### Implementation Approach

**Entry Metadata with References**:
```json
{
  "databaseId": "db-card-123",
  "values": {
    "col-location": "card-456",           // Single reference
    "col-allies": ["card-789", "card-101"]  // Multi-select reference
  }
}
```

**Validation on Entry Update**:
```typescript
function validateEntryReferences(metadata: DatabaseEntryMetadata, schema: DatabaseColumn[]): void {
  for (const column of schema) {
    if (column.type === 'entity-reference') {
      const value = metadata.values[column.id];
      if (!value) continue;

      const refIds = Array.isArray(value) ? value : [value];
      for (const refId of refIds) {
        const exists = db.prepare('SELECT 1 FROM cards WHERE id = ?').get(refId);
        if (!exists) {
          throw new Error(`Referenced card ${refId} not found`);
        }
      }
    }
  }
}
```

**Check References Before Deletion**:
```typescript
function findReferencingEntries(cardId: string): Card[] {
  // Query all database entries that reference this card
  return db.prepare(`
    SELECT * FROM cards
    WHERE type = 'page'
      AND parent_id IN (SELECT id FROM cards WHERE type = 'database')
      AND (
        json_extract(metadata, '$.values') LIKE ?
        OR json_extract(metadata, '$.values') LIKE ?
      )
  `).all(`%"${cardId}"%`, `%["${cardId}"%`);  // Handles both single and array references
}

function deleteCard(cardId: string, force: boolean = false): void {
  const references = findReferencingEntries(cardId);

  if (references.length > 0 && !force) {
    throw new Error(`Cannot delete card: ${references.length} entries reference it. Use force=true to delete anyway.`);
  }

  // Delete card (cascade handles children)
  db.prepare('DELETE FROM cards WHERE id = ?').run(cardId);

  // If forced, orphaned references will show broken link icon in UI
}
```

**Frontend Broken Link Handling**:
```typescript
function EntityReferenceCell({ value }: { value: string | string[] }) {
  const refIds = Array.isArray(value) ? value : [value];
  const cards = useCards(refIds);  // Fetch referenced cards

  return (
    <div>
      {refIds.map(refId => {
        const card = cards.find(c => c.id === refId);
        if (!card) {
          return <span key={refId} className="broken-link">🔗 Broken link</span>;
        }
        return <CardLink key={refId} card={card} />;
      })}
    </div>
  );
}
```

### Pitfalls to Avoid
1. **Circular references**: Entity references CAN create cycles (A references B, B references A) - this is OK, just handle rendering
2. **Cascade depth**: Deleting card with many references = many entry updates (use transaction)
3. **JSON array queries**: SQLite LIKE queries on JSON arrays are approximate - validate in application layer
4. **Multi-select UI**: Need checkbox picker for multi-select entity references

### References
- [Foreign Key Constraints](https://www.sqlite.org/foreignkeys.html)
- [SQLite JSON Array Queries](https://www.sqlite.org/json1.html#jeach)

---

## Summary

All 10 critical research areas investigated with implementation approaches, rationale, and pitfalls documented.

**Key Decisions**:
1. Adjacency list + materialized path for hierarchy
2. TipTap for rich text editing
3. ProseMirror JSON with versioning for content storage
4. Path-based circular reference detection
5. JSONB for flexible database card schemas
6. SQLite JSON1 extension for querying
7. @dnd-kit for drag-and-drop reordering
8. cmdk for slash command palette
9. TanStack Table for database views
10. JSONB array for entity references with validation

**Next Phase**: Create data-model.md, API contracts, quickstart.md, update CLAUDE.md
