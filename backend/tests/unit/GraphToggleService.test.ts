/**
 * GraphToggleService Unit Tests
 * Feature: 006-create-the-knowledge
 * Task: T023
 *
 * Unit tests for graph toggle state management.
 * Tests toggle on/off logic and AI context filtering.
 *
 * IMPORTANT: This test MUST FAIL until GraphToggleService is implemented (TDD)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphToggleService } from '../../src/services/GraphToggleService';
import { KnowledgeGraph } from '../../src/models/KnowledgeGraph';

describe('GraphToggleService', () => {
  let service: GraphToggleService;

  const createMockGraph = (id: string, name: string, toggleState: boolean): KnowledgeGraph => ({
    id,
    campaign_id: 'campaign-123',
    graph_type: 'Political-Web',
    graph_name: name,
    toggle_state: toggleState,
    decay_rate: 0.1,
    maintenance_rules: null,
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
    current_version_id: null,
    backup_version_id: null,
  });

  beforeEach(() => {
    service = new GraphToggleService();
  });

  describe('Toggle On/Off State Management', () => {
    it('should toggle graph ON (set toggle_state=true)', async () => {
      const graph = createMockGraph('graph-1', 'Test Graph', false);
      expect(graph.toggle_state).toBe(false);

      const toggled = await service.toggleGraph(graph, true);

      expect(toggled.toggle_state).toBe(true);
    });

    it('should toggle graph OFF (set toggle_state=false)', async () => {
      const graph = createMockGraph('graph-1', 'Test Graph', true);
      expect(graph.toggle_state).toBe(true);

      const toggled = await service.toggleGraph(graph, false);

      expect(toggled.toggle_state).toBe(false);
    });

    it('should be idempotent (ON → ON remains ON)', async () => {
      let graph = createMockGraph('graph-1', 'Test Graph', true);

      // Toggle ON multiple times
      graph = await service.toggleGraph(graph, true);
      graph = await service.toggleGraph(graph, true);
      graph = await service.toggleGraph(graph, true);

      expect(graph.toggle_state).toBe(true);
    });

    it('should be idempotent (OFF → OFF remains OFF)', async () => {
      let graph = createMockGraph('graph-1', 'Test Graph', false);

      // Toggle OFF multiple times
      graph = await service.toggleGraph(graph, false);
      graph = await service.toggleGraph(graph, false);
      graph = await service.toggleGraph(graph, false);

      expect(graph.toggle_state).toBe(false);
    });

    it('should toggle multiple times correctly', async () => {
      let graph = createMockGraph('graph-1', 'Test Graph', false);

      // OFF → ON
      graph = await service.toggleGraph(graph, true);
      expect(graph.toggle_state).toBe(true);

      // ON → OFF
      graph = await service.toggleGraph(graph, false);
      expect(graph.toggle_state).toBe(false);

      // OFF → ON
      graph = await service.toggleGraph(graph, true);
      expect(graph.toggle_state).toBe(true);

      // ON → OFF
      graph = await service.toggleGraph(graph, false);
      expect(graph.toggle_state).toBe(false);
    });
  });

  describe('getActiveGraphs() - AI Context Filtering', () => {
    it('should return only graphs with toggle_state=true', async () => {
      const graphs: KnowledgeGraph[] = [
        createMockGraph('graph-1', 'Active Graph 1', true),
        createMockGraph('graph-2', 'Inactive Graph', false),
        createMockGraph('graph-3', 'Active Graph 2', true),
        createMockGraph('graph-4', 'Inactive Graph 2', false),
      ];

      const activeGraphs = service.getActiveGraphs(graphs);

      expect(activeGraphs).toHaveLength(2);
      expect(activeGraphs[0].id).toBe('graph-1');
      expect(activeGraphs[1].id).toBe('graph-3');
      activeGraphs.forEach(graph => {
        expect(graph.toggle_state).toBe(true);
      });
    });

    it('should return empty array when all graphs are toggled off', () => {
      const graphs: KnowledgeGraph[] = [
        createMockGraph('graph-1', 'Inactive Graph 1', false),
        createMockGraph('graph-2', 'Inactive Graph 2', false),
        createMockGraph('graph-3', 'Inactive Graph 3', false),
      ];

      const activeGraphs = service.getActiveGraphs(graphs);

      expect(activeGraphs).toHaveLength(0);
    });

    it('should return all graphs when all are toggled on', () => {
      const graphs: KnowledgeGraph[] = [
        createMockGraph('graph-1', 'Active Graph 1', true),
        createMockGraph('graph-2', 'Active Graph 2', true),
        createMockGraph('graph-3', 'Active Graph 3', true),
      ];

      const activeGraphs = service.getActiveGraphs(graphs);

      expect(activeGraphs).toHaveLength(3);
      expect(activeGraphs).toEqual(graphs);
    });

    it('should handle empty graph list', () => {
      const graphs: KnowledgeGraph[] = [];

      const activeGraphs = service.getActiveGraphs(graphs);

      expect(activeGraphs).toHaveLength(0);
      expect(activeGraphs).toEqual([]);
    });
  });

  describe('AI Context Exclusion Logic', () => {
    it('should exclude toggled-off graphs from AI context', async () => {
      const graphs: KnowledgeGraph[] = [
        createMockGraph('graph-1', 'Political Web', true),
        createMockGraph('graph-2', 'Geographical', false), // Toggled off
        createMockGraph('graph-3', 'Campaign Story', true),
      ];

      const activeGraphs = service.getActiveGraphs(graphs);

      // AI should only query graph-1 and graph-3
      expect(activeGraphs).toHaveLength(2);
      expect(activeGraphs.find(g => g.id === 'graph-2')).toBeUndefined();
      expect(activeGraphs.find(g => g.id === 'graph-1')).toBeDefined();
      expect(activeGraphs.find(g => g.id === 'graph-3')).toBeDefined();
    });

    it('should include graph in AI context after toggling on', async () => {
      const graphs: KnowledgeGraph[] = [
        createMockGraph('graph-1', 'Political Web', true),
        createMockGraph('graph-2', 'Geographical', false),
      ];

      // Initially, graph-2 is excluded
      let activeGraphs = service.getActiveGraphs(graphs);
      expect(activeGraphs).toHaveLength(1);

      // Toggle graph-2 on
      graphs[1] = await service.toggleGraph(graphs[1], true);

      // Now graph-2 should be included
      activeGraphs = service.getActiveGraphs(graphs);
      expect(activeGraphs).toHaveLength(2);
      expect(activeGraphs.find(g => g.id === 'graph-2')).toBeDefined();
    });

    it('should exclude graph from AI context after toggling off', async () => {
      const graphs: KnowledgeGraph[] = [
        createMockGraph('graph-1', 'Political Web', true),
        createMockGraph('graph-2', 'Geographical', true),
      ];

      // Initially, both graphs are included
      let activeGraphs = service.getActiveGraphs(graphs);
      expect(activeGraphs).toHaveLength(2);

      // Toggle graph-2 off
      graphs[1] = await service.toggleGraph(graphs[1], false);

      // Now graph-2 should be excluded
      activeGraphs = service.getActiveGraphs(graphs);
      expect(activeGraphs).toHaveLength(1);
      expect(activeGraphs.find(g => g.id === 'graph-2')).toBeUndefined();
    });
  });

  describe('Toggle State Persistence', () => {
    it('should maintain toggle state across service calls', async () => {
      const graph = createMockGraph('graph-1', 'Test Graph', false);

      // Toggle on
      const toggledOn = await service.toggleGraph(graph, true);
      expect(toggledOn.toggle_state).toBe(true);

      // In real implementation, this would persist to database
      // Here we just verify the returned object has correct state
      expect(toggledOn.toggle_state).toBe(true);
    });

    it('should preserve other graph properties when toggling', async () => {
      const graph = createMockGraph('graph-1', 'Test Graph', false);
      const originalName = graph.graph_name;
      const originalDecayRate = graph.decay_rate;
      const originalCreatedAt = graph.created_at;

      const toggled = await service.toggleGraph(graph, true);

      // Only toggle_state should change
      expect(toggled.toggle_state).toBe(true);
      expect(toggled.graph_name).toBe(originalName);
      expect(toggled.decay_rate).toBe(originalDecayRate);
      expect(toggled.created_at).toBe(originalCreatedAt);
    });
  });

  describe('Multiple Graph Types', () => {
    it('should handle different graph types independently', async () => {
      const graphs: KnowledgeGraph[] = [
        {
          ...createMockGraph('graph-1', 'World Foundations', true),
          graph_type: 'World-Foundations',
        },
        {
          ...createMockGraph('graph-2', 'Political Web', false),
          graph_type: 'Political-Web',
        },
        {
          ...createMockGraph('graph-3', 'Geographical', true),
          graph_type: 'Geographical',
        },
        {
          ...createMockGraph('graph-4', 'Campaign Story', false),
          graph_type: 'Campaign-Story',
        },
      ];

      const activeGraphs = service.getActiveGraphs(graphs);

      expect(activeGraphs).toHaveLength(2);
      expect(activeGraphs.find(g => g.graph_type === 'World-Foundations')).toBeDefined();
      expect(activeGraphs.find(g => g.graph_type === 'Geographical')).toBeDefined();
      expect(activeGraphs.find(g => g.graph_type === 'Political-Web')).toBeUndefined();
      expect(activeGraphs.find(g => g.graph_type === 'Campaign-Story')).toBeUndefined();
    });

    it('should handle custom graph types', async () => {
      const graphs: KnowledgeGraph[] = [
        {
          ...createMockGraph('graph-1', 'Custom Magic System', true),
          graph_type: 'custom:magic-system',
        },
        {
          ...createMockGraph('graph-2', 'Custom Economy', false),
          graph_type: 'custom:economy',
        },
      ];

      const activeGraphs = service.getActiveGraphs(graphs);

      expect(activeGraphs).toHaveLength(1);
      expect(activeGraphs[0].graph_type).toBe('custom:magic-system');
    });
  });

  describe('Campaign Isolation', () => {
    it('should only affect graphs within same campaign', () => {
      const campaign1Graphs: KnowledgeGraph[] = [
        {
          ...createMockGraph('graph-1', 'Campaign 1 Graph', true),
          campaign_id: 'campaign-1',
        },
        {
          ...createMockGraph('graph-2', 'Campaign 1 Graph 2', false),
          campaign_id: 'campaign-1',
        },
      ];

      const campaign2Graphs: KnowledgeGraph[] = [
        {
          ...createMockGraph('graph-3', 'Campaign 2 Graph', true),
          campaign_id: 'campaign-2',
        },
        {
          ...createMockGraph('graph-4', 'Campaign 2 Graph 2', false),
          campaign_id: 'campaign-2',
        },
      ];

      // Each campaign should have independent toggle states
      const active1 = service.getActiveGraphs(campaign1Graphs);
      const active2 = service.getActiveGraphs(campaign2Graphs);

      expect(active1).toHaveLength(1);
      expect(active1[0].campaign_id).toBe('campaign-1');

      expect(active2).toHaveLength(1);
      expect(active2[0].campaign_id).toBe('campaign-2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined toggle state as false', () => {
      const graph = {
        ...createMockGraph('graph-1', 'Test Graph', false),
        toggle_state: null as any,
      };

      const activeGraphs = service.getActiveGraphs([graph]);

      // Null/undefined toggle_state should be treated as false
      expect(activeGraphs).toHaveLength(0);
    });

    it('should handle graph with missing properties gracefully', () => {
      const graph = {
        id: 'graph-1',
        campaign_id: 'campaign-123',
        graph_type: 'Political-Web' as const,
        graph_name: 'Test Graph',
        toggle_state: true,
      } as any;

      const activeGraphs = service.getActiveGraphs([graph]);

      expect(activeGraphs).toHaveLength(1);
    });
  });

  describe('Toggle State Defaults', () => {
    it('should respect default toggle state for new graphs', () => {
      // New graphs should default to toggle_state = true (active by default)
      const newGraph = createMockGraph('graph-1', 'New Graph', true);

      const activeGraphs = service.getActiveGraphs([newGraph]);

      expect(activeGraphs).toHaveLength(1);
      expect(newGraph.toggle_state).toBe(true);
    });

    it('should allow graphs to be created with toggle_state = false', () => {
      const newGraph = createMockGraph('graph-1', 'Inactive New Graph', false);

      const activeGraphs = service.getActiveGraphs([newGraph]);

      expect(activeGraphs).toHaveLength(0);
      expect(newGraph.toggle_state).toBe(false);
    });
  });
});
