# Feature Specification: Card-Based Content Architecture

**Feature Branch**: `003-create-a-notion`
**Created**: 2025-10-01
**Status**: Draft
**Input**: User description: "Create a Notion-inspired card-based architecture where everything (pages, databases, text, images) is a card. Hierarchy: Setting/World → Campaign → Cards. Cards can contain other cards infinitely. Databases are cards with user-defined schemas/columns and support multiple views (table, list, gallery, kanban). Pages are canvas cards for free-form content. Users can nest cards inline or link to full-page cards. Supports slash commands (like /page, /database) for adding cards. Users have complete freedom to organize content."

---

## User Scenarios & Testing

### Primary User Story
A Game Master creates a new campaign within their homebrew world setting. They start with a blank campaign page (canvas) and use `/database` to create a "Characters" database inline. They add columns for Name, Race, Class, and Status, then create character entries as page cards within the database. Opening a character page, they add rich text content, image cards, and even a nested database for that character's inventory. They can freely reorganize content by dragging cards, switching database views from table to gallery, and linking between related cards across their entire campaign. The system provides complete freedom to structure content exactly how they envision their campaign wiki should flow.

### Acceptance Scenarios
1. **Given** I am viewing a campaign, **When** I type `/page` in any card, **Then** I can create a new page card inline or as a full-page link
2. **Given** I am viewing a campaign, **When** I type `/database` in any card, **Then** I can create a new database card with custom schema
3. **Given** I have a database card, **When** I add columns, **Then** I can define column name, type (text, number, date, select, entity reference) and properties
4. **Given** I have a database card, **When** I switch views, **Then** I can see the data displayed as table, list, gallery, or kanban
5. **Given** I have a page card, **When** I add content, **Then** I can nest other cards (pages, databases, text, images) infinitely
6. **Given** I have created cards, **When** I move between setting and campaign levels, **Then** I see the appropriate hierarchical context
7. **Given** I have multiple campaigns in one setting/world, **When** I reference a card, **Then** I can link to cards across campaigns within the same setting
8. **Given** I am editing content, **When** I use slash commands, **Then** I see a menu of available card types to insert

### Edge Cases
- What happens when a user tries to create circular references (card A contains card B which contains card A)?
- What happens when a database has hundreds of columns or entries (performance/UI limits)?
- What happens when a user deletes a card that is referenced by other cards?
- What happens when a user tries to move a card from one campaign to another?
- What happens when inline vs full-page rendering conflicts (database too large for inline view)?

## Requirements

### Functional Requirements

#### Hierarchy & Organization
- **FR-001**: System MUST support a three-level hierarchy: Setting/World → Campaign → Cards
- **FR-002**: Users MUST be able to create multiple campaigns within a single setting/world
- **FR-003**: Users MUST be able to create multiple settings/worlds within their account
- **FR-004**: System MUST allow cards to reference other cards across campaigns within the same setting
- **FR-005**: System MUST [NEEDS CLARIFICATION: should cards be shareable across campaigns, or always duplicated?]

#### Card System
- **FR-006**: System MUST treat all content as cards (pages, databases, text, images, etc.)
- **FR-007**: Cards MUST be able to contain other cards with infinite nesting depth
- **FR-008**: Users MUST be able to render cards inline or as full-page links
- **FR-009**: System MUST provide slash commands (e.g., `/page`, `/database`, `/text`, `/image`) for creating cards
- **FR-010**: Users MUST be able to drag and reorder cards within parent cards
- **FR-011**: System MUST persist card hierarchy and order
- **FR-012**: System MUST prevent circular references that would cause infinite loops

#### Page Cards
- **FR-013**: Page cards MUST act as canvases for free-form content composition
- **FR-014**: Page cards MUST support rich text editing
- **FR-015**: Page cards MUST support embedding other cards (pages, databases, media) within their content
- **FR-016**: Page cards MUST have a title field
- **FR-017**: Page cards MUST support [NEEDS CLARIFICATION: cover images, icons, or other metadata?]

#### Database Cards
- **FR-018**: Database cards MUST allow users to define custom schemas with multiple columns
- **FR-019**: Database cards MUST support column types: text, number, date, select (dropdown), multi-select, and entity reference
- **FR-020**: Database cards MUST support [NEEDS CLARIFICATION: additional column types like checkbox, URL, file, formula?]
- **FR-021**: Users MUST be able to add, remove, rename, and reorder columns
- **FR-022**: Users MUST be able to create entries (rows) in databases, where each entry is a page card
- **FR-023**: Users MUST be able to open database entries as full pages with nested content
- **FR-024**: Database cards MUST support multiple view types: table, list, gallery, kanban
- **FR-025**: Users MUST be able to switch between views without losing data
- **FR-026**: Users MUST be able to [NEEDS CLARIFICATION: filter, sort, and search within database views?]
- **FR-027**: System MUST render database cards inline (showing entries) or as full-page links
- **FR-028**: Inline database rendering MUST [NEEDS CLARIFICATION: show all entries, paginate, or limit display?]

#### Text & Media Cards
- **FR-029**: System MUST support text cards with rich formatting (bold, italic, headers, lists, links)
- **FR-030**: System MUST support image cards that can be uploaded or linked
- **FR-031**: System MUST support [NEEDS CLARIFICATION: additional media types like video, audio, PDFs?]
- **FR-032**: Text cards MUST support inline card insertion via slash commands

#### Slash Commands & Content Creation
- **FR-033**: System MUST display a slash command menu when users type `/` in editable areas
- **FR-034**: Slash command menu MUST include options for: page, database, text, image, and [NEEDS CLARIFICATION: other card types?]
- **FR-035**: Users MUST be able to navigate the slash command menu with keyboard (arrow keys, enter)
- **FR-036**: System MUST insert the selected card type at cursor position

#### Entity References & Linking
- **FR-037**: Users MUST be able to reference other cards using entity reference column types in databases
- **FR-038**: Users MUST be able to create links between cards in text content
- **FR-039**: System MUST display referenced cards with [NEEDS CLARIFICATION: preview/hover behavior, backlinks?]
- **FR-040**: System MUST handle deletion of referenced cards with [NEEDS CLARIFICATION: warnings, orphaned references, cascading deletes?]

#### Templates & Defaults
- **FR-041**: System MUST provide a default campaign template with [NEEDS CLARIFICATION: what starter structure? Characters database, Locations database, blank page?]
- **FR-042**: Users MUST be able to [NEEDS CLARIFICATION: save custom templates for campaigns or card structures?]

### Key Entities

- **Setting/World**: Top-level organizational container representing a fictional world or setting. Contains one or more Campaigns. Users can have multiple settings. Examples: "Forgotten Realms", "My Cyberpunk World", "Strixhaven Campaign Setting".

- **Campaign**: Second-level container representing a specific campaign or adventure within a Setting. Contains the root card hierarchy for that campaign's content. Multiple campaigns can exist in one setting and reference shared world-building cards.

- **Card**: Universal content unit representing any piece of information (page, database, text, image). Has a type, optional title, content, parent card relationship, and position in parent. Can contain child cards infinitely nested.

- **Page Card**: A card type that serves as a canvas for free-form content. Contains child cards. Has a title and rich content area.

- **Database Card**: A card type with a defined schema (columns). Contains entry cards (page cards) as rows. Supports multiple views (table, list, gallery, kanban). Each entry is a full page card that can have nested content.

- **Database Column**: Defines a field in a database schema. Has name, type (text, number, date, select, entity reference), and optional properties (required, default value, options for select types).

- **Database View**: A specific visualization of a database's entries. Has view type (table, list, gallery, kanban) and optionally filter/sort/grouping settings.

- **Text Card**: A card type for rich text content. Supports inline card insertion.

- **Media Card**: A card type for images, videos, or other media files. Has source (upload or URL) and optional caption.

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (13 clarifications needed)
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
