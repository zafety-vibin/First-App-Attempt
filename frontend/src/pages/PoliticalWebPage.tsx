/**
 * Feature 006: Political-Web Graph Page
 * Party-centric network with faction metaball AOE bubbles
 *
 * Layout: PCs fixed in center, NPCs orbit based on relationship strength
 * Factions: Metaball AOE grouping with clickable bubbles for zoom/filter
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, Info, RotateCcw, Plus, Edit3, Trash2, X } from 'lucide-react';
import CytoscapeComponent from 'react-cytoscapejs';
import Cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { graphService } from '../services/graphService';
import GraphNodeEditorDialog from '../components/graphs/GraphNodeEditorDialog';
import './PoliticalWebPage.css';

// Register fcose layout
Cytoscape.use(fcose);

const PoliticalWebPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const cyRef = useRef<Cytoscape.Core | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [graphId, setGraphId] = useState<string | null>(null);
  const [allNodes, setAllNodes] = useState<any[]>([]); // Store all nodes from API
  const [allEdges, setAllEdges] = useState<any[]>([]); // Store all edges from API
  const [elements, setElements] = useState<any[]>([]); // Filtered elements for Cytoscape
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const [expandedFactions, setExpandedFactions] = useState<Set<string>>(new Set()); // Track which factions are expanded
  const [factionPositions, setFactionPositions] = useState<Record<string, {x: number, y: number}>>({}); // Store faction node positions for NPC spawning
  const detailsTimerRef = useRef<number | null>(null);
  const previousViewportRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);

  // Editor state
  const [nodeEditorOpen, setNodeEditorOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<any>(null);

  // Edge creation state (click-to-select pattern from Geographic Memory)
  const [addEdgeMode, setAddEdgeMode] = useState(false);
  const [edgeSourceNode, setEdgeSourceNode] = useState<any>(null);
  const [edgeTargetNode, setEdgeTargetNode] = useState<any>(null);
  const [showEdgeModal, setShowEdgeModal] = useState(false);
  const [edgeFormData, setEdgeFormData] = useState({
    edgeType: '',
    customEdgeType: '',
    directed: true,
    metadata: {
      strength: '',
      context: ''
    }
  });
  const [edgeSubmitting, setEdgeSubmitting] = useState(false);

  useEffect(() => {
    if (campaignId) {
      loadPoliticalWebGraph();
    }
  }, [campaignId]);

  // Prevent page scrollbar
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

  // Auto-trigger Reset View on first load
  useEffect(() => {
    if (elements.length > 0 && cyRef.current && expandedFactions.size === 0) {
      // Only on initial load (no expanded factions)
      const timer = setTimeout(() => {
        if (cyRef.current) {
          handleResetView();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [elements]);

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

      // Store all nodes and edges for filtering
      setAllNodes(nodes);
      setAllEdges(edges);

      // Initial elements will be filtered by useEffect based on expandedFactions
    } catch (err: any) {
      console.error('Failed to load Political-Web:', err);
      console.error('Error details:', err.message, err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // Filter visible elements based on expanded factions
  useEffect(() => {
    if (allNodes.length === 0) return;

    const visibleNodes: any[] = [];
    const visibleEdges: any[] = [];

    // Determine which nodes are visible
    allNodes.forEach((n: any) => {
      const isFactionNode = n.attributes?.is_faction_node || false;
      const faction = n.attributes?.faction || 'Unaffiliated';
      const secondaryFaction = n.attributes?.secondary_faction; // For dual-membership PCs

      if (isFactionNode) {
        // Faction nodes ALWAYS visible (hold territory even when expanded)
        visibleNodes.push(n);
      } else {
        // NPC/PC node visible if PRIMARY faction expanded OR secondary faction expanded
        const primaryExpanded = expandedFactions.has(faction);
        const secondaryExpanded = secondaryFaction && expandedFactions.has(secondaryFaction);

        if (primaryExpanded || secondaryExpanded) {
          visibleNodes.push(n);
        }
      }
    });

    // Only show edges between visible nodes (excluding edges from expanded faction nodes)
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    // Get list of expanded faction node IDs (ghosts shouldn't show edges to their members)
    const expandedFactionNodeIds = new Set<string>();
    visibleNodes.forEach(n => {
      if (n.attributes?.is_faction_node && expandedFactions.has(n.attributes.faction)) {
        expandedFactionNodeIds.add(n.id);
      }
    });

    // ALWAYS show edges between visible nodes (excluding ghost faction edges)
    allEdges.forEach((e: any) => {
      const sourceVisible = visibleNodeIds.has(e.source_node_id);
      const targetVisible = visibleNodeIds.has(e.target_node_id);
      const sourceIsGhost = expandedFactionNodeIds.has(e.source_node_id);
      const targetIsGhost = expandedFactionNodeIds.has(e.target_node_id);

      // Show edge if both nodes visible AND neither is a ghost faction
      if (sourceVisible && targetVisible && !sourceIsGhost && !targetIsGhost) {
        visibleEdges.push(e);
      }
    });

    // ADDITIONALLY: If Party is collapsed, create aggregated edges
    const partyFactionNode = visibleNodes.find(n =>
      n.attributes?.is_faction_node && n.attributes?.faction === 'The Party'
    );
    const isPartyCollapsed = partyFactionNode && !expandedFactions.has('The Party');

    if (isPartyCollapsed) {
      // The Party is collapsed - create aggregated edges from Party to PC targets
      const pcNodes = allNodes.filter(n => n.node_type === 'PC');
      const pcTargets = new Set<string>();

      // Find all NPCs/factions that ANY PC connects to
      allEdges.forEach((e: any) => {
        const sourceIsPC = pcNodes.some(pc => pc.id === e.source_node_id);
        const targetIsPC = pcNodes.some(pc => pc.id === e.target_node_id);

        if (sourceIsPC && visibleNodeIds.has(e.target_node_id)) {
          pcTargets.add(e.target_node_id);
        }
        if (targetIsPC && visibleNodeIds.has(e.source_node_id)) {
          pcTargets.add(e.source_node_id);
        }
      });

      // Create synthetic aggregated edges from Party faction to each target
      pcTargets.forEach(targetId => {
        visibleEdges.push({
          id: `party-aggregate-${targetId}`,
          source_node_id: partyFactionNode.id,
          target_node_id: targetId,
          edge_type: 'party connection',
          directed: false,
          is_aggregate: true // Flag for styling
        });
      });

      console.log(`Created ${pcTargets.size} aggregated Party connections`);
    }

    // Convert to Cytoscape format with initial positions
    const cyNodes = visibleNodes.map((n: any, index: number) => {
      const isPC = n.node_type === 'PC';
      const isFaction = n.attributes?.is_faction_node || false;
      const faction = n.attributes?.faction || 'Unaffiliated';

      // Calculate opacity based on expansion state (BEFORE position check)
      let nodeOpacity = 1.0;
      let showLabel = n.name;

      if (isFaction && expandedFactions.has(faction)) {
        nodeOpacity = 0;
        showLabel = '';
      } else if (isFaction) {
        nodeOpacity = 0.8;
      }

      // Check if this node already exists in Cytoscape (preserve position)
      let position = { x: 0, y: 0 };
      if (cyRef.current) {
        const existingNode = cyRef.current.getElementById(n.id);
        if (existingNode && existingNode.length > 0) {
          // Node exists - preserve position but UPDATE all data including color
          position = existingNode.position();

          // IMPORTANT: Explicitly update color in case it changed
          const newColor = n.attributes?.color || '#6b7280';
          setTimeout(() => {
            if (cyRef.current) {
              const node = cyRef.current.getElementById(n.id);
              if (node && node.length > 0) {
                node.data('color', newColor);
                node.style('background-color', newColor);
              }
            }
          }, 0);

          return {
            data: {
              id: n.id,
              label: showLabel, // Dynamic label
              nodeType: n.node_type,
              nodeData: n,
              faction,
              color: newColor, // Fresh color from database
              opacity: nodeOpacity, // Dynamic opacity
              isPC,
              isFaction,
              memberCount: n.attributes?.member_count || 0,
              ...n.attributes
            },
            position, // Keep existing position
            locked: isPC || (isFaction && faction === 'The Party')
          };
        }
      }

      // Node doesn't exist yet - calculate initial position

      if (isPC && faction === 'The Party') {
        // PCs in circle at (0,0) - tightened to 50px radius
        const pcIndex = visibleNodes.filter(node => node.node_type === 'PC').indexOf(n);
        const pcCount = visibleNodes.filter(node => node.node_type === 'PC').length;
        const angle = (pcIndex / pcCount) * 2 * Math.PI;
        position = {
          x: 50 * Math.cos(angle),
          y: 50 * Math.sin(angle)
        };
      } else if (isFaction && faction === 'The Party') {
        // The Party faction at (0,0)
        position = { x: 0, y: 0 };
      } else if (isFaction) {
        // Other faction nodes - use stored position for stability
        if (factionPositions[faction]) {
          position = factionPositions[faction];
        } else {
          // Generate random position on first load - Ring 1 (150-200px)
          const angle = Math.random() * 2 * Math.PI;
          const radius = 150 + Math.random() * 50; // 150-200px
          position = {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
          };
        }
      } else {
        // NPC/PC not from The Party - use stored faction position
        const factionPos = factionPositions[faction];
        if (factionPos) {
          // Spawn near faction position with random offset
          const offsetX = (Math.random() - 0.5) * 100;
          const offsetY = (Math.random() - 0.5) * 100;
          position = {
            x: factionPos.x + offsetX,
            y: factionPos.y + offsetY
          };
        } else {
          // No faction position stored - random position
          const angle = Math.random() * 2 * Math.PI;
          const radius = 300;
          position = {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
          };
        }
      }

      return {
        data: {
          id: n.id,
          label: showLabel, // Dynamic label
          nodeType: n.node_type,
          nodeData: n,
          faction,
          color: n.attributes?.color || '#6b7280',
          opacity: nodeOpacity, // Store opacity in data
          isPC,
          isFaction,
          memberCount: n.attributes?.member_count || 0,
          ...n.attributes
        },
        position, // Set initial position
        locked: isPC || (isFaction && faction === 'The Party') // Lock PCs and Party faction
      };
    });

    const cyEdges = visibleEdges.map((e: any) => {
      // Get source and target node data to determine edge styling
      const sourceNode = visibleNodes.find(n => n.id === e.source_node_id);
      const targetNode = visibleNodes.find(n => n.id === e.target_node_id);

      return {
        data: {
          id: e.id,
          source: e.source_node_id,
          target: e.target_node_id,
          label: e.edge_type,
          directed: e.directed,
          is_aggregate: e.is_aggregate || false,
          source_is_faction: sourceNode?.attributes?.is_faction_node || false,
          target_is_faction: targetNode?.attributes?.is_faction_node || false,
          source_is_pc: sourceNode?.node_type === 'PC',
          target_is_pc: targetNode?.node_type === 'PC'
        }
      };
    });

    console.log(`[VISIBILITY] Visible nodes: ${visibleNodes.length}, PCs: ${visibleNodes.filter(n => n.node_type === 'PC').length}, Factions: ${visibleNodes.filter(n => n.attributes?.is_faction_node).length}, NPCs: ${visibleNodes.filter(n => !n.attributes?.is_faction_node && n.node_type !== 'PC').length}`);

    setElements([...cyNodes, ...cyEdges]);
  }, [allNodes, allEdges, expandedFactions]); // Removed factionPositions - it shouldn't trigger re-positioning!

  const handleFactionCollapse = (factionName: string) => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    // Find all member nodes for this faction
    const memberNodes = cy.nodes(`[faction = "${factionName}"][!isFaction]`);

    if (memberNodes.length === 0) {
      console.log(`No members to collapse for ${factionName}`);
      return;
    }

    // Calculate average ANGLE of NPCs, place faction in Ring 1 at that angle
    let avgAngle = 0;
    memberNodes.forEach((node: any) => {
      const pos = node.position();
      avgAngle += Math.atan2(pos.y, pos.x);
    });
    avgAngle /= memberNodes.length;

    // Place faction in Ring 1 (150-200px) at average angle
    const factionRadius = 175; // Mid-point of Ring 1
    const factionX = Math.cos(avgAngle) * factionRadius;
    const factionY = Math.sin(avgAngle) * factionRadius;

    console.log(`Collapsing ${factionName}: ${memberNodes.length} NPCs, faction at ${Math.round(factionRadius)}px, ${Math.round(avgAngle * 180 / Math.PI)}°`);

    // Update faction position (faction node will re-appear in Ring 1)
    setFactionPositions(prev => ({ ...prev, [factionName]: { x: factionX, y: factionY } }));

    // Remove from expanded set - this will hide NPCs and show faction node
    setExpandedFactions(prev => {
      const next = new Set(prev);
      next.delete(factionName);
      return next;
    });

    // Zoom to fit all visible nodes after collapse
    setTimeout(() => {
      if (cyRef.current) {
        cyRef.current.fit(cyRef.current.nodes(), 50); // Tighter fit
      }
    }, 200);
  };

  // Helper: Get CONSISTENT faction ordering for pie-slice allocation
  // CRITICAL: Must use ALPHABETICAL sort to ensure same order every time
  const getFactionPieSlices = () => {
    if (!cyRef.current) return {};

    const cy = cyRef.current;
    const allFactionNodes = cy.nodes('[?isFaction]').filter((n: any) => n.data('faction') !== 'The Party');
    // SORT ALPHABETICALLY for consistency
    const factionNames = allFactionNodes.toArray()
      .map((n: any) => n.data('faction'))
      .sort(); // Alphabetical order

    const pieSliceAngle = (2 * Math.PI) / Math.max(factionNames.length, 1);

    const slices: Record<string, { start: number; end: number; center: number; index: number }> = {};
    factionNames.forEach((name: string, index: number) => {
      const sliceStart = index * pieSliceAngle;
      const sliceEnd = sliceStart + pieSliceAngle;
      const sliceCenter = sliceStart + (pieSliceAngle / 2);
      slices[name] = { start: sliceStart, end: sliceEnd, center: sliceCenter, index };
    });

    console.log('Pie slices:', Object.entries(slices).map(([name, s]) =>
      `${name}: ${Math.round(s.start * 180 / Math.PI)}°-${Math.round(s.end * 180 / Math.PI)}°`
    ).join(', '));

    return slices;
  };

  const handleFactionExpand = (factionName: string, factionNodePosition: { x: number; y: number }) => {
    if (!cyRef.current) return;

    console.log(`Expanding faction: ${factionName} at (${factionNodePosition.x}, ${factionNodePosition.y})`);

    // FIRST: Store faction position so useEffect can use it for NPC spawning
    setFactionPositions(prev => ({ ...prev, [factionName]: factionNodePosition }));

    // THEN: Add to expanded set - this will trigger useEffect to show NPCs/PCs with proper positions
    setExpandedFactions(prev => new Set(prev).add(factionName));

    // Post-expansion logic after useEffect creates nodes
    setTimeout(() => {
      if (!cyRef.current) return;
      const cy = cyRef.current;

      if (factionName === 'The Party') {
        console.log(`Party expanded - ${cy.nodes('[?isPC]').length} PCs in Ring 0`);
      } else {
        // Get this faction's pie-slice allocation
        const pieSlices = getFactionPieSlices();
        const slice = pieSlices[factionName];

        if (!slice) {
          console.error(`No pie slice found for ${factionName}`);
          return;
        }

        // Position NPCs using CENTERED TREE placement
        const memberNodes = cy.nodes(`[faction = "${factionName}"][!isFaction]`);
        const npcArray = memberNodes.toArray();

        // Separate by hierarchy
        const leaders = npcArray.filter(n => n.data('nodeType') === 'NPC:leader');
        const lieutenants = npcArray.filter(n => n.data('nodeType') === 'NPC:lieutenant');
        const members = npcArray.filter(n =>
          n.data('nodeType') !== 'NPC:leader' && n.data('nodeType') !== 'NPC:lieutenant'
        );

        const sliceCenter = slice.center;

        // Leaders: Center if 1, spread if multiple (same as reset logic)
        leaders.forEach((node, index) => {
          let angle;
          if (leaders.length === 1) {
            angle = sliceCenter; // Single leader at exact center
          } else {
            // Multiple leaders (8 Writ holders): spread across 75% of pie
            const usableForLeaders = (slice.end - slice.start) * 0.75;
            const leaderStart = sliceCenter - usableForLeaders / 2;
            angle = leaderStart + (index / (leaders.length - 1)) * usableForLeaders;
          }
          const radius = 200 + (250 - 200) / 2; // Mid-point of Ring 2
          node.position({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
        });

        // Lieutenants: Spread symmetrically around slice center
        lieutenants.forEach((node, index) => {
          const spreadAngle = sliceCenter + (index - (lieutenants.length - 1) / 2) * 0.22; // ~12.6° spacing
          const radius = 250 + (325 - 250) / 2; // Mid-point of Ring 2.5
          node.position({ x: Math.cos(spreadAngle) * radius, y: Math.sin(spreadAngle) * radius });
        });

        // Members: Use 85% of pie slice (WIDER for 7+ NPCs)
        members.forEach((node, index) => {
          const usablePie = (slice.end - slice.start) * 0.85; // Increased from 60%
          const memberStart = sliceCenter - usablePie / 2;
          const spreadAngle = memberStart + (index / Math.max(members.length - 1, 1)) * usablePie;
          const radius = 325 + (400 - 325) / 2; // Mid-point of Ring 3
          node.position({ x: Math.cos(spreadAngle) * radius, y: Math.sin(spreadAngle) * radius });
        });

        console.log(`Positioned ${npcArray.length} NPCs in ${factionName} centered tree at ${Math.round(sliceCenter * 180 / Math.PI)}°`);
      }

      // Auto-fit viewport to show all visible nodes after expansion
      setTimeout(() => {
        if (cyRef.current) {
          cyRef.current.fit(cyRef.current.nodes(), 80); // Padding for breathing room
        }
      }, 200);
    }, 150);
  };

  const handleOpenNodeEditor = (node?: any) => {
    setEditingNode(node || null);
    setNodeEditorOpen(true);
  };

  const handleStartAddEdgeMode = () => {
    setAddEdgeMode(true);
    setSelectedNode(null); // Close details panel
  };

  const handleCancelAddEdgeMode = () => {
    setAddEdgeMode(false);
    setEdgeSourceNode(null);
    setEdgeTargetNode(null);
    setEdgeFormData({
      edgeType: '',
      customEdgeType: '',
      directed: true,
      metadata: { strength: '', context: '' }
    });
  };

  const handleNodeClickForEdge = (nodeData: any) => {
    if (!addEdgeMode) return false; // Not in edge mode

    if (!edgeSourceNode) {
      // First click: select source
      setEdgeSourceNode(nodeData);
      return true;
    } else if (edgeSourceNode.id === nodeData.id) {
      // Clicking same node: deselect
      setEdgeSourceNode(null);
      return true;
    } else {
      // Second click: select target and open modal
      setEdgeTargetNode(nodeData);
      setShowEdgeModal(true);
      return true;
    }
  };

  const handleSubmitEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !graphId || !edgeSourceNode || !edgeTargetNode) return;

    const finalEdgeType = edgeFormData.edgeType === 'custom' ? edgeFormData.customEdgeType : edgeFormData.edgeType;

    if (!finalEdgeType.trim()) {
      alert('Please select or enter a relationship type');
      return;
    }

    try {
      setEdgeSubmitting(true);

      const metadata: any = {};
      if (edgeFormData.metadata.strength) metadata.strength = edgeFormData.metadata.strength;
      if (edgeFormData.metadata.context) metadata.context = edgeFormData.metadata.context;

      const edgeData: any = {
        source_node_id: edgeSourceNode.id,
        target_node_id: edgeTargetNode.id,
        edge_type: finalEdgeType.trim(),
        directed: edgeFormData.directed, // Send boolean, backend converts
        metadata: Object.keys(metadata).length > 0 ? metadata : null // Send object, backend stringifies
      };

      console.log('Creating edge:', edgeData);
      const result = await graphService.createEdge(campaignId, graphId, edgeData);
      console.log('Edge created:', result);
      await loadPoliticalWebGraph(); // Refresh

      // Close modal and reset
      setShowEdgeModal(false);
      handleCancelAddEdgeMode();
    } catch (err: any) {
      console.error('Failed to create edge:', err);
      alert('Failed to create relationship: ' + (err.response?.data?.error || err.message));
    } finally {
      setEdgeSubmitting(false);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!campaignId || !graphId) return;
    if (!confirm('Delete this node and all its connections?')) return;

    try {
      await graphService.deleteNode(campaignId, graphId, nodeId);
      loadPoliticalWebGraph(); // Refresh
    } catch (err: any) {
      console.error('Failed to delete node:', err);
      alert('Failed to delete node: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteEdge = async (edgeId: string) => {
    if (!campaignId || !graphId) return;
    if (!confirm('Delete this relationship?')) return;

    try {
      await graphService.deleteEdge(campaignId, graphId, edgeId);
      loadPoliticalWebGraph(); // Refresh
    } catch (err: any) {
      console.error('Failed to delete edge:', err);
      alert('Failed to delete edge: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleResetView = () => {
    if (!cyRef.current) return;

    // DON'T collapse factions - just re-organize all visible nodes
    const cy = cyRef.current;

    // Position The Party faction at (0,0) if visible (not expanded)
    const partyFaction = cy.nodes('[?isFaction]').filter((n: any) => n.data('faction') === 'The Party');
    if (partyFaction.length > 0) {
      partyFaction.position({ x: 0, y: 0 });
      partyFaction.lock();
    }

    // RING ENFORCEMENT (no physics - direct positioning like kernel security rings)
    // Ring 0: Party/PCs at 0-100px (locked)
    // Ring 1: Factions at 150-250px
    // Ring 2: NPCs at 400-500px

    // Define ring constants (increased faction distance from party)
    const FACTION_INNER = 150;  // Increased from 75 to give more breathing room
    const FACTION_OUTER = 200;  // Increased from 125
    const NPC_LEADER_INNER = 200;   // Leaders - Ring 2
    const NPC_LEADER_OUTER = 250;
    const NPC_LIEUTENANT_INNER = 250; // Lieutenants - Ring 2.5
    const NPC_LIEUTENANT_OUTER = 325;
    const NPC_MEMBER_INNER = 325;   // Members - Ring 3
    const NPC_MEMBER_OUTER = 400;

    const factionNodes = cy.nodes('[?isFaction]').filter((n: any) => n.data('faction') !== 'The Party');
    const npcNodes = cy.nodes('[!isFaction][!isPC]');
    const pcNodes = cy.nodes('[?isPC]');

    // RING 1: Factions centered in their pie slices
    const factionArray = factionNodes.toArray();
    const allPieSlices = getFactionPieSlices(); // Renamed to avoid collision

    factionArray.forEach((node: any) => {
      const factionName = node.data('faction');
      const slice = allPieSlices[factionName];

      if (!slice) {
        console.error(`No pie slice for faction: ${factionName}`);
        return;
      }

      // Place faction at CENTER of its pie slice
      const angle = slice.center;
      const radius = FACTION_INNER + (FACTION_OUTER - FACTION_INNER) / 2; // Mid-point of Ring 1

      node.animate({
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        },
        duration: 800,
        easing: 'ease-in-out'
      });

      console.log(`Faction ${factionName} centered at ${Math.round(angle * 180 / Math.PI)}° in slice ${Math.round(slice.start * 180 / Math.PI)}°-${Math.round(slice.end * 180 / Math.PI)}°`);
    });

    // RING 2/3: NPCs grouped by faction with PIE-SLICE allocation
    const npcArray = npcNodes.toArray();

    // Group NPCs by faction
    const npcsByFaction: Record<string, any[]> = {};
    npcArray.forEach((node: any) => {
      const faction = node.data('faction');
      if (!npcsByFaction[faction]) {
        npcsByFaction[faction] = [];
      }
      npcsByFaction[faction].push(node);
    });

    // Use SHARED pie-slice helper (already called above as allPieSlices)
    Object.entries(npcsByFaction).forEach(([factionName, npcs]) => {
      const slice = allPieSlices[factionName];
      if (!slice) {
        console.error(`[RESET] No pie slice found for ${factionName}`);
        return;
      }

      // Separate by hierarchy for TREE placement
      const leaders = npcs.filter(n => n.data('nodeType') === 'NPC:leader');
      const lieutenants = npcs.filter(n => n.data('nodeType') === 'NPC:lieutenant');
      const members = npcs.filter(n =>
        n.data('nodeType') !== 'NPC:leader' && n.data('nodeType') !== 'NPC:lieutenant'
      );

      const sliceCenter = slice.center; // Center angle of this faction's pie

      // TREE PLACEMENT: Leaders at slice center, others radiate outward

      // Leaders: Center if 1, spread if multiple (matches expansion logic)
      leaders.forEach((node: any, index: number) => {
        let angle;
        if (leaders.length === 1) {
          angle = sliceCenter; // Single leader at exact center
        } else {
          // Multiple leaders (8 Writ holders): spread across 75% of pie slice
          const usableForLeaders = (slice.end - slice.start) * 0.75;
          const leaderStart = sliceCenter - usableForLeaders / 2;
          angle = leaderStart + (index / (leaders.length - 1)) * usableForLeaders;
        }
        const radius = NPC_LEADER_INNER + (NPC_LEADER_OUTER - NPC_LEADER_INNER) / 2;
        node.animate({
          position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
          duration: 800,
          easing: 'ease-in-out'
        });
      });

      // Lieutenants: Spread symmetrically around slice center
      lieutenants.forEach((node: any, index: number) => {
        const spreadAngle = sliceCenter + (index - (lieutenants.length - 1) / 2) * 0.22; // ~12.6° spacing
        const radius = NPC_LIEUTENANT_INNER + (NPC_LIEUTENANT_OUTER - NPC_LIEUTENANT_INNER) / 2;
        node.animate({
          position: { x: Math.cos(spreadAngle) * radius, y: Math.sin(spreadAngle) * radius },
          duration: 800,
          easing: 'ease-in-out'
        });
      });

      // Members: Use MOST of pie slice (wider spread for 7+ NPCs)
      members.forEach((node: any, index: number) => {
        const usablePie = (slice.end - slice.start) * 0.85; // Increased from 60% to 85%
        const memberStart = sliceCenter - usablePie / 2;
        const spreadAngle = memberStart + (index / Math.max(members.length - 1, 1)) * usablePie;
        const radius = NPC_MEMBER_INNER + (NPC_MEMBER_OUTER - NPC_MEMBER_INNER) / 2;
        node.animate({
          position: { x: Math.cos(spreadAngle) * radius, y: Math.sin(spreadAngle) * radius },
          duration: 800,
          easing: 'ease-in-out'
        });
      });

      console.log(`[RESET] ${factionName}: ${leaders.length}L + ${lieutenants.length}Lt + ${members.length}M at pie center ${Math.round(sliceCenter * 180 / Math.PI)}°`);
    });

    // Wait for positioning animations to complete before collision enforcement
    setTimeout(() => {
      if (!cyRef.current) return;

      // COLLISION ENFORCEMENT: Respect pie-slice boundaries
      const MIN_DISTANCE_SAME_FACTION = 40; // Significantly increased for visibility
      const MIN_DISTANCE_DIFF_FACTION = 100; // Strong separation between factions
      const MAX_ITERATIONS = 8; // More iterations to resolve all collisions
      const cy = cyRef.current;

      console.log(`Starting collision detection: MIN_SAME=${MIN_DISTANCE_SAME_FACTION}px, MIN_DIFF=${MIN_DISTANCE_DIFF_FACTION}px, iterations=${MAX_ITERATIONS}`);

      // Use pie slices from parent scope (already calculated as allPieSlices)
      const factionPieSlices = allPieSlices;

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        let hadCollision = false;
        let collisionCount = 0;

        console.log(`Iteration ${iteration + 1}...`);

        cy.nodes().forEach((node1: any) => {
          if (node1.locked()) return;
          const pos1 = node1.position();
          const faction1 = node1.data('faction');

          cy.nodes().forEach((node2: any) => {
            if (node1.id() === node2.id() || node2.locked()) return;

            const pos2 = node2.position();
            const faction2 = node2.data('faction');
            const dx = pos2.x - pos1.x;
            const dy = pos2.y - pos1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Use different minimum distance for same vs different faction
            const minDist = faction1 === faction2 ? MIN_DISTANCE_SAME_FACTION : MIN_DISTANCE_DIFF_FACTION;

            if (dist < minDist && dist > 0) {
              hadCollision = true;
              collisionCount++;

              // Get current radial distance and angle for node2
              const dist2 = Math.sqrt(pos2.x * pos2.x + pos2.y * pos2.y);
              const angle2 = Math.atan2(pos2.y, pos2.x);

              // Determine ring boundaries for node2 (3-tier hierarchy)
              const isFaction2 = node2.data('isFaction');
              const nodeType2 = node2.data('nodeType');
              let minRadius, maxRadius;

              if (isFaction2) {
                minRadius = FACTION_INNER;
                maxRadius = FACTION_OUTER;
              } else if (nodeType2 === 'NPC:leader') {
                minRadius = NPC_LEADER_INNER;    // Ring 2
                maxRadius = NPC_LEADER_OUTER;
              } else if (nodeType2 === 'NPC:lieutenant') {
                minRadius = NPC_LIEUTENANT_INNER; // Ring 2.5
                maxRadius = NPC_LIEUTENANT_OUTER;
              } else {
                // NPC:minor, NPC:mentioned, or default
                minRadius = NPC_MEMBER_INNER;     // Ring 3
                maxRadius = NPC_MEMBER_OUTER;
              }

              // Calculate push
              const angleToNode1 = Math.atan2(pos1.y, pos1.x);
              let angleDiff = angle2 - angleToNode1;
              if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
              if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

              const pushDirection = angleDiff > 0 ? 1 : -1;

              // Get node2's pie-slice boundaries
              const faction2 = node2.data('faction');
              const pieSlice = factionPieSlices[faction2];

              // Test candidates with PIE-SLICE CLAMPING
              const candidates = [
                { angle: angle2 + pushDirection * 0.08, radius: dist2 },     // Angular push (5°)
                { angle: angle2 + pushDirection * 0.12, radius: dist2 + 5 }, // More angular + radial out
                { angle: angle2, radius: dist2 + 10 }                        // Radial only (push outward)
              ];

              let bestCandidate = candidates[0];
              let bestScore = -Infinity;

              candidates.forEach(candidate => {
                // Clamp radius to ring boundaries
                let clampedRadius = Math.max(minRadius, Math.min(candidate.radius, maxRadius));
                let clampedAngle = candidate.angle;

                // ENFORCE PIE-SLICE BOUNDARIES (prevent escaping to opposite side)
                if (pieSlice) {
                  // Normalize angle to 0-2π
                  while (clampedAngle < 0) clampedAngle += 2 * Math.PI;
                  while (clampedAngle >= 2 * Math.PI) clampedAngle -= 2 * Math.PI;

                  // Clamp to pie slice
                  if (clampedAngle < pieSlice.start || clampedAngle > pieSlice.end) {
                    // Outside slice - clamp to nearest boundary
                    const distToStart = Math.abs(clampedAngle - pieSlice.start);
                    const distToEnd = Math.abs(clampedAngle - pieSlice.end);
                    clampedAngle = distToStart < distToEnd ? pieSlice.start : pieSlice.end;
                  }
                }

                const testX = Math.cos(clampedAngle) * clampedRadius;
                const testY = Math.sin(clampedAngle) * clampedRadius;

                // Find 2 closest neighbors
                const distances: number[] = [];
                cy.nodes().forEach((other: any) => {
                  if (other.id() === node2.id()) return;
                  const otherPos = other.position();
                  const d = Math.sqrt((testX - otherPos.x) ** 2 + (testY - otherPos.y) ** 2);
                  distances.push(d);
                });

                distances.sort((a, b) => a - b);
                const score = distances[0] + (distances[1] || 0);

                if (score > bestScore) {
                  bestScore = score;
                  bestCandidate = { angle: clampedAngle, radius: clampedRadius };
                }
              });

              node2.position({
                x: Math.cos(bestCandidate.angle) * bestCandidate.radius,
                y: Math.sin(bestCandidate.angle) * bestCandidate.radius
              });
            }
          });
        });

        // Early exit if spacing is good (few collisions)
        if (!hadCollision || collisionCount < 3) {
          console.log(`Collision complete: ${collisionCount} adjustments in ${iteration + 1} iterations`);
          break;
        }
      }

      console.log('Pie-slice enforcement complete: All NPCs constrained to faction territories');
    }, 850); // Wait for 800ms animations + 50ms buffer

    // Save faction positions
    const positions: Record<string, {x: number, y: number}> = {};
    cy.nodes('[?isFaction]').forEach((node: any) => {
      const factionName = node.data('faction');
      const pos = node.position();
      if (factionName) {
        positions[factionName] = { x: pos.x, y: pos.y };
      }
    });
    setFactionPositions(prev => ({ ...prev, ...positions }));

    // Fit viewport to show all nodes with better zoom
    cy.fit(cy.nodes(), 50); // Reduced padding for tighter fit
  };

  const handleFactionClick = (factionNode: any) => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    // Clear any pending details timer to prevent duplicate calls
    if (detailsTimerRef.current) {
      clearTimeout(detailsTimerRef.current);
      detailsTimerRef.current = null;
    }

    // Save viewport before zooming
    previousViewportRef.current = {
      zoom: cy.zoom(),
      pan: cy.pan()
    };

    // Clear previous highlighting
    cy.elements().removeClass('dimmed highlighted-edge highlighted');

    // Highlight edges connected to this faction (faction-to-faction, faction-to-NPC)
    const connectedEdges = factionNode.connectedEdges();
    connectedEdges.addClass('highlighted-edge');

    // Highlight connected nodes (other factions or NPCs)
    const connectedNodes = factionNode.neighborhood('node');
    connectedNodes.addClass('highlighted');

    // Dim everything else
    cy.elements().forEach((ele: any) => {
      if (ele.isNode()) {
        if (ele.id() !== factionNode.id() && !connectedNodes.some((n: any) => n.id() === ele.id())) {
          ele.addClass('dimmed');
        }
      } else if (ele.isEdge()) {
        if (!connectedEdges.some((e: any) => e.id() === ele.id())) {
          ele.addClass('dimmed');
        }
      }
    });

    // Zoom to faction after brief delay (don't set selected node yet - grace period)
    detailsTimerRef.current = window.setTimeout(() => {
      setSelectedNode(factionNode.data());

      // Zoom centered on faction node using direct pan calculation (avoid cy.center oscillation)
      const factionPos = factionNode.position();
      const targetZoom = 1.5;
      const viewportWidth = cy.width();
      const viewportHeight = cy.height();

      cy.animate({
        zoom: targetZoom,
        pan: {
          x: viewportWidth / 2 - factionPos.x * targetZoom,
          y: viewportHeight / 2 - factionPos.y * targetZoom
        },
        duration: 500,
        easing: 'ease-in-out'
      });
    }, 300); // 300ms grace period
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

    // Draw ring guides (visual indicators)
    const zoom = cy.zoom();
    const pan = cy.pan();

    // Graph (0,0) in screen coordinates = pan position
    const centerX = pan.x;
    const centerY = pan.y;

    // Convert graph radius to screen radius
    const toScreen = (graphRadius: number) => graphRadius * zoom;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Ring 0: Party/PCs (50px)
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)'; // Gold for Party
    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(50), 0, Math.PI * 2);
    ctx.stroke();

    // Ring 1: Factions (150-200px)
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.2)'; // Blue for factions
    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(150), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(200), 0, Math.PI * 2);
    ctx.stroke();

    // Ring 2: NPC:leader (200-250px)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)'; // Red for leaders
    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(200), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(250), 0, Math.PI * 2);
    ctx.stroke();

    // Ring 2.5: NPC:lieutenant (250-325px)
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)'; // Orange for lieutenants
    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(250), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(325), 0, Math.PI * 2);
    ctx.stroke();

    // Ring 3: NPC:member (325-400px)
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.2)'; // Green for members
    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(325), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(400), 0, Math.PI * 2);
    ctx.stroke();

    // DEBUG MODE: Ring labels and pixel ruler
    if (showDebug) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 14px sans-serif';

      // Ring labels
      ctx.fillText('Ring 0: Party/PCs (0-50px)', centerX + 10, centerY - toScreen(50) - 10);
      ctx.fillText('Ring 1: Factions (150-200px)', centerX + 10, centerY - toScreen(150) - 10);
      ctx.fillText('Ring 2: Leaders (200-250px)', centerX + 10, centerY - toScreen(200) - 10);
      ctx.fillText('Ring 2.5: Lieutenants (250-325px)', centerX + 10, centerY - toScreen(250) - 10);
      ctx.fillText('Ring 3: Members (325-400px)', centerX + 10, centerY - toScreen(325) - 10);

      // Pixel ruler from center
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);

      for (let r = 0; r <= 300; r += 50) {
        // Tick marks every 50px
        ctx.beginPath();
        ctx.moveTo(centerX + toScreen(r), centerY - 10);
        ctx.lineTo(centerX + toScreen(r), centerY + 10);
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '10px monospace';
        ctx.fillText(`${r}px`, centerX + toScreen(r) + 5, centerY + 20);
      }

      // Show node positions
      cy.nodes().forEach((node: any) => {
        const pos = node.position();
        const renderedPos = node.renderedPosition();
        const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
        const angle = Math.atan2(pos.y, pos.x) * (180 / Math.PI);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '9px monospace';
        ctx.fillText(`${Math.round(dist)}px, ${Math.round(angle)}°`, renderedPos.x + 5, renderedPos.y - 5);
      });
    }

    ctx.restore();

    // Draw PIE-SLICE shading for each faction's territory
    // CRITICAL: Use getFactionPieSlices() to ensure same ordering
    const pieSlices = getFactionPieSlices();

    Object.entries(pieSlices).forEach(([factionName, slice]) => {
      const factionNode = cy.nodes(`[?isFaction][faction = "${factionName}"]`);
      if (factionNode.length === 0) return;

      const factionColor = factionNode.data('color') || '#6b7280';

      // Only draw pie if faction is expanded (has visible NPCs)
      const memberNodes = cy.nodes(`[faction = "${factionName}"][!isFaction]`);
      if (memberNodes.length === 0) return; // Skip empty factions

      // Use slice boundaries from shared helper
      const sliceStart = slice.start;
      const sliceEnd = slice.end;

      // Draw pie slice as ANNULUS (donut) - exclude Ring 0 (party area)
      ctx.save();
      ctx.fillStyle = `${factionColor}38`; // 22% opacity

      // Create path for annulus (outer arc - inner arc)
      ctx.beginPath();
      // Outer arc (Ring 3 outer edge)
      ctx.arc(centerX, centerY, toScreen(400), sliceStart, sliceEnd, false);
      // Inner arc (Ring 1 inner edge) - reverse direction
      ctx.arc(centerX, centerY, toScreen(150), sliceEnd, sliceStart, true);
      ctx.closePath();
      ctx.fill();

      // Draw radial borders (from Ring 1 to Ring 3)
      ctx.strokeStyle = `${factionColor}AA`; // 67% opacity
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(sliceStart) * toScreen(150), centerY + Math.sin(sliceStart) * toScreen(150));
      ctx.lineTo(centerX + Math.cos(sliceStart) * toScreen(400), centerY + Math.sin(sliceStart) * toScreen(400));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(sliceEnd) * toScreen(150), centerY + Math.sin(sliceEnd) * toScreen(150));
      ctx.lineTo(centerX + Math.cos(sliceEnd) * toScreen(400), centerY + Math.sin(sliceEnd) * toScreen(400));
      ctx.stroke();

      ctx.restore();

      console.log(`Drew pie slice for ${factionName}: ${Math.round(sliceStart * 180 / Math.PI)}° - ${Math.round(sliceEnd * 180 / Math.PI)}°`);
    });

    // Draw bundled PC edges (multi-leader style)
    const pcNodes = cy.nodes('[?isPC]');
    if (pcNodes.length > 0) {
      drawBundledPCEdges(ctx, cy);
    }
  }, [showDebug]);

  const drawBundledPCEdges = (ctx: CanvasRenderingContext2D, cy: Cytoscape.Core) => {
    // Group PC edges by target
    const pcEdges = cy.edges().filter((e: any) => {
      const source = e.source();
      return source.data('isPC');
    });

    const edgesByTarget: Record<string, any[]> = {};
    pcEdges.forEach((edge: any) => {
      const targetId = edge.target().id();
      if (!edgesByTarget[targetId]) {
        edgesByTarget[targetId] = [];
      }
      edgesByTarget[targetId].push(edge);
    });

    ctx.save();
    ctx.strokeStyle = '#10b981'; // Green for PC edges
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;

    Object.entries(edgesByTarget).forEach(([targetId, edges]) => {
      if (edges.length === 0) return;

      const target = cy.getElementById(targetId);
      const targetPos = target.renderedPosition();

      if (edges.length === 1) {
        // Single edge - draw simple curve
        const source = edges[0].source();
        const sourcePos = source.renderedPosition();

        ctx.beginPath();
        ctx.moveTo(sourcePos.x, sourcePos.y);
        ctx.quadraticCurveTo(
          (sourcePos.x + targetPos.x) / 2,
          (sourcePos.y + targetPos.y) / 2,
          targetPos.x,
          targetPos.y
        );
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(targetPos.y - sourcePos.y, targetPos.x - sourcePos.x);
        drawArrowhead(ctx, targetPos.x, targetPos.y, angle);
      } else {
        // Multiple PCs - bundle them using GRAPH coordinates
        const targetGraphPos = target.position();

        // Calculate merge point in GRAPH coordinates (80px from center toward target)
        const targetAngle = Math.atan2(targetGraphPos.y, targetGraphPos.x);
        const mergeGraphX = Math.cos(targetAngle) * 80;
        const mergeGraphY = Math.sin(targetAngle) * 80;

        // Transform merge point to screen coordinates
        const mergeScreenX = mergeGraphX * cy.zoom() + cy.pan().x;
        const mergeScreenY = mergeGraphY * cy.zoom() + cy.pan().y;

        // Draw individual S-curves from each PC to merge point
        edges.forEach((edge: any) => {
          const source = edge.source();
          const sourcePos = source.renderedPosition();

          // S-curve: PC → merge point with smoother control points
          ctx.beginPath();
          ctx.moveTo(sourcePos.x, sourcePos.y);

          // Perpendicular offset for smoother S
          const dx = mergeScreenX - sourcePos.x;
          const dy = mergeScreenY - sourcePos.y;
          const perpX = -dy * 0.15; // Perpendicular component
          const perpY = dx * 0.15;

          const ctrl1X = sourcePos.x + dx * 0.4 + perpX;
          const ctrl1Y = sourcePos.y + dy * 0.4 + perpY;
          const ctrl2X = sourcePos.x + dx * 0.6 - perpX;
          const ctrl2Y = sourcePos.y + dy * 0.6 - perpY;

          ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, mergeScreenX, mergeScreenY);
          ctx.stroke();

          // Hide the Cytoscape edge
          edge.style('opacity', 0);
        });

        // Draw single merged line: merge point → target
        ctx.lineWidth = 3; // Thicker for merged section
        ctx.beginPath();
        ctx.moveTo(mergeScreenX, mergeScreenY);

        // Smooth curve to target
        const dx = targetPos.x - mergeScreenX;
        const dy = targetPos.y - mergeScreenY;
        const perpX = -dy * 0.15;
        const perpY = dx * 0.15;

        const ctrl1X = mergeScreenX + dx * 0.4 + perpX;
        const ctrl1Y = mergeScreenY + dy * 0.4 + perpY;
        const ctrl2X = mergeScreenX + dx * 0.6 - perpX;
        const ctrl2Y = mergeScreenY + dy * 0.6 - perpY;

        ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, targetPos.x, targetPos.y);
        ctx.stroke();

        // Arrowhead at target
        const angle = Math.atan2(dy, dx);
        drawArrowhead(ctx, targetPos.x, targetPos.y, angle);

        // Draw label on merged line - text follows curve
        const edgeType = edges[0].data('label') || 'connected to';
        let words = edgeType.split(' ');

        // Check if line needs to be flipped
        const baseAngle = Math.atan2(dy, dx);
        const needsFlip = baseAngle > Math.PI / 2 || baseAngle < -Math.PI / 2;

        // Reverse word order if text will be flipped to keep reading order correct
        if (needsFlip) {
          words = words.reverse();
        }

        ctx.save();
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Position words along the curve from merge → target
        const totalWords = words.length;
        words.forEach((word, wordIndex) => {
          // Position along curve (evenly spaced)
          const t = (wordIndex + 1) / (totalWords + 1); // 0.25, 0.5, 0.75 for 3 words

          // Calculate point on bezier curve
          const t2 = t * t;
          const t3 = t2 * t;
          const mt = 1 - t;
          const mt2 = mt * mt;
          const mt3 = mt2 * mt;

          // Cubic bezier formula
          const x = mt3 * mergeScreenX +
                   3 * mt2 * t * ctrl1X +
                   3 * mt * t2 * ctrl2X +
                   t3 * targetPos.x;
          const y = mt3 * mergeScreenY +
                   3 * mt2 * t * ctrl1Y +
                   3 * mt * t2 * ctrl2Y +
                   t3 * targetPos.y;

          // Calculate tangent angle at this point on curve
          const derivative_x = 3 * mt2 * (ctrl1X - mergeScreenX) +
                              6 * mt * t * (ctrl2X - ctrl1X) +
                              3 * t2 * (targetPos.x - ctrl2X);
          const derivative_y = 3 * mt2 * (ctrl1Y - mergeScreenY) +
                              6 * mt * t * (ctrl2Y - ctrl1Y) +
                              3 * t2 * (targetPos.y - ctrl2Y);

          let wordAngle = Math.atan2(derivative_y, derivative_x);
          // Flip if upside-down
          if (wordAngle > Math.PI / 2) wordAngle -= Math.PI;
          if (wordAngle < -Math.PI / 2) wordAngle += Math.PI;

          // Draw word
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(wordAngle);

          // Stroke for outline
          ctx.strokeText(word, 0, 0);
          // Fill for text
          ctx.fillText(word, 0, 0);

          ctx.restore();
        });

        ctx.restore();

        ctx.lineWidth = 2; // Reset
      }
    });

    ctx.restore();
  };

  const drawArrowhead = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) => {
    const size = 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 2);
    ctx.lineTo(-size, size / 2);
    ctx.closePath();
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.restore();
  };

  // Metaball configuration (from World-Foundations)
  const METABALL_BASE_RADIUS = 40; // Smaller for compact Political-Web
  const METABALL_THRESHOLD = 0.6;
  const METABALL_MIN_RADIUS = 30; // Smaller protected zone
  const GRID_SIZE = 2;

  const calculateFieldStrength = (x: number, y: number, nodes: any[]): number => {
    let totalStrength = 0;

    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const maxRadius = node.radius || METABALL_BASE_RADIUS;

      if (dist === 0) {
        totalStrength += 1000;
      } else if (dist <= METABALL_MIN_RADIUS) {
        // Protected core
        const radiusSq = METABALL_MIN_RADIUS * METABALL_MIN_RADIUS;
        totalStrength += radiusSq / (dist * dist);
      } else {
        // Beyond minimum radius
        const radiusSq = maxRadius * maxRadius;
        const baseStrength = radiusSq / (dist * dist);

        if (dist > maxRadius) {
          // Soft decay beyond max
          const beyondMax = (dist - maxRadius) / maxRadius;
          const decayFactor = Math.pow(0.5, beyondMax);
          totalStrength += baseStrength * decayFactor;
        } else {
          totalStrength += baseStrength;
        }
      }
    }

    return totalStrength;
  };

  const drawMetaballAOE = (
    ctx: CanvasRenderingContext2D,
    points: Array<{ x: number; y: number; radius: number }>,
    color: string,
    factionName: string
  ) => {
    if (points.length === 0) return;

    // Use World-Foundations winner-takes-all algorithm
    // For this specific faction, render its metaball field
    ctx.save();
    ctx.fillStyle = `${color}48`; // 28% opacity like WF

    // Only render within bounding box of this faction's nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
      minX = Math.min(minX, p.x - p.radius - 50);
      minY = Math.min(minY, p.y - p.radius - 50);
      maxX = Math.max(maxX, p.x + p.radius + 50);
      maxY = Math.max(maxY, p.y + p.radius + 50);
    });

    // Render pixels where this faction's field exceeds threshold
    for (let y = Math.max(0, minY); y < Math.min(ctx.canvas.height, maxY); y += GRID_SIZE) {
      for (let x = Math.max(0, minX); x < Math.min(ctx.canvas.width, maxX); x += GRID_SIZE) {
        const strength = calculateFieldStrength(x, y, points);

        if (strength >= METABALL_THRESHOLD) {
          ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
        }
      }
    }

    ctx.restore();
  };

  // Cytoscape stylesheet
  const cytoscapeStylesheet = [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'shape': 'ellipse', // Default: circles for NPCs
        'opacity': 'data(opacity)', // Use data property for dynamic opacity
        'min-zoomed-font-size': 8, // Always show labels when zoomed in
        'width': (ele: any) => {
          const isPC = ele.data('isPC');
          const isFaction = ele.data('isFaction');
          const isParty = ele.data('faction') === 'The Party';

          if (isParty && isFaction) return 60; // Party star stays same size
          if (isPC) return 24; // 60% of 40
          if (isFaction) return 36; // 60% of 60
          // NPCs: small by default, scaled to 60%
          const degree = ele.data('degree') || 0;
          return Math.min((12 + degree * 1.2), 30); // 60% of (20 + degree*2, max 50)
        },
        'height': (ele: any) => {
          const isPC = ele.data('isPC');
          const isFaction = ele.data('isFaction');
          const isParty = ele.data('faction') === 'The Party';

          if (isParty && isFaction) return 60; // Party star stays same size
          if (isPC) return 24; // 60% of 40
          if (isFaction) return 36; // 60% of 60
          const degree = ele.data('degree') || 0;
          return Math.min((12 + degree * 1.2), 30); // 60% of (20 + degree*2, max 50)
        },
        'font-size': (ele: any) => {
          const isPC = ele.data('isPC');
          const isFaction = ele.data('isFaction');
          if (isPC || isFaction) return 11; // Smaller, cleaner
          // NPCs: no label until selected
          return 0;
        },
        'text-valign': 'top', // Position above nodes
        'text-halign': 'center',
        'text-margin-y': -5, // Push text up slightly
        'text-wrap': 'wrap', // Enable text wrapping
        'text-max-width': (ele: any) => {
          const isFaction = ele.data('isFaction');
          return isFaction ? 120 : 80; // Factions get more width
        },
        'color': '#ffffff',
        'font-family': 'Inter, system-ui, -apple-system, sans-serif', // Clean modern font
        'font-weight': 500,
        'text-outline-width': 0.5, // Thin outline
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
        'shape': 'vee', // Upside-down triangle
        'border-width': 2,
        'border-color': '#ffffff'
      }
    },
    // The Party faction - special star shape
    {
      selector: 'node[isFaction][faction = "The Party"]',
      style: {
        'shape': 'star',
        'border-width': 3,
        'border-color': '#fbbf24'
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
    // Edges - HIDDEN by default
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#4b5563',
        'target-arrow-color': '#4b5563',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'opacity': 0, // Hidden by default
        'label': ''
      }
    },
    // Faction-to-faction edges - ALWAYS visible (low opacity)
    {
      selector: 'edge[source_is_faction]',
      style: {
        'line-color': '#64748b',
        'target-arrow-color': '#64748b',
        'width': 2,
        'opacity': 0.3 // Low opacity for faction connections
      }
    },
    // Aggregated Party edges - dashed style
    {
      selector: 'edge[is_aggregate]',
      style: {
        'line-color': '#10b981',
        'target-arrow-color': '#10b981',
        'width': 3,
        'opacity': 0.6,
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3]
      }
    },
    // PC edges - visible (solid)
    {
      selector: 'edge[source_is_pc], edge[target_is_pc]',
      style: {
        'line-color': '#10b981',
        'target-arrow-color': '#10b981',
        'width': 2,
        'opacity': 0.5
      }
    },
    // Highlighted edges - show with labels
    {
      selector: 'edge.highlighted-edge',
      style: {
        'opacity': 0.6,
        'label': 'data(label)',
        'font-size': 12,
        'color': '#ffffff',
        'text-background-color': '#000000',
        'text-background-opacity': 0.7,
        'text-background-padding': '3px',
        'text-background-shape': 'roundrectangle'
      }
    },
    // Dimmed elements
    {
      selector: '.dimmed',
      style: {
        'opacity': 0.2
      }
    },
    // Highlighted nodes (show label)
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 4,
        'border-color': '#fbbf24'
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
          <button className="action-button" onClick={() => setShowDebug(!showDebug)}>
            {showDebug ? 'Hide' : 'Show'} Debug
          </button>
          <button className="action-button" onClick={handleResetView}>
            <RotateCcw size={16} /> Reset View
          </button>
          <button className="action-button" onClick={() => handleOpenNodeEditor()} style={{ background: '#10b981' }}>
            <Plus size={16} /> Add Node
          </button>
          {addEdgeMode ? (
            <button
              className="action-button"
              onClick={handleCancelAddEdgeMode}
              style={{ background: '#dc2626' }}
            >
              Cancel Relationship Mode
            </button>
          ) : (
            <button
              className="action-button"
              onClick={handleStartAddEdgeMode}
              style={{ background: '#a855f7' }}
            >
              <Plus size={16} /> Add Relationship
            </button>
          )}
        </div>
      </header>

      {/* Visual Indicator for Edge Creation Mode */}
      {addEdgeMode && (
        <div style={{
          position: 'absolute',
          top: '80px',
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
            <p>Click on a node to select the source</p>
          ) : (
            <p>Source: <strong>{edgeSourceNode.label}</strong> → Now click the target node</p>
          )}
        </div>
      )}

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

      {/* Edge Details Panel */}
      {/* Faction Color Legend */}
      <div className="faction-legend">
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#94a3b8' }}>Factions</h4>
        {allNodes
          .filter(n => n.attributes?.is_faction_node && n.attributes?.faction !== 'The Party')
          .map(faction => (
            <div key={faction.id} className="faction-legend-item">
              <div
                className="faction-color-box"
                style={{ backgroundColor: faction.attributes?.color || '#6b7280' }}
              />
              <span className="faction-name">{faction.name}</span>
              <span className="faction-count">({faction.attributes?.member_count || 0})</span>
            </div>
          ))}
      </div>

      {selectedEdge && (
        <div className="node-details-panel" style={{ bottom: selectedNode ? '22rem' : '2rem' }}>
          <div className="node-details-header">
            <h3>Relationship</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="button-icon button-danger"
                onClick={() => handleDeleteEdge(selectedEdge.id)}
                title="Delete relationship"
              >
                <Trash2 size={16} />
              </button>
              <button className="close-details" onClick={() => setSelectedEdge(null)}>×</button>
            </div>
          </div>
          <div className="node-details-content">
            <div className="detail-row">
              <span className="detail-label">Type:</span>
              <span className="detail-value">{selectedEdge.label}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">From:</span>
              <span className="detail-value">{selectedEdge.sourceName}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">To:</span>
              <span className="detail-value">{selectedEdge.targetName}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Direction:</span>
              <span className="detail-value">{selectedEdge.directed ? '→ Directed' : '↔ Bidirectional'}</span>
            </div>
          </div>
        </div>
      )}

      {selectedNode && (
        <div className="node-details-panel">
          <div className="node-details-header">
            <h3>{selectedNode.label}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="button-icon"
                onClick={() => handleOpenNodeEditor(selectedNode.nodeData)}
                title="Edit node"
              >
                <Edit3 size={16} />
              </button>
              <button
                className="button-icon button-danger"
                onClick={() => handleDeleteNode(selectedNode.id)}
                title="Delete node"
              >
                <Trash2 size={16} />
              </button>
              <button className="close-details" onClick={() => setSelectedNode(null)}>×</button>
            </div>
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

            // Set initial viewport BEFORE layout runs - tighter zoom when few nodes
            cy.zoom(0.8); // Reduced from 1.25 for wider view
            cy.pan({ x: cy.width() / 2, y: cy.height() / 2 });

            // Remove any existing listeners to prevent duplicates
            cy.removeAllListeners();

            // Set up event listeners
            cy.on('tap', 'node', (evt) => {
              const node = evt.target;
              const nodeData = node.data();

              // Check if in edge creation mode first
              if (addEdgeMode) {
                const handled = handleNodeClickForEdge(nodeData);
                if (handled) return; // Don't do normal click behavior
              }

              if (node.data('isFaction')) {
                // Single-click faction: show details + highlight
                handleFactionClick(node);
              } else {
                // NPC/PC click: zoom and show details
                // Save viewport
                previousViewportRef.current = {
                  zoom: cy.zoom(),
                  pan: cy.pan()
                };

                // Zoom to node
                const nodePos = node.position();
                const targetZoom = 1.5;
                const viewportWidth = cy.width();
                const viewportHeight = cy.height();

                cy.animate({
                  zoom: targetZoom,
                  pan: {
                    x: viewportWidth / 2 - nodePos.x * targetZoom,
                    y: viewportHeight / 2 - nodePos.y * targetZoom
                  },
                  duration: 500,
                  easing: 'ease-in-out'
                });

                setSelectedNode(node.data());
              }
            });

            // Right-click faction to expand (removed double-click)
            cy.on('cxttap', 'node[isFaction]', (evt) => {
              const node = evt.target;
              const factionName = node.data('faction');
              const position = node.position();
              handleFactionExpand(factionName, position);
            });

            // Edge click handler
            cy.on('tap', 'edge', (evt) => {
              const edge = evt.target;
              const edgeData = edge.data();

              // Find source and target nodes for display
              const sourceNode = allNodes.find(n => n.id === edgeData.source);
              const targetNode = allNodes.find(n => n.id === edgeData.target);

              setSelectedEdge({
                ...edgeData,
                sourceName: sourceNode?.name || 'Unknown',
                targetName: targetNode?.name || 'Unknown',
                edgeObject: allEdges.find(e => e.id === edgeData.id)
              });
              setSelectedNode(null); // Close node panel
            });

            cy.on('tap', (evt) => {
              if (evt.target === cy) {
                // Clear selections and restore viewport
                setSelectedNode(null);
                setSelectedEdge(null);
                cy.elements().removeClass('dimmed highlighted-edge highlighted');

                // Restore saved viewport if exists
                if (previousViewportRef.current) {
                  cy.animate({
                    zoom: previousViewportRef.current.zoom,
                    pan: previousViewportRef.current.pan,
                    duration: 400,
                    easing: 'ease-out'
                  });
                  previousViewportRef.current = null;
                }
              }
            });

            // Right-click on NPC/PC to collapse back to faction
            cy.on('cxttap', 'node', (evt) => {
              const node = evt.target;

              if (!node.data('isFaction')) {
                // This is an NPC or PC - collapse back to faction
                const factionName = node.data('faction');
                if (factionName) {
                  handleFactionCollapse(factionName);
                }
              }
            });

            // Render metaballs and update on viewport changes
            cy.on('viewport', () => {
              if (cyRef.current) {
                renderFactionMetaballs(cyRef.current);
              }
            });

            // Initial draw of rings and edges
            setTimeout(() => {
              if (cyRef.current) {
                renderFactionMetaballs(cyRef.current);
              }
            }, 100);

            // Redraw on any position change
            cy.on('position', 'node', () => {
              if (cyRef.current) {
                renderFactionMetaballs(cyRef.current);
              }
            });
          }}
          layout={{
            name: 'preset' // Don't auto-run layout on element changes
          } as any}
        />
      </div>

      {/* Node Editor Dialog */}
      {graphId && (
        <GraphNodeEditorDialog
          open={nodeEditorOpen}
          onClose={() => {
            setNodeEditorOpen(false);
            setEditingNode(null);
          }}
          campaignId={campaignId!}
          graphId={graphId}
          graphType="Political-Web"
          node={editingNode}
          onSave={loadPoliticalWebGraph}
        />
      )}

      {/* Edge Creation Modal (Rich Form) */}
      {showEdgeModal && edgeSourceNode && edgeTargetNode && (
        <div className="modal-overlay" onClick={() => setShowEdgeModal(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2 className="dialog-title">Create Relationship</h2>
            <p className="dialog-description">
              Connect <strong>{edgeSourceNode.label}</strong> to <strong>{edgeTargetNode.label}</strong>
            </p>

            <form onSubmit={handleSubmitEdge} className="graph-edge-form">
              {/* Relationship Type */}
              <div className="form-field">
                <label htmlFor="edgeType">
                  Relationship Type <span className="required">*</span>
                </label>
                <select
                  id="edgeType"
                  value={edgeFormData.edgeType}
                  onChange={(e) => setEdgeFormData({ ...edgeFormData, edgeType: e.target.value })}
                  required
                  className="select-input"
                >
                  <option value="">Select relationship...</option>
                  <optgroup label="Hierarchy Relations (Directed)">
                    <option value="commands">commands</option>
                    <option value="reports to">reports to</option>
                    <option value="member of">member of</option>
                    <option value="contains member">contains member</option>
                    <option value="leads">leads</option>
                  </optgroup>
                  <optgroup label="Alliance Relations (Bidirectional)">
                    <option value="allied with">allied with</option>
                    <option value="supports">supports</option>
                    <option value="trades with">trades with</option>
                    <option value="opposes">opposes</option>
                  </optgroup>
                  <optgroup label="Power Relations (Directed)">
                    <option value="controls">controls</option>
                    <option value="governs">governs</option>
                    <option value="employs">employs</option>
                    <option value="bound by pact">bound by pact</option>
                  </optgroup>
                  <optgroup label="Knowledge Relations (Directed)">
                    <option value="knows about">knows about</option>
                    <option value="expert on">expert on</option>
                    <option value="taught by">taught by</option>
                    <option value="unaware of">unaware of</option>
                    <option value="spies on">spies on</option>
                  </optgroup>
                  <optgroup label="Emotional Relations (Directed)">
                    <option value="trusts">trusts</option>
                    <option value="distrusts">distrusts</option>
                    <option value="seeks vengeance against">seeks vengeance against</option>
                    <option value="indebted to">indebted to</option>
                    <option value="sworn enemy of">sworn enemy of</option>
                  </optgroup>
                  <optgroup label="PC Faction Membership">
                    <option value="part of">part of (special PC membership)</option>
                  </optgroup>
                  <option value="custom">➕ Custom relationship...</option>
                </select>

                {edgeFormData.edgeType === 'custom' && (
                  <input
                    type="text"
                    value={edgeFormData.customEdgeType}
                    onChange={(e) => setEdgeFormData({ ...edgeFormData, customEdgeType: e.target.value })}
                    className="text-input"
                    placeholder="Enter custom relationship type..."
                    style={{ marginTop: '0.5rem' }}
                    autoFocus
                  />
                )}
              </div>

              {/* Directed Toggle */}
              <div className="form-field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={edgeFormData.directed}
                    onChange={(e) => setEdgeFormData({ ...edgeFormData, directed: e.target.checked })}
                  />
                  <span>Directed relationship (one-way arrow)</span>
                </label>
                <small className="field-hint">
                  {edgeFormData.directed
                    ? `→ ${edgeSourceNode.label} influences ${edgeTargetNode.label} (one direction)`
                    : `↔ Mutual relationship (bidirectional)`
                  }
                </small>
              </div>

              {/* Metadata: Relationship Strength (optional) */}
              <div className="form-field">
                <label htmlFor="strength">Relationship Strength (optional)</label>
                <select
                  id="strength"
                  value={edgeFormData.metadata.strength}
                  onChange={(e) => setEdgeFormData({
                    ...edgeFormData,
                    metadata: { ...edgeFormData.metadata, strength: e.target.value }
                  })}
                  className="select-input"
                >
                  <option value="">None specified</option>
                  <option value="weak">Weak</option>
                  <option value="moderate">Moderate</option>
                  <option value="strong">Strong</option>
                </select>
                <small className="field-hint">
                  How strong is this relationship? (affects AI interpretation)
                </small>
              </div>

              {/* Metadata: Context (optional) */}
              <div className="form-field">
                <label htmlFor="context">Additional Context (optional)</label>
                <textarea
                  id="context"
                  value={edgeFormData.metadata.context}
                  onChange={(e) => setEdgeFormData({
                    ...edgeFormData,
                    metadata: { ...edgeFormData.metadata, context: e.target.value }
                  })}
                  className="textarea-input"
                  rows={2}
                  placeholder="e.g., 'Secret alliance formed in Session 12' or 'Discovered by party'"
                />
              </div>

              <details style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                <summary style={{ cursor: 'pointer' }}>
                  <Info size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                  Relationship Guide
                </summary>
                <div style={{ marginTop: '0.5rem', lineHeight: '1.6' }}>
                  <p><strong>Hierarchy:</strong> commands, reports to, member of, leads (usually directed)</p>
                  <p><strong>Alliance:</strong> allied with (bidirectional), supports, opposes</p>
                  <p><strong>Power:</strong> controls, governs, employs (directed)</p>
                  <p><strong>Knowledge:</strong> knows about, expert on, unaware of (directed)</p>
                  <p><strong>Emotional:</strong> trusts, seeks vengeance against, indebted to (directed)</p>
                </div>
              </details>

              {/* Action Buttons */}
              <div className="dialog-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowEdgeModal(false);
                    setEdgeFormData({
                      edgeType: '',
                      customEdgeType: '',
                      directed: true,
                      metadata: { strength: '', context: '' }
                    });
                  }}
                  className="button-secondary"
                  disabled={edgeSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={edgeSubmitting || (!edgeFormData.edgeType || (edgeFormData.edgeType === 'custom' && !edgeFormData.customEdgeType.trim()))}
                  style={{ background: '#a855f7' }}
                >
                  {edgeSubmitting ? 'Creating...' : 'Create Relationship'}
                </button>
              </div>
            </form>

            <button
              className="dialog-close"
              onClick={() => setShowEdgeModal(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { PoliticalWebPage };
export default PoliticalWebPage;
