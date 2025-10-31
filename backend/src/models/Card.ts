/**
 * Card model - Polymorphic content unit (Notion-inspired)
 * Based on: specs/003-create-a-notion/data-model.md
 * Feature: 003-create-a-notion
 * Extended in Feature: 004-create-a-tagging (added information_level_id)
 *
 * Supports infinite nesting via adjacency list + materialized path.
 */

import { Card, CardType } from '../shared/types/Card';

/**
 * Database row type for Cards table
 */
export interface CardRow {
  id: string;
  type: CardType;
  parent_id: string | null;
  campaign_id: string;
  path: string;
  position: number;
  depth: number;
  title: string | null;
  content: string | null; // JSONB stored as string
  metadata: string | null; // JSONB stored as string
  cover_image_url: string | null;
  icon_emoji: string | null;
  information_level_id: string; // Feature 004: FK to information_levels
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

/**
 * Transform database row to Card entity
 */
export function rowToCard(row: CardRow): Card {
  // Parse JSON fields
  const content = row.content ? JSON.parse(row.content) : null;
  const metadata = row.metadata ? JSON.parse(row.metadata) : null;

  const baseCard = {
    id: row.id,
    type: row.type,
    parentId: row.parent_id,
    campaignId: row.campaign_id,
    path: row.path,
    position: row.position,
    depth: row.depth,
    title: row.title,
    content,
    metadata,
    coverImageUrl: row.cover_image_url,
    iconEmoji: row.icon_emoji,
    informationLevelId: row.information_level_id, // Feature 004
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };

  // Return typed card based on type discriminator
  return baseCard as Card;
}

/**
 * Transform Card entity to database row
 */
export function cardToRow(card: Partial<Card>): Partial<CardRow> {
  const row: Partial<CardRow> = {};

  if (card.id !== undefined) row.id = card.id;
  if (card.type !== undefined) row.type = card.type;
  if (card.parentId !== undefined) row.parent_id = card.parentId;
  if (card.campaignId !== undefined) row.campaign_id = card.campaignId;
  if (card.path !== undefined) row.path = card.path;
  if (card.position !== undefined) row.position = card.position;
  if (card.depth !== undefined) row.depth = card.depth;
  if (card.title !== undefined) row.title = card.title;

  // Serialize JSON fields
  if (card.content !== undefined) {
    row.content = card.content ? JSON.stringify(card.content) : null;
  }
  if (card.metadata !== undefined) {
    row.metadata = card.metadata ? JSON.stringify(card.metadata) : null;
  }

  if (card.coverImageUrl !== undefined) row.cover_image_url = card.coverImageUrl;
  if (card.iconEmoji !== undefined) row.icon_emoji = card.iconEmoji;
  if (card.informationLevelId !== undefined) row.information_level_id = card.informationLevelId; // Feature 004

  if (card.createdAt !== undefined)
    row.created_at = Math.floor(card.createdAt.getTime() / 1000);
  if (card.updatedAt !== undefined)
    row.updated_at = Math.floor(card.updatedAt.getTime() / 1000);

  return row;
}

/**
 * Generate UUID v4 for new cards
 */
export function generateCardId(): string {
  return crypto.randomUUID();
}
