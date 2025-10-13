// Custom Mechanic Model - Feature 014
export interface CustomMechanic {
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
  mechanic_type: string | null;
  rules_text: string | null;
  prerequisites: string | null;
  source: string | null;

  // Many-to-many connections
  related_rules: string[];  // Self-relation
}
