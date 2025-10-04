# Feature 005 - Comprehensive Testing Checklist

**Status**: Ready for testing
**Date**: 2025-10-03

---

## 🎯 Pre-Testing Setup

### ✅ Installation
- [X] Backend dependencies installed (`npm install`)
- [ ] Frontend dependencies installed (`cd frontend && npm install`)
- [ ] Docker containers running (`docker-compose up`)
- [ ] Database migrations applied

### ✅ BYOLLM Configuration (REQUIRED)
- [ ] Navigate to Settings → BYOLLM Configuration
- [ ] Add OpenAI API key OR Anthropic API key
- [ ] Select model (GPT-4, Claude 3.5 Sonnet, etc.)
- [ ] Test connection (green checkmark appears)
- [ ] Verify credits display shows balance

**⚠️ BLOCKER**: Import/Planning AI will NOT work without valid BYOLLM config!

---

## 🧪 Phase 1: Basic Functionality Tests

### 1.1 Import Tab - UI & Access
- [ ] Click "📥 Import" button on campaign homepage
- [ ] Verify pull-down overlay appears from top
- [ ] Verify overlay does NOT block view of campaign cards below
- [ ] Press `Ctrl+I` → Import tab opens
- [ ] Press `Esc` → Import tab closes
- [ ] Click Planning button → Import tab closes (only one tab at a time)

### 1.2 Planning Tab - UI & Access
- [ ] Click "🗺️ Planning" button on campaign homepage
- [ ] Verify pull-down overlay appears
- [ ] Press `Ctrl+P` → Planning tab opens
- [ ] Press `Esc` → Planning tab closes
- [ ] Verify tabs have separate state (messages don't mix)

### 1.3 File Upload
- [ ] Upload `.txt` file → Verify accepted
- [ ] Upload `.md` file → Verify accepted
- [ ] Upload `.docx` file → Verify accepted
- [ ] Upload `.pdf` file → Verify accepted
- [ ] Upload `.jpg` file → Verify REJECTED (not supported)
- [ ] Upload file >10MB → Verify warning/rejection

---

## 🤖 Phase 2: AI Integration Tests (MCP + LLM)

### 2.1 Import AI - Entity Extraction
Test with sample session recap:

```
Session 12 - The Council Vote

The party arrived in Waterdeep and immediately sought an audience with the Council of Lords.
Dagult Neverember, Open Lord of Waterdeep, presided over the emergency meeting.
The council voted 7-5 to support the party's mission against the Zhentarim.

New NPCs introduced:
- Lady Laeral Silverhand (council member, secretly a Harper agent)
- Mirt the Moneylender (gruff but helpful)

The party stayed at the Yawning Portal Inn. Blackstaff Tower was mentioned as a potential resource.
```

**Expected Behavior**:
- [ ] AI extracts entities: Dagult Neverember, Laeral Silverhand, Mirt, Council of Lords, Zhentarim, Waterdeep, Yawning Portal Inn, Blackstaff Tower
- [ ] AI asks clarifying questions: "Is this the same Council of Lords from Session 8?" (if exists)
- [ ] AI distinguishes: UPDATE (Dagult Neverember if exists) vs NEW (Laeral Silverhand, Mirt)
- [ ] AI suggests placement: "Add to Characters database", "Add to Locations page", etc.

### 2.2 Import AI - Fuzzy Deduplication
Test with entity variants:

```
Today we met Lord Neverember again. He mentioned his old friend Dagult.
```

**Expected Behavior**:
- [ ] AI recognizes "Lord Neverember" = "Dagult Neverember" (Levenshtein distance >0.7)
- [ ] AI suggests UPDATE not NEW
- [ ] AI shows fuzzy match score in approval summary

### 2.3 Import AI - MCP Tool Integration
**Monitor backend logs for tool calls**:

- [ ] AI calls `search_cards` to find existing entities
- [ ] AI calls `create_card` for new NPCs/locations
- [ ] AI calls `update_card` for existing entities
- [ ] AI calls `update_graph` to add nodes/edges
- [ ] Verify NO errors in tool execution
- [ ] Verify tool results returned to LLM correctly

### 2.4 Planning AI - Graph Context
Chat with Planning AI:

```
What plot threads involve the Zhentarim?
```

**Expected Behavior**:
- [ ] AI calls `query_graph` to search Political-Web and Campaign-Story graphs
- [ ] AI returns nodes/edges related to "Zhentarim"
- [ ] Response references specific cards from campaign
- [ ] Response shows understanding of relationships (alliances, rivalries)

### 2.5 Planning AI - Immediate Graph Updates
Chat:

```
The Zhentarim are now secretly allied with the Red Wizards of Thay. This is a major development.
```

**Expected Behavior**:
- [ ] AI calls `update_graph` immediately (NO approval needed)
- [ ] New edge created: Zhentarim → allied_with → Red Wizards
- [ ] Edge tagged as "active" and "party-relevant"
- [ ] Graph viewer shows update in real-time

---

## 🧠 Phase 3: Knowledge Graph Tests

### 3.1 Graph Initialization
- [ ] Create new campaign → Navigate to Graph Explorer
- [ ] Verify 4 graphs exist: Geographical, Political-Web, World-Foundations, Campaign-Story
- [ ] All graphs should be empty initially

### 3.2 Active Filtering (Political-Web)
Setup:
1. Import Session 7, 8, 9, 10, 11 (old sessions)
2. Import Session 12 (mentions Zhentarim)
3. Add tag "active" to Zhentarim node manually

**Test**:
- [ ] Toggle "Active Only" filter ON
- [ ] Verify only recent nodes (last 5 sessions) shown
- [ ] Verify nodes with "active" tag shown
- [ ] Verify nodes with "party-relevant" tag shown
- [ ] Toggle filter OFF → All nodes visible

### 3.3 Active Filtering (Campaign-Story)
- [ ] Same test as 3.2 but for Campaign-Story graph
- [ ] Verify plot threads tagged "resolved" are hidden when filter ON

### 3.4 Graph Node Editor
- [ ] Click on a node → Node editor opens
- [ ] Edit name → Save → Verify updated
- [ ] Add tag "party-relevant" → Save → Verify in attributes
- [ ] Add custom field "alignment: Lawful Evil" → Verify saved
- [ ] Delete node → Verify edges cascade delete

### 3.5 Cross-Graph Relationships
Create nodes in multiple graphs:
1. Geographical: "Waterdeep" (location)
2. Political-Web: "Council of Lords" (faction)
3. Edge: Council of Lords → located_in → Waterdeep

**Test**:
- [ ] Verify edge appears in Political-Web graph
- [ ] Verify clicking edge shows related Geographical node
- [ ] Delete Waterdeep → Verify edge is deleted (cascade)

---

## 📝 Phase 4: Approval Summary Tests

### 4.1 Approval Summary Display
After Import AI analysis:

**Verify UI shows**:
- [ ] Entities Extracted section (characters, locations, factions, events)
- [ ] Nodes Added section (grouped by graph type)
- [ ] Edges Added section (relationships with source→target)
- [ ] Cards Created section (titles, categories)
- [ ] Potential Conflicts section (timeline issues)

### 4.2 Timeline Conflict Detection
Import a session that contradicts existing Session Recaps:

```
Session 13 - The party defeats the Zhentarim (but Session 12 said they allied with them?)
```

**Expected**:
- [ ] Approval summary shows "High Severity" conflict
- [ ] Conflict description references Session 12
- [ ] User can review and decide to proceed or cancel

### 4.3 Approval Actions
- [ ] Click "Approve" → All cards/nodes created atomically
- [ ] Verify cards appear in campaign tree
- [ ] Verify nodes appear in graphs
- [ ] Click "Revert" immediately → All changes rolled back
- [ ] Verify cards deleted
- [ ] Verify nodes deleted

---

## 🔄 Phase 5: Batch Revert Tests

### 5.1 Single Import Batch Revert
1. Import session recap → Approve (creates 10 cards, 5 nodes)
2. Click "Revert Last Import"
3. Confirm dialog

**Verify**:
- [ ] All 10 cards deleted
- [ ] All 5 nodes deleted
- [ ] Edges connected to nodes also deleted (cascade)
- [ ] Import session status = 'reverted'

### 5.2 Multiple Imports - Only Last Revertible
1. Import Session 12 → Approve
2. Import Session 13 → Approve
3. Click "Revert Last Import"

**Verify**:
- [ ] Only Session 13 cards/nodes reverted
- [ ] Session 12 cards/nodes remain
- [ ] No option to revert Session 12 (only most recent)

### 5.3 Revert After Page Refresh
1. Import session → Approve
2. Refresh page
3. Try to revert

**Expected**:
- [ ] Revert button NOT available (session lost in prototype)
- [ ] User must navigate to import session history (future feature)

---

## 🎨 Phase 6: Real-World AI Quality Tests

### 6.1 Page Layout Generation
Upload a complex document with mixed content:

```
# Campaign Overview

Our Waterdeep campaign involves political intrigue and dungeon crawling.

## Key NPCs
- Dagult Neverember: Open Lord, secretly corrupt
- Laeral Silverhand: Blackstaff, secretly a Harper

## Factions
- Lords' Alliance (lawful, controlling)
- Zhentarim (evil, seeking power)
- Harpers (good, secretive)

## Major Locations
- Yawning Portal Inn (tavern with dungeon entrance)
- Blackstaff Tower (wizard's sanctum)
- Castle Waterdeep (seat of government)
```

**Test AI's ability to**:
- [ ] Create a well-structured page hierarchy (not flat list)
- [ ] Use appropriate card types (page vs database)
- [ ] Organize related content together
- [ ] Apply proper headers and formatting
- [ ] Create Database cards for NPCs and Factions
- [ ] Link related entities (Laeral → works_at → Blackstaff Tower)

**Quality Check**:
- [ ] Does the layout make sense?
- [ ] Are pages nested logically?
- [ ] Is content easy to navigate?
- [ ] Are there unnecessary duplicates?

### 6.2 Entity Relationship Intelligence
Upload a complex political scenario:

```
The Lords' Alliance and Zhentarim are rivals. However, Dagult Neverember (Alliance member)
is secretly taking bribes from the Zhentarim. Laeral Silverhand suspects this but has no proof.
The Harpers are investigating Neverember on Laeral's request.
```

**Test AI's ability to**:
- [ ] Extract all entities correctly
- [ ] Identify complex relationships (rivals, bribes, suspects, investigating)
- [ ] Create appropriate edge types (rivals_with, allied_with, suspects, investigating)
- [ ] Detect contradictions (Alliance member but taking Zhentarim bribes)
- [ ] Build a coherent Political-Web graph

**Quality Check**:
- [ ] Graph shows clear faction rivalries?
- [ ] Secret alliances marked appropriately?
- [ ] Relationships have context (not just generic "related_to")?

### 6.3 Session Recap Timeline Intelligence
Upload 3 sequential session recaps:

```
Session 10: Party arrives in Waterdeep, meets Mirt
Session 11: Party investigates Zhentarim warehouse
Session 12: Party reports findings to the Council
```

**Test AI's ability to**:
- [ ] Recognize sequential narrative
- [ ] Build Campaign-Story graph with chronological edges
- [ ] Reference previous sessions ("the same Mirt from Session 10")
- [ ] Detect out-of-order imports (if upload Session 14 before Session 13)

---

## 🚨 Phase 7: Error Handling & Edge Cases

### 7.1 BYOLLM Configuration Missing
- [ ] Remove BYOLLM config
- [ ] Try to open Import tab → Verify blocking error message
- [ ] Error should link to Settings page
- [ ] Import tab should NOT open until config added

### 7.2 API Rate Limiting
- [ ] Make 10+ rapid Import requests
- [ ] Verify exponential backoff activates
- [ ] Verify Retry-After header respected (if provider sends it)
- [ ] Verify user sees "Rate limited, retrying in 2s..." message

### 7.3 LLM Streaming Interruption
- [ ] Start Import chat
- [ ] Close tab mid-stream
- [ ] Re-open Import tab
- [ ] Verify no ghost messages or corrupted state

### 7.4 File Parsing Failures
- [ ] Upload corrupted PDF → Verify error message
- [ ] Upload password-protected DOCX → Verify error message
- [ ] Upload 50MB PDF → Verify size limit error
- [ ] Upload markdown with invalid syntax → AI should handle gracefully

### 7.5 MCP Tool Execution Failures
Simulate tool failure (edit backend code to throw error in `search_cards`):

**Verify**:
- [ ] LLM receives error message
- [ ] LLM reports failure to user ("I encountered an error searching for cards")
- [ ] Import session does NOT create partial/corrupted data
- [ ] User can retry

---

## ⚡ Phase 8: Performance Tests

### 8.1 Entity Extraction Speed
Upload 5000-word session recap:

**Measure**:
- [ ] Time from upload to approval summary display
- [ ] Target: <10 seconds
- [ ] Actual: _____ seconds

### 8.2 Graph Update Speed
Planning AI chat with 50 imported cards:

**Measure**:
- [ ] Time from message send to graph updated
- [ ] Target: <30 seconds
- [ ] Actual: _____ seconds

### 8.3 Approval Summary Rendering
Create import with 500 proposed actions:

**Measure**:
- [ ] Time to render approval summary UI
- [ ] Target: <100ms
- [ ] Actual: _____ ms

### 8.4 Batch Revert Speed
Revert batch with 100 cards:

**Measure**:
- [ ] Time from click to completion
- [ ] Target: <500ms
- [ ] Actual: _____ ms

---

## 🔍 Phase 9: Integration with Existing Features

### 9.1 Feature 003 (Cards) Integration
- [ ] Import creates cards → Verify appear in BlockList
- [ ] Import updates card → Verify content updated in editor
- [ ] Move imported card → Verify path updates
- [ ] Delete imported card → Verify node `source_card_id` set to NULL

### 9.2 Feature 004 (Information Levels) Integration
- [ ] Create custom information level "Player Secret"
- [ ] Import session → AI assigns level automatically
- [ ] Toggle view mode → Verify filtered correctly
- [ ] Graph nodes inherit card information levels

### 9.3 Feature 008 (BYOLLM) Integration
- [ ] Use OpenAI API key → Verify Import/Planning work
- [ ] Switch to Anthropic API key → Verify Import/Planning work
- [ ] Use Custom Endpoint (Ollama) → Verify Import/Planning work
- [ ] Test model selector (GPT-4 vs GPT-3.5) → Verify different quality

### 9.4 Feature 011 (MCP) Integration
- [ ] Verify all 24 MCP tool handlers called correctly
- [ ] Check `mcp_tool_logs` table for audit trail
- [ ] Verify permissions enforced (campaign ownership)
- [ ] Verify transactions rollback on failure

---

## 📋 Phase 10: Usability & Polish

### 10.1 User Experience
- [ ] Import/Planning tabs feel responsive?
- [ ] Keyboard shortcuts intuitive?
- [ ] Error messages helpful (not cryptic)?
- [ ] Approval summary easy to understand?
- [ ] Graph viewer easy to navigate?

### 10.2 Visual Design
- [ ] Tabs match existing UI style?
- [ ] Loading indicators during AI processing?
- [ ] Progress bars for file uploads?
- [ ] Smooth animations for tab open/close?

### 10.3 Accessibility
- [ ] Tab order logical (keyboard navigation)?
- [ ] Focus trap works (Tab cycles within dialog)?
- [ ] Esc key closes tabs?
- [ ] Screen reader friendly (ARIA labels)?

---

## 📊 Test Results Summary

**Date Tested**: ___________
**Tester**: ___________

### Pass/Fail Counts
- Phase 1 (Basic UI): ___ / ___ passed
- Phase 2 (AI Integration): ___ / ___ passed
- Phase 3 (Knowledge Graphs): ___ / ___ passed
- Phase 4 (Approval Summary): ___ / ___ passed
- Phase 5 (Batch Revert): ___ / ___ passed
- Phase 6 (AI Quality): ___ / ___ passed
- Phase 7 (Error Handling): ___ / ___ passed
- Phase 8 (Performance): ___ / ___ passed
- Phase 9 (Feature Integration): ___ / ___ passed
- Phase 10 (UX/Polish): ___ / ___ passed

**Total**: ___ / ___ tests passed (___%

)

### Critical Issues Found
1.
2.
3.

### Minor Issues Found
1.
2.
3.

### Outstanding Questions
1.
2.
3.

---

**Next Steps**: Address critical issues, re-test failed scenarios, celebrate when everything works! 🎉
