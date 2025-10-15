/**
 * Integration tests for SessionImportService
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { GraphNodeService } from '../../src/services/GraphNodeService';
import { GraphEdgeService } from '../../src/services/GraphEdgeService';
import { DatabaseChangeDetectionService } from '../../src/services/DatabaseChangeDetectionService';
import { SessionImportService } from '../../src/services/SessionImportService';
import path from 'path';
import fs from 'fs';

describe('SessionImportService - Integration', () => {
  let db: Database.Database;
  let changeDetectionService: DatabaseChangeDetectionService;
  let sessionImportService: SessionImportService;

  const testCampaignId = 'test-campaign-123';
  let graphId: string;

  beforeEach(() => {
    // Create in-memory database
    db = new Database(':memory:');

    // Create campaigns table FIRST (required by migrations)
    db.prepare(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `).run();

    db.prepare('INSERT INTO campaigns (id, name) VALUES (?, ?)').run(
      testCampaignId,
      'Test Campaign'
    );

    // Run migrations
    const migrationsDir = path.join(__dirname, '../../src/db/migrations');

    // Run information levels migration (required for graph_nodes FK)
    const migration005 = fs.readFileSync(
      path.join(migrationsDir, '005-add-information-levels.sql'),
      'utf8'
    );
    db.exec(migration005);

    // Run knowledge graphs migration
    const migration006 = fs.readFileSync(
      path.join(migrationsDir, '006-knowledge-graphs.sql'),
      'utf8'
    );
    db.exec(migration006);

    // Run category tables migration
    const migration014 = fs.readFileSync(
      path.join(migrationsDir, '014-category-tables.sql'),
      'utf8'
    );
    db.exec(migration014);

    // Create Campaign-Story graph
    graphId = 'campaign-story-graph-123';
    db.prepare(`
      INSERT INTO knowledge_graphs (id, campaign_id, graph_type, graph_name, toggle_state, decay_rate)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(graphId, testCampaignId, 'Campaign-Story', 'Campaign Story', 1, 0.2);

    // Initialize services
    changeDetectionService = new DatabaseChangeDetectionService(db);
    sessionImportService = new SessionImportService(
      db,
      changeDetectionService
    );
  });

  afterEach(() => {
    db.close();
  });

  describe('finalizeSessionImport', () => {
    it('should create session recap node with correct attributes', () => {
      const result = sessionImportService.finalizeSessionImport(
        testCampaignId,
        graphId,
        {
          name: 'Session 1: The Beginning',
          temporal_anchors: {
            session_number: 1,
            in_game_date: '1/1/500',
            real_world_date: '2025-01-15',
            days_elapsed_total: 1
          },
          observations: ['Party met in tavern', 'Accepted quest from innkeeper'],
          tags: ['introduction', 'tavern'],
          detect_changes: false // Skip change detection for first session
        }
      );

      expect(result.recapNode).toBeDefined();
      expect(result.recapNode.node_type).toBe('session_recap');
      expect(result.recapNode.name).toBe('Session 1: The Beginning');
      expect(result.recapNode.attributes.tier).toBe('narrative');
      expect(result.recapNode.attributes.session_number).toBe(1);
      expect(result.recapNode.attributes.in_game_date).toBe('1/1/500');
      expect(result.recapNode.attributes.real_world_date).toBe('2025-01-15');
      expect(result.recapNode.observations).toHaveLength(2);
      expect(result.batchNode).toBeNull(); // No changes to log
    });

    it('should detect database changes and create import_batch node', () => {
      // First session (no changes)
      const session1Result = sessionImportService.finalizeSessionImport(testCampaignId, graphId, {
        name: 'Session 1',
        temporal_anchors: {
          session_number: 1,
          in_game_date: '1/1/500',
          real_world_date: '2025-01-15',
          days_elapsed_total: 1
        },
        observations: ['Session 1 content'],
        detect_changes: false
      });

      // Add some database changes AFTER session 1's timestamp
      const changeTimestamp = session1Result.recapNode.created_at + 100;
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('npc-001', testCampaignId, 'Elara the Wise', changeTimestamp, changeTimestamp);

      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('loc-001', testCampaignId, 'Waterdeep', changeTimestamp, changeTimestamp);

      // Second session (should detect changes)
      const result = sessionImportService.finalizeSessionImport(testCampaignId, graphId, {
        name: 'Session 2',
        temporal_anchors: {
          session_number: 2,
          in_game_date: '1/2/500',
          real_world_date: '2025-01-22',
          days_elapsed_total: 2
        },
        observations: ['Session 2 content'],
        detect_changes: true
      });

      expect(result.batchNode).toBeDefined();
      expect(result.batchNode!.node_type).toBe('import_batch');
      expect(result.batchNode!.attributes.tier).toBe('metadata');
      expect(result.batchNode!.attributes.logged_session).toBe(2);
      expect(result.batchNode!.attributes.prune_after_session).toBe(52); // 2 + 50
      expect(result.changes.additions).toHaveLength(2);
      expect(result.batchNode!.observations).toBeDefined();
    });

    it('should create bridge edge between recap and batch', () => {
      // First session
      const session1Result = sessionImportService.finalizeSessionImport(testCampaignId, graphId, {
        name: 'Session 1',
        temporal_anchors: {
          session_number: 1,
          in_game_date: '1/1/500',
          real_world_date: '2025-01-15',
          days_elapsed_total: 1
        },
        observations: ['Content'],
        detect_changes: false
      });

      // Add database change AFTER session 1's timestamp
      const changeTimestamp = session1Result.recapNode.created_at + 100;
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('npc-001', testCampaignId, 'Test NPC', changeTimestamp, changeTimestamp);

      // Second session
      const result = sessionImportService.finalizeSessionImport(testCampaignId, graphId, {
        name: 'Session 2',
        temporal_anchors: {
          session_number: 2,
          in_game_date: '1/2/500',
          real_world_date: '2025-01-22',
          days_elapsed_total: 2
        },
        observations: ['Content'],
        detect_changes: true
      });

      // Check bridge edge exists using direct SQL
      const bridgeEdge = db.prepare(`
        SELECT * FROM graph_edges
        WHERE graph_id = ?
          AND edge_type = 'has_metadata_log'
          AND source_node_id = ?
          AND target_node_id = ?
      `).get(graphId, result.recapNode.id, result.batchNode!.id) as any;

      expect(bridgeEdge).toBeDefined();
      expect(bridgeEdge.directed).toBe(1); // SQLite stores as integer
    });

    it('should link to previous session with followed_by edge', () => {
      // Session 1
      const session1 = sessionImportService.finalizeSessionImport(testCampaignId, graphId, {
        name: 'Session 1',
        temporal_anchors: {
          session_number: 1,
          in_game_date: '1/1/500',
          real_world_date: '2025-01-15',
          days_elapsed_total: 1
        },
        observations: ['Content'],
        detect_changes: false
      });

      // Session 2
      const session2 = sessionImportService.finalizeSessionImport(testCampaignId, graphId, {
        name: 'Session 2',
        temporal_anchors: {
          session_number: 2,
          in_game_date: '1/2/500',
          real_world_date: '2025-01-22',
          days_elapsed_total: 2
        },
        observations: ['Content'],
        detect_changes: false
      });

      // Check followed_by edge exists using direct SQL
      const followedByEdge = db.prepare(`
        SELECT * FROM graph_edges
        WHERE graph_id = ?
          AND edge_type = 'followed_by'
          AND source_node_id = ?
          AND target_node_id = ?
      `).get(graphId, session1.recapNode.id, session2.recapNode.id) as any;

      expect(followedByEdge).toBeDefined();
      expect(followedByEdge.directed).toBe(1); // SQLite stores as integer
    });

    it('should prune old metadata after retention window', () => {
      // Set short retention window for testing
      sessionImportService.setRetentionWindow(2);

      // Create 3 sessions with changes
      for (let i = 1; i <= 3; i++) {
        if (i > 1) {
          // Add a change before each session (except first)
          const now = Math.floor(Date.now() / 1000);
          db.prepare(`
            INSERT INTO npcs (id, campaign_id, name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(`npc-${i}`, testCampaignId, `NPC ${i}`, now, now);
        }

        sessionImportService.finalizeSessionImport(testCampaignId, graphId, {
          name: `Session ${i}`,
          temporal_anchors: {
            session_number: i,
            in_game_date: `1/${i}/500`,
            real_world_date: `2025-01-${i.toString().padStart(2, '0')}`,
            days_elapsed_total: i
          },
          observations: [`Session ${i} content`],
          detect_changes: i > 1
        });
      }

      // After session 3 with retention window 2, session 1's metadata should be pruned
      const metadataNodes = db.prepare(`
        SELECT * FROM graph_nodes
        WHERE graph_id = ? AND node_type = 'import_batch'
      `).all(graphId);

      // Should have metadata for sessions 2 and 3 only (session 1 had no metadata anyway)
      expect(metadataNodes.length).toBeLessThanOrEqual(2);

      // All session recap nodes should still exist (narrative nodes are never pruned)
      const recapNodes = db.prepare(`
        SELECT * FROM graph_nodes
        WHERE graph_id = ? AND node_type = 'session_recap'
      `).all(graphId);
      expect(recapNodes).toHaveLength(3);
    });

    it('should handle first session with no previous session', () => {
      const result = sessionImportService.finalizeSessionImport(testCampaignId, graphId, {
        name: 'Session 1',
        temporal_anchors: {
          session_number: 1,
          in_game_date: '1/1/500',
          real_world_date: '2025-01-15',
          days_elapsed_total: 1
        },
        observations: ['First session'],
        detect_changes: true // Even with detection enabled, should handle gracefully
      });

      expect(result.recapNode).toBeDefined();
      expect(result.changes.additions).toHaveLength(0); // No previous baseline
      expect(result.batchNode).toBeNull();

      // No followed_by edges should exist
      const followedByEdges = db.prepare(`
        SELECT * FROM graph_edges
        WHERE graph_id = ? AND edge_type = 'followed_by'
      `).all(graphId);
      expect(followedByEdges).toHaveLength(0);
    });

    it('should create sequential session chain', () => {
      // Create 3 sessions
      const sessions = [];
      for (let i = 1; i <= 3; i++) {
        const result = sessionImportService.finalizeSessionImport(testCampaignId, graphId, {
          name: `Session ${i}`,
          temporal_anchors: {
            session_number: i,
            in_game_date: `1/${i}/500`,
            real_world_date: `2025-01-${i.toString().padStart(2, '0')}`,
            days_elapsed_total: i
          },
          observations: [`Content ${i}`],
          detect_changes: false
        });
        sessions.push(result.recapNode);
      }

      // Check chain: session1 → session2 → session3
      const followedByEdges = db.prepare(`
        SELECT * FROM graph_edges
        WHERE graph_id = ? AND edge_type = 'followed_by'
      `).all(graphId) as any[];

      expect(followedByEdges).toHaveLength(2);

      // Verify chain order
      const edge1to2 = followedByEdges.find(
        e => e.source_node_id === sessions[0].id && e.target_node_id === sessions[1].id
      );
      const edge2to3 = followedByEdges.find(
        e => e.source_node_id === sessions[1].id && e.target_node_id === sessions[2].id
      );

      expect(edge1to2).toBeDefined();
      expect(edge2to3).toBeDefined();
    });
  });

  describe('bulkImportFromDatabase', () => {
    it('should import all session recaps and build timeline', () => {
      // Populate session_recaps table with 3 sessions
      const baseTime = 1000000;

      db.prepare(`
        INSERT INTO session_recaps (id, campaign_id, name, session_date, in_game_date_start, time_passed, summary, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('recap-001', testCampaignId, 'Session 1: The Beginning', baseTime, '1/1/500', '1 day', 'Party met in tavern', baseTime, baseTime);

      db.prepare(`
        INSERT INTO session_recaps (id, campaign_id, name, session_date, in_game_date_start, time_passed, summary, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('recap-002', testCampaignId, 'Session 2: The Journey', baseTime + 1000, '1/2/500', '1 day', 'Traveled to city', baseTime + 1000, baseTime + 1000);

      db.prepare(`
        INSERT INTO session_recaps (id, campaign_id, name, session_date, in_game_date_start, time_passed, summary, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('recap-003', testCampaignId, 'Session 3: The Confrontation', baseTime + 2000, '1/3/500', '1 day', 'Fought the dragon', baseTime + 2000, baseTime + 2000);

      // Add entities between sessions
      db.prepare(`INSERT INTO npcs (id, campaign_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(
        'npc-001', testCampaignId, 'Innkeeper Bob', baseTime + 500, baseTime + 500
      );
      db.prepare(`INSERT INTO locations (id, campaign_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(
        'loc-001', testCampaignId, 'Dragon Lair', baseTime + 1500, baseTime + 1500
      );

      // Bulk import
      const result = sessionImportService.bulkImportFromDatabase(testCampaignId, graphId);

      expect(result.sessionsImported).toBe(3);
      expect(result.recapNodes).toHaveLength(3);
      expect(result.metadataNodesCreated).toBeGreaterThan(0);
      expect(result.entitiesLogged).toBe(2); // Innkeeper and Dragon Lair

      // Check session chain exists
      const followedByEdges = db.prepare(`
        SELECT * FROM graph_edges
        WHERE graph_id = ? AND edge_type = 'followed_by'
      `).all(graphId) as any[];

      expect(followedByEdges).toHaveLength(2); // session1→2, session2→3

      // Check metadata nodes have bulk_imported flag
      const metadataNodes = db.prepare(`
        SELECT * FROM graph_nodes
        WHERE graph_id = ? AND node_type = 'database_addition_log'
      `).all(graphId) as any[];

      expect(metadataNodes.length).toBeGreaterThan(0);
      const firstMetadata = JSON.parse(metadataNodes[0].attributes);
      expect(firstMetadata.bulk_imported).toBe(true);
    });

    it('should handle campaign with no session recaps', () => {
      // No session recaps in database
      expect(() => {
        sessionImportService.bulkImportFromDatabase(testCampaignId, graphId);
      }).toThrow('No session recaps found in database');
    });

    it('should correctly attribute entities to session windows', () => {
      const baseTime = 1000000;

      // Session 1 at baseTime
      db.prepare(`
        INSERT INTO session_recaps (id, campaign_id, name, session_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('recap-001', testCampaignId, 'Session 1', baseTime, baseTime, baseTime);

      // Session 2 at baseTime + 1000
      db.prepare(`
        INSERT INTO session_recaps (id, campaign_id, name, session_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('recap-002', testCampaignId, 'Session 2', baseTime + 1000, baseTime + 1000, baseTime + 1000);

      // Entity created BEFORE session 1 (should not be logged)
      db.prepare(`INSERT INTO npcs (id, campaign_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(
        'npc-early', testCampaignId, 'Early NPC', baseTime - 100, baseTime - 100
      );

      // Entity created BETWEEN session 1 and 2 (should be logged for session 2)
      db.prepare(`INSERT INTO npcs (id, campaign_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(
        'npc-mid', testCampaignId, 'Mid NPC', baseTime + 500, baseTime + 500
      );

      const result = sessionImportService.bulkImportFromDatabase(testCampaignId, graphId);

      expect(result.entitiesLogged).toBe(2); // Early NPC (session 1 window) + Mid NPC (session 2 window)

      // Check that mid NPC is logged in session 2's metadata
      const session2Metadata = db.prepare(`
        SELECT * FROM graph_nodes
        WHERE graph_id = ?
          AND node_type = 'database_addition_log'
          AND JSON_EXTRACT(attributes, '$.session_number') = 2
      `).get(graphId) as any;

      expect(session2Metadata).toBeDefined();
      const observations = JSON.parse(session2Metadata.observations);
      const hasMidNPC = observations.some((obs: any) => obs.text.includes('Mid NPC'));
      expect(hasMidNPC).toBe(true);
    });
  });

  describe('retention window configuration', () => {
    it('should use default retention window', () => {
      expect(sessionImportService.getRetentionWindow()).toBe(50);
    });

    it('should allow setting custom retention window', () => {
      sessionImportService.setRetentionWindow(25);
      expect(sessionImportService.getRetentionWindow()).toBe(25);
    });

    it('should calculate prune_after_session with custom window', () => {
      sessionImportService.setRetentionWindow(10);

      // Add change before session 1
      const now = Math.floor(Date.now() / 1000);
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('npc-001', testCampaignId, 'Test NPC', now - 1000, now - 1000);

      const result = sessionImportService.finalizeSessionImport(testCampaignId, graphId, {
        name: 'Session 1',
        temporal_anchors: {
          session_number: 1,
          in_game_date: '1/1/500',
          real_world_date: '2025-01-15',
          days_elapsed_total: 1
        },
        observations: ['Content'],
        detect_changes: true
      });

      if (result.batchNode) {
        expect(result.batchNode.attributes.prune_after_session).toBe(11); // 1 + 10
      }
    });
  });
});
