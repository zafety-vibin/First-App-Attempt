// Lore Entry Model - Feature 014
export interface LoreEntry {
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
  category: string | null;
  era_period: string | null;
  in_game_date: string | null;
  historical_accuracy: string | null;

  // Many-to-many connections
  related_npcs: string[];
  related_locations: string[];
  related_factions: string[];
}
