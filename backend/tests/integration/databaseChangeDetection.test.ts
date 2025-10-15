/**
 * Integration tests for DatabaseChangeDetectionService
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseChangeDetectionService } from '../../src/services/DatabaseChangeDetectionService';
import path from 'path';
import fs from 'fs';

describe('DatabaseChangeDetectionService - Integration', () => {
  let db: Database.Database;
  let service: DatabaseChangeDetectionService;
  const testCampaignId = 'test-campaign-123';

  beforeEach(() => {
    // Create in-memory database
    db = new Database(':memory:');

    // Run migrations to set up schema
    const migrationsDir = path.join(__dirname, '../../src/db/migrations');

    // Run 014-category-tables migration
    const migration014 = fs.readFileSync(
      path.join(migrationsDir, '014-category-tables.sql'),
      'utf8'
    );
    db.exec(migration014);

    // Create test campaign
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

    service = new DatabaseChangeDetectionService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('captureSnapshot', () => {
    it('should capture empty snapshot for new campaign', () => {
      const snapshot = service.captureSnapshot(testCampaignId, 1);

      expect(snapshot.session_number).toBe(1);
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.entities.npcs).toEqual([]);
      expect(snapshot.entities.locations).toEqual([]);
      expect(snapshot.entities.factions).toEqual([]);
    });

    it('should capture existing entities', () => {
      // Add some entities
      const npcId = 'npc-001';
      const locationId = 'loc-001';

      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(npcId, testCampaignId, 'Elara the Wise', 1000000, 1000000);

      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(locationId, testCampaignId, 'Waterdeep', 1000100, 1000100);

      const snapshot = service.captureSnapshot(testCampaignId, 1);

      expect(snapshot.entities.npcs).toHaveLength(1);
      expect(snapshot.entities.npcs[0]).toMatchObject({
        id: npcId,
        name: 'Elara the Wise',
        created_at: 1000000,
        updated_at: 1000000
      });

      expect(snapshot.entities.locations).toHaveLength(1);
      expect(snapshot.entities.locations[0]).toMatchObject({
        id: locationId,
        name: 'Waterdeep',
        created_at: 1000100,
        updated_at: 1000100
      });
    });
  });

  describe('detectChanges', () => {
    it('should detect new entities as additions', () => {
      // Capture initial empty snapshot
      const snapshot1 = service.captureSnapshot(testCampaignId, 1);

      // Add new entities
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('npc-001', testCampaignId, 'Elara', 1000000, 1000000);

      db.prepare(`
        INSERT INTO factions (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('faction-001', testCampaignId, 'Harpers', 1000100, 1000100);

      // Capture second snapshot
      const snapshot2 = service.captureSnapshot(testCampaignId, 2);

      // Detect changes
      const changes = service.detectChanges(snapshot1, snapshot2);

      expect(changes.additions).toHaveLength(2);
      expect(changes.modifications).toHaveLength(0);

      const npcChange = changes.additions.find(c => c.entity_type === 'npcs');
      expect(npcChange).toMatchObject({
        entity_type: 'npcs',
        entity_id: 'npc-001',
        entity_name: 'Elara',
        change_type: 'addition',
        memory_system: 'political-web-memory'
      });

      const factionChange = changes.additions.find(c => c.entity_type === 'factions');
      expect(factionChange).toMatchObject({
        entity_type: 'factions',
        entity_id: 'faction-001',
        entity_name: 'Harpers',
        change_type: 'addition',
        memory_system: 'political-web-memory'
      });
    });

    it('should detect modified entities', () => {
      // Add initial entity
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('npc-001', testCampaignId, 'Elara', 1000000, 1000000);

      // Capture snapshot 1
      const snapshot1 = service.captureSnapshot(testCampaignId, 1);

      // Modify entity
      db.prepare(`
        UPDATE npcs SET updated_at = ? WHERE id = ?
      `).run(1000100, 'npc-001');

      // Capture snapshot 2
      const snapshot2 = service.captureSnapshot(testCampaignId, 2);

      // Detect changes
      const changes = service.detectChanges(snapshot1, snapshot2);

      expect(changes.additions).toHaveLength(0);
      expect(changes.modifications).toHaveLength(1);
      expect(changes.modifications[0]).toMatchObject({
        entity_type: 'npcs',
        entity_id: 'npc-001',
        entity_name: 'Elara',
        change_type: 'modification',
        memory_system: 'political-web-memory'
      });
    });

    it('should handle null previous snapshot', () => {
      // Add entities
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('npc-001', testCampaignId, 'Elara', 1000000, 1000000);

      const currentSnapshot = service.captureSnapshot(testCampaignId, 1);

      // Detect changes with no previous snapshot
      const changes = service.detectChanges(null, currentSnapshot);

      // Should return empty (fresh start, not tracked as changes)
      expect(changes.additions).toHaveLength(0);
      expect(changes.modifications).toHaveLength(0);
    });

    it('should detect changes across multiple category types', () => {
      const snapshot1 = service.captureSnapshot(testCampaignId, 1);

      // Add entities across different tables
      db.prepare(`INSERT INTO npcs (id, campaign_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(
        'npc-001', testCampaignId, 'Elara', 1000000, 1000000
      );
      db.prepare(`INSERT INTO locations (id, campaign_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(
        'loc-001', testCampaignId, 'Waterdeep', 1000100, 1000100
      );
      db.prepare(`INSERT INTO quests (id, campaign_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(
        'quest-001', testCampaignId, 'Save the Village', 1000200, 1000200
      );

      const snapshot2 = service.captureSnapshot(testCampaignId, 2);
      const changes = service.detectChanges(snapshot1, snapshot2);

      expect(changes.additions).toHaveLength(3);

      const memorySystemsAffected = new Set(changes.additions.map(c => c.memory_system));
      expect(memorySystemsAffected).toContain('political-web-memory'); // NPC
      expect(memorySystemsAffected).toContain('geographic-memory'); // Location
      expect(memorySystemsAffected).toContain('campaign-story-memory'); // Quest
    });
  });

  describe('detectChangesSinceTimestamp', () => {
    it('should detect additions since timestamp', () => {
      const baseTime = 1000000;

      // Add entity at base time
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('npc-001', testCampaignId, 'Elara', baseTime, baseTime);

      // Add entity after base time
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('npc-002', testCampaignId, 'Thorin', baseTime + 100, baseTime + 100);

      // Detect changes since base time
      const changes = service.detectChangesSinceTimestamp(testCampaignId, baseTime, 2);

      expect(changes.additions).toHaveLength(1);
      expect(changes.additions[0].entity_id).toBe('npc-002');
      expect(changes.additions[0].entity_name).toBe('Thorin');
    });

    it('should detect modifications since timestamp', () => {
      const baseTime = 1000000;

      // Add entity
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('npc-001', testCampaignId, 'Elara', baseTime - 100, baseTime - 100);

      // Update entity after base time
      db.prepare(`
        UPDATE npcs SET updated_at = ? WHERE id = ?
      `).run(baseTime + 100, 'npc-001');

      // Detect changes since base time
      const changes = service.detectChangesSinceTimestamp(testCampaignId, baseTime, 2);

      expect(changes.additions).toHaveLength(0);
      expect(changes.modifications).toHaveLength(1);
      expect(changes.modifications[0].entity_id).toBe('npc-001');
    });

    it('should not detect entities created and updated before timestamp', () => {
      const baseTime = 1000000;

      // Add entity before base time
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('npc-001', testCampaignId, 'Elara', baseTime - 200, baseTime - 100);

      // Detect changes since base time
      const changes = service.detectChangesSinceTimestamp(testCampaignId, baseTime, 2);

      expect(changes.additions).toHaveLength(0);
      expect(changes.modifications).toHaveLength(0);
    });
  });

  describe('formatChangesAsObservations', () => {
    it('should format changes as observation strings', () => {
      const snapshot1 = service.captureSnapshot(testCampaignId, 1);

      // Add entities
      db.prepare(`INSERT INTO npcs (id, campaign_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(
        'npc-001', testCampaignId, 'Elara', 1000000, 1000000
      );
      db.prepare(`INSERT INTO locations (id, campaign_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(
        'loc-001', testCampaignId, 'Waterdeep', 1000100, 1000100
      );

      const snapshot2 = service.captureSnapshot(testCampaignId, 2);
      const changes = service.detectChanges(snapshot1, snapshot2);
      const observations = service.formatChangesAsObservations(changes);

      expect(observations).toHaveLength(2);
      expect(observations).toContain('Added NPC: Elara to political-web-memory');
      expect(observations).toContain('Added Location: Waterdeep to geographic-memory');
    });
  });

  describe('getChangeSummary', () => {
    it('should return "no changes" for empty changes', () => {
      const changes = { additions: [], modifications: [] };
      const summary = service.getChangeSummary(changes);
      expect(summary).toBe('No database changes detected');
    });

    it('should summarize additions only', () => {
      const changes = {
        additions: [
          { entity_type: 'npcs', entity_id: '1', entity_name: 'A', change_type: 'addition' as const, memory_system: 'political-web-memory', details: '' }
        ],
        modifications: []
      };
      const summary = service.getChangeSummary(changes);
      expect(summary).toBe('1 change: 1 addition');
    });

    it('should summarize modifications only', () => {
      const changes = {
        additions: [],
        modifications: [
          { entity_type: 'npcs', entity_id: '1', entity_name: 'A', change_type: 'modification' as const, memory_system: 'political-web-memory', details: '' },
          { entity_type: 'npcs', entity_id: '2', entity_name: 'B', change_type: 'modification' as const, memory_system: 'political-web-memory', details: '' }
        ]
      };
      const summary = service.getChangeSummary(changes);
      expect(summary).toBe('2 changes: 2 modifications');
    });

    it('should summarize both additions and modifications', () => {
      const changes = {
        additions: [
          { entity_type: 'npcs', entity_id: '1', entity_name: 'A', change_type: 'addition' as const, memory_system: 'political-web-memory', details: '' }
        ],
        modifications: [
          { entity_type: 'npcs', entity_id: '2', entity_name: 'B', change_type: 'modification' as const, memory_system: 'political-web-memory', details: '' }
        ]
      };
      const summary = service.getChangeSummary(changes);
      expect(summary).toBe('2 changes: 1 addition, 1 modification');
    });
  });
});
