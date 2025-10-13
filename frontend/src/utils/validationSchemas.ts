import { z } from 'zod';

/**
 * Universal Fields Schema
 * Shared across all 13 categories from Feature 014
 */
export const UniversalFieldsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().nullable().optional(),
  core_status: z.enum(['active', 'archived', 'draft', 'hidden']).default('active'),
  player_knowledge: z.string().nullable().optional(), // Validated against campaign's info levels
  tags: z.array(z.string()).default([]),
  custom_fields: z.record(z.any()).default({}),
});

/**
 * NPCs Schema
 */
export const NPCSchema = UniversalFieldsSchema.extend({
  race: z.string().nullable().optional(),
  class: z.array(z.string()).nullable().optional(),
  level: z.number().int().min(1).nullable().optional(),
  alignment: z.string().nullable().optional(),
  appearance: z.string().nullable().optional(),
  personality_traits: z.string().nullable().optional(),
  motivation: z.string().nullable().optional(),
  relationship_to_party: z.string().nullable().optional(),
  met_party: z.union([z.literal(0), z.literal(1)]).default(0),
  art: z.string().nullable().optional(),
  faction_id: z.string().nullable().optional(),
  superior_npc_id: z.string().nullable().optional(),
  locations: z.array(z.string()).default([]),
  dm_secrets: z.string().nullable().optional(),
  dm_plot_relevance: z.string().nullable().optional(),
});

/**
 * Locations Schema
 */
export const LocationSchema = UniversalFieldsSchema.extend({
  location_type: z.string().nullable().optional(),
  population: z.number().int().min(0).nullable().optional(),
  cultural_characteristics: z.string().nullable().optional(),
  map: z.string().nullable().optional(),
  parent_location_id: z.string().nullable().optional(),
  notable_npcs: z.array(z.string()).default([]),
  factions_present: z.array(z.string()).default([]),
  connected_locations: z.array(z.string()).default([]),
  dm_secrets: z.string().nullable().optional(),
});

/**
 * Factions Schema
 */
export const FactionSchema = UniversalFieldsSchema.extend({
  faction_type: z.string().nullable().optional(),
  power_level: z.string().nullable().optional(),
  resources: z.string().nullable().optional(),
  beliefs: z.string().nullable().optional(),
  goals: z.string().nullable().optional(),
  methods: z.string().nullable().optional(),
  leader_id: z.string().nullable().optional(),
  key_members: z.array(z.string()).default([]),
  allied_factions: z.array(z.string()).default([]),
  rival_factions: z.array(z.string()).default([]),
  territory: z.array(z.string()).default([]),
  dm_true_agenda: z.string().nullable().optional(),
});

/**
 * Session Recaps Schema
 * Note: is_canon and canonical_status are hardcoded to 'canon' at backend
 */
export const SessionRecapSchema = UniversalFieldsSchema.extend({
  session_date: z.number().int().nullable().optional(),
  in_game_date_start: z.string().nullable().optional(),
  in_game_date_end: z.string().nullable().optional(),
  time_passed: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  key_events: z.array(z.string()).nullable().optional(),
  player_decisions: z.array(z.string()).nullable().optional(),
  is_canon: z.literal(1).default(1), // Always 1 (canonical)
  canonical_status: z.literal('canon').default('canon'), // Always 'canon'
  npcs_encountered: z.array(z.string()).default([]),
  locations_visited: z.array(z.string()).default([]),
  quests_progressed: z.array(z.string()).default([]),
  loot_acquired: z.array(z.string()).default([]),
  dm_consequences: z.string().nullable().optional(),
  dm_behind_scenes: z.string().nullable().optional(),
});

/**
 * Quests Schema
 */
export const QuestSchema = UniversalFieldsSchema.extend({
  status: z.enum(['not_started', 'in_progress', 'completed', 'failed']).default('not_started'),
  objectives: z.array(z.string()).default([]),
  rewards: z.string().nullable().optional(),
  quest_giver_id: z.string().nullable().optional(),
  started_session_id: z.string().nullable().optional(),
  completed_session_id: z.string().nullable().optional(),
  related_npcs: z.array(z.string()).default([]),
  related_locations: z.array(z.string()).default([]),
  dm_true_objective: z.string().nullable().optional(),
  dm_consequences: z.string().nullable().optional(),
});

/**
 * Player Characters Schema
 */
export const PlayerCharacterSchema = UniversalFieldsSchema.extend({
  player_name: z.string().nullable().optional(),
  class: z.array(z.string()).nullable().optional(),
  level: z.number().int().min(1).nullable().optional(),
  race: z.string().nullable().optional(),
  background: z.string().nullable().optional(),
  personality: z.string().nullable().optional(),
  goals: z.string().nullable().optional(),
  backstory: z.string().nullable().optional(),
  art: z.string().nullable().optional(),
  faction_affiliations: z.array(z.string()).default([]),
  allied_npcs: z.array(z.string()).default([]),
  dm_secrets: z.string().nullable().optional(),
  dm_plot_threads: z.string().nullable().optional(),
  dm_true_motivation: z.string().nullable().optional(),
  dm_consequences: z.string().nullable().optional(),
});

/**
 * Lore Entries Schema
 */
export const LoreEntrySchema = UniversalFieldsSchema.extend({
  category: z.string().nullable().optional(),
  era_period: z.string().nullable().optional(),
  in_game_date: z.string().nullable().optional(),
  historical_accuracy: z.string().nullable().optional(),
  related_npcs: z.array(z.string()).default([]),
  related_locations: z.array(z.string()).default([]),
  related_factions: z.array(z.string()).default([]),
});

/**
 * World Rules Schema
 */
export const WorldRuleSchema = UniversalFieldsSchema.extend({
  rule_type: z.string().nullable().optional(),
  exceptions: z.string().nullable().optional(),
  related_rules: z.array(z.string()).default([]),
});

/**
 * Planar Forces Schema
 */
export const PlanarForceSchema = UniversalFieldsSchema.extend({
  entity_type: z.string().nullable().optional(),
  domains: z.array(z.string()).nullable().optional(),
  alignment: z.string().nullable().optional(),
  worshiper_base: z.string().nullable().optional(),
  plane_of_origin: z.string().nullable().optional(),
  base_of_power: z.string().nullable().optional(),
  high_priest_id: z.string().nullable().optional(),
  allied_entities: z.array(z.string()).default([]),
  rival_entities: z.array(z.string()).default([]),
  religious_orders: z.array(z.string()).default([]),
  dm_true_nature: z.string().nullable().optional(),
});

/**
 * Session Prep Schema
 * Note: is_canon=0, canonical_status='hypothetical', player_knowledge='dm_only' enforced at backend
 */
export const SessionPrepSchema = UniversalFieldsSchema.extend({
  planned_date: z.number().int().nullable().optional(),
  status: z.enum(['draft', 'ready', 'completed', 'cancelled']).default('draft'),
  planned_events: z.string().nullable().optional(),
  possible_encounters: z.string().nullable().optional(),
  plot_hooks: z.string().nullable().optional(),
  dm_notes: z.string().nullable().optional(),
  is_canon: z.literal(0).default(0), // Always 0 (hypothetical)
  canonical_status: z.literal('hypothetical').default('hypothetical'), // Always 'hypothetical'
  plot_threads: z.array(z.string()).default([]),
  npcs_to_prep: z.array(z.string()).default([]),
  locations_to_prep: z.array(z.string()).default([]),
});

/**
 * Custom Mechanics Schema
 */
export const CustomMechanicSchema = UniversalFieldsSchema.extend({
  mechanic_type: z.string().nullable().optional(),
  rules_text: z.string().nullable().optional(),
  prerequisites: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  related_rules: z.array(z.string()).default([]),
});

/**
 * Items Schema
 */
export const ItemSchema = UniversalFieldsSchema.extend({
  item_type: z.string().nullable().optional(),
  rarity: z.string().nullable().optional(),
  properties: z.string().nullable().optional(),
  value: z.string().nullable().optional(),
  owner_npc_id: z.string().nullable().optional(),
  owner_pc_id: z.string().nullable().optional(),
  location_id: z.string().nullable().optional(),
  dm_secret_properties: z.string().nullable().optional(),
  dm_true_nature: z.string().nullable().optional(),
});

/**
 * Creatures Schema
 */
export const CreatureSchema = UniversalFieldsSchema.extend({
  creature_type: z.string().nullable().optional(),
  challenge_rating: z.string().nullable().optional(),
  abilities: z.string().nullable().optional(),
  habitats: z.array(z.string()).default([]),
  dm_behavior_notes: z.string().nullable().optional(),
});

/**
 * Map category names to their validation schemas
 */
export const CATEGORY_SCHEMAS = {
  npcs: NPCSchema,
  locations: LocationSchema,
  factions: FactionSchema,
  session_recaps: SessionRecapSchema,
  quests: QuestSchema,
  player_characters: PlayerCharacterSchema,
  lore_entries: LoreEntrySchema,
  world_rules: WorldRuleSchema,
  planar_forces: PlanarForceSchema,
  session_prep: SessionPrepSchema,
  custom_mechanics: CustomMechanicSchema,
  items: ItemSchema,
  creatures: CreatureSchema,
} as const;

/**
 * Type-safe schema getter
 */
export function getCategorySchema(category: keyof typeof CATEGORY_SCHEMAS) {
  return CATEGORY_SCHEMAS[category];
}

// Export TypeScript types inferred from Zod schemas
export type UniversalFields = z.infer<typeof UniversalFieldsSchema>;
export type NPC = z.infer<typeof NPCSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type Faction = z.infer<typeof FactionSchema>;
export type SessionRecap = z.infer<typeof SessionRecapSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type PlayerCharacter = z.infer<typeof PlayerCharacterSchema>;
export type LoreEntry = z.infer<typeof LoreEntrySchema>;
export type WorldRule = z.infer<typeof WorldRuleSchema>;
export type PlanarForce = z.infer<typeof PlanarForceSchema>;
export type SessionPrep = z.infer<typeof SessionPrepSchema>;
export type CustomMechanic = z.infer<typeof CustomMechanicSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Creature = z.infer<typeof CreatureSchema>;
