# Feature 011 Integration Notes - Architecture Update for Feature 005

**Date**: 2025-10-03
**Status**: Feature 011 (MCP Integration) completed, Feature 005 needs architectural updates

---

## Summary

Feature 011 (MCP Integration) has implemented ~40% of the tool infrastructure originally planned for Feature 005. This document explains the architectural implications and required updates to Feature 005's spec/plan/tasks.

---

## What Feature 011 Provides

### 1. **24 MCP Tools** (`backend/src/mcp/tools/`)

Feature 011 implemented complete tool handlers for:

- **6 Card Tools**: read_card, create_card, update_card, delete_card, search_cards, move_card
- **5 Hierarchy Tools**: get_card_path, get_subtree, list_children, get_siblings, get_ancestor
- **4 Graph Tools**: query_graph, list_graph_nodes, get_relationships, update_graph
- **2 Recap Tools**: get_session_recaps, get_timeline_events
- **2 Info Level Tools**: list_information_levels, get_information_level
- **3 Database Tools**: query_database, create_database_entry, update_database_entry
- **2 Map Tools**: list_map_pins, create_map_pin

### 2. **Zod Schemas** (`backend/src/mcp/schemas/`)

All tool inputs validated with Zod schemas:
- `card-schemas.ts`
- `graph-schemas.ts`
- `hierarchy-schemas.ts`
- `recap-schemas.ts`
- `info-level-schemas.ts`
- `database-schemas.ts`
- `map-schemas.ts`

### 3. **MCP Server** (`backend/src/mcp/server.ts`)

JSON-RPC server over stdio for external MCP clients (Claude Desktop). Uses MCP SDK v0.5.0 with `setRequestHandler()` pattern.

### 4. **Resources & Prompts**

- 3 Resources: campaign://cards, campaign://recaps, campaign://graphs
- 2 Prompts: import_workflow, planning_workflow

---

## Architectural Clarification

### Original Feature 005 Assumption (INCORRECT)

Feature 005 spec/plan/tasks assumed:
- Import/Planning AI would use **MCP protocol** for communication
- Need to implement **MCP client** in backend
- Use **MCP SDK** for streaming responses

### Correct Architecture (Post-Feature 011)

**MCP Server** (Feature 011):
- External MCP clients (Claude Desktop) connect via stdio
- JSON-RPC protocol over stdin/stdout
- Exposes tools/resources/prompts to external AI assistants

**Import/Planning AI** (Feature 005):
- Backend REST API endpoints (`/api/import/*`, `/api/planning/*`)
- **Direct function calls** to tool handlers from Feature 011
- OpenAI/Anthropic SDK for LLM streaming (NOT MCP protocol)
- Convert MCP tool schemas to OpenAI/Anthropic function calling format

**Shared Tool Handlers**:
- `backend/src/mcp/tools/*` becomes a **shared library**
- Used by both MCP server (Feature 011) and REST API (Feature 005)
- No MCP client needed in backend - direct imports and function calls

---

## Impact on Feature 005 Tasks

### ❌ **Tasks to Remove/Replace**

1. **T030: MCPService** - No longer needed
   - Original: "MCP client initialization, streaming response handling"
   - Replacement: Import tool handlers directly, use OpenAI/Anthropic SDKs

2. **References to "MCP protocol" for Import/Planning** - Clarify MCP is for external clients only

### ✅ **New Tasks Required**

1. **Function Calling Schema Converter**
   - Convert MCP Zod schemas to OpenAI function calling JSON schemas
   - Convert MCP Zod schemas to Anthropic tool calling JSON schemas
   - Service: `backend/src/services/FunctionCallingService.ts`

2. **LLM Orchestration Service**
   - Wrap OpenAI/Anthropic SDKs for streaming chat completions
   - Handle function calling loop (LLM requests tool → call handler → return result → LLM continues)
   - Use BYOLLMConfigService from Feature 008 for credentials
   - Service: `backend/src/services/LLMOrchestrationService.ts`

3. **Tool Handler Registry**
   - Map tool names to handler functions from `backend/src/mcp/tools/*`
   - Execute tool calls with validated parameters
   - Service: `backend/src/services/ToolRegistryService.ts`

4. **Import AI Service** (Updated)
   - Use LLMOrchestrationService instead of MCPService
   - Call tool handlers via ToolRegistryService
   - Entity extraction via function calling (search_cards, create_card, etc.)

5. **Planning AI Service** (Updated)
   - Use LLMOrchestrationService for session planning
   - Graph updates via update_graph tool handler
   - Context queries via query_graph tool handler

### 📝 **Tasks Unchanged**

- T001-T004: Database migrations (still needed for import/planning session state)
- T005-T007: Shared types (still needed)
- T008-T023: Tests (still needed, update to reflect direct tool calls)
- T024-T029: Models (still needed)
- T031: FileParseService (still needed for PDF/DOCX parsing)
- T032-T035: ImportAIService logic (update to use tool handlers)
- T036-T038: PlanningAIService logic (update to use tool handlers)
- T039-T041: **REMOVE** - KnowledgeGraphService already exists as graph-tools.ts handlers
- T042-T044: Routes (still needed)
- T045-T075: Frontend tasks (still needed, update API client expectations)

---

## Updated Task Breakdown

### Phase 3.4: Backend Core Implementation

**Services to Add**:
- **T030-NEW**: FunctionCallingService (`backend/src/services/FunctionCallingService.ts`)
  - convertZodToOpenAISchema()
  - convertZodToAnthropicSchema()

- **T031-NEW**: LLMOrchestrationService (`backend/src/services/LLMOrchestrationService.ts`)
  - streamChatCompletion() - OpenAI/Anthropic streaming
  - handleFunctionCalling() - function calling loop
  - Uses BYOLLMConfigService for credentials

- **T032-NEW**: ToolRegistryService (`backend/src/services/ToolRegistryService.ts`)
  - registerToolHandlers() - map tool names to handlers
  - executeToolCall() - validate params, call handler, return result

**Services to Update**:
- **T033** (was T032): ImportAIService - Entity extraction
  - Import tool handlers from `backend/src/mcp/tools/card-tools.ts`
  - Use LLMOrchestrationService for streaming
  - Call search_cards, create_card via ToolRegistryService

- **T034** (was T033): ImportAIService - Card search
  - Use search_cards handler directly
  - No MCP client needed

- **T035** (was T034): ImportAIService - Approval summary
  - Generate approval summary with proposed tool calls
  - User approves → execute batch via ToolRegistryService

- **T036** (was T035): ImportBatchService
  - Execute batch card creation via create_card/update_card handlers
  - Revert logic with immer snapshots (unchanged)

- **T037** (was T036): PlanningAIService - Chat handling
  - Use LLMOrchestrationService for streaming
  - Call query_graph, get_session_recaps for context

- **T038** (was T037): PlanningAIService - Graph context
  - Import query_graph handler from `backend/src/mcp/tools/graph-tools.ts`
  - Call directly for context queries

- **T039** (was T038): PlanningAIService - Graph update
  - Import update_graph handler from `backend/src/mcp/tools/graph-tools.ts`
  - Call with user-approved operations

**Services to Remove**:
- ~~T039: KnowledgeGraphService~~ - Already exists as graph-tools.ts handlers
- ~~T040: GraphQueryService~~ - Already exists as query_graph handler
- ~~T041: GraphUpdateService~~ - Already exists as update_graph handler

---

## Benefits of This Architecture

1. **Code Reuse**: One implementation, two exposure methods (MCP server + REST API)
2. **Consistency**: External MCP clients and Import/Planning AI use same tool logic
3. **Separation of Concerns**:
   - MCP server handles JSON-RPC over stdio for external clients
   - REST API handles HTTP for web frontend
   - Tool handlers remain protocol-agnostic
4. **Testing**: Test tool handlers once, works for both MCP and REST
5. **Maintenance**: Updates to tool logic automatically benefit both interfaces

---

## Next Steps for Feature 005 Implementation

1. ✅ **Update spec.md**:
   - Remove "MCP protocol" references for Import/Planning workflows
   - Clarify MCP server is for external clients only
   - Add "Shared tool handlers from Feature 011" to dependencies

2. ✅ **Update plan.md**:
   - Replace "MCP SDK" with "Shared MCP tool handlers (Feature 011)"
   - Update dependencies section
   - Clarify LLM communication uses OpenAI/Anthropic SDKs

3. ✅ **Update tasks.md**:
   - Remove T030 (MCPService)
   - Add T030-NEW, T031-NEW, T032-NEW (Function calling services)
   - Update T033-T039 to import tool handlers directly
   - Remove T039-T041 (graph services - already exist)
   - Update task count and dependencies

4. ✅ **Update contracts/**:
   - Import/Planning API contracts unchanged
   - Add note that they use tool handlers from Feature 011 internally

5. ✅ **Begin Feature 005 implementation** with updated tasks

---

## Example Code Pattern

### Before (Original Feature 005 Plan)
```typescript
// ❌ WRONG: No MCP client needed
import { MCPClient } from '@modelcontextprotocol/sdk';

const mcpClient = new MCPClient();
const result = await mcpClient.callTool('search_cards', { query: 'Dagult' });
```

### After (Correct Architecture)
```typescript
// ✅ CORRECT: Import tool handlers directly
import { handleSearchCards } from '../mcp/tools/card-tools';
import { SearchCardsInputSchema } from '../mcp/schemas/card-schemas';

// Validate input with Zod schema
const validated = SearchCardsInputSchema.parse({
  campaign_id: '123',
  query: 'Dagult'
});

// Call handler directly
const result = await handleSearchCards(validated);

// Use result.content[0].text (JSON string) in LLM context
const cardsData = JSON.parse(result.content[0].text);
```

### LLM Function Calling Integration
```typescript
// Convert MCP schema to OpenAI function schema
import { convertZodToOpenAISchema } from './FunctionCallingService';
import { SearchCardsInputSchema } from '../mcp/schemas/card-schemas';

const openAIFunction = {
  name: 'search_cards',
  description: 'Search for cards in the campaign',
  parameters: convertZodToOpenAISchema(SearchCardsInputSchema)
};

// Use with OpenAI SDK
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
  functions: [openAIFunction],
  function_call: 'auto'
});

// If LLM requests function call, execute it
if (completion.choices[0].message.function_call) {
  const toolName = completion.choices[0].message.function_call.name;
  const toolArgs = JSON.parse(completion.choices[0].message.function_call.arguments);

  // Call handler via registry
  const result = await toolRegistry.execute(toolName, toolArgs);

  // Return result to LLM for next turn...
}
```

---

## References

- Feature 011 MCP Implementation: `specs/011-create-model-context/IMPLEMENTATION_COMPLETE.md`
- Feature 011 Tool Handlers: `backend/src/mcp/tools/`
- Feature 011 Schemas: `backend/src/mcp/schemas/`
- OpenAI Function Calling: https://platform.openai.com/docs/guides/function-calling
- Anthropic Tool Use: https://docs.anthropic.com/claude/docs/tool-use
