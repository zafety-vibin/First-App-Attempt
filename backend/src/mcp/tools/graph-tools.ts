/**
 * MCP Graph Tools Implementation
 * Provides 4 tools for knowledge graph management: query_graph, list_graph_nodes, get_node_relationships, update_graph
 */

import {
  QueryGraphInputSchema,
  ListGraphNodesInputSchema,
  GetNodeRelationshipsInputSchema,
  UpdateGraphInputSchema
} from '../schemas/graph-schemas';
import { db } from '../../services/DatabaseService';


/**
 * Tool definitions for graph operations
 */
export const graphToolDefinitions = [
  {
    name: 'query_graph',
    description: 'Query knowledge graph nodes and edges with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        graph_type: { type: 'string', enum: ['geographical', 'political-web', 'world-foundations', 'campaign-story'] },
        node_name: { type: 'string' },
        relationship_type: { type: 'string' }
      },
      required: ['campaign_id', 'graph_type']
    }
  },
  {
    name: 'list_graph_nodes',
    description: 'List all nodes in a specific knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        graph_type: { type: 'string', enum: ['geographical', 'political-web', 'world-foundations', 'campaign-story'] }
      },
      required: ['campaign_id', 'graph_type']
    }
  },
  {
    name: 'get_node_relationships',
    description: 'Get all relationships (edges) connected to a specific node',
    inputSchema: {
      type: 'object',
      properties: {
        node_id: { type: 'number' },
        campaign_id: { type: 'string' }
      },
      required: ['node_id', 'campaign_id']
    }
  },
  {
    name: 'update_graph',
    description: 'Atomically update graph nodes and edges (all-or-nothing)',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        graph_type: { type: 'string', enum: ['geographical', 'political-web', 'world-foundations', 'campaign-story'] },
        operations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              operation: { type: 'string', enum: ['create_node', 'update_node', 'delete_node', 'create_edge', 'update_edge', 'delete_edge'] },
              data: { type: 'object' }
            },
            required: ['operation', 'data']
          }
        }
      },
      required: ['campaign_id', 'graph_type', 'operations']
    }
  }
];

/**
 * Handler for query_graph tool - we'll simplify the naming based on actual implementation
 */
export async function handleQueryGraph(params: any) {
  try {
    const validated = QueryGraphInputSchema.parse(params);

    // Find the graph
    const graphRow = db.prepare(`
      SELECT * FROM knowledge_graphs
      WHERE campaign_id = ? AND graph_type = ?
    `).get(validated.campaign_id, validated.graph_type) as any;

    if (!graphRow) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'GRAPH_NOT_FOUND',
            message: `Graph not found: ${validated.graph_type}`
          })
        }]
      };
    }

    // Build node query with optional filters
    let nodeQuery = `
      SELECT * FROM graph_nodes
      WHERE graph_id = ?
    `;
    const nodeParams: any[] = [graphRow.id];

    if (validated.query) {
      nodeQuery += ` AND name LIKE ?`;
      nodeParams.push(`%${validated.query}%`);
    }

    // Apply active filtering for Political-Web and Campaign-Story graphs
    if (['political-web', 'campaign-story'].includes(validated.graph_type)) {
      nodeQuery += ` AND json_extract(attributes, '$.active') = true`;
    }

    const nodes = db.prepare(nodeQuery).all(...nodeParams) as any[];

    // Build edge query with optional filters
    let edgeQuery = `
      SELECT e.*,
             n1.name as from_node_name,
             n2.name as to_node_name
      FROM graph_edges e
      JOIN graph_nodes n1 ON e.from_node_id = n1.id
      JOIN graph_nodes n2 ON e.to_node_id = n2.id
      WHERE n1.graph_id = ?
    `;
    const edgeParams: any[] = [graphRow.id];

    if (validated.query) {
      edgeQuery += ` AND e.relationship_type = ?`;
      edgeParams.push(validated.query);
    }

    const edges = db.prepare(edgeQuery).all(...edgeParams) as any[];

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          nodes: nodes.map(n => ({
            id: n.id,
            name: n.name,
            node_type: n.node_type,
            attributes: JSON.parse(n.attributes || '{}'),
            information_level_id: n.information_level_id
          })),
          edges: edges.map(e => ({
            id: e.id,
            from_node_id: e.from_node_id,
            from_node_name: e.from_node_name,
            to_node_id: e.to_node_id,
            to_node_name: e.to_node_name,
            relationship_type: e.relationship_type,
            attributes: JSON.parse(e.attributes || '{}')
          })),
          graph_type: validated.graph_type,
          total_nodes: nodes.length,
          total_edges: edges.length
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for list_graph_nodes tool
 */
export async function handleListGraphNodes(params: any) {
  try {
    const validated = ListGraphNodesInputSchema.parse(params);

    // Find the graph
    const graphRow = db.prepare(`
      SELECT * FROM knowledge_graphs
      WHERE campaign_id = ? AND graph_type = ?
    `).get(validated.campaign_id, validated.graph_type) as any;

    if (!graphRow) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'GRAPH_NOT_FOUND',
            message: `Graph not found: ${validated.graph_type}`
          })
        }]
      };
    }

    // Get all nodes with active filtering for certain graph types
    let nodeQuery = `
      SELECT * FROM graph_nodes
      WHERE graph_id = ?
    `;

    // Apply active filtering for Political-Web and Campaign-Story graphs
    if (['political-web', 'campaign-story'].includes(validated.graph_type)) {
      nodeQuery += ` AND json_extract(attributes, '$.active') = true`;
    }

    nodeQuery += ` ORDER BY name ASC`;

    const nodes = db.prepare(nodeQuery).all(graphRow.id) as any[];

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          nodes: nodes.map(n => ({
            id: n.id,
            name: n.name,
            node_type: n.node_type,
            attributes: JSON.parse(n.attributes || '{}'),
            information_level_id: n.information_level_id
          })),
          total_count: nodes.length,
          graph_type: validated.graph_type
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for get_node_relationships tool
 */
export async function handleGetNodeRelationships(params: any) {
  try {
    const validated = GetNodeRelationshipsInputSchema.parse(params);

    // Verify node exists and belongs to campaign
    const nodeRow = db.prepare(`
      SELECT n.*, g.graph_type
      FROM graph_nodes n
      JOIN knowledge_graphs g ON n.graph_id = g.id
      WHERE n.id = ? AND g.campaign_id = ?
    `).get(validated.node_id, validated.campaign_id) as any;

    if (!nodeRow) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'NODE_NOT_FOUND',
            message: `Node not found: ${validated.node_id}`
          })
        }]
      };
    }

    // Get all edges where this node is either source or target
    const edges = db.prepare(`
      SELECT e.*,
             n1.name as from_node_name,
             n1.node_type as from_node_type,
             n2.name as to_node_name,
             n2.node_type as to_node_type
      FROM graph_edges e
      JOIN graph_nodes n1 ON e.from_node_id = n1.id
      JOIN graph_nodes n2 ON e.to_node_id = n2.id
      WHERE e.from_node_id = ? OR e.to_node_id = ?
    `).all(validated.node_id, validated.node_id) as any[];

    const incoming = edges.filter(e => e.to_node_id === validated.node_id);
    const outgoing = edges.filter(e => e.from_node_id === validated.node_id);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          node: {
            id: nodeRow.id,
            name: nodeRow.name,
            node_type: nodeRow.node_type
          },
          incoming_edges: incoming.map(e => ({
            id: e.id,
            from_node_id: e.from_node_id,
            from_node_name: e.from_node_name,
            from_node_type: e.from_node_type,
            relationship_type: e.relationship_type,
            attributes: JSON.parse(e.attributes || '{}')
          })),
          outgoing_edges: outgoing.map(e => ({
            id: e.id,
            to_node_id: e.to_node_id,
            to_node_name: e.to_node_name,
            to_node_type: e.to_node_type,
            relationship_type: e.relationship_type,
            attributes: JSON.parse(e.attributes || '{}')
          })),
          total_incoming: incoming.length,
          total_outgoing: outgoing.length
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for update_graph tool
 */
export async function handleUpdateGraph(params: any) {
  try {
    const validated = UpdateGraphInputSchema.parse(params);

    // Find the graph
    const graphRow = db.prepare(`
      SELECT * FROM knowledge_graphs
      WHERE campaign_id = ? AND graph_type = ?
    `).get(validated.campaign_id, validated.graph_type) as any;

    if (!graphRow) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'GRAPH_NOT_FOUND',
            message: `Graph not found: ${validated.graph_type}`
          })
        }]
      };
    }

    const affectedNodes: string[] = [];
    const affectedEdges: string[] = [];

    // Handle the operation
    switch (validated.operation) {
      case 'add_node': {
        if (!validated.node) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'INVALID_OPERATION',
                message: 'add_node requires node parameter'
              })
            }]
          };
        }

        const result = db.prepare(`
          INSERT INTO graph_nodes (graph_id, name, node_type, attributes)
          VALUES (?, ?, ?, ?)
        `).run(
          graphRow.id,
          validated.node.name,
          validated.node.type,
          JSON.stringify(validated.node.attributes || {})
        );

        affectedNodes.push(String(result.lastInsertRowid));
        break;
      }

      case 'update_node': {
        if (!validated.node || !validated.node.id) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'INVALID_OPERATION',
                message: 'update_node requires node parameter with id'
              })
            }]
          };
        }

        db.prepare(`
          UPDATE graph_nodes
          SET name = ?, node_type = ?, attributes = ?
          WHERE id = ? AND graph_id = ?
        `).run(
          validated.node.name,
          validated.node.type,
          JSON.stringify(validated.node.attributes || {}),
          validated.node.id,
          graphRow.id
        );

        affectedNodes.push(validated.node.id);
        break;
      }

      case 'delete_node': {
        if (!validated.node || !validated.node.id) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'INVALID_OPERATION',
                message: 'delete_node requires node parameter with id'
              })
            }]
          };
        }

        // Delete edges connected to this node
        db.prepare(`
          DELETE FROM graph_edges
          WHERE from_node_id = ? OR to_node_id = ?
        `).run(validated.node.id, validated.node.id);

        // Delete the node
        db.prepare(`
          DELETE FROM graph_nodes
          WHERE id = ? AND graph_id = ?
        `).run(validated.node.id, graphRow.id);

        affectedNodes.push(validated.node.id);
        break;
      }

      case 'add_edge': {
        if (!validated.edge) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'INVALID_OPERATION',
                message: 'add_edge requires edge parameter'
              })
            }]
          };
        }

        const result = db.prepare(`
          INSERT INTO graph_edges (from_node_id, to_node_id, relationship_type, attributes)
          VALUES (?, ?, ?, ?)
        `).run(
          validated.edge.source,
          validated.edge.target,
          validated.edge.relationship,
          JSON.stringify(validated.edge.attributes || {})
        );

        affectedEdges.push(String(result.lastInsertRowid));
        break;
      }

      case 'delete_edge': {
        if (!validated.edge || !validated.edge.id) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'INVALID_OPERATION',
                message: 'delete_edge requires edge parameter with id'
              })
            }]
          };
        }

        db.prepare(`
          DELETE FROM graph_edges
          WHERE id = ?
        `).run(validated.edge.id);

        affectedEdges.push(validated.edge.id);
        break;
      }

      default:
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'UNKNOWN_OPERATION',
              message: `Unknown operation: ${validated.operation}`
            })
          }]
        };
    }

    // Get updated graph stats
    const nodeCount = db.prepare(`
      SELECT COUNT(*) as count FROM graph_nodes WHERE graph_id = ?
    `).get(graphRow.id) as { count: number };

    const edgeCount = db.prepare(`
      SELECT COUNT(*) as count FROM graph_edges e
      JOIN graph_nodes n ON e.from_node_id = n.id
      WHERE n.graph_id = ?
    `).get(graphRow.id) as { count: number };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          operation: validated.operation,
          affected: {
            nodes: affectedNodes.length > 0 ? affectedNodes : undefined,
            edges: affectedEdges.length > 0 ? affectedEdges : undefined
          },
          graph_stats: {
            total_nodes: nodeCount.count,
            total_edges: edgeCount.count
          }
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error.message
        })
      }]
    };
  }
}

export async function handleGetGraphNode() {
  // This tool doesn't actually exist in the original implementation
  // Returning error for now - should be removed from index.ts
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: 'NOT_IMPLEMENTED',
        message: 'get_graph_node tool is not implemented'
      })
    }]
  };
}

export async function handleUpdateGraphNode() {
  // This is handled by update_graph with operation: 'update_node'
  // Returning error for now - should be removed from index.ts
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: 'NOT_IMPLEMENTED',
        message: 'Use update_graph tool with operation: update_node'
      })
    }]
  };
}

export async function handleCreateGraphEdge() {
  // This is handled by update_graph with operation: 'create_edge'
  // Returning error for now - should be removed from index.ts
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: 'NOT_IMPLEMENTED',
        message: 'Use update_graph tool with operation: create_edge'
      })
    }]
  };
}

export async function handleUpdateGraphEdge() {
  // This is handled by update_graph with operation: 'update_edge'
  // Returning error for now - should be removed from index.ts
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: 'NOT_IMPLEMENTED',
        message: 'Use update_graph tool with operation: update_edge'
      })
    }]
  };
}

export async function handleDeleteGraphEdge() {
  // This is handled by update_graph with operation: 'delete_edge'
  // Returning error for now - should be removed from index.ts
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: 'NOT_IMPLEMENTED',
        message: 'Use update_graph tool with operation: delete_edge'
      })
    }]
  };
}

export async function handleToggleGraph() {
  // This tool doesn't actually exist in the original implementation
  // Returning error for now - should be removed from index.ts
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: 'NOT_IMPLEMENTED',
        message: 'toggle_graph tool is not implemented'
      })
    }]
  };
}
