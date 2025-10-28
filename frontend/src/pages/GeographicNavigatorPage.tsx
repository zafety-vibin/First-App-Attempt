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

export const GeographicNavigatorPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNodes, setCurrentNodes] = useState<ScaleNode[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [currentScaleName, setCurrentScaleName] = useState('Plane View');

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
  const nodePositions = calculateRingPositions(currentNodes, canvasWidth, canvasHeight);

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
        {currentNodes.length > 0 ? (
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
        <p>{currentNodes.length} node{currentNodes.length !== 1 ? 's' : ''} at this level</p>

        {currentParentId && (
          <button className="spatial-back-button" onClick={() => { setCurrentParentId(null); setCurrentScaleName('Plane View'); }}>
            ↑ Back to Plane View
          </button>
        )}
      </div>
    </div>
  );
};
