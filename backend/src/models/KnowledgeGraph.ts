/**
 * Knowledge Graph model
 * Feature: 005-create-the-ai
 */

import { KnowledgeGraph } from '../../shared/types/KnowledgeGraph';

export interface KnowledgeGraphRow {
  id: string;
  campaign_id: string;
  type: string;
  last_updated: number; // Unix timestamp
  created_at: number; // Unix timestamp
}

/**
 * Transform database row to KnowledgeGraph entity
 */
export function rowToKnowledgeGraph(row: KnowledgeGraphRow): KnowledgeGraph {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    type: row.type as KnowledgeGraph['type'],
    lastUpdated: new Date(row.last_updated * 1000).toISOString(),
    createdAt: new Date(row.created_at * 1000).toISOString(),
  };
}

/**
 * Transform KnowledgeGraph entity to database row
 */
export function knowledgeGraphToRow(graph: Partial<KnowledgeGraph>): Partial<KnowledgeGraphRow> {
  const row: Partial<KnowledgeGraphRow> = {};

  if (graph.id !== undefined) row.id = graph.id;
  if (graph.campaignId !== undefined) row.campaign_id = graph.campaignId;
  if (graph.type !== undefined) row.type = graph.type;
  if (graph.lastUpdated !== undefined)
    row.last_updated = Math.floor(new Date(graph.lastUpdated).getTime() / 1000);
  if (graph.createdAt !== undefined)
    row.created_at = Math.floor(new Date(graph.createdAt).getTime() / 1000);

  return row;
}