# Research: Dashboard & Navigation UI

**Feature**: 015-create-the-dashboard
**Date**: 2025-01-10

## Overview

This document captures technical decisions and research findings for implementing a React-based dashboard and navigation UI for the campaign management system. Includes 7 dashboard widgets, sidebar navigation for 13 categories, category landing pages, entity tables with CRUD operations, and comprehensive information level filtering.

## Technical Decisions

### 1. UI Framework: React 18 with TypeScript

**Decision**: Use React 18 + TypeScript 5.0+

**Rationale**:
- Already established in project (Features 002-011) - consistency
- React 18 hooks API simplifies state management and side effects
- TypeScript provides type safety for component props and API responses
- Functional components with hooks align with modern React patterns
- Strong ecosystem for testing (Vitest + React Testing Library)

**Alternatives Considered**:
- Vue 3: Rejected - inconsistent with existing codebase, team would need to learn new framework
- Svelte: Rejected - smaller ecosystem, less mature TypeScript support, no existing codebase usage
- Vanilla JavaScript: Rejected - no type safety, harder to maintain component state and props

**Implementation Notes**:
- Use functional components exclusively (no class components)
- Leverage React 18 concurrent features for performance (automatic batching)
- TypeScript strict mode enabled for maximum type safety
- Component file naming: PascalCase.tsx (e.g., `DashboardWidget.tsx`)

### 2. Table Component: TanStack Table v8

**Decision**: Use TanStack Table v8 (formerly React Table) for all entity table views

**Rationale**:
- Headless architecture provides full styling control (no CSS framework lock-in)
- Built-in sorting, filtering, pagination with performant algorithms
- Virtualization support via `useVirtualizer` for 500+ row tables
- TypeScript-first design with excellent type inference
- Column resizing, pinning, and visibility toggles out of the box
- Widely adopted with active maintenance and community

**Alternatives Considered**:
- Material-UI Table: Rejected - too opinionated, heavy bundle size, harder to customize styling
- react-table v7: Rejected - v8 has better TypeScript support and performance optimizations
- Custom table component: Rejected - reinventing the wheel, would take weeks to match TanStack feature parity
- ag-Grid: Rejected - enterprise-focused with unnecessary complexity for prototype

**Implementation Notes**:
- Use column definitions with typed accessor functions: `columnHelper.accessor('name', { header: 'Name' })`
- Enable virtualization for tables with 50+ rows: `useReactTable` + `useVirtualizer`
- Implement server-side pagination for category landing tables (50 entities per page)
- Store column visibility preferences in localStorage per category

### 3. Form Management: React Hook Form + Zod

**Decision**: Use React Hook Form for form state management, Zod for validation schemas

**Rationale**:
- React Hook Form uses uncontrolled inputs for better performance (minimal re-renders)
- Built-in TypeScript support with typed form values
- Zod schema validation reusable on both client and server (Feature 014 backend)
- @hookform/resolvers/zod provides seamless integration
- Excellent error handling and display patterns
- Smaller bundle size than Formik (10KB vs 30KB)

**Alternatives Considered**:
- Formik: Rejected - slower re-renders due to controlled inputs, larger bundle, less performant for large forms
- Yup: Rejected - Zod has superior TypeScript inference, better runtime performance
- Manual form handling: Rejected - error-prone, duplicates validation logic, no built-in accessibility features

**Implementation Notes**:
- Define Zod schemas per entity type in `frontend/src/schemas/` (e.g., `npcSchema.ts`)
- Use `useForm<NPC>({ resolver: zodResolver(npcSchema) })` for type-safe forms
- Custom fields handled via dynamic schema: `z.record(z.string(), z.any())` for `custom_fields`
- Display validation errors inline with error messages from Zod schema

### 4. Component Library: Radix UI

**Decision**: Use Radix UI primitives for accessible, unstyled components

**Rationale**:
- Headless/unstyled components enable full design control
- Built-in accessibility (ARIA attributes, keyboard navigation, focus management)
- Composable primitives (Dialog, Dropdown, Tabs, etc.)
- Already established in Features 004/005/007/008 - consistency
- Lightweight (tree-shakeable, only import what you need)
- TypeScript-first with excellent type definitions

**Alternatives Considered**:
- Material-UI: Rejected - heavy bundle size (100KB+), opinionated styling, harder to customize
- Ant Design: Rejected - strong visual identity conflicts with custom design, large bundle
- Headless UI: Rejected - less comprehensive than Radix (missing Tabs, Dropdown variations)
- Chakra UI: Rejected - styled components require theme override for customization

**Implementation Notes**:
- Install specific primitives: `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tabs`
- Use Radix Dialog for entity creation/edit modals (FR-047 through FR-063)
- Use Radix Dropdown for view mode toggle (DM View / Player View) (FR-101)
- Use Radix Tabs for future Gallery/Board view toggles (disabled in v1, FR-038)

### 5. Routing: React Router v6

**Decision**: Use React Router v6 for client-side routing

**Rationale**:
- Already established in Feature 002 - consistency
- Nested routes support for category drill-down (`/categories/npcs/:id`)
- Loader pattern for data fetching before route rendering
- URL search params for filters and pagination state
- TypeScript support via typed params and search params

**Alternatives Considered**:
- Next.js: Rejected - server-side rendering not needed for localhost prototype, overkill for SPA
- Reach Router: Rejected - merged into React Router v6, no longer maintained
- Custom router: Rejected - React Router handles edge cases (browser back/forward, nested routes)

**Implementation Notes**:
- Route structure:
  - `/dashboard` - Dashboard homepage with 7 widgets
  - `/categories/:category` - Category landing page (e.g., `/categories/npcs`)
  - `/categories/:category/:id` - Entity detail page (e.g., `/categories/npcs/npc-123`)
- Use `useSearchParams` for filter state: `?search=goblin&faction=faction-1&page=2`
- Use `useParams` for typed route params: `const { category, id } = useParams<{ category: string; id: string }>()`
- Implement protected routes for authenticated-only pages (reuse AuthContext from Feature 002)

### 6. State Management: React Context + Local Storage

**Decision**: Use React Context API for global state, localStorage for UI preferences

**Rationale**:
- Lightweight solution, no external state library needed for prototype
- Context sufficient for view mode, campaign selection, thematic labels
- localStorage persists sidebar collapse, column visibility, filter preferences
- Cross-tab sync via `storage` event listener
- Avoids Redux complexity for simple state requirements

**Alternatives Considered**:
- Redux Toolkit: Rejected - overkill for UI state, adds boilerplate, unnecessary complexity for prototype
- Zustand: Rejected - external dependency not needed, Context API sufficient for scope
- Recoil: Rejected - experimental, over-engineered for simple UI state

**Implementation Notes**:
- Create `DashboardContext` for:
  - Sidebar collapse state (`isSidebarCollapsed: boolean`)
  - Active campaign (`activeCampaign: Campaign | null`)
  - Thematic labels (`thematicLabels: Record<string, string>`)
- Create `ViewModeContext` for DM/Player view filtering (reuse from Feature 004)
- localStorage keys:
  - `wrldbldr.sidebar.collapsed` - boolean
  - `wrldbldr.filters.{category}` - JSON object with filter state
  - `wrldbldr.columns.{category}` - JSON array of visible column IDs
- Use `useEffect` + `storage` event to sync state across tabs

### 7. Information Level Filtering Architecture

**Decision**: Use Context + custom hook pattern for view mode filtering at data fetching layer

**Rationale**:
- Consistent with Feature 004 approach (InformationLevelContext + ViewModeContext)
- Filter at API request layer before rendering (backend applies filtering via X-View-Mode header)
- Reusable `useFilteredEntities` hook across all 13 category views
- Prevents accidental display of dm_only entities in Player View
- Single source of truth for view mode state

**Alternatives Considered**:
- Client-side filtering: Rejected - unsafe, entities could leak if filtering logic missed
- Per-component filtering: Rejected - duplicates logic, error-prone, violates DRY
- Global filter function: Rejected - less type-safe, harder to test, no React integration

**Implementation Notes**:
- Reuse `ViewModeContext` from Feature 004 (stores `viewMode: 'dm_view' | 'player_view'`)
- Create `useFilteredEntities` hook:
  ```typescript
  function useFilteredEntities<T extends { player_knowledge: string | null }>(
    category: string,
    filters: Record<string, any>
  ): { data: T[]; loading: boolean; error: Error | null }
  ```
- Hook sets `X-View-Mode` header on API requests
- Backend (Feature 014) applies filtering before response
- Strip dm_* prefixed fields client-side as defense-in-depth

### 8. Thematic Naming System

**Decision**: Store 13×4 mapping (52 labels) in campaign settings table, lookup at render time

**Rationale**:
- No code changes needed when new themes added
- Per-campaign customization (each campaign can use different theme)
- Stored in database per campaign (campaign_settings table from Feature 002)
- Frontend fetches theme mapping once on campaign load, caches in context

**Alternatives Considered**:
- Hardcoded theme files: Rejected - requires code changes for new themes, not user-customizable
- Per-category theme columns: Rejected - violates normalization, duplicates theme data
- Client-side only mapping: Rejected - theme should persist across sessions, backed by database

**Implementation Notes**:
- Create `useThematicLabels` hook:
  ```typescript
  function useThematicLabels(campaignId: string): Record<string, string> {
    // Fetches campaign.theme_id and returns mapping: { npcs: 'Characters', factions: 'Houses', ... }
  }
  ```
- Utility function: `getThemedCategoryName(category: string, theme: string): string`
- Default to category name if theme not set
- 4 themes from spec: Medieval, Sci-Fi, Urban Fantasy, Pirate
- Theme selection UI in Campaign Settings page (not part of this feature)

### 9. Performance Optimization Strategy

**Decision**: React.memo for widgets, virtualization for large tables, debounced search, pagination

**Rationale**:
- Dashboard widgets don't need frequent re-renders (memoize to prevent cascade)
- Tables with 500+ entities need virtualization to maintain 60fps scrolling
- Search input needs debounce to avoid API spam (200ms debounce)
- Pagination reduces initial render time and backend query load

**Alternatives Considered**:
- No optimization: Rejected - violates performance goals (<2s dashboard, <500ms pagination)
- useMemo everywhere: Rejected - premature optimization, harder to maintain, minimal benefit
- Infinite scroll: Rejected - pagination simpler for v1, infinite scroll deferred to future

**Implementation Notes**:
- Use `React.memo` on dashboard widget components:
  ```typescript
  export const RecentItemsWidget = React.memo(({ category }: { category: string }) => { ... });
  ```
- Use TanStack Table's `useVirtualizer` for tables with 50+ rows
- Debounce search input with lodash.debounce (200ms delay):
  ```typescript
  const debouncedSearch = useMemo(() => debounce(setSearchTerm, 200), []);
  ```
- Pagination: 50 entities per page (FR-037), fetch only current page from backend
- Lazy load detail pages (code splitting via `React.lazy` + `Suspense`)

### 10. API Client Pattern

**Decision**: Centralized Axios instance with interceptors for auth, error handling, view mode

**Rationale**:
- Already used in Features 002-008 - consistency
- Interceptor adds Authorization header automatically (Keycloak token from AuthContext)
- Interceptor adds X-View-Mode header from ViewModeContext
- Centralized baseURL configuration for API endpoint
- Error interceptor handles 401 (redirect to login), 403 (show toast), 500 (retry logic)

**Alternatives Considered**:
- Fetch API: Rejected - no interceptors, manual token injection per request, verbose error handling
- Per-service Axios instances: Rejected - duplicates configuration, harder to maintain
- GraphQL client: Rejected - backend uses REST (Feature 014), no GraphQL API exists

**Implementation Notes**:
- Create `frontend/src/services/apiClient.ts`:
  ```typescript
  const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    timeout: 10000,
  });

  // Request interceptor: Add auth token + view mode
  apiClient.interceptors.request.use((config) => {
    const token = keycloak.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const viewMode = localStorage.getItem('wrldbldr.viewMode') || 'dm_view';
    config.headers['X-View-Mode'] = viewMode;

    return config;
  });

  // Response interceptor: Handle errors
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        keycloak.login(); // Redirect to Keycloak
      }
      return Promise.reject(error);
    }
  );
  ```
- Create typed API service per category: `npcService.ts`, `locationService.ts`, etc.
- Each service exports methods: `list()`, `getById()`, `create()`, `update()`, `delete()`

## Best Practices

### Component Organization

**Practice**: Organize components by feature, not type

**Rationale**:
- Feature-based folders reduce cognitive load (all related components together)
- Easier to locate components when working on specific feature
- Matches user mental model (dashboard, categories, entities)

**Example**:
```
frontend/src/components/
├── dashboard/
│   ├── DashboardPage.tsx
│   ├── DashboardWidget.tsx
│   ├── RecentItemsWidget.tsx
│   ├── CategoryStatisticsWidget.tsx
│   └── SessionRecapWidget.tsx
├── sidebar/
│   ├── Sidebar.tsx
│   ├── SidebarSection.tsx
│   └── SidebarLink.tsx
├── categories/
│   ├── CategoryLandingPage.tsx
│   ├── CategoryStatistics.tsx
│   ├── EntityTable.tsx
│   ├── EntityDetailPage.tsx
│   └── EntityForm.tsx
├── common/
│   ├── SearchInput.tsx
│   ├── FilterDropdown.tsx
│   ├── ViewModeToggle.tsx
│   └── LoadingSpinner.tsx
```

### Prop Drilling Avoidance

**Practice**: Use Context for deeply nested shared state, props for direct parent-child

**Rationale**:
- Context prevents prop drilling through 3+ levels
- Props are more explicit and easier to trace for direct relationships
- Avoid Context overuse (performance penalty from unnecessary re-renders)

**When to Use**:
- Context: View mode, campaign selection, thematic labels (used by many components)
- Props: Table columns, widget data, form field handlers (used by immediate children)

**Example**:
```typescript
// Context for view mode (used across entire app)
const ViewModeContext = createContext<{ viewMode: 'dm_view' | 'player_view'; setViewMode: (mode) => void }>(null);

// Props for table columns (used only by EntityTable and child cells)
function EntityTable({ columns, data }: { columns: ColumnDef<Entity>[]; data: Entity[] }) { ... }
```

### Error Boundaries

**Practice**: Wrap route-level components in error boundaries

**Rationale**:
- Prevents entire app crash from single component error
- Provides user-friendly fallback UI
- Logs errors for debugging

**Implementation**:
```typescript
// frontend/src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean }> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>Reload page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage in routes
<ErrorBoundary>
  <DashboardPage />
</ErrorBoundary>
```

### Loading States

**Practice**: Provide skeleton loaders for expected content shape

**Rationale**:
- Better UX than generic spinners (shows layout before data loads)
- Reduces perceived load time (progressive rendering)
- Matches final UI shape

**Implementation**:
```typescript
function EntityTable({ data, loading }: { data: Entity[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="skeleton-table">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton-row">
            <div className="skeleton-cell" />
            <div className="skeleton-cell" />
            <div className="skeleton-cell" />
          </div>
        ))}
      </div>
    );
  }

  return <Table data={data} />;
}
```

### TypeScript Type Safety

**Practice**: Define strict types for all component props and API responses

**Rationale**:
- Catch type errors at compile time
- Improve IDE autocomplete and documentation
- Easier refactoring with type checking

**Example**:
```typescript
// frontend/src/types/entities.ts
interface NPC {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  race: string | null;
  faction_id: string | null;
  player_knowledge: 'common_knowledge' | 'player_knowledge' | 'dm_only' | string | null;
  tags: string[];
  custom_fields: Record<string, any>;
  created_at: number;
  updated_at: number;
}

// Component props
interface EntityTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading: boolean;
  onRowClick: (row: T) => void;
}

function EntityTable<T>({ data, columns, loading, onRowClick }: EntityTableProps<T>) { ... }
```

## Performance Considerations

### Rendering Optimization

**Strategies**:
- Use `React.memo` for expensive components that don't change often (widgets, table rows)
- Use `useMemo` for expensive computations (filtering, sorting large arrays)
- Use `useCallback` for event handlers passed to child components (prevents re-renders)
- Code split routes with `React.lazy` + `Suspense`

**Example**:
```typescript
const EntityDetailPage = React.lazy(() => import('./components/categories/EntityDetailPage'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/categories/:category/:id" element={<EntityDetailPage />} />
      </Routes>
    </Suspense>
  );
}
```

### Network Optimization

**Strategies**:
- Debounce search input (200ms delay) to reduce API calls
- Cache API responses with `useSWR` or `react-query` (deferred to future, manual caching for v1)
- Paginate large lists (50 entities per page, fetch only current page)
- Lazy load entity details (don't fetch until detail page opened)

**Performance Goals**:
- Dashboard load: <2s (1000 entities across 7 widgets)
- Category landing: <1s (500 entities, paginated)
- Table pagination: <500ms (fetch + render 50 rows)
- Entity detail: <500ms (single entity fetch)
- Search/filter: <200ms (debounced input + API response)

### Bundle Optimization

**Strategies**:
- Tree-shaking enabled in Vite (automatic)
- Import only needed Radix UI primitives (e.g., `@radix-ui/react-dialog` not `@radix-ui/react`)
- Use dynamic imports for large dependencies (TanStack Table virtualization, react-color)
- Minimize third-party dependencies (reuse existing: axios, react-router, radix)

**Target Bundle Size**: <500KB gzipped (acceptable for desktop-only prototype)

## Open Questions

**None** - All Technical Context items specified, no NEEDS CLARIFICATION markers.

## References

- Feature 002 spec: Existing AuthContext, Keycloak integration, campaigns table
- Feature 004 spec: Existing InformationLevelContext, ViewModeContext, view mode filtering
- Feature 014 spec: 13 category REST APIs, database schemas, information level filtering endpoints
- React 18 docs: https://react.dev/
- React Router v6 docs: https://reactrouter.com/
- TanStack Table v8 docs: https://tanstack.com/table/v8
- React Hook Form docs: https://react-hook-form.com/
- Zod docs: https://zod.dev/
- Radix UI docs: https://www.radix-ui.com/
- Vite docs: https://vitejs.dev/

---

**Status**: ✅ Research complete - All decisions documented, ready for Phase 1 (Design & Contracts)
