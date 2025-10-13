/**
 * Comprehensive Test Data for All Categories
 * The Shattered Accord Campaign
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../data/wrldbldr-mcp-manager.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

async function seedAllCategories() {
  console.log('Starting comprehensive data seed...');

  try {
    // Get campaign ID
    const campaign = db.prepare('SELECT id FROM campaigns WHERE name = ?').get('Test Campaign');
    if (!campaign) {
      throw new Error('Test Campaign not found');
    }
    const campaignId = (campaign as any).id;
    console.log(`Found campaign: ${campaignId}`);

    // Clear existing data (in reverse dependency order)
    console.log('Clearing existing data...');
    db.prepare('DELETE FROM quests WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM session_recaps WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM session_preps WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM npcs WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM locations WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM factions WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM player_characters WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM lore_entries WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM world_rules WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM planar_forces WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM custom_mechanics WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM items WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM creatures WHERE campaign_id = ?').run(campaignId);

    const now = Math.floor(Date.now() / 1000);

    // 1. FACTIONS (5 entries)
    console.log('Seeding Factions...');
    const factionIds: Record<string, string> = {};

    const factions = [
      {
        id: 'faction-accord',
        name: 'The Shattered Accord',
        faction_type: 'government',
        power_level: 'major',
        description: 'An ancient coalition of mages who maintain reality anchors across the city. Once unified, now fractured by philosophical disputes over how to handle the increasing distortions.',
        goals: 'Preserve reality stability, prevent complete dimensional collapse, maintain their authority over magical governance',
        resources: 'Reality anchors, ancient texts, network of mage towers, political influence',
        dm_notes: 'The Accord is secretly aware that one of their own members is causing the distortions but cannot agree on how to handle it',
        tags: JSON.stringify(['government', 'magic', 'fractured']),
      },
      {
        id: 'faction-veil',
        name: 'Veil Walkers',
        faction_type: 'criminal',
        power_level: 'moderate',
        description: 'Smugglers and thieves who exploit the reality distortions to move contraband between dimensions. Led by the enigmatic Vex Shadowprice.',
        goals: 'Profit from dimensional instability, establish trade routes through distortion zones, avoid Accord scrutiny',
        resources: 'Underground network, dimensional maps, stolen artifacts, safe houses',
        dm_notes: 'Vex knows more about the distortions than she lets on - she has been documenting them',
        tags: JSON.stringify(['criminal', 'smugglers', 'dimensional']),
      },
      {
        id: 'faction-seekers',
        name: 'Truth Seekers',
        faction_type: 'scholar',
        power_level: 'minor',
        description: 'Academic researchers studying the distortions from a scientific perspective. Believe the Accord is hiding information.',
        goals: 'Understand the true nature of reality distortions, publish findings, challenge Accord authority',
        resources: 'University funding, research equipment, academic contacts',
        tags: JSON.stringify(['scholar', 'research', 'opposition']),
      },
      {
        id: 'faction-iron',
        name: 'Iron Guard',
        faction_type: 'military',
        power_level: 'major',
        description: 'City militia tasked with protecting civilians from distortion-spawned creatures. Pragmatic and disciplined.',
        goals: 'Protect civilians, establish quarantine zones, maintain order',
        resources: 'Trained soldiers, weapons, fortified positions',
        tags: JSON.stringify(['military', 'protection', 'order']),
      },
      {
        id: 'faction-void',
        name: 'Children of the Void',
        faction_type: 'cult',
        power_level: 'minor',
        description: 'Cultists who worship the distortions as divine manifestations. Seek to accelerate the collapse.',
        goals: 'Expand distortion zones, recruit followers, sabotage Accord efforts',
        resources: 'Fanatical members, hidden temples, dangerous rituals',
        dm_notes: 'The cult leader has made contact with an entity from beyond the distortions',
        tags: JSON.stringify(['cult', 'dangerous', 'sabotage']),
        player_knowledge: 'common',
      },
    ];

    for (const faction of factions) {
      db.prepare(`
        INSERT INTO factions (id, campaign_id, name, faction_type, power_level, description, goals, resources, dm_notes, player_knowledge, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        faction.id,
        campaignId,
        faction.name,
        faction.faction_type,
        faction.power_level,
        faction.description,
        faction.goals,
        faction.resources,
        faction.dm_notes || null,
        faction.player_knowledge || 'dm_only',
        faction.tags,
        now,
        now
      );
      factionIds[faction.name] = faction.id;
    }

    // 2. LOCATIONS (6 entries)
    console.log('Seeding Locations...');
    const locationIds: Record<string, string> = {};

    const locations = [
      {
        id: 'loc-sanctum',
        name: 'The Accord Sanctum',
        location_type: 'government',
        size: 'large',
        population: 200,
        description: 'A towering spire at the city center, wrapped in protective wards. Houses the Accord leadership and the primary reality anchor.',
        cultural_characteristics: 'Formal, hierarchical, laden with magical tradition',
        notable_npcs: JSON.stringify([]),
        factions_present: JSON.stringify([factionIds['The Shattered Accord']]),
        tags: JSON.stringify(['magical', 'government', 'protected']),
      },
      {
        id: 'loc-veil',
        name: "The Veil's Edge District",
        location_type: 'residential',
        size: 'medium',
        population: 5000,
        description: 'A working-class neighborhood where reality is particularly thin. Residents have learned to live with minor distortions.',
        cultural_characteristics: 'Resilient, tight-knit, suspicious of outsiders, pragmatic about the weird',
        notable_npcs: JSON.stringify([]),
        factions_present: JSON.stringify([factionIds['Veil Walkers'], factionIds['Iron Guard']]),
        tags: JSON.stringify(['residential', 'distorted', 'dangerous']),
      },
      {
        id: 'loc-bazaar',
        name: 'Twilight Bazaar',
        location_type: 'commercial',
        size: 'medium',
        population: 1000,
        description: 'An open-air market that exists in both day and night simultaneously due to a temporal distortion. Famous for exotic goods.',
        cultural_characteristics: 'Chaotic, mercantile, anything goes atmosphere',
        notable_npcs: JSON.stringify([]),
        factions_present: JSON.stringify([factionIds['Veil Walkers']]),
        tags: JSON.stringify(['market', 'temporal', 'trading']),
      },
      {
        id: 'loc-university',
        name: 'University of Dimensional Studies',
        location_type: 'educational',
        size: 'large',
        population: 1500,
        description: 'Premier research institution studying the distortions. Gothic architecture with modern laboratories.',
        cultural_characteristics: 'Academic, questioning, intellectual freedom valued',
        notable_npcs: JSON.stringify([]),
        factions_present: JSON.stringify([factionIds['Truth Seekers']]),
        tags: JSON.stringify(['academic', 'research', 'safe']),
      },
      {
        id: 'loc-breach',
        name: 'The Shattered Breach',
        location_type: 'ruins',
        size: 'small',
        description: 'The site of the first major distortion. Reality is completely unstable here. Quarantined by Iron Guard.',
        cultural_characteristics: 'Abandoned, dangerous, reality-warped',
        notable_npcs: JSON.stringify([]),
        factions_present: JSON.stringify([factionIds['Iron Guard'], factionIds['Children of the Void']]),
        dm_notes: 'This is where the entity from beyond is trying to break through',
        tags: JSON.stringify(['ruins', 'dangerous', 'quarantine']),
        player_knowledge: 'common',
      },
      {
        id: 'loc-ironkeep',
        name: 'Iron Keep',
        location_type: 'military',
        size: 'medium',
        population: 800,
        description: 'Fortress headquarters of the Iron Guard. Heavily fortified with both physical and magical defenses.',
        cultural_characteristics: 'Disciplined, militaristic, practical',
        notable_npcs: JSON.stringify([]),
        factions_present: JSON.stringify([factionIds['Iron Guard']]),
        tags: JSON.stringify(['military', 'fortress', 'secure']),
      },
    ];

    for (const location of locations) {
      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, location_type, size, population, description, cultural_characteristics, notable_npcs, factions_present, dm_notes, player_knowledge, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        location.id,
        campaignId,
        location.name,
        location.location_type,
        location.size,
        location.population,
        location.description,
        location.cultural_characteristics,
        location.notable_npcs,
        location.factions_present,
        location.dm_notes || null,
        location.player_knowledge || 'dm_only',
        location.tags,
        now,
        now
      );
      locationIds[location.name] = location.id;
    }

    // 3. NPCs (8 entries)
    console.log('Seeding NPCs...');
    const npcIds: Record<string, string> = {};

    const npcs = [
      {
        id: 'npc-elara',
        name: 'Magister Elara Duskweave',
        race: 'Half-Elf',
        class: JSON.stringify(['Wizard', 'Diviner']),
        level: 15,
        alignment: 'Lawful Neutral',
        relationship_to_party: 'quest giver and political ally',
        appearance: 'Flowing robes embroidered with silver runes, carries an ancient treaty scroll, perpetually tired eyes',
        personality_traits: 'Methodical, burdened by secrets, drinks tea obsessively, speaks in formal academic language',
        motivation: 'Keep the Accord stable at any cost, even if it means hiding uncomfortable truths',
        backstory: 'Former prodigy who uncovered evidence of Accord corruption but chose to work within the system',
        dm_notes: 'She knows which Accord member is causing the distortions but fears civil war if revealed',
        faction_id: factionIds['The Shattered Accord'],
        tags: JSON.stringify(['quest-giver', 'faction-leader', 'keeper']),
      },
      {
        id: 'npc-vex',
        name: 'Vex Shadowprice',
        race: 'Tiefling',
        class: JSON.stringify(['Rogue']),
        level: 10,
        appearance: 'Dark leather armor, multiple hidden blade sheaths, horns filed to points',
        personality_traits: 'Sarcastic, opportunistic, surprisingly well-read, laughs at danger',
        motivation: 'Profit and freedom - in that order',
        backstory: 'Former Accord apprentice who was expelled for unauthorized dimensional experiments',
        dm_notes: 'Her journals contain detailed maps of distortion patterns that could solve the mystery',
        faction_id: factionIds['Veil Walkers'],
        tags: JSON.stringify(['merchant', 'faction-leader', 'informant']),
      },
      {
        id: 'npc-whisper',
        name: 'Whisper',
        race: 'Shadow-Touched',
        class: JSON.stringify(['Warlock']),
        level: 12,
        alignment: 'Chaotic Neutral',
        relationship_to_party: 'mysterious information broker',
        appearance: 'Face constantly shrouded in shadow, speaks in multiple overlapping voices',
        personality_traits: 'Cryptic, knows more than they say, collects secrets as currency',
        motivation: 'Understanding the true nature of the distortions for personal power',
        dm_notes: 'Whisper has been touched by the entity from beyond and is slowly transforming',
        faction_id: factionIds['Veil Walkers'],
        tags: JSON.stringify(['faction-leader', 'shadow', 'mysterious']),
        player_knowledge: 'common',
      },
      {
        id: 'npc-rook',
        name: 'Rook Ironvault',
        race: 'Dwarf',
        class: JSON.stringify(['Paladin']),
        level: 8,
        alignment: 'Lawful Good',
        relationship_to_party: 'trusted ally',
        appearance: 'Battle-scarred armor, carries ancestral warhammer, short military haircut',
        personality_traits: 'Direct, protective, values actions over words, dry sense of humor',
        motivation: 'Protect civilians from distortion threats at any cost',
        backstory: 'Lost his entire squad in a distortion event, now leads Iron Guard response teams',
        faction_id: factionIds['Iron Guard'],
        tags: JSON.stringify(['investigator', 'ally', 'military']),
      },
      {
        id: 'npc-seraph',
        name: 'Professor Seraph Nightwhisper',
        race: 'Drow',
        class: JSON.stringify(['Wizard']),
        level: 11,
        alignment: 'Neutral Good',
        appearance: 'Reading glasses, ink-stained fingers, carries too many books at once',
        personality_traits: 'Curious to a fault, socially awkward, brilliant, absent-minded',
        motivation: 'Publish groundbreaking research on dimensional theory',
        backstory: 'Disgraced Accord researcher now leading independent studies',
        faction_id: factionIds['Truth Seekers'],
        tags: JSON.stringify(['scholar', 'researcher', 'helpful']),
      },
      {
        id: 'npc-corvus',
        name: 'Corvus the Broken',
        race: 'Human',
        class: JSON.stringify(['Cleric']),
        level: 7,
        alignment: 'Chaotic Evil',
        relationship_to_party: 'enemy',
        appearance: 'Tattered robes, eyes reflect swirling void, speaks in prophetic riddles',
        personality_traits: 'Fanatical, believes himself chosen, charismatic in an unsettling way',
        motivation: 'Accelerate the dimensional collapse to usher in a new reality',
        dm_notes: 'Has been in direct contact with the entity and carries a fragment of its power',
        faction_id: factionIds['Children of the Void'],
        tags: JSON.stringify(['cult-leader', 'villain', 'dangerous']),
        player_knowledge: 'common',
      },
      {
        id: 'npc-merchant',
        name: 'Talia Brightcoin',
        race: 'Halfling',
        class: JSON.stringify(['Expert']),
        level: 5,
        alignment: 'Neutral',
        appearance: 'Colorful merchant clothes, always smiling, numerous coin pouches',
        personality_traits: 'Friendly, business-savvy, knows everyone, loves gossip',
        motivation: 'Make profit while keeping the Bazaar running',
        backstory: 'Third-generation Bazaar merchant who adapted her business to temporal distortions',
        tags: JSON.stringify(['merchant', 'friendly', 'informant']),
      },
      {
        id: 'npc-guard',
        name: 'Captain Helena Steelwind',
        race: 'Human',
        class: JSON.stringify(['Fighter']),
        level: 9,
        alignment: 'Lawful Neutral',
        appearance: 'Pristine Guard uniform, military bearing, sword never leaves her side',
        personality_traits: 'By-the-book, fair, respected by troops, distrustful of mages',
        motivation: 'Maintain order and protect the city through discipline and strategy',
        faction_id: factionIds['Iron Guard'],
        superior_npc_id: 'npc-rook',
        tags: JSON.stringify(['military', 'commander', 'strict']),
      },
    ];

    for (const npc of npcs) {
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, race, class, level, alignment, relationship_to_party, appearance, personality_traits, motivation, backstory, dm_notes, player_knowledge, faction_id, superior_npc_id, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        npc.id,
        campaignId,
        npc.name,
        npc.race,
        npc.class,
        npc.level || null,
        npc.alignment || null,
        npc.relationship_to_party || null,
        npc.appearance || null,
        npc.personality_traits || null,
        npc.motivation || null,
        npc.backstory || null,
        npc.dm_notes || null,
        npc.player_knowledge || 'dm_only',
        npc.faction_id || null,
        npc.superior_npc_id || null,
        npc.tags,
        now,
        now
      );
      npcIds[npc.name] = npc.id;
    }

    // Update locations with NPCs
    db.prepare(`UPDATE locations SET notable_npcs = ? WHERE id = ?`)
      .run(JSON.stringify([npcIds['Magister Elara Duskweave']]), locationIds['The Accord Sanctum']);
    db.prepare(`UPDATE locations SET notable_npcs = ? WHERE id = ?`)
      .run(JSON.stringify([npcIds['Vex Shadowprice'], npcIds['Whisper']]), locationIds["The Veil's Edge District"]);
    db.prepare(`UPDATE locations SET notable_npcs = ? WHERE id = ?`)
      .run(JSON.stringify([npcIds['Talia Brightcoin']]), locationIds['Twilight Bazaar']);
    db.prepare(`UPDATE locations SET notable_npcs = ? WHERE id = ?`)
      .run(JSON.stringify([npcIds['Professor Seraph Nightwhisper']]), locationIds['University of Dimensional Studies']);
    db.prepare(`UPDATE locations SET notable_npcs = ? WHERE id = ?`)
      .run(JSON.stringify([npcIds['Corvus the Broken']]), locationIds['The Shattered Breach']);
    db.prepare(`UPDATE locations SET notable_npcs = ? WHERE id = ?`)
      .run(JSON.stringify([npcIds['Rook Ironvault'], npcIds['Captain Helena Steelwind']]), locationIds['Iron Keep']);

    // 4. SESSION RECAPS (3 entries)
    console.log('Seeding Session Recaps...');
    const sessionIds: Record<string, string> = {};

    const sessions = [
      {
        id: 'session-1',
        name: 'Session 1: The First Distortion',
        session_number: 1,
        session_date: now - (86400 * 14), // 2 weeks ago
        in_game_date_start: '15th of Harvestmoon, 1547',
        time_passed: '4 hours',
        summary: 'Party witnesses a reality distortion in the Twilight Bazaar market square. A merchant phases between dimensions. Magister Elara recruits them to investigate.',
        key_events: JSON.stringify([
          'Reality distortion witnessed in Bazaar',
          'Merchant trapped between dimensions',
          'Met Magister Elara Duskweave',
          'Recruited to investigate distortions',
          'Discovered pattern in distortion locations',
        ]),
        npcs_encountered: JSON.stringify([npcIds['Magister Elara Duskweave'], npcIds['Talia Brightcoin']]),
        locations_visited: JSON.stringify([locationIds['Twilight Bazaar'], locationIds['The Accord Sanctum']]),
        dm_notes: 'Players missed the clue about the rune sequence on the ground',
        tags: JSON.stringify(['introduction', 'distortion', 'mystery']),
      },
      {
        id: 'session-2',
        name: 'Session 2: Shadows and Secrets',
        session_number: 2,
        session_date: now - (86400 * 7), // 1 week ago
        in_game_date_start: '16th of Harvestmoon, 1547',
        time_passed: '6 hours',
        summary: "Party investigates the Veil's Edge District. Encounter Vex Shadowprice who offers information for a price. Learn about the Veil Walkers' dimensional maps.",
        key_events: JSON.stringify([
          "Explored Veil's Edge District",
          'Met Vex Shadowprice',
          'Discovered smuggler tunnels',
          'Found dimensional map fragments',
          'Ambushed by distortion creatures',
        ]),
        npcs_encountered: JSON.stringify([npcIds['Vex Shadowprice'], npcIds['Whisper']]),
        locations_visited: JSON.stringify([locationIds["The Veil's Edge District"]]),
        dm_notes: 'Vex is now an ally. Whisper left cryptic warnings about "the one who breaks"',
        tags: JSON.stringify(['investigation', 'combat', 'allies']),
      },
      {
        id: 'session-3',
        name: 'Session 3: The Iron Response',
        session_number: 3,
        session_date: now - (86400 * 1), // 1 day ago
        in_game_date_start: '17th of Harvestmoon, 1547',
        time_passed: '8 hours',
        summary: 'Iron Guard requests party assistance with distortion zone near The Shattered Breach. Met Rook Ironvault. Discovered cult activity.',
        key_events: JSON.stringify([
          'Assisted Iron Guard quarantine',
          'Met Rook Ironvault',
          'Found cult ritual site',
          'Encountered Corvus the Broken',
          'Prevented ritual completion',
        ]),
        npcs_encountered: JSON.stringify([npcIds['Rook Ironvault'], npcIds['Captain Helena Steelwind'], npcIds['Corvus the Broken']]),
        locations_visited: JSON.stringify([locationIds['Iron Keep'], locationIds['The Shattered Breach']]),
        dm_notes: 'Corvus escaped with the ritual focus. Party is now aware of the cult threat',
        tags: JSON.stringify(['combat', 'cult', 'escalation']),
      },
    ];

    for (const session of sessions) {
      db.prepare(`
        INSERT INTO session_recaps (id, campaign_id, name, session_number, session_date, in_game_date_start, time_passed, summary, key_events, npcs_encountered, locations_visited, dm_notes, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        session.id,
        campaignId,
        session.name,
        session.session_number,
        session.session_date,
        session.in_game_date_start,
        session.time_passed,
        session.summary,
        session.key_events,
        session.npcs_encountered,
        session.locations_visited,
        session.dm_notes || null,
        session.tags,
        now,
        now
      );
      sessionIds[session.name] = session.id;
    }

    // 5. QUESTS (4 entries)
    console.log('Seeding Quests...');

    const quests = [
      {
        id: 'quest-investigate',
        name: 'Investigate the Distortion Pattern',
        status: 'in_progress',
        description: 'Map and document all reality distortions across the city to find a pattern. Magister Elara believes the distortions are not random.',
        objectives: JSON.stringify([
          'Document 10 distortion sites',
          'Interview witnesses at each site',
          'Map temporal and spatial coordinates',
          'Analyze pattern with Professor Seraph',
        ]),
        rewards: 'Accord official sanction, access to restricted archives, 500gp',
        quest_giver_id: npcIds['Magister Elara Duskweave'],
        related_npcs: JSON.stringify([npcIds['Professor Seraph Nightwhisper']]),
        related_locations: JSON.stringify([locationIds['The Accord Sanctum'], locationIds['University of Dimensional Studies']]),
        started_session_id: sessionIds['Session 1: The First Distortion'],
        dm_notes: 'Pattern reveals distortions are emanating from a single source - an Accord member',
        tags: JSON.stringify(['main-quest', 'investigation', 'ongoing']),
      },
      {
        id: 'quest-maps',
        name: 'Acquire Vex\'s Dimensional Maps',
        status: 'in_progress',
        description: 'Vex Shadowprice possesses detailed maps of distortion zones. She wants the party to retrieve a stolen artifact from a rival smuggler.',
        objectives: JSON.stringify([
          'Locate rival smuggler hideout',
          'Retrieve the Chronosphere artifact',
          'Return to Vex without Accord detection',
        ]),
        rewards: 'Complete set of dimensional maps, Veil Walkers favor',
        quest_giver_id: npcIds['Vex Shadowprice'],
        related_npcs: JSON.stringify([npcIds['Whisper']]),
        related_locations: JSON.stringify([locationIds["The Veil's Edge District"], locationIds['Twilight Bazaar']]),
        started_session_id: sessionIds['Session 2: Shadows and Secrets'],
        tags: JSON.stringify(['side-quest', 'smuggling', 'ongoing']),
      },
      {
        id: 'quest-cult',
        name: 'Stop the Children of the Void',
        status: 'not_started',
        description: 'Corvus the Broken and his cult are performing rituals to expand the distortion zones. Rook Ironvault needs help tracking them down.',
        objectives: JSON.stringify([
          'Locate cult hideout',
          'Infiltrate cult ritual',
          'Capture or eliminate Corvus',
          'Destroy ritual focuses',
        ]),
        rewards: 'Iron Guard commendation, military resources, 750gp',
        quest_giver_id: npcIds['Rook Ironvault'],
        related_npcs: JSON.stringify([npcIds['Captain Helena Steelwind'], npcIds['Corvus the Broken']]),
        related_locations: JSON.stringify([locationIds['Iron Keep'], locationIds['The Shattered Breach']]),
        started_session_id: sessionIds['Session 3: The Iron Response'],
        dm_notes: 'Corvus has made contact with the entity and cannot be reasoned with',
        tags: JSON.stringify(['main-quest', 'combat', 'urgent']),
        player_knowledge: 'common',
      },
      {
        id: 'quest-research',
        name: 'Academic Collaboration',
        status: 'not_started',
        description: 'Professor Seraph needs help gathering data from active distortion sites. The Accord has blocked her funding.',
        objectives: JSON.stringify([
          'Escort Professor to 5 distortion sites',
          'Protect her during data collection',
          'Deliver findings to University',
        ]),
        rewards: 'Academic access, research stipend 300gp, knowledge of distortion mechanics',
        quest_giver_id: npcIds['Professor Seraph Nightwhisper'],
        related_locations: JSON.stringify([locationIds['University of Dimensional Studies']]),
        tags: JSON.stringify(['side-quest', 'research', 'escort']),
      },
    ];

    for (const quest of quests) {
      db.prepare(`
        INSERT INTO quests (id, campaign_id, name, status, description, objectives, rewards, quest_giver_id, related_npcs, related_locations, started_session_id, completed_session_id, dm_notes, player_knowledge, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        quest.id,
        campaignId,
        quest.name,
        quest.status,
        quest.description,
        quest.objectives,
        quest.rewards || null,
        quest.quest_giver_id || null,
        quest.related_npcs || null,
        quest.related_locations || null,
        quest.started_session_id || null,
        (quest as any).completed_session_id || null,
        quest.dm_notes || null,
        quest.player_knowledge || 'dm_only',
        quest.tags,
        now,
        now
      );
    }

    // 6. PLAYER CHARACTERS (3 entries)
    console.log('Seeding Player Characters...');

    const pcs = [
      {
        id: 'pc-1',
        name: 'Aria Moonwhisper',
        race: 'Elf',
        class: JSON.stringify(['Ranger']),
        level: 6,
        alignment: 'Neutral Good',
        player_name: 'Sarah',
        backstory: 'Former Accord scout who left after witnessing corruption. Expert tracker with deep knowledge of dimensional theory.',
        current_goals: 'Uncover the truth behind the distortions, protect innocents',
        character_traits: 'Perceptive, independent, struggles with authority',
        relationships: JSON.stringify({
          'Magister Elara': 'Distrustful - suspects she is hiding something',
          'Vex Shadowprice': 'Friendly - mutual respect between outcasts',
          'Rook Ironvault': 'Respectful - appreciates his dedication',
        }),
        tags: JSON.stringify(['player', 'active', 'scout']),
      },
      {
        id: 'pc-2',
        name: 'Grimm Ironforge',
        race: 'Dwarf',
        class: JSON.stringify(['Artificer']),
        level: 6,
        alignment: 'Lawful Neutral',
        player_name: 'Mike',
        backstory: 'Inventor and engineer obsessed with understanding distortion mechanics through science and magic.',
        current_goals: 'Build a device to stabilize reality, publish findings',
        character_traits: 'Analytical, stubborn, loves puzzles',
        relationships: JSON.stringify({
          'Professor Seraph': 'Colleague - collaborates on research',
          'Vex Shadowprice': 'Complicated - disapproves of her methods but values her data',
        }),
        tags: JSON.stringify(['player', 'active', 'inventor']),
      },
      {
        id: 'pc-3',
        name: 'Zara the Bold',
        race: 'Half-Orc',
        class: JSON.stringify(['Barbarian']),
        level: 6,
        alignment: 'Chaotic Good',
        player_name: 'Alex',
        backstory: 'Mercenary from the outer districts who lost family to distortion creatures. Seeks revenge and protection for survivors.',
        current_goals: 'Destroy the cult, protect civilians, find closure',
        character_traits: 'Fierce, protective, hides pain with bravado',
        relationships: JSON.stringify({
          'Rook Ironvault': 'Mentor - respects his military experience',
          'Corvus the Broken': 'Enemy - blames the cult for family deaths',
        }),
        tags: JSON.stringify(['player', 'active', 'warrior']),
      },
    ];

    for (const pc of pcs) {
      db.prepare(`
        INSERT INTO player_characters (id, campaign_id, name, race, class, level, alignment, player_name, backstory, current_goals, character_traits, relationships, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        pc.id,
        campaignId,
        pc.name,
        pc.race,
        pc.class,
        pc.level || null,
        pc.alignment || null,
        pc.player_name || null,
        pc.backstory || null,
        pc.current_goals || null,
        pc.character_traits || null,
        pc.relationships || null,
        pc.tags,
        now,
        now
      );
    }

    // 7. LORE ENTRIES (4 entries)
    console.log('Seeding Lore Entries...');

    const lore = [
      {
        id: 'lore-1',
        name: 'The Great Binding',
        category: 'history',
        content: 'Three centuries ago, reality anchors were established across the city to prevent dimensional collapse. The founding mages of the Accord sacrificed their mortality to power the first anchors.',
        sources: 'Ancient Accord texts, founding documents',
        related_entities: JSON.stringify(['The Shattered Accord', 'Reality Anchors']),
        tags: JSON.stringify(['history', 'magic', 'foundations']),
      },
      {
        id: 'lore-2',
        name: 'Dimensional Theory',
        category: 'magic',
        content: 'Reality exists as layered dimensions held together by magical resonance. When resonance breaks down, dimensions overlap causing distortions. The pattern of distortions indicates a single source rather than natural decay.',
        sources: 'University research, Professor Seraph\'s papers',
        related_entities: JSON.stringify(['Distortions', 'Magic Theory']),
        dm_notes: 'The source is a corrupted reality anchor powered by an Accord member',
        tags: JSON.stringify(['magic', 'science', 'theory']),
      },
      {
        id: 'lore-3',
        name: 'The First Collapse',
        category: 'legend',
        content: 'Ancient legends speak of a previous reality collapse that destroyed a civilization. The Accord was founded to prevent a repeat. Some scholars believe we are experiencing early signs of a second collapse.',
        sources: 'Fragmented texts, oral tradition',
        related_entities: JSON.stringify(['The Shattered Accord', 'Ancient Civilization']),
        tags: JSON.stringify(['legend', 'warning', 'history']),
        player_knowledge: 'common',
      },
      {
        id: 'lore-4',
        name: 'Void Entities',
        category: 'cosmology',
        content: 'Beings that exist in the spaces between dimensions. Most are mindless, but ancient texts warn of intelligent entities that hunger for stable reality. The cult believes these entities are gods.',
        sources: 'Forbidden texts, cult writings',
        related_entities: JSON.stringify(['Children of the Void', 'Distortions']),
        dm_notes: 'The entity Corvus contacted is real and malevolent. It feeds on reality destabilization.',
        tags: JSON.stringify(['cosmology', 'danger', 'entities']),
      },
    ];

    for (const entry of lore) {
      db.prepare(`
        INSERT INTO lore_entries (id, campaign_id, name, category, content, sources, related_entities, dm_notes, player_knowledge, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entry.id,
        campaignId,
        entry.name,
        entry.category || null,
        entry.content,
        entry.sources || null,
        entry.related_entities || null,
        entry.dm_notes || null,
        entry.player_knowledge || 'dm_only',
        entry.tags,
        now,
        now
      );
    }

    // 8. WORLD RULES (3 entries)
    console.log('Seeding World Rules...');

    const rules = [
      {
        id: 'rule-1',
        name: 'Distortion Exposure',
        category: 'mechanics',
        description: 'Characters exposed to reality distortions must make Wisdom saves or gain temporary madness. Prolonged exposure causes permanent effects.',
        mechanics: 'DC 13 Wisdom save when entering distortion zone. Failure: roll d10 on madness table. 1 hour in zone: DC 15 save or permanent flaw.',
        dm_notes: 'Track exposure time. PCs are building resistance through repeated exposure.',
        tags: JSON.stringify(['mechanics', 'distortion', 'sanity']),
      },
      {
        id: 'rule-2',
        name: 'Dimensional Navigation',
        category: 'homebrew',
        description: 'Characters with proficiency in Arcana can attempt to navigate through unstable dimensional boundaries.',
        mechanics: 'Arcana check DC 12 + distortion severity (1-5). Success: safe passage. Failure: 2d6 psychic damage and displaced 1d100 feet.',
        related_rules: JSON.stringify(['rule-1']),
        tags: JSON.stringify(['homebrew', 'skill-check', 'navigation']),
      },
      {
        id: 'rule-3',
        name: 'Reality Anchor Attunement',
        category: 'item',
        description: 'Characters can attune to reality anchor fragments to gain resistance to distortion effects.',
        mechanics: 'Attunement slot required. Grants advantage on saves against distortion effects and psychic damage resistance.',
        dm_notes: 'Fragments available as quest rewards. Attunement takes 1 hour near a stable anchor.',
        tags: JSON.stringify(['item', 'attunement', 'protection']),
      },
    ];

    for (const rule of rules) {
      db.prepare(`
        INSERT INTO world_rules (id, campaign_id, name, category, description, mechanics, related_rules, dm_notes, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        rule.id,
        campaignId,
        rule.name,
        rule.category || null,
        rule.description,
        rule.mechanics || null,
        rule.related_rules || null,
        rule.dm_notes || null,
        rule.tags,
        now,
        now
      );
    }

    // 9. PLANAR FORCES (3 entries)
    console.log('Seeding Planar Forces...');

    const planar = [
      {
        id: 'planar-1',
        name: 'The Weaver',
        entity_type: 'deity',
        power_level: 'greater',
        description: 'Ancient god of order and stability. Worshipped by the original Accord founders. Believed to have woven the first reality anchors.',
        domains: JSON.stringify(['Order', 'Magic', 'Protection']),
        goals: 'Maintain dimensional stability, preserve reality structure',
        manifestations: 'Appears as geometric patterns of light, speaks through mathematically perfect coincidences',
        dm_notes: 'The Weaver is real but weakened. Cannot directly intervene anymore.',
        tags: JSON.stringify(['deity', 'order', 'ancient']),
      },
      {
        id: 'planar-2',
        name: 'The Devourer Between',
        entity_type: 'aberration',
        power_level: 'major',
        description: 'Void entity that exists in dimensional interstices. Feeds on reality destabilization. This is the entity that Corvus has contacted.',
        domains: JSON.stringify(['Void', 'Hunger', 'Madness']),
        goals: 'Consume stable reality, expand void spaces, break dimensional barriers',
        manifestations: 'Appears as absence, shadow without source, whispers in silence',
        dm_notes: 'This is the campaign\'s main antagonistic force. It is using Corvus and a corrupted Accord member as pawns.',
        tags: JSON.stringify(['aberration', 'void', 'enemy']),
        player_knowledge: 'secret',
      },
      {
        id: 'planar-3',
        name: 'The Prismatic Court',
        entity_type: 'fey',
        power_level: 'moderate',
        description: 'Fey nobles who exist partially in the Feywild. Fascinated by distortions and sometimes intervene chaotically.',
        domains: JSON.stringify(['Chaos', 'Trickery', 'Nature']),
        goals: 'Entertainment, collect interesting mortals, prevent total collapse (it would be boring)',
        manifestations: 'Impossible colors, logic-defying events, fey bargains',
        dm_notes: 'Can be allies or obstacles depending on party choices. Never fully trustworthy.',
        tags: JSON.stringify(['fey', 'chaotic', 'unpredictable']),
      },
    ];

    for (const entity of planar) {
      db.prepare(`
        INSERT INTO planar_forces (id, campaign_id, name, entity_type, power_level, description, domains, goals, manifestations, dm_notes, player_knowledge, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entity.id,
        campaignId,
        entity.name,
        entity.entity_type || null,
        entity.power_level || null,
        entity.description,
        entity.domains || null,
        entity.goals || null,
        entity.manifestations || null,
        entity.dm_notes || null,
        entity.player_knowledge || 'dm_only',
        entity.tags,
        now,
        now
      );
    }

    // 10. SESSION PREP (2 entries)
    console.log('Seeding Session Prep...');

    const prep = [
      {
        id: 'prep-1',
        name: 'Session 4: The Accord Betrayal',
        session_number: 4,
        planned_date: now + (86400 * 7), // 1 week from now
        session_goals: 'Reveal the corrupted Accord member, create tension between factions, escalate cult threat',
        planned_encounters: JSON.stringify([
          'Social encounter with Elara (reveal her knowledge)',
          'Chase through Accord Sanctum',
          'Combat with corrupted mage minions (CR 5 x3)',
          'Cliffhanger: witness entity manifestation',
        ]),
        npcs_to_prep: JSON.stringify([npcIds['Magister Elara Duskweave']]),
        locations_to_prep: JSON.stringify([locationIds['The Accord Sanctum']]),
        expected_outcomes: 'Party learns the true source of distortions, Accord fractures further, cult gains power',
        dm_notes: 'Prepare stat blocks for corrupted mages. Have backup plan if party suspects Elara is the traitor.',
        tags: JSON.stringify(['prep', 'upcoming', 'major-reveal']),
      },
      {
        id: 'prep-2',
        name: 'Session 5: Into the Breach',
        session_number: 5,
        planned_date: now + (86400 * 14), // 2 weeks from now
        session_goals: 'Dungeon crawl through reality-warped ruins, confront Corvus, introduce void entity',
        planned_encounters: JSON.stringify([
          'Reality puzzle (shifting architecture)',
          'Distortion creature swarm (CR 3 x5)',
          'Cult ritual (skill challenge to disrupt)',
          'Boss fight: Corvus with void powers (CR 8)',
        ]),
        npcs_to_prep: JSON.stringify([npcIds['Corvus the Broken'], npcIds['Rook Ironvault']]),
        locations_to_prep: JSON.stringify([locationIds['The Shattered Breach']]),
        expected_outcomes: 'Disrupt major ritual, Corvus escapes or is defeated, entity threat becomes clear',
        dm_notes: 'Design reality-warped terrain. Corvus should be terrifying but beatable. Foreshadow entity power.',
        tags: JSON.stringify(['prep', 'combat', 'dungeon']),
      },
    ];

    for (const session of prep) {
      db.prepare(`
        INSERT INTO session_preps (id, campaign_id, name, session_number, planned_date, session_goals, planned_encounters, npcs_to_prep, locations_to_prep, expected_outcomes, dm_notes, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        session.id,
        campaignId,
        session.name,
        session.session_number || null,
        session.planned_date || null,
        session.session_goals || null,
        session.planned_encounters || null,
        session.npcs_to_prep || null,
        session.locations_to_prep || null,
        session.expected_outcomes || null,
        session.dm_notes || null,
        session.tags,
        now,
        now
      );
    }

    // 11. CUSTOM MECHANICS (3 entries)
    console.log('Seeding Custom Mechanics...');

    const mechanics = [
      {
        id: 'mech-1',
        name: 'Distortion Surge',
        mechanic_type: 'environmental',
        description: 'Random reality fluctuations that occur near unstable zones. Can help or hinder combat.',
        rules_text: 'At initiative count 20, roll d6: 1-2 minor benefit (adv on next attack), 3-4 minor penalty (disadv on next save), 5-6 major event (reality phase, all creatures roll d20, lowest takes 3d10 force damage)',
        example_usage: 'Use during combat in distortion zones to add chaos and unpredictability',
        tags: JSON.stringify(['environmental', 'combat', 'random']),
      },
      {
        id: 'mech-2',
        name: 'Anchor Resonance',
        mechanic_type: 'ability',
        description: 'PCs can channel power from nearby reality anchors to stabilize effects or cast enhanced spells.',
        rules_text: 'Within 100ft of anchor: spend reaction to reroll failed save vs distortion effect, OR spend spell slot to cast spell as if 1 level higher (max 5th)',
        example_usage: 'Encourages tactical positioning near anchors. Makes defending anchor points mechanically rewarding.',
        tags: JSON.stringify(['ability', 'tactical', 'magic']),
      },
      {
        id: 'mech-3',
        name: 'Faction Influence',
        mechanic_type: 'social',
        description: 'Track party reputation with major factions. High influence grants mechanical benefits.',
        rules_text: 'Influence scale 0-10. At 5: gain faction contact (info source). At 8: gain faction ability (unique benefit). At 10: faction champion (major resource access)',
        example_usage: 'Current influence: Accord 6, Veil Walkers 7, Iron Guard 5. Track through quest choices and roleplay.',
        tags: JSON.stringify(['social', 'progression', 'factions']),
      },
    ];

    for (const mechanic of mechanics) {
      db.prepare(`
        INSERT INTO custom_mechanics (id, campaign_id, name, mechanic_type, description, rules_text, example_usage, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        mechanic.id,
        campaignId,
        mechanic.name,
        mechanic.mechanic_type || null,
        mechanic.description,
        mechanic.rules_text || null,
        mechanic.example_usage || null,
        mechanic.tags,
        now,
        now
      );
    }

    // 12. ITEMS (5 entries)
    console.log('Seeding Items...');

    const items = [
      {
        id: 'item-1',
        name: 'Reality Anchor Fragment',
        item_type: 'wondrous',
        rarity: 'rare',
        description: 'Crystalline shard that pulses with stabilizing energy. Feels warm and solid, like holding certainty itself.',
        properties: 'Requires attunement. Grants advantage on saves vs distortion effects and resistance to psychic damage.',
        owner_id: 'pc-1',
        value_gp: 500,
        tags: JSON.stringify(['attunement', 'protection', 'quest-reward']),
      },
      {
        id: 'item-2',
        name: 'Vex\'s Dimensional Compass',
        item_type: 'wondrous',
        rarity: 'uncommon',
        description: 'Brass compass with shifting needles that point toward dimensional instabilities.',
        properties: 'Detects distortion zones within 1 mile. Glows brighter as severity increases.',
        value_gp: 250,
        tags: JSON.stringify(['utility', 'navigation', 'smuggler']),
      },
      {
        id: 'item-3',
        name: 'Ironvault\'s Command Whistle',
        item_type: 'wondrous',
        rarity: 'uncommon',
        description: 'Military whistle that sounds different pitches. Used by Iron Guard for tactical communication.',
        properties: 'Can cast Message 3/day. Signals understood by Iron Guard units.',
        owner_id: 'pc-3',
        value_gp: 150,
        tags: JSON.stringify(['utility', 'communication', 'military']),
      },
      {
        id: 'item-4',
        name: 'Cult Ritual Focus',
        item_type: 'cursed',
        rarity: 'rare',
        description: 'Obsidian orb that seems to absorb light. Whispers emanate from within.',
        properties: 'Cursed. Can cast Bane 3/day (DC 14). Attuned user hears whispers, must succeed DC 12 Wis save each dawn or gain 1 level exhaustion.',
        dm_notes: 'Retrieved from Corvus. Party should destroy or secure it. Cult will try to reclaim.',
        value_gp: 0,
        tags: JSON.stringify(['cursed', 'danger', 'plot-item']),
        player_knowledge: 'common',
      },
      {
        id: 'item-5',
        name: 'Grimm\'s Stabilization Prototype',
        item_type: 'wondrous',
        rarity: 'very-rare',
        description: 'Experimental device with rotating brass rings and crackling energy core.',
        properties: 'Action to create 10ft radius stabilization field for 1 minute. Within field: distortion effects suppressed, reality functions normally. 1 use, recharges at dawn.',
        owner_id: 'pc-2',
        value_gp: 1000,
        dm_notes: 'Grimm crafted this. Will be crucial in climax.',
        tags: JSON.stringify(['prototype', 'utility', 'pc-crafted']),
      },
    ];

    for (const item of items) {
      db.prepare(`
        INSERT INTO items (id, campaign_id, name, item_type, rarity, description, properties, owner_id, value_gp, dm_notes, player_knowledge, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.id,
        campaignId,
        item.name,
        item.item_type || null,
        item.rarity || null,
        item.description,
        item.properties || null,
        item.owner_id || null,
        item.value_gp || null,
        item.dm_notes || null,
        item.player_knowledge || 'dm_only',
        item.tags,
        now,
        now
      );
    }

    // 13. CREATURES (4 entries)
    console.log('Seeding Creatures...');

    const creatures = [
      {
        id: 'creature-1',
        name: 'Distortion Wraith',
        creature_type: 'aberration',
        challenge_rating: 3,
        description: 'Humanoid silhouette that phases between visibility. Born from severe reality distortions.',
        abilities: JSON.stringify({
          AC: 13,
          HP: 45,
          Speed: '0ft, fly 40ft (hover)',
          STR: 6,
          DEX: 16,
          CON: 12,
          INT: 6,
          WIS: 12,
          CHA: 10,
        }),
        special_traits: 'Incorporeal Movement, Distortion Aura (10ft radius, disadvantage on concentration saves)',
        actions: 'Distortion Touch: +5 to hit, 2d8+3 psychic damage, Phase Shift (bonus action, become invisible until start of next turn)',
        dm_notes: 'Spawn near active distortion zones. Flee when reduced to 10 HP or less.',
        tags: JSON.stringify(['aberration', 'distortion', 'common-enemy']),
      },
      {
        id: 'creature-2',
        name: 'Reality Fracture',
        creature_type: 'construct',
        challenge_rating: 5,
        description: 'Animated crack in reality. Jagged geometric shape that exists partially out of phase.',
        abilities: JSON.stringify({
          AC: 16,
          HP: 85,
          Speed: '30ft, teleport 30ft',
          STR: 18,
          DEX: 10,
          CON: 16,
          INT: 3,
          WIS: 10,
          CHA: 1,
        }),
        special_traits: 'Spatial Distortion (attacks made within 10ft have disadvantage), Unstable Form (immune to non-magical damage)',
        actions: 'Reality Slash: +7 to hit, 2d10+4 force damage, Dimensional Rift (recharge 5-6): 20ft cone, DC 14 Dex save or be teleported 30ft in random direction and take 3d8 force damage',
        dm_notes: 'Use as mini-bosses in distortion zones. Vulnerable to magical weapons.',
        tags: JSON.stringify(['construct', 'elite', 'distortion']),
      },
      {
        id: 'creature-3',
        name: 'Void-Touched Cultist',
        creature_type: 'humanoid',
        challenge_rating: 2,
        description: 'Human cultist partially transformed by void exposure. Eyes reflect starless void.',
        abilities: JSON.stringify({
          AC: 12,
          HP: 32,
          Speed: '30ft',
          STR: 10,
          DEX: 12,
          CON: 14,
          INT: 10,
          WIS: 13,
          CHA: 11,
        }),
        special_traits: 'Void Resistance (resistance to psychic damage), Fanatical (advantage on saves vs frightened)',
        actions: 'Dagger: +3 to hit, 1d4+1 piercing, Void Bolt: +4 to hit, 2d6 psychic damage',
        dm_notes: 'Corvus\'s followers. Fight to the death. Often found in groups of 3-5.',
        tags: JSON.stringify(['humanoid', 'cult', 'minion']),
      },
      {
        id: 'creature-4',
        name: 'Prismatic Sprite',
        creature_type: 'fey',
        challenge_rating: 1,
        description: 'Tiny fey creature that leaves rainbow trails. Mischievous but not necessarily hostile.',
        abilities: JSON.stringify({
          AC: 15,
          HP: 22,
          Speed: '10ft, fly 40ft',
          STR: 3,
          DEX: 18,
          CON: 10,
          INT: 14,
          WIS: 12,
          CHA: 16,
        }),
        special_traits: 'Magic Resistance, Invisible (action to turn invisible until attacks or casts spell)',
        actions: 'Prismatic Ray: +6 to hit, 1d8 damage (roll d6 for type: 1-fire, 2-cold, 3-lightning, 4-acid, 5-poison, 6-psychic), Confusion Touch: DC 12 Wis save or act randomly next turn',
        dm_notes: 'Messengers from Prismatic Court. Can be helpful or hindrance depending on mood.',
        tags: JSON.stringify(['fey', 'chaotic', 'scout']),
      },
    ];

    for (const creature of creatures) {
      db.prepare(`
        INSERT INTO creatures (id, campaign_id, name, creature_type, challenge_rating, description, abilities, special_traits, actions, dm_notes, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        creature.id,
        campaignId,
        creature.name,
        creature.creature_type || null,
        creature.challenge_rating || null,
        creature.description,
        creature.abilities || null,
        creature.special_traits || null,
        creature.actions || null,
        creature.dm_notes || null,
        creature.tags,
        now,
        now
      );
    }

    console.log('✅ Comprehensive data seed complete!');
    console.log('\nData Summary:');
    console.log(`- Factions: ${factions.length}`);
    console.log(`- Locations: ${locations.length}`);
    console.log(`- NPCs: ${npcs.length}`);
    console.log(`- Session Recaps: ${sessions.length}`);
    console.log(`- Quests: ${quests.length}`);
    console.log(`- Player Characters: ${pcs.length}`);
    console.log(`- Lore Entries: ${lore.length}`);
    console.log(`- World Rules: ${rules.length}`);
    console.log(`- Planar Forces: ${planar.length}`);
    console.log(`- Session Prep: ${prep.length}`);
    console.log(`- Custom Mechanics: ${mechanics.length}`);
    console.log(`- Items: ${items.length}`);
    console.log(`- Creatures: ${creatures.length}`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    db.close();
  }
}

seedAllCategories().catch(console.error);
