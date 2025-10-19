/**
 * Translate pol-web-memory.db to system Political-Web graph
 *
 * Strategy:
 * 1. Clear existing Political-Web graph nodes/edges
 * 2. Map pol-web entities → graph_nodes (standardized schema)
 * 3. Map pol-web relations → graph_edges (actionable verbs)
 * 4. Preserve observations, infer hierarchy, extract roles
 * 5. Handle PC faction membership (Tanner + Writ Holders)
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

console.log('=== Translating Pol-Web Memory to System Schema ===\n');

// Step 1: Find Political-Web graph
let graphId;
const existingGraph = mainDb.prepare(`
  SELECT id FROM knowledge_graphs
  WHERE campaign_id = ? AND graph_type = 'Political-Web'
`).get(CAMPAIGN_ID);

if (existingGraph) {
  graphId = existingGraph.id;
  console.log(`Found Political-Web graph: ${graphId}`);

  // Clear existing data
  mainDb.prepare('DELETE FROM graph_edges WHERE graph_id = ?').run(graphId);
  mainDb.prepare('DELETE FROM graph_nodes WHERE graph_id = ?').run(graphId);
  console.log('Cleared existing Political-Web data\n');
} else {
  console.error('No Political-Web graph found!');
  process.exit(1);
}

// Step 2: Define faction mapping (pol-web types → system types + colors)
const FACTION_MAPPING = {
  'Nine Arcane Writs': {
    type: 'Faction:political',
    color: '#a855f7', // Purple
    description: 'Magical oligarchy ruling Veilshard - 9 Writ holders'
  },
  'Mechanist Order Command Structure': {
    type: 'Organization:hierarchy',
    color: '#71717a', // Chrome Silver
    description: 'Technological supremacist movement led by Chrome Bishop'
  },
  'Chrome Bishop Proxies': {
    type: 'Organization:hierarchy',
    color: '#8b5cf6', // Purple variant
    description: 'Mechanist Order enforcement and execution arm'
  },
  'Guild of the Writless': {
    type: 'Organization:alliance',
    color: '#f59e0b', // Gold
    description: 'Common citizens without Writ privileges'
  },
  'Merchant\'s Guild': {
    type: 'Organization:alliance',
    color: '#fb923c', // Orange
    description: 'Trade organization'
  },
  'The Party': {
    type: 'adventuring_group',
    color: '#10b981', // Party Green
    description: 'Player characters'
  },
  'Unaffiliated': {
    type: 'neutral',
    color: '#6b7280', // Gray
    description: 'Independent NPCs'
  }
};

// Factions to SKIP (world logic, not actual factions)
const SKIP_FACTIONS = ['Druidic Resistance'];

// IMPORTANT: Always create Unaffiliated faction for orphaned NPCs
// This ensures NPCs without faction assignments can still be displayed in the graph
const UNAFFILIATED_FACTION = {
  name: 'Unaffiliated',
  type: 'neutral',
  color: '#6b7280', // Gray
  description: 'Independent NPCs without faction affiliation'
};

// Step 3: Load pol-web entities
console.log('=== Loading Pol-Web Entities ===\n');
const polWebEntities = polWebDb.prepare('SELECT * FROM entities').all();
const polWebRelations = polWebDb.prepare('SELECT * FROM relations').all();
const polWebObservations = polWebDb.prepare('SELECT * FROM observations').all();

console.log(`Found ${polWebEntities.length} entities, ${polWebRelations.length} relations, ${polWebObservations.length} observations\n`);

// Build observations map
const observationsByEntity = {};
polWebObservations.forEach(obs => {
  if (!observationsByEntity[obs.entity_id]) {
    observationsByEntity[obs.entity_id] = [];
  }
  observationsByEntity[obs.entity_id].push(obs.text);
});

// Step 4: Translate entities → graph_nodes
console.log('=== Translating Entities ===\n');

const entityIdMap = {}; // pol-web id → system id
const now = Math.floor(Date.now() / 1000);

// Build relation map to determine NPC factions BEFORE creating nodes
const relationMap = {};
polWebRelations.forEach(rel => {
  if (!relationMap[rel.from_entity_id]) {
    relationMap[rel.from_entity_id] = [];
  }
  relationMap[rel.from_entity_id].push(rel);
});

// First pass: Create faction nodes (skip Druidic Resistance)
const factionEntities = polWebEntities.filter(e =>
  ['magical_oligarchy', 'organizational_hierarchy', 'guild', 'trade_organization',
   'ideological_opposition', 'surveillance_network', 'adventuring_group'].includes(e.entity_type) &&
  !SKIP_FACTIONS.includes(e.name)
);

// ALWAYS create Unaffiliated faction node first (for orphaned NPCs)
const unaffiliatedNodeId = crypto.randomUUID();
entityIdMap['unaffiliated-pseudo-faction'] = unaffiliatedNodeId;

mainDb.prepare(`
  INSERT INTO graph_nodes (
    id, graph_id, node_type, name, attributes, observations,
    information_level_id, created_at, last_accessed, pinned
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  unaffiliatedNodeId,
  graphId,
  UNAFFILIATED_FACTION.type,
  UNAFFILIATED_FACTION.name,
  JSON.stringify({
    faction: UNAFFILIATED_FACTION.name,
    color: UNAFFILIATED_FACTION.color,
    is_faction_node: true,
    member_count: 0 // Will update after adding NPCs
  }),
  JSON.stringify([{
    text: UNAFFILIATED_FACTION.description,
    created_at: now,
    last_accessed: now
  }]),
  null,
  now,
  now,
  0
);

console.log(`✓ Created pseudo-faction: ${UNAFFILIATED_FACTION.name} (${UNAFFILIATED_FACTION.type})`);

// Now create actual faction nodes from pol-web data
factionEntities.forEach(entity => {
  const nodeId = crypto.randomUUID();
  entityIdMap[entity.id] = nodeId;

  const factionConfig = FACTION_MAPPING[entity.name] || FACTION_MAPPING['Unaffiliated'];
  const observations = observationsByEntity[entity.id] || [];

  mainDb.prepare(`
    INSERT INTO graph_nodes (
      id, graph_id, node_type, name, attributes, observations,
      information_level_id, created_at, last_accessed, pinned
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nodeId,
    graphId,
    factionConfig.type,
    entity.name,
    JSON.stringify({
      faction: entity.name,
      color: factionConfig.color,
      is_faction_node: true,
      member_count: 0 // Will update after adding NPCs
    }),
    observations.length > 0 ? JSON.stringify(observations.map(text => ({
      text,
      created_at: now,
      last_accessed: now
    }))) : null,
    null,
    now,
    now,
    0
  );

  console.log(`✓ Created faction: ${entity.name} (${factionConfig.type})`);
});

// Second pass: Create NPC and PC nodes
const npcPcEntities = polWebEntities.filter(e => e.entity_type === 'NPC' || e.entity_type === 'PC');

npcPcEntities.forEach(entity => {
  const nodeId = crypto.randomUUID();
  entityIdMap[entity.id] = nodeId;

  const isPC = entity.entity_type === 'PC';
  const observations = observationsByEntity[entity.id] || [];

  // Determine faction from relations (check all membership types)
  const membershipTypes = ['member of', 'part of', 'serves', 'employed by'];
  let faction = 'Unaffiliated';

  const rels = relationMap[entity.id] || [];
  for (const rel of rels) {
    if (membershipTypes.includes(rel.relation_type)) {
      const factionEntity = polWebEntities.find(e => e.id === rel.to_entity_id);
      if (factionEntity && !SKIP_FACTIONS.includes(factionEntity.name)) {
        faction = factionEntity.name;
        break;
      }
    }
  }

  // Check for special roles (Writ Holder) - determines secondary faction
  const hasWritRole = observations.some(obs => obs && typeof obs === 'string' && obs.toLowerCase().includes('writ holder'));

  // Special case for Tanner - PC with Writ Holder role (dual membership)
  let secondaryFaction = null;
  if (entity.name === 'Tanner' && hasWritRole) {
    secondaryFaction = 'Nine Arcane Writs'; // Tanner is Writ Holder but stays in The Party
    faction = 'The Party'; // Primary faction remains The Party for Ring 0 placement
  }

  // For non-PC Writs, keep their faction as Nine Arcane Writs
  const factionColor = FACTION_MAPPING[faction]?.color || '#6b7280';

  mainDb.prepare(`
    INSERT INTO graph_nodes (
      id, graph_id, node_type, name, attributes, observations,
      information_level_id, created_at, last_accessed, pinned
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nodeId,
    graphId,
    isPC ? 'PC' : 'NPC:minor', // All NPCs default to minor, manually promote to leader/lieutenant
    entity.name,
    JSON.stringify({
      faction,
      color: factionColor,
      is_pc: isPC,
      ...(secondaryFaction && { secondary_faction: secondaryFaction }),
      ...(hasWritRole && { role: 'Writ Holder' })
    }),
    observations.length > 0 ? JSON.stringify(observations.map(text => ({
      text,
      created_at: now,
      last_accessed: now
    }))) : null,
    null,
    now,
    now,
    isPC ? 1 : 0 // Pin PCs
  );

  console.log(`✓ Created ${isPC ? 'PC' : 'NPC'}: ${entity.name} (${faction})`);
});

// Add missing party PCs (from system database)
console.log('\n=== Adding Party PCs ===\n');

const partyPCs = [
  { name: 'Carp', race: 'Human', class: 'Fighter', level: 10 },
  { name: 'Lucifer', race: 'Tiefling', class: 'Warlock', level: 10 },
  { name: 'Poggoo, the Magnificent', race: 'Halfling', class: 'Bard', level: 10 },
  { name: 'Pathik', race: 'Halfling', class: 'Rogue', level: 10 }
];

partyPCs.forEach(pc => {
  const nodeId = crypto.randomUUID();

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
      is_pc: true,
      race: pc.race,
      class: pc.class,
      level: pc.level
    }),
    JSON.stringify([{
      text: `${pc.race} ${pc.class} (level ${pc.level})`,
      created_at: now,
      last_accessed: now
    }]),
    null,
    now,
    now,
    1 // Pin PCs
  );

  console.log(`✓ Added PC: ${pc.name} (${pc.race} ${pc.class})`);
});

console.log(`\n=== Translating Relations ===\n`);

// Step 5: Translate relations → graph_edges
let edgeCount = 0;

polWebRelations.forEach(relation => {
  const sourceId = entityIdMap[relation.from_entity_id];
  const targetId = entityIdMap[relation.to_entity_id];

  if (!sourceId || !targetId) {
    console.log(`⚠ Skipping relation: unmapped entity (${relation.relation_type})`);
    return;
  }

  const edgeId = crypto.randomUUID();

  // Infer directionality from relation type
  const directedTypes = ['commands', 'reports to', 'leads', 'serves', 'employs', 'governs', 'spies on', 'taught by'];
  const isDirected = directedTypes.some(type => relation.relation_type.includes(type)) ? 1 : 0;

  mainDb.prepare(`
    INSERT INTO graph_edges (
      id, graph_id, edge_type, source_node_id, target_node_id, directed, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    edgeId,
    graphId,
    relation.relation_type,
    sourceId,
    targetId,
    isDirected,
    null,
    now
  );

  edgeCount++;
});

console.log(`✓ Created ${edgeCount} edges\n`);

// Step 6: Update faction member counts
console.log('=== Updating Faction Counts ===\n');

// Query ALL faction nodes directly from database (don't rely on entityIdMap)
const allFactionNodes = mainDb.prepare(`
  SELECT id, name
  FROM graph_nodes
  WHERE graph_id = ?
    AND json_extract(attributes, '$.is_faction_node') = 1
`).all(graphId);

console.log(`Found ${allFactionNodes.length} faction nodes to update\n`);

allFactionNodes.forEach(factionNode => {
  const factionName = factionNode.name;

  // Count NPCs/PCs with this faction in their attributes
  const memberCount = mainDb.prepare(`
    SELECT COUNT(*) as count
    FROM graph_nodes n
    WHERE n.graph_id = ?
      AND json_extract(n.attributes, '$.faction') = ?
      AND json_extract(n.attributes, '$.is_faction_node') IS NULL
  `).get(graphId, factionName);

  // Update faction node's member_count
  mainDb.prepare(`
    UPDATE graph_nodes
    SET attributes = json_set(attributes, '$.member_count', ?)
    WHERE id = ?
  `).run(memberCount.count, factionNode.id);

  console.log(`${factionName.padEnd(40)} ${memberCount.count} members`);
});

// Final stats
const totalNodes = mainDb.prepare('SELECT COUNT(*) as count FROM graph_nodes WHERE graph_id = ?').get(graphId);
const totalEdges = mainDb.prepare('SELECT COUNT(*) as count FROM graph_edges WHERE graph_id = ?').get(graphId);

console.log('\n=== Translation Complete ===');
console.log(`Total Nodes: ${totalNodes.count}`);
console.log(`Total Edges: ${totalEdges.count}`);
console.log(`Factions: ${factionEntities.length}`);
console.log(`NPCs/PCs: ${npcPcEntities.length}`);

mainDb.close();
polWebDb.close();
