/**
 * Create party member PCs for Political-Web testing
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/wrldbldr-mcp-manager.db');
const CAMPAIGN_ID = '1ceec234-523b-4e25-a0b5-097c71018be5';

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

const partyMembers = [
  {
    name: 'Carp',
    player_name: 'Player 1',
    class: JSON.stringify(['Fighter']),
    level: 10,
    race: 'Human',
    background: 'Soldier',
    personality: 'Brave, loyal, tactical',
    goals: 'Protect the party and uncover the truth about the Chrome Bishop'
  },
  {
    name: 'Lucifer',
    player_name: 'Player 2',
    class: JSON.stringify(['Warlock']),
    level: 10,
    race: 'Tiefling',
    background: 'Cursed',
    personality: 'Mysterious, soul-touched, morally complex',
    goals: 'Understand and control soul magic, resist corruption'
  },
  {
    name: 'Poggoo, the Magnificent',
    player_name: 'Player 3',
    class: JSON.stringify(['Bard']),
    level: 10,
    race: 'Halfling',
    background: 'Entertainer',
    personality: 'Charismatic, clever, comedic relief',
    goals: 'Spread joy and uncover secrets through performance'
  },
  {
    name: 'Tanner',
    player_name: 'Player 4',
    class: JSON.stringify(['Ranger']),
    level: 10,
    race: 'Human',
    background: 'Outlander',
    personality: 'Stoic, observant, tracker',
    goals: 'Survive and find cure for mutation/ashmark'
  },
  {
    name: 'Pathik',
    player_name: 'Player 5',
    class: JSON.stringify(['Rogue']),
    level: 10,
    race: 'Halfling',
    background: 'Criminal',
    personality: 'Opportunistic, quick-fingered, risk-taker',
    goals: 'Get rich and stay alive'
  }
];

console.log('Creating party members...\n');

let created = 0;
const now = Math.floor(Date.now() / 1000);

for (const pc of partyMembers) {
  try {
    const pcId = `pc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    db.prepare(`
      INSERT INTO player_characters (
        id, campaign_id, name, player_name, class, level, race,
        background, personality, goals, created_at, updated_at,
        core_status, player_knowledge, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pcId,
      CAMPAIGN_ID,
      pc.name,
      pc.player_name,
      pc.class,
      pc.level,
      pc.race,
      pc.background,
      pc.personality,
      pc.goals,
      now,
      now,
      'active',
      'common_knowledge',
      JSON.stringify([])
    );

    console.log(`✓ Created: ${pc.name} (${pc.race} ${JSON.parse(pc.class)[0]} ${pc.level})`);
    created++;

  } catch (error) {
    console.error(`✗ Failed to create ${pc.name}:`, error.message);
  }
}

db.close();

console.log(`\n=== Party Creation Complete ===`);
console.log(`Created: ${created} player characters`);
