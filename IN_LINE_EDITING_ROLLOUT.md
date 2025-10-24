# In-Line Editing Rollout Guide

## Status: 2/13 Categories Complete

✅ **NPCs** (6 editable fields)
✅ **Locations** (5 editable fields)
⏳ **Remaining 11 categories**

---

## What's Built

### Infrastructure (100% Complete)
- ✅ EditableCell component (5 field types)
- ✅ TanStack Table integration
- ✅ Auto-save with 500ms debounce
- ✅ Optimistic updates + error handling
- ✅ Keyboard shortcuts (Enter to save, Escape to cancel)
- ✅ PaintersEaselPalette integration for player_knowledge
- ✅ Connected to useCategory.update() hook

### Field Types Supported
1. **text**: Simple text input (name, race, description)
2. **number**: Numeric input with validation (level, population)
3. **dropdown**: Select from predefined options (alignment, location_type)
4. **tags**: Comma-separated multi-values (tags array)
5. **player_knowledge**: PaintersEaselPalette selector (System/Common/Player/DM Only)

---

## How to Add In-Line Editing to a Category

### Step 1: Open the CategoryListPage file

Example: `frontend/src/pages/FactionListPage.tsx`

### Step 2: Add `meta.editable` to column definitions

**Before**:
```typescript
{
  accessorKey: 'name',
  header: 'Name',
  cell: (info) => info.getValue(),
  size: 180,
},
```

**After**:
```typescript
{
  accessorKey: 'name',
  header: 'Name',
  cell: (info) => info.getValue(),
  size: 180,
  meta: {
    editable: true,
    editableType: 'text',
  },
},
```

### Step 3: Add player_knowledge column (RECOMMENDED)

This allows users to mark entities DM-only directly from the table:

```typescript
{
  accessorKey: 'player_knowledge',
  header: 'Visibility',
  cell: (info) => {
    const value = info.getValue() as string;
    const labelMap: Record<string, string> = {
      system: 'System',
      common_knowledge: 'Common',
      player_knowledge: 'Player',
      dm_only: 'DM Only',
    };
    return labelMap[value] || value || 'Common';
  },
  size: 120,
  meta: {
    editable: true,
    editableType: 'player_knowledge',
  },
},
```

### Step 4: Add dropdown options (if using type='dropdown')

```typescript
{
  accessorKey: 'status',
  header: 'Status',
  cell: (info) => info.getValue() || '-',
  size: 100,
  meta: {
    editable: true,
    editableType: 'dropdown',
    dropdownOptions: [
      { value: 'Active', label: 'Active' },
      { value: 'Complete', label: 'Complete' },
      { value: 'Failed', label: 'Failed' },
    ],
  },
},
```

---

## Recommended Editable Fields by Category

### Factions
- `name` (text)
- `player_knowledge` (player_knowledge)
- `faction_type` (dropdown: Guild, Government, Military, Religious, Criminal, Merchant, Other)
- `relationship_to_party` (dropdown: Allied, Friendly, Neutral, Hostile, Enemy)
- `tags` (tags)

### Session Recaps
- `session_title` (text)
- `session_number` (number)
- `tags` (tags)
- Note: player_knowledge usually 'system' for recaps

### Quests
- `quest_name` (text)
- `player_knowledge` (player_knowledge)
- `status` (dropdown: Active, Complete, Failed, On Hold)
- `priority` (dropdown: Critical, High, Medium, Low)
- `tags` (tags)

### Player Characters
- `character_name` (text)
- `class` (text or tags for multiclass)
- `level` (number)
- `tags` (tags)

### Lore Entries
- `entry_title` (text)
- `player_knowledge` (player_knowledge)
- `category` (dropdown: History, Religion, Culture, Magic, Geography, Other)
- `tags` (tags)

### World Rules
- `rule_name` (text)
- `player_knowledge` (player_knowledge)
- `category` (dropdown: Physics, Magic, Society, Economy, Other)
- `tags` (tags)

### Planar Forces
- `force_name` (text)
- `player_knowledge` (player_knowledge)
- `power_level` (dropdown: Cosmic, Greater, Lesser, Minor)
- `tags` (tags)

### Session Prep
- `prep_title` (text)
- `session_number` (number)
- `tags` (tags)
- Note: player_knowledge always 'dm_only' for prep

### Custom Mechanics
- `mechanic_name` (text)
- `player_knowledge` (player_knowledge)
- `tags` (tags)

### Items
- `item_name` (text)
- `player_knowledge` (player_knowledge)
- `rarity` (dropdown: Common, Uncommon, Rare, Very Rare, Legendary, Artifact)
- `tags` (tags)

### Creatures
- `creature_name` (text)
- `player_knowledge` (player_knowledge)
- `creature_type` (dropdown: Aberration, Beast, Celestial, Construct, Dragon, Elemental, Fey, Fiend, Giant, Humanoid, Monstrosity, Ooze, Plant, Undead)
- `challenge_rating` (number)
- `tags` (tags)

---

## Testing Checklist (Per Category)

After adding editable fields to a category:

1. ✅ Navigate to category list page
2. ✅ Click on an editable field (name, tags, etc.)
3. ✅ Type/select new value
4. ✅ Wait 500ms for auto-save (should see "Saving..." indicator)
5. ✅ Refresh page - verify change persisted
6. ✅ Try player_knowledge selector (click Visibility column)
7. ✅ Try Escape key to cancel edit
8. ✅ Try Enter key to force immediate save
9. ✅ Test error handling (invalid data)
10. ✅ Verify row click still navigates to detail page

---

## Example: Complete Faction Rollout

```typescript
const factionColumns: ColumnDef<Faction>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: (info) => info.getValue(),
    size: 200,
    meta: {
      editable: true,
      editableType: 'text',
    },
  },
  {
    accessorKey: 'player_knowledge',
    header: 'Visibility',
    cell: (info) => {
      const value = info.getValue() as string;
      const labelMap: Record<string, string> = {
        system: 'System',
        common_knowledge: 'Common',
        player_knowledge: 'Player',
        dm_only: 'DM Only',
      };
      return labelMap[value] || value || 'Common';
    },
    size: 120,
    meta: {
      editable: true,
      editableType: 'player_knowledge',
    },
  },
  {
    accessorKey: 'faction_type',
    header: 'Type',
    cell: (info) => info.getValue() || '-',
    size: 120,
    meta: {
      editable: true,
      editableType: 'dropdown',
      dropdownOptions: [
        { value: 'Guild', label: 'Guild' },
        { value: 'Government', label: 'Government' },
        { value: 'Military', label: 'Military' },
        { value: 'Religious', label: 'Religious' },
        { value: 'Criminal', label: 'Criminal' },
        { value: 'Merchant', label: 'Merchant' },
        { value: 'Other', label: 'Other' },
      ],
    },
  },
  {
    accessorKey: 'relationship_to_party',
    header: 'Party Relation',
    cell: (info) => info.getValue() || '-',
    size: 130,
    meta: {
      editable: true,
      editableType: 'dropdown',
      dropdownOptions: [
        { value: 'Allied', label: 'Allied' },
        { value: 'Friendly', label: 'Friendly' },
        { value: 'Neutral', label: 'Neutral' },
        { value: 'Hostile', label: 'Hostile' },
        { value: 'Enemy', label: 'Enemy' },
      ],
    },
  },
  {
    accessorKey: 'tags',
    header: 'Tags',
    cell: (info) => {
      const tags = info.getValue() as string[];
      return tags && tags.length > 0 ? tags.join(', ') : '-';
    },
    size: 150,
    meta: {
      editable: true,
      editableType: 'tags',
    },
  },
  // ... other non-editable columns
];
```

---

## Common Patterns

### Always Editable Fields
- `name` / `*_name` / `*_title` (text)
- `player_knowledge` (player_knowledge)
- `tags` (tags)

### Often Editable Fields
- Numeric fields: level, session_number, population, challenge_rating (number)
- Status fields: status, relationship_to_party, priority (dropdown)
- Type/category fields: faction_type, location_type, creature_type (dropdown)

### Usually NOT Editable
- ID fields: id, campaign_id, faction_id (read-only)
- Timestamps: created_at, updated_at (auto-managed)
- Relationships: superior_npc_id, parent_location_id (use detail page)
- Long text: description, dm_secrets, notes (use detail page)
- Arrays of IDs: notable_npcs, factions_present (use detail page)

---

## Performance Notes

- Auto-save debounce: 500ms
- Updates are optimistic (UI changes immediately)
- Errors trigger reversion to original value
- Each edit calls useCategory.update() which calls standardized service
- Backend uses BaseCategoryService for consistent CRUD

---

## Future Enhancements

Possible additions (not required for current scope):

1. **Quick-Add Row**: Add new entity from table footer
2. **Bulk Operations**: Select multiple rows → bulk edit
3. **Undo/Redo**: Stack of recent changes with undo
4. **Inline Validation**: Real-time validation before save
5. **Custom Field Editing**: Make custom_fields editable
6. **Textarea for Long Text**: Inline editor for descriptions
7. **Relationship Picker**: Dropdown for FK fields (faction_id, etc.)

---

## Questions?

See:
- `frontend/src/components/table/EditableCell.tsx` - Core component
- `frontend/src/pages/NPCListPage.tsx` - Full example (6 editable fields)
- `frontend/src/pages/LocationListPage.tsx` - Another example (5 editable fields)
