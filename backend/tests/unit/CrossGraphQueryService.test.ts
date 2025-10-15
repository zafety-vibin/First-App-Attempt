/**
 * CrossGraphQueryService Unit Tests
 * Feature: 006-create-the-knowledge
 * Task: T025
 *
 * Unit tests for cross-graph observation handling and context querying.
 * Tests searching observations for cross-references and toggle/confidence filtering.
 *
 * IMPORTANT: This test MUST FAIL until CrossGraphQueryService is implemented (TDD)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CrossGraphQueryService } from '../../src/services/CrossGraphQueryService';
import { KnowledgeGraph, GraphNode, GraphObservation } from '../../src/models/KnowledgeGraph';

describe('CrossGraphQueryService', () => {
  let service: CrossGraphQueryService;

  const createMockGraph = (
    id: string,
    name: string,
    type: string,
    toggleState: boolean
  ): KnowledgeGraph => ({
    id,
    campaign_id: 'campaign-123',
    graph_type: type as any,
    graph_name: name,
    toggle_state: toggleState,
    decay_rate: 0.1,
    maintenance_rules: null,
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000),
    current_version_id: null,
    backup_version_id: null,
  });

  const createMockNode = (
    id: string,
    graphId: string,
    name: string,
    observations: GraphObservation[] | null
  ): GraphNode => ({
    id,
    graph_id: graphId,
    node_type: 'NPC',
    name,
    attributes: {},
    observations,
    information_level_id: null,
    created_at: Math.floor(Date.now() / 1000),
    last_accessed: Math.floor(Date.now() / 1000),
    pinned: false,
  });

  beforeEach(() => {
    service = new CrossGraphQueryService();
  });

  describe('Cross-Graph Observation Queries', () => {
    it('should search observations for cross-references across multiple graphs', async () => {
      const politicalGraph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const geographicalGraph = createMockGraph(
        'graph-2',
        'Geographical',
        'Geographical',
        true
      );

      const politicalNodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Lord Eddard', [
          {
            text: 'Currently residing in Winterfell',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const geographicalNodes: GraphNode[] = [
        createMockNode('node-2', 'graph-2', 'Winterfell', [
          {
            text: 'Capital of the North, ruled by House Stark',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const results = await service.queryAcrossGraphs(
        'Winterfell',
        [
          { graph: politicalGraph, nodes: politicalNodes },
          { graph: geographicalGraph, nodes: geographicalNodes },
        ]
      );

      expect(results).toHaveLength(2);
      expect(results[0].entity_name).toBe('Lord Eddard');
      expect(results[0].graph_type).toBe('Political-Web');
      expect(results[1].entity_name).toBe('Winterfell');
      expect(results[1].graph_type).toBe('Geographical');
    });

    it('should link entities across different graphs via observations', async () => {
      const politicalGraph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const geographicalGraph = createMockGraph(
        'graph-2',
        'Geographical',
        'Geographical',
        true
      );

      const politicalNodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Lord Varys', [
          {
            text: 'Has spies in King\'s Landing and across Westeros',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
          {
            text: 'Currently operating from the Red Keep',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const geographicalNodes: GraphNode[] = [
        createMockNode('node-2', 'graph-2', 'Red Keep', [
          {
            text: 'Royal fortress in King\'s Landing',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const results = await service.queryAcrossGraphs(
        'Red Keep',
        [
          { graph: politicalGraph, nodes: politicalNodes },
          { graph: geographicalGraph, nodes: geographicalNodes },
        ]
      );

      expect(results.length).toBeGreaterThan(0);
      const varysResult = results.find(r => r.entity_name === 'Lord Varys');
      expect(varysResult).toBeDefined();
      expect(varysResult?.matched_observation).toContain('Red Keep');
    });

    it('should parse free-form text observations for entity references', async () => {
      const graph = createMockGraph('graph-1', 'Campaign Story', 'Campaign-Story', true);
      const nodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Session 5', [
          {
            text: 'Party traveled from Neverwinter to Waterdeep via the High Road',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
          {
            text: 'Encountered bandits near Leilon',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      // Query for multiple entity names
      const waterdeedResults = await service.queryAcrossGraphs(
        'Waterdeep',
        [{ graph, nodes }]
      );
      const leilonResults = await service.queryAcrossGraphs(
        'Leilon',
        [{ graph, nodes }]
      );

      expect(waterdeedResults).toHaveLength(1);
      expect(waterdeedResults[0].matched_observation).toContain('Waterdeep');

      expect(leilonResults).toHaveLength(1);
      expect(leilonResults[0].matched_observation).toContain('Leilon');
    });

    it('should handle case-insensitive searches', async () => {
      const graph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const nodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Lord Eddard', [
          {
            text: 'Currently investigating Jon Arryn\'s death',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      // Query with different case
      const results = await service.queryAcrossGraphs(
        'jon arryn',
        [{ graph, nodes }]
      );

      expect(results).toHaveLength(1);
      expect(results[0].entity_name).toBe('Lord Eddard');
      expect(results[0].matched_observation).toContain('Jon Arryn');
    });

    it('should return empty array when no cross-references found', async () => {
      const graph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const nodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Lord Eddard', [
          {
            text: 'Currently investigating',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const results = await service.queryAcrossGraphs(
        'NonexistentEntity',
        [{ graph, nodes }]
      );

      expect(results).toHaveLength(0);
    });
  });

  describe('Toggle Filtering Integration', () => {
    it('should only search active (toggled-on) graphs', async () => {
      const activeGraph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const inactiveGraph = createMockGraph('graph-2', 'Geographical', 'Geographical', false);

      const activeNodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Lord Eddard', [
          {
            text: 'Currently in Winterfell',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const inactiveNodes: GraphNode[] = [
        createMockNode('node-2', 'graph-2', 'Winterfell', [
          {
            text: 'Capital of the North',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const results = await service.queryAcrossGraphs(
        'Winterfell',
        [
          { graph: activeGraph, nodes: activeNodes },
          { graph: inactiveGraph, nodes: inactiveNodes },
        ]
      );

      // Only active graph should be searched
      expect(results).toHaveLength(1);
      expect(results[0].graph_type).toBe('Political-Web');
      expect(results[0].graph_name).toBe('Political Web');
    });

    it('should exclude toggled-off graphs from AI context', async () => {
      const graph1 = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const graph2 = createMockGraph('graph-2', 'Geographical', 'Geographical', false);
      const graph3 = createMockGraph('graph-3', 'Campaign Story', 'Campaign-Story', true);

      const nodes1: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Entity 1', [
          {
            text: 'Reference to target',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const nodes2: GraphNode[] = [
        createMockNode('node-2', 'graph-2', 'Entity 2', [
          {
            text: 'Reference to target',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const nodes3: GraphNode[] = [
        createMockNode('node-3', 'graph-3', 'Entity 3', [
          {
            text: 'Reference to target',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const results = await service.queryAcrossGraphs(
        'target',
        [
          { graph: graph1, nodes: nodes1 },
          { graph: graph2, nodes: nodes2 },
          { graph: graph3, nodes: nodes3 },
        ]
      );

      // Only graph-1 and graph-3 should be included (graph-2 is toggled off)
      expect(results).toHaveLength(2);
      expect(results.find(r => r.graph_type === 'Geographical')).toBeUndefined();
    });

    it('should dynamically update results when graph toggled on/off', async () => {
      let graph = createMockGraph('graph-1', 'Political Web', 'Political-Web', false);
      const nodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Test Entity', [
          {
            text: 'Reference to target',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      // Initially toggled off - no results
      let results = await service.queryAcrossGraphs(
        'target',
        [{ graph, nodes }]
      );
      expect(results).toHaveLength(0);

      // Toggle on
      graph = { ...graph, toggle_state: true };
      results = await service.queryAcrossGraphs(
        'target',
        [{ graph, nodes }]
      );
      expect(results).toHaveLength(1);
    });
  });

  describe('Confidence Filtering', () => {
    it('should exclude low-confidence entities if threshold set', async () => {
      const graph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const nodes: GraphNode[] = [
        {
          ...createMockNode('node-1', 'graph-1', 'High Confidence Entity', [
            {
              text: 'Reference to target',
              created_at: 1735689600,
              last_accessed: 1735689600,
            },
          ]),
          confidence: 0.9, // High confidence
        },
        {
          ...createMockNode('node-2', 'graph-1', 'Low Confidence Entity', [
            {
              text: 'Reference to target',
              created_at: 1735689600,
              last_accessed: 1735689600,
            },
          ]),
          confidence: 0.2, // Low confidence
        },
      ];

      // Query with confidence threshold 0.4
      const results = await service.queryAcrossGraphs(
        'target',
        [{ graph, nodes }],
        { confidenceThreshold: 0.4 }
      );

      expect(results).toHaveLength(1);
      expect(results[0].entity_name).toBe('High Confidence Entity');
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.4);
    });

    it('should include all entities when no confidence threshold set', async () => {
      const graph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const nodes: GraphNode[] = [
        {
          ...createMockNode('node-1', 'graph-1', 'High Confidence', [
            {
              text: 'Reference',
              created_at: 1735689600,
              last_accessed: 1735689600,
            },
          ]),
          confidence: 0.9,
        },
        {
          ...createMockNode('node-2', 'graph-1', 'Low Confidence', [
            {
              text: 'Reference',
              created_at: 1735689600,
              last_accessed: 1735689600,
            },
          ]),
          confidence: 0.2,
        },
      ];

      const results = await service.queryAcrossGraphs(
        'Reference',
        [{ graph, nodes }]
      );

      expect(results).toHaveLength(2);
    });

    it('should include confidence score in query results', async () => {
      const graph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const nodes: GraphNode[] = [
        {
          ...createMockNode('node-1', 'graph-1', 'Test Entity', [
            {
              text: 'Reference to target',
              created_at: 1735689600,
              last_accessed: 1735689600,
            },
          ]),
          confidence: 0.75,
        },
      ];

      const results = await service.queryAcrossGraphs(
        'target',
        [{ graph, nodes }]
      );

      expect(results[0].confidence).toBe(0.75);
    });

    it('should filter by confidence ranges', async () => {
      const graph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const nodes: GraphNode[] = [
        {
          ...createMockNode('node-1', 'graph-1', 'High', [
            { text: 'target', created_at: 1735689600, last_accessed: 1735689600 },
          ]),
          confidence: 0.9,
        },
        {
          ...createMockNode('node-2', 'graph-1', 'Medium', [
            { text: 'target', created_at: 1735689600, last_accessed: 1735689600 },
          ]),
          confidence: 0.5,
        },
        {
          ...createMockNode('node-3', 'graph-1', 'Low', [
            { text: 'target', created_at: 1735689600, last_accessed: 1735689600 },
          ]),
          confidence: 0.2,
        },
      ];

      // Filter for medium-high confidence (>= 0.4)
      const results = await service.queryAcrossGraphs(
        'target',
        [{ graph, nodes }],
        { confidenceThreshold: 0.4 }
      );

      expect(results).toHaveLength(2);
      expect(results.every(r => r.confidence! >= 0.4)).toBe(true);
    });
  });

  describe('Result Context Information', () => {
    it('should include graph context (graph_type, graph_name) for each entity', async () => {
      const graph = createMockGraph('graph-1', 'Test Political Web', 'Political-Web', true);
      const nodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Test Entity', [
          {
            text: 'Reference to target',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const results = await service.queryAcrossGraphs(
        'target',
        [{ graph, nodes }]
      );

      expect(results[0].graph_type).toBe('Political-Web');
      expect(results[0].graph_name).toBe('Test Political Web');
      expect(results[0].graph_id).toBe('graph-1');
    });

    it('should include matched observation text in results', async () => {
      const graph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const nodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Lord Eddard', [
          {
            text: 'Currently investigating Jon Arryn\'s mysterious death',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const results = await service.queryAcrossGraphs(
        'Jon Arryn',
        [{ graph, nodes }]
      );

      expect(results[0].matched_observation).toContain('Jon Arryn');
      expect(results[0].matched_observation).toContain('mysterious death');
    });

    it('should handle entities with multiple matching observations', async () => {
      const graph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const nodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Lord Varys', [
          {
            text: 'Has spies in King\'s Landing',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
          {
            text: 'Operates from King\'s Landing',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
          {
            text: 'Knows all secrets in the capital',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const results = await service.queryAcrossGraphs(
        'King\'s Landing',
        [{ graph, nodes }]
      );

      // Should return entity with all matching observations
      expect(results).toHaveLength(1);
      expect(results[0].entity_name).toBe('Lord Varys');
      // Should include all matched observations or indicate multiple matches
      expect(results[0].matched_observations_count).toBeGreaterThan(1);
    });
  });

  describe('Multiple Graph Types Querying', () => {
    it('should query across all 4 documented graph types', async () => {
      const graphs = [
        createMockGraph('graph-1', 'World Foundations', 'World-Foundations', true),
        createMockGraph('graph-2', 'Political Web', 'Political-Web', true),
        createMockGraph('graph-3', 'Geographical', 'Geographical', true),
        createMockGraph('graph-4', 'Campaign Story', 'Campaign-Story', true),
      ];

      const allNodes = graphs.map((graph, i) => ({
        graph,
        nodes: [
          createMockNode(`node-${i}`, graph.id, `Entity ${i}`, [
            {
              text: 'Reference to common target',
              created_at: 1735689600,
              last_accessed: 1735689600,
            },
          ]),
        ],
      }));

      const results = await service.queryAcrossGraphs('common target', allNodes);

      expect(results).toHaveLength(4);
      expect(results.map(r => r.graph_type)).toContain('World-Foundations');
      expect(results.map(r => r.graph_type)).toContain('Political-Web');
      expect(results.map(r => r.graph_type)).toContain('Geographical');
      expect(results.map(r => r.graph_type)).toContain('Campaign-Story');
    });

    it('should query custom graph types', async () => {
      const customGraph = createMockGraph(
        'graph-1',
        'Custom Magic System',
        'custom:magic-system',
        true
      );
      const nodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Fireball Spell', [
          {
            text: 'Requires verbal and somatic components',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const results = await service.queryAcrossGraphs(
        'verbal',
        [{ graph: customGraph, nodes }]
      );

      expect(results).toHaveLength(1);
      expect(results[0].graph_type).toBe('custom:magic-system');
    });
  });

  describe('Edge Cases', () => {
    it('should handle nodes with no observations', async () => {
      const graph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const nodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Entity Without Observations', null),
      ];

      const results = await service.queryAcrossGraphs(
        'target',
        [{ graph, nodes }]
      );

      expect(results).toHaveLength(0);
    });

    it('should handle empty observations array', async () => {
      const graph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const nodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Entity With Empty Observations', []),
      ];

      const results = await service.queryAcrossGraphs(
        'target',
        [{ graph, nodes }]
      );

      expect(results).toHaveLength(0);
    });

    it('should handle empty query string', async () => {
      const graph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const nodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Test Entity', [
          {
            text: 'Some observation',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const results = await service.queryAcrossGraphs('', [{ graph, nodes }]);

      expect(results).toHaveLength(0);
    });

    it('should handle empty graph list', async () => {
      const results = await service.queryAcrossGraphs('target', []);

      expect(results).toHaveLength(0);
    });

    it('should handle special characters in query', async () => {
      const graph = createMockGraph('graph-1', 'Political Web', 'Political-Web', true);
      const nodes: GraphNode[] = [
        createMockNode('node-1', 'graph-1', 'Test Entity', [
          {
            text: 'Reference to Jon Arryn\'s death (suspicious)',
            created_at: 1735689600,
            last_accessed: 1735689600,
          },
        ]),
      ];

      const results = await service.queryAcrossGraphs(
        'Arryn\'s death',
        [{ graph, nodes }]
      );

      expect(results).toHaveLength(1);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large numbers of observations efficiently', async () => {
      const graph = createMockGraph('graph-1', 'Campaign Story', 'Campaign-Story', true);
      const nodes: GraphNode[] = [
        createMockNode(
          'node-1',
          'graph-1',
          'Heavily Documented Entity',
          Array.from({ length: 100 }, (_, i) => ({
            text: `Observation ${i} referencing target entity`,
            created_at: 1735689600,
            last_accessed: 1735689600,
          }))
        ),
      ];

      const results = await service.queryAcrossGraphs(
        'target entity',
        [{ graph, nodes }]
      );

      expect(results).toHaveLength(1);
      expect(results[0].matched_observations_count).toBe(100);
    });

    it('should handle querying across many graphs', async () => {
      const graphsData = Array.from({ length: 10 }, (_, i) => ({
        graph: createMockGraph(`graph-${i}`, `Graph ${i}`, 'Political-Web', true),
        nodes: [
          createMockNode(`node-${i}`, `graph-${i}`, `Entity ${i}`, [
            {
              text: 'Reference to common target',
              created_at: 1735689600,
              last_accessed: 1735689600,
            },
          ]),
        ],
      }));

      const results = await service.queryAcrossGraphs('common target', graphsData);

      expect(results).toHaveLength(10);
    });
  });
});
