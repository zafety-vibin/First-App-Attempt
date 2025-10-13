/**
 * Setting Types
 * Feature: 003-create-a-notion
 */

export interface Setting {
  id: number;
  campaign_id: string;
  key: string;
  value: string; // JSON string
  created_at: number;
  updated_at: number;
}

export interface SettingCreateInput {
  campaign_id: string;
  key: string;
  value: string;
}

export interface SettingUpdateInput {
  value: string;
}

// Common setting keys
export const SETTING_KEYS = {
  THEME: 'theme',
  DEFAULT_VIEW_MODE: 'default_view_mode',
  CUSTOM_INFORMATION_LEVELS: 'custom_information_levels',
} as const;
