const Database = require('better-sqlite3');
const db = new Database('/app/data/wrldbldr-mcp-manager.db');

const graphId = '48592d52-50b3-4e64-b98f-a22a7d13bb3f';

console.log('=== ALL FACTION NODES ===\n');

const factions = db.prepare(`
  SELECT
    name,
    node_type,
    json_extract(attributes, '$.member_count') as member_count,
    json_extract(attributes, '$.color') as color
  FROM graph_nodes
  WHERE graph_id = ?
    AND json_extract(attributes, '$.is_faction_node') = 1
  ORDER BY name
`).all(graphId);

factions.forEach(f => {
  const count = f.member_count || 0;
  const status = count === 0 ? '⚠️ EMPTY' : '✅';
  console.log(`${status} ${f.name.padEnd(40)} ${count} members (${f.node_type})`);
});

console.log(`\n=== SUMMARY ===`);
console.log(`Total factions: ${factions.length}`);
console.log(`Empty factions: ${factions.filter(f => (f.member_count || 0) === 0).length}`);
console.log(`Populated factions: ${factions.filter(f => (f.member_count || 0) > 0).length}`);

db.close();
