# Data Model: Authentication Flow & Campaign Management

**Feature**: 002-create-the-authentication
**Phase**: 1 (Design & Contracts)
**Date**: 2025-10-01
**Storage**: SQLite3 (Better-SQLite3 library)

---

## Entity Relationship Diagram

```
┌─────────────────────┐
│       User          │
│  (Keycloak sync)    │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐         ┌─────────────────────┐
│     Campaign        │         │      Session        │
│                     │         │  (Active tokens)    │
└─────────────────────┘         └──────────┬──────────┘
                                           │
                                           │ N:1
                                           │
                                ┌──────────▼──────────┐
                                │       User          │
                                └─────────────────────┘
```

---

## Entities

### 1. User

**Purpose**: Represents a Game Master account synchronized from Keycloak. Primary user of VVD-mimic application.

**Storage**: `users` table in SQLite

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,        -- Keycloak 'sub' claim (UUID format)
  username TEXT NOT NULL,           -- Keycloak 'preferred_username'
  email TEXT NOT NULL,              -- Keycloak 'email'
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),  -- Unix timestamp
  byollm_config TEXT                -- JSON string for BYOLLM settings (spec 008)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

**Fields**:
- `user_id` (TEXT, PK): Keycloak subject identifier from JWT token. Format: UUID (e.g., "a3b8c9d4-e5f6-7890-abcd-ef1234567890"). Immutable.
- `username` (TEXT, NOT NULL): Display name from Keycloak. Mutable via Keycloak admin console.
- `email` (TEXT, NOT NULL): User email from Keycloak. Used for notifications (future). Mutable via Keycloak.
- `created_at` (INTEGER, NOT NULL): User record creation timestamp. Unix epoch seconds. Immutable.
- `byollm_config` (TEXT, NULLABLE): JSON string containing BYOLLM provider configuration (spec 008). Format: `{"provider": "openai", "api_key": "encrypted", "credits_remaining": 1000}`. Mutable.

**Relationships**:
- One User owns many Campaigns (1:N via `campaigns.owner_id`)
- One User has many Sessions (1:N via `sessions.user_id`)

**Validation Rules**:
- `user_id` must match UUID format from Keycloak
- `email` must be valid email format (validated by Keycloak)
- `username` minimum 3 characters (enforced by Keycloak)
- `byollm_config` must be valid JSON when present

**State Transitions**: None (static entity, no state machine)

**Lifecycle**:
1. **Creation**: On first login, backend checks if `user_id` exists. If not, creates User record from Keycloak token claims.
2. **Update**: When Keycloak token contains updated username/email, backend syncs changes.
3. **Deletion**: Cascade deletes all Campaigns and Sessions owned by user. Triggered manually via admin action (future feature).

**TypeScript Interface**:
```typescript
interface User {
  id: string;              // user_id
  username: string;
  email: string;
  createdAt: Date;
  byollmConfig?: {
    provider: 'openai' | 'anthropic' | 'custom';
    apiKey: string;        // Encrypted
    creditsRemaining?: number;
  };
}
```

---

### 2. Campaign

**Purpose**: Represents a TTRPG campaign workspace owned by a Game Master. Contains all campaign content (cards, maps, databases, graphs).

**Storage**: `campaigns` table in SQLite

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,              -- UUID v4
  name TEXT NOT NULL,                -- Campaign display name
  owner_id TEXT NOT NULL,            -- FK to users.user_id
  public_url_id TEXT UNIQUE,         -- Random ID for public access (16 chars, base64url)
  public_access_enabled INTEGER DEFAULT 0,  -- Boolean: 0=private, 1=public
  public_password TEXT,              -- Optional password for public access
  last_published_at INTEGER,         -- Unix timestamp of last publish operation
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON campaigns(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_public_url ON campaigns(public_url_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_updated ON campaigns(updated_at);
```

**Fields**:
- `id` (TEXT, PK): Unique campaign identifier. Format: UUID v4 (generated via `crypto.randomUUID()`). Immutable.
- `name` (TEXT, NOT NULL): User-defined campaign name. Max 255 characters. Mutable.
- `owner_id` (TEXT, FK, NOT NULL): References `users.user_id`. Determines ownership and access rights. Immutable.
- `public_url_id` (TEXT, UNIQUE, NULLABLE): Random identifier for public campaign URL (format: `vvd-mimic.app/c/{public_url_id}`). Generated once when public access first enabled. 16 characters, base64url encoding. Immutable once generated.
- `public_access_enabled` (INTEGER, DEFAULT 0): Boolean flag (0=private, 1=public). Determines if campaign accessible via public URL. Mutable.
- `public_password` (TEXT, NULLABLE): Optional plaintext password for public access (prototype simplicity). Max 255 characters. Mutable. (Note: Should be hashed in production per Constitution II).
- `last_published_at` (INTEGER, NULLABLE): Unix timestamp of last "Publish Changes" operation. NULL if never published. Updated on publish.
- `created_at` (INTEGER, NOT NULL): Campaign creation timestamp. Unix epoch seconds. Immutable.
- `updated_at` (INTEGER, NOT NULL): Last modification timestamp. Updated on any campaign content change. Mutable.

**Relationships**:
- One Campaign belongs to one User (N:1 via `owner_id`)
- One Campaign contains many Cards (1:N - spec 003, future)
- One Campaign contains many Maps (1:N - spec 007, future)
- One Campaign contains many Knowledge Graphs (1:N - spec 006, future)

**Validation Rules**:
- `name` required, 1-255 characters, non-empty after trim
- `public_url_id` must match pattern `^[A-Za-z0-9_-]{16}$` when present
- `public_password` max 255 characters when present
- `owner_id` must reference existing user
- `public_access_enabled` must be 0 or 1

**State Transitions**:
```
┌──────────┐  Enable Public Access   ┌──────────┐
│ Private  ├────────────────────────>│ Public   │
│          │<────────────────────────┤          │
└──────────┘  Disable Public Access  └──────────┘

State: public_access_enabled
  - 0 (Private): Campaign not accessible via public URL
  - 1 (Public): Campaign accessible via public URL (subject to password if set)
```

**Lifecycle**:
1. **Creation**: User creates campaign via POST /api/campaigns. Generates UUID, sets owner_id, initializes with default name.
2. **Update**: User edits campaign name, toggles public access, sets password via PUT /api/campaigns/:id.
3. **Publish**: User clicks "Publish Changes" → updates `last_published_at`, pushes draft content to public view (spec 010).
4. **Deletion**: User deletes campaign via DELETE /api/campaigns/:id. Cascade deletes all campaign content (cards, maps, etc.).

**TypeScript Interface**:
```typescript
interface Campaign {
  id: string;
  name: string;
  ownerId: string;
  publicUrlId: string | null;
  publicAccessEnabled: boolean;
  publicPassword: string | null;
  lastPublishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 3. Session

**Purpose**: Tracks active authentication sessions and stores Keycloak access/refresh tokens for backend use. Enables session management and revocation.

**Storage**: `sessions` table in SQLite

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,       -- UUID v4
  user_id TEXT NOT NULL,             -- FK to users.user_id
  access_token TEXT NOT NULL,        -- Keycloak access token (JWT)
  refresh_token TEXT,                -- Keycloak refresh token (optional)
  expires_at INTEGER NOT NULL,       -- Unix timestamp when access token expires
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
```

**Fields**:
- `session_id` (TEXT, PK): Unique session identifier. Format: UUID v4. Immutable.
- `user_id` (TEXT, FK, NOT NULL): References `users.user_id`. Associates session with user. Immutable.
- `access_token` (TEXT, NOT NULL): Keycloak access token (JWT format). Used for API authentication. Mutable (refreshed).
- `refresh_token` (TEXT, NULLABLE): Keycloak refresh token. Used to obtain new access token. Mutable (refreshed).
- `expires_at` (INTEGER, NOT NULL): Unix timestamp when access_token expires. Calculated from token's `exp` claim. Mutable (updated on refresh).
- `created_at` (INTEGER, NOT NULL): Session creation timestamp. Unix epoch seconds. Immutable.

**Relationships**:
- One Session belongs to one User (N:1 via `user_id`)

**Validation Rules**:
- `access_token` must be valid JWT format
- `expires_at` must be future timestamp on creation
- `user_id` must reference existing user

**State Transitions**:
```
┌────────┐  Token Refresh   ┌────────┐  Logout/Expire   ┌─────────┐
│ Active ├─────────────────>│ Active ├─────────────────>│ Expired │
└────────┘                   └────────┘                  └─────────┘
                                 │
                                 │ Manual Revoke
                                 ▼
                            ┌─────────┐
                            │ Revoked │
                            └─────────┘

State determined by:
  - Active: expires_at > current_time
  - Expired: expires_at <= current_time
  - Revoked: Deleted from database
```

**Lifecycle**:
1. **Creation**: On successful login, backend creates Session with tokens from Keycloak.
2. **Refresh**: Before expiration, frontend calls `/api/auth/refresh` → backend uses refresh_token to get new access_token → updates Session.
3. **Expiration**: Background job deletes sessions where `expires_at < now()` (cleanup).
4. **Revocation**: On logout, backend deletes Session record.

**TypeScript Interface**:
```typescript
interface Session {
  sessionId: string;
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  createdAt: Date;
}
```

---

## Indexes & Performance

**Query Patterns**:
1. Get campaigns by owner: `SELECT * FROM campaigns WHERE owner_id = ?` → Uses `idx_campaigns_owner`
2. Get campaign by public URL: `SELECT * FROM campaigns WHERE public_url_id = ? AND public_access_enabled = 1` → Uses `idx_campaigns_public_url`
3. Get user sessions: `SELECT * FROM sessions WHERE user_id = ?` → Uses `idx_sessions_user`
4. Cleanup expired sessions: `DELETE FROM sessions WHERE expires_at < ?` → Uses `idx_sessions_expires`

**Performance Considerations**:
- SQLite performs well for <100k rows per table (expected: <1k users, <10k campaigns, <100 concurrent sessions)
- WAL mode enables concurrent reads during writes
- Prepared statements cached for frequently-used queries
- Foreign key cascades handled efficiently by SQLite

**Scaling Limits** (acceptable for local prototype):
- Single-user: No concurrent write contention
- Max campaigns: ~100 (far below SQLite limits)
- Max sessions: ~10 (user can log in from multiple devices)

---

## Migration Strategy

**Initial Schema**: All tables created on first backend startup via `DatabaseService.runMigrations()`

**Future Migrations** (when needed):
```typescript
// backend/src/db/migrations.ts
export const migrations = [
  {
    version: 1,
    up: (db) => {
      // Initial schema (schema.sql)
    },
  },
  {
    version: 2,
    up: (db) => {
      // Example: Add column for spec 008 BYOLLM config
      db.exec(`ALTER TABLE users ADD COLUMN byollm_config TEXT`);
    },
  },
];
```

**Migration Tracking**:
```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
```

---

## Data Integrity Rules

1. **Referential Integrity**: Enforced via `PRAGMA foreign_keys = ON` and `ON DELETE CASCADE`
2. **Unique Constraints**: `public_url_id` must be globally unique across all campaigns
3. **Type Safety**: SQLite TEXT type, but validated at application layer (TypeScript interfaces)
4. **Timestamps**: Always Unix epoch seconds (INTEGER) for consistency and timezone independence
5. **NULL Handling**: Nullable fields explicitly marked, defaults provided where appropriate

---

## Constitutional Alignment

- **User Agency** (II): User owns all data, stored locally in SQLite file they can backup
- **Privacy** (V): BYOLLM config stored encrypted (future), no external data sharing except user's LLM provider
- **Local-Only** (VI): SQLite embedded database, no cloud database dependency
- **Simplicity** (VI): Three core entities, no complex ORM, direct SQL queries

---

## Future Entities (Other Specs)

This data model is foundation for:
- **Card** (spec 003): References `campaign.id`
- **Map** (spec 007): References `campaign.id`
- **KnowledgeGraph** (spec 006): References `campaign.id`
- **PlayerQuestion** (spec 009): References `campaign.id`
- **DraftVersion / PublishedVersion** (spec 010): Extends Campaign entity

---

**Status**: ✓ Complete - Ready for API contract definition
