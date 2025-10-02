/**
 * Campaign entity - Represents a TTRPG campaign workspace
 */
export interface Campaign {
  id: string;
  name: string;
  ownerId: string;
  publicUrlId: string | null;
  publicAccessEnabled: boolean;
  publicPassword: string | null;
  lastPublishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database row representation (before transformation)
 */
export interface CampaignRow {
  id: string;
  name: string;
  owner_id: string;
  public_url_id: string | null;
  public_access_enabled: number; // SQLite boolean (0 or 1)
  public_password: string | null;
  last_published_at: number | null; // Unix timestamp
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

/**
 * Campaign creation input
 */
export interface CreateCampaignInput {
  name: string;
  ownerId: string;
}

/**
 * Campaign update input
 */
export interface UpdateCampaignInput {
  name?: string;
  publicAccessEnabled?: boolean;
  publicPassword?: string | null;
}
