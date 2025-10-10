# Wiki Portal Quickstart & Test Scenarios

**Feature**: 019-create-a-wiki
**Purpose**: E2E validation workflows for wiki portal implementation

---

## Prerequisites

```bash
# Ensure all services running
docker-compose up

# Verify Feature 003 (card architecture) implemented
# Verify Feature 004 (information levels) implemented
# Verify Feature 015 (dashboard sidebar) implemented
```

---

## Test Scenario 1: Portal Navigation & Wiki Access (8 steps)

**Validates**: FR-001 to FR-006 (portal access, navigation, state preservation)

```bash
# Setup
1. Login as GM user
2. Navigate to campaign dashboard (database view)
3. Scroll to specific location, apply filter

# Execute
4. Click "Wiki" button in sidebar
   → Expect: URL changes to /campaign/{id}/wiki
   → Expect: "Back to Dashboard" button visible at top
   → Expect: Wiki root cards displayed (hierarchical tree)

5. Click on a wiki card to open editor
   → Expect: TipTap rich text editor loads
   → Expect: Card content displays with formatting

6. Click "Back to Dashboard" button
   → Expect: Returns to database view
   → Expect: Previous scroll position restored
   → Expect: Previous filters restored

# Verify
7. Check sessionStorage for 'dashboardState' key
   → Expect: Contains scrollY, filters, categoryId

8. Navigate back to wiki
   → Expect: Wiki state independent (new session)
```

**Performance Target**: Portal transition <300ms (FR-053 to FR-058 related)

---

## Test Scenario 2: Wiki Card Creation & Rich Text Editing (11 steps)

**Validates**: FR-007 to FR-014 (card CRUD, rich text, auto-save, versioning)

```bash
# Execute
1. In wiki view, click "New Card" button
   → Expect: Card creation form appears

2. Enter title: "Session Planning Notes"
   → Expect: Title field validates (max 500 chars)

3. Open rich text editor
4. Add H1 heading: "Dragon Encounter"
5. Add bold text: "Important plot point"
6. Insert bullet list with 3 items
7. Use slash command "/table" to insert table
   → Expect: TipTap slash command palette appears
   → Expect: Table inserted at cursor position

8. Wait 30 seconds (auto-save trigger)
   → Expect: Save indicator shows "Saving..."
   → Expect: Save indicator changes to "Saved"

9. Check database
   → Expect: wiki_cards table has new row
   → Expect: content field contains TipTap JSON
   → Expect: version = 1

10. Edit content again, add paragraph
11. Wait 30s for auto-save
    → Expect: version increments to 2
    → Expect: wiki_card_versions table has 1 backup (version 1)
```

**Performance Target**: Card creation <200ms (FR-053)

---

## Test Scenario 3: Wiki Hierarchy Organization (9 steps)

**Validates**: FR-015 to FR-022 (hierarchy, drag-drop, circular prevention)

```bash
# Setup
1. Create 3 wiki cards:
   - "World Building" (root)
   - "Geography" (root)
   - "History" (root)

# Execute
2. Drag "Geography" card onto "World Building"
   → Expect: "Geography" becomes child of "World Building"
   → Expect: Hierarchy updates in wiki_hierarchy table

3. Create "Regions" card
4. Nest "Regions" under "Geography"
   → Expect: 2-level hierarchy: World Building → Geography → Regions

5. Attempt to drag "World Building" under "Regions" (circular reference)
   → Expect: Error message "Circular reference detected"
   → Expect: Move operation blocked
   → Expect: Hierarchy unchanged

6. Reorder siblings: drag "History" above "Geography"
   → Expect: order_index values update
   → Expect: Display order reflects change

7. Delete "World Building" with cascade option
   → Expect: Confirmation prompt
   → Expect: "World Building", "Geography", "Regions" all deleted
   → Expect: wiki_hierarchy entries removed

8. Delete "History" with orphan option
   → Expect: Child cards become root level
   → Expect: hierarchy entries updated (parent = NULL)

9. Verify breadcrumb navigation
   → Create nested structure: A → B → C
   → Click on "C"
   → Expect: Breadcrumb shows "A / B / C"
```

**Performance Target**: Hierarchy navigation <150ms (FR-055)

---

## Test Scenario 4: Information Level Filtering (9 steps)

**Validates**: FR-023 to FR-028 (view mode filtering, bulk updates)

```bash
# Setup
1. Create 5 wiki cards:
   - "Public Lore" (common_knowledge)
   - "Player Handout" (player_knowledge)
   - "Secret Plot" (dm_secret)
   - "Hidden NPC" (dm_secret)
   - "Campaign Notes" (dm_secret)

# Execute
2. View wiki in DM View mode
   → Expect: All 5 cards visible

3. Toggle to Player View mode
   → Expect: Only "Public Lore" and "Player Handout" visible (2 cards)
   → Expect: 3 dm_secret cards hidden

4. Select "Secret Plot" and "Hidden NPC"
5. Bulk update information level to "player_knowledge"
   → Expect: Bulk update form appears
   → Expect: Checkbox "Apply to children?"

6. Apply update
   → Expect: 2 cards now player_knowledge
   → Expect: Player View shows 4 cards now

7. Create new card without specifying level
   → Expect: Defaults to common_knowledge

8. Change "Campaign Notes" level with recursive option
   → Create child "Secret Details"
   → Change parent to player_knowledge with recursive
   → Expect: Both parent and child updated

9. Verify database
   → SELECT * FROM wiki_cards WHERE player_knowledge = 'dm_secret'
   → Expect: Query executes < 300ms for 100 cards (FR-057)
```

---

## Test Scenario 5: Slash Commands & Database Embeds (10 steps)

**Validates**: FR-029 to FR-040 (slash commands, embedded database views)

```bash
# Execute
1. Create wiki card "NPC Reference"
2. Type "/" in editor
   → Expect: Slash command palette appears within 50ms (FR-056)

3. Type "database"
   → Expect: Palette filters to "/database" command

4. Select "/database"
   → Expect: Database view type prompt (table/list/gallery/kanban)

5. Select "table" view
   → Expect: Embedded table interface appears
   → Expect: "Add Column" and "Add Row" buttons visible

6. Add columns: Name (text), Role (text), Location (text)
7. Add 5 NPC rows with data
8. Switch view to "kanban"
   → Expect: Same data renders as kanban board
   → Expect: Columns based on "Role" field

9. Add 100+ rows to embedded database
   → Expect: Pagination appears (FR-039)
   → Expect: Performance warning if applicable

10. Verify content storage
    → Check wiki_cards.content field
    → Expect: JSONB contains databaseEmbed node with schema + data
```

---

## Test Scenario 6: AI Context Exclusion Validation (10 steps)

**Validates**: FR-048 to FR-052 (wiki NOT used for AI context)

```bash
# Setup
1. Create 10 wiki cards with detailed world-building notes
2. Create 15 database NPCs (via Features 014/015)

# Execute
3. Use Feature 018 External API tool
4. Send query: "Show all NPCs"
   → Expect: AI queries npcs table only
   → Expect: Returns 15 database NPCs
   → Expect: wiki_cards table NOT queried

5. Check MCP tool logs
   → SELECT * FROM mcp_tool_logs WHERE tool_name LIKE '%wiki%'
   → Expect: No wiki queries logged

6. Use Feature 017 Stateless Import
7. Upload session recap PDF
   → Expect: Import writes to database tables
   → Expect: NO wiki_cards entries created

8. Manually create wiki card from imported data
   → GM copies NPC from database, pastes into wiki card
   → Expect: Manual action only (no auto-sync)

9. Verify documentation
   → Check Feature 018 tool descriptions
   → Expect: Comments state "wiki excluded from AI context"

10. Test campaign export
    → Export campaign data
    → Expect: Backup includes both wiki_cards AND database tables
    → Expect: Clean separation visible in export file
```

---

## Test Scenario 7: Separate Storage Validation (10 steps)

**Validates**: FR-041 to FR-047 (wiki and database separation)

```bash
# Setup
1. Create 8 wiki cards
2. Create 12 database NPCs

# Execute
3. Delete wiki card "Session Notes"
   → Expect: wiki_cards count decrements to 7
   → Expect: Database NPCs unchanged (still 12)

4. Delete database NPC "Marcus"
   → Expect: npcs count decrements to 11
   → Expect: Wiki cards unchanged (still 7)

5. Check database schema
   → PRAGMA table_info(wiki_cards)
   → PRAGMA table_info(npcs)
   → Expect: Separate schemas, no shared columns

6. Verify foreign key constraints
   → wiki_cards.campaign_id → campaigns
   → npcs.campaign_id → campaigns
   → Expect: Both reference same campaigns table

7. Test campaign deletion cascade
   → Delete campaign
   → Expect: All wiki_cards for campaign deleted
   → Expect: All npcs for campaign deleted
   → Expect: Clean cascade (no orphaned data)

8. Test backup/restore
   → Export database file
   → Check file size
   → Expect: Includes both wiki_cards and npcs tables

9. Restore from backup
   → Import database file
   → Expect: Wiki cards restored
   → Expect: Database entities restored

10. Verify ID space separation
    → Create wiki_card and NPC with same name
    → Expect: Different ID values (wiki_card_id vs npc_id)
    → Expect: No ID conflicts
```

---

## Test Scenario 8: Performance Validation (6 steps)

**Validates**: FR-053 to FR-058 (performance targets)

```bash
# Setup
1. Create 100 wiki cards in hierarchical structure
2. Apply various information levels

# Execute & Measure
3. Create new wiki card
   → Expect: Completes within 200ms (FR-053)

4. Open card with 5000 words of rich text
   → Expect: Renders within 100ms (FR-054)

5. Expand/collapse 20-level deep hierarchy
   → Expect: Responds within 150ms (FR-055)

6. Toggle view mode (DM → Player) with 100 cards
   → Expect: Filters within 300ms (FR-057)

# Verify
→ All performance targets met per spec requirements
```

---

## Database Verification Queries

```sql
-- Verify wiki_cards table structure
SELECT sql FROM sqlite_master WHERE name = 'wiki_cards';

-- Check card count by campaign
SELECT campaign_id, COUNT(*) FROM wiki_cards GROUP BY campaign_id;

-- Verify hierarchy integrity
SELECT COUNT(*) FROM wiki_hierarchy
WHERE child_wiki_card_id NOT IN (SELECT wiki_card_id FROM wiki_cards);
-- Expect: 0 (no orphaned hierarchy entries)

-- Check information level distribution
SELECT player_knowledge, COUNT(*) FROM wiki_cards GROUP BY player_knowledge;

-- Verify version tracking
SELECT wiki_card_id, version FROM wiki_cards WHERE version > 1;

-- Check auto-save timestamps
SELECT wiki_card_id, updated_at - created_at as edit_duration
FROM wiki_cards
WHERE updated_at > created_at;
```

---

## Success Criteria

**All scenarios pass** = Feature 019 implementation complete ✅

- Portal navigation smooth (sessionStorage state preservation)
- Rich text editing functional (TipTap integration)
- Hierarchy operations valid (circular prevention, cascades)
- Information filtering works (view mode toggle)
- Slash commands execute (database embeds render)
- AI context exclusion enforced (wiki NOT queried)
- Separate storage confirmed (no data mixing)
- Performance targets met (<200ms create, <300ms filter)

---

## Troubleshooting

**Portal navigation fails**:
- Check React Router routes for `/campaign/:id/wiki`
- Verify sessionStorage API available (browser support)

**Rich text not saving**:
- Check 30s debounce timer in useAutoSave hook
- Verify TipTap JSON schema validation

**Circular reference not detected**:
- Check adjacency list traversal in WikiCardService.validateHierarchy()
- Verify recursive CTE query in database

**View mode filtering wrong**:
- Check InformationLevelContext integration
- Verify wiki_cards.player_knowledge field populated

**Performance targets missed**:
- Check database indexes (idx_wiki_cards_campaign, idx_wiki_hierarchy_parent)
- Profile slow queries with EXPLAIN QUERY PLAN

---

**References**:
- Feature spec: `specs/019-create-a-wiki/spec.md` (acceptance scenarios)
- API contracts: `specs/019-create-a-wiki/contracts/wiki-cards.yaml`
- Data model: `specs/019-create-a-wiki/data-model.md`
