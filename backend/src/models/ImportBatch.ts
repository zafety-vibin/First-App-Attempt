/**
 * Import Batch model
 * Feature: 005-create-the-ai
 */

import { ImportBatch } from '../../shared/types/KnowledgeGraph';

export interface ImportBatchRow {
  id: string;
  import_session_id: string;
  node_ids: string; // JSON array
  edge_ids: string; // JSON array
  card_ids: string; // JSON array
  created_at: number; // Unix timestamp
}

/**
 * Transform database row to ImportBatch entity
 */
export function rowToImportBatch(row: ImportBatchRow): ImportBatch {
  return {
    id: row.id,
    importSessionId: row.import_session_id,
    nodeIds: JSON.parse(row.node_ids) as string[],
    edgeIds: JSON.parse(row.edge_ids) as string[],
    cardIds: JSON.parse(row.card_ids) as string[],
    createdAt: new Date(row.created_at * 1000).toISOString(),
  };
}

/**
 * Transform ImportBatch entity to database row
 */
export function importBatchToRow(batch: Partial<ImportBatch>): Partial<ImportBatchRow> {
  const row: Partial<ImportBatchRow> = {};

  if (batch.id !== undefined) row.id = batch.id;
  if (batch.importSessionId !== undefined) row.import_session_id = batch.importSessionId;
  if (batch.nodeIds !== undefined) row.node_ids = JSON.stringify(batch.nodeIds);
  if (batch.edgeIds !== undefined) row.edge_ids = JSON.stringify(batch.edgeIds);
  if (batch.cardIds !== undefined) row.card_ids = JSON.stringify(batch.cardIds);
  if (batch.createdAt !== undefined)
    row.created_at = Math.floor(new Date(batch.createdAt).getTime() / 1000);

  return row;
}