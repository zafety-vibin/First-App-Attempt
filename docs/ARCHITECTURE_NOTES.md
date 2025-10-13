# Architecture Notes

## Information Filtering Systems

**Status**: INCOMPLETE - Needs architecture review

**Issue**: Two potentially conflicting view mode systems:

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

**Important Note from User**:
> "they were intentionally setup like that because they were different systems. we shouldn't attempt to unify the information filtering between the databases and the cards."

**Current Bug**: Information filtering not working (toggling view mode has no effect)

**Potential Solution** (user suggestion):
> "If anything we should simplify the wiki to only have visible vs hidden content because the wiki isn't being referenced by any AI to inform their context so the only view concern would be DM content vs. player content which a GM who's making the wiki could manage easily."

- Wiki doesn't need complex information levels (System, Common, Player, DM Secret)
- Simplify to binary: Visible to players vs. Hidden (DM-only)
- No AI context usage for wiki, unlike database categories

**Action Items** (for later):
1. Investigate why information filtering toggle isn't working
2. Decide: Keep two separate systems OR unify with clear boundaries
3. Consider simplifying wiki to visible/hidden binary
4. Document the intended architecture clearly

**Files to Review**:
- `frontend/src/services/apiClient.ts` (X-View-Mode header logic)
- `frontend/src/contexts/ViewModeContext.tsx` (Feature 004 wiki filtering)
- `frontend/src/contexts/InformationLevelContext.tsx` (Feature 004 information levels)
- Backend viewMode middleware (validates dm/player, not dm_view/player_view)

**Created**: 2025-10-13 (during Feature 015 bug fixing session)
