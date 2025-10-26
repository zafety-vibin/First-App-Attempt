/**
 * Zod schemas for Category tools (Feature 014 Integration)
 *
 * Replaces old database-schemas.ts which referenced card-based databases.
 * Now uses Feature 014's 13 category tables with Feature 018's ExternalAPIService.
 */

import { z } from 'zod';

/**
 * Valid categories from Feature 014
 */
export const CategoryEnum = z.enum([
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
]);

/**
 * Universal fields (all 13 categories share these)
 */
export const UniversalFieldsSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  core_status: z.enum(['active', 'archived', 'draft', 'hidden']).optional(),
  player_knowledge: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.any()).optional()
});

/**
 * Query category input schema
 */
export const QueryCategoryInputSchema = z.object({
  category: CategoryEnum,
  campaign_id: z.string().uuid(),
  filters: z.record(z.any()).optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(50),
  sort: z.string().optional(),
  view_mode: z.enum(['dm_view', 'player_view']).optional().default('dm_view'),
  search: z.string().optional()
});

/**
 * Create category entry input schema
 */
export const CreateCategoryEntryInputSchema = z.object({
  category: CategoryEnum,
  campaign_id: z.string().uuid(),
  data: UniversalFieldsSchema.passthrough() // Allow category-specific fields
});

/**
 * Update category entry input schema
 */
export const UpdateCategoryEntryInputSchema = z.object({
  category: CategoryEnum,
  campaign_id: z.string().uuid(),
  entry_id: z.string().uuid(),
  updates: z.record(z.any()) // Partial updates
});

/**
 * Delete category entry input schema
 */
export const DeleteCategoryEntryInputSchema = z.object({
  category: CategoryEnum,
  campaign_id: z.string().uuid(),
  entry_id: z.string().uuid(),
  confirm: z.boolean().optional().default(false),
  confirmation_token: z.string().optional()
});

/**
 * Navigate hierarchy input schema
 */
export const NavigateHierarchyInputSchema = z.object({
  category: z.enum(['locations', 'npcs']),
  campaign_id: z.string().uuid(),
  parent_id: z.string().uuid(),
  depth: z.number().int().min(1).max(5).optional().default(1)
});
