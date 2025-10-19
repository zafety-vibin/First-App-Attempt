/**
 * Wizard Validation Schemas
 * Feature: 016-create-a-campaign
 * T006: Shared Zod schemas for client + server validation
 */

import { z } from 'zod';

// Category label: 1-50 characters
const categoryLabelSchema = z.string().min(1, 'Category name required').max(50, 'Category name must be 50 characters or less');

// Category labels map (all 13 categories)
export const categoryLabelsMapSchema = z.object({
  npcs: categoryLabelSchema,
  locations: categoryLabelSchema,
  factions: categoryLabelSchema,
  planar_forces: categoryLabelSchema,
  items: categoryLabelSchema,
  creatures: categoryLabelSchema,
  lore: categoryLabelSchema,
  world_rules: categoryLabelSchema,
  session_prep: categoryLabelSchema,
  session_recaps: categoryLabelSchema,
  quests: categoryLabelSchema,
  player_characters: categoryLabelSchema,
  custom_mechanics: categoryLabelSchema
});

export type CategoryLabelsMap = z.infer<typeof categoryLabelsMapSchema>;

// Style selection schema
export const styleSelectionSchema = z.object({
  selectedTheme: z.enum(['high_fantasy', 'cyberpunk', 'sci_fi', 'modern', 'custom']),
  customLabels: categoryLabelsMapSchema.nullable()
}).refine(
  (data) => data.selectedTheme !== 'custom' || data.customLabels !== null,
  { message: 'Custom theme requires category labels', path: ['customLabels'] }
);

// Category toggle schema (11-13 enabled)
export const categoryToggleSchema = z.object({
  enabledCategories: z.array(z.string()).min(11, 'At least 11 core categories must be enabled').max(13, 'Maximum 13 categories')
});

// Graph selection schema
export const graphSelectionSchema = z.object({
  worldFoundationsChoice: z.enum(['setup_now', 'setup_later'])
});

// World-Foundations answer schema
export const worldFoundationsAnswerSchema = z.object({
  questionId: z.number().int().min(1).max(4),
  answer: z.string().max(1000, 'Answer must be 1000 characters or less')
});

export const worldFoundationsSchema = z.object({
  answers: z.array(worldFoundationsAnswerSchema)
});

// Wizard completion request schema
export const wizardCompleteRequestSchema = z.object({
  theme: z.enum(['high_fantasy', 'cyberpunk', 'sci_fi', 'modern', 'custom']),
  categoryLabels: categoryLabelsMapSchema,
  enabledCategories: z.array(z.string()).min(11).max(13),
  worldFoundationsAnswers: z.array(worldFoundationsAnswerSchema).optional()
});

export type WizardCompleteRequest = z.infer<typeof wizardCompleteRequestSchema>;
