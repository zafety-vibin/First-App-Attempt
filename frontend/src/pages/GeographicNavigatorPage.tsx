/**
 * Geographic Navigator Page (Spatial Redesign)
 * Feature: 021-create-a-geographic
 *
 * Scale-based spatial visualization of Geographic knowledge graph.
 * - Ring mode: Nodes distributed in circle (no parent map)
 * - Map mode: Parent map with children pinned to coordinates
 * - Unpinned sidebar: Drag-drop toolbox for placing nodes
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { Stage, Layer, Circle, Text, Image as KonvaImage } from 'react-konva';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import MapCanvas from '../components/maps/MapCanvas';
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

export const GeographicNavigatorPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNodes, setCurrentNodes] = useState<ScaleNode[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [currentScaleName, setCurrentScaleName] = useState('Plane View');
  const [parentLocation, setParentLocation] = useState<ParentLocation | null>(null);

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
   * Ring distribution algorithm
   * Nodes distributed in circle, node with most children at bottom
   */
  const calculateRingPositions = (nodes: ScaleNode[], canvasWidth: number, canvasHeight: number) => {
    if (nodes.length === 0) return [];

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const radius = Math.min(canvasWidth, canvasHeight) * 0.35;

    // Node with most children goes last (positioned at bottom)
    const angleStep = (2 * Math.PI) / nodes.length;
    const startAngle = -Math.PI / 2; // Start at top

    return nodes.map((node, index) => {
      const angle = startAngle + angleStep * index;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      return {
        node,
        x: Math.round(x),
        y: Math.round(y),
      };
    });
  };

  /**
   * Handle node click - zoom into that scale
   */
  const handleNodeClick = (node: ScaleNode) => {
    setCurrentParentId(node.id);
    setCurrentScaleName(`${node.name} View`);
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
  const canvasHeight = 900;

  // Check if we should use map mode
  const hasParentMap = parentLocation && parentLocation.maps && parentLocation.maps.length > 0;

  // Separate pinned vs unpinned children
  const pinnedChildren = hasParentMap ? currentNodes.filter(n => n.map_pin_x !== null && n.map_pin_y !== null) : [];
  const unpinnedChildren = hasParentMap ? currentNodes.filter(n => n.map_pin_x === null || n.map_pin_y === null) : [];

  // Ring distribution for unpinned nodes or when no map
  const nodesToRender = hasParentMap ? unpinnedChildren : currentNodes;
  const nodePositions = calculateRingPositions(nodesToRender, canvasWidth, canvasHeight);

  return (
    <div className="geographic-navigator-page">
      {/* Breadcrumb */}
      <div className="spatial-breadcrumb">
        <button onClick={() => { setCurrentParentId(null); setCurrentScaleName('Plane View'); }}>
          Plane View
        </button>
        {currentScaleName !== 'Plane View' && (
          <>
            <span> → </span>
            <span className="spatial-breadcrumb-current">{currentScaleName}</span>
          </>
        )}
      </div>

      {/* Main Canvas */}
      <div className="spatial-canvas-wrapper">
        {hasParentMap ? (
          /* MAP MODE: Parent map with children as pins */
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
        ) : currentNodes.length > 0 ? (
          /* RING MODE: Circular distribution */
          <Stage width={canvasWidth} height={canvasHeight}>
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

                  {/* Node label */}
                  <Text
                    x={x}
                    y={y + 55}
                    text={node.name}
                    fontSize={14}
                    fontStyle="bold"
                    fill="#111827"
                    align="center"
                    width={120}
                    offsetX={60}
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

      {/* Info Panel */}
      <div className="spatial-info-panel">
        <h3>Scale: {currentScaleName}</h3>
        {hasParentMap ? (
          <>
            <p className="spatial-mode-label">🗺️ Map Mode</p>
            <p>{pinnedChildren.length} pinned on map</p>
            {unpinnedChildren.length > 0 && (
              <p>{unpinnedChildren.length} unpinned (in sidebar)</p>
            )}
          </>
        ) : (
          <>
            <p className="spatial-mode-label">⭕ Ring Mode</p>
            <p>{currentNodes.length} node{currentNodes.length !== 1 ? 's' : ''} at this level</p>
          </>
        )}

        {currentParentId && (
          <button className="spatial-back-button" onClick={() => { setCurrentParentId(null); setCurrentScaleName('Plane View'); }}>
            ↑ Back to Plane View
          </button>
        )}
      </div>
    </div>
  );
};
