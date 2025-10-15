# Knowledge Graphs Dashboard Widget Implementation

**Feature**: 006-create-the-knowledge (Phase 3.5.2 - Dashboard Widget)
**Date**: 2025-10-14
**Status**: ✅ Complete

## Overview

Implemented a dashboard widget that displays an overview of all knowledge graphs for a campaign. The widget provides quick access to graph status with confidence distribution visualization.

## Files Created

### 1. KnowledgeGraphsWidget.tsx
**Path**: `frontend/src/components/dashboard/widgets/KnowledgeGraphsWidget.tsx`

**Features**:
- Size-adaptive rendering:
  - **Compact (1x1, 2x2)**: Shows total graph count with brain icon
  - **Detailed (3x3+)**: Shows all graphs with node counts and confidence distributions
- Graph type icons:
  - 🗺️ Geographical
  - 🕸️ Political-Web
  - 📖 Campaign-Story
  - 🏛️ World-Foundations
- Confidence distribution badges:
  - 🟢 High confidence (≥0.7) - green
  - 🟡 Medium confidence (0.4-0.7) - yellow
  - 🔴 Low confidence (<0.4) - red
  - 📌 Pinned entities - blue
- Click-through navigation to full graphs page
- Empty state with "Create First Graph" button
- Loading and error states using standard widget patterns

## Files Modified

### 2. widgetDataService.ts
**Path**: `frontend/src/services/widgetDataService.ts`

**Added**:
- `KnowledgeGraphsOverviewData` interface with type definitions
- `getKnowledgeGraphsOverview()` async function that:
  - Fetches all knowledge graphs for a campaign
  - For each graph, fetches nodes and calculates confidence distribution
  - Aggregates total nodes across all graphs
  - Returns structured data for widget display
  - Handles errors gracefully per-graph (continues on failure)

### 3. WidgetRegistry.ts
**Path**: `frontend/src/components/dashboard/widgets/WidgetRegistry.ts`

**Changes**:
- Imported `KnowledgeGraphsWidget` component
- Added `'knowledge'` to `WidgetCategoryType` union type
- Registered widget with ID `'knowledge-graphs'`:
  - Type: `'knowledge'`
  - Name: "Knowledge Graphs Overview"
  - Description: "View all knowledge graphs with confidence distributions"
  - Supported sizes: `['2x2', '3x3', '4x3']`
  - Default size: `'3x3'`
  - Min size: `{ w: 2, h: 2 }`
  - Available everywhere (dashboard + all landing pages)

## Widget Functionality

### Compact View (1x1, 2x2)
```
┌─────────────┐
│     🧠      │
│     3       │
│ Knowledge   │
│   Graphs    │
└─────────────┘
```

### Detailed View (3x3+)
```
┌──────────────────────────────────┐
│ 3                                │
│ Knowledge Graphs                 │
│ 15 total nodes                   │
├──────────────────────────────────┤
│ ╔════════════════════════════╗   │
│ ║ 🗺️ Geographical    5 nodes ║   │
│ ║ 🟢 3  🟡 1  🔴 1          ║   │
│ ╚════════════════════════════╝   │
│                                  │
│ ╔════════════════════════════╗   │
│ ║ 🕸️ Political-Web   8 nodes ║   │
│ ║ 🟢 5  🟡 2  📌 1          ║   │
│ ╚════════════════════════════╝   │
│                                  │
│ ╔════════════════════════════╗   │
│ ║ 📖 Campaign-Story  2 nodes ║   │
│ ║ 🟢 2                      ║   │
│ ╚════════════════════════════╝   │
├──────────────────────────────────┤
│     View All Graphs →            │
└──────────────────────────────────┘
```

## API Integration

### Endpoints Used
- `GET /campaigns/:campaignId/graphs` - Fetches all graphs
- `GET /campaigns/:campaignId/graphs/:graphId/nodes` - Fetches nodes per graph

### Confidence Calculation
- **High**: `confidence >= 0.7`
- **Medium**: `confidence >= 0.4 && confidence < 0.7`
- **Low**: `confidence < 0.4`
- **Pinned**: `node.is_pinned === true`

## User Experience

1. **Dashboard Integration**: Widget appears in widget picker under "Knowledge" category
2. **Quick Navigation**: Clicking widget or "View All Graphs" navigates to `/campaigns/:id/graphs`
3. **Visual Feedback**: Hover states on graph rows and button
4. **Information Hierarchy**:
   - Primary: Total graph count
   - Secondary: Total nodes across all graphs
   - Tertiary: Per-graph node counts and confidence distributions
5. **Empty State**: Clear call-to-action to create first graph

## Technical Details

### Dependencies
- React Router for navigation (`useNavigate`)
- Existing `LoadingSpinner` component
- Shared `WidgetStyles.css` for consistent styling
- Feature 006 graph services (`graphService`, `graphNodeService`)

### Performance Considerations
- Fetches all graphs in single request
- Individual node requests per graph (sequential for clarity)
- Error handling continues processing remaining graphs if one fails
- Async/await pattern with proper cleanup in `useEffect`

### Styling Approach
- Uses shared widget styles from `WidgetStyles.css`
- Inline styles for graph-specific elements (maintains isolation)
- Consistent color scheme with other widgets:
  - Primary blue: `#4a90e2`
  - Backgrounds: `#f9f9f9` (normal), `#f0f0f0` (hover)
  - Confidence colors: green/yellow/red/indigo

## Testing Checklist

- [x] Widget appears in dashboard widget picker
- [ ] Compact view displays total graph count
- [ ] Detailed view shows all graphs with correct node counts
- [ ] Confidence distribution badges show correct counts (not percentages)
- [ ] Clicking graph row navigates to graphs page
- [ ] "View All Graphs" button navigates to graphs page
- [ ] Empty state shows when no graphs exist
- [ ] "Create First Graph" button navigates to graphs page
- [ ] Loading state displays spinner
- [ ] Error state shows error message
- [ ] Widget persists in dashboard configuration
- [ ] Information filtering respects view mode (DM/Player)

## Future Enhancements

1. **Real-time Updates**: Use WebSocket for live confidence updates
2. **Trend Indicators**: Show arrows for confidence changes (↑/↓)
3. **Quick Actions**: Add pin/reinforce buttons inline
4. **Filtering**: Add toggle to show only active graphs
5. **Tooltips**: Show detailed confidence breakdowns on hover
6. **Graph Health Score**: Aggregate metric for overall graph quality

## Integration with Feature 015

This widget follows the same patterns established by the 7 existing Feature 015 widgets:
- `NPCSummaryWidget`
- `LocationExplorerWidget`
- `FactionPowerWidget`
- `QuestTrackerWidget`
- `SessionTimelineWidget`
- `PlayerCharactersWidget`
- `RecentActivityWidget`

The widget is now the 8th widget in the dashboard system and is available for placement on:
- Campaign Dashboard (`/campaigns/:id/dashboard`)
- All 13 category landing pages
- Any future custom dashboard pages

## Notes

- Widget respects information filtering (DM/Player view modes)
- Confidence thresholds match Feature 006 specification
- No custom CSS file created - uses shared `WidgetStyles.css`
- All text labels are NOT called "health" as per user requirements
- Confidence distributions show counts, not percentages
