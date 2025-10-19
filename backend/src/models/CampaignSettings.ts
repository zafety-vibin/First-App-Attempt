/**
 * Campaign Settings Model
 * Feature: 016-create-a-campaign
 * T005: TypeScript interface for campaign_settings table
 */

export type ThemeOption = 'high_fantasy' | 'cyberpunk' | 'sci_fi' | 'modern' | 'custom';

export interface CategoryLabelsMap {
  npcs: string;
  locations: string;
  factions: string;
  planar_forces: string;
  items: string;
  creatures: string;
  lore: string;
  world_rules: string;
  session_prep: string;
  session_recaps: string;
  quests: string;
  player_characters: string;
  custom_mechanics: string;
}

export interface CampaignSettings {
  id: number;
  campaign_id: string;
  theme: ThemeOption;
  category_labels: CategoryLabelsMap;
  enabled_categories: string[];
  created_at: number;
  updated_at: number;
}
