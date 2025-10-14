# Architecture Notes

## Information Filtering Systems

**Status**: ✅ RESOLVED (2025-10-13)

**Architecture**: Two independent view mode systems working as intended:

### System 1: Database Categories (Feature 014/015)
- Uses: `dm_view` / `player_view` (with `_view` suffix)
- Storage: localStorage `viewMode_{campaignId}`
- Header: `X-View-Mode: dm` or `X-View-Mode: player` (suffix stripped in apiClient.ts)
- Purpose: Filter dm_* fields in database category responses
- Affects: NPCs, Factions, Locations, Quests, etc. (structured database)

### System 2: Wiki Cards (Feature 003/004)
- Uses: `dm` / `player` (no suffix)
- Storage: InformationLevelContext
- Purpose: Filter hierarchical cards based on information_level_id
- Affects: Wiki pages, databases, images (card-based content)

**Important Design Principle**:
> "they were intentionally setup like that because they were different systems. we shouldn't attempt to unify the information filtering between the databases and the cards."

## Resolution

**Root Cause**: GenericCategoryListView was incorrectly using wiki's `ViewModeContext` instead of database view mode system.

**Fix Applied** (commit 5198d3e):
1. Replaced `ViewModeContext` import with local state using `getViewMode`/`setViewMode` from apiClient.ts
2. Added column filtering to hide all `dm_*` columns in `player_view`
3. Added refresh trigger to re-fetch data when view mode toggles
4. Fixed button text to correctly display current mode

**Testing**:
- ✅ Tested on NPCs category page
- ✅ dm_* columns (dm_secrets, dm_plot_relevance) correctly hide in Player View
- ✅ Button text updates: "DM View" → "Player View"
- ✅ Backend X-View-Mode header sent correctly

**Files Modified**:
- `frontend/src/components/pages/GenericCategoryListView.tsx` - Fixed view mode system

**Future Consideration** (user suggestion):
> "If anything we should simplify the wiki to only have visible vs hidden content because the wiki isn't being referenced by any AI to inform their context"

- Wiki may not need 4-level information system (System, Common, Player, DM Secret)
- Consider simplifying to binary: Visible vs. Hidden
- No AI context usage for wiki (unlike database categories used by Planning/Import AI)
- Defer to future feature/refactor

**Created**: 2025-10-13 (during Feature 015 bug fixing session)
**Resolved**: 2025-10-13 (same session)
