/**
 * Analyze Political-Web memory structure
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'pol-web-memory.db');

const db = new Database(DB_PATH, { readonly: true });

console.log('=== Political-Web Memory Analysis ===\n');

// List all tables
console.log('Tables:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => console.log(`  - ${t.name}`));

// Analyze entities table
console.log('\n=== Entities ===');
const entities = db.prepare('SELECT * FROM entities').all();
console.log(`Found ${entities.length} entities\n`);

// Check entity schema
if (entities.length > 0) {
  console.log('Entity columns:', Object.keys(entities[0]));
}

// Group entities by type/faction if those fields exist
if (entities.length > 0 && entities[0].type) {
  const byType = {};
  entities.forEach(e => {
    if (!byType[e.type]) byType[e.type] = [];
    byType[e.type].push(e);
  });
  console.log('\nEntity types:');
  Object.entries(byType).forEach(([type, typeEntities]) => {
    console.log(`  ${type}: ${typeEntities.length}`);
  });
}

console.log('\n=== Sample Entities ===');
entities.slice(0, 5).forEach(e => {
  console.log(`\n${e.name || e.id}`);
  Object.entries(e).forEach(([key, value]) => {
    if (key !== 'id' && value) {
      console.log(`  ${key}: ${typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value}`);
    }
  });
});

// Analyze relations
console.log('\n\n=== Relations ===');
const relations = db.prepare('SELECT * FROM relations').all();
console.log(`Found ${relations.length} relations\n`);

if (relations.length > 0) {
  console.log('Relation columns:', Object.keys(relations[0]));
}

// Group by type if exists
if (relations.length > 0 && relations[0].type) {
  const byType = {};
  relations.forEach(r => {
    if (!byType[r.type]) byType[r.type] = [];
    byType[r.type].push(r);
  });
  console.log('\nRelation types:');
  Object.entries(byType).forEach(([type, typeRels]) => {
    console.log(`  ${type}: ${typeRels.length}`);
  });
}

console.log('\n=== Sample Relations ===');
relations.slice(0, 5).forEach(r => {
  const source = entities.find(e => e.id === r.source_id);
  const target = entities.find(e => e.id === r.target_id);
  console.log(`\n${source?.name || r.source_id} ─[${r.type || 'unknown'}]→ ${target?.name || r.target_id}`);
  Object.entries(r).forEach(([key, value]) => {
    if (key !== 'id' && key !== 'source_id' && key !== 'target_id' && key !== 'type' && value) {
      console.log(`  ${key}: ${value}`);
    }
  });
});

// Analyze observations
console.log('\n\n=== Observations ===');
const observations = db.prepare('SELECT * FROM observations LIMIT 10').all();
console.log(`Sample of ${observations.length} observations\n`);

if (observations.length > 0) {
  console.log('Observation columns:', Object.keys(observations[0]));
}

db.close();
console.log('\n=== Analysis Complete ===');
