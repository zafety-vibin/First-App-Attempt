# Research: Structured Category Database Foundation

**Feature**: 014-create-the-database
**Date**: 2025-01-10

## Overview

This document captures technical decisions and research findings for implementing 13 structured category database tables with CRUD services and REST API endpoints.

## Technical Decisions

### 1. Database Engine: SQLite with Better-SQLite3

**Decision**: Use SQLite with Better-SQLite3 library

**Rationale**:
- Already established in project (Features 002, 003, 004)
- Better-SQLite3 provides synchronous API for simpler code
- WAL mode enables concurrent reads during writes
- JSON1 extension supports custom_fields column queries
- Embedded database aligns with local-only prototype principle

**Alternatives Considered**:
- PostgreSQL: Rejected - overkill for single-user localhost prototype, adds Docker complexity
- MongoDB: Rejected - doesn't support explicit foreign key enforcement, less suitable for structured relational data
- In-memory only: Rejected - need persistence across restarts

**Implementation Notes**:
- Enable WAL mode: `PRAGMA journal_mode = WAL`
- Enable foreign keys: `PRAGMA foreign_keys = ON`
- Use JSON1 extension for custom_fields queries: `json_extract(custom_fields, '$.field_name')`

### 2. Information Level Filtering: Middleware Pattern

**Decision**: Express middleware for information level filtering

**Rationale**:
- Centralized filtering logic (DRY principle)
- Applies automatically to all category endpoints
- Integration with existing Feature 004 information_levels table
- Supports null = freely accessible distinction from common_knowledge

**Alternatives Considered**:
- Service-level filtering: Rejected - duplicates logic across 13 services
- View-level filtering (SQL views): Rejected - less flexible for dynamic player_knowledge values
- Post-response filtering: Rejected - inefficient, still queries unnecessary data

**Implementation Notes**:
- Middleware reads X-View-Mode header (dm_view | player_view)
- Filter WHERE clause: `player_knowledge IN ('common_knowledge', 'player_knowledge', null)` for player_view
- Strip dm_* prefixed fields from response objects regardless of entity visibility
- Pass-through for dm_view (no filtering)

### 3. Foreign Key Connections: Explicit Columns

**Decision**: Use named foreign key columns (e.g., faction_id, parent_location_id) NOT generic relationships arrays

**Rationale**:
- Database enforces referential integrity (ON DELETE SET NULL, ON DELETE CASCADE)
- Explicit column names make relationships discoverable in schema
- Supports reverse lookups via indexes (find all NPCs with faction_id = X)
- Aligns with Feature 014 spec requirements (FR-011 through FR-017)

**Alternatives Considered**:
- Generic relationships JSON: Rejected - no referential integrity, invisible relationship types
- Junction tables: Rejected - over-engineering for v1, use JSON arrays for many-to-many

**Implementation Notes**:
- One-to-many: Foreign key column (npcs.faction_id → factions.id)
- Many-to-many: JSON array column (locations.notable_npcs stores [id1, id2, id3])
- Self-referential: locations.parent_location_id → locations.id
- Nullable foreign keys: ON DELETE SET NULL
- Required foreign keys (campaign_id): ON DELETE CASCADE

### 4. Session Prep One-Way Linking: JSON Arrays

**Decision**: Store session prep references in JSON arrays (npcs_to_prep, locations_to_prep) NOT foreign keys

**Rationale**:
- One-way connection prevents reverse lookup from canonical entities
- Session prep is hypothetical (is_canon=false, canonical_status='hypothetical')
- JSON arrays avoid foreign key constraints that would block canonical entity deletion
- Aligns with Feature 014 spec requirements (FR-028 through FR-033)

**Alternatives Considered**:
- Foreign keys with special handling: Rejected - can't prevent reverse lookups in database
- Separate junction table: Rejected - adds complexity without benefit
- String concatenation: Rejected - JSON arrays are queryable and type-safe

**Implementation Notes**:
- Store as JSON array: `npcs_to_prep: TEXT` storing `["npc-id-1", "npc-id-2"]`
- Query using JSON1: `json_each(session_prep.npcs_to_prep)`
- No ON DELETE CASCADE - canonical entity deletion leaves stale IDs in prep (acceptable, prep is hypothetical)

### 5. Custom Fields Storage: JSON Column + Definitions Table

**Decision**: Dual approach - custom_fields JSON column + custom_field_definitions table

**Rationale**:
- custom_fields (TEXT/JSON): Stores actual values, flexible schema-less storage
- custom_field_definitions: Stores schema metadata (field_name, field_label, field_type, options) for validation and UI rendering
- Enables queryability via JSON extraction while preserving user-defined schemas
- Aligns with Feature 014 spec FR-052 through FR-056

**Alternatives Considered**:
- JSON column only: Rejected - no schema validation, no UI metadata
- Separate tables per custom field: Rejected - requires migrations for user-defined fields
- EAV pattern (entity-attribute-value): Rejected - poor query performance, complex joins

**Implementation Notes**:
- custom_fields column: `TEXT` storing JSON object `{"magicalAffinity": "Fire", "threatLevel": "High"}`
- custom_field_definitions table: `(campaign_id, category, field_name, field_label, field_type, options)`
- field_type options: text, number, select, multi-select, date
- Query custom field: `WHERE json_extract(custom_fields, '$.magicalAffinity') = 'Fire'`

### 6. Database Migration Strategy: Single Migration File

**Decision**: Create 014-category-tables.sql with all 13 tables + indexes

**Rationale**:
- All tables introduced atomically in one feature
- Simpler migration tracking (one version number)
- No partial state (all categories available or none)

**Alternatives Considered**:
- One migration per table: Rejected - 13 migrations is excessive for atomic feature
- Manual table creation: Rejected - not reproducible, no version control

**Implementation Notes**:
- Migration file: `backend/src/db/migrations/014-category-tables.sql`
- Create tables in dependency order (factions before npcs, locations before locations.parent_location_id)
- Create indexes after tables: campaign_id, core_status, player_knowledge, category-specific FKs
- Use IF NOT EXISTS for idempotency

### 7. Transaction Handling: Service-Level Atomic Operations

**Decision**: Wrap multi-operation writes in transactions at service layer

**Rationale**:
- Better-SQLite3 transactions are synchronous and simple
- Atomic operations prevent partial writes (e.g., create NPC + update faction.key_members array)
- Performance benefit: batch inserts in transaction faster than individual commits

**Alternatives Considered**:
- Controller-level transactions: Rejected - services should be transaction-aware
- No transactions: Rejected - violates consistency requirement (Technical Context constraint)
- Database-level triggers: Rejected - adds hidden logic, harder to test

**Implementation Notes**:
- Use Better-SQLite3 transaction API: `db.transaction(() => { /* operations */ })()`
- Transaction scope: single service method (e.g., createNPC with faction update)
- Timeout: default Better-SQLite3 timeout (5s) sufficient for prototype
- Rollback automatic on error

## Best Practices

### TypeScript Model Definitions

**Practice**: Define TypeScript interfaces matching database schemas

**Rationale**:
- Type safety for API requests/responses
- Self-documenting code
- Compile-time validation

**Example**:
```typescript
interface NPC {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  race: string | null;
  faction_id: string | null;
  player_knowledge: 'common_knowledge' | 'player_knowledge' | 'dm_only' | string | null;
  tags: string[]; // JSON array
  custom_fields: Record<string, any>; // JSON object
  created_at: number;
  updated_at: number;
}
```

### Service Layer Pattern

**Practice**: One service per category (NpcService, LocationService, etc.) with standard CRUD methods

**Rationale**:
- Consistent API across all 13 categories
- Reusable patterns (pagination, filtering, validation)
- Testable in isolation

**Standard Methods**:
- `create(data): T`
- `findById(id): T | null`
- `list(filters, pagination): T[]`
- `update(id, data): T`
- `delete(id): void`

### REST Endpoint Pattern

**Practice**: Standard RESTful routes for each category

**Rationale**:
- Predictable API structure
- HTTP semantics (GET, POST, PUT, DELETE)
- Middleware composability (Keycloak auth, information filtering, error handling)

**Standard Routes**:
- `GET /api/npcs` - List with pagination/filters
- `GET /api/npcs/:id` - Get by ID
- `POST /api/npcs` - Create
- `PUT /api/npcs/:id` - Update
- `DELETE /api/npcs/:id` - Delete

### Validation Pattern

**Practice**: Validate at multiple layers

**Rationale**:
- Database constraints (foreign keys, NOT NULL)
- Service-level validation (required fields, format validation)
- Route-level validation (request schema)

**Layers**:
1. Route: Express validator middleware validates request schema
2. Service: Business logic validation (e.g., unique name within campaign)
3. Database: Constraints enforce data integrity

## Performance Considerations

### Indexing Strategy

**Indexes to Create**:
- All tables: `(campaign_id)` - filter by campaign
- All tables: `(core_status)` - filter active/archived
- All tables: `(player_knowledge)` - information level filtering
- NPCs: `(faction_id)` - reverse lookup
- Locations: `(parent_location_id)` - hierarchy queries
- Factions: `(leader_id)` - reverse lookup
- Quests: `(quest_giver_id, started_session_id, completed_session_id)` - relationships
- Items: `(owner_npc_id, owner_pc_id, location_id)` - ownership queries

**Rationale**: Support <100ms single reads, <500ms list queries per Technical Context performance goals

### Query Optimization

**Patterns**:
- Use prepared statements (Better-SQLite3 caches)
- Limit result sets with LIMIT/OFFSET pagination
- Avoid N+1 queries (fetch related entities in batches)
- Use json_extract indexes for frequently queried custom fields (future optimization)

## Open Questions

**None** - All Technical Context items specified, no NEEDS CLARIFICATION markers.

## References

- Feature 002 spec: Existing campaigns table, Keycloak integration
- Feature 004 spec: Existing information_levels table
- Feature 014 spec: Complete SQL schemas (lines 162-855 in Architecture-Updates.md)
- Better-SQLite3 docs: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
- SQLite JSON1 extension: https://www.sqlite.org/json1.html
- SQLite foreign keys: https://www.sqlite.org/foreignkeys.html
- SQLite WAL mode: https://www.sqlite.org/wal.html

---

**Status**: ✅ Research complete - All decisions documented, ready for Phase 1 (Design & Contracts)
