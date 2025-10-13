// Item Model - Feature 014
export interface Item {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  item_type: string | null;
  rarity: string | null;
  properties: string | null;
  value: string | null;

  // Explicit connections (ownership)
  owner_npc_id: string | null;
  owner_pc_id: string | null;
  location_id: string | null;

  // DM-only fields
  dm_secret_properties: string | null;
  dm_true_nature: string | null;
}
