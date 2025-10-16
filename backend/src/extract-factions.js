/**
 * Extract factions from pol-web-memory
 * Auto-detect organizations and create faction list
 */

const Database = require('better-sqlite3');
const path = require('path');

const polWebDb = new Database(path.join(__dirname, 'pol-web-memory.db'), { readonly: true });

console.log('=== Faction Extraction ===\n');

// Get all entities
const entities = polWebDb.prepare('SELECT * FROM entities').all();
const relations = polWebDb.prepare('SELECT * FROM relations').all();

console.log(`Analyzing ${entities.length} entities and ${relations.length} relations...\n`);

// Find organizational entities (target of "member of" relations)
const organizationIds = new Set();
relations.forEach(r => {
  if (r.relation_type === 'member of') {
    organizationIds.add(r.to_entity_id);
  }
});

// Get organization entities
const factions = entities.filter(e => organizationIds.has(e.id));

console.log(`Found ${factions.length} factions:\n`);

factions.forEach(faction => {
  const members = relations
    .filter(r => r.relation_type === 'member of' && r.to_entity_id === faction.id)
    .map(r => entities.find(e => e.id === r.from_entity_id))
    .filter(e => e);

  console.log(`${faction.name} (${faction.entity_type})`);
  console.log(`  ID: ${faction.id}`);
  console.log(`  Members: ${members.length}`);
  members.forEach(m => console.log(`    - ${m.name} (${m.entity_type})`));
  console.log('');
});

// Also check for explicitly typed organizations
console.log('\n=== All Organization Entities ===');
const orgEntities = entities.filter(e =>
  e.entity_type?.includes('organization') ||
  e.entity_type?.includes('hierarchy') ||
  e.entity_type?.includes('faction')
);

orgEntities.forEach(org => {
  console.log(`${org.name} (${org.entity_type})`);
});

// List all unique entity types
console.log('\n=== All Entity Types ===');
const types = new Set(entities.map(e => e.entity_type));
types.forEach(t => {
  const count = entities.filter(e => e.entity_type === t).length;
  console.log(`${t}: ${count}`);
});

// List all unique relation types
console.log('\n=== All Relation Types ===');
const relTypes = new Set(relations.map(r => r.relation_type));
relTypes.forEach(rt => {
  const count = relations.filter(r => r.relation_type === rt).length;
  console.log(`${rt}: ${count}`);
});

polWebDb.close();
console.log('\n=== Extraction Complete ===');
