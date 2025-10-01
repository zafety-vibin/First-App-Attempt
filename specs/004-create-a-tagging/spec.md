# Feature Specification: Information Level-Based Filtering System

**Feature Branch**: `004-create-a-tagging`
**Created**: 2025-10-01
**Status**: Clarified
**Input**: User description: "Create an information level-based filtering system where cards can be assigned visibility tiers. System (default tier for most content like navigation, sections, wiki structure), Common Knowledge (in-world information available to NPCs/AI contexts), Player Knowledge (previously secret information now revealed), and DM Secret (hierarchical restriction, always hidden from non-DMs). Users can create custom information levels. Two view modes: DM View (shows everything) and Player/General View (hides DM Secrets). Restricted cards are completely hidden (not rendered), no visual censorship."

---

## Clarifications

### Session 2025-10-01

- Q: Should custom information levels be allowed to be hierarchical (restrict visibility like DM Secret)? → A: Yes, users can optionally mark custom levels as hierarchical
- Q: How should DM Secret cards be visually indicated in DM View? → A: Light tint/shade on card background with closed eye icon (🔒 or 👁️‍🗨️)
- Q: What UI mechanism should toggle between DM View and Player/General View? → A: Vertical 3-dot menu (⋮) in top-right toolbar with dropdown options
- Q: How should users assign information levels to cards? → A: Hybrid approach - painter's easel palette for default level selection + inline properties panel + context menu for existing cards
- Q: Can a card have multiple information levels simultaneously? → A: No, ONE information level per card (simpler logic)
- Q: Where should users create new custom information levels? → A: Settings → Information Levels page accessed via "+" button in painter's easel palette
- Q: What happens to cards when a custom information level is deleted? → A: Cards revert to System level with warning message that secrets may be exposed
- Q: How should bulk information level operations work? → A: Select multiple cards in database view → toolbar actions for "Add Level"/"Change Level"
- Q: Does Import AI (feature 005) have restrictions on writing to DM Secret cards? → A: No restrictions, Import AI is DM-only tool with full access to all levels including secrets
- Q: Does Planning AI (feature 005) have access to DM Secret content? → A: Yes, full READ access to all levels including secrets (DM tool), but user specifies if output must be player-safe
- Q: How should "viewing cards by information level" work? → A: Database filters and search filters sufficient, no dedicated page needed
- Q: How do databases handle information level assignments? → A: Entry-level (entire row) + column-level hierarchical flags + special "Player Knowledge" text field for partial visibility
- Q: When all child cards are hidden in Player/General View, what happens to parent? → A: If parent is pure container (no title/metadata), hide entirely; if parent has content, show parent with empty children section
- Q: Should there be differentiation between "information levels" and "tags"? → A: Yes, "Information Levels" control visibility/AI access (this feature), "tags" are generic labels for organization (separate concept)

---

## User Scenarios & Testing

### Primary User Story
A Game Master is building their campaign wiki with various content types. They create a "Waterdeep" city page with general description (System level, default), add a "Council of Lords" section assigned as Common Knowledge (in-world information for AI contexts), include a "Secret Meeting Location" section assigned as DM Secret, and mark a "Red Sashes Gang" section as Player Knowledge after the party discovers it in session 3. When viewing in DM View, they see all content. When switching to Player/General View to preview what players will see, the "Secret Meeting Location" section doesn't render at all. The Player Portal AI can reference Common Knowledge and Player Knowledge content but not System-tier meta information or DM Secrets. This information level system gives complete control over what's visible in the wiki, what's available to AI contexts, and what's restricted to DM-only viewing.

### Acceptance Scenarios
1. **Given** I am creating a new card, **When** the card is created, **Then** it is automatically assigned the System level (default)
2. **Given** I have a card with System level, **When** I view it in DM View, **Then** I see the full card content
3. **Given** I have a card with System level, **When** I view it in Player/General View, **Then** I see the full card content (System is not restricted)
4. **Given** I have a card assigned as Common Knowledge, **When** the Player Portal AI processes a query, **Then** that card's content is included in the AI context
5. **Given** I have a card assigned as DM Secret, **When** I view it in Player/General View, **Then** the card does not render at all (completely hidden)
6. **Given** I have a card assigned as DM Secret, **When** I view it in DM View, **Then** I see the full card content with light tint and closed eye icon indicator
7. **Given** I have a card assigned as Player Knowledge, **When** the Player Portal AI processes a query, **Then** that card's content is included in the AI context
8. **Given** I am viewing any card, **When** I change the information level assignment, **Then** the visibility immediately updates based on current view mode
9. **Given** I want to create a custom information level, **When** I define a new level in Settings, **Then** I can assign it to cards and optionally mark it as hierarchical
10. **Given** I have deleted a custom information level, **When** cards were assigned to it, **Then** those cards revert to System level with warning displayed

### Edge Cases
- When a card assigned DM Secret is viewed in Player/General View → Card does not render at all (hierarchical precedence)
- When a user tries to view a campaign in Player/General View with no non-secret content → Empty campaign view displayed (no errors)
- When AI contexts need to reference a card that was recently changed from Common Knowledge to DM Secret → AI context no longer includes that card (immediate filtering)
- When nested cards have different information levels (parent is System, child is DM Secret) → Parent visible in Player View, child hidden
- When parent card is pure container with all children hidden → Parent hidden entirely in Player View if no title/metadata, shown empty if has metadata

## Requirements

### Functional Requirements

#### Terminology
- **Information Levels** (this feature): Visibility/AI access control tiers (System, Common Knowledge, Player Knowledge, DM Secret, custom levels). ONE per card.
- **Tags** (separate concept): Generic labels for organization/filtering (e.g., "Waterdeep", "Session 3"). Many per card. Not part of this feature scope.

#### Information Level System Architecture
- **FR-001**: System MUST provide four default information levels: System, Common Knowledge, Player Knowledge, and DM Secret
- **FR-002**: System level MUST be the default level assigned to all newly created cards
- **FR-003**: System level MUST be intended for most content including navigation, meta information, and wiki structure
- **FR-004**: System level content MUST be visible in both DM View and Player/General View
- **FR-005**: System level content MUST be excluded from Player Portal AI contexts (meta/structural information, not in-world)
- **FR-006**: Common Knowledge level MUST indicate in-world information available to NPCs and AI contexts
- **FR-007**: Common Knowledge content MUST be included in Player Portal AI contexts
- **FR-008**: Common Knowledge content MUST be visible in both DM View and Player/General View
- **FR-009**: Player Knowledge level MUST indicate previously secret information that has been revealed to players OR non-common knowledge information the players know
- **FR-010**: Player Knowledge content MUST be included in Player Portal AI contexts
- **FR-011**: Player Knowledge content MUST be visible in both DM View and Player/General View
- **FR-012**: DM Secret level MUST be the only default hierarchical information level that restricts visibility
- **FR-013**: DM Secret content MUST be visible only in DM View
- **FR-014**: DM Secret content MUST be completely hidden (not rendered) in Player/General View
- **FR-015**: DM Secret content MUST be excluded from Player Portal AI context (feature 009)
- **FR-016**: DM Secret content MUST be accessible to Import AI (feature 005) and Planning AI (feature 005) as they are DM-only tools
- **FR-017**: Users MUST be able to create custom information levels with user-defined names
- **FR-018**: Users MUST be able to optionally mark custom information levels as hierarchical (restricts visibility like DM Secret)
- **FR-019**: Cards MUST have exactly ONE information level assigned at any time
- **FR-020**: System MUST apply hierarchical restriction when a card's assigned level is hierarchical, hiding card in Player/General View

#### View Modes
- **FR-021**: System MUST provide two view modes: DM View and Player/General View
- **FR-022**: DM View MUST display all content regardless of information level assignments
- **FR-023**: DM View MUST visually indicate which cards are assigned DM Secret level with light tint/shade and closed eye icon (🔒 or 👁️‍🗨️) in top-right corner
- **FR-024**: Player/General View MUST hide all cards assigned hierarchical information levels (DM Secret or custom hierarchical levels)
- **FR-025**: Player/General View MUST display all non-hierarchical content (System, Common Knowledge, Player Knowledge, non-hierarchical custom levels)
- **FR-026**: Users MUST be able to toggle between DM View and Player/General View via vertical 3-dot menu (⋮) in top-right toolbar with dropdown options
- **FR-027**: System MUST persist the user's last selected view mode across sessions
- **FR-028**: System MUST apply view mode filtering to all card types (pages, databases, text, images, etc.)
- **FR-029**: System MUST apply view mode filtering to nested cards (child cards respect their own information levels)

#### Information Level Management Interface
- **FR-030**: Users MUST be able to assign information levels to cards through painter's easel palette (sets default for new cards) + inline properties panel + context menu (for existing cards)
- **FR-031**: Painter's easel palette MUST display current selected information level and apply it to newly created cards
- **FR-032**: Users MUST be able to change a card's assigned information level via properties panel or context menu
- **FR-033**: Users MUST be able to create new custom information levels via "+" button in painter's easel palette, which navigates to Settings → Information Levels page
- **FR-034**: Information Levels settings page MUST allow users to define: name, description/intent, color (for palette icon), hierarchical flag (checkbox)
- **FR-035**: Users MUST be able to rename custom information levels
- **FR-036**: Users MUST be able to delete custom information levels
- **FR-037**: When a custom information level is deleted, cards assigned to it MUST revert to System level
- **FR-038**: System MUST display warning message when custom level deleted: "Information Level '[name]' was deleted. X cards reverted to System. Secrets may now be exposed in Player View."
- **FR-039**: System MUST prevent deletion or modification of the four default levels (System, Common Knowledge, Player Knowledge, DM Secret)
- **FR-040**: Users MUST be able to bulk assign or change information levels across multiple cards via selection in database view + toolbar actions

#### AI Context Integration
- **FR-041**: Player Portal AI (feature 009) MUST only access cards assigned as Common Knowledge or Player Knowledge
- **FR-042**: Player Portal AI MUST NOT access cards assigned as System (meta/structural) or DM Secret (restricted)
- **FR-043**: Import AI workflow (feature 005) MUST have full read/write access to all information levels including DM Secret (DM-only tool)
- **FR-044**: Import AI MUST be able to dynamically assign information levels during import (e.g., identify secrets in PDF and assign DM Secret level)
- **FR-045**: Planning AI workflow (feature 005) MUST have full READ access to all information levels including DM Secret (DM tool)
- **FR-046**: Planning AI MUST assume mixed-level content is safe for context, with DM responsible for specifying if output must be player-safe upfront
- **FR-047**: System MUST provide clear indicators when AI contexts are filtering based on information levels

#### Search & Discovery
- **FR-048**: Search functionality MUST respect current view mode (hide DM Secret results in Player/General View)
- **FR-049**: Search functionality MUST allow filtering by information level assignments
- **FR-050**: Database view filters MUST support filtering by information level (no dedicated "view by level" page needed)

#### Database View Integration
- **FR-051**: Database views MUST respect current view mode when displaying entries
- **FR-052**: Database entries (rows) MUST have information levels assigned at entry level (entire row)
- **FR-053**: Database columns MUST support hierarchical flag to mark columns as always secret (e.g., "[DM] Secret Motivation")
- **FR-054**: Hierarchical columns MUST be hidden in Player/General View regardless of entry information level
- **FR-055**: Database entries MUST support special "Player Knowledge" text field (column type)
- **FR-056**: When database entry is DM Secret AND "Player Knowledge" field has content, Player/General View MUST show entry name + Player Knowledge field only (partial visibility)
- **FR-057**: When database entry is DM Secret AND "Player Knowledge" field is empty, Player/General View MUST hide entire row
- **FR-058**: Database filters MUST allow filtering by information level assignments

#### Nested Card Behavior
- **FR-059**: Parent cards with System level MUST allow child cards with any information level (including DM Secret)
- **FR-060**: Child cards MUST respect their own information level visibility rules regardless of parent level
- **FR-061**: When all child cards are hidden in Player/General View AND parent is pure container (no title, icon, cover, content), System MUST hide parent entirely
- **FR-062**: When all child cards are hidden in Player/General View AND parent has metadata (title, icon, cover, or content), System MUST show parent with empty children section

### Non-Functional Requirements

#### Performance
- **NFR-001**: Information level filtering MUST occur client-side with <50ms overhead per card render
- **NFR-002**: View mode toggle MUST update UI within 200ms for campaigns with up to 10,000 cards
- **NFR-003**: Painter's easel palette level change MUST apply instantly (<16ms, 60fps)

#### Usability
- **NFR-004**: Information level visual indicators (tint, icon) MUST be distinguishable for colorblind users (WCAG AA contrast)
- **NFR-005**: View mode toggle MUST be accessible via keyboard shortcut (Ctrl+Shift+P suggested)

#### Security
- **NFR-006**: Player/General View filtering MUST occur before card rendering (no client-side exposure of secret content in DOM)
- **NFR-007**: Information level assignments MUST be stored server-side (not client-side only)

### Key Entities

- **Information Level**: Represents a visibility classification assigned to cards. Has a name, type (default: System/Common Knowledge/Player Knowledge/DM Secret, or custom), hierarchical flag (true for DM Secret and optionally for custom levels), color (for UI palette), and defines whether content is visible in view modes and included in AI contexts. Each card has exactly ONE information level.

- **View Mode**: Represents the current content visibility context for a user. Two types: DM View (shows all content) and Player/General View (hides hierarchical information levels). View mode is user-specific and persisted across sessions.

- **AI Context Filter**: Represents the set of information levels that determine which content is accessible to different AI workflows. Player Portal (feature 009) includes only Common Knowledge + Player Knowledge. Import AI (feature 005) and Planning AI (feature 005) have full access including DM Secret.

- **Database Visibility Rule**: Represents entry-level and column-level information level rules for database cards. Entry level applies to entire row. Column hierarchical flag hides specific columns. Special "Player Knowledge" field enables partial visibility for secret entries.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (all 14 clarifications resolved)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Clarifications documented (14 resolved)
- [x] Review checklist passed

---
