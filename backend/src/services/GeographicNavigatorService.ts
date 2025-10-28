/**
 * Geographic Navigator Service
 * Feature: 021-create-a-geographic (Spatial Navigator)
 *
 * Queries Geographic knowledge graph and builds scale-based hierarchy.
 * Integrates with locations table for map data and spatial coordinates.
 */

import Database from 'better-sqlite3';

export interface GraphNode {
  id: string;
  name: string;
  location_type: string;
  parent_location_id: string | null;
  map_pin_x: number | null;
  map_pin_y: number | null;
  has_map: boolean;
  pinned: boolean;
}

export interface ScaleNode {
  node: GraphNode;
  children: ScaleNode[];
  childCount: number; // Total descendants
  depth: number;
}

export class GeographicNavigatorService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Get Geographic graph for campaign
   */
  getGeographicGraph(campaignId: string): { id: string; name: string } | null {
    const graph = this.db
      .prepare('SELECT id, graph_name FROM knowledge_graphs WHERE campaign_id = ? AND graph_type = ?')
      .get(campaignId, 'Geographical') as any;

    return graph ? { id: graph.id, name: graph.graph_name } : null;
  }

  /**
   * Get all geographic nodes with location data
   */
  getGeographicNodes(graphId: string): GraphNode[] {
    const nodes = this.db
      .prepare(`
        SELECT
          gn.id,
          gn.name,
          gn.attributes,
          gn.pinned,
          l.map_images,
          l.map_pin_x,
          l.map_pin_y
        FROM graph_nodes gn
        LEFT JOIN locations l ON gn.name = l.name
        WHERE gn.graph_id = ?
      `)
      .all(graphId) as any[];

    return nodes.map((row) => {
      const attributes = row.attributes ? JSON.parse(row.attributes) : {};
      const mapImages = row.map_images ? JSON.parse(row.map_images) : [];

      return {
        id: row.id,
        name: row.name,
        location_type: attributes.location_type || 'unknown',
        parent_location_id: attributes.parent_location_id || null,
        map_pin_x: row.map_pin_x,
        map_pin_y: row.map_pin_y,
        has_map: mapImages.length > 0,
        pinned: row.pinned === 1,
      };
    });
  }

  /**
   * Build hierarchical tree from flat node list
   */
  buildScaleTree(nodes: GraphNode[]): ScaleNode[] {
    // Create node map
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Count total children recursively
    const countChildren = (nodeId: string, visited: Set<string> = new Set()): number => {
      if (visited.has(nodeId)) return 0; // Cycle detection
      visited.add(nodeId);

      const children = nodes.filter((n) => n.parent_location_id === nodeId);
      let count = children.length;

      for (const child of children) {
        count += countChildren(child.id, new Set(visited));
      }

      return count;
    };

    // Build tree recursively
    const buildNode = (node: GraphNode, depth: number, visited: Set<string> = new Set()): ScaleNode => {
      if (visited.has(node.id)) {
        // Cycle detected
        return {
          node,
          children: [],
          childCount: 0,
          depth,
        };
      }

      visited.add(node.id);

      const children = nodes
        .filter((n) => n.parent_location_id === node.id)
        .map((child) => buildNode(child, depth + 1, new Set(visited)));

      return {
        node,
        children,
        childCount: countChildren(node.id),
        depth,
      };
    };

    // Find root nodes (no parent)
    const roots = nodes.filter((n) => !n.parent_location_id);

    // Build tree for each root
    const tree = roots.map((root) => buildNode(root, 0));

    // Sort roots: node with most children goes last (will be positioned at bottom in ring)
    tree.sort((a, b) => a.childCount - b.childCount);

    return tree;
  }

  /**
   * Get children of a specific node
   */
  getNodeChildren(graphId: string, parentNodeId: string | null): GraphNode[] {
    const allNodes = this.getGeographicNodes(graphId);

    if (parentNodeId === null) {
      // Get root nodes
      return allNodes.filter((n) => !n.parent_location_id);
    }

    // Get children of specific node
    const parent = allNodes.find((n) => n.id === parentNodeId);
    if (!parent) return [];

    return allNodes.filter((n) => n.parent_location_id === parentNodeId);
  }

  /**
   * Update node spatial coordinates (where pinned on parent map)
   */
  updateNodeCoordinates(nodeId: string, x: number, y: number): boolean {
    try {
      // Update via locations table (joined by name)
      const result = this.db
        .prepare(`
          UPDATE locations
          SET map_pin_x = ?, map_pin_y = ?, updated_at = ?
          WHERE id IN (
            SELECT l.id FROM locations l
            JOIN graph_nodes gn ON l.name = gn.name
            WHERE gn.id = ?
          )
        `)
        .run(x, y, Math.floor(Date.now() / 1000), nodeId);

      return result.changes > 0;
    } catch (error) {
      console.error('Failed to update node coordinates:', error);
      return false;
    }
  }
}
