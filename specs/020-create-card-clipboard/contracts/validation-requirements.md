# Feature 020: Card Clipboard Operations - Validation Requirements

## Overview

This document specifies the NEW validation rules that clipboard operations require beyond existing Feature 003 validations. These validations are split between client-side (for UX) and server-side (for data integrity).

## 1. Circular Hierarchy Prevention (FR-022)

### Requirement
Prevent pasting a card into its own subtree, which would create a circular reference.

### Algorithm
```typescript
// Recursive ancestor traversal
function isDescendantOf(cardId: string, potentialAncestorId: string): boolean {
  let current = getCard(cardId);
  while (current.parent_id) {
    if (current.parent_id === potentialAncestorId) {
      return true;
    }
    current = getCard(current.parent_id);
  }
  return false;
}
```

### Implementation

#### Frontend Pre-check (CardTree component)
- When paste target is hovered, check if it's a descendant
- Visually disable (gray out) invalid paste targets
- Show tooltip: "Cannot paste here - this card is inside the selection"
- Prevent paste action entirely for invalid targets

#### Backend Enforcement (PATCH /cards/{id}/move)
- Before updating parent_id, traverse ancestors
- If new_parent_id appears in ancestor chain, return 422
- Error response:
```json
{
  "error": "Cannot move card into its own subtree",
  "details": "Card would become its own ancestor"
}
```

### Testing
- Attempt to paste parent into child
- Attempt to paste grandparent into grandchild
- Verify both frontend disable and backend rejection

## 2. Cross-Campaign Blocking (FR-036)

### Requirement
Prevent pasting cards from one campaign into another campaign.

### Algorithm
```typescript
// Compare campaign IDs
function canPasteHere(clipboardCampaignId: string, currentCampaignId: string): boolean {
  return clipboardCampaignId === currentCampaignId;
}
```

### Implementation

#### Frontend Check (ClipboardContext)
- Store `sourceCampaignId` in clipboard state
- When switching campaigns, check clipboard validity
- If campaigns don't match:
  - Show banner: "Clipboard contains cards from another campaign"
  - Disable paste action globally
  - Clear clipboard when switching campaigns (optional UX decision)

#### Backend Check (PATCH /cards/{id}/move)
- Verify source card's campaign_id matches destination card's campaign_id
- If root paste (new_parent_id = null), check against current user's campaign context
- Error response (400):
```json
{
  "error": "Cannot paste cards from different campaign",
  "details": "Cards can only be moved within the same campaign"
}
```

### Testing
- Copy card in Campaign A, switch to Campaign B, attempt paste
- Verify frontend banner and disabled paste
- Direct API call with mismatched campaigns should fail

## 3. Wiki Card Type Check (FR-031-033)

### Requirement
Clipboard operations only work with wiki cards (page, text, image). Database cards cannot be cut/copied/pasted.

### Algorithm
```typescript
// Filter during selection
function isWikiCard(card: Card): boolean {
  return ['page', 'text', 'image'].includes(card.type);
}
```

### Implementation

#### Frontend Filtering (CardTree selection)
- When multi-selecting with Shift+Click or Ctrl+Click:
  - Skip database cards in selection range
  - Show tooltip on database cards: "Database cards cannot be selected for clipboard operations"
- Paste menu item shows: "Paste (3 wiki cards)" to clarify

#### Backend Validation (PATCH /cards/{id}/move)
- Check card type before move
- If type === 'database', return 400
- Error response:
```json
{
  "error": "Cannot move database cards",
  "details": "Clipboard operations are only supported for wiki cards (page, text, image)"
}
```

### Testing
- Attempt to select database card with Ctrl+C
- Multi-select range including database cards (should skip them)
- Direct API call to move database card should fail

## 4. Deleted Card Handling (FR-037)

### Requirement
Handle gracefully when clipboard contains cards that were deleted after being copied.

### Algorithm
```typescript
// Check existence before paste
async function validateClipboard(cardIds: string[]): Promise<ValidationResult> {
  const existing = await Promise.all(cardIds.map(id => checkExists(id)));
  return {
    valid: existing.filter(e => e.exists),
    deleted: existing.filter(e => !e.exists),
    hasDeleted: existing.some(e => !e.exists)
  };
}
```

### Implementation

#### Frontend Validation (Pre-paste check)
- Before showing paste option, check if clipboard cards still exist
- If some deleted:
  - Show warning dialog: "Some copied cards were deleted. Paste will only include existing cards."
  - Proceed with paste for existing cards only
- If all deleted:
  - Show error: "All copied cards have been deleted"
  - Clear clipboard

#### Backend Handling (PATCH /cards/{id}/move)
- 404 response is expected and handled gracefully
- Frontend continues with next card in batch
- No special backend changes needed

### Testing
- Copy cards, delete one, attempt paste
- Copy cards, delete all, attempt paste
- Verify warning messages and partial paste success

## 5. Batch Operation Atomicity

### Requirement
Multi-card operations should be atomic where possible, but gracefully handle partial failures.

### Implementation

#### Frontend Batch Logic
```typescript
async function pasteMultiple(cardIds: string[], destination: string) {
  const results = [];
  const failed = [];

  for (const cardId of cardIds) {
    try {
      const result = await moveCard(cardId, destination);
      results.push(result);
    } catch (error) {
      failed.push({ cardId, error });
      // Continue with remaining cards
    }
  }

  if (failed.length > 0) {
    showWarning(`Pasted ${results.length} cards. ${failed.length} failed.`);
  }

  return { succeeded: results, failed };
}
```

#### Backend Considerations
- Each move is independent transaction
- No rollback of successful moves if one fails
- Return appropriate error for each failed operation

### Testing
- Paste multiple cards where one would violate depth limit
- Paste multiple cards where one is deleted
- Verify partial success handling

## Validation Response Codes Summary

| Validation | HTTP Code | Error Message | When |
|------------|-----------|---------------|------|
| Circular hierarchy | 422 | "Cannot move card into its own subtree" | Destination is descendant |
| Cross-campaign | 400 | "Cannot paste cards from different campaign" | Campaign IDs don't match |
| Database card type | 400 | "Cannot move database cards" | Card type is 'database' |
| Card not found | 404 | "Card not found" | Card was deleted |
| Depth exceeded | 422 | "Maximum nesting depth exceeded (50 levels)" | Would exceed 50 levels |

## Performance Considerations

### Frontend
- Subtree validation should use cached data when possible
- Debounce hover checks during drag operations
- Batch API calls with Promise.all when checking multiple cards

### Backend
- Existing indexes on parent_id and path columns sufficient
- Circular check is O(depth) ≤ O(50) = constant time
- Campaign check is O(1) lookup

## Security Notes

- All validations MUST be enforced server-side
- Frontend validations are for UX only
- Never trust client-side campaign_id claims
- Use authenticated user's campaign context for root-level pastes