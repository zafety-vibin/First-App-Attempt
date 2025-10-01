# Research: Public Campaign View & Sharing

**Feature**: 010-create-public-campaign
**Date**: 2025-10-01
**Status**: Complete

## Research Topics

### 1. Random ID URL Generation

**Decision**: Use Node.js `crypto.randomBytes()` with base64url encoding for random IDs

**Rationale**:
- **Cryptographically secure**: `crypto.randomBytes()` uses OS-level entropy for truly random values
- **Collision resistance**: 16 bytes (128 bits) provides 2^128 possible combinations, effectively eliminating collision risk for campaign-scale usage
- **URL-safe encoding**: base64url encoding (RFC 4648) replaces `+/=` with `-_` (no padding), creating clean URLs
- **No dependencies**: Built into Node.js, no external libraries needed
- **Performance**: Synchronous operation completes in < 1ms

**Alternatives Considered**:
- **UUID v4**: More verbose (36 characters vs 22), unnecessary structure for unlisted URLs
- **nanoid**: External dependency, minimal benefit over crypto.randomBytes for this use case
- **Shortened incrementing IDs**: Predictable and enumerable (security risk for unlisted content)

**Implementation**:
```typescript
import crypto from 'crypto';

function generateRandomId(): string {
  return crypto.randomBytes(16)
    .toString('base64url')  // 22 characters, URL-safe
    .slice(0, 16);          // Trim to 16 chars (still 2^96 combinations)
}
```

---

### 2. Draft vs Published Version Management

**Decision**: Separate table approach with snapshot-based publishing

**Rationale**:
- **Atomic publishing**: Single UPDATE to set `published_version_id` ensures consistency
- **Rollback capability**: Keep last published version for potential rollback
- **Query performance**: Public view queries only published_versions table (no filtering needed)
- **Storage acceptable**: SQLite handles JSONB efficiently, duplicated content is minimal for local prototype
- **Simpler than event sourcing**: Prototype-first principle - functionality over optimization

**Alternatives Considered**:
- **Version control system (Git-like)**: Over-engineered for MVP, complex implementation
- **Column-level versioning**: Requires filtering on every query, performance impact
- **Shared table with `is_published` flag**: Race conditions during multi-step publish, complex state management

**Schema Design**:
```sql
CREATE TABLE published_versions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  content_snapshot TEXT NOT NULL, -- JSONB snapshot of all cards
  published_at INTEGER NOT NULL,  -- Unix timestamp
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE public_sharing_configs (
  campaign_id TEXT PRIMARY KEY,
  public_access_enabled INTEGER NOT NULL DEFAULT 0, -- 0=disabled, 1=enabled
  random_id TEXT UNIQUE,                             -- 16-char random ID
  password TEXT,                                     -- Optional plaintext password (prototype only)
  published_version_id TEXT,                         -- Current published version
  last_published_at INTEGER,                         -- Timestamp of last publish
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (published_version_id) REFERENCES published_versions(id)
);
```

---

### 3. Password Authentication for Public URLs

**Decision**: Simple plaintext password comparison with session-based authentication

**Rationale**:
- **Prototype-first**: Security sophistication deferred to production
- **Sufficient for local prototype**: Localhost deployment, no internet exposure
- **Session-based**: Express session middleware with 30-minute expiration matches grace period requirement
- **Clear production path**: Comment in code notes bcrypt hashing for production

**Alternatives Considered**:
- **bcrypt hashing now**: Added complexity for minimal prototype benefit (localhost only)
- **JWT tokens**: Overkill for simple password check, adds dependency
- **No password**: Requirement explicitly includes optional password protection

**Implementation Notes**:
```typescript
// Public URL password check (PROTOTYPE ONLY - use bcrypt in production)
if (config.password && req.body.password !== config.password) {
  return res.status(401).json({ error: 'Invalid password' });
}

// Set session with 30-minute expiration
req.session.publicCampaignAuth = {
  randomId: config.random_id,
  authorizedAt: Date.now()
};
req.session.cookie.maxAge = 30 * 60 * 1000; // 30 minutes
```

---

### 4. SEO Prevention (Unlisted URLs)

**Decision**: robots meta tag + X-Robots-Tag HTTP header

**Rationale**:
- **Dual protection**: Meta tag for HTML parsers, HTTP header for all responses
- **Standard compliance**: Follows Google/Bing robot exclusion protocol
- **No sitemap**: Public campaign URLs not included in any sitemap.xml
- **No directory**: No /campaigns/public listing endpoint exists

**Alternatives Considered**:
- **robots.txt only**: Insufficient - doesn't apply to dynamically generated URLs
- **Authentication wall**: Contradicts "accessible without login" requirement
- **Obfuscation only**: Random IDs alone don't prevent indexing if crawled

**Implementation**:
```html
<!-- In public campaign page -->
<meta name="robots" content="noindex, nofollow">
```
```typescript
// In public view route handler
res.setHeader('X-Robots-Tag', 'noindex, nofollow');
```

---

### 5. Public Homepage Template Generation

**Decision**: Predefined JSON template with example cards, inserted on first public access enable

**Rationale**:
- **Reuses existing architecture**: Template is just Card entities with specific types and content
- **Fully customizable**: GM can edit, delete, or replace entirely using existing card editor
- **Educational**: Examples show best practices for navigation structure
- **One-time operation**: Only created when public access first enabled, not regenerated

**Template Structure**:
```typescript
const PUBLIC_HOMEPAGE_TEMPLATE = [
  {
    type: 'page',
    title: 'Welcome to [Campaign Name]',
    content: { /* TipTap JSON with placeholder banner image and welcome text */ },
    information_level: 'Common Knowledge'
  },
  {
    type: 'page',
    title: 'Navigation',
    content: { /* TipTap JSON with example links to Locations, Characters, Session Recaps */ },
    information_level: 'Common Knowledge'
  },
  {
    type: 'page',
    title: 'Featured Content',
    content: { /* TipTap JSON with placeholder for GM to add highlights */ },
    information_level: 'Common Knowledge'
  }
];
```

**Alternatives Considered**:
- **Empty homepage**: Provides no guidance, GM starts from scratch
- **Wizard-based generation**: Over-engineered for prototype, breaks card architecture consistency
- **Locked template sections**: Violates User Agency principle (full customization required)

---

### 6. Information Filtering Reuse

**Decision**: Reuse Feature 004's ViewModeService with Player/General View mode for public URLs

**Rationale**:
- **No duplication**: Public view = Player/General View from Feature 004
- **Already tested**: Information filtering logic proven in existing feature
- **Consistent behavior**: Players see same filtered content whether using public URL or GM-shared login
- **Simple integration**: Pass `viewMode: 'player'` to existing filtering service

**Implementation Reference**:
```typescript
// Reuse existing ViewModeService from Feature 004
import { ViewModeService } from '../services/ViewModeService';

const filteredCards = await ViewModeService.filterCards(cards, 'player');
const filteredGraph = await ViewModeService.filterGraph(graph, 'player');
```

**Edge Cases Handled by Feature 004**:
- Maps: DM Secret pins hidden ✓
- Databases: DM Secret entries hidden, partial visibility via "Player Knowledge" field ✓
- Knowledge Graphs: DM Secret nodes/edges excluded ✓
- Navigation: 100% empty sections hidden, partial sections show visible entries ✓

---

### 7. Publish Operation Performance

**Decision**: Atomic JSONB snapshot with background optimization deferred

**Rationale**:
- **Prototype-first**: 1-second publish time acceptable for 500-card campaign
- **Atomic guarantee**: Single SQLite transaction ensures consistency
- **Deferred optimization**: Future optimizations (incremental snapshots, compression) noted but not implemented
- **Query performance prioritized**: Fast public URL access (< 200ms) more important than publish speed

**Implementation**:
```typescript
async function publishCampaign(campaignId: string): Promise<void> {
  const db = getDatabase();
  const tx = db.transaction(() => {
    // 1. Fetch all current campaign content
    const cards = db.prepare('SELECT * FROM cards WHERE campaign_id = ?').all(campaignId);
    const graphs = db.prepare('SELECT * FROM knowledge_graphs WHERE campaign_id = ?').all(campaignId);

    // 2. Create snapshot
    const snapshot = JSON.stringify({ cards, graphs, timestamp: Date.now() });

    // 3. Insert new published_version
    const versionId = crypto.randomUUID();
    db.prepare('INSERT INTO published_versions (id, campaign_id, content_snapshot, published_at) VALUES (?, ?, ?, ?)')
      .run(versionId, campaignId, snapshot, Date.now());

    // 4. Update public_sharing_config
    db.prepare('UPDATE public_sharing_configs SET published_version_id = ?, last_published_at = ? WHERE campaign_id = ?')
      .run(versionId, Date.now(), campaignId);
  });

  tx(); // Execute transaction
}
```

**Future Optimization Notes** (out of scope for prototype):
- Incremental snapshots (only changed cards since last publish)
- zlib compression for JSONB content
- Background publishing with progress indicator

---

## Research Summary

All technical decisions prioritize:
1. **Reuse over reinvention**: Leverage Features 002-004 (auth, cards, filtering)
2. **Prototype-first**: Functionality working > premature optimization
3. **Constitutional alignment**: User agency, transparency, local-only
4. **Security appropriate for context**: Localhost deployment, no internet exposure
5. **Clear production path**: Comments note production improvements (bcrypt, compression)

No NEEDS CLARIFICATION items remain. Ready for Phase 1 (Design & Contracts).
