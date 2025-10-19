const Database = require('better-sqlite3');
const db = new Database('/app/data/wrldbldr-mcp-manager.db');

const graphId = '48592d52-50b3-4e64-b98f-a22a7d13bb3f';

const npcs = db.prepare(`
  SELECT
    name,
    node_type,
    json_extract(attributes, '$.faction') as faction,
    json_extract(attributes, '$.secondary_faction') as secondary_faction
  FROM graph_nodes
  WHERE graph_id = ?
    AND json_extract(attributes, '$.is_faction_node') IS NULL
  ORDER BY faction, name
`).all(graphId);

console.log('=== ALL NPCS/PCS ===\n');

npcs.forEach(n => {
  const factionDisplay = (n.faction || 'NULL').padEnd(35);
  const nameDisplay = n.name.padEnd(30);
  const secondaryDisplay = n.secondary_faction ? `(secondary: ${n.secondary_faction})` : '';
  console.log(factionDisplay, nameDisplay, secondaryDisplay);
});

console.log('\n=== ORPHANED CHECK ===');

const orphaned = npcs.filter(n => !n.faction || n.faction === 'null' || n.faction === '');

console.log(`Orphaned NPCs (no faction): ${orphaned.length}`);

if (orphaned.length > 0) {
  orphaned.forEach(n => console.log('  ⚠', n.name));
} else {
  console.log('✓ No orphaned NPCs - all have faction assignments');
}

db.close();
