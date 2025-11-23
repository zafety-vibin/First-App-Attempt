/**
 * PortalTokenTrackerService
 * Feature 009: Player Question Portal
 *
 * Tracks token usage per message for aggregation in GM monitoring panel
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { PortalTokenUsage, PlayerTokenUsage } from '../models/PortalTokenUsage';

export class PortalTokenTrackerService {
  constructor(private db: Database.Database) {}

  /**
   * T012: Record token usage for a message
   */
  record(
    playerId: string,
    campaignId: string,
    messageId: string,
    tokenCount: number
  ): void {
    const id = randomUUID();
    const now = Date.now();

    this.db
      .prepare(
        `INSERT INTO portal_token_usage
         (id, player_id, campaign_id, message_id, token_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, playerId, campaignId, messageId, tokenCount, now);
  }

  /**
   * T012: Get total token usage for a player (SQL SUM aggregation)
   */
  getPlayerUsage(playerId: string): number {
    const result = this.db
      .prepare(
        `SELECT COALESCE(SUM(token_count), 0) as total
         FROM portal_token_usage
         WHERE player_id = ?`
      )
      .get(playerId) as { total: number };

    return result.total;
  }

  /**
   * T012: Get total token usage for a campaign (SQL SUM aggregation)
   */
  getCampaignUsage(campaignId: string): number {
    const result = this.db
      .prepare(
        `SELECT COALESCE(SUM(token_count), 0) as total
         FROM portal_token_usage
         WHERE campaign_id = ?`
      )
      .get(campaignId) as { total: number };

    return result.total;
  }

  /**
   * T012: Get per-player breakdown for GM monitoring panel
   * Returns player name + total tokens consumed
   */
  getPerPlayerUsage(campaignId: string): PlayerTokenUsage[] {
    return this.db
      .prepare(
        `SELECT
           pp.character_name as playerName,
           COALESCE(SUM(ptu.token_count), 0) as tokenCount
         FROM portal_players pp
         LEFT JOIN portal_token_usage ptu ON pp.id = ptu.player_id
         WHERE pp.campaign_id = ?
         GROUP BY pp.id, pp.character_name
         ORDER BY tokenCount DESC`
      )
      .all(campaignId) as PlayerTokenUsage[];
  }

  /**
   * Get detailed token usage history for a player
   */
  getPlayerHistory(playerId: string, limit: number = 100): PortalTokenUsage[] {
    return this.db
      .prepare(
        `SELECT id, player_id as playerId, campaign_id as campaignId,
         message_id as messageId, token_count as tokenCount, created_at as createdAt
         FROM portal_token_usage
         WHERE player_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(playerId, limit) as PortalTokenUsage[];
  }
}
