// Custom Field Definition Model - Feature 014
export interface CustomFieldDefinition {
  id: string;
  campaign_id: string;
  category: string;  // Table name: 'npcs', 'locations', etc.
  field_name: string;  // Actual field key in custom_fields JSON
  field_label: string;  // Human-readable label for UI
  field_type: 'text' | 'number' | 'select' | 'multi_select' | 'date';
  options: string[] | null;  // JSON array for select/multi_select
  created_at: number;
  updated_at: number;
}
