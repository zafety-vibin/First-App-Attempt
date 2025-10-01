# Data Model: Public Campaign View & Sharing

**Feature**: 010-create-public-campaign
**Date**: 2025-10-01
**Status**: Complete

## Entity Relationship Diagram

```
Campaign (existing from Feature 002)
    ↓ 1:1
PublicSharingConfig
    ↓ 1:many
PublishedVersion
    ↑ current
PublicSharingConfig.published_version_id
```

---

## Entities

### PublicSharingConfig

**Description**: Configuration for campaign's public accessibility. Stores public access state, random ID URL, optional password, and reference to current published version.

**Table Name**: `public_sharing_configs`

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `campaign_id` | TEXT | PRIMARY KEY, FOREIGN KEY → campaigns(id) ON DELETE CASCADE | Campaign this configuration belongs to |
| `public_access_enabled` | INTEGER | NOT NULL, DEFAULT 0, CHECK(public_access_enabled IN (0,1)) | Public access toggle: 0=disabled, 1=enabled |
| `random_id` | TEXT | UNIQUE, CHECK(length(random_id) >= 12) | Random ID for public URL (e.g., "a8f3d92k4p1m"), generated once |
| `password` | TEXT | NULL | Optional plaintext password for entire campaign (NULL = no password) |
| `published_version_id` | TEXT | NULL, FOREIGN KEY → published_versions(id) | Reference to current published version (NULL = never published) |
| `last_published_at` | INTEGER | NULL | Unix timestamp of last publish operation (NULL = never published) |
| `created_at` | INTEGER | NOT NULL | Unix timestamp when public sharing first enabled |
| `updated_at` | INTEGER | NOT NULL | Unix timestamp of last configuration change |

**Validation Rules**:
- FR-005: `random_id` MUST be minimum 12 characters alphanumeric
- FR-006: Once generated, `random_id` MUST NOT change (immutable after creation)
- FR-009: `public_access_enabled` can toggle 0↔1, but `random_id` persists
- FR-042: Changing `password` invalidates sessions older than 30 minutes (handled in middleware)

**State Transitions**:
```
Initial: public_access_enabled=0, random_id=NULL, published_version_id=NULL
  ↓ GM enables public access (FR-003)
Enabled (unpublished): public_access_enabled=1, random_id="abc123...", published_version_id=NULL
  ↓ GM clicks "Publish Changes" (FR-022)
Enabled (published): public_access_enabled=1, random_id="abc123...", published_version_id="version-uuid"
  ↓ GM disables public access (FR-008)
Disabled: public_access_enabled=0, random_id="abc123..." (persists), published_version_id="version-uuid" (persists)
  ↓ GM re-enables (FR-009)
Enabled (published): public_access_enabled=1, random_id="abc123..." (same as before)
```

**Indexes**:
```sql
CREATE UNIQUE INDEX idx_public_sharing_random_id ON public_sharing_configs(random_id) WHERE random_id IS NOT NULL;
```

---

### PublishedVersion

**Description**: Snapshot of campaign content visible on public URL. Created atomically during publish operation. Contains JSONB snapshot of all cards, maps, databases, homepage at time of publish.

**Table Name**: `published_versions`

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID v4 for this published version |
| `campaign_id` | TEXT | NOT NULL, FOREIGN KEY → campaigns(id) ON DELETE CASCADE | Campaign this version belongs to |
| `content_snapshot` | TEXT | NOT NULL | JSONB snapshot of all campaign content (cards, graphs) |
| `published_at` | INTEGER | NOT NULL | Unix timestamp when this version was published |

**Validation Rules**:
- FR-023: `content_snapshot` MUST include all cards, maps, databases, homepage, knowledge graphs at publish time
- Snapshot structure (JSONB):
  ```json
  {
    "cards": [ /* array of Card entities */ ],
    "graphs": [ /* array of KnowledgeGraph entities */ ],
    "timestamp": 1696166400,
    "metadata": {
      "total_cards": 250,
      "total_graphs": 4
    }
  }
  ```

**State Transitions**: Immutable after creation (append-only table)

**Retention Policy** (future optimization, not MVP):
- Keep last 3 published versions per campaign for rollback
- Delete older versions automatically

**Indexes**:
```sql
CREATE INDEX idx_published_versions_campaign ON published_versions(campaign_id, published_at DESC);
```

---

## Removed Entity: PublicHomepage

**Rationale**: After research, determined that public homepage is just a collection of Card entities with `card_type='public_homepage'` flag. No separate entity needed - reuses existing Card model from Feature 003.

**Implementation**:
- Public homepage template creates 3 Card entities with specific content
- Cards have `card_type='public_homepage'` to distinguish from regular campaign cards
- GM edits using existing CardEditor component
- Publishing includes these cards in `content_snapshot.cards` array

---

## Schema SQL

```sql
-- Public sharing configuration
CREATE TABLE IF NOT EXISTS public_sharing_configs (
  campaign_id TEXT PRIMARY KEY,
  public_access_enabled INTEGER NOT NULL DEFAULT 0 CHECK(public_access_enabled IN (0,1)),
  random_id TEXT UNIQUE CHECK(random_id IS NULL OR length(random_id) >= 12),
  password TEXT,
  published_version_id TEXT,
  last_published_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (published_version_id) REFERENCES published_versions(id)
);

CREATE UNIQUE INDEX idx_public_sharing_random_id
  ON public_sharing_configs(random_id)
  WHERE random_id IS NOT NULL;

-- Published campaign versions (snapshots)
CREATE TABLE IF NOT EXISTS published_versions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  content_snapshot TEXT NOT NULL, -- JSONB
  published_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE INDEX idx_published_versions_campaign
  ON published_versions(campaign_id, published_at DESC);

-- Trigger to update updated_at on public_sharing_configs
CREATE TRIGGER IF NOT EXISTS update_public_sharing_timestamp
  AFTER UPDATE ON public_sharing_configs
  FOR EACH ROW
BEGIN
  UPDATE public_sharing_configs
  SET updated_at = strftime('%s', 'now')
  WHERE campaign_id = NEW.campaign_id;
END;
```

---

## TypeScript Interfaces

```typescript
// backend/src/models/PublicSharingConfig.ts
export interface PublicSharingConfig {
  campaign_id: string;
  public_access_enabled: 0 | 1;  // SQLite INTEGER boolean
  random_id: string | null;
  password: string | null;
  published_version_id: string | null;
  last_published_at: number | null;  // Unix timestamp
  created_at: number;
  updated_at: number;
}

export interface PublicSharingConfigCreate {
  campaign_id: string;
  random_id: string;  // Generated via crypto.randomBytes
  password?: string;  // Optional
}

export interface PublicSharingConfigUpdate {
  public_access_enabled?: 0 | 1;
  password?: string | null;  // null removes password
}

// backend/src/models/PublishedVersion.ts
export interface PublishedVersion {
  id: string;  // UUID v4
  campaign_id: string;
  content_snapshot: string;  // JSONB string
  published_at: number;
}

export interface ContentSnapshot {
  cards: Card[];  // From Feature 003
  graphs: KnowledgeGraph[];  // From Feature 005
  timestamp: number;
  metadata: {
    total_cards: number;
    total_graphs: number;
  };
}

export interface PublishedVersionCreate {
  campaign_id: string;
  content_snapshot: ContentSnapshot;
}
```

---

## Data Flow

### Enable Public Access (FR-003)
```
1. GM toggles Public Access: OFF → ON in Campaign Settings
2. Frontend: POST /api/campaigns/:id/public-sharing
   Request: { public_access_enabled: 1 }
3. Backend:
   a. Generate random_id: crypto.randomBytes(16).toString('base64url').slice(0, 16)
   b. INSERT INTO public_sharing_configs (campaign_id, public_access_enabled, random_id)
4. Frontend: Display generated URL: vvd-mimic.app/c/{random_id}
5. Frontend: Navigate to public homepage editor with template
```

### Publish Changes (FR-022)
```
1. GM clicks "Publish Changes" button
2. Frontend: POST /api/campaigns/:id/publish
3. Backend (atomic transaction):
   a. SELECT all cards, graphs for campaign_id
   b. Create content_snapshot JSON
   c. INSERT INTO published_versions (id=UUID, campaign_id, content_snapshot, published_at=NOW)
   d. UPDATE public_sharing_configs SET published_version_id = new_id, last_published_at = NOW
4. Frontend: Show success toast with last_published_at timestamp
5. Frontend: Update DraftStatusIndicator to show "Published"
```

### Access Public URL (FR-044)
```
1. Player opens vvd-mimic.app/c/{random_id}
2. Frontend: GET /api/c/{random_id}
3. Backend:
   a. SELECT * FROM public_sharing_configs WHERE random_id = ? AND public_access_enabled = 1
   b. If not found or disabled: 404 "Campaign not publicly available"
   c. If password set: Check session or prompt for password
   d. SELECT content_snapshot FROM published_versions WHERE id = published_version_id
   e. Parse JSON, apply ViewModeService.filterCards(cards, 'player')
   f. Return filtered content
4. Frontend: Render PublicCampaignView (read-only)
```

---

## Edge Cases

### Publishing when no previous publish exists
- `published_version_id` transitions from NULL to first version UUID
- `last_published_at` transitions from NULL to timestamp
- Public URL returns 404 until first publish completes (FR-020)

### Disabling public access with active player sessions
- `public_access_enabled` = 0
- Existing sessions continue until expiration (no immediate invalidation)
- New access attempts return "Campaign not publicly available" (FR-048)

### Changing password with active sessions (FR-042)
- Update `password` field
- Middleware checks session.authorizedAt timestamp
- Sessions < 30 minutes old remain valid (grace period)
- Sessions > 30 minutes old require re-authentication with new password

### Publishing large campaigns (500+ cards)
- Snapshot operation may take 1-2 seconds (acceptable per Performance Goals)
- Transaction ensures atomicity (all-or-nothing publish)
- Future optimization: background job with progress indicator (out of scope for MVP)

---

## Migration Notes

**From**: No tables (new feature)
**To**: Add `public_sharing_configs` and `published_versions` tables

**Migration Steps**:
1. Run schema.sql to create tables
2. No data migration needed (new feature)
3. No changes to existing tables (Feature 002-005 schemas unchanged)

**Rollback**: DROP TABLE public_sharing_configs, published_versions

---

## Data Model Summary

- **2 new tables**: public_sharing_configs (1:1 with campaigns), published_versions (1:many with campaigns)
- **0 modified tables**: Reuses existing Campaign, Card, KnowledgeGraph entities
- **Snapshot approach**: Atomic publishing via JSONB content_snapshot
- **Information filtering**: Reuses ViewModeService from Feature 004 (no data model changes needed)
- **Scalability**: Acceptable for prototype (single-user, 1-5 public campaigns, 100-500 cards each)
