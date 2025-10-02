/**
 * InformationLevel model - Represents visibility classification for cards
 * Based on: specs/004-create-a-tagging/data-model.md
 * Feature: 004-create-a-tagging
 * Task: T017
 */

import { InformationLevel } from '../../shared/types/InformationLevel';

/**
 * Database row type for information_levels table
 */
export interface InformationLevelRow {
  id: string; // UUID for custom, hardcoded string for defaults
  name: string;
  color: string;
  hierarchical: number; // SQLite boolean (0 or 1)
  type: 'default' | 'custom';
  campaign_id: string | null; // NULL for default levels
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

/**
 * Transform database row to InformationLevel entity
 */
export function rowToInformationLevel(row: InformationLevelRow): InformationLevel {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    hierarchical: row.hierarchical === 1,
    type: row.type,
    campaignId: row.campaign_id,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };
}

/**
 * Transform InformationLevel entity to database row
 */
export function informationLevelToRow(
  level: Partial<InformationLevel>
): Partial<InformationLevelRow> {
  const row: Partial<InformationLevelRow> = {};

  if (level.id !== undefined) row.id = level.id;
  if (level.name !== undefined) row.name = level.name;
  if (level.color !== undefined) row.color = level.color;
  if (level.hierarchical !== undefined) row.hierarchical = level.hierarchical ? 1 : 0;
  if (level.type !== undefined) row.type = level.type;
  if (level.campaignId !== undefined) row.campaign_id = level.campaignId;
  if (level.createdAt !== undefined)
    row.created_at = Math.floor(level.createdAt.getTime() / 1000);
  if (level.updatedAt !== undefined)
    row.updated_at = Math.floor(level.updatedAt.getTime() / 1000);

  return row;
}
