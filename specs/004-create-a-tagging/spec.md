# Feature Specification: Tagging-Based Information Filtering System

**Feature Branch**: `004-create-a-tagging`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "Create a tagging-based information filtering system where cards can be tagged with visibility tiers. System (default tier for most content like navigation, sections, wiki structure), Common Knowledge (in-world information available to NPCs/AI contexts), Player Knowledge (previously secret information now revealed), and DM Secret (hierarchical restriction, always hidden from non-DMs). Users can create custom filter tags. Two view modes: DM View (shows everything) and Player/General View (hides DM Secrets). Restricted cards are completely hidden (not rendered), no visual censorship."

---

## User Scenarios & Testing

### Primary User Story
A Game Master is building their campaign wiki with various content types. They create a "Waterdeep" city page with general description (System tier, default), add a "Council of Lords" section tagged as Common Knowledge (in-world information for AI contexts), include a "Secret Meeting Location" section tagged as DM Secret, and mark a "Red Sashes Gang" section as Player Knowledge after the party discovers it in session 3. When viewing in DM View, they see all content. When switching to Player/General View to preview what players will see, the "Secret Meeting Location" section doesn't render at all. The Player Portal AI can reference Common Knowledge and Player Knowledge content but not System-tier meta information or DM Secrets. This tagging system gives complete control over what's visible in the wiki, what's available to AI contexts, and what's restricted to DM-only viewing.

### Acceptance Scenarios
1. **Given** I am creating a new card, **When** the card is created, **Then** it is automatically assigned the System tier (default)
2. **Given** I have a card with System tier, **When** I view it in DM View, **Then** I see the full card content
3. **Given** I have a card with System tier, **When** I view it in Player/General View, **Then** I see the full card content (System is not restricted)
4. **Given** I have a card tagged as Common Knowledge, **When** the Player Portal AI processes a query, **Then** that card's content is included in the AI context
5. **Given** I have a card tagged as DM Secret, **When** I view it in Player/General View, **Then** the card does not render at all (completely hidden)
6. **Given** I have a card tagged as DM Secret, **When** I view it in DM View, **Then** I see the full card content with DM Secret indicator
7. **Given** I have a card tagged as Player Knowledge, **When** the Player Portal AI processes a query, **Then** that card's content is included in the AI context
8. **Given** I am viewing any card, **When** I change the tag assignment, **Then** the visibility immediately updates based on current view mode
9. **Given** I want to create a custom filter tag, **When** I define a new tag, **Then** I can assign it to cards and it behaves like a non-hierarchical tag (not restricted by default)
10. **Given** I have a card with multiple tags, **When** one tag is DM Secret, **Then** the hierarchical restriction takes precedence (card hidden in Player/General View)

### Edge Cases
- What happens when a card has both Common Knowledge and DM Secret tags (conflicting visibility)?
- What happens when a user tries to view a campaign in Player/General View with no non-secret content?
- What happens when AI contexts need to reference a card that was recently changed from Common Knowledge to DM Secret?
- What happens when a card is tagged with only custom tags (no System, Common, Player, or DM tags)?
- What happens when nested cards have different visibility tags (parent is System, child is DM Secret)?

## Requirements

### Functional Requirements

#### Tag System Architecture
- **FR-001**: System MUST provide four default filter tags: System, Common Knowledge, Player Knowledge, and DM Secret
- **FR-002**: System tier MUST be the default tag assigned to all newly created cards
- **FR-003**: System tier MUST be intended for most content including navigation, meta information, and wiki structure
- **FR-004**: System tier content MUST be visible in both DM View and Player/General View
- **FR-005**: System tier content MUST be excluded from Player Portal AI contexts (meta/structural information, not in-world)
- **FR-006**: Common Knowledge tier MUST indicate in-world information available to NPCs and AI contexts
- **FR-007**: Common Knowledge content MUST be included in Player Portal AI contexts
- **FR-008**: Common Knowledge content MUST be visible in both DM View and Player/General View
- **FR-009**: Player Knowledge tier MUST indicate previously secret information that has been revealed to players
- **FR-010**: Player Knowledge content MUST be included in Player Portal AI contexts
- **FR-011**: Player Knowledge content MUST be visible in both DM View and Player/General View
- **FR-012**: DM Secret tier MUST be the only hierarchical information filter that restricts visibility
- **FR-013**: DM Secret content MUST be visible only in DM View
- **FR-014**: DM Secret content MUST be completely hidden (not rendered) in Player/General View
- **FR-015**: DM Secret content MUST be excluded from all AI contexts (Import, Planning, Player Portal)
- **FR-016**: Users MUST be able to create custom filter tags with user-defined names
- **FR-017**: Custom filter tags MUST behave as non-hierarchical tags (not restricted by default) unless [NEEDS CLARIFICATION: users can optionally mark custom tags as hierarchical/restrictive?]
- **FR-018**: Cards MUST be able to have multiple tags assigned simultaneously
- **FR-019**: System MUST apply hierarchical restriction (DM Secret) when any assigned tag is hierarchical, regardless of other tags present

#### View Modes
- **FR-020**: System MUST provide two view modes: DM View and Player/General View
- **FR-021**: DM View MUST display all content regardless of tag assignments
- **FR-022**: DM View MUST visually indicate which cards are tagged as DM Secret with [NEEDS CLARIFICATION: badge, border, icon, color coding?]
- **FR-023**: Player/General View MUST hide all cards tagged as DM Secret (cards do not render at all)
- **FR-024**: Player/General View MUST display all non-secret content (System, Common Knowledge, Player Knowledge, custom tags)
- **FR-025**: Users MUST be able to toggle between DM View and Player/General View with [NEEDS CLARIFICATION: toggle button, dropdown, keyboard shortcut?]
- **FR-026**: System MUST persist the user's last selected view mode across sessions
- **FR-027**: System MUST apply view mode filtering to all card types (pages, databases, text, images, etc.)
- **FR-028**: System MUST apply view mode filtering to nested cards (child cards respect their own tags)

#### Tag Management Interface
- **FR-029**: Users MUST be able to assign tags to cards through [NEEDS CLARIFICATION: properties panel, context menu, slash command?]
- **FR-030**: Users MUST be able to assign multiple tags to a single card simultaneously
- **FR-031**: Users MUST be able to remove tags from cards
- **FR-032**: System MUST prevent removal of all tags with [NEEDS CLARIFICATION: auto-assign System tier as default, or allow tagless cards?]
- **FR-033**: Users MUST be able to create new custom filter tags with [NEEDS CLARIFICATION: inline creation during tagging, dedicated tag management page?]
- **FR-034**: Users MUST be able to rename custom filter tags
- **FR-035**: Users MUST be able to delete custom filter tags with [NEEDS CLARIFICATION: what happens to cards assigned deleted tags?]
- **FR-036**: System MUST prevent deletion or modification of the four default tags (System, Common Knowledge, Player Knowledge, DM Secret)
- **FR-037**: Users MUST be able to bulk assign or remove tags across multiple cards with [NEEDS CLARIFICATION: selection + tag action, database column operations?]

#### AI Context Integration
- **FR-038**: Player Portal AI MUST only access cards tagged as Common Knowledge or Player Knowledge
- **FR-039**: Player Portal AI MUST NOT access cards tagged as System (meta/structural) or DM Secret (restricted)
- **FR-040**: Import AI workflow MUST respect DM Secret restrictions (no import into secret cards) unless [NEEDS CLARIFICATION: DM explicitly overrides?]
- **FR-041**: Planning AI workflow MUST have access to [NEEDS CLARIFICATION: all content including secrets, or respects tag filtering?]
- **FR-042**: System MUST provide clear indicators when AI contexts are filtering based on tags

#### Search & Discovery
- **FR-043**: Search functionality MUST respect current view mode (hide DM Secret results in Player/General View)
- **FR-044**: Search functionality MUST allow filtering by tag assignments
- **FR-045**: Users MUST be able to see all cards assigned to a specific tag with [NEEDS CLARIFICATION: tag-based card list, database view filter?]

#### Database View Integration
- **FR-046**: Database views MUST respect current view mode when displaying entries
- **FR-047**: Database entries tagged as DM Secret MUST not render as rows in Player/General View
- **FR-048**: Database columns MUST support tag assignment as a column type with [NEEDS CLARIFICATION: multi-select tag column, or apply tags to entire entries?]
- **FR-049**: Database filters MUST allow filtering by tag assignments

#### Nested Card Behavior
- **FR-050**: Parent cards with System tier MUST allow child cards with any tag (including DM Secret)
- **FR-051**: Child cards MUST respect their own tag visibility rules regardless of parent tags
- **FR-052**: System MUST handle cases where all child cards are hidden in Player/General View with [NEEDS CLARIFICATION: show empty parent, hide parent entirely?]

### Key Entities

- **Filter Tag**: Represents a visibility classification that can be assigned to cards. Has a name, type (default: System/Common Knowledge/Player Knowledge/DM Secret, or custom), hierarchical flag (true only for DM Secret by default), and defines whether content is visible in view modes and included in AI contexts. Users can create custom tags.

- **Tag Assignment**: Represents the relationship between a Card and one or more Filter Tags. Cards can have multiple tag assignments. Hierarchical tags (DM Secret) take precedence for visibility restrictions.

- **View Mode**: Represents the current content visibility context for a user. Two types: DM View (shows all content) and Player/General View (hides DM Secret content). View mode is user-specific and persisted across sessions.

- **AI Context Filter**: Represents the set of tags that determine which content is accessible to different AI workflows. Player Portal includes Common Knowledge + Player Knowledge. Import workflow respects DM Secret restrictions. Planning workflow access level to be determined.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (14 clarifications needed)
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
- [ ] Review checklist passed (blocked by clarifications)

---
