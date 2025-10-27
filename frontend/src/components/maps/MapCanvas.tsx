/**
 * MapCanvas Component
 * Feature: 021-create-a-geographic
 * Task: T021
 *
 * Konva.js-based interactive map canvas with pan/zoom capabilities.
 * Renders map image, faction regions, and clickable pins in separate layers.
 *
 * Architecture:
 * - Stage: Root container (viewport size)
 * - Layer 0: Map image background
 * - Layer 1: Faction regions (polygons)
 * - Layer 2: Map pins (interactive markers)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import MapPin from './MapPin';
import FactionRegion from './FactionRegion';
import './MapCanvas.css';

export interface MapImage {
  id: string;
  name: string;
  data: string; // base64 data URL
  width: number;
  height: number;
  uploaded_at: number;
}

export interface MapPin {
  id: string;
  map_id: string;
  x: number;
  y: number;
  linked_entity_type: 'location' | 'npc';
  linked_entity_id: string;
  icon: string | null;
  color: string | null;
  label: string | null;
  created_at: number;
}

export interface FactionRegion {
  id: string;
  map_id: string;
  vertices: Array<{ x: number; y: number }>;
  faction_id: string;
  color: string;
  label: string | null;
  z_order: number;
  created_at: number;
}

export interface MapCanvasProps {
  /** Map data to display */
  mapData: MapImage;
  /** Pins to render on the map */
  pins?: MapPin[];
  /** Faction regions to render on the map */
  regions?: FactionRegion[];
  /** Container width (defaults to 800px) */
  width?: number;
  /** Container height (defaults to 600px) */
  height?: number;
  /** Callback when a pin is clicked */
  onPinClick?: (pin: MapPin) => void;
  /** Callback when a region is clicked */
  onRegionClick?: (region: FactionRegion) => void;
  /** Whether the map is in edit mode (allows adding pins/regions) */
  editMode?: boolean;
  /** Callback when map canvas is clicked (for adding pins in edit mode) */
  onCanvasClick?: (x: number, y: number) => void;
  /** External zoom control (optional - uses internal state if not provided) */
  zoom?: number;
  /** Callback when zoom changes */
  onZoomChange?: (zoom: number) => void;
  /** Expose imperative methods via ref */
  canvasRef?: React.MutableRefObject<{ resetView: () => void; zoomIn: () => void; zoomOut: () => void } | null>;
}

const MapCanvas: React.FC<MapCanvasProps> = ({
  mapData,
  pins = [],
  regions = [],
  width = 800,
  height = 600,
  onPinClick,
  onRegionClick,
  editMode = false,
  onCanvasClick,
  zoom,
  onZoomChange,
  canvasRef,
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [internalScale, setInternalScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const stageRef = useRef<any>(null);

  // Use external zoom if provided, otherwise use internal state
  const stageScale = zoom !== undefined ? zoom : internalScale;

  /**
   * Load base64 image into HTML Image element for Konva
   */
  useEffect(() => {
    if (!mapData?.data) {
      setImage(null);
      return;
    }

    const img = new window.Image();
    img.src = mapData.data;

    img.onload = () => {
      setImage(img);
      // Calculate initial scale to fit image in viewport
      const scaleX = width / mapData.width;
      const scaleY = height / mapData.height;
      const initialScale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
      setStageScale(initialScale);
      // Center the image
      setStagePosition({
        x: (width - mapData.width * initialScale) / 2,
        y: (height - mapData.height * initialScale) / 2,
      });
    };

    img.onerror = () => {
      console.error('Failed to load map image');
      setImage(null);
    };
  }, [mapData, width, height]);

  /**
   * Handle zoom via mouse wheel
   */
  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();

    // Calculate mouse position relative to stage
    const mousePointTo = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale,
    };

    // Zoom factor (10% per scroll)
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Clamp scale between 0.1x and 5x
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    // Calculate new position to zoom towards mouse
    const newPosition = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    if (zoom !== undefined && onZoomChange) {
      onZoomChange(clampedScale); // Controlled
    } else {
      setInternalScale(clampedScale); // Uncontrolled
    }
    setStagePosition(newPosition);
  };

  /**
   * Handle Stage drag (pan)
   */
  const handleDragEnd = (e: any) => {
    setStagePosition({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  /**
   * Handle canvas click (for adding pins/regions in edit mode)
   */
  const handleStageClick = (e: any) => {
    // Only handle clicks if in edit mode
    if (!editMode || !onCanvasClick) return;

    const target = e.target;
    // If clicking on a pin or region (Groups), don't treat as canvas click
    // Allow clicks on Image (map background) and Layer
    const targetClassName = target.getClassName();
    if (targetClassName === 'Group' || targetClassName === 'Circle' || targetClassName === 'Line') {
      return; // Clicked on a pin or region
    }

    // Get click position relative to the map image
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    const x = (pointer.x - stagePosition.x) / stageScale;
    const y = (pointer.y - stagePosition.y) / stageScale;

    // Only trigger if within map bounds
    if (x >= 0 && x <= mapData.width && y >= 0 && y <= mapData.height) {
      onCanvasClick(Math.round(x), Math.round(y));
    }
  };

  /**
   * Reset view to fit map in viewport
   */
  const resetView = () => {
    if (!mapData) return;
    const scaleX = width / mapData.width;
    const scaleY = height / mapData.height;
    const initialScale = Math.min(scaleX, scaleY, 1);

    if (zoom !== undefined && onZoomChange) {
      onZoomChange(initialScale); // Controlled
    } else {
      setInternalScale(initialScale); // Uncontrolled
    }

    setStagePosition({
      x: (width - mapData.width * initialScale) / 2,
      y: (height - mapData.height * initialScale) / 2,
    });
  };

  /**
   * Zoom in (increase scale by 20%)
   */
  const zoomIn = () => {
    const newScale = Math.min(stageScale * 1.2, 5);
    if (zoom !== undefined && onZoomChange) {
      onZoomChange(newScale); // Controlled
    } else {
      setInternalScale(newScale); // Uncontrolled
    }
  };

  /**
   * Zoom out (decrease scale by 20%)
   */
  const zoomOut = () => {
    const newScale = Math.max(stageScale / 1.2, 0.1);
    if (zoom !== undefined && onZoomChange) {
      onZoomChange(newScale); // Controlled
    } else {
      setInternalScale(newScale); // Uncontrolled
    }
  };

  // Expose imperative methods via ref for parent component
  useEffect(() => {
    if (canvasRef) {
      canvasRef.current = {
        resetView,
        zoomIn,
        zoomOut,
      };
    }
  }, [mapData, width, height, stageScale, canvasRef]);

  if (!image) {
    return (
      <div className="map-canvas-loading" style={{ width, height }}>
        {mapData ? 'Loading map...' : 'No map selected'}
      </div>
    );
  }

  return (
    <div className="map-canvas-wrapper" style={{ width, height }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePosition.x}
        y={stagePosition.y}
        draggable={true} // Always allow panning
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onClick={handleStageClick}
      >
        {/* Layer 0: Map Image */}
        <Layer>
          <KonvaImage
            image={image}
            width={mapData.width}
            height={mapData.height}
          />
        </Layer>

        {/* Layer 1: Faction Regions (polygons under pins) */}
        <Layer>
          {regions.map((region) => (
            <FactionRegion
              key={region.id}
              region={region}
              onClick={() => onRegionClick?.(region)}
            />
          ))}
        </Layer>

        {/* Layer 2: Map Pins (clickable markers on top) */}
        <Layer>
          {pins.map((pin) => (
            <MapPin
              key={pin.id}
              pin={pin}
              onClick={() => onPinClick?.(pin)}
            />
          ))}
        </Layer>
      </Stage>

      {/* Overlay controls */}
      <div className="map-canvas-info">
        <div className="map-canvas-zoom-level">
          {Math.round(stageScale * 100)}%
        </div>
        <button
          className="map-canvas-reset-button"
          onClick={resetView}
          title="Reset View"
        >
          ⟲ Reset
        </button>
      </div>
    </div>
  );
};

export default MapCanvas;
