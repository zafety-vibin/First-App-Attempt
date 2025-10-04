/**
 * Graph Node model
 * Feature: 005-create-the-ai
 */

import { GraphNode } from '../../shared/types/KnowledgeGraph';

export interface GraphNodeRow {
  id: string;
  graph_id: string;
  type: string;
  name: string;
  attributes: string; // JSON string
  source_card_id: string | null;
  information_level_id: string | null;
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

/**
 * Transform database row to GraphNode entity
 */
export function rowToGraphNode(row: GraphNodeRow): GraphNode {
  return {
    id: row.id,
    graphId: row.graph_id,
    type: row.type,
    name: row.name,
    attributes: JSON.parse(row.attributes),
    sourceCardId: row.source_card_id || undefined,
    informationLevelId: row.information_level_id || undefined,
    createdAt: new Date(row.created_at * 1000).toISOString(),
    updatedAt: new Date(row.updated_at * 1000).toISOString(),
  };
}

/**
 * Transform GraphNode entity to database row
 */
export function graphNodeToRow(node: Partial<GraphNode>): Partial<GraphNodeRow> {
  const row: Partial<GraphNodeRow> = {};

  if (node.id !== undefined) row.id = node.id;
  if (node.graphId !== undefined) row.graph_id = node.graphId;
  if (node.type !== undefined) row.type = node.type;
  if (node.name !== undefined) row.name = node.name;
  if (node.attributes !== undefined) row.attributes = JSON.stringify(node.attributes);
  if (node.sourceCardId !== undefined) row.source_card_id = node.sourceCardId || null;
  if (node.informationLevelId !== undefined)
    row.information_level_id = node.informationLevelId || null;
  if (node.createdAt !== undefined)
    row.created_at = Math.floor(new Date(node.createdAt).getTime() / 1000);
  if (node.updatedAt !== undefined)
    row.updated_at = Math.floor(new Date(node.updatedAt).getTime() / 1000);

  return row;
}