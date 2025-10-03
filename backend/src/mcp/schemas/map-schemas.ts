/**
 * Zod schemas for Map tools
 * Based on contracts/map-tools.json
 */

import { z } from 'zod';

// list_map_pins schemas
export const ListMapPinsInputSchema = z.object({
  map_id: z.number().int().positive(),
  campaign_id: z.string().min(1),
  layer_id: z.number().int().optional(),
  bounds: z.object({
    min_x: z.number().int().min(0),
    min_y: z.number().int().min(0),
    max_x: z.number().int().positive(),
    max_y: z.number().int().positive()
  }).optional()
});

export const ListMapPinsOutputSchema = z.object({
  map: z.object({
    id: z.number().int(),
    title: z.string(),
    image_url: z.string(),
    width: z.number().int(),
    height: z.number().int()
  }),
  pins: z.array(z.object({
    id: z.number().int(),
    title: z.string(),
    x: z.number().int(),
    y: z.number().int(),
    icon: z.string(),
    color: z.string(),
    layer_id: z.number().int().nullable(),
    references_card_id: z.number().int().nullable(),
    description: z.string().optional()
  })),
  zones: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    vertices: z.array(z.object({
      x: z.number().int(),
      y: z.number().int()
    })),
    fill_color: z.string(),
    stroke_color: z.string(),
    opacity: z.number().min(0).max(1),
    layer_id: z.number().int().nullable()
  })),
  layers: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    visible: z.boolean(),
    position: z.number().int()
  }))
});

// create_map_pin schemas
export const CreateMapPinInputSchema = z.object({
  map_id: z.number().int().positive(),
  campaign_id: z.string().min(1),
  title: z.string().min(1).max(255),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  icon: z.string().optional().default('default'),
  color: z.string().optional().default('#FF0000'),
  layer_id: z.number().int().nullable().optional(),
  references_card_id: z.number().int().nullable().optional(),
  description: z.string().optional()
});

export const CreateMapPinOutputSchema = z.object({
  pin: z.object({
    id: z.number().int(),
    map_id: z.number().int(),
    title: z.string(),
    x: z.number().int(),
    y: z.number().int(),
    icon: z.string(),
    color: z.string(),
    layer_id: z.number().int().nullable(),
    references_card_id: z.number().int().nullable(),
    description: z.string().optional(),
    created_at: z.number().int()
  }),
  warnings: z.array(z.string()).optional()
});