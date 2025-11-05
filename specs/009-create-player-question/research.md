# Research: Player Question Portal

**Feature**: 009-create-player-question
**Date**: 2025-10-31
**Status**: Complete

This document consolidates technical research for implementing Player Question Portal with information filtering, lightweight player identity, citation generation, and token tracking using current architecture (as of 2025-10-31).

---

## Current Architecture Context

**ViewMode System** (Feature 004 + unification):
- Middleware: `backend/src/middleware/viewMode.ts`
- Functions: `extractViewMode()`, `stripDmFields()`, `getPlayerKnowledgeFilter()`
- X-View-Mode header sets `dm_view` or `player_view`
- Used throughout application for information filtering

**BaseCategoryService** (Feature 014):
- All 13 categories extend BaseCategoryService
- Standard `.list(filters, pagination, sort?, order?)` respects view mode
- SessionRecapService extends BaseCategoryService
- ItemService extends BaseCategoryService

**BYOLLM** (Feature 008):
- BYOLLMConfigService with OAuth flow
- Encrypted credentials (AES-256-GCM)
- Custom endpoints support (Ollama, LM Studio)
- Provider clients for OpenAI/Anthropic

**Information Levels**:
- Stored in `information_levels` table
- IDs: `common-knowledge`, `player-knowledge`, `dm-secret`, `system`
- Custom levels supported with `hierarchical` flag
- `getPlayerKnowledgeFilter()` queries this table

---

## Research Topic 1: Player Identity Session Mechanism

**Decision**: Use crypto random tokens stored in portal_players table

**Rationale**:
- **Simpler than express-session**: No external session store needed
- Generate random token with `crypto.randomBytes(32).toString('hex')`
- Store token in `portal_players.session_token` column
- Send token to client as HTTP-only cookie
- Look up player by token on subsequent requests
- Token persists player identity across browser sessions
- No dependency on express-session library
- Aligns with local-only prototype approach (Constitution VI)

**Implementation**:
```typescript
// PortalPlayerService.ts
import crypto from 'crypto';

export class PortalPlayerService {
  async identifyPlayer(
    campaignId: string,
    characterName: string
  ): Promise<{ player: PortalPlayer; sessionToken: string }> {
    // Check for unique character name
    const existing = this.db
      .prepare('SELECT id FROM portal_players WHERE campaign_id = ? AND character_name = ?')
      .get(campaignId, characterName);

    if (existing) {
      throw new Error('Character name already in use. Please choose a different name.');
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Create player identity
    const playerId = uuid();
    this.db.prepare(`
      INSERT INTO portal_players (id, campaign_id, character_name, session_token, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(playerId, campaignId, characterName, sessionToken, Date.now());

    return {
      player: { id: playerId, campaignId, characterName, sessionToken, createdAt: Date.now() },
      sessionToken
    };
  }

  async getPlayerByToken(sessionToken: string): Promise<PortalPlayer | null> {
    return this.db.prepare('SELECT * FROM portal_players WHERE session_token = ?').get(sessionToken);
  }
}

// portal-public.routes.ts
router.post('/portal/:campaignId/identify', async (req, res) => {
  const { campaignId } = req.params;
  const { characterName, password } = req.body;

  // Verify password, check portal enabled, etc.

  // Create player identity
  const { player, sessionToken } = await portalPlayerService.identifyPlayer(campaignId, characterName);

  // Send token as HTTP-only cookie
  res.cookie('portal_session', sessionToken, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'strict'
  });

  res.status(201).json({ player });
});
```

**Alternatives Considered**:
- **express-session**: Rejected - adds dependency, overkill for prototype
- **JWT**: Rejected - unnecessary complexity, stateless not needed
- **LocalStorage only**: Rejected - less secure, no server-side tracking for GM monitoring

---

## Research Topic 2: Public URL Generation and Password Protection

**Decision**: Use campaign UUID in URL path with bcrypt password hashing

**Rationale**:
- **URL Pattern**: `http://localhost:3000/portal/{campaign-uuid}`
- Campaign UUID already unique, no additional URL generation needed
- Express routing: `app.use('/portal/:campaignId', portalPublicRoutes)`
- Password optional (FR-016), stored as bcrypt hash in `portal_configs.password_hash`
- bcrypt standard for password hashing (10 salt rounds for prototype)
- Public endpoint checks password before allowing access

**Implementation**:
```typescript
// PortalConfig.ts model
interface PortalConfig {
  id: string;
  campaignId: string;
  enabled: boolean;
  passwordHash: string | null; // bcrypt hash if password protection enabled
  responseStyle: 'friendly-sage' | 'scholarly-tome' | 'tavern-gossip' | 'factual' | 'custom';
  customSystemPrompt: string | null;
  createdAt: number;
  updatedAt: number;
}

// PortalConfigService.ts
import bcrypt from 'bcrypt';

export class PortalConfigService {
  async setPassword(campaignId: string, password: string | null): Promise<void> {
    if (password === null) {
      // Remove password protection
      this.db.prepare(
        'UPDATE portal_configs SET password_hash = NULL, updated_at = ? WHERE campaign_id = ?'
      ).run(Date.now(), campaignId);
    } else {
      // Hash and store password
      const passwordHash = await bcrypt.hash(password, 10);
      this.db.prepare(
        'UPDATE portal_configs SET password_hash = ?, updated_at = ? WHERE campaign_id = ?'
      ).run(passwordHash, Date.now(), campaignId);
    }
  }

  async verifyPassword(campaignId: string, password: string): Promise<boolean> {
    const config = this.getConfig(campaignId);
    if (!config.passwordHash) return true; // No password protection

    return await bcrypt.compare(password, config.passwordHash);
  }
}
```

**Alternatives Considered**:
- **Random URL slugs**: Rejected - adds complexity, campaign UUID sufficient
- **Plaintext password storage**: Rejected - poor security practice
- **No password option**: Rejected - FR-016 requires optional password

---

## Research Topic 3: viewMode Middleware Integration for Information Filtering

**Decision**: Reuse existing viewMode middleware with `getPlayerKnowledgeFilter()` for portal filtering

**Rationale**:
- **Current architecture** (as of 2025-10-31): `backend/src/middleware/viewMode.ts` provides filtering
- `getPlayerKnowledgeFilter()` returns SQL WHERE clause excluding hierarchical levels
- BaseCategoryService `.list()` method already uses this filtering
- Portal AI calls BaseCategoryService with `player_view` mode
- Session Recaps: `SessionRecapService.list()` with player_view
- Items database: `ItemService.list()` with player_view
- Knowledge graphs: Filter nodes by `player_knowledge` field
- **No new service needed** - reuse existing middleware
- Ensures consistency between Player View UI and portal responses

**Implementation**:
```typescript
// PortalAIService.ts
import { getPlayerKnowledgeFilter } from '../middleware/viewMode';
import { SessionRecapService } from './SessionRecapService';
import { ItemService } from './ItemService';
import { KnowledgeGraphService } from './KnowledgeGraphService';

export class PortalAIService {
  constructor(
    private sessionRecapService: SessionRecapService,
    private itemService: ItemService,
    private knowledgeGraphService: KnowledgeGraphService,
    private citationGenerator: CitationGeneratorService,
    private tokenTracker: PortalTokenTrackerService,
    private byollmConfig: BYOLLMConfigService
  ) {}

  async answerQuestion(
    campaignId: string,
    playerId: string,
    question: string
  ): Promise<PortalMessage> {
    // Step 1: Get filtered content using existing services
    const recaps = await this.sessionRecapService.list(
      { campaign_id: campaignId },
      { limit: 100 },
      'session_number',
      'DESC'
    ); // Automatically filtered by player_view via BaseCategoryService

    const items = await this.itemService.list(
      { campaign_id: campaignId },
      { limit: 100 }
    ); // Automatically filtered by player_view

    // Step 2: Get filtered knowledge graph nodes
    const graphNodes = await this.knowledgeGraphService.getFilteredNodes(
      campaignId,
      'player_view' // Filters by player_knowledge field
    );

    // Step 3: Build context for LLM prompt
    const context = this.buildContext(recaps, items, graphNodes);

    // Step 4: Get BYOLLM credentials and query LLM
    const config = await this.byollmConfig.getConfig(campaignId);
    const response = await this.queryLLM(question, context, config);

    // Step 5: Generate citations
    const citations = this.citationGenerator.generate(response.sources);

    // Step 6: Track token usage
    await this.tokenTracker.record(playerId, campaignId, messageId, response.tokenCount);

    return {
      id: messageId,
      conversationId,
      playerId,
      question,
      response: response.text,
      citations,
      tokenCount: response.tokenCount,
      createdAt: Date.now()
    };
  }

  private buildContext(recaps: SessionRecap[], items: Item[], graphNodes: GraphNode[]): string {
    // Combine filtered content into LLM context
    const recapSummaries = recaps.map(r => `[Session ${r.session_number}]: ${r.summary}`).join('\n\n');
    const itemList = items.map(i => `${i.name}: ${i.description}`).join('\n');
    const graphRelationships = graphNodes.map(n => `${n.label} (${n.type})`).join('\n');

    return `# Campaign Information\n\n${recapSummaries}\n\n# Items\n\n${itemList}\n\n# Relationships\n\n${graphRelationships}`;
  }
}
```

**Alternatives Considered**:
- **Create new InformationFilterService**: Rejected - duplicates existing middleware, violates DRY
- **Custom portal filtering logic**: Rejected - inconsistency risk with Player View
- **Rely on LLM to filter**: Rejected - security-critical requirement, cannot trust LLM

**Validation**: Portal responses MUST match exactly what Player View shows (same filtering)

---

## Research Topic 4: Citation Generation and Card Linking

**Decision**: Parse LLM response metadata to generate numbered citations with card UUIDs

**Rationale**:
- LLM system prompt instructs AI: "Cite sources using [card_id] format"
- CitationGeneratorService parses response for card IDs
- Generates numbered citations [1][2][3]
- Citations link to existing card routes (from Feature 003)
- Frontend CitationLink component navigates to card detail page
- Provides transparency (Constitution Principle VII)
- <100ms generation time (simple string replacement)

**Implementation**:
```typescript
// CitationGeneratorService.ts
interface Citation {
  number: number;
  cardId: string;
  cardTitle: string;
  url: string;
}

export class CitationGeneratorService {
  generate(sources: Array<{ id: string; title: string }>): Citation[] {
    return sources.map((source, index) => ({
      number: index + 1,
      cardId: source.id,
      cardTitle: source.title,
      url: `/cards/${source.id}` // Existing card route from Feature 003
    }));
  }

  formatResponse(responseText: string, citations: Citation[]): string {
    // Replace [card_id] with [1], [2], etc.
    let formatted = responseText;
    citations.forEach(citation => {
      const regex = new RegExp(`\\[${citation.cardId}\\]`, 'g');
      formatted = formatted.replace(regex, `[${citation.number}]`);
    });
    return formatted;
  }
}

// System prompt for Portal AI
const PORTAL_SYSTEM_PROMPT = `
You are a knowledgeable guide for this campaign world. Answer player questions using ONLY the provided campaign information.

RULES:
1. Only use information from the provided context.
2. If you don't have information, respond: "I don't have information about that."
3. Never invent or fabricate information not in the context.
4. Cite sources using [card_id] format when referencing information.
5. Match the configured response style.

Context:
{filtered_content}
`;
```

**Frontend CitationLink Component**:
```typescript
// CitationLink.tsx
interface CitationLinkProps {
  citation: Citation;
}

export const CitationLink: React.FC<CitationLinkProps> = ({ citation }) => {
  const navigate = useNavigate();

  return (
    <button
      className="citation-link"
      onClick={() => navigate(citation.url)}
      title={citation.cardTitle}
    >
      [{citation.number}]
    </button>
  );
};
```

**Alternatives Considered**:
- **No citations**: Rejected - violates transparency principle
- **Inline card links**: Rejected - disrupts reading flow
- **Manual citation selection**: Rejected - slow, error-prone

---

## Research Topic 5: Token Usage Tracking and Aggregation

**Decision**: Store token count per message, aggregate with SQL queries

**Rationale**:
- Each AI response has token count from provider API
- Store in `portal_token_usage` table per message
- SQL SUM aggregation for per-player totals
- SQL SUM aggregation for campaign totals
- GM monitoring panel fetches aggregated data on page load
- No real-time tracking (FR-073: reviewed on login, no real-time notifications)
- Simple, no external analytics needed

**Implementation**:
```typescript
// PortalTokenTrackerService.ts
export class PortalTokenTrackerService {
  async record(
    playerId: string,
    campaignId: string,
    messageId: string,
    tokenCount: number
  ): Promise<void> {
    this.db.prepare(`
      INSERT INTO portal_token_usage (id, player_id, campaign_id, message_id, token_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuid(), playerId, campaignId, messageId, tokenCount, Date.now());
  }

  async getPlayerUsage(playerId: string): Promise<number> {
    const result = this.db.prepare(`
      SELECT SUM(token_count) as total FROM portal_token_usage WHERE player_id = ?
    `).get(playerId);
    return result?.total || 0;
  }

  async getCampaignUsage(campaignId: string): Promise<number> {
    const result = this.db.prepare(`
      SELECT SUM(token_count) as total FROM portal_token_usage WHERE campaign_id = ?
    `).get(campaignId);
    return result?.total || 0;
  }

  async getPerPlayerUsage(campaignId: string): Promise<Array<{ playerName: string; tokenCount: number }>> {
    return this.db.prepare(`
      SELECT
        pp.character_name as playerName,
        SUM(ptu.token_count) as tokenCount
      FROM portal_token_usage ptu
      JOIN portal_players pp ON ptu.player_id = pp.id
      WHERE ptu.campaign_id = ?
      GROUP BY pp.id
      ORDER BY tokenCount DESC
    `).all(campaignId);
  }
}
```

**Token Count Sources**:
- OpenAI: `response.usage.total_tokens`
- Anthropic: `response.usage.input_tokens + response.usage.output_tokens`

**Alternatives Considered**:
- **Real-time tracking**: Rejected - FR-073 specifies no real-time notifications
- **No granular tracking**: Rejected - GM needs per-player visibility
- **External analytics**: Rejected - violates local-only principle (Constitution VI)

---

## Research Topic 6: Concurrent Player Access Handling

**Decision**: SQLite WAL mode (already enabled) + Node.js event loop for concurrent access

**Rationale**:
- **SQLite WAL mode**: Already enabled in project (`PRAGMA journal_mode = WAL`)
- Supports multiple concurrent readers and one writer
- Per-player conversations isolated in separate rows (no contention)
- Unique character name constraint prevents duplicates
- Node.js single-threaded event loop queues AI requests naturally
- No additional concurrency primitives needed for prototype scale (10 players)
- Database locking handled by Better-SQLite3 automatically

**Implementation**:
```typescript
// database.ts (existing configuration)
const db = new Database('data/wrldbldr-mcp-manager.db');
db.pragma('journal_mode = WAL'); // Already enabled
db.pragma('foreign_keys = ON');

// Concurrent requests naturally queued
// Player 1 asks question → async AI call → response
// Player 2 asks question (simultaneous) → queued by event loop → async AI call → response
```

**Concurrency Guarantees**:
- Multiple players read simultaneously (WAL mode)
- Player identity creation serialized (UNIQUE constraint prevents duplicates)
- AI requests processed sequentially per event loop (natural rate limiting)
- Token usage writes don't block (separate rows per message)

**Alternatives Considered**:
- **Redis for distributed locking**: Rejected - adds external dependency, unnecessary for prototype
- **Database connection pooling**: Rejected - SQLite single-file doesn't benefit
- **Explicit mutex locks**: Rejected - unnecessary complexity

**Performance Note**: For 10 concurrent players, SQLite WAL + Node.js event loop provides adequate throughput. Production would require PostgreSQL.

---

## Summary of Key Decisions

| Topic | Decision | Key Technology |
|-------|----------|----------------|
| Player Identity | Crypto random tokens in DB | crypto.randomBytes(), HTTP-only cookie |
| Public URLs | Campaign UUID in URL path | Express routing, bcrypt passwords |
| Information Filtering | Reuse viewMode middleware + BaseCategoryService | `getPlayerKnowledgeFilter()`, `.list()` with player_view |
| Citation Generation | Parse LLM response, numbered format | CitationGeneratorService, string replacement |
| Token Tracking | Per-message storage with SQL aggregation | SQLite SUM queries |
| Concurrent Access | SQLite WAL + event loop | WAL mode (already enabled), async/await |

All decisions prioritize:
1. **Constitution compliance** (information filtering, BYOLLM integration, transparency)
2. **Reuse existing architecture** (viewMode middleware, BaseCategoryService, BYOLLMConfigService)
3. **Prototype simplicity** (local-only, SQLite, minimal dependencies)
4. **GM control** (monitoring, preview mode, password protection)

---

**Phase 0 Complete**: All technical unknowns resolved using current architecture. Ready for Phase 1 (Design & Contracts).
