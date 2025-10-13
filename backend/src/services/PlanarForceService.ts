/**
 * PlanarForceService - Business logic for planar force operations
 * Feature: 014-create-the-database
 *
 * Implements:
 * - CRUD operations for planar forces
 * - Campaign ownership validation
 * - Foreign key validation (high_priest_id → npcs.id)
 * - JSON array handling (domains, allied_entities, rival_entities, religious_orders, tags)
 * - Transaction support for atomic operations
 */

import { db } from './DatabaseService';
import { PlanarForce } from '../models/planarForce';

export interface CreatePlanarForceRequest {
  campaign_id: string;
  name: string;
  description?: string;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string;
  tags?: string[];
  entity_type?: string;
  domains?: string[];
  alignment?: string;
  worshiper_base?: string;
  plane_of_origin?: string;
  base_of_power?: string;
  high_priest_id?: string;
  allied_entities?: string[];
  rival_entities?: string[];
  religious_orders?: string[];
  dm_true_nature?: string;
  custom_fields?: Record<string, any>;
}

export interface UpdatePlanarForceRequest {
  name?: string;
  description?: string;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string;
  tags?: string[];
  entity_type?: string;
  domains?: string[];
  alignment?: string;
  worshiper_base?: string;
  plane_of_origin?: string;
  base_of_power?: string;
  high_priest_id?: string;
  allied_entities?: string[];
  rival_entities?: string[];
  religious_orders?: string[];
  dm_true_nature?: string;
  custom_fields?: Record<string, any>;
}

interface PlanarForceRow {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: string;
  player_knowledge: string | null;
  tags: string;
  created_at: number;
  updated_at: number;
  custom_fields: string;
  entity_type: string | null;
  domains: string | null;
  alignment: string | null;
  worshiper_base: string | null;
  plane_of_origin: string | null;
  base_of_power: string | null;
  high_priest_id: string | null;
  allied_entities: string;
  rival_entities: string;
  religious_orders: string;
  dm_true_nature: string | null;
}

export class PlanarForceService {
  /**
   * Create a new planar force with validation
   */
  async create(data: CreatePlanarForceRequest, ownerId: string): Promise<PlanarForce> {
    // Validate campaign ownership
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(data.campaign_id, ownerId);

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Validate high_priest_id FK if provided
    if (data.high_priest_id) {
      const npc = db
        .prepare('SELECT id FROM npcs WHERE id = ? AND campaign_id = ?')
        .get(data.high_priest_id, data.campaign_id);

      if (!npc) {
        throw new Error('High Priest NPC not found in this campaign');
      }
    }

    // Generate ID and timestamps
    const id = this.generateId();
    const now = Math.floor(Date.now() / 1000);

    // Prepare JSON arrays
    const tags = JSON.stringify(data.tags || []);
    const domains = data.domains ? JSON.stringify(data.domains) : null;
    const allied_entities = JSON.stringify(data.allied_entities || []);
    const rival_entities = JSON.stringify(data.rival_entities || []);
    const religious_orders = JSON.stringify(data.religious_orders || []);
    const custom_fields = JSON.stringify(data.custom_fields || {});

    // Insert planar force
    db.prepare(`
      INSERT INTO planar_forces (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        entity_type, domains, alignment, worshiper_base, plane_of_origin, base_of_power,
        high_priest_id, allied_entities, rival_entities, religious_orders,
        dm_true_nature
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.campaign_id,
      data.name,
      data.description || null,
      data.core_status || 'active',
      data.player_knowledge || 'common_knowledge',
      tags,
      now,
      now,
      custom_fields,
      data.entity_type || null,
      domains,
      data.alignment || null,
      data.worshiper_base || null,
      data.plane_of_origin || null,
      data.base_of_power || null,
      data.high_priest_id || null,
      allied_entities,
      rival_entities,
      religious_orders,
      data.dm_true_nature || null
    );

    const row = db.prepare('SELECT * FROM planar_forces WHERE id = ?').get(id) as PlanarForceRow;
    return this.rowToPlanarForce(row);
  }

  /**
   * Get planar force by ID with ownership validation
   */
  async getById(id: string, ownerId: string): Promise<PlanarForce | null> {
    const row = db.prepare(`
      SELECT pf.* FROM planar_forces pf
      JOIN campaigns c ON pf.campaign_id = c.id
      WHERE pf.id = ? AND c.owner_id = ?
    `).get(id, ownerId) as PlanarForceRow | undefined;

    return row ? this.rowToPlanarForce(row) : null;
  }

  /**
   * Get all planar forces for a campaign
   */
  async getByCampaign(campaignId: string, ownerId: string): Promise<PlanarForce[]> {
    // Validate campaign ownership
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaignId, ownerId);

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    const rows = db.prepare(`
      SELECT * FROM planar_forces
      WHERE campaign_id = ?
      ORDER BY name ASC
    `).all(campaignId) as PlanarForceRow[];

    return rows.map(row => this.rowToPlanarForce(row));
  }

  /**
   * Update planar force with validation
   */
  async update(id: string, data: UpdatePlanarForceRequest, ownerId: string): Promise<PlanarForce> {
    // Get planar force and validate ownership
    const planarForce = await this.getById(id, ownerId);
    if (!planarForce) {
      throw new Error('Planar Force not found or access denied');
    }

    // Validate high_priest_id FK if provided
    if (data.high_priest_id !== undefined) {
      if (data.high_priest_id !== null) {
        const npc = db
          .prepare('SELECT id FROM npcs WHERE id = ? AND campaign_id = ?')
          .get(data.high_priest_id, planarForce.campaign_id);

        if (!npc) {
          throw new Error('High Priest NPC not found in this campaign');
        }
      }
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
    if (data.entity_type !== undefined) {
      updates.push('entity_type = ?');
      values.push(data.entity_type);
    }
    if (data.domains !== undefined) {
      updates.push('domains = ?');
      values.push(data.domains ? JSON.stringify(data.domains) : null);
    }
    if (data.alignment !== undefined) {
      updates.push('alignment = ?');
      values.push(data.alignment);
    }
    if (data.worshiper_base !== undefined) {
      updates.push('worshiper_base = ?');
      values.push(data.worshiper_base);
    }
    if (data.plane_of_origin !== undefined) {
      updates.push('plane_of_origin = ?');
      values.push(data.plane_of_origin);
    }
    if (data.base_of_power !== undefined) {
      updates.push('base_of_power = ?');
      values.push(data.base_of_power);
    }
    if (data.high_priest_id !== undefined) {
      updates.push('high_priest_id = ?');
      values.push(data.high_priest_id);
    }
    if (data.allied_entities !== undefined) {
      updates.push('allied_entities = ?');
      values.push(JSON.stringify(data.allied_entities));
    }
    if (data.rival_entities !== undefined) {
      updates.push('rival_entities = ?');
      values.push(JSON.stringify(data.rival_entities));
    }
    if (data.religious_orders !== undefined) {
      updates.push('religious_orders = ?');
      values.push(JSON.stringify(data.religious_orders));
    }
    if (data.dm_true_nature !== undefined) {
      updates.push('dm_true_nature = ?');
      values.push(data.dm_true_nature);
    }
    if (data.custom_fields !== undefined) {
      updates.push('custom_fields = ?');
      values.push(JSON.stringify(data.custom_fields));
    }

    // Always update timestamp
    updates.push('updated_at = ?');
    values.push(now);

    if (updates.length === 1) {
      // Only timestamp would be updated, return unchanged
      return planarForce;
    }

    // Add id for WHERE clause
    values.push(id);

    db.prepare(`
      UPDATE planar_forces
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    const row = db.prepare('SELECT * FROM planar_forces WHERE id = ?').get(id) as PlanarForceRow;
    return this.rowToPlanarForce(row);
  }

  /**
   * Delete planar force (CASCADE handled by FK constraints)
   */
  async delete(id: string, ownerId: string): Promise<void> {
    // Validate ownership
    const planarForce = await this.getById(id, ownerId);
    if (!planarForce) {
      throw new Error('Planar Force not found or access denied');
    }

    db.prepare('DELETE FROM planar_forces WHERE id = ?').run(id);
  }

  /**
   * Batch create planar forces in transaction
   */
  async batchCreate(planarForces: CreatePlanarForceRequest[], ownerId: string): Promise<PlanarForce[]> {
    const results: PlanarForce[] = [];

    db.transaction(() => {
      for (const data of planarForces) {
        // Note: Using synchronous validation here since we're in a transaction
        const planarForce = this.createSync(data, ownerId);
        results.push(planarForce);
      }
    })();

    return results;
  }

  /**
   * Synchronous create for use within transactions
   */
  private createSync(data: CreatePlanarForceRequest, ownerId: string): PlanarForce {
    // Validate campaign ownership
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(data.campaign_id, ownerId);

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Validate high_priest_id FK if provided
    if (data.high_priest_id) {
      const npc = db
        .prepare('SELECT id FROM npcs WHERE id = ? AND campaign_id = ?')
        .get(data.high_priest_id, data.campaign_id);

      if (!npc) {
        throw new Error('High Priest NPC not found in this campaign');
      }
    }

    // Generate ID and timestamps
    const id = this.generateId();
    const now = Math.floor(Date.now() / 1000);

    // Prepare JSON arrays
    const tags = JSON.stringify(data.tags || []);
    const domains = data.domains ? JSON.stringify(data.domains) : null;
    const allied_entities = JSON.stringify(data.allied_entities || []);
    const rival_entities = JSON.stringify(data.rival_entities || []);
    const religious_orders = JSON.stringify(data.religious_orders || []);
    const custom_fields = JSON.stringify(data.custom_fields || {});

    // Insert planar force
    db.prepare(`
      INSERT INTO planar_forces (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        entity_type, domains, alignment, worshiper_base, plane_of_origin, base_of_power,
        high_priest_id, allied_entities, rival_entities, religious_orders,
        dm_true_nature
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.campaign_id,
      data.name,
      data.description || null,
      data.core_status || 'active',
      data.player_knowledge || 'common_knowledge',
      tags,
      now,
      now,
      custom_fields,
      data.entity_type || null,
      domains,
      data.alignment || null,
      data.worshiper_base || null,
      data.plane_of_origin || null,
      data.base_of_power || null,
      data.high_priest_id || null,
      allied_entities,
      rival_entities,
      religious_orders,
      data.dm_true_nature || null
    );

    const row = db.prepare('SELECT * FROM planar_forces WHERE id = ?').get(id) as PlanarForceRow;
    return this.rowToPlanarForce(row);
  }

  /**
   * Convert database row to PlanarForce model
   */
  private rowToPlanarForce(row: PlanarForceRow): PlanarForce {
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
      entity_type: row.entity_type,
      domains: row.domains ? JSON.parse(row.domains) : null,
      alignment: row.alignment,
      worshiper_base: row.worshiper_base,
      plane_of_origin: row.plane_of_origin,
      base_of_power: row.base_of_power,
      high_priest_id: row.high_priest_id,
      allied_entities: JSON.parse(row.allied_entities),
      rival_entities: JSON.parse(row.rival_entities),
      religious_orders: JSON.parse(row.religious_orders),
      dm_true_nature: row.dm_true_nature,
    };
  }

  /**
   * Generate unique ID for planar force
   */
  private generateId(): string {
    return `planar_force_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
