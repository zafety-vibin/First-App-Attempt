/**
 * InformationLevel entity
 * Feature: 004-create-a-tagging
 * Based on: specs/004-create-a-tagging/data-model.md
 */

export interface InformationLevel {
  id: string;                      // UUID v4 for custom, hardcoded string for defaults
  name: string;                    // Display name (max 100 chars)
  color: string;                   // Hex color for painter's easel palette (e.g., "#6B7280")
  hierarchical: boolean;           // True = hidden in Player View, False = visible in all views
  type: 'default' | 'custom';      // 'default' for 4 built-in levels, 'custom' for user-created
  campaignId: string | null;       // NULL for default levels, campaign UUID for custom levels
  createdAt: Date;                 // Creation timestamp
  updatedAt: Date;                 // Last update timestamp
}

/**
 * Default information levels (seeded on database initialization)
 */
export const DEFAULT_INFORMATION_LEVELS = {
  SYSTEM: 'system',                        // Gray (#6B7280), non-hierarchical
  COMMON_KNOWLEDGE: 'common-knowledge',    // Blue (#3B82F6), non-hierarchical
  PLAYER_KNOWLEDGE: 'player-knowledge',    // Green (#10B981), non-hierarchical
  DM_SECRET: 'dm-secret',                  // Red (#EF4444), hierarchical
} as const;

/**
 * Information level colors
 */
export const INFORMATION_LEVEL_COLORS = {
  [DEFAULT_INFORMATION_LEVELS.SYSTEM]: '#6B7280',
  [DEFAULT_INFORMATION_LEVELS.COMMON_KNOWLEDGE]: '#3B82F6',
  [DEFAULT_INFORMATION_LEVELS.PLAYER_KNOWLEDGE]: '#10B981',
  [DEFAULT_INFORMATION_LEVELS.DM_SECRET]: '#EF4444',
} as const;

/**
 * Create InformationLevel payload (for POST /api/information-levels)
 */
export interface CreateInformationLevelPayload {
  name: string;
  color: string;
  hierarchical: boolean;
  campaignId: string;
}

/**
 * Update InformationLevel payload (for PUT /api/information-levels/:id)
 */
export interface UpdateInformationLevelPayload {
  name?: string;
  color?: string;
  hierarchical?: boolean;
}
