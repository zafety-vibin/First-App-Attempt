# UX Polish & Minor Improvements TODO

This document tracks small UX improvements and polish items that are deferred to avoid distraction from core architecture work. These are "nice to have" enhancements that don't block functionality but would improve user experience.

**Status**: 🟡 Deferred for future polish pass

---

## Information Level Improvements

### 🐛 Custom Level Input Visibility Issue
**Context**: When creating a custom information level in Settings, the input text is not visible while typing.

**Proposed Enhancement**:
- Fix text color/contrast in custom information level input field
- Ensure proper visibility for all form inputs
- May be part of broader settings page redesign

**Files to Modify**:
- `frontend/src/pages/SettingsPage.tsx` or relevant settings component
- Associated CSS files

**Priority**: ⭐⭐ Medium (functional but usable)

**Note**: User mentioned not wanting the settings page looking like this anyway, so may be deferred to settings page redesign.

---

### 🎨 Custom Level Visual Indicators
**Context**: Custom information levels now appear in database dropdowns (commit e071607) but look identical to default levels.

**Proposed Enhancement**:
- Add color indicators/badges to custom levels in dropdown
- Show custom level colors from `information_levels.color` field
- Visual distinction: default levels vs custom levels

**Implementation Ideas**:
- Option 1: Color dot before label in dropdown
- Option 2: Colored border on dropdown option
- Option 3: Small badge icon indicating "custom"

**Files to Modify**:
- `frontend/src/components/table/EditableCell.tsx` (dropdown rendering)
- `frontend/src/components/table/EditableCell.css` (styling)

**Priority**: ⭐⭐ Medium

---

### ℹ️ "Contextual" Help Tooltip
**Context**: The null/empty visibility option is labeled "Contextual (freely available)" but users may not understand the ownership model.

**Proposed Enhancement**:
- Add help tooltip icon next to "Contextual" in dropdowns
- Tooltip explains: "Information freely available if context permits (e.g., recluse NPC's existence hidden until encountered)"
- Clarify difference between Contextual vs Common Knowledge

**Implementation Ideas**:
- Radix UI Tooltip component
- Small (i) icon with hover/click
- Brief explanation with example

**Files to Modify**:
- `frontend/src/components/table/EditableCell.tsx` (add tooltip)
- May need new component: `InformationLevelTooltip.tsx`

**Priority**: ⭐⭐⭐ High (prevents confusion)

---

### ✅ Custom Level Filtering - COMPLETE
**Fixed**: BaseCategoryService queries `information_levels.hierarchical` flag. Works correctly.

---

## Relationship Management UX

### 🔗 Inline Editing for Relationships
**Context**: Relationship fields (locations, allied_factions, related_npcs, etc.) can only be edited via detail page edit form. Other fields have double-click inline editing.

**Current Flow**:
1. Click entity name → detail page
2. Click "Edit" button (easy to miss!)
3. Scroll to relationship field
4. Use multi-select dropdown
5. Save

**Proposed Enhancement**:
- Add inline editing for relationship fields like other columns
- Double-click relationship cell → opens multi-select modal/dropdown
- Select entities, auto-saves
- Matches pattern for tags, dropdowns, text fields

**Files to Modify**:
- `frontend/src/components/table/EditableCell.tsx` (add 'relationships' type support)
- `frontend/src/components/table/RelationshipCell.tsx` (make editable)
- May need new component: `RelationshipEditor.tsx` (modal with multi-select)

**Priority**: ⭐⭐⭐ High (consistency with other fields, discoverability)

**Note**: Junction tables work perfectly via edit form, but inline would match user expectations for field editing.

---

### 🎯 Bulk Edit Button Discoverability
**Context**: When entities are selected via checkboxes, user expects edit functionality but it's not visible.

**Current**: Bulk actions toolbar shows Delete, Set Visibility, Add Tags - no Edit button

**Proposed Enhancement**:
- Add "Edit Selected" button to BulkActionsToolbar
- Opens modal to batch-edit common fields
- Or: Add individual row edit button (pencil icon) next to checkbox
- Make edit functionality more discoverable

**Files to Modify**:
- `frontend/src/components/table/BulkActionsToolbar.tsx`
- Or add edit icon to table rows

**Priority**: ⭐⭐ Medium (discoverability issue)

**Note**: Edit functionality exists via detail page, just not obvious where it is.

---

## Dashboard & Widgets

### 🗺️ Multiple Maps Support for Map Widget
**Context**: Locations can have multiple map uploads (Feature 007), but the dashboard map widget only displays the first uploaded image with no way to select other maps.

**Proposed Enhancement**:
- Add map selector dropdown/carousel to map widget
- Show "Map 1 of 3" indicator
- Arrow buttons to cycle through available maps
- Display map name/description if available
- Remember selected map per location in widget config

**Files to Modify**:
- Dashboard map widget component
- Widget data service to fetch all maps, not just first
- Widget config to store selected map index

**Priority**: ⭐⭐ Medium (functional limitation)

**Note**: Currently, if a location has 3 maps uploaded, only the first one is accessible via dashboard widget. Users must navigate to the location detail page to see other maps.

---

## Database Table UX

### 🔧 Autosave Focus Loss in Inline Editing - IN PROGRESS
**Context**: When editing fields inline in database tables, the autosave functionality removes focus from the editor after each save, forcing users to click back into the field after typing each word.

**Current Issue**:
1. Double-click field to edit
2. Type a word
3. Autosave triggers (500ms delay)
4. Focus is removed from editor
5. Must click back into field to continue typing
6. Repeat for every word - very frustrating

**Proposed Fix**:
- Maintain focus on the editor during autosave operation
- Only blur/unfocus when user explicitly clicks away or presses Escape
- Ensure cursor position is preserved during save
- Consider debouncing autosave to reduce frequency

**Files to Modify**:
- `frontend/src/components/table/EditableCell.tsx` (autosave focus handling)
- May need to refactor save callback to maintain focus state

**Priority**: ⭐⭐⭐ High (actively breaks editing workflow)

**Note**: This significantly impacts usability of inline editing feature. User has to click into field repeatedly, making it nearly impossible to type full sentences.

---

### 📝 Markdown Syntax Highlighting for Textareas
**Context**: Long text fields (description, dm_notes, etc.) are plain textareas with no formatting hints.

**Proposed Enhancement**:
- Add syntax highlighting for markdown: `**bold**`, `*italic*`, `# headers`, `- lists`
- Visual color coding while typing
- Still stores as plain text (not rich text)
- Makes long-form content more readable while editing

**Implementation**:
- Use CodeMirror or react-simplemde-editor
- Markdown mode with preview disabled (just highlighting)
- Apply to EditableCell textarea mode

**Files to Modify**:
- `frontend/src/components/table/EditableCell.tsx` (textarea rendering)
- Add dependency: `@uiw/react-codemirror` or similar

**Priority**: ⭐⭐ Medium

---

### 📐 Fullscreen Editor Modal for Text Fields
**Context**: Editing long text in small table cells is cramped and hard to read.

**Proposed Enhancement**:
- Double-click text field with Shift key → Opens fullscreen modal editor
- Clean document view with TipTap rich text or markdown editor
- Formatting toolbar (bold, italic, headers, lists)
- Save/Cancel buttons
- Supports both markdown and rich text modes

**Implementation**:
- Radix Dialog (fullscreen variant)
- TipTap editor in markdown mode
- Convert TEXT field ↔ markdown/TipTap JSON
- Keyboard shortcut: Shift+Enter to save

**Files to Create**:
- `frontend/src/components/table/FullscreenTextEditor.tsx` (new modal)
- Update `EditableCell.tsx` to detect Shift+double-click

**Priority**: ⭐⭐⭐ High (major UX improvement for long-form content)

---

### 📏 Column Width Persistence
**Context**: Users can resize columns but widths reset on page refresh.

**Proposed Enhancement**:
- Persist column widths to localStorage or category_landing_configs
- Restore on page load
- Per-category, per-user preferences

**Files to Modify**:
- `frontend/src/components/table/CategoryTable.tsx`
- `frontend/src/hooks/useCategoryLandingCanvas.ts` (if using configs)

**Priority**: ⭐ Low

---

### 🔤 Better Empty State Messages
**Context**: Generic "No items found" message for all categories.

**Proposed Enhancement**:
- Category-specific empty states: "No NPCs yet", "No locations yet"
- Add helpful action buttons: "Create your first NPC"
- Maybe illustration or icon

**Files to Modify**:
- `frontend/src/components/common/EmptyState.tsx`
- `frontend/src/components/pages/GenericCategoryListView.tsx`

**Priority**: ⭐ Low

---

## View Mode Toggle

### 👁️ View Mode Icon Improvement
**Context**: View mode toggle shows text "DM View" / "Player View" but could be more visual.

**Proposed Enhancement**:
- Add eye icon (eye-off for player view)
- Color coding: blue for DM, green for player
- Tooltip explaining current mode
- Eye icon on wiki side need UI improvements

**Files to Modify**:
- `frontend/src/components/pages/GenericCategoryListView.tsx` (toggle button)
- `frontend/src/components/ViewModeToggle.tsx` (if updating global toggle too)

**Priority**: ⭐ Low

---

## Quick-Add Row

### ⚡ Quick-Add Enter Key Support
**Context**: Quick-add row requires clicking "Add" button.

**Proposed Enhancement**:
- Press Enter in name field to submit
- Auto-focus name field when quick-add expands
- Better keyboard navigation

**Files to Modify**:
- `frontend/src/components/table/QuickAddRow.tsx`

**Priority**: ⭐⭐ Medium (**Note**: Not sure if this is the functionality I truly want. What I am imagining is when you click "add below..." it autofocuses the name field sure, but I want every field to be active the moment before you press submit entry so you can add to every field with just 1 click instead of double clicking inside each and when you click submit it adds all fields with data at once and then unfocuses.)

---

### 🔁 Quick-Add Stays Visible After Creation
**Context**: Quick-add collapses after creation, requiring re-expand for multiple adds.

**Proposed Enhancement**:
- Add checkbox/toggle: "Keep open after adding" (**Note**: My vote if we support adding multiple entries without submitting one or all at once, add below should always be present even when a current field is not finished submitting I think you should be able and allowed to begin on a second entry or third etc. entries and click submit one by one or all at once.)
- Or: Quick-add stays open, clears fields
- User preference in localStorage

**Files to Modify**:
- `frontend/src/components/table/QuickAddRow.tsx`

**Priority**: ⭐ Low

---

## Document-to-Database Workflow

### 📝 Schema-Driven Document Editor
**Context**: Need a fluid way to author content in a document format and seamlessly populate database entries without switching between editing modes. Currently, users must use forms to create/edit database entries, which breaks the creative flow when drafting campaign content.

**Proposed Feature**:
A document editor that bridges free-form writing with structured database entry creation/editing. Users can write naturally, then highlight text to populate database fields.

**Core Functionality**:
1. **Document Editor Page**:
   - Blank canvas accessible from database/category pages
   - Full TipTap rich text editing with slash commands (from wiki feature - Feature 003)
   - Easy formatting: headings, lists, bold/italic, etc.
   - Natural writing flow without form constraints

2. **Schema Sidebar**:
   - When editing within database context, sidebar displays:
     - Current category's schema fields
     - Field types and requirements
     - Current values (if editing existing entry)
     - Visual indicators for filled vs empty fields
   - Always visible to guide content creation

3. **Highlight-to-Create Workflow**:
   - Highlight text in document
   - Right-click or toolbar button: "Create New [Category]"
   - Modal appears with schema fields
   - Highlighted text auto-populates appropriate field (e.g., name or description)
   - Fill remaining fields
   - Click "Create" - entry added to database
   - Document text can be linked/tagged to created entry

4. **Highlight-to-Update Workflow**:
   - Highlight text in document
   - Right-click or toolbar button: "Update Existing Entry"
   - Search/select existing entry from dropdown
   - Choose target field to update
   - **Merge or Overwrite options**:
     - Merge: Append highlighted text to existing field value
     - Overwrite: Replace field value with highlighted text
   - Preview changes before confirming
   - Auto-save with confirmation

5. **Visual Feedback**:
   - Highlighted text that's been "sent" to database shows subtle indicator (background tint, icon)
   - Hover over tagged text shows which entry/field it populated
   - Quick-jump from document to related database entry

**Use Case Example**:
User writes: "The towering city of Ironforge sits beneath the Frostpeak Mountains, ruled by King Thrain Ironhammer, a stern dwarf with a legendary axe named Skullcleaver."

Workflow:
1. Highlight "Ironforge" → Create Location → auto-fills name field → add description/tags → Create
2. Highlight "Frostpeak Mountains" → Create Location → auto-fills name → Create
3. Highlight "King Thrain Ironhammer, a stern dwarf with a legendary axe" → Create NPC → use portion for name, portion for description → Create
4. Highlight "Skullcleaver" → Create Item → auto-fills name → Create
5. Later: Highlight additional text about Ironforge → Update Existing → select Ironforge entry → choose "description" field → Merge (appends new details)

**Technical Implementation**:
- Extend TipTap with custom mark/node for database-linked text
- Add ProseMirror commands for highlight-to-create/update actions
- Schema introspection: read category field definitions to build sidebar
- API integration: use existing category CRUD endpoints (BaseCategoryService)
- State management: track document-to-entry mappings
- Modal/dialog components for field selection and merge/overwrite choice

**Files to Create/Modify**:
- `frontend/src/pages/DocumentEditorPage.tsx` (new)
- `frontend/src/components/document/Schemasidebar.tsx` (new)
- `frontend/src/components/document/HighlightActions.tsx` (new - toolbar/context menu)
- `frontend/src/components/document/EntryLinkMark.tsx` (new - TipTap custom mark)
- `frontend/src/components/document/CreateEntryModal.tsx` (new)
- `frontend/src/components/document/UpdateEntryModal.tsx` (new - with merge/overwrite)
- `frontend/src/hooks/useDocumentToDatabase.ts` (new - orchestration logic)
- `frontend/src/config/tiptap.ts` (extend with document-to-database extensions)
- Backend: potentially new route for document templates/saving (optional)

**Priority**: ⭐⭐⭐ High (major workflow enhancement, addresses creative flow vs structured data tension)

**Benefits**:
- Reduces friction between creative writing and data entry
- Allows GMs to draft content naturally, then structure it afterward
- Enables iterative refinement (write → tag → enhance → re-tag)
- Leverages existing wiki editor (slash commands) users already know
- Makes database population feel less like "work"

**Alternative Names**:
- Document-to-Database Flow
- Schema Painter (original suggestion)
- Content Scaffolding Editor
- Freeform Database Composer
- Write-Then-Structure Editor

**Note**: This is a substantial feature that could be its own numbered feature (e.g., Feature 022) rather than a UX polish item. Consider full spec if prioritized.

---

## General Polish

### ⌨️ Keyboard Shortcuts
**Context**: Many actions require clicking.

**Proposed Enhancement**:
- Global shortcuts: N for new, E for edit, D for delete
- Vim-style navigation (j/k for up/down)
- Shortcut legend (? key)

**Priority**: ⭐ Low (nice for power users)

---

### 🎨 Theme/Dark Mode
**Context**: Only default light theme exists.

**Proposed Enhancement**:
- Dark mode toggle
- Theme persistence
- WCAG contrast ratios

**Priority**: ⭐ Low (cosmetic)

---

## Pre-Completion Roadblock Items

### 📋 Complete Tool Description Review
**Context**: MCP tools (Feature 011) and their schemas may have outdated descriptions that don't reflect current architecture.

**Required Action**:
- Review all 29 MCP tool descriptions in `backend/src/mcp/tools/`
- Review all tool schemas in `backend/src/mcp/schemas/`
- Verify descriptions match current architecture (post-unification)
- Update any references to old view mode values (dm/player)
- Ensure parameter descriptions are accurate
- Check that examples reflect current database schema

**Priority**: 🚨 BLOCKER (must complete before saying we're 100% done)

**Files to Review**:
- `backend/src/mcp/tools/` - All 29 tool implementations
- `backend/src/mcp/schemas/` - All Zod schemas
- `backend/src/mcp/server.ts` - Tool registration and descriptions

**Note**: This is a comprehensive audit task that ensures external tools (Claude Desktop) have accurate documentation and understand the current system architecture correctly.

---

## Implementation Strategy

**When to tackle these**:
1. After core architecture is stable
2. During dedicated UX polish sprint
3. When user feedback prioritizes specific items
4. When adding related features anyway (piggyback)

**How to prioritize**:
- ⭐⭐⭐ High = Fixes functional gaps or major confusion
- ⭐⭐ Medium = Noticeable QoL improvement
- ⭐ Low = Nice to have, minor polish

**Process**:
1. Pick item from list
2. Create feature branch if sufficiently complex
3. Implement + test
4. Mark complete here with commit hash
5. Remove from list or mark ✅

---

## Completed Items

*None yet - this is the initial list*

---

## Notes

- This file should be version controlled
- Feel free to add new items as you think of them
- Mark items as ✅ with commit hash when done
- Archive old items to keep list manageable
- Some items may graduate to full features if scope grows
