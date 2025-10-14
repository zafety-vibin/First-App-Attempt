/**
 * CategoryLandingConfigService - Business logic for category landing configuration operations
 * Feature: 015-create-the-dashboard
 *
 * Implements:
 * - Category landing config CRUD operations
 * - Layout JSON and TipTap description serialization/deserialization
 * - Category validation (13 valid categories from Feature 014)
 * - Title max length enforcement (200 chars)
 * - Unique constraint enforcement (one config per user+campaign+category)
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface CategoryLandingConfig {
  id: string;
  campaign_id: string;
  user_id: string;
  category: string;
  layout: any; // react-grid-layout configuration object
  title: string | null;
  description: string | null; // TipTap JSON string
  created_at: number;
  updated_at: number;
}

// Valid category names from Feature 014
const VALID_CATEGORIES = [
  'npcs',
  'locations',
  'factions',
  'session_recaps',
  'quests',
  'player_characters',
  'lore_entries',
  'world_rules',
  'planar_forces',
  'session_prep',
  'custom_mechanics',
  'items',
  'creatures'
];

export class CategoryLandingConfigService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Get category landing config by campaign, user, and category
   * Returns null if not found
   */
  getCategoryLandingConfig(campaignId: string, userId: string, category: string): CategoryLandingConfig | null {
    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    const row = this.db.prepare(
      'SELECT * FROM category_landing_configs WHERE campaign_id = ? AND user_id = ? AND category = ?'
    ).get(campaignId, userId, category);

    if (!row) {
      return null;
    }

    return this.rowToConfig(row as any);
  }

  /**
   * Create new category landing config
   */
  createCategoryLandingConfig(
    campaignId: string,
    userId: string,
    category: string,
    layout: any,
    title?: string | null,
    description?: string | null
  ): CategoryLandingConfig {
    // Validate required fields
    if (!campaignId || !userId || !category) {
      throw new Error('campaign_id, user_id, and category are required');
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category: ${category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    // Validate title length
    if (title && title.length > 200) {
      throw new Error('Title must be 200 characters or less');
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
    const existing = this.getCategoryLandingConfig(campaignId, userId, category);
    if (existing) {
      throw new Error('Category landing config already exists for this user, campaign, and category');
    }

    // Generate ID and timestamps
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Prepare data
    const configData: CategoryLandingConfig = {
      id,
      campaign_id: campaignId,
      user_id: userId,
      category,
      layout: layout || { layouts: { lg: [] }, breakpoint: 'lg' },
      title: title || null,
      description: description || null,
      created_at: now,
      updated_at: now,
    };

    // Insert into database
    const stmt = this.db.prepare(`
      INSERT INTO category_landing_configs (
        id, campaign_id, user_id, category, layout, title, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      configData.id,
      configData.campaign_id,
      configData.user_id,
      configData.category,
      JSON.stringify(configData.layout),
      configData.title,
      configData.description,
      configData.created_at,
      configData.updated_at
    );

    return configData;
  }

  /**
   * Update category landing config (layout, title, and/or description)
   */
  updateCategoryLandingConfig(
    id: string,
    layout?: any,
    title?: string | null,
    description?: string | null
  ): CategoryLandingConfig {
    // Check if config exists
    const existing = this.db.prepare('SELECT * FROM category_landing_configs WHERE id = ?').get(id);
    if (!existing) {
      throw new Error('Category landing config not found');
    }

    // Validate title length if provided
    if (title !== undefined && title !== null && title.length > 200) {
      throw new Error('Title must be 200 characters or less');
    }

    // Build UPDATE statement dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (layout !== undefined) {
      updates.push('layout = ?');
      params.push(JSON.stringify(layout));
    }

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (updates.length === 0) {
      // No updates provided, return existing config
      return this.rowToConfig(existing as any);
    }

    // Update timestamp
    const now = Math.floor(Date.now() / 1000);
    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE category_landing_configs
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);

    // Return updated config
    const updated = this.db.prepare('SELECT * FROM category_landing_configs WHERE id = ?').get(id);
    return this.rowToConfig(updated as any);
  }

  /**
   * Delete category landing config
   */
  deleteCategoryLandingConfig(id: string): void {
    const existing = this.db.prepare('SELECT * FROM category_landing_configs WHERE id = ?').get(id);
    if (!existing) {
      throw new Error('Category landing config not found');
    }

    const stmt = this.db.prepare('DELETE FROM category_landing_configs WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Convert database row to CategoryLandingConfig object
   */
  private rowToConfig(row: any): CategoryLandingConfig {
    return {
      id: row.id,
      campaign_id: row.campaign_id,
      user_id: row.user_id,
      category: row.category,
      layout: row.layout ? JSON.parse(row.layout) : { layouts: { lg: [] }, breakpoint: 'lg' },
      title: row.title,
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}