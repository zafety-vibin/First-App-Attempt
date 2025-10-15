/**
 * ConfidenceDecayService Unit Tests
 * Feature: 006-create-the-knowledge
 * Tasks: T020-T022
 *
 * Unit tests for confidence decay calculation formula, reinforcement, and pinning logic.
 * Tests business logic in isolation without database dependencies.
 *
 * IMPORTANT: This test MUST FAIL until ConfidenceDecayService is implemented (TDD)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfidenceDecayService } from '../../src/services/ConfidenceDecayService';
import { GraphNode, KnowledgeGraph } from '../../src/models/KnowledgeGraph';

describe('ConfidenceDecayService', () => {
  let service: ConfidenceDecayService;
  const mockGraph: KnowledgeGraph = {
    id: 'test-graph',
    campaign_id: 'campaign-123',
    graph_type: 'Political-Web',
    graph_name: 'Test Political Web',
    toggle_state: true,
    decay_rate: 0.1,
    maintenance_rules: null,
    created_at: 1735689600, // 2025-01-01 00:00:00
    updated_at: 1735689600,
    current_version_id: null,
    backup_version_id: null,
  };

  beforeEach(() => {
    // Mock Date.now() for consistent timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

    service = new ConfidenceDecayService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateConfidence() - T020', () => {
    it('should return confidence 1.0 for newly created entity (0 weeks elapsed)', () => {
      const now = Math.floor(Date.now() / 1000);
      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Test NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: now,
        last_accessed: now,
        pinned: false,
      };

      const result = service.calculateConfidence(node, mockGraph.decay_rate);

      expect(result.confidence).toBe(1.0);
      expect(result.weeks_elapsed).toBe(0);
      expect(result.level).toBe('high');
    });

    it('should decay correctly for 5 weeks at decay_rate=0.1 (Political-Web)', () => {
      const now = Math.floor(Date.now() / 1000);
      const fiveWeeksAgo = now - (5 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Old NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: fiveWeeksAgo,
        last_accessed: fiveWeeksAgo,
        pinned: false,
      };

      const result = service.calculateConfidence(node, 0.1);

      // Formula: confidence = 1.0 * (1 - 0.1 * 5) = 0.5
      expect(result.confidence).toBeCloseTo(0.5, 2);
      expect(result.weeks_elapsed).toBeCloseTo(5, 1);
      expect(result.level).toBe('medium');
    });

    it('should decay to 0.0 after 10 weeks at decay_rate=0.1 (Political-Web)', () => {
      const now = Math.floor(Date.now() / 1000);
      const tenWeeksAgo = now - (10 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Very Old NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: tenWeeksAgo,
        last_accessed: tenWeeksAgo,
        pinned: false,
      };

      const result = service.calculateConfidence(node, 0.1);

      // Formula: confidence = 1.0 * (1 - 0.1 * 10) = 0.0
      expect(result.confidence).toBe(0.0);
      expect(result.weeks_elapsed).toBeCloseTo(10, 1);
      expect(result.level).toBe('low');
    });

    it('should decay fast for Campaign-Story graph (decay_rate=0.2)', () => {
      const now = Math.floor(Date.now() / 1000);
      const fiveWeeksAgo = now - (5 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'Event',
        name: 'Old Story Event',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: fiveWeeksAgo,
        last_accessed: fiveWeeksAgo,
        pinned: false,
      };

      const result = service.calculateConfidence(node, 0.2);

      // Formula: confidence = 1.0 * (1 - 0.2 * 5) = 0.0
      expect(result.confidence).toBe(0.0);
      expect(result.weeks_elapsed).toBeCloseTo(5, 1);
      expect(result.level).toBe('low');
    });

    it('should never decay for World-Foundations graph (decay_rate=0.0)', () => {
      const now = Math.floor(Date.now() / 1000);
      const hundredWeeksAgo = now - (100 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'Rule',
        name: 'Core Magic Rule',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: hundredWeeksAgo,
        last_accessed: hundredWeeksAgo,
        pinned: false,
      };

      const result = service.calculateConfidence(node, 0.0);

      // Formula: confidence = 1.0 * (1 - 0.0 * 100) = 1.0
      expect(result.confidence).toBe(1.0);
      expect(result.weeks_elapsed).toBeCloseTo(100, 1);
      expect(result.level).toBe('high');
    });

    it('should clamp negative confidence to 0.0', () => {
      const now = Math.floor(Date.now() / 1000);
      const twentyWeeksAgo = now - (20 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Ancient NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: twentyWeeksAgo,
        last_accessed: twentyWeeksAgo,
        pinned: false,
      };

      const result = service.calculateConfidence(node, 0.1);

      // Formula would give: 1.0 * (1 - 0.1 * 20) = -1.0, but should clamp to 0.0
      expect(result.confidence).toBe(0.0);
      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
    });

    it('should clamp confidence above 1.0 to 1.0', () => {
      const now = Math.floor(Date.now() / 1000);
      // Create a node accessed in the "future" (edge case)
      const futureTime = now + (5 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Future NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: now,
        last_accessed: futureTime,
        pinned: false,
      };

      const result = service.calculateConfidence(node, 0.1);

      // Should clamp to 1.0 even if formula gives higher value
      expect(result.confidence).toBe(1.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should classify confidence levels correctly', () => {
      const now = Math.floor(Date.now() / 1000);

      const createNode = (weeksAgo: number): GraphNode => ({
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Test NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: now - (weeksAgo * 7 * 24 * 60 * 60),
        last_accessed: now - (weeksAgo * 7 * 24 * 60 * 60),
        pinned: false,
      });

      // High: 0.7-1.0
      const highNode = createNode(2); // confidence = 1.0 * (1 - 0.1 * 2) = 0.8
      const highResult = service.calculateConfidence(highNode, 0.1);
      expect(highResult.level).toBe('high');
      expect(highResult.confidence).toBeGreaterThanOrEqual(0.7);

      // Medium: 0.4-0.7
      const mediumNode = createNode(5); // confidence = 1.0 * (1 - 0.1 * 5) = 0.5
      const mediumResult = service.calculateConfidence(mediumNode, 0.1);
      expect(mediumResult.level).toBe('medium');
      expect(mediumResult.confidence).toBeGreaterThanOrEqual(0.4);
      expect(mediumResult.confidence).toBeLessThan(0.7);

      // Low: 0.0-0.4
      const lowNode = createNode(8); // confidence = 1.0 * (1 - 0.1 * 8) = 0.2
      const lowResult = service.calculateConfidence(lowNode, 0.1);
      expect(lowResult.level).toBe('low');
      expect(lowResult.confidence).toBeLessThan(0.4);
    });
  });

  describe('reinforceEntity() - T021', () => {
    it('should update last_accessed to current timestamp on reinforcement', async () => {
      const now = Math.floor(Date.now() / 1000);
      const fiveWeeksAgo = now - (5 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Decayed NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: fiveWeeksAgo,
        last_accessed: fiveWeeksAgo,
        pinned: false,
      };

      // Check confidence before reinforcement
      const beforeResult = service.calculateConfidence(node, 0.1);
      expect(beforeResult.confidence).toBeCloseTo(0.5, 2);

      // Reinforce the entity (in real implementation, this would update DB)
      const reinforced = await service.reinforceEntity(node);

      expect(reinforced.last_accessed).toBe(now);
      expect(reinforced.last_accessed).toBeGreaterThan(fiveWeeksAgo);
    });

    it('should recalculate confidence to 1.0 after reinforcement', async () => {
      const now = Math.floor(Date.now() / 1000);
      const fiveWeeksAgo = now - (5 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Decayed NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: fiveWeeksAgo,
        last_accessed: fiveWeeksAgo,
        pinned: false,
      };

      // Confidence before: 0.5
      const beforeResult = service.calculateConfidence(node, 0.1);
      expect(beforeResult.confidence).toBeCloseTo(0.5, 2);

      // Reinforce
      const reinforced = await service.reinforceEntity(node);

      // Confidence after: 1.0 (last_accessed = now, weeks_elapsed = 0)
      const afterResult = service.calculateConfidence(reinforced, 0.1);
      expect(afterResult.confidence).toBe(1.0);
      expect(afterResult.weeks_elapsed).toBe(0);
    });

    it('should not exceed confidence 1.0 after multiple reinforcements', async () => {
      const now = Math.floor(Date.now() / 1000);

      let node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Test NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: now,
        last_accessed: now,
        pinned: false,
      };

      // Reinforce 3 times
      node = await service.reinforceEntity(node);
      node = await service.reinforceEntity(node);
      node = await service.reinforceEntity(node);

      const result = service.calculateConfidence(node, 0.1);
      expect(result.confidence).toBe(1.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should work on pinned entities (redundant but safe)', async () => {
      const now = Math.floor(Date.now() / 1000);
      const fiveWeeksAgo = now - (5 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Pinned NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: fiveWeeksAgo,
        last_accessed: fiveWeeksAgo,
        pinned: true, // Already pinned
      };

      // Pinned node always has confidence 1.0
      const beforeResult = service.calculateConfidence(node, 0.1);
      expect(beforeResult.confidence).toBe(1.0);

      // Reinforce anyway
      const reinforced = await service.reinforceEntity(node);

      // Still confidence 1.0
      const afterResult = service.calculateConfidence(reinforced, 0.1);
      expect(afterResult.confidence).toBe(1.0);
      expect(reinforced.last_accessed).toBe(now);
    });

    it('should support custom reinforcement amount (configurable boost)', async () => {
      const now = Math.floor(Date.now() / 1000);
      const fiveWeeksAgo = now - (5 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Test NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: fiveWeeksAgo,
        last_accessed: fiveWeeksAgo,
        pinned: false,
      };

      // Default reinforcement (full reset to 1.0)
      const reinforced = await service.reinforceEntity(node, 1.0);
      const result = service.calculateConfidence(reinforced, 0.1);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('pinEntity() - T022', () => {
    it('should set pinned flag to true when pinning entity', async () => {
      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Important NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: Math.floor(Date.now() / 1000),
        last_accessed: Math.floor(Date.now() / 1000),
        pinned: false,
      };

      const pinned = await service.pinEntity(node, true);

      expect(pinned.pinned).toBe(true);
    });

    it('should set pinned flag to false when unpinning entity', async () => {
      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Important NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: Math.floor(Date.now() / 1000),
        last_accessed: Math.floor(Date.now() / 1000),
        pinned: true,
      };

      const unpinned = await service.pinEntity(node, false);

      expect(unpinned.pinned).toBe(false);
    });

    it('should return confidence 1.0 for pinned entity regardless of decay', () => {
      const now = Math.floor(Date.now() / 1000);
      const tenWeeksAgo = now - (10 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'BBEG',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: tenWeeksAgo,
        last_accessed: tenWeeksAgo,
        pinned: true,
      };

      const result = service.calculateConfidence(node, 0.1);

      // Even though 10 weeks elapsed would give confidence 0.0,
      // pinned entities always return 1.0
      expect(result.confidence).toBe(1.0);
      expect(result.level).toBe('high');
    });

    it('should decay normally after unpinning', async () => {
      const now = Math.floor(Date.now() / 1000);
      const fiveWeeksAgo = now - (5 * 7 * 24 * 60 * 60);

      let node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Former BBEG',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: fiveWeeksAgo,
        last_accessed: fiveWeeksAgo,
        pinned: true,
      };

      // While pinned: confidence = 1.0
      const pinnedResult = service.calculateConfidence(node, 0.1);
      expect(pinnedResult.confidence).toBe(1.0);

      // Unpin
      node = await service.pinEntity(node, false);

      // After unpinning: decay applies
      const unpinnedResult = service.calculateConfidence(node, 0.1);
      expect(unpinnedResult.confidence).toBeCloseTo(0.5, 2);
    });

    it('should be idempotent (pin → pin → pin remains pinned)', async () => {
      let node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Test NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: Math.floor(Date.now() / 1000),
        last_accessed: Math.floor(Date.now() / 1000),
        pinned: false,
      };

      // Pin 3 times
      node = await service.pinEntity(node, true);
      node = await service.pinEntity(node, true);
      node = await service.pinEntity(node, true);

      expect(node.pinned).toBe(true);

      // Unpin 3 times
      node = await service.pinEntity(node, false);
      node = await service.pinEntity(node, false);
      node = await service.pinEntity(node, false);

      expect(node.pinned).toBe(false);
    });

    it('should not trigger automatic reinforcement when pinning', async () => {
      const now = Math.floor(Date.now() / 1000);
      const fiveWeeksAgo = now - (5 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Test NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: fiveWeeksAgo,
        last_accessed: fiveWeeksAgo,
        pinned: false,
      };

      const pinned = await service.pinEntity(node, true);

      // last_accessed should NOT change (pinning is not reinforcement)
      expect(pinned.last_accessed).toBe(fiveWeeksAgo);
      expect(pinned.pinned).toBe(true);

      // Confidence is 1.0 because of pin, not because of reinforcement
      const result = service.calculateConfidence(pinned, 0.1);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('Confidence Level Classification', () => {
    it('should classify high confidence (0.7-1.0)', () => {
      const now = Math.floor(Date.now() / 1000);
      const twoWeeksAgo = now - (2 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Recent NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: twoWeeksAgo,
        last_accessed: twoWeeksAgo,
        pinned: false,
      };

      const result = service.calculateConfidence(node, 0.1);

      // confidence = 1.0 * (1 - 0.1 * 2) = 0.8
      expect(result.confidence).toBeCloseTo(0.8, 2);
      expect(result.level).toBe('high');
    });

    it('should classify medium confidence (0.4-0.7)', () => {
      const now = Math.floor(Date.now() / 1000);
      const fiveWeeksAgo = now - (5 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Medium Age NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: fiveWeeksAgo,
        last_accessed: fiveWeeksAgo,
        pinned: false,
      };

      const result = service.calculateConfidence(node, 0.1);

      // confidence = 1.0 * (1 - 0.1 * 5) = 0.5
      expect(result.confidence).toBeCloseTo(0.5, 2);
      expect(result.level).toBe('medium');
    });

    it('should classify low confidence (0.0-0.4)', () => {
      const now = Math.floor(Date.now() / 1000);
      const eightWeeksAgo = now - (8 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Old NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: eightWeeksAgo,
        last_accessed: eightWeeksAgo,
        pinned: false,
      };

      const result = service.calculateConfidence(node, 0.1);

      // confidence = 1.0 * (1 - 0.1 * 8) = 0.2
      expect(result.confidence).toBeCloseTo(0.2, 2);
      expect(result.level).toBe('low');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero decay rate correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      const hundredWeeksAgo = now - (100 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'Rule',
        name: 'Permanent Rule',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: hundredWeeksAgo,
        last_accessed: hundredWeeksAgo,
        pinned: false,
      };

      const result = service.calculateConfidence(node, 0.0);

      expect(result.confidence).toBe(1.0);
    });

    it('should handle maximum decay rate (1.0)', () => {
      const now = Math.floor(Date.now() / 1000);
      const oneWeekAgo = now - (1 * 7 * 24 * 60 * 60);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'Event',
        name: 'Rapid Decay Event',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: oneWeekAgo,
        last_accessed: oneWeekAgo,
        pinned: false,
      };

      const result = service.calculateConfidence(node, 1.0);

      // confidence = 1.0 * (1 - 1.0 * 1) = 0.0
      expect(result.confidence).toBe(0.0);
    });

    it('should handle entity with no decay (created just now)', () => {
      const now = Math.floor(Date.now() / 1000);

      const node: GraphNode = {
        id: 'test-node',
        graph_id: 'test-graph',
        node_type: 'NPC',
        name: 'Brand New NPC',
        attributes: {},
        observations: null,
        information_level_id: null,
        created_at: now,
        last_accessed: now,
        pinned: false,
      };

      const result = service.calculateConfidence(node, 0.1);

      expect(result.confidence).toBe(1.0);
      expect(result.weeks_elapsed).toBe(0);
    });
  });
});
