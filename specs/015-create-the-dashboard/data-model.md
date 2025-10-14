# Data Model: Dashboard & Navigation UI

**Feature**: 015-create-the-dashboard
**Date**: 2025-01-10

## Overview

This feature does NOT create new database entities. It consumes Feature 014 REST APIs to provide a React frontend for managing 13 category databases. This document defines UI state models, component prop interfaces, and data flow patterns.

---

## UI State Models

### 1. Dashboard State

```typescript
interface DashboardState {
  widgetData: {
    npcSummary: NPCSummaryData | null;
    locationExplorer: LocationExplorerData | null;
    factionPower: FactionPowerData | null;
    questTracker: QuestTrackerData | null;
    sessionTimeline: SessionTimelineData | null;
    playerCharacters: PlayerCharactersData | null;
    recentActivity: RecentActivityData | null;
  };
  loading: boolean;
  error: string | null;
}

interface NPCSummaryData {
  totalCount: number;
  relationshipBreakdown: Record<string, number>; // {ally: 5, hostile: 3, neutral: 10}
  recentNPCs: NPC[];
}

interface LocationExplorerData {
  totalCount: number;
  typeBreakdown: Record<string, number>; // {city: 3, dungeon: 5, region: 2}
  recentLocations: Location[];
}

interface FactionPowerData {
  totalCount: number;
  powerLevelDistribution: Record<string, number>; // {local: 4, regional: 2, global: 1}
  activeFactions: Faction[];
}

interface QuestTrackerData {
  activeCount: number;
  completedCount: number;
  activeQuests: Quest[];
}

interface SessionTimelineData {
  lastRecap: SessionRecap | null;
  nextPrep: SessionPrep | null;
  inGameDate: string | null;
}

interface PlayerCharactersData {
  activePCCount: number;
  levelRange: { min: number; max: number } | null;
  playerCharacters: PlayerCharacter[];
}

interface RecentActivityData {
  recentEntities: Array<{
    id: string;
    name: string;
    category: CategoryType;
    updated_at: number;
  }>;
}
```

### 2. Sidebar State

```typescript
interface SidebarState {
  collapseState: Record<CategoryType, boolean>; // {SETTING: true, 'LIVING WORLD': false, ...}
  activeCategory: CategoryName | null; // 'npcs' | 'locations' | 'factions' | ...
  enabledCategories: CategoryName[]; // Based on campaign settings
  themedLabels: Record<CategoryName, string>; // {'factions': 'Corporations', ...}
}

type CategoryType = 'SETTING' | 'LIVING WORLD' | 'CAMPAIGN' | 'EXTENDED';
type CategoryName =
  | 'lore_entries'
  | 'world_rules'
  | 'npcs'
  | 'locations'
  | 'factions'
  | 'planar_forces'
  | 'session_prep'
  | 'session_recaps'
  | 'quests'
  | 'player_characters'
  | 'custom_mechanics'
  | 'items'
  | 'creatures';
```

### 3. Category Landing State

```typescript
interface CategoryLandingState {
  statistics: {
    totalCount: number;
    statusBreakdown: Record<CoreStatus, number>; // {active: 20, archived: 5, draft: 2}
    lastUpdated: number | null;
  };
  recentItems: any[]; // Array of category entities (10 most recent)
  loading: boolean;
  error: string | null;
}
```

### 4. Table View State

```typescript
interface TableViewState {
  entities: any[]; // Current page of entities
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  filters: FilterState;
  pagination: PaginationState;
  selectedRows: string[]; // IDs of selected entities for bulk actions
  loading: boolean;
  error: string | null;
}

interface FilterState {
  searchText: string;
  coreStatus: CoreStatus[];
  playerKnowledge: string[];
  tags: string[];
  customFilters: Record<string, any>; // {race: 'Elf', location_type: 'city'}
}

interface PaginationState {
  currentPage: number;
  pageSize: number; // 25 | 50 | 100
  totalPages: number;
  totalCount: number;
}

type CoreStatus = 'active' | 'archived' | 'draft' | 'hidden';
```

### 5. Entity Detail State

```typescript
interface EntityDetailState {
  entity: any | null; // Current entity (type varies by category)
  loading: boolean;
  error: string | null;
  viewMode: 'dm_view' | 'player_view'; // From InformationLevelContext
}
```

### 6. Entity Form State

```typescript
interface EntityFormState {
  mode: 'create' | 'edit';
  entity: Partial<any>; // Partial entity being edited/created
  validationErrors: Record<string, string>; // {name: 'Required', description: 'Too long'}
  isDirty: boolean; // Unsaved changes
  submitting: boolean;
  submitError: string | null;
}
```

### 7. Information Level Context State

```typescript
interface InformationLevelContextState {
  viewMode: 'dm_view' | 'player_view';
  informationLevels: InformationLevel[]; // Available levels for campaign
  setViewMode: (mode: 'dm_view' | 'player_view') => void;
}

interface InformationLevel {
  id: string;
  name: string;
  campaign_id: string;
  created_at: number;
}
```

### 8. Thematic Naming Context State

```typescript
interface ThematicNamingContextState {
  theme: 'high_fantasy' | 'cyberpunk' | 'sci_fi' | 'modern' | 'custom';
  categoryLabels: Record<CategoryName, string>; // {'npcs': 'Characters', 'factions': 'Corporations'}
  getCategoryLabel: (category: CategoryName) => string;
}
```

---

## Component Architecture

### Dashboard Components (7 widgets + 1 page container)

```typescript
// DashboardPage.tsx - Main container
interface DashboardPageProps {
  campaignId: string;
}

// NPCSummaryWidget.tsx
interface NPCSummaryWidgetProps {
  campaignId: string;
}

// LocationExplorerWidget.tsx
interface LocationExplorerWidgetProps {
  campaignId: string;
}

// FactionPowerWidget.tsx
interface FactionPowerWidgetProps {
  campaignId: string;
}

// QuestTrackerWidget.tsx
interface QuestTrackerWidgetProps {
  campaignId: string;
}

// SessionTimelineWidget.tsx
interface SessionTimelineWidgetProps {
  campaignId: string;
}

// PlayerCharactersWidget.tsx
interface PlayerCharactersWidgetProps {
  campaignId: string;
}

// RecentActivityWidget.tsx
interface RecentActivityWidgetProps {
  campaignId: string;
}
```

### Sidebar Navigation Components (4 components)

```typescript
// SidebarNavigation.tsx - Main sidebar container
interface SidebarNavigationProps {
  campaignId: string;
}

// TypeSection.tsx - Collapsible section (SETTING, LIVING WORLD, etc.)
interface TypeSectionProps {
  type: CategoryType;
  categories: CategoryName[];
  collapsed: boolean;
  onToggle: () => void;
  activeCategory: CategoryName | null;
}

// CategoryLink.tsx - Single category link
interface CategoryLinkProps {
  category: CategoryName;
  label: string;
  active: boolean;
  onClick: () => void;
}

// ViewModeToggle.tsx - DM View / Player View toggle (in sidebar)
interface ViewModeToggleProps {
  viewMode: 'dm_view' | 'player_view';
  onChange: (mode: 'dm_view' | 'player_view') => void;
}
```

### Category Landing Components (4 components)

```typescript
// CategoryLandingPage.tsx - Main landing page
interface CategoryLandingPageProps {
  campaignId: string;
  category: CategoryName;
}

// StatisticsPanel.tsx - Count and status breakdown
interface StatisticsPanelProps {
  totalCount: number;
  statusBreakdown: Record<CoreStatus, number>;
  lastUpdated: number | null;
}

// RecentItemsList.tsx - 10 most recent entities
interface RecentItemsListProps {
  items: any[];
  category: CategoryName;
  onItemClick: (id: string) => void;
}

// SearchFilterBar.tsx - Search and filter controls
interface SearchFilterBarProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}
```

### Table Components (6 components)

```typescript
// CategoryTable.tsx - Generic reusable table for all 13 categories
interface CategoryTableProps {
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

interface ColumnDefinition {
  key: string;
  label: string;
  sortable: boolean;
  render?: (value: any, entity: any) => React.ReactNode;
}

// TableRow.tsx - Single row (handles click, selection)
interface TableRowProps {
  entity: any;
  columns: ColumnDefinition[];
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
}

// PaginationControls.tsx - Page navigation
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

// BulkActionsBar.tsx - Bulk delete, archive, status change
interface BulkActionsBarProps {
  selectedCount: number;
  onDelete: () => void;
  onArchive: () => void;
  onChangeStatus: (status: CoreStatus) => void;
}

// TableColumnHeader.tsx - Sortable column header
interface TableColumnHeaderProps {
  column: ColumnDefinition;
  sorted: boolean;
  sortDirection: 'asc' | 'desc' | null;
  onSort: () => void;
}

// ViewModeButtons.tsx - Table/Gallery/Board view toggle (Gallery/Board disabled)
interface ViewModeButtonsProps {
  currentView: 'table' | 'gallery' | 'board';
  onViewChange: (view: 'table' | 'gallery' | 'board') => void;
}
```

### Form Components (10 components - generic and field-specific)

```typescript
// EntityCreateForm.tsx - Generic create form
interface EntityCreateFormProps {
  campaignId: string;
  category: CategoryName;
  schema: FieldSchema[]; // Universal + category-specific + custom fields
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

// EntityEditForm.tsx - Generic edit form
interface EntityEditFormProps {
  campaignId: string;
  category: CategoryName;
  entityId: string;
  initialData: any;
  schema: FieldSchema[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

interface FieldSchema {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multi_select' | 'number' | 'date' | 'relation' | 'multi_relation' | 'tags';
  required: boolean;
  options?: string[] | { value: string; label: string }[]; // For select fields
  validation?: (value: any) => string | null;
}

// Field components (8 specialized inputs)
// TextInput.tsx
interface TextInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

// TextAreaInput.tsx
interface TextAreaInputProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

// SelectInput.tsx
interface SelectInputProps {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

// MultiSelectInput.tsx
interface MultiSelectInputProps {
  name: string;
  label: string;
  values: string[];
  options: { value: string; label: string }[];
  onChange: (values: string[]) => void;
  error?: string;
}

// NumberInput.tsx
interface NumberInputProps {
  name: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  min?: number;
  max?: number;
}

// DateInput.tsx
interface DateInputProps {
  name: string;
  label: string;
  value: string | null; // ISO date string
  onChange: (value: string | null) => void;
  error?: string;
}

// RelationInput.tsx - Dropdown for foreign key (e.g., select faction)
interface RelationInputProps {
  name: string;
  label: string;
  value: string | null;
  category: CategoryName; // Which category to search
  campaignId: string;
  onChange: (value: string | null) => void;
  error?: string;
  required?: boolean;
}

// MultiRelationInput.tsx - Multi-select for JSON array relations
interface MultiRelationInputProps {
  name: string;
  label: string;
  values: string[];
  category: CategoryName;
  campaignId: string;
  onChange: (values: string[]) => void;
  error?: string;
}

// TagInput.tsx - Tag autocomplete and creation
interface TagInputProps {
  name: string;
  label: string;
  values: string[];
  campaignId: string;
  onChange: (values: string[]) => void;
  error?: string;
}
```

### Detail Components (3 components)

```typescript
// EntityDetailPage.tsx - Full entity detail view
interface EntityDetailPageProps {
  campaignId: string;
  category: CategoryName;
  entityId: string;
}

// RelationshipLinks.tsx - Display clickable links to related entities
interface RelationshipLinksProps {
  relationships: {
    label: string;
    category: CategoryName;
    entityIds: string[];
    entities?: any[]; // Fetched entity data
  }[];
}

// FieldDisplay.tsx - Display single field with appropriate formatting
interface FieldDisplayProps {
  label: string;
  value: any;
  type: 'text' | 'number' | 'date' | 'tags' | 'relation' | 'multi_relation' | 'json';
  category?: CategoryName; // For relation fields
}
```

### Common Components (5 components)

```typescript
// LoadingSpinner.tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

// SkeletonLoader.tsx - Loading skeleton for widgets
interface SkeletonLoaderProps {
  type: 'widget' | 'table' | 'form' | 'detail';
}

// EmptyState.tsx - No content message
interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

// ErrorBoundary.tsx - Catch React errors
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// ConfirmDialog.tsx - Confirmation modal
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

---

## Data Flow Patterns

### API Integration Pattern

```
User Action → Component Event Handler
              ↓
React Query/SWR Hook (with campaignId + filters)
              ↓
Axios Client → GET/POST/PUT/DELETE /api/{category}
              ↓
Feature 014 REST API (with X-View-Mode header)
              ↓
Information Level Filtering at API layer
              ↓
Response → React Query Cache Update
              ↓
Component Re-render with New Data
```

**Example: Fetch NPCs**
```typescript
// Hook
const { data, isLoading, error } = useNPCs(campaignId, filters);

// Internal implementation
function useNPCs(campaignId: string, filters: FilterState) {
  return useQuery({
    queryKey: ['npcs', campaignId, filters],
    queryFn: () => apiClient.get(`/npcs`, {
      params: { campaign_id: campaignId, ...filters },
      headers: { 'X-View-Mode': viewMode }
    })
  });
}
```

### Form Data Flow

```
User Input → React Hook Form onChange
              ↓
Field Validation (Zod schema)
              ↓
Form State Update (isDirty = true)
              ↓
Submit Button Click
              ↓
Final Validation (all fields)
              ↓
API Call (POST /npcs or PUT /npcs/:id)
              ↓
Optimistic Update (React Query)
              ↓
Success: Redirect to Detail Page
Error: Display Inline Errors
```

**Example: Create NPC**
```typescript
const { mutate, isLoading } = useCreateNPC();

const onSubmit = (data: NPCFormData) => {
  mutate(data, {
    onSuccess: (newNPC) => {
      navigate(`/campaigns/${campaignId}/npcs/${newNPC.id}`);
    },
    onError: (error) => {
      setFormError(error.message);
    }
  });
};
```

### Search and Filter Flow

```
User Types in Search Box (debounced 300ms)
              ↓
FilterState Update → setFilters({...filters, searchText})
              ↓
React Query Re-fetch (queryKey changed)
              ↓
API Call with ?search=text&status=active&tags=plot_critical
              ↓
Backend Filters Results
              ↓
Table Re-renders with Filtered Entities
```

**Persistence:**
- Search/filter state persisted in URL query params
- User can bookmark filtered view
- Filter state survives page refresh

---

## Validation Schemas (Zod)

### Universal Field Schema (shared across all 13 categories)

```typescript
import { z } from 'zod';

const UniversalFieldsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().nullable().optional(),
  core_status: z.enum(['active', 'archived', 'draft', 'hidden']).default('active'),
  player_knowledge: z.string().nullable().optional(), // Validated against campaign's info levels
  tags: z.array(z.string()).default([]),
  custom_fields: z.record(z.any()).default({}),
});
```

### Category-Specific Schemas (one per category)

**NPCs Schema:**
```typescript
const NPCSchema = UniversalFieldsSchema.extend({
  race: z.string().nullable().optional(),
  class: z.array(z.string()).nullable().optional(),
  level: z.number().int().min(1).nullable().optional(),
  alignment: z.string().nullable().optional(),
  appearance: z.string().nullable().optional(),
  personality_traits: z.string().nullable().optional(),
  motivation: z.string().nullable().optional(),
  relationship_to_party: z.string().nullable().optional(),
  met_party: z.union([z.literal(0), z.literal(1)]).default(0),
  art: z.string().nullable().optional(),
  faction_id: z.string().nullable().optional(),
  superior_npc_id: z.string().nullable().optional(),
  locations: z.array(z.string()).default([]),
  dm_secrets: z.string().nullable().optional(),
  dm_plot_relevance: z.string().nullable().optional(),
});
```

**Locations Schema:**
```typescript
const LocationSchema = UniversalFieldsSchema.extend({
  location_type: z.string().nullable().optional(),
  population: z.number().int().min(0).nullable().optional(),
  cultural_characteristics: z.string().nullable().optional(),
  map: z.string().nullable().optional(),
  parent_location_id: z.string().nullable().optional(),
  notable_npcs: z.array(z.string()).default([]),
  factions_present: z.array(z.string()).default([]),
  connected_locations: z.array(z.string()).default([]),
  dm_secrets: z.string().nullable().optional(),
});
```

**Factions Schema:**
```typescript
const FactionSchema = UniversalFieldsSchema.extend({
  faction_type: z.string().nullable().optional(),
  power_level: z.string().nullable().optional(),
  resources: z.string().nullable().optional(),
  beliefs: z.string().nullable().optional(),
  goals: z.string().nullable().optional(),
  methods: z.string().nullable().optional(),
  leader_id: z.string().nullable().optional(),
  key_members: z.array(z.string()).default([]),
  allied_factions: z.array(z.string()).default([]),
  rival_factions: z.array(z.string()).default([]),
  territory: z.array(z.string()).default([]),
  dm_true_agenda: z.string().nullable().optional(),
});
```

**Session Recaps Schema:**
```typescript
const SessionRecapSchema = UniversalFieldsSchema.extend({
  session_date: z.number().int().nullable().optional(),
  in_game_date_start: z.string().nullable().optional(),
  in_game_date_end: z.string().nullable().optional(),
  time_passed: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  key_events: z.array(z.string()).nullable().optional(),
  player_decisions: z.array(z.string()).nullable().optional(),
  is_canon: z.literal(1).default(1), // Always 1
  canonical_status: z.literal('canon').default('canon'), // Always 'canon'
  npcs_encountered: z.array(z.string()).default([]),
  locations_visited: z.array(z.string()).default([]),
  quests_progressed: z.array(z.string()).default([]),
  loot_acquired: z.array(z.string()).default([]),
  dm_consequences: z.string().nullable().optional(),
  dm_behind_scenes: z.string().nullable().optional(),
});
```

**Quests Schema:**
```typescript
const QuestSchema = UniversalFieldsSchema.extend({
  status: z.enum(['not_started', 'in_progress', 'completed', 'failed']).default('not_started'),
  objectives: z.array(z.string()).default([]),
  rewards: z.string().nullable().optional(),
  quest_giver_id: z.string().nullable().optional(),
  started_session_id: z.string().nullable().optional(),
  completed_session_id: z.string().nullable().optional(),
  related_npcs: z.array(z.string()).default([]),
  related_locations: z.array(z.string()).default([]),
  dm_true_objective: z.string().nullable().optional(),
  dm_consequences: z.string().nullable().optional(),
});
```

**Player Characters Schema:**
```typescript
const PlayerCharacterSchema = UniversalFieldsSchema.extend({
  player_name: z.string().nullable().optional(),
  class: z.array(z.string()).nullable().optional(),
  level: z.number().int().min(1).nullable().optional(),
  race: z.string().nullable().optional(),
  background: z.string().nullable().optional(),
  personality: z.string().nullable().optional(),
  goals: z.string().nullable().optional(),
  backstory: z.string().nullable().optional(),
  art: z.string().nullable().optional(),
  faction_affiliations: z.array(z.string()).default([]),
  allied_npcs: z.array(z.string()).default([]),
  dm_secrets: z.string().nullable().optional(),
  dm_plot_threads: z.string().nullable().optional(),
  dm_true_motivation: z.string().nullable().optional(),
  dm_consequences: z.string().nullable().optional(),
});
```

**Lore Entries Schema:**
```typescript
const LoreEntrySchema = UniversalFieldsSchema.extend({
  category: z.string().nullable().optional(),
  era_period: z.string().nullable().optional(),
  in_game_date: z.string().nullable().optional(),
  historical_accuracy: z.string().nullable().optional(),
  related_npcs: z.array(z.string()).default([]),
  related_locations: z.array(z.string()).default([]),
  related_factions: z.array(z.string()).default([]),
});
```

**World Rules Schema:**
```typescript
const WorldRuleSchema = UniversalFieldsSchema.extend({
  rule_type: z.string().nullable().optional(),
  exceptions: z.string().nullable().optional(),
  related_rules: z.array(z.string()).default([]),
});
```

**Planar Forces Schema:**
```typescript
const PlanarForceSchema = UniversalFieldsSchema.extend({
  entity_type: z.string().nullable().optional(),
  domains: z.array(z.string()).nullable().optional(),
  alignment: z.string().nullable().optional(),
  worshiper_base: z.string().nullable().optional(),
  plane_of_origin: z.string().nullable().optional(),
  base_of_power: z.string().nullable().optional(),
  high_priest_id: z.string().nullable().optional(),
  allied_entities: z.array(z.string()).default([]),
  rival_entities: z.array(z.string()).default([]),
  religious_orders: z.array(z.string()).default([]),
  dm_true_nature: z.string().nullable().optional(),
});
```

**Session Prep Schema:**
```typescript
const SessionPrepSchema = UniversalFieldsSchema.extend({
  planned_date: z.number().int().nullable().optional(),
  status: z.enum(['draft', 'ready', 'completed', 'cancelled']).default('draft'),
  planned_events: z.string().nullable().optional(),
  possible_encounters: z.string().nullable().optional(),
  plot_hooks: z.string().nullable().optional(),
  dm_notes: z.string().nullable().optional(),
  is_canon: z.literal(0).default(0), // Always 0
  canonical_status: z.literal('hypothetical').default('hypothetical'), // Always 'hypothetical'
  plot_threads: z.array(z.string()).default([]),
  npcs_to_prep: z.array(z.string()).default([]),
  locations_to_prep: z.array(z.string()).default([]),
});
```

**Custom Mechanics Schema:**
```typescript
const CustomMechanicSchema = UniversalFieldsSchema.extend({
  mechanic_type: z.string().nullable().optional(),
  rules_text: z.string().nullable().optional(),
  prerequisites: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  related_rules: z.array(z.string()).default([]),
});
```

**Items Schema:**
```typescript
const ItemSchema = UniversalFieldsSchema.extend({
  item_type: z.string().nullable().optional(),
  rarity: z.string().nullable().optional(),
  properties: z.string().nullable().optional(),
  value: z.string().nullable().optional(),
  owner_npc_id: z.string().nullable().optional(),
  owner_pc_id: z.string().nullable().optional(),
  location_id: z.string().nullable().optional(),
  dm_secret_properties: z.string().nullable().optional(),
  dm_true_nature: z.string().nullable().optional(),
});
```

**Creatures Schema:**
```typescript
const CreatureSchema = UniversalFieldsSchema.extend({
  creature_type: z.string().nullable().optional(),
  challenge_rating: z.string().nullable().optional(),
  abilities: z.string().nullable().optional(),
  habitats: z.array(z.string()).default([]),
  dm_behavior_notes: z.string().nullable().optional(),
});
```

---

## State Management Strategy

### React Context Usage

**InformationLevelContext:**
- Purpose: Global view mode state (DM View vs Player View)
- Persistence: localStorage with key `viewMode_{campaignId}`
- Cross-tab sync: storage event listener
- Used by: All data-fetching hooks (adds X-View-Mode header)

**ThematicNamingContext:**
- Purpose: Campaign theme and category label mappings
- Loaded once on campaign page mount
- Cached in React Query
- Used by: Sidebar, page headers, breadcrumbs, form labels

**SidebarCollapseContext:**
- Purpose: Track which type sections are expanded/collapsed
- Persistence: localStorage with key `sidebarCollapse_{campaignId}`
- Used by: SidebarNavigation component

### LocalStorage Persistence

**Persisted State:**
```typescript
interface PersistedState {
  viewMode: 'dm_view' | 'player_view'; // Key: viewMode_{campaignId}
  sidebarCollapse: Record<CategoryType, boolean>; // Key: sidebarCollapse_{campaignId}

  // Per-category filter persistence
  filters: {
    [category: string]: FilterState; // Key: filters_{campaignId}_{category}
  };

  // Pagination preferences
  pageSize: number; // Key: tablePageSize (global)
}
```

**localStorage Keys:**
- `viewMode_{campaignId}`: Current view mode
- `sidebarCollapse_{campaignId}`: Sidebar section collapse state
- `filters_{campaignId}_{category}`: Active filters for category
- `tablePageSize`: User's preferred page size (25/50/100)

**Cross-tab Sync:**
```typescript
// Listen for storage events from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === `viewMode_${campaignId}`) {
    setViewMode(e.newValue as 'dm_view' | 'player_view');
  }
});
```

---

## Dashboard Canvas System (EXPANDED SCOPE)

### 9. Dashboard Canvas State (NEW)

```typescript
interface DashboardCanvasState {
  layout: LayoutConfig;
  widgets: WidgetInstance[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  pickerOpen: boolean;
}

interface LayoutConfig {
  layouts: {
    lg: GridLayoutItem[]; // Desktop breakpoint
    md?: GridLayoutItem[]; // Tablet (deferred to future)
    sm?: GridLayoutItem[]; // Mobile (deferred to future)
  };
  breakpoint: 'lg' | 'md' | 'sm';
}

interface GridLayoutItem {
  i: string; // Unique instance ID: 'npc-summary-1', 'quest-tracker-2'
  x: number; // Grid column position (0-11 for 12-column grid)
  y: number; // Grid row position
  w: number; // Width in grid columns
  h: number; // Height in grid rows
  minW?: number; // Minimum width
  minH?: number; // Minimum height
  maxW?: number; // Maximum width
  maxH?: number; // Maximum height
  widgetId: string; // Widget type: 'npc-summary', 'quest-tracker'
  static?: boolean; // Cannot be dragged/resized if true
}

interface WidgetInstance {
  instanceId: string; // Unique instance: 'npc-summary-1'
  widgetId: string; // Widget type: 'npc-summary'
  definition: WidgetDefinition; // Metadata from registry
  gridData: GridLayoutItem; // Layout positioning
}
```

### 10. Widget Definition Models (NEW)

```typescript
// Widget Registry - Central registry of available widgets
interface WidgetDefinition {
  id: string; // Unique widget type ID: 'npc-summary', 'quest-tracker'
  type: WidgetCategoryType; // Category grouping for picker
  name: string; // Display name: "NPC Summary"
  description: string; // User-facing description
  icon?: string; // Icon name/path for picker
  supportedSizes: WidgetSize[]; // ['2x2', '3x3']
  defaultSize: WidgetSize; // '2x2'
  minSize: { w: number; h: number }; // Minimum grid cells
  maxSize?: { w: number; h: number }; // Maximum grid cells
  component: React.ComponentType<BaseWidgetProps>; // React component
}

type WidgetCategoryType =
  | 'category-summary' // NPCs, Locations, Factions summaries
  | 'activity' // Recent Activity, Recent Updates
  | 'timeline' // Session Timeline, Quest Timeline
  | 'analytics' // Charts, graphs (future)
  | 'custom'; // User-defined widgets (future)

type WidgetSize = '1x1' | '2x2' | '3x3' | '2x4' | '4x2' | '3x2' | '4x3' | '4x4';

// Base widget props - all widgets receive these
interface BaseWidgetProps {
  size: WidgetSize; // Current grid size
  viewMode: 'dm_view' | 'player_view'; // From InformationLevelContext
  campaignId: string;
  onRemove?: () => void; // Remove this widget instance
  onConfigure?: () => void; // Open widget configuration modal (future)
}
```

### 11. Database Entity: DashboardConfig (NEW)

```typescript
// Stored in SQLite - backend/src/db/migrations/015-dashboard-configs.sql
interface DashboardConfig {
  id: string; // UUID primary key
  campaign_id: string; // FK to campaigns.id (CASCADE delete)
  user_id: string; // FK to users.user_id (CASCADE delete)
  layout: string; // JSON string of LayoutConfig
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

// SQL Schema
/*
CREATE TABLE dashboard_configs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  layout TEXT NOT NULL, -- JSON string
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE(campaign_id, user_id)
);

CREATE INDEX idx_dashboard_configs_campaign_user ON dashboard_configs(campaign_id, user_id);
*/

// Parsed layout JSON structure
interface DashboardConfigLayout {
  layouts: {
    lg: Array<{
      i: string; // Instance ID
      x: number;
      y: number;
      w: number;
      h: number;
      minW?: number;
      minH?: number;
      widgetId: string; // Widget type
    }>;
  };
  breakpoint: 'lg';
}

// Default layout for new users
const DEFAULT_DASHBOARD_LAYOUT: DashboardConfigLayout = {
  layouts: {
    lg: [
      { i: 'npc-summary-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, widgetId: 'npc-summary' },
      { i: 'quest-tracker-1', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, widgetId: 'quest-tracker' },
      { i: 'recent-activity-1', x: 6, y: 0, w: 6, h: 2, minW: 2, minH: 2, widgetId: 'recent-activity' },
    ]
  },
  breakpoint: 'lg'
};
```

### 12. Backend API Models (NEW)

```typescript
// GET /api/campaigns/:campaignId/dashboard-config
interface GetDashboardConfigResponse {
  config: DashboardConfig | null; // Null if first-time user
  defaultLayout: DashboardConfigLayout; // Provided for first-time setup
}

// PUT /api/campaigns/:campaignId/dashboard-config
interface UpdateDashboardConfigRequest {
  layout: DashboardConfigLayout;
}

interface UpdateDashboardConfigResponse {
  config: DashboardConfig;
  success: boolean;
}

// POST /api/campaigns/:campaignId/dashboard-config/reset
interface ResetDashboardConfigResponse {
  config: DashboardConfig; // Reset to default layout
  success: boolean;
}
```

### 13. Canvas Component Interfaces (NEW)

```typescript
// DashboardCanvas.tsx - Main grid container
interface DashboardCanvasProps {
  campaignId: string;
  layout: LayoutConfig;
  widgets: WidgetInstance[];
  viewMode: 'dm_view' | 'player_view';
  onLayoutChange: (newLayout: GridLayoutItem[]) => void;
  onWidgetRemove: (instanceId: string) => void;
  onAddWidget: () => void; // Opens WidgetPicker
}

// WidgetPicker.tsx - Modal for adding widgets
interface WidgetPickerProps {
  open: boolean;
  onClose: () => void;
  onAddWidget: (widgetId: string, size: WidgetSize) => void;
  existingWidgets: WidgetInstance[]; // To show "already added" state
}

// BaseWidget.tsx - Wrapper for all widgets
interface BaseWidgetWrapperProps {
  instanceId: string;
  definition: WidgetDefinition;
  size: WidgetSize;
  viewMode: 'dm_view' | 'player_view';
  campaignId: string;
  onRemove: () => void;
}

// WidgetRegistry.ts - Static registry
class WidgetRegistry {
  private static widgets: Map<string, WidgetDefinition> = new Map();

  static register(widget: WidgetDefinition): void;
  static get(id: string): WidgetDefinition | undefined;
  static getAll(): WidgetDefinition[];
  static getByCategory(category: WidgetCategoryType): WidgetDefinition[];
}
```

### 14. Example Widget Interfaces (v1 - 3 widgets)

```typescript
// NPCSummaryWidget.tsx
interface NPCSummaryWidgetProps extends BaseWidgetProps {
  // Inherits: size, viewMode, campaignId, onRemove, onConfigure
}

interface NPCSummaryData {
  totalCount: number;
  recentNPCs: Array<{ id: string; name: string; race: string | null }>;
  relationshipBreakdown?: Record<string, number>; // Only in 3x3 size
}

// RecentActivityWidget.tsx
interface RecentActivityWidgetProps extends BaseWidgetProps {}

interface RecentActivityData {
  recentEntities: Array<{
    id: string;
    name: string;
    category: CategoryName;
    categoryLabel: string; // Themed label
    updated_at: number;
    relativeTime: string; // "2 hours ago"
  }>;
}

// QuestTrackerWidget.tsx
interface QuestTrackerWidgetProps extends BaseWidgetProps {}

interface QuestTrackerData {
  activeCount: number;
  completedCount: number;
  activeQuests: Array<{ id: string; name: string; status: string }>;
  completionPercentage: number; // (completed / total) * 100
}
```

### Canvas Data Flow

```
User Drags Widget
        ↓
react-grid-layout onLayoutChange fires
        ↓
DashboardCanvas handleLayoutChange (debounced 500ms)
        ↓
State Update (immediate for smooth UX)
        ↓
After 500ms: PUT /api/campaigns/:id/dashboard-config
        ↓
Backend: DashboardConfigService.update()
        ↓
SQLite: UPDATE dashboard_configs SET layout = ? WHERE campaign_id = ? AND user_id = ?
        ↓
Response: { success: true, config: {...} }
        ↓
(No UI update needed - state already updated optimistically)
```

### Widget Add Flow

```
User Clicks "+ Add Widget"
        ↓
WidgetPicker Modal Opens
        ↓
User Searches/Filters Widget Library
        ↓
User Clicks Widget Size Button (e.g., "2x2")
        ↓
Generate Unique Instance ID: `${widgetId}-${timestamp}`
        ↓
Find Empty Grid Position (bottom of canvas)
        ↓
Create GridLayoutItem with position + widgetId
        ↓
Add to Layout State
        ↓
react-grid-layout Renders New Widget
        ↓
500ms Debounce → Save to Database
```

### Widget Remove Flow

```
User Clicks Widget Remove Button (X)
        ↓
BaseWidget onRemove Handler Fires
        ↓
DashboardCanvas handleWidgetRemove(instanceId)
        ↓
Remove from Layout State (filter out instanceId)
        ↓
react-grid-layout Re-renders (compacts grid)
        ↓
500ms Debounce → Save to Database
```

---

## Category Landing Canvas (ADDITIONAL REQUIREMENT)

### 15. Category Landing Configuration Entity (NEW)

```typescript
// Stored in SQLite - backend/src/db/migrations/015-category-landing-configs.sql
interface CategoryLandingConfig {
  id: string; // UUID primary key
  campaign_id: string; // FK to campaigns.id (CASCADE delete)
  user_id: string; // FK to users.user_id (CASCADE delete)
  category: CategoryName; // 'npcs' | 'locations' | 'factions' | ...
  layout: string; // JSON string of LayoutConfig (same format as dashboard)
  title: string | null; // User-editable category title override
  description: string | null; // TipTap JSON for rich text description
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

// SQL Schema
/*
CREATE TABLE category_landing_configs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  layout TEXT NOT NULL,
  title TEXT,
  description TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE(campaign_id, user_id, category)
);

CREATE INDEX idx_category_landing_configs_campaign_user_category
  ON category_landing_configs(campaign_id, user_id, category);
*/

// Default layout per category (initially empty - user adds widgets)
const DEFAULT_CATEGORY_LANDING_LAYOUT: DashboardConfigLayout = {
  layouts: {
    lg: [] // Empty - users add widgets as needed
  },
  breakpoint: 'lg'
};
```

### 16. Category Landing Page State (EXTENDED)

```typescript
// Extends existing CategoryLandingState with canvas
interface CategoryLandingPageState {
  // Canvas state
  canvasLayout: LayoutConfig;
  canvasWidgets: WidgetInstance[];
  canvasLoading: boolean;
  canvasSaving: boolean;

  // Text editor state
  title: string; // Editable title (defaults to themed category name)
  description: string; // TipTap JSON string
  textEditing: boolean;
  textSaving: boolean;

  // Existing state (from original plan)
  statistics: {
    totalCount: number;
    statusBreakdown: Record<CoreStatus, number>;
    lastUpdated: number | null;
  };
  loading: boolean;
  error: string | null;
}
```

### 17. Category Landing Components (NEW)

```typescript
// CategoryLandingCanvas.tsx - Constrained canvas (max-height: 50vh)
interface CategoryLandingCanvasProps {
  campaignId: string;
  category: CategoryName;
  layout: LayoutConfig;
  widgets: WidgetInstance[];
  viewMode: 'dm_view' | 'player_view';
  onLayoutChange: (newLayout: GridLayoutItem[]) => void;
  onWidgetRemove: (instanceId: string) => void;
  onAddWidget: () => void;
  maxHeight: string; // '50vh' by default
}

// CategoryLandingTextEditor.tsx - Title + description editor
interface CategoryLandingTextEditorProps {
  campaignId: string;
  category: CategoryName;
  title: string;
  description: string; // TipTap JSON
  placeholder: string; // Themed category label
  onSave: (title: string, description: string) => Promise<void>;
  readOnly?: boolean; // Player view = read-only
}

// Updated CategoryLandingPage.tsx - Combines canvas + text editor
interface CategoryLandingPageProps {
  campaignId: string;
  category: CategoryName;
}

// Component structure:
// <CategoryLandingPage>
//   <div className="landing-canvas-area" style={{ height: '50vh' }}>
//     <CategoryLandingCanvas {...canvasProps} />
//   </div>
//   <div className="landing-text-area" style={{ minHeight: '50vh' }}>
//     <CategoryLandingTextEditor {...textProps} />
//   </div>
//   <CategoryStatsSection {...statsProps} /> // Below text area
//   <CategoryTable {...tableProps} /> // Existing table view
// </CategoryLandingPage>
```

### 18. Category Landing API Models (NEW)

```typescript
// GET /api/campaigns/:campaignId/:category/landing-config
interface GetCategoryLandingConfigResponse {
  config: CategoryLandingConfig | null; // Null if first-time
  defaultLayout: DashboardConfigLayout; // Empty layout initially
  themedLabel: string; // Category label for title placeholder
}

// PUT /api/campaigns/:campaignId/:category/landing-config
interface UpdateCategoryLandingConfigRequest {
  layout?: DashboardConfigLayout; // Optional - only if layout changed
  title?: string; // Optional - only if title changed
  description?: string; // Optional - only if description changed
}

interface UpdateCategoryLandingConfigResponse {
  config: CategoryLandingConfig;
  success: boolean;
}

// POST /api/campaigns/:campaignId/:category/landing-config/reset
interface ResetCategoryLandingConfigResponse {
  config: CategoryLandingConfig; // Reset to empty layout + null title/description
  success: boolean;
}
```

### 19. Widget Definition Extension (NEW)

```typescript
// Extended WidgetDefinition to support category filtering
interface WidgetDefinition {
  id: string;
  type: WidgetCategoryType;
  name: string;
  description: string;
  icon?: string;
  supportedSizes: WidgetSize[];
  defaultSize: WidgetSize;
  minSize: { w: number; h: number };
  maxSize?: { w: number; h: number };
  component: React.ComponentType<BaseWidgetProps>;

  // NEW: Optional category filtering
  categories?: CategoryName[]; // If specified, only show on these category landing pages
  // If omitted, widget available everywhere (dashboard + all landing pages)
}

// Example: Generic widget (shows everywhere)
WidgetRegistry.register({
  id: 'recent-activity',
  name: 'Recent Activity',
  type: 'activity',
  supportedSizes: ['2x2', '2x4'],
  component: RecentActivityWidget,
  // No 'categories' field = available everywhere
});

// Example: Category-specific widget (future)
WidgetRegistry.register({
  id: 'npc-relationship-chart',
  name: 'NPC Relationship Chart',
  type: 'category-summary',
  supportedSizes: ['3x3', '4x4'],
  component: NPCRelationshipChartWidget,
  categories: ['npcs'], // Only on NPCs landing page
});
```

### Category Landing Data Flow

```
User Opens NPCs Landing Page
        ↓
GET /api/campaigns/:id/npcs/landing-config
        ↓
Backend: CategoryLandingConfigService.getByCategory('npcs')
        ↓
Response: { config: {...layout, title, description}, defaultLayout, themedLabel }
        ↓
Frontend: Render CategoryLandingCanvas (top 50%) + CategoryLandingTextEditor (bottom 50%)
        ↓
User Drags Widget in Canvas
        ↓
Debounced 500ms → PUT /api/campaigns/:id/npcs/landing-config { layout }
        ↓
User Edits Title/Description
        ↓
Debounced 1s → PUT /api/campaigns/:id/npcs/landing-config { title, description }
        ↓
Both saves independent (can happen concurrently)
```

---

**Status**: ✅ Data model complete - 55+ component interfaces, 19 state/entity models, validation schemas for all 13 categories, dashboard canvas + category landing canvas fully modeled, 2 backend database schemas defined
