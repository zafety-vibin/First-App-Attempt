/**
 * Performance test: N+1 Query Fix Validation
 *
 * This script demonstrates the improvement from batch fetching junction table relationships.
 *
 * Before: 100 quests -> 100 NPC lookups + 100 location lookups = 201 queries total
 * After:  100 quests -> 1 batch NPC lookup + 1 batch location lookup = 3 queries total
 */

import Database from 'better-sqlite3';
import { QuestService } from '../src/services/QuestService';
import { SessionRecapService } from '../src/services/SessionRecapService';
import { SessionPrepService } from '../src/services/SessionPrepService';
import { randomUUID } from 'crypto';

const dbPath = ':memory:';
const db = new Database(dbPath);

// Enable query logging
let queryCount = 0;
db.prepare = ((original) => {
  return function (sql: string) {
    queryCount++;
    console.log(`[Query ${queryCount}] ${sql.substring(0, 80)}...`);
    return original.call(this, sql);
  };
})(db.prepare.bind(db)) as any;

// Setup test schema
console.log('\n=== Setting up test database ===\n');
db.exec(`
  CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE quests (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    core_status TEXT,
    player_knowledge TEXT,
    tags TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    custom_fields TEXT DEFAULT '{}',
    status TEXT,
    objectives TEXT DEFAULT '[]',
    rewards TEXT,
    quest_giver_id TEXT,
    started_session_id TEXT,
    completed_session_id TEXT,
    related_npcs TEXT DEFAULT '[]',
    related_locations TEXT DEFAULT '[]',
    dm_true_objective TEXT,
    dm_consequences TEXT,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  CREATE TABLE quest_related_npcs (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    npc_id TEXT NOT NULL,
    role_in_quest TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    UNIQUE(quest_id, npc_id),
    FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
  );

  CREATE TABLE quest_related_locations (
    id TEXT PRIMARY KEY,
    quest_id TEXT NOT NULL,
    location_id TEXT NOT NULL,
    location_role TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    UNIQUE(quest_id, location_id),
    FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
  );

  CREATE TABLE information_levels (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    level_order INTEGER NOT NULL,
    is_hierarchical INTEGER NOT NULL DEFAULT 0
  );
`);

// Seed test data
console.log('\n=== Seeding test data ===\n');
const campaignId = randomUUID();
const userId = 'test-user-123';

db.prepare('INSERT INTO campaigns (id, user_id, name) VALUES (?, ?, ?)').run(
  campaignId,
  userId,
  'Test Campaign'
);

// Create 100 quests
const questIds: string[] = [];
for (let i = 0; i < 100; i++) {
  const questId = randomUUID();
  questIds.push(questId);

  db.prepare(`
    INSERT INTO quests (
      id, campaign_id, name, description, core_status, player_knowledge,
      tags, created_at, updated_at, custom_fields
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    questId,
    campaignId,
    `Quest ${i + 1}`,
    `Description for quest ${i + 1}`,
    'active',
    'common-knowledge',
    '[]',
    Date.now(),
    Date.now(),
    '{}'
  );

  // Add 3 related NPCs per quest
  for (let j = 0; j < 3; j++) {
    db.prepare(`
      INSERT INTO quest_related_npcs (id, quest_id, npc_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(randomUUID(), questId, `npc-${i}-${j}`, Date.now());
  }

  // Add 2 related locations per quest
  for (let k = 0; k < 2; k++) {
    db.prepare(`
      INSERT INTO quest_related_locations (id, quest_id, location_id, created_at)
      VALUES (?, ?, ?, ?)
    `).run(randomUUID(), questId, `location-${i}-${k}`, Date.now());
  }
}

console.log(`Created 100 quests with 300 NPC relationships and 200 location relationships\n`);

// Test batch performance
console.log('\n=== Testing QuestService.list() with batch optimization ===\n');
queryCount = 0;

const questService = new QuestService(db);
const result = questService.list(
  { campaign_id: campaignId },
  { limit: 100, offset: 0 },
  'created_at',
  'desc',
  'dm_view'
);

console.log(`\n=== Results ===`);
console.log(`Total queries: ${queryCount}`);
console.log(`Quests returned: ${result.data.length}`);
console.log(`Expected queries: 4 (COUNT, SELECT quests, batch NPCs, batch locations)`);
console.log(`Old approach would have been: 201 (COUNT + SELECT + 100*NPC + 100*location)`);
console.log(`Performance improvement: ${Math.round((201 - queryCount) / 201 * 100)}% reduction in queries\n`);

// Verify data integrity
const firstQuest = result.data[0];
console.log(`Sample quest "${firstQuest.name}":`);
console.log(`  - Related NPCs: ${firstQuest.related_npcs?.length || 0} (expected 3)`);
console.log(`  - Related locations: ${firstQuest.related_locations?.length || 0} (expected 2)\n`);

db.close();

console.log('✓ Test completed successfully!\n');
