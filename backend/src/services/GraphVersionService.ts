/**
 * Graph Version Service
 * Feature 006: Knowledge Graphs with Confidence Decay
 *
 * Handles version snapshots and 1-deep versioning (current + backup)
 * - Snapshot creation with automatic backup rotation
 * - Version restoration from backup
 * - Version history queries
 */

import crypto from 'crypto';
import { db } from './DatabaseService';
import { GraphNodeService } from './GraphNodeService';
import { GraphEdgeService } from './GraphEdgeService';

export interface GraphVersion {
  id: string;
  graph_id: string;
  snapshot_content: {
    nodes: any[];
    edges: any[];
    metadata: {
      graph_name: string;
      graph_type: string;
      decay_rate: number;
      toggle_state: boolean;
      snapshot_timestamp: number;
    };
  };
  version_type: 'current' | 'backup';
  created_at: number;
}

export class GraphVersionService {
  /**
   * Create a version snapshot
   * Automatically rotates: current → backup, new snapshot → current
   */
  static createVersion(graphId: string): GraphVersion {
    // Get graph metadata
    const graph = db.prepare('SELECT * FROM knowledge_graphs WHERE id = ?').get(graphId) as any;

    if (!graph) {
      throw new Error('Graph not found');
    }

    // Get all nodes and edges
    const nodes = GraphNodeService.listNodes(graphId, {});
    const edges = GraphEdgeService.listEdges(graphId, {});

    const now = Math.floor(Date.now() / 1000);

    // Build snapshot content
    const snapshotContent = {
      nodes: nodes.map(node => ({
        id: node.id,
        node_type: node.node_type,
        name: node.name,
        attributes: node.attributes,
        observations: node.observations,
        information_level_id: node.information_level_id,
        created_at: node.created_at,
        last_accessed: node.last_accessed,
        pinned: node.pinned,
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        edge_type: edge.edge_type,
        source_node_id: edge.source_node_id,
        target_node_id: edge.target_node_id,
        directed: edge.directed,
        metadata: edge.metadata,
        created_at: edge.created_at,
      })),
      metadata: {
        graph_name: graph.graph_name,
        graph_type: graph.graph_type,
        decay_rate: graph.decay_rate,
        toggle_state: Boolean(graph.toggle_state),
        snapshot_timestamp: now,
      },
    };

    const snapshotJson = JSON.stringify(snapshotContent);

    // Get existing current version (will become backup)
    const existingCurrent = db.prepare(
      "SELECT id FROM graph_versions WHERE graph_id = ? AND version_type = 'current'"
    ).get(graphId) as { id: string } | undefined;

    // Transaction: rotate current → backup, create new current
    const transaction = db.transaction(() => {
      // Delete old backup if exists
      db.prepare(
        "DELETE FROM graph_versions WHERE graph_id = ? AND version_type = 'backup'"
      ).run(graphId);

      // Rotate existing current to backup (if exists)
      if (existingCurrent) {
        db.prepare(
          "UPDATE graph_versions SET version_type = 'backup' WHERE id = ?"
        ).run(existingCurrent.id);

        // Update graph backup_version_id reference
        db.prepare(
          'UPDATE knowledge_graphs SET backup_version_id = ? WHERE id = ?'
        ).run(existingCurrent.id, graphId);
      }

      // Create new current version
      const newVersionId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO graph_versions (id, graph_id, snapshot_content, version_type, created_at)
        VALUES (?, ?, ?, 'current', ?)
      `).run(newVersionId, graphId, snapshotJson, now);

      // Update graph current_version_id reference
      db.prepare(
        'UPDATE knowledge_graphs SET current_version_id = ? WHERE id = ?'
      ).run(newVersionId, graphId);

      return newVersionId;
    });

    const newVersionId = transaction();

    return this.getVersion(newVersionId)!;
  }

  /**
   * Get version by ID
   */
  static getVersion(versionId: string): GraphVersion | null {
    const row = db.prepare('SELECT * FROM graph_versions WHERE id = ?').get(versionId) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      graph_id: row.graph_id,
      snapshot_content: JSON.parse(row.snapshot_content),
      version_type: row.version_type,
      created_at: row.created_at,
    };
  }

  /**
   * Get all versions for a graph (current + backup)
   */
  static getVersions(graphId: string): GraphVersion[] {
    const rows = db.prepare(
      'SELECT * FROM graph_versions WHERE graph_id = ? ORDER BY created_at DESC'
    ).all(graphId) as any[];

    return rows.map(row => ({
      id: row.id,
      graph_id: row.graph_id,
      snapshot_content: JSON.parse(row.snapshot_content),
      version_type: row.version_type,
      created_at: row.created_at,
    }));
  }

  /**
   * Restore graph from backup version
   * Replaces current graph state with backup snapshot
   */
  static restoreFromBackup(graphId: string): void {
    // Get backup version
    const backup = db.prepare(
      "SELECT * FROM graph_versions WHERE graph_id = ? AND version_type = 'backup'"
    ).get(graphId) as any;

    if (!backup) {
      throw new Error('No backup version found for this graph');
    }

    const snapshotContent = JSON.parse(backup.snapshot_content);

    // Transaction: delete current nodes/edges, restore from backup
    const transaction = db.transaction(() => {
      // Delete all current nodes (CASCADE deletes edges)
      db.prepare('DELETE FROM graph_nodes WHERE graph_id = ?').run(graphId);

      // Restore nodes from backup
      for (const node of snapshotContent.nodes) {
        db.prepare(`
          INSERT INTO graph_nodes (
            id, graph_id, node_type, name, attributes, observations,
            information_level_id, created_at, last_accessed, pinned
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          node.id,
          graphId,
          node.node_type,
          node.name,
          JSON.stringify(node.attributes),
          node.observations ? JSON.stringify(node.observations) : null,
          node.information_level_id,
          node.created_at,
          node.last_accessed,
          node.pinned ? 1 : 0
        );
      }

      // Restore edges from backup
      for (const edge of snapshotContent.edges) {
        db.prepare(`
          INSERT INTO graph_edges (
            id, graph_id, edge_type, source_node_id, target_node_id,
            directed, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          edge.id,
          graphId,
          edge.edge_type,
          edge.source_node_id,
          edge.target_node_id,
          edge.directed ? 1 : 0,
          edge.metadata ? JSON.stringify(edge.metadata) : null,
          edge.created_at
        );
      }

      // Update graph metadata from backup
      const now = Math.floor(Date.now() / 1000);
      db.prepare(`
        UPDATE knowledge_graphs
        SET graph_name = ?,
            graph_type = ?,
            decay_rate = ?,
            toggle_state = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        snapshotContent.metadata.graph_name,
        snapshotContent.metadata.graph_type,
        snapshotContent.metadata.decay_rate,
        snapshotContent.metadata.toggle_state ? 1 : 0,
        now,
        graphId
      );
    });

    transaction();
  }

  /**
   * Delete version (restricted: cannot delete current version)
   */
  static deleteVersion(versionId: string): void {
    const version = this.getVersion(versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    if (version.version_type === 'current') {
      throw new Error('Cannot delete current version. Create a new snapshot first.');
    }

    // Delete backup version
    db.prepare('DELETE FROM graph_versions WHERE id = ?').run(versionId);

    // Clear backup_version_id reference in graph
    db.prepare(
      'UPDATE knowledge_graphs SET backup_version_id = NULL WHERE backup_version_id = ?'
    ).run(versionId);
  }

  /**
   * Get current version for a graph
   */
  static getCurrentVersion(graphId: string): GraphVersion | null {
    const row = db.prepare(
      "SELECT * FROM graph_versions WHERE graph_id = ? AND version_type = 'current'"
    ).get(graphId) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      graph_id: row.graph_id,
      snapshot_content: JSON.parse(row.snapshot_content),
      version_type: row.version_type,
      created_at: row.created_at,
    };
  }

  /**
   * Get backup version for a graph
   */
  static getBackupVersion(graphId: string): GraphVersion | null {
    const row = db.prepare(
      "SELECT * FROM graph_versions WHERE graph_id = ? AND version_type = 'backup'"
    ).get(graphId) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      graph_id: row.graph_id,
      snapshot_content: JSON.parse(row.snapshot_content),
      version_type: row.version_type,
      created_at: row.created_at,
    };
  }
}
