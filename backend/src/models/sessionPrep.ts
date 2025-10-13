// Session Prep Model - Feature 014
export interface SessionPrep {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: 'dm_only';  // Always dm_only
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  planned_date: number | null;
  status: 'draft' | 'ready' | 'completed' | 'cancelled';
  planned_events: string | null;
  possible_encounters: string | null;
  plot_hooks: string | null;
  dm_notes: string | null;

  // Canonical markers
  is_canon: 0;  // Always 0
  canonical_status: 'hypothetical';  // Always 'hypothetical'

  // One-way connections (JSON arrays, NOT foreign keys)
  plot_threads: string[];
  npcs_to_prep: string[];
  locations_to_prep: string[];
}
