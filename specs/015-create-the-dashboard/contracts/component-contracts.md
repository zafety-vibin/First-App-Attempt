# Component Contracts: Dashboard & Navigation UI

**Feature**: 015-create-the-dashboard
**Date**: 2025-01-10

## Overview

This document defines component interfaces for Feature 015. Since this is a frontend feature, contracts specify React component props, rendering behavior, and API calls (not REST endpoint definitions).

---

## Dashboard Components

### DashboardPage
**Props**: `{ campaignId: string }`
**Renders**: 7 widgets in grid layout + ViewModeToggle in header
**API Calls**: None (delegates to child widgets)
**Key Behavior**: Provides campaign context to all widgets

### NPCSummaryWidget
**Props**: `{ campaignId: string }`
**Renders**:
- Total NPC count
- Relationship breakdown pie chart (ally/hostile/neutral/unknown)
- List of 5 most recent NPCs (name, race, class, last updated)
- "View All NPCs" link to category landing page
**API Calls**:
- `GET /npcs?campaign_id={campaignId}&limit=5&sort=updated_at:desc`
- `GET /npcs/stats?campaign_id={campaignId}` (aggregate counts)

### LocationExplorerWidget
**Props**: `{ campaignId: string }`
**Renders**:
- Total location count
- Type breakdown bar chart (city/dungeon/region/landmark/etc.)
- List of 5 most recent locations (name, location_type, last updated)
- "View All Locations" link
**API Calls**:
- `GET /locations?campaign_id={campaignId}&limit=5&sort=updated_at:desc`
- `GET /locations/stats?campaign_id={campaignId}` (aggregate counts by location_type)

### FactionPowerWidget
**Props**: `{ campaignId: string }`
**Renders**:
- Total faction count
- Power level distribution chart (local/regional/global)
- List of 5 most active factions (name, power_level, faction_type)
- "View All Factions" link
**API Calls**:
- `GET /factions?campaign_id={campaignId}&limit=5&sort=updated_at:desc`
- `GET /factions/stats?campaign_id={campaignId}` (aggregate counts by power_level)

### QuestTrackerWidget
**Props**: `{ campaignId: string }`
**Renders**:
- Active quest count
- Completed quest count
- Progress bar (completed / total)
- List of 5 active quests (name, status, quest_giver)
- "View All Quests" link
**API Calls**:
- `GET /quests?campaign_id={campaignId}&status=in_progress&limit=5`
- `GET /quests/stats?campaign_id={campaignId}` (counts by status)

### SessionTimelineWidget
**Props**: `{ campaignId: string }`
**Renders**:
- Last session recap summary (name, session_date, excerpt from summary)
- Next session prep (name, planned_date, status)
- Current in-game date (extracted from last recap's in_game_date_end)
- "View Recaps" and "View Prep" links
**API Calls**:
- `GET /session-recaps?campaign_id={campaignId}&limit=1&sort=session_date:desc`
- `GET /session-prep?campaign_id={campaignId}&status=ready&limit=1&sort=planned_date:asc`

### PlayerCharactersWidget
**Props**: `{ campaignId: string }`
**Renders**:
- Active PC count
- Level range (min - max)
- List of 5 PCs (name, player_name, class, level)
- "View All PCs" link
**API Calls**:
- `GET /player-characters?campaign_id={campaignId}&core_status=active&limit=5`
- `GET /player-characters/stats?campaign_id={campaignId}` (aggregate level range)

### RecentActivityWidget
**Props**: `{ campaignId: string }`
**Renders**:
- List of 10 most recently updated entities across ALL categories
- Each item shows: entity name, category icon, time since update (e.g., "2 hours ago")
- Clicking item navigates to entity detail page
**API Calls**:
- `GET /activity/recent?campaign_id={campaignId}&limit=10` (cross-category query)

---

## Sidebar Navigation Components

### SidebarNavigation
**Props**: `{ campaignId: string }`
**Renders**:
- ViewModeToggle at top
- 4 TypeSection components (SETTING, LIVING WORLD, CAMPAIGN, EXTENDED)
- Wiki button at bottom
**API Calls**:
- `GET /campaigns/{campaignId}/settings` (fetch enabled categories, thematic labels)
**State**: Manages collapse state for each type section (persisted to localStorage)

### TypeSection
**Props**:
```typescript
{
  type: 'SETTING' | 'LIVING WORLD' | 'CAMPAIGN' | 'EXTENDED';
  categories: CategoryName[];
  collapsed: boolean;
  onToggle: () => void;
  activeCategory: CategoryName | null;
}
```
**Renders**:
- Section header with type icon and label
- Collapse/expand arrow
- CategoryLink components for each enabled category (when expanded)
**API Calls**: None (data from parent)

### CategoryLink
**Props**:
```typescript
{
  category: CategoryName;
  label: string; // Themed label
  active: boolean;
  onClick: () => void;
}
```
**Renders**:
- Link to category landing page
- Category icon
- Themed label (e.g., "Corporations" for Factions in Cyberpunk theme)
- Active highlight styling
**API Calls**: None

### ViewModeToggle
**Props**:
```typescript
{
  viewMode: 'dm_view' | 'player_view';
  onChange: (mode: 'dm_view' | 'player_view') => void;
}
```
**Renders**:
- Dropdown menu (Radix UI) with two options: "DM View", "Player View"
- Current mode displayed in button
- Icon indicator (eye-open for DM, eye-closed for Player)
**API Calls**: None (pure UI, state managed by InformationLevelContext)
**Key Behavior**: Persists change to localStorage and triggers re-fetch of all data

---

## Category Landing Components

### CategoryLandingPage
**Props**: `{ campaignId: string; category: CategoryName }`
**Renders**:
- Page header with themed category label + "Create New [Category]" button
- StatisticsPanel
- SearchFilterBar
- RecentItemsList (10 most recent)
- ViewModeButtons (Table/Gallery/Board toggle, Gallery/Board disabled)
- CategoryTable (default view)
**API Calls**:
- `GET /{category}?campaign_id={campaignId}&limit=10&sort=updated_at:desc` (recent items)
- `GET /{category}/stats?campaign_id={campaignId}` (statistics)

### StatisticsPanel
**Props**:
```typescript
{
  totalCount: number;
  statusBreakdown: Record<CoreStatus, number>; // {active: 20, archived: 5, draft: 2, hidden: 0}
  lastUpdated: number | null; // Unix timestamp
}
```
**Renders**:
- Total count badge
- Status breakdown chips (count per status)
- Last updated timestamp (relative time, e.g., "Updated 3 hours ago")
**API Calls**: None (data from parent)

### RecentItemsList
**Props**:
```typescript
{
  items: any[]; // 10 most recent entities
  category: CategoryName;
  onItemClick: (id: string) => void;
}
```
**Renders**:
- List of 10 items, each showing: name, core_status badge, updated_at (relative)
- Clicking item navigates to entity detail page
**API Calls**: None (data from parent)

### SearchFilterBar
**Props**:
```typescript
{
  searchText: string;
  onSearchChange: (text: string) => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  category: CategoryName;
}
```
**Renders**:
- Search input (debounced 300ms)
- Filter dropdowns: Core Status, Player Knowledge, Tags
- Category-specific filter dropdowns (rendered dynamically based on category schema)
- Active filter chips (removable)
- "Clear All" button
**API Calls**: None (data passed from parent, triggers parent's fetch)

---

## Table Components

### CategoryTable
**Props**:
```typescript
{
  campaignId: string;
  category: CategoryName;
  entities: any[];
  columns: ColumnDefinition[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  selectedRows: string[];
  onSelectRow: (id: string) => void;
  onSelectAll: () => void;
  onRowClick: (id: string) => void;
}
```
**Renders**:
- Table header with sortable column headers
- Checkbox column for row selection
- Table rows (one per entity)
- Empty state if entities.length === 0
- Pagination controls at bottom
**API Calls**: None (data from parent)
**Key Behavior**: Generic reusable component, renders different columns based on category

### TableRow
**Props**:
```typescript
{
  entity: any;
  columns: ColumnDefinition[];
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
}
```
**Renders**:
- Checkbox cell
- Cell per column (using column.render function if provided, else plain text)
- Hover highlight
**API Calls**: None

### PaginationControls
**Props**:
```typescript
{
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}
```
**Renders**:
- Page info: "Page 2 of 10"
- Previous/Next buttons
- Jump to page input
- Page size dropdown (25/50/100)
**API Calls**: None

### BulkActionsBar
**Props**:
```typescript
{
  selectedCount: number;
  onDelete: () => void;
  onArchive: () => void;
  onChangeStatus: (status: CoreStatus) => void;
}
```
**Renders**:
- Appears when selectedCount > 0
- "X items selected" label
- Delete button (with confirmation dialog)
- Archive button
- Change Status dropdown (Active/Draft/Archived)
**API Calls**: Triggered by parent after user confirms bulk action

### TableColumnHeader
**Props**:
```typescript
{
  column: ColumnDefinition;
  sorted: boolean;
  sortDirection: 'asc' | 'desc' | null;
  onSort: () => void;
}
```
**Renders**:
- Column label
- Sort arrow icon (up/down/none)
- Click handler for sorting
**API Calls**: None

### ViewModeButtons
**Props**:
```typescript
{
  currentView: 'table' | 'gallery' | 'board';
  onViewChange: (view: 'table' | 'gallery' | 'board') => void;
}
```
**Renders**:
- 3 toggle buttons: Table (icon: grid), Gallery (icon: image), Board (icon: columns)
- Gallery and Board buttons disabled with tooltip: "Coming Soon"
- Table button always active in v1
**API Calls**: None

---

## Form Components

### EntityCreateForm
**Props**:
```typescript
{
  campaignId: string;
  category: CategoryName;
  schema: FieldSchema[]; // Universal + category-specific + custom fields
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}
```
**Renders**:
- Form fields dynamically generated from schema
- Required field indicators (*)
- Inline validation errors
- "Save" and "Cancel" buttons
- Loading spinner during submission
**API Calls**:
- `POST /{category}` on submit
- `GET /custom-field-definitions?campaign_id={campaignId}&category={category}` (fetch custom field schemas)
**Key Behavior**: Uses React Hook Form + Zod validation

### EntityEditForm
**Props**:
```typescript
{
  campaignId: string;
  category: CategoryName;
  entityId: string;
  initialData: any;
  schema: FieldSchema[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}
```
**Renders**:
- Same as EntityCreateForm but fields pre-filled with initialData
- "Save Changes" and "Cancel" buttons
- Dirty form detection: warns user if navigating away with unsaved changes
**API Calls**:
- `PUT /{category}/{entityId}` on submit

### Field Input Components

**TextInput** - Basic text field (name, race, etc.)
**TextAreaInput** - Multi-line text (description, notes, etc.)
**SelectInput** - Single dropdown (core_status, alignment, etc.)
**MultiSelectInput** - Multi-select dropdown (class array, domains array)
**NumberInput** - Number field (level, population, challenge_rating)
**DateInput** - Date picker (session_date, planned_date)
**RelationInput** - Foreign key dropdown (faction_id, quest_giver_id) - searchable, fetches entities from related category
**MultiRelationInput** - Multi-select for JSON array relations (locations array, allied_factions array)
**TagInput** - Tag chips with autocomplete (suggests existing tags from campaign)

All field components follow same prop pattern:
```typescript
{
  name: string;
  label: string;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  required?: boolean;
}
```

---

## Detail Components

### EntityDetailPage
**Props**: `{ campaignId: string; category: CategoryName; entityId: string }`
**Renders**:
- Breadcrumb: Campaign > Category > Entity Name
- Entity name as page title
- "Edit" and "Delete" buttons
- FieldDisplay components for all fields (universal + category-specific + custom)
- RelationshipLinks component for related entities
- View mode filtering: DM fields hidden in Player View
**API Calls**:
- `GET /{category}/{entityId}` (with X-View-Mode header)

### RelationshipLinks
**Props**:
```typescript
{
  relationships: {
    label: string; // e.g., "Faction", "Locations Visited"
    category: CategoryName;
    entityIds: string[];
    entities?: any[]; // Fetched entity data
  }[];
}
```
**Renders**:
- Section per relationship type
- Clickable links to related entity detail pages
- "None" if relationship array empty
**API Calls**:
- Fetches related entity names: `GET /{category}?ids={id1,id2,id3}` (batch fetch)

### FieldDisplay
**Props**:
```typescript
{
  label: string;
  value: any;
  type: 'text' | 'number' | 'date' | 'tags' | 'relation' | 'multi_relation' | 'json';
  category?: CategoryName; // For relation fields
}
```
**Renders**:
- Label + value formatted based on type
- Tags render as chips
- Relations render as clickable links
- JSON renders as formatted code block
**API Calls**: None (data from parent)

---

## Common Components

### LoadingSpinner
**Props**: `{ size?: 'sm' | 'md' | 'lg' }`
**Renders**: Spinning circle icon
**API Calls**: None

### SkeletonLoader
**Props**: `{ type: 'widget' | 'table' | 'form' | 'detail' }`
**Renders**: Animated skeleton matching layout of specified type
**API Calls**: None
**Key Behavior**: Shows while data loading

### EmptyState
**Props**:
```typescript
{
  icon?: React.ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
```
**Renders**:
- Centered icon
- Empty message (e.g., "No NPCs yet. Create your first one!")
- Optional action button
**API Calls**: None

### ErrorBoundary
**Props**: `{ children: React.ReactNode; fallback?: React.ReactNode }`
**Renders**:
- Catches React errors
- Displays fallback UI or default error message
- "Refresh Page" button
**API Calls**: None
**Key Behavior**: Error logging to console

### ConfirmDialog
**Props**:
```typescript
{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```
**Renders**:
- Modal dialog (Radix UI Dialog)
- Title + message
- Confirm and Cancel buttons
**API Calls**: None
**Key Behavior**: Used for bulk delete, single entity delete, unsaved changes warnings

---

## API Call Summary

All API calls include `X-View-Mode` header (dm_view or player_view) from InformationLevelContext.

**Dashboard Widgets**:
- 7 GET requests (one per widget) on dashboard load
- Aggregate stats endpoints: `GET /{category}/stats?campaign_id={id}`

**Category Landing Page**:
- 1 GET for recent items: `GET /{category}?campaign_id={id}&limit=10&sort=updated_at:desc`
- 1 GET for stats: `GET /{category}/stats?campaign_id={id}`

**Table View**:
- 1 GET per page: `GET /{category}?campaign_id={id}&page={page}&limit={pageSize}&sort={sortColumn}:{sortDirection}&filters={...}`

**Entity Detail**:
- 1 GET: `GET /{category}/{entityId}`
- N GETs for relationships (batch fetched): `GET /{relatedCategory}?ids={id1,id2,id3}`

**Entity Forms**:
- 1 POST: `POST /{category}` (create)
- 1 PUT: `PUT /{category}/{entityId}` (edit)
- 1 GET: `GET /custom-field-definitions?campaign_id={id}&category={category}`

**Bulk Actions**:
- 1 DELETE: `DELETE /{category}/bulk?ids={id1,id2,id3}` (bulk delete)
- 1 PATCH: `PATCH /{category}/bulk?ids={id1,id2,id3}` (bulk status change)

---

**Status**: ✅ Component contracts complete - 40+ components documented with props, renders, API calls, and key behaviors
