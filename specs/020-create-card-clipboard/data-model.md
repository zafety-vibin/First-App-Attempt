# Feature 020: Card Clipboard Operations - Data Model

## Overview
This document defines the CLIENT-SIDE data models for clipboard operations. No backend database changes are required - all state is managed in the browser using sessionStorage and React Context.

## 1. ClipboardState

**Storage**: sessionStorage key `"wrldbldr_clipboard"`
**Purpose**: Persists clipboard data across page refreshes within the same session

### TypeScript Interface
```typescript
interface ClipboardState {
  operationType: 'cut' | 'copy';
  cardIds: string[];  // UUIDs from Feature 003 cards table
  sourceParentId: string | null;  // For undo restoration after cut
  sourceCampaignId: string;  // For cross-campaign validation (FR-036)
  timestamp: number;  // Unix timestamp for operation tracking
}
```

### Validation Rules
- `cardIds` array must have length > 0
- `operationType` must be either 'cut' or 'copy'
- `sourceCampaignId` must match current campaign on paste (FR-036)
- State automatically cleared on logout/campaign close (FR-035)

### State Transitions
```
Empty → Cut/Copy → Paste → Empty (cut mode)
Empty → Copy → Paste → Copy (copy mode stays active)
Any → Escape → Empty (cancel operation)
```

### Storage Example
```json
{
  "operationType": "cut",
  "cardIds": ["uuid-1", "uuid-2", "uuid-3"],
  "sourceParentId": "parent-uuid",
  "sourceCampaignId": "campaign-uuid",
  "timestamp": 1704067200000
}
```

## 2. CardSelection

**Storage**: React Context state (in-memory)
**Purpose**: Manages multi-selection state for clipboard operations

### TypeScript Interface
```typescript
interface CardSelection {
  selectedCardIds: Set<string>;  // UUIDs of selected cards
  anchorCardId: string | null;  // First card in Shift+click range
  selectionTimestamp: number;  // Last selection change timestamp
}
```

### Validation Rules
- Only wiki cards allowed (no database cards per FR-033)
- All selected cards must be from same campaign
- Maximum 500 cards can be selected (FR-042)
- Selection cleared when switching campaigns/views

### State Transitions
```
Empty → Ctrl+click → Single selected
Single → Ctrl+click same → Empty (deselect)
Single → Shift+click → Range selected
Any → Ctrl+A → All visible selected
Any → Escape/click empty → Empty
```

### Context Provider Example
```typescript
interface CardSelectionContextValue {
  selection: CardSelection;
  toggleCardSelection: (cardId: string) => void;
  selectRange: (fromId: string, toId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelected: (cardId: string) => boolean;
}
```

## 3. UndoHistoryEntry

**Storage**: React Context state (in-memory stack)
**Purpose**: Enables undo/redo for clipboard operations

### TypeScript Interface
```typescript
interface UndoHistoryEntry {
  operationType: 'cut' | 'paste' | 'delete';
  affectedCardIds: string[];  // Cards that were modified
  previousState: {
    parentIds: Record<string, string | null>;  // Original parent relationships
    positions: Record<string, number>;  // Original sort positions
    content?: Record<string, any>;  // Card content (for delete operations)
  };
  timestamp: number;  // When operation occurred
}

interface UndoRedoStack {
  undoStack: UndoHistoryEntry[];  // Max 10 entries (FR-030)
  redoStack: UndoHistoryEntry[];  // Cleared on new operation
}
```

### Validation Rules
- Stack maximum size: 10 entries (FR-030)
- FIFO eviction when limit reached (oldest entry removed)
- Only clipboard operations tracked (not manual card moves)
- Redo stack cleared when new operation performed

### State Transitions
```
Push to undo stack: paste complete, delete complete
Pop from undo stack: Ctrl+Z (undo operation)
Push to redo stack: After undo
Pop from redo stack: Ctrl+Shift+Z (redo operation)
Clear redo stack: Any new operation
```

### Stack Management Example
```typescript
interface UndoRedoContextValue {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  pushToUndoStack: (entry: UndoHistoryEntry) => void;
  clearHistory: () => void;
}
```

## Data Flow

### Copy Operation
1. User selects cards → Updates `CardSelection`
2. User presses Ctrl+C → Creates `ClipboardState` with `operationType: 'copy'`
3. Data persisted to sessionStorage
4. Visual indicators updated (dashed borders)

### Cut Operation
1. User selects cards → Updates `CardSelection`
2. User presses Ctrl+X → Creates `ClipboardState` with `operationType: 'cut'`
3. Data persisted to sessionStorage
4. Visual indicators updated (opacity 0.5, dashed borders)

### Paste Operation
1. User presses Ctrl+V → Reads `ClipboardState` from sessionStorage
2. Validates campaign match (FR-036)
3. Executes paste operation via backend API
4. Creates `UndoHistoryEntry` for the operation
5. For cut: Clears `ClipboardState`
6. For copy: Maintains `ClipboardState` for multiple pastes

### Undo Operation
1. User presses Ctrl+Z → Pops from `undoStack`
2. Restores previous state via backend API
3. Pushes inverse operation to `redoStack`

## Storage Lifecycle

### sessionStorage (ClipboardState)
- **Created**: On cut/copy operation
- **Updated**: After paste (cut mode only - cleared)
- **Cleared**: On logout, campaign close, tab close, or escape key
- **Survives**: Page refresh within same tab

### React Context (CardSelection, UndoHistoryEntry)
- **Created**: On component mount
- **Updated**: Throughout user interaction
- **Cleared**: On component unmount, campaign switch
- **Lost**: On page refresh (intentional - selection state not persisted)

## Performance Considerations

### Memory Limits
- Maximum 500 cards in selection (FR-042)
- Maximum 10 undo history entries (FR-030)
- Estimated memory usage per card ID: ~40 bytes
- Maximum clipboard memory: ~20KB (500 cards)
- Maximum undo stack memory: ~200KB (10 entries with content)

### Optimization Strategies
1. Use Set for selectedCardIds (O(1) lookup)
2. Lazy load card content for undo (only when needed)
3. Debounce selection updates to prevent excessive re-renders
4. Clear undo history on campaign switch to free memory

## Error Handling

### Validation Errors
```typescript
enum ClipboardError {
  EMPTY_SELECTION = 'No cards selected',
  INVALID_CAMPAIGN = 'Cannot paste cards from different campaign',
  CIRCULAR_REFERENCE = 'Cannot paste - would create circular reference',
  MAX_SELECTION_EXCEEDED = 'Maximum 500 cards can be selected',
  CLIPBOARD_EMPTY = 'Nothing to paste',
  OPERATION_FAILED = 'Clipboard operation failed'
}
```

### Recovery Strategies
1. Invalid clipboard data → Clear and notify user
2. Campaign mismatch → Show error toast, maintain clipboard
3. Backend failure → Preserve clipboard state for retry
4. Undo stack corruption → Clear history, log error

## Security Considerations

### Data Sanitization
- All card IDs validated as UUIDs before storage
- Campaign IDs verified against current session
- No HTML/rich text stored in clipboard (only IDs)
- sessionStorage isolated per origin (localhost:3000)

### Access Control
- Clipboard operations respect information level filtering (Feature 004)
- Cannot copy/cut cards user doesn't have access to
- Paste validates user has write access to target location
- Undo/redo maintains original access permissions