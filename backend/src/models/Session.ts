/**
 * Session model - Tracks active authentication sessions
 * Based on: specs/002-create-the-authentication/data-model.md
 */

import { Session, SessionRow } from '../shared/types/Session';

/**
 * Transform database row to Session entity
 */
export function rowToSession(row: SessionRow): Session {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: new Date(row.expires_at * 1000),
    createdAt: new Date(row.created_at * 1000),
  };
}

/**
 * Transform Session entity to database row
 */
export function sessionToRow(session: Partial<Session>): Partial<SessionRow> {
  const row: Partial<SessionRow> = {};

  if (session.sessionId !== undefined) row.session_id = session.sessionId;
  if (session.userId !== undefined) row.user_id = session.userId;
  if (session.accessToken !== undefined) row.access_token = session.accessToken;
  if (session.refreshToken !== undefined) row.refresh_token = session.refreshToken;
  if (session.expiresAt !== undefined)
    row.expires_at = Math.floor(session.expiresAt.getTime() / 1000);
  if (session.createdAt !== undefined)
    row.created_at = Math.floor(session.createdAt.getTime() / 1000);

  return row;
}
