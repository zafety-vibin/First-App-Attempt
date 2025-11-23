/**
 * PortalPlayer Model
 * Feature 009: Player Question Portal
 *
 * Lightweight player identity for portal access (character name unique per campaign)
 */

export interface PortalPlayer {
  id: string; // UUID
  campaignId: string; // FK to campaigns
  characterName: string; // Unique per campaign (enforced by UNIQUE constraint)
  sessionToken: string; // crypto.randomBytes(32).toString('hex') - 64 chars
  createdAt: number; // Unix timestamp (milliseconds)
}
