const Database = require('better-sqlite3');
const db = new Database('/app/data/wrldbldr-mcp-manager.db');

const GRAPH_ID = '48592d52-50b3-4e64-b98f-a22a7d13bb3f';

// Fix Mechanist Order faction node attributes
const faction = db.prepare(`
  SELECT id, attributes FROM graph_nodes
  WHERE graph_id = ? AND name = 'Mechanist Order'
`).get(GRAPH_ID);

if (faction) {
  const attrs = JSON.parse(faction.attributes);
  attrs.faction = 'Mechanist Order'; // Fix self-reference

  db.prepare('UPDATE graph_nodes SET attributes = ? WHERE id = ?')
    .run(JSON.stringify(attrs), faction.id);

  console.log('✓ Fixed Mechanist Order faction attributes');
} else {
  console.log('⚠ Mechanist Order faction not found');
}

db.close();
