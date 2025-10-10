# Feature 020: Card Clipboard Operations - Quickstart & E2E Test Guide

This guide provides step-by-step test scenarios for validating the complete clipboard workflow. Each scenario includes specific verification points to ensure all functionality works as expected.

## Prerequisites

Before starting, ensure:
- Docker is running: `docker-compose up`
- User is registered and can login via Keycloak
- At least one test campaign exists with:
  - Minimum 15 wiki cards created (Feature 003)
  - Nested hierarchy (at least 3 levels deep)
  - Mix of cards with and without children

## Test Data Setup

Create the following card structure for testing:
```
Campaign Root
├── Card A (has 2 children)
│   ├── Card A1
│   └── Card A2
├── Card B (no children)
├── Card C (has 1 child)
│   └── Card C1
├── Card D (destination for paste)
├── Card E (has nested children)
│   ├── Card E1
│   │   └── Card E2
│   └── Card E3
├── Card F (alternate destination)
├── Card G (range selection start)
├── Card H
├── Card I
├── Card J
├── Card K (range selection end)
└── Card X (for deletion test)
    └── Card X1
```

---

## Scenario 1: Multi-Select and Cut/Paste Operations

### Steps:
1. **Login & Navigation**
   ```
   - Navigate to http://localhost:3000
   - Login with test credentials
   - Open test campaign
   - Navigate to Wiki Cards view
   ```
   ✓ Verify: Card tree visible with test structure

2. **Multi-Select Cards**
   ```
   - Hold Ctrl key
   - Click on Card A
   - While holding Ctrl, click Card B
   - While holding Ctrl, click Card C
   ```
   ✓ Verify:
   - Each clicked card shows blue highlight (selected state)
   - Selection indicator shows "3 cards selected"
   - Non-selected cards remain unhighlighted

3. **Cut Operation**
   ```
   - With 3 cards selected, press Ctrl+X
   ```
   ✓ Verify:
   - Selected cards appear dimmed (opacity ~0.5)
   - Toast notification: "3 cards cut to clipboard"
   - Status bar shows clipboard icon with badge "3"
   - Cards remain in tree but visually indicate "cut" state

4. **Navigate to Destination**
   ```
   - Click on Card D to select it as destination
   ```
   ✓ Verify: Card D is now selected (single selection)

5. **Paste Operation**
   ```
   - Press Ctrl+V
   ```
   ✓ Verify:
   - Cards A, B, C moved under Card D
   - Original hierarchy preserved (A still has A1, A2 as children)
   - Toast: "3 cards pasted successfully"
   - Dimmed state cleared from moved cards
   - Clipboard icon disappears from status bar

6. **Verify Persistence**
   ```
   - Press F5 to refresh browser
   - Navigate back to Wiki Cards view
   ```
   ✓ Verify: Cards A, B, C still appear under Card D

---

## Scenario 2: Copy Operation with Nested Children

### Steps:
1. **Select Parent with Children**
   ```
   - Single click on Card E (has E1, E2, E3 as nested children)
   ```
   ✓ Verify: Only Card E highlighted (children not selected)

2. **Copy Operation**
   ```
   - Press Ctrl+C
   ```
   ✓ Verify:
   - Toast: "1 card copied to clipboard"
   - Status bar shows clipboard icon with badge "1"
   - No dimming effect (copy doesn't dim)

3. **Navigate and Paste**
   ```
   - Click on Card F as destination
   - Press Ctrl+V
   ```
   ✓ Verify:
   - New "Card E (Copy)" created under Card F
   - All children (E1, E2, E3) duplicated with same hierarchy
   - Original Card E remains in original location
   - Toast: "1 card pasted successfully"

4. **Test Multiple Paste**
   ```
   - Click on Card D
   - Press Ctrl+V again
   ```
   ✓ Verify:
   - Another copy created under Card D
   - Clipboard remains active (copy persists until new operation)

---

## Scenario 3: Shift+Click Range Selection

### Steps:
1. **Set Anchor Point**
   ```
   - Single click on Card G
   ```
   ✓ Verify: Card G highlighted

2. **Range Select**
   ```
   - Hold Shift key
   - Click on Card K
   ```
   ✓ Verify:
   - Cards G, H, I, J, K all highlighted
   - Selection indicator: "5 cards selected"

3. **Delete Operation**
   ```
   - Press Delete key
   ```
   ✓ Verify:
   - Confirmation dialog: "Delete 5 cards? This action cannot be undone for cards with children."
   - Dialog shows list of cards to be deleted

4. **Confirm Deletion**
   ```
   - Click "Delete" in confirmation dialog
   ```
   ✓ Verify:
   - All 5 cards removed from tree
   - Toast: "5 cards deleted"
   - Tree re-renders without deleted cards

---

## Scenario 4: Undo/Redo Operations

### Steps:
1. **Perform Initial Operation**
   ```
   - Select Card B
   - Press Ctrl+X (cut)
   - Select Card F
   - Press Ctrl+V (paste)
   ```
   ✓ Verify: Card B moved to Card F

2. **Undo Operation**
   ```
   - Press Ctrl+Z
   ```
   ✓ Verify:
   - Card B moved back to original location
   - Toast: "Undo: Move cards"
   - Undo stack shows in developer tools

3. **Redo Operation**
   ```
   - Press Ctrl+Shift+Z (or Ctrl+Y)
   ```
   ✓ Verify:
   - Card B moved back to Card F
   - Toast: "Redo: Move cards"

4. **Test Undo Limit**
   ```
   - Perform 12 different cut/paste operations
   - Press Ctrl+Z 11 times
   ```
   ✓ Verify:
   - Only last 10 operations can be undone
   - 11th Ctrl+Z does nothing (oldest operations discarded)

---

## Scenario 5: Edge Cases & Error Handling

### Test 5.1: Circular Hierarchy Prevention
```
1. Select Card A (parent)
2. Press Ctrl+X
3. Select Card A1 (child of A)
4. Press Ctrl+V
```
✓ Verify:
- Error toast: "Cannot move a card into its own descendant"
- Operation cancelled, no changes made

### Test 5.2: Cross-Campaign Paste Attempt
```
1. In Campaign 1: Select and copy Card A (Ctrl+C)
2. Navigate to Campaign 2
3. Attempt paste (Ctrl+V)
```
✓ Verify:
- Error toast: "Cannot paste cards from a different campaign"
- Clipboard cleared when switching campaigns

### Test 5.3: Session Persistence
```
1. Select and cut Card B (Ctrl+X)
2. Refresh browser (F5)
3. Check tree state
```
✓ Verify:
- No cards appear dimmed
- Clipboard empty (status bar shows no clipboard icon)
- Cards remain in original positions

### Test 5.4: Deleted Parent Handling
```
1. Cut Card X1 (child of X)
2. Delete Card X (parent)
3. Attempt to paste Card X1 elsewhere
```
✓ Verify:
- Warning: "Parent card was deleted. Card will be pasted at root level."
- Paste succeeds with Card X1 at campaign root
- Undo available to revert

---

## Scenario 6: Context Menu Operations

### Steps:
1. **Open Context Menu**
   ```
   - Select Card A and Card B (multi-select)
   - Right-click on selection
   ```
   ✓ Verify context menu shows:
   - Cut (Ctrl+X)
   - Copy (Ctrl+C)
   - Paste (Ctrl+V) - disabled if clipboard empty
   - Delete (Del)
   - Separator line
   - Select All (Ctrl+A)

2. **Test Menu Operations**
   ```
   - Click "Copy" in context menu
   ```
   ✓ Verify: Same behavior as Ctrl+C

3. **Test Disabled State**
   ```
   - Clear selection (press Escape)
   - Right-click in empty space
   ```
   ✓ Verify: Paste option disabled when clipboard empty

---

## Scenario 7: Keyboard Shortcuts Complete Test

### Test All Shortcuts:
| Shortcut | Action | Verification |
|----------|--------|--------------|
| Ctrl+A | Select all visible cards | All cards in current view highlighted |
| Ctrl+X | Cut selected | Selected cards dimmed, clipboard active |
| Ctrl+C | Copy selected | Clipboard active, no dimming |
| Ctrl+V | Paste | Cards inserted at selected location |
| Ctrl+Z | Undo | Last operation reversed |
| Ctrl+Shift+Z | Redo | Undone operation reapplied |
| Escape | Clear selection/Cancel cut | All selections cleared, cut cancelled |
| Delete | Delete selected | Confirmation dialog, then deletion |

---

## Performance Validation

### Test 8.1: Large Selection Performance
```
1. Create 100 test cards under a parent
2. Press Ctrl+A to select all
3. Press Ctrl+X to cut
4. Select destination
5. Press Ctrl+V to paste
```
✓ Verify:
- Paste completes in <2 seconds (FR-041)
- UI remains responsive during operation
- Progress indicator shown if >1 second

### Test 8.2: Maximum Selection Stress Test
```
1. Create 500 test cards
2. Press Ctrl+A to select all
3. Observe UI responsiveness
```
✓ Verify:
- No UI lag or freezing (FR-042)
- Selection completes in <100ms
- Scrolling remains smooth

---

## Success Criteria Checklist

### Core Functionality
- [ ] Multi-select with Ctrl+Click works
- [ ] Range select with Shift+Click works
- [ ] Cut/Copy/Paste operations complete successfully
- [ ] Visual indicators (dimming, selection highlight) display correctly
- [ ] Toast notifications appear for all operations
- [ ] Status bar clipboard indicator updates correctly

### Data Integrity
- [ ] Hierarchy preserved during move operations
- [ ] Copy creates proper duplicates with new IDs
- [ ] Circular hierarchy prevented
- [ ] Cross-campaign paste blocked
- [ ] Database consistency maintained after operations

### User Experience
- [ ] All keyboard shortcuts functional
- [ ] Context menu accessible and accurate
- [ ] Undo/Redo works for last 10 operations
- [ ] Selection cleared appropriately with Escape
- [ ] Error messages clear and actionable

### Performance
- [ ] 100 card paste <2 seconds
- [ ] 500 card selection without UI lag
- [ ] Selection response <100ms
- [ ] No memory leaks during extended use

---

## Troubleshooting

### Common Issues:

**Issue**: Clipboard not persisting
- Check: Browser local storage enabled
- Check: No security software blocking storage

**Issue**: Shortcuts not working
- Check: Focus is on card tree area
- Check: No modal dialogs open
- Check: Correct key combinations for OS

**Issue**: Performance degradation
- Check: Browser console for errors
- Check: Network tab for failed requests
- Check: Memory usage in browser dev tools

**Issue**: Visual indicators not showing
- Check: CSS loaded correctly
- Check: No browser extensions interfering
- Check: React DevTools for state updates

---

## Quick Test Run

For rapid validation, run this abbreviated test:
1. Login and open campaign
2. Multi-select 3 cards (Ctrl+Click)
3. Cut (Ctrl+X) - verify dimming
4. Paste (Ctrl+V) - verify move
5. Undo (Ctrl+Z) - verify revert
6. Copy different card (Ctrl+C)
7. Paste twice - verify duplicates
8. Select all (Ctrl+A)
9. Escape to clear selection
10. Refresh and verify persistence

Time: ~5 minutes

---

## Next Steps

After completing these scenarios:
1. Document any issues found
2. Verify database integrity with SQL queries
3. Test with different information levels (Feature 004)
4. Test interaction with other features (AI operations, etc.)
5. Performance profile with Chrome DevTools

## Related Documentation

- Feature Specification: `/specs/020-create-card-clipboard/spec.md`
- API Contracts: `/specs/020-create-card-clipboard/contracts/`
- Implementation Notes: `/specs/020-create-card-clipboard/IMPLEMENTATION_NOTES.md`