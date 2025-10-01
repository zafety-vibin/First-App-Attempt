# Data Model: Player Question Portal

**Feature**: 009-create-player-question
**Date**: 2025-10-01
**Status**: Complete

---

## Entity 1: PortalConfig

**Purpose**: Stores per-campaign portal configuration (enabled state, password, response style)

**TypeScript Interface**:
```typescript
interface PortalConfig {
  id: string; // UUID
  campaignId: string; // FK to campaigns, UNIQUE
  enabled: boolean;
  passwordHash: string | null; // bcrypt hash if password protection enabled
  responseStyle: 'friendly-sage' | 'scholarly-tome' | 'tavern-gossip' | 'factual' | 'custom';
  customSystemPrompt: string | null; // Used if responseStyle = 'custom'
  createdAt: number; // Unix timestamp
  updatedAt: number;
}
```

**SQL Schema**:
```sql
CREATE TABLE IF NOT EXISTS portal_configs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  password_hash TEXT,
  response_style TEXT NOT NULL DEFAULT 'friendly-sage' CHECK(response_style IN ('friendly-sage', 'scholarly-tome', 'tavern-gossip', 'factual', 'custom')),
  custom_system_prompt TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_configs_campaign ON portal_configs(campaign_id);
```

---

## Entity 2: PortalPlayer

**Purpose**: Lightweight player identity for portal access (character name unique per campaign)

**TypeScript Interface**:
```typescript
interface PortalPlayer {
  id: string; // UUID
  campaignId: string; // FK to campaigns
  characterName: string; // Unique per campaign
  sessionId: string; // FK to express-session
  createdAt: number;
}
```

**SQL Schema**:
```sql
CREATE TABLE IF NOT EXISTS portal_players (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, character_name) -- Enforce unique character names per campaign
);

CREATE INDEX IF NOT EXISTS idx_portal_players_campaign ON portal_players(campaign_id);
CREATE INDEX IF NOT EXISTS idx_portal_players_session ON portal_players(session_id);
```

---

## Entity 3: PortalConversation

**Purpose**: Per-player conversation container (one per player)

**TypeScript Interface**:
```typescript
interface PortalConversation {
  id: string; // UUID
  playerId: string; // FK to portal_players, UNIQUE
  campaignId: string; // FK to campaigns
  createdAt: number;
  updatedAt: number;
}
```

**SQL Schema**:
```sql
CREATE TABLE IF NOT EXISTS portal_conversations (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL UNIQUE,
  campaign_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES portal_players(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_conversations_player ON portal_conversations(player_id);
```

---

## Entity 4: PortalMessage

**Purpose**: Individual Q&A message in conversation (question, AI response, citations)

**TypeScript Interface**:
```typescript
interface PortalMessage {
  id: string; // UUID
  conversationId: string; // FK to portal_conversations
  playerId: string; // FK to portal_players
  question: string;
  response: string;
  citations: Array<{ number: number; cardId: string; cardTitle: string; url: string }>;
  tokenCount: number;
  createdAt: number;
}
```

**SQL Schema**:
```sql
CREATE TABLE IF NOT EXISTS portal_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  citations TEXT NOT NULL, -- JSON array of citations
  token_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES portal_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES portal_players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_conversation ON portal_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_created ON portal_messages(created_at);
```

---

## Entity 5: PortalTokenUsage

**Purpose**: Granular token tracking per message for aggregation in monitoring panel

**TypeScript Interface**:
```typescript
interface PortalTokenUsage {
  id: string; // UUID
  playerId: string; // FK to portal_players
  campaignId: string; // FK to campaigns
  messageId: string; // FK to portal_messages
  tokenCount: number;
  createdAt: number;
}
```

**SQL Schema**:
```sql
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
```

---

## Relationships

```
Campaign 1:1 PortalConfig
Campaign 1:N PortalPlayer
PortalPlayer 1:1 PortalConversation
PortalConversation 1:N PortalMessage
PortalMessage 1:1 PortalTokenUsage
```

---

**Phase 1 (Data Model) Complete**: Ready for contract generation and quickstart.
