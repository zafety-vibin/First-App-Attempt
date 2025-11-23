/**
 * PortalTokenUsage Model
 * Feature 009: Player Question Portal
 *
 * Granular token tracking per message for aggregation in monitoring panel
 */

export interface PortalTokenUsage {
  id: string; // UUID
  playerId: string; // FK to portal_players
  campaignId: string; // FK to campaigns
  messageId: string; // FK to portal_messages
  tokenCount: number;
  createdAt: number; // Unix timestamp (milliseconds)
}

/**
 * Aggregated token usage for monitoring panel
 */
export interface PlayerTokenUsage {
  playerName: string; // Character name
  tokenCount: number; // Total tokens consumed
}
