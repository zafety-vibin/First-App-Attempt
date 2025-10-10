# Feature Specification: Stateless AI Import System

**Feature Branch**: `017-create-a-stateless`
**Created**: 2025-01-10
**Status**: Draft
**Input**: User description: "Create a stateless AI import system that writes to 13 category database tables (NPCs, Locations, Factions, Session Recaps, Quests, Player Characters, Lore, World Rules, Planar Forces, Session Prep, Custom Mechanics, Items, Creatures). User flow: (1) Select import TYPE from dropdown menu before processing (Location notes, NPC notes, Faction notes, Session Recap, Quest notes, etc.) - maps to database category, (2) Upload files (PDF/DOCX/TXT/MD) OR paste text, (3) Optional: Add custom system prompt/context for this import (text field), (4) Click Import button - AI processes file/text knowing the selected type context (stateless, no chat), (5) Preview UI displays proposed database changes as TABLE ROWS with editable fields (shows what will be created/updated in database table), (6) User edits fields directly like editing database (delete proposed entries, modify names/descriptions/fields), (7) Click Confirm button to apply changes to database tables. Special handling for Session Recap imports: Sequential batch import feature preserves cause/effect timeline (import recaps in order 1→2→3). NO conversational chat, NO back-and-forth with AI, NO knowledge graph population (graphs are user-curated separately). Import writes to databases only (comprehensive storage). Preview shows database schema fields for selected category type. User can cancel import before confirming (discards all changes). Import process is ONE-SHOT per file (upload → preview → confirm → done). System uses existing 13 category tables from Feature 014 (structured categories). UI integrated into Campaign Dashboard (Feature 015) as Import button/panel. Supports information level assignment during preview (player_knowledge field). File parser reuses existing logic (pdf-parse, mammoth). LLM extraction uses user's BYOLLM config (Feature 008). Entity deduplication against existing database entries (fuzzy matching, user resolves conflicts in preview). Performance: <5s for 10-page document, <500ms preview rendering for 50 entities. Dependencies: Feature 014 (13 category database tables), Feature 015 (Dashboard UI), Feature 008 (BYOLLM configuration). Reference Feature 005 v1 for file parsing and LLM integration patterns but REPLACE conversational workflow with stateless type-selection approach. This is separate from Feature 017 (MCP REST API) - both exist for testing different import approaches."

## Execution Flow (main)
```
1. Parse user description from Input
   → Extracted: Stateless import, type selection, 13 categories, preview/edit UI, database-only writes
2. Extract key concepts from description
   → Actors: Game Masters importing campaign content
   → Actions: Select type, upload/paste, process, preview, edit, confirm
   → Data: Database entries for 13 category types
   → Constraints: No chat, no graphs, one-shot process, stateless AI
3. For each unclear aspect:
   → No clarifications needed - comprehensive description provided
4. Fill User Scenarios & Testing section
   → Scenarios cover: Type selection, file upload, preview editing, confirmation, session recap batch import
5. Generate Functional Requirements
   → 48 requirements covering type selection, processing, preview UI, editing, confirmation, deduplication
6. Identify Key Entities
   → ImportJob (tracks one-shot import process), DuplicateCandidate (fuzzy match results)
7. Run Review Checklist
   → SUCCESS - Clear requirements, no ambiguities
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

A Game Master has session notes from their last game night containing details about 5 new NPCs they introduced. They open their campaign dashboard and click the Import button. From the dropdown, they select "NPC notes" as the import type. They upload their PDF session notes and optionally add a custom note in the context field: "Focus on character motivations and relationships." They click Import. The AI processes the file in one shot, extracting 5 NPCs with their names, descriptions, relationships, and other details. The preview displays these as 5 table rows showing all database fields (name, description, npc_type, motivation, affiliations, player_knowledge, etc.). The GM notices one NPC was extracted twice with slightly different names - the system flagged this as a potential duplicate. They delete the duplicate row. They also notice the AI set all NPCs to "common_knowledge" visibility, but one NPC is actually a secret villain, so they change that row's player_knowledge to "dm_secret". They edit another NPC's motivation field to add more detail. Satisfied with the changes, they click Confirm. All 5 NPCs (minus the deleted duplicate) are written to the npcs database table. The import job is complete - no session to resume, no chat history. The GM can now see these NPCs in their campaign database and manually add the important ones to their Political-Web knowledge graph later.

**Note:** This import writes to databases (Feature 014) which are the CANON CONTEXT for AI tools. Knowledge graphs (Feature 006/015) are populated separately by user curation - import does NOT auto-populate graphs.

### Acceptance Scenarios

**Scenario 1: Import location notes with type selection**
1. **Given** a GM is on their campaign dashboard with no existing locations
2. **When** they click Import button
3. **Then** system displays import dialog with type dropdown and file/text input
4. **When** they select "Location notes" from type dropdown
5. **And** upload a DOCX file containing 3 location descriptions
6. **And** click Import button
7. **Then** system processes file using stateless AI (no chat interface)
8. **And** system displays preview showing 3 table rows with location database fields (name, description, location_type, parent_location, coordinates, player_knowledge, tags, custom_fields)
9. **When** they review the preview
10. **Then** all fields are editable directly in the table rows
11. **And** each row has a delete button
12. **When** they click Confirm
13. **Then** system writes 3 entries to locations database table
14. **And** import dialog closes
15. **And** dashboard refreshes showing 3 new locations

**Scenario 2: Edit preview fields before confirmation**
1. **Given** GM has completed import processing and sees preview with 5 faction entries
2. **When** they edit the "name" field of row 2 from "The Red Hand" to "The Crimson Hand"
3. **And** edit the "description" field of row 3 to add more detail
4. **And** change "player_knowledge" of row 4 from "common_knowledge" to "player_knowledge"
5. **And** delete row 5 entirely (using delete button)
6. **Then** preview updates to show 4 remaining rows with edited values
7. **When** they click Confirm
8. **Then** system writes exactly 4 factions to database with edited values
9. **And** deleted row 5 is NOT written to database

**Scenario 3: Resolve duplicate conflicts in preview**
1. **Given** GM imports NPC notes and AI extracts 6 NPCs
2. **When** preview displays
3. **Then** system flags 2 NPCs as potential duplicates (fuzzy name match: "Sir Gareth" and "Ser Gareth")
4. **And** duplicate rows are visually highlighted with warning badge
5. **And** system shows existing database entry "Sir Gareth" for comparison
6. **When** GM reviews both rows
7. **And** decides "Ser Gareth" is a duplicate (typo in notes)
8. **And** merges useful details from "Ser Gareth" row into "Sir Gareth" row (copy description details)
9. **And** deletes "Ser Gareth" row
10. **Then** preview shows 5 unique NPCs without duplicate warning
11. **When** they click Confirm
12. **Then** system updates existing "Sir Gareth" entry with merged details
13. **And** writes 4 new NPCs to database

**Scenario 4: Sequential session recap import (batch mode)**
1. **Given** GM has 3 session recap text files from consecutive game sessions (Session 1, 2, 3)
2. **When** they select "Session Recap" from type dropdown
3. **Then** system displays "Sequential Import" option with multi-file upload
4. **When** they enable "Sequential Import" toggle
5. **And** upload 3 files in order (Session 1 → Session 2 → Session 3)
6. **And** add context: "These sessions cover the Fall of Greyhaven story arc"
7. **And** click Import
8. **Then** system processes files in sequence (1 → 2 → 3) preserving cause/effect timeline
9. **And** preview displays all 3 session recaps as table rows with fields (session_number, date, title, summary, key_events, npcs_involved, locations_visited, player_knowledge)
10. **When** they review and confirm
11. **Then** system writes all 3 recaps to session_recaps table with preserved sequence order

**Scenario 5: Cancel import before confirmation**
1. **Given** GM has processed import and sees preview with 8 item entries
2. **When** they review the preview and realize they uploaded wrong file
3. **And** click Cancel button
4. **Then** system discards all proposed changes
5. **And** no entries are written to database
6. **And** import dialog resets to initial state (type selection)

**Scenario 6: Use text paste instead of file upload**
1. **Given** GM is on import dialog
2. **When** they select "Quest notes" from type dropdown
3. **And** switch from file upload to text paste tab
4. **And** paste raw text: "The party needs to recover the Sunstone from the goblin caves. Reward: 500 gold."
5. **And** add optional context: "This is a side quest, not main story"
6. **And** click Import
7. **Then** system processes pasted text using stateless AI
8. **And** preview displays 1 quest entry with extracted fields
9. **When** they confirm
10. **Then** system writes 1 quest to database

### Edge Cases

**Type selection edge cases:**
- What happens if user doesn't select import type? (Expected: Import button disabled until type selected)
- What happens if user selects "Session Recap" but uploads non-recap content? (Expected: AI does best effort extraction, GM fixes in preview)
- What happens if import type doesn't match actual content? (Expected: Preview shows extracted data, GM can delete/edit before confirm)

**File upload edge cases:**
- What happens if uploaded file is corrupted/unreadable? (Expected: Error message, allow retry)
- What happens if file is too large (>50MB)? (Expected: Error message with file size limit)
- What happens if file format is unsupported (e.g., .xls)? (Expected: Error message listing supported formats: PDF, DOCX, TXT, MD)
- What happens if PDF has scanned images (no extractable text)? (Expected: Error message "No text found in PDF")

**Preview editing edge cases:**
- What happens if user deletes all rows in preview? (Expected: Confirm button disabled, message "No entries to import")
- What happens if user edits required field to be empty (e.g., name)? (Expected: Validation error on that row, cannot confirm until fixed)
- What happens if preview has 200+ rows (performance)? (Expected: Virtualized scrolling, <500ms render per spec)
- What happens if user edits field to invalid data type? (Expected: Validation error with format hint)

**Deduplication edge cases:**
- What happens if fuzzy match finds 10 potential duplicates for one entry? (Expected: Show all 10 matches, GM decides which to merge/delete)
- What happens if GM ignores duplicate warning and confirms anyway? (Expected: Allowed, system creates duplicate entries as specified)
- What happens if fuzzy match threshold is too sensitive (flags false positives)? (Expected: GM can adjust sensitivity in settings, or just ignore warnings)

**Confirmation edge cases:**
- What happens if database write fails mid-confirmation (e.g., 3 of 5 entries written, then error)? (Expected: Rollback all changes, show error, allow retry)
- What happens if user clicks Confirm twice rapidly? (Expected: Button disabled after first click, prevent double-submit)
- What happens if user closes browser during confirmation? (Expected: Import job not saved, must restart)

**Session recap batch import edge cases:**
- What happens if GM uploads recaps out of order (Session 3, 1, 2)? (Expected: System allows manual reordering in upload UI, or warns about sequence)
- What happens if one recap file fails to parse mid-batch? (Expected: Show error for that file, allow GM to skip or fix and retry)
- What happens if batch has 20+ recaps? (Expected: Performance warning, suggest importing in smaller batches)

**Custom context edge cases:**
- What happens if custom context field is very long (>1000 chars)? (Expected: Character limit with counter)
- What happens if custom context contains special characters or code? (Expected: Sanitized before AI processing)

**Information level assignment edge cases:**
- What happens if GM forgets to set player_knowledge for sensitive entries? (Expected: Defaults to "common_knowledge", GM can edit in database later)
- What happens if GM sets all entries to "dm_secret"? (Expected: Allowed, entries hidden from player view mode)

---

## Requirements *(mandatory)*

### Functional Requirements

**Type Selection Requirements:**

- **FR-001**: System MUST display import dialog with type dropdown as first required field
- **FR-002**: System MUST offer exactly 13 import type options matching database categories: Location notes, NPC notes, Faction notes, Session Recap, Quest notes, Player Character notes, Lore notes, World Rule notes, Planar Forces notes, Session Prep notes, Custom Mechanics notes, Item notes, Creature notes
- **FR-003**: System MUST disable Import processing button until user selects one import type
- **FR-004**: System MUST map each import type to corresponding database table schema for preview display

**File Upload & Text Input Requirements:**

- **FR-005**: System MUST support file upload for formats: PDF, DOCX, TXT, MD
- **FR-006**: System MUST support direct text paste as alternative to file upload (tabs: Upload File | Paste Text)
- **FR-007**: System MUST enforce 50MB file size limit with error message if exceeded
- **FR-008**: System MUST validate file format and show error if unsupported format uploaded
- **FR-009**: System MUST show error if PDF has no extractable text (scanned images only)
- **FR-010**: System MUST allow only one file upload per import job (one-shot process)

**Custom Context Requirements:**

- **FR-011**: System MUST provide optional text field for custom context/system prompt
- **FR-012**: System MUST limit custom context to 1000 characters with character counter
- **FR-013**: System MUST sanitize custom context input before AI processing (remove code injection attempts)
- **FR-014**: System MUST pass custom context to AI along with selected import type for entity extraction

**Stateless AI Processing Requirements:**

- **FR-015**: System MUST process import in stateless one-shot mode (no conversational chat, no back-and-forth)
- **FR-016**: System MUST use user's BYOLLM configuration (Feature 008) for LLM API calls
- **FR-017**: System MUST extract entities based on selected import type schema
- **FR-018**: System MUST complete processing within 5 seconds for 10-page document (performance target)
- **FR-019**: System MUST show loading indicator during AI processing with estimated time
- **FR-020**: System MUST show error message if AI processing fails (API error, timeout, etc.) and allow retry

**Preview UI Requirements:**

- **FR-021**: System MUST display preview as table with rows representing extracted database entries
- **FR-022**: System MUST display columns matching database schema fields for selected import type (e.g., NPCs show: name, description, npc_type, motivation, affiliations, player_knowledge, tags, custom_fields)
- **FR-023**: System MUST make all fields directly editable in preview table (inline editing)
- **FR-024**: System MUST provide delete button for each row in preview
- **FR-025**: System MUST render preview within 500ms for 50 entities (performance target)
- **FR-026**: System MUST use virtualized scrolling for previews with 100+ rows
- **FR-027**: System MUST display row count summary (e.g., "Extracted 12 NPCs")

**Preview Editing Requirements:**

- **FR-028**: System MUST allow GM to edit any field value before confirmation (text fields, dropdowns, tags)
- **FR-029**: System MUST validate required fields (e.g., name cannot be empty) and prevent confirmation if invalid
- **FR-030**: System MUST allow GM to delete any row from preview
- **FR-031**: System MUST update row count summary when rows deleted
- **FR-032**: System MUST disable Confirm button if preview has zero rows
- **FR-033**: System MUST preserve edited values when GM navigates between preview rows

**Entity Deduplication Requirements:**

- **FR-034**: System MUST perform fuzzy matching against existing database entries to detect potential duplicates
- **FR-035**: System MUST visually flag duplicate candidate rows in preview with warning badge
- **FR-036**: System MUST display existing database entry details for comparison when duplicate detected
- **FR-037**: System MUST allow GM to ignore duplicate warnings and proceed with import
- **FR-038**: System MUST allow GM to delete duplicate rows or merge details before confirmation
- **FR-039**: System MUST support updating existing database entries if GM merges duplicate details

**Confirmation & Persistence Requirements:**

- **FR-040**: System MUST provide Confirm button to apply all preview changes to database
- **FR-041**: System MUST write all confirmed entries to corresponding database table in single atomic transaction
- **FR-042**: System MUST rollback all changes if any database write fails during confirmation
- **FR-043**: System MUST disable Confirm button after first click to prevent double-submit
- **FR-044**: System MUST close import dialog and refresh dashboard after successful confirmation
- **FR-045**: System MUST show success message with count of entries created/updated (e.g., "5 NPCs imported successfully")

**Cancellation Requirements:**

- **FR-046**: System MUST provide Cancel button at all stages of import process
- **FR-047**: System MUST discard all proposed changes when Cancel clicked (no database writes)
- **FR-048**: System MUST reset import dialog to initial state (type selection) after cancellation

**Sequential Session Recap Import Requirements:**

- **FR-049**: System MUST provide "Sequential Import" toggle option when "Session Recap" type selected
- **FR-050**: System MUST allow multi-file upload when Sequential Import enabled (upload 2+ files)
- **FR-051**: System MUST display file order in upload UI and allow drag-to-reorder
- **FR-052**: System MUST process session recap files in specified order (1 → 2 → 3) to preserve cause/effect timeline
- **FR-053**: System MUST display all sequential recaps in preview before confirmation (batch preview)
- **FR-054**: System MUST write all sequential recaps with correct session_number ordering

**Information Level Integration Requirements:**

- **FR-055**: System MUST include player_knowledge field in preview for all import types
- **FR-056**: System MUST default player_knowledge to "common_knowledge" for all extracted entries
- **FR-057**: System MUST allow GM to change player_knowledge for any entry in preview (dropdown: common_knowledge, player_knowledge, dm_secret)
- **FR-058**: System MUST respect player_knowledge settings in view mode filtering (integration with Feature 004)

### Key Entities

**ImportJob:**
- **Purpose**: Tracks one-shot import process from upload to confirmation
- **Attributes**:
  - import_type (TEXT: one of 13 category names)
  - source_type (TEXT: file_upload or text_paste)
  - file_name (TEXT: original filename if uploaded)
  - custom_context (TEXT: optional user prompt, max 1000 chars)
  - extracted_count (INTEGER: number of entities extracted by AI)
  - confirmed_count (INTEGER: number of entities actually written after GM edits)
  - created_at (INTEGER: Unix timestamp)
  - status (TEXT: processing, preview, confirmed, cancelled, failed)
- **Relationships**: Belongs to one Campaign, belongs to one User
- **Lifecycle**: Created on Import button click, status updates through workflow, deleted after confirmation/cancellation (ephemeral, not persisted long-term)

**DuplicateCandidate:**
- **Purpose**: Tracks potential duplicate matches found during preview
- **Attributes**:
  - preview_entry_id (TEXT: ID of extracted entry in preview)
  - existing_entry_id (TEXT: ID of existing database entry)
  - similarity_score (REAL: 0.0-1.0 fuzzy match confidence)
  - match_type (TEXT: name_match, description_match, combined)
  - resolution (TEXT: ignored, merged, deleted_preview, deleted_existing)
- **Relationships**: Belongs to one ImportJob
- **Lifecycle**: Created during preview generation, resolved during GM editing, deleted after confirmation

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs) - focused on user workflow and preview/edit UX
- [x] Focused on user value and business needs - streamlined import with GM control
- [x] Written for non-technical stakeholders - uses plain language
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous - 58 FRs with clear acceptance criteria
- [x] Success criteria are measurable - performance targets, workflow steps verified
- [x] Scope is clearly bounded - NO chat, NO knowledge graphs, ONE-SHOT process, database-only writes
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated (58 FRs)
- [x] Entities identified (ImportJob, DuplicateCandidate)
- [x] Review checklist passed

---

## Dependencies and Assumptions

**Dependencies:**
- Feature 014 (Structured Categories): 13 category database tables must exist with defined schemas
- Feature 015 (Dashboard & UI): UI components for import dialog, preview table, inline editing
- Feature 008 (BYOLLM Configuration): LLM API credentials and model selection for AI extraction

**Assumptions:**
- User has configured BYOLLM settings before attempting import (Feature 008 blocking requirement)
- Campaign dashboard provides Import button/panel entry point
- File parsing libraries (pdf-parse, mammoth) handle standard document formats
- Fuzzy matching algorithm (Levenshtein distance or similar) available for deduplication
- Database supports atomic transactions for rollback on failure
- Preview table rendering uses virtualization for performance with large result sets

**Non-Goals:**
- Conversational chat with AI during import (Feature 005 approach) - this is stateless one-shot only
- Automatic knowledge graph population (Feature 006) - graphs are user-curated separately
- Multi-file import for non-recap types - one file per import job (except sequential recaps)
- Import job history or resume-later functionality - ephemeral process only
- Template-based extraction rules - AI handles all entity detection
- Automatic duplicate resolution - GM must manually review and resolve conflicts
- Real-time collaboration during import - single-user workflow only
- Import scheduling or automation - manual trigger only

---

**References:**
- Database schemas: Feature 014 (specs/014-create-the-database/)
- Dashboard UI: Feature 015 (specs/015-create-the-dashboard/)
- BYOLLM configuration: Feature 008 (specs/008-create-byollm-configuration/)
- Original conversational import: Feature 005 (specs/005-create-the-ai/) - different philosophy
- Information level filtering: Feature 004 (specs/004-create-a-tagging/)
- Knowledge graph architecture: Feature 006 (specs/006-create-the-knowledge/) - NOT populated by this feature
