/**
 * Zod schemas for Information Level tools
 * Based on contracts/info-level-tools.json
 */

import { z } from 'zod';

// list_information_levels schemas
export const ListInformationLevelsInputSchema = z.object({
  campaign_id: z.string().min(1),
  include_counts: z.boolean().optional().default(false)
});

export const ListInformationLevelsOutputSchema = z.object({
  levels: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    color: z.string(),
    icon: z.string(),
    description: z.string().optional(),
    is_system: z.boolean(),
    hierarchical_filter: z.boolean(),
    position: z.number().int(),
    card_count: z.number().int().optional()
  })),
  total_count: z.number().int()
});

// get_information_level_by_name schemas
export const GetInformationLevelByNameInputSchema = z.object({
  campaign_id: z.string().min(1),
  name: z.string().min(1)
});

export const GetInformationLevelByNameOutputSchema = z.object({
  level: z.object({
    id: z.number().int(),
    name: z.string(),
    color: z.string(),
    icon: z.string(),
    description: z.string().optional(),
    is_system: z.boolean(),
    hierarchical_filter: z.boolean(),
    position: z.number().int(),
    created_at: z.number().int(),
    updated_at: z.number().int()
  }).nullable(),
  found: z.boolean()
});