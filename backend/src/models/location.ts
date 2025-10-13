// Location Model - Feature 014
export interface Location {
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
  location_type: string | null;
  population: number | null;
  cultural_characteristics: string | null;
  map: string | null;  // File path or URL

  // Explicit connections
  parent_location_id: string | null;

  // Many-to-many connections
  notable_npcs: string[];
  factions_present: string[];
  connected_locations: string[];

  // DM-only fields
  dm_secrets: string | null;
}
