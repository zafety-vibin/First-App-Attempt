# CRITICAL: Information Level Inconsistency Audit

**Date**: 2025-11-02
**Severity**: CRITICAL - Data integrity compromised
**Impact**: AI filtering, UI display, data validation all inconsistent

## The Problem

Three different value systems for `player_knowledge` field across the application:

### System 1: CORRECT (Database + EditableCell)
**Source**: `information_levels` table, `InformationLevel.ts` constants
```
- common-knowledge (HYPHEN)
- player-knowledge (HYPHEN)
- dm-secret (HYPHEN)
- system
- [custom UUIDs]
```

### System 2: WRONG (Underscores - BulkActions, QuickAdd, FilterPanel, MCP, Backend Routes)
```
- common_knowledge (UNDERSCORE)
- player_knowledge (UNDERSCORE)
- dm_only (WRONG NAME)
```

### System 3: WRONG (GenericEntityForm Detail Edit)
```
- public (COMPLETELY DIFFERENT)
- partial (COMPLETELY DIFFERENT)
- dm_only
```

---

## Affected Frontend Files

### HARDCODED - Needs InformationLevelContext

**BulkActionsToolbar.tsx** (Lines 93-95):
```tsx
<button onClick={() => handleSetVisibility('common_knowledge')}>
<button onClick={() => handleSetVisibility('player_knowledge')}>
<button onClick={() => handleSetVisibility('dm_only')}>
```
❌ Uses underscores, should load from InformationLevelContext

**GenericEntityForm.tsx** (Lines 1827-1831):
```tsx
const playerKnowledgeOptions = [
  { value: 'public', label: 'Public' },
  { value: 'partial', label: 'Partial' },
  { value: 'dm_only', label: 'DM Only' },
];
```
❌ Uses completely wrong values 'public'/'partial', should load from InformationLevelContext

**QuickAddRow.tsx** (Lines 140-142):
```tsx
<option value="common_knowledge">Common Knowledge</option>
<option value="player_knowledge">Player Knowledge</option>
<option value="dm_only">DM Only</option>
```
❌ Uses underscores, should load from InformationLevelContext

**FilterPanel.tsx** (Lines 32-34):
```tsx
{ value: 'common_knowledge', label: 'Common Knowledge' },
{ value: 'player_knowledge', label: 'Player Knowledge' },
{ value: 'dm_only', label: 'DM Only' },
```
❌ Uses underscores, should load from InformationLevelContext

**EditableCell.tsx** (Lines 275-277) - FALLBACK CODE:
```tsx
{ value: 'common_knowledge', label: 'Common Knowledge' },
{ value: 'player_knowledge', label: 'Player Knowledge' },
{ value: 'dm_only', label: 'DM Only' },
```
❌ Fallback when InformationLevelContext fails, uses wrong values

**EditableCell.tsx** (Lines 195-197) - BADGE DISPLAY:
```tsx
common_knowledge: 'Common',
player_knowledge: 'Player',
dm_only: 'DM Only',
```
❌ Maps underscore values to labels, should use hyphenated IDs

---

## Affected Backend Files

### MCP Tools (Feature 011)

**mcp/tools/index.ts** (Line 122):
```
**player_knowledge**: enum ['common_knowledge', 'player_knowledge', 'dm_only', custom]
```
❌ Documentation uses underscores

**mcp/tools/info-level-tools.ts** (Lines 281-283, 429-431, 543-545):
```
- Common Knowledge → 'common_knowledge'
- Player Knowledge → 'player_knowledge'
- DM Secret → 'dm_only'
```
❌ Multiple references to wrong values

### Seed Files

**db/seed-all-categories.ts** (Lines 120, 224, 375, 585, 731, 848, 1047):
```typescript
faction.player_knowledge || 'dm_only'
```
❌ Defaults to 'dm_only' instead of 'dm-secret'

### Routes

**routes/faction-regions.ts** (Lines 143-144):
```typescript
faction.player_knowledge === 'common_knowledge' ||
faction.player_knowledge === 'player_knowledge'
```
❌ Checking for underscore values

**routes/hierarchy-navigator.ts** (Line 214):
```typescript
!['common_knowledge', 'player_knowledge'].includes(loc.player_knowledge)
```
❌ Checking for underscore values

**routes/location-maps.ts** (Lines 140-141, 153-154):
```typescript
entity.player_knowledge === 'common_knowledge' ||
entity.player_knowledge === 'player_knowledge'
```
❌ Checking for underscore values

**routes/location-pins.ts** (Line 144):
```typescript
entity.player_knowledge === 'common_knowledge'
```
❌ Checking for underscore values

---

## What Values Are Actually in Database?

**Information Levels Table**: ✅ CORRECT
```
- common-knowledge (hyphen)
- player-knowledge (hyphen)
- dm-secret (hyphen)
- system
```

**Category Tables** (user's campaign 9b54d5ba-d990-4327-9639-75e71d4288e3):
- Mostly NULL (contextual/default)
- **UNKNOWN**: May contain mixed values from broken UI (public, partial, common_knowledge, dm_only, etc.)

---

## The Cascading Failure

1. User double-clicks inline cell → EditableCell uses InformationLevelContext → ✅ Saves correct hyphenated ID
2. User bulk edits → BulkActionsToolbar hardcoded buttons → ❌ Saves `common_knowledge` (underscore)
3. User edits detail page → GenericEntityForm hardcoded dropdown → ❌ Saves `public` or `partial`
4. Backend viewMode filtering uses `getPlayerKnowledgeFilter()` → Queries `information_levels.hierarchical`
5. Backend routes check for underscore values → Some entities filtered incorrectly
6. MCP tools expect underscore values → Wrong documentation
7. AI gets inconsistent data → Confusion

**Result**: Database contains mixed values, filtering is unreliable, AI can't trust the data.

---

## Required Fixes

### Frontend (5 files)
1. **BulkActionsToolbar.tsx**: Load from InformationLevelContext, generate buttons dynamically
2. **GenericEntityForm.tsx**: Remove playerKnowledgeOptions array, load from InformationLevelContext
3. **QuickAddRow.tsx**: Load from InformationLevelContext, generate options dynamically
4. **FilterPanel.tsx**: Load from InformationLevelContext (or hardcode CORRECT hyphenated values if filters don't need custom levels)
5. **EditableCell.tsx**: Remove fallback hardcoded values (lines 275-277, 195-197)

### Backend (4 areas)
1. **MCP tools** (mcp/tools/index.ts, info-level-tools.ts): Update docs to use hyphenated values
2. **Seed files** (seed-all-categories.ts): Change 'dm_only' to 'dm-secret'
3. **Routes** (faction-regions, hierarchy-navigator, location-maps, location-pins): Change underscore checks to hyphenated
4. **Models** (npc.ts, sessionPrep.ts): Update comments to show correct values

### Database Migration (CRITICAL)
Create Migration 027 to clean up existing data:
```sql
-- Convert any wrong values to correct hyphenated IDs
UPDATE factions SET player_knowledge = 'common-knowledge' WHERE player_knowledge = 'common_knowledge';
UPDATE factions SET player_knowledge = 'player-knowledge' WHERE player_knowledge = 'player_knowledge';
UPDATE factions SET player_knowledge = 'dm-secret' WHERE player_knowledge IN ('dm_only', 'DM Only');
UPDATE factions SET player_knowledge = NULL WHERE player_knowledge IN ('public', 'partial');
-- Repeat for all 13 category tables
```

---

## Testing Required

1. Create entity via GenericEntityForm → Verify saves hyphenated ID
2. Inline edit via EditableCell → Verify saves hyphenated ID
3. Bulk edit via BulkActionsToolbar → Verify saves hyphenated ID
4. Quick add via QuickAddRow → Verify saves hyphenated ID
5. Filter via FilterPanel → Verify filters correctly
6. Backend viewMode filtering → Verify only shows correct entities in player_view
7. MCP tools → Verify accept hyphenated IDs

---

**PRIORITY**: IMMEDIATE - This breaks data integrity across the entire application
