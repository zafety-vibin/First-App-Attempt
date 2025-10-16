/**
 * Feature 006: Political-Web Graph Page
 * Party-centric network with faction metaball AOE bubbles
 *
 * Layout: PCs fixed in center, NPCs orbit based on relationship strength
 * Factions: Metaball AOE grouping with clickable bubbles for zoom/filter
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, Info, RotateCcw } from 'lucide-react';
import CytoscapeComponent from 'react-cytoscapejs';
import Cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { graphService } from '../services/graphService';
import './PoliticalWebPage.css';

// Register fcose layout
Cytoscape.use(fcose);

const PoliticalWebPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const cyRef = useRef<Cytoscape.Core | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [graphId, setGraphId] = useState<string | null>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    if (campaignId) {
      loadPoliticalWebGraph();
    }
  }, [campaignId]);

  const loadPoliticalWebGraph = async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      const graphs = await graphService.listGraphs(campaignId);
      let polWebGraph = graphs.find((g: any) => g.graph_type === 'Political-Web');

      if (!polWebGraph) {
        // Create Political-Web graph
        polWebGraph = await graphService.createGraph(campaignId, {
          graph_type: 'Political-Web',
          graph_name: 'Political Web',
          toggle_state: true,
          decay_rate: 0.1
        });
      }

      setGraphId(polWebGraph.id);

      // Load graph with nodes and edges using graphService (handles auth)
      const fullGraph = await graphService.getGraph(campaignId, polWebGraph.id, true, true);
      const nodes = fullGraph.nodes || [];
      const edges = fullGraph.edges || [];

      // Convert to Cytoscape format
      const cyNodes = nodes.map((n: any) => ({
        data: {
          id: n.id,
          label: n.name,
          nodeType: n.node_type,
          faction: n.attributes?.faction || 'Unaffiliated',
          color: n.attributes?.color || '#6b7280',
          isPC: n.node_type === 'PC',
          isFaction: n.attributes?.is_faction_node || false,
          centerPosition: n.attributes?.center_position,
          metParty: n.attributes?.met_party || 0,
          level: n.attributes?.level || 1,
          ...n.attributes
        }
      }));

      const cyEdges = edges.map((e: any) => ({
        data: {
          id: e.id,
          source: e.source_node_id,
          target: e.target_node_id,
          label: e.edge_type,
          directed: e.directed
        }
      }));

      setElements([...cyNodes, ...cyEdges]);
    } catch (err: any) {
      console.error('Failed to load Political-Web:', err);
      console.error('Error details:', err.message, err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleResetView = () => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    // Re-run layout with party-centric positioning
    runPartyCentricLayout(cy);

    // Fit view
    cy.fit(undefined, 50);
  };

  const runPartyCentricLayout = (cy: Cytoscape.Core) => {
    const pcNodes = cy.nodes('[?isPC]');
    const npcNodes = cy.nodes('[!isPC][!isFaction]');
    const factionNodes = cy.nodes('[?isFaction]');

    // Fix PC positions in center circle
    const centerX = 0;
    const centerY = 0;
    const pcRadius = 100;
    const pcCount = pcNodes.length;

    pcNodes.forEach((node, index) => {
      const angle = (index / pcCount) * 2 * Math.PI;
      const x = centerX + pcRadius * Math.cos(angle);
      const y = centerY + pcRadius * Math.sin(angle);

      node.position({ x, y });
      node.lock();
    });

    // Run layout for NPCs with party as gravity center
    const layoutOptions = {
      name: 'fcose',
      animate: true,
      animationDuration: 1000,
      fit: true,
      padding: 50,
      nodeDimensionsIncludeLabels: false,
      uniformNodeDimensions: false,
      packComponents: true,
      nodeRepulsion: 8000,
      idealEdgeLength: 100,
      edgeElasticity: 0.45,
      nestingFactor: 0.1,
      gravity: 0.5,
      gravityRange: 1.5,
      gravityCompound: 1.0,
      gravityRangeCompound: 1.5,
      numIter: 2500,
      tile: true,
      tilingPaddingVertical: 10,
      tilingPaddingHorizontal: 10,
      fixedNodeConstraint: pcNodes.map((n: any) => ({ nodeId: n.id(), position: n.position() }))
    };

    cy.layout(layoutOptions).run();

    // Render metaballs after layout completes
    cy.one('layoutstop', () => {
      renderFactionMetaballs(cy);
    });
  };

  const renderFactionMetaballs = useCallback((cy: Cytoscape.Core) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const container = canvas.parentElement;
    if (!container) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get viewport transform for Cytoscape
    const pan = cy.pan();
    const zoom = cy.zoom();

    // Group NPCs by faction
    const factionGroups: Record<string, any[]> = {};
    cy.nodes('[!isPC][!isFaction]').forEach((node) => {
      const faction = node.data('faction') || 'Unaffiliated';
      if (!factionGroups[faction]) {
        factionGroups[faction] = [];
      }
      factionGroups[faction].push(node);
    });

    // Render metaballs for each faction
    Object.entries(factionGroups).forEach(([factionName, nodes]) => {
      if (nodes.length === 0) return;

      // Get faction color from first node
      const factionColor = nodes[0].data('color') || '#6b7280';

      // Convert node positions to canvas coordinates
      const points = nodes.map((node) => {
        const pos = node.position();
        const renderedPos = node.renderedPosition();
        return {
          x: renderedPos.x,
          y: renderedPos.y,
          radius: 30 // AOE radius around each NPC
        };
      });

      // Draw metaball effect using marching squares
      drawMetaballAOE(ctx, points, factionColor);
    });
  }, []);

  const drawMetaballAOE = (
    ctx: CanvasRenderingContext2D,
    points: Array<{ x: number; y: number; radius: number }>,
    color: string
  ) => {
    if (points.length === 0) return;

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
      minX = Math.min(minX, p.x - p.radius);
      minY = Math.min(minY, p.y - p.radius);
      maxX = Math.max(maxX, p.x + p.radius);
      maxY = Math.max(maxY, p.y + p.radius);
    });

    // Add padding
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // Create metaball field
    const resolution = 10; // Grid resolution
    const threshold = 1.0; // Metaball threshold

    // Simple blob drawing for now (can be refined to true metaballs later)
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = color;

    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw border
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.restore();
  };

  // Cytoscape stylesheet
  const cytoscapeStylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'width': (ele: any) => {
          const isPC = ele.data('isPC');
          const isFaction = ele.data('isFaction');
          if (isPC) return 40;
          if (isFaction) return 60;
          // NPCs: small by default
          const degree = ele.data('degree') || 0;
          return Math.min(20 + degree * 2, 50);
        },
        'height': (ele: any) => {
          const isPC = ele.data('isPC');
          const isFaction = ele.data('isFaction');
          if (isPC) return 40;
          if (isFaction) return 60;
          const degree = ele.data('degree') || 0;
          return Math.min(20 + degree * 2, 50);
        },
        'font-size': (ele: any) => {
          const isPC = ele.data('isPC');
          const isFaction = ele.data('isFaction');
          if (isPC || isFaction) return 14;
          // NPCs: no label until selected
          return 0;
        },
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#ffffff',
        'text-outline-width': 2,
        'text-outline-color': '#000'
      } as any
    },
    // PC nodes
    {
      selector: 'node[isPC]',
      style: {
        'shape': 'hexagon',
        'border-width': 3,
        'border-color': '#fbbf24',
        'font-weight': 'bold'
      }
    },
    // Faction nodes
    {
      selector: 'node[isFaction]',
      style: {
        'shape': 'roundrectangle',
        'border-width': 2,
        'border-color': '#ffffff',
        'opacity': 0.8
      }
    },
    // Selected node
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': '#fbbf24',
        'font-size': 16
      }
    },
    // Edges
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#4b5563',
        'target-arrow-color': '#4b5563',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'opacity': 0.6
      }
    },
    // Party relationship edges (highlighted)
    {
      selector: 'edge[source][?isPC]',
      style: {
        'line-color': '#10b981',
        'target-arrow-color': '#10b981',
        'width': 3,
        'opacity': 0.8
      }
    }
  ];

  if (loading) {
    return (
      <div className="graph-page loading">
        <Users className="w-12 h-12 animate-pulse" />
        <p>Loading Political Web...</p>
      </div>
    );
  }

  return (
    <div className="graph-page political-web-page">
      <header className="graph-page-header">
        <button className="back-button" onClick={() => navigate(`/campaigns/${campaignId}/graphs`)}>
          <ArrowLeft className="w-5 h-5" />
          Back to Graphs
        </button>
        <div className="header-content">
          <Users className="w-8 h-8" />
          <div>
            <h1>Political Web</h1>
            <p className="subtitle">Party-centric relationship network with faction AOEs</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
          <button className="action-button" onClick={() => setShowInfo(!showInfo)}>
            <Info size={16} /> Guide
          </button>
          <button className="action-button" onClick={handleResetView}>
            <RotateCcw size={16} /> Reset View
          </button>
        </div>
      </header>

      {showInfo && (
        <div className="info-overlay">
          <div className="info-panel">
            <button className="close-info" onClick={() => setShowInfo(false)}>×</button>
            <h2>Political-Web Guide</h2>

            <h3>What is this?</h3>
            <p>Political-Web tracks relationships, alliances, and power dynamics.</p>
            <ul>
              <li>Who knows who?</li>
              <li>How do we reach influential NPCs?</li>
              <li>Which factions are allied or opposed?</li>
            </ul>

            <h3>Party-Centric Layout</h3>
            <p>Your party is at the <strong>CENTER</strong>.</p>
            <ul>
              <li><strong>Close:</strong> Direct allies, active enemies</li>
              <li><strong>Medium:</strong> Known contacts, neutral NPCs</li>
              <li><strong>Far:</strong> Unmet NPCs, distant power brokers</li>
            </ul>

            <h3>Colored Bubbles = Factions</h3>
            <p>Metaball areas show organizational membership. Click faction bubble to zoom.</p>

            <h3>Node Types</h3>
            <ul>
              <li><strong>Hexagons (Gold border):</strong> Party members (PCs)</li>
              <li><strong>Circles (Faction colored):</strong> NPCs</li>
              <li><strong>Rectangles:</strong> Faction organizations</li>
            </ul>
          </div>
        </div>
      )}

      {selectedNode && (
        <div className="node-details-panel">
          <div className="node-details-header">
            <h3>{selectedNode.label}</h3>
            <button className="close-details" onClick={() => setSelectedNode(null)}>×</button>
          </div>
          <div className="node-details-content">
            <div className="detail-row">
              <span className="detail-label">Type:</span>
              <span className="detail-value">{selectedNode.nodeType}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Faction:</span>
              <span className="detail-value" style={{ color: selectedNode.color }}>
                {selectedNode.faction}
              </span>
            </div>
            {selectedNode.race && (
              <div className="detail-row">
                <span className="detail-label">Race:</span>
                <span className="detail-value">{selectedNode.race}</span>
              </div>
            )}
            {selectedNode.class && (
              <div className="detail-row">
                <span className="detail-label">Class:</span>
                <span className="detail-value">{selectedNode.class}</span>
              </div>
            )}
            {selectedNode.level && (
              <div className="detail-row">
                <span className="detail-label">Level:</span>
                <span className="detail-value">{selectedNode.level}</span>
              </div>
            )}
            {selectedNode.metParty > 0 && (
              <div className="detail-row">
                <span className="detail-label">Party Status:</span>
                <span className="detail-value">Met</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 120px)' }}>
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0
          }}
        />

        <CytoscapeComponent
          elements={elements}
          style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
          stylesheet={cytoscapeStylesheet}
          cy={(cy) => {
            cyRef.current = cy;

            // Set up event listeners
            cy.on('tap', 'node', (evt) => {
              const node = evt.target;
              if (!node.data('isFaction')) {
                setSelectedNode(node.data());
              }
            });

            cy.on('tap', (evt) => {
              if (evt.target === cy) {
                setSelectedNode(null);
              }
            });

            cy.on('viewport', () => {
              if (cyRef.current) {
                renderFactionMetaballs(cyRef.current);
              }
            });

            runPartyCentricLayout(cy);
          }}
        />
      </div>
    </div>
  );
};

export { PoliticalWebPage };
export default PoliticalWebPage;
