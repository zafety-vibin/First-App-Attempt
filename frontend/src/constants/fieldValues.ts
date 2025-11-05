/**
 * Shared Field Values and Constants
 *
 * CRITICAL: These values MUST match database CHECK constraints exactly.
 * All dropdown options should reference these constants, not hardcode values.
 *
 * Date: 2025-11-02
 */

export interface SelectOption {
  value: string;
  label: string;
}

// =============================================================================
// UNIVERSAL FIELDS (All 13 categories)
// =============================================================================

/**
 * core_status - Universal field across all categories
 * Database: CHECK (core_status IN ('active', 'archived', 'draft', 'hidden'))
 */
export const CORE_STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'draft', label: 'Draft' },
  { value: 'hidden', label: 'Hidden' },
];

/**
 * player_knowledge - Universal field across all categories
 *
 * CRITICAL: Use InformationLevelContext.levels to load these dynamically!
 * These constants are for reference and validation only.
 *
 * Database: Foreign key to information_levels.id
 * Default IDs: 'common-knowledge', 'player-knowledge', 'dm-secret', 'system'
 * Custom levels: UUID format
 */
export const DEFAULT_INFORMATION_LEVEL_IDS = {
  SYSTEM: 'system',
  COMMON_KNOWLEDGE: 'common-knowledge',      // ✅ HYPHEN (correct)
  PLAYER_KNOWLEDGE: 'player-knowledge',      // ✅ HYPHEN (correct)
  DM_SECRET: 'dm-secret',                    // ✅ HYPHEN (correct)
} as const;

// =============================================================================
// QUEST SPECIFIC
// =============================================================================

/**
 * quest.status
 * Database: CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed'))
 */
export const QUEST_STATUS_OPTIONS: SelectOption[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

// =============================================================================
// SESSION PREP SPECIFIC
// =============================================================================

/**
 * session_prep.status
 * Database: CHECK (status IN ('draft', 'ready', 'completed', 'cancelled'))
 */
export const SESSION_PREP_STATUS_OPTIONS: SelectOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * session_prep.canonical_status
 * Database: TEXT DEFAULT 'hypothetical'
 */
export const SESSION_PREP_CANONICAL_STATUS_OPTIONS: SelectOption[] = [
  { value: 'hypothetical', label: 'Hypothetical' },
  { value: 'canon', label: 'Canon' },
  { value: 'retconned', label: 'Retconned' },
];

// =============================================================================
// SESSION RECAP SPECIFIC
// =============================================================================

/**
 * session_recap.canonical_status
 * Database: TEXT DEFAULT 'canon'
 */
export const SESSION_RECAP_CANONICAL_STATUS_OPTIONS: SelectOption[] = [
  { value: 'canon', label: 'Canon' },
  { value: 'retconned', label: 'Retconned' },
  { value: 'alternate_timeline', label: 'Alternate Timeline' },
];

// =============================================================================
// ITEM SPECIFIC
// =============================================================================

/**
 * item.rarity (D&D 5e standard rarities)
 * Database: TEXT (no constraint)
 * Recommendation: Could add CHECK constraint or keep flexible for other systems
 */
export const ITEM_RARITY_OPTIONS: SelectOption[] = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'very_rare', label: 'Very Rare' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'artifact', label: 'Artifact' },
];

/**
 * item.attunement
 * Database: TEXT (no constraint)
 */
export const ITEM_ATTUNEMENT_OPTIONS: SelectOption[] = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
  { value: 'optional', label: 'Optional' },
];

// =============================================================================
// NPC SPECIFIC
// =============================================================================

/**
 * npc.alignment (D&D 5e standard alignments)
 * Database: TEXT (no constraint)
 */
export const ALIGNMENT_OPTIONS: SelectOption[] = [
  { value: 'lawful_good', label: 'Lawful Good' },
  { value: 'neutral_good', label: 'Neutral Good' },
  { value: 'chaotic_good', label: 'Chaotic Good' },
  { value: 'lawful_neutral', label: 'Lawful Neutral' },
  { value: 'true_neutral', label: 'True Neutral' },
  { value: 'chaotic_neutral', label: 'Chaotic Neutral' },
  { value: 'lawful_evil', label: 'Lawful Evil' },
  { value: 'neutral_evil', label: 'Neutral Evil' },
  { value: 'chaotic_evil', label: 'Chaotic Evil' },
  { value: 'unaligned', label: 'Unaligned' },
];

// =============================================================================
// PORTAL SPECIFIC (Feature 009)
// =============================================================================

/**
 * portal_config.response_style
 * Database: CHECK (response_style IN ('friendly-sage', 'scholarly-tome', 'tavern-gossip', 'factual', 'custom'))
 */
export const PORTAL_RESPONSE_STYLE_OPTIONS: SelectOption[] = [
  { value: 'friendly-sage', label: 'Friendly Sage' },
  { value: 'scholarly-tome', label: 'Scholarly Tome' },
  { value: 'tavern-gossip', label: 'Tavern Gossip' },
  { value: 'factual', label: 'Factual' },
  { value: 'custom', label: 'Custom' },
];

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get label for a value from options array
 */
export function getLabelForValue(options: SelectOption[], value: string | null): string {
  if (!value) return 'None';
  const option = options.find(opt => opt.value === value);
  return option?.label || value;
}

/**
 * Validate value exists in options array
 */
export function isValidOption(options: SelectOption[], value: string): boolean {
  return options.some(opt => opt.value === value);
}
