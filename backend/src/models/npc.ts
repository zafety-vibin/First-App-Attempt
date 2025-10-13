// NPC Model - Feature 014
export interface NPC {
  // Universal fields
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;  // 'common_knowledge' | 'player_knowledge' | 'dm_only' | custom | null
  tags: string[];
  created_at: number;
  updated_at: number;
  custom_fields: Record<string, any>;

  // Category-specific fields
  race: string | null;
  class: string[] | null;  // JSON array
  level: number | null;
  alignment: string | null;
  appearance: string | null;
  personality_traits: string | null;
  motivation: string | null;
  relationship_to_party: string | null;
  met_party: 0 | 1;  // Boolean
  art: string | null;  // File path or URL

  // Explicit connections
  faction_id: string | null;
  superior_npc_id: string | null;  // Parent in hierarchy

  // Many-to-many connections
  locations: string[];  // Array of location IDs

  // DM-only fields
  dm_secrets: string | null;
  dm_plot_relevance: string | null;
}
