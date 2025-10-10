# Feature 020: Card Clipboard Operations - Implementation Tasks

**Branch**: `020-create-card-clipboard`
**Feature Type**: Frontend-heavy (minimal backend changes)
**Estimated Effort**: 28-34 hours
**Parallelization**: Up to 8 tasks can run in parallel (marked with [P])

---

## Task Overview

| Category | Task Count | Estimated Hours |
|----------|------------|-----------------|
| Frontend Tests | 9 | 9-11 |
| Frontend Contexts | 3 | 4-5 |
| Frontend Hooks | 4 | 4-5 |
| Frontend Components | 6 | 6-8 |
| Frontend Utils | 2 | 2-3 |
| Integration Tests | 2 | 2-3 |
| E2E Tests | 3 | 3-4 |
| **Total** | **29** | **28-34** |

---

## Phase 1: Frontend Test Setup (TDD)

### T001 [P]: Write unit tests for CardSelectionContext
**File**: `frontend/tests/contexts/CardSelectionContext.test.tsx`
**Description**: Write unit tests for CardSelectionContext. Test scenarios: (1) Initial state is empty Set, (2) selectCard adds card to selection, (3) deselectCard removes card, (4) toggleCardSelection toggles selection state, (5) selectRange with Shift+click selects all cards between anchor and target, (6) selectAll selects all provided card IDs, (7) clearSelection empties selection Set, (8) setAnchorCard updates anchor for range selection.
**Dependencies**: None (first task)
**Success Criteria**: 8 test cases written using React Testing Library, all tests fail with "CardSelectionContext not found"

---

### T002 [P]: Write unit tests for ClipboardContext
**File**: `frontend/tests/contexts/ClipboardContext.test.tsx`
**Description**: Write unit tests for ClipboardContext. Test scenarios: (1) Initial clipboard is empty, (2) cutCards stores operation type "cut" with card IDs in sessionStorage, (3) copyCards stores operation type "copy" without modifying source cards, (4) pasteCards validates circular hierarchy before paste, (5) pasteCards clears clipboard after cut operation (but not copy), (6) cancelCut clears cut state and sessionStorage, (7) cross-campaign paste blocked with error, (8) clipboard cleared on campaign switch, (9) sessionStorage cleared on logout.
**Dependencies**: None (parallel with T001)
**Success Criteria**: 9 test cases written, all tests fail with "ClipboardContext not found"

---

### T003 [P]: Write unit tests for UndoContext
**File**: `frontend/tests/contexts/UndoContext.test.tsx`
**Description**: Write unit tests for UndoContext. Test scenarios: (1) Initial undo/redo stacks are empty, (2) pushOperation adds operation to undo stack, (3) undo operation restores previous state and moves to redo stack, (4) redo operation reapplies undone operation, (5) undo stack limited to 10 operations (oldest discarded), (6) new operation clears redo stack, (7) canUndo returns false when stack empty, (8) canRedo returns false when stack empty.
**Dependencies**: None (parallel with T001-T002)
**Success Criteria**: 8 test cases written, all tests fail with "UndoContext not found"

---

### T004 [P]: Write unit tests for useCardSelection hook
**File**: `frontend/tests/hooks/useCardSelection.test.ts`
**Description**: Write unit tests for useCardSelection hook. Test scenarios: (1) Returns selection context values, (2) handleCtrlClick toggles individual card selection, (3) handleShiftClick selects range from anchor to clicked card, (4) handleClick on unselected card clears selection and selects clicked card, (5) handleEscape clears all selections, (6) handleCtrlA selects all visible cards, (7) isSelected returns true for selected card IDs.
**Dependencies**: None (parallel with T001-T003)
**Success Criteria**: 7 test cases written, all tests fail with "useCardSelection not found"

---

### T005 [P]: Write unit tests for useClipboard hook
**File**: `frontend/tests/hooks/useClipboard.test.ts`
**Description**: Write unit tests for useClipboard hook. Test scenarios: (1) Returns clipboard context values, (2) handleCut calls cutCards with selected IDs, (3) handleCopy calls copyCards with selected IDs, (4) handlePaste validates destination and calls pasteCards, (5) handlePaste blocks circular hierarchy with error toast, (6) handlePaste blocks cross-campaign paste with error toast, (7) clipboard isEmpty returns true when no cards in clipboard, (8) clipboardCount returns number of cards in clipboard.
**Dependencies**: None (parallel with T001-T004)
**Success Criteria**: 8 test cases written, all tests fail with "useClipboard not found"

---

### T006 [P]: Write unit tests for useKeyboardShortcuts hook
**File**: `frontend/tests/hooks/useKeyboardShortcuts.test.ts`
**Description**: Write unit tests for useKeyboardShortcuts hook. Test scenarios: (1) Ctrl+X triggers cut operation, (2) Ctrl+C triggers copy operation, (3) Ctrl+V triggers paste operation, (4) Ctrl+Z triggers undo operation, (5) Ctrl+Shift+Z triggers redo operation, (6) Ctrl+Y triggers redo operation (alternate), (7) Ctrl+A triggers select all, (8) Escape triggers clear selection, (9) Delete triggers delete selected with confirmation, (10) Shortcuts only fire when focus is on card tree (not during content editing).
**Dependencies**: None (parallel with T001-T005)
**Success Criteria**: 10 test cases written, all tests fail with "useKeyboardShortcuts not found"

---

### T007 [P]: Write unit tests for useUndo hook
**File**: `frontend/tests/hooks/useUndo.test.ts`
**Description**: Write unit tests for useUndo hook. Test scenarios: (1) Returns undo context values, (2) handleUndo calls undo with operation restoration, (3) handleRedo calls redo with operation reapplication, (4) canUndo reflects stack state, (5) canRedo reflects stack state, (6) undoCount returns number of operations in undo stack, (7) redoCount returns number of operations in redo stack.
**Dependencies**: None (parallel with T001-T006)
**Success Criteria**: 7 test cases written, all tests fail with "useUndo not found"

---

### T008 [P]: Write component tests for CardContextMenu
**File**: `frontend/tests/components/CardContextMenu.test.tsx`
**Description**: Write component tests for CardContextMenu using Radix UI Dropdown Menu. Test scenarios: (1) Context menu opens on right-click, (2) Menu shows Cut/Copy/Paste/Delete/Select All options, (3) Paste is disabled when clipboard empty, (4) Cut/Copy disabled when no cards selected, (5) Delete disabled when no cards selected, (6) Menu closes on Escape, (7) Keyboard navigation works (arrow keys), (8) Click outside closes menu.
**Dependencies**: None (parallel with T001-T007)
**Success Criteria**: 8 test cases written, all tests fail with "CardContextMenu not found"

---

### T009 [P]: Write component tests for SelectionIndicator
**File**: `frontend/tests/components/SelectionIndicator.test.tsx`
**Description**: Write component tests for SelectionIndicator. Test scenarios: (1) Shows "X cards selected" when multiple cards selected, (2) Shows clipboard icon with badge count when clipboard has cards, (3) Shows cut state indicator when cards are cut (dimmed icon), (4) Indicator hidden when no selection and clipboard empty, (5) Click on indicator triggers clearSelection.
**Dependencies**: None (parallel with T001-T008)
**Success Criteria**: 5 test cases written, all tests fail with "SelectionIndicator not found"

---

## Phase 2: Frontend Contexts Implementation

### T010: Implement CardSelectionContext
**File**: `frontend/src/contexts/CardSelectionContext.tsx`
**Description**: Implement CardSelectionContext with React Context API. Provides state: selectedCardIds (Set<string>), anchorCardId (string | null), selectionTimestamp (number). Methods: selectCard, deselectCard, toggleCardSelection, selectRange, selectAll, clearSelection, setAnchorCard. Use Set for O(1) lookup performance. Implement selectRange logic: find all card IDs between anchor and target in tree order.
**Dependencies**: T001 (tests must exist)
**Success Criteria**: T001 tests pass (8/8), context provides all methods, selectRange correctly identifies cards between anchor and target

---

### T011: Implement ClipboardContext with sessionStorage
**File**: `frontend/src/contexts/ClipboardContext.tsx`
**Description**: Implement ClipboardContext with sessionStorage persistence. Provides state: clipboardState (ClipboardState | null), operationType ('cut' | 'copy'), cardIds (string[]), sourceCampaignId (string). Methods: cutCards, copyCards, pasteCards, cancelCut, clearClipboard. Implement sessionStorage sync: store ClipboardState as JSON, load on mount, clear on logout/campaign switch. Implement circular hierarchy validation: call wouldCreateCircularReference before paste. Show toast notifications for all operations. Implement cross-campaign validation: block paste if sourceCampaignId !== currentCampaignId.
**Dependencies**: T002 (tests must exist), T010 (CardSelectionContext)
**Success Criteria**: T002 tests pass (9/9), sessionStorage persists clipboard across page navigation, circular hierarchy blocked, cross-campaign paste blocked, toast notifications shown

---

### T012: Implement UndoContext with operation stack
**File**: `frontend/src/contexts/UndoContext.tsx`
**Description**: Implement UndoContext with custom stack implementation. Provides state: undoStack (UndoHistoryEntry[], max 10), redoStack (UndoHistoryEntry[]). Methods: pushOperation, undo, redo, canUndo, canRedo, clearHistory. Implement stack management: pushOperation adds to undoStack and clears redoStack, undo pops from undoStack and pushes to redoStack, redo pops from redoStack and pushes to undoStack. Enforce 10-item limit: discard oldest when pushing to full stack. Store minimal data: operation type, affected card IDs, previous state (parent IDs, positions).
**Dependencies**: T003 (tests must exist), T011 (ClipboardContext)
**Success Criteria**: T003 tests pass (8/8), undo/redo operations restore previous state, stack limited to 10 operations, oldest operations discarded

---

## Phase 3: Frontend Hooks Implementation

### T013: Implement useCardSelection hook
**File**: `frontend/src/hooks/useCardSelection.ts`
**Description**: Implement useCardSelection hook with keyboard modifier handling. Returns: selectedCardIds, anchorCardId, handleCtrlClick, handleShiftClick, handleClick, handleEscape, handleCtrlA, isSelected. Implement Ctrl+click logic: toggle individual card selection. Implement Shift+click logic: select range from anchorCardId to clicked card using selectRange. Implement plain click logic: clear selection and select clicked card. Implement Ctrl+A logic: select all visible cards (filter by current view mode). Implement Escape logic: clear all selections.
**Dependencies**: T004 (tests must exist), T010 (CardSelectionContext)
**Success Criteria**: T004 tests pass (7/7), Ctrl+click toggles selection, Shift+click selects range, plain click clears and selects, Ctrl+A selects all visible, Escape clears

---

### T014: Implement useClipboard hook
**File**: `frontend/src/hooks/useClipboard.ts`
**Description**: Implement useClipboard hook with clipboard operations. Returns: clipboardState, handleCut, handleCopy, handlePaste, handleCancel, isEmpty, clipboardCount. Implement handleCut: call ClipboardContext.cutCards with selected IDs, show toast "X cards cut". Implement handleCopy: call ClipboardContext.copyCards with selected IDs, show toast "X cards copied". Implement handlePaste: validate circular hierarchy, validate cross-campaign, call ClipboardContext.pasteCards, show toast "X cards pasted" or error toast. Implement handleCancel: call ClipboardContext.cancelCut, clear visual dimming. Implement isEmpty: return clipboardState === null. Implement clipboardCount: return cardIds.length.
**Dependencies**: T005 (tests must exist), T011 (ClipboardContext), T013 (useCardSelection)
**Success Criteria**: T005 tests pass (8/8), cut/copy/paste operations work correctly, toasts shown, circular hierarchy blocked, cross-campaign blocked

---

### T015: Implement useKeyboardShortcuts hook
**File**: `frontend/src/hooks/useKeyboardShortcuts.ts`
**Description**: Implement useKeyboardShortcuts hook with event listeners. Accepts: enabled (boolean) to enable/disable shortcuts based on focus state. Register keyboard event listeners: Ctrl+X → handleCut, Ctrl+C → handleCopy, Ctrl+V → handlePaste, Ctrl+Z → handleUndo, Ctrl+Shift+Z / Ctrl+Y → handleRedo, Ctrl+A → handleSelectAll, Escape → handleClearSelection, Delete → handleDeleteSelected. Implement focus detection: check if activeElement is within card tree (not TipTap editor). Clean up event listeners on unmount.
**Dependencies**: T006 (tests must exist), T013 (useCardSelection), T014 (useClipboard)
**Success Criteria**: T006 tests pass (10/10), all keyboard shortcuts functional, shortcuts disabled during content editing, event listeners cleaned up

---

### T016: Implement useUndo hook
**File**: `frontend/src/hooks/useUndo.ts`
**Description**: Implement useUndo hook with undo/redo operations. Returns: handleUndo, handleRedo, canUndo, canRedo, undoCount, redoCount. Implement handleUndo: call UndoContext.undo, restore card state using CardService, show toast "Undo: {operation}". Implement handleRedo: call UndoContext.redo, reapply operation using CardService, show toast "Redo: {operation}". Implement canUndo: return undoStack.length > 0. Implement canRedo: return redoStack.length > 0. Implement undoCount/redoCount: return stack lengths.
**Dependencies**: T007 (tests must exist), T012 (UndoContext), T014 (useClipboard)
**Success Criteria**: T007 tests pass (7/7), undo/redo operations work correctly, toasts shown, card state restored

---

## Phase 4: Frontend Components Implementation

### T017: Extend CardTree component with multi-select visual indicators
**File**: `frontend/src/components/CardTree.tsx` (MODIFY)
**Description**: Extend existing CardTree component from Feature 003 with multi-select visual indicators. Add CSS classes: `.card-selected` (blue highlight), `.card-cut` (dimmed opacity 0.5). Wire useCardSelection hook: pass handleClick, handleCtrlClick, handleShiftClick to card items. Wire useKeyboardShortcuts hook: enable shortcuts when tree has focus. Add onFocus/onBlur handlers to track focus state. Update CardTreeItem to show selection highlight and cut dimming. Preserve existing drag-and-drop functionality from Feature 003.
**Dependencies**: T013 (useCardSelection), T015 (useKeyboardShortcuts)
**Success Criteria**: Selected cards show blue highlight, cut cards show dimmed appearance, keyboard shortcuts work when tree focused, drag-and-drop still functional

---

### T018: Implement CardContextMenu component with Radix UI
**File**: `frontend/src/components/CardContextMenu.tsx`
**Description**: Implement CardContextMenu using Radix UI Dropdown Menu. Trigger: right-click on card or selected cards. Menu items: Cut (Ctrl+X), Copy (Ctrl+C), Paste (Ctrl+V), Delete (Del), separator, Select All (Ctrl+A). Implement disabled states: Paste disabled when clipboard empty, Cut/Copy/Delete disabled when no selection. Wire context menu to useClipboard and useCardSelection hooks. Add keyboard navigation: arrow keys, Enter to select, Escape to close. Show keyboard shortcuts in menu item labels. Prevent browser default context menu.
**Dependencies**: T008 (tests must exist), T013 (useCardSelection), T014 (useClipboard)
**Success Criteria**: T008 tests pass (8/8), context menu opens on right-click, all operations work, disabled states correct, keyboard navigation functional

---

### T019: Implement SelectionIndicator component
**File**: `frontend/src/components/SelectionIndicator.tsx`
**Description**: Implement SelectionIndicator component. Shows in status bar or floating position. Display: "X cards selected" when selection not empty, clipboard icon with badge count when clipboard has cards, dimmed clipboard icon when cards are cut. Wire useCardSelection and useClipboard hooks. Add click handler to clear selection. Use Lucide React icons for clipboard visual. Hide component when no selection and clipboard empty.
**Dependencies**: T009 (tests must exist), T013 (useCardSelection), T014 (useClipboard)
**Success Criteria**: T009 tests pass (5/5), indicator shows correct counts, clipboard icon shows cut state, click clears selection

---

### T020: Add keyboard shortcut help tooltip
**File**: `frontend/src/components/KeyboardShortcutHelp.tsx`
**Description**: Implement KeyboardShortcutHelp component. Shows tooltip or help panel with keyboard shortcuts: Ctrl+X (Cut), Ctrl+C (Copy), Ctrl+V (Paste), Ctrl+A (Select All), Ctrl+Z (Undo), Ctrl+Shift+Z / Ctrl+Y (Redo), Escape (Clear Selection), Delete (Delete Selected). Trigger: ? key or help icon. Use Radix UI Popover or Dialog. Add keyboard shortcut cheat sheet.
**Dependencies**: T015 (useKeyboardShortcuts)
**Success Criteria**: Help panel shows all shortcuts, accessible via ? key, clear layout with descriptions

---

### T021: Add toast notifications for clipboard operations
**File**: `frontend/src/components/ClipboardToasts.tsx`
**Description**: Implement ClipboardToasts component using existing toast library. Toast messages: "X cards cut to clipboard", "X cards copied to clipboard", "X cards pasted successfully", "Undo: {operation}", "Redo: {operation}", "Cannot move a card into its own descendant" (error), "Cannot paste cards from a different campaign" (error), "Parent card was deleted. Card will be pasted at root level." (warning). Wire to ClipboardContext and UndoContext events. Auto-dismiss after 3 seconds. Error toasts stay until dismissed.
**Dependencies**: T011 (ClipboardContext), T012 (UndoContext)
**Success Criteria**: All clipboard operations show toast notifications, error toasts show for invalid operations, warning toasts show for edge cases

---

### T022: Implement loading indicator for bulk paste operations
**File**: `frontend/src/components/PasteLoadingIndicator.tsx`
**Description**: Implement PasteLoadingIndicator component. Shows loading spinner when paste operation takes longer than 500ms (FR-039). Display: "Pasting X cards..." with progress indicator. Use React state to track paste operation in progress. Show modal overlay to prevent user interaction during paste. Auto-hide when paste completes.
**Dependencies**: T014 (useClipboard)
**Success Criteria**: Loading indicator shows for paste operations >500ms, prevents user interaction, auto-hides on completion

---

## Phase 5: Frontend Utils Implementation

### T023: Implement clipboard.ts utility
**File**: `frontend/src/utils/clipboard.ts`
**Description**: Implement clipboard utility functions. Functions: saveToSessionStorage(state: ClipboardState), loadFromSessionStorage(): ClipboardState | null, clearSessionStorage(), wouldCreateCircularReference(targetId: string, sourceIds: string[], cards: Card[]): boolean, getCardHierarchy(cardId: string, cards: Card[]): string[], validateCrossCampaign(sourceCampaignId: string, targetCampaignId: string): boolean. Implement wouldCreateCircularReference with recursive ancestor check algorithm from research.md. Use sessionStorage API with key "wrldbldr-clipboard". Handle JSON parse errors gracefully.
**Dependencies**: None (utility)
**Success Criteria**: sessionStorage functions work correctly, circular reference detection algorithm correct (O(depth) time complexity), cross-campaign validation works

---

### T024: Implement hierarchyValidation.ts utility
**File**: `frontend/src/utils/hierarchyValidation.ts`
**Description**: Implement hierarchy validation utility functions. Functions: getAncestors(cardId: string, cards: Card[]): string[], getDescendants(cardId: string, cards: Card[]): string[], isAncestorOf(ancestorId: string, descendantId: string, cards: Card[]): boolean, findRangeBetween(startId: string, endId: string, cards: Card[]): string[]. Implement findRangeBetween for Shift+click range selection: traverse tree in display order, collect all card IDs between start and end. Implement getDescendants for deep copy: collect all children recursively. Optimize with memoization for repeated queries.
**Dependencies**: None (utility)
**Success Criteria**: Ancestor/descendant functions correct, findRangeBetween returns cards in display order, memoization reduces redundant traversals

---

## Phase 6: Integration Tests

### T025: Write integration test for circular hierarchy validation
**File**: `frontend/tests/integration/clipboardHierarchy.test.tsx`
**Description**: Write integration test for circular hierarchy prevention. Test scenarios: (1) Create parent card A with child A1, cut A, attempt paste into A1 → blocked with error, (2) Create nested hierarchy A → A1 → A2, cut A, attempt paste into A2 → blocked with error, (3) Create sibling cards B and C, cut B, paste into C → succeeds, (4) Create parent D with children D1 and D2, cut D1, paste into D2 → succeeds (siblings to parent-child). Test with useCardSelection, useClipboard, and full CardTree component.
**Dependencies**: T017 (CardTree), T014 (useClipboard), T023 (clipboard utils)
**Success Criteria**: 4 test cases pass, circular hierarchy blocked in all scenarios, valid paste operations succeed

---

### T026: Write integration test for undo/redo with multiple operations
**File**: `frontend/tests/integration/undoRedo.test.tsx`
**Description**: Write integration test for undo/redo stack. Test scenarios: (1) Perform 5 cut/paste operations, undo 5 times → all operations reversed, (2) Perform 12 cut/paste operations, undo 11 times → only last 10 operations undoable, (3) Perform 3 operations, undo 2, redo 2 → operations reapplied, (4) Perform 3 operations, undo 1, perform new operation → redo stack cleared. Test with useUndo, useClipboard, and full CardTree component.
**Dependencies**: T017 (CardTree), T014 (useClipboard), T016 (useUndo)
**Success Criteria**: 4 test cases pass, undo stack limited to 10 operations, redo stack cleared on new operation, operations correctly restored

---

## Phase 7: E2E Tests

### T027: Write E2E test for complete clipboard workflow
**File**: `frontend/tests/e2e/clipboardWorkflow.spec.ts`
**Description**: Write Playwright E2E test for complete clipboard workflow per quickstart.md Scenario 1. Steps: (1) Login and navigate to campaign, (2) Ctrl+click to select 3 cards, (3) Ctrl+X to cut, verify dimming, (4) Click destination card, (5) Ctrl+V to paste, verify cards moved, (6) F5 refresh, verify clipboard cleared. Verify all toast notifications, visual indicators (selection highlight, cut dimming), and clipboard icon in status bar.
**Dependencies**: All frontend implementation complete (T010-T022)
**Success Criteria**: E2E test passes, complete workflow functional, visual indicators correct, sessionStorage cleared on refresh

---

### T028: Write E2E test for keyboard shortcuts
**File**: `frontend/tests/e2e/keyboardShortcuts.spec.ts`
**Description**: Write Playwright E2E test for all keyboard shortcuts per quickstart.md Scenario 7. Test all shortcuts: Ctrl+A (select all), Ctrl+X (cut), Ctrl+C (copy), Ctrl+V (paste), Ctrl+Z (undo), Ctrl+Shift+Z (redo), Ctrl+Y (redo alternate), Escape (clear selection), Delete (delete selected). Verify shortcuts only fire when focus on card tree (not during content editing). Test with 15+ cards per quickstart.md test data.
**Dependencies**: All frontend implementation complete (T010-T022)
**Success Criteria**: E2E test passes, all shortcuts functional, shortcuts disabled during content editing, correct focus detection

---

### T029: Write E2E test for performance validation
**File**: `frontend/tests/e2e/clipboardPerformance.spec.ts`
**Description**: Write Playwright E2E test for performance validation per quickstart.md Scenario 8. Test scenarios: (1) Create 100 test cards, Ctrl+A to select all, Ctrl+V to paste → completes in <2 seconds (FR-041), (2) Create 500 test cards, Ctrl+A to select all → UI responsive, selection completes in <100ms (FR-042), (3) Shift+click range selection with 50 cards → completes in <500ms. Use Playwright performance timing APIs to measure durations.
**Dependencies**: All frontend implementation complete (T010-T022)
**Success Criteria**: E2E test passes, 100 card paste <2s, 500 card selection <100ms, 50 card range selection <500ms, no UI lag detected

---

## Dependency Graph

```
Phase 1: Frontend Tests (T001-T009) [ALL PARALLEL]
    ↓
Phase 2: Contexts (T010-T012)
    T010 (CardSelectionContext) ← T001
    T011 (ClipboardContext) ← T002, T010
    T012 (UndoContext) ← T003, T011
    ↓
Phase 3: Hooks (T013-T016)
    T013 (useCardSelection) ← T004, T010
    T014 (useClipboard) ← T005, T011, T013
    T015 (useKeyboardShortcuts) ← T006, T013, T014
    T016 (useUndo) ← T007, T012, T014
    ↓
Phase 4: Components (T017-T022)
    T017 (CardTree extend) ← T013, T015
    T018 (CardContextMenu) ← T008, T013, T014
    T019 (SelectionIndicator) ← T009, T013, T014
    T020 (KeyboardShortcutHelp) ← T015
    T021 (ClipboardToasts) ← T011, T012
    T022 (PasteLoadingIndicator) ← T014
    ↓
Phase 5: Utils (T023-T024) [PARALLEL]
    T023 (clipboard.ts) [no dependencies]
    T024 (hierarchyValidation.ts) [no dependencies]
    ↓
Phase 6: Integration Tests (T025-T026)
    T025 (circular hierarchy) ← T017, T014, T023
    T026 (undo/redo stack) ← T017, T014, T016
    ↓
Phase 7: E2E Tests (T027-T029) [PARALLEL]
    T027 (complete workflow) ← T010-T022
    T028 (keyboard shortcuts) ← T010-T022
    T029 (performance) ← T010-T022
```

---

## Notes

- **Frontend-Only Feature**: No backend database changes required. All state managed in browser with sessionStorage.
- **Reuses Feature 003**: Extends existing CardTree component from Feature 003 card architecture.
- **React Context API**: Uses established pattern (AuthContext, CardContext, InformationLevelContext from CLAUDE.md).
- **Radix UI**: Reuses existing Radix UI Dropdown Menu from Features 004 and 008.
- **Session-Only Storage**: sessionStorage cleared on browser refresh (explicit requirement from spec Q1 clarification).
- **Performance Targets**: <100ms multi-select response, <2s paste for 100 cards, <500ms Shift+click range selection.
- **Scope Restriction**: Wiki cards only (Feature 003 architecture), NOT database cards (Features 014+).
- **Testing Strategy**: TDD workflow with unit tests → implementation → integration tests → E2E tests.
- **Maximum Parallelization**: Phase 1 can run 9 tasks in parallel, Phase 5 can run 2 tasks in parallel, Phase 7 can run 3 tasks in parallel.

---

## Success Criteria

- ✅ All 29 tasks completed
- ✅ All unit tests pass (49 test cases across T001-T009)
- ✅ All integration tests pass (8 test cases across T025-T026)
- ✅ All E2E tests pass (Scenarios 1, 7, 8 from quickstart.md)
- ✅ Multi-select with Ctrl+click, Shift+click, Ctrl+A functional
- ✅ Cut/copy/paste operations work correctly with visual indicators
- ✅ Undo/redo limited to 10 operations
- ✅ Circular hierarchy detection prevents invalid paste operations
- ✅ Cross-campaign paste blocked with error message
- ✅ sessionStorage cleared on browser refresh
- ✅ All keyboard shortcuts functional (Ctrl+X/C/V/A/Z, Shift+Z/Y, Escape, Delete)
- ✅ Context menu with Radix UI accessible and functional
- ✅ Performance targets met: 100 card paste <2s, 500 card selection <100ms, 50 card range <500ms
- ✅ Toast notifications for all operations
- ✅ Loading indicator for bulk paste >500ms
