/**
 * MCP Graphs Resource Implementation
 * Provides browsable knowledge graph view via campaign://graphs/{type} URI
 */

import { db } from '../../services/DatabaseService';

/**
 * Resource definition for graphs
 */
export const graphsResourceDefinition = {
  uri: 'campaign://graphs',
  name: 'Knowledge Graphs',
  description: 'Browse campaign knowledge graphs by type',
  mimeType: 'application/json',
  handler: handleGraphsResource
};

/**
 * Handle graphs resource requests
 */
export async function handleGraphsResource(uri: string): Promise<{
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
}> {
  try {
    // Parse the URI to extract campaign_id and graph_type
    // Format: campaign://<campaign_id>/graphs/<graph_type> or campaign://<campaign_id>/graphs/<graph_type>/<node_id>
    const uriParts = uri.replace('campaign://', '').split('/');
    const campaignId = uriParts[0];
    const graphType = uriParts[2] || null;
    const nodeId = uriParts[3] ? parseInt(uriParts[3]) : null;

    if (!campaignId) {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: 'INVALID_URI',
            message: 'Campaign ID is required in URI'
          })
        }]
      };
    }

    // Verify campaign exists
    const campaignRow = db.prepare(`
      SELECT id, name FROM campaigns WHERE id = ?
    `).get(campaignId) as any;

    if (!campaignRow) {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: 'CAMPAIGN_NOT_FOUND',
            message: `Campaign not found: ${campaignId}`
          })
        }]
      };
    }

    if (!graphType) {
      // List all available graphs for the campaign
      const graphs = db.prepare(`
        SELECT id, graph_type, created_at, updated_at
        FROM knowledge_graphs
        WHERE campaign_id = ?
      `).all(campaignId) as any[];

      const graphSummaries = graphs.map((graph: any) => {
        // Get node and edge counts
        const nodeCount = db.prepare(`
          SELECT COUNT(*) as count FROM graph_nodes WHERE graph_id = ?
        `).get(graph.id) as { count: number };

        const edgeCount = db.prepare(`
          SELECT COUNT(*) as count FROM graph_edges
          WHERE from_node_id IN (SELECT id FROM graph_nodes WHERE graph_id = ?)
        `).get(graph.id) as { count: number };

        return {
          graph_type: graph.graph_type,
          node_count: nodeCount.count,
          edge_count: edgeCount.count,
          uri: `campaign://${campaignId}/graphs/${graph.graph_type}`,
          created_at: graph.created_at,
          updated_at: graph.updated_at
        };
      });

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            campaign: {
              id: campaignId,
              name: campaignRow.name
            },
            graphs: graphSummaries,
            total_graphs: graphs.length
          })
        }]
      };
    }

    // Get specific graph
    const graphRow = db.prepare(`
      SELECT * FROM knowledge_graphs
      WHERE campaign_id = ? AND graph_type = ?
    `).get(campaignId, graphType) as any;

    if (!graphRow) {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: 'GRAPH_NOT_FOUND',
            message: `Graph not found: ${graphType}`
          })
        }]
      };
    }

    if (nodeId) {
      // Get specific node and its relationships
      const nodeRow = db.prepare(`
        SELECT * FROM graph_nodes
        WHERE id = ? AND graph_id = ?
      `).get(nodeId, graphRow.id) as any;

      if (!nodeRow) {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: 'NODE_NOT_FOUND',
              message: `Node not found: ${nodeId}`
            })
          }]
        };
      }

      // Get connected edges
      const incomingEdges = db.prepare(`
        SELECT e.*, n.name as from_name, n.node_type as from_type
        FROM graph_edges e
        JOIN graph_nodes n ON e.from_node_id = n.id
        WHERE e.to_node_id = ?
      `).all(nodeId) as any[];

      const outgoingEdges = db.prepare(`
        SELECT e.*, n.name as to_name, n.node_type as to_type
        FROM graph_edges e
        JOIN graph_nodes n ON e.to_node_id = n.id
        WHERE e.from_node_id = ?
      `).all(nodeId) as any[];

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            node: {
              id: nodeRow.id,
              name: nodeRow.name,
              node_type: nodeRow.node_type,
              attributes: JSON.parse(nodeRow.attributes || '{}'),
              information_level_id: nodeRow.information_level_id
            },
            relationships: {
              incoming: incomingEdges.map((e: any) => ({
                edge_id: e.id,
                from_node: {
                  id: e.from_node_id,
                  name: e.from_name,
                  type: e.from_type,
                  uri: `campaign://${campaignId}/graphs/${graphType}/${e.from_node_id}`
                },
                relationship_type: e.relationship_type,
                attributes: JSON.parse(e.attributes || '{}')
              })),
              outgoing: outgoingEdges.map((e: any) => ({
                edge_id: e.id,
                to_node: {
                  id: e.to_node_id,
                  name: e.to_name,
                  type: e.to_type,
                  uri: `campaign://${campaignId}/graphs/${graphType}/${e.to_node_id}`
                },
                relationship_type: e.relationship_type,
                attributes: JSON.parse(e.attributes || '{}')
              }))
            }
          })
        }]
      };
    }

    // Get all nodes and edges for the graph
    let nodeQuery = `
      SELECT id, name, node_type, attributes, information_level_id
      FROM graph_nodes
      WHERE graph_id = ?
    `;

    // Apply active filtering for Political-Web and Campaign-Story graphs
    if (['political-web', 'campaign-story'].includes(graphType)) {
      nodeQuery += ` AND json_extract(attributes, '$.active') = true`;
    }

    nodeQuery += ` ORDER BY name ASC LIMIT 100`;

    const nodes = db.prepare(nodeQuery).all(graphRow.id) as any[];

    // Get edges for these nodes
    const nodeIds = nodes.map((n: any) => n.id);
    const edges = nodeIds.length > 0 ? db.prepare(`
      SELECT e.*, n1.name as from_name, n2.name as to_name
      FROM graph_edges e
      JOIN graph_nodes n1 ON e.from_node_id = n1.id
      JOIN graph_nodes n2 ON e.to_node_id = n2.id
      WHERE e.from_node_id IN (${nodeIds.map(() => '?').join(',')})
        AND e.to_node_id IN (${nodeIds.map(() => '?').join(',')})
    `).all(...nodeIds, ...nodeIds) as any[] : [];

    // Get total counts
    const totalNodes = db.prepare(`
      SELECT COUNT(*) as count FROM graph_nodes WHERE graph_id = ?
    `).get(graphRow.id) as { count: number };

    const totalEdges = db.prepare(`
      SELECT COUNT(*) as count FROM graph_edges
      WHERE from_node_id IN (SELECT id FROM graph_nodes WHERE graph_id = ?)
    `).get(graphRow.id) as { count: number };

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          graph: {
            type: graphType,
            campaign_id: campaignId
          },
          nodes: nodes.map((n: any) => ({
            id: n.id,
            name: n.name,
            node_type: n.node_type,
            attributes: JSON.parse(n.attributes || '{}'),
            information_level_id: n.information_level_id,
            uri: `campaign://${campaignId}/graphs/${graphType}/${n.id}`
          })),
          edges: edges.map((e: any) => ({
            id: e.id,
            from_node_id: e.from_node_id,
            from_node_name: e.from_name,
            to_node_id: e.to_node_id,
            to_node_name: e.to_name,
            relationship_type: e.relationship_type,
            attributes: JSON.parse(e.attributes || '{}')
          })),
          total_nodes: totalNodes.count,
          total_edges: totalEdges.count,
          displayed_nodes: nodes.length,
          displayed_edges: edges.length,
          active_filtering: ['political-web', 'campaign-story'].includes(graphType)
        })
      }]
    };
  } catch (error: any) {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          error: 'RESOURCE_ERROR',
          message: error.message
        })
      }]
    };
  }
}