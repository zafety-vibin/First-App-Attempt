/**
 * Campaign Types
 * Feature: 002-create-the-authentication
 */

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;

  // Public sharing (Feature 010)
  is_public?: boolean;
  public_password?: string | null;
  public_share_id?: string | null;
}

export interface CampaignCreateInput {
  name: string;
  description?: string;
}

export interface CampaignUpdateInput {
  name?: string;
  description?: string;
  is_public?: boolean;
  public_password?: string | null;
}
