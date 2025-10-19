const Database = require('better-sqlite3');
const db = new Database('/app/data/wrldbldr-mcp-manager.db');

const graphId = '48592d52-50b3-4e64-b98f-a22a7d13bb3f';

console.log('=== DEBUG: Faction Member Count Logic ===\n');

// Get all faction nodes
const factionNodes = db.prepare(`
  SELECT id, name, node_type, attributes
  FROM graph_nodes
  WHERE graph_id = ?
    AND json_extract(attributes, '$.is_faction_node') = 1
  ORDER BY name
`).all(graphId);

console.log(`Found ${factionNodes.length} faction nodes:\n`);

factionNodes.forEach(faction => {
  const attrs = JSON.parse(faction.attributes);
  const factionName = faction.name;

  // Method 1: Count by attributes.faction
  const countByAttr = db.prepare(`
    SELECT COUNT(*) as count
    FROM graph_nodes n
    WHERE n.graph_id = ?
      AND json_extract(n.attributes, '$.faction') = ?
      AND json_extract(n.attributes, '$.is_faction_node') IS NULL
  `).get(graphId, factionName);

  // Method 2: Count by "member of" edges
  const countByEdge = db.prepare(`
    SELECT COUNT(*) as count
    FROM graph_edges e
    WHERE e.graph_id = ?
      AND e.edge_type = 'member of'
      AND e.target_node_id = ?
  `).get(graphId, faction.id);

  console.log(`${factionName.padEnd(40)} attr: ${countByAttr.count}, edges: ${countByEdge.count}, stored: ${attrs.member_count || 0}`);

  // Show sample members
  const members = db.prepare(`
    SELECT name, node_type
    FROM graph_nodes
    WHERE graph_id = ?
      AND json_extract(attributes, '$.faction') = ?
      AND json_extract(attributes, '$.is_faction_node') IS NULL
    LIMIT 3
  `).all(graphId, factionName);

  if (members.length > 0) {
    members.forEach(m => console.log(`  → ${m.name} (${m.node_type})`));
  }
});

db.close();
