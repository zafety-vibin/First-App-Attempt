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
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useDroppable } from '@dnd-kit/core';
import './GeographicNavigatorPage.css';

interface ScaleNode {
  id: string; // Graph node ID
  name: string;
  location_type: string;
  parent_location_id: string | null;
  map_pin_x: number | null;
  map_pin_y: number | null;
  has_map: boolean;
  child_count: number;
  location_exists?: boolean; // Whether this node has a corresponding location in database
  location_id?: string | null; // Actual location table ID (different from graph node ID)
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
  const [selectedMapIndex, setSelectedMapIndex] = useState(0); // For map selector
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single'); // Map view mode
  const mapCanvasRef = useRef<{ resetView: () => void; zoomIn: () => void; zoomOut: () => void } | null>(null);
  const [activeNode, setActiveNode] = useState<ScaleNode | null>(null); // Currently dragging node
  const [mapZoom, setMapZoom] = useState(1); // Track MapCanvas zoom for pin overlay sync
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 }); // Track MapCanvas position
  const [allNodes, setAllNodes] = useState<ScaleNode[]>([]); // Cache all geographic nodes
  const [graphId, setGraphId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh when incremented
  const [locationCache, setLocationCache] = useState<Map<string, ParentLocation>>(new Map()); // Cache parent locations with maps

  /**
   * Load entire geographic hierarchy once on mount
   */
  useEffect(() => {
    async function loadGeographicData() {
      if (!campaignId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get(`/campaigns/${campaignId}/geographic/hierarchy`);
        setGraphId(response.data.graph_id);

        // Flatten tree to get all nodes
        const flattenTree = (nodes: any[]): ScaleNode[] => {
          let result: ScaleNode[] = [];
          for (const item of nodes) {
            result.push(item.node);
            if (item.children && item.children.length > 0) {
              result = result.concat(flattenTree(item.children));
            }
          }
          return result;
        };

        const nodes = flattenTree(response.data.tree || []);
        setAllNodes(nodes);

        // If we have a current position, maintain it; otherwise show root
        if (currentParentId) {
          updateCurrentView(currentParentId, nodes);
        } else {
          updateCurrentView(null, nodes);
        }
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

    loadGeographicData();
  }, [campaignId, refreshKey]); // Reload when refreshKey changes

  /**
   * Update current view based on parent (client-side, instant)
   */
  const updateCurrentView = async (parentId: string | null, nodes: ScaleNode[] = allNodes) => {
    // Filter to children of current parent
    const children = nodes.filter(n => n.parent_location_id === (parentId || null));

    // Fetch location data for these children to check which exist in database
    let childrenLocations: any[] = [];
    if (children.length > 0) {
      try {
        // Use correct category endpoint (apiClient already has /api base)
        const locResponse = await apiClient.get(`/locations`, {
          params: {
            campaign_id: campaignId,
            limit: 1000
          }
        });
        childrenLocations = locResponse.data.data || []; // Response has data.data structure
      } catch (err) {
        console.warn('Could not fetch locations for existence check:', err);
      }
    }

    // Count children for each node and check if location exists
    const childrenWithCounts = children.map(child => {
      // Match by name (case-insensitive, trimmed)
      const matchedLocation = childrenLocations.find((loc: any) =>
        loc.name?.trim().toLowerCase() === child.name?.trim().toLowerCase()
      );
      const locationExists = !!matchedLocation;
      console.log(`Checking "${child.name}":`, locationExists ? '✓ exists' : '✗ not found');
      return {
        ...child,
        child_count: nodes.filter(n => n.parent_location_id === child.id).length,
        location_exists: locationExists,
        location_id: matchedLocation?.id || null, // Store actual location table ID
      };
    });

    // Sort: most children last (bottom of ring)
    childrenWithCounts.sort((a, b) => a.child_count - b.child_count);

    setCurrentNodes(childrenWithCounts);

    // Fetch parent location data if needed (with caching)
    if (parentId) {
      // Check cache first
      if (locationCache.has(parentId)) {
        setParentLocation(locationCache.get(parentId) || null);
      } else {
        // Fetch and cache
        try {
          const response = await apiClient.get(`/campaigns/${campaignId}/geographic/scale/${parentId}`);
          const parentLoc = response.data.parent_location || null;
          if (parentLoc) {
            setLocationCache(new Map(locationCache.set(parentId, parentLoc)));
          }
          setParentLocation(parentLoc);
        } catch (err) {
          setParentLocation(null);
        }
      }
    } else {
      setParentLocation(null);
    }
  };

  /**
   * Update view when parent changes (most navigation is instant now)
   */
  useEffect(() => {
    if (allNodes.length > 0) {
      updateCurrentView(currentParentId, allNodes);
    }
  }, [currentParentId]);

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
   * Handle drag start - track which node is being dragged
   */
  const handleDragStart = (event: DragStartEvent) => {
    const node = event.active.data.current?.node as ScaleNode;
    setActiveNode(node);
  };

  /**
   * Handle drag-drop to pin nodes to map coordinates
   */
  const handleNodeDrop = async (event: DragEndEvent) => {
    const { active, over, activatorEvent } = event;
    setActiveNode(null); // Clear dragging state

    if (!over || over.id !== 'map-drop-zone') return;

    const node = active.data.current?.node as ScaleNode;
    if (!node || !parentLocation || !parentLocation.maps[0]) return;

    // Check if node exists in locations database
    if (node.location_exists === false || !node.location_id) {
      alert(`"${node.name}" exists in your geographic graph but not in the Locations database.\n\nCreate it in Locations → Realms first, then try pinning again.`);
      return;
    }

    // Get mouse position from the drop event
    const mouseEvent = activatorEvent as MouseEvent;
    if (!mouseEvent) return;

    // Get the MapCanvas container to calculate relative coordinates
    const mapCanvas = document.querySelector('.spatial-map-mode canvas');
    if (!mapCanvas) return;

    const rect = mapCanvas.getBoundingClientRect();

    // Calculate position relative to canvas
    const canvasX = mouseEvent.clientX - rect.left;
    const canvasY = mouseEvent.clientY - rect.top;

    // Map coordinates are direct pixel positions on the image
    const mapX = Math.max(0, Math.round(canvasX));
    const mapY = Math.max(0, Math.round(canvasY));

    console.log('Dropping node:', node.name, 'at coordinates:', mapX, mapY);
    console.log('Using location ID:', node.location_id);

    try {
      // Save coordinates to backend using location table ID (not graph node ID!)
      await apiClient.put(`/locations/${node.location_id}/pin-coordinates`, {
        x: mapX,
        y: mapY,
      });

      // Force reload of geographic hierarchy to get updated coordinates
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Failed to pin node:', error);
      alert('Failed to pin node. Check console for details.');
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
  const canvasHeight = 650; // Balanced: large enough for maps, fits in viewport

  // Check if we should use map mode
  const hasParentMap = parentLocation && parentLocation.maps && parentLocation.maps.length > 0;

  // Separate pinned vs unpinned children
  const pinnedChildren = hasParentMap ? currentNodes.filter(n => n.map_pin_x !== null && n.map_pin_y !== null) : [];
  const unpinnedChildren = hasParentMap ? currentNodes.filter(n => n.map_pin_x === null || n.map_pin_y === null) : [];

  // Debug logging
  if (hasParentMap && currentNodes.length > 0) {
    console.log('Current nodes:', currentNodes.map(n => ({ name: n.name, map_pin_x: n.map_pin_x, map_pin_y: n.map_pin_y })));
    console.log('Pinned children count:', pinnedChildren.length);
    console.log('Pinned children data:', pinnedChildren);
    console.log('Unpinned children count:', unpinnedChildren.length);
    console.log('Overlay should render:', pinnedChildren.length > 0);
  }

  // Ring distribution for unpinned nodes or when no map
  const nodesToRender = hasParentMap ? unpinnedChildren : currentNodes;
  const nodePositions = calculateRingPositions(nodesToRender, canvasWidth, canvasHeight);

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleNodeDrop}>
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
          {/* Refresh button - reload data after creating locations elsewhere */}
          <button
            className="spatial-refresh-btn"
            onClick={() => setRefreshKey(k => k + 1)}
            title="Refresh geographic data"
          >
            🔄
          </button>
        </div>
        {hasParentMap ? (
          /* MAP MODE: Parent map with children as pins */
          <DroppableMapArea>
            <div className="spatial-map-mode">
            {/* Map Selector (if multiple maps) */}
            {parentLocation!.maps.length > 1 && (
              <div className="spatial-map-selector">
                <div className="spatial-view-toggle">
                  <button
                    className={`spatial-view-btn ${viewMode === 'single' ? 'active' : ''}`}
                    onClick={() => setViewMode('single')}
                    title="Single map view"
                  >
                    □
                  </button>
                  <button
                    className={`spatial-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid view (all maps)"
                  >
                    ▦
                  </button>
                </div>
                {viewMode === 'single' && (
                  <>
                    {parentLocation!.maps.map((map, idx) => (
                      <button
                        key={map.id}
                        className={`spatial-map-tab ${idx === selectedMapIndex ? 'active' : ''}`}
                        onClick={() => setSelectedMapIndex(idx)}
                      >
                        {map.name || `Map ${idx + 1}`}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
            {viewMode === 'single' ? (
              /* Single map view */
              <MapCanvas
                mapData={parentLocation!.maps[selectedMapIndex] || parentLocation!.maps[0]}
                pins={pinnedChildren.map(node => ({
                  id: node.id,
                  map_id: parentLocation!.maps[selectedMapIndex]?.id || parentLocation!.maps[0].id,
                  x: node.map_pin_x!,
                  y: node.map_pin_y!,
                  linked_entity_type: 'location' as const,
                  linked_entity_id: node.location_id || node.id,
                  icon: null,
                  color: '#10b981',
                  label: node.name,
                  created_at: Date.now(),
                }))}
                regions={parentLocation!.regions}
                width={canvasWidth}
                height={canvasHeight}
                editMode={false}
                canvasRef={mapCanvasRef}
                zoom={mapZoom}
                onZoomChange={setMapZoom}
                onPinClick={(pin) => {
                  // Find the node and navigate to it
                  const node = pinnedChildren.find(n => n.id === pin.id);
                  if (node && node.child_count > 0) {
                    handleNodeClick(node);
                  }
                }}
              />
            ) : (
              /* Grid view - all maps */
              <div className="spatial-map-grid">
                {parentLocation!.maps.map((map, idx) => (
                  <div key={map.id} className="spatial-grid-item">
                    <div className="spatial-grid-label">{map.name || `Map ${idx + 1}`}</div>
                    <MapCanvas
                      mapData={map}
                      pins={[]}
                      regions={[]}
                      width={Math.floor(canvasWidth / 2) - 20}
                      height={Math.floor(canvasHeight / 2) - 40}
                      editMode={false}
                    />
                  </div>
                ))}
              </div>
            )}
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
              location_exists: n.location_exists,
              location_id: n.location_id, // Pass through location table ID
            }))}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        )}

        {/* Drag Overlay - renders as pin circle to show exact placement */}
        <DragOverlay>
          {activeNode ? (
            <div className="spatial-drag-pin">
              <div className="spatial-drag-circle"></div>
              <div className="spatial-drag-tooltip">{activeNode.name}</div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};
