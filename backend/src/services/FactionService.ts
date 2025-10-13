/**
 * FactionService - Business logic for faction operations
 * Feature: 014-create-the-database
 *
 * Implements:
 * - CRUD operations for factions
 * - Campaign ownership validation
 * - Foreign key validation (leader_id → npcs.id)
 * - JSON array handling (key_members, allied_factions, rival_factions, territory, tags)
 * - Transaction support for atomic operations
 */

import { db } from './DatabaseService';
import { Faction } from '../models/faction';

export interface CreateFactionRequest {
  campaign_id: string;
  name: string;
  description?: string;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string;
  tags?: string[];
  faction_type?: string;
  power_level?: string;
  resources?: string;
  beliefs?: string;
  goals?: string;
  methods?: string;
  leader_id?: string;
  key_members?: string[];
  allied_factions?: string[];
  rival_factions?: string[];
  territory?: string[];
  dm_true_agenda?: string;
  custom_fields?: Record<string, any>;
}

export interface UpdateFactionRequest {
  name?: string;
  description?: string;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string;
  tags?: string[];
  faction_type?: string;
  power_level?: string;
  resources?: string;
  beliefs?: string;
  goals?: string;
  methods?: string;
  leader_id?: string;
  key_members?: string[];
  allied_factions?: string[];
  rival_factions?: string[];
  territory?: string[];
  dm_true_agenda?: string;
  custom_fields?: Record<string, any>;
}

interface FactionRow {
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
  faction_type: string | null;
  power_level: string | null;
  resources: string | null;
  beliefs: string | null;
  goals: string | null;
  methods: string | null;
  leader_id: string | null;
  key_members: string;
  allied_factions: string;
  rival_factions: string;
  territory: string;
  dm_true_agenda: string | null;
}

export class FactionService {
  /**
   * Create a new faction with validation
   */
  async create(data: CreateFactionRequest, ownerId: string): Promise<Faction> {
    // Validate campaign ownership
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(data.campaign_id, ownerId);

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Validate leader_id FK if provided
    if (data.leader_id) {
      const npc = db
        .prepare('SELECT id FROM npcs WHERE id = ? AND campaign_id = ?')
        .get(data.leader_id, data.campaign_id);

      if (!npc) {
        throw new Error('Leader NPC not found in this campaign');
      }
    }

    // Generate ID and timestamps
    const id = this.generateId();
    const now = Math.floor(Date.now() / 1000);

    // Prepare JSON arrays
    const tags = JSON.stringify(data.tags || []);
    const key_members = JSON.stringify(data.key_members || []);
    const allied_factions = JSON.stringify(data.allied_factions || []);
    const rival_factions = JSON.stringify(data.rival_factions || []);
    const territory = JSON.stringify(data.territory || []);
    const custom_fields = JSON.stringify(data.custom_fields || {});

    // Insert faction
    db.prepare(`
      INSERT INTO factions (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        faction_type, power_level, resources, beliefs, goals, methods,
        leader_id, key_members, allied_factions, rival_factions, territory,
        dm_true_agenda
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.faction_type || null,
      data.power_level || null,
      data.resources || null,
      data.beliefs || null,
      data.goals || null,
      data.methods || null,
      data.leader_id || null,
      key_members,
      allied_factions,
      rival_factions,
      territory,
      data.dm_true_agenda || null
    );

    const row = db.prepare('SELECT * FROM factions WHERE id = ?').get(id) as FactionRow;
    return this.rowToFaction(row);
  }

  /**
   * Get faction by ID with ownership validation
   */
  async getById(id: string, ownerId: string): Promise<Faction | null> {
    const row = db.prepare(`
      SELECT f.* FROM factions f
      JOIN campaigns c ON f.campaign_id = c.id
      WHERE f.id = ? AND c.owner_id = ?
    `).get(id, ownerId) as FactionRow | undefined;

    return row ? this.rowToFaction(row) : null;
  }

  /**
   * Get all factions for a campaign
   */
  async getByCampaign(campaignId: string, ownerId: string): Promise<Faction[]> {
    // Validate campaign ownership
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaignId, ownerId);

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    const rows = db.prepare(`
      SELECT * FROM factions
      WHERE campaign_id = ?
      ORDER BY name ASC
    `).all(campaignId) as FactionRow[];

    return rows.map(row => this.rowToFaction(row));
  }

  /**
   * Update faction with validation
   */
  async update(id: string, data: UpdateFactionRequest, ownerId: string): Promise<Faction> {
    // Get faction and validate ownership
    const faction = await this.getById(id, ownerId);
    if (!faction) {
      throw new Error('Faction not found or access denied');
    }

    // Validate leader_id FK if provided
    if (data.leader_id !== undefined) {
      if (data.leader_id !== null) {
        const npc = db
          .prepare('SELECT id FROM npcs WHERE id = ? AND campaign_id = ?')
          .get(data.leader_id, faction.campaign_id);

        if (!npc) {
          throw new Error('Leader NPC not found in this campaign');
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
    if (data.faction_type !== undefined) {
      updates.push('faction_type = ?');
      values.push(data.faction_type);
    }
    if (data.power_level !== undefined) {
      updates.push('power_level = ?');
      values.push(data.power_level);
    }
    if (data.resources !== undefined) {
      updates.push('resources = ?');
      values.push(data.resources);
    }
    if (data.beliefs !== undefined) {
      updates.push('beliefs = ?');
      values.push(data.beliefs);
    }
    if (data.goals !== undefined) {
      updates.push('goals = ?');
      values.push(data.goals);
    }
    if (data.methods !== undefined) {
      updates.push('methods = ?');
      values.push(data.methods);
    }
    if (data.leader_id !== undefined) {
      updates.push('leader_id = ?');
      values.push(data.leader_id);
    }
    if (data.key_members !== undefined) {
      updates.push('key_members = ?');
      values.push(JSON.stringify(data.key_members));
    }
    if (data.allied_factions !== undefined) {
      updates.push('allied_factions = ?');
      values.push(JSON.stringify(data.allied_factions));
    }
    if (data.rival_factions !== undefined) {
      updates.push('rival_factions = ?');
      values.push(JSON.stringify(data.rival_factions));
    }
    if (data.territory !== undefined) {
      updates.push('territory = ?');
      values.push(JSON.stringify(data.territory));
    }
    if (data.dm_true_agenda !== undefined) {
      updates.push('dm_true_agenda = ?');
      values.push(data.dm_true_agenda);
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
      return faction;
    }

    // Add id for WHERE clause
    values.push(id);

    db.prepare(`
      UPDATE factions
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    const row = db.prepare('SELECT * FROM factions WHERE id = ?').get(id) as FactionRow;
    return this.rowToFaction(row);
  }

  /**
   * Delete faction (CASCADE handled by FK constraints)
   */
  async delete(id: string, ownerId: string): Promise<void> {
    // Validate ownership
    const faction = await this.getById(id, ownerId);
    if (!faction) {
      throw new Error('Faction not found or access denied');
    }

    db.prepare('DELETE FROM factions WHERE id = ?').run(id);
  }

  /**
   * Batch create factions in transaction
   */
  async batchCreate(factions: CreateFactionRequest[], ownerId: string): Promise<Faction[]> {
    const results: Faction[] = [];

    db.transaction(() => {
      for (const data of factions) {
        // Note: Using synchronous validation here since we're in a transaction
        const faction = this.createSync(data, ownerId);
        results.push(faction);
      }
    })();

    return results;
  }

  /**
   * Synchronous create for use within transactions
   */
  private createSync(data: CreateFactionRequest, ownerId: string): Faction {
    // Validate campaign ownership
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(data.campaign_id, ownerId);

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Validate leader_id FK if provided
    if (data.leader_id) {
      const npc = db
        .prepare('SELECT id FROM npcs WHERE id = ? AND campaign_id = ?')
        .get(data.leader_id, data.campaign_id);

      if (!npc) {
        throw new Error('Leader NPC not found in this campaign');
      }
    }

    // Generate ID and timestamps
    const id = this.generateId();
    const now = Math.floor(Date.now() / 1000);

    // Prepare JSON arrays
    const tags = JSON.stringify(data.tags || []);
    const key_members = JSON.stringify(data.key_members || []);
    const allied_factions = JSON.stringify(data.allied_factions || []);
    const rival_factions = JSON.stringify(data.rival_factions || []);
    const territory = JSON.stringify(data.territory || []);
    const custom_fields = JSON.stringify(data.custom_fields || {});

    // Insert faction
    db.prepare(`
      INSERT INTO factions (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        faction_type, power_level, resources, beliefs, goals, methods,
        leader_id, key_members, allied_factions, rival_factions, territory,
        dm_true_agenda
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.faction_type || null,
      data.power_level || null,
      data.resources || null,
      data.beliefs || null,
      data.goals || null,
      data.methods || null,
      data.leader_id || null,
      key_members,
      allied_factions,
      rival_factions,
      territory,
      data.dm_true_agenda || null
    );

    const row = db.prepare('SELECT * FROM factions WHERE id = ?').get(id) as FactionRow;
    return this.rowToFaction(row);
  }

  /**
   * Convert database row to Faction model
   */
  private rowToFaction(row: FactionRow): Faction {
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
      faction_type: row.faction_type,
      power_level: row.power_level,
      resources: row.resources,
      beliefs: row.beliefs,
      goals: row.goals,
      methods: row.methods,
      leader_id: row.leader_id,
      key_members: JSON.parse(row.key_members),
      allied_factions: JSON.parse(row.allied_factions),
      rival_factions: JSON.parse(row.rival_factions),
      territory: JSON.parse(row.territory),
      dm_true_agenda: row.dm_true_agenda,
    };
  }

  /**
   * Generate unique ID for faction
   */
  private generateId(): string {
    return `faction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
