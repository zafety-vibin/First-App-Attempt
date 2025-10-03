/**
 * Integration Test - Atomic Graph Update Operations
 * Verifies that graph updates are atomic (all-or-nothing)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../src/services/DatabaseService';
import { registerGraphTools } from '../../src/mcp/tools/graph-tools';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('MCP Atomic Operations Integration Test', () => {
  let server: Server;
  let campaignId: string;
  let graphId: number;

  beforeAll(() => {
    // Create test campaign and graph
    campaignId = 'test-campaign-atomic-' + Date.now();

    db.prepare(`
      INSERT INTO campaigns (id, name, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(campaignId, 'Test Campaign', 'test-user', Date.now(), Date.now());

    const result = db.prepare(`
      INSERT INTO knowledge_graphs (campaign_id, graph_type, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(campaignId, 'political-web', Date.now(), Date.now());

    graphId = result.lastInsertRowid as number;

    // Initialize server
    server = new Server({
      name: 'test-server',
      version: '1.0.0'
    });

    registerGraphTools(server);
  });

  afterAll(() => {
    // Clean up test data
    db.prepare('DELETE FROM graph_edges WHERE from_node_id IN (SELECT id FROM graph_nodes WHERE graph_id = ?)').run(graphId);
    db.prepare('DELETE FROM graph_nodes WHERE graph_id = ?').run(graphId);
    db.prepare('DELETE FROM knowledge_graphs WHERE id = ?').run(graphId);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId);
  });

  it('should rollback all operations if one fails', async () => {
    // Get the update_graph tool handler
    const updateGraphTool = server._tools?.get('update_graph');
    expect(updateGraphTool).toBeDefined();

    // Prepare operations: 2 valid creates, then 1 that will fail
    const operations = [
      {
        operation: 'create_node',
        data: {
          name: 'Node 1',
          node_type: 'faction',
          attributes: { active: true }
        }
      },
      {
        operation: 'create_node',
        data: {
          name: 'Node 2',
          node_type: 'character',
          attributes: { active: true }
        }
      },
      {
        operation: 'create_edge',
        data: {
          from_node_id: 999999, // Non-existent node - will cause failure
          to_node_id: 999998,    // Non-existent node
          relationship_type: 'allied_with'
        }
      }
    ];

    // Execute the tool
    const result = await updateGraphTool?.handler({
      campaign_id: campaignId,
      graph_type: 'political-web',
      operations
    });

    // Verify the operation failed
    expect(result?.isError).toBe(true);
    const errorData = JSON.parse(result.content[0].text);
    expect(errorData.error).toBe('TRANSACTION_FAILED');
    expect(errorData.rollback).toBe(true);

    // Verify NO nodes were created (complete rollback)
    const nodeCount = db.prepare(`
      SELECT COUNT(*) as count FROM graph_nodes WHERE graph_id = ?
    `).get(graphId) as { count: number };

    expect(nodeCount.count).toBe(0);
  });

  it('should commit all operations if all succeed', async () => {
    const updateGraphTool = server._tools?.get('update_graph');

    // First create nodes
    const createNodesResult = await updateGraphTool?.handler({
      campaign_id: campaignId,
      graph_type: 'political-web',
      operations: [
        {
          operation: 'create_node',
          data: {
            name: 'Kingdom A',
            node_type: 'faction',
            attributes: { active: true, power: 'high' }
          }
        },
        {
          operation: 'create_node',
          data: {
            name: 'Kingdom B',
            node_type: 'faction',
            attributes: { active: true, power: 'medium' }
          }
        },
        {
          operation: 'create_node',
          data: {
            name: 'Guild of Merchants',
            node_type: 'faction',
            attributes: { active: false, power: 'low' }
          }
        }
      ]
    });

    expect(createNodesResult?.isError).toBeFalsy();
    const createData = JSON.parse(createNodesResult.content[0].text);
    expect(createData.success).toBe(true);
    expect(createData.results).toHaveLength(3);

    // Get the created node IDs
    const nodeIds = createData.results.map((r: any) => r.node_id);

    // Now create edges between them
    const createEdgesResult = await updateGraphTool?.handler({
      campaign_id: campaignId,
      graph_type: 'political-web',
      operations: [
        {
          operation: 'create_edge',
          data: {
            from_node_id: nodeIds[0],
            to_node_id: nodeIds[1],
            relationship_type: 'at_war_with',
            attributes: { since: '1423' }
          }
        },
        {
          operation: 'create_edge',
          data: {
            from_node_id: nodeIds[2],
            to_node_id: nodeIds[0],
            relationship_type: 'trades_with',
            attributes: { goods: ['silk', 'spices'] }
          }
        }
      ]
    });

    expect(createEdgesResult?.isError).toBeFalsy();
    const edgeData = JSON.parse(createEdgesResult.content[0].text);
    expect(edgeData.success).toBe(true);
    expect(edgeData.results).toHaveLength(2);

    // Verify all data was committed
    const nodeCount = db.prepare(`
      SELECT COUNT(*) as count FROM graph_nodes WHERE graph_id = ?
    `).get(graphId) as { count: number };

    const edgeCount = db.prepare(`
      SELECT COUNT(*) as count FROM graph_edges
      WHERE from_node_id IN (SELECT id FROM graph_nodes WHERE graph_id = ?)
    `).get(graphId) as { count: number };

    expect(nodeCount.count).toBe(3);
    expect(edgeCount.count).toBe(2);
  });

  it('should handle mixed operations atomically', async () => {
    const updateGraphTool = server._tools?.get('update_graph');

    // Get existing nodes
    const nodes = db.prepare(`
      SELECT id, name FROM graph_nodes WHERE graph_id = ?
    `).all(graphId) as any[];

    expect(nodes.length).toBeGreaterThan(0);

    // Mixed operations: update, delete, create
    const mixedOps = await updateGraphTool?.handler({
      campaign_id: campaignId,
      graph_type: 'political-web',
      operations: [
        {
          operation: 'update_node',
          data: {
            node_id: nodes[0].id,
            attributes: { active: false, disbanded: true }
          }
        },
        {
          operation: 'create_node',
          data: {
            name: 'New Faction',
            node_type: 'faction',
            attributes: { active: true }
          }
        },
        {
          operation: 'delete_edge',
          data: {
            edge_id: 999999 // Non-existent edge - will fail
          }
        }
      ]
    });

    // Should fail and rollback
    expect(mixedOps?.isError).toBe(true);

    // Verify node was NOT updated (rollback successful)
    const unchangedNode = db.prepare(`
      SELECT attributes FROM graph_nodes WHERE id = ?
    `).get(nodes[0].id) as any;

    const attrs = JSON.parse(unchangedNode.attributes);
    expect(attrs.disbanded).toBeUndefined(); // Update was rolled back

    // Verify new node was NOT created
    const newNode = db.prepare(`
      SELECT id FROM graph_nodes WHERE graph_id = ? AND name = ?
    `).get(graphId, 'New Faction');

    expect(newNode).toBeUndefined();
  });
});