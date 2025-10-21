// Session Recap Model - Feature 014
export interface SessionRecap {
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
  session_number: number; // Session number in campaign sequence
  session_date: number | null;
  in_game_date_start: string | null;
  in_game_date_end: string | null;
  time_passed: string | null;
  summary: string | null;
  key_events: string | null;
  player_decisions: string | null;

  // Many-to-many connections
  npcs_encountered: string[];
  locations_visited: string[];
  quests_progressed: string[];
  loot_acquired: string[];

  // DM-only fields
  dm_consequences: string | null;
  dm_behind_scenes: string | null;
}
