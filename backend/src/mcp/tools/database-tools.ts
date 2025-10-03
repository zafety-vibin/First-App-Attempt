/**
 * MCP Database Tools Implementation
 * Provides 3 tools for database card management: query_database_card, create_database_entry, update_database_entry
 */

import {
  QueryDatabaseCardInputSchema,
  CreateDatabaseEntryInputSchema,
  UpdateDatabaseEntryInputSchema
} from '../schemas/database-schemas';
import { db } from '../../services/DatabaseService';

/**
 * Handler for query_database_card tool
 */
export async function handleQueryDatabaseCard(params: any) {
  try {
    const validated = QueryDatabaseCardInputSchema.parse(params);
    const limit = validated.limit || 50;
    const offset = validated.offset || 0;

    // Get the card and verify it's a database type
    const cardRow = db.prepare(`
      SELECT * FROM cards
      WHERE id = ? AND campaign_id = ?
    `).get(validated.database_id, validated.campaign_id) as any;

    if (!cardRow) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CARD_NOT_FOUND',
            message: `Database card not found: ${validated.database_id}`
          })
        }]
      };
    }

    if (cardRow.type !== 'database') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CARD_NOT_DATABASE_TYPE',
            message: `Card ${validated.database_id} is not a database type (type: ${cardRow.type})`
          })
        }]
      };
    }

    // Parse the database content
    const content = JSON.parse(cardRow.content || '{}');
    const schema = content.schema || { fields: [] };
    const rows = content.rows || [];

    // Apply filters
    let filteredRows = rows;
    if (validated.filters && validated.filters.length > 0) {
      filteredRows = rows.filter((row: any) => {
        for (const filter of validated.filters!) {
          const rowValue = row[filter.field];

          switch (filter.operator) {
            case 'equals':
              if (rowValue !== filter.value) return false;
              break;
            case 'not_equals':
              if (rowValue === filter.value) return false;
              break;
            case 'contains':
              if (!rowValue || !String(rowValue).toLowerCase().includes(String(filter.value).toLowerCase())) return false;
              break;
            case 'not_contains':
              if (rowValue && String(rowValue).toLowerCase().includes(String(filter.value).toLowerCase())) return false;
              break;
            case 'greater_than':
              if (Number(rowValue) <= Number(filter.value)) return false;
              break;
            case 'less_than':
              if (Number(rowValue) >= Number(filter.value)) return false;
              break;
            case 'is_empty':
              if (rowValue != null && rowValue !== '') return false;
              break;
            case 'is_not_empty':
              if (rowValue == null || rowValue === '') return false;
              break;
          }
        }
        return true;
      });
    }

    // Apply sorting
    if (validated.sort_by) {
      filteredRows.sort((a: any, b: any) => {
        const aVal = a[validated.sort_by!];
        const bVal = b[validated.sort_by!];

        // Handle null/undefined values
        if (aVal == null) return validated.sort_order === 'asc' ? -1 : 1;
        if (bVal == null) return validated.sort_order === 'asc' ? 1 : -1;

        // Sort based on value type
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          const diff = aVal - bVal;
          return validated.sort_order === 'asc' ? diff : -diff;
        } else {
          const result = String(aVal).localeCompare(String(bVal));
          return validated.sort_order === 'asc' ? result : -result;
        }
      });
    }

    // Apply pagination
    const paginatedRows = filteredRows.slice(offset, offset + limit);

    // Format entries for output
    const entries = paginatedRows.map((row: any) => ({
      id: row.id || row.entry_id || String(row._id),
      values: row,
      created_at: row.created_at || Date.now(),
      updated_at: row.updated_at || Date.now()
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          database: {
            id: cardRow.id,
            title: cardRow.title,
            schema: {
              fields: schema.fields || schema.columns || []
            }
          },
          entries,
          total_count: filteredRows.length,
          has_more: offset + limit < filteredRows.length
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for create_database_entry tool
 */
export async function handleCreateDatabaseEntry(params: any) {
  try {
    const validated = CreateDatabaseEntryInputSchema.parse(params);

    // Use transaction for atomicity
    const result = db.transaction(() => {
      // Get the card and verify it's a database type
      const cardRow = db.prepare(`
        SELECT * FROM cards
        WHERE id = ? AND campaign_id = ?
      `).get(validated.database_id, validated.campaign_id) as any;

      if (!cardRow) {
        throw new Error(`Database card not found: ${validated.database_id}`);
      }

      if (cardRow.type !== 'database') {
        throw new Error(`Card ${validated.database_id} is not a database type (type: ${cardRow.type})`);
      }

      // Parse the database content
      const content = JSON.parse(cardRow.content || '{}');
      const schema = content.schema || { fields: [] };
      const rows = content.rows || [];

      // Validate values against schema
      const newEntry: any = {};
      const fields = schema.fields || schema.columns || [];

      for (const field of fields) {
        const value = validated.values[field.name];

        // Check required fields
        if (field.required && value == null) {
          throw new Error(`Required field missing: ${field.name}`);
        }

        // Validate type
        if (value != null) {
          switch (field.type) {
            case 'number':
              if (typeof value !== 'number' && isNaN(Number(value))) {
                throw new Error(`Invalid number for field: ${field.name}`);
              }
              newEntry[field.name] = Number(value);
              break;
            case 'checkbox':
              newEntry[field.name] = Boolean(value);
              break;
            case 'select':
              if (field.options && !field.options.includes(value)) {
                throw new Error(`Invalid option for field ${field.name}: ${value}`);
              }
              newEntry[field.name] = value;
              break;
            case 'multiselect':
              if (field.options && Array.isArray(value)) {
                const invalidOptions = value.filter(v => !field.options.includes(v));
                if (invalidOptions.length > 0) {
                  throw new Error(`Invalid options for field ${field.name}: ${invalidOptions.join(', ')}`);
                }
              }
              newEntry[field.name] = value;
              break;
            default:
              newEntry[field.name] = value;
          }
        } else {
          newEntry[field.name] = field.default || null;
        }
      }

      // Generate entry ID (auto-increment)
      const maxId = rows.reduce((max: number, row: any) => {
        const id = parseInt(row.id || row.entry_id || 0);
        return id > max ? id : max;
      }, 0);
      const entryId = String(maxId + 1);
      newEntry.id = entryId;

      // Add timestamps
      const now = Date.now();
      newEntry.created_at = now;
      newEntry.updated_at = now;

      // Add entry to rows
      rows.push(newEntry);

      // Update card content
      content.rows = rows;
      const updatedContent = JSON.stringify(content);

      // Save to database
      db.prepare(`
        UPDATE cards
        SET content = ?, updated_at = ?
        WHERE id = ? AND campaign_id = ?
      `).run(updatedContent, now, validated.database_id, validated.campaign_id);

      return {
        entry: {
          id: entryId,
          database_id: validated.database_id,
          values: newEntry,
          created_at: now,
          updated_at: now
        },
        database_title: cardRow.title
      };
    })();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result)
      }]
    };
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CARD_NOT_FOUND',
            message: error.message
          })
        }]
      };
    } else if (error.message?.includes('not a database type')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CARD_NOT_DATABASE_TYPE',
            message: error.message
          })
        }]
      };
    } else if (error.message?.includes('Required field') || error.message?.includes('Invalid')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'SCHEMA_VALIDATION_FAILED',
            message: error.message
          })
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'CREATE_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for update_database_entry tool
 */
export async function handleUpdateDatabaseEntry(params: any) {
  try {
    const validated = UpdateDatabaseEntryInputSchema.parse(params);

    // Use transaction for atomicity
    const result = db.transaction(() => {
      // Get the card and verify it's a database type
      const cardRow = db.prepare(`
        SELECT * FROM cards
        WHERE id = ? AND campaign_id = ?
      `).get(validated.database_id, validated.campaign_id) as any;

      if (!cardRow) {
        throw new Error(`Database card not found: ${validated.database_id}`);
      }

      if (cardRow.type !== 'database') {
        throw new Error(`Card ${validated.database_id} is not a database type (type: ${cardRow.type})`);
      }

      // Parse the database content
      const content = JSON.parse(cardRow.content || '{}');
      const schema = content.schema || { fields: [] };
      const rows = content.rows || [];

      // Find the entry
      const entryIndex = rows.findIndex((row: any) =>
        String(row.id || row.entry_id) === String(validated.entry_id)
      );

      if (entryIndex === -1) {
        throw new Error(`Entry not found: ${validated.entry_id}`);
      }

      const existingEntry = rows[entryIndex];
      const fields = schema.fields || schema.columns || [];
      const changedFields: string[] = [];

      // Validate and merge values
      const updatedEntry = { ...existingEntry };
      for (const [fieldName, value] of Object.entries(validated.values)) {
        const field = fields.find((f: any) => f.name === fieldName);

        if (!field) {
          // Skip unknown fields
          continue;
        }

        // Track changed fields
        if (updatedEntry[fieldName] !== value) {
          changedFields.push(fieldName);
        }

        // Validate type
        if (value != null) {
          switch (field.type) {
            case 'number':
              if (typeof value !== 'number' && isNaN(Number(value))) {
                throw new Error(`Invalid number for field: ${fieldName}`);
              }
              updatedEntry[fieldName] = Number(value);
              break;
            case 'checkbox':
              updatedEntry[fieldName] = Boolean(value);
              break;
            case 'select':
              if (field.options && !field.options.includes(value)) {
                throw new Error(`Invalid option for field ${fieldName}: ${value}`);
              }
              updatedEntry[fieldName] = value;
              break;
            case 'multiselect':
              if (field.options && Array.isArray(value)) {
                const invalidOptions = value.filter((v: any) => !field.options.includes(v));
                if (invalidOptions.length > 0) {
                  throw new Error(`Invalid options for field ${fieldName}: ${invalidOptions.join(', ')}`);
                }
              }
              updatedEntry[fieldName] = value;
              break;
            default:
              updatedEntry[fieldName] = value;
          }
        }
      }

      // Add updated timestamp
      const now = Date.now();
      updatedEntry.updated_at = now;

      // Replace entry in rows
      rows[entryIndex] = updatedEntry;

      // Update card content
      content.rows = rows;
      const updatedContent = JSON.stringify(content);

      // Save to database
      db.prepare(`
        UPDATE cards
        SET content = ?, updated_at = ?
        WHERE id = ? AND campaign_id = ?
      `).run(updatedContent, now, validated.database_id, validated.campaign_id);

      return {
        entry: {
          id: validated.entry_id,
          database_id: validated.database_id,
          values: updatedEntry,
          created_at: updatedEntry.created_at || now,
          updated_at: now
        },
        changed_fields: changedFields
      };
    })();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result)
      }]
    };
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      const errorType = error.message.includes('Entry') ? 'ENTRY_NOT_FOUND' : 'CARD_NOT_FOUND';
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: errorType,
            message: error.message
          })
        }]
      };
    } else if (error.message?.includes('not a database type')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CARD_NOT_DATABASE_TYPE',
            message: error.message
          })
        }]
      };
    } else if (error.message?.includes('Invalid')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'SCHEMA_VALIDATION_FAILED',
            message: error.message
          })
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'UPDATE_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Tool definitions for database card management
 */
export const databaseToolDefinitions = [
  {
    name: 'query_database_card',
    description: 'Query entries in a database-type card with filtering and sorting',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: { type: 'number' },
        campaign_id: { type: 'string' },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              operator: {
                type: 'string',
                enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty']
              },
              value: { type: ['string', 'number', 'boolean', 'array', 'null'] }
            },
            required: ['field', 'operator']
          }
        },
        sort_by: { type: 'string' },
        sort_order: { type: 'string', enum: ['asc', 'desc'] },
        limit: { type: 'number', minimum: 1, maximum: 100 },
        offset: { type: 'number', minimum: 0 }
      },
      required: ['database_id', 'campaign_id']
    },
    handler: handleQueryDatabaseCard
  },
  {
    name: 'create_database_entry',
    description: 'Create a new entry in a database-type card',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: { type: 'number' },
        campaign_id: { type: 'string' },
        values: { type: 'object' }
      },
      required: ['database_id', 'campaign_id', 'values']
    },
    handler: handleCreateDatabaseEntry
  },
  {
    name: 'update_database_entry',
    description: 'Update an existing entry in a database-type card',
    inputSchema: {
      type: 'object',
      properties: {
        database_id: { type: 'number' },
        campaign_id: { type: 'string' },
        entry_id: { type: 'string' },
        values: { type: 'object' }
      },
      required: ['database_id', 'campaign_id', 'entry_id', 'values']
    },
    handler: handleUpdateDatabaseEntry
  }
];