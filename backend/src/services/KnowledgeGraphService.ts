/**
 * Knowledge Graph Service
 * Feature 006: Knowledge Graphs with Confidence Decay
 *
 * Handles CRUD operations for knowledge graphs including:
 * - Graph creation with decay rate configuration
 * - Graph querying with optional nodes/edges
 * - Graph updates and deletion (CASCADE)
 * - Statistics calculation (node_count, edge_count)
 */

import crypto from 'crypto';
import { db } from './DatabaseService';
import {
  KnowledgeGraph,
  GraphType,
  isValidGraphType,
  MaintenanceRule
} from '../models/KnowledgeGraph';
import { getDefaultDecayRate, isValidDecayRate } from '../models/ConfidenceDecay';
import { GraphNodeService } from './GraphNodeService';
import { GraphEdgeService } from './GraphEdgeService';

export interface CreateGraphInput {
  graph_type: GraphType;
  graph_name: string;
  decay_rate?: number;
  toggle_state?: boolean;
  maintenance_rules?: MaintenanceRule[] | null;
  initial_nodes?: Array<{
    node_type: string;
    name: string;
    attributes?: Record<string, any>;
    information_level_id?: string | null;
  }>;
  initial_edges?: Array<{
    edge_type: string;
    source_node_id: string;
    target_node_id: string;
    directed?: boolean;
    metadata?: Record<string, any> | null;
  }>;
}

export interface UpdateGraphInput {
  graph_name?: string;
  decay_rate?: number;
  toggle_state?: boolean;
  maintenance_rules?: MaintenanceRule[] | null;
  nodes_to_add?: Array<{
    node_type: string;
    name: string;
    attributes?: Record<string, any>;
    information_level_id?: string | null;
  }>;
  nodes_to_update?: Array<{
    id: string;
    name?: string;
    node_type?: string;
    attributes?: Record<string, any>;
    information_level_id?: string | null;
  }>;
  nodes_to_delete?: string[];
  edges_to_add?: Array<{
    edge_type: string;
    source_node_id: string;
    target_node_id: string;
    directed?: boolean;
    metadata?: Record<string, any> | null;
  }>;
  edges_to_delete?: string[];
}

export interface ListGraphsOptions {
  include_nodes?: boolean;
  include_edges?: boolean;
}

export interface GetGraphOptions {
  include_nodes?: boolean;
  include_edges?: boolean;
}

export class KnowledgeGraphService {
  /**
   * Create a new knowledge graph
   */
  static createGraph(campaignId: string, input: CreateGraphInput): KnowledgeGraph {
    // Validate graph type
    if (!isValidGraphType(input.graph_type)) {
      throw new Error(`Invalid graph_type: ${input.graph_type}`);
    }

    // Validate graph name is provided
    if (!input.graph_name || input.graph_name.trim().length === 0) {
      throw new Error('graph_name is required');
    }

    // Set default decay rate based on graph type if not provided
    const decayRate = input.decay_rate !== undefined
      ? input.decay_rate
      : getDefaultDecayRate(input.graph_type);

    // Validate decay rate
    if (!isValidDecayRate(decayRate)) {
      throw new Error(`Invalid decay_rate: must be between 0.0 and 1.0`);
    }

    // Check for duplicate graph name within campaign
    const existing = db.prepare(
      'SELECT id FROM knowledge_graphs WHERE campaign_id = ? AND graph_name = ?'
    ).get(campaignId, input.graph_name);

    if (existing) {
      throw new Error(`Graph with name "${input.graph_name}" already exists in this campaign`);
    }

    const graphId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const toggleState = input.toggle_state !== undefined ? input.toggle_state : true;

    // Serialize maintenance_rules to JSON
    const maintenanceRulesJson = input.maintenance_rules
      ? JSON.stringify(input.maintenance_rules)
      : null;

    // Insert graph
    const stmt = db.prepare(`
      INSERT INTO knowledge_graphs (
        id, campaign_id, graph_type, graph_name, toggle_state,
        decay_rate, maintenance_rules, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      graphId,
      campaignId,
      input.graph_type,
      input.graph_name,
      toggleState ? 1 : 0,
      decayRate,
      maintenanceRulesJson,
      now,
      now
    );

    // Create initial nodes if provided
    const createdNodeIds: string[] = [];
    if (input.initial_nodes && input.initial_nodes.length > 0) {
      for (const nodeData of input.initial_nodes) {
        const node = GraphNodeService.createNode(graphId, {
          node_type: nodeData.node_type,
          name: nodeData.name,
          attributes: nodeData.attributes || {},
          information_level_id: nodeData.information_level_id || null,
        });
        createdNodeIds.push(node.id);
      }
    }

    // Create initial edges if provided
    if (input.initial_edges && input.initial_edges.length > 0) {
      for (const edgeData of input.initial_edges) {
        // Map temporary IDs to actual created node IDs
        let sourceId = edgeData.source_node_id;
        let targetId = edgeData.target_node_id;

        // If source/target IDs are temporary (will-be-uuid-*), map to created nodes
        if (sourceId.startsWith('will-be-uuid-')) {
          const index = parseInt(sourceId.replace('will-be-uuid-', '')) - 1;
          sourceId = createdNodeIds[index] || sourceId;
        }
        if (targetId.startsWith('will-be-uuid-')) {
          const index = parseInt(targetId.replace('will-be-uuid-', '')) - 1;
          targetId = createdNodeIds[index] || targetId;
        }

        GraphEdgeService.createEdge(graphId, {
          edge_type: edgeData.edge_type,
          source_node_id: sourceId,
          target_node_id: targetId,
          directed: edgeData.directed !== undefined ? edgeData.directed : true,
          metadata: edgeData.metadata || null,
        });
      }
    }

    return this.getGraph(graphId, { include_nodes: true, include_edges: true })!;
  }

  /**
   * Get graph by ID with optional nodes and edges
   */
  static getGraph(graphId: string, options: GetGraphOptions = {}): KnowledgeGraph | null {
    const includeNodes = options.include_nodes !== false; // Default true
    const includeEdges = options.include_edges !== false; // Default true

    const row = db.prepare('SELECT * FROM knowledge_graphs WHERE id = ?').get(graphId) as any;

    if (!row) {
      return null;
    }

    const graph: KnowledgeGraph = {
      id: row.id,
      campaign_id: row.campaign_id,
      graph_type: row.graph_type as GraphType,
      graph_name: row.graph_name,
      toggle_state: Boolean(row.toggle_state),
      decay_rate: row.decay_rate,
      maintenance_rules: row.maintenance_rules ? JSON.parse(row.maintenance_rules) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      current_version_id: row.current_version_id,
      backup_version_id: row.backup_version_id,
    };

    // Load nodes if requested
    if (includeNodes) {
      graph.nodes = GraphNodeService.listNodes(graphId, {});
    }

    // Load edges if requested
    if (includeEdges) {
      graph.edges = GraphEdgeService.listEdges(graphId, {});
    }

    return graph;
  }

  /**
   * List all graphs for a campaign
   */
  static listGraphs(campaignId: string, options: ListGraphsOptions = {}): KnowledgeGraph[] {
    const rows = db.prepare(
      'SELECT * FROM knowledge_graphs WHERE campaign_id = ? ORDER BY created_at DESC'
    ).all(campaignId) as any[];

    return rows.map(row => {
      const graph: KnowledgeGraph = {
        id: row.id,
        campaign_id: row.campaign_id,
        graph_type: row.graph_type as GraphType,
        graph_name: row.graph_name,
        toggle_state: Boolean(row.toggle_state),
        decay_rate: row.decay_rate,
        maintenance_rules: row.maintenance_rules ? JSON.parse(row.maintenance_rules) : null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        current_version_id: row.current_version_id,
        backup_version_id: row.backup_version_id,
      };

      // Load nodes if requested
      if (options.include_nodes) {
        graph.nodes = GraphNodeService.listNodes(row.id, {});
      }

      // Load edges if requested
      if (options.include_edges) {
        graph.edges = GraphEdgeService.listEdges(row.id, {});
      }

      return graph;
    });
  }

  /**
   * Get graph with statistics (node_count, edge_count)
   */
  static getGraphWithStats(graphId: string): (KnowledgeGraph & { node_count: number; edge_count: number }) | null {
    const graph = this.getGraph(graphId, { include_nodes: false, include_edges: false });
    if (!graph) {
      return null;
    }

    // Get node count
    const nodeCount = db.prepare('SELECT COUNT(*) as count FROM graph_nodes WHERE graph_id = ?')
      .get(graphId) as { count: number };

    // Get edge count
    const edgeCount = db.prepare('SELECT COUNT(*) as count FROM graph_edges WHERE graph_id = ?')
      .get(graphId) as { count: number };

    return {
      ...graph,
      node_count: nodeCount.count,
      edge_count: edgeCount.count,
    };
  }

  /**
   * Update graph
   */
  static updateGraph(graphId: string, input: UpdateGraphInput): KnowledgeGraph {
    const existing = this.getGraph(graphId, { include_nodes: false, include_edges: false });
    if (!existing) {
      throw new Error('Graph not found');
    }

    const updates: string[] = [];
    const values: any[] = [];

    // Update graph metadata
    if (input.graph_name !== undefined) {
      // Check for duplicate name
      const duplicate = db.prepare(
        'SELECT id FROM knowledge_graphs WHERE campaign_id = ? AND graph_name = ? AND id != ?'
      ).get(existing.campaign_id, input.graph_name, graphId);

      if (duplicate) {
        throw new Error(`Graph with name "${input.graph_name}" already exists in this campaign`);
      }

      updates.push('graph_name = ?');
      values.push(input.graph_name);
    }

    if (input.decay_rate !== undefined) {
      if (!isValidDecayRate(input.decay_rate)) {
        throw new Error('Invalid decay_rate: must be between 0.0 and 1.0');
      }
      updates.push('decay_rate = ?');
      values.push(input.decay_rate);
    }

    if (input.toggle_state !== undefined) {
      updates.push('toggle_state = ?');
      values.push(input.toggle_state ? 1 : 0);
    }

    if (input.maintenance_rules !== undefined) {
      updates.push('maintenance_rules = ?');
      values.push(input.maintenance_rules ? JSON.stringify(input.maintenance_rules) : null);
    }

    // Always update updated_at
    const now = Math.floor(Date.now() / 1000);
    updates.push('updated_at = ?');
    values.push(now);

    // Apply graph metadata updates
    if (updates.length > 0) {
      values.push(graphId);
      const stmt = db.prepare(`UPDATE knowledge_graphs SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }

    // Handle node operations
    if (input.nodes_to_add && input.nodes_to_add.length > 0) {
      for (const nodeData of input.nodes_to_add) {
        GraphNodeService.createNode(graphId, {
          node_type: nodeData.node_type,
          name: nodeData.name,
          attributes: nodeData.attributes || {},
          information_level_id: nodeData.information_level_id || null,
        });
      }
    }

    if (input.nodes_to_update && input.nodes_to_update.length > 0) {
      for (const nodeData of input.nodes_to_update) {
        GraphNodeService.updateNode(nodeData.id, {
          name: nodeData.name,
          node_type: nodeData.node_type,
          attributes: nodeData.attributes,
          information_level_id: nodeData.information_level_id,
        });
      }
    }

    if (input.nodes_to_delete && input.nodes_to_delete.length > 0) {
      for (const nodeId of input.nodes_to_delete) {
        GraphNodeService.deleteNode(nodeId);
      }
    }

    // Handle edge operations
    if (input.edges_to_add && input.edges_to_add.length > 0) {
      for (const edgeData of input.edges_to_add) {
        GraphEdgeService.createEdge(graphId, {
          edge_type: edgeData.edge_type,
          source_node_id: edgeData.source_node_id,
          target_node_id: edgeData.target_node_id,
          directed: edgeData.directed !== undefined ? edgeData.directed : true,
          metadata: edgeData.metadata || null,
        });
      }
    }

    if (input.edges_to_delete && input.edges_to_delete.length > 0) {
      for (const edgeId of input.edges_to_delete) {
        GraphEdgeService.deleteEdge(edgeId);
      }
    }

    return this.getGraph(graphId, { include_nodes: true, include_edges: true })!;
  }

  /**
   * Delete graph (CASCADE deletes nodes and edges)
   */
  static deleteGraph(graphId: string): void {
    const stmt = db.prepare('DELETE FROM knowledge_graphs WHERE id = ?');
    const result = stmt.run(graphId);

    if (result.changes === 0) {
      throw new Error('Graph not found');
    }
  }

  /**
   * Check if campaign owns graph
   */
  static belongsToCampaign(graphId: string, campaignId: string): boolean {
    const graph = this.getGraph(graphId, { include_nodes: false, include_edges: false });
    return graph ? graph.campaign_id === campaignId : false;
  }
}
