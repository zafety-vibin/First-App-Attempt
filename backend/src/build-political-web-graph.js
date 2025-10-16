/**
 * Build Political-Web Graph
 *
 * Imports entities and relationships into Feature 006 graph structure:
 * 1. Deduplicate NPCs from pol-web-memory + npcs table
 * 2. Create faction nodes with colors
 * 3. Create PC nodes (party center anchors)
 * 4. Create NPC nodes with faction assignments
 * 5. Create relationship edges
 */

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const MAIN_DB_PATH = path.join(__dirname, '../data/wrldbldr-mcp-manager.db');
const POL_WEB_DB_PATH = path.join(__dirname, 'pol-web-memory.db');
const CAMPAIGN_ID = '1ceec234-523b-4e25-a0b5-097c71018be5';

const mainDb = new Database(MAIN_DB_PATH);
const polWebDb = new Database(POL_WEB_DB_PATH, { readonly: true });

mainDb.pragma('foreign_keys = ON');

console.log('=== Building Political-Web Graph ===\n');

// Step 1: Find or create Political-Web graph
let graphId;
const existingGraph = mainDb.prepare(`
  SELECT id FROM knowledge_graphs
  WHERE campaign_id = ? AND graph_type = 'Political-Web'
`).get(CAMPAIGN_ID);

if (existingGraph) {
  graphId = existingGraph.id;
  console.log(`Using existing Political-Web graph: ${graphId}`);

  // Clear existing nodes and edges
  mainDb.prepare('DELETE FROM graph_edges WHERE graph_id = ?').run(graphId);
  mainDb.prepare('DELETE FROM graph_nodes WHERE graph_id = ?').run(graphId);
  console.log('Cleared existing graph data\n');
} else {
  graphId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  mainDb.prepare(`
    INSERT INTO knowledge_graphs (
      id, campaign_id, graph_type, graph_name, toggle_state, decay_rate, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(graphId, CAMPAIGN_ID, 'Political-Web', 'Political Web', 1, 0.1, now, now);

  console.log(`Created new Political-Web graph: ${graphId}\n`);
}

// Step 2: Define factions with colors
const FACTIONS = [
  { name: 'The Party', color: '#10b981', type: 'adventuring_group' }, // Green
  { name: 'Mechanist Order', color: '#71717a', type: 'Organization:hierarchy' }, // Chrome Silver
  { name: 'Nine Arcane Writs', color: '#a855f7', type: 'Faction:political' }, // Purple
  { name: 'Sablemarrow Council', color: '#3b82f6', type: 'Faction:political' }, // Steel Blue
  { name: 'Sablemarrow Merchants', color: '#f59e0b', type: 'Organization:alliance' }, // Gold
  { name: 'Saltborn', color: '#06b6d4', type: 'Faction:criminal' }, // Ocean Blue
  { name: 'Ancient Dragons', color: '#ec4899', type: 'Faction:ideological' }, // Prismatic Pink
  { name: 'Druidic Resistance', color: '#22c55e', type: 'Faction:ideological' }, // Forest Green
  { name: 'Unaffiliated', color: '#6b7280', type: 'neutral' } // Gray
];

console.log('Creating faction nodes...\n');

const factionNodeIds = {};
const now = Math.floor(Date.now() / 1000);

for (const faction of FACTIONS) {
  const nodeId = crypto.randomUUID();

  mainDb.prepare(`
    INSERT INTO graph_nodes (
      id, graph_id, node_type, name, attributes, observations,
      information_level_id, created_at, last_accessed, pinned
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nodeId,
    graphId,
    faction.type,
    faction.name,
    JSON.stringify({
      faction: faction.name,
      color: faction.color,
      is_faction_node: true,
      member_count: 0 // Will update after adding NPCs
    }),
    null,
    null,
    now,
    now,
    0
  );

  factionNodeIds[faction.name] = nodeId;
  console.log(`✓ Created faction: ${faction.name} (${faction.color})`);
}

// Step 3: Load PCs and create PC nodes
console.log('\n=== Creating PC Nodes ===\n');

const pcs = mainDb.prepare(`
  SELECT * FROM player_characters WHERE campaign_id = ?
`).all(CAMPAIGN_ID);

console.log(`Found ${pcs.length} player characters`);

const pcNodeIds = {};

pcs.forEach((pc, index) => {
  const nodeId = crypto.randomUUID();

  const classArray = pc.class ? JSON.parse(pc.class) : [];
  const className = classArray[0] || 'Unknown';

  mainDb.prepare(`
    INSERT INTO graph_nodes (
      id, graph_id, node_type, name, attributes, observations,
      information_level_id, created_at, last_accessed, pinned
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nodeId,
    graphId,
    'PC',
    pc.name,
    JSON.stringify({
      faction: 'The Party',
      color: '#10b981',
      player_name: pc.player_name,
      class: className,
      level: pc.level,
      race: pc.race,
      is_party_member: true,
      center_position: index // For fixed positioning
    }),
    pc.personality ? JSON.stringify([{ text: pc.personality, created_at: now, last_accessed: now }]) : null,
    null,
    now,
    now,
    1 // Pinned (fixed position)
  );

  pcNodeIds[pc.name] = nodeId;
  console.log(`✓ Created PC: ${pc.name} (${pc.race} ${className} ${pc.level})`);

  // Link PC to Party faction
  const edgeId = crypto.randomUUID();
  mainDb.prepare(`
    INSERT INTO graph_edges (
      id, graph_id, edge_type, source_node_id, target_node_id, directed, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(edgeId, graphId, 'member of', nodeId, factionNodeIds['The Party'], 1, null, now);
});

// Step 4: Load NPCs from npcs table and deduplicate with pol-web entities
console.log('\n=== Processing NPCs ===\n');

const dbNpcs = mainDb.prepare(`
  SELECT * FROM npcs WHERE campaign_id = ?
`).all(CAMPAIGN_ID);

const polWebEntities = polWebDb.prepare(`
  SELECT * FROM entities WHERE entity_type LIKE '%NPC%'
`).all();

console.log(`Found ${dbNpcs.length} NPCs in database`);
console.log(`Found ${polWebEntities.length} NPC entities in pol-web-memory`);

// Deduplicate: match by name (case-insensitive)
const polWebNpcNames = new Set(polWebEntities.map(e => e.name.toLowerCase()));
const npcNodeIds = {};

// Faction assignment rules based on NPC attributes/names
function assignFaction(npc) {
  const name = npc.name.toLowerCase();

  // Check explicit tags or role
  if (name.includes('bishop') || name.includes('ascendant') || name.includes('mechanist')) {
    return 'Mechanist Order';
  }
  if (name.includes('writ') || name.includes('magister') || name.includes('arcane')) {
    return 'Nine Arcane Writs';
  }
  if (name.includes('councilor') || name.includes('council')) {
    return 'Sablemarrow Council';
  }
  if (name.includes('dragon') || name.includes('source') || name.includes('ancient')) {
    return 'Ancient Dragons';
  }
  if (name.includes('druid') || name.includes('sythra')) {
    return 'Druidic Resistance';
  }
  if (name.includes('salt') || name.includes('captain') || name.includes('darius')) {
    return 'Saltborn';
  }

  // Check if they're a merchant (from role or tags)
  const desc = (npc.description || '').toLowerCase();
  if (desc.includes('merchant') || desc.includes('shop') || desc.includes('sells')) {
    return 'Sablemarrow Merchants';
  }

  // Default to unaffiliated
  return 'Unaffiliated';
}

let npcCount = 0;

for (const npc of dbNpcs) {
  const nodeId = crypto.randomUUID();
  const faction = assignFaction(npc);
  const factionColor = FACTIONS.find(f => f.name === faction)?.color || '#6b7280';

  // Check if this NPC exists in pol-web-memory (will use those relationships later)
  const inPolWeb = polWebNpcNames.has(npc.name.toLowerCase());

  const classArray = npc.class ? JSON.parse(npc.class) : [];

  mainDb.prepare(`
    INSERT INTO graph_nodes (
      id, graph_id, node_type, name, attributes, observations,
      information_level_id, created_at, last_accessed, pinned
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nodeId,
    graphId,
    'NPC:major', // Default to major for now (can refine later)
    npc.name,
    JSON.stringify({
      faction,
      color: factionColor,
      race: npc.race,
      class: classArray[0] || null,
      level: npc.level,
      met_party: npc.met_party || 0,
      in_pol_web: inPolWeb
    }),
    null, // Observations will be added separately
    null,
    now,
    now,
    0
  );

  npcNodeIds[npc.name] = nodeId;
  npcCount++;

  // Link to faction
  if (factionNodeIds[faction]) {
    const edgeId = crypto.randomUUID();
    mainDb.prepare(`
      INSERT INTO graph_edges (
        id, graph_id, edge_type, source_node_id, target_node_id, directed, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(edgeId, graphId, 'member of', nodeId, factionNodeIds[faction], 1, null, now);
  }
}

console.log(`✓ Created ${npcCount} NPC nodes with faction assignments\n`);

// Step 5: Import relationships from pol-web-memory
console.log('=== Importing Relationships ===\n');

const polWebRelations = polWebDb.prepare('SELECT * FROM relations').all();
const polWebEntitiesById = new Map(polWebEntities.map(e => [e.id, e]));

let edgeCount = 0;

for (const relation of polWebRelations) {
  const sourceEntity = polWebEntitiesById.get(relation.from_entity_id);
  const targetEntity = polWebEntitiesById.get(relation.to_entity_id);

  if (!sourceEntity || !targetEntity) continue;

  // Find matching nodes by name
  const sourceNodeId = npcNodeIds[sourceEntity.name] || pcNodeIds[sourceEntity.name];
  const targetNodeId = npcNodeIds[targetEntity.name] || pcNodeIds[targetEntity.name] || factionNodeIds[targetEntity.name];

  if (!sourceNodeId || !targetNodeId) continue;

  const edgeId = crypto.randomUUID();

  mainDb.prepare(`
    INSERT INTO graph_edges (
      id, graph_id, edge_type, source_node_id, target_node_id, directed, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(edgeId, graphId, relation.relation_type, sourceNodeId, targetNodeId, 1, null, now);

  edgeCount++;
}

console.log(`✓ Imported ${edgeCount} relationships from pol-web-memory\n`);

// Step 6: Create Party-to-NPC edges based on "met_party" field
console.log('=== Creating Party Relationships ===\n');

let partyEdges = 0;

for (const npc of dbNpcs) {
  if (npc.met_party && npcNodeIds[npc.name]) {
    // Create "knows about" edge from all PCs who met this NPC
    for (const pcName of Object.keys(pcNodeIds)) {
      const edgeId = crypto.randomUUID();

      mainDb.prepare(`
        INSERT INTO graph_edges (
          id, graph_id, edge_type, source_node_id, target_node_id, directed, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(edgeId, graphId, 'knows about', pcNodeIds[pcName], npcNodeIds[npc.name], 1, null, now);

      partyEdges++;
    }
  }
}

console.log(`✓ Created ${partyEdges} party relationship edges\n`);

// Step 7: Update faction member counts
console.log('=== Updating Faction Member Counts ===\n');

for (const faction of FACTIONS) {
  const memberCount = mainDb.prepare(`
    SELECT COUNT(*) as count
    FROM graph_edges e
    WHERE e.graph_id = ?
      AND e.edge_type = 'member of'
      AND e.target_node_id = ?
  `).get(graphId, factionNodeIds[faction.name]);

  // Update faction node attributes
  mainDb.prepare(`
    UPDATE graph_nodes
    SET attributes = json_set(attributes, '$.member_count', ?)
    WHERE id = ?
  `).run(memberCount.count, factionNodeIds[faction.name]);

  console.log(`${faction.name}: ${memberCount.count} members`);
}

// Final stats
const totalNodes = mainDb.prepare('SELECT COUNT(*) as count FROM graph_nodes WHERE graph_id = ?').get(graphId);
const totalEdges = mainDb.prepare('SELECT COUNT(*) as count FROM graph_edges WHERE graph_id = ?').get(graphId);

console.log('\n=== Political-Web Graph Built ===');
console.log(`Total Nodes: ${totalNodes.count}`);
console.log(`Total Edges: ${totalEdges.count}`);
console.log(`  - ${FACTIONS.length} factions`);
console.log(`  - ${pcs.length} PCs`);
console.log(`  - ${npcCount} NPCs`);

mainDb.close();
polWebDb.close();
