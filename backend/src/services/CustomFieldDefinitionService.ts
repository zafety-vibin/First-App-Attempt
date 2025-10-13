/**
 * Custom Field Definition Service - Feature 014
 * Handles custom field definition CRUD operations for category tables (npcs, locations, etc.)
 */

import { db } from './DatabaseService';
import { CustomFieldDefinition } from '../models/customFieldDefinition';
import crypto from 'crypto';

interface CreateCustomFieldDefinitionInput {
  campaignId: string;
  category: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'select' | 'multi_select' | 'date';
  options?: string[] | null;
}

interface UpdateCustomFieldDefinitionInput {
  fieldLabel?: string;
  fieldType?: 'text' | 'number' | 'select' | 'multi_select' | 'date';
  options?: string[] | null;
}

interface CustomFieldDefinitionRow {
  id: string;
  campaign_id: string;
  category: string;
  field_name: string;
  field_label: string;
  field_type: string;
  options: string | null;
  created_at: number;
  updated_at: number;
}

export class CustomFieldDefinitionService {
  /**
   * Convert database row to CustomFieldDefinition model
   */
  private static rowToModel(row: CustomFieldDefinitionRow): CustomFieldDefinition {
    return {
      id: row.id,
      campaign_id: row.campaign_id,
      category: row.category,
      field_name: row.field_name,
      field_label: row.field_label,
      field_type: row.field_type as 'text' | 'number' | 'select' | 'multi_select' | 'date',
      options: row.options ? JSON.parse(row.options) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Get all custom field definitions for a campaign and category
   */
  static getByCampaignAndCategory(campaignId: string, category: string): CustomFieldDefinition[] {
    const rows = db
      .prepare(
        `SELECT * FROM custom_field_definitions
         WHERE campaign_id = ? AND category = ?
         ORDER BY created_at ASC`
      )
      .all(campaignId, category) as CustomFieldDefinitionRow[];

    return rows.map(this.rowToModel);
  }

  /**
   * Get all custom field definitions for a campaign (all categories)
   */
  static getByCampaign(campaignId: string): CustomFieldDefinition[] {
    const rows = db
      .prepare(
        `SELECT * FROM custom_field_definitions
         WHERE campaign_id = ?
         ORDER BY category ASC, created_at ASC`
      )
      .all(campaignId) as CustomFieldDefinitionRow[];

    return rows.map(this.rowToModel);
  }

  /**
   * Get custom field definition by ID
   */
  static getById(id: string): CustomFieldDefinition | null {
    const row = db
      .prepare('SELECT * FROM custom_field_definitions WHERE id = ?')
      .get(id) as CustomFieldDefinitionRow | undefined;

    return row ? this.rowToModel(row) : null;
  }

  /**
   * Create new custom field definition
   * @throws Error with code 'CONFLICT' if (campaign_id, category, field_name) already exists
   * @throws Error if options are required but missing for select/multi_select types
   */
  static create(input: CreateCustomFieldDefinitionInput): CustomFieldDefinition {
    // Validate options for select/multi_select types
    if ((input.fieldType === 'select' || input.fieldType === 'multi_select')) {
      if (!input.options || input.options.length === 0) {
        const error: any = new Error(`Options are required for ${input.fieldType} field type`);
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
    }

    // Ensure options is null for non-select types
    const options = (input.fieldType === 'select' || input.fieldType === 'multi_select')
      ? input.options
      : null;

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    try {
      const stmt = db.prepare(`
        INSERT INTO custom_field_definitions
        (id, campaign_id, category, field_name, field_label, field_type, options, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        input.campaignId,
        input.category,
        input.fieldName,
        input.fieldLabel,
        input.fieldType,
        options ? JSON.stringify(options) : null,
        now,
        now
      );

      return this.getById(id)!;
    } catch (error: any) {
      // Catch UNIQUE constraint violation for (campaign_id, category, field_name)
      if (
        error.code === 'SQLITE_CONSTRAINT_UNIQUE' &&
        error.message.includes('custom_field_definitions.campaign_id')
      ) {
        const conflictError: any = new Error(
          `Custom field '${input.fieldName}' already exists for category '${input.category}' in this campaign`
        );
        conflictError.code = 'CONFLICT';
        throw conflictError;
      }
      throw error;
    }
  }

  /**
   * Update custom field definition
   * @throws Error if not found
   * @throws Error if options are required but missing for select/multi_select types
   */
  static update(id: string, input: UpdateCustomFieldDefinitionInput): CustomFieldDefinition {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error('Custom field definition not found');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (input.fieldLabel !== undefined) {
      updates.push('field_label = ?');
      values.push(input.fieldLabel);
    }

    if (input.fieldType !== undefined) {
      // Validate options if changing to select/multi_select
      if ((input.fieldType === 'select' || input.fieldType === 'multi_select')) {
        const newOptions = input.options !== undefined ? input.options : existing.options;
        if (!newOptions || newOptions.length === 0) {
          const error: any = new Error(`Options are required for ${input.fieldType} field type`);
          error.code = 'VALIDATION_ERROR';
          throw error;
        }
      }

      updates.push('field_type = ?');
      values.push(input.fieldType);
    }

    if (input.options !== undefined) {
      const finalType = input.fieldType !== undefined ? input.fieldType : existing.field_type;

      // Only allow options for select/multi_select types
      if (finalType === 'select' || finalType === 'multi_select') {
        if (!input.options || input.options.length === 0) {
          const error: any = new Error(`Options are required for ${finalType} field type`);
          error.code = 'VALIDATION_ERROR';
          throw error;
        }
        updates.push('options = ?');
        values.push(JSON.stringify(input.options));
      } else {
        // Set to null for non-select types
        updates.push('options = ?');
        values.push(null);
      }
    }

    // Always update updated_at
    const now = Math.floor(Date.now() / 1000);
    updates.push('updated_at = ?');
    values.push(now);

    // Add id for WHERE clause
    values.push(id);

    const stmt = db.prepare(
      `UPDATE custom_field_definitions SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);

    return this.getById(id)!;
  }

  /**
   * Delete custom field definition
   * @throws Error if not found
   */
  static delete(id: string): void {
    const stmt = db.prepare('DELETE FROM custom_field_definitions WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      throw new Error('Custom field definition not found');
    }
  }

  /**
   * Check if a custom field definition belongs to a campaign
   */
  static belongsToCampaign(id: string, campaignId: string): boolean {
    const definition = this.getById(id);
    return definition ? definition.campaign_id === campaignId : false;
  }

  /**
   * Delete all custom field definitions for a campaign and category
   * Useful for cleanup operations
   */
  static deleteByCampaignAndCategory(campaignId: string, category: string): number {
    const stmt = db.prepare(
      'DELETE FROM custom_field_definitions WHERE campaign_id = ? AND category = ?'
    );
    const result = stmt.run(campaignId, category);
    return result.changes;
  }

  /**
   * Delete all custom field definitions for a campaign
   * Useful for campaign deletion cleanup
   */
  static deleteByCampaign(campaignId: string): number {
    const stmt = db.prepare('DELETE FROM custom_field_definitions WHERE campaign_id = ?');
    const result = stmt.run(campaignId);
    return result.changes;
  }
}
