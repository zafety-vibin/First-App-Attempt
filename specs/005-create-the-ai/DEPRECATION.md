# ⚠️ FEATURE 005 DEPRECATION NOTICE

**Status**: DEPRECATED as of 2025-10-10
**Reason**: Architecture and philosophy changes
**Replacements**: Features 017 (Stateless Import) + 018 (External API)

---

## Why This Feature Is Deprecated

Feature 005 implemented a **conversational chat-based workflow** for AI import and planning with the following characteristics:

1. **Conversational Chat Interface** - Multi-turn chat with LLM for import sessions
2. **Knowledge Graph Population** - AI auto-populated knowledge graphs during import
3. **Session State Persistence** - Import sessions stored and resumable
4. **Approval Summary Workflow** - Batch approval of AI extractions

## Architecture Changes Since Feature 005

### Major Philosophical Shift

**Feature 005 Approach** (Deprecated):
- Conversational AI workflow with chat history
- Auto-population of knowledge graphs via AI
- Stateful import sessions with approval queues
- Mixed concern: import + graph management in single feature

**New Architecture** (Features 014-020):
- **Feature 014**: Structured category database foundation (13 tables)
- **Feature 015**: Dashboard UI for database management
- **Feature 017**: **Stateless** AI import (type-selection dropdown, one-shot processing, preview/edit table)
- **Feature 018**: **External API** for conversational operations (Claude Desktop integration, localhost only)

### Key Differences

| Aspect | Feature 005 (OLD) | Features 017+018 (NEW) |
|--------|-------------------|------------------------|
| Import Workflow | Conversational chat | Type-selection + one-shot |
| Session State | Persistent sessions | Stateless (no sessions) |
| Knowledge Graphs | Auto-populated by AI | User-curated, **NOT** auto-populated |
| Approval | Batch approval summary | Inline preview/edit table |
| LLM Integration | Built-in chat | Feature 017 uses BYOLLM, Feature 018 is pure API |
| UI Pattern | Chat interface | Dropdown + table preview |
| Purpose | General import/planning | Testing alternative UX patterns |

## What Replaces Feature 005 Functionality

### 1. Import Workflow → Feature 017 (Stateless AI Import)

**Feature 017 provides**:
- Type-selection dropdown (maps to database categories)
- File upload or text paste
- Optional custom context
- One-shot AI processing (no chat)
- Preview as editable table rows
- Direct field editing before confirmation
- Fuzzy duplicate detection

**What's different**:
- ❌ No conversational chat
- ❌ No session persistence
- ❌ No knowledge graph auto-population
- ✅ Faster workflow (one-shot vs multi-turn)
- ✅ More direct control (edit fields inline)

### 2. Conversational Operations → Feature 018 (External API)

**Feature 018 provides**:
- Localhost REST API (port 3002)
- External tool integration (Claude Desktop)
- Conversational database operations via AI tools
- Natural language queries: "Show me all NPCs in Thieves Guild"
- Create/update/delete via conversation
- Comprehensive audit logging

**What's different**:
- ❌ No built-in chat UI
- ❌ No import workflow
- ❌ No knowledge graph population
- ✅ Conversational workflow testing
- ✅ External tool integration
- ✅ Comparison testing with Feature 017

### 3. Knowledge Graphs → User-Curated Only

**Critical architectural change**:
- Knowledge graphs are **NOT** auto-populated by AI import
- Graphs remain user-curated per constitutional principles
- AI can **query** graphs but **NOT** auto-populate them
- Feature 016 will provide graph management UI

## Testing Comparison Purpose

**Why both Feature 017 (stateless) AND Feature 018 (conversational) exist**:

This is a **UX experiment** to test two alternative approaches:

1. **Feature 017**: Type-selection + preview table (fast, structured)
2. **Feature 018**: Conversational AI operations (natural language)

Both exist during prototype phase to determine which workflow feels more natural for different use cases.

## Migration Path

### For Existing Implementations Using Feature 005

1. **Import Workflow**: Switch to Feature 017 stateless import
2. **Conversational Operations**: Use Feature 018 external API
3. **Knowledge Graph Management**: Manual curation (Feature 016 when available)
4. **Chat UI**: Removed (conversational operations via external tools only)

### What Happens to Feature 005 Code

**Immediate**:
- Mark Feature 005 as deprecated in documentation
- No new development on Feature 005
- Existing code remains but not actively maintained

**Future** (after Feature 017+018 validation):
- Remove Feature 005 implementation
- Remove import/planning session tables
- Remove chat-based UI components
- Keep only what's needed for database operations

## Files Affected by Deprecation

**Backend** (to be removed eventually):
- `backend/src/services/ImportService.ts` (Feature 005 version)
- `backend/src/services/PlanningService.ts` (Feature 005 version)
- `backend/src/routes/import.ts` (Feature 005 endpoints)
- `backend/src/routes/planning.ts` (Feature 005 endpoints)
- Import/planning session tables

**Frontend** (to be removed eventually):
- `frontend/src/components/ImportAITab.tsx` (Feature 005 chat UI)
- `frontend/src/components/PlanningAITab.tsx` (Feature 005 chat UI)
- `frontend/src/hooks/useImportSession.tsx`
- `frontend/src/hooks/usePlanningSession.tsx`
- `frontend/src/contexts/AITabContext.tsx`

**Keep** (still used):
- `backend/src/services/FileParserService.ts` (reused by Feature 017)
- `backend/src/services/LLMService.ts` (reused by Feature 017 BYOLLM integration)
- Knowledge graph tables (repurposed for user-curated graphs)

## References

- **Architecture-Updates.md**: Comprehensive hybrid architecture documentation
- **Feature 014 Plan**: Structured category database foundation
- **Feature 015 Plan**: Dashboard and navigation UI
- **Feature 017 Plan**: Stateless AI import system
- **Feature 018 Plan**: External API for conversational operations
- **Constitution v2.1.1**: Principle VII (transparency, user approval, no auto-population)

---

**Last Updated**: 2025-10-10
**Next Review**: After Feature 017+018 validation (prototype testing phase)
