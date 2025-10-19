const Database = require('better-sqlite3');
const db = new Database('/app/data/wrldbldr-mcp-manager.db');

const graphId = '48592d52-50b3-4e64-b98f-a22a7d13bb3f';

console.log('=== EDGE STATISTICS ===\n');

const edgeTypes = db.prepare(`
  SELECT edge_type, COUNT(*) as count
  FROM graph_edges
  WHERE graph_id = ?
  GROUP BY edge_type
`).all(graphId);

console.log('Edge types:');
edgeTypes.forEach(e => {
  console.log(`  ${e.edge_type}: ${e.count}`);
});

console.log('\n=== SAMPLE EDGES ===\n');

const sampleEdges = db.prepare(`
  SELECT
    e.edge_type,
    n1.name as source_name,
    n1.node_type as source_type,
    n2.name as target_name,
    n2.node_type as target_type
  FROM graph_edges e
  JOIN graph_nodes n1 ON e.source_node_id = n1.id
  JOIN graph_nodes n2 ON e.target_node_id = n2.id
  WHERE e.graph_id = ?
  LIMIT 10
`).all(graphId);

sampleEdges.forEach(e => {
  console.log(`${e.source_name} (${e.source_type}) --[${e.edge_type}]--> ${e.target_name} (${e.target_type})`);
});

console.log('\n=== FACTION STATS ===\n');

const factionStats = db.prepare(`
  SELECT
    json_extract(attributes, '$.faction') as faction,
    COUNT(*) as npc_count
  FROM graph_nodes
  WHERE graph_id = ?
    AND json_extract(attributes, '$.is_faction_node') IS NULL
    AND node_type != 'PC'
  GROUP BY faction
  ORDER BY npc_count DESC
`).all(graphId);

console.log('NPCs per faction:');
factionStats.forEach(s => {
  console.log(`  ${s.faction}: ${s.npc_count} NPCs`);
});

db.close();
