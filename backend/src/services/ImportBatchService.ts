/**
 * Import Batch Service
 * Feature: 005-create-the-ai
 * Handles atomic batch execution and revert operations
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';
import { ImportBatch } from '../../shared/types/KnowledgeGraph';
import { AIApprovalSummary } from '../../shared/types/ImportSession';

/**
 * Service for managing import batches
 * Reference: data-model.md lines 498-577
 */
export class ImportBatchService {
  constructor(private db: Database.Database) {}

  /**
   * Execute an approved import batch atomically
   */
  async executeBatch(
    importSessionId: string,
    campaignId: string,
    approvalSummary: AIApprovalSummary
  ): Promise<ImportBatch> {
    const batchId = crypto.randomBytes(16).toString('hex');
    const nodeIds: string[] = [];
    const edgeIds: string[] = [];
    const cardIds: string[] = [];
    const timestamp = Math.floor(Date.now() / 1000);

    // Start transaction for atomicity
    const executeBatchTx = this.db.transaction(() => {
      // 1. Create cards for new entities
      for (const cardInfo of approvalSummary.cardsCreated) {
        const cardId = this.createCard(
          campaignId,
          cardInfo.title,
          cardInfo.category,
          importSessionId,
          batchId,
          timestamp
        );
        cardIds.push(cardId);
      }

      // 2. Ensure knowledge graphs exist
      this.ensureKnowledgeGraphs(campaignId, timestamp);

      // 3. Create graph nodes
      for (const nodeInfo of approvalSummary.nodesAdded) {
        const graphId = this.getGraphId(campaignId, nodeInfo.graphType);
        const nodeId = this.createGraphNode(
          graphId,
          nodeInfo.nodeType,
          nodeInfo.name,
          cardIds[approvalSummary.cardsCreated.findIndex(c => c.title === nodeInfo.name)] || null,
          timestamp
        );
        nodeIds.push(nodeId);
      }

      // 4. Create graph edges
      for (const edgeInfo of approvalSummary.edgesAdded) {
        const graphId = this.getGraphId(campaignId, edgeInfo.graphType);
        const sourceNodeId = this.findNodeId(graphId, edgeInfo.source);
        const targetNodeId = this.findNodeId(graphId, edgeInfo.target);

        if (sourceNodeId && targetNodeId) {
          const edgeId = this.createGraphEdge(
            graphId,
            sourceNodeId,
            targetNodeId,
            edgeInfo.relationshipType,
            timestamp
          );
          edgeIds.push(edgeId);
        }
      }

      // 5. Create import batch record
      this.db.prepare(`
        INSERT INTO import_batches (id, import_session_id, node_ids, edge_ids, card_ids, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        batchId,
        importSessionId,
        JSON.stringify(nodeIds),
        JSON.stringify(edgeIds),
        JSON.stringify(cardIds),
        timestamp
      );

      // 6. Update import session status
      this.db.prepare(`
        UPDATE import_sessions
        SET status = 'approved', completed_at = ?
        WHERE id = ?
      `).run(timestamp, importSessionId);
    });

    // Execute transaction
    executeBatchTx();

    return {
      id: batchId,
      importSessionId,
      nodeIds,
      edgeIds,
      cardIds,
      createdAt: new Date(timestamp * 1000).toISOString()
    };
  }

  /**
   * Revert an import batch atomically
   */
  async revertBatch(batchId: string): Promise<void> {
    // Get batch details
    const batch = this.db.prepare(`
      SELECT * FROM import_batches WHERE id = ?
    `).get(batchId) as any;

    if (!batch) {
      throw new Error('Import batch not found');
    }

    const nodeIds = JSON.parse(batch.node_ids) as string[];
    const edgeIds = JSON.parse(batch.edge_ids) as string[];
    const cardIds = JSON.parse(batch.card_ids) as string[];

    // Start transaction for atomic revert
    const revertBatchTx = this.db.transaction(() => {
      // 1. Delete edges (must be before nodes due to foreign keys)
      for (const edgeId of edgeIds) {
        this.db.prepare('DELETE FROM graph_edges WHERE id = ?').run(edgeId);
      }

      // 2. Delete nodes
      for (const nodeId of nodeIds) {
        this.db.prepare('DELETE FROM graph_nodes WHERE id = ?').run(nodeId);
      }

      // 3. Delete cards (cascades to children if any)
      for (const cardId of cardIds) {
        this.deleteCardCascade(parseInt(cardId));
      }

      // 4. Update import session status
      this.db.prepare(`
        UPDATE import_sessions
        SET status = 'reverted'
        WHERE id = ?
      `).run(batch.import_session_id);

      // 5. Delete batch record
      this.db.prepare('DELETE FROM import_batches WHERE id = ?').run(batchId);
    });

    // Execute transaction
    revertBatchTx();
  }

  /**
   * Create a card
   */
  private createCard(
    campaignId: string,
    title: string,
    category: string,
    importSessionId: string,
    batchId: string,
    timestamp: number
  ): string {
    const result = this.db.prepare(`
      INSERT INTO cards (
        campaign_id, parent_id, title, card_type, content,
        position, import_session_id, import_batch_id, created_at, updated_at
      )
      VALUES (?, NULL, ?, 'text', ?, 0, ?, ?, ?, ?)
    `).run(
      campaignId,
      title,
      JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `${category}: ${title}` }] }] }),
      importSessionId,
      batchId,
      timestamp,
      timestamp
    );

    return result.lastInsertRowid.toString();
  }

  /**
   * Ensure knowledge graphs exist for campaign
   */
  private ensureKnowledgeGraphs(campaignId: string, timestamp: number): void {
    const graphTypes = ['geographical', 'political_web', 'world_foundations', 'campaign_story'];

    for (const type of graphTypes) {
      const existing = this.db.prepare(`
        SELECT id FROM knowledge_graphs
        WHERE campaign_id = ? AND type = ?
      `).get(campaignId, type);

      if (!existing) {
        const graphId = crypto.randomBytes(16).toString('hex');
        this.db.prepare(`
          INSERT INTO knowledge_graphs (id, campaign_id, type, last_updated, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(graphId, campaignId, type, timestamp, timestamp);
      }
    }
  }

  /**
   * Get graph ID for a campaign and type
   */
  private getGraphId(campaignId: string, graphType: string): string {
    const graph = this.db.prepare(`
      SELECT id FROM knowledge_graphs
      WHERE campaign_id = ? AND type = ?
    `).get(campaignId, graphType) as any;

    return graph?.id || '';
  }

  /**
   * Create a graph node
   */
  private createGraphNode(
    graphId: string,
    nodeType: string,
    name: string,
    sourceCardId: string | null,
    timestamp: number
  ): string {
    const nodeId = crypto.randomBytes(16).toString('hex');

    this.db.prepare(`
      INSERT INTO graph_nodes (
        id, graph_id, type, name, attributes,
        source_card_id, information_level_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `).run(
      nodeId,
      graphId,
      nodeType,
      name,
      JSON.stringify({ description: '', tags: [] }),
      sourceCardId,
      timestamp,
      timestamp
    );

    return nodeId;
  }

  /**
   * Find node ID by name
   */
  private findNodeId(graphId: string, nodeName: string): string | null {
    const node = this.db.prepare(`
      SELECT id FROM graph_nodes
      WHERE graph_id = ? AND name = ?
    `).get(graphId, nodeName) as any;

    return node?.id || null;
  }

  /**
   * Create a graph edge
   */
  private createGraphEdge(
    graphId: string,
    sourceNodeId: string,
    targetNodeId: string,
    relationshipType: string,
    timestamp: number
  ): string {
    const edgeId = crypto.randomBytes(16).toString('hex');

    this.db.prepare(`
      INSERT INTO graph_edges (
        id, graph_id, source_node_id, target_node_id,
        relationship_type, attributes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      edgeId,
      graphId,
      sourceNodeId,
      targetNodeId,
      relationshipType,
      JSON.stringify({ strength: 1.0, description: '' }),
      timestamp,
      timestamp
    );

    return edgeId;
  }

  /**
   * Delete a card and its descendants
   */
  private deleteCardCascade(cardId: number): void {
    // Get all descendants
    const descendants = this.getCardDescendants(cardId);

    // Delete from deepest level first
    descendants.reverse();
    for (const descendant of descendants) {
      this.db.prepare('DELETE FROM cards WHERE id = ?').run(descendant.id);
    }

    // Delete the card itself
    this.db.prepare('DELETE FROM cards WHERE id = ?').run(cardId);
  }

  /**
   * Get all descendants of a card
   */
  private getCardDescendants(cardId: number): any[] {
    const descendants: any[] = [];
    const toProcess = [cardId];

    while (toProcess.length > 0) {
      const currentId = toProcess.pop()!;
      const children = this.db.prepare(`
        SELECT id FROM cards WHERE parent_id = ?
      `).all(currentId) as any[];

      for (const child of children) {
        descendants.push(child);
        toProcess.push(child.id);
      }
    }

    return descendants;
  }
}