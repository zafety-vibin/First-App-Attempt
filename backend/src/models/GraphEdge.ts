/**
 * Graph Edge model
 * Feature: 005-create-the-ai
 */

import { GraphEdge } from '../../shared/types/KnowledgeGraph';

export interface GraphEdgeRow {
  id: string;
  graph_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  attributes: string; // JSON string
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

/**
 * Transform database row to GraphEdge entity
 */
export function rowToGraphEdge(row: GraphEdgeRow): GraphEdge {
  return {
    id: row.id,
    graphId: row.graph_id,
    sourceNodeId: row.source_node_id,
    targetNodeId: row.target_node_id,
    relationshipType: row.relationship_type,
    attributes: JSON.parse(row.attributes),
    createdAt: new Date(row.created_at * 1000).toISOString(),
    updatedAt: new Date(row.updated_at * 1000).toISOString(),
  };
}

/**
 * Transform GraphEdge entity to database row
 */
export function graphEdgeToRow(edge: Partial<GraphEdge>): Partial<GraphEdgeRow> {
  const row: Partial<GraphEdgeRow> = {};

  if (edge.id !== undefined) row.id = edge.id;
  if (edge.graphId !== undefined) row.graph_id = edge.graphId;
  if (edge.sourceNodeId !== undefined) row.source_node_id = edge.sourceNodeId;
  if (edge.targetNodeId !== undefined) row.target_node_id = edge.targetNodeId;
  if (edge.relationshipType !== undefined) row.relationship_type = edge.relationshipType;
  if (edge.attributes !== undefined) row.attributes = JSON.stringify(edge.attributes);
  if (edge.createdAt !== undefined)
    row.created_at = Math.floor(new Date(edge.createdAt).getTime() / 1000);
  if (edge.updatedAt !== undefined)
    row.updated_at = Math.floor(new Date(edge.updatedAt).getTime() / 1000);

  return row;
}