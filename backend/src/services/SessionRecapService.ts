/**
 * SessionRecapService - Feature 014 Category Database
 * Handles CRUD operations for Session Recap entities
 *
 * CRITICAL: Session Recaps are ALWAYS canonical (is_canon=1, canonical_status='canon')
 * This is enforced at the service layer, overriding any user input.
 */

import Database from 'better-sqlite3';
import { SessionRecap } from '../models/sessionRecap';

export class SessionRecapService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Get all session recaps for a campaign
   */
  getAllByCampaign(campaignId: string): SessionRecap[] {
    const stmt = this.db.prepare(`
      SELECT * FROM session_recaps
      WHERE campaign_id = ?
      ORDER BY session_date DESC, created_at DESC
    `);

    const rows = stmt.all(campaignId) as any[];
    return rows.map(this.rowToSessionRecap);
  }

  /**
   * Get session recap by ID
   */
  getById(id: string): SessionRecap | null {
    const stmt = this.db.prepare('SELECT * FROM session_recaps WHERE id = ?');
    const row = stmt.get(id) as any;

    return row ? this.rowToSessionRecap(row) : null;
  }

  /**
   * Create new session recap
   * CRITICAL: Forces is_canon=1 and canonical_status='canon' regardless of input
   */
  create(data: {
    id: string;
    campaign_id: string;
    name: string;
    description?: string | null;
    core_status?: 'active' | 'archived' | 'draft' | 'hidden';
    player_knowledge?: string | null;
    tags?: string[];
    custom_fields?: Record<string, any>;
    session_date?: number | null;
    in_game_date_start?: string | null;
    in_game_date_end?: string | null;
    time_passed?: string | null;
    summary?: string | null;
    key_events?: string[] | null;
    player_decisions?: string[] | null;
    npcs_encountered?: string[];
    locations_visited?: string[];
    quests_progressed?: string[];
    loot_acquired?: string[];
    dm_consequences?: string | null;
    dm_behind_scenes?: string | null;
  }): SessionRecap {
    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      INSERT INTO session_recaps (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        session_date, in_game_date_start, in_game_date_end, time_passed,
        summary, key_events, player_decisions,
        is_canon, canonical_status,
        npcs_encountered, locations_visited, quests_progressed, loot_acquired,
        dm_consequences, dm_behind_scenes
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        1, 'canon',
        ?, ?, ?, ?,
        ?, ?
      )
    `);

    stmt.run(
      data.id,
      data.campaign_id,
      data.name,
      data.description ?? null,
      data.core_status ?? 'active',
      data.player_knowledge ?? 'common_knowledge',
      JSON.stringify(data.tags ?? []),
      now,
      now,
      JSON.stringify(data.custom_fields ?? {}),
      data.session_date ?? null,
      data.in_game_date_start ?? null,
      data.in_game_date_end ?? null,
      data.time_passed ?? null,
      data.summary ?? null,
      data.key_events ? JSON.stringify(data.key_events) : null,
      data.player_decisions ? JSON.stringify(data.player_decisions) : null,
      // is_canon=1 and canonical_status='canon' are hardcoded in SQL
      JSON.stringify(data.npcs_encountered ?? []),
      JSON.stringify(data.locations_visited ?? []),
      JSON.stringify(data.quests_progressed ?? []),
      JSON.stringify(data.loot_acquired ?? []),
      data.dm_consequences ?? null,
      data.dm_behind_scenes ?? null
    );

    const created = this.getById(data.id);
    if (!created) {
      throw new Error('Failed to create session recap');
    }

    return created;
  }

  /**
   * Update session recap
   * CRITICAL: Forces is_canon=1 and canonical_status='canon' regardless of input
   */
  update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      core_status?: 'active' | 'archived' | 'draft' | 'hidden';
      player_knowledge?: string | null;
      tags?: string[];
      custom_fields?: Record<string, any>;
      session_date?: number | null;
      in_game_date_start?: string | null;
      in_game_date_end?: string | null;
      time_passed?: string | null;
      summary?: string | null;
      key_events?: string[] | null;
      player_decisions?: string[] | null;
      npcs_encountered?: string[];
      locations_visited?: string[];
      quests_progressed?: string[];
      loot_acquired?: string[];
      dm_consequences?: string | null;
      dm_behind_scenes?: string | null;
    }
  ): SessionRecap {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error('Session recap not found');
    }

    const updates: string[] = [];
    const values: any[] = [];

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

    if (data.session_date !== undefined) {
      updates.push('session_date = ?');
      values.push(data.session_date);
    }

    if (data.in_game_date_start !== undefined) {
      updates.push('in_game_date_start = ?');
      values.push(data.in_game_date_start);
    }

    if (data.in_game_date_end !== undefined) {
      updates.push('in_game_date_end = ?');
      values.push(data.in_game_date_end);
    }

    if (data.time_passed !== undefined) {
      updates.push('time_passed = ?');
      values.push(data.time_passed);
    }

    if (data.summary !== undefined) {
      updates.push('summary = ?');
      values.push(data.summary);
    }

    if (data.key_events !== undefined) {
      updates.push('key_events = ?');
      values.push(data.key_events ? JSON.stringify(data.key_events) : null);
    }

    if (data.player_decisions !== undefined) {
      updates.push('player_decisions = ?');
      values.push(data.player_decisions ? JSON.stringify(data.player_decisions) : null);
    }

    if (data.npcs_encountered !== undefined) {
      updates.push('npcs_encountered = ?');
      values.push(JSON.stringify(data.npcs_encountered));
    }

    if (data.locations_visited !== undefined) {
      updates.push('locations_visited = ?');
      values.push(JSON.stringify(data.locations_visited));
    }

    if (data.quests_progressed !== undefined) {
      updates.push('quests_progressed = ?');
      values.push(JSON.stringify(data.quests_progressed));
    }

    if (data.loot_acquired !== undefined) {
      updates.push('loot_acquired = ?');
      values.push(JSON.stringify(data.loot_acquired));
    }

    if (data.dm_consequences !== undefined) {
      updates.push('dm_consequences = ?');
      values.push(data.dm_consequences);
    }

    if (data.dm_behind_scenes !== undefined) {
      updates.push('dm_behind_scenes = ?');
      values.push(data.dm_behind_scenes);
    }

    // CRITICAL: Always enforce canonical status
    updates.push('is_canon = ?');
    values.push(1);
    updates.push('canonical_status = ?');
    values.push('canon');

    // Always update updated_at
    const now = Math.floor(Date.now() / 1000);
    updates.push('updated_at = ?');
    values.push(now);

    // Add id for WHERE clause
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE session_recaps
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const updated = this.getById(id);
    if (!updated) {
      throw new Error('Failed to update session recap');
    }

    return updated;
  }

  /**
   * Delete session recap
   */
  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM session_recaps WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      throw new Error('Session recap not found');
    }
  }

  /**
   * Get session recaps by core status
   */
  getByCoreStatus(
    campaignId: string,
    coreStatus: 'active' | 'archived' | 'draft' | 'hidden'
  ): SessionRecap[] {
    const stmt = this.db.prepare(`
      SELECT * FROM session_recaps
      WHERE campaign_id = ? AND core_status = ?
      ORDER BY session_date DESC, created_at DESC
    `);

    const rows = stmt.all(campaignId, coreStatus) as any[];
    return rows.map(this.rowToSessionRecap);
  }

  /**
   * Get session recaps by date range
   */
  getByDateRange(
    campaignId: string,
    startDate: number,
    endDate: number
  ): SessionRecap[] {
    const stmt = this.db.prepare(`
      SELECT * FROM session_recaps
      WHERE campaign_id = ?
        AND session_date IS NOT NULL
        AND session_date >= ?
        AND session_date <= ?
      ORDER BY session_date DESC
    `);

    const rows = stmt.all(campaignId, startDate, endDate) as any[];
    return rows.map(this.rowToSessionRecap);
  }

  /**
   * Search session recaps by name or summary
   */
  search(campaignId: string, query: string): SessionRecap[] {
    const stmt = this.db.prepare(`
      SELECT * FROM session_recaps
      WHERE campaign_id = ?
        AND (
          name LIKE ?
          OR summary LIKE ?
        )
      ORDER BY session_date DESC, created_at DESC
    `);

    const searchPattern = `%${query}%`;
    const rows = stmt.all(campaignId, searchPattern, searchPattern) as any[];
    return rows.map(this.rowToSessionRecap);
  }

  /**
   * Convert database row to SessionRecap model
   */
  private rowToSessionRecap(row: any): SessionRecap {
    return {
      id: row.id,
      campaign_id: row.campaign_id,
      name: row.name,
      description: row.description,
      core_status: row.core_status,
      player_knowledge: row.player_knowledge,
      tags: JSON.parse(row.tags),
      created_at: row.created_at,
      updated_at: row.updated_at,
      custom_fields: JSON.parse(row.custom_fields),
      session_date: row.session_date,
      in_game_date_start: row.in_game_date_start,
      in_game_date_end: row.in_game_date_end,
      time_passed: row.time_passed,
      summary: row.summary,
      key_events: row.key_events ? JSON.parse(row.key_events) : null,
      player_decisions: row.player_decisions ? JSON.parse(row.player_decisions) : null,
      is_canon: 1,
      canonical_status: 'canon',
      npcs_encountered: JSON.parse(row.npcs_encountered),
      locations_visited: JSON.parse(row.locations_visited),
      quests_progressed: JSON.parse(row.quests_progressed),
      loot_acquired: JSON.parse(row.loot_acquired),
      dm_consequences: row.dm_consequences,
      dm_behind_scenes: row.dm_behind_scenes,
    };
  }
}
