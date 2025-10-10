# Feature Architecture Accounting
**Date**: 2025-10-10
**Purpose**: Document which features are affected by the card-to-database architecture shift

---

## Architecture Change Summary

**OLD** (Features 002-011): Card-based everything
**NEW** (Features 014-020): Hybrid - Databases for canon context + Wiki (cards) for optional GM notes

---

## Feature Status by Implementation

### ✅ IMPLEMENTED - Not Affected
These features are implemented and remain unchanged:

- **002**: Authentication & Campaign Management
- **003**: Card System → **BECOMES WIKI-ONLY** (Feature 019)
- **004**: Information Level Filtering → Used by both databases AND wiki
- **007**: Interactive Maps
- **008**: BYOLLM Configuration
- **010**: Public Campaign Sharing
- **011**: Model Context Protocol (MCP) → **Needs API refactoring**, but architecture-agnostic

### ⚠️ IMPLEMENTED - DEPRECATED
- **005**: AI Import/Planning → **DEPRECATED**
  - **Why**: Conversational chat workflow + auto-graph population
  - **Replaced By**: Feature 017 (stateless import) + Feature 018 (external API)
  - **See**: `specs/005-create-the-ai/DEPRECATION.md`

---

## Planned Features - Architecture Impact

### 🟢 MINIMAL OR NO IMPACT

#### **Feature 006: Knowledge Graphs** - PLANNED (REDESIGN REQUIRED)
**Status**: Requires restructuring for Feature 018 integration + visual editor
**Why Minimal Impact**: Graphs were designed as separate from cards from the start
- Knowledge graphs are **independent entities** (separate tables)
- Graphs provide AI context layer ABOVE both databases and wiki
- User-curated content through **dual interface**: conversational + visual editor
- **Architecture Changes**:
  - Remove any card-auto-sync logic (none expected - designed to be independent)
  - Update documentation: "Graphs query databases for canon context, NOT wiki"
  - Feature 016 (Campaign Wizard) should explain graph role with databases

**DECISION - Interface Redesign**:
- ✅ **Feature 018 External API integration** for conversational graph operations
  - Replaces deprecated Feature 005 Planning AI
  - Graph creation/updates via External API chat interface
  - MCP tool calls for graph CRUD operations
- ✅ **Graphical Visual Editor** as primary interaction method
  - Visual canvas with nodes and edges (not just optional)
  - Direct node/edge editing in visual interface
  - Drag-and-drop node positioning
  - Users can SEE and EDIT graphs visually, not just through chat
  - Conversational interface complements visual editor (both available)

**Restructuring Required**:
- Current plan.md based on Feature 005 Planning AI (deprecated)
- **Action**: Delete existing 006 tasks if present, restructure plan for:
  1. Feature 018 External API integration (conversational layer)
  2. Visual graph editor (primary UI)
  3. Dual-mode interaction: visual editing + AI-assisted operations

**User Education Needed** (Feature 016 wizard):
- World-Foundations: "Usually left ON - enforces your unique rules"
- Political-Web: "Only create for complex intrigue (who's betraying who behind alliances)"
- Campaign-Story: "Optional - AI can track story from databases without graph initially"
- Geographical: "Optional - basic location queries work from database alone"

---

#### **Feature 009: Player Question Portal** - PLANNED
**Status**: Needs review for wiki vs database references
**Architecture Impact**: MEDIUM

**Original Design** (references cards):
- Portal AI queries Common Knowledge + Player Knowledge **cards**
- Citations link to **source cards**
- Knowledge graph filtering by card tags

**New Design** (databases + wiki):
- Portal AI queries Common Knowledge + Player Knowledge **from databases primarily**
- Wiki content **explicitly excluded** from portal (GM notes, not player-facing)
- Citations link to **database entities**
- Knowledge graph filtering still valid (graphs are independent)
- **Question**: Should portal access wiki at all?
  - **Recommendation**: No - wiki is GM organization tool, databases are canon

**Changes Needed**:
- Update spec to clarify: "Portal queries databases (Features 014) NOT wiki"
- Citation system links to database entity detail pages, not wiki cards
- Information filtering applies to database fields, not wiki cards
- Session Recaps in `session_recaps` table (Feature 014), not cards

---

### 🔴 FUNDAMENTAL ARCHITECTURE CHANGE

#### **Features 014-018: NEW DATABASE ARCHITECTURE**
These features **define** the new architecture:

- **014**: Structured Category Database Foundation (13 tables) - **CANON CONTEXT**
- **015**: Dashboard & Navigation UI for databases
- **016**: Campaign Wizard (not planned yet) - **Teaches database vs wiki distinction**
- **017**: Stateless AI Import → Writes to **databases only**
- **018**: External API → Queries **databases only**

**All planned and align with new architecture.**

---

#### **Feature 019: Wiki Portal** - ✅ PLANNING COMPLETE
**Status**: Preserves card system for optional wiki use - **Phase 0-1 complete, ready for /tasks**
**Architecture Role**: Separate optional tool

**Planning Status**:
- ✅ Phase 0: research.md complete (14 technical decisions)
- ✅ Phase 1: data-model.md, contracts/wiki-cards.yaml, quickstart.md, CLAUDE.md updated
- ✅ plan.md complete (323 lines, 38-42 estimated tasks)
- ⏭️ Next: `/tasks` command to generate implementation tasks

**Design**:
- Wiki uses **card system** (Feature 003) preserved
- "Wiki" button in sidebar → separate portal feeling
- Wiki content **NOT** used for AI context
- Databases (014) = canon context, Wiki = optional GM notes
- Information levels available in wiki for player view filtering
- Same DB file, separate tables (`wiki_cards`, `wiki_hierarchy`)

**Preserved Functionality**:
- ✅ Hierarchical cards
- ✅ Rich text editing (TipTap)
- ✅ Slash commands
- ✅ Database views within cards (table/list/gallery/kanban)
- ✅ Drag-and-drop reordering
- ✅ Information level filtering for player view

**Explicitly Excluded from AI**:
- ❌ AI tools (017/018) do NOT query wiki
- ❌ Import workflows do NOT write to wiki
- ❌ Wiki is NOT part of canon context

**Artifacts Generated** (2025-10-10):
- research.md (8.6KB, 14 decisions)
- data-model.md (21KB, WikiCard/WikiHierarchy schemas)
- contracts/wiki-cards.yaml (OpenAPI 3.0, 7 endpoints)
- contracts/README.md
- quickstart.md (11KB, 8 E2E scenarios)
- plan.md (323 lines)

---

#### **Feature 020: Card Clipboard** - ✅ PLANNING COMPLETE
**Status**: Wiki-only feature - **Phase 0-1 complete, ready for /tasks**
**Architecture Role**: Preserves valuable clipboard work from Feature 003

**Planning Status**:
- ✅ Phase 0: research.md complete (12 technical decisions)
- ✅ Phase 1: data-model.md, contracts/clipboard.yaml, quickstart.md, CLAUDE.md updated
- ✅ plan.md complete (250 lines, 32-36 estimated tasks)
- ⏭️ Next: `/tasks` command to generate implementation tasks
- **Note**: plan.md was accidentally overwritten during branch confusion, successfully restored from conversation memory

**Design**:
- Multi-select + cut/copy/paste for **wiki cards only**
- NOT for database entities (databases have own management in Feature 015)
- Session-only clipboard (sessionStorage)
- Circular hierarchy prevention
- Undo/redo support (10-item stack)

**Scope**:
- ✅ Wiki cards (old architecture)
- ❌ Database cards (Features 014+)
- Explicitly documented: "This feature applies ONLY to wiki functionality"

**Artifacts Generated** (2025-10-10):
- research.md (12 decisions including clipboard serialization, undo/redo patterns)
- data-model.md (TypeScript interfaces: SelectionState, ClipboardState, UndoRedoStack)
- contracts/clipboard.yaml (OpenAPI 3.0, clipboard operations API)
- quickstart.md (7 E2E scenarios)
- plan.md (250 lines, restored after accidental overwrite)

---

## Implementation Order Impact

### Recommended Sequence

**Phase 1: Database Foundation** (No wiki dependency)
1. Feature 014: Database Foundation
2. Feature 015: Dashboard UI
3. Feature 016: Campaign Wizard **(includes knowledge graph education)**

**Phase 2: AI Workflows** (Depend on databases)
4. Feature 017: Stateless Import
5. Feature 018: External API

**Phase 3: Knowledge Graphs** (Depend on databases + Feature 018 External API)
6. Feature 006: Knowledge Graphs **(restructure for Feature 018 integration + visual editor)**
   - Dual interface: Feature 018 conversational + graphical visual editor
   - Primary interaction: visual canvas for node/edge editing
   - Complementary AI-assisted operations via External API

**Phase 4: Optional Tools** (Independent)
7. Feature 019: Wiki Portal ✅ Planning complete (optional, preserves card system)
8. Feature 020: Card Clipboard ✅ Planning complete (optional, wiki-only)
9. Feature 009: Player Question Portal **(update to query databases, not wiki)**

---

## Critical Decisions

### 1. Feature 006 (Knowledge Graphs) Interface ✅ DECISION MADE
**Problem**: Original design uses Feature 005 Planning AI (deprecated)

**Options Considered**:
- A: Use Feature 018 External API for conversational graph management
- B: Create dedicated graph management UI
- C: Wait for new conversational system design

**✅ DECISION (2025-10-10)**: Dual Interface Approach
- **Feature 018 External API integration** for conversational graph operations
  - AI-assisted graph creation, updates, and queries
  - Natural language interface for complex operations
- **Graphical Visual Editor** as primary interaction method
  - Visual canvas with draggable nodes and edges
  - Direct editing of graph structure in UI
  - Users can SEE and EDIT graphs, not just chat about them
- **Both interfaces complement each other**: visual for direct manipulation, conversational for AI-assisted operations

**Implementation Order**: Defer Feature 006 restructuring until after Features 014-018 complete (maintains dependency order)

---

### 2. Feature 009 (Player Portal) Wiki Access
**Problem**: Original spec references "cards" - unclear if wiki or database

**Decision**: Portal queries **databases only**, NOT wiki
- **Rationale**: Wiki is GM organizational tool, not player-facing content
- **Implementation**: Update spec to clarify database queries, exclude wiki

---

### 3. Feature 016 (Campaign Wizard) Knowledge Graph Education
**Problem**: Users need to understand when to create graphs

**Solution**: Wizard includes graph education:
- World-Foundations: Default ON, enforces unique rules
- Political-Web: Optional, for complex intrigue webs
- Campaign-Story: Optional, AI can track from databases initially
- Geographical: Optional, basic queries work from databases

**Content**: Explain "semantic gravity" - graphs create AI focus areas
- **Power**: Unique scenarios, nuanced understanding
- **Danger**: Pollution, tunnel vision if over-engineered

---

## Summary Table

| Feature | Status | Impact | Action |
|---------|--------|--------|--------|
| 002 | Implemented | None | ✅ No changes |
| 003 | Implemented | Preserved | → Feature 019 (wiki) |
| 004 | Implemented | None | ✅ Used by databases + wiki |
| 005 | Implemented | **DEPRECATED** | See DEPRECATION.md |
| 006 | Planned | **REDESIGN** | ✅ Decision: Feature 018 integration + visual editor |
| 007 | Implemented | None | ✅ No changes |
| 008 | Implemented | None | ✅ No changes |
| 009 | Planned | Medium | Update to query databases, not wiki |
| 010 | Implemented | None | ✅ No changes |
| 011 | Implemented | None | ✅ Needs API refactoring (separate issue) |
| 014 | ✅ Planned | **NEW** | Database foundation (canon context) |
| 015 | ✅ Planned | **NEW** | Dashboard UI for databases |
| 016 | ✅ Reconstructed | **NEW** | Campaign wizard + graph education |
| 017 | ✅ Planned | **NEW** | Stateless import → databases only |
| 018 | ✅ Planned | **NEW** | External API → databases only |
| 019 | ✅ Planned | **NEW** | Wiki portal (preserves Feature 003) |
| 020 | ✅ Planned | **NEW** | Card clipboard (wiki-only) |

---

## Git Commit Capture Point

**This document created**: 2025-10-10
**Last updated**: 2025-10-10 (post-Feature 019 planning)
**Commit Purpose**: Capture all planning work before task generation
**State**: Planning complete for Features 014-020, architecture accounting documented, Feature 006 redesign decisions made
**Next Step**: Generate comprehensive tasks.md for Features 014-020

**Why Commit Now**:
- ✅ Planning complete for Features 014-020 (all Phase 0-1 artifacts generated)
- ✅ Feature 016 manually reconstructed from template
- ✅ Feature 019 planning complete (wiki portal, 323-line plan.md)
- ✅ Feature 020 planning complete (card clipboard, 250-line plan.md)
- ✅ Architecture changes documented
- ✅ Feature 005 deprecation captured
- ✅ **Feature 006 redesign decision**: Feature 018 integration + visual editor
- ✅ Knowledge graph education needs identified (Feature 016 wizard)
- ✅ Player portal database clarification documented

**Planning Artifacts Summary**:
- Feature 014: plan.md, research.md, data-model.md, 13 contract files, quickstart.md
- Feature 015: plan.md, research.md, data-model.md, contracts/, quickstart.md
- Feature 016: plan.md (manual reconstruction from template)
- Feature 017: plan.md, research.md, data-model.md, contracts/, quickstart.md
- Feature 018: plan.md, research.md, data-model.md, contracts/, quickstart.md
- Feature 019: plan.md, research.md, data-model.md, contracts/wiki-cards.yaml, quickstart.md
- Feature 020: plan.md, research.md, data-model.md, contracts/clipboard.yaml, quickstart.md

**Total Estimated Tasks**: ~250-300 tasks across all 7 features

---

**References**:
- Architecture-Updates.md (comprehensive hybrid architecture)
- specs/005-create-the-ai/DEPRECATION.md (Feature 005 deprecation notice)
- specs/006-create-the-knowledge/spec.md, plan.md (knowledge graphs - requires restructuring)
- specs/014-create-the-database/plan.md (database foundation)
- specs/015-create-the-dashboard/plan.md (dashboard UI)
- specs/016-create-a-campaign/plan.md (campaign wizard - reconstructed)
- specs/017-create-a-stateless/plan.md (stateless import)
- specs/018-create-an-external/plan.md (external API)
- specs/019-create-a-wiki/spec.md, plan.md (wiki portal preservation - planning complete)
- specs/020-create-card-clipboard/plan.md (wiki clipboard - planning complete)
