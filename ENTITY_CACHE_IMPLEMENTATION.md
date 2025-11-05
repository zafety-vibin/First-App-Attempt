# EntityCacheContext Implementation

## Problem Solved
RelationshipCell was creating N+1 query problem by fetching ALL entities (limit=1000) for every cell to display 2-3 relationship names. If a table showed 20 quests with related NPCs, that was **20 × 1000 NPC records** fetched (20MB of data!).

## Solution
Created EntityCacheContext that:
1. Fetches entity list ONCE per category per campaign
2. Caches the results in memory with 5-minute TTL
3. RelationshipCell looks up entities from cache instead of fetching

## Performance Impact
**Before**: 20 cells × 1000 entities = 20,000 records fetched
**After**: 1 fetch × 1000 entities = 1,000 records fetched
**Reduction**: 95% fewer network requests, 95% less data transferred

## Files Created

### C:\Users\zmanl\Projects\vvd-mimic\frontend\src\contexts\EntityCacheContext.tsx
- `EntityCacheProvider`: React context provider with in-memory cache
- `useEntityCache`: Hook exposing `getEntity`, `prefetchCategory`, `clearCache`
- Cache key format: `{campaignId}:{category}`
- TTL: 5 minutes (300000ms)
- Data structure: Map<entityId, {id, name}>

## Files Modified

### C:\Users\zmanl\Projects\vvd-mimic\frontend\src\App.tsx
- Added import for `EntityCacheProvider`
- Wrapped app with `<EntityCacheProvider>` at top level (after AuthProvider, before ViewModeProvider)
- Provider hierarchy: AuthProvider > EntityCacheProvider > ViewModeProvider > InformationLevelProvider > CardProvider

### C:\Users\zmanl\Projects\vvd-mimic\frontend\src\components\table\RelationshipCell.tsx
- Removed `apiClient` import
- Added `useEntityCache` hook import
- Removed `loading` and `error` state
- Replaced direct API fetch with cache lookup:
  - Call `prefetchCategory(category, campaignId)` to ensure data is cached
  - Loop through `entityIds` and call `getEntity(category, id, campaignId)`
  - Build entity list from cache results
- Simplified loading state: show count while cache is loading

## Usage

No changes required for consumers of RelationshipCell. The component API remains identical:

```tsx
<RelationshipCell
  entityIds={["npc-123", "npc-456"]}
  category="npcs"
  campaignId={campaignId}
  maxDisplay={3}
  onClick={(id) => navigate(`/campaigns/${campaignId}/npcs/${id}`)}
/>
```

## Cache Behavior

1. **First render**:
   - RelationshipCell calls `prefetchCategory`
   - Context fetches all entities from API
   - Shows count temporarily ("3 NPCs")
   - Once cache populates, re-renders with names ("Elara, Marcus, Vex")

2. **Subsequent renders**:
   - Cache hit (if within 5 min)
   - Instant display of entity names
   - No network request

3. **Multiple cells same category**:
   - First cell triggers prefetch
   - Other cells use cached data immediately
   - **Only 1 API call** for all cells

4. **Cache invalidation**:
   - Automatic: 5-minute TTL
   - Manual: `clearCache()` from hook (if needed for CRUD operations)

## Testing Recommendations

1. **Network tab**: Verify only 1 request per category on page load
2. **Performance**: Measure page load time before/after
3. **Cache expiry**: Wait 5 minutes, verify re-fetch on next render
4. **Multiple categories**: Load table with relationships to NPCs, Locations, Factions - should see 3 requests total

## Future Enhancements

1. **Invalidation on CRUD**:
   - Call `clearCache()` after entity create/update/delete
   - Or implement selective cache invalidation by category

2. **Pagination support**:
   - Current implementation loads all entities (limit=1000)
   - Consider lazy loading for categories with >1000 entities

3. **Selective fetching**:
   - Instead of fetching ALL entities, could fetch only IDs needed
   - Requires backend endpoint: `GET /npcs?ids=id1,id2,id3`

4. **Persistence**:
   - Consider IndexedDB for cross-tab cache sharing
   - Would survive page refresh

## Rollback Plan

If issues arise, revert these 3 files:
1. Delete `C:\Users\zmanl\Projects\vvd-mimic\frontend\src\contexts\EntityCacheContext.tsx`
2. Revert `C:\Users\zmanl\Projects\vvd-mimic\frontend\src\App.tsx` (remove EntityCacheProvider)
3. Revert `C:\Users\zmanl\Projects\vvd-mimic\frontend\src\components\table\RelationshipCell.tsx` (restore direct API fetch)
