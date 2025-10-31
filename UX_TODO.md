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

### 🔍 Custom Level Filtering in Player View
**Context**: Custom hierarchical levels should auto-hide in player_view, but backend currently only filters hardcoded values.

**Proposed Enhancement**:
- Update BaseCategoryService to check `information_levels.hierarchical` flag
- Filter ANY hierarchical level (not just dm_only)
- Enables custom secret levels to work correctly

**Files to Modify**:
- `backend/src/services/BaseCategoryService.ts` (list method)
- `backend/src/middleware/informationFilter.ts` (query builder)

**Priority**: ⭐⭐⭐ High (functional gap)

**Note**: This is mentioned in UNIFICATION_STATUS.md as next step. (**Note**: I believe the filtering is working as intended based on my testing. It is filtering the hierarchical custom information levels and displaying them. But review if code says otherwise or it is missing something.)

---

## Database Table UX

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
