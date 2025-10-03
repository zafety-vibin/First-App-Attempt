# Research: AI Import and Planning Workflows

**Feature**: 005-create-the-ai | **Date**: 2025-10-01 (Updated 2025-10-03 post-Feature 011)
**Status**: Phase 0 Complete

---

## Research Area 1: LLM Streaming & Function Calling Integration

### Problem Statement
Need streaming LLM operations for Import entity extraction (5000+ words), Planning graph updates (50+ imported cards), and real-time chat interfaces. System must handle 10k+ token responses, call Feature 011 tool handlers via function calling for bulk operations, and gracefully handle API failures with retry logic.

### Research Findings

**Function Calling Architecture**:
- Feature 011 provides 24 reusable tool handlers in `backend/src/mcp/tools/*`
- Each handler has Zod input/output schemas in `backend/src/mcp/schemas/*`
- Import/Planning AI will convert Zod schemas → OpenAI/Anthropic function schemas
- LLM requests tool → we call handler via `dispatchToolCall()` → return result to LLM

**Available Tool Handlers from Feature 011** (24 total):
```typescript
// Card tools (6)
- handleReadCard        // Read card by ID with campaign validation
- handleCreateCard      // Create new card with hierarchy validation
- handleUpdateCard      // Update title/content/information level
- handleDeleteCard      // Delete card (blocks if has children)
- handleSearchCards     // Search cards by title/content with campaign filter
- handleMoveCard        // Move card to new parent with circular ref detection

// Hierarchy tools (5)
- handleGetCardPath     // Get breadcrumb path from root to card
- handleGetSubtree      // Get all descendants of a card
- handleListChildren    // List immediate children with sorting
- handleGetSiblings     // Get cards at same level
- handleGetAncestor     // Get Nth level parent

// Graph tools (4)
- handleQueryGraph              // Query knowledge graph by natural language
- handleListGraphNodes          // List nodes filtered by type
- handleGetNodeRelationships    // Get edges connected to node
- handleUpdateGraph             // Add/update/delete nodes and edges

// Recap tools (2)
- handleGetSessionRecaps        // Get session recaps with filtering
- handleGetTimelineEvents       // Get events within date range

// Info level tools (2)
- handleListInformationLevels   // List all information levels for campaign
- handleGetInformationLevelByName  // Get specific level by name

// Database tools (3)
- handleQueryDatabaseCard       // Query database card entries
- handleCreateDatabaseEntry     // Create entry in database card
- handleUpdateDatabaseEntry     // Update database entry

// Map tools (2)
- handleListMapPins             // List pins on map card
- handleCreateMapPin            // Create pin on map card
```

**Tool Registry** (already exists in Feature 011):
```typescript
// backend/src/mcp/tools/index.ts - Feature 005 will reuse this!
export async function dispatchToolCall(name: string, params: any): Promise<any> {
  switch (name) {
    case 'search_cards':
      return await handleSearchCards(params);
    case 'create_card':
      return await handleCreateCard(params);
    case 'update_graph':
      return await handleUpdateGraph(params);
    // ... 21 more tools
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

**Available SDKs**:
- `openai` SDK (native streaming with SSE, function calling support) ✓ Use this
- `@anthropic-ai/sdk` (Claude streaming, tool use support) ✓ Use this
- ~~`@modelcontextprotocol/sdk`~~ (MCP SDK for external clients only - NOT for Import/Planning AI)

**Key Decision**: Use **OpenAI/Anthropic SDKs directly** with **function calling** to invoke Feature 011 tool handlers via `dispatchToolCall()`. No MCP SDK wrapper needed for backend workflows.

**Streaming Pattern** (OpenAI):
```typescript
import OpenAI from 'openai';

interface LLMServiceConfig {
  apiKey: string;
  model: string;
}

export class LLMOrchestrationService {
  private client: OpenAI;

  constructor(config: LLMServiceConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  async *streamCompletion(
    prompt: string,
    systemPrompt: string,
    functions?: Array<any> // OpenAI function schemas converted from Zod
  ): AsyncGenerator<string, void, unknown> {
    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      functions, // Enable function calling
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  }

  async completion(prompt: string, systemPrompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      stream: false,
    });

    return response.choices[0]?.message?.content || '';
  }
}
```

**Streaming Pattern** (Anthropic Claude):
```typescript
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeLLMService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async *streamCompletion(prompt: string, systemPrompt: string): AsyncGenerator<string, void, unknown> {
    const stream = await this.client.messages.stream({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }
}
```

**Bulk Operation Pattern** (Entity Extraction with Function Calling):
```typescript
import { dispatchToolCall } from '../mcp/tools';

interface EntityExtractionResult {
  characters: ExtractedEntity[];
  locations: ExtractedEntity[];
  factions: ExtractedEntity[];
  events: ExtractedEntity[];
}

export async function extractEntitiesBulk(
  notes: string,
  campaignId: string,
  llmService: LLMOrchestrationService
): Promise<EntityExtractionResult> {
  // First: search existing cards to provide context
  const existingCardsResult = await dispatchToolCall('search_cards', {
    campaign_id: campaignId,
    query: '',
    limit: 500
  });

  const existingCards = JSON.parse(existingCardsResult.content[0].text);

  const systemPrompt = buildEntityExtractionPrompt(existingCards);

  const prompt = `
Extract all entities from the following notes:

${notes}

Return JSON with structure:
{
  "characters": [{ "name": "...", "type": "update|new", "existingCardId": "..." }],
  "locations": [...],
  "factions": [...],
  "events": [...]
}
`;

  const response = await llmService.completion(prompt, systemPrompt);
  return JSON.parse(response);
}
```

**Function Calling Loop Pattern**:
```typescript
export async function handleFunctionCallingChat(
  userMessage: string,
  conversationHistory: Message[],
  availableFunctions: FunctionDefinition[]
): Promise<string> {
  const messages = [...conversationHistory, { role: 'user', content: userMessage }];

  let response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages,
    functions: availableFunctions,
    function_call: 'auto'
  });

  // Loop until LLM returns final text response (not function call)
  while (response.choices[0].message.function_call) {
    const { name, arguments: args } = response.choices[0].message.function_call;

    // Call Feature 011 handler via registry
    const toolResult = await dispatchToolCall(name, JSON.parse(args));

    // Add function result to conversation
    messages.push({
      role: 'function',
      name,
      content: JSON.stringify(toolResult)
    });

    // Let LLM process result and potentially call more functions
    response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      functions: availableFunctions,
      function_call: 'auto'
    });
  }

  return response.choices[0].message.content || '';
}
```

**Converting Zod Schemas to OpenAI Function Schemas**:
```typescript
import { z } from 'zod';
import { SearchCardsInputSchema } from '../mcp/schemas/card-schemas';

export function zodToOpenAISchema(zodSchema: z.ZodObject<any>): any {
  const shape = zodSchema.shape;
  const properties: any = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodTypeAny;

    // Map Zod types to JSON Schema types
    if (zodType instanceof z.ZodString) {
      properties[key] = { type: 'string' };
      const stringSchema = zodType as z.ZodString;
      if (stringSchema.minLength !== null) properties[key].minLength = stringSchema.minLength;
      if (stringSchema.maxLength !== null) properties[key].maxLength = stringSchema.maxLength;
    } else if (zodType instanceof z.ZodNumber) {
      properties[key] = { type: 'number' };
    } else if (zodType instanceof z.ZodBoolean) {
      properties[key] = { type: 'boolean' };
    } else if (zodType instanceof z.ZodArray) {
      properties[key] = { type: 'array', items: {} };
    } else if (zodType instanceof z.ZodObject) {
      properties[key] = zodToOpenAISchema(zodType); // Recursive
    } else if (zodType instanceof z.ZodEnum) {
      properties[key] = { type: 'string', enum: zodType._def.values };
    }

    // Check if required (not wrapped in ZodOptional)
    if (!(zodType instanceof z.ZodOptional) && !(zodType instanceof z.ZodNullable)) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined
  };
}

// Example: Build function definition for search_cards
import { TOOL_REGISTRY } from '../mcp/tools';

const searchCardsTool = TOOL_REGISTRY.find(t => t.name === 'search_cards');

const searchCardsFunction = {
  name: 'search_cards',
  description: 'Search for cards in campaign by title or content. Returns matching cards with metadata.',
  parameters: zodToOpenAISchema(SearchCardsInputSchema)
};

// Use in OpenAI API call
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
  functions: [searchCardsFunction, createCardFunction, updateGraphFunction, ...],
  function_call: 'auto'
});
```

**Error Handling Pattern**:
```typescript
export async function completionWithRetry(
  llmService: LLMOrchestrationService,
  prompt: string,
  systemPrompt: string,
  maxRetries = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await llmService.completion(prompt, systemPrompt);
    } catch (error) {
      lastError = error as Error;

      if (error.response?.status === 429) {
        // Rate limit: exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (error.response?.status >= 500) {
        // Server error: retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      // Client error (4xx except 429): don't retry
      throw error;
    }
  }

  throw lastError || new Error('All retries failed');
}
```

**Frontend Streaming Component**:
```typescript
import { useState } from 'react';
import { importService } from '../services/importService';

export function ImportChat({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  async function sendMessage(content: string) {
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: 'user', content }]);

    const aiMessageId = Date.now().toString();
    setMessages((prev) => [...prev, { id: aiMessageId, role: 'assistant', content: '' }]);

    try {
      const stream = await importService.chatStream(sessionId, content);
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId ? { ...msg, content: msg.content + text } : msg
          )
        );
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: 'Failed to get response. Please try again.' },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="chat-container">
      {messages.map((msg, i) => (
        <ChatMessage key={i} message={msg} />
      ))}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
```

**Progress Indicators for Bulk Operations**:
```typescript
interface ImportProgress {
  phase: 'uploading' | 'analyzing' | 'extracting' | 'searching' | 'clarifying' | 'approving';
  percent: number;
  message: string;
}

export async function importWithProgress(
  file: File,
  sessionId: string,
  onProgress: (progress: ImportProgress) => void
): Promise<ApprovalSummary> {
  onProgress({ phase: 'uploading', percent: 10, message: 'Uploading file...' });
  await importService.uploadFile(sessionId, file);

  onProgress({ phase: 'analyzing', percent: 30, message: 'Analyzing content...' });
  const analysis = await importService.analyzeContent(sessionId);

  onProgress({ phase: 'extracting', percent: 50, message: 'Extracting entities...' });
  const entities = await importService.extractEntities(sessionId);

  onProgress({ phase: 'searching', percent: 70, message: 'Searching existing cards...' });
  // Uses search_cards handler from Feature 011
  const matches = await importService.searchExisting(sessionId, entities);

  onProgress({ phase: 'clarifying', percent: 85, message: 'Generating clarifications...' });
  const clarifications = await importService.generateClarifications(sessionId, matches);

  onProgress({ phase: 'approving', percent: 100, message: 'Ready for approval' });
  return importService.getApprovalSummary(sessionId);
}
```

### Decision
**Use OpenAI/Anthropic SDKs directly** with **function calling** for prototype. **Reuse Feature 011's 24 tool handlers** via `dispatchToolCall()` registry (no duplication). Implement streaming via native SDK support (AsyncGenerator for backend, ReadableStream for frontend). **Convert Zod schemas** from `backend/src/mcp/schemas/*` to OpenAI/Anthropic function schemas using `zodToOpenAISchema()` helper. Retry logic with exponential backoff for 429/5xx errors. Progress indicators via phase-based updates (not true streaming progress).

### Alternatives Considered
- **@modelcontextprotocol/sdk**: MCP SDK is for external clients (Claude Desktop via stdio), NOT for backend Import/Planning AI workflows. Feature 011 already provides MCP server for external use. Rejected for Feature 005.
- **LangChain**: Heavy framework, overkill for structured prompts and function calling. Rejected.
- **Server-Sent Events (SSE)**: More complex than SDK native streaming. Rejected.
- **Duplicate tool handlers**: Could rewrite card/graph operations for Feature 005. Rejected - reuse Feature 011 handlers instead.

### Implementation Notes
- **API Key Storage**: Use BYOLLM config from Feature 008, stored in `byollm_configs` table (AES-256-GCM encrypted)
- **Model Selection**: Support GPT-4, GPT-3.5-turbo, Claude 3.5 Sonnet via dropdown in Settings (from Feature 008)
- **Token Limits**: Set max_tokens=4096 for completions, truncate long contexts with "..." summary
- **Cancellation**: AbortController for fetch-based requests, SDK may not support mid-stream cancellation
- **Rate Limits**: Respect 429 responses with Retry-After header, exponential backoff default 1s → 2s → 4s
- **Feature 011 Integration**: Import `dispatchToolCall` from `backend/src/mcp/tools/index.ts`, import Zod schemas from `backend/src/mcp/schemas/*`
- **Function Schema Conversion**: Build `zodToOpenAISchema()` and `zodToAnthropicSchema()` helpers in `FunctionCallingService`
- **Tool Registry Service**: Thin wrapper around Feature 011's `dispatchToolCall()` - just validates params with Zod before calling

---

## Research Area 2: Pull-Down Tab UI Pattern

### Problem Statement
Need overlay interface accessible from any campaign page that reveals AI chat without navigating away. Must support Import and Planning tabs, z-index layering over canvas, keyboard navigation, and seamless switching between wiki and AI.

### Research Findings

**UI Patterns Compared**:
- **Gmail-style overlay**: Full-height sidebar that slides in from right, overlays content
- **Notion slash command palette**: Centered modal, blocks interaction with background
- **Slack command palette**: Dropdown from top, compact, dismissible with Esc
- **GitHub Copilot chat**: Right sidebar, resizable, persistent

**Decision**: **Slack-style pull-down from top** - compact, non-blocking, familiar pattern.

**Radix UI Dialog Pattern** (accessible, keyboard-friendly):
```typescript
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';

export function ImportTab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button className="toolbar-button">
          <span>Import</span>
          <kbd>Ctrl+I</kbd>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="import-tab-content">
          <div className="tab-header">
            <Dialog.Title>AI Import</Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close">×</button>
            </Dialog.Close>
          </div>

          <ImportChatInterface />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**CSS for Pull-Down Animation**:
```css
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: fadeIn 200ms ease-out;
}

.import-tab-content {
  position: fixed;
  top: 60px; /* Below toolbar */
  right: 20px;
  width: 500px;
  max-height: calc(100vh - 80px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  animation: slideDown 300ms ease-out;
  display: flex;
  flex-direction: column;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.tab-header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.import-chat-interface {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
```

**State Management for Tab Visibility**:
```typescript
import { createContext, useContext, useState, ReactNode } from 'react';

type TabType = 'import' | 'planning' | null;

interface AITabContextValue {
  activeTab: TabType;
  openImportTab: () => void;
  openPlanningTab: () => void;
  closeTab: () => void;
}

const AITabContext = createContext<AITabContextValue | undefined>(undefined);

export function AITabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>(null);

  return (
    <AITabContext.Provider
      value={{
        activeTab,
        openImportTab: () => setActiveTab('import'),
        openPlanningTab: () => setActiveTab('planning'),
        closeTab: () => setActiveTab(null),
      }}
    >
      {children}
    </AITabContext.Provider>
  );
}

export function useAITab() {
  const context = useContext(AITabContext);
  if (!context) {
    throw new Error('useAITab must be used within AITabProvider');
  }
  return context;
}
```

**Keyboard Shortcuts**:
```typescript
import { useEffect } from 'react';
import { useAITab } from '../contexts/AITabContext';

export function useAITabShortcuts() {
  const { openImportTab, openPlanningTab, closeTab, activeTab } = useAITab();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+I: Open Import tab
      if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        openImportTab();
      }

      // Ctrl+P: Open Planning tab (Ctrl+Shift+P taken by View Mode)
      if (e.ctrlKey && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        openPlanningTab();
      }

      // Escape: Close active tab
      if (e.key === 'Escape' && activeTab) {
        e.preventDefault();
        closeTab();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, openImportTab, openPlanningTab, closeTab]);
}
```

**Toolbar Integration**:
```typescript
export function CampaignToolbar() {
  const { openImportTab, openPlanningTab } = useAITab();

  return (
    <div className="campaign-toolbar">
      <div className="toolbar-left">
        <h1>Campaign Name</h1>
      </div>

      <div className="toolbar-right">
        <button onClick={openImportTab} className="toolbar-button">
          <span>Import</span>
          <kbd>Ctrl+I</kbd>
        </button>

        <button onClick={openPlanningTab} className="toolbar-button">
          <span>Planning</span>
          <kbd>Ctrl+P</kbd>
        </button>

        <ViewModeToggle />
      </div>
    </div>
  );
}
```

**Z-Index Hierarchy**:
```css
/* Base layers */
.campaign-canvas { z-index: 1; }
.card-tree { z-index: 10; }
.painters-easel-palette { z-index: 50; }

/* AI Tab layers */
.dialog-overlay { z-index: 1000; }
.import-tab-content { z-index: 1001; }
.planning-tab-content { z-index: 1001; }

/* Approval summary modal (above AI tabs) */
.approval-summary-overlay { z-index: 2000; }
.approval-summary-content { z-index: 2001; }
```

**Focus Trap for Accessibility**:
```typescript
import { useRef, useEffect } from 'react';

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    function handleTabKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => container.removeEventListener('keydown', handleTabKey);
  }, [isActive]);

  return containerRef;
}
```

### Decision
**Use Radix UI Dialog** for accessibility foundation. Implement **pull-down from top-right** (Slack-style). Context API for tab state management. Keyboard shortcuts: Ctrl+I (Import), Ctrl+P (Planning), Esc (Close). Z-index 1000-1001 for AI tabs, 2000-2001 for approval modals. Focus trap active when tab open.

### Alternatives Considered
- **Custom overlay div**: Harder to make accessible, Radix provides ARIA out-of-box. Rejected.
- **react-modal**: Less flexible than Radix, no composition. Rejected.
- **Framer Motion for animations**: Overkill for simple slide-down. CSS animations sufficient. Rejected.
- **Full-height sidebar**: Takes too much screen space, blocks wiki view. Rejected.

### Implementation Notes
- **Responsive**: On mobile (<768px), AI tab becomes full-screen modal
- **Scroll behavior**: Tab content scrollable independently from wiki canvas
- **Session persistence**: Tab state NOT persisted across page refresh (acceptable for prototype)
- **Multi-tab prevention**: Only one AI tab (Import OR Planning) open at once, switching closes previous

---

## Research Area 3: Entity Extraction & Deduplication

(Continuing with the EXACT content from original file lines 570-2648...)
