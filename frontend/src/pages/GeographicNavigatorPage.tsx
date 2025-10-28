/**
 * Geographic Navigator Page (Spatial Redesign)
 * Feature: 021-create-a-geographic
 *
 * Scale-based spatial visualization of Geographic knowledge graph.
 * - Ring mode: Nodes distributed in circle (no parent map)
 * - Map mode: Parent map with children pinned to coordinates
 * - Unpinned sidebar: Drag-drop toolbox for placing nodes
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { Stage, Layer, Circle, Text, Image as KonvaImage } from 'react-konva';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import MapCanvas from '../components/maps/MapCanvas';
import MapControls from '../components/maps/MapControls';
import { UnpinnedSidebar } from '../components/navigator/UnpinnedSidebar';
import { DndContext, DragEndEvent, useDroppable } from '@dnd-kit/core';
import './GeographicNavigatorPage.css';

interface ScaleNode {
  id: string;
  name: string;
  location_type: string;
  parent_location_id: string | null;
  map_pin_x: number | null;
  map_pin_y: number | null;
  has_map: boolean;
  child_count: number;
}

interface ParentLocation {
  id: string;
  name: string;
  maps: Array<{
    id: string;
    name: string;
    data: string;
    width: number;
    height: number;
  }>;
  pins: any[];
  regions: any[];
}

// Droppable wrapper component for map
function DroppableMapArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'map-drop-zone',
  });

  return (
    <div
      ref={setNodeRef}
      className={`droppable-map-area ${isOver ? 'drop-over' : ''}`}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {children}
      {isOver && (
        <div className="drop-indicator">
          <div className="drop-indicator-content">
            📍 Drop here to pin node to map
          </div>
        </div>
      )}
    </div>
  );
}

export const GeographicNavigatorPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNodes, setCurrentNodes] = useState<ScaleNode[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [currentScaleName, setCurrentScaleName] = useState('Plane View');
  const [parentLocation, setParentLocation] = useState<ParentLocation | null>(null);
  const [zoom, setZoom] = useState(0.83); // Start zoomed out to fit all nodes
  const [stagePosition, setStagePosition] = useState({ x: 60, y: 80 }); // Pan right and down to center ellipse
  const stageRef = useRef<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /**
   * Load nodes at current scale
   */
  useEffect(() => {
    async function loadScale() {
      if (!campaignId) return;

      setLoading(true);
      setError(null);

      try {
        const endpoint = currentParentId
          ? `/campaigns/${campaignId}/geographic/scale/${currentParentId}`
          : `/campaigns/${campaignId}/geographic/scale`;

        const response = await apiClient.get(endpoint);
        setCurrentNodes(response.data.scale_nodes || []);
        setParentLocation(response.data.parent_location || null);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('Geographic knowledge graph not found. Create geographic nodes in your knowledge graphs first.');
        } else {
          setError(err.message || 'Failed to load geographic data');
        }
      } finally {
        setLoading(false);
      }
    }

    loadScale();
  }, [campaignId, currentParentId]);

  /**
   * Ellipse distribution algorithm
   * Nodes distributed in ellipse to use more viewport space
   * Node with most children at bottom
   */
  const calculateRingPositions = (nodes: ScaleNode[], canvasWidth: number, canvasHeight: number) => {
    if (nodes.length === 0) return [];

    const padding = 120; // Space for labels and child count badges
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Ellipse radii - use more horizontal space, less vertical
    const radiusX = Math.max(300, canvasWidth / 2 - padding); // Horizontal radius (wider)
    const radiusY = Math.max(150, canvasHeight / 3 - padding); // Vertical radius (much flatter)

    // Node with most children goes last (positioned at bottom)
    const angleStep = (2 * Math.PI) / nodes.length;
    const startAngle = -Math.PI / 2; // Start at top

    return nodes.map((node, index) => {
      const angle = startAngle + angleStep * index;
      const x = centerX + radiusX * Math.cos(angle);
      const y = centerY + radiusY * Math.sin(angle);

      return {
        node,
        x: Math.round(x),
        y: Math.round(y),
      };
    });
  };

  /**
   * Zoom controls
   */
  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 5));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.1));
  const handleResetView = () => {
    setZoom(0.83); // Reset to default zoomed-out view
    setStagePosition({ x: 60, y: 80 }); // Center ellipse (right and down)
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const newZoom = e.evt.deltaY < 0 ? zoom * scaleBy : zoom / scaleBy;
    setZoom(Math.max(0.1, Math.min(5, newZoom)));
  };

  const handleDragEnd = (e: any) => {
    setStagePosition({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  /**
   * Handle node click - zoom into that scale
   */
  const handleNodeClick = (node: ScaleNode) => {
    setCurrentParentId(node.id);
    setCurrentScaleName(`${node.name} View`);
    // Reset zoom and center when transitioning scales
    setZoom(0.83);
    setStagePosition({ x: 60, y: 80 });
  };

  /**
   * Handle drag-drop to pin nodes to map coordinates
   */
  const handleNodeDrop = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || over.id !== 'map-drop-zone') return;

    const node = active.data.current?.node as ScaleNode;
    if (!node) return;

    // Get drop coordinates (from drag delta)
    const { x, y } = event.delta;

    // Calculate map coordinates (accounting for zoom and pan)
    const mapX = Math.round((x - stagePosition.x) / zoom);
    const mapY = Math.round((y - stagePosition.y) / zoom);

    try {
      // Save coordinates to backend
      await apiClient.put(`/locations/${node.id}/pin-coordinates`, {
        x: Math.max(0, mapX),
        y: Math.max(0, mapY),
      });

      // Refresh the current scale to show updated positions
      const endpoint = currentParentId
        ? `/campaigns/${campaignId}/geographic/scale/${currentParentId}`
        : `/campaigns/${campaignId}/geographic/scale`;

      const response = await apiClient.get(endpoint);
      setCurrentNodes(response.data.scale_nodes || []);
      setParentLocation(response.data.parent_location || null);
    } catch (error) {
      console.error('Failed to pin node:', error);
    }
  };

  if (!campaignId) {
    return <div className="navigator-error">Campaign ID required</div>;
  }

  if (loading) {
    return (
      <div className="navigator-loading">
        <LoadingSpinner size="lg" />
        <p>Loading geographic hierarchy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="navigator-error">
        <h2>Geographic Navigator</h2>
        <p>{error}</p>
        <p className="navigator-error-hint">
          Create a "Geographical" knowledge graph and add location nodes with parent relationships to use the spatial navigator.
        </p>
      </div>
    );
  }

  const canvasWidth = 1400;
  const canvasHeight = 480; // Reduced to eliminate all scrolling

  // Check if we should use map mode
  const hasParentMap = parentLocation && parentLocation.maps && parentLocation.maps.length > 0;

  // Separate pinned vs unpinned children
  const pinnedChildren = hasParentMap ? currentNodes.filter(n => n.map_pin_x !== null && n.map_pin_y !== null) : [];
  const unpinnedChildren = hasParentMap ? currentNodes.filter(n => n.map_pin_x === null || n.map_pin_y === null) : [];

  // Ring distribution for unpinned nodes or when no map
  const nodesToRender = hasParentMap ? unpinnedChildren : currentNodes;
  const nodePositions = calculateRingPositions(nodesToRender, canvasWidth, canvasHeight);

  return (
    <DndContext onDragEnd={handleNodeDrop}>
      <div className="geographic-navigator-page">
      {/* Main Canvas */}
      <div className="spatial-canvas-wrapper">
        {/* Zoom Controls (floating) */}
        <div className="spatial-controls-group">
          <MapControls
            zoomLevel={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
          />
          {/* Upload map button - shows when viewing children of a node */}
          {currentParentId && (
            <button
              className="spatial-upload-icon-btn"
              onClick={() => {
                if (parentLocation) {
                  // Navigate to location's Maps tab
                  navigate(`/campaigns/${campaignId}/locations/${parentLocation.id}`);
                } else {
                  // Location doesn't exist yet - navigate to locations list to create it
                  alert(`"${currentScaleName.replace(' View', '')}" exists in your geographic graph but not in the Locations database.\n\nGo to Locations → Create "${currentScaleName.replace(' View', '')}" → Then upload maps from the Maps tab.`);
                }
              }}
              title={parentLocation ? "Upload map to this location" : "Location not in database yet"}
            >
              📤
            </button>
          )}
        </div>
        {hasParentMap ? (
          /* MAP MODE: Parent map with children as pins */
          <DroppableMapArea>
            <div className="spatial-map-mode">
            <MapCanvas
              mapData={parentLocation!.maps[0]}
              pins={[]}
              regions={parentLocation!.regions}
              width={canvasWidth}
              height={canvasHeight}
              editMode={false}
            />
            {/* Overlay pinned children as custom markers */}
            <Stage width={canvasWidth} height={canvasHeight} className="spatial-overlay-canvas">
              <Layer>
                {pinnedChildren.map((node) => (
                  <React.Fragment key={node.id}>
                    <Circle
                      x={node.map_pin_x!}
                      y={node.map_pin_y!}
                      radius={30}
                      fill="#10b981"
                      stroke="#065f46"
                      strokeWidth={3}
                      shadowColor="black"
                      shadowBlur={8}
                      shadowOpacity={0.4}
                      onClick={() => handleNodeClick(node)}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'pointer';
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'default';
                      }}
                    />
                    <Text
                      x={node.map_pin_x!}
                      y={node.map_pin_y! + 40}
                      text={node.name}
                      fontSize={12}
                      fontStyle="bold"
                      fill="#ffffff"
                      stroke="#000000"
                      strokeWidth={2}
                      align="center"
                      width={100}
                      offsetX={50}
                    />
                  </React.Fragment>
                ))}
              </Layer>
            </Stage>
            </div>
          </DroppableMapArea>
        ) : currentNodes.length > 0 ? (
          /* RING MODE: Circular distribution */
          <Stage
            width={canvasWidth}
            height={canvasHeight}
            scaleX={zoom}
            scaleY={zoom}
            x={stagePosition.x}
            y={stagePosition.y}
            draggable
            onWheel={handleWheel}
            onDragEnd={handleDragEnd}
            ref={stageRef}
          >
            <Layer>
              {/* Render nodes in ring */}
              {nodePositions.map(({ node, x, y }) => (
                <React.Fragment key={node.id}>
                  {/* Node circle */}
                  <Circle
                    x={x}
                    y={y}
                    radius={40}
                    fill="#3b82f6"
                    stroke="#1e40af"
                    strokeWidth={3}
                    shadowColor="black"
                    shadowBlur={10}
                    shadowOpacity={0.3}
                    onClick={() => handleNodeClick(node)}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'pointer';
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'default';
                    }}
                  />

                  {/* Node label (truncated if too long) */}
                  <Text
                    x={x}
                    y={y + 55}
                    text={node.name.length > 20 ? node.name.substring(0, 17) + '...' : node.name}
                    fontSize={14}
                    fontStyle="bold"
                    fill="#111827"
                    align="center"
                    width={120}
                    offsetX={60}
                    ellipsis={true}
                  />

                  {/* Map indicator */}
                  {node.has_map && (
                    <Text
                      x={x}
                      y={y}
                      text="🗺️"
                      fontSize={20}
                      align="center"
                      offsetX={10}
                      offsetY={10}
                    />
                  )}

                  {/* Child count badge */}
                  {node.child_count > 0 && (
                    <>
                      <Circle
                        x={x + 25}
                        y={y - 25}
                        radius={12}
                        fill="#10b981"
                        stroke="white"
                        strokeWidth={2}
                      />
                      <Text
                        x={x + 25}
                        y={y - 25}
                        text={node.child_count.toString()}
                        fontSize={10}
                        fontStyle="bold"
                        fill="white"
                        align="center"
                        width={24}
                        offsetX={12}
                        offsetY={5}
                      />
                    </>
                  )}
                </React.Fragment>
              ))}
            </Layer>
          </Stage>
        ) : (
          <div className="spatial-empty-state">
            <div className="spatial-empty-icon">🌍</div>
            <h3>No Geographic Nodes Found</h3>
            <p>Create a "Geographical" knowledge graph and add location nodes to begin building your spatial hierarchy.</p>
          </div>
        )}
      </div>

      {/* Info Panel with Breadcrumb */}
      <div className="spatial-info-panel">
        {/* Breadcrumb */}
        <div className="spatial-breadcrumb-inline">
          <button
            className="spatial-breadcrumb-btn"
            onClick={() => { setCurrentParentId(null); setCurrentScaleName('Plane View'); }}
          >
            Plane View
          </button>
          {currentScaleName !== 'Plane View' && (
            <>
              <span className="spatial-breadcrumb-sep"> → </span>
              <span className="spatial-breadcrumb-current">{currentScaleName}</span>
            </>
          )}
        </div>

        {/* Mode and Stats */}
        <div className="spatial-stats">
          {hasParentMap ? (
            <>
              <span className="spatial-mode-label">🗺️ Map Mode</span>
              <span className="spatial-stat-item">{pinnedChildren.length} pinned</span>
              {unpinnedChildren.length > 0 && (
                <span className="spatial-stat-item">{unpinnedChildren.length} unpinned</span>
              )}
            </>
          ) : (
            <>
              <span className="spatial-mode-label">⭕ Ellipse</span>
              <span className="spatial-stat-item">{currentNodes.length} node{currentNodes.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      </div>

        {/* Unpinned Sidebar (only show in map mode with unpinned children) */}
        {hasParentMap && unpinnedChildren.length > 0 && (
          <UnpinnedSidebar
            nodes={unpinnedChildren.map(n => ({
              id: n.id,
              name: n.name,
              location_type: n.location_type,
              child_count: n.child_count || 0,
            }))}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        )}
      </div>
    </DndContext>
  );
};
