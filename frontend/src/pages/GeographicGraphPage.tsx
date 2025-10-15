/**
 * Feature 006: Geographic Memory Graph Page - Yggdrasil Visualization
 * Infinite viewport canvas with radial tree layout
 * Confidence = "Will this location be used again?"
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Plus, ArrowLeft, Trash2, Edit2, RefreshCw } from 'lucide-react';
import CytoscapeComponent from 'react-cytoscapejs';
import Cytoscape from 'cytoscape';
import { graphService } from '../services/graphService';
import { graphNodeService } from '../services/graphNodeService';
import { graphEdgeService } from '../services/graphEdgeService';
import { GraphNode, GraphEdge } from '../types/graph';
import ConfidenceBadge from '../components/common/ConfidenceBadge';
import { TagInput } from '../components/form/TagInput';
import './GeographicGraphPage.css';

interface YggdrasilNode extends GraphNode {
  children?: YggdrasilNode[];
}

const GeographicGraphPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [graphId, setGraphId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Location form modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationFormMode, setLocationFormMode] = useState<'create' | 'edit'>('create');
  const [parentNodeForCreate, setParentNodeForCreate] = useState<GraphNode | null>(null);
  const [nodeToEdit, setNodeToEdit] = useState<GraphNode | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location_type: 'plane' as string,
    relationship_description: '',
    tags: [] as string[]
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Observations modal state
  const [showObservationsModal, setShowObservationsModal] = useState(false);
  const [newObservationText, setNewObservationText] = useState('');
  const [observationsSubmitting, setObservationsSubmitting] = useState(false);

  // Relationship modal state
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [relationshipText, setRelationshipText] = useState('');
  const [relationshipSubmitting, setRelationshipSubmitting] = useState(false);

  // Custom edge creation state
  const [addEdgeMode, setAddEdgeMode] = useState(false);
  const [edgeSourceNode, setEdgeSourceNode] = useState<GraphNode | null>(null);
  const [showEdgeModal, setShowEdgeModal] = useState(false);
  const [edgeTargetNode, setEdgeTargetNode] = useState<GraphNode | null>(null);
  const [edgeRelationType, setEdgeRelationType] = useState('');
  const [edgeSubmitting, setEdgeSubmitting] = useState(false);

  useEffect(() => {
    if (campaignId) {
      loadGeographicGraph();
    }
  }, [campaignId]);

  const loadGeographicGraph = async () => {
    if (!campaignId) return;

    setLoading(true);
    setError(null);

    try {
      const graphs = await graphService.listGraphs(campaignId);
      let geoGraph = graphs.find(g => g.graph_type === 'Geographical');

      if (!geoGraph) {
        geoGraph = await graphService.createGraph(campaignId, {
          graph_type: 'Geographical',
          graph_name: 'Geographic Memory',
          toggle_state: true
        });
      }

      setGraphId(geoGraph.id);
      await loadNodes(geoGraph.id);
    } catch (err) {
      console.error('Failed to load geographic graph:', err);
      setError('Failed to load geographic memory');
    } finally {
      setLoading(false);
    }
  };

  const loadNodes = async (gId: string) => {
    if (!campaignId || !gId) return;

    try {
      const fetchedNodes = await graphNodeService.listNodes(campaignId, gId);
      const fetchedEdges = await graphEdgeService.listEdges(campaignId, gId);
      setNodes(fetchedNodes);
      setEdges(fetchedEdges);
    } catch (err) {
      console.error('Failed to load nodes:', err);
      setError('Failed to load location nodes');
    }
  };

  // Build hierarchical tree structure
  const buildHierarchy = (flatNodes: GraphNode[]): YggdrasilNode[] => {
    const nodeMap = new Map<string, YggdrasilNode>();
    const rootNodes: YggdrasilNode[] = [];

    flatNodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    flatNodes.forEach(node => {
      const treeNode = nodeMap.get(node.id)!;
      const parentId = node.attributes?.parent_location_id;

      if (parentId && nodeMap.has(parentId)) {
        const parent = nodeMap.get(parentId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(treeNode);
      } else {
        rootNodes.push(treeNode);
      }
    });

    return rootNodes;
  };

  // Count all descendants recursively
  const countDescendants = (node: YggdrasilNode): number => {
    if (!node.children || node.children.length === 0) return 0;

    let count = node.children.length;
    node.children.forEach(child => {
      count += countDescendants(child);
    });

    return count;
  };

  // Calculate node size based on descendant count (logarithmic scale)
  const calculateNodeSize = (descendantCount: number): number => {
    const baseSize = 40;
    const scaleFactor = 15;
    return baseSize + (Math.log(descendantCount + 1) * scaleFactor);
  };

  // Yggdrasil layout: radial root + perpendicular trees
  const calculateNodePositions = (rootNodes: YggdrasilNode[]) => {
    const positions: Array<{ id: string; x: number; y: number; size: number }> = [];
    // FIXED circle radius - don't calculate, DEFINE it
    const FIXED_CIRCLE_RADIUS = 300;
    const centerX = 0;
    const centerY = 0;
    const verticalSpacing = 120;
    const horizontalSpacing = 100;

    // Find Material Plane for special positioning at 270° (straight down)
    const materialPlaneIndex = rootNodes.findIndex(
      node => node.name.toLowerCase().includes('material')
    );

    // Distribute ALL root nodes evenly around the circle RELATIVE to Material Plane
    const totalRoots = rootNodes.length;
    const angleStep = (2 * Math.PI) / totalRoots;

    rootNodes.forEach((rootNode, index) => {
      const descendantCount = countDescendants(rootNode);
      const rootSize = calculateNodeSize(descendantCount);

      // Calculate circle position relative to Material Plane
      let circlePosition: number;

      if (materialPlaneIndex !== -1) {
        // Material Plane is at circle position 0
        if (index === materialPlaneIndex) {
          circlePosition = 0;
        } else {
          // Other nodes get positions 1, 2, 3, etc. based on their array order
          // If they come before Material in the array, they get positions 1, 2, ...
          // If they come after Material, they continue from where before-Material left off
          if (index < materialPlaneIndex) {
            circlePosition = index + 1;
          } else {
            circlePosition = index; // index > materialPlaneIndex, so this gives correct offset
          }
        }
      } else {
        // No Material Plane, use array index as circle position
        circlePosition = index;
      }

      // Calculate angle: Material Plane at 90° (bottom), others evenly distributed clockwise
      // angle = 90° + (circlePosition × angularStep)
      const angle = (Math.PI / 2) + (circlePosition * angleStep);

      // Position on the FIXED circle
      const rootX = centerX + FIXED_CIRCLE_RADIUS * Math.cos(angle);
      const rootY = centerY + FIXED_CIRCLE_RADIUS * Math.sin(angle);

      positions.push({
        id: rootNode.id,
        x: rootX,
        y: rootY,
        size: rootSize
      });

      // Calculate perpendicular extension direction
      let dirX: number;
      let dirY: number;

      if (materialPlaneIndex !== -1 && index === materialPlaneIndex) {
        // Material Plane: STRAIGHT DOWN (bearing 180° / south)
        dirX = 0;
        dirY = 1; // Positive Y = down in Cytoscape
      } else {
        // Other planes: extend perpendicular to radius (outward from circle)
        // Perpendicular = radius angle direction (outward from center)
        dirX = Math.cos(angle);
        dirY = Math.sin(angle);
      }

      // Layout children in the calculated direction
      if (rootNode.children && rootNode.children.length > 0) {
        layoutChildren(rootNode.children, rootX, rootY, dirX, dirY, 1, positions, verticalSpacing, horizontalSpacing);
      }
    });

    return positions;
  };

  const layoutChildren = (
    children: YggdrasilNode[],
    parentX: number,
    parentY: number,
    dirX: number,
    dirY: number,
    level: number,
    positions: Array<{ id: string; x: number; y: number; size: number }>,
    verticalSpacing: number,
    horizontalSpacing: number
  ) => {
    children.forEach((child, index) => {
      const descendantCount = countDescendants(child);
      const childSize = calculateNodeSize(descendantCount);

      // Position along perpendicular direction
      const distance = verticalSpacing * level;
      const offset = (index - (children.length - 1) / 2) * horizontalSpacing;

      // Main direction + lateral offset (perpendicular to direction)
      const childX = parentX + dirX * distance + (-dirY) * offset;
      const childY = parentY + dirY * distance + dirX * offset;

      positions.push({
        id: child.id,
        x: childX,
        y: childY,
        size: childSize
      });

      // Recursively layout grandchildren
      if (child.children && child.children.length > 0) {
        layoutChildren(child.children, childX, childY, dirX, dirY, level + 1, positions, verticalSpacing, horizontalSpacing);
      }
    });
  };

  // Build Cytoscape elements
  const cytoscapeElements = useMemo(() => {
    if (nodes.length === 0) return [];

    const hierarchy = buildHierarchy(nodes);
    const positions = calculateNodePositions(hierarchy);

    const elements: cytoscape.ElementDefinition[] = [];

    // Add nodes
    nodes.forEach(node => {
      const pos = positions.find(p => p.id === node.id);
      const size = pos?.size || 40;

      elements.push({
        data: {
          id: node.id,
          label: node.name,
          node_type: node.attributes?.location_type || 'unknown',
          confidence: node.confidence || 1.0,
          is_pinned: node.is_pinned,
          size: size,
          nodeData: node
        },
        position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
        classes: node.is_pinned ? 'pinned' : ''
      });
    });

    // Add hierarchical edges (parent-child relationships)
    nodes.forEach(node => {
      const parentId = node.attributes?.parent_location_id;
      if (parentId) {
        elements.push({
          data: {
            id: `edge-${parentId}-${node.id}`,
            source: parentId,
            target: node.id
          },
          classes: 'hierarchical-edge'
        });
      }
    });

    // Add custom edges (non-hierarchical relationships)
    edges.forEach(edge => {
      elements.push({
        data: {
          id: `custom-edge-${edge.id}`,
          source: edge.source_node_id,
          target: edge.target_node_id,
          label: (edge as any).edge_type || edge.relationship_type,
          edgeData: edge
        },
        classes: 'custom-edge'
      });
    });

    return elements;
  }, [nodes, edges]);

  // Helper function to get colors by location type
  const getLocationColors = (locationType: string) => {
    const colorMap: Record<string, { bg: {r: number, g: number, b: number}, border: string, outline: string }> = {
      'plane': { bg: { r: 139, g: 92, b: 246 }, border: '#a78bfa', outline: '#5b21b6' },
      'world': { bg: { r: 59, g: 130, b: 246 }, border: '#60a5fa', outline: '#1e3a8a' },
      'continent': { bg: { r: 34, g: 197, b: 94 }, border: '#4ade80', outline: '#14532d' },
      'region': { bg: { r: 234, g: 179, b: 8 }, border: '#fbbf24', outline: '#854d0e' },
      'settlement': { bg: { r: 251, g: 146, b: 60 }, border: '#fb923c', outline: '#9a3412' },
      'building': { bg: { r: 239, g: 68, b: 68 }, border: '#f87171', outline: '#7f1d1d' }
    };
    return colorMap[locationType] || { bg: { r: 15, g: 145, b: 58 }, border: '#22c55e', outline: '#0f4c3a' };
  };

  // Cytoscape stylesheet - Yggdrasil theme with location_type color-coding
  const cytoscapeStylesheet: cytoscape.Stylesheet[] = [
    {
      selector: 'node',
      style: {
        'background-color': (ele: any) => {
          const locationType = ele.data('node_type');
          const confidence = ele.data('confidence');
          const colors = getLocationColors(locationType);

          // Adjust brightness based on confidence (darker = lower confidence)
          const brightness = 0.6 + (confidence * 0.4); // 60-100% brightness
          const r = Math.floor(colors.bg.r * brightness);
          const g = Math.floor(colors.bg.g * brightness);
          const b = Math.floor(colors.bg.b * brightness);

          return `rgb(${r}, ${g}, ${b})`;
        },
        'background-opacity': 0.95,
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#ffffff',
        'font-size': '14px',
        'font-weight': '600',
        'text-outline-width': 2,
        'text-outline-color': (ele: any) => {
          const locationType = ele.data('node_type');
          const colors = getLocationColors(locationType);
          return colors.outline;
        },
        'text-wrap': 'wrap',
        'text-max-width': '120px',
        'border-width': 3,
        'border-color': (ele: any) => {
          const locationType = ele.data('node_type');
          const colors = getLocationColors(locationType);
          return colors.border;
        },
        'width': 'data(size)',
        'height': 'data(size)',
        'shape': 'roundrectangle'
      } as any
    },
    {
      selector: 'node.pinned',
      style: {
        'border-color': '#fbbf24',
        'border-width': 4,
        'box-shadow': '0 0 20px #fbbf24'
      }
    },
    {
      selector: 'edge.hierarchical-edge',
      style: {
        'width': 3,
        'line-color': '#4ade80',
        'target-arrow-color': '#4ade80',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'opacity': 0.7
      }
    },
    {
      selector: 'edge.custom-edge',
      style: {
        'width': 4,
        'line-color': '#a855f7', // Purple for custom relationships
        'target-arrow-color': '#a855f7',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'opacity': 0.8,
        'label': 'data(label)',
        'font-size': '12px',
        'text-rotation': 'autorotate',
        'color': '#ffffff',
        'text-background-color': '#1e293b',
        'text-background-opacity': 0.9,
        'text-background-padding': '4px',
        'text-background-shape': 'roundrectangle'
      } as any
    },
    {
      selector: 'node:selected',
      style: {
        'border-color': '#667eea',
        'border-width': 5,
        'background-opacity': 1,
        'box-shadow': '0 0 30px #667eea'
      }
    }
  ];

  const handleNodeClick = useCallback((event: any) => {
    const nodeData = event.target.data('nodeData');

    // If in add edge mode, handle node selection for edge creation
    if (addEdgeMode) {
      if (!edgeSourceNode) {
        // First click: select source node
        setEdgeSourceNode(nodeData);
      } else if (edgeSourceNode.id === nodeData.id) {
        // Clicking same node: deselect
        setEdgeSourceNode(null);
      } else {
        // Second click: select target node and open modal
        setEdgeTargetNode(nodeData);
        setShowEdgeModal(true);
      }
    } else {
      // Normal mode: show details panel
      setSelectedNode(nodeData);
    }
  }, [addEdgeMode, edgeSourceNode]);

  const handleAddChild = (parentNode: GraphNode | null) => {
    setParentNodeForCreate(parentNode);
    setLocationFormMode('create');
    setFormData({
      name: '',
      location_type: parentNode ? 'world' : 'plane',
      relationship_description: '',
      tags: []
    });
    setShowLocationModal(true);
  };

  const handleEditNode = (node: GraphNode) => {
    setNodeToEdit(node);
    setLocationFormMode('edit');
    const tags = node.attributes?.tags || [];
    setFormData({
      name: node.name,
      location_type: node.attributes?.location_type || 'plane',
      relationship_description: node.attributes?.relationship_description || '',
      tags: Array.isArray(tags) ? tags : []
    });
    setShowLocationModal(true);
  };

  const handleSubmitLocationForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaignId || !graphId) return;

    const name = formData.name.trim();
    if (!name) {
      alert('Please enter a location name');
      return;
    }

    setFormSubmitting(true);

    try {
      if (locationFormMode === 'create') {
        await graphNodeService.createNode(campaignId, graphId, {
          name: name,
          node_type: 'Location',
          attributes: {
            location_type: formData.location_type,
            parent_location_id: parentNodeForCreate?.id || null,
            relationship_description: formData.relationship_description.trim() || null,
            tags: formData.tags
          },
          confidence: 1.0,
          is_pinned: false
        });
      } else if (locationFormMode === 'edit' && nodeToEdit) {
        await graphNodeService.updateNode(campaignId, graphId, nodeToEdit.id, {
          name: name,
          attributes: {
            ...nodeToEdit.attributes,
            location_type: formData.location_type,
            relationship_description: formData.relationship_description.trim() || null,
            tags: formData.tags
          }
        });
      }

      await loadNodes(graphId);

      setShowLocationModal(false);
      setFormData({ name: '', location_type: 'plane', relationship_description: '', tags: [] });
      setParentNodeForCreate(null);
      setNodeToEdit(null);
    } catch (err) {
      console.error('Failed to save location:', err);
      alert('Failed to save location. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteNode = async (node: GraphNode) => {
    if (!campaignId || !graphId) return;

    if (!confirm(`Are you sure you want to delete "${node.name}"?`)) return;

    try {
      await graphNodeService.deleteNode(campaignId, graphId, node.id);
      await loadNodes(graphId);

      if (selectedNode?.id === node.id) {
        setSelectedNode(null);
      }
    } catch (err) {
      console.error('Failed to delete location:', err);
      alert('Failed to delete location. Please try again.');
    }
  };

  const handlePinNode = async (node: GraphNode) => {
    if (!campaignId || !graphId) return;

    try {
      if (node.is_pinned) {
        await graphService.unpinNode(campaignId, graphId, node.id);
      } else {
        await graphService.pinNode(campaignId, graphId, node.id);
      }

      await loadNodes(graphId);

      if (selectedNode?.id === node.id) {
        setSelectedNode(prev => prev ? { ...prev, is_pinned: !prev.is_pinned } : null);
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleResetView = () => {
    if (!cyRef.current) {
      console.error('cyRef.current is null! Cannot reset view.');
      return;
    }

    const cy = cyRef.current;

    // Recalculate Yggdrasil layout positions
    const hierarchy = buildHierarchy(nodes);
    const positions = calculateNodePositions(hierarchy);

    // Batch the updates for better performance
    cy.batch(() => {
      positions.forEach(pos => {
        const node = cy.getElementById(pos.id);
        if (node.length > 0) {
          node.position({ x: pos.x, y: pos.y });
        }
      });
    });

    // Fit viewport to show all nodes
    setTimeout(() => {
      cy.fit(undefined, 50);
    }, 100);
  };

  const handleEditObservations = (node: GraphNode) => {
    setShowObservationsModal(true);
  };

  const handleEditRelationship = (node: GraphNode) => {
    setRelationshipText(node.attributes?.relationship_description || '');
    setShowRelationshipModal(true);
  };

  const handleSaveRelationship = async () => {
    if (!campaignId || !graphId || !selectedNode) return;

    setRelationshipSubmitting(true);

    try {
      await graphNodeService.updateNode(campaignId, graphId, selectedNode.id, {
        attributes: {
          ...selectedNode.attributes,
          relationship_description: relationshipText.trim() || null
        }
      });

      await loadNodes(graphId);

      // Update selected node
      setSelectedNode(prev => prev ? {
        ...prev,
        attributes: {
          ...prev.attributes,
          relationship_description: relationshipText.trim() || null
        }
      } : null);

      setShowRelationshipModal(false);
      setRelationshipText('');
    } catch (err) {
      console.error('Failed to save relationship:', err);
      alert('Failed to save relationship. Please try again.');
    } finally {
      setRelationshipSubmitting(false);
    }
  };

  const handleAddObservation = async () => {
    if (!campaignId || !graphId || !selectedNode) return;

    const text = newObservationText.trim();
    if (!text) {
      alert('Please enter an observation');
      return;
    }

    setObservationsSubmitting(true);

    try {
      // Get existing observations array or create new one
      const existingObservations = selectedNode.attributes?.observations || [];

      // Add new observation with timestamp
      const newObservation = {
        id: Date.now().toString(),
        text: text,
        timestamp: new Date().toISOString()
      };

      const updatedObservations = [...existingObservations, newObservation];

      await graphNodeService.updateNode(campaignId, graphId, selectedNode.id, {
        attributes: {
          ...selectedNode.attributes,
          observations: updatedObservations
        }
      });

      await loadNodes(graphId);

      // Update selected node to reflect new observations
      setSelectedNode(prev => prev ? {
        ...prev,
        attributes: {
          ...prev.attributes,
          observations: updatedObservations
        }
      } : null);

      setNewObservationText('');
    } catch (err) {
      console.error('Failed to add observation:', err);
      alert('Failed to add observation. Please try again.');
    } finally {
      setObservationsSubmitting(false);
    }
  };

  const handleDeleteObservation = async (observationId: string) => {
    if (!campaignId || !graphId || !selectedNode) return;

    setObservationsSubmitting(true);

    try {
      const existingObservations = selectedNode.attributes?.observations || [];
      const updatedObservations = existingObservations.filter((obs: any) => obs.id !== observationId);

      await graphNodeService.updateNode(campaignId, graphId, selectedNode.id, {
        attributes: {
          ...selectedNode.attributes,
          observations: updatedObservations
        }
      });

      await loadNodes(graphId);

      // Update selected node
      setSelectedNode(prev => prev ? {
        ...prev,
        attributes: {
          ...prev.attributes,
          observations: updatedObservations
        }
      } : null);
    } catch (err) {
      console.error('Failed to delete observation:', err);
      alert('Failed to delete observation. Please try again.');
    } finally {
      setObservationsSubmitting(false);
    }
  };

  const handleStartAddEdgeMode = () => {
    setAddEdgeMode(true);
    setSelectedNode(null); // Close details panel
  };

  const handleCancelAddEdgeMode = () => {
    setAddEdgeMode(false);
    setEdgeSourceNode(null);
    setEdgeTargetNode(null);
    setEdgeRelationType('');
  };

  const handleSubmitEdge = async () => {
    if (!campaignId || !graphId || !edgeSourceNode || !edgeTargetNode) return;

    const relationType = edgeRelationType.trim();
    if (!relationType) {
      alert('Please enter a relationship type');
      return;
    }

    setEdgeSubmitting(true);

    try {
      await graphEdgeService.createEdge(campaignId, graphId, {
        source_node_id: edgeSourceNode.id,
        target_node_id: edgeTargetNode.id,
        edge_type: relationType,
        confidence: 1.0
      } as any);

      await loadNodes(graphId);

      setShowEdgeModal(false);
      setEdgeRelationType('');
      handleCancelAddEdgeMode();
    } catch (err) {
      console.error('Failed to create edge:', err);
      alert('Failed to create relationship. Please try again.');
    } finally {
      setEdgeSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="geographic-page loading">
        <MapPin className="w-12 h-12 animate-pulse" />
        <p>Loading geographic memory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="geographic-page error">
        <p>{error}</p>
        <button onClick={loadGeographicGraph}>Retry</button>
      </div>
    );
  }

  return (
    <div className="geographic-page">
      <header className="page-header">
        <button
          className="back-button"
          onClick={() => navigate(`/campaigns/${campaignId}/graphs`)}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Graphs
        </button>

        <div className="header-content">
          <MapPin className="header-icon" />
          <div>
            <h1>Geographic Memory</h1>
            <p className="subtitle">Yggdrasil world tree - scroll to zoom, drag to pan</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
          {nodes.length > 0 && (
            <>
              <button className="add-root-button-header" onClick={handleResetView}>
                <RefreshCw size={16} /> Reset View
              </button>
              {addEdgeMode ? (
                <button
                  className="add-root-button-header"
                  onClick={handleCancelAddEdgeMode}
                  style={{ backgroundColor: '#dc2626' }}
                >
                  Cancel Relationship Mode
                </button>
              ) : (
                <button
                  className="add-root-button-header"
                  onClick={handleStartAddEdgeMode}
                  style={{ backgroundColor: '#a855f7' }}
                >
                  <Plus size={16} /> Add Relationship
                </button>
              )}
            </>
          )}
          <button className="add-root-button-header" onClick={() => handleAddChild(null)}>
            <Plus size={16} /> Add Root Plane
          </button>
        </div>
      </header>

      <div className="viewport-layout">
        {addEdgeMode && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
            padding: '1rem 2rem',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(168, 85, 247, 0.4)',
            border: '2px solid #c084fc',
            color: '#ffffff',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {!edgeSourceNode ? (
              <p>Click on a location to select the source node</p>
            ) : (
              <p>Source: <strong>{edgeSourceNode.name}</strong> - Now click on the target location</p>
            )}
          </div>
        )}

        {nodes.length === 0 ? (
          <div className="empty-state-overlay">
            <MapPin size={64} />
            <p>No locations yet. Add your first plane to begin mapping your world.</p>
            <p className="hint">Examples: Material Plane, Feywild, Astral Sea, Shadowfell</p>
            <button className="add-first-button" onClick={() => handleAddChild(null)}>
              <Plus size={16} /> Add Root Plane
            </button>
          </div>
        ) : (
          <CytoscapeComponent
            elements={cytoscapeElements}
            style={{
              width: '100%',
              height: 'calc(100vh - 120px)',
              background: 'linear-gradient(135deg, #0a2818 0%, #0f1419 100%)'
            }}
            stylesheet={cytoscapeStylesheet}
            cy={(cy) => {
              cyRef.current = cy;

              // Remove any existing tap handlers to avoid duplicates
              cy.removeListener('tap', 'node');

              // Node click handler
              cy.on('tap', 'node', handleNodeClick);

              // Fit to view on load
              cy.fit(undefined, 50);

              // Mouse wheel zoom
              cy.on('zoom', () => {
                // Optional: track zoom level if needed
              });
            }}
          />
        )}

        {selectedNode && (
          <div className="floating-details-panel">
            <div className="panel-header">
              <h3>{selectedNode.name}</h3>
              <button
                className="close-panel"
                onClick={() => setSelectedNode(null)}
                aria-label="Close panel"
              >
                ×
              </button>
            </div>

            <div className="panel-content">
              <div className="detail-row">
                <span className="label">Type:</span>
                <span className="value">{selectedNode.attributes?.location_type || 'Unknown'}</span>
              </div>

              {selectedNode.attributes?.parent_location_id && selectedNode.attributes?.relationship_description && (
                <div className="detail-row">
                  <span className="label">Relationship:</span>
                  <span className="value relationship-text">{selectedNode.attributes.relationship_description}</span>
                </div>
              )}

              <div className="detail-row">
                <span className="label">Confidence:</span>
                <ConfidenceBadge confidence={selectedNode.confidence || 1.0} showValue={true} />
              </div>

              <div className="detail-row">
                <span className="label">Pinned:</span>
                <span className="value">{selectedNode.is_pinned ? 'Yes' : 'No'}</span>
              </div>

              {selectedNode.attributes?.tags && Array.isArray(selectedNode.attributes.tags) && selectedNode.attributes.tags.length > 0 && (
                <div className="detail-row">
                  <span className="label">Tags:</span>
                  <div className="tags-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {selectedNode.attributes.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="tag-badge"
                        style={{
                          background: '#a855f7',
                          border: '1px solid #c084fc',
                          color: '#ffffff',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.attributes?.observations && (
                <div className="observations-section">
                  <h4>Observations {Array.isArray(selectedNode.attributes.observations) ? `(${selectedNode.attributes.observations.length})` : ''}</h4>
                  {Array.isArray(selectedNode.attributes.observations) ? (
                    <ul className="observations-list">
                      {selectedNode.attributes.observations.map((obs: any) => (
                        <li key={obs.id} className="observation-item">
                          <span className="observation-text">{obs.text}</span>
                          <span className="observation-date">
                            {new Date(obs.timestamp).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="observations-text-legacy">{String(selectedNode.attributes.observations)}</p>
                  )}
                </div>
              )}

              <div className="panel-actions">
                <button onClick={() => handlePinNode(selectedNode)} className="action-btn">
                  {selectedNode.is_pinned ? 'Unpin' : 'Pin'}
                </button>
                <button onClick={() => handleEditNode(selectedNode)} className="action-btn">
                  <Edit2 size={14} /> Edit
                </button>
                <button onClick={() => handleEditObservations(selectedNode)} className="action-btn">
                  <Edit2 size={14} /> Observations
                </button>
                {selectedNode.attributes?.parent_location_id && (
                  <button onClick={() => handleEditRelationship(selectedNode)} className="action-btn">
                    <Edit2 size={14} /> Relationship
                  </button>
                )}
                <button onClick={() => handleDeleteNode(selectedNode)} className="action-btn delete">
                  <Trash2 size={14} /> Delete
                </button>
                <button onClick={() => handleAddChild(selectedNode)} className="action-btn primary">
                  <Plus size={14} /> Add Child
                </button>
              </div>

              <div className="info-box">
                <p><strong>Confidence Meaning:</strong></p>
                <p>"Will this location be used again in the campaign?"</p>
                <ul>
                  <li>High (70%+): Frequently visited or important</li>
                  <li>Medium (40-70%): Occasionally relevant</li>
                  <li>Low (&lt;40%): Rarely used or one-time location</li>
                </ul>
                <p className="tip">
                  Pin important locations to prevent confidence decay over time.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location Form Modal */}
      {showLocationModal && (
        <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{locationFormMode === 'create' ? 'Add Location' : 'Edit Location'}</h2>
            <form onSubmit={handleSubmitLocationForm}>
              <div className="form-group">
                <label htmlFor="location_name">Location Name</label>
                <input
                  type="text"
                  id="location_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Material Plane, Waterdeep, The Prancing Pony"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="location_type">Location Type</label>
                <select
                  id="location_type"
                  value={formData.location_type}
                  onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                  required
                >
                  <option value="plane">Plane</option>
                  <option value="world">World</option>
                  <option value="continent">Continent</option>
                  <option value="region">Region</option>
                  <option value="settlement">Settlement</option>
                  <option value="building">Building</option>
                </select>
                <p className="field-hint">
                  The type of location in the hierarchy (plane → world → continent → region → settlement → building)
                </p>
              </div>

              {parentNodeForCreate && (
                <div className="form-group">
                  <label htmlFor="relationship_description">Relationship Description (Optional)</label>
                  <input
                    type="text"
                    id="relationship_description"
                    value={formData.relationship_description}
                    onChange={(e) => setFormData({ ...formData, relationship_description: e.target.value })}
                    placeholder="e.g., 'Connected by portal', 'Trade route', 'Enemy territory'"
                  />
                  <p className="field-hint">
                    Describe the relationship to the parent location (e.g., how they're connected)
                  </p>
                </div>
              )}

              <TagInput
                label="Tags (Optional)"
                name="tags"
                tags={formData.tags}
                onChange={(tags) => setFormData({ ...formData, tags })}
                placeholder="Type and press Enter"
                maxTags={20}
              />

              {locationFormMode === 'create' && parentNodeForCreate && (
                <div className="form-group">
                  <label>Parent Location</label>
                  <div className="parent-location-display">
                    <MapPin size={16} />
                    <span>{parentNodeForCreate.name}</span>
                  </div>
                  <p className="field-hint">
                    This location will be created as a child of <strong>{parentNodeForCreate.name}</strong>
                  </p>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting
                    ? (locationFormMode === 'create' ? 'Creating...' : 'Saving...')
                    : (locationFormMode === 'create' ? 'Create Location' : 'Save Changes')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Observations Modal */}
      {showObservationsModal && selectedNode && (
        <div className="modal-overlay" onClick={() => setShowObservationsModal(false)}>
          <div className="modal-content observations-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Observations</h2>
            <p className="modal-subtitle">Add notes or observations about <strong>{selectedNode.name}</strong></p>

            {/* Existing Observations List */}
            {selectedNode.attributes?.observations && (
              <div className="existing-observations">
                <h3>Existing Observations</h3>
                {Array.isArray(selectedNode.attributes.observations) && selectedNode.attributes.observations.length > 0 ? (
                  <ul className="observations-modal-list">
                    {selectedNode.attributes.observations.map((obs: any) => (
                      <li key={obs.id} className="observation-modal-item">
                        <div className="observation-content">
                          <p className="observation-text">{obs.text}</p>
                          <span className="observation-timestamp">
                            {new Date(obs.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <button
                          className="delete-observation-btn"
                          onClick={() => handleDeleteObservation(obs.id)}
                          disabled={observationsSubmitting}
                          title="Delete observation"
                        >
                          <Trash2 size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="legacy-observation-warning">
                    <p>This node has an old-format observation. Click "Add Observation" to migrate to the new format.</p>
                    <p className="legacy-text">{String(selectedNode.attributes.observations)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Add New Observation */}
            <div className="add-observation-section">
              <h3>Add New Observation</h3>
              <div className="form-group">
                <textarea
                  id="new-observation"
                  value={newObservationText}
                  onChange={(e) => setNewObservationText(e.target.value)}
                  placeholder="e.g., 'Players haven't discovered this yet' or 'Destroyed in Session 5'"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <p className="field-hint">
                  Observations are timestamped and can be deleted individually.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddObservation}
                className="btn-primary"
                disabled={observationsSubmitting || !newObservationText.trim()}
                style={{ width: '100%' }}
              >
                {observationsSubmitting ? 'Adding...' : 'Add Observation'}
              </button>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowObservationsModal(false)}
                disabled={observationsSubmitting}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Relationship Modal */}
      {showRelationshipModal && selectedNode && (
        <div className="modal-overlay" onClick={() => setShowRelationshipModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Relationship</h2>
            <p className="modal-subtitle">
              Describe how <strong>{selectedNode.name}</strong> is related to its parent location
            </p>

            <div className="form-group">
              <label htmlFor="relationship">Relationship Description</label>
              <input
                type="text"
                id="relationship"
                value={relationshipText}
                onChange={(e) => setRelationshipText(e.target.value)}
                placeholder="e.g., 'Connected by portal', 'Trade route', 'Enemy territory'"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '1rem'
                }}
              />
              <p className="field-hint">
                Describe how this location connects to or relates to its parent.
              </p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowRelationshipModal(false)}
                disabled={relationshipSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRelationship}
                className="btn-primary"
                disabled={relationshipSubmitting}
              >
                {relationshipSubmitting ? 'Saving...' : 'Save Relationship'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Edge Creation Modal */}
      {showEdgeModal && edgeSourceNode && edgeTargetNode && (
        <div className="modal-overlay" onClick={() => setShowEdgeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Custom Relationship</h2>
            <p className="modal-subtitle">
              Connect <strong>{edgeSourceNode.name}</strong> to <strong>{edgeTargetNode.name}</strong>
            </p>

            <div className="form-group">
              <label htmlFor="edge-relation-type">Relationship Type</label>
              <input
                type="text"
                id="edge-relation-type"
                value={edgeRelationType}
                onChange={(e) => setEdgeRelationType(e.target.value)}
                placeholder="e.g., 'Portal to', 'Trade route with', 'Allied to', 'Enemy of'"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '1rem'
                }}
              />
              <p className="field-hint">
                This creates a non-hierarchical relationship between the two locations (shown in purple).
              </p>
            </div>

            <div className="info-box" style={{ marginBottom: '1rem' }}>
              <p><strong>Custom Relationships</strong> are for connections that don't fit the parent-child hierarchy:</p>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li>Portals between distant locations</li>
                <li>Trade routes or alliances</li>
                <li>Magical connections or rifts</li>
                <li>Any other non-hierarchical relationship</li>
              </ul>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  setShowEdgeModal(false);
                  setEdgeRelationType('');
                }}
                disabled={edgeSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitEdge}
                className="btn-primary"
                disabled={edgeSubmitting || !edgeRelationType.trim()}
                style={{ backgroundColor: '#a855f7' }}
              >
                {edgeSubmitting ? 'Creating...' : 'Create Relationship'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { GeographicGraphPage };
export default GeographicGraphPage;
