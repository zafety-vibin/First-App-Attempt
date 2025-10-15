/**
 * Confidence Decay Service
 * Feature 006: Knowledge Graphs with Confidence Decay
 *
 * Handles confidence calculation and entity reinforcement
 * - Calculate confidence scores for nodes
 * - Reinforce entities (update last_accessed)
 * - Pin/unpin entities
 * - Find stale entities below threshold
 */

import { db } from './DatabaseService';
import { GraphNodeService } from './GraphNodeService';
import { GraphNode } from '../models/KnowledgeGraph';
import {
  calculateConfidence,
  ConfidenceCalculationInput,
  ConfidenceThresholds,
  getConfidenceLevel,
} from '../models/ConfidenceDecay';

export interface ConfidenceCalculationResult {
  node_id: string;
  node_name: string;
  confidence: number;
  confidence_level: 'high' | 'medium' | 'low';
  weeks_elapsed: number;
  pinned: boolean;
}

export interface StaleEntity {
  node_id: string;
  node_name: string;
  node_type: string;
  confidence: number;
  weeks_elapsed: number;
  last_accessed: number;
  graph_name: string;
}

export class ConfidenceDecayService {
  /**
   * Calculate confidence for a single node
   */
  static calculateConfidence(nodeId: string, decayRate: number): ConfidenceCalculationResult {
    const node = GraphNodeService.getNode(nodeId, false); // Don't auto-reinforce

    if (!node) {
      throw new Error('Node not found');
    }

    const now = Math.floor(Date.now() / 1000);

    const input: ConfidenceCalculationInput = {
      base_confidence: 1.0,
      decay_rate: decayRate,
      created_at: node.created_at,
      last_accessed: node.last_accessed,
      pinned: node.pinned,
      current_timestamp: now,
    };

    const result = calculateConfidence(input);

    return {
      node_id: node.id,
      node_name: node.name,
      confidence: result.confidence,
      confidence_level: result.level,
      weeks_elapsed: result.weeks_elapsed,
      pinned: node.pinned,
    };
  }

  /**
   * Calculate confidence for bulk nodes
   */
  static calculateBulkConfidence(nodeIds: string[], decayRate: number): Map<string, ConfidenceCalculationResult> {
    const resultMap = new Map<string, ConfidenceCalculationResult>();
    const now = Math.floor(Date.now() / 1000);

    const placeholders = nodeIds.map(() => '?').join(',');
    const rows = db.prepare(
      `SELECT id, name, created_at, last_accessed, pinned FROM graph_nodes WHERE id IN (${placeholders})`
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

      resultMap.set(row.id, {
        node_id: row.id,
        node_name: row.name,
        confidence: result.confidence,
        confidence_level: result.level,
        weeks_elapsed: result.weeks_elapsed,
        pinned: Boolean(row.pinned),
      });
    }

    return resultMap;
  }

  /**
   * Reinforce entity by updating last_accessed to NOW
   */
  static reinforceEntity(nodeId: string): GraphNode {
    const node = GraphNodeService.getNode(nodeId, false);

    if (!node) {
      throw new Error('Node not found');
    }

    const now = Math.floor(Date.now() / 1000);

    db.prepare('UPDATE graph_nodes SET last_accessed = ? WHERE id = ?').run(now, nodeId);

    return GraphNodeService.getNode(nodeId, false)!;
  }

  /**
   * Pin entity (sets pinned flag, locks confidence at 1.0)
   */
  static pinEntity(nodeId: string): GraphNode {
    const node = GraphNodeService.getNode(nodeId, false);

    if (!node) {
      throw new Error('Node not found');
    }

    db.prepare('UPDATE graph_nodes SET pinned = 1 WHERE id = ?').run(nodeId);

    return GraphNodeService.getNode(nodeId, false)!;
  }

  /**
   * Unpin entity (clears pinned flag, resumes normal decay)
   */
  static unpinEntity(nodeId: string): GraphNode {
    const node = GraphNodeService.getNode(nodeId, false);

    if (!node) {
      throw new Error('Node not found');
    }

    db.prepare('UPDATE graph_nodes SET pinned = 0 WHERE id = ?').run(nodeId);

    return GraphNodeService.getNode(nodeId, false)!;
  }

  /**
   * Find stale entities (confidence below threshold)
   */
  static findStaleEntities(graphId: string, threshold: number = ConfidenceThresholds.ACTIVE): StaleEntity[] {
    // Get graph info
    const graph = db.prepare('SELECT graph_name, decay_rate FROM knowledge_graphs WHERE id = ?')
      .get(graphId) as { graph_name: string; decay_rate: number } | undefined;

    if (!graph) {
      throw new Error('Graph not found');
    }

    // Get all non-pinned nodes
    const nodes = db.prepare(
      'SELECT id, node_type, name, created_at, last_accessed, pinned FROM graph_nodes WHERE graph_id = ? AND pinned = 0'
    ).all(graphId) as any[];

    const now = Math.floor(Date.now() / 1000);
    const staleEntities: StaleEntity[] = [];

    for (const node of nodes) {
      const input: ConfidenceCalculationInput = {
        base_confidence: 1.0,
        decay_rate: graph.decay_rate,
        created_at: node.created_at,
        last_accessed: node.last_accessed,
        pinned: false,
        current_timestamp: now,
      };

      const result = calculateConfidence(input);

      if (result.confidence < threshold) {
        staleEntities.push({
          node_id: node.id,
          node_name: node.name,
          node_type: node.node_type,
          confidence: result.confidence,
          weeks_elapsed: result.weeks_elapsed,
          last_accessed: node.last_accessed,
          graph_name: graph.graph_name,
        });
      }
    }

    // Sort by confidence ascending (most stale first)
    staleEntities.sort((a, b) => a.confidence - b.confidence);

    return staleEntities;
  }

  /**
   * Find all stale entities across all graphs in a campaign
   */
  static findStaleEntitiesInCampaign(campaignId: string, threshold: number = ConfidenceThresholds.ACTIVE): StaleEntity[] {
    // Get all graphs in campaign
    const graphs = db.prepare('SELECT id FROM knowledge_graphs WHERE campaign_id = ?')
      .all(campaignId) as { id: string }[];

    const allStaleEntities: StaleEntity[] = [];

    for (const graph of graphs) {
      const staleEntities = this.findStaleEntities(graph.id, threshold);
      allStaleEntities.push(...staleEntities);
    }

    // Sort by confidence ascending (most stale first)
    allStaleEntities.sort((a, b) => a.confidence - b.confidence);

    return allStaleEntities;
  }

  /**
   * Get confidence distribution for a graph
   */
  static getConfidenceDistribution(graphId: string): {
    high: number;
    medium: number;
    low: number;
    pinned: number;
    total: number;
  } {
    const graph = db.prepare('SELECT decay_rate FROM knowledge_graphs WHERE id = ?')
      .get(graphId) as { decay_rate: number } | undefined;

    if (!graph) {
      throw new Error('Graph not found');
    }

    const nodes = db.prepare(
      'SELECT id, created_at, last_accessed, pinned FROM graph_nodes WHERE graph_id = ?'
    ).all(graphId) as any[];

    const now = Math.floor(Date.now() / 1000);

    let high = 0;
    let medium = 0;
    let low = 0;
    let pinned = 0;

    for (const node of nodes) {
      if (node.pinned) {
        pinned++;
        continue;
      }

      const input: ConfidenceCalculationInput = {
        base_confidence: 1.0,
        decay_rate: graph.decay_rate,
        created_at: node.created_at,
        last_accessed: node.last_accessed,
        pinned: false,
        current_timestamp: now,
      };

      const result = calculateConfidence(input);

      if (result.confidence >= ConfidenceThresholds.HIGH) {
        high++;
      } else if (result.confidence >= ConfidenceThresholds.MEDIUM) {
        medium++;
      } else {
        low++;
      }
    }

    return {
      high,
      medium,
      low,
      pinned,
      total: nodes.length,
    };
  }

  /**
   * Bulk reinforce entities
   */
  static reinforceMultipleEntities(nodeIds: string[]): void {
    const now = Math.floor(Date.now() / 1000);

    const transaction = db.transaction(() => {
      for (const nodeId of nodeIds) {
        db.prepare('UPDATE graph_nodes SET last_accessed = ? WHERE id = ?').run(now, nodeId);
      }
    });

    transaction();
  }

  /**
   * Bulk pin entities
   */
  static pinMultipleEntities(nodeIds: string[]): void {
    const transaction = db.transaction(() => {
      for (const nodeId of nodeIds) {
        db.prepare('UPDATE graph_nodes SET pinned = 1 WHERE id = ?').run(nodeId);
      }
    });

    transaction();
  }

  /**
   * Bulk unpin entities
   */
  static unpinMultipleEntities(nodeIds: string[]): void {
    const transaction = db.transaction(() => {
      for (const nodeId of nodeIds) {
        db.prepare('UPDATE graph_nodes SET pinned = 0 WHERE id = ?').run(nodeId);
      }
    });

    transaction();
  }
}
