# Dashboard Landing Card Components

Phase 3.6 implementation for Feature 015 - Dashboard & Navigation UI.

## Components

### NPCLandingCard
**File**: `NPCLandingCard.tsx`
**Purpose**: Dashboard widget showing NPC summary for a campaign
**Features**:
- Displays total NPC count
- Shows relationship breakdown (ally/hostile/neutral)
- Lists 5 most recently updated NPCs
- Click to navigate to NPC detail page
- "View All" button to navigate to NPCs landing page
- Responsive design with mobile optimizations

**Props**:
- `campaignId: string` - Campaign ID
- `onViewAll?: () => void` - Optional override for "View All" navigation

**Dependencies**:
- `useCategory` hook for fetching NPCs
- `useThematicLabels` hook for themed category labels
- `getNPCStats` service for statistics
- `LoadingSpinner` for loading state
- `EmptyState` for zero NPCs

---

### LocationLandingCard
**File**: `LocationLandingCard.tsx`
**Purpose**: Dashboard widget showing location summary for a campaign
**Features**:
- Displays total location count
- Shows type breakdown (city/dungeon/wilderness/region/etc)
- Lists 5 most recently updated locations
- Click to navigate to location detail page
- "View All" button to navigate to locations landing page
- Responsive design

**Props**:
- `campaignId: string` - Campaign ID
- `onViewAll?: () => void` - Optional override for "View All" navigation

**Dependencies**:
- `useCategory` hook for fetching locations
- `useThematicLabels` hook for themed category labels
- `getLocationStats` service for statistics
- `LoadingSpinner` for loading state
- `EmptyState` for zero locations

---

### QuestLandingCard
**File**: `QuestLandingCard.tsx`
**Purpose**: Dashboard widget showing quest summary for a campaign
**Features**:
- Displays active quest count (not_started + in_progress)
- Displays completed quest count
- Shows full status breakdown (not_started, in_progress, completed, failed)
- Lists 5 most recently updated quests with status badges
- Color-coded status badges (gray, blue, green, red)
- Click to navigate to quest detail page
- "View All" button to navigate to quests landing page
- Responsive design

**Props**:
- `campaignId: string` - Campaign ID
- `onViewAll?: () => void` - Optional override for "View All" navigation

**Dependencies**:
- `useCategory` hook for fetching quests
- `useThematicLabels` hook for themed category labels
- `getQuestStats` service for statistics
- `LoadingSpinner` for loading state
- `EmptyState` for zero quests

---

### SessionTimelineCard
**File**: `SessionTimelineCard.tsx`
**Purpose**: Dashboard widget showing session timeline for a campaign
**Features**:
- Displays current in-game date (from last recap's in_game_date_end)
- Shows last session recap (session number, title, date, excerpt, relative time)
- Shows next session prep (session number, title, status, planned date)
- Separate "View All" buttons for recaps and prep
- Click session to navigate to detail page
- Empty states for no recaps or no prep
- Responsive design with timeline sections

**Props**:
- `campaignId: string` - Campaign ID

**Dependencies**:
- `useCategory` hook for fetching session recaps and session prep
- `useThematicLabels` hook for themed category labels
- `LoadingSpinner` for loading state
- `EmptyState` for zero recaps/prep

---

## Styling

All components share a consistent visual design through base CSS classes defined in `NPCLandingCard.css`:

- `.landing-card` - Card container with padding, border, shadow
- `.landing-card-header` - Header with title and "View All" button
- `.landing-card-stats` - Statistics section with metrics
- `.landing-card-list` - Recent items list section
- `.landing-card-item-button` - Clickable item button with hover states

Component-specific styles are in separate CSS files for modularity:
- `LocationLandingCard.css` - Location-specific badge colors
- `QuestLandingCard.css` - Quest status badges and grid layout
- `SessionTimelineCard.css` - Timeline-specific sections and item layout

### CSS Variables
Components use CSS variables for theming:
- `--card-bg`, `--card-border` - Card styling
- `--button-primary-bg`, `--button-primary-hover` - Button colors
- `--text-primary`, `--text-secondary`, `--text-tertiary` - Text hierarchy
- `--stat-bg`, `--badge-bg` - Background colors for stats and badges
- `--focus-ring` - Accessibility focus indicator

---

## Usage Example

```tsx
import { NPCLandingCard, LocationLandingCard, QuestLandingCard, SessionTimelineCard } from './components/dashboard';

function CampaignDashboard({ campaignId }: { campaignId: string }) {
  return (
    <div className="dashboard-grid">
      <NPCLandingCard campaignId={campaignId} />
      <LocationLandingCard campaignId={campaignId} />
      <QuestLandingCard campaignId={campaignId} />
      <SessionTimelineCard campaignId={campaignId} />
    </div>
  );
}
```

---

## Accessibility

All components follow WCAG 2.1 AA standards:
- Semantic HTML with proper heading hierarchy
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators on all clickable elements
- Screen reader friendly (role="status" for loading/empty states)
- Color contrast ratios meet AA standards

---

## Performance

- React.memo used for widgets to prevent unnecessary re-renders (future optimization)
- Debounced API calls via useCategory hook (300ms)
- Loading spinners during data fetch
- Error boundaries catch component-level errors
- Responsive images with CSS optimization
- Virtualization not needed (5 items max per widget)

---

## Testing

Component tests should cover:
- Data fetching and loading states
- Error handling and error display
- Empty states when no data
- Navigation clicks (item clicks, "View All" clicks)
- Themed label display
- Responsive layout (mobile vs desktop)
- Accessibility (aria labels, focus management)

---

## Future Enhancements

- Real-time updates via WebSocket/SSE
- Drag-and-drop widget reordering on dashboard
- Widget customization (show/hide, resize)
- Export/print functionality
- Advanced filtering within widgets
- Chart visualizations for stats (pie charts, bar charts)
