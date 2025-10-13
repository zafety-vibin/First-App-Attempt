/**
 * CustomMechanicService - Business logic for custom mechanic operations
 * Feature: 014-create-the-database
 *
 * Implements:
 * - CRUD operations for custom mechanics
 * - Campaign ownership validation
 * - Self-referential validation (related_rules → custom_mechanics.id)
 * - JSON array handling (related_rules, tags)
 * - Transaction support for atomic operations
 */

import { db } from './DatabaseService';
import { CustomMechanic } from '../models/customMechanic';

export interface CreateCustomMechanicRequest {
  campaign_id: string;
  name: string;
  description?: string;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string;
  tags?: string[];
  mechanic_type?: string;
  rules_text?: string;
  prerequisites?: string;
  source?: string;
  related_rules?: string[];
  custom_fields?: Record<string, any>;
}

export interface UpdateCustomMechanicRequest {
  name?: string;
  description?: string;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string;
  tags?: string[];
  mechanic_type?: string;
  rules_text?: string;
  prerequisites?: string;
  source?: string;
  related_rules?: string[];
  custom_fields?: Record<string, any>;
}

interface CustomMechanicRow {
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
  mechanic_type: string | null;
  rules_text: string | null;
  prerequisites: string | null;
  source: string | null;
  related_rules: string;
}

export class CustomMechanicService {
  /**
   * Create a new custom mechanic with validation
   */
  async create(data: CreateCustomMechanicRequest, ownerId: string): Promise<CustomMechanic> {
    // Validate campaign ownership
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(data.campaign_id, ownerId);

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Validate related_rules (self-referential FK) if provided
    if (data.related_rules && data.related_rules.length > 0) {
      for (const relatedId of data.related_rules) {
        const relatedMechanic = db
          .prepare('SELECT id FROM custom_mechanics WHERE id = ? AND campaign_id = ?')
          .get(relatedId, data.campaign_id);

        if (!relatedMechanic) {
          throw new Error(`Related mechanic ${relatedId} not found in this campaign`);
        }
      }
    }

    // Generate ID and timestamps
    const id = this.generateId();
    const now = Math.floor(Date.now() / 1000);

    // Prepare JSON arrays
    const tags = JSON.stringify(data.tags || []);
    const related_rules = JSON.stringify(data.related_rules || []);
    const custom_fields = JSON.stringify(data.custom_fields || {});

    // Insert custom mechanic
    db.prepare(`
      INSERT INTO custom_mechanics (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        mechanic_type, rules_text, prerequisites, source, related_rules
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.mechanic_type || null,
      data.rules_text || null,
      data.prerequisites || null,
      data.source || null,
      related_rules
    );

    const row = db.prepare('SELECT * FROM custom_mechanics WHERE id = ?').get(id) as CustomMechanicRow;
    return this.rowToCustomMechanic(row);
  }

  /**
   * Get custom mechanic by ID with ownership validation
   */
  async getById(id: string, ownerId: string): Promise<CustomMechanic | null> {
    const row = db.prepare(`
      SELECT cm.* FROM custom_mechanics cm
      JOIN campaigns c ON cm.campaign_id = c.id
      WHERE cm.id = ? AND c.owner_id = ?
    `).get(id, ownerId) as CustomMechanicRow | undefined;

    return row ? this.rowToCustomMechanic(row) : null;
  }

  /**
   * Get all custom mechanics for a campaign
   */
  async getByCampaign(campaignId: string, ownerId: string): Promise<CustomMechanic[]> {
    // Validate campaign ownership
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaignId, ownerId);

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    const rows = db.prepare(`
      SELECT * FROM custom_mechanics
      WHERE campaign_id = ?
      ORDER BY name ASC
    `).all(campaignId) as CustomMechanicRow[];

    return rows.map(row => this.rowToCustomMechanic(row));
  }

  /**
   * Update custom mechanic with validation
   */
  async update(id: string, data: UpdateCustomMechanicRequest, ownerId: string): Promise<CustomMechanic> {
    // Get custom mechanic and validate ownership
    const mechanic = await this.getById(id, ownerId);
    if (!mechanic) {
      throw new Error('Custom mechanic not found or access denied');
    }

    // Validate related_rules (self-referential FK) if provided
    if (data.related_rules !== undefined) {
      if (data.related_rules !== null && data.related_rules.length > 0) {
        for (const relatedId of data.related_rules) {
          // Prevent self-reference
          if (relatedId === id) {
            throw new Error('Custom mechanic cannot reference itself');
          }

          const relatedMechanic = db
            .prepare('SELECT id FROM custom_mechanics WHERE id = ? AND campaign_id = ?')
            .get(relatedId, mechanic.campaign_id);

          if (!relatedMechanic) {
            throw new Error(`Related mechanic ${relatedId} not found in this campaign`);
          }
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
    if (data.mechanic_type !== undefined) {
      updates.push('mechanic_type = ?');
      values.push(data.mechanic_type);
    }
    if (data.rules_text !== undefined) {
      updates.push('rules_text = ?');
      values.push(data.rules_text);
    }
    if (data.prerequisites !== undefined) {
      updates.push('prerequisites = ?');
      values.push(data.prerequisites);
    }
    if (data.source !== undefined) {
      updates.push('source = ?');
      values.push(data.source);
    }
    if (data.related_rules !== undefined) {
      updates.push('related_rules = ?');
      values.push(JSON.stringify(data.related_rules));
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
      return mechanic;
    }

    // Add id for WHERE clause
    values.push(id);

    db.prepare(`
      UPDATE custom_mechanics
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    const row = db.prepare('SELECT * FROM custom_mechanics WHERE id = ?').get(id) as CustomMechanicRow;
    return this.rowToCustomMechanic(row);
  }

  /**
   * Delete custom mechanic (CASCADE handled by FK constraints)
   */
  async delete(id: string, ownerId: string): Promise<void> {
    // Validate ownership
    const mechanic = await this.getById(id, ownerId);
    if (!mechanic) {
      throw new Error('Custom mechanic not found or access denied');
    }

    db.prepare('DELETE FROM custom_mechanics WHERE id = ?').run(id);
  }

  /**
   * Batch create custom mechanics in transaction
   */
  async batchCreate(mechanics: CreateCustomMechanicRequest[], ownerId: string): Promise<CustomMechanic[]> {
    const results: CustomMechanic[] = [];

    db.transaction(() => {
      for (const data of mechanics) {
        // Note: Using synchronous validation here since we're in a transaction
        const mechanic = this.createSync(data, ownerId);
        results.push(mechanic);
      }
    })();

    return results;
  }

  /**
   * Synchronous create for use within transactions
   */
  private createSync(data: CreateCustomMechanicRequest, ownerId: string): CustomMechanic {
    // Validate campaign ownership
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(data.campaign_id, ownerId);

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Validate related_rules (self-referential FK) if provided
    if (data.related_rules && data.related_rules.length > 0) {
      for (const relatedId of data.related_rules) {
        const relatedMechanic = db
          .prepare('SELECT id FROM custom_mechanics WHERE id = ? AND campaign_id = ?')
          .get(relatedId, data.campaign_id);

        if (!relatedMechanic) {
          throw new Error(`Related mechanic ${relatedId} not found in this campaign`);
        }
      }
    }

    // Generate ID and timestamps
    const id = this.generateId();
    const now = Math.floor(Date.now() / 1000);

    // Prepare JSON arrays
    const tags = JSON.stringify(data.tags || []);
    const related_rules = JSON.stringify(data.related_rules || []);
    const custom_fields = JSON.stringify(data.custom_fields || {});

    // Insert custom mechanic
    db.prepare(`
      INSERT INTO custom_mechanics (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        mechanic_type, rules_text, prerequisites, source, related_rules
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.mechanic_type || null,
      data.rules_text || null,
      data.prerequisites || null,
      data.source || null,
      related_rules
    );

    const row = db.prepare('SELECT * FROM custom_mechanics WHERE id = ?').get(id) as CustomMechanicRow;
    return this.rowToCustomMechanic(row);
  }

  /**
   * Convert database row to CustomMechanic model
   */
  private rowToCustomMechanic(row: CustomMechanicRow): CustomMechanic {
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
      mechanic_type: row.mechanic_type,
      rules_text: row.rules_text,
      prerequisites: row.prerequisites,
      source: row.source,
      related_rules: JSON.parse(row.related_rules),
    };
  }

  /**
   * Generate unique ID for custom mechanic
   */
  private generateId(): string {
    return `custom_mechanic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
