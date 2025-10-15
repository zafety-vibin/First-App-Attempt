/**
 * Cross-Graph Query Service
 * Feature 006: Knowledge Graphs with Confidence Decay
 *
 * Handles cross-graph queries and context generation
 * - Natural language query interpretation
 * - Cross-graph observation search
 * - Serialized context for LLM integration
 */

import { db } from './DatabaseService';
import { GraphNodeService } from './GraphNodeService';
import { GraphEdgeService } from './GraphEdgeService';
import { GraphNode, GraphEdge } from '../models/KnowledgeGraph';

export interface CrossGraphQueryFilter {
  graph_types?: string[];
  node_types?: string[];
  confidence_threshold?: number;
  only_active_graphs?: boolean;
  search_query?: string;
  limit?: number;
}

export interface CrossGraphQueryResult {
  nodes: Array<GraphNode & { graph_name: string; graph_type: string }>;
  edges: Array<GraphEdge & { graph_name: string; graph_type: string }>;
  total_nodes: number;
  total_edges: number;
}

export interface GraphContext {
  campaign_id: string;
  active_graphs: Array<{
    graph_id: string;
    graph_name: string;
    graph_type: string;
    node_count: number;
    edge_count: number;
  }>;
  serialized_context: string;
  generated_at: number;
}

export class CrossGraphQueryService {
  /**
   * Query nodes and edges across multiple graphs
   */
  static queryGraphs(campaignId: string, filter: CrossGraphQueryFilter): CrossGraphQueryResult {
    const conditions: string[] = ['kg.campaign_id = ?'];
    const values: any[] = [campaignId];

    // Filter by active graphs only
    if (filter.only_active_graphs) {
      conditions.push('kg.toggle_state = 1');
    }

    // Filter by graph types
    if (filter.graph_types && filter.graph_types.length > 0) {
      const placeholders = filter.graph_types.map(() => '?').join(',');
      conditions.push(`kg.graph_type IN (${placeholders})`);
      values.push(...filter.graph_types);
    }

    // Build graph selection query
    const graphQuery = `
      SELECT kg.id, kg.graph_name, kg.graph_type, kg.decay_rate
      FROM knowledge_graphs kg
      WHERE ${conditions.join(' AND ')}
    `;

    const graphs = db.prepare(graphQuery).all(...values) as any[];

    if (graphs.length === 0) {
      return {
        nodes: [],
        edges: [],
        total_nodes: 0,
        total_edges: 0,
      };
    }

    // Query nodes across selected graphs
    const allNodes: Array<GraphNode & { graph_name: string; graph_type: string }> = [];
    const allEdges: Array<GraphEdge & { graph_name: string; graph_type: string }> = [];

    for (const graph of graphs) {
      // Get nodes for this graph
      const nodeFilter: any = {};

      if (filter.node_types && filter.node_types.length > 0) {
        // We'll filter after fetching since listNodes doesn't support array filtering
        const nodes = GraphNodeService.listNodes(graph.id, {
          confidence_threshold: filter.confidence_threshold,
          search_query: filter.search_query,
          limit: filter.limit,
        });

        const filteredNodes = filter.node_types
          ? nodes.filter(node => filter.node_types!.includes(node.node_type))
          : nodes;

        for (const node of filteredNodes) {
          allNodes.push({
            ...node,
            graph_name: graph.graph_name,
            graph_type: graph.graph_type,
          });
        }
      } else {
        const nodes = GraphNodeService.listNodes(graph.id, {
          confidence_threshold: filter.confidence_threshold,
          search_query: filter.search_query,
          limit: filter.limit,
        });

        for (const node of nodes) {
          allNodes.push({
            ...node,
            graph_name: graph.graph_name,
            graph_type: graph.graph_type,
          });
        }
      }

      // Get edges for this graph
      const edges = GraphEdgeService.listEdges(graph.id, {
        limit: filter.limit,
      });

      for (const edge of edges) {
        allEdges.push({
          ...edge,
          graph_name: graph.graph_name,
          graph_type: graph.graph_type,
        });
      }
    }

    // Apply global limit if specified
    let limitedNodes = allNodes;
    let limitedEdges = allEdges;

    if (filter.limit) {
      limitedNodes = allNodes.slice(0, filter.limit);
      limitedEdges = allEdges.slice(0, filter.limit);
    }

    return {
      nodes: limitedNodes,
      edges: limitedEdges,
      total_nodes: allNodes.length,
      total_edges: allEdges.length,
    };
  }

  /**
   * Search observations across all graphs
   */
  static searchObservations(campaignId: string, searchQuery: string): CrossGraphQueryResult {
    // Get all active graphs
    const graphs = db.prepare(
      'SELECT id, graph_name, graph_type, decay_rate FROM knowledge_graphs WHERE campaign_id = ? AND toggle_state = 1'
    ).all(campaignId) as any[];

    const matchingNodes: Array<GraphNode & { graph_name: string; graph_type: string }> = [];

    for (const graph of graphs) {
      // Get all nodes with observations
      const nodes = GraphNodeService.listNodes(graph.id, {});

      for (const node of nodes) {
        if (node.observations) {
          // Search in observations
          const hasMatch = node.observations.some(obs =>
            obs.text.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (hasMatch) {
            matchingNodes.push({
              ...node,
              graph_name: graph.graph_name,
              graph_type: graph.graph_type,
            });
          }
        }

        // Also search in node name and attributes
        const nameMatch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
        const attributesMatch = JSON.stringify(node.attributes)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

        if ((nameMatch || attributesMatch) && !matchingNodes.some(n => n.id === node.id)) {
          matchingNodes.push({
            ...node,
            graph_name: graph.graph_name,
            graph_type: graph.graph_type,
          });
        }
      }
    }

    return {
      nodes: matchingNodes,
      edges: [],
      total_nodes: matchingNodes.length,
      total_edges: 0,
    };
  }

  /**
   * Generate serialized context for LLM integration
   * Returns a formatted string representation of all active graphs
   */
  static getGraphContext(campaignId: string): GraphContext {
    // Get active graphs
    const graphs = db.prepare(`
      SELECT
        kg.id,
        kg.graph_name,
        kg.graph_type,
        kg.decay_rate,
        (SELECT COUNT(*) FROM graph_nodes WHERE graph_id = kg.id) as node_count,
        (SELECT COUNT(*) FROM graph_edges WHERE graph_id = kg.id) as edge_count
      FROM knowledge_graphs kg
      WHERE kg.campaign_id = ? AND kg.toggle_state = 1
      ORDER BY kg.graph_type
    `).all(campaignId) as any[];

    // Build serialized context
    const contextParts: string[] = [
      '# Knowledge Graph Context',
      `Campaign has ${graphs.length} active graph(s):\n`,
    ];

    for (const graph of graphs) {
      contextParts.push(`## ${graph.graph_name} (${graph.graph_type})`);
      contextParts.push(`- Nodes: ${graph.node_count}`);
      contextParts.push(`- Edges: ${graph.edge_count}`);
      contextParts.push(`- Decay Rate: ${graph.decay_rate}\n`);

      // Get high-confidence nodes (> 0.7) for this graph
      const nodes = GraphNodeService.listNodes(graph.id, {
        confidence_threshold: 0.7,
        limit: 50, // Limit context size
      });

      if (nodes.length > 0) {
        contextParts.push(`### High-Confidence Entities (${nodes.length})`);
        for (const node of nodes) {
          contextParts.push(
            `- ${node.name} (${node.node_type}): confidence ${node.confidence?.toFixed(2)}`
          );
        }
        contextParts.push('');
      }
    }

    const serializedContext = contextParts.join('\n');

    return {
      campaign_id: campaignId,
      active_graphs: graphs.map(g => ({
        graph_id: g.id,
        graph_name: g.graph_name,
        graph_type: g.graph_type,
        node_count: g.node_count,
        edge_count: g.edge_count,
      })),
      serialized_context: serializedContext,
      generated_at: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Find nodes with cross-graph references in observations
   * Useful for discovering connections between graphs
   */
  static findCrossReferences(campaignId: string): Array<{
    node: GraphNode & { graph_name: string; graph_type: string };
    referenced_graphs: string[];
  }> {
    const graphs = db.prepare(
      'SELECT id, graph_name, graph_type, decay_rate FROM knowledge_graphs WHERE campaign_id = ?'
    ).all(campaignId) as any[];

    const graphNameMap = new Map<string, string>();
    graphs.forEach(g => graphNameMap.set(g.id, g.graph_name));

    const crossReferences: Array<{
      node: GraphNode & { graph_name: string; graph_type: string };
      referenced_graphs: string[];
    }> = [];

    for (const graph of graphs) {
      const nodes = GraphNodeService.listNodes(graph.id, {});

      for (const node of nodes) {
        const referencedGraphs = new Set<string>();

        // Check observations for mentions of other graph names
        if (node.observations) {
          for (const obs of node.observations) {
            for (const [graphId, graphName] of graphNameMap.entries()) {
              if (graphId !== graph.id && obs.text.includes(graphName)) {
                referencedGraphs.add(graphName);
              }
            }
          }
        }

        // Check attributes for references
        const attributesStr = JSON.stringify(node.attributes);
        for (const [graphId, graphName] of graphNameMap.entries()) {
          if (graphId !== graph.id && attributesStr.includes(graphName)) {
            referencedGraphs.add(graphName);
          }
        }

        if (referencedGraphs.size > 0) {
          crossReferences.push({
            node: {
              ...node,
              graph_name: graph.graph_name,
              graph_type: graph.graph_type,
            },
            referenced_graphs: Array.from(referencedGraphs),
          });
        }
      }
    }

    return crossReferences;
  }
}
