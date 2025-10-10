# Data Model: Campaign Setup Wizard

## Overview

The Campaign Setup Wizard configures new campaigns through 4 steps, persisting theme-based category naming and initial World-Foundations entries. All wizard state is transient (client-side only) until final submission persists to campaign_settings table.

## Database Entities

### CampaignSettings

**Purpose**: Stores campaign configuration from wizard including theme and category display names.

**Table Structure**:
```sql
CREATE TABLE campaign_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL UNIQUE,
  theme TEXT NOT NULL CHECK (theme IN ('high_fantasy', 'cyberpunk', 'sci_fi', 'modern', 'custom')),
  category_labels TEXT NOT NULL, -- JSON object mapping internal→display names
  enabled_categories TEXT NOT NULL, -- JSON array of enabled category internal names
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_campaign_settings_campaign_id ON campaign_settings(campaign_id);
```

**JSON Schema for category_labels**:
```json
{
  "npcs": "Characters",
  "locations": "Realms",
  "factions": "Kingdoms",
  "planar_forces": "Pantheon",
  "items": "Artifacts",
  "creatures": "Beasts",
  "lore": "Lore",
  "world_rules": "World Rules",
  "session_prep": "Session Prep",
  "session_recaps": "Session Recaps",
  "quests": "Quests",
  "player_characters": "Player Characters",
  "custom_mechanics": "Custom Mechanics"
}
```

**JSON Schema for enabled_categories**:
```json
[
  "npcs",
  "locations",
  "factions",
  "planar_forces",
  "items",
  "lore",
  "world_rules",
  "session_prep",
  "session_recaps",
  "quests",
  "player_characters",
  "custom_mechanics"
]
```
*Note: Array length 11-13 depending on optional category toggles*

**Relationships**:
- Belongs to one Campaign (1:1)
- Campaign can have zero or one CampaignSettings

### WorldRule (Starter Entries)

**Purpose**: Initial world constant entries created from World-Foundations questionnaire.

**Table Structure** (existing from Feature 014):
```sql
-- No schema changes, uses existing world_rules table
-- Wizard creates entries with specific rule_type values
```

**Questionnaire-Generated Entries**:
- **rule_type values**: `cosmology`, `magic_system`, `technology_level`, `social_structure`
- **name**: Derived from question topic (e.g., "Magic System Rules")
- **description**: User's answer text (up to 1000 characters)
- **player_knowledge**: Default `common_knowledge` (can be changed later)
- **core_status**: `approved` (GM-authored content)

**Example Entry**:
```json
{
  "id": 1,
  "campaign_id": 42,
  "name": "Magic System Rules",
  "description": "Magic flows through ley lines. Mages must channel energy from these lines. Overuse causes corruption.",
  "rule_type": "magic_system",
  "player_knowledge": "common_knowledge",
  "core_status": "approved",
  "exceptions": null,
  "tags": [],
  "created_at": 1736524800,
  "updated_at": 1736524800,
  "custom_fields": {}
}
```

## Wizard UI State Models

### WizardState

Root wizard state container.

```typescript
interface WizardState {
  currentStep: 1 | 2 | 3 | 4;
  step1: StyleSelectionState;
  step2: CategoryToggleState;
  step3: GraphSelectionState;
  step4: WorldFoundationsState;
  canProceed: boolean;
  isSubmitting: boolean;
  error: string | null;
}
```

**State Transitions**:
- `currentStep`: 1 → 2 → 3 → 4 (forward), 4 → 3 → 2 → 1 (back)
- `canProceed`: Computed based on current step validation
- `isSubmitting`: True during final POST request
- `error`: Displayed at top of wizard if persistence fails

### Step 1: StyleSelectionState

```typescript
interface StyleSelectionState {
  selectedTheme: ThemeOption | null;
  customLabels: CategoryLabelsMap | null; // Only populated if theme is 'custom'
  isValid: boolean;
}

type ThemeOption = 'high_fantasy' | 'cyberpunk' | 'sci_fi' | 'modern' | 'custom';

interface CategoryLabelsMap {
  npcs: string;
  locations: string;
  factions: string;
  planar_forces: string;
  items: string;
  creatures: string;
  lore: string;
  world_rules: string;
  session_prep: string;
  session_recaps: string;
  quests: string;
  player_characters: string;
  custom_mechanics: string;
}
```

**Validation Rules**:
- `isValid = selectedTheme !== null`
- If `selectedTheme === 'custom'`, all customLabels values must be non-empty and ≤50 characters

### Step 2: CategoryToggleState

```typescript
interface CategoryToggleState {
  enabledCategories: Set<CategoryInternalName>;
  mandatoryCategories: CategoryInternalName[];
  optionalCategories: OptionalCategory[];
  isValid: boolean;
}

type CategoryInternalName =
  | 'npcs' | 'locations' | 'factions' | 'planar_forces'
  | 'items' | 'creatures' | 'lore' | 'world_rules'
  | 'session_prep' | 'session_recaps' | 'quests'
  | 'player_characters' | 'custom_mechanics';

interface OptionalCategory {
  internalName: 'planar_forces' | 'creatures';
  displayName: string; // From theme labels
  enabled: boolean;
  description: string;
}

// Constants
const MANDATORY_CATEGORIES: CategoryInternalName[] = [
  'lore', 'world_rules', 'npcs', 'locations', 'factions',
  'session_prep', 'session_recaps', 'quests', 'player_characters',
  'custom_mechanics', 'items'
];

const OPTIONAL_CATEGORIES: { internalName: 'planar_forces' | 'creatures', defaultEnabled: boolean }[] = [
  { internalName: 'planar_forces', defaultEnabled: true },
  { internalName: 'creatures', defaultEnabled: false }
];
```

**Validation Rules**:
- `isValid = true` (always valid, optional categories can be all disabled)
- `enabledCategories` always contains all `mandatoryCategories`

### Step 3: GraphSelectionState

```typescript
interface GraphSelectionState {
  worldFoundationsChoice: 'setup_now' | 'setup_later';
  deferredGraphs: Set<'political_web' | 'geographical' | 'campaign_story'>; // Not used in v1, informational only
  isValid: boolean;
}
```

**Validation Rules**:
- `isValid = true` (always valid, worldFoundationsChoice has default 'setup_now')

### Step 4: WorldFoundationsState

```typescript
interface WorldFoundationsState {
  questions: WorldFoundationsQuestion[];
  answers: Map<number, string>; // questionId → answer text
  isValid: boolean;
  isSkipped: boolean; // True if Step 3 chose 'setup_later'
}

interface WorldFoundationsQuestion {
  id: number;
  question: string;
  rule_type: 'cosmology' | 'magic_system' | 'technology_level' | 'social_structure';
  input_type: 'multiple_choice' | 'short_text' | 'long_text';
  options?: string[]; // For multiple_choice only
  placeholder?: string;
  required: boolean; // False for all questions (optional)
}
```

**Validation Rules**:
- `isValid = true` (all questions optional, user can skip to Finish)
- `isSkipped = true` bypasses this step entirely

**Question Set** (4 questions):

```typescript
const WORLD_FOUNDATIONS_QUESTIONS: WorldFoundationsQuestion[] = [
  {
    id: 1,
    question: "Does magic exist in your world? If yes, describe how it works.",
    rule_type: 'magic_system',
    input_type: 'long_text',
    placeholder: "e.g., Magic flows through ley lines, mages channel energy...",
    required: false
  },
  {
    id: 2,
    question: "What is the technology level of your world?",
    rule_type: 'technology_level',
    input_type: 'multiple_choice',
    options: [
      "Stone Age / Primitive",
      "Medieval / Renaissance",
      "Industrial Revolution",
      "Modern / Contemporary",
      "Near-Future / Cyberpunk",
      "Far-Future / Space Age",
      "Post-Apocalyptic",
      "Mixed (varies by region)"
    ],
    required: false
  },
  {
    id: 3,
    question: "Describe the cosmology or planar structure (e.g., multiple planes, single material world, etc.)",
    rule_type: 'cosmology',
    input_type: 'long_text',
    placeholder: "e.g., Material plane connected to Feywild and Shadowfell...",
    required: false
  },
  {
    id: 4,
    question: "What are the major social structures or governance systems?",
    rule_type: 'social_structure',
    input_type: 'long_text',
    placeholder: "e.g., Feudal kingdoms, democratic city-states, corporate oligarchy...",
    required: false
  }
];
```

## Theme Configuration Constants

### Preset Theme Mappings

**High Fantasy Theme**:
```typescript
const HIGH_FANTASY_LABELS: CategoryLabelsMap = {
  npcs: "Characters",
  locations: "Realms",
  factions: "Kingdoms",
  planar_forces: "Pantheon",
  items: "Artifacts",
  creatures: "Beasts",
  lore: "Lore",
  world_rules: "World Rules",
  session_prep: "Session Prep",
  session_recaps: "Session Recaps",
  quests: "Quests",
  player_characters: "Player Characters",
  custom_mechanics: "Custom Mechanics"
};
```

**Cyberpunk Theme**:
```typescript
const CYBERPUNK_LABELS: CategoryLabelsMap = {
  locations: "Districts",
  factions: "Corporations",
  quests: "Missions",
  player_characters: "Runners",
  items: "Gear",
  // All other categories use default internal names
  npcs: "NPCs",
  planar_forces: "Planar Forces",
  creatures: "Creatures",
  lore: "Lore",
  world_rules: "World Rules",
  session_prep: "Session Prep",
  session_recaps: "Session Recaps",
  custom_mechanics: "Custom Mechanics"
};
```

**Sci-Fi Theme**:
```typescript
const SCI_FI_LABELS: CategoryLabelsMap = {
  lore: "Archives",
  world_rules: "Physics",
  locations: "Sectors",
  planar_forces: "Cosmic Forces",
  quests: "Objectives",
  player_characters: "Crew",
  custom_mechanics: "Tech Mods",
  items: "Tech",
  creatures: "Xenofauna",
  // Remaining categories use default names
  npcs: "NPCs",
  factions: "Factions",
  session_prep: "Session Prep",
  session_recaps: "Session Recaps"
};
```

**Modern Theme**:
```typescript
const MODERN_LABELS: CategoryLabelsMap = {
  lore: "Background",
  locations: "Places",
  factions: "Organizations",
  planar_forces: "Beliefs",
  quests: "Tasks",
  items: "Equipment",
  // Remaining categories use default names
  npcs: "NPCs",
  creatures: "Creatures",
  world_rules: "World Rules",
  session_prep: "Session Prep",
  session_recaps: "Session Recaps",
  player_characters: "Player Characters",
  custom_mechanics: "Custom Mechanics"
};
```

**Custom Theme**:
```typescript
// User provides all 13 labels via text input
// Initialized with default internal names (capitalized)
const CUSTOM_LABELS_DEFAULT: CategoryLabelsMap = {
  npcs: "NPCs",
  locations: "Locations",
  factions: "Factions",
  planar_forces: "Planar Forces",
  items: "Items",
  creatures: "Creatures",
  lore: "Lore",
  world_rules: "World Rules",
  session_prep: "Session Prep",
  session_recaps: "Session Recaps",
  quests: "Quests",
  player_characters: "Player Characters",
  custom_mechanics: "Custom Mechanics"
};
```

### Theme Descriptions

```typescript
interface ThemeDescriptor {
  id: ThemeOption;
  name: string;
  description: string;
  labels: CategoryLabelsMap;
  previewCategories: string[]; // Show 4-5 most distinctive renames
}

const THEME_DESCRIPTORS: ThemeDescriptor[] = [
  {
    id: 'high_fantasy',
    name: "High Fantasy",
    description: "Epic worlds of magic, kingdoms, and ancient artifacts",
    labels: HIGH_FANTASY_LABELS,
    previewCategories: ['Pantheon', 'Kingdoms', 'Realms', 'Artifacts']
  },
  {
    id: 'cyberpunk',
    name: "Cyberpunk",
    description: "Neon-lit streets, mega-corporations, and high-tech low-life",
    labels: CYBERPUNK_LABELS,
    previewCategories: ['Corporations', 'Districts', 'Runners', 'Gear']
  },
  {
    id: 'sci_fi',
    name: "Sci-Fi",
    description: "Space exploration, advanced technology, and cosmic mysteries",
    labels: SCI_FI_LABELS,
    previewCategories: ['Archives', 'Sectors', 'Tech Mods', 'Xenofauna']
  },
  {
    id: 'modern',
    name: "Modern",
    description: "Contemporary settings with organizations, tasks, and equipment",
    labels: MODERN_LABELS,
    previewCategories: ['Organizations', 'Background', 'Places', 'Equipment']
  },
  {
    id: 'custom',
    name: "Custom",
    description: "Define your own category names to fit your unique setting",
    labels: CUSTOM_LABELS_DEFAULT,
    previewCategories: ['(You choose all names)']
  }
];
```

## Validation Schemas (Zod)

### Step 1 Schema

```typescript
import { z } from 'zod';

const categoryLabelSchema = z.string().min(1).max(50);

const categoryLabelsMapSchema = z.object({
  npcs: categoryLabelSchema,
  locations: categoryLabelSchema,
  factions: categoryLabelSchema,
  planar_forces: categoryLabelSchema,
  items: categoryLabelSchema,
  creatures: categoryLabelSchema,
  lore: categoryLabelSchema,
  world_rules: categoryLabelSchema,
  session_prep: categoryLabelSchema,
  session_recaps: categoryLabelSchema,
  quests: categoryLabelSchema,
  player_characters: categoryLabelSchema,
  custom_mechanics: categoryLabelSchema
});

const styleSelectionSchema = z.object({
  selectedTheme: z.enum(['high_fantasy', 'cyberpunk', 'sci_fi', 'modern', 'custom']),
  customLabels: categoryLabelsMapSchema.nullable()
}).refine(
  (data) => data.selectedTheme !== 'custom' || data.customLabels !== null,
  { message: "Custom theme requires customLabels" }
);
```

### Step 2 Schema

```typescript
const categoryToggleSchema = z.object({
  enabledCategories: z.array(z.string()).min(11).max(13)
});
```

### Step 3 Schema

```typescript
const graphSelectionSchema = z.object({
  worldFoundationsChoice: z.enum(['setup_now', 'setup_later'])
});
```

### Step 4 Schema

```typescript
const worldFoundationsAnswerSchema = z.object({
  questionId: z.number().int().min(1).max(4),
  answer: z.string().max(1000)
});

const worldFoundationsSchema = z.object({
  answers: z.array(worldFoundationsAnswerSchema)
});
```

### Wizard Completion Request Schema

```typescript
const wizardCompleteRequestSchema = z.object({
  theme: z.enum(['high_fantasy', 'cyberpunk', 'sci_fi', 'modern', 'custom']),
  categoryLabels: categoryLabelsMapSchema,
  enabledCategories: z.array(z.string()).min(11).max(13),
  worldFoundationsAnswers: z.array(worldFoundationsAnswerSchema).optional()
});

type WizardCompleteRequest = z.infer<typeof wizardCompleteRequestSchema>;
```

## State Transitions

### Wizard Flow State Machine

```
┌──────────────────────────────────────────────────────┐
│                  Initial State                       │
│  currentStep: 1                                      │
│  step1: { selectedTheme: null, ... }                │
│  canProceed: false                                   │
└──────────────┬───────────────────────────────────────┘
               │
               │ User selects theme
               ▼
┌──────────────────────────────────────────────────────┐
│              Step 1 Complete                         │
│  step1: { selectedTheme: 'high_fantasy', ... }      │
│  canProceed: true                                    │
└──────────────┬───────────────────────────────────────┘
               │
               │ Click Next
               ▼
┌──────────────────────────────────────────────────────┐
│                  Step 2 Active                       │
│  currentStep: 2                                      │
│  step2: { enabledCategories: [...], ... }           │
│  canProceed: true (always valid)                     │
└──────────────┬───────────────────────────────────────┘
               │
               │ Click Next (or Back to Step 1)
               ▼
┌──────────────────────────────────────────────────────┐
│                  Step 3 Active                       │
│  currentStep: 3                                      │
│  step3: { worldFoundationsChoice: 'setup_now' }     │
│  canProceed: true (always valid)                     │
└──────────────┬───────────────────────────────────────┘
               │
               ├─ If 'setup_now' ─┐
               │                   ▼
               │         ┌──────────────────────────────┐
               │         │      Step 4 Active           │
               │         │  currentStep: 4              │
               │         │  step4: { answers: [...] }  │
               │         └──────────┬───────────────────┘
               │                    │
               │                    │ Click Finish
               │                    ▼
               └─ If 'setup_later' ─┐
                                     │
                                     ▼
               ┌──────────────────────────────────────────┐
               │          Wizard Submission               │
               │  isSubmitting: true                      │
               │  POST /api/campaigns/:id/wizard/complete │
               └──────────┬───────────────────────────────┘
                          │
                          ├─ Success ─┐
                          │            ▼
                          │  ┌─────────────────────────────┐
                          │  │   Redirect to Homepage      │
                          │  │   Settings persisted        │
                          │  └─────────────────────────────┘
                          │
                          ├─ Error ─┐
                                    ▼
                          ┌──────────────────────────────┐
                          │   Display Error              │
                          │   isSubmitting: false        │
                          │   User can retry or go back  │
                          └──────────────────────────────┘
```

### Back Navigation Rules

- **Step 1**: No Back button (first step)
- **Step 2**: Back → Step 1 (preserves step1 state)
- **Step 3**: Back → Step 2 (preserves step2 state)
- **Step 4**: Back → Step 3 (preserves step3 and step4 states)

### Progress Calculation

```typescript
function getWizardProgress(state: WizardState): string {
  const totalSteps = state.step3.worldFoundationsChoice === 'setup_now' ? 4 : 3;
  return `Step ${state.currentStep} of ${totalSteps}`;
}
```

## Database Operations

### Wizard Status Check

**Query**: Check if campaign has existing settings
```sql
SELECT id, theme, category_labels, enabled_categories
FROM campaign_settings
WHERE campaign_id = ?;
```

**Logic**:
- If row exists: `shouldShowWizard = false`, redirect to campaign homepage
- If row does not exist: `shouldShowWizard = true`, display wizard

### Wizard Completion Transaction

**Transaction Steps**:
1. Insert into campaign_settings
2. If worldFoundationsChoice === 'setup_now':
   - Create World-Foundations knowledge_graph entry (graph_type: 'world_foundations')
   - Insert world_rules entries for each answered question
3. Commit transaction

**SQL Operations**:

```sql
-- Step 1: Insert campaign settings
INSERT INTO campaign_settings (campaign_id, theme, category_labels, enabled_categories)
VALUES (?, ?, ?, ?);

-- Step 2a: Create World-Foundations graph (if applicable)
INSERT INTO knowledge_graphs (campaign_id, graph_type, toggle_state)
VALUES (?, 'world_foundations', 'enabled');

-- Step 2b: Insert world rules (for each answer)
INSERT INTO world_rules (
  campaign_id,
  name,
  description,
  rule_type,
  player_knowledge,
  core_status,
  tags,
  custom_fields
)
VALUES (?, ?, ?, ?, 'common_knowledge', 'approved', '[]', '{}');
```

**Rollback Conditions**:
- Campaign settings insert fails
- Knowledge graph insert fails (if setup_now)
- Any world_rules insert fails (if setup_now)

### Theme Retrieval

**Static Data** (no database query):
Frontend includes all 5 theme descriptors as constants. GET /api/campaigns/:id/wizard/themes endpoint returns hardcoded theme configurations.

## Error Handling

### Validation Errors

**Step 1 Validation**:
- No theme selected: "Please select a theme to continue"
- Custom theme with empty label: "All category names must be filled in"
- Custom theme with long label: "Category name must be 50 characters or less"

**Step 4 Validation**:
- Answer exceeds 1000 characters: "Answer must be 1000 characters or less"

### Persistence Errors

**Transaction Failures**:
- Database write error: "Failed to save campaign settings. Please try again."
- Partial success (settings saved but world rules failed): Rollback, show error
- Network timeout: "Request timed out. Please check your connection and try again."

### Client-Side Error Recovery

**Progress Lost on Refresh**:
- Display warning banner: "Wizard progress is not saved automatically. Please complete all steps in one session."

**Browser Back Button**:
- Implement `beforeunload` event listener if state is not at Step 1
- Prompt: "You have unsaved wizard progress. Are you sure you want to leave?"

## Performance Considerations

### Client-Side State Management

- Use React Context or Zustand for wizard state (transient, no persistence)
- Total state size: ~5KB (theme + labels + answers)
- No API calls until final submission (except initial status check)

### Database Indexes

```sql
-- Existing index for campaign_settings query
CREATE INDEX idx_campaign_settings_campaign_id ON campaign_settings(campaign_id);
```

### Transaction Timeout

- Set 10-second timeout for wizard completion transaction
- Rollback on timeout, display error to user

## Migration Script

```sql
-- Migration: 016-campaign-settings.sql
-- Creates campaign_settings table for wizard configuration

CREATE TABLE IF NOT EXISTS campaign_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL UNIQUE,
  theme TEXT NOT NULL CHECK (theme IN ('high_fantasy', 'cyberpunk', 'sci_fi', 'modern', 'custom')),
  category_labels TEXT NOT NULL, -- JSON object
  enabled_categories TEXT NOT NULL, -- JSON array
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_campaign_settings_campaign_id ON campaign_settings(campaign_id);
```
