/**
 * Setting model - Represents a world/universe container
 * Based on: specs/003-create-a-notion/data-model.md
 * Feature: 003-create-a-notion
 */

import { Setting } from '../shared/types/Setting';

/**
 * Database row type for Settings table
 */
export interface SettingRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

/**
 * Transform database row to Setting entity
 */
export function rowToSetting(row: SettingRow): Setting {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };
}

/**
 * Transform Setting entity to database row
 */
export function settingToRow(setting: Partial<Setting>): Partial<SettingRow> {
  const row: Partial<SettingRow> = {};

  if (setting.id !== undefined) row.id = setting.id;
  if (setting.ownerId !== undefined) row.owner_id = setting.ownerId;
  if (setting.name !== undefined) row.name = setting.name;
  if (setting.description !== undefined) row.description = setting.description;
  if (setting.createdAt !== undefined)
    row.created_at = Math.floor(setting.createdAt.getTime() / 1000);
  if (setting.updatedAt !== undefined)
    row.updated_at = Math.floor(setting.updatedAt.getTime() / 1000);

  return row;
}
