# CategoryLandingCanvas - Testing Instructions
Feature: 015-create-the-dashboard (T021-T022)

## Components Created

### 1. CategoryLandingCanvas Component
**Location**: `frontend/src/components/dashboard/CategoryLandingCanvas.tsx`

Interactive canvas system for category landing pages with:
- Category-filtered widgets (only shows widgets relevant to the category)
- Rich text editor for category description
- Link to database table view
- Same drag-and-drop grid system as main dashboard
- Auto-save functionality (500ms debounce)

**Props**:
```typescript
interface CategoryLandingCanvasProps {
  campaignId: string;
  category: CategoryName; // From WidgetRegistry
}
```

### 2. CategoryLandingTextEditor Component
**Location**: `frontend/src/components/dashboard/CategoryLandingTextEditor.tsx`

Rich text editor for category descriptions with:
- TipTap editor with basic formatting (bold, italic, headings, lists, links, blockquotes)
- Auto-save on change (500ms debounce)
- Category-specific placeholder text
- Toolbar with formatting buttons

**Props**:
```typescript
interface CategoryLandingTextEditorProps {
  campaignId: string;
  category: CategoryName;
  content: any | null; // TipTap JSON
  onChange: (content: any) => void;
}
```

### 3. useCategoryLandingCanvas Hook
**Location**: `frontend/src/hooks/useCategoryLandingCanvas.ts`

State management hook for category landing canvas with:
- Config fetching on mount (creates default if none exists)
- Layout state management
- Widget instance management (category-filtered)
- Debounced auto-save (500ms)
- Add/remove widget operations
- Description update handling

**Usage**:
```typescript
const {
  layout,
  widgets,
  loading,
  saving,
  error,
  pickerOpen,
  description,
  configId,
  addWidget,
  removeWidget,
  onLayoutChange,
  setPickerOpen,
  updateDescription,
  refresh,
  resetLayout,
} = useCategoryLandingCanvas(campaignId, category);
```

## Backend Integration

The backend already supports category landing configs:
- **Table**: `category_landing_configs` (migration 015-dashboard-canvas.sql)
- **Routes**: `/api/category-landing-configs` (GET, POST, PUT, DELETE)
- **Service**: `CategoryLandingConfigService` (already implemented in T005)
- **Fields**: id, campaign_id, user_id, category, layout (JSON), title, description (TipTap JSON)

## How to Use in Routes (T027-T033)

When implementing the category landing page routes, use the component like this:

```typescript
// Example: NPCs Landing Page Route
import { CategoryLandingCanvas } from '../components/dashboard/CategoryLandingCanvas';
import { useParams } from 'react-router-dom';

export const NPCsLandingPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return <div>Campaign not found</div>;
  }

  return <CategoryLandingCanvas campaignId={campaignId} category="npcs" />;
};
```

Repeat for all 13 categories:
- npcs
- locations
- factions
- session_recaps
- quests
- player_characters
- lore_entries
- world_rules
- planar_forces
- session_prep
- custom_mechanics
- items
- creatures

## Features

### Widget Filtering
The `WidgetPicker` automatically filters widgets by category using:
```typescript
WidgetRegistry.getAllByCategory(category)
```

This returns:
1. Widgets with no `categories` filter (available everywhere)
2. Widgets that explicitly include this category in their `categories` array

Example:
- `npc-summary` widget has `categories: ['npcs']` → only shows on NPCs landing page
- `recent-activity` widget has no `categories` filter → shows on all landing pages + dashboard

### Rich Text Description
Each category landing page has a TipTap editor above the canvas for:
- Category introduction/overview
- Campaign-specific notes about this category
- Markdown-style formatting
- Auto-saves to backend (500ms debounce)

### Database Link
Each landing page header includes a "📊 Database" button that navigates to:
```
/campaigns/:campaignId/database/:category
```

This links to the database table view for that category (Feature 014).

### Information Filtering
Both the canvas and widgets respect the ViewModeToggle:
- **dm_view**: Shows all widgets and DM-only content
- **player_view**: Hides DM-only widgets and filters data

## Testing Steps

1. **Manual Testing** (once routes are implemented in T027-T033):
   ```bash
   # Start dev server
   cd frontend && npm run dev

   # Navigate to a category landing page
   # Example: http://localhost:3000/campaigns/{id}/npcs
   ```

2. **Test widget filtering**:
   - Click "+ Add Widget" button
   - Verify only category-relevant widgets appear in picker
   - Verify generic widgets (like recent-activity) also appear

3. **Test rich text editor**:
   - Type text in the description editor
   - Use toolbar buttons to format text
   - Verify auto-save (wait 500ms, check "Saving..." indicator)
   - Refresh page and verify content persists

4. **Test canvas operations**:
   - Add widgets to canvas
   - Drag widgets to reorder
   - Resize widgets
   - Remove widgets
   - Verify layout persists after refresh

5. **Test database link**:
   - Click "📊 Database" button
   - Verify navigation to `/campaigns/{id}/database/{category}`

6. **Test reset layout**:
   - Click "↻" button
   - Confirm reset
   - Verify canvas returns to empty state

7. **Test view mode filtering**:
   - Toggle between DM/Player view (⋮ button in header)
   - Verify widgets respect view mode

## Integration with T027-T033

When creating the 13 category landing page routes:

1. Create a route file (e.g., `NPCsLandingPage.tsx`)
2. Import `CategoryLandingCanvas`
3. Extract `campaignId` from URL params
4. Render `<CategoryLandingCanvas campaignId={campaignId} category="npcs" />`
5. Add route to router configuration

Example structure:
```
frontend/src/pages/
├── NPCsLandingPage.tsx
├── LocationsLandingPage.tsx
├── FactionsLandingPage.tsx
├── SessionRecapsLandingPage.tsx
├── QuestsLandingPage.tsx
├── PlayerCharactersLandingPage.tsx
├── LoreEntriesLandingPage.tsx
├── WorldRulesLandingPage.tsx
├── PlanarForcesLandingPage.tsx
├── SessionPrepLandingPage.tsx
├── CustomMechanicsLandingPage.tsx
├── ItemsLandingPage.tsx
└── CreaturesLandingPage.tsx
```

## TypeScript Compatibility

All components are fully typed with TypeScript:
- No TypeScript errors introduced
- Uses existing types from `WidgetRegistry` and `dashboardConfigService`
- TipTap JSON type is `any` (matches existing Block.tsx pattern)

## CSS Styling

- **CategoryLandingCanvas**: Reuses `DashboardPage.css` (same grid styling)
- **CategoryLandingTextEditor**: New `CategoryLandingTextEditor.css` with toolbar and editor styles
- Both components use responsive breakpoints (lg/md/sm)

## Dependencies

All dependencies already installed:
- `@tiptap/react` ✓
- `@tiptap/starter-kit` ✓
- `@tiptap/extension-placeholder` ✓
- `@tiptap/extension-link` ✓
- `react-grid-layout` ✓
- `@radix-ui/react-dialog` ✓

## Known Considerations

1. **Empty Default Layout**: Category landing pages start with an empty canvas (no default widgets)
   - Users must manually add widgets via "+ Add Widget" button
   - This is intentional to allow customization per category

2. **Description Field**: Backend already has `description` TEXT column in `category_landing_configs`
   - No migration needed
   - Stores TipTap JSON as stringified JSON

3. **Widget Availability**: Category-specific widgets (T014-T020) are placeholders for now
   - Actual widget implementations will be added later
   - Components will work with any registered widgets

4. **Database Link**: Assumes database table view route exists at `/campaigns/:campaignId/database/:category`
   - Route implementation is separate (Feature 014 integration)

## Next Steps (T027-T033)

For each of the 13 categories, create a landing page route that:
1. Renders `CategoryLandingCanvas` with the appropriate category prop
2. Adds route to `AppRoutes` with path `/campaigns/:campaignId/{category}`
3. Adds navigation link in sidebar (if needed)

Example:
```typescript
<Route
  path="/campaigns/:campaignId/npcs"
  element={<NPCsLandingPage />}
/>
```
