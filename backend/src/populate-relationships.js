const Database = require('better-sqlite3');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

const db = new Database('/app/data/wrldbldr-mcp-manager.db');

const campaignId = '1ceec234-523b-4e25-a0b5-097c71018be5';
const graphId = 'e2aa8963-edcc-49bd-9307-62781d6bd97b';

// First, get all node IDs by name
const nodesByName = {};
const nodes = db.prepare('SELECT id, name FROM graph_nodes WHERE graph_id = ?').all(graphId);
for (const node of nodes) {
  nodesByName[node.name] = node.id;
}

console.log('Found nodes:', Object.keys(nodesByName));

// Relationship mappings from entity-mapping.json
const relationships = [
  { from: "Twelvefold Veins", to: "Chrome Bishop", type: "empowers" },
  { from: "Retroactive Divine Existence", to: "Chrome Bishop", type: "mystifies" },
  { from: "The Ascendants", to: "Chrome Bishop", type: "embodies" },
  { from: "Mechanist Order", to: "Chrome Bishop", type: "empowers" },
  { from: "The Shattering", to: "Dragon Origins", type: "transformed" },
  { from: "Mortal Ascension", to: "Retroactive Divine Existence", type: "contradicts" },
  { from: "Calendar System", to: "The Shattering", type: "preceded" },
  { from: "The Shattering", to: "Planar Barrier Weakening", type: "created" },
  { from: "The Shattering", to: "Fractured Political Landscape", type: "created" },
  { from: "Fractured Political Landscape", to: "Chrome Bishop", type: "enabled" },
  { from: "The Shattering", to: "Magic", type: "created" },
  { from: "The Shattering", to: "Eight Magical Regions", type: "created" },
  { from: "Pre-Shattering Civilization", to: "Chrome Bishop", type: "created" }
];

const createdEdges = [];

try {
  for (const rel of relationships) {
    const sourceId = nodesByName[rel.from];
    const targetId = nodesByName[rel.to];

    if (!sourceId) {
      console.log(`⚠ Skipping: Source node "${rel.from}" not found`);
      continue;
    }

    if (!targetId) {
      console.log(`⚠ Skipping: Target node "${rel.to}" not found`);
      continue;
    }

    const edgeId = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO graph_edges (
        id, graph_id, source_node_id, target_node_id, edge_type,
        directed, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      edgeId,
      graphId,
      sourceId,
      targetId,
      rel.type,
      1,  // directed = true
      JSON.stringify({}),
      now
    );

    createdEdges.push({
      from: rel.from,
      to: rel.to,
      type: rel.type,
      id: edgeId
    });
    console.log(`✓ Created: ${rel.from} --[${rel.type}]--> ${rel.to}`);
  }

  console.log(`\n✓ Successfully created ${createdEdges.length} relationships`);
  console.log(JSON.stringify(createdEdges, null, 2));
} catch (error) {
  console.error('Error creating relationships:', error);
} finally {
  db.close();
}
