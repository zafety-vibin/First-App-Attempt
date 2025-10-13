/**
 * CreatureService - Business logic for creature operations
 * Feature: 014-create-the-database
 *
 * Implements:
 * - CRUD operations for creatures (category table)
 * - JSON array handling for habitats (location IDs)
 * - Campaign ownership validation
 * - Tag management
 * - Custom fields support
 */

import Database from 'better-sqlite3';
import { Creature } from '../models/creature';

export class CreatureService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Create new creature with campaign validation
   */
  async createCreature(data: Omit<Creature, 'id' | 'created_at' | 'updated_at'>, ownerId: string): Promise<Creature> {
    // Validate campaign ownership
    const campaign = this.db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(data.campaign_id, ownerId);
    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Validate habitats reference valid location IDs
    if (data.habitats && data.habitats.length > 0) {
      const placeholders = data.habitats.map(() => '?').join(',');
      const locations = this.db.prepare(`
        SELECT id FROM locations WHERE id IN (${placeholders}) AND campaign_id = ?
      `).all(...data.habitats, data.campaign_id) as { id: string }[];

      if (locations.length !== data.habitats.length) {
        throw new Error('One or more habitat location IDs are invalid');
      }
    }

    // Generate ID and timestamps
    const id = this.generateId();
    const now = Date.now();

    const creature: Creature = {
      id,
      campaign_id: data.campaign_id,
      name: data.name,
      description: data.description || null,
      core_status: data.core_status || 'draft',
      player_knowledge: data.player_knowledge || null,
      tags: data.tags || [],
      created_at: now,
      updated_at: now,
      custom_fields: data.custom_fields || {},
      creature_type: data.creature_type || null,
      challenge_rating: data.challenge_rating || null,
      abilities: data.abilities || null,
      habitats: data.habitats || [],
      dm_behavior_notes: data.dm_behavior_notes || null,
    };

    // Insert into database
    this.db.prepare(`
      INSERT INTO creatures (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        creature_type, challenge_rating, abilities, habitats, dm_behavior_notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      creature.id,
      creature.campaign_id,
      creature.name,
      creature.description,
      creature.core_status,
      creature.player_knowledge,
      JSON.stringify(creature.tags),
      creature.created_at,
      creature.updated_at,
      JSON.stringify(creature.custom_fields),
      creature.creature_type,
      creature.challenge_rating,
      creature.abilities,
      JSON.stringify(creature.habitats),
      creature.dm_behavior_notes
    );

    return creature;
  }

  /**
   * Get creature by ID with campaign ownership validation
   */
  async getCreatureById(id: string, ownerId: string): Promise<Creature | null> {
    const row = this.db.prepare(`
      SELECT c.*
      FROM creatures c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(id, ownerId);

    if (!row) {
      return null;
    }

    return this.rowToCreature(row as any);
  }

  /**
   * Get all creatures for a campaign
   */
  async getCreaturesByCampaignId(campaignId: string, ownerId: string): Promise<Creature[]> {
    // Validate campaign ownership
    const campaign = this.db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(campaignId, ownerId);
    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    const rows = this.db.prepare(`
      SELECT * FROM creatures WHERE campaign_id = ? ORDER BY name ASC
    `).all(campaignId);

    return rows.map(row => this.rowToCreature(row as any));
  }

  /**
   * Update creature with campaign ownership validation
   */
  async updateCreature(
    id: string,
    updates: Partial<Omit<Creature, 'id' | 'campaign_id' | 'created_at' | 'updated_at'>>,
    ownerId: string
  ): Promise<Creature> {
    // Validate ownership
    const existing = await this.getCreatureById(id, ownerId);
    if (!existing) {
      throw new Error('Creature not found or access denied');
    }

    // Validate habitats if provided
    if (updates.habitats && updates.habitats.length > 0) {
      const placeholders = updates.habitats.map(() => '?').join(',');
      const locations = this.db.prepare(`
        SELECT id FROM locations WHERE id IN (${placeholders}) AND campaign_id = ?
      `).all(...updates.habitats, existing.campaign_id) as { id: string }[];

      if (locations.length !== updates.habitats.length) {
        throw new Error('One or more habitat location IDs are invalid');
      }
    }

    // Build dynamic UPDATE query
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.core_status !== undefined) {
      fields.push('core_status = ?');
      values.push(updates.core_status);
    }
    if (updates.player_knowledge !== undefined) {
      fields.push('player_knowledge = ?');
      values.push(updates.player_knowledge);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.custom_fields !== undefined) {
      fields.push('custom_fields = ?');
      values.push(JSON.stringify(updates.custom_fields));
    }
    if (updates.creature_type !== undefined) {
      fields.push('creature_type = ?');
      values.push(updates.creature_type);
    }
    if (updates.challenge_rating !== undefined) {
      fields.push('challenge_rating = ?');
      values.push(updates.challenge_rating);
    }
    if (updates.abilities !== undefined) {
      fields.push('abilities = ?');
      values.push(updates.abilities);
    }
    if (updates.habitats !== undefined) {
      fields.push('habitats = ?');
      values.push(JSON.stringify(updates.habitats));
    }
    if (updates.dm_behavior_notes !== undefined) {
      fields.push('dm_behavior_notes = ?');
      values.push(updates.dm_behavior_notes);
    }

    // Always update updated_at
    fields.push('updated_at = ?');
    values.push(Date.now());

    values.push(id);

    this.db.prepare(`
      UPDATE creatures SET ${fields.join(', ')} WHERE id = ?
    `).run(...values);

    // Fetch updated creature
    const updated = await this.getCreatureById(id, ownerId);
    if (!updated) {
      throw new Error('Failed to retrieve updated creature');
    }

    return updated;
  }

  /**
   * Delete creature with campaign ownership validation
   */
  async deleteCreature(id: string, ownerId: string): Promise<void> {
    // Validate ownership
    const existing = await this.getCreatureById(id, ownerId);
    if (!existing) {
      throw new Error('Creature not found or access denied');
    }

    this.db.prepare('DELETE FROM creatures WHERE id = ?').run(id);
  }

  /**
   * Search creatures by name, type, or tags
   */
  async searchCreatures(campaignId: string, query: string, ownerId: string): Promise<Creature[]> {
    // Validate campaign ownership
    const campaign = this.db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(campaignId, ownerId);
    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    const searchPattern = `%${query}%`;
    const rows = this.db.prepare(`
      SELECT * FROM creatures
      WHERE campaign_id = ?
        AND (
          name LIKE ?
          OR creature_type LIKE ?
          OR tags LIKE ?
        )
      ORDER BY name ASC
    `).all(campaignId, searchPattern, searchPattern, searchPattern);

    return rows.map(row => this.rowToCreature(row as any));
  }

  /**
   * Get creatures by habitat (location ID)
   */
  async getCreaturesByHabitat(campaignId: string, locationId: string, ownerId: string): Promise<Creature[]> {
    // Validate campaign ownership
    const campaign = this.db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(campaignId, ownerId);
    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    const rows = this.db.prepare(`
      SELECT * FROM creatures WHERE campaign_id = ? ORDER BY name ASC
    `).all(campaignId);

    // Filter by habitat in-memory (SQLite JSON querying is limited)
    const creatures = rows.map(row => this.rowToCreature(row as any));
    return creatures.filter(c => c.habitats.includes(locationId));
  }

  /**
   * Get creatures by core_status
   */
  async getCreaturesByStatus(
    campaignId: string,
    status: 'active' | 'archived' | 'draft' | 'hidden',
    ownerId: string
  ): Promise<Creature[]> {
    // Validate campaign ownership
    const campaign = this.db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(campaignId, ownerId);
    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    const rows = this.db.prepare(`
      SELECT * FROM creatures WHERE campaign_id = ? AND core_status = ? ORDER BY name ASC
    `).all(campaignId, status);

    return rows.map(row => this.rowToCreature(row as any));
  }

  /**
   * Convert database row to Creature model
   */
  private rowToCreature(row: any): Creature {
    return {
      id: row.id,
      campaign_id: row.campaign_id,
      name: row.name,
      description: row.description,
      core_status: row.core_status,
      player_knowledge: row.player_knowledge,
      tags: JSON.parse(row.tags || '[]'),
      created_at: row.created_at,
      updated_at: row.updated_at,
      custom_fields: JSON.parse(row.custom_fields || '{}'),
      creature_type: row.creature_type,
      challenge_rating: row.challenge_rating,
      abilities: row.abilities,
      habitats: JSON.parse(row.habitats || '[]'),
      dm_behavior_notes: row.dm_behavior_notes,
    };
  }

  /**
   * Generate unique ID for creature
   */
  private generateId(): string {
    return `creature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
