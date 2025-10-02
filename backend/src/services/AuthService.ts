/**
 * Auth Service - Handles user authentication and session management
 * Based on: specs/002-create-the-authentication/contracts/auth.yaml
 *
 * Note: This is a simplified implementation. Full Keycloak integration
 * will be added in subsequent iterations.
 */

import { db } from './DatabaseService';
import { User } from '../../../shared/types/User';
import { Session } from '../../../shared/types/Session';
import { rowToUser, userToRow } from '../models/User';
import { rowToSession, sessionToRow } from '../models/Session';
import { UserRow, SessionRow } from '../../../shared/types/User';
import crypto from 'crypto';

export class AuthService {
  /**
   * Create or update user from Keycloak token claims
   */
  static upsertUser(claims: {
    sub: string;
    preferred_username: string;
    email: string;
  }): User {
    const existing = db
      .prepare('SELECT * FROM users WHERE user_id = ?')
      .get(claims.sub) as UserRow | undefined;

    const now = Math.floor(Date.now() / 1000);

    if (existing) {
      // Update existing user
      db.prepare(`UPDATE users SET username = ?, email = ? WHERE user_id = ?`).run(
        claims.preferred_username,
        claims.email,
        claims.sub
      );
    } else {
      // Create new user
      db.prepare(`INSERT INTO users (user_id, username, email, created_at) VALUES (?, ?, ?, ?)`).run(
        claims.sub,
        claims.preferred_username,
        claims.email,
        now
      );
    }

    const updated = db.prepare('SELECT * FROM users WHERE user_id = ?').get(claims.sub) as UserRow;
    return rowToUser(updated);
  }

  /**
   * Create session
   */
  static createSession(userId: string, accessToken: string, expiresIn: number): Session {
    const sessionId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + expiresIn;

    db.prepare(
      `INSERT INTO sessions (session_id, user_id, access_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(sessionId, userId, accessToken, expiresAt, now);

    return {
      sessionId,
      userId,
      accessToken,
      refreshToken: null,
      expiresAt: new Date(expiresAt * 1000),
      createdAt: new Date(now * 1000),
    };
  }

  /**
   * Get session by access token
   */
  static getSessionByToken(accessToken: string): Session | null {
    const row = db
      .prepare('SELECT * FROM sessions WHERE access_token = ?')
      .get(accessToken) as SessionRow | undefined;

    return row ? rowToSession(row) : null;
  }

  /**
   * Delete session (logout)
   */
  static deleteSession(sessionId: string): void {
    db.prepare('DELETE FROM sessions WHERE session_id = ?').run(sessionId);
  }

  /**
   * Clean up expired sessions
   */
  static cleanupExpiredSessions(): void {
    const now = Math.floor(Date.now() / 1000);
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  }

  /**
   * Get user by ID
   */
  static getUserById(userId: string): User | null {
    const row = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as
      | UserRow
      | undefined;

    return row ? rowToUser(row) : null;
  }
}
