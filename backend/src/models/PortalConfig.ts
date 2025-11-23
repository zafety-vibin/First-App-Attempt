/**
 * PortalConfig Model
 * Feature 009: Player Question Portal
 *
 * Stores per-campaign portal configuration (enabled state, password, response style)
 */

export interface PortalConfig {
  id: string; // UUID
  campaignId: string; // FK to campaigns, UNIQUE
  enabled: boolean;
  passwordHash: string | null; // bcrypt hash if password protection enabled
  responseStyle: 'friendly-sage' | 'scholarly-tome' | 'tavern-gossip' | 'factual' | 'custom';
  customSystemPrompt: string | null; // Used if responseStyle = 'custom'
  createdAt: number; // Unix timestamp (milliseconds)
  updatedAt: number;
}

/**
 * Response style options with descriptions
 */
export const RESPONSE_STYLES = {
  'friendly-sage': 'Warm, helpful librarian persona - welcoming and encouraging',
  'scholarly-tome': 'Formal academic voice - precise and authoritative',
  'tavern-gossip': 'Casual storyteller - conversational and colorful',
  'factual': 'Straightforward and concise - just the facts',
  'custom': 'User-defined system prompt for custom AI personality',
} as const;

export type ResponseStyle = keyof typeof RESPONSE_STYLES;
