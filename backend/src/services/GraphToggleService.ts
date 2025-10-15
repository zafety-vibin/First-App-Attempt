/**
 * Graph Toggle Service
 * Feature 006: Knowledge Graphs with Confidence Decay
 *
 * Handles AI context toggle controls for knowledge graphs
 * - Toggle graphs on/off for AI access
 * - Query active (toggled-on) graphs
 * - Manage toggle states across campaign
 */

import { db } from './DatabaseService';

export interface GraphToggleState {
  graph_id: string;
  graph_name: string;
  graph_type: string;
  toggle_state: boolean;
  node_count: number;
  edge_count: number;
  updated_at: number;
}

export class GraphToggleService {
  /**
   * Toggle graph on or off for AI access
   */
  static toggleGraph(graphId: string, state: boolean): void {
    const graph = db.prepare('SELECT id FROM knowledge_graphs WHERE id = ?').get(graphId);

    if (!graph) {
      throw new Error('Graph not found');
    }

    const now = Math.floor(Date.now() / 1000);

    db.prepare(
      'UPDATE knowledge_graphs SET toggle_state = ?, updated_at = ? WHERE id = ?'
    ).run(state ? 1 : 0, now, graphId);
  }

  /**
   * Get only toggled-on (active) graphs for a campaign
   */
  static getActiveGraphs(campaignId: string): GraphToggleState[] {
    const rows = db.prepare(`
      SELECT
        kg.id as graph_id,
        kg.graph_name,
        kg.graph_type,
        kg.toggle_state,
        kg.updated_at,
        (SELECT COUNT(*) FROM graph_nodes WHERE graph_id = kg.id) as node_count,
        (SELECT COUNT(*) FROM graph_edges WHERE graph_id = kg.id) as edge_count
      FROM knowledge_graphs kg
      WHERE kg.campaign_id = ? AND kg.toggle_state = 1
      ORDER BY kg.updated_at DESC
    `).all(campaignId) as any[];

    return rows.map(row => ({
      graph_id: row.graph_id,
      graph_name: row.graph_name,
      graph_type: row.graph_type,
      toggle_state: Boolean(row.toggle_state),
      node_count: row.node_count,
      edge_count: row.edge_count,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Get toggle states for all graphs in a campaign
   */
  static getAllToggles(campaignId: string): GraphToggleState[] {
    const rows = db.prepare(`
      SELECT
        kg.id as graph_id,
        kg.graph_name,
        kg.graph_type,
        kg.toggle_state,
        kg.updated_at,
        (SELECT COUNT(*) FROM graph_nodes WHERE graph_id = kg.id) as node_count,
        (SELECT COUNT(*) FROM graph_edges WHERE graph_id = kg.id) as edge_count
      FROM knowledge_graphs kg
      WHERE kg.campaign_id = ?
      ORDER BY kg.updated_at DESC
    `).all(campaignId) as any[];

    return rows.map(row => ({
      graph_id: row.graph_id,
      graph_name: row.graph_name,
      graph_type: row.graph_type,
      toggle_state: Boolean(row.toggle_state),
      node_count: row.node_count,
      edge_count: row.edge_count,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Toggle multiple graphs at once
   */
  static toggleMultipleGraphs(graphIds: string[], state: boolean): void {
    const now = Math.floor(Date.now() / 1000);

    const transaction = db.transaction(() => {
      for (const graphId of graphIds) {
        db.prepare(
          'UPDATE knowledge_graphs SET toggle_state = ?, updated_at = ? WHERE id = ?'
        ).run(state ? 1 : 0, now, graphId);
      }
    });

    transaction();
  }

  /**
   * Get toggle state for a specific graph
   */
  static getToggleState(graphId: string): boolean {
    const row = db.prepare(
      'SELECT toggle_state FROM knowledge_graphs WHERE id = ?'
    ).get(graphId) as { toggle_state: number } | undefined;

    if (!row) {
      throw new Error('Graph not found');
    }

    return Boolean(row.toggle_state);
  }

  /**
   * Set all graphs in campaign to a specific toggle state
   */
  static setAllToggles(campaignId: string, state: boolean): void {
    const now = Math.floor(Date.now() / 1000);

    db.prepare(
      'UPDATE knowledge_graphs SET toggle_state = ?, updated_at = ? WHERE campaign_id = ?'
    ).run(state ? 1 : 0, now, campaignId);
  }

  /**
   * Count active graphs for a campaign
   */
  static countActiveGraphs(campaignId: string): number {
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM knowledge_graphs WHERE campaign_id = ? AND toggle_state = 1'
    ).get(campaignId) as { count: number };

    return result.count;
  }
}
