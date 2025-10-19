const Database = require('better-sqlite3');
const db = new Database('/app/data/wrldbldr-mcp-manager.db');

const GRAPH_ID = '48592d52-50b3-4e64-b98f-a22a7d13bb3f';

// Delete Unaffiliated faction node
const result = db.prepare(`
  DELETE FROM graph_nodes
  WHERE graph_id = ? AND name = 'Unaffiliated'
`).run(GRAPH_ID);

if (result.changes > 0) {
  console.log('✓ Deleted Unaffiliated faction');
} else {
  console.log('⚠ Unaffiliated faction not found (may already be deleted)');
}

db.close();
