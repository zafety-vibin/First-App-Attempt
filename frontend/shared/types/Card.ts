/**
 * Card Types
 * Feature: 003-create-a-notion
 */

export type CardType = 'text' | 'database' | 'map';

export interface Card {
  id: number;
  campaign_id: string;
  parent_id: number | null;
  title: string;
  card_type: CardType;
  content: any; // ProseMirror JSON
  information_level_id: number | null;
  position: number;
  created_at: number;
  updated_at: number;

  // Hierarchy helpers (populated by frontend)
  children?: Card[];
  path?: string;
}

export interface CardCreateInput {
  campaign_id: string;
  parent_id?: number | null;
  title: string;
  card_type: CardType;
  content?: any;
  information_level_id?: number | null;
}

export interface CardUpdateInput {
  title?: string;
  content?: any;
  information_level_id?: number | null;
}
