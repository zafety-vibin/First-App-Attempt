/**
 * CategoryLandingCanvas - Canvas system for category landing pages
 * Feature: 015-create-the-dashboard (T021)
 *
 * Interactive canvas with:
 * - Category-filtered widgets (only widgets relevant to this category)
 * - Rich text editor for category description
 * - Link to database table view
 * - Same drag-and-drop grid system as main dashboard
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Responsive, WidthProvider, Layout as RGLLayout } from 'react-grid-layout';
import { useCategoryLandingCanvas } from '../../hooks/useCategoryLandingCanvas';
import { useViewMode } from '../../contexts/ViewModeContext';
import { WidgetRegistry, type CategoryName } from './WidgetRegistry';
import { BaseWidget } from './BaseWidget';
import { WidgetPicker } from './WidgetPicker';
import { CategoryLandingTextEditor } from './CategoryLandingTextEditor';
import { ViewModeToggle } from '../ViewModeToggle';
import { LoadingSpinner } from '../common/LoadingSpinner';
import '../../pages/DashboardPage.css'; // Reuse dashboard styles

const ResponsiveGridLayout = WidthProvider(Responsive);

interface CategoryLandingCanvasProps {
  campaignId: string;
  category: CategoryName;
}

// Category display names
const CATEGORY_DISPLAY_NAMES: Record<CategoryName, string> = {
  npcs: 'NPCs',
  locations: 'Locations',
  factions: 'Factions',
  session_recaps: 'Session Recaps',
  quests: 'Quests',
  player_characters: 'Player Characters',
  lore_entries: 'Lore Entries',
  world_rules: 'World Rules',
  planar_forces: 'Planar Forces',
  session_prep: 'Session Prep',
  custom_mechanics: 'Custom Mechanics',
  items: 'Items',
  creatures: 'Creatures',
};

/**
 * CategoryLandingCanvas Component
 * Canvas system for individual category landing pages
 * Filters widgets by category and includes rich text description editor
 */
export const CategoryLandingCanvas: React.FC<CategoryLandingCanvasProps> = ({
  campaignId,
  category,
}) => {
  const navigate = useNavigate();
  const { viewMode } = useViewMode();

  const {
    layout,
    loading,
    saving,
    error,
    pickerOpen,
    description,
    setPickerOpen,
    addWidget,
    removeWidget,
    onLayoutChange,
    updateDescription,
    resetLayout,
  } = useCategoryLandingCanvas(campaignId, category);

  // Get category display name
  const categoryDisplayName = CATEGORY_DISPLAY_NAMES[category] || category;

  // Handle error state
  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          <p>Error loading {categoryDisplayName} landing page: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <LoadingSpinner size="lg" />
          <p>Loading {categoryDisplayName} landing page...</p>
        </div>
      </div>
    );
  }

  // Handle campaign ID validation
  if (!campaignId) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          <p>Error: Campaign ID not found</p>
        </div>
      </div>
    );
  }

  // Check if canvas is empty
  const isEmpty = layout.length === 0;

  // Filter widgets by category
  const availableWidgets = WidgetRegistry.getAllByCategory(category);

  return (
    <div className="dashboard-page">
      {/* Header with category name, buttons, and ViewModeToggle */}
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1 className="dashboard-title">{categoryDisplayName}</h1>
          {saving && <span className="dashboard-saving-indicator">Saving...</span>}
        </div>
        <div className="dashboard-header-right">
          <button
            type="button"
            className="dashboard-add-widget-button"
            onClick={() => setPickerOpen(true)}
            aria-label="Add Widget"
            title="Add widget to canvas"
          >
            + Add Widget
          </button>
          <button
            type="button"
            className="dashboard-add-widget-button"
            onClick={() => navigate(`/campaigns/${campaignId}/${category}/database`)}
            aria-label="View Database Table"
            title={`View ${categoryDisplayName} database table`}
            style={{ backgroundColor: '#6c757d' }}
          >
            📊 Database
          </button>
          <button
            type="button"
            className="dashboard-reset-button"
            onClick={() => {
              if (
                window.confirm(
                  `Reset ${categoryDisplayName} landing page to default? This will remove all widgets and cannot be undone.`
                )
              ) {
                resetLayout();
              }
            }}
            aria-label="Reset Layout"
            title="Reset to default layout"
          >
            ↻
          </button>
          <ViewModeToggle />
        </div>
      </header>

      {/* Rich text editor for category description */}
      <CategoryLandingTextEditor
        campaignId={campaignId}
        category={category}
        content={description}
        onChange={updateDescription}
      />

      {/* Empty state */}
      {isEmpty && (
        <div className="dashboard-empty-state">
          <div className="empty-state-content">
            <h2>Welcome to your {categoryDisplayName} Landing Page</h2>
            <p>Add widgets to track and visualize your {categoryDisplayName.toLowerCase()}.</p>
            <button
              type="button"
              className="empty-state-add-button"
              onClick={() => setPickerOpen(true)}
            >
              + Add Your First Widget
            </button>
          </div>
        </div>
      )}

      {/* Canvas grid with widgets */}
      {!isEmpty && (
        <ResponsiveGridLayout
          className="dashboard-canvas"
          layouts={{ lg: layout, md: layout, sm: layout }}
          breakpoints={{ lg: 1200, md: 768, sm: 0 }}
          cols={{ lg: 12, md: 6, sm: 1 }}
          rowHeight={10}
          isDraggable={true}
          isResizable={true}
          compactType="vertical"
          preventCollision={false}
          onLayoutChange={(currentLayout: RGLLayout[]) => {
            // Convert RGLLayout to GridLayoutItem format
            const updatedLayout = currentLayout.map((item) => {
              const originalItem = layout.find((l) => l.i === item.i);
              return {
                i: item.i,
                x: item.x,
                y: item.y,
                w: item.w,
                h: item.h,
                minW: item.minW,
                minH: item.minH,
                maxW: item.maxW,
                maxH: item.maxH,
                widgetId: originalItem?.widgetId || '',
                static: item.static,
              };
            });
            onLayoutChange(updatedLayout);
          }}
          draggableHandle=".react-grid-drag-handle"
        >
          {layout.map((item) => (
            <div key={item.i} className="dashboard-canvas-item">
              <BaseWidget
                widgetId={item.widgetId}
                instanceId={item.i}
                size={`${item.w}x${item.h}` as any}
                viewMode={viewMode}
                campaignId={campaignId}
                onRemove={() => removeWidget(item.i)}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}

      {/* Widget Picker Modal - filtered to category-specific widgets */}
      <WidgetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addWidget}
        existingWidgets={layout.map((item) => item.widgetId)}
        categoryFilter={category}
      />
    </div>
  );
};
