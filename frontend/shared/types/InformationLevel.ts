/**
 * InformationLevel Types
 * Feature: 004-create-a-tagging
 */

export interface InformationLevel {
  id: number;
  campaign_id: string;
  name: string;
  description: string;
  is_default: boolean;
  created_at: number;
}

export const DEFAULT_INFORMATION_LEVELS = [
  { name: 'System', description: 'System-level content, not visible to players' },
  { name: 'Common Knowledge', description: 'Information available to all players' },
  { name: 'Player Knowledge', description: 'Information known to specific players' },
  { name: 'DM Secret', description: 'Information only visible to the DM' },
];
