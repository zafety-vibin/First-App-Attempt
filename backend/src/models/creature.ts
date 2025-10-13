// Creature Model - Feature 014
export interface Creature {
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
  creature_type: string | null;
  challenge_rating: string | null;
  abilities: string | null;

  // Many-to-many connections
  habitats: string[];

  // DM-only fields
  dm_behavior_notes: string | null;
}
