/**
 * Feature 006: World-Foundations Graph Page
 * Force-directed network with category clustering
 * Immutable truths about your world - NO confidence decay
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Plus, ArrowLeft, Trash2, Edit2, RefreshCw, Link, X, Eye, EyeOff, Pin, PinOff } from 'lucide-react';
import CytoscapeComponent from 'react-cytoscapejs';
import Cytoscape from 'cytoscape';
// @ts-ignore
import fcose from 'cytoscape-fcose';
import { graphService } from '../services/graphService';
import { graphNodeService } from '../services/graphNodeService';
import { graphEdgeService } from '../services/graphEdgeService';
import { GraphNode, GraphEdge } from '../types/graph';
import { TagInput } from '../components/form/TagInput';
import './WorldFoundationsPage.css';

// Register fcose layout
if (typeof Cytoscape !== 'undefined') {
  Cytoscape.use(fcose);
}

// Entity type categories for World-Foundations (refined taxonomy - 10 types)
const ENTITY_TYPES = {
  fundamental_force: { label: 'Fundamental Force', color: '#3b82f6', description: 'Physics, magic, planar mechanics' },
  cataclysmic_event: { label: 'Cataclysmic Event', color: '#ef4444', description: 'World-reshaping catastrophes' },
  historical_event: { label: 'Historical Event', color: '#a855f7', description: '>50 years old, now settled fact' },
  historical_era: { label: 'Historical Era', color: '#8b5cf6', description: 'Age definitions, time periods' },
  structural_constraint: { label: 'Structural Constraint', color: '#eab308', description: 'Political, economic patterns' },
  active_system: { label: 'Active Megasystem', color: '#22c55e', description: 'World-spanning forces in motion' },
  species_origin: { label: 'Species Origin', color: '#fb923c', description: 'How species came to be' },
  temporal_framework: { label: 'Temporal Framework', color: '#06b6d4', description: 'Calendar systems, age of world' },
  cosmological_structure: { label: 'Cosmological Structure', color: '#60a5fa', description: 'Planar structure, divine nature' },
  reality_paradox: { label: 'Reality Paradox', color: '#f472b6', description: 'Unsolvable logic problems' }
};

// Relationship types for World-Foundations edges (refined taxonomy - 25 types in 5 categories)
const RELATIONSHIP_TYPES = {
  // CAUSALITY RELATIONSHIPS
  created: { label: 'Created', description: 'Brought into existence' },
  destroyed: { label: 'Destroyed', description: 'Removed from existence' },
  transformed: { label: 'Transformed', description: 'Changed fundamental nature' },
  enabled: { label: 'Enabled', description: 'Made possible' },
  prevented: { label: 'Prevented', description: 'Made impossible' },

  // POWER RELATIONSHIPS
  controls: { label: 'Controls', description: 'Direct authority over' },
  influences: { label: 'Influences', description: 'Indirect effect on' },
  grants_authority_to: { label: 'Grants Authority To', description: 'Transfers power' },
  limits: { label: 'Limits', description: 'Constrains capability' },
  empowers: { label: 'Empowers', description: 'Enhances capability' },

  // KNOWLEDGE RELATIONSHIPS
  contradicts: { label: 'Contradicts', description: 'Logical opposition' },
  explains: { label: 'Explains', description: 'Provides reason for' },
  mystifies: { label: 'Mystifies', description: 'Obscures understanding' },
  reveals: { label: 'Reveals', description: 'Uncovers truth about' },
  paradoxes_with: { label: 'Paradoxes With', description: 'Creates unsolvable logic problem' },

  // TEMPORAL RELATIONSHIPS
  preceded: { label: 'Preceded', description: 'Came before' },
  followed: { label: 'Followed', description: 'Came after' },
  concurrent_with: { label: 'Concurrent With', description: 'Happened simultaneously' },
  cyclical_with: { label: 'Cyclical With', description: 'Repeating pattern' },
  culminated_in: { label: 'Culminated In', description: 'Built toward' },

  // PHILOSOPHICAL RELATIONSHIPS
  opposes: { label: 'Opposes', description: 'Thematic/ideological conflict' },
  requires: { label: 'Requires', description: 'Dependency' },
  negates: { label: 'Negates', description: 'Cancels out' },
  validates: { label: 'Validates', description: 'Supports existence of' },
  embodies: { label: 'Embodies', description: 'Represents aspect of' }
};

const WorldFoundationsPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const cyRef = useRef<cytoscape.Core | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [graphId, setGraphId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [nodeTooltip, setNodeTooltip] = useState<{ name: string; type: string; x: number; y: number } | null>(null);
  const [edgeTooltip, setEdgeTooltip] = useState<{ edge: string; source: string; target: string; x: number; y: number } | null>(null);
  const previousViewportRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [isZoomedToCategory, setIsZoomedToCategory] = useState(false); // Track if we're in zoomed state

  // Entity form modal state
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [entityFormMode, setEntityFormMode] = useState<'create' | 'edit'>('create');
  const [nodeToEdit, setNodeToEdit] = useState<GraphNode | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    entity_type: 'fundamental_force' as keyof typeof ENTITY_TYPES,
    observations: [] as string[],
    tags: [] as string[]
  });
  const [currentObservation, setCurrentObservation] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Edge creation state
  const [edgeSourceNode, setEdgeSourceNode] = useState<GraphNode | null>(null);
  const [showEdgeModal, setShowEdgeModal] = useState(false);
  const [edgeFormData, setEdgeFormData] = useState({
    source: '',
    target: '',
    relationshipType: 'created'
  });
  const [edgeSubmitting, setEdgeSubmitting] = useState(false);


  useEffect(() => {
    if (campaignId) {
      loadWorldFoundationsGraph();
    }
  }, [campaignId]);

  // Prevent page scrollbar on infinite canvas
  useEffect(() => {
    const main = document.querySelector('main');
    const originalOverflow = main ? (main as HTMLElement).style.overflow : '';

    if (main) {
      (main as HTMLElement).style.overflow = 'hidden';
    }

    return () => {
      if (main) {
        (main as HTMLElement).style.overflow = originalOverflow;
      }
    };
  }, []);

  const loadWorldFoundationsGraph = async () => {
    if (!campaignId) return;

    setLoading(true);
    setError(null);

    try {
      const graphs = await graphService.listGraphs(campaignId);
      let worldGraph = graphs.find(g => g.graph_type === 'World-Foundations');

      if (!worldGraph) {
        worldGraph = await graphService.createGraph(campaignId, {
          graph_type: 'World-Foundations',
          graph_name: 'World Foundations',
          toggle_state: true
        });
      }

      setGraphId(worldGraph.id);
      await loadNodes(worldGraph.id);
    } catch (err) {
      console.error('Failed to load world foundations graph:', err);
      setError('Failed to load world foundations');
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
      setError('Failed to load entities');
    }
  };

  // Calculate node degrees (connection counts) for sizing
  const nodeDegrees = useMemo(() => {
    const degrees: Record<string, number> = {};

    // Initialize all nodes to degree 0
    nodes.forEach(node => {
      degrees[node.id] = 0;
    });

    // Count connections for each node
    edges.forEach(edge => {
      if (degrees[edge.source_node_id] !== undefined) {
        degrees[edge.source_node_id]++;
      }
      if (degrees[edge.target_node_id] !== undefined) {
        degrees[edge.target_node_id]++;
      }
    });

    return degrees;
  }, [nodes, edges]);

  // Build Cytoscape elements with flat nodes (no compound structure)
  const cytoscapeElements = useMemo(() => {
    const elements: cytoscape.ElementDefinition[] = [];

    // Add entity nodes (flat structure, no parents)
    nodes.forEach(node => {
      const entityType = node.attributes?.entity_type || 'fundamental_force';
      const degree = nodeDegrees[node.id] || 0;

      elements.push({
        data: {
          id: node.id,
          label: node.name,
          entityType: entityType,
          nodeData: node,
          degree: degree // Store degree for sizing
        },
        classes: 'entity-node',
        grabbable: true, // Allow dragging nodes freely
        locked: node.is_pinned || false // Pinned nodes can't be moved by layout
      });
    });

    // Add relationship edges
    edges.forEach(edge => {
      elements.push({
        data: {
          id: `edge-${edge.id}`,
          source: edge.source_node_id,
          target: edge.target_node_id,
          label: (edge as any).edge_type || edge.relationship_type,
          edgeData: edge
        },
        classes: 'relationship-edge'
      });
    });

    return elements;
  }, [nodes, edges, nodeDegrees]);

  // Cytoscape stylesheet for force-directed network with organic category groups
  const cytoscapeStylesheet: cytoscape.Stylesheet[] = [
    // Entity node styling with connection-based sizing
    {
      selector: 'node.entity-node',
      style: {
        'background-color': (ele: any) => {
          const entityType = ele.data('entityType');
          return ENTITY_TYPES[entityType as keyof typeof ENTITY_TYPES]?.color || '#666';
        },
        'background-opacity': 0.9,
        'label': '', // No label by default
        'border-width': (ele: any) => {
          const cy = ele.cy();
          const zoom = cy.zoom();
          return 2 / zoom; // Maintain constant 2px border at all zoom levels
        },
        'border-color': '#ffffff',
        // ZOOM-AWARE sizing: Maintain constant rendered size regardless of zoom
        // Base size at 1.0x zoom: 50px + (degree * 5), capped at 120px
        'width': (ele: any) => {
          const degree = ele.data('degree') || 0;
          const cy = ele.cy();
          const zoom = cy.zoom();
          const baseSize = Math.min(50 + (degree * 5), 120);
          return baseSize / zoom; // Scale inversely with zoom to maintain screen size
        },
        'height': (ele: any) => {
          const degree = ele.data('degree') || 0;
          const cy = ele.cy();
          const zoom = cy.zoom();
          const baseSize = Math.min(50 + (degree * 5), 120);
          return baseSize / zoom; // Scale inversely with zoom to maintain screen size
        },
        // Dynamic shape based on connection count
        'shape': (ele: any) => {
          const degree = ele.data('degree') || 0;
          if (degree === 0 || degree === 1 || degree === 2) {
            return 'ellipse'; // Circle for 0-2 connections
          } else if (degree === 3) {
            return 'triangle';
          } else if (degree === 4) {
            return 'diamond';
          } else if (degree === 5) {
            return 'pentagon';
          } else if (degree === 6) {
            return 'hexagon';
          } else if (degree === 7) {
            return 'heptagon';
          } else {
            return 'octagon'; // 8+ connections
          }
        },
        // Rotate shape to align with connections
        'shape-polygon-points': (ele: any) => {
          const degree = ele.data('degree') || 0;
          if (degree < 3) return undefined;

          // Get connected edges to calculate bearing
          const edges = ele.connectedEdges();
          if (edges.length === 0) return undefined;

          // Calculate average angle of all connections
          let sumAngle = 0;
          edges.forEach((edge: any) => {
            const source = edge.source();
            const target = edge.target();
            const other = source.id() === ele.id() ? target : source;

            const pos1 = ele.position();
            const pos2 = other.position();

            const angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
            sumAngle += angle;
          });

          const avgAngle = sumAngle / edges.length;

          // Generate rotated polygon points
          const sides = Math.min(degree, 8);
          const points: number[] = [];

          for (let i = 0; i < sides; i++) {
            const angle = (2 * Math.PI * i / sides) + avgAngle;
            points.push(Math.cos(angle));
            points.push(Math.sin(angle));
          }

          return points;
        }
      } as any
    },
    // Relationship edge styling
    {
      selector: 'edge.relationship-edge',
      style: {
        'width': (ele: any) => {
          const cy = ele.cy();
          const zoom = cy.zoom();
          return 2 / zoom; // Maintain constant 2px width at all zoom levels
        },
        'line-color': '#64748b',
        'target-arrow-color': '#64748b',
        'target-arrow-shape': 'triangle',
        'arrow-scale': (ele: any) => {
          const cy = ele.cy();
          const zoom = cy.zoom();
          return 1 / zoom; // Scale arrows inversely with zoom
        },
        'curve-style': 'bezier',
        'opacity': 0.25, // Reduced from 0.5 to reduce visual noise
        'label': '' // No label by default
      } as any
    },
    // Highlighted edges (when category or node is selected) - show labels
    {
      selector: 'edge.relationship-edge.highlighted-edge',
      style: {
        'label': 'data(label)',
        'font-size': (ele: any) => {
          const cy = ele.cy();
          const zoom = cy.zoom();
          return 12 / zoom; // Maintain constant 12px font at all zoom levels
        },
        'color': '#ffffff',
        'text-background-color': '#000000',
        'text-background-opacity': 0.7,
        'text-background-padding': '3px',
        'text-background-shape': 'roundrectangle',
        'text-outline-width': 0,
        'opacity': 0.6 // Slightly higher opacity for highlighted edges
      } as any
    },
    // Selected node highlighting
    {
      selector: 'node.entity-node:selected',
      style: {
        'border-color': '#fbbf24',
        'border-width': (ele: any) => {
          const cy = ele.cy();
          const zoom = cy.zoom();
          return 4 / zoom; // Maintain constant 4px border
        },
        'background-opacity': 1,
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#ffffff',
        'font-size': (ele: any) => {
          const degree = ele.data('degree') || 0;
          return Math.min(12 + Math.floor(degree / 2), 18);
        },
        'font-weight': '600',
        'text-outline-width': 2,
        'text-outline-color': '#000',
        'text-wrap': 'wrap',
        'text-max-width': '120px'
      } as any
    },
    // Dimmed elements (when a category is focused)
    {
      selector: '.dimmed',
      style: {
        'opacity': 0.2
      }
    },
    // Highlighted nodes (when category is clicked)
    {
      selector: 'node.entity-node.highlighted',
      style: {
        'border-color': (ele: any) => {
          const entityType = ele.data('entityType');
          return ENTITY_TYPES[entityType as keyof typeof ENTITY_TYPES]?.color || '#666';
        },
        'border-width': (ele: any) => {
          const cy = ele.cy();
          const zoom = cy.zoom();
          return 4 / zoom; // Maintain constant 4px border
        },
        'background-opacity': 1,
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#ffffff',
        'font-size': (ele: any) => {
          const degree = ele.data('degree') || 0;
          return Math.min(12 + Math.floor(degree / 2), 18);
        },
        'font-weight': '600',
        'text-outline-width': 2,
        'text-outline-color': '#000',
        'text-wrap': 'wrap',
        'text-max-width': '120px'
      } as any
    },
    // Edge source highlighting (during edge creation)
    {
      selector: 'node.entity-node.edge-source',
      style: {
        'border-color': '#fb923c',
        'border-width': (ele: any) => {
          const cy = ele.cy();
          const zoom = cy.zoom();
          return 5 / zoom; // Maintain constant 5px border
        },
        'background-opacity': 1
      }
    },
    // Connected nodes highlighting (when a node is selected)
    {
      selector: 'node.entity-node.connected-node',
      style: {
        'border-color': '#fbbf24',
        'border-width': (ele: any) => {
          const cy = ele.cy();
          const zoom = cy.zoom();
          return 3 / zoom; // Maintain constant 3px border
        },
        'background-opacity': 1,
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#ffffff',
        'font-size': (ele: any) => {
          const degree = ele.data('degree') || 0;
          return Math.min(12 + Math.floor(degree / 2), 18);
        },
        'font-weight': '600',
        'text-outline-width': 2,
        'text-outline-color': '#000',
        'text-wrap': 'wrap',
        'text-max-width': '120px'
      } as any
    },
    // Pinned nodes styling
    {
      selector: 'node.entity-node[locked]',
      style: {
        'border-style': 'double',
        'border-width': (ele: any) => {
          const cy = ele.cy();
          const zoom = cy.zoom();
          return 4 / zoom; // Maintain constant 4px border
        }
      }
    }
  ];

  // Metaball configuration
  const METABALL_BASE_RADIUS = 80; // Base influence radius (scaled by zoom)
  const METABALL_THRESHOLD = 0.6; // Raised threshold for harder boundaries
  const METABALL_MIN_RADIUS = 60; // Minimum protected zone around each node (same for all nodes)
  const GRID_SIZE = 3.5; // Marching squares grid resolution - larger = faster, less precise (was 2)

  // Calculate metaball field strength at a point for a set of nodes with individual radii
  // Small nodes have strong, solid edges. Large nodes have soft, fluid edges.
  const calculateFieldStrength = (x: number, y: number, nodes: any[]): number => {
    let totalStrength = 0;

    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Use per-node radius (larger nodes have larger influence)
      const maxRadius = node.radius || METABALL_BASE_RADIUS;

      if (dist === 0) {
        totalStrength += 1000; // Infinite strength at node center
      } else if (dist <= METABALL_MIN_RADIUS) {
        // Inside minimum radius: full strength (solid core for all nodes)
        const radiusSq = METABALL_MIN_RADIUS * METABALL_MIN_RADIUS;
        totalStrength += radiusSq / (dist * dist);
      } else {
        // Beyond minimum radius: use maxRadius for field calculation
        // This keeps large AOEs while making them softer
        const radiusSq = maxRadius * maxRadius;
        const baseStrength = radiusSq / (dist * dist);

        // Apply soft decay ONLY beyond maxRadius to make edges fluid
        if (dist > maxRadius) {
          // Very soft falloff beyond maxRadius - still contributes but weakly
          const beyondMax = (dist - maxRadius) / maxRadius;
          const decayFactor = Math.pow(0.5, beyondMax); // Exponential decay
          totalStrength += baseStrength * decayFactor;
        } else {
          // Within maxRadius: full contribution (large AOE)
          totalStrength += baseStrength;
        }
      }
    }

    return totalStrength;
  };

  // Marching squares lookup table: defines edge connections for each of 16 cell configurations
  // Each entry lists pairs of edges to connect: 0=top, 1=right, 2=bottom, 3=left
  const MARCHING_SQUARES_LOOKUP: number[][] = [
    [],           // 0: all outside
    [2, 3],       // 1: bottom-left inside
    [1, 2],       // 2: bottom-right inside
    [1, 3],       // 3: bottom inside
    [0, 1],       // 4: top-right inside
    [0, 1, 2, 3], // 5: top-right + bottom-left (saddle - needs disambiguation)
    [0, 2],       // 6: right side inside
    [0, 3],       // 7: top-right + bottom inside
    [0, 3],       // 8: top-left inside
    [0, 2],       // 9: left side inside
    [0, 3, 1, 2], // 10: top-left + bottom-right (saddle - needs disambiguation)
    [1, 2],       // 11: top-left + bottom inside
    [1, 3],       // 12: top inside
    [2, 3],       // 13: top + bottom-left inside
    [0, 1],       // 14: top + bottom-right inside
    []            // 15: all inside
  ];

  // Linear interpolation to find exact crossing point on an edge
  const interpolateEdge = (val1: number, val2: number, threshold: number): number => {
    if (Math.abs(val2 - val1) < 0.001) return 0.5;
    return Math.max(0, Math.min(1, (threshold - val1) / (val2 - val1)));
  };

  // Marching squares: trace isosurface boundary where field crosses threshold
  const traceMetaballBoundary = (nodes: any[], width: number, height: number): { x: number; y: number }[][] => {
    const contours: { x: number; y: number }[][] = [];

    // Create grid of field values
    const cols = Math.ceil(width / GRID_SIZE);
    const rows = Math.ceil(height / GRID_SIZE);
    const grid: number[][] = [];

    for (let y = 0; y <= rows; y++) {
      grid[y] = [];
      for (let x = 0; x <= cols; x++) {
        const worldX = x * GRID_SIZE;
        const worldY = y * GRID_SIZE;
        grid[y][x] = calculateFieldStrength(worldX, worldY, nodes);
      }
    }

    // Trace contour using marching squares with interpolation
    const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tl = grid[y][x];
        const tr = grid[y][x + 1];
        const br = grid[y + 1][x + 1];
        const bl = grid[y + 1][x];

        // Cell configuration index (bit mask)
        const cellIndex =
          (tl >= METABALL_THRESHOLD ? 8 : 0) |
          (tr >= METABALL_THRESHOLD ? 4 : 0) |
          (br >= METABALL_THRESHOLD ? 2 : 0) |
          (bl >= METABALL_THRESHOLD ? 1 : 0);

        const edges = MARCHING_SQUARES_LOOKUP[cellIndex];
        if (edges.length === 0) continue;

        // Calculate interpolated edge points
        const cellX = x * GRID_SIZE;
        const cellY = y * GRID_SIZE;

        const edgePoints: { x: number; y: number }[] = [
          // Top edge (0)
          {
            x: cellX + interpolateEdge(tl, tr, METABALL_THRESHOLD) * GRID_SIZE,
            y: cellY
          },
          // Right edge (1)
          {
            x: cellX + GRID_SIZE,
            y: cellY + interpolateEdge(tr, br, METABALL_THRESHOLD) * GRID_SIZE
          },
          // Bottom edge (2)
          {
            x: cellX + interpolateEdge(bl, br, METABALL_THRESHOLD) * GRID_SIZE,
            y: cellY + GRID_SIZE
          },
          // Left edge (3)
          {
            x: cellX,
            y: cellY + interpolateEdge(tl, bl, METABALL_THRESHOLD) * GRID_SIZE
          }
        ];

        // Connect edge pairs
        for (let i = 0; i < edges.length; i += 2) {
          const p1 = edgePoints[edges[i]];
          const p2 = edgePoints[edges[i + 1]];
          segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
        }
      }
    }

    // Convert segments to contour paths (simplified - just collect all segment points)
    if (segments.length > 0) {
      const boundary: { x: number; y: number }[] = [];
      segments.forEach(seg => {
        boundary.push({ x: seg.x1, y: seg.y1 });
        boundary.push({ x: seg.x2, y: seg.y2 });
      });
      contours.push(boundary);
    }

    return contours;
  };

  // Draw organic category AOE bubbles using metaballs
  const drawCategoryBubbles = useCallback(() => {
    const cy = cyRef.current;
    const canvas = backgroundCanvasRef.current;
    if (!cy || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match viewport
    const container = cy.container();
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Group nodes by category with rendered positions and compute metaball radii
    const categoryGroups: Record<string, { x: number; y: number; node: any; radius: number }[]> = {};
    cy.nodes('.entity-node').forEach((node: any) => {
      const entityType = node.data('entityType');
      if (!categoryGroups[entityType]) {
        categoryGroups[entityType] = [];
      }
      const pos = node.renderedPosition();
      const degree = node.data('degree') || 0;

      // Calculate metaball radius based on degree
      // Faster scaling: 60px base + 12px per connection, capped at 240px
      // High-degree nodes get large AOE quickly, but with soft fluid edges
      const radius = Math.min(60 + (degree * 12), 240);

      categoryGroups[entityType].push({ x: pos.x, y: pos.y, node, radius });
    });

    // Winner-takes-all approach: assign each pixel to the strongest category
    const gridCols = Math.ceil(canvas.width / GRID_SIZE);
    const gridRows = Math.ceil(canvas.height / GRID_SIZE);

    // For each pixel, determine which category has strongest field
    for (let y = 0; y < gridRows; y++) {
      for (let x = 0; x < gridCols; x++) {
        const worldX = x * GRID_SIZE;
        const worldY = y * GRID_SIZE;

        let maxStrength = 0;
        let winningCategory: string | null = null;

        // First check: is pixel within minimum radius of any node? (protected zone)
        // All nodes have the same protected core radius
        for (const [entityType, categoryNodes] of Object.entries(categoryGroups)) {
          for (const node of categoryNodes) {
            const dx = worldX - node.x;
            const dy = worldY - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= METABALL_MIN_RADIUS) {
              // Within protected zone - this category wins automatically
              winningCategory = entityType;
              maxStrength = METABALL_THRESHOLD + 1; // Ensure it exceeds threshold
              break;
            }
          }
          if (winningCategory) break;
        }

        // Second check: if no protected zone, use field strength comparison
        if (!winningCategory) {
          Object.entries(categoryGroups).forEach(([entityType, categoryNodes]) => {
            const strength = calculateFieldStrength(worldX, worldY, categoryNodes);
            if (strength > maxStrength) {
              maxStrength = strength;
              winningCategory = entityType;
            }
          });
        }

        // Draw pixel if winning category exceeds threshold
        if (winningCategory && maxStrength >= METABALL_THRESHOLD) {
          const color = ENTITY_TYPES[winningCategory as keyof typeof ENTITY_TYPES]?.color || '#666';
          ctx.fillStyle = `${color}48`; // 48 hex = 72 decimal = 28% opacity
          ctx.fillRect(worldX, worldY, GRID_SIZE, GRID_SIZE);
        }
      }
    }

    // Debug: Draw field strength heatmap and boundaries per category
    Object.entries(categoryGroups).forEach(([entityType, categoryNodes]) => {
      const color = ENTITY_TYPES[entityType as keyof typeof ENTITY_TYPES]?.color || '#666';

      // Debug: Draw field strength heatmap
      if (showDebugInfo && categoryNodes.length > 0) {
        const gridCols = Math.ceil(canvas.width / GRID_SIZE);
        const gridRows = Math.ceil(canvas.height / GRID_SIZE);

        for (let y = 0; y <= gridRows; y++) {
          for (let x = 0; x <= gridCols; x++) {
            const worldX = x * GRID_SIZE;
            const worldY = y * GRID_SIZE;
            const strength = calculateFieldStrength(worldX, worldY, categoryNodes);

            if (strength > 0.1) {
              // Visualize field strength
              const opacity = Math.min(strength / METABALL_THRESHOLD, 1.0);
              ctx.fillStyle = `${color}${Math.floor(opacity * 30).toString(16).padStart(2, '0')}`;
              ctx.fillRect(worldX - GRID_SIZE / 2, worldY - GRID_SIZE / 2, GRID_SIZE, GRID_SIZE);
            }
          }
        }
      }

      // Debug: Draw threshold boundary
      if (showDebugInfo && categoryNodes.length > 1) {
        const contours = traceMetaballBoundary(categoryNodes, canvas.width, canvas.height);

        ctx.save();
        ctx.strokeStyle = `${color}`;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);

        contours.forEach(contour => {
          if (contour.length < 2) return;

          ctx.beginPath();
          ctx.moveTo(contour[0].x, contour[0].y);
          for (let i = 1; i < contour.length; i++) {
            ctx.lineTo(contour[i].x, contour[i].y);
          }
          ctx.closePath();
          ctx.stroke();
        });

        ctx.restore();
      }
    });

    // Debug: Draw grid lines
    if (showDebugInfo) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;

      for (let x = 0; x < canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y < canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [showDebugInfo]);

  const handleNodeClick = useCallback((event: any) => {
    const target = event.target;

    // Check if clicking on an entity node
    if (target.hasClass('entity-node')) {
      const nodeData = target.data('nodeData');

      // If in edge creation mode, complete the edge
      if (edgeSourceNode) {
        handleCompleteEdgeCreation(nodeData);
      } else {
        setSelectedNode(nodeData);
        setSelectedCluster(null); // Clear cluster highlight

        if (cyRef.current) {
          const cy = cyRef.current;
          const selectedCyNode = cy.getElementById(nodeData.id);

          // Save current viewport state before zooming
          previousViewportRef.current = {
            zoom: cy.zoom(),
            pan: cy.pan()
          };

          // Clear all previous highlighting and hover listeners
          cy.elements().removeClass('dimmed highlighted connected-node highlighted-edge');
          cy.elements('node.entity-node').off('mouseover mouseout'); // Remove old hover listeners
          setHoverTooltip(null); // Clear any existing tooltip

          // Get all connected nodes and edges
          const connectedEdges = selectedCyNode.connectedEdges();
          const connectedNodes = selectedCyNode.neighborhood('node.entity-node');

          // Highlight the selected node (already has selection styling)
          // Highlight connected nodes
          connectedNodes.addClass('connected-node');

          // Highlight connected edges and dim everything else
          connectedEdges.addClass('highlighted-edge');

          // Dim everything except selected node, connected nodes, and connecting edges
          cy.elements().forEach((ele: any) => {
            const eleId = ele.id();

            if (ele.isNode()) {
              // Don't dim the selected node or connected nodes
              if (eleId === nodeData.id || connectedNodes.some((n: any) => n.id() === eleId)) {
                return;
              }
              ele.addClass('dimmed');
            } else if (ele.isEdge()) {
              // Don't dim edges connected to the selected node (already highlighted)
              if (connectedEdges.some((e: any) => e.id() === eleId)) {
                return;
              }
              ele.addClass('dimmed');
            }
          });

          // Animate zoom to focus on selected node and its neighborhood
          // Account for floating details panel on the right (approximately 400px wide)
          const detailsPanelWidth = 420; // Details panel width + some margin

          // Calculate bounding box of selected elements
          const bb = selectedCyNode.union(connectedNodes).boundingBox();
          const padding = {
            left: 150,
            right: detailsPanelWidth + 80, // Extra padding on right for details panel
            top: 120,
            bottom: 150 // More bottom padding to prevent cutoff
          };

          // Calculate center point shifted left to account for details panel
          const viewportWidth = cy.width();
          const viewportHeight = cy.height();
          const contentWidth = bb.w + padding.left + padding.right;
          const contentHeight = bb.h + padding.top + padding.bottom;

          // Calculate zoom level
          const zoom = Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight);

          // Calculate pan position - shift content left to center in visible area
          const leftShift = detailsPanelWidth / 3;
          const centerX = (bb.x1 + bb.x2) / 2;
          const centerY = (bb.y1 + bb.y2) / 2;
          const panX = viewportWidth / 2 - (centerX * zoom) - leftShift;
          const panY = viewportHeight / 2 - (centerY * zoom);

          cy.animate({
            zoom: zoom,
            pan: { x: panX, y: panY },
            duration: 500,
            easing: 'ease-in-out-cubic'
          });

          // Add hover listeners for connected nodes to show tooltips with observations
          connectedNodes.on('mouseover', (e: any) => {
            const hoveredNode = e.target;
            const renderedPos = hoveredNode.renderedPosition();
            const nodeData = hoveredNode.data('nodeData');

            // Convert canvas coordinates to screen coordinates
            const container = cy.container();
            if (!container) return;

            const containerRect = container.getBoundingClientRect();
            const screenX = containerRect.left + renderedPos.x;
            const screenY = containerRect.top + renderedPos.y;

            // Build tooltip - name + first observation (truncated at 400 chars)
            let tooltipText = nodeData.name;
            if (nodeData.observations && Array.isArray(nodeData.observations) && nodeData.observations.length > 0) {
              const firstObs = nodeData.observations[0].text;
              // Truncate at 400 chars - tooltip has maxHeight constraint so overflow is hidden
              // Edge case: observations >400 chars should be read in detail panel anyway
              const truncated = firstObs.length > 400 ? firstObs.substring(0, 400) + '...' : firstObs;
              tooltipText += `\n${truncated}`;
            }

            setHoverTooltip({
              text: tooltipText,
              x: screenX,
              y: screenY - 60
            });
          });

          connectedNodes.on('mouseout', () => {
            setHoverTooltip(null);
          });
        }
      }
    }
  }, [edgeSourceNode]);

  const handleClusterClick = (entityType: string) => {
    setSelectedCluster(entityType);
    setSelectedNode(null); // Clear node selection

    if (!cyRef.current) return;

    const cy = cyRef.current;

    // Remove previous highlighting
    cy.elements().removeClass('dimmed highlighted highlighted-edge');

    // Get all nodes of this category
    const categoryNodes = cy.nodes().filter((node: any) =>
      node.data('entityType') === entityType
    );

    // Highlight category nodes
    categoryNodes.addClass('highlighted');

    // Find all nodes connected to this category
    const connectedNodes = new Set<string>();
    categoryNodes.forEach((node: any) => {
      const connectedEdges = node.connectedEdges();
      connectedEdges.forEach((edge: any) => {
        const source = edge.source();
        const target = edge.target();

        // Add connected nodes from other categories
        if (source.data('entityType') !== entityType) {
          connectedNodes.add(source.id());
        }
        if (target.data('entityType') !== entityType) {
          connectedNodes.add(target.id());
        }
      });
    });

    // Highlight connected nodes from other categories (so their labels show)
    connectedNodes.forEach((nodeId) => {
      cy.getElementById(nodeId).addClass('highlighted');
    });

    // Dim everything except the highlighted category and connected nodes
    cy.elements().forEach((ele: any) => {
      const eleId = ele.id();

      if (ele.isNode()) {
        // Don't dim category nodes or connected nodes
        if (ele.data('entityType') === entityType || connectedNodes.has(eleId)) {
          return;
        }
        ele.addClass('dimmed');
      } else if (ele.isEdge()) {
        // Edges that connect to this category: highlight and show labels
        const source = ele.source();
        const target = ele.target();

        if (source.data('entityType') === entityType || target.data('entityType') === entityType) {
          ele.addClass('highlighted-edge');
          return;
        }

        ele.addClass('dimmed');
      }
    });
  };

  const handleClusterZoom = (entityType: string) => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    // First highlight the category
    handleClusterClick(entityType);

    // Get all nodes of this category
    const categoryNodes = cy.nodes().filter((node: any) =>
      node.data('entityType') === entityType
    );

    if (categoryNodes.length === 0) return;

    // Save current viewport to restore later
    previousViewportRef.current = {
      zoom: cy.zoom(),
      pan: cy.pan()
    };

    // Get IDs of selected category
    const categoryNodeIds = new Set(categoryNodes.map((n: any) => n.id()));

    // Build category map
    const nodeCategoryMap: Record<string, string> = {};
    cy.nodes('.entity-node').forEach((node: any) => {
      nodeCategoryMap[node.id()] = node.data('entityType');
    });

    // STEP 1: Find existing clusters - detect nodes already close together
    const categoryNodesArray = categoryNodes.toArray();
    const CLUSTER_THRESHOLD = 200; // Nodes within 200px are considered clustered
    const positions = categoryNodesArray.map((n: any) => ({
      node: n,
      pos: n.position()
    }));

    // Find the largest existing cluster
    let largestCluster: any[] = [];
    const visited = new Set<string>();

    for (const item of positions) {
      if (visited.has(item.node.id())) continue;

      const cluster = [item];
      visited.add(item.node.id());

      // BFS to find all nodes within CLUSTER_THRESHOLD
      const queue = [item];
      while (queue.length > 0) {
        const current = queue.shift()!;

        for (const other of positions) {
          if (visited.has(other.node.id())) continue;

          const dx = other.pos.x - current.pos.x;
          const dy = other.pos.y - current.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= CLUSTER_THRESHOLD) {
            cluster.push(other);
            visited.add(other.node.id());
            queue.push(other);
          }
        }
      }

      if (cluster.length > largestCluster.length) {
        largestCluster = cluster;
      }
    }

    // STEP 2: Calculate cluster centroid
    let clusterCenterX = 0;
    let clusterCenterY = 0;

    if (largestCluster.length > 0) {
      largestCluster.forEach((item: any) => {
        clusterCenterX += item.pos.x;
        clusterCenterY += item.pos.y;
      });
      clusterCenterX /= largestCluster.length;
      clusterCenterY /= largestCluster.length;
    } else {
      // No cluster found - use average of all positions
      positions.forEach((item: any) => {
        clusterCenterX += item.pos.x;
        clusterCenterY += item.pos.y;
      });
      clusterCenterX /= positions.length;
      clusterCenterY /= positions.length;
    }

    console.log(`Found cluster of ${largestCluster.length} nodes, moving ${positions.length - largestCluster.length} outliers`);

    // STEP 3: Move outlier nodes to cluster area
    const clusterNodeIds = new Set(largestCluster.map((item: any) => item.node.id()));

    categoryNodesArray.forEach((node: any, index: number) => {
      if (!clusterNodeIds.has(node.id())) {
        // This is an outlier - move it near the cluster center
        const angle = (index / categoryNodesArray.length) * 2 * Math.PI;
        const radius = 80; // Place outliers in small circle around cluster center
        const offsetX = Math.cos(angle) * radius;
        const offsetY = Math.sin(angle) * radius;

        node.position({
          x: clusterCenterX + offsetX,
          y: clusterCenterY + offsetY
        });
      }
    });

    // STEP 3.5: Find connected nodes from other categories and pull them closer (within 400px)
    const connectedNodesFromOtherCategories = new Set<any>();
    categoryNodes.forEach((catNode: any) => {
      const connectedEdges = catNode.connectedEdges();
      connectedEdges.forEach((edge: any) => {
        const source = edge.source();
        const target = edge.target();
        const otherNode = source.id() === catNode.id() ? target : source;

        // If connected node is from a different category
        if (!categoryNodeIds.has(otherNode.id())) {
          connectedNodesFromOtherCategories.add(otherNode);
        }
      });
    });

    console.log(`Found ${connectedNodesFromOtherCategories.size} connected nodes from other categories`);

    // Move connected nodes closer to cluster (within 400px radius)
    const MAX_CONNECTION_DISTANCE = 400;
    connectedNodesFromOtherCategories.forEach((node: any) => {
      const pos = node.position();
      const dx = pos.x - clusterCenterX;
      const dy = pos.y - clusterCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If too far, move to 400px from cluster center
      if (dist > MAX_CONNECTION_DISTANCE) {
        const ratio = MAX_CONNECTION_DISTANCE / dist;
        node.position({
          x: clusterCenterX + dx * ratio,
          y: clusterCenterY + dy * ratio
        });
      }
    });

    // STEP 4: Enforce minimum spacing (no physics - just manual positioning worked!)
    const MIN_DISTANCE_SAME_CAT = 130; // Same category: touching bubbles
    const MIN_DISTANCE_DIFF_CAT = 180; // Different category: clean boundaries
    const MAX_ITERATIONS = 40;

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      let hadCollision = false;
      const allNodes = cy.nodes('.entity-node');

      allNodes.forEach((node1: any) => {
        const pos1 = node1.position();
        const cat1 = nodeCategoryMap[node1.id()];

        allNodes.forEach((node2: any) => {
          if (node1.id() === node2.id()) return;

          const cat2 = nodeCategoryMap[node2.id()];
          const pos2 = node2.position();
          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const minDist = cat1 === cat2 ? MIN_DISTANCE_SAME_CAT : MIN_DISTANCE_DIFF_CAT;

          if (dist < minDist && dist > 0) {
            hadCollision = true;

            const overlap = minDist - dist;
            const pushX = (dx / dist) * (overlap / 2);
            const pushY = (dy / dist) * (overlap / 2);

            node1.position({
              x: pos1.x - pushX,
              y: pos1.y - pushY
            });

            node2.position({
              x: pos2.x + pushX,
              y: pos2.y + pushY
            });
          }
        });
      });

      if (!hadCollision) break;
    }

    // STEP 5: Zoom to fit the category + its connected nodes
    const nodesToFit = categoryNodes.union(cy.collection(Array.from(connectedNodesFromOtherCategories)));
    cy.fit(nodesToFit, 100); // Fit with 100px padding to show connections

    // Set flag - we're now in zoomed state
    setIsZoomedToCategory(true);

    console.log(`Zoom: ${entityType} consolidated - ${largestCluster.length} in cluster, ${positions.length - largestCluster.length} moved, ${connectedNodesFromOtherCategories.size} connections pulled closer`);
  };

  const handleCreateEntity = (entityType?: keyof typeof ENTITY_TYPES) => {
    setEntityFormMode('create');
    setFormData({
      name: '',
      entity_type: entityType || 'fundamental_force',
      observations: [],
      tags: []
    });
    setCurrentObservation('');
    setShowEntityModal(true);
  };

  const handleEditNode = (node: GraphNode) => {
    setNodeToEdit(node);
    setEntityFormMode('edit');
    const tags = node.attributes?.tags || [];
    // Extract observations text array from the observations field
    const observationsArray = node.observations && Array.isArray(node.observations) && node.observations.length > 0
      ? node.observations.map((obs: any) => obs.text)
      : [];
    setFormData({
      name: node.name,
      entity_type: (node.attributes?.entity_type || 'fundamental_force') as keyof typeof ENTITY_TYPES,
      observations: observationsArray,
      tags: Array.isArray(tags) ? tags : []
    });
    setCurrentObservation('');
    setShowEntityModal(true);
  };

  const handleSubmitEntityForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaignId || !graphId) return;

    const name = formData.name.trim();
    if (!name) {
      alert('Please enter an entity name');
      return;
    }

    setFormSubmitting(true);

    try {
      // Format observations with timestamps
      const observationsData = formData.observations
        .filter(obs => obs.trim().length > 0)
        .map(obs => ({
          text: obs,
          created_at: Math.floor(Date.now() / 1000),
          last_accessed: Math.floor(Date.now() / 1000)
        }));

      if (entityFormMode === 'create') {
        await graphNodeService.createNode(campaignId, graphId, {
          name: name,
          node_type: formData.entity_type,
          attributes: {
            entity_type: formData.entity_type,
            tags: formData.tags
          },
          observations: observationsData.length > 0 ? observationsData : undefined,
          confidence: 1.0, // World Foundations never decay
          is_pinned: false // Pin manually to lock position in force-directed layout
        });
      } else if (entityFormMode === 'edit' && nodeToEdit) {
        await graphNodeService.updateNode(campaignId, graphId, nodeToEdit.id, {
          name: name,
          attributes: {
            ...nodeToEdit.attributes,
            entity_type: formData.entity_type,
            tags: formData.tags
          },
          observations: observationsData.length > 0 ? observationsData : undefined
        });
      }

      await loadNodes(graphId);

      setShowEntityModal(false);
      setFormData({ name: '', entity_type: 'fundamental_force', observations: [], tags: [] });
      setCurrentObservation('');
      setNodeToEdit(null);
    } catch (err) {
      console.error('Failed to save entity:', err);
      alert('Failed to save entity. Please try again.');
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
      console.error('Failed to delete entity:', err);
      alert('Failed to delete entity. Please try again.');
    }
  };

  const handleTogglePin = async (node: GraphNode) => {
    if (!campaignId || !graphId || !cyRef.current) return;

    try {
      const newPinnedState = !node.is_pinned;

      // Update backend
      await graphNodeService.updateNode(campaignId, graphId, node.id, {
        is_pinned: newPinnedState
      });

      // Update Cytoscape node's locked property directly (no re-render)
      const cyNode = cyRef.current.getElementById(node.id);
      if (cyNode) {
        cyNode.data('locked', newPinnedState);
        // @ts-ignore - locked is a valid property
        cyNode.locked(newPinnedState);
      }

      // Update local nodes state immutably
      setNodes(prevNodes =>
        prevNodes.map(n =>
          n.id === node.id ? { ...n, is_pinned: newPinnedState } : n
        )
      );

      // Update selected node if it's the one being pinned
      if (selectedNode?.id === node.id) {
        setSelectedNode({ ...selectedNode, is_pinned: newPinnedState });
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      alert('Failed to pin/unpin node. Please try again.');
    }
  };

  // Edge creation handlers
  const handleStartEdgeCreation = (sourceNode: GraphNode) => {
    setEdgeSourceNode(sourceNode);
    setSelectedNode(null); // Close details panel

    // Visual feedback: highlight source node
    if (cyRef.current) {
      const cy = cyRef.current;
      cy.elements().removeClass('edge-source');
      cy.getElementById(sourceNode.id).addClass('edge-source');
    }
  };

  const handleCompleteEdgeCreation = (targetNode: GraphNode) => {
    if (!edgeSourceNode || edgeSourceNode.id === targetNode.id) {
      return; // Can't create edge to self
    }

    setEdgeFormData({
      source: edgeSourceNode.id,
      target: targetNode.id,
      relationshipType: 'created'
    });
    setShowEdgeModal(true);
  };

  const handleCancelEdgeCreation = () => {
    setEdgeSourceNode(null);
    if (cyRef.current) {
      cyRef.current.elements().removeClass('edge-source');
    }
  };

  const handleSubmitEdgeForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaignId || !graphId) return;

    setEdgeSubmitting(true);

    try {
      await graphEdgeService.createEdge(campaignId, graphId, {
        source_node_id: edgeFormData.source,
        target_node_id: edgeFormData.target,
        relationship_type: edgeFormData.relationshipType,
        edge_type: edgeFormData.relationshipType,
        attributes: {}
      });

      await loadNodes(graphId);

      setShowEdgeModal(false);
      setEdgeSourceNode(null);
      setEdgeFormData({ source: '', target: '', relationshipType: 'created' });

      // Clear edge-source highlighting
      if (cyRef.current) {
        cyRef.current.elements().removeClass('edge-source');
      }
    } catch (err) {
      console.error('Failed to create edge:', err);
      alert('Failed to create relationship. Please try again.');
    } finally {
      setEdgeSubmitting(false);
    }
  };

  const handleResetView = () => {
    console.log('Reset View clicked');
    if (!cyRef.current) {
      console.error('cyRef.current is null!');
      return;
    }

    setSelectedCluster(null);
    setSelectedNode(null);
    setHoverTooltip(null); // Clear tooltip
    previousViewportRef.current = null; // Clear saved viewport

    // Clear highlighting and hover listeners
    cyRef.current.elements().removeClass('dimmed highlighted connected-node highlighted-edge');
    cyRef.current.elements('node.entity-node').off('mouseover mouseout');

    // Build category groups for explicit clustering
    const categoryGroups: Record<string, string[]> = {};
    cyRef.current.nodes('.entity-node').forEach((node: any) => {
      const entityType = node.data('entityType');
      if (!categoryGroups[entityType]) {
        categoryGroups[entityType] = [];
      }
      categoryGroups[entityType].push(node.id());
    });

    // Re-run layout with explicit category-based grouping
    // Build category map for collision detection
    const nodeCategoryMap: Record<string, string> = {};
    cyRef.current.nodes('.entity-node').forEach((node: any) => {
      nodeCategoryMap[node.id()] = node.data('entityType');
    });

    // Temporarily unlock ALL nodes for Reset View (pins don't prevent reorganization)
    cyRef.current.nodes('.entity-node').forEach((node: any) => {
      node.unlock();
    });

    // PRE-POSITION: Place each category in a circle around the center
    // This gives fcose a good starting point with categories already separated
    const categoryKeys = Object.keys(categoryGroups);
    const angleStep = (2 * Math.PI) / categoryKeys.length;
    const radius = 400; // Distance from center for each category
    const centerX = cyRef.current.width() / 2;
    const centerY = cyRef.current.height() / 2;

    // TWO-HUB RULE: Find the 2 largest nodes (by degree)
    const allNodes = cyRef.current.nodes('.entity-node');
    const sortedByDegree = allNodes.toArray().sort((a: any, b: any) => {
      const degreeA = a.data('degree') || 0;
      const degreeB = b.data('degree') || 0;
      return degreeB - degreeA;
    });

    const hub1 = sortedByDegree[0];
    const hub2 = sortedByDegree[1];
    let areHubsConnected = false;

    if (hub1 && hub2) {
      // Check if the two hubs are directly connected
      const hub1Edges = hub1.connectedEdges();
      areHubsConnected = hub1Edges.some((edge: any) => {
        return edge.source().id() === hub2.id() || edge.target().id() === hub2.id();
      });

      if (areHubsConnected) {
        // Hubs are connected: place them adjacent in the center
        console.log('Two hubs are connected - placing adjacent');
        hub1.position({ x: centerX - 150, y: centerY });
        hub2.position({ x: centerX + 150, y: centerY });
      } else {
        // Hubs are NOT connected: place them on opposite sides
        console.log('Two hubs are NOT connected - placing opposite');
        hub1.position({ x: centerX - radius, y: centerY });
        hub2.position({ x: centerX + radius, y: centerY });
      }
    }

    categoryKeys.forEach((categoryKey, index) => {
      const angle = index * angleStep;
      const categoryX = centerX + Math.cos(angle) * radius;
      const categoryY = centerY + Math.sin(angle) * radius;

      // Position all nodes in this category near their category center
      categoryGroups[categoryKey].forEach((nodeId: string) => {
        const node = cyRef.current!.getElementById(nodeId);

        // Skip if this is one of the two hubs (already positioned)
        if (hub1 && node.id() === hub1.id()) return;
        if (hub2 && node.id() === hub2.id()) return;

        // Add small random offset to prevent perfect overlap
        const offsetX = (Math.random() - 0.5) * 50;
        const offsetY = (Math.random() - 0.5) * 50;
        node.position({ x: categoryX + offsetX, y: categoryY + offsetY });
      });
    });

    const layout = cyRef.current.layout({
      name: 'fcose',
      quality: 'proof',
      randomize: true, // Random placement to test if rules enforce from any position
      animate: true, // Animate the fcose layout itself
      animationDuration: 1000,
      fit: true, // Fit the graph to viewport after layout
      padding: 50,
      nodeDimensionsIncludeLabels: true,
      // PRIORITY 1: Continuous category shapes - use TIGHT edge lengths within categories
      idealEdgeLength: (edge: any) => {
        const sourceId = edge.source().id();
        const targetId = edge.target().id();
        const sourceCat = nodeCategoryMap[sourceId];
        const targetCat = nodeCategoryMap[targetId];

        // Same category: VERY tight to force consolidation into one shape
        if (sourceCat === targetCat) {
          return 80; // Extremely short to pull category into single blob
        }

        // Different categories: long edges allow separation but maintain tether
        const sourceDegree = edge.source().data('degree') || 0;
        const targetDegree = edge.target().data('degree') || 0;
        const sourceRadius = 60 + (sourceDegree * 12);
        const targetRadius = 60 + (targetDegree * 12);

        // Edge length = 80% of sum of radii to ensure touching
        return (sourceRadius + targetRadius) * 0.8;
      },
      nodeRepulsion: 8000, // MUCH LOWER - allow category nodes to cluster tightly
      nodeOverlap: 40, // Lower overlap within categories for tight packing
      edgeElasticity: 0.8, // VERY HIGH - edges are strong springs pulling nodes together
      gravity: 0.15, // Very low gravity to maximize spreading
      gravityRange: 4.0, // Wide gravity range
      nodeGroups: Object.values(categoryGroups),
      groupPadding: 150, // MUCH LARGER - strong category separation
      numIter: 6000 // More iterations for convergence with strong forces
    } as any);

    // After layout completes, re-lock pinned nodes
    layout.on('layoutstop', () => {
      console.log('Layout stopped event fired');
      const cy = cyRef.current;
      if (!cy) {
        console.error('cyRef.current is null in layoutstop!');
        return;
      }

      // HARD ENFORCEMENT: Separate overlapping nodes from different categories
      // Zoom-aware: Maintain constant RENDERED pixel spacing regardless of zoom level
      const BASE_MIN_DISTANCE = 120; // Minimum rendered pixels at 1.0x zoom
      const currentZoom = cy.zoom();
      const MIN_DISTANCE = BASE_MIN_DISTANCE / currentZoom; // Adjust for current zoom
      const MAX_ITERATIONS = 10; // Prevent infinite loops
      const nodeCategoryMap: Record<string, string> = {};

      console.log(`Enforcing spacing: zoom=${currentZoom.toFixed(2)}, graphDistance=${MIN_DISTANCE.toFixed(1)}px`);

      cy.nodes('.entity-node').forEach((node: any) => {
        nodeCategoryMap[node.id()] = node.data('entityType');
      });

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        let hadCollision = false;
        const nodes = cy.nodes('.entity-node');

        nodes.forEach((node1: any) => {
          const pos1 = node1.position();
          const cat1 = nodeCategoryMap[node1.id()];

          nodes.forEach((node2: any) => {
            if (node1.id() === node2.id()) return;

            const cat2 = nodeCategoryMap[node2.id()];

            // Only enforce spacing between DIFFERENT categories
            if (cat1 === cat2) return;

            const pos2 = node2.position();
            const dx = pos2.x - pos1.x;
            const dy = pos2.y - pos1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < MIN_DISTANCE && dist > 0) {
              hadCollision = true;

              // Calculate push-apart vector
              const overlap = MIN_DISTANCE - dist;
              const pushX = (dx / dist) * (overlap / 2);
              const pushY = (dy / dist) * (overlap / 2);

              // Move both nodes apart equally
              node1.position({
                x: pos1.x - pushX,
                y: pos1.y - pushY
              });

              node2.position({
                x: pos2.x + pushX,
                y: pos2.y + pushY
              });
            }
          });
        });

        // If no collisions found, we're done
        if (!hadCollision) break;
      }

      console.log('Enforced zoom-aware minimum spacing between categories');

      // Re-lock pinned nodes after layout completes
      cy.nodes('.entity-node').forEach((node: any) => {
        const nodeData = node.data('nodeData');
        if (nodeData && nodeData.is_pinned) {
          node.lock();
        }
      });

      console.log('Reset View layout complete');
    });

    console.log('About to run layout...');
    layout.run();
    console.log('Layout.run() called');
  };

  if (loading) {
    return (
      <div className="graph-page loading">
        <BookOpen className="w-12 h-12 animate-pulse" />
        <p>Loading world foundations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graph-page error">
        <p>{error}</p>
        <button onClick={loadWorldFoundationsGraph}>Retry</button>
      </div>
    );
  }

  return (
    <div className="graph-page world-foundations-page">
      <header className="graph-page-header">
        <button
          className="back-button"
          onClick={() => navigate(`/campaigns/${campaignId}/graphs`)}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Graphs
        </button>

        <div className="header-content">
          <BookOpen className="w-8 h-8" />
          <div>
            <h1>World Foundations</h1>
            <p className="subtitle">Immutable truths about your world - Force-directed network</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
          {nodes.length > 0 && (
            <>
              <button
                className="action-button"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                title={showDebugInfo ? 'Hide debug info' : 'Show debug info'}
              >
                {showDebugInfo ? <EyeOff size={16} /> : <Eye size={16} />}
                {showDebugInfo ? 'Hide Debug' : 'Show Debug'}
              </button>
              <button className="action-button" onClick={handleResetView}>
                <RefreshCw size={16} /> Reset View
              </button>
            </>
          )}
          <button className="action-button primary" onClick={() => handleCreateEntity()}>
            <Plus size={16} /> Add Entity
          </button>
        </div>
      </header>

      <div className="viewport-layout">
        {nodes.length === 0 ? (
          <div className="empty-state-overlay">
            <BookOpen size={64} />
            <p>No entities yet. Start building your world's immutable truths.</p>
            <p className="hint">
              Examples: Divine Pantheon, Creation Myth, Planar Structure, Magic System Rules
            </p>
            <button className="add-first-button" onClick={() => handleCreateEntity()}>
              <Plus size={16} /> Add First Entity
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', width: 'calc(100% - 320px)', height: '100%' }}>
            {/* Background canvas for category bubbles */}
            <canvas
              ref={backgroundCanvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none', // Let Cytoscape handle all clicks
                zIndex: 0
              }}
            />

            <CytoscapeComponent
              elements={cytoscapeElements}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'transparent',
                zIndex: 1
              }}
              stylesheet={cytoscapeStylesheet}
              layout={{
                name: 'fcose',
                quality: 'proof',
                randomize: true,
                animate: true,
                animationDuration: 1000,
                nodeDimensionsIncludeLabels: true,
                idealEdgeLength: 100,
                nodeRepulsion: 4500,
                numIter: 2500
              } as any}
              cy={(cy) => {
                cyRef.current = cy;

                // Remove any existing event listeners
                cy.removeAllListeners();

                // Draw bubbles after layout completes
                cy.on('layoutstop', drawCategoryBubbles);

                // Redraw bubbles on drag, zoom, pan
                cy.on('drag', 'node', drawCategoryBubbles);
                cy.on('zoom', () => {
                  // Force style recalculation for zoom-aware sizing
                  cy.style().update();
                  drawCategoryBubbles();
                });
                cy.on('pan', drawCategoryBubbles);

                // Initial draw
                setTimeout(drawCategoryBubbles, 100);

                // Node/cluster click handler
                cy.on('tap', 'node', handleNodeClick);

                // Hover tooltips for nodes
                cy.on('mouseover', 'node', (evt: any) => {
                  const node = evt.target;
                  const nodeData = node.data('nodeData');
                  const renderedPos = node.renderedPosition();

                  setNodeTooltip({
                    name: nodeData?.name || 'Unknown',
                    type: nodeData?.node_type || nodeData?.type || 'Unknown',
                    x: renderedPos.x,
                    y: renderedPos.y - 5
                  });
                });

                cy.on('mouseout', 'node', () => {
                  setNodeTooltip(null);
                });

                // Hover tooltips for edges
                cy.on('mouseover', 'edge', (evt: any) => {
                  const edge = evt.target;
                  const sourceNode = edge.source();
                  const targetNode = edge.target();
                  const edgeData = edge.data();

                  const sourcePos = sourceNode.renderedPosition();
                  const targetPos = targetNode.renderedPosition();
                  const midX = (sourcePos.x + targetPos.x) / 2;
                  const midY = (sourcePos.y + targetPos.y) / 2;

                  setEdgeTooltip({
                    edge: edgeData.label || edgeData.edge_type || 'connected to',
                    source: sourceNode.data('nodeData')?.name || 'Unknown',
                    target: targetNode.data('nodeData')?.name || 'Unknown',
                    x: midX,
                    y: midY - 10 // Close to edge (was -20)
                  });
                });

                cy.on('mouseout', 'edge', () => {
                  setEdgeTooltip(null);
                });

                // Click on empty background - clear selections
                cy.on('tap', (event: any) => {
                  if (event.target === cy) {
                    // If we're in zoomed state from double-click, run full reset
                    if (isZoomedToCategory) {
                      setIsZoomedToCategory(false);
                      handleResetView();
                      return;
                    }

                    // Otherwise just clear selections
                    setSelectedNode(null);
                    setSelectedCluster(null);
                    cy.elements().removeClass('dimmed highlighted connected-node highlighted-edge');
                    cy.elements('node.entity-node').off('mouseover mouseout'); // Clear hover listeners
                    setHoverTooltip(null); // Clear tooltip

                    // Restore previous viewport if it was saved
                    if (previousViewportRef.current) {
                      cy.animate({
                        zoom: previousViewportRef.current.zoom,
                        pan: previousViewportRef.current.pan,
                        duration: 500,
                        easing: 'ease-in-out-cubic'
                      });
                      previousViewportRef.current = null; // Clear saved state
                    }
                  }
                });
              }}
            />
          </div>
        )}

        {/* Category Legend */}
        {nodes.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1rem',
            zIndex: 900,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            width: '280px',
            maxHeight: 'calc(100vh - 10rem)',
            userSelect: 'none', // Prevent text selection on double-click
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}>
            <h4 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '0.875rem',
              fontWeight: '700',
              color: 'rgba(255, 255, 255, 0.9)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Entity Types
            </h4>
            <p style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.688rem',
              color: 'rgba(255, 255, 255, 0.5)',
              fontStyle: 'italic'
            }}>
              Click to highlight • Double-click to zoom
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(ENTITY_TYPES).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    transition: 'background 0.2s',
                    background: selectedCluster === key ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
                  }}
                  onClick={() => handleClusterClick(key)}
                  onDoubleClick={() => handleClusterZoom(key)}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  onMouseLeave={(e) => {
                    if (selectedCluster !== key) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: value.color,
                    flexShrink: 0,
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '0.813rem',
                      fontWeight: '600',
                      color: '#ffffff',
                      marginBottom: '0.125rem'
                    }}>
                      {value.label}
                    </div>
                    <div style={{
                      fontSize: '0.688rem',
                      color: 'rgba(255, 255, 255, 0.5)',
                      lineHeight: '1.2'
                    }}>
                      {value.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedNode && (
          <div className="floating-details-panel" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
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
                <span className="value">
                  {ENTITY_TYPES[(selectedNode.attributes?.entity_type || 'fundamental_force') as keyof typeof ENTITY_TYPES]?.label || 'Unknown'}
                </span>
              </div>

              {selectedNode.observations && Array.isArray(selectedNode.observations) && selectedNode.observations.length > 0 && (
                <div className="detail-row">
                  <span className="label">Observations ({selectedNode.observations.length}):</span>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '0.5rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {selectedNode.observations.map((obs: any, index: number) => (
                      <li key={index} style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem'
                      }}>
                        <p className="observations-text" style={{ margin: 0 }}>{obs.text}</p>
                        {obs.created_at && (
                          <span style={{
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.5)',
                            marginTop: '0.5rem',
                            display: 'block'
                          }}>
                            {new Date(obs.created_at * 1000).toLocaleDateString()}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedNode.attributes?.tags && Array.isArray(selectedNode.attributes.tags) && selectedNode.attributes.tags.length > 0 && (
                <div className="detail-row">
                  <span className="label">Tags:</span>
                  <div className="tags-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {selectedNode.attributes.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="tag-badge"
                        style={{
                          background: '#06b6d4',
                          border: '1px solid #22d3ee',
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

              <div className="panel-actions">
                <button onClick={() => handleTogglePin(selectedNode)} className="action-btn">
                  {selectedNode.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  {selectedNode.is_pinned ? 'Unpin' : 'Pin'}
                </button>
                <button onClick={() => handleStartEdgeCreation(selectedNode)} className="action-btn">
                  <Link size={14} /> Create Relationship
                </button>
                <button onClick={() => handleEditNode(selectedNode)} className="action-btn">
                  <Edit2 size={14} /> Edit
                </button>
                <button onClick={() => handleDeleteNode(selectedNode)} className="action-btn delete">
                  <Trash2 size={14} /> Delete
                </button>
              </div>

              <div className="info-box">
                <p><strong>Immutable Truth:</strong></p>
                <p>World Foundations never decay - they represent permanent facts about your world.</p>
                {selectedNode.is_pinned && (
                  <p style={{ marginTop: '0.5rem', color: '#fbbf24' }}>
                    <strong>📌 Pinned:</strong> This node's position is locked and won't move during Reset View.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hover Tooltip for Connected Nodes */}
        {hoverTooltip && (
          <div style={{
            position: 'fixed',
            left: `${Math.max(400, Math.min(hoverTooltip.x, window.innerWidth - 200))}px`,
            top: `${Math.max(220, Math.min(hoverTooltip.y, window.innerHeight - 120))}px`,
            transform: 'translate(-50%, -105%)',
            background: 'rgba(0, 0, 0, 0.95)',
            border: '1px solid rgba(251, 191, 36, 0.5)',
            borderRadius: '6px',
            padding: '0.5rem 0.75rem',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: '400',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'pre-wrap',
            maxWidth: '300px',
            maxHeight: '150px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            lineHeight: '1.4'
          }}>
            {hoverTooltip.text}
          </div>
        )}
      </div>

      {/* Entity Form Modal */}
      {showEntityModal && (
        <div className="modal-overlay" onClick={() => setShowEntityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ overflowY: 'auto', overflowX: 'hidden' }}>
            <h2>{entityFormMode === 'create' ? 'Add Entity' : 'Edit Entity'}</h2>
            <form onSubmit={handleSubmitEntityForm}>
              <div className="form-group">
                <label htmlFor="entity_name">Entity Name</label>
                <input
                  type="text"
                  id="entity_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Divine Pantheon, Creation Myth, Universal Laws"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="entity_type">Entity Type</label>
                <select
                  id="entity_type"
                  value={formData.entity_type}
                  onChange={(e) => setFormData({ ...formData, entity_type: e.target.value as keyof typeof ENTITY_TYPES })}
                  required
                >
                  {Object.entries(ENTITY_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label} - {value.description}
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  Choose the category that best describes this immutable truth
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="observations">Observations ({formData.observations.length})</label>

                {/* List of existing observations */}
                {formData.observations.length > 0 && (
                  <div style={{
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    {formData.observations.map((obs, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'flex-start',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem'
                      }}>
                        <p style={{
                          flex: 1,
                          margin: 0,
                          color: '#ffffff',
                          fontSize: '0.875rem',
                          lineHeight: '1.5'
                        }}>{obs}</p>
                        <button
                          type="button"
                          onClick={() => {
                            const newObs = [...formData.observations];
                            newObs.splice(index, 1);
                            setFormData({ ...formData, observations: newObs });
                          }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            padding: '0.25rem 0.5rem',
                            color: '#f87171',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            flexShrink: 0
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new observation */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <textarea
                      id="observations"
                      value={currentObservation}
                      onChange={(e) => setCurrentObservation(e.target.value)}
                      placeholder="Add an observation..."
                      rows={3}
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
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentObservation.trim()) {
                        setFormData({
                          ...formData,
                          observations: [...formData.observations, currentObservation.trim()]
                        });
                        setCurrentObservation('');
                      }
                    }}
                    disabled={!currentObservation.trim()}
                    style={{
                      background: currentObservation.trim() ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      border: currentObservation.trim() ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      padding: '0.75rem 1.5rem',
                      color: currentObservation.trim() ? '#4ade80' : 'rgba(255, 255, 255, 0.5)',
                      cursor: currentObservation.trim() ? 'pointer' : 'not-allowed',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      height: '3.5rem'
                    }}
                  >
                    Add
                  </button>
                </div>

                <p className="field-hint">
                  Add multiple observations to document different aspects of this truth
                </p>
              </div>

              <TagInput
                label="Tags"
                name="tags"
                tags={formData.tags}
                onChange={(tags) => setFormData({ ...formData, tags })}
                placeholder="Type and press Enter"
                maxTags={20}
              />

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowEntityModal(false)}
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
                    ? (entityFormMode === 'create' ? 'Creating...' : 'Saving...')
                    : (entityFormMode === 'create' ? 'Create Entity' : 'Save Changes')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edge Creation Mode Banner */}
      {edgeSourceNode && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
          border: '2px solid #ffedd5',
          borderRadius: '12px',
          padding: '1rem 2rem',
          color: '#ffffff',
          fontWeight: '600',
          fontSize: '1rem',
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(251, 146, 60, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <Link size={20} />
          <span>Creating relationship from "{edgeSourceNode.name}". Click another entity to link.</span>
          <button
            onClick={handleCancelEdgeCreation}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <X size={14} /> Cancel
          </button>
        </div>
      )}

      {/* Edge Form Modal */}
      {showEdgeModal && (
        <div className="modal-overlay" onClick={() => setShowEdgeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Relationship</h2>
            <form onSubmit={handleSubmitEdgeForm}>
              <div className="form-group">
                <label>From:</label>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontWeight: '600'
                }}>
                  {nodes.find(n => n.id === edgeFormData.source)?.name || 'Unknown'}
                </div>
              </div>

              <div className="form-group">
                <label>To:</label>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontWeight: '600'
                }}>
                  {nodes.find(n => n.id === edgeFormData.target)?.name || 'Unknown'}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="relationship_type">Relationship Type</label>
                <select
                  id="relationship_type"
                  value={edgeFormData.relationshipType}
                  onChange={(e) => setEdgeFormData({ ...edgeFormData, relationshipType: e.target.value })}
                  required
                >
                  {Object.entries(RELATIONSHIP_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label} - {value.description}
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  How do these truths relate to each other?
                </p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => { setShowEdgeModal(false); handleCancelEdgeCreation(); }}
                  disabled={edgeSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={edgeSubmitting}
                >
                  {edgeSubmitting ? 'Creating...' : 'Create Relationship'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Node Hover Tooltip */}
      {nodeTooltip && cyRef.current && (
        <div style={{
          position: 'fixed',
          left: `${Math.max(400, Math.min(nodeTooltip.x, window.innerWidth - 200))}px`,
          top: `${Math.max(220, Math.min(nodeTooltip.y, window.innerHeight - 100))}px`,
          transform: 'translate(-50%, -105%)',
          background: 'rgba(0, 0, 0, 0.95)',
          color: '#fff',
          padding: '0.4rem 0.6rem',
          borderRadius: '6px',
          fontSize: '0.75rem',
          pointerEvents: 'none',
          zIndex: 1001,
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          <div style={{ fontWeight: '600', fontSize: '0.75rem' }}>{nodeTooltip.name}</div>
          <div style={{ fontSize: '0.625rem', color: '#94a3b8', marginTop: '0.125rem' }}>{nodeTooltip.type}</div>
        </div>
      )}

      {/* Edge Hover Tooltip */}
      {edgeTooltip && (
        <div style={{
          position: 'fixed',
          left: `${Math.max(400, Math.min(edgeTooltip.x, window.innerWidth - 200))}px`,
          top: `${Math.max(220, Math.min(edgeTooltip.y, window.innerHeight - 100))}px`,
          transform: 'translate(-50%, -105%)',
          background: 'rgba(168, 85, 247, 0.95)',
          color: '#fff',
          padding: '0.5rem 0.75rem',
          borderRadius: '6px',
          fontSize: '0.688rem',
          pointerEvents: 'none',
          zIndex: 1001,
          whiteSpace: 'nowrap',
          border: '1px solid rgba(192, 132, 252, 0.5)',
          boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)'
        }}>
          <div style={{ fontWeight: '600' }}>{edgeTooltip.edge}</div>
          <div style={{ fontSize: '0.625rem', color: '#e9d5ff', marginTop: '0.25rem' }}>
            {edgeTooltip.source} → {edgeTooltip.target}
          </div>
        </div>
      )}
    </div>
  );
};

export { WorldFoundationsPage };
export default WorldFoundationsPage;
