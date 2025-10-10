# Data Model: Stateless AI Import System

**Feature**: 017-create-a-stateless
**Date**: 2025-01-10

## Overview

This document defines the data model for Feature 017's stateless AI import workflow, including import job tracking, duplicate detection, preview state management, and Zod validation schemas for all 13 category types.

## Key Entities

### 1. ImportJob (Ephemeral)

**Purpose**: Tracks one-shot import process from upload to confirmation. Ephemeral - deleted after confirmation/cancellation, not persisted long-term.

**Table Name**: `import_jobs`

**SQL Schema**:

```sql
CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  import_type TEXT NOT NULL,  -- Maps to 13 category names
  source_type TEXT NOT NULL,  -- 'file_upload' or 'text_paste'
  file_name TEXT,  -- Original filename if file upload
  custom_context TEXT,  -- Optional user prompt (max 1000 chars)
  extracted_count INTEGER DEFAULT 0,  -- Number of entities extracted by AI
  confirmed_count INTEGER DEFAULT 0,  -- Number actually written after edits
  status TEXT NOT NULL DEFAULT 'processing',  -- processing, preview, confirmed, cancelled, failed
  error_message TEXT,  -- Stored if status = failed
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Constraints
  CHECK (source_type IN ('file_upload', 'text_paste')),
  CHECK (status IN ('processing', 'preview', 'confirmed', 'cancelled', 'failed')),
  CHECK (import_type IN (
    'Location notes', 'NPC notes', 'Faction notes', 'Session Recap',
    'Quest notes', 'Player Character notes', 'Lore notes', 'World Rule notes',
    'Planar Forces notes', 'Session Prep notes', 'Custom Mechanics notes',
    'Item notes', 'Creature notes'
  ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_import_jobs_campaign_id ON import_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at);
```

**TypeScript Interface**:

```typescript
interface ImportJob {
  id: string;
  campaign_id: string;
  user_id: string;
  import_type: ImportType;
  source_type: 'file_upload' | 'text_paste';
  file_name: string | null;
  custom_context: string | null;
  extracted_count: number;
  confirmed_count: number;
  status: 'processing' | 'preview' | 'confirmed' | 'cancelled' | 'failed';
  error_message: string | null;
  created_at: number;
  updated_at: number;
}

type ImportType =
  | 'Location notes'
  | 'NPC notes'
  | 'Faction notes'
  | 'Session Recap'
  | 'Quest notes'
  | 'Player Character notes'
  | 'Lore notes'
  | 'World Rule notes'
  | 'Planar Forces notes'
  | 'Session Prep notes'
  | 'Custom Mechanics notes'
  | 'Item notes'
  | 'Creature notes';
```

**Lifecycle**:
1. Created when user clicks Import button (status = 'processing')
2. Transitions to 'preview' when AI extraction completes
3. Transitions to 'confirmed' after GM confirms preview
4. Transitions to 'cancelled' if GM cancels
5. Transitions to 'failed' if AI processing or DB write fails
6. Deleted automatically after confirmation or cancellation (ephemeral)

**Relationships**:
- Belongs to Campaign (campaign_id → campaigns.id) - CASCADE delete
- No foreign key to users table (uses Keycloak sub directly)

---

### 2. DuplicateCandidate (Ephemeral)

**Purpose**: Tracks potential duplicate matches found during fuzzy matching in preview. Ephemeral - deleted after import confirmation/cancellation.

**Table Name**: `duplicate_candidates`

**SQL Schema**:

```sql
CREATE TABLE IF NOT EXISTS duplicate_candidates (
  id TEXT PRIMARY KEY,
  import_job_id TEXT NOT NULL,
  preview_entry_id TEXT NOT NULL,  -- Temp ID of extracted entity in preview
  existing_entry_id TEXT NOT NULL,  -- ID of existing database entity
  existing_entry_table TEXT NOT NULL,  -- Table name (e.g., 'npcs', 'locations')
  similarity_score REAL NOT NULL,  -- 0.0 to 1.0 fuzzy match confidence
  match_type TEXT NOT NULL,  -- 'name_match', 'description_match', 'internal_duplicate'
  resolution TEXT DEFAULT 'unresolved',  -- 'unresolved', 'ignored', 'merged', 'deleted_preview', 'deleted_existing'
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign key constraints
  FOREIGN KEY (import_job_id) REFERENCES import_jobs(id) ON DELETE CASCADE,

  -- Constraints
  CHECK (similarity_score >= 0.0 AND similarity_score <= 1.0),
  CHECK (match_type IN ('name_match', 'description_match', 'internal_duplicate', 'combined')),
  CHECK (resolution IN ('unresolved', 'ignored', 'merged', 'deleted_preview', 'deleted_existing'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_import_job_id ON duplicate_candidates(import_job_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_similarity_score ON duplicate_candidates(similarity_score);
```

**TypeScript Interface**:

```typescript
interface DuplicateCandidate {
  id: string;
  import_job_id: string;
  preview_entry_id: string;  // Temp ID in preview
  existing_entry_id: string;  // DB entity ID
  existing_entry_table: string;  // 'npcs', 'locations', etc.
  similarity_score: number;  // 0.0 to 1.0
  match_type: 'name_match' | 'description_match' | 'internal_duplicate' | 'combined';
  resolution: 'unresolved' | 'ignored' | 'merged' | 'deleted_preview' | 'deleted_existing';
  created_at: number;
}
```

**Lifecycle**:
1. Created during preview generation when fuzzy matching detects duplicates
2. Updated when GM resolves conflict (ignores, merges, deletes)
3. Deleted when import job confirmed/cancelled (CASCADE)

**Relationships**:
- Belongs to ImportJob (import_job_id → import_jobs.id) - CASCADE delete

---

## Frontend State Models

### 3. ImportDialogState

**Purpose**: React Context state for managing import dialog workflow

**TypeScript Interface**:

```typescript
interface ImportDialogState {
  stage: 'upload' | 'processing' | 'preview' | 'confirmed' | 'error';
  importType: ImportType | null;
  sourceType: 'file' | 'text' | null;
  fileName: string | null;
  textContent: string | null;
  customContext: string;
  extractedEntities: ExtractedEntity[];
  processingProgress: number;  // 0-100
  error: ImportError | null;
  duplicateCandidates: DuplicateCandidate[];
  sequentialImport: boolean;  // True if Session Recap batch mode
  sequentialFiles: File[];  // Ordered file list for batch import
}

type ExtractedEntity = {
  tempId: string;  // Generated UUID for preview tracking
  [key: string]: any;  // Dynamic fields based on import type
};

interface ImportError {
  code: string;
  message: string;
  retryable: boolean;
  details?: any;
}
```

---

### 4. PreviewState

**Purpose**: Tracks preview table editing state and validation

**TypeScript Interface**:

```typescript
interface PreviewState {
  entities: ExtractedEntity[];
  editedEntities: Map<string, Partial<ExtractedEntity>>;  // tempId → updates
  deletedEntities: Set<string>;  // Set of deleted tempIds
  validationErrors: Map<string, Record<string, string>>;  // tempId → field → error message
  duplicateWarnings: DuplicateCandidate[];
  isDirty: boolean;  // True if any edits made
}
```

---

### 5. ConfirmationState

**Purpose**: Tracks database write confirmation state

**TypeScript Interface**:

```typescript
interface ConfirmationState {
  isConfirming: boolean;
  confirmedCount: number;
  totalCount: number;
  error: string | null;
}
```

---

## Import Workflow State Machine

```
┌─────────────┐
│   upload    │ Initial state: Type selection, file/text input
└──────┬──────┘
       │ User clicks Import
       ▼
┌─────────────┐
│ processing  │ AI extracting entities (stateless one-shot)
└──────┬──────┘
       │ Extraction success
       ▼
┌─────────────┐
│   preview   │ GM edits table rows, resolves duplicates
└──────┬──────┘
       │ User clicks Confirm
       ▼
┌─────────────┐
│  confirmed  │ Database writes complete (atomic transaction)
└─────────────┘

Error paths:
processing → error (AI failure, rate limit, file parse error)
preview → upload (Cancel button - discard changes)
confirmed → error (DB write failure - rollback transaction)
error → upload (Retry button - preserve state)
```

**State Transitions**:

- `upload → processing`: User clicks Import with valid type + file/text
- `processing → preview`: AI extraction succeeds, entities + duplicates loaded
- `processing → error`: AI API error, file parse failure, rate limit exceeded
- `preview → confirmed`: User clicks Confirm, DB writes succeed
- `preview → upload`: User clicks Cancel, all changes discarded
- `preview → error`: DB write fails, transaction rolled back
- `confirmed → [closed]`: Dialog closes, dashboard refreshes
- `error → upload`: User clicks Retry, state preserved for retry
- `error → upload`: User clicks Cancel, state reset

---

## Zod Validation Schemas

### Universal Schema (All Categories)

```typescript
import { z } from 'zod';

const universalSchema = z.object({
  // Required universal fields
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less'),

  description: z.string()
    .nullable()
    .optional(),

  // Optional universal fields
  core_status: z.enum(['active', 'archived', 'draft', 'hidden'])
    .default('active'),

  player_knowledge: z.string()
    .nullable()
    .optional()
    .default('common_knowledge'),

  tags: z.array(z.string())
    .default([]),

  custom_fields: z.record(z.any())
    .default({}),
});
```

---

### 1. NPC Notes Schema

```typescript
const npcSchema = universalSchema.extend({
  // Category-specific fields
  race: z.string().nullable().optional(),

  class: z.array(z.string())
    .nullable()
    .optional(),

  level: z.number()
    .int()
    .min(1, 'Level must be at least 1')
    .max(20, 'Level cannot exceed 20')
    .nullable()
    .optional(),

  alignment: z.string()
    .nullable()
    .optional(),

  appearance: z.string()
    .nullable()
    .optional(),

  personality_traits: z.string()
    .nullable()
    .optional(),

  motivation: z.string()
    .nullable()
    .optional(),

  relationship_to_party: z.string()
    .nullable()
    .optional(),

  met_party: z.number()
    .int()
    .min(0)
    .max(1)
    .default(0),

  art: z.string()
    .url('Art must be a valid URL')
    .nullable()
    .optional(),

  // Explicit connections (foreign keys)
  faction_id: z.string()
    .uuid('Invalid faction ID')
    .nullable()
    .optional(),

  superior_npc_id: z.string()
    .uuid('Invalid NPC ID')
    .nullable()
    .optional(),

  // Many-to-many connections
  locations: z.array(z.string().uuid())
    .default([]),

  // DM-only fields
  dm_secrets: z.string()
    .nullable()
    .optional(),

  dm_plot_relevance: z.string()
    .nullable()
    .optional(),
});

export type NPCImportData = z.infer<typeof npcSchema>;
```

---

### 2. Location Notes Schema

```typescript
const locationSchema = universalSchema.extend({
  location_type: z.string()
    .nullable()
    .optional(),

  population: z.number()
    .int()
    .min(0, 'Population cannot be negative')
    .nullable()
    .optional(),

  cultural_characteristics: z.string()
    .nullable()
    .optional(),

  map: z.string()
    .url('Map must be a valid URL')
    .nullable()
    .optional(),

  // Explicit connections
  parent_location_id: z.string()
    .uuid('Invalid location ID')
    .nullable()
    .optional(),

  // Many-to-many connections
  notable_npcs: z.array(z.string().uuid())
    .default([]),

  factions_present: z.array(z.string().uuid())
    .default([]),

  connected_locations: z.array(z.string().uuid())
    .default([]),

  // DM-only fields
  dm_secrets: z.string()
    .nullable()
    .optional(),
});

export type LocationImportData = z.infer<typeof locationSchema>;
```

---

### 3. Faction Notes Schema

```typescript
const factionSchema = universalSchema.extend({
  faction_type: z.string()
    .nullable()
    .optional(),

  power_level: z.string()
    .nullable()
    .optional(),

  resources: z.string()
    .nullable()
    .optional(),

  beliefs: z.string()
    .nullable()
    .optional(),

  goals: z.string()
    .nullable()
    .optional(),

  methods: z.string()
    .nullable()
    .optional(),

  // Explicit connections
  leader_id: z.string()
    .uuid('Invalid NPC ID')
    .nullable()
    .optional(),

  // Many-to-many connections
  key_members: z.array(z.string().uuid())
    .default([]),

  allied_factions: z.array(z.string().uuid())
    .default([]),

  rival_factions: z.array(z.string().uuid())
    .default([]),

  territory: z.array(z.string().uuid())
    .default([]),

  // DM-only fields
  dm_true_agenda: z.string()
    .nullable()
    .optional(),
});

export type FactionImportData = z.infer<typeof factionSchema>;
```

---

### 4. Session Recap Schema

```typescript
const sessionRecapSchema = universalSchema.extend({
  session_date: z.number()
    .int()
    .positive('Session date must be a valid Unix timestamp')
    .nullable()
    .optional(),

  in_game_date_start: z.string()
    .nullable()
    .optional(),

  in_game_date_end: z.string()
    .nullable()
    .optional(),

  time_passed: z.string()
    .nullable()
    .optional(),

  summary: z.string()
    .nullable()
    .optional(),

  key_events: z.array(z.string())
    .nullable()
    .optional(),

  player_decisions: z.array(z.string())
    .nullable()
    .optional(),

  // Canonical markers (always enforced)
  is_canon: z.literal(1),
  canonical_status: z.literal('canon'),

  // Many-to-many connections
  npcs_encountered: z.array(z.string().uuid())
    .default([]),

  locations_visited: z.array(z.string().uuid())
    .default([]),

  quests_progressed: z.array(z.string().uuid())
    .default([]),

  loot_acquired: z.array(z.string().uuid())
    .default([]),

  // DM-only fields
  dm_consequences: z.string()
    .nullable()
    .optional(),

  dm_behind_scenes: z.string()
    .nullable()
    .optional(),
});

export type SessionRecapImportData = z.infer<typeof sessionRecapSchema>;
```

---

### 5. Quest Notes Schema

```typescript
const questSchema = universalSchema.extend({
  status: z.enum(['not_started', 'in_progress', 'completed', 'failed'])
    .default('not_started'),

  objectives: z.array(z.string())
    .default([]),

  rewards: z.string()
    .nullable()
    .optional(),

  // Explicit connections
  quest_giver_id: z.string()
    .uuid('Invalid NPC ID')
    .nullable()
    .optional(),

  started_session_id: z.string()
    .uuid('Invalid session ID')
    .nullable()
    .optional(),

  completed_session_id: z.string()
    .uuid('Invalid session ID')
    .nullable()
    .optional(),

  // Many-to-many connections
  related_npcs: z.array(z.string().uuid())
    .default([]),

  related_locations: z.array(z.string().uuid())
    .default([]),

  // DM-only fields
  dm_true_objective: z.string()
    .nullable()
    .optional(),

  dm_consequences: z.string()
    .nullable()
    .optional(),
});

export type QuestImportData = z.infer<typeof questSchema>;
```

---

### 6. Player Character Notes Schema

```typescript
const playerCharacterSchema = universalSchema.extend({
  player_name: z.string()
    .nullable()
    .optional(),

  class: z.array(z.string())
    .nullable()
    .optional(),

  level: z.number()
    .int()
    .min(1)
    .max(20)
    .nullable()
    .optional(),

  race: z.string()
    .nullable()
    .optional(),

  background: z.string()
    .nullable()
    .optional(),

  personality: z.string()
    .nullable()
    .optional(),

  goals: z.string()
    .nullable()
    .optional(),

  backstory: z.string()
    .nullable()
    .optional(),

  art: z.string()
    .url('Art must be a valid URL')
    .nullable()
    .optional(),

  // Many-to-many connections
  faction_affiliations: z.array(z.string().uuid())
    .default([]),

  allied_npcs: z.array(z.string().uuid())
    .default([]),

  // DM-only fields
  dm_secrets: z.string()
    .nullable()
    .optional(),

  dm_plot_threads: z.string()
    .nullable()
    .optional(),

  dm_true_motivation: z.string()
    .nullable()
    .optional(),

  dm_consequences: z.string()
    .nullable()
    .optional(),
});

export type PlayerCharacterImportData = z.infer<typeof playerCharacterSchema>;
```

---

### 7. Lore Notes Schema

```typescript
const loreSchema = universalSchema.extend({
  category: z.string()
    .nullable()
    .optional(),

  era_period: z.string()
    .nullable()
    .optional(),

  in_game_date: z.string()
    .nullable()
    .optional(),

  historical_accuracy: z.string()
    .nullable()
    .optional(),

  // Many-to-many connections
  related_npcs: z.array(z.string().uuid())
    .default([]),

  related_locations: z.array(z.string().uuid())
    .default([]),

  related_factions: z.array(z.string().uuid())
    .default([]),
});

export type LoreImportData = z.infer<typeof loreSchema>;
```

---

### 8. World Rule Notes Schema

```typescript
const worldRuleSchema = universalSchema.extend({
  rule_type: z.string()
    .nullable()
    .optional(),

  exceptions: z.string()
    .nullable()
    .optional(),

  // Many-to-many connections (self-relation)
  related_rules: z.array(z.string().uuid())
    .default([]),
});

export type WorldRuleImportData = z.infer<typeof worldRuleSchema>;
```

---

### 9. Planar Forces Notes Schema

```typescript
const planarForceSchema = universalSchema.extend({
  entity_type: z.string()
    .nullable()
    .optional(),

  domains: z.array(z.string())
    .nullable()
    .optional(),

  alignment: z.string()
    .nullable()
    .optional(),

  worshiper_base: z.string()
    .nullable()
    .optional(),

  plane_of_origin: z.string()
    .nullable()
    .optional(),

  base_of_power: z.string()
    .nullable()
    .optional(),

  // Explicit connections
  high_priest_id: z.string()
    .uuid('Invalid NPC ID')
    .nullable()
    .optional(),

  // Many-to-many connections
  allied_entities: z.array(z.string().uuid())
    .default([]),

  rival_entities: z.array(z.string().uuid())
    .default([]),

  religious_orders: z.array(z.string().uuid())
    .default([]),

  // DM-only fields
  dm_true_nature: z.string()
    .nullable()
    .optional(),
});

export type PlanarForceImportData = z.infer<typeof planarForceSchema>;
```

---

### 10. Session Prep Notes Schema

```typescript
const sessionPrepSchema = universalSchema.extend({
  // Override universal defaults
  player_knowledge: z.literal('dm_only'),  // Always dm_only

  planned_date: z.number()
    .int()
    .positive('Planned date must be a valid Unix timestamp')
    .nullable()
    .optional(),

  status: z.enum(['draft', 'ready', 'completed', 'cancelled'])
    .default('draft'),

  planned_events: z.string()
    .nullable()
    .optional(),

  possible_encounters: z.string()
    .nullable()
    .optional(),

  plot_hooks: z.string()
    .nullable()
    .optional(),

  dm_notes: z.string()
    .nullable()
    .optional(),

  // Canonical markers (always enforced)
  is_canon: z.literal(0),
  canonical_status: z.literal('hypothetical'),

  // One-way connections (NOT foreign keys)
  plot_threads: z.array(z.string().uuid())
    .default([]),

  npcs_to_prep: z.array(z.string().uuid())
    .default([]),

  locations_to_prep: z.array(z.string().uuid())
    .default([]),
});

export type SessionPrepImportData = z.infer<typeof sessionPrepSchema>;
```

---

### 11. Custom Mechanics Notes Schema

```typescript
const customMechanicSchema = universalSchema.extend({
  mechanic_type: z.string()
    .nullable()
    .optional(),

  rules_text: z.string()
    .nullable()
    .optional(),

  prerequisites: z.string()
    .nullable()
    .optional(),

  source: z.string()
    .nullable()
    .optional(),

  // Many-to-many connections (self-relation)
  related_rules: z.array(z.string().uuid())
    .default([]),
});

export type CustomMechanicImportData = z.infer<typeof customMechanicSchema>;
```

---

### 12. Item Notes Schema

```typescript
const itemSchema = universalSchema.extend({
  item_type: z.string()
    .nullable()
    .optional(),

  rarity: z.string()
    .nullable()
    .optional(),

  properties: z.string()
    .nullable()
    .optional(),

  value: z.string()
    .nullable()
    .optional(),

  // Explicit connections (ownership)
  owner_npc_id: z.string()
    .uuid('Invalid NPC ID')
    .nullable()
    .optional(),

  owner_pc_id: z.string()
    .uuid('Invalid PC ID')
    .nullable()
    .optional(),

  location_id: z.string()
    .uuid('Invalid location ID')
    .nullable()
    .optional(),

  // DM-only fields
  dm_secret_properties: z.string()
    .nullable()
    .optional(),

  dm_true_nature: z.string()
    .nullable()
    .optional(),
});

export type ItemImportData = z.infer<typeof itemSchema>;
```

---

### 13. Creature Notes Schema

```typescript
const creatureSchema = universalSchema.extend({
  creature_type: z.string()
    .nullable()
    .optional(),

  challenge_rating: z.string()
    .nullable()
    .optional(),

  abilities: z.string()
    .nullable()
    .optional(),

  // Many-to-many connections
  habitats: z.array(z.string().uuid())
    .default([]),

  // DM-only fields
  dm_behavior_notes: z.string()
    .nullable()
    .optional(),
});

export type CreatureImportData = z.infer<typeof creatureSchema>;
```

---

## Import Type to Schema Mapping

```typescript
import { z } from 'zod';

const importTypeSchemaMap: Record<ImportType, z.ZodSchema> = {
  'NPC notes': npcSchema,
  'Location notes': locationSchema,
  'Faction notes': factionSchema,
  'Session Recap': sessionRecapSchema,
  'Quest notes': questSchema,
  'Player Character notes': playerCharacterSchema,
  'Lore notes': loreSchema,
  'World Rule notes': worldRuleSchema,
  'Planar Forces notes': planarForceSchema,
  'Session Prep notes': sessionPrepSchema,
  'Custom Mechanics notes': customMechanicSchema,
  'Item notes': itemSchema,
  'Creature notes': creatureSchema,
};

export function getSchemaForImportType(importType: ImportType): z.ZodSchema {
  const schema = importTypeSchemaMap[importType];
  if (!schema) {
    throw new Error(`Unknown import type: ${importType}`);
  }
  return schema;
}
```

---

## Import Type to Database Table Mapping

```typescript
const importTypeTableMap: Record<ImportType, string> = {
  'NPC notes': 'npcs',
  'Location notes': 'locations',
  'Faction notes': 'factions',
  'Session Recap': 'session_recaps',
  'Quest notes': 'quests',
  'Player Character notes': 'player_characters',
  'Lore notes': 'lore_entries',
  'World Rule notes': 'world_rules',
  'Planar Forces notes': 'planar_forces',
  'Session Prep notes': 'session_prep',
  'Custom Mechanics notes': 'custom_mechanics',
  'Item notes': 'items',
  'Creature notes': 'creatures',
};

export function getTableNameForImportType(importType: ImportType): string {
  const tableName = importTypeTableMap[importType];
  if (!tableName) {
    throw new Error(`Unknown import type: ${importType}`);
  }
  return tableName;
}
```

---

## Validation Patterns

### Preview Validation Flow

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: Map<string, Record<string, string>>;  // tempId → field → error
}

function validatePreviewEntities(
  entities: ExtractedEntity[],
  importType: ImportType
): ValidationResult {
  const schema = getSchemaForImportType(importType);
  const errors = new Map<string, Record<string, string>>();

  for (const entity of entities) {
    try {
      // Validate against Zod schema
      schema.parse(entity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};

        for (const issue of error.errors) {
          const fieldPath = issue.path.join('.');
          fieldErrors[fieldPath] = issue.message;
        }

        errors.set(entity.tempId, fieldErrors);
      }
    }
  }

  return {
    isValid: errors.size === 0,
    errors,
  };
}
```

---

### Custom Field Validation

```typescript
interface CustomFieldDefinition {
  field_name: string;
  field_type: 'text' | 'number' | 'select' | 'multi_select' | 'date';
  options?: string[];  // For select/multi_select
}

function validateCustomFields(
  customFields: Record<string, any>,
  definitions: CustomFieldDefinition[]
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const def of definitions) {
    const value = customFields[def.field_name];

    if (value === undefined || value === null) {
      continue;  // Optional fields
    }

    switch (def.field_type) {
      case 'number':
        if (typeof value !== 'number') {
          errors[def.field_name] = 'Must be a number';
        }
        break;

      case 'select':
        if (!def.options?.includes(value)) {
          errors[def.field_name] = `Must be one of: ${def.options?.join(', ')}`;
        }
        break;

      case 'multi_select':
        if (!Array.isArray(value) || !value.every(v => def.options?.includes(v))) {
          errors[def.field_name] = `All values must be from: ${def.options?.join(', ')}`;
        }
        break;

      case 'date':
        if (isNaN(Date.parse(value))) {
          errors[def.field_name] = 'Must be a valid date';
        }
        break;
    }
  }

  return errors;
}
```

---

## Performance Targets

- **AI Extraction**: <5s for 10-page document (FR-018)
- **Fuzzy Matching**: <2s for 50 extracted entities vs 1000 existing entities
- **Preview Rendering**: <500ms for 50 entities (FR-025)
- **Validation**: <100ms for 50 entities (Zod schema validation)
- **Database Write**: <2s for 50 entities (atomic transaction)
- **Total Workflow**: <10s from Import button to Confirm success

---

## Migration SQL

```sql
-- Migration: 017-import-jobs.sql
-- Feature 017: Stateless AI Import System

-- Import jobs table (ephemeral)
CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  import_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  file_name TEXT,
  custom_context TEXT,
  extracted_count INTEGER DEFAULT 0,
  confirmed_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,

  CHECK (source_type IN ('file_upload', 'text_paste')),
  CHECK (status IN ('processing', 'preview', 'confirmed', 'cancelled', 'failed')),
  CHECK (import_type IN (
    'Location notes', 'NPC notes', 'Faction notes', 'Session Recap',
    'Quest notes', 'Player Character notes', 'Lore notes', 'World Rule notes',
    'Planar Forces notes', 'Session Prep notes', 'Custom Mechanics notes',
    'Item notes', 'Creature notes'
  ))
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_campaign_id ON import_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at);

-- Duplicate candidates table (ephemeral)
CREATE TABLE IF NOT EXISTS duplicate_candidates (
  id TEXT PRIMARY KEY,
  import_job_id TEXT NOT NULL,
  preview_entry_id TEXT NOT NULL,
  existing_entry_id TEXT NOT NULL,
  existing_entry_table TEXT NOT NULL,
  similarity_score REAL NOT NULL,
  match_type TEXT NOT NULL,
  resolution TEXT DEFAULT 'unresolved',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (import_job_id) REFERENCES import_jobs(id) ON DELETE CASCADE,

  CHECK (similarity_score >= 0.0 AND similarity_score <= 1.0),
  CHECK (match_type IN ('name_match', 'description_match', 'internal_duplicate', 'combined')),
  CHECK (resolution IN ('unresolved', 'ignored', 'merged', 'deleted_preview', 'deleted_existing'))
);

CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_import_job_id ON duplicate_candidates(import_job_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_similarity_score ON duplicate_candidates(similarity_score);
```

---

**Status**: ✅ Data model complete - 2 entities (ImportJob, DuplicateCandidate), 3 state models, 13 Zod schemas, state machine, validation patterns
