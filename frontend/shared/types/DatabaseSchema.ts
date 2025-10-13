/**
 * Database Schema Types
 * Feature: 003-create-a-notion
 */

export type DatabaseColumnType = 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'checkbox';

export interface DatabaseColumn {
  name: string;
  type: DatabaseColumnType;
  options?: string[]; // For select/multi-select
}

export interface DatabaseSchema {
  columns: DatabaseColumn[];
}

export interface DatabaseRow {
  id: number;
  card_id: number;
  data: Record<string, any>; // Column name -> value
  created_at: number;
  updated_at: number;
}

export interface DatabaseRowCreateInput {
  card_id: number;
  data: Record<string, any>;
}

export interface DatabaseRowUpdateInput {
  data: Record<string, any>;
}
