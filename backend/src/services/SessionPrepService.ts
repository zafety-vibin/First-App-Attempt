/**
 * SessionPrepService - Feature 014 Category Database
 * Handles CRUD operations for Session Prep entities
 *
 * CRITICAL: Session Preps are ALWAYS hypothetical and DM-only
 * - is_canon=0 (hardcoded, not canonical)
 * - canonical_status='hypothetical' (hardcoded)
 * - player_knowledge='dm_only' (hardcoded, overrides user input)
 *
 * This is enforced at the service layer, overriding any user input.
 */

import Database from 'better-sqlite3';
import { SessionPrep } from '../models/sessionPrep';

/**
 * Database row interface for session_preps table
 */
interface SessionPrepRow {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: string;
  player_knowledge: string;
  tags: string;
  created_at: number;
  updated_at: number;
  custom_fields: string;
  planned_date: number | null;
  status: string;
  planned_events: string | null;
  possible_encounters: string | null;
  plot_hooks: string | null;
  dm_notes: string | null;
  is_canon: number;
  canonical_status: string;
  plot_threads: string;
  npcs_to_prep: string;
  locations_to_prep: string;
}

/**
 * Input interface for creating a session prep
 */
export interface CreateSessionPrepInput {
  id: string;
  campaignId: string;
  name: string;
  description?: string | null;
  coreStatus?: 'active' | 'archived' | 'draft' | 'hidden';
  tags?: string[];
  customFields?: Record<string, any>;
  plannedDate?: number | null;
  status?: 'draft' | 'ready' | 'completed' | 'cancelled';
  plannedEvents?: string | null;
  possibleEncounters?: string | null;
  plotHooks?: string | null;
  dmNotes?: string | null;
  plotThreads?: string[];
  npcsToPrep?: string[];
  locationsToPrep?: string[];
}

/**
 * Input interface for updating a session prep
 */
export interface UpdateSessionPrepInput {
  name?: string;
  description?: string | null;
  coreStatus?: 'active' | 'archived' | 'draft' | 'hidden';
  tags?: string[];
  customFields?: Record<string, any>;
  plannedDate?: number | null;
  status?: 'draft' | 'ready' | 'completed' | 'cancelled';
  plannedEvents?: string | null;
  possibleEncounters?: string | null;
  plotHooks?: string | null;
  dmNotes?: string | null;
  plotThreads?: string[];
  npcsToPrep?: string[];
  locationsToPrep?: string[];
}

export class SessionPrepService {
  private db: Database.Database;
  private readonly VALID_STATUSES = ['draft', 'ready', 'completed', 'cancelled'] as const;
  private readonly VALID_CORE_STATUSES = ['active', 'archived', 'draft', 'hidden'] as const;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Get all session preps for a campaign
   */
  getAllByCampaign(campaignId: string): SessionPrep[] {
    const stmt = this.db.prepare(`
      SELECT * FROM session_preps
      WHERE campaign_id = ?
      ORDER BY planned_date DESC, created_at DESC
    `);

    const rows = stmt.all(campaignId) as SessionPrepRow[];
    return rows.map(this.rowToSessionPrep);
  }

  /**
   * Get session prep by ID
   */
  getById(id: string): SessionPrep | null {
    const stmt = this.db.prepare('SELECT * FROM session_preps WHERE id = ?');
    const row = stmt.get(id) as SessionPrepRow | undefined;

    return row ? this.rowToSessionPrep(row) : null;
  }

  /**
   * Create new session prep
   * CRITICAL: Forces is_canon=0, canonical_status='hypothetical', player_knowledge='dm_only' regardless of input
   */
  create(data: CreateSessionPrepInput): SessionPrep {
    const now = Math.floor(Date.now() / 1000);

    // Validate status if provided
    if (data.status && !this.VALID_STATUSES.includes(data.status as any)) {
      throw new Error(`Invalid session prep status: ${data.status}. Must be one of: ${this.VALID_STATUSES.join(', ')}`);
    }

    // Validate core status if provided
    const coreStatus = data.coreStatus ?? 'active';
    if (!this.VALID_CORE_STATUSES.includes(coreStatus as any)) {
      throw new Error(`Invalid core status: ${coreStatus}. Must be one of: ${this.VALID_CORE_STATUSES.join(', ')}`);
    }

    const stmt = this.db.prepare(`
      INSERT INTO session_preps (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        planned_date, status, planned_events, possible_encounters, plot_hooks, dm_notes,
        is_canon, canonical_status,
        plot_threads, npcs_to_prep, locations_to_prep
      ) VALUES (
        ?, ?, ?, ?, ?, 'dm_only',
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        0, 'hypothetical',
        ?, ?, ?
      )
    `);

    stmt.run(
      data.id,
      data.campaignId,
      data.name,
      data.description ?? null,
      coreStatus,
      // player_knowledge='dm_only' is hardcoded in SQL
      JSON.stringify(data.tags ?? []),
      now,
      now,
      JSON.stringify(data.customFields ?? {}),
      data.plannedDate ?? null,
      data.status ?? 'draft',
      data.plannedEvents ?? null,
      data.possibleEncounters ?? null,
      data.plotHooks ?? null,
      data.dmNotes ?? null,
      // is_canon=0 and canonical_status='hypothetical' are hardcoded in SQL
      JSON.stringify(data.plotThreads ?? []),
      JSON.stringify(data.npcsToPrep ?? []),
      JSON.stringify(data.locationsToPrep ?? [])
    );

    const created = this.getById(data.id);
    if (!created) {
      throw new Error('Failed to create session prep');
    }

    return created;
  }

  /**
   * Update session prep
   * CRITICAL: Forces is_canon=0, canonical_status='hypothetical', player_knowledge='dm_only' regardless of input
   */
  update(id: string, data: UpdateSessionPrepInput): SessionPrep {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error('Session prep not found');
    }

    // Validate status if provided
    if (data.status && !this.VALID_STATUSES.includes(data.status as any)) {
      throw new Error(`Invalid session prep status: ${data.status}. Must be one of: ${this.VALID_STATUSES.join(', ')}`);
    }

    // Validate core status if provided
    if (data.coreStatus && !this.VALID_CORE_STATUSES.includes(data.coreStatus as any)) {
      throw new Error(`Invalid core status: ${data.coreStatus}. Must be one of: ${this.VALID_CORE_STATUSES.join(', ')}`);
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

    if (data.coreStatus !== undefined) {
      updates.push('core_status = ?');
      values.push(data.coreStatus);
    }

    if (data.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(data.tags));
    }

    if (data.customFields !== undefined) {
      updates.push('custom_fields = ?');
      values.push(JSON.stringify(data.customFields));
    }

    if (data.plannedDate !== undefined) {
      updates.push('planned_date = ?');
      values.push(data.plannedDate);
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    if (data.plannedEvents !== undefined) {
      updates.push('planned_events = ?');
      values.push(data.plannedEvents);
    }

    if (data.possibleEncounters !== undefined) {
      updates.push('possible_encounters = ?');
      values.push(data.possibleEncounters);
    }

    if (data.plotHooks !== undefined) {
      updates.push('plot_hooks = ?');
      values.push(data.plotHooks);
    }

    if (data.dmNotes !== undefined) {
      updates.push('dm_notes = ?');
      values.push(data.dmNotes);
    }

    if (data.plotThreads !== undefined) {
      updates.push('plot_threads = ?');
      values.push(JSON.stringify(data.plotThreads));
    }

    if (data.npcsToPrep !== undefined) {
      updates.push('npcs_to_prep = ?');
      values.push(JSON.stringify(data.npcsToPrep));
    }

    if (data.locationsToPrep !== undefined) {
      updates.push('locations_to_prep = ?');
      values.push(JSON.stringify(data.locationsToPrep));
    }

    // CRITICAL: Always enforce canonical status and player knowledge
    updates.push('is_canon = ?');
    values.push(0);
    updates.push('canonical_status = ?');
    values.push('hypothetical');
    updates.push('player_knowledge = ?');
    values.push('dm_only');

    // Always update updated_at
    const now = Math.floor(Date.now() / 1000);
    updates.push('updated_at = ?');
    values.push(now);

    // Add id for WHERE clause
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE session_preps
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const updated = this.getById(id);
    if (!updated) {
      throw new Error('Failed to update session prep');
    }

    return updated;
  }

  /**
   * Delete session prep
   */
  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM session_preps WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      throw new Error('Session prep not found');
    }
  }

  /**
   * Get session preps by core status
   */
  getByCoreStatus(
    campaignId: string,
    coreStatus: 'active' | 'archived' | 'draft' | 'hidden'
  ): SessionPrep[] {
    const stmt = this.db.prepare(`
      SELECT * FROM session_preps
      WHERE campaign_id = ? AND core_status = ?
      ORDER BY planned_date DESC, created_at DESC
    `);

    const rows = stmt.all(campaignId, coreStatus) as SessionPrepRow[];
    return rows.map(this.rowToSessionPrep);
  }

  /**
   * Get session preps by status
   */
  getByStatus(
    campaignId: string,
    status: 'draft' | 'ready' | 'completed' | 'cancelled'
  ): SessionPrep[] {
    if (!this.VALID_STATUSES.includes(status as any)) {
      throw new Error(`Invalid session prep status: ${status}. Must be one of: ${this.VALID_STATUSES.join(', ')}`);
    }

    const stmt = this.db.prepare(`
      SELECT * FROM session_preps
      WHERE campaign_id = ? AND status = ?
      ORDER BY planned_date DESC, created_at DESC
    `);

    const rows = stmt.all(campaignId, status) as SessionPrepRow[];
    return rows.map(this.rowToSessionPrep);
  }

  /**
   * Get session preps by date range
   */
  getByDateRange(
    campaignId: string,
    startDate: number,
    endDate: number
  ): SessionPrep[] {
    const stmt = this.db.prepare(`
      SELECT * FROM session_preps
      WHERE campaign_id = ?
        AND planned_date IS NOT NULL
        AND planned_date >= ?
        AND planned_date <= ?
      ORDER BY planned_date ASC
    `);

    const rows = stmt.all(campaignId, startDate, endDate) as SessionPrepRow[];
    return rows.map(this.rowToSessionPrep);
  }

  /**
   * Get upcoming session preps (planned_date >= now)
   */
  getUpcoming(campaignId: string): SessionPrep[] {
    const now = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      SELECT * FROM session_preps
      WHERE campaign_id = ?
        AND planned_date IS NOT NULL
        AND planned_date >= ?
        AND status != 'completed'
        AND status != 'cancelled'
      ORDER BY planned_date ASC
    `);

    const rows = stmt.all(campaignId, now) as SessionPrepRow[];
    return rows.map(this.rowToSessionPrep);
  }

  /**
   * Search session preps by name or description
   */
  search(campaignId: string, query: string): SessionPrep[] {
    const stmt = this.db.prepare(`
      SELECT * FROM session_preps
      WHERE campaign_id = ?
        AND (
          name LIKE ?
          OR description LIKE ?
          OR planned_events LIKE ?
        )
      ORDER BY planned_date DESC, created_at DESC
    `);

    const searchPattern = `%${query}%`;
    const rows = stmt.all(campaignId, searchPattern, searchPattern, searchPattern) as SessionPrepRow[];
    return rows.map(this.rowToSessionPrep);
  }

  /**
   * Convert database row to SessionPrep model
   */
  private rowToSessionPrep(row: SessionPrepRow): SessionPrep {
    return {
      id: row.id,
      campaign_id: row.campaign_id,
      name: row.name,
      description: row.description,
      core_status: row.core_status as 'active' | 'archived' | 'draft' | 'hidden',
      player_knowledge: 'dm_only',  // Always dm_only
      tags: JSON.parse(row.tags),
      created_at: row.created_at,
      updated_at: row.updated_at,
      custom_fields: JSON.parse(row.custom_fields),
      planned_date: row.planned_date,
      status: row.status as 'draft' | 'ready' | 'completed' | 'cancelled',
      planned_events: row.planned_events,
      possible_encounters: row.possible_encounters,
      plot_hooks: row.plot_hooks,
      dm_notes: row.dm_notes,
      is_canon: 0,  // Always 0
      canonical_status: 'hypothetical',  // Always 'hypothetical'
      plot_threads: JSON.parse(row.plot_threads),
      npcs_to_prep: JSON.parse(row.npcs_to_prep),
      locations_to_prep: JSON.parse(row.locations_to_prep),
    };
  }
}
