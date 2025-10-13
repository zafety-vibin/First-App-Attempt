// Quest Model - Feature 014
export interface Quest {
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
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  objectives: string[];  // JSON array
  rewards: string | null;

  // Explicit connections
  quest_giver_id: string | null;
  started_session_id: string | null;
  completed_session_id: string | null;

  // Many-to-many connections
  related_npcs: string[];
  related_locations: string[];

  // DM-only fields
  dm_true_objective: string | null;
  dm_consequences: string | null;
}
