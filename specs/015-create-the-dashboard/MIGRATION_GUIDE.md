# Feature 015: Dashboard Canvas System - Migration Guide

**Migration File**: `backend/src/db/migrations/015-dashboard-canvas.sql`
**Feature Branch**: `clean-implementation-base`
**Date**: 2025-01-13

---

## Overview

This migration creates two new tables for Feature 015 (Dashboard Canvas System):
- `dashboard_configs` - Stores user dashboard layouts per campaign
- `category_landing_configs` - Stores category landing page layouts and rich text descriptions

Both tables support per-user, per-campaign persistent configurations with automatic CASCADE deletion when campaigns or users are removed.

---

## Migration File Contents

**Location**: `backend/src/db/migrations/015-dashboard-canvas.sql`

**Tables Created**: 2
**Indexes Created**: 2
**Foreign Keys**: 4 (2 per table)
**Unique Constraints**: 2 (1 per table)

---

## Tables Created

### 1. dashboard_configs

Stores react-grid-layout configurations for campaign dashboard pages.

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS dashboard_configs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  layout TEXT NOT NULL, -- JSON string of react-grid-layout configuration
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign key constraints with CASCADE delete
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

  -- Unique constraint: one config per user+campaign combination
  UNIQUE(campaign_id, user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_campaign_user
  ON dashboard_configs(campaign_id, user_id);
```

**Column Details**:
- `id` (TEXT, PRIMARY KEY): UUID v4 identifier
- `campaign_id` (TEXT, NOT NULL): Foreign key to campaigns table
- `user_id` (TEXT, NOT NULL): Foreign key to users table (Keycloak sub)
- `layout` (TEXT, NOT NULL): JSON string of grid layout items (react-grid-layout format)
- `created_at` (INTEGER, NOT NULL): Unix timestamp (seconds since epoch)
- `updated_at` (INTEGER, NOT NULL): Unix timestamp (auto-updates on modification)

**Foreign Key Behavior**:
- Deleting a campaign → Cascades and deletes all dashboard_configs for that campaign
- Deleting a user → Cascades and deletes all dashboard_configs for that user

**Unique Constraint**:
- Each user can have only ONE dashboard config per campaign
- Attempting to insert duplicate (campaign_id, user_id) will fail with UNIQUE constraint violation

### 2. category_landing_configs

Stores react-grid-layout configurations and rich text descriptions for category landing pages.

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS category_landing_configs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL, -- 'npcs', 'locations', 'factions', etc.
  layout TEXT NOT NULL, -- JSON string of react-grid-layout configuration
  title TEXT, -- User-editable category title override (max 200 chars)
  description TEXT, -- User-editable rich text description (TipTap JSON)
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign key constraints with CASCADE delete
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,

  -- Unique constraint: one config per user+campaign+category combination
  UNIQUE(campaign_id, user_id, category)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_category_landing_configs_campaign_user_category
  ON category_landing_configs(campaign_id, user_id, category);
```

**Column Details**:
- `id` (TEXT, PRIMARY KEY): UUID v4 identifier
- `campaign_id` (TEXT, NOT NULL): Foreign key to campaigns table
- `user_id` (TEXT, NOT NULL): Foreign key to users table (Keycloak sub)
- `category` (TEXT, NOT NULL): Category identifier ('npcs', 'locations', 'factions', etc.)
- `layout` (TEXT, NOT NULL): JSON string of grid layout items
- `title` (TEXT, NULLABLE): Optional user-editable category title (overrides default)
- `description` (TEXT, NULLABLE): Optional rich text description (TipTap JSON format)
- `created_at` (INTEGER, NOT NULL): Unix timestamp
- `updated_at` (INTEGER, NOT NULL): Unix timestamp

**Foreign Key Behavior**:
- Deleting a campaign → Cascades and deletes all category_landing_configs for that campaign
- Deleting a user → Cascades and deletes all category_landing_configs for that user

**Unique Constraint**:
- Each user can have only ONE config per (campaign, category) combination
- Attempting to insert duplicate (campaign_id, user_id, category) will fail

**Valid Category Values** (13 total):
- `npcs`
- `locations`
- `factions`
- `session_recaps`
- `session_prep`
- `quests`
- `player_characters`
- `lore_entries`
- `world_rules`
- `planar_forces`
- `custom_mechanics`
- `items`
- `creatures`

---

## How Migration is Applied

### Automatic Application

The migration runs automatically on backend startup via the migrations system.

**Process**:
1. Backend starts (`npm start` or `docker-compose up`)
2. `backend/src/db/migrations/migrations.ts` checks for unapplied migrations
3. Finds `015-dashboard-canvas.sql` in migrations directory
4. Executes SQL statements in transaction
5. Records migration completion in `migrations` tracking table
6. Backend continues startup

**Log Output** (Success):
```
[Migration] Running migration: 015-dashboard-canvas.sql
[Migration] ✓ 015-dashboard-canvas.sql completed
```

**Log Output** (Already Applied):
```
[Migration] ✓ 015-dashboard-canvas.sql already applied, skipping
```

### Manual Application

If you need to manually apply the migration (e.g., during development):

```bash
# Method 1: Via npm script (if implemented)
cd backend
npm run migrate

# Method 2: Via sqlite3 CLI
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db < backend/src/db/migrations/015-dashboard-canvas.sql

# Method 3: Direct SQL
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "$(cat backend/src/db/migrations/015-dashboard-canvas.sql)"
```

---

## Verification

### Check Migration Applied

```bash
# 1. Check backend logs
docker-compose logs backend | grep "015-dashboard-canvas"

# Expected output:
# backend_1  | [Migration] Running migration: 015-dashboard-canvas.sql
# backend_1  | [Migration] ✓ 015-dashboard-canvas.sql completed

# 2. Check tables exist in database
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%config%';"

# Expected output:
# dashboard_configs
# category_landing_configs

# 3. Check migrations tracking table
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "SELECT * FROM migrations WHERE name = '015-dashboard-canvas.sql';"

# Expected output:
# 015-dashboard-canvas.sql|<timestamp>
```

### Check Table Schema

```bash
# Dashboard configs schema
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db ".schema dashboard_configs"

# Category landing configs schema
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db ".schema category_landing_configs"

# List indexes
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db ".indexes dashboard_configs"
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db ".indexes category_landing_configs"
```

### Test Foreign Keys

```bash
# Verify foreign keys are enabled
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "PRAGMA foreign_keys;"

# Expected output: 1 (enabled)

# Test CASCADE delete (safe if using test data)
# 1. Insert test config
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "
  INSERT INTO dashboard_configs (id, campaign_id, user_id, layout)
  VALUES ('test-config-id', 'test-campaign-id', 'test-user-id', '[]');
"

# 2. Delete campaign (should cascade)
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "
  DELETE FROM campaigns WHERE id = 'test-campaign-id';
"

# 3. Verify config deleted
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "
  SELECT COUNT(*) FROM dashboard_configs WHERE id = 'test-config-id';
"

# Expected output: 0 (config was cascade deleted)
```

### Test Unique Constraints

```bash
# Test unique constraint on (campaign_id, user_id)
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "
  INSERT INTO dashboard_configs (id, campaign_id, user_id, layout)
  VALUES ('config-1', 'campaign-1', 'user-1', '[]');
"

# Try to insert duplicate
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "
  INSERT INTO dashboard_configs (id, campaign_id, user_id, layout)
  VALUES ('config-2', 'campaign-1', 'user-1', '[]');
"

# Expected error:
# Error: UNIQUE constraint failed: dashboard_configs.campaign_id, dashboard_configs.user_id
```

---

## Rollback (If Needed)

### Drop Tables

If you need to rollback Feature 015 (remove dashboard system):

```bash
# Drop both tables
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "
  DROP TABLE IF EXISTS dashboard_configs;
  DROP TABLE IF EXISTS category_landing_configs;
"

# Remove migration record (so it can be rerun)
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "
  DELETE FROM migrations WHERE name = '015-dashboard-canvas.sql';
"

# Restart backend to apply changes
docker-compose restart backend
```

### Verify Rollback

```bash
# Check tables removed
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%config%';"

# Expected output: (empty, no tables)

# Check migration record removed
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "SELECT * FROM migrations WHERE name = '015-dashboard-canvas.sql';"

# Expected output: (empty, no record)
```

---

## Data Examples

### Example dashboard_configs Row

```sql
INSERT INTO dashboard_configs (id, campaign_id, user_id, layout, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'campaign-uuid-here',
  'auth0|keycloak-sub-here',
  '[{"i":"widget-1","x":0,"y":0,"w":3,"h":3,"widgetId":"npc-summary"},{"i":"widget-2","x":3,"y":0,"w":3,"h":3,"widgetId":"quest-tracker"}]',
  1705104000,
  1705104000
);
```

### Example category_landing_configs Row

```sql
INSERT INTO category_landing_configs (id, campaign_id, user_id, category, layout, title, description, created_at, updated_at)
VALUES (
  '660e8400-e29b-41d4-a716-446655440000',
  'campaign-uuid-here',
  'auth0|keycloak-sub-here',
  'npcs',
  '[{"i":"widget-1","x":0,"y":0,"w":4,"h":3,"widgetId":"npc-summary"}]',
  'Non-Player Characters',
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"All NPCs in the campaign are listed here."}]}]}',
  1705104000,
  1705104000
);
```

---

## Troubleshooting

### Issue: Migration Fails with Foreign Key Error

**Error Message**:
```
Error: foreign key constraint failed
```

**Cause**: Trying to insert config with non-existent campaign_id or user_id

**Solution**:
```bash
# Verify campaigns table has the campaign
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "SELECT id, name FROM campaigns LIMIT 5;"

# Verify users table has the user
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "SELECT user_id FROM users LIMIT 5;"

# Use valid IDs when inserting
```

### Issue: Migration Fails with "table already exists"

**Error Message**:
```
Error: table dashboard_configs already exists
```

**Cause**: Migration already applied (tables exist)

**Solution**:
- This is expected behavior if migration already ran
- Use `CREATE TABLE IF NOT EXISTS` (already in migration file)
- Check migration tracking table to see if already applied
- No action needed if tables exist and schema is correct

### Issue: Unique Constraint Violation

**Error Message**:
```
Error: UNIQUE constraint failed: dashboard_configs.campaign_id, dashboard_configs.user_id
```

**Cause**: Trying to insert duplicate config for same (campaign, user) pair

**Solution**:
- Use UPDATE instead of INSERT when modifying existing config
- Frontend should fetch existing config first, then UPDATE
- Backend API should handle upsert logic (try INSERT, catch error, fallback to UPDATE)

### Issue: Invalid JSON in layout Column

**Error Message**:
```
Error: malformed JSON (or similar)
```

**Cause**: layout column contains invalid JSON string

**Solution**:
```bash
# Check for invalid JSON
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "SELECT id, layout FROM dashboard_configs WHERE layout NOT LIKE '[%';"

# Fix invalid JSON (update with valid JSON)
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "UPDATE dashboard_configs SET layout = '[]' WHERE id = 'problem-id';"
```

### Issue: Performance Slow with Many Configs

**Symptoms**: Slow dashboard load times, API timeouts

**Solution**:
```bash
# Check index usage
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "EXPLAIN QUERY PLAN SELECT * FROM dashboard_configs WHERE campaign_id = 'test' AND user_id = 'test';"

# Expected: "SEARCH dashboard_configs USING INDEX idx_dashboard_configs_campaign_user"

# If index not used, recreate index
docker-compose exec backend sqlite3 /app/data/wrldbldr-mcp-manager.db "DROP INDEX IF EXISTS idx_dashboard_configs_campaign_user; CREATE INDEX idx_dashboard_configs_campaign_user ON dashboard_configs(campaign_id, user_id);"
```

---

## Post-Migration Checklist

After migration completes, verify:

- [ ] Backend starts without errors
- [ ] Migration log shows "✓ 015-dashboard-canvas.sql completed"
- [ ] `dashboard_configs` table exists
- [ ] `category_landing_configs` table exists
- [ ] Both indexes created (`idx_dashboard_configs_campaign_user`, `idx_category_landing_configs_campaign_user_category`)
- [ ] Foreign keys enabled (`PRAGMA foreign_keys;` returns 1)
- [ ] Unique constraints enforced (test duplicate insert fails)
- [ ] CASCADE delete works (test deleting campaign removes configs)
- [ ] Frontend can create dashboard configs via API
- [ ] Frontend can update dashboard configs via API
- [ ] Frontend can fetch dashboard configs via API
- [ ] Dashboard page loads without errors
- [ ] Category landing pages load without errors

---

## Related Documentation

- **Quickstart Guide**: `specs/015-create-the-dashboard/quickstart.md` - User testing instructions
- **Implementation Summary**: `specs/015-create-the-dashboard/IMPLEMENTATION_SUMMARY.md` - Technical architecture
- **Migration File**: `backend/src/db/migrations/015-dashboard-canvas.sql` - SQL source code
- **API Contracts**: `specs/015-create-the-dashboard/contracts/*.yaml` - OpenAPI specs (if created)

---

## Support

If you encounter issues with the migration:

1. Check backend logs: `docker-compose logs backend | grep Migration`
2. Verify database state: Run verification commands above
3. Check GitHub Issues for similar problems
4. Consult IMPLEMENTATION_SUMMARY.md for architecture details

---

**Last Updated**: 2025-01-13
**Migration Version**: 015
**Feature**: Dashboard Canvas System
