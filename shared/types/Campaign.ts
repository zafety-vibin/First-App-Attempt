/**
 * Campaign entity - Represents a TTRPG campaign workspace
 */
export interface Campaign {
  id: string;
  name: string;
  user_id?: string; // Backend uses user_id
  ownerId?: string; // Frontend uses ownerId
  description?: string | null;
  setting_id?: string | null; // Backend snake_case
  settingId?: string | null; // Frontend camelCase
  publicUrlId?: string | null;
  publicAccessEnabled?: boolean;
  publicPassword?: string | null;
  lastPublishedAt?: Date | null;
  created_at?: Date | number; // Backend uses snake_case and unix timestamp
  updated_at?: Date | number; // Backend uses snake_case and unix timestamp
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Database row representation (before transformation)
 */
export interface CampaignRow {
  id: string;
  name: string;
  owner_id: string;
  setting_id: string | null;
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
  settingId?: string | null;
}

/**
 * Campaign update input
 */
export interface UpdateCampaignInput {
  name?: string;
  publicAccessEnabled?: boolean;
  publicPassword?: string | null;
}
