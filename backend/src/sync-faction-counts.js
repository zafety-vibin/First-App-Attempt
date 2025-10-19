/**
 * Sync faction member_count attributes with actual NPC counts
 * Run this after manually editing NPCs via UI
 */

const Database = require('better-sqlite3');
const db = new Database('/app/data/wrldbldr-mcp-manager.db');

const GRAPH_ID = '48592d52-50b3-4e64-b98f-a22a7d13bb3f';

console.log('=== Syncing Faction Member Counts ===\n');

// Get all faction nodes
const factionNodes = db.prepare(`
  SELECT id, name
  FROM graph_nodes
  WHERE graph_id = ?
    AND json_extract(attributes, '$.is_faction_node') = 1
`).all(GRAPH_ID);

factionNodes.forEach(faction => {
  // Count actual NPCs/PCs with this faction
  const actualCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM graph_nodes
    WHERE graph_id = ?
      AND json_extract(attributes, '$.faction') = ?
      AND json_extract(attributes, '$.is_faction_node') IS NULL
  `).get(GRAPH_ID, faction.name);

  // Update faction node's member_count
  db.prepare(`
    UPDATE graph_nodes
    SET attributes = json_set(attributes, '$.member_count', ?)
    WHERE id = ?
  `).run(actualCount.count, faction.id);

  console.log(`${faction.name.padEnd(40)} ${actualCount.count} members`);
});

console.log('\n✓ All faction counts synchronized');

db.close();
