/**
 * Planning Session model
 * Feature: 005-create-the-ai
 */

import { PlanningSession } from '../../shared/types/PlanningSession';
import { ChatMessage } from '../../shared/types/ImportSession';

export interface PlanningSessionRow {
  id: string;
  campaign_id: string;
  status: string;
  chat_history: string; // JSON string
  graph_updates: string; // JSON string - tracks immediate updates
  created_at: number; // Unix timestamp
  completed_at: number | null; // Unix timestamp
}

/**
 * Transform database row to PlanningSession entity
 */
export function rowToPlanningSession(row: PlanningSessionRow): PlanningSession {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    status: row.status as PlanningSession['status'],
    chatHistory: JSON.parse(row.chat_history) as ChatMessage[],
    graphUpdates: JSON.parse(row.graph_updates) as PlanningSession['graphUpdates'],
    createdAt: new Date(row.created_at * 1000).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at * 1000).toISOString() : undefined,
  };
}

/**
 * Transform PlanningSession entity to database row
 */
export function planningSessionToRow(session: Partial<PlanningSession>): Partial<PlanningSessionRow> {
  const row: Partial<PlanningSessionRow> = {};

  if (session.id !== undefined) row.id = session.id;
  if (session.campaignId !== undefined) row.campaign_id = session.campaignId;
  if (session.status !== undefined) row.status = session.status;
  if (session.chatHistory !== undefined) row.chat_history = JSON.stringify(session.chatHistory);
  if (session.graphUpdates !== undefined) row.graph_updates = JSON.stringify(session.graphUpdates);
  if (session.createdAt !== undefined)
    row.created_at = Math.floor(new Date(session.createdAt).getTime() / 1000);
  if (session.completedAt !== undefined)
    row.completed_at = session.completedAt ? Math.floor(new Date(session.completedAt).getTime() / 1000) : null;

  return row;
}