/**
 * LoreEntryService - Business logic for lore entry operations
 * Feature: 014-create-the-database
 *
 * Implements:
 * - Standard CRUD operations for lore entries
 * - JSON array handling for many-to-many relationships
 * - No foreign key validation (relationships via JSON arrays only)
 * - Campaign ownership validation
 * - Information level filtering support
 */

import { db } from './DatabaseService';
import { LoreEntry } from '../models/loreEntry';
import { randomBytes } from 'crypto';

/**
 * Database row representation (matches SQLite schema exactly)
 */
interface LoreEntryRow {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: string;
  player_knowledge: string | null;
  tags: string; // JSON array
  created_at: number;
  updated_at: number;
  custom_fields: string; // JSON object

  // Category-specific fields
  category: string | null;
  era_period: string | null;
  in_game_date: string | null;
  historical_accuracy: string | null;

  // Many-to-many connections (JSON arrays)
  related_npcs: string; // JSON array
  related_locations: string; // JSON array
  related_factions: string; // JSON array
}

/**
 * Create request payload
 */
export interface CreateLoreEntryRequest {
  campaign_id: string;
  name: string;
  description?: string | null;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string | null;
  tags?: string[];
  custom_fields?: Record<string, any>;

  // Category-specific fields
  category?: string | null;
  era_period?: string | null;
  in_game_date?: string | null;
  historical_accuracy?: string | null;

  // Many-to-many connections
  related_npcs?: string[];
  related_locations?: string[];
  related_factions?: string[];
}

/**
 * Update request payload
 */
export interface UpdateLoreEntryRequest {
  name?: string;
  description?: string | null;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string | null;
  tags?: string[];
  custom_fields?: Record<string, any>;

  // Category-specific fields
  category?: string | null;
  era_period?: string | null;
  in_game_date?: string | null;
  historical_accuracy?: string | null;

  // Many-to-many connections
  related_npcs?: string[];
  related_locations?: string[];
  related_factions?: string[];
}

/**
 * List query filters
 */
export interface LoreEntryListFilters {
  campaign_id: string;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string;
  tags?: string[];
  category?: string;
  limit?: number;
  offset?: number;
}

export class LoreEntryService {
  /**
   * Generate unique ID for lore entry
   */
  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Convert database row to LoreEntry model
   */
  private rowToModel(row: LoreEntryRow): LoreEntry {
    return {
      id: row.id,
      campaign_id: row.campaign_id,
      name: row.name,
      description: row.description,
      core_status: row.core_status as 'active' | 'archived' | 'draft' | 'hidden',
      player_knowledge: row.player_knowledge,
      tags: JSON.parse(row.tags),
      created_at: row.created_at,
      updated_at: row.updated_at,
      custom_fields: JSON.parse(row.custom_fields),

      // Category-specific fields
      category: row.category,
      era_period: row.era_period,
      in_game_date: row.in_game_date,
      historical_accuracy: row.historical_accuracy,

      // Many-to-many connections
      related_npcs: JSON.parse(row.related_npcs),
      related_locations: JSON.parse(row.related_locations),
      related_factions: JSON.parse(row.related_factions),
    };
  }

  /**
   * Validate campaign exists
   */
  private validateCampaign(campaignId: string): void {
    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
  }

  /**
   * Create new lore entry
   */
  create(data: CreateLoreEntryRequest): LoreEntry {
    // Validate campaign exists
    this.validateCampaign(data.campaign_id);

    const id = this.generateId();
    const now = Math.floor(Date.now() / 1000);

    // Prepare data with defaults
    const loreEntry = {
      id,
      campaign_id: data.campaign_id,
      name: data.name,
      description: data.description || null,
      core_status: data.core_status || 'active',
      player_knowledge: data.player_knowledge || 'common_knowledge',
      tags: JSON.stringify(data.tags || []),
      created_at: now,
      updated_at: now,
      custom_fields: JSON.stringify(data.custom_fields || {}),

      // Category-specific fields
      category: data.category || null,
      era_period: data.era_period || null,
      in_game_date: data.in_game_date || null,
      historical_accuracy: data.historical_accuracy || null,

      // Many-to-many connections
      related_npcs: JSON.stringify(data.related_npcs || []),
      related_locations: JSON.stringify(data.related_locations || []),
      related_factions: JSON.stringify(data.related_factions || []),
    };

    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO lore_entries (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        category, era_period, in_game_date, historical_accuracy,
        related_npcs, related_locations, related_factions
      )
      VALUES (
        @id, @campaign_id, @name, @description, @core_status, @player_knowledge,
        @tags, @created_at, @updated_at, @custom_fields,
        @category, @era_period, @in_game_date, @historical_accuracy,
        @related_npcs, @related_locations, @related_factions
      )
    `);

    stmt.run(loreEntry);

    // Fetch and return created lore entry
    const row = db.prepare('SELECT * FROM lore_entries WHERE id = ?').get(id) as LoreEntryRow;
    return this.rowToModel(row);
  }

  /**
   * Find lore entry by ID
   */
  findById(id: string): LoreEntry | null {
    const row = db.prepare('SELECT * FROM lore_entries WHERE id = ?').get(id) as LoreEntryRow | undefined;
    return row ? this.rowToModel(row) : null;
  }

  /**
   * List lore entries with filters
   */
  list(filters: LoreEntryListFilters): LoreEntry[] {
    let query = 'SELECT * FROM lore_entries WHERE campaign_id = ?';
    const params: any[] = [filters.campaign_id];

    // Apply filters
    if (filters.core_status) {
      query += ' AND core_status = ?';
      params.push(filters.core_status);
    }

    if (filters.player_knowledge) {
      query += ' AND player_knowledge = ?';
      params.push(filters.player_knowledge);
    }

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.tags && filters.tags.length > 0) {
      // Use JSON_EXTRACT for tag filtering
      const tagConditions = filters.tags.map(() => 'tags LIKE ?').join(' OR ');
      query += ` AND (${tagConditions})`;
      filters.tags.forEach(tag => {
        params.push(`%"${tag}"%`);
      });
    }

    // Default ordering by created_at descending
    query += ' ORDER BY created_at DESC';

    // Apply pagination
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = db.prepare(query).all(...params) as LoreEntryRow[];
    return rows.map(row => this.rowToModel(row));
  }

  /**
   * Update lore entry
   */
  update(id: string, data: UpdateLoreEntryRequest): LoreEntry {
    // Check if lore entry exists
    const existing = this.findById(id);
    if (!existing) {
      throw new Error('Lore entry not found');
    }

    const now = Math.floor(Date.now() / 1000);

    // Build dynamic UPDATE query
    const updates: string[] = [];
    const params: any = { id };

    if (data.name !== undefined) {
      updates.push('name = @name');
      params.name = data.name;
    }

    if (data.description !== undefined) {
      updates.push('description = @description');
      params.description = data.description;
    }

    if (data.core_status !== undefined) {
      updates.push('core_status = @core_status');
      params.core_status = data.core_status;
    }

    if (data.player_knowledge !== undefined) {
      updates.push('player_knowledge = @player_knowledge');
      params.player_knowledge = data.player_knowledge;
    }

    if (data.tags !== undefined) {
      updates.push('tags = @tags');
      params.tags = JSON.stringify(data.tags);
    }

    if (data.custom_fields !== undefined) {
      updates.push('custom_fields = @custom_fields');
      params.custom_fields = JSON.stringify(data.custom_fields);
    }

    // Category-specific fields
    if (data.category !== undefined) {
      updates.push('category = @category');
      params.category = data.category;
    }

    if (data.era_period !== undefined) {
      updates.push('era_period = @era_period');
      params.era_period = data.era_period;
    }

    if (data.in_game_date !== undefined) {
      updates.push('in_game_date = @in_game_date');
      params.in_game_date = data.in_game_date;
    }

    if (data.historical_accuracy !== undefined) {
      updates.push('historical_accuracy = @historical_accuracy');
      params.historical_accuracy = data.historical_accuracy;
    }

    // Many-to-many connections
    if (data.related_npcs !== undefined) {
      updates.push('related_npcs = @related_npcs');
      params.related_npcs = JSON.stringify(data.related_npcs);
    }

    if (data.related_locations !== undefined) {
      updates.push('related_locations = @related_locations');
      params.related_locations = JSON.stringify(data.related_locations);
    }

    if (data.related_factions !== undefined) {
      updates.push('related_factions = @related_factions');
      params.related_factions = JSON.stringify(data.related_factions);
    }

    // Always update updated_at
    updates.push('updated_at = @updated_at');
    params.updated_at = now;

    if (updates.length === 1) {
      // Only updated_at changed, no-op
      return existing;
    }

    // Execute update
    const query = `UPDATE lore_entries SET ${updates.join(', ')} WHERE id = @id`;
    db.prepare(query).run(params);

    // Fetch and return updated lore entry
    const row = db.prepare('SELECT * FROM lore_entries WHERE id = ?').get(id) as LoreEntryRow;
    return this.rowToModel(row);
  }

  /**
   * Delete lore entry
   */
  delete(id: string): void {
    const result = db.prepare('DELETE FROM lore_entries WHERE id = ?').run(id);

    if (result.changes === 0) {
      throw new Error('Lore entry not found');
    }
  }

  /**
   * Count lore entries for a campaign
   */
  count(campaignId: string, filters?: { core_status?: string; player_knowledge?: string }): number {
    let query = 'SELECT COUNT(*) as count FROM lore_entries WHERE campaign_id = ?';
    const params: any[] = [campaignId];

    if (filters?.core_status) {
      query += ' AND core_status = ?';
      params.push(filters.core_status);
    }

    if (filters?.player_knowledge) {
      query += ' AND player_knowledge = ?';
      params.push(filters.player_knowledge);
    }

    const result = db.prepare(query).get(...params) as { count: number };
    return result.count;
  }
}
