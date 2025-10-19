/**
 * Add Mechanist Order NPCs from system database to Political-Web graph
 * Consolidates "Mechanist Order Command Structure" + "Chrome Bishop Proxies" → "Mechanist Order"
 */

const Database = require('better-sqlite3');
const crypto = require('crypto');

const db = new Database('/app/data/wrldbldr-mcp-manager.db');
const CAMPAIGN_ID = '1ceec234-523b-4e25-a0b5-097c71018be5';
const GRAPH_ID = '48592d52-50b3-4e64-b98f-a22a7d13bb3f';

const now = Math.floor(Date.now() / 1000);

console.log('=== Adding Mechanist Order NPCs to Political-Web ===\n');

// Step 1: Rename "Mechanist Order Command Structure" → "Mechanist Order"
const mechanistFaction = db.prepare(`
  SELECT id FROM graph_nodes
  WHERE graph_id = ? AND name = 'Mechanist Order Command Structure'
`).get(GRAPH_ID);

if (mechanistFaction) {
  db.prepare(`
    UPDATE graph_nodes
    SET name = 'Mechanist Order'
    WHERE id = ?
  `).run(mechanistFaction.id);
  console.log('✓ Renamed "Mechanist Order Command Structure" → "Mechanist Order"\n');
}

// Step 2: Delete "Chrome Bishop Proxies" faction (consolidating into Mechanist Order)
const proxiesFaction = db.prepare(`
  SELECT id FROM graph_nodes
  WHERE graph_id = ? AND name = 'Chrome Bishop Proxies'
`).get(GRAPH_ID);

if (proxiesFaction) {
  db.prepare('DELETE FROM graph_nodes WHERE id = ?').run(proxiesFaction.id);
  console.log('✓ Deleted "Chrome Bishop Proxies" faction (consolidated)\n');
}

// Step 3: Define Mechanist Order NPCs to add
const mechanistNPCs = [
  {
    name: 'The Chrome Bishop',
    node_type: 'NPC:leader',
    description: 'Mysterious leader of the Mechanist Order, level 20 entity preaching technological transcendence'
  },
  {
    name: 'Altus, Ascendant of Frame',
    node_type: 'NPC:lieutenant',
    description: 'Level 12 Ascendant specializing in structural engineering and architecture'
  },
  {
    name: 'Harmonic, the Ascendant of Signal',
    node_type: 'NPC:lieutenant',
    description: 'Level 12 Ascendant controlling communications and information networks'
  },
  {
    name: 'Xi0, the Ascendant of Thread',
    node_type: 'NPC:lieutenant',
    description: 'Level 12 Ascendant weaving technological connections and dependencies'
  },
  {
    name: '"—" The Space Between Words, the Ascendant of NaN',
    node_type: 'NPC:lieutenant',
    description: 'Level 12 Ascendant operating in conceptual null-spaces and paradoxes'
  }
];

const MECHANIST_COLOR = '#71717a'; // Chrome Silver

console.log('Adding NPCs:\n');

const createdNPCs = [];

mechanistNPCs.forEach(npcData => {
  const nodeId = crypto.randomUUID();

  db.prepare(`
    INSERT INTO graph_nodes (
      id, graph_id, node_type, name, attributes, observations,
      information_level_id, created_at, last_accessed, pinned
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nodeId,
    GRAPH_ID,
    npcData.node_type,
    npcData.name,
    JSON.stringify({
      faction: 'Mechanist Order',
      color: MECHANIST_COLOR,
      is_pc: false
    }),
    JSON.stringify([{
      text: npcData.description,
      created_at: now,
      last_accessed: now
    }]),
    null,
    now,
    now,
    0
  );

  createdNPCs.push({ id: nodeId, name: npcData.name, type: npcData.node_type });
  console.log(`✓ Created ${npcData.node_type.padEnd(15)} ${npcData.name}`);
});

console.log('\n=== Creating Command Hierarchy ===\n');

// Step 4: Create command relationships (Chrome Bishop commands all Ascendants)
const chromeBishop = createdNPCs.find(n => n.name === 'The Chrome Bishop');
const ascendants = createdNPCs.filter(n => n.type === 'NPC:lieutenant');

ascendants.forEach(ascendant => {
  const edgeId = crypto.randomUUID();

  db.prepare(`
    INSERT INTO graph_edges (
      id, graph_id, edge_type, source_node_id, target_node_id, directed, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    edgeId,
    GRAPH_ID,
    'commands',
    chromeBishop.id,
    ascendant.id,
    1, // Directed
    null,
    now
  );

  console.log(`✓ Chrome Bishop --[commands]--> ${ascendant.name}`);
});

// Step 5: Update Mechanist Order faction member count
if (mechanistFaction) {
  const memberCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM graph_nodes
    WHERE graph_id = ?
      AND json_extract(attributes, '$.faction') = 'Mechanist Order'
      AND json_extract(attributes, '$.is_faction_node') IS NULL
  `).get(GRAPH_ID);

  db.prepare(`
    UPDATE graph_nodes
    SET attributes = json_set(attributes, '$.member_count', ?)
    WHERE id = ?
  `).run(memberCount.count, mechanistFaction.id);

  console.log(`\n✓ Updated Mechanist Order faction: ${memberCount.count} members`);
}

console.log('\n=== Complete ===');
console.log(`Added ${createdNPCs.length} NPCs`);
console.log(`Created ${ascendants.length} command relationships`);

db.close();
