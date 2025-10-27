/**
 * MapControls Component
 * Feature: 021-create-a-geographic
 * Task: T024
 *
 * Provides zoom and view controls for MapCanvas.
 * Buttons for zoom in/out, reset view, and fit to viewport.
 */

import React from 'react';
import './MapControls.css';

export interface MapControlsProps {
  /** Current zoom level (1 = 100%) */
  zoomLevel: number;
  /** Callback to zoom in */
  onZoomIn: () => void;
  /** Callback to zoom out */
  onZoomOut: () => void;
  /** Callback to reset view to fit map */
  onResetView: () => void;
  /** Callback to fit map to viewport */
  onFitToViewport?: () => void;
  /** Minimum zoom level (default: 0.1) */
  minZoom?: number;
  /** Maximum zoom level (default: 5) */
  maxZoom?: number;
}

const MapControls: React.FC<MapControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitToViewport,
  minZoom = 0.1,
  maxZoom = 5,
}) => {
  const canZoomIn = zoomLevel < maxZoom;
  const canZoomOut = zoomLevel > minZoom;

  return (
    <div className="map-controls">
      {/* Zoom In Button */}
      <button
        className="map-control-button"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom In (Scroll Up)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
      </button>

      {/* Zoom Level Display */}
      <div className="map-control-zoom-level">
        {Math.round(zoomLevel * 100)}%
      </div>

      {/* Zoom Out Button */}
      <button
        className="map-control-button"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom Out (Scroll Down)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
          <path d="M8 11h6" />
        </svg>
      </button>

      {/* Divider */}
      <div className="map-control-divider"></div>

      {/* Reset View Button */}
      <button
        className="map-control-button"
        onClick={onResetView}
        title="Reset View (Cmd/Ctrl + 0)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      </button>

      {/* Fit to Viewport Button (optional) */}
      {onFitToViewport && (
        <button
          className="map-control-button"
          onClick={onFitToViewport}
          title="Fit Map to Viewport"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default MapControls;
