/**
 * PortalPlayerService
 * Feature 009: Player Question Portal
 *
 * Manages lightweight player identity (character name unique per campaign, crypto session tokens)
 */

import Database from 'better-sqlite3';
import { randomBytes, randomUUID } from 'crypto';
import { PortalPlayer } from '../models/PortalPlayer';

export class PortalPlayerService {
  constructor(private db: Database.Database) {}

  /**
   * T020: Create player identity with crypto-generated session token
   * Enforces UNIQUE(campaign_id, character_name) constraint
   *
   * @throws Error if character name already exists in campaign
   */
  async identifyPlayer(
    campaignId: string,
    characterName: string
  ): Promise<{ player: PortalPlayer; sessionToken: string }> {
    // Check for duplicate character name in same campaign
    const existing = this.db
      .prepare(
        `SELECT id FROM portal_players
         WHERE campaign_id = ? AND character_name = ?`
      )
      .get(campaignId, characterName);

    if (existing) {
      throw new Error('Character name already in use. Please choose a different name.');
    }

    // Generate session token: crypto.randomBytes(32).toString('hex') = 64 char hex
    const sessionToken = randomBytes(32).toString('hex');
    const playerId = randomUUID();
    const now = Date.now();

    // Insert player with session token
    this.db
      .prepare(
        `INSERT INTO portal_players
         (id, campaign_id, character_name, session_token, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(playerId, campaignId, characterName, sessionToken, now);

    const player: PortalPlayer = {
      id: playerId,
      campaignId,
      characterName,
      sessionToken,
      createdAt: now,
    };

    return { player, sessionToken };
  }

  /**
   * T021: Retrieve player by session token
   * Used for authenticating player from HTTP-only cookie
   */
  async getPlayerByToken(sessionToken: string): Promise<PortalPlayer | null> {
    const row = this.db
      .prepare(
        `SELECT id, campaign_id as campaignId, character_name as characterName,
         session_token as sessionToken, created_at as createdAt
         FROM portal_players
         WHERE session_token = ?`
      )
      .get(sessionToken) as any;

    if (!row) return null;

    return row;
  }

  /**
   * Get player by ID
   */
  async getPlayerById(playerId: string): Promise<PortalPlayer | null> {
    const row = this.db
      .prepare(
        `SELECT id, campaign_id as campaignId, character_name as characterName,
         session_token as sessionToken, created_at as createdAt
         FROM portal_players
         WHERE id = ?`
      )
      .get(playerId) as any;

    if (!row) return null;

    return row;
  }

  /**
   * List players in campaign (for GM monitoring)
   */
  listPlayers(campaignId: string): PortalPlayer[] {
    return this.db
      .prepare(
        `SELECT id, campaign_id as campaignId, character_name as characterName,
         session_token as sessionToken, created_at as createdAt
         FROM portal_players
         WHERE campaign_id = ?
         ORDER BY created_at DESC`
      )
      .all(campaignId) as PortalPlayer[];
  }
}
