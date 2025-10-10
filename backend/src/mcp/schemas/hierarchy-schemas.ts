/**
 * Zod schemas for Hierarchy tools
 * Based on contracts/hierarchy-tools.json
 */

import { z } from 'zod';

// get_card_path schemas
export const GetCardPathInputSchema = z.object({
  card_id: z.number().int().positive(),
  campaign_id: z.string().min(1)
});

export const GetCardPathOutputSchema = z.object({
  path: z.array(z.object({
    id: z.number().int(),
    title: z.string(),
    card_type: z.enum(['text', 'database', 'map'])
  })),
  full_path: z.string()
});

// get_subtree schemas
export const GetSubtreeInputSchema = z.object({
  card_id: z.number().int().positive(),
  campaign_id: z.string().min(1),
  max_depth: z.number().int().positive().max(10).optional().default(3),
  include_content: z.boolean().optional().default(false)
});

const CardNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.number().int(),
    title: z.string(),
    card_type: z.enum(['text', 'database', 'map']),
    information_level_id: z.number().int().nullable(),
    position: z.number().int(),
    content: z.record(z.any()).optional(),
    children: z.array(CardNodeSchema)
  })
);

export const GetSubtreeOutputSchema = z.object({
  tree: CardNodeSchema,
  total_nodes: z.number().int()
});

// list_children schemas
export const ListChildrenInputSchema = z.object({
  parent_id: z.string().optional().default("0"), // "0" = root level (changed from nullable null)
  campaign_id: z.string().min(1)
});

export const ListChildrenOutputSchema = z.object({
  children: z.array(z.object({
    id: z.number().int(),
    title: z.string(),
    card_type: z.enum(['text', 'database', 'map']),
    information_level_id: z.number().int().nullable(),
    position: z.number().int(),
    has_children: z.boolean()
  })),
  count: z.number().int()
});

// get_siblings schemas
export const GetSiblingsInputSchema = z.object({
  card_id: z.number().int().positive(),
  campaign_id: z.string().min(1)
});

export const GetSiblingsOutputSchema = z.object({
  siblings: z.array(z.object({
    id: z.number().int(),
    title: z.string(),
    card_type: z.enum(['text', 'database', 'map']),
    position: z.number().int(),
    is_current: z.boolean()
  })),
  parent_id: z.number().int().nullable()
});

// get_ancestor schemas
export const GetAncestorInputSchema = z.object({
  card_id: z.number().int().positive(),
  campaign_id: z.string().min(1),
  ancestor_type: z.enum(['text', 'database', 'map'])
});

export const GetAncestorOutputSchema = z.object({
  ancestor: z.object({
    id: z.number().int(),
    title: z.string(),
    card_type: z.enum(['text', 'database', 'map']),
    depth: z.number().int()
  }).nullable(),
  found: z.boolean()
});