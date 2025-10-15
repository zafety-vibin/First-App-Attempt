/**
 * Graph Node Service
 * Feature 006: Knowledge Graphs with Confidence Decay
 *
 * Handles CRUD operations for graph nodes including:
 * - Node creation with last_accessed initialization
 * - Node retrieval with auto-reinforcement
 * - Confidence calculation on-demand
 * - Observation management
 */

import crypto from 'crypto';
import { db } from './DatabaseService';
import { GraphNode, GraphObservation, MAX_NODE_NAME_LENGTH } from '../models/KnowledgeGraph';
import { calculateConfidence, ConfidenceCalculationInput } from '../models/ConfidenceDecay';

export interface CreateNodeInput {
  node_type: string;
  name: string;
  attributes?: Record<string, any>;
  observations?: Array<{ text: string; created_at?: number; last_accessed?: number }>;
  information_level_id?: string | null;
  pinned?: boolean;
}

export interface UpdateNodeInput {
  node_type?: string;
  name?: string;
  attributes?: Record<string, any>;
  observations?: Array<{ text: string; created_at?: number; last_accessed?: number }>;
  information_level_id?: string | null;
  pinned?: boolean;
}

export interface ListNodesFilter {
  node_type?: string;
  information_level_id?: string | null;
  pinned?: boolean;
  confidence_threshold?: number;
  search_query?: string;
  limit?: number;
  offset?: number;
}

export class GraphNodeService {
  /**
   * Create a new graph node
   */
  static createNode(graphId: string, input: CreateNodeInput): GraphNode {
    // Validate required fields
    if (!input.node_type || input.node_type.trim().length === 0) {
      throw new Error('node_type is required');
    }

    if (!input.name || input.name.trim().length === 0) {
      throw new Error('name is required');
    }

    if (input.name.length > MAX_NODE_NAME_LENGTH) {
      throw new Error(`name exceeds maximum length of ${MAX_NODE_NAME_LENGTH} characters`);
    }

    const nodeId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Serialize attributes to JSON
    const attributesJson = JSON.stringify(input.attributes || {});

    // Format observations with timestamps
    let observationsJson = null;
    if (input.observations && input.observations.length > 0) {
      const formattedObservations = input.observations.map(obs => ({
        text: obs.text,
        created_at: obs.created_at || now,
        last_accessed: obs.last_accessed || now
      }));
      observationsJson = JSON.stringify(formattedObservations);
    }

    // Insert node
    const stmt = db.prepare(`
      INSERT INTO graph_nodes (
        id, graph_id, node_type, name, attributes, observations,
        information_level_id, created_at, last_accessed, pinned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      nodeId,
      graphId,
      input.node_type,
      input.name,
      attributesJson,
      observationsJson,
      input.information_level_id || null,
      now,
      now,
      input.pinned ? 1 : 0
    );

    return this.getNode(nodeId, false)!; // Don't auto-reinforce on creation
  }

  /**
   * Get node by ID with optional auto-reinforcement
   */
  static getNode(nodeId: string, autoReinforce = true): GraphNode | null {
    const row = db.prepare('SELECT * FROM graph_nodes WHERE id = ?').get(nodeId) as any;

    if (!row) {
      return null;
    }

    // Auto-reinforce: update last_accessed to NOW
    if (autoReinforce) {
      const now = Math.floor(Date.now() / 1000);
      db.prepare('UPDATE graph_nodes SET last_accessed = ? WHERE id = ?').run(now, nodeId);
      row.last_accessed = now;
    }

    const node: GraphNode = {
      id: row.id,
      graph_id: row.graph_id,
      node_type: row.node_type,
      name: row.name,
      attributes: JSON.parse(row.attributes),
      observations: row.observations ? JSON.parse(row.observations) : null,
      information_level_id: row.information_level_id,
      created_at: row.created_at,
      last_accessed: row.last_accessed,
      pinned: Boolean(row.pinned),
    };

    // Calculate confidence on-demand
    const graph = db.prepare('SELECT decay_rate FROM knowledge_graphs WHERE id = ?')
      .get(row.graph_id) as { decay_rate: number } | undefined;

    if (graph) {
      node.confidence = this.calculateNodeConfidence(node, graph.decay_rate);
    }

    return node;
  }

  /**
   * Get node with confidence calculation
   */
  static getNodeWithConfidence(nodeId: string, decayRate: number): GraphNode | null {
    const node = this.getNode(nodeId, false); // Don't auto-reinforce
    if (!node) {
      return null;
    }

    node.confidence = this.calculateNodeConfidence(node, decayRate);
    return node;
  }

  /**
   * List nodes with optional filtering
   */
  static listNodes(graphId: string, filter: ListNodesFilter): GraphNode[] {
    const conditions: string[] = ['graph_id = ?'];
    const values: any[] = [graphId];

    // Apply filters
    if (filter.node_type !== undefined) {
      conditions.push('node_type = ?');
      values.push(filter.node_type);
    }

    if (filter.information_level_id !== undefined) {
      if (filter.information_level_id === null) {
        conditions.push('information_level_id IS NULL');
      } else {
        conditions.push('information_level_id = ?');
        values.push(filter.information_level_id);
      }
    }

    if (filter.pinned !== undefined) {
      conditions.push('pinned = ?');
      values.push(filter.pinned ? 1 : 0);
    }

    if (filter.search_query !== undefined) {
      conditions.push('(name LIKE ? OR node_type LIKE ?)');
      const searchPattern = `%${filter.search_query}%`;
      values.push(searchPattern, searchPattern);
    }

    // Build query
    let query = `SELECT * FROM graph_nodes WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;

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
    const now = Math.floor(Date.now() / 1000);

    // Map rows to nodes with confidence
    let nodes = rows.map(row => {
      const node: GraphNode = {
        id: row.id,
        graph_id: row.graph_id,
        node_type: row.node_type,
        name: row.name,
        attributes: JSON.parse(row.attributes),
        observations: row.observations ? JSON.parse(row.observations) : null,
        information_level_id: row.information_level_id,
        created_at: row.created_at,
        last_accessed: row.last_accessed,
        pinned: Boolean(row.pinned),
      };

      node.confidence = this.calculateNodeConfidence(node, decayRate, now);
      return node;
    });

    // Apply confidence threshold filter if specified
    if (filter.confidence_threshold !== undefined) {
      nodes = nodes.filter(node => (node.confidence || 0) >= filter.confidence_threshold!);
    }

    return nodes;
  }

  /**
   * Update node
   */
  static updateNode(nodeId: string, input: UpdateNodeInput): GraphNode {
    const existing = this.getNode(nodeId, false);
    if (!existing) {
      throw new Error('Node not found');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (input.node_type !== undefined) {
      updates.push('node_type = ?');
      values.push(input.node_type);
    }

    if (input.name !== undefined) {
      if (input.name.length > MAX_NODE_NAME_LENGTH) {
        throw new Error(`name exceeds maximum length of ${MAX_NODE_NAME_LENGTH} characters`);
      }
      updates.push('name = ?');
      values.push(input.name);
    }

    if (input.attributes !== undefined) {
      updates.push('attributes = ?');
      values.push(JSON.stringify(input.attributes));
    }

    if (input.observations !== undefined) {
      const now = Math.floor(Date.now() / 1000);
      const formattedObservations = input.observations.map(obs => ({
        text: obs.text,
        created_at: obs.created_at || now,
        last_accessed: obs.last_accessed || now
      }));
      updates.push('observations = ?');
      values.push(JSON.stringify(formattedObservations));
    }

    if (input.information_level_id !== undefined) {
      updates.push('information_level_id = ?');
      values.push(input.information_level_id);
    }

    if (input.pinned !== undefined) {
      updates.push('pinned = ?');
      values.push(input.pinned ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(nodeId);
    const stmt = db.prepare(`UPDATE graph_nodes SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getNode(nodeId, false)!;
  }

  /**
   * Delete node (CASCADE deletes edges)
   */
  static deleteNode(nodeId: string): void {
    const stmt = db.prepare('DELETE FROM graph_nodes WHERE id = ?');
    const result = stmt.run(nodeId);

    if (result.changes === 0) {
      throw new Error('Node not found');
    }
  }

  /**
   * Add observation to node
   */
  static addObservation(nodeId: string, observationText: string): GraphNode {
    const existing = this.getNode(nodeId, false);
    if (!existing) {
      throw new Error('Node not found');
    }

    const now = Math.floor(Date.now() / 1000);

    const newObservation: GraphObservation = {
      text: observationText,
      created_at: now,
      last_accessed: now,
    };

    // Get existing observations or initialize empty array
    const observations = existing.observations || [];
    observations.push(newObservation);

    // Update node with new observations
    const stmt = db.prepare('UPDATE graph_nodes SET observations = ? WHERE id = ?');
    stmt.run(JSON.stringify(observations), nodeId);

    return this.getNode(nodeId, false)!;
  }

  /**
   * Search nodes across graphs
   */
  static searchNodes(
    graphId: string,
    searchQuery: string,
    confidenceThreshold?: number
  ): GraphNode[] {
    return this.listNodes(graphId, {
      search_query: searchQuery,
      confidence_threshold: confidenceThreshold,
    });
  }

  /**
   * Calculate confidence for bulk nodes
   */
  static calculateBulkConfidence(nodeIds: string[], decayRate: number): Map<string, number> {
    const confidenceMap = new Map<string, number>();
    const now = Math.floor(Date.now() / 1000);

    const placeholders = nodeIds.map(() => '?').join(',');
    const rows = db.prepare(
      `SELECT id, created_at, last_accessed, pinned FROM graph_nodes WHERE id IN (${placeholders})`
    ).all(...nodeIds) as any[];

    for (const row of rows) {
      const input: ConfidenceCalculationInput = {
        base_confidence: 1.0,
        decay_rate: decayRate,
        created_at: row.created_at,
        last_accessed: row.last_accessed,
        pinned: Boolean(row.pinned),
        current_timestamp: now,
      };

      const result = calculateConfidence(input);
      confidenceMap.set(row.id, result.confidence);
    }

    return confidenceMap;
  }

  /**
   * Calculate confidence for a single node
   */
  private static calculateNodeConfidence(
    node: GraphNode,
    decayRate: number,
    currentTimestamp?: number
  ): number {
    const now = currentTimestamp || Math.floor(Date.now() / 1000);

    const input: ConfidenceCalculationInput = {
      base_confidence: 1.0,
      decay_rate: decayRate,
      created_at: node.created_at,
      last_accessed: node.last_accessed,
      pinned: node.pinned,
      current_timestamp: now,
    };

    const result = calculateConfidence(input);
    return result.confidence;
  }
}
