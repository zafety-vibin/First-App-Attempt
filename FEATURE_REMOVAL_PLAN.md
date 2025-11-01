# Feature Removal Plan - BYOLLM & Old AI Code

Based on user decision: Remove BYOLLM API key management (users will use Claude Desktop MCP directly)

---

## KEEP (Do NOT Remove) ✅

**Feature 011 - MCP Tools**:
- backend/src/mcp/ (entire directory - 29 tools)
- MCPConfigService.ts
- All MCP-related code

**Feature 018 - External API (REST)**:
- backend/src/routes/external-api.ts
- backend/src/services/ExternalAPIService.ts
- backend/src/services/AuditLogService.ts
- Port 3002 server
- NEEDED for MCP to call tools via HTTP

---

## REMOVE ❌

### Feature 008 - BYOLLM Configuration

**Backend**:
- [ ] backend/src/routes/byollm.ts
- [ ] backend/src/services/BYOLLMConfigService.ts
- [ ] backend/src/services/OAuthFlowService.ts
- [ ] backend/src/services/ProviderClientService.ts
- [ ] backend/src/services/EncryptionService.ts (check if used elsewhere first!)
- [ ] Migration 008-add-byollm-tables.sql (or mark deprecated)
- [ ] Database tables: byollm_configs, provider_credits, oauth_sessions, custom_endpoint_configs

**Frontend**:
- [ ] Find and remove BYOLLM components (BYOLLMSettings, APIKeyInput, OAuthButton, etc.)
- [ ] frontend/src/contexts/BYOLLMContext.tsx
- [ ] Any BYOLLM-related pages/forms
- [ ] Remove from Settings page UI

**Models/Types**:
- [ ] backend/src/shared/types/BYOLLMConfig.ts
- [ ] backend/src/shared/types/OAuthSession.ts
- [ ] backend/src/shared/types/ProviderCredits.ts
- [ ] backend/src/shared/types/CustomEndpointConfig.ts

**Routes in server.ts**:
- [ ] Remove byollm routes registration

---

### Feature 017 - Stateless API

**Status**: Spec exists in specs/017-create-a-stateless/ but NEVER IMPLEMENTED

**Action**: Delete spec directory (no code to remove)

---

### Old AI Chat Components (Pre-Architecture Swap)

**Search and destroy**:
- [ ] ImportAITab (mentioned in CLAUDE.md but not found)
- [ ] PlanningAITab (mentioned in CLAUDE.md but not found)
- [ ] AITabContext (might exist)
- [ ] SSE streaming components (if not used elsewhere)
- [ ] SessionImportService.ts (check what this does - might be old)

**Backend Services** (check if old):
- [ ] backend/src/services/SessionImportService.ts - VERIFY what this does
- [ ] Any LLMService usage for chat (not MCP)
- [ ] EntityExtractionService (if only for chat import)
- [ ] FileParserService (if only for chat import)

**Database Tables**:
- [ ] import_sessions table (if exists)
- [ ] planning_sessions table (if exists)
- [ ] import_batches table (if exists)

---

## Investigation Needed

**1. SessionImportService.ts**:
- What does it do?
- Is it old code or current?
- Used by anything?

**2. EncryptionService.ts**:
- Only used for BYOLLM API keys?
- Or used for other features?
- Check usages before deleting

**3. AITabContext**:
- Does it exist?
- What uses it?

**4. LLMService**:
- Used for MCP tools?
- Or only for old chat?
- Might need to keep if MCP uses it

---

## Removal Strategy

**Phase 1: Investigation** (30 min)
- Grep for all usages of BYOLLM services
- Check what SessionImportService does
- Find all AI tab components
- Check EncryptionService dependencies

**Phase 2: Backend Cleanup** (1-2 hours)
- Remove BYOLLM routes
- Remove BYOLLM services
- Remove old import/planning routes (if they exist)
- Update server.ts
- Remove database tables (or migration to drop them)

**Phase 3: Frontend Cleanup** (1-2 hours)
- Remove BYOLLM components
- Remove BYOLLM context
- Remove from Settings page
- Remove old AI tabs
- Clean up unused imports

**Phase 4: Documentation** (30 min)
- Update CLAUDE.md (remove Feature 005, 008, 017 references)
- Update architecture.md
- Remove old spec directories

**Phase 5: Testing** (30 min)
- Verify backend starts
- Verify frontend compiles
- Test MCP still works (Feature 011)
- Test External API still works (Feature 018)

**Total Estimate**: 4-6 hours

---

## Principle Preserved

**BYOLLM Principle** (keep this philosophy):
- ✅ Users bring their own Claude Desktop (with MCP)
- ✅ No Anthropic API keys stored in app
- ✅ Local-first architecture
- ✅ User controls their AI access

**Implementation Removed**:
- ❌ No more API key management UI
- ❌ No more OAuth flows
- ❌ No more credential encryption
- ❌ No more provider selection dropdowns

**Users just**: Install Claude Desktop → Add MCP server config → Done

---

## Next Session Plan

**Option A**: Start removal now (fresh, motivated)
**Option B**: Take break, tackle removal next session (big task)
**Option C**: Skip removal, build new features (defer cleanup)

**Recommendation**: Option B - This is a significant removal (lots of files, tests, migrations). Fresh eyes recommended.
