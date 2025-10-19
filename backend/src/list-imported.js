const Database = require('better-sqlite3');
const db = new Database('/app/data/wrldbldr-mcp-manager.db');

const nodes = db.prepare(`
  SELECT name, node_type, attributes
  FROM graph_nodes
  WHERE graph_id = '48592d52-50b3-4e64-b98f-a22a7d13bb3f'
  ORDER BY node_type, name
`).all();

console.log('=== ALL IMPORTED NODES ===\n');

nodes.forEach(n => {
  const attrs = JSON.parse(n.attributes || '{}');
  console.log(`${n.node_type.padEnd(30)} ${n.name.padEnd(40)} faction: ${attrs.faction || 'none'}`);
});

console.log(`\nTotal: ${nodes.length} nodes`);
db.close();
