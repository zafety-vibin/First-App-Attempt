import Database from 'better-sqlite3';

const db = new Database('./data/wrldbldr-mcp-manager.db');

const tables = ['factions', 'npcs', 'locations', 'session_recaps', 'quests', 'player_characters', 'lore_entries', 'world_rules', 'planar_forces', 'session_preps', 'items', 'creatures'];

console.log('=== Player Knowledge Values Across All Tables ===\n');

tables.forEach(table => {
  const rows = db.prepare(`SELECT DISTINCT player_knowledge FROM ${table} WHERE player_knowledge IS NOT NULL`).all() as { player_knowledge: string }[];
  if (rows.length > 0) {
    console.log(`${table}:`);
    rows.forEach(r => console.log(`  - "${r.player_knowledge}"`));
  }
});

console.log('\n=== Information Levels in Database ===');
const levels = db.prepare('SELECT id, name, hierarchical FROM information_levels').all();
levels.forEach((l: any) => console.log(`  ${l.id} → ${l.name} (hierarchical: ${l.hierarchical})`));

db.close();
