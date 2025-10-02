/**
 * Database Schema Types
 * Feature: 003-create-a-notion
 *
 * User-defined database schemas with flexible columns and multiple views.
 * Stored as JSONB in database card metadata column.
 */

/**
 * Database Card Metadata Structure
 * Stored in cards.metadata for type='database'
 */
export interface DatabaseCardMetadata {
  schema: {
    columns: DatabaseColumn[];
  };
  views: DatabaseView[];
  defaultViewId: string; // UUID of default view
}

/**
 * Database Column Definition
 */
export interface DatabaseColumn {
  id: string; // UUID
  name: string; // User-defined column name
  type: DatabaseColumnType;
  required: boolean;
  defaultValue?: any; // Type-dependent
  options?: DatabaseColumnOptions; // For select/multi-select
  entityType?: 'card'; // For entity-reference (future: 'node' for graph nodes)
}

/**
 * Column Types
 * MVP: text, number, date, select, multi-select, entity-reference
 * Future: checkbox, URL, file, formula
 */
export type DatabaseColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multi-select'
  | 'entity-reference';

/**
 * Column Options (for select/multi-select types)
 */
export interface DatabaseColumnOptions {
  choices: DatabaseChoice[];
}

export interface DatabaseChoice {
  id: string; // UUID
  label: string;
  color?: string; // e.g., 'blue', 'green', 'red'
}

/**
 * Database View Configuration
 */
export interface DatabaseView {
  id: string; // UUID
  name: string; // View name (e.g., "All Characters", "Active NPCs")
  type: DatabaseViewType;
  filter?: FilterRule[]; // Optional filters
  sort?: SortRule[]; // Optional sorting
  groupBy?: string; // Column ID for kanban grouping
}

/**
 * View Types
 */
export type DatabaseViewType = 'table' | 'list' | 'gallery' | 'kanban';

/**
 * Filter Rule for database views
 */
export interface FilterRule {
  columnId: string; // UUID of column to filter
  operator: FilterOperator;
  value: any; // Type-dependent
}

export type FilterOperator =
  | 'equals'
  | 'contains'
  | 'greater'
  | 'less'
  | 'is-empty';

/**
 * Sort Rule for database views
 */
export interface SortRule {
  columnId: string; // UUID of column to sort
  direction: 'asc' | 'desc';
}

/**
 * Database Entry Metadata
 * Stored in cards.metadata for page cards that are database entries
 */
export interface DatabaseEntryMetadata {
  databaseId: string; // Parent database card ID
  values: {
    [columnId: string]: any; // Column ID → value mapping
  };
}

/**
 * Database Entry (full object with card fields)
 */
export interface DatabaseEntry {
  id: string; // Entry card ID
  databaseId: string;
  title: string;
  values: { [columnId: string]: any };
  content: any | null; // ProseMirror JSON for entry body
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Database Entry Request
 */
export interface CreateDatabaseEntryRequest {
  title?: string;
  values: { [columnId: string]: any };
  content?: any | null;
}

/**
 * Update Database Entry Request
 */
export interface UpdateDatabaseEntryRequest {
  title?: string;
  values?: { [columnId: string]: any }; // Partial update supported
  content?: any | null;
}

/**
 * Database Schema Response
 */
export interface DatabaseSchemaResponse {
  columns: DatabaseColumn[];
  views: DatabaseView[];
  defaultViewId: string;
}
