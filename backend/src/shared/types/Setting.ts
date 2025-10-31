/**
 * Setting (World/Universe Container)
 * Top-level organizational container representing a fictional world/setting.
 * Feature: 003-create-a-notion
 */

export interface Setting {
  id: string; // UUID v4
  ownerId: string; // Keycloak user sub
  name: string; // Setting name (e.g., "Forgotten Realms")
  description: string | null; // Optional rich description
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Setting Request (from client)
 */
export interface CreateSettingRequest {
  name: string;
  description?: string | null;
}

/**
 * Update Setting Request (from client)
 */
export interface UpdateSettingRequest {
  name?: string;
  description?: string | null;
}
