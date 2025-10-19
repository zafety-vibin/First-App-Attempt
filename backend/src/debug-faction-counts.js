const Database = require('better-sqlite3');
const db = new Database('/app/data/wrldbldr-mcp-manager.db');

const GRAPH_ID = '48592d52-50b3-4e64-b98f-a22a7d13bb3f';

console.log('=== ACTUAL NPC COUNTS BY FACTION ===\n');

const counts = db.prepare(`
  SELECT
    json_extract(attributes, '$.faction') as faction,
    COUNT(*) as count
  FROM graph_nodes
  WHERE graph_id = ?
    AND json_extract(attributes, '$.is_faction_node') IS NULL
  GROUP BY faction
  ORDER BY faction
`).all(GRAPH_ID);

counts.forEach(c => {
  console.log(c.faction.padEnd(40), c.count, 'NPCs');
});

console.log('\n=== STORED MEMBER_COUNT IN FACTION NODES ===\n');

const factions = db.prepare(`
  SELECT
    name,
    json_extract(attributes, '$.member_count') as stored_count
  FROM graph_nodes
  WHERE graph_id = ?
    AND json_extract(attributes, '$.is_faction_node') = 1
  ORDER BY name
`).all(GRAPH_ID);

factions.forEach(f => {
  console.log(f.name.padEnd(40), 'stored:', f.stored_count);
});

db.close();
