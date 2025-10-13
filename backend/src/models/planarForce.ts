// Planar Force Model - Feature 014
export interface PlanarForce {
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
  entity_type: string | null;
  domains: string[] | null;  // JSON array
  alignment: string | null;
  worshiper_base: string | null;
  plane_of_origin: string | null;
  base_of_power: string | null;

  // Explicit connections
  high_priest_id: string | null;

  // Many-to-many connections
  allied_entities: string[];
  rival_entities: string[];
  religious_orders: string[];

  // DM-only fields
  dm_true_nature: string | null;
}
