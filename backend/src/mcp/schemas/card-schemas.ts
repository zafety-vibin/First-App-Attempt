/**
 * Zod schemas for Card tools
 * Based on contracts/card-tools.json
 */

import { z } from 'zod';

// read_card schemas
export const ReadCardInputSchema = z.object({
  card_id: z.string().uuid(),
  campaign_id: z.string().min(1)
});

export const ReadCardOutputSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string(),
  parent_id: z.string().uuid().nullable(),
  title: z.string(),
  card_type: z.enum(['text', 'database', 'map']),
  content: z.record(z.any()), // ProseMirror JSON
  information_level_id: z.string().uuid().nullable(),
  position: z.number().int(),
  created_at: z.number().int(),
  updated_at: z.number().int()
});

// create_card schemas
export const CreateCardInputSchema = z.object({
  campaign_id: z.string().min(1),
  parent_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(255),
  card_type: z.enum(['text', 'database', 'map']),
  content: z.record(z.any()).optional(),
  information_level_id: z.string().uuid().nullable().optional()
});

export const CreateCardOutputSchema = ReadCardOutputSchema;

// update_card schemas
export const UpdateCardInputSchema = z.object({
  card_id: z.string().uuid(),
  campaign_id: z.string().min(1),
  title: z.string().min(1).max(255).optional(),
  content: z.record(z.any()).optional(),
  information_level_id: z.string().uuid().nullable().optional()
});

export const UpdateCardOutputSchema = ReadCardOutputSchema;

// delete_card schemas
export const DeleteCardInputSchema = z.object({
  card_id: z.string().uuid(),
  campaign_id: z.string().min(1)
});

export const DeleteCardOutputSchema = z.object({
  success: z.boolean(),
  deleted_count: z.number().int(),
  deleted_cards: z.array(z.number().int())
});

// search_cards schemas
export const SearchCardsInputSchema = z.object({
  campaign_id: z.string().min(1),
  query: z.string().min(1),
  card_type: z.enum(['text', 'database', 'map']).optional(),
  information_level_id: z.string().uuid().nullable().optional(),
  limit: z.number().int().positive().max(100).optional().default(20)
});

export const SearchCardsOutputSchema = z.object({
  cards: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    card_type: z.enum(['text', 'database', 'map']),
    parent_id: z.string().uuid().nullable(),
    path: z.string(),
    snippet: z.string(),
    information_level_id: z.string().uuid().nullable()
  })),
  total_count: z.number().int()
});

// move_card schemas
export const MoveCardInputSchema = z.object({
  card_id: z.string().uuid(),
  campaign_id: z.string().min(1),
  new_parent_id: z.string().uuid().nullable(),
  new_position: z.number().int().min(0)
});

export const MoveCardOutputSchema = z.object({
  success: z.boolean(),
  card: ReadCardOutputSchema,
  affected_cards: z.array(z.object({
    id: z.string().uuid(),
    position: z.number().int()
  }))
});