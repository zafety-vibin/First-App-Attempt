/**
 * Import Session model
 * Feature: 005-create-the-ai
 */

import { ImportSession, ChatMessage, AIApprovalSummary } from '../../shared/types/ImportSession';

export interface ImportSessionRow {
  id: string;
  campaign_id: string;
  status: string;
  chat_history: string; // JSON string
  approval_summary: string | null; // JSON string
  created_at: number; // Unix timestamp
  completed_at: number | null; // Unix timestamp
}

/**
 * Transform database row to ImportSession entity
 */
export function rowToImportSession(row: ImportSessionRow): ImportSession {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    status: row.status as ImportSession['status'],
    chatHistory: JSON.parse(row.chat_history) as ChatMessage[],
    approvalSummary: row.approval_summary ? JSON.parse(row.approval_summary) as AIApprovalSummary : undefined,
    createdAt: new Date(row.created_at * 1000).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at * 1000).toISOString() : undefined,
  };
}

/**
 * Transform ImportSession entity to database row
 */
export function importSessionToRow(session: Partial<ImportSession>): Partial<ImportSessionRow> {
  const row: Partial<ImportSessionRow> = {};

  if (session.id !== undefined) row.id = session.id;
  if (session.campaignId !== undefined) row.campaign_id = session.campaignId;
  if (session.status !== undefined) row.status = session.status;
  if (session.chatHistory !== undefined) row.chat_history = JSON.stringify(session.chatHistory);
  if (session.approvalSummary !== undefined)
    row.approval_summary = session.approvalSummary ? JSON.stringify(session.approvalSummary) : null;
  if (session.createdAt !== undefined)
    row.created_at = Math.floor(new Date(session.createdAt).getTime() / 1000);
  if (session.completedAt !== undefined)
    row.completed_at = session.completedAt ? Math.floor(new Date(session.completedAt).getTime() / 1000) : null;

  return row;
}