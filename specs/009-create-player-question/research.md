# Research: Player Question Portal

**Feature**: 009-create-player-question
**Date**: 2025-10-01
**Status**: Complete

This document consolidates technical research for implementing Player Question Portal with information filtering, lightweight player identity, citation generation, and token tracking.

---

## Research Topic 1: Lightweight Account Linkage for Public Portal

**Decision**: Use express-session with SQLite session store for lightweight player identity persistence

**Rationale**:
- **express-session** provides battle-tested session management for Node.js/Express
- SQLite session store keeps all data local (aligns with Constitution Principle VI)
- Session cookie identifies player without requiring full authentication
- Player identity stored in `portal_players` table, session references player ID
- No password required (lightweight linkage, not security-critical authentication)
- Session persists across browser sessions for conversation history continuity
- Simple to implement, well-documented, minimal dependencies

**Implementation**:
```typescript
// session-config.ts
import session from 'express-session';
import SqliteStore from 'better-sqlite3-session-store';
import Database from 'better-sqlite3';

const db = new Database('data/vvd-mimic.db');
const SqliteSessionStore = SqliteStore(session);

export const sessionMiddleware = session({
  store: new SqliteSessionStore({
    client: db,
    expired: {
      clear: true,
      intervalMs: 900000 // Clean up expired sessions every 15 minutes
    }
  }),
  secret: process.env.SESSION_SECRET || 'vvd-mimic-portal-secret-prototype',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: false // Set to true in production with HTTPS
  },
  name: 'vvd-portal-session'
});

// portal-player.service.ts
export class PortalPlayerService {
  async identifyPlayer(
    campaignId: string,
    characterName: string,
    sessionId: string
  ): Promise<PortalPlayer> {
    // Check for unique character name
    const existing = await this.db.prepare(
      'SELECT id FROM portal_players WHERE campaign_id = ? AND character_name = ?'
    ).get(campaignId, characterName);

    if (existing) {
      throw new Error('Character name already in use. Please choose a different name.');
    }

    // Create player identity
    const playerId = uuid();
    await this.db.prepare(
      'INSERT INTO portal_players (id, campaign_id, character_name, session_id, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(playerId, campaignId, characterName, sessionId, Date.now());

    return { id: playerId, campaignId, characterName, sessionId };
  }

  async getPlayerBySession(sessionId: string): Promise<PortalPlayer | null> {
    return this.db.prepare(
      'SELECT * FROM portal_players WHERE session_id = ?'
    ).get(sessionId);
  }
}
```

**Alternatives Considered**:
- **JWT tokens**: Rejected - overkill for lightweight linkage, adds complexity
- **Cookies only (no session store)**: Rejected - less secure, harder to manage
- **Local storage**: Rejected - client-side only, no server-side tracking for GM monitoring
- **Full authentication (Keycloak)**: Rejected - violates "no login required" requirement

**Session Schema**:
```sql
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expired INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired);
```

---

## Research Topic 2: Public URL Generation and Password Protection

**Decision**: Use campaign UUID in URL path with optional bcrypt password hashing

**Rationale**:
- **URL Pattern**: `http://localhost:3000/portal/{campaign-uuid}`
- Campaign UUID already unique, no additional URL generation needed
- Simple to route in Express: `app.use('/portal/:campaignId', portalPublicRoutes)`
- Password protection optional per FR-016
- bcrypt for password hashing (industry standard, prototype-appropriate)
- Password stored in `portal_configs` table as hashed value
- Public endpoint checks password before allowing access

**Implementation**:
```typescript
// portal-config.model.ts
interface PortalConfig {
  id: string; // UUID
  campaignId: string; // FK to campaigns
  enabled: boolean;
  passwordHash: string | null; // bcrypt hash if password protection enabled
  responseStyle: 'friendly-sage' | 'scholarly-tome' | 'tavern-gossip' | 'factual' | 'custom';
  customSystemPrompt: string | null; // If response_style = 'custom'
  createdAt: number;
  updatedAt: number;
}

// portal-config.service.ts
import bcrypt from 'bcrypt';

export class PortalConfigService {
  async setPassword(campaignId: string, password: string | null): Promise<void> {
    if (password === null) {
      // Remove password protection
      await this.db.prepare(
        'UPDATE portal_configs SET password_hash = NULL, updated_at = ? WHERE campaign_id = ?'
      ).run(Date.now(), campaignId);
    } else {
      // Hash and store password
      const passwordHash = await bcrypt.hash(password, 10); // 10 salt rounds
      await this.db.prepare(
        'UPDATE portal_configs SET password_hash = ?, updated_at = ? WHERE campaign_id = ?'
      ).run(passwordHash, Date.now(), campaignId);
    }
  }

  async verifyPassword(campaignId: string, password: string): Promise<boolean> {
    const config = await this.getConfig(campaignId);
    if (!config.passwordHash) return true; // No password protection

    return await bcrypt.compare(password, config.passwordHash);
  }
}

// portal-public.routes.ts
router.post('/portal/:campaignId/identify', async (req, res) => {
  const { campaignId } = req.params;
  const { characterName, password } = req.body;

  // Check if portal enabled
  const config = await portalConfigService.getConfig(campaignId);
  if (!config || !config.enabled) {
    return res.status(403).json({ error: 'Portal is not enabled for this campaign' });
  }

  // Check password if required
  if (config.passwordHash) {
    const passwordValid = await portalConfigService.verifyPassword(campaignId, password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
  }

  // Create player identity
  const player = await portalPlayerService.identifyPlayer(
    campaignId,
    characterName,
    req.sessionID
  );

  req.session.playerId = player.id;
  res.status(201).json({ player });
});
```

**Alternatives Considered**:
- **Random URL slugs**: Rejected - adds complexity, campaign UUID sufficient
- **Plaintext password storage**: Rejected - poor security practice even for prototype
- **No password option**: Rejected - requirement FR-016 mandates optional password protection

**URL Examples**:
- Portal access: `http://localhost:3000/portal/550e8400-e29b-41d4-a716-446655440000`
- GM management: `http://localhost:3000/campaigns/550e8400-e29b-41d4-a716-446655440000/portal`

---

## Research Topic 3: Feature 004 ViewModeService Integration for Information Filtering

**Decision**: Reuse existing ViewModeService with `view_mode = 'player'` for portal filtering

**Rationale**:
- Feature 004 already implements robust information filtering
- ViewModeService filters cards by information_level_id
- `view_mode = 'player'` returns only Common Knowledge + Player Knowledge
- System and DM Secret tags automatically filtered out
- Same filtering logic portal needs (no duplication)
- Portal AI service calls ViewModeService before querying cards
- Ensures consistency between Player/General View and portal responses

**Implementation**:
```typescript
// portal-ai.service.ts
import { ViewModeService } from './view-mode.service';
import { KnowledgeGraphService } from './knowledge-graph.service';

export class PortalAIService {
  constructor(
    private viewModeService: ViewModeService,
    private knowledgeGraphService: KnowledgeGraphService,
    private citationGenerator: CitationGeneratorService,
    private tokenTracker: TokenTrackerService
  ) {}

  async answerQuestion(
    campaignId: string,
    playerId: string,
    question: string
  ): Promise<PortalMessage> {
    // Step 1: Get filtered cards (Common Knowledge + Player Knowledge only)
    const accessibleCards = await this.viewModeService.getFilteredCards(
      campaignId,
      'player' // Same filtering as Player/General View
    );

    // Step 2: Get filtered knowledge graph nodes
    const graphNodes = await this.knowledgeGraphService.getFilteredNodes(
      campaignId,
      'player'
    );

    // Step 3: Build context for LLM prompt
    const context = this.buildContext(accessibleCards, graphNodes);

    // Step 4: Query LLM with filtered context
    const response = await this.queryLLM(question, context, campaignId);

    // Step 5: Generate citations
    const citations = await this.citationGenerator.generate(response.sources);

    // Step 6: Track token usage
    await this.tokenTracker.record(playerId, campaignId, response.tokenCount);

    return {
      id: uuid(),
      playerId,
      question,
      response: response.text,
      citations,
      tokenCount: response.tokenCount,
      createdAt: Date.now()
    };
  }

  private buildContext(cards: Card[], graphNodes: GraphNode[]): string {
    // Combine card content and graph relationships into LLM context
    const cardSummaries = cards.map(c => `[${c.title}]: ${c.content}`).join('\n\n');
    const graphRelationships = graphNodes.map(n =>
      `${n.label} (${n.type}): ${n.attributes}`
    ).join('\n');

    return `# Campaign Information\n\n${cardSummaries}\n\n# Relationships\n\n${graphRelationships}`;
  }
}
```

**ViewModeService Reuse** (from Feature 004):
```typescript
// view-mode.service.ts (existing)
export class ViewModeService {
  async getFilteredCards(campaignId: string, viewMode: 'dm' | 'player'): Promise<Card[]> {
    if (viewMode === 'dm') {
      // DM sees all cards
      return this.db.prepare('SELECT * FROM cards WHERE campaign_id = ?').all(campaignId);
    }

    // Player/General view: only Common Knowledge + Player Knowledge
    return this.db.prepare(`
      SELECT c.* FROM cards c
      JOIN information_levels il ON c.information_level_id = il.id
      WHERE c.campaign_id = ? AND il.name IN ('Common Knowledge', 'Player Knowledge')
    `).all(campaignId);
  }
}
```

**Alternatives Considered**:
- **Duplicate filtering logic**: Rejected - violates DRY principle, maintenance burden
- **Custom portal filtering**: Rejected - reinvents wheel, inconsistency risk
- **No filtering (trust LLM)**: Rejected - security-critical requirement, cannot rely on LLM

**Validation**: Portal responses MUST match exactly what Player/General View shows

---

## Research Topic 4: Citation Generation and Card Linking

**Decision**: Use LLM response metadata to generate numbered citations with card UUIDs

**Rationale**:
- LLM prompt instructs AI to reference sources: "Cite sources using [source_id] format"
- CitationGeneratorService parses LLM response for source references
- Maps source IDs to actual card UUIDs from context
- Generates numbered citations [1][2][3] in response text
- Citations link to `/cards/{uuid}` route (existing card view)
- Users click citation → navigate to source card (if accessible)
- Provides transparency and verifiability (Constitution Principle VII)

**Implementation**:
```typescript
// citation-generator.service.ts
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
      url: `/cards/${source.id}`
    }));
  }

  formatResponse(responseText: string, citations: Citation[]): string {
    // Replace [source_id] placeholders with numbered citations
    let formatted = responseText;
    citations.forEach(citation => {
      const regex = new RegExp(`\\[${citation.cardId}\\]`, 'g');
      formatted = formatted.replace(regex, `[${citation.number}]`);
    });
    return formatted;
  }
}

// LLM System Prompt (included in portal AI queries)
const SYSTEM_PROMPT = `
You are a knowledgeable guide for this campaign world. Answer player questions using ONLY the provided campaign information.

IMPORTANT RULES:
1. Only use information from the provided context (cards and relationships).
2. If you don't have information to answer a question, respond: "I don't have information about that."
3. Never invent or fabricate information not in the context.
4. Cite your sources using [card_id] format when referencing information.
5. Be helpful and engaging, matching the configured response style.

Context:
{filtered_cards_and_graphs}
`;

// Example LLM Response (before citation formatting):
// "Waterdeep is ruled by the Lords of Waterdeep, a council of masked nobles.[card-uuid-1]
//  Lord Dagult Neverember serves as Open Lord.[card-uuid-1] You met him in Session 3.[card-uuid-2]"

// After CitationGeneratorService.formatResponse():
// "Waterdeep is ruled by the Lords of Waterdeep, a council of masked nobles.[1]
//  Lord Dagult Neverember serves as Open Lord.[1] You met him in Session 3.[2]"
```

**Frontend Citation Component**:
```typescript
// CitationLink.tsx
interface CitationLinkProps {
  citation: Citation;
}

export const CitationLink: React.FC<CitationLinkProps> = ({ citation }) => {
  return (
    <a
      href={citation.url}
      className="citation-link"
      title={citation.cardTitle}
      target="_blank"
      rel="noopener noreferrer"
    >
      [{citation.number}]
    </a>
  );
};

// PortalChat.tsx (displaying response with citations)
<div className="ai-response">
  <ReactMarkdown>{message.response}</ReactMarkdown>
  <div className="citations">
    <h4>Sources:</h4>
    {message.citations.map(citation => (
      <div key={citation.number}>
        <CitationLink citation={citation} /> {citation.cardTitle}
      </div>
    ))}
  </div>
</div>
```

**Alternatives Considered**:
- **No citations**: Rejected - violates transparency principle, users can't verify sources
- **Inline card links**: Rejected - disrupts reading flow, harder to implement
- **Footnote-style citations**: Considered equivalent, chose numbered brackets for conciseness

---

## Research Topic 5: Token Usage Tracking and Aggregation

**Decision**: Track tokens per message in `portal_token_usage` table with aggregation queries

**Rationale**:
- Each AI response has token count from provider API
- Store token count per message for granular tracking
- Aggregate by player ID for per-player usage in monitoring panel
- Aggregate by campaign ID for total campaign usage
- Simple SQL queries for aggregation (SUM grouped by player)
- GM monitoring panel fetches aggregated data on page load
- No real-time tracking (FR-073: reviewed on login, no real-time notifications)

**Implementation**:
```typescript
// portal-token-usage.model.ts
interface PortalTokenUsage {
  id: string; // UUID
  playerId: string; // FK to portal_players
  campaignId: string; // FK to campaigns
  messageId: string; // FK to portal_messages
  tokenCount: number;
  createdAt: number;
}

// SQL Schema
CREATE TABLE IF NOT EXISTS portal_token_usage (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES portal_players(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES portal_messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_token_usage_player ON portal_token_usage(player_id);
CREATE INDEX IF NOT EXISTS idx_portal_token_usage_campaign ON portal_token_usage(campaign_id);

// token-tracker.service.ts
export class TokenTrackerService {
  async record(playerId: string, campaignId: string, messageId: string, tokenCount: number): Promise<void> {
    await this.db.prepare(`
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

// GM Monitoring Panel Data Fetching
async function loadMonitoringData(campaignId: string) {
  const perPlayerUsage = await tokenTrackerService.getPerPlayerUsage(campaignId);
  const totalUsage = await tokenTrackerService.getCampaignUsage(campaignId);

  return {
    perPlayerUsage, // [{ playerName: "Sarah (Lyra)", tokenCount: 4200 }, ...]
    totalUsage // 5700
  };
}
```

**Alternatives Considered**:
- **Real-time token tracking**: Rejected - FR-073 specifies no real-time notifications
- **No granular tracking (only totals)**: Rejected - GM needs per-player visibility
- **External analytics service**: Rejected - violates local-only principle

**Token Count Source**: Provider API returns token count (OpenAI: `usage.total_tokens`, Anthropic: `usage.input_tokens + usage.output_tokens`)

---

## Research Topic 6: Concurrent Player Access Handling

**Decision**: Use SQLite WAL mode with express-session for concurrent access

**Rationale**:
- **SQLite WAL (Write-Ahead Logging)**: Already enabled in project, supports multiple concurrent readers and one writer
- express-session handles concurrent session access (session store manages locking)
- Per-player conversations isolated in separate table rows (no contention)
- Player identities unique per campaign (enforced by UNIQUE constraint on character_name)
- Concurrent AI requests queued naturally by async/await + single-threaded Node.js event loop
- No additional concurrency primitives needed for prototype scale (10 players)
- Database connection pooling not needed (SQLite is single-file, Better-SQLite3 handles concurrency)

**Implementation**:
```typescript
// database.ts (existing WAL mode configuration)
const db = new Database('data/vvd-mimic.db');
db.pragma('journal_mode = WAL'); // Write-Ahead Logging for concurrent access
db.pragma('foreign_keys = ON');

// Concurrent requests naturally handled
// Player 1 asks question → async AI call → response
// Player 2 asks question (simultaneous) → queued by event loop → async AI call → response
// No explicit locking needed

// Session store handles concurrent session reads/writes
const sessionStore = new SqliteSessionStore({
  client: db,
  expired: {
    clear: true,
    intervalMs: 900000
  }
});
```

**Concurrency Guarantees**:
- Multiple players can read portal simultaneously (WAL mode)
- Player identity creation serialized by SQLite (UNIQUE constraint prevents duplicates)
- AI requests processed sequentially per Node.js event loop (natural rate limiting)
- Session updates handled by express-session store (atomic operations)

**Alternatives Considered**:
- **Redis for session store**: Rejected - adds external dependency, WAL mode sufficient for prototype
- **Database connection pooling**: Rejected - SQLite single-file doesn't benefit from pooling
- **Explicit locking**: Rejected - unnecessary complexity for prototype scale

**Performance Note**: For 10 concurrent players, SQLite WAL + Node.js event loop provides adequate throughput. Production scale would require PostgreSQL + connection pooling.

---

## Research Topic 7: Session Recap Granular Content Filtering

**Decision**: Use card-level information filtering for Session Recaps (treat each recap as card)

**Rationale**:
- Session Recaps stored as cards in `cards` table (card_type = 'session-recap')
- Each recap card has `information_level_id` (Common Knowledge, Player Knowledge, or DM Secret)
- ViewModeService already filters cards by information level
- Portal AI queries Session Recap cards through ViewModeService (`view_mode = 'player'`)
- **Granular filtering**: If GM wants mixed content (some player-visible, some secret), GM creates separate cards
- Example: "Session 5 Recap - Player View" (Player Knowledge) + "Session 5 - DM Notes" (DM Secret)
- Portal only accesses "Player View" recap, never "DM Notes" recap
- Simple implementation, aligns with card-based architecture

**Implementation**:
```typescript
// session-recap-filter.service.ts
export class SessionRecapFilterService {
  async getAccessibleRecaps(campaignId: string): Promise<Card[]> {
    // Reuse ViewModeService filtering
    const accessibleCards = await this.viewModeService.getFilteredCards(
      campaignId,
      'player'
    );

    // Filter to only session-recap cards
    return accessibleCards.filter(card =>
      card.cardType === 'session-recap'
    );
  }
}

// Portal AI Service includes recaps in context
async answerQuestion(campaignId: string, playerId: string, question: string) {
  const accessibleCards = await this.viewModeService.getFilteredCards(campaignId, 'player');
  const accessibleRecaps = await this.sessionRecapFilterService.getAccessibleRecaps(campaignId);

  const context = this.buildContext(accessibleCards, accessibleRecaps, graphNodes);
  // ... rest of AI query
}
```

**Granular Filtering Strategy**:
- GM creates recap cards with appropriate information levels
- Mixed content → GM creates multiple cards (one per information level)
- Portal AI only sees Common Knowledge + Player Knowledge recaps
- DM Secret recaps completely invisible to portal

**Alternatives Considered**:
- **Content-piece-level filtering within single recap**: Rejected - adds complexity, card-level simpler
- **Markdown metadata tags for filtering**: Rejected - fragile, hard to validate
- **No recap access for portal**: Rejected - recaps provide valuable timeline context

**Best Practice for GMs**: Create separate recap cards for player-visible content vs DM-only notes

---

## Research Topic 8: Items Database "Held By" Field Querying

**Decision**: Query Items database card entries with "Held By" field matching party member names

**Rationale**:
- Items stored in database card (Feature 003: database-card with schema)
- "Held By" field is property field in database schema
- Portal AI recognizes inventory questions: "What magic items does our party have?"
- Query Items database entries WHERE "Held By" IN (known party member names)
- Party member names come from `portal_players` for that campaign
- Additional query for "Held By" = "party" (shared items)
- Results include clickable citations to item cards

**Implementation**:
```typescript
// portal-ai.service.ts (inventory query handler)
async queryInventory(campaignId: string, question: string): Promise<string> {
  // Get party member names from portal players
  const partyMembers = await this.db.prepare(`
    SELECT character_name FROM portal_players WHERE campaign_id = ?
  `).all(campaignId);

  const partyNames = partyMembers.map(p => p.character_name);

  // Get Items database for this campaign
  const itemsDatabase = await this.getDatabaseCard(campaignId, 'Items');
  if (!itemsDatabase) {
    return "I don't have access to an Items database for this campaign.";
  }

  // Query database entries with "Held By" matching party members or "party"
  const items = await this.db.prepare(`
    SELECT * FROM database_entries
    WHERE database_card_id = ?
    AND json_extract(entry_data, '$.held_by') IN (${partyNames.map(() => '?').join(',')}, 'party')
    AND information_level_id IN (
      SELECT id FROM information_levels WHERE name IN ('Common Knowledge', 'Player Knowledge')
    )
  `).all(itemsDatabase.id, ...partyNames);

  // Format response with citations
  const itemList = items.map((item, index) => {
    const data = JSON.parse(item.entry_data);
    return `${data.name} (${data.held_by})[${item.id}]`;
  }).join(', ');

  return `Your party possesses: ${itemList}.`;
}

// LLM prompt includes inventory query capability
const SYSTEM_PROMPT_WITH_INVENTORY = `
...existing prompt...

When player asks about party inventory or magic items, use the Items database to answer.
Filter results by party member names from the player list.
Include citations for each item mentioned.
`;
```

**Items Database Schema** (from Feature 003):
```typescript
// Example Items database entry
{
  "name": "+1 Longsword",
  "held_by": "Lyra",
  "description": "A finely crafted longsword with magical properties.",
  "rarity": "Uncommon",
  "attunement": "No"
}

// Queried as:
SELECT * FROM database_entries
WHERE database_card_id = '{items-database-uuid}'
AND json_extract(entry_data, '$.held_by') IN ('Lyra', 'Finn', 'party')
```

**Alternatives Considered**:
- **Manual item tracking (no database)**: Rejected - Items database already exists (Feature 003)
- **Freeform text search**: Rejected - structured field querying more reliable
- **Separate inventory table**: Rejected - database card pattern already established

**Note**: "Held By" field must match player character names exactly (case-sensitive for prototype)

---

## Summary of Key Decisions

| Topic | Decision | Key Technology |
|-------|----------|----------------|
| Account Linkage | express-session + SQLite store | express-session, better-sqlite3-session-store |
| Public URLs | Campaign UUID in URL path | Express routing, bcrypt for passwords |
| Information Filtering | Reuse ViewModeService (`view_mode = 'player'`) | Feature 004 integration |
| Citation Generation | Parse LLM response, numbered citations | Custom CitationGeneratorService |
| Token Tracking | Per-message tracking with SQL aggregation | SQLite SUM queries |
| Concurrent Access | SQLite WAL + express-session | WAL mode, async/await |
| Session Recap Filtering | Card-level filtering (recap cards tagged) | ViewModeService reuse |
| Items Database Query | Query "Held By" field matching party names | JSON extraction, SQLite json_extract |

All decisions prioritize:
1. **Constitution compliance** (information filtering, BYOLLM integration, transparency)
2. **Feature integration** (reuse ViewModeService, knowledge graphs, database cards)
3. **Prototype simplicity** (local-only, SQLite, minimal dependencies)
4. **GM control** (monitoring, preview mode, password protection)

---

**Phase 0 Complete**: All technical unknowns resolved. Ready for Phase 1 (Design & Contracts).
