/**
 * MapViewportWidget - T032: Map Viewport Widget
 * Feature: 021-create-a-geographic
 *
 * Displays an interactive map in a dashboard widget viewport.
 * Size-adaptive rendering:
 * - Compact (2x2): Map with minimal controls
 * - Medium (3x3): Map with controls and pin list
 * - Detailed (4x4+): Map with controls, pins, regions
 */

import React, { useState, useEffect } from 'react';
import { BaseWidgetProps } from '../WidgetRegistry';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { useMapViewportWidget } from '../../../hooks/useMapViewportWidget';
import MapCanvas from '../../maps/MapCanvas';
import './WidgetStyles.css';
import './MapViewportWidget.css';

export interface MapViewportWidgetConfig {
  locationId?: string;
  mapId?: string;
  panX?: number;
  panY?: number;
  zoom?: number;
}

export const MapViewportWidget: React.FC<BaseWidgetProps & { config?: MapViewportWidgetConfig }> = ({
  size,
  viewMode,
  campaignId,
  config = {},
}) => {
  const {
    locations,
    selectedLocation,
    selectedMap,
    pins,
    regions,
    loading,
    error,
    selectLocation,
    selectMap,
  } = useMapViewportWidget(campaignId, config.locationId, config.mapId);

  // Local pan/zoom state (persisted via config in future)
  const [panPosition, setPanPosition] = useState({ x: config.panX || 0, y: config.panY || 0 });
  const [zoomLevel, setZoomLevel] = useState(config.zoom || 1);

  const isCompact = size === '2x2';
  const isMedium = size === '3x3';
  const isDetailed = size === '4x4' || size === '4x3';

  // Calculate widget dimensions based on size
  const getWidgetDimensions = () => {
    const cellSize = 120; // Approximate grid cell size
    const sizes: Record<string, { width: number; height: number }> = {
      '2x2': { width: cellSize * 2, height: cellSize * 2 },
      '3x3': { width: cellSize * 3, height: cellSize * 3 },
      '4x3': { width: cellSize * 4, height: cellSize * 3 },
      '4x4': { width: cellSize * 4, height: cellSize * 4 },
    };
    return sizes[size] || { width: cellSize * 2, height: cellSize * 2 };
  };

  const { width, height } = getWidgetDimensions();

  if (loading) {
    return (
      <div className="widget-loading">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="widget-error">
        <div className="widget-error-icon">⚠️</div>
        <div className="widget-error-text">{error}</div>
      </div>
    );
  }

  // No configuration yet - show setup UI
  if (!selectedLocation || !selectedMap) {
    return (
      <div className="map-viewport-widget-setup">
        <div className="widget-empty-icon">🗺️</div>
        <div className="widget-empty-text">No map selected</div>

        {locations.length > 0 ? (
          <div className="map-viewport-widget-selector">
            <label>Select Location:</label>
            <select
              onChange={(e) => selectLocation(e.target.value)}
              value={selectedLocation?.id || ''}
              className="map-viewport-widget-select"
            >
              <option value="">Choose a location...</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="widget-empty-subtext">No locations with maps found</div>
        )}
      </div>
    );
  }

  // Compact view: Map only, minimal UI
  if (isCompact) {
    return (
      <div className="map-viewport-widget-compact">
        <MapCanvas
          mapData={selectedMap}
          pins={pins}
          regions={regions}
          width={width - 20}
          height={height - 50}
          onPinClick={() => {}}
        />
        <div className="map-viewport-widget-title">{selectedLocation.name}</div>
      </div>
    );
  }

  // Medium view: Map with controls and pin count
  if (isMedium) {
    return (
      <div className="map-viewport-widget-medium">
        <div className="map-viewport-widget-header">
          <h4>{selectedLocation.name}</h4>
          <span className="map-viewport-widget-pin-count">{pins.length} pins</span>
        </div>
        <MapCanvas
          mapData={selectedMap}
          pins={pins}
          regions={regions}
          width={width - 20}
          height={height - 80}
          onPinClick={() => {}}
        />
      </div>
    );
  }

  // Detailed view: Map with full info panel
  return (
    <div className="map-viewport-widget-detailed">
      <div className="map-viewport-widget-header">
        <div>
          <h4>{selectedLocation.name}</h4>
          <span className="map-viewport-widget-map-name">{selectedMap.name}</span>
        </div>
        <div className="map-viewport-widget-stats">
          <span>{pins.length} pins</span>
          <span>{regions.length} regions</span>
        </div>
      </div>

      <div className="map-viewport-widget-content">
        <MapCanvas
          mapData={selectedMap}
          pins={pins}
          regions={regions}
          width={width - 220}
          height={height - 100}
          onPinClick={() => {}}
        />

        {/* Info sidebar */}
        <div className="map-viewport-widget-sidebar">
          <div className="map-viewport-widget-section">
            <h5>Pins</h5>
            {pins.slice(0, 5).map((pin) => (
              <div key={pin.id} className="map-viewport-widget-item">
                {pin.label || 'Unnamed'}
              </div>
            ))}
            {pins.length > 5 && (
              <div className="map-viewport-widget-more">+{pins.length - 5} more</div>
            )}
          </div>

          <div className="map-viewport-widget-section">
            <h5>Regions</h5>
            {regions.slice(0, 3).map((region) => (
              <div key={region.id} className="map-viewport-widget-item">
                <span
                  className="map-viewport-widget-color-dot"
                  style={{ background: region.color }}
                />
                {region.label || 'Unnamed'}
              </div>
            ))}
            {regions.length > 3 && (
              <div className="map-viewport-widget-more">+{regions.length - 3} more</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
