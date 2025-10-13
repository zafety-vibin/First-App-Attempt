// Faction Model - Feature 014
export interface Faction {
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
  faction_type: string | null;
  power_level: string | null;
  resources: string | null;
  beliefs: string | null;
  goals: string | null;
  methods: string | null;

  // Explicit connections
  leader_id: string | null;

  // Many-to-many connections
  key_members: string[];
  allied_factions: string[];
  rival_factions: string[];
  territory: string[];

  // DM-only fields
  dm_true_agenda: string | null;
}
