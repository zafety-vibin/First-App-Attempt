/**
 * BaseWidget - Wrapper for all dashboard widgets
 * Feature: 015-create-the-dashboard (T008)
 *
 * Implements:
 * - Widget header with title and remove button
 * - Drag handle for react-grid-layout
 * - Error boundary wrapper
 * - Size-adaptive CSS classes
 */

import React from 'react';
import { WidgetRegistry, type WidgetSize } from './WidgetRegistry';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface BaseWidgetWrapperProps {
  instanceId: string;
  widgetId: string;
  size: WidgetSize;
  viewMode: 'dm_view' | 'player_view';
  campaignId: string;
  onRemove: () => void;
}

export const BaseWidget: React.FC<BaseWidgetWrapperProps> = ({
  widgetId,
  size,
  viewMode,
  campaignId,
  onRemove,
}) => {
  // Get widget definition from registry
  const definition = WidgetRegistry.get(widgetId);

  if (!definition) {
    return (
      <div
        className={`widget-container widget-${size} widget-error`}
        style={{
          width: '100%',
          height: '100%',
          padding: '1rem',
          background: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', color: '#f44336' }}>
          <p>Widget not found: {widgetId}</p>
        </div>
      </div>
    );
  }

  // Render widget component
  const WidgetComponent = definition.component;

  return (
    <div
      className={`widget-container widget-${size}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Widget Header with drag handle and remove button */}
      <div
        className="widget-header react-grid-drag-handle"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          background: '#f5f5f5',
          borderBottom: '1px solid #e0e0e0',
          cursor: 'move',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 600,
            color: '#333',
          }}
        >
          {definition.name}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag when clicking remove
            onRemove();
          }}
          className="widget-remove-button"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
            color: '#999',
            fontSize: '1.25rem',
            lineHeight: 1,
            zIndex: 20, // Above resize handle
            position: 'relative',
          }}
          title="Remove widget"
          aria-label="Remove widget"
        >
          ×
        </button>
      </div>

      {/* Widget Content with error boundary */}
      <div
        className="widget-content"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '1rem',
        }}
      >
        <ErrorBoundary>
          <WidgetComponent
            size={size}
            viewMode={viewMode}
            campaignId={campaignId}
            onRemove={onRemove}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default BaseWidget;