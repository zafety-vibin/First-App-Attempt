# Feature Specification: Card Clipboard Operations

**Feature Branch**: `020-create-card-clipboard`
**Created**: 2025-10-10
**Status**: Draft
**Input**: User description: "Create card clipboard functionality for multi-selecting cards in the wiki tree and cutting/pasting them to move position while retaining their format. This feature applies to the OLD card architecture (notion-like tree) and should only be used for wiki functionality going forward, not the new database-centric architecture from Features 014+."

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature adds multi-select and clipboard operations (cut/copy/paste) for wiki card tree
2. Extract key concepts from description
   → Actors: Game Masters managing wiki cards
   → Actions: Select multiple cards, cut/copy cards, paste cards to new location
   → Data: Card tree hierarchy, card content (TipTap rich text), parent-child relationships
   → Constraints: Only applies to wiki cards (old architecture), not database cards (Features 014+)
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: Should clipboard persist across browser sessions/refreshes?]
   → [NEEDS CLARIFICATION: Can users copy/paste cards across different campaigns?]
   → [NEEDS CLARIFICATION: Should there be a paste preview or confirmation before moving cards?]
   → [NEEDS CLARIFICATION: What happens to cut cards if source card is deleted before paste?]
4. Fill User Scenarios & Testing section
   → Primary flow: Select cards → Cut/Copy → Navigate to destination → Paste
5. Generate Functional Requirements
   → Multi-selection, clipboard operations, hierarchy preservation, keyboard shortcuts, visual feedback
6. Identify Key Entities
   → ClipboardState (cut vs copy mode, selected card IDs)
7. Run Review Checklist
   → WARN "Spec has 4 uncertainties marked for clarification"
8. Return: SUCCESS (spec ready for clarification via /clarify)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
As a Game Master managing my campaign wiki, I need to reorganize multiple cards at once by selecting them, cutting or copying them, and pasting them into a new location in the card tree, so I can efficiently restructure my wiki content without manually moving cards one-by-one.

### Acceptance Scenarios

1. **Given** a wiki with multiple cards in a tree structure, **When** I Ctrl+click to select 3 cards and press Ctrl+X to cut them, **Then** the selected cards are visually marked as "cut" (dimmed/grayed) and stored in the clipboard

2. **Given** I have cut 3 cards to the clipboard, **When** I navigate to a different parent card and press Ctrl+V, **Then** the 3 cut cards are moved from their original location to become children of the paste destination, preserving their original content, hierarchy, and order

3. **Given** a wiki card tree, **When** I select a parent card containing nested children and press Ctrl+C to copy it, **Then** the parent card and all its descendants are copied to the clipboard (deep copy)

4. **Given** I have copied 2 cards to the clipboard, **When** I paste them into a new location, **Then** duplicate cards are created with the same content, and the original cards remain in their original location

5. **Given** I have selected 5 cards using Shift+click range selection, **When** I press Delete key, **Then** all 5 selected cards are deleted with a single confirmation prompt

6. **Given** I have cut cards to the clipboard, **When** I paste them and then press Ctrl+Z, **Then** the cards are moved back to their original location (undo operation)

### Edge Cases

- What happens when a user tries to paste a card into one of its own descendants (circular hierarchy)?
  - **Expected**: System prevents the paste operation and shows an error message "Cannot move card into its own descendant"

- What happens when cut cards are still in the clipboard and the user deletes the source cards before pasting?
  - **Expected**: System shows warning message but allows paste operation to proceed, with undo support to restore deleted parent cards if necessary

- What happens when a user selects cards across different campaigns?
  - **Expected**: System blocks cross-campaign paste with error message "Cannot paste cards from a different campaign"

- What happens when a user has cut cards in the clipboard, navigates away from the page, and returns?
  - **Expected**: Clipboard state is cleared on page refresh/navigation (session-only storage)

- What happens when a user tries to paste 100+ cards at once?
  - **Expected**: System should handle bulk paste operations without timeout or data loss

- What happens when a user selects a mix of wiki cards and database cards (Features 014+)?
  - **Expected**: System only allows selection of wiki cards; database cards are excluded from multi-select operations

## Requirements

### Functional Requirements

**Multi-Selection**
- **FR-001**: Users MUST be able to select multiple wiki cards using Ctrl+click (toggle individual card selection)
- **FR-002**: Users MUST be able to select a range of wiki cards using Shift+click (select all cards between first and last click)
- **FR-003**: Users MUST be able to select all visible wiki cards using Ctrl+A keyboard shortcut
- **FR-004**: System MUST visually indicate selected cards with a distinct highlight/background color
- **FR-005**: System MUST display a selection count indicator (e.g., "3 cards selected") when multiple cards are selected
- **FR-006**: Users MUST be able to deselect all cards by clicking on empty space or pressing Escape key

**Cut Operation**
- **FR-007**: Users MUST be able to cut selected cards using Ctrl+X keyboard shortcut or context menu
- **FR-008**: System MUST visually indicate cut cards with a dimmed/grayed appearance until paste or cancel operation
- **FR-009**: System MUST store cut card IDs and their original parent in clipboard state
- **FR-010**: System MUST clear previous clipboard contents when a new cut operation is performed
- **FR-011**: Users MUST be able to cancel a cut operation by pressing Escape key, restoring cards to normal appearance

**Copy Operation**
- **FR-012**: Users MUST be able to copy selected cards using Ctrl+C keyboard shortcut or context menu
- **FR-013**: System MUST copy the full card tree (parent and all descendants) when a parent card is copied
- **FR-014**: System MUST preserve all card content including rich text formatting, nested hierarchy, and metadata during copy
- **FR-015**: System MUST store copied card data in clipboard state without modifying original cards

**Paste Operation**
- **FR-016**: Users MUST be able to paste clipboard cards using Ctrl+V keyboard shortcut or context menu
- **FR-017**: System MUST paste cards as children of the currently selected destination card
- **FR-018**: System MUST preserve the original order of pasted cards (top-to-bottom selection order)
- **FR-019**: System MUST move cut cards from original location to paste destination (not duplicate)
- **FR-020**: System MUST create new duplicate cards with identical content when pasting copied cards
- **FR-021**: System MUST clear clipboard state after pasting cut cards (but not after pasting copied cards)
- **FR-022**: System MUST prevent pasting a card into its own descendants (circular hierarchy validation)
- **FR-023**: System MUST show an error message when paste operation is invalid (e.g., circular hierarchy, permissions)

**Keyboard Shortcuts**
- **FR-024**: System MUST support Ctrl+A (Select All), Ctrl+X (Cut), Ctrl+C (Copy), Ctrl+V (Paste), Escape (Deselect/Cancel), Delete (Delete Selected)
- **FR-025**: Keyboard shortcuts MUST only apply when focus is on the wiki card tree area (not when editing card content)

**Context Menu**
- **FR-026**: Users MUST be able to right-click on selected cards to open a context menu with Cut/Copy/Paste/Delete options
- **FR-027**: Context menu MUST disable invalid options (e.g., Paste is disabled when clipboard is empty)

**Undo/Redo**
- **FR-028**: Users MUST be able to undo clipboard operations (cut, paste, delete) using Ctrl+Z
- **FR-029**: Users MUST be able to redo undone operations using Ctrl+Shift+Z or Ctrl+Y
- **FR-030**: System MUST maintain an undo history of at least 10 clipboard operations per session

**Scope Restriction**
- **FR-031**: Clipboard operations MUST only apply to wiki cards using the old card architecture (Feature 003 card tree)
- **FR-032**: System MUST NOT allow clipboard operations on database cards from Features 014+ (database-centric architecture)
- **FR-033**: System MUST NOT allow mixing wiki cards and database cards in the same selection

**Clipboard State Management**
- **FR-034**: System MUST maintain clipboard state (cut/copy mode, card IDs, source parent) only during active user session and MUST clear clipboard state on page refresh/navigation (session-only storage)
- **FR-035**: System MUST clear clipboard state when user logs out or closes the campaign
- **FR-036**: System MUST block cross-campaign paste operations with error message "Cannot paste cards from a different campaign"
- **FR-037**: System MUST display warning message when user attempts to paste deleted cards, but MUST allow the paste operation to proceed with undo support to restore deleted parent cards if necessary

**Visual Feedback**
- **FR-038**: System MUST show a toast notification confirming successful clipboard operations (e.g., "3 cards cut", "2 cards pasted")
- **FR-039**: System MUST show loading indicator during paste operations that take longer than 500ms
- **FR-040**: System MUST highlight the paste destination card briefly after paste operation completes

**Performance**
- **FR-041**: System MUST complete paste operations for up to 100 cards within 2 seconds
- **FR-042**: System MUST handle multi-selection of up to 500 cards without UI lag

### Key Entities

- **ClipboardState**: Represents the current clipboard contents and operation mode
  - Operation type (cut or copy)
  - List of selected card IDs
  - Original parent card ID (for cut operations, to enable undo)
  - Timestamp of clipboard operation
  - Campaign ID (to validate cross-campaign paste operations)

- **CardSelection**: Represents the current multi-selection state in the UI
  - List of selected card IDs
  - Anchor card ID (first card clicked in Shift+click range selection)
  - Selection timestamp

- **UndoHistoryEntry**: Represents a single undoable clipboard operation
  - Operation type (cut, paste, delete)
  - Affected card IDs
  - Previous state (parent IDs, positions, content)
  - Timestamp

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all resolved)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (wiki cards only, not database cards)
- [x] Dependencies and assumptions identified (Feature 003 card tree architecture)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (4 clarifications needed)
- [x] Clarifications resolved (4/4 answered)
- [x] User scenarios defined
- [x] Requirements generated (42 functional requirements)
- [x] Entities identified (3 key entities)
- [x] Review checklist passed

---

## Clarifications

### Session 1: Initial Specification (2025-10-10)

**Q1: Should clipboard state persist across browser sessions/refreshes?**
- Context: User cuts 3 cards, refreshes browser. Should clipboard still contain those cards?
- Options: (a) Clear clipboard on refresh, (b) Persist to localStorage, (c) Persist to database
- Impact: Affects user workflow for long reorganization sessions
- **Answer: A** - Clear clipboard on refresh (session-only storage for simplicity)

**Q2: Can users copy/paste cards across different campaigns?**
- Context: User copies cards from Campaign A, switches to Campaign B, attempts paste
- Options: (a) Allow cross-campaign paste, (b) Block with error, (c) Clear clipboard on campaign switch
- Impact: Data isolation, potential for accidental cross-contamination
- **Answer: B** - Block with error message (cross-campaign paste is outside campaign root)

**Q3: Should there be a paste preview or confirmation before moving cards?**
- Context: User pastes 50 cards into wrong location
- Options: (a) No preview (instant paste), (b) Show preview panel with Confirm/Cancel buttons, (c) Only preview for bulk paste (10+ cards)
- Impact: User error prevention vs workflow speed
- **Answer: A** - No preview, instant paste with undo support for workflow speed

**Q4: What happens to cut cards if source card is deleted before paste?**
- Context: User cuts Card A, then deletes Card A's parent (cascading delete), then attempts paste
- Options: (a) Clear clipboard with error, (b) Paste still works as "restore" operation, (c) Show warning but allow paste
- Impact: Data recovery vs clipboard state consistency
- **Answer: C** - Show warning but allow paste operation, with undo support to restore deleted parents if necessary
