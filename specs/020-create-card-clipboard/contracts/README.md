# Feature 020: Card Clipboard Operations - Contracts Documentation

## Overview

Feature 020 implements clipboard operations (cut/copy/paste) for wiki cards. This feature is unique in that it requires **NO NEW BACKEND ENDPOINTS**. All clipboard functionality is achieved through client-side state management and existing Feature 003 card manipulation endpoints.

## Why No New Endpoints?

The clipboard is fundamentally a client-side concept:

1. **Clipboard State** - The list of copied/cut cards is maintained in browser memory (React Context)
2. **Cut/Copy** - Simply updating client state, no server communication needed
3. **Paste** - Uses existing `PATCH /cards/{id}/move` endpoint from Feature 003
4. **Delete** - Uses existing `DELETE /cards/{id}` endpoint from Feature 003

This approach provides several benefits:
- No server-side clipboard state to manage or clean up
- No session-specific clipboard storage needed
- Works seamlessly with existing permissions model
- Reduces API surface area and complexity

## How Clipboard Leverages Existing APIs

### Copy Operation (Ctrl+C)
1. User selects cards in UI
2. Frontend stores card IDs in ClipboardContext
3. No API call needed

### Cut Operation (Ctrl+X)
1. User selects cards in UI
2. Frontend stores card IDs in ClipboardContext with `isCut: true` flag
3. Frontend visually indicates "cut" state (opacity: 0.5)
4. No API call needed

### Paste Operation (Ctrl+V)
1. User triggers paste at destination
2. Frontend calls existing endpoint for each card:
   ```
   PATCH /api/cards/{id}/move
   {
     "new_parent_id": "destination-card-id",
     "position": 0
   }
   ```
3. If cut operation, remove visual indicator after successful move
4. Clear clipboard after successful paste

### Multi-Select Delete (Delete key)
1. User selects multiple cards
2. Frontend calls existing endpoint for each card:
   ```
   DELETE /api/cards/{id}
   ```
3. Sequential calls, continue even if some fail

## Client-Side vs Server-Side Validation

### Client-Side (Frontend) Validations
**Purpose**: Immediate UX feedback, prevent invalid operations

- **Selection Filtering**: Skip database cards during multi-select
- **Paste Target Validation**: Disable invalid paste targets (descendants, cross-campaign)
- **Visual Indicators**: Gray out invalid destinations during drag
- **Clipboard Staleness**: Check if copied cards still exist before paste
- **Campaign Context**: Clear clipboard when switching campaigns

### Server-Side (Backend) Validations
**Purpose**: Data integrity, security, authoritative validation

- **Circular Hierarchy Check**: Prevent card becoming its own ancestor
- **Campaign Boundary**: Ensure cards stay within same campaign
- **Card Type Validation**: Reject database card moves
- **Permission Checks**: Existing Feature 002 auth validations
- **Depth Limit**: Existing 50-level nesting limit

## Testing Strategy

### Frontend Testing (Primary Focus)

Since clipboard logic is client-side, most testing happens in the frontend:

```typescript
// Frontend unit tests (Vitest + React Testing Library)
describe('ClipboardContext', () => {
  test('stores multiple card IDs on copy');
  test('marks cards as cut vs copied');
  test('clears clipboard after paste');
  test('validates paste targets');
  test('handles cross-campaign blocking');
});

describe('CardTree clipboard integration', () => {
  test('multi-select with Shift+Click');
  test('copy/paste with keyboard shortcuts');
  test('visual feedback for cut cards');
  test('disabled paste targets');
});

// E2E tests (Playwright)
test('Complete clipboard workflow', async () => {
  // Select multiple cards
  // Copy with Ctrl+C
  // Navigate to different location
  // Paste with Ctrl+V
  // Verify cards moved
});
```

### Backend Testing (Regression Only)

Since we're using existing endpoints, we only need regression tests:

```typescript
// Regression tests for enhanced validations
describe('PATCH /cards/{id}/move - clipboard validations', () => {
  test('rejects circular hierarchy move');
  test('rejects cross-campaign move');
  test('rejects database card move');
});
```

## Implementation Checklist

### Frontend Components
- [ ] ClipboardContext (React Context for state management)
- [ ] useClipboard hook (clipboard operations)
- [ ] CardTree enhancements (selection, shortcuts)
- [ ] CardContextMenu (cut/copy/paste menu items)
- [ ] PasteIndicator (visual feedback during paste)

### Backend Enhancements
- [ ] Strengthen circular hierarchy validation in move endpoint
- [ ] Add cross-campaign validation in move endpoint
- [ ] Add card type validation in move endpoint

### Testing
- [ ] Frontend unit tests (ClipboardContext, hooks)
- [ ] Frontend integration tests (CardTree + clipboard)
- [ ] E2E tests (complete workflows)
- [ ] Backend regression tests (validation rules)

## Performance Considerations

### Multi-Card Operations
- Use `Promise.all` for parallel operations where possible
- Show progress indicator for large batches
- Implement optimistic UI updates

### Validation Caching
- Cache subtree data to avoid repeated API calls
- Debounce validation checks during drag operations
- Pre-validate on clipboard fill, not just on paste

## Security Considerations

1. **No Server Clipboard State** - Prevents data leaks between sessions
2. **Campaign Isolation** - Enforced by backend, prevents cross-campaign data movement
3. **Permission Checks** - Existing Feature 002 auth applies to all operations
4. **Client Validation is UX Only** - Server always re-validates

## Migration Path

For future server-side clipboard (if needed):

1. Add `clipboard` table with user_id, card_ids, operation_type
2. Add `/api/clipboard` endpoints for CRUD
3. Add TTL/expiration for clipboard entries
4. Keep client-side clipboard as fallback

Currently, client-side approach is sufficient for single-user prototype.

## Related Documentation

- [Feature 003 Cards API](../../../003-create-a-notion/contracts/cards.yaml) - Base endpoints
- [Validation Requirements](./validation-requirements.md) - Detailed validation rules
- [Existing Endpoints](./existing-endpoints.yaml) - Endpoints used by clipboard