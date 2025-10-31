/**
 * Dashboard Page - Canvas System
 * Feature: 015-create-the-dashboard
 *
 * Interactive dashboard with drag-and-drop widget canvas.
 * Users can add/remove/resize/reorder widgets with react-grid-layout.
 * Configuration persists per user per campaign.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Responsive, WidthProvider, Layout as RGLLayout } from 'react-grid-layout';
import { useDashboardCanvas } from '../hooks/useDashboardCanvas';
import { useViewMode } from '../contexts/ViewModeContext';
import { BaseWidget } from '../components/dashboard/BaseWidget';
import { WidgetPicker } from '../components/dashboard/WidgetPicker';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useWizardStatus } from '../hooks/useWizardStatus';
import WizardDialog from '../components/wizard/WizardDialog';
import './DashboardPage.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface DashboardPageProps {
  campaignId?: string;
}

/**
 * Campaign Dashboard Page - Canvas System
 *
 * Interactive dashboard with drag-and-drop widget canvas using react-grid-layout.
 * Features:
 * - Add/remove widgets via WidgetPicker modal
 * - Drag and drop to reorder widgets
 * - Resize widgets (respects min/max sizes from registry)
 * - Auto-save layout changes (500ms debounce)
 * - dm_view/player_view filtering via ViewModeToggle
 * - Responsive breakpoints: lg (1200px+), md (768px+), sm (<768px)
 * - Loading and empty states
 */
export const DashboardPage: React.FC<DashboardPageProps> = ({ campaignId: propCampaignId }) => {
  const params = useParams<{ campaignId: string }>();
  const campaignId = propCampaignId || params.campaignId || '';
  const { viewMode } = useViewMode();

  // Feature 016: Wizard integration
  const { status: wizardStatus, loading: wizardLoading } = useWizardStatus(campaignId);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (!wizardLoading && wizardStatus) {
      setShowWizard(wizardStatus.shouldShowWizard);
    }
  }, [wizardStatus, wizardLoading]);

  const {
    layout,
    loading,
    saving,
    error,
    pickerOpen,
    setPickerOpen,
    addWidget,
    removeWidget,
    onLayoutChange,
    resetLayout,
  } = useDashboardCanvas(campaignId);

  // Handle error state
  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          <p>Error loading dashboard: {error}</p>
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
          <p>Loading dashboard...</p>
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

  // Empty state: no widgets added yet
  const isEmpty = layout.length === 0;

  return (
    <div className="dashboard-page">
      {/* Feature 016: Campaign Setup Wizard */}
      {showWizard && (
        <WizardDialog
          open={showWizard}
          onClose={() => {
            setShowWizard(false);
            window.location.reload(); // Reload to show dashboard with settings
          }}
          campaignId={campaignId}
        />
      )}

      {/* Header with Add Widget button and ViewModeToggle */}
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1 className="dashboard-title">Campaign Dashboard</h1>
          {saving && <span className="dashboard-saving-indicator">Saving...</span>}
        </div>
        <div className="dashboard-header-right">
          <button
            type="button"
            className="dashboard-add-widget-button"
            onClick={() => setPickerOpen(true)}
            aria-label="Add Widget"
          >
            + Add Widget
          </button>
          <button
            type="button"
            className="dashboard-reset-button"
            onClick={() => {
              if (window.confirm('Reset dashboard to default layout? This will remove all widgets and cannot be undone.')) {
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

      {/* Empty state */}
      {isEmpty && (
        <div className="dashboard-empty-state">
          <div className="empty-state-content">
            <h2>Welcome to your Campaign Dashboard</h2>
            <p>Get started by adding widgets to track your campaign.</p>
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

      {/* Widget Picker Modal */}
      <WidgetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addWidget}
        existingWidgets={layout.map((item) => item.widgetId)}
      />
    </div>
  );
};
