/**
 * Database Schema Types
 * Feature: 003-create-a-notion
 * Extended in Feature: 004-create-a-tagging (added hierarchical column flag, player-knowledge-text type)
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
    defaultViewId: string;
}
/**
 * Database Column Definition
 */
export interface DatabaseColumn {
    id: string;
    name: string;
    type: DatabaseColumnType;
    required: boolean;
    defaultValue?: any;
    options?: DatabaseColumnOptions;
    entityType?: 'card';
    hierarchical?: boolean;
}
/**
 * Column Types
 * MVP: text, number, date, select, multi-select, entity-reference
 * Feature 004: player-knowledge-text (partial visibility for secret entries)
 * Future: checkbox, URL, file, formula
 */
export type DatabaseColumnType = 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'entity-reference' | 'player-knowledge-text';
/**
 * Column Options (for select/multi-select types)
 */
export interface DatabaseColumnOptions {
    choices: DatabaseChoice[];
}
export interface DatabaseChoice {
    id: string;
    label: string;
    color?: string;
}
/**
 * Database View Configuration
 */
export interface DatabaseView {
    id: string;
    name: string;
    type: DatabaseViewType;
    filter?: FilterRule[];
    sort?: SortRule[];
    groupBy?: string;
}
/**
 * View Types
 */
export type DatabaseViewType = 'table' | 'list' | 'gallery' | 'kanban';
/**
 * Filter Rule for database views
 */
export interface FilterRule {
    columnId: string;
    operator: FilterOperator;
    value: any;
}
export type FilterOperator = 'equals' | 'contains' | 'greater' | 'less' | 'is-empty';
/**
 * Sort Rule for database views
 */
export interface SortRule {
    columnId: string;
    direction: 'asc' | 'desc';
}
/**
 * Database Entry Metadata
 * Stored in cards.metadata for page cards that are database entries
 */
export interface DatabaseEntryMetadata {
    databaseId: string;
    values: {
        [columnId: string]: any;
    };
}
/**
 * Database Entry (full object with card fields)
 */
export interface DatabaseEntry {
    id: string;
    databaseId: string;
    title: string;
    values: {
        [columnId: string]: any;
    };
    content: any | null;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Create Database Entry Request
 */
export interface CreateDatabaseEntryRequest {
    title?: string;
    values: {
        [columnId: string]: any;
    };
    content?: any | null;
}
/**
 * Update Database Entry Request
 */
export interface UpdateDatabaseEntryRequest {
    title?: string;
    values?: {
        [columnId: string]: any;
    };
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
//# sourceMappingURL=DatabaseSchema.d.ts.map