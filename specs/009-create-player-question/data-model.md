# Data Model: Player Question Portal

**Feature**: 009-create-player-question
**Date**: 2025-10-31
**Status**: Complete

This document defines the data model for Player Question Portal following current architecture patterns (as of 2025-10-31).

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
  createdAt: number; // Unix timestamp (milliseconds)
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

**Validation Rules**:
- enabled: 0 or 1 (SQLite boolean)
- responseStyle: Must be one of 5 values
- customSystemPrompt: Required if responseStyle = 'custom', otherwise NULL
- passwordHash: bcrypt hash (60 chars) or NULL

---

## Entity 2: PortalPlayer

**Purpose**: Lightweight player identity for portal access (character name unique per campaign)

**TypeScript Interface**:
```typescript
interface PortalPlayer {
  id: string; // UUID
  campaignId: string; // FK to campaigns
  characterName: string; // Unique per campaign (enforced by UNIQUE constraint)
  sessionToken: string; // crypto.randomBytes(32).toString('hex') - 64 chars
  createdAt: number; // Unix timestamp (milliseconds)
}
```

**SQL Schema**:
```sql
CREATE TABLE IF NOT EXISTS portal_players (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  session_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, character_name) -- Enforce unique character names per campaign (FR-085)
);

CREATE INDEX IF NOT EXISTS idx_portal_players_campaign ON portal_players(campaign_id);
CREATE INDEX IF NOT EXISTS idx_portal_players_token ON portal_players(session_token);
```

**Validation Rules**:
- characterName: 1-100 chars, unique per campaign
- sessionToken: 64 hex chars (crypto.randomBytes(32))
- UNIQUE constraint rejects duplicate character names with SQL error

---

## Entity 3: PortalConversation

**Purpose**: Per-player conversation container (one conversation per player)

**TypeScript Interface**:
```typescript
interface PortalConversation {
  id: string; // UUID
  playerId: string; // FK to portal_players, UNIQUE (one conversation per player)
  campaignId: string; // FK to campaigns
  createdAt: number; // Unix timestamp (milliseconds)
  updatedAt: number;
}
```

**SQL Schema**:
```sql
CREATE TABLE IF NOT EXISTS portal_conversations (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL UNIQUE, -- One conversation per player
  campaign_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (player_id) REFERENCES portal_players(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_conversations_player ON portal_conversations(player_id);
CREATE INDEX IF NOT EXISTS idx_portal_conversations_campaign ON portal_conversations(campaign_id);
```

---

## Entity 4: PortalMessage

**Purpose**: Individual Q&A message in conversation (question, AI response, citations)

**TypeScript Interface**:
```typescript
interface PortalMessage {
  id: string; // UUID
  conversationId: string; // FK to portal_conversations
  playerId: string; // FK to portal_players (denormalized for quick queries)
  question: string;
  response: string;
  citations: Array<{ number: number; cardId: string; cardTitle: string; url: string }>; // Stored as JSON TEXT
  tokenCount: number;
  createdAt: number; // Unix timestamp (milliseconds)
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
  citations TEXT NOT NULL, -- JSON array: [{"number":1,"cardId":"...","cardTitle":"...","url":"..."}]
  token_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES portal_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES portal_players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_conversation ON portal_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_created ON portal_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_portal_messages_player ON portal_messages(player_id);
```

**Validation Rules**:
- citations: Valid JSON array, validated by SQLite json_valid() if needed
- tokenCount: >= 0
- question/response: Non-empty TEXT

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
  createdAt: number; // Unix timestamp (milliseconds)
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
CREATE INDEX IF NOT EXISTS idx_portal_token_usage_message ON portal_token_usage(message_id);
```

**Aggregation Queries** (used in PortalTokenTrackerService):
```sql
-- Per-player total
SELECT SUM(token_count) as total
FROM portal_token_usage
WHERE player_id = ?;

-- Campaign total
SELECT SUM(token_count) as total
FROM portal_token_usage
WHERE campaign_id = ?;

-- Per-player breakdown for monitoring
SELECT
  pp.character_name as playerName,
  SUM(ptu.token_count) as tokenCount
FROM portal_token_usage ptu
JOIN portal_players pp ON ptu.player_id = pp.id
WHERE ptu.campaign_id = ?
GROUP BY pp.id
ORDER BY tokenCount DESC;
```

---

## Relationships

```
campaigns (existing)
  ↓ 1:1
portal_configs

campaigns (existing)
  ↓ 1:N
portal_players
  ↓ 1:1
portal_conversations
  ↓ 1:N
portal_messages
  ↓ 1:1
portal_token_usage
```

**Foreign Key Cascade Behavior**:
- Delete campaign → CASCADE deletes portal_configs, portal_players, portal_conversations, portal_messages, portal_token_usage
- Delete portal_player → CASCADE deletes portal_conversations, portal_messages, portal_token_usage
- Delete portal_conversation → CASCADE deletes portal_messages
- Delete portal_message → CASCADE deletes portal_token_usage

---

## Database Migration File

**File**: `backend/src/db/migrations/029-add-portal-tables.sql`

```sql
-- Migration 029: Add Player Question Portal tables
-- Date: 2025-10-31
-- Feature: 009-create-player-question

-- Portal configuration per campaign
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

-- Lightweight player identity (no password, just session token)
CREATE TABLE IF NOT EXISTS portal_players (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  session_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, character_name)
);

CREATE INDEX IF NOT EXISTS idx_portal_players_campaign ON portal_players(campaign_id);
CREATE INDEX IF NOT EXISTS idx_portal_players_token ON portal_players(session_token);

-- Per-player conversation container
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
CREATE INDEX IF NOT EXISTS idx_portal_conversations_campaign ON portal_conversations(campaign_id);

-- Individual Q&A messages with citations
CREATE TABLE IF NOT EXISTS portal_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  citations TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES portal_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES portal_players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_conversation ON portal_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_created ON portal_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_portal_messages_player ON portal_messages(player_id);

-- Token usage tracking per message
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
CREATE INDEX IF NOT EXISTS idx_portal_token_usage_message ON portal_token_usage(message_id);
```

---

## Notes

- **Timestamps**: All timestamps are INTEGER (Unix milliseconds) for consistency with existing schema
- **UUIDs**: All primary keys are TEXT UUIDs generated with `crypto.randomUUID()` or equivalent
- **Boolean fields**: SQLite INTEGER 0/1 with CHECK constraint
- **JSON fields**: `citations` stored as TEXT (JSON array), parsed with `JSON.parse()` / `JSON.stringify()`
- **Password hashing**: bcrypt produces 60-char string, TEXT type sufficient
- **Session tokens**: crypto.randomBytes(32).toString('hex') produces 64-char hex string
- **Foreign key cascades**: CASCADE delete cleans up orphaned records automatically
- **Unique constraints**: Enforced at database level for data integrity

---

**Phase 1 (Data Model) Complete**: Ready for contract generation and quickstart.
