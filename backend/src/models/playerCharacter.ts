// Player Character Model - Feature 014
export interface PlayerCharacter {
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
  player_name: string | null;
  class: string[] | null;  // JSON array
  level: number | null;
  race: string | null;
  background: string | null;
  personality: string | null;
  goals: string | null;
  backstory: string | null;
  art: string | null;  // File path or URL

  // Many-to-many connections
  faction_affiliations: string[];
  allied_npcs: string[];

  // DM-only fields
  dm_secrets: string | null;
  dm_plot_threads: string | null;
  dm_true_motivation: string | null;
  dm_consequences: string | null;
}
