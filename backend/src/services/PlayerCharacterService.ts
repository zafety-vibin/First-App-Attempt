/**
 * PlayerCharacterService - Business logic for Player Character operations
 * Feature: 014-create-the-database
 *
 * Implements:
 * - CRUD operations for Player Characters category
 * - JSON array handling for class[], faction_affiliations[], allied_npcs[], tags[]
 * - Campaign ownership validation
 * - Core status management (active, archived, draft, hidden)
 * - Custom fields support
 */

import { db } from './DatabaseService';
import { PlayerCharacter } from '../models/playerCharacter';
import { randomBytes } from 'crypto';

interface CreatePlayerCharacterRequest {
  campaign_id: string;
  name: string;
  description?: string | null;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string | null;
  tags?: string[];
  custom_fields?: Record<string, any>;

  // Category-specific fields
  player_name?: string | null;
  class?: string[] | null;
  level?: number | null;
  race?: string | null;
  background?: string | null;
  personality?: string | null;
  goals?: string | null;
  backstory?: string | null;
  art?: string | null;

  // Many-to-many connections
  faction_affiliations?: string[];
  allied_npcs?: string[];

  // DM-only fields
  dm_secrets?: string | null;
  dm_plot_threads?: string | null;
  dm_true_motivation?: string | null;
  dm_consequences?: string | null;
}

interface UpdatePlayerCharacterRequest {
  name?: string;
  description?: string | null;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string | null;
  tags?: string[];
  custom_fields?: Record<string, any>;

  // Category-specific fields
  player_name?: string | null;
  class?: string[] | null;
  level?: number | null;
  race?: string | null;
  background?: string | null;
  personality?: string | null;
  goals?: string | null;
  backstory?: string | null;
  art?: string | null;

  // Many-to-many connections
  faction_affiliations?: string[];
  allied_npcs?: string[];

  // DM-only fields
  dm_secrets?: string | null;
  dm_plot_threads?: string | null;
  dm_true_motivation?: string | null;
  dm_consequences?: string | null;
}

interface PlayerCharacterRow {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string;
  created_at: number;
  updated_at: number;
  custom_fields: string;

  player_name: string | null;
  class: string | null;
  level: number | null;
  race: string | null;
  background: string | null;
  personality: string | null;
  goals: string | null;
  backstory: string | null;
  art: string | null;

  faction_affiliations: string;
  allied_npcs: string;

  dm_secrets: string | null;
  dm_plot_threads: string | null;
  dm_true_motivation: string | null;
  dm_consequences: string | null;
}

/**
 * Generate unique ID for player character
 */
function generatePlayerCharacterId(): string {
  return `pc_${randomBytes(8).toString('hex')}`;
}

/**
 * Convert database row to PlayerCharacter model
 */
function rowToPlayerCharacter(row: PlayerCharacterRow): PlayerCharacter {
  return {
    id: row.id,
    campaign_id: row.campaign_id,
    name: row.name,
    description: row.description,
    core_status: row.core_status,
    player_knowledge: row.player_knowledge,
    tags: JSON.parse(row.tags) as string[],
    created_at: row.created_at,
    updated_at: row.updated_at,
    custom_fields: JSON.parse(row.custom_fields) as Record<string, any>,

    player_name: row.player_name,
    class: row.class ? JSON.parse(row.class) as string[] : null,
    level: row.level,
    race: row.race,
    background: row.background,
    personality: row.personality,
    goals: row.goals,
    backstory: row.backstory,
    art: row.art,

    faction_affiliations: JSON.parse(row.faction_affiliations) as string[],
    allied_npcs: JSON.parse(row.allied_npcs) as string[],

    dm_secrets: row.dm_secrets,
    dm_plot_threads: row.dm_plot_threads,
    dm_true_motivation: row.dm_true_motivation,
    dm_consequences: row.dm_consequences,
  };
}

/**
 * Convert PlayerCharacter model to database row
 */
function playerCharacterToRow(pc: Partial<PlayerCharacter>): Partial<PlayerCharacterRow> {
  const row: Partial<PlayerCharacterRow> = {};

  if (pc.id !== undefined) row.id = pc.id;
  if (pc.campaign_id !== undefined) row.campaign_id = pc.campaign_id;
  if (pc.name !== undefined) row.name = pc.name;
  if (pc.description !== undefined) row.description = pc.description;
  if (pc.core_status !== undefined) row.core_status = pc.core_status;
  if (pc.player_knowledge !== undefined) row.player_knowledge = pc.player_knowledge;
  if (pc.tags !== undefined) row.tags = JSON.stringify(pc.tags);
  if (pc.created_at !== undefined) row.created_at = pc.created_at;
  if (pc.updated_at !== undefined) row.updated_at = pc.updated_at;
  if (pc.custom_fields !== undefined) row.custom_fields = JSON.stringify(pc.custom_fields);

  if (pc.player_name !== undefined) row.player_name = pc.player_name;
  if (pc.class !== undefined) row.class = pc.class ? JSON.stringify(pc.class) : null;
  if (pc.level !== undefined) row.level = pc.level;
  if (pc.race !== undefined) row.race = pc.race;
  if (pc.background !== undefined) row.background = pc.background;
  if (pc.personality !== undefined) row.personality = pc.personality;
  if (pc.goals !== undefined) row.goals = pc.goals;
  if (pc.backstory !== undefined) row.backstory = pc.backstory;
  if (pc.art !== undefined) row.art = pc.art;

  if (pc.faction_affiliations !== undefined) row.faction_affiliations = JSON.stringify(pc.faction_affiliations);
  if (pc.allied_npcs !== undefined) row.allied_npcs = JSON.stringify(pc.allied_npcs);

  if (pc.dm_secrets !== undefined) row.dm_secrets = pc.dm_secrets;
  if (pc.dm_plot_threads !== undefined) row.dm_plot_threads = pc.dm_plot_threads;
  if (pc.dm_true_motivation !== undefined) row.dm_true_motivation = pc.dm_true_motivation;
  if (pc.dm_consequences !== undefined) row.dm_consequences = pc.dm_consequences;

  return row;
}

export class PlayerCharacterService {
  /**
   * Create new player character
   */
  async createPlayerCharacter(data: CreatePlayerCharacterRequest, ownerId: string): Promise<PlayerCharacter> {
    // Validate campaign ownership
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(data.campaign_id, ownerId);
    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Generate ID and prepare data
    const pcId = generatePlayerCharacterId();
    const now = Math.floor(Date.now() / 1000); // Unix timestamp

    const pcData: PlayerCharacter = {
      id: pcId,
      campaign_id: data.campaign_id,
      name: data.name,
      description: data.description ?? null,
      core_status: data.core_status ?? 'active',
      player_knowledge: data.player_knowledge ?? 'common_knowledge',
      tags: data.tags ?? [],
      created_at: now,
      updated_at: now,
      custom_fields: data.custom_fields ?? {},

      player_name: data.player_name ?? null,
      class: data.class ?? null,
      level: data.level ?? null,
      race: data.race ?? null,
      background: data.background ?? null,
      personality: data.personality ?? null,
      goals: data.goals ?? null,
      backstory: data.backstory ?? null,
      art: data.art ?? null,

      faction_affiliations: data.faction_affiliations ?? [],
      allied_npcs: data.allied_npcs ?? [],

      dm_secrets: data.dm_secrets ?? null,
      dm_plot_threads: data.dm_plot_threads ?? null,
      dm_true_motivation: data.dm_true_motivation ?? null,
      dm_consequences: data.dm_consequences ?? null,
    };

    const row = playerCharacterToRow(pcData);

    // Insert into database
    db.prepare(`
      INSERT INTO player_characters (
        id, campaign_id, name, description, core_status, player_knowledge, tags,
        created_at, updated_at, custom_fields,
        player_name, class, level, race, background, personality, goals, backstory, art,
        faction_affiliations, allied_npcs,
        dm_secrets, dm_plot_threads, dm_true_motivation, dm_consequences
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.id, row.campaign_id, row.name, row.description, row.core_status, row.player_knowledge, row.tags,
      row.created_at, row.updated_at, row.custom_fields,
      row.player_name, row.class, row.level, row.race, row.background, row.personality, row.goals, row.backstory, row.art,
      row.faction_affiliations, row.allied_npcs,
      row.dm_secrets, row.dm_plot_threads, row.dm_true_motivation, row.dm_consequences
    );

    const createdRow = db.prepare('SELECT * FROM player_characters WHERE id = ?').get(pcId) as PlayerCharacterRow;
    return rowToPlayerCharacter(createdRow);
  }

  /**
   * Get player character by ID
   */
  async getPlayerCharacterById(id: string, ownerId: string): Promise<PlayerCharacter | null> {
    const row = db.prepare(`
      SELECT pc.* FROM player_characters pc
      JOIN campaigns c ON pc.campaign_id = c.id
      WHERE pc.id = ? AND c.owner_id = ?
    `).get(id, ownerId) as PlayerCharacterRow | undefined;

    return row ? rowToPlayerCharacter(row) : null;
  }

  /**
   * Get all player characters for a campaign
   */
  async getPlayerCharactersByCampaign(campaignId: string, ownerId: string): Promise<PlayerCharacter[]> {
    // Validate campaign ownership
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(campaignId, ownerId);
    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    const rows = db.prepare(`
      SELECT * FROM player_characters
      WHERE campaign_id = ?
      ORDER BY created_at DESC
    `).all(campaignId) as PlayerCharacterRow[];

    return rows.map(rowToPlayerCharacter);
  }

  /**
   * Update player character
   */
  async updatePlayerCharacter(id: string, data: UpdatePlayerCharacterRequest, ownerId: string): Promise<PlayerCharacter> {
    // Validate ownership
    const existing = await this.getPlayerCharacterById(id, ownerId);
    if (!existing) {
      throw new Error('Player character not found or access denied');
    }

    const now = Math.floor(Date.now() / 1000);
    const updates: string[] = [];
    const values: any[] = [];

    // Build dynamic UPDATE query
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.core_status !== undefined) {
      updates.push('core_status = ?');
      values.push(data.core_status);
    }
    if (data.player_knowledge !== undefined) {
      updates.push('player_knowledge = ?');
      values.push(data.player_knowledge);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(data.tags));
    }
    if (data.custom_fields !== undefined) {
      updates.push('custom_fields = ?');
      values.push(JSON.stringify(data.custom_fields));
    }

    // Category-specific fields
    if (data.player_name !== undefined) {
      updates.push('player_name = ?');
      values.push(data.player_name);
    }
    if (data.class !== undefined) {
      updates.push('class = ?');
      values.push(data.class ? JSON.stringify(data.class) : null);
    }
    if (data.level !== undefined) {
      updates.push('level = ?');
      values.push(data.level);
    }
    if (data.race !== undefined) {
      updates.push('race = ?');
      values.push(data.race);
    }
    if (data.background !== undefined) {
      updates.push('background = ?');
      values.push(data.background);
    }
    if (data.personality !== undefined) {
      updates.push('personality = ?');
      values.push(data.personality);
    }
    if (data.goals !== undefined) {
      updates.push('goals = ?');
      values.push(data.goals);
    }
    if (data.backstory !== undefined) {
      updates.push('backstory = ?');
      values.push(data.backstory);
    }
    if (data.art !== undefined) {
      updates.push('art = ?');
      values.push(data.art);
    }

    // Many-to-many connections
    if (data.faction_affiliations !== undefined) {
      updates.push('faction_affiliations = ?');
      values.push(JSON.stringify(data.faction_affiliations));
    }
    if (data.allied_npcs !== undefined) {
      updates.push('allied_npcs = ?');
      values.push(JSON.stringify(data.allied_npcs));
    }

    // DM-only fields
    if (data.dm_secrets !== undefined) {
      updates.push('dm_secrets = ?');
      values.push(data.dm_secrets);
    }
    if (data.dm_plot_threads !== undefined) {
      updates.push('dm_plot_threads = ?');
      values.push(data.dm_plot_threads);
    }
    if (data.dm_true_motivation !== undefined) {
      updates.push('dm_true_motivation = ?');
      values.push(data.dm_true_motivation);
    }
    if (data.dm_consequences !== undefined) {
      updates.push('dm_consequences = ?');
      values.push(data.dm_consequences);
    }

    // Always update updated_at
    updates.push('updated_at = ?');
    values.push(now);

    if (updates.length === 1) {
      // Only updated_at changed, no actual updates
      return existing;
    }

    // Add id to values for WHERE clause
    values.push(id);

    // Execute update
    db.prepare(`
      UPDATE player_characters
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    const updatedRow = db.prepare('SELECT * FROM player_characters WHERE id = ?').get(id) as PlayerCharacterRow;
    return rowToPlayerCharacter(updatedRow);
  }

  /**
   * Delete player character
   */
  async deletePlayerCharacter(id: string, ownerId: string): Promise<void> {
    // Validate ownership
    const existing = await this.getPlayerCharacterById(id, ownerId);
    if (!existing) {
      throw new Error('Player character not found or access denied');
    }

    // Check for references in items table
    const itemReferences = db.prepare(`
      SELECT COUNT(*) as count FROM items WHERE owner_pc_id = ?
    `).get(id) as { count: number };

    if (itemReferences.count > 0) {
      throw new Error(`Cannot delete player character: referenced by ${itemReferences.count} item(s)`);
    }

    // Delete player character
    db.prepare('DELETE FROM player_characters WHERE id = ?').run(id);
  }

  /**
   * Get player characters by core status
   */
  async getPlayerCharactersByStatus(
    campaignId: string,
    coreStatus: 'active' | 'archived' | 'draft' | 'hidden',
    ownerId: string
  ): Promise<PlayerCharacter[]> {
    // Validate campaign ownership
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(campaignId, ownerId);
    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    const rows = db.prepare(`
      SELECT * FROM player_characters
      WHERE campaign_id = ? AND core_status = ?
      ORDER BY created_at DESC
    `).all(campaignId, coreStatus) as PlayerCharacterRow[];

    return rows.map(rowToPlayerCharacter);
  }

  /**
   * Search player characters by name or player_name
   */
  async searchPlayerCharacters(campaignId: string, query: string, ownerId: string): Promise<PlayerCharacter[]> {
    // Validate campaign ownership
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(campaignId, ownerId);
    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    const searchPattern = `%${query}%`;
    const rows = db.prepare(`
      SELECT * FROM player_characters
      WHERE campaign_id = ? AND (name LIKE ? OR player_name LIKE ?)
      ORDER BY created_at DESC
    `).all(campaignId, searchPattern, searchPattern) as PlayerCharacterRow[];

    return rows.map(rowToPlayerCharacter);
  }
}
