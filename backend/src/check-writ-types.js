const Database = require('better-sqlite3');
const db = new Database('/app/data/wrldbldr-mcp-manager.db');

const GRAPH_ID = '48592d52-50b3-4e64-b98f-a22a7d13bb3f';

const npcs = db.prepare(`
  SELECT name, node_type
  FROM graph_nodes
  WHERE graph_id = ?
    AND json_extract(attributes, '$.faction') = 'Nine Arcane Writs'
    AND json_extract(attributes, '$.is_faction_node') IS NULL
  ORDER BY node_type, name
`).all(GRAPH_ID);

console.log('Nine Arcane Writs NPCs:\n');
npcs.forEach(n => {
  console.log('  ' + n.node_type.padEnd(20) + n.name);
});
console.log('\nTotal:', npcs.length);

db.close();
