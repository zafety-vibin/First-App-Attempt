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
  const [allNodes, setAllNodes] = useState<any[]>([]); // Store all nodes from API
  const [allEdges, setAllEdges] = useState<any[]>([]); // Store all edges from API
  const [elements, setElements] = useState<any[]>([]); // Filtered elements for Cytoscape
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [expandedFactions, setExpandedFactions] = useState<Set<string>>(new Set()); // Track which factions are expanded
  const [factionPositions, setFactionPositions] = useState<Record<string, {x: number, y: number}>>({}); // Store faction node positions for NPC spawning
  const detailsTimerRef = useRef<number | null>(null);
  const previousViewportRef = useRef<{ zoom: number; pan: { x: number; y: number } } | null>(null);

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

      if (isFactionNode) {
        // Faction node visible ONLY if faction is NOT expanded
        if (!expandedFactions.has(faction)) {
          visibleNodes.push(n);
        }
      } else {
        // NPC/PC node visible ONLY if faction IS expanded
        if (expandedFactions.has(faction)) {
          visibleNodes.push(n);
        }
      }
    });

    // Only show edges between visible nodes
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    // Check if The Party faction is visible (collapsed)
    const partyFactionNode = visibleNodes.find(n =>
      n.attributes?.is_faction_node && n.attributes?.faction === 'The Party'
    );

    if (partyFactionNode) {
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

      // Create synthetic edges from Party faction to each target
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
    } else {
      // Party is expanded - show individual PC edges
      allEdges.forEach((e: any) => {
        if (visibleNodeIds.has(e.source_node_id) && visibleNodeIds.has(e.target_node_id)) {
          visibleEdges.push(e);
        }
      });
    }

    // Convert to Cytoscape format with initial positions
    const cyNodes = visibleNodes.map((n: any, index: number) => {
      const isPC = n.node_type === 'PC';
      const isFaction = n.attributes?.is_faction_node || false;
      const faction = n.attributes?.faction || 'Unaffiliated';

      // Check if this node already exists in Cytoscape (preserve position)
      let position = { x: 0, y: 0 };
      if (cyRef.current) {
        const existingNode = cyRef.current.getElementById(n.id);
        if (existingNode && existingNode.length > 0) {
          // Node exists - preserve its current position (don't reset it!)
          position = existingNode.position();
          return {
            data: {
              id: n.id,
              label: n.name,
              nodeType: n.node_type,
              nodeData: n,
              faction,
              color: n.attributes?.color || '#6b7280',
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
          // Generate random position on first load - tightened by 2x
          const angle = Math.random() * 2 * Math.PI;
          const radius = 75 + Math.random() * 50; // 75-125px
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
          label: n.name,
          nodeType: n.node_type,
          nodeData: n,
          faction,
          color: n.attributes?.color || '#6b7280',
          isPC,
          isFaction,
          memberCount: n.attributes?.member_count || 0,
          ...n.attributes
        },
        position, // Set initial position
        locked: isPC || (isFaction && faction === 'The Party') // Lock PCs and Party faction
      };
    });

    const cyEdges = visibleEdges.map((e: any) => ({
      data: {
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        label: e.edge_type,
        directed: e.directed,
        is_aggregate: e.is_aggregate || false // For aggregated Party edges
      }
    }));

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

    // Place faction in Ring 1 (75-125px) at average angle - tightened by 2x
    const factionRadius = 100; // Mid-point of Ring 1
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
        cyRef.current.fit(cyRef.current.nodes(), 80); // Tighter padding for compact graph
      }
    }, 200);
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
        // PC edges will be drawn on canvas by renderFactionMetaballs
      } else {
        // Other factions: Position NPCs by type (major vs minor)
        const memberNodes = cy.nodes(`[faction = "${factionName}"][!isFaction]`);
        const npcArray = memberNodes.toArray();

        // Get faction angle for grouping
        const factionAngle = Math.atan2(factionNodePosition.y, factionNodePosition.x);

        npcArray.forEach((node, index) => {
          // Sequential spiral from faction angle
          const angle = factionAngle + (index * 0.17); // 0.17 radians ≈ 10° per NPC

          // Determine ring based on node_type - tightened by 2x
          const nodeType = node.data('nodeType');
          const isMajor = nodeType === 'NPC:major';

          const innerRadius = isMajor ? 150 : 200; // Major: 150-200px, Minor: 200-250px
          const outerRadius = isMajor ? 200 : 250;
          const radius = innerRadius + Math.random() * (outerRadius - innerRadius);

          node.position({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
          });
        });

        console.log(`Positioned ${memberNodes.length} NPCs by type for ${factionName} (spiral from faction angle)`);

        // Zoom to fit all visible nodes after expansion
        setTimeout(() => {
          if (cyRef.current) {
            cyRef.current.fit(cyRef.current.nodes(), 80); // Tighter padding for compact graph
          }
        }, 100);
      }
    }, 150);
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

    // Define ring constants at function scope (tightened by 2x)
    const FACTION_INNER = 75;
    const FACTION_OUTER = 125;
    const NPC_MAJOR_INNER = 150; // Leaders/important NPCs
    const NPC_MAJOR_OUTER = 200;
    const NPC_MINOR_INNER = 200; // Common members
    const NPC_MINOR_OUTER = 250;

    const factionNodes = cy.nodes('[?isFaction]').filter((n: any) => n.data('faction') !== 'The Party');
    const npcNodes = cy.nodes('[!isFaction][!isPC]');
    const pcNodes = cy.nodes('[?isPC]');

    // RING 1: Factions evenly distributed at 150-250px
    const factionArray = factionNodes.toArray();

    factionArray.forEach((node: any, index: number) => {
      const angle = (index / factionArray.length) * 2 * Math.PI;
      const radius = FACTION_INNER + Math.random() * (FACTION_OUTER - FACTION_INNER);

      node.animate({
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        },
        duration: 800,
        easing: 'ease-in-out'
      });
    });

    // RING 2/3: NPCs grouped by faction, placed sequentially
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

    // For each faction, place NPCs sequentially spiraling from faction angle
    Object.entries(npcsByFaction).forEach(([factionName, npcs]) => {
      // Get faction's angular position - try current Cytoscape position first, then saved position
      const factionNode = cy.nodes('[?isFaction]').filter((n: any) => n.data('faction') === factionName);
      let factionAngle = 0;

      if (factionNode.length > 0) {
        // Faction is visible (not expanded) - use current position
        const pos = factionNode.position();
        factionAngle = Math.atan2(pos.y, pos.x);
      } else if (factionPositions[factionName]) {
        // Faction is expanded - use last saved position from state
        const pos = factionPositions[factionName];
        factionAngle = Math.atan2(pos.y, pos.x);
      } else {
        // No faction data at all - use even distribution
        const factionIndex = Object.keys(npcsByFaction).indexOf(factionName);
        const totalFactions = Object.keys(npcsByFaction).length;
        factionAngle = (factionIndex / totalFactions) * 2 * Math.PI;
      }

      // Place each NPC sequentially: factionAngle + (index × 0.17 radians)
      npcs.forEach((node: any, index: number) => {
        const angle = factionAngle + (index * 0.17); // 0.17 radians ≈ 10° per NPC

        // Determine ring based on node_type
        const nodeType = node.data('nodeType');
        const isMajor = nodeType === 'NPC:major';

        const innerRadius = isMajor ? NPC_MAJOR_INNER : NPC_MINOR_INNER;
        const outerRadius = isMajor ? NPC_MAJOR_OUTER : NPC_MINOR_OUTER;
        const radius = innerRadius + Math.random() * (outerRadius - innerRadius);

        console.log(`[RESET] ${node.data('label')}: type=${nodeType}, isMajor=${isMajor}, placing at ${Math.round(radius)}px, ${Math.round(angle * 180 / Math.PI)}°`);

        node.animate({
          position: {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
          },
          duration: 800,
          easing: 'ease-in-out'
        });
      });
    });

    // Wait for positioning animations to complete before collision enforcement
    setTimeout(() => {
      if (!cyRef.current) return;

      // COLLISION ENFORCEMENT: 2D freedom with ring boundary checks
      const MIN_DISTANCE_SAME_FACTION = 40; // Same faction NPCs can be very close
      const MIN_DISTANCE_DIFF_FACTION = 60; // Different factions need more space
      const MAX_ITERATIONS = 8; // Reduced iterations
      const cy = cyRef.current;

      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        let hadCollision = false;

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

              // Get current radial distance and angle for node2
              const dist2 = Math.sqrt(pos2.x * pos2.x + pos2.y * pos2.y);
              const angle2 = Math.atan2(pos2.y, pos2.x);

              // Determine ring boundaries for node2
              const isFaction2 = node2.data('isFaction');
              const nodeType2 = node2.data('nodeType');
              let minRadius, maxRadius;

              if (isFaction2) {
                minRadius = FACTION_INNER;
                maxRadius = FACTION_OUTER;
              } else {
                const isMajor = nodeType2 === 'NPC:major';
                minRadius = isMajor ? NPC_MAJOR_INNER : NPC_MINOR_INNER;
                maxRadius = isMajor ? NPC_MAJOR_OUTER : NPC_MINOR_OUTER;
              }

              // Calculate push
              const angleToNode1 = Math.atan2(pos1.y, pos1.x);
              let angleDiff = angle2 - angleToNode1;
              if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
              if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

              const pushDirection = angleDiff > 0 ? 1 : -1;

              // Test 3 candidates: prioritize angular (larger) over radial (smaller)
              const candidates = [
                { angle: angle2 + pushDirection * 0.08, radius: dist2 }, // Angular only (5°)
                { angle: angle2 + pushDirection * 0.08, radius: dist2 + 2 }, // Angular + tiny out
                { angle: angle2 + pushDirection * 0.08, radius: dist2 - 2 }  // Angular + tiny in
              ];

              // Find best candidate that stays in ring
              let bestCandidate = candidates[0];
              let bestScore = -Infinity;

              candidates.forEach(candidate => {
                // Clamp radius to ring boundaries
                const clampedRadius = Math.max(minRadius, Math.min(candidate.radius, maxRadius));
                const testX = Math.cos(candidate.angle) * clampedRadius;
                const testY = Math.sin(candidate.angle) * clampedRadius;

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
                  bestCandidate = { angle: candidate.angle, radius: clampedRadius };
                }
              });

              node2.position({
                x: Math.cos(bestCandidate.angle) * bestCandidate.radius,
                y: Math.sin(bestCandidate.angle) * bestCandidate.radius
              });
            }
          });
        });

        if (!hadCollision) break;
      }

      console.log('Ring enforcement complete: Factions Ring 1 (75-125px), NPCs Ring 2.5/3 (150-250px)');
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

    // Fit viewport to show all nodes
    cy.fit(cy.nodes(), 80); // Tighter padding for compact graph
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

    // Ring 1: Factions (75-125px)
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.2)'; // Blue for factions
    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(75), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(125), 0, Math.PI * 2);
    ctx.stroke();

    // Ring 2.5: NPC:major (150-200px)
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)'; // Orange for major NPCs
    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(150), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(200), 0, Math.PI * 2);
    ctx.stroke();

    // Ring 3: NPC:minor (200-250px)
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.2)'; // Green for minor NPCs
    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(200), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, toScreen(250), 0, Math.PI * 2);
    ctx.stroke();

    // DEBUG MODE: Ring labels and pixel ruler
    if (showDebug) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 14px sans-serif';

      // Ring labels
      ctx.fillText('Ring 0: Party/PCs (0-50px)', centerX + 10, centerY - toScreen(50) - 10);
      ctx.fillText('Ring 1: Factions (75-125px)', centerX + 10, centerY - toScreen(75) - 10);
      ctx.fillText('Ring 2.5: NPC:major (150-200px)', centerX + 10, centerY - toScreen(150) - 10);
      ctx.fillText('Ring 3: NPC:minor (200-250px)', centerX + 10, centerY - toScreen(225) - 10);

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
        'shape': 'ellipse', // Default: circles for NPCs
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
        'border-color': '#ffffff',
        'opacity': 0.8
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
      selector: 'edge[[source.isFaction = true]]',
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
    // PC edges - ALWAYS visible (solid)
    {
      selector: 'edge[[source.isPC = true]], edge[[target.isPC = true]]',
      style: {
        'line-color': '#10b981',
        'target-arrow-color': '#10b981',
        'width': 2,
        'opacity': 0.5 // Always visible for PCs
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

            // Set initial viewport BEFORE layout runs
            cy.zoom(1.1);
            cy.pan({ x: cy.width() / 2, y: cy.height() / 2 });

            // Remove any existing listeners to prevent duplicates
            cy.removeAllListeners();

            // Set up event listeners
            cy.on('tap', 'node', (evt) => {
              const node = evt.target;

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

            cy.on('tap', (evt) => {
              if (evt.target === cy) {
                // Clear selections and restore viewport
                setSelectedNode(null);
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

            // Initial draw of rings
            setTimeout(() => {
              if (cyRef.current) {
                renderFactionMetaballs(cyRef.current);
              }
            }, 100);
          }}
          layout={{
            name: 'preset' // Don't auto-run layout on element changes
          } as any}
        />
      </div>
    </div>
  );
};

export { PoliticalWebPage };
export default PoliticalWebPage;
