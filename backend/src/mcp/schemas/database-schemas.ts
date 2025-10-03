/**
 * Zod schemas for Database tools
 * Based on contracts/database-tools.json
 */

import { z } from 'zod';

// Common schema definitions
const DatabaseFieldSchema = z.object({
  name: z.string(),
  type: z.enum(['text', 'number', 'select', 'multiselect', 'date', 'checkbox', 'relation', 'user']),
  options: z.array(z.string()).optional(),
  relation_to: z.number().int().optional()
});

const DatabaseEntryValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null()
]);

// query_database_card schemas
export const QueryDatabaseCardInputSchema = z.object({
  database_id: z.number().int().positive(),
  campaign_id: z.string().min(1),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty']),
    value: DatabaseEntryValueSchema.optional()
  })).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0)
});

export const QueryDatabaseCardOutputSchema = z.object({
  database: z.object({
    id: z.number().int(),
    title: z.string(),
    schema: z.object({
      fields: z.array(DatabaseFieldSchema)
    })
  }),
  entries: z.array(z.object({
    id: z.string(),
    values: z.record(DatabaseEntryValueSchema),
    created_at: z.number().int(),
    updated_at: z.number().int()
  })),
  total_count: z.number().int(),
  has_more: z.boolean()
});

// create_database_entry schemas
export const CreateDatabaseEntryInputSchema = z.object({
  database_id: z.number().int().positive(),
  campaign_id: z.string().min(1),
  values: z.record(DatabaseEntryValueSchema)
});

export const CreateDatabaseEntryOutputSchema = z.object({
  entry: z.object({
    id: z.string(),
    database_id: z.number().int(),
    values: z.record(DatabaseEntryValueSchema),
    created_at: z.number().int(),
    updated_at: z.number().int()
  }),
  database_title: z.string()
});

// update_database_entry schemas
export const UpdateDatabaseEntryInputSchema = z.object({
  database_id: z.number().int().positive(),
  entry_id: z.string().min(1),
  campaign_id: z.string().min(1),
  values: z.record(DatabaseEntryValueSchema)
});

export const UpdateDatabaseEntryOutputSchema = z.object({
  entry: z.object({
    id: z.string(),
    database_id: z.number().int(),
    values: z.record(DatabaseEntryValueSchema),
    created_at: z.number().int(),
    updated_at: z.number().int()
  }),
  changed_fields: z.array(z.string())
});