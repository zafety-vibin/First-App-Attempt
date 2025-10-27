/**
 * Zod Validation Schemas for Geographic Map System
 * Feature: 021-create-a-geographic
 * Task: T014
 *
 * Defines validation schemas for:
 * - MapImage (map uploads)
 * - MapPin (location/NPC pins)
 * - FactionRegion (territory polygons)
 */

import { z } from 'zod';

/**
 * Pin icon types (20 predefined)
 */
const PinIconEnum = z.enum([
  'castle', 'city', 'town', 'village',
  'dungeon', 'cave', 'mountain', 'forest',
  'desert', 'water', 'landmark', 'temple',
  'tower', 'port', 'bridge', 'ruins',
  'camp', 'mine', 'farm', 'other'
]);

/**
 * MapImage Schema
 * Validates map image uploads
 */
export const MapImageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  data: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, {
    message: 'Must be a valid base64 data URL with image/png, image/jpeg, or image/webp MIME type'
  }),
  width: z.number().int().min(100).max(10000),
  height: z.number().int().min(100).max(10000),
  uploaded_at: z.number().int().positive(),
});

/**
 * MapImageInput Schema (for uploads - no id/uploaded_at)
 */
export const MapImageInputSchema = z.object({
  name: z.string().min(1).max(100),
  data: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, {
    message: 'Must be a valid base64 data URL with image/png, image/jpeg, or image/webp MIME type'
  }),
  width: z.number().int().min(100).max(10000),
  height: z.number().int().min(100).max(10000),
});

/**
 * MapPin Schema
 * Validates map pins (links to locations or NPCs)
 */
export const MapPinSchema = z.object({
  id: z.string().uuid(),
  map_id: z.string().uuid(),
  x: z.number().min(0),
  y: z.number().min(0),
  linked_entity_type: z.enum(['location', 'npc']).nullable(),
  linked_entity_id: z.string().uuid().nullable(),
  icon: PinIconEnum.nullable(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, {
    message: 'Must be a valid hex color code (e.g., #FF0000)'
  }).nullable(),
  label: z.string().max(50).nullable(),
  created_at: z.number().int().positive(),
});

/**
 * MapPinInput Schema (for create/update)
 * Entity linking is optional - pins can be visual markers without linking to entities
 */
export const MapPinInputSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  linked_entity_type: z.enum(['location', 'npc']).optional(),
  linked_entity_id: z.string().uuid().optional(),
  icon: PinIconEnum.nullable().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, {
    message: 'Must be a valid hex color code (e.g., #FF0000)'
  }).nullable().optional(),
  label: z.string().max(50).nullable().optional(),
}).refine(
  (data) => {
    // If one is provided, both must be provided (or both omitted)
    if (data.linked_entity_type && !data.linked_entity_id) return false;
    if (data.linked_entity_id && !data.linked_entity_type) return false;
    return true;
  },
  { message: 'If linking to an entity, both type and ID must be provided' }
);

/**
 * MapPinUpdate Schema (partial update)
 */
export const MapPinUpdateSchema = z.object({
  x: z.number().min(0).optional(),
  y: z.number().min(0).optional(),
  linked_entity_type: z.enum(['location', 'npc']).optional(),
  linked_entity_id: z.string().uuid().optional(),
  icon: PinIconEnum.nullable().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).nullable().optional(),
  label: z.string().max(50).nullable().optional(),
}).refine(
  (data) => {
    // If one is provided, both must be provided (or both omitted)
    if (data.linked_entity_type && !data.linked_entity_id) return false;
    if (data.linked_entity_id && !data.linked_entity_type) return false;
    return true;
  },
  { message: 'If linking to an entity, both type and ID must be provided' }
);

/**
 * FactionRegion Schema
 * Validates faction territory polygons
 */
export const FactionRegionSchema = z.object({
  id: z.string().uuid(),
  map_id: z.string().uuid(),
  vertices: z.array(
    z.object({
      x: z.number().min(0),
      y: z.number().min(0),
    })
  ).min(3, { message: 'Region must have at least 3 vertices' }),
  faction_id: z.string().uuid(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, {
    message: 'Must be a valid hex color code (e.g., #FF0000)'
  }),
  label: z.string().max(100).nullable(),
  z_order: z.number().int().min(0),
  created_at: z.number().int().positive(),
});

/**
 * FactionRegionInput Schema (for create)
 */
export const FactionRegionInputSchema = z.object({
  vertices: z.array(
    z.object({
      x: z.number().min(0),
      y: z.number().min(0),
    })
  ).min(3, { message: 'Region must have at least 3 vertices' }),
  faction_id: z.string().uuid(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, {
    message: 'Must be a valid hex color code (e.g., #FF0000)'
  }),
  label: z.string().max(100).nullable().optional(),
  z_order: z.number().int().min(0).optional(),
});

/**
 * FactionRegionUpdate Schema (partial update)
 */
export const FactionRegionUpdateSchema = FactionRegionInputSchema.partial();

/**
 * Array validators
 */
export const MapImagesArraySchema = z.array(MapImageSchema);
export const MapPinsArraySchema = z.array(MapPinSchema);
export const FactionRegionsArraySchema = z.array(FactionRegionSchema);

/**
 * Validation helper functions
 */

export function validateMapImage(data: unknown) {
  return MapImageInputSchema.parse(data);
}

export function validateMapPin(data: unknown) {
  return MapPinInputSchema.parse(data);
}

export function validateMapPinUpdate(data: unknown) {
  return MapPinUpdateSchema.parse(data);
}

export function validateFactionRegion(data: unknown) {
  return FactionRegionInputSchema.parse(data);
}

export function validateFactionRegionUpdate(data: unknown) {
  return FactionRegionUpdateSchema.parse(data);
}

/**
 * Type exports
 */
export type MapImageInput = z.infer<typeof MapImageInputSchema>;
export type MapPinInput = z.infer<typeof MapPinInputSchema>;
export type MapPinUpdate = z.infer<typeof MapPinUpdateSchema>;
export type FactionRegionInput = z.infer<typeof FactionRegionInputSchema>;
export type FactionRegionUpdate = z.infer<typeof FactionRegionUpdateSchema>;
