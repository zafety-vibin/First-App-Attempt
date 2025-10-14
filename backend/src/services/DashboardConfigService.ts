/**
 * DashboardConfigService - Business logic for dashboard configuration operations
 * Feature: 015-create-the-dashboard
 *
 * Implements:
 * - Dashboard config CRUD operations
 * - Layout JSON serialization/deserialization
 * - Unique constraint enforcement (one config per user+campaign)
 * - Foreign key validation (campaign_id, user_id)
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface DashboardConfig {
  id: string;
  campaign_id: string;
  user_id: string;
  layout: any; // react-grid-layout configuration object
  created_at: number;
  updated_at: number;
}

export class DashboardConfigService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Get dashboard config by campaign and user
   * Returns null if not found
   */
  getDashboardConfig(campaignId: string, userId: string): DashboardConfig | null {
    const row = this.db.prepare(
      'SELECT * FROM dashboard_configs WHERE campaign_id = ? AND user_id = ?'
    ).get(campaignId, userId);

    if (!row) {
      return null;
    }

    return this.rowToConfig(row as any);
  }

  /**
   * Create new dashboard config
   */
  createDashboardConfig(campaignId: string, userId: string, layout: any): DashboardConfig {
    // Validate required fields
    if (!campaignId || !userId) {
      throw new Error('campaign_id and user_id are required');
    }

    // Validate campaign exists
    const campaign = this.db.prepare('SELECT id FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) {
      throw new Error('campaign_id references non-existent campaign');
    }

    // Validate user exists
    const user = this.db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(userId);
    if (!user) {
      throw new Error('user_id references non-existent user');
    }

    // Check if config already exists (unique constraint)
    const existing = this.getDashboardConfig(campaignId, userId);
    if (existing) {
      throw new Error('Dashboard config already exists for this user and campaign');
    }

    // Generate ID and timestamps
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Prepare data
    const configData: DashboardConfig = {
      id,
      campaign_id: campaignId,
      user_id: userId,
      layout: layout || { layouts: { lg: [] }, breakpoint: 'lg' },
      created_at: now,
      updated_at: now,
    };

    // Insert into database
    const stmt = this.db.prepare(`
      INSERT INTO dashboard_configs (
        id, campaign_id, user_id, layout, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      configData.id,
      configData.campaign_id,
      configData.user_id,
      JSON.stringify(configData.layout),
      configData.created_at,
      configData.updated_at
    );

    return configData;
  }

  /**
   * Update dashboard config layout
   */
  updateDashboardConfig(id: string, layout: any): DashboardConfig {
    // Check if config exists
    const existing = this.db.prepare('SELECT * FROM dashboard_configs WHERE id = ?').get(id);
    if (!existing) {
      throw new Error('Dashboard config not found');
    }

    // Update timestamp
    const now = Math.floor(Date.now() / 1000);

    // Update layout
    const stmt = this.db.prepare(`
      UPDATE dashboard_configs
      SET layout = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(JSON.stringify(layout), now, id);

    // Return updated config
    const updated = this.db.prepare('SELECT * FROM dashboard_configs WHERE id = ?').get(id);
    return this.rowToConfig(updated as any);
  }

  /**
   * Delete dashboard config
   */
  deleteDashboardConfig(id: string): void {
    const existing = this.db.prepare('SELECT * FROM dashboard_configs WHERE id = ?').get(id);
    if (!existing) {
      throw new Error('Dashboard config not found');
    }

    const stmt = this.db.prepare('DELETE FROM dashboard_configs WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Convert database row to DashboardConfig object
   */
  private rowToConfig(row: any): DashboardConfig {
    return {
      id: row.id,
      campaign_id: row.campaign_id,
      user_id: row.user_id,
      layout: row.layout ? JSON.parse(row.layout) : { layouts: { lg: [] }, breakpoint: 'lg' },
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}