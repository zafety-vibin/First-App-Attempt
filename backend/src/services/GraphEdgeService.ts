/**
 * Graph Edge Service
 * Feature 006: Knowledge Graphs with Confidence Decay
 *
 * Handles CRUD operations for graph edges including:
 * - Edge creation with source/target validation
 * - Edge retrieval with confidence from connected nodes
 * - Edge filtering and queries
 */

import crypto from 'crypto';
import { db } from './DatabaseService';
import { GraphEdge } from '../models/KnowledgeGraph';
import { calculateRelationConfidence } from '../models/ConfidenceDecay';
import { GraphNodeService } from './GraphNodeService';

export interface CreateEdgeInput {
  edge_type: string;
  source_node_id: string;
  target_node_id: string;
  directed?: boolean;
  metadata?: Record<string, any> | null;
}

export interface UpdateEdgeInput {
  edge_type?: string;
  metadata?: Record<string, any> | null;
  directed?: boolean;
}

export interface ListEdgesFilter {
  edge_type?: string;
  source_node_id?: string;
  target_node_id?: string;
  directed?: boolean;
  limit?: number;
  offset?: number;
}

export class GraphEdgeService {
  /**
   * Create a new graph edge
   */
  static createEdge(graphId: string, input: CreateEdgeInput): GraphEdge {
    // Validate required fields
    if (!input.edge_type || input.edge_type.trim().length === 0) {
      throw new Error('edge_type is required');
    }

    if (!input.source_node_id) {
      throw new Error('source_node_id is required');
    }

    if (!input.target_node_id) {
      throw new Error('target_node_id is required');
    }

    // Validate source and target nodes exist and belong to the graph
    const sourceNode = db.prepare('SELECT id FROM graph_nodes WHERE id = ? AND graph_id = ?')
      .get(input.source_node_id, graphId);

    if (!sourceNode) {
      throw new Error(`Source node ${input.source_node_id} not found in graph ${graphId}`);
    }

    const targetNode = db.prepare('SELECT id FROM graph_nodes WHERE id = ? AND graph_id = ?')
      .get(input.target_node_id, graphId);

    if (!targetNode) {
      throw new Error(`Target node ${input.target_node_id} not found in graph ${graphId}`);
    }

    const edgeId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Serialize metadata to JSON
    const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

    // Insert edge
    const stmt = db.prepare(`
      INSERT INTO graph_edges (
        id, graph_id, edge_type, source_node_id, target_node_id,
        directed, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      edgeId,
      graphId,
      input.edge_type,
      input.source_node_id,
      input.target_node_id,
      input.directed !== undefined ? (input.directed ? 1 : 0) : 1,
      metadataJson,
      now
    );

    return this.getEdge(edgeId)!;
  }

  /**
   * Get edge by ID with confidence from connected nodes
   */
  static getEdge(edgeId: string): GraphEdge | null {
    const row = db.prepare('SELECT * FROM graph_edges WHERE id = ?').get(edgeId) as any;

    if (!row) {
      return null;
    }

    const edge: GraphEdge = {
      id: row.id,
      graph_id: row.graph_id,
      edge_type: row.edge_type,
      source_node_id: row.source_node_id,
      target_node_id: row.target_node_id,
      directed: Boolean(row.directed),
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      created_at: row.created_at,
    };

    // Calculate edge confidence from source and target node confidences
    const graph = db.prepare('SELECT decay_rate FROM knowledge_graphs WHERE id = ?')
      .get(row.graph_id) as { decay_rate: number } | undefined;

    if (graph) {
      const sourceNode = GraphNodeService.getNodeWithConfidence(row.source_node_id, graph.decay_rate);
      const targetNode = GraphNodeService.getNodeWithConfidence(row.target_node_id, graph.decay_rate);

      if (sourceNode && targetNode) {
        edge.confidence = calculateRelationConfidence(
          sourceNode.confidence || 1.0,
          targetNode.confidence || 1.0
        );
      }
    }

    return edge;
  }

  /**
   * List edges with optional filtering
   */
  static listEdges(graphId: string, filter: ListEdgesFilter): GraphEdge[] {
    const conditions: string[] = ['graph_id = ?'];
    const values: any[] = [graphId];

    // Apply filters
    if (filter.edge_type !== undefined) {
      conditions.push('edge_type = ?');
      values.push(filter.edge_type);
    }

    if (filter.source_node_id !== undefined) {
      conditions.push('source_node_id = ?');
      values.push(filter.source_node_id);
    }

    if (filter.target_node_id !== undefined) {
      conditions.push('target_node_id = ?');
      values.push(filter.target_node_id);
    }

    if (filter.directed !== undefined) {
      conditions.push('directed = ?');
      values.push(filter.directed ? 1 : 0);
    }

    // Build query
    let query = `SELECT * FROM graph_edges WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;

    // Apply pagination
    if (filter.limit !== undefined) {
      query += ` LIMIT ${filter.limit}`;
      if (filter.offset !== undefined) {
        query += ` OFFSET ${filter.offset}`;
      }
    }

    const rows = db.prepare(query).all(...values) as any[];

    // Get decay rate for confidence calculation
    const graph = db.prepare('SELECT decay_rate FROM knowledge_graphs WHERE id = ?')
      .get(graphId) as { decay_rate: number } | undefined;

    const decayRate = graph ? graph.decay_rate : 0.1;

    // Get all unique node IDs for bulk confidence calculation
    const nodeIds = new Set<string>();
    rows.forEach(row => {
      nodeIds.add(row.source_node_id);
      nodeIds.add(row.target_node_id);
    });

    // Calculate confidences for all nodes at once
    const nodeConfidences = GraphNodeService.calculateBulkConfidence(Array.from(nodeIds), decayRate);

    // Map rows to edges with confidence
    return rows.map(row => {
      const edge: GraphEdge = {
        id: row.id,
        graph_id: row.graph_id,
        edge_type: row.edge_type,
        source_node_id: row.source_node_id,
        target_node_id: row.target_node_id,
        directed: Boolean(row.directed),
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        created_at: row.created_at,
      };

      // Calculate edge confidence from node confidences
      const sourceConfidence = nodeConfidences.get(row.source_node_id) || 1.0;
      const targetConfidence = nodeConfidences.get(row.target_node_id) || 1.0;
      edge.confidence = calculateRelationConfidence(sourceConfidence, targetConfidence);

      return edge;
    });
  }

  /**
   * Update edge
   */
  static updateEdge(edgeId: string, input: UpdateEdgeInput): GraphEdge {
    const existing = this.getEdge(edgeId);
    if (!existing) {
      throw new Error('Edge not found');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (input.edge_type !== undefined) {
      updates.push('edge_type = ?');
      values.push(input.edge_type);
    }

    if (input.directed !== undefined) {
      updates.push('directed = ?');
      values.push(input.directed ? 1 : 0);
    }

    if (input.metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(input.metadata ? JSON.stringify(input.metadata) : null);
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(edgeId);
    const stmt = db.prepare(`UPDATE graph_edges SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getEdge(edgeId)!;
  }

  /**
   * Delete edge
   */
  static deleteEdge(edgeId: string): void {
    const stmt = db.prepare('DELETE FROM graph_edges WHERE id = ?');
    const result = stmt.run(edgeId);

    if (result.changes === 0) {
      throw new Error('Edge not found');
    }
  }

  /**
   * Get all edges connected to a node (both incoming and outgoing)
   */
  static getEdgesForNode(nodeId: string): GraphEdge[] {
    const rows = db.prepare(
      'SELECT * FROM graph_edges WHERE source_node_id = ? OR target_node_id = ? ORDER BY created_at DESC'
    ).all(nodeId, nodeId) as any[];

    if (rows.length === 0) {
      return [];
    }

    // Get graph_id and decay_rate from first edge
    const graph = db.prepare('SELECT decay_rate FROM knowledge_graphs WHERE id = ?')
      .get(rows[0].graph_id) as { decay_rate: number } | undefined;

    const decayRate = graph ? graph.decay_rate : 0.1;

    // Get all unique node IDs for bulk confidence calculation
    const nodeIds = new Set<string>([nodeId]);
    rows.forEach(row => {
      nodeIds.add(row.source_node_id);
      nodeIds.add(row.target_node_id);
    });

    const nodeConfidences = GraphNodeService.calculateBulkConfidence(Array.from(nodeIds), decayRate);

    return rows.map(row => {
      const edge: GraphEdge = {
        id: row.id,
        graph_id: row.graph_id,
        edge_type: row.edge_type,
        source_node_id: row.source_node_id,
        target_node_id: row.target_node_id,
        directed: Boolean(row.directed),
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        created_at: row.created_at,
      };

      const sourceConfidence = nodeConfidences.get(row.source_node_id) || 1.0;
      const targetConfidence = nodeConfidences.get(row.target_node_id) || 1.0;
      edge.confidence = calculateRelationConfidence(sourceConfidence, targetConfidence);

      return edge;
    });
  }

  /**
   * Check if edge belongs to graph
   */
  static belongsToGraph(edgeId: string, graphId: string): boolean {
    const edge = db.prepare('SELECT graph_id FROM graph_edges WHERE id = ?').get(edgeId) as
      | { graph_id: string }
      | undefined;
    return edge ? edge.graph_id === graphId : false;
  }
}
