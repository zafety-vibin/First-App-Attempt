/**
 * Session Import Service
 * Feature 006 Extension: Campaign-Story Dual-Tier System
 *
 * Orchestrates session recap import with automatic metadata logging
 * Creates both narrative (session_recap) and metadata (import_batch) nodes
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';
import { GraphNodeService } from './GraphNodeService';
import { GraphEdgeService } from './GraphEdgeService';
import { DatabaseChangeDetectionService } from './DatabaseChangeDetectionService';
import {
  TemporalAnchors,
  calculatePruneSession,
  DEFAULT_RETENTION_WINDOW,
  getInitialConfidence,
  DEFAULT_DECAY_CONFIG
} from '../models/CampaignStoryEntities';
import { GraphNode, GraphEdge, GraphObservation } from '../models/KnowledgeGraph';
import { DatabaseChanges } from './DatabaseChangeDetectionService';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Input data for creating a session recap
 */
export interface SessionRecapInput {
  /** Session name/title */
  name: string;

  /** Temporal anchors */
  temporal_anchors: TemporalAnchors;

  /** Session observations (what happened) */
  observations: string[];

  /** Optional tags */
  tags?: string[];

  /** Whether to auto-detect database changes */
  detect_changes?: boolean;
}

/**
 * Result of session import operation
 */
export interface SessionImportResult {
  /** Created session recap node */
  recapNode: GraphNode;

  /** Created import batch node (null if no changes detected) */
  batchNode: GraphNode | null;

  /** Detected database changes */
  changes: DatabaseChanges;

  /** Number of metadata nodes pruned */
  pruned: number;
}

/**
 * Result of bulk import operation
 */
export interface BulkImportResult {
  /** Total sessions imported */
  sessionsImported: number;

  /** Total metadata nodes created */
  metadataNodesCreated: number;

  /** Total entities logged as additions */
  entitiesLogged: number;

  /** Session recap nodes created */
  recapNodes: GraphNode[];
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class SessionImportService {
  private db: Database.Database;
  private changeDetectionService: DatabaseChangeDetectionService;
  private retentionWindow: number;

  constructor(
    db: Database.Database,
    changeDetectionService: DatabaseChangeDetectionService,
    retentionWindow: number = DEFAULT_RETENTION_WINDOW
  ) {
    this.db = db;
    this.changeDetectionService = changeDetectionService;
    this.retentionWindow = retentionWindow;
  }

  /**
   * Finalize a session import with automatic metadata logging
   * Called AFTER Import AI approval has written entities to category tables
   */
  finalizeSessionImport(
    campaignId: string,
    graphId: string,
    recapData: SessionRecapInput
  ): SessionImportResult {
    // 1. Create narrative session_recap node in Campaign-Story graph
    const recapNode = this.createSessionRecapNode(campaignId, graphId, recapData);

    // 2. Detect database changes since last session (if requested)
    let changes: DatabaseChanges = { additions: [], modifications: [] };
    if (recapData.detect_changes !== false) {
      changes = this.detectChangesSinceLastSession(
        campaignId,
        recapData.temporal_anchors.session_number
      );
    }

    // 3. Create import_batch metadata node if changes exist
    let batchNode: GraphNode | null = null;
    if (changes.additions.length > 0 || changes.modifications.length > 0) {
      batchNode = this.createImportBatchNode(campaignId, graphId, recapNode, changes);
    }

    // 4. Create bridge relationship: recap ─[has_metadata_log]→ batch
    if (batchNode) {
      this.createBridgeEdge(campaignId, graphId, recapNode.id, batchNode.id);
    }

    // 5. Link to previous session: prev ─[followed_by]→ current
    this.linkToPreviousSession(campaignId, graphId, recapNode);

    // 6. Check for pruning trigger
    const pruned = this.checkAndPruneOldMetadata(
      campaignId,
      graphId,
      recapData.temporal_anchors.session_number
    );

    return { recapNode, batchNode, changes, pruned };
  }

  /**
   * Bulk import from existing session_recaps database table
   * One-click import: rebuilds entire Campaign-Story timeline from existing data
   *
   * Uses created_at timestamps to attribute entity additions to session windows
   * SKIPS updated_at (unreliable for bulk imports)
   */
  bulkImportFromDatabase(campaignId: string, graphId: string): BulkImportResult {
    // Get all session recaps from database table (Feature 014)
    const recaps = this.db.prepare(`
      SELECT * FROM session_recaps
      WHERE campaign_id = ?
      ORDER BY session_date ASC
    `).all(campaignId) as any[];

    if (recaps.length === 0) {
      throw new Error('No session recaps found in database');
    }

    const recapNodes: GraphNode[] = [];
    let metadataNodesCreated = 0;
    let entitiesLogged = 0;

    // Process each session recap
    for (let i = 0; i < recaps.length; i++) {
      const recap = recaps[i];
      const sessionNumber = i + 1; // Sequential numbering starting from 1

      // Determine session window boundaries
      const windowStart = i === 0 ? 0 : recaps[i - 1].created_at;
      const windowEnd = recap.created_at;

      // Find entities created in this window (between previous session and this one)
      const additions = this.findAdditionsInWindow(campaignId, windowStart, windowEnd);

      // Build temporal anchors from database recap
      const temporalAnchors: TemporalAnchors = {
        session_number: sessionNumber,
        in_game_date: recap.in_game_date_start || undefined,
        real_world_date: recap.session_date
          ? new Date(recap.session_date * 1000).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        days_elapsed_total: this.calculateDaysElapsed(recap, recaps.slice(0, i))
      };

      // Extract observations from recap summary
      const observations: string[] = [];
      if (recap.summary) {
        observations.push(recap.summary);
      }
      if (recap.key_events) {
        try {
          const events = JSON.parse(recap.key_events);
          if (Array.isArray(events)) {
            observations.push(...events);
          }
        } catch (e) {
          // key_events not valid JSON, skip
        }
      }

      // Create session recap node
      const recapNode = this.createSessionRecapNode(campaignId, graphId, {
        name: recap.name,
        temporal_anchors: temporalAnchors,
        observations: observations.length > 0 ? observations : ['Session recap'],
        tags: recap.tags ? JSON.parse(recap.tags) : [],
        detect_changes: false // Manual change detection below
      });

      recapNodes.push(recapNode);

      // Create metadata log if additions found
      if (additions.length > 0) {
        const additionLog = this.createDatabaseAdditionLog(
          campaignId,
          graphId,
          recapNode,
          additions
        );
        metadataNodesCreated++;
        entitiesLogged += additions.length;

        // Link recap to addition log
        this.createBridgeEdge(campaignId, graphId, recapNode.id, additionLog.id);
      }

      // Link to previous session (handled automatically by linkToPreviousSession)
      if (i > 0) {
        const edgeId = crypto.randomUUID();
        const now = Math.floor(Date.now() / 1000);

        this.db.prepare(`
          INSERT INTO graph_edges (
            id, graph_id, edge_type, source_node_id, target_node_id, directed, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          edgeId,
          graphId,
          'followed_by',
          recapNodes[i - 1].id,
          recapNode.id,
          1,
          null,
          now
        );
      }
    }

    return {
      sessionsImported: recaps.length,
      metadataNodesCreated,
      entitiesLogged,
      recapNodes
    };
  }

  /**
   * Find entities created within a time window
   */
  private findAdditionsInWindow(
    campaignId: string,
    windowStart: number,
    windowEnd: number
  ): { entity_type: string; entity_id: string; entity_name: string; memory_system: string }[] {
    const additions: { entity_type: string; entity_id: string; entity_name: string; memory_system: string }[] = [];

    // Category tables to check
    const categoryTables = [
      'npcs', 'locations', 'factions', 'quests', 'player_characters',
      'lore_entries', 'world_rules', 'planar_forces', 'items', 'creatures'
    ];

    const memoryMap: Record<string, string> = {
      npcs: 'political-web-memory',
      factions: 'political-web-memory',
      locations: 'geographic-memory',
      quests: 'campaign-story-memory',
      player_characters: 'campaign-story-memory',
      lore_entries: 'world-foundations-memory',
      world_rules: 'world-foundations-memory',
      planar_forces: 'world-foundations-memory',
      items: 'inventory-database',
      creatures: 'world-foundations-memory'
    };

    for (const table of categoryTables) {
      try {
        const entities = this.db.prepare(`
          SELECT id, name, created_at
          FROM ${table}
          WHERE campaign_id = ?
            AND created_at > ?
            AND created_at <= ?
          ORDER BY created_at ASC
        `).all(campaignId, windowStart, windowEnd) as any[];

        for (const entity of entities) {
          additions.push({
            entity_type: table,
            entity_id: entity.id,
            entity_name: entity.name,
            memory_system: memoryMap[table] || 'unknown'
          });
        }
      } catch (error) {
        // Table might not exist, skip
        console.warn(`Warning: Could not query ${table} for bulk import:`, error);
      }
    }

    return additions;
  }

  /**
   * Create database_addition_log metadata node for bulk imports
   */
  private createDatabaseAdditionLog(
    campaignId: string,
    graphId: string,
    recapNode: GraphNode,
    additions: { entity_type: string; entity_id: string; entity_name: string; memory_system: string }[]
  ): GraphNode {
    const nodeId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const sessionNumber = recapNode.attributes.session_number;

    // Format additions as observations
    const observationsData: GraphObservation[] = additions.map(add => ({
      text: `Bulk import detected: ${this.singularize(add.entity_type)} "${add.entity_name}" created during session window`,
      created_at: now,
      last_accessed: now
    }));

    // Calculate prune session
    const pruneAfterSession = calculatePruneSession(sessionNumber, this.retentionWindow);

    const attributes = {
      tier: 'metadata',
      logged_session: sessionNumber,
      session_number: sessionNumber,
      prune_after_session: pruneAfterSession,
      import_date: new Date(now * 1000).toISOString(),
      bulk_imported: true, // Flag to distinguish from live imports
      initial_confidence: DEFAULT_DECAY_CONFIG.metadata_static
    };

    // Insert node
    this.db.prepare(`
      INSERT INTO graph_nodes (
        id, graph_id, node_type, name, attributes, observations,
        information_level_id, created_at, last_accessed, pinned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nodeId,
      graphId,
      'database_addition_log',
      `Session ${sessionNumber} Additions (Bulk Import)`,
      JSON.stringify(attributes),
      JSON.stringify(observationsData),
      null,
      now,
      now,
      0
    );

    return {
      id: nodeId,
      graph_id: graphId,
      node_type: 'database_addition_log',
      name: `Session ${sessionNumber} Additions (Bulk Import)`,
      attributes,
      observations: observationsData,
      information_level_id: null,
      created_at: now,
      last_accessed: now,
      pinned: false,
      confidence: DEFAULT_DECAY_CONFIG.metadata_static
    };
  }

  /**
   * Calculate cumulative days elapsed
   */
  private calculateDaysElapsed(
    currentRecap: any,
    previousRecaps: any[]
  ): number | undefined {
    // Try to use time_passed field if available
    if (currentRecap.time_passed) {
      // Parse "2 days" or similar
      const match = currentRecap.time_passed.match(/(\d+)/);
      if (match) {
        const daysThisSession = parseInt(match[1], 10);
        const previousDays = previousRecaps.reduce((sum, r) => {
          const m = r.time_passed?.match(/(\d+)/);
          return sum + (m ? parseInt(m[1], 10) : 0);
        }, 0);
        return previousDays + daysThisSession;
      }
    }

    // Fallback: use session number as proxy
    return previousRecaps.length + 1;
  }

  /**
   * Convert plural table name to singular
   */
  private singularize(tableName: string): string {
    const map: Record<string, string> = {
      npcs: 'NPC',
      locations: 'Location',
      factions: 'Faction',
      quests: 'Quest',
      player_characters: 'Player Character',
      lore_entries: 'Lore Entry',
      world_rules: 'World Rule',
      planar_forces: 'Planar Force',
      session_preps: 'Session Prep',
      custom_mechanics: 'Custom Mechanic',
      items: 'Item',
      creatures: 'Creature'
    };
    return map[tableName] || tableName;
  }

  /**
   * Create narrative session_recap node
   */
  private createSessionRecapNode(
    campaignId: string,
    graphId: string,
    recapData: SessionRecapInput
  ): GraphNode {
    const nodeId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Format observations with timestamps
    const observations: GraphObservation[] = recapData.observations.map(text => ({
      text,
      created_at: now,
      last_accessed: now
    }));

    // Get initial confidence for session_recap (1.0 - direct experience)
    const initialConfidence = getInitialConfidence('session_recap');

    const attributes = {
      tier: 'narrative',
      ...recapData.temporal_anchors,
      initial_confidence: initialConfidence,
      tags: recapData.tags || []
    };

    // Insert directly into graph_nodes
    this.db.prepare(`
      INSERT INTO graph_nodes (
        id, graph_id, node_type, name, attributes, observations,
        information_level_id, created_at, last_accessed, pinned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nodeId,
      graphId,
      'session_recap',
      recapData.name,
      JSON.stringify(attributes),
      observations.length > 0 ? JSON.stringify(observations) : null,
      null, // information_level_id
      now,
      now,
      0 // pinned = false
    );

    // Return created node
    return {
      id: nodeId,
      graph_id: graphId,
      node_type: 'session_recap',
      name: recapData.name,
      attributes,
      observations: observations.length > 0 ? observations : null,
      information_level_id: null,
      created_at: now,
      last_accessed: now,
      pinned: false,
      confidence: initialConfidence
    };
  }

  /**
   * Detect database changes since the last session
   */
  private detectChangesSinceLastSession(
    campaignId: string,
    currentSessionNumber: number
  ): DatabaseChanges {
    // Get previous session's recap node to find its import timestamp
    const previousSession = this.getPreviousSessionRecap(
      campaignId,
      currentSessionNumber - 1
    );

    if (!previousSession) {
      // First session - no previous baseline to compare
      return { additions: [], modifications: [] };
    }

    // Use the previous session's created_at as the baseline timestamp
    const previousTimestamp = previousSession.created_at;

    // Detect all changes since that timestamp
    return this.changeDetectionService.detectChangesSinceTimestamp(
      campaignId,
      previousTimestamp,
      currentSessionNumber
    );
  }

  /**
   * Get the previous session recap node by session number
   */
  private getPreviousSessionRecap(
    campaignId: string,
    sessionNumber: number
  ): GraphNode | null {
    // Find Campaign-Story graph
    const graph = this.db
      .prepare(
        `SELECT id FROM knowledge_graphs
         WHERE campaign_id = ? AND graph_type = 'Campaign-Story'`
      )
      .get(campaignId) as { id: string } | undefined;

    if (!graph) return null;

    // Find session recap with matching session_number using direct SQL query
    const row = this.db.prepare(`
      SELECT * FROM graph_nodes
      WHERE graph_id = ?
        AND node_type = 'session_recap'
        AND JSON_EXTRACT(attributes, '$.session_number') = ?
    `).get(graph.id, sessionNumber) as any;

    if (!row) return null;

    return {
      id: row.id,
      graph_id: row.graph_id,
      node_type: row.node_type,
      name: row.name,
      attributes: JSON.parse(row.attributes),
      observations: row.observations ? JSON.parse(row.observations) : null,
      information_level_id: row.information_level_id,
      created_at: row.created_at,
      last_accessed: row.last_accessed,
      pinned: Boolean(row.pinned)
    };
  }

  /**
   * Create import_batch metadata node
   */
  private createImportBatchNode(
    campaignId: string,
    graphId: string,
    recapNode: GraphNode,
    changes: DatabaseChanges
  ): GraphNode {
    const nodeId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const sessionNumber = recapNode.attributes.session_number;

    // Format changes as observations
    const observations = this.changeDetectionService.formatChangesAsObservations(changes);
    const observationsData: GraphObservation[] = observations.map(text => ({
      text,
      created_at: now,
      last_accessed: now
    }));

    // Calculate when this metadata should be pruned
    const pruneAfterSession = calculatePruneSession(sessionNumber, this.retentionWindow);

    const attributes = {
      tier: 'metadata',
      logged_session: sessionNumber,
      session_number: sessionNumber,
      prune_after_session: pruneAfterSession,
      import_date: new Date(now * 1000).toISOString(),
      initial_confidence: DEFAULT_DECAY_CONFIG.metadata_static
    };

    // Insert directly into graph_nodes
    this.db.prepare(`
      INSERT INTO graph_nodes (
        id, graph_id, node_type, name, attributes, observations,
        information_level_id, created_at, last_accessed, pinned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nodeId,
      graphId,
      'import_batch',
      `Session ${sessionNumber} Import Batch`,
      JSON.stringify(attributes),
      observationsData.length > 0 ? JSON.stringify(observationsData) : null,
      null,
      now,
      now,
      0
    );

    return {
      id: nodeId,
      graph_id: graphId,
      node_type: 'import_batch',
      name: `Session ${sessionNumber} Import Batch`,
      attributes,
      observations: observationsData.length > 0 ? observationsData : null,
      information_level_id: null,
      created_at: now,
      last_accessed: now,
      pinned: false,
      confidence: DEFAULT_DECAY_CONFIG.metadata_static
    };
  }

  /**
   * Create bridge edge: recap ─[has_metadata_log]→ batch
   */
  private createBridgeEdge(
    campaignId: string,
    graphId: string,
    recapNodeId: string,
    batchNodeId: string
  ): GraphEdge {
    const edgeId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    this.db.prepare(`
      INSERT INTO graph_edges (
        id, graph_id, edge_type, source_node_id, target_node_id, directed, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      edgeId,
      graphId,
      'has_metadata_log',
      recapNodeId,
      batchNodeId,
      1, // directed = true
      null, // metadata
      now
    );

    return {
      id: edgeId,
      graph_id: graphId,
      edge_type: 'has_metadata_log',
      source_node_id: recapNodeId,
      target_node_id: batchNodeId,
      directed: true,
      metadata: null,
      created_at: now
    };
  }

  /**
   * Link current session to previous session
   * Creates: prev ─[followed_by]→ current
   */
  private linkToPreviousSession(
    campaignId: string,
    graphId: string,
    currentRecap: GraphNode
  ): void {
    const currentSessionNumber = currentRecap.attributes.session_number;

    // Get previous session
    const previousRecap = this.getPreviousSessionRecap(
      campaignId,
      currentSessionNumber - 1
    );

    if (!previousRecap) {
      // First session - no previous to link to
      return;
    }

    // Create edge: prev ─[followed_by]→ current
    const edgeId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    this.db.prepare(`
      INSERT INTO graph_edges (
        id, graph_id, edge_type, source_node_id, target_node_id, directed, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      edgeId,
      graphId,
      'followed_by',
      previousRecap.id,
      currentRecap.id,
      1, // directed = true
      null,
      now
    );
  }

  /**
   * Check if pruning is needed and delete old metadata nodes
   */
  private checkAndPruneOldMetadata(
    campaignId: string,
    graphId: string,
    currentSessionNumber: number
  ): number {
    // Calculate prune target
    const pruneTarget = currentSessionNumber - this.retentionWindow;

    if (pruneTarget <= 0) {
      // Too early to prune
      return 0;
    }

    // Find all import_batch nodes eligible for pruning using SQL
    const rows = this.db.prepare(`
      SELECT id, attributes
      FROM graph_nodes
      WHERE graph_id = ?
        AND node_type = 'import_batch'
    `).all(graphId) as any[];

    // Filter nodes where prune_after_session <= currentSessionNumber
    const eligibleNodeIds: string[] = [];
    for (const row of rows) {
      const attributes = JSON.parse(row.attributes);
      if (attributes.prune_after_session && attributes.prune_after_session <= currentSessionNumber) {
        eligibleNodeIds.push(row.id);
      }
    }

    // Delete eligible nodes
    let deleted = 0;
    for (const nodeId of eligibleNodeIds) {
      this.db.prepare('DELETE FROM graph_nodes WHERE id = ?').run(nodeId);
      deleted++;
    }

    return deleted;
  }

  /**
   * Set retention window (override default 50 sessions)
   */
  setRetentionWindow(sessions: number): void {
    this.retentionWindow = sessions;
  }

  /**
   * Get current retention window setting
   */
  getRetentionWindow(): number {
    return this.retentionWindow;
  }
}

/**
 * Singleton instance (created with database)
 */
let sessionImportServiceInstance: SessionImportService | null = null;

export function createSessionImportService(
  db: Database.Database,
  changeDetectionService: DatabaseChangeDetectionService,
  retentionWindow?: number
): SessionImportService {
  sessionImportServiceInstance = new SessionImportService(
    db,
    changeDetectionService,
    retentionWindow
  );
  return sessionImportServiceInstance;
}

export function getSessionImportService(): SessionImportService {
  if (!sessionImportServiceInstance) {
    throw new Error('SessionImportService not initialized');
  }
  return sessionImportServiceInstance;
}
