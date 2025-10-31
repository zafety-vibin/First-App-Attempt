# View Mode & Information Level Unification - Status

## Current State (Latest Updates)

### ✅ Completed:

**View Mode Unification:**
1. Type definition updated (shared/types/ViewMode.ts) - dm_view/player_view
2. Backend middleware simplified (viewMode.ts) - removed normalization
3. Frontend context updated (ViewModeContext.tsx) - uses unified values
4. Components updated (ViewModeToggle, BlockList, Dashboard) - dm_view checks
5. cards.ts defaults updated
6. ViewModeService.ts updated (via sed in container, needs git commit)

**Information Level Improvements:**
1. Row filtering fixed (all 13 categories filter by player_knowledge)
2. campaignId extraction fixed (query params work)
3. Quick-add simplified (name-only, edit other fields after)
4. Visibility dropdown updated (added "Contextual" null option, removed "System")
5. **✨ Dynamic custom levels loading** - EditableCell now loads custom levels from information_levels table
6. **✨ Custom levels display in dropdowns** - All user-created levels appear dynamically
7. **✨ System level filtered out** - Excluded from database dropdowns (wiki-only)
8. **✨ Debug console logs removed** - Cleaned up 🔄 logs from GenericCategoryListView

### ⚠️ Needs Fixing:

**Backend Files Modified in Container (Not in Git):**
- backend/src/services/ViewModeService.ts (sed changes need git add)

### 📋 Next Steps:

**Immediate:**
1. Copy ViewModeService.ts changes from container to git
2. Test dynamic custom levels in browser
3. Test view mode toggle works
4. Commit and push

**Information Level Unification (Deferred to Next Session):**
- Rename player_knowledge → visibility (13 migrations)
- Update all service/route references
- Add help UI explaining ownership model
- Support custom levels in databases

**Short-term (This Week):**
5. Add help tooltips explaining "Contextual" ownership model
6. Test hierarchical filtering for custom levels in player_view

**Long-term (Future Refactoring):**
- Rename player_knowledge → visibility (13 migrations)
- Update all service/route references
- Add help UI explaining ownership model

## Files Changed This Session:

**Pending Commit:**
1. frontend/src/components/pages/GenericCategoryListView.tsx (debug logs removed, campaignId passed)
2. frontend/src/components/table/CategoryTable.tsx (campaignId prop added)
3. frontend/src/components/table/EditableCell.tsx (dynamic custom levels implementation)
4. UNIFICATION_STATUS.md (this file)

**Uncommitted (in container):**
- backend/src/services/ViewModeService.ts (sed changes need git add)

## Testing Checklist:

**Core Functionality:**
- [ ] Login works
- [ ] View mode toggle works in database tables
- [ ] dm_only entities hide in player_view
- [ ] Wiki cards filter by hierarchical flag
- [ ] Database entities filter by player_knowledge
- [ ] Contextual (null) option appears in dropdown
- [ ] Quick-add creates with name only
- [ ] In-place editing works for all fields

**New Features (Dynamic Custom Levels):**
- [ ] Create custom information level in Settings
- [ ] Custom level appears in database visibility dropdowns
- [ ] Selecting custom level saves correctly
- [ ] Custom level name displays in badge
- [ ] System level does NOT appear in database dropdowns
- [ ] Custom hierarchical levels filter in player_view

## Implementation Summary:

**What Was Built:**
Dynamic custom information level support for database tables. Users can now:
1. Create custom levels (e.g., "Secret Plot Known to Faction A")
2. See them immediately in all database visibility dropdowns
3. Use them alongside default levels (Contextual, Common, Player, DM Only)
4. Custom levels auto-filter in player_view if marked hierarchical

**Technical Details:**
- EditableCell uses InformationLevelContext to load levels
- Loads once per campaign when component mounts
- Filters out 'system' level (wiki structural content only)
- Falls back to hardcoded defaults if levels haven't loaded
- Display logic checks custom levels first, then defaults

**Files Modified:** 3 frontend files, ~90 lines of code added
**Breaking Changes:** None - fully backward compatible
