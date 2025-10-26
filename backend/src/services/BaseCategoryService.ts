/**
 * BaseCategoryService - Abstract base class for all 13 category services
 * Feature: 014-create-the-database (standardization)
 *
 * Enforces consistent interface across all category services:
 * - Standard CRUD operations
 * - Universal field handling (10 shared fields)
 * - Optional campaign ownership validation
 * - Consistent error handling and validation
 *
 * All category services MUST extend this class and implement category-specific logic.
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

/**
 * Universal entity fields (shared by all 13 categories)
 */
export interface UniversalFields {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;
}

/**
 * Standard pagination interface
 */
export interface Pagination {
  limit: number;
  offset: number;
}

/**
 * Standard filters interface
 */
export interface EntityFilters {
  campaign_id?: string;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string;
  tags?: string[];
  [key: string]: any; // Allow category-specific filters
}

/**
 * Standard list result interface
 */
export interface ListResult<T> {
  data: T[];
  total: number;
}

/**
 * Options for create/update operations
 */
export interface OperationOptions {
  /** Optional: Validate campaign ownership (for authenticated contexts) */
  ownerId?: string;
  /** Optional: Skip validation (for testing/migration contexts) */
  skipValidation?: boolean;
}

/**
 * Abstract base class for category services
 */
export abstract class BaseCategoryService<T extends UniversalFields> {
  protected db: Database.Database;
  protected tableName: string;

  constructor(db: Database.Database, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * Create new entity with universal field auto-population
   *
   * @param data Entity data (must include campaign_id and name minimum)
   * @param options Optional ownership validation
   */
  create(data: Partial<T>, options?: OperationOptions): T {
    // Validate universal required fields
    if (!data.campaign_id || !data.name) {
      throw new Error('campaign_id and name are required');
    }

    // Validate campaign ownership if ownerId provided
    if (options?.ownerId && !options?.skipValidation) {
      this.validateCampaignOwnership(data.campaign_id, options.ownerId);
    }

    // Validate core_status enum
    if (data.core_status && !['active', 'archived', 'draft', 'hidden'].includes(data.core_status)) {
      throw new Error('Invalid core_status value. Must be: active, archived, draft, or hidden');
    }

    // Auto-populate universal fields
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const entityData = {
      id,
      created_at: now,
      updated_at: now,
      core_status: data.core_status || 'active',
      tags: data.tags || [],
      custom_fields: data.custom_fields || {},
      description: data.description || null,
      player_knowledge: data.player_knowledge || null,
      ...data,
    } as T;

    // Category-specific validation and insertion
    this.validateCategoryFields(entityData, options);
    this.insertEntity(entityData);

    return entityData;
  }

  /**
   * Update entity with auto-refresh of updated_at
   */
  update(id: string, data: Partial<T>, options?: OperationOptions): T {
    // Fetch existing entity
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`${this.tableName} with id ${id} not found`);
    }

    // Validate campaign ownership if ownerId provided
    if (options?.ownerId && !options?.skipValidation) {
      this.validateCampaignOwnership(existing.campaign_id, options.ownerId);
    }

    // Validate core_status enum if being updated
    if (data.core_status && !['active', 'archived', 'draft', 'hidden'].includes(data.core_status)) {
      throw new Error('Invalid core_status value. Must be: active, archived, draft, or hidden');
    }

    // Auto-refresh updated_at (ensure it's always updated, even for partial updates)
    const updatedData = {
      ...data,
      updated_at: Math.floor(Date.now() / 1000),
    } as Partial<T>;

    // Category-specific validation and update
    this.validateCategoryFields(updatedData as T, options);
    this.updateEntity(id, updatedData);

    // Return updated entity
    return this.findById(id)!;
  }

  /**
   * Delete entity
   */
  delete(id: string, options?: OperationOptions): void {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`${this.tableName} with id ${id} not found`);
    }

    // Validate campaign ownership if ownerId provided
    if (options?.ownerId && !options?.skipValidation) {
      this.validateCampaignOwnership(existing.campaign_id, options.ownerId);
    }

    this.deleteEntity(id);
  }

  /**
   * Find entity by ID
   */
  abstract findById(id: string): T | null;

  /**
   * List entities with filters and pagination
   */
  abstract list(
    filters: EntityFilters,
    pagination: Pagination,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): ListResult<T>;

  /**
   * Category-specific validation (override in subclass)
   */
  protected validateCategoryFields(data: Partial<T>, options?: OperationOptions): void {
    // Override in subclass for category-specific validation
    // e.g., validate NPC.level >= 1, faction.power_level in range, etc.
  }

  /**
   * Insert entity into database (override in subclass)
   */
  protected abstract insertEntity(data: T): void;

  /**
   * Update entity in database (override in subclass)
   */
  protected abstract updateEntity(id: string, data: Partial<T>): void;

  /**
   * Delete entity from database (override in subclass)
   */
  protected abstract deleteEntity(id: string): void;

  /**
   * Validate campaign ownership (shared utility)
   */
  protected validateCampaignOwnership(campaignId: string, ownerId: string): void {
    const campaign = this.db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaignId, ownerId);

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }
  }

  /**
   * Validate campaign exists (shared utility)
   */
  protected validateCampaignExists(campaignId: string): void {
    const campaign = this.db
      .prepare('SELECT id FROM campaigns WHERE id = ?')
      .get(campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }
  }

  /**
   * Convert database row to entity (helper for JSON field parsing)
   */
  protected parseJsonFields(row: any, jsonFields: string[]): any {
    const parsed = { ...row };

    for (const field of jsonFields) {
      if (parsed[field] && typeof parsed[field] === 'string') {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (err) {
          console.warn(`Failed to parse JSON field ${field}:`, err);
          parsed[field] = field === 'tags' ? [] : {};
        }
      }
    }

    return parsed;
  }

  /**
   * Serialize JSON fields for database storage
   */
  protected serializeJsonFields(data: any, jsonFields: string[]): any {
    const serialized = { ...data };

    for (const field of jsonFields) {
      if (serialized[field] && typeof serialized[field] !== 'string') {
        serialized[field] = JSON.stringify(serialized[field]);
      }
    }

    return serialized;
  }
}
