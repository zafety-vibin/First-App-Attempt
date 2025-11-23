/**
 * PortalConversationService
 * Feature 009: Player Question Portal
 *
 * Manages conversations and messages (one conversation per player, many messages)
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { PortalConversation } from '../models/PortalConversation';
import { PortalMessage, Citation } from '../models/PortalMessage';

export class PortalConversationService {
  constructor(private db: Database.Database) {}

  /**
   * Get or create conversation for player
   * Each player has exactly one conversation (UNIQUE constraint on player_id)
   */
  getOrCreateByPlayer(playerId: string, campaignId: string): PortalConversation {
    // Try to get existing conversation
    const existing = this.db
      .prepare(
        `SELECT id, player_id as playerId, campaign_id as campaignId,
         created_at as createdAt, updated_at as updatedAt
         FROM portal_conversations
         WHERE player_id = ?`
      )
      .get(playerId) as PortalConversation | undefined;

    if (existing) return existing;

    // Create new conversation
    const id = randomUUID();
    const now = Date.now();

    this.db
      .prepare(
        `INSERT INTO portal_conversations
         (id, player_id, campaign_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, playerId, campaignId, now, now);

    return {
      id,
      playerId,
      campaignId,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get conversation by ID
   */
  getById(conversationId: string): PortalConversation | null {
    const row = this.db
      .prepare(
        `SELECT id, player_id as playerId, campaign_id as campaignId,
         created_at as createdAt, updated_at as updatedAt
         FROM portal_conversations
         WHERE id = ?`
      )
      .get(conversationId) as PortalConversation | undefined;

    return row || null;
  }

  /**
   * Add message to conversation
   */
  addMessage(message: PortalMessage): void {
    const now = Date.now();

    // Insert message
    this.db
      .prepare(
        `INSERT INTO portal_messages
         (id, conversation_id, player_id, question, response, citations, token_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        message.id,
        message.conversationId,
        message.playerId,
        message.question,
        message.response,
        JSON.stringify(message.citations),
        message.tokenCount,
        now
      );

    // Update conversation updated_at
    this.db
      .prepare(
        `UPDATE portal_conversations
         SET updated_at = ?
         WHERE id = ?`
      )
      .run(now, message.conversationId);
  }

  /**
   * Get conversation history (all messages)
   */
  getHistory(conversationId: string, limit: number = 100): PortalMessage[] {
    const rows = this.db
      .prepare(
        `SELECT id, conversation_id as conversationId, player_id as playerId,
         question, response, citations, token_count as tokenCount, created_at as createdAt
         FROM portal_messages
         WHERE conversation_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(conversationId, limit) as any[];

    return rows.map((row) => ({
      ...row,
      citations: JSON.parse(row.citations) as Citation[],
    }));
  }

  /**
   * Get message by ID
   */
  getMessageById(messageId: string): PortalMessage | null {
    const row = this.db
      .prepare(
        `SELECT id, conversation_id as conversationId, player_id as playerId,
         question, response, citations, token_count as tokenCount, created_at as createdAt
         FROM portal_messages
         WHERE id = ?`
      )
      .get(messageId) as any;

    if (!row) return null;

    return {
      ...row,
      citations: JSON.parse(row.citations) as Citation[],
    };
  }

  /**
   * List all conversations for campaign (for GM monitoring)
   */
  listByCampaign(campaignId: string): PortalConversation[] {
    return this.db
      .prepare(
        `SELECT id, player_id as playerId, campaign_id as campaignId,
         created_at as createdAt, updated_at as updatedAt
         FROM portal_conversations
         WHERE campaign_id = ?
         ORDER BY updated_at DESC`
      )
      .all(campaignId) as PortalConversation[];
  }

  /**
   * Get conversation message count
   */
  getMessageCount(conversationId: string): number {
    const result = this.db
      .prepare(
        `SELECT COUNT(*) as count
         FROM portal_messages
         WHERE conversation_id = ?`
      )
      .get(conversationId) as { count: number };

    return result.count;
  }
}
