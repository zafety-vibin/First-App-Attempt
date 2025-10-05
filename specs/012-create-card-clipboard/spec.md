# Feature Specification: Card Clipboard Operations

**Feature Branch**: `012-create-card-clipboard`
**Created**: 2025-10-04
**Status**: Draft
**Input**: User description: "Create card clipboard operations (cut/copy/paste) for the card tree UI. Allow users to cut/copy entire cards with their children and paste them to new parent locations. Support keyboard shortcuts (Ctrl+X/C/V) and right-click context menu. Backend: Use existing move_card API for cut/paste, add new copy_card endpoint for recursive duplication with new IDs. Frontend: Add context menu to CardTree component with clipboard state management. Visual feedback shows which card is in clipboard (cut vs copy) and paste preview on hover. This solves the problem where AI creates cards in wrong locations and users need easy reorganization without losing card structure or children."

## Execution Flow (main)
```
1. Parse user description from Input
   → SUCCESS: Feature is about card reorganization via clipboard operations
2. Extract key concepts from description
   → Actors: Game Masters (users)
   → Actions: cut, copy, paste cards with children
   → Data: campaign cards, card hierarchy
   → Constraints: preserve children, visual feedback required
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: What happens if user tries to paste card into its own descendant?]
   → [NEEDS CLARIFICATION: Should copy operation duplicate ALL descendants or have depth limit?]
   → [NEEDS CLARIFICATION: Can multiple cards be selected for clipboard operations?]
4. Fill User Scenarios & Testing section
   → SUCCESS: Clear user flow for reorganizing misplaced cards
5. Generate Functional Requirements
   → SUCCESS: All requirements are testable
6. Identify Key Entities
   → Card, CardClipboard (state)
7. Run Review Checklist
   → WARN "Spec has uncertainties - 3 clarification markers present"
8. Return: SUCCESS (spec ready for planning after clarifications)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a Game Master organizing my D&D campaign, I need to quickly reorganize cards that were created in the wrong location (e.g., by AI import or manual mistake). I want familiar clipboard operations (cut/copy/paste) so I can move or duplicate entire cards with all their nested children to new parent locations without losing any content or structure.

**Problem Statement**: When AI tools create campaign cards in incorrect locations, users currently have no easy way to relocate entire card hierarchies. Manual recreation is time-consuming and error-prone.

### Acceptance Scenarios
1. **Given** a card "Tavern NPCs" with 5 child NPC cards was mistakenly created under "Plot Threads", **When** user right-clicks "Tavern NPCs" and selects Cut, then right-clicks "Locations > Waterdeep" and selects Paste, **Then** the entire "Tavern NPCs" card with all 5 children moves to the new location without losing any content.

2. **Given** user wants to reuse a "Combat Encounter Template" card in multiple locations, **When** user right-clicks the template and selects Copy, then pastes it under 3 different session planning cards, **Then** 3 independent duplicate cards are created, each with all template content and child cards.

3. **Given** user has cut a card to clipboard, **When** user views the card tree, **Then** the cut card appears with visual indication (e.g., dimmed/grayed) and other cards show paste preview on hover over valid drop targets.

4. **Given** user presses Ctrl+X on selected card, **When** user navigates to different parent and presses Ctrl+V, **Then** card moves to new location (same as right-click menu).

### Edge Cases
- What happens when user tries to paste a card as a child of itself or its own descendants? [NEEDS CLARIFICATION: Should system prevent this with error message or disable paste option?]
- How does system handle copying a card with 100+ nested descendants? [NEEDS CLARIFICATION: Should there be depth limit or warning for large operations?]
- What happens if user cuts a card but closes browser before pasting? [NEEDS CLARIFICATION: Should clipboard persist across sessions or clear on page reload?]
- Can user select multiple cards at once for clipboard operations? [NEEDS CLARIFICATION: Single card only or multi-select support needed?]

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST allow users to cut a card, removing it from current location and placing it in clipboard
- **FR-002**: System MUST allow users to copy a card, creating a duplicate in clipboard while preserving original
- **FR-003**: System MUST allow users to paste clipboard card as child of a selected parent card
- **FR-004**: System MUST preserve ALL child cards and nested descendants when cutting or copying a card
- **FR-005**: System MUST support keyboard shortcuts: Ctrl+X (cut), Ctrl+C (copy), Ctrl+V (paste), Cmd+X/C/V on Mac
- **FR-006**: System MUST provide right-click context menu with Cut, Copy, Paste options on any card
- **FR-007**: System MUST visually indicate when a card is in clipboard (cut vs copy state)
- **FR-008**: System MUST show paste preview when hovering over potential parent cards with clipboard active
- **FR-009**: System MUST prevent circular references (cannot paste card into its own descendants)
- **FR-010**: Cut operation MUST move card to new location (not duplicate)
- **FR-011**: Copy operation MUST create new card with unique ID and duplicate all descendants with new IDs
- **FR-012**: Paste operation MUST place card at the end of target parent's children list by default
- **FR-013**: System MUST clear clipboard after successful paste operation
- **FR-014**: System MUST disable paste option when no valid target is selected or clipboard is empty
- **FR-015**: System MUST handle campaign permission filtering (users can only cut/copy/paste cards they own)

### Key Entities
- **Card**: Campaign content unit with title, content, card type, and optional parent (existing entity)
- **CardClipboard**: Temporary state holding card reference, operation type (cut/copy), and timestamp
- **Card Hierarchy**: Parent-child relationships between cards that must be preserved during clipboard operations

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (3 clarifications needed)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (3 clarifications needed)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (pending clarifications)

---
