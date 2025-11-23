/**
 * PortalConversation Model
 * Feature 009: Player Question Portal
 *
 * Per-player conversation container (one conversation per player)
 */

export interface PortalConversation {
  id: string; // UUID
  playerId: string; // FK to portal_players, UNIQUE (one conversation per player)
  campaignId: string; // FK to campaigns
  createdAt: number; // Unix timestamp (milliseconds)
  updatedAt: number;
}
