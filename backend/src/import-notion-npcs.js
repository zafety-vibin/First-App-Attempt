/**
 * Import Notion NPCs CSV to database
 * Maps Notion fields to Feature 014 npcs table schema
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.join(__dirname, 'npcs-import.csv');
const DB_PATH = path.join(__dirname, '../data/wrldbldr-mcp-manager.db');
const CAMPAIGN_ID = '1ceec234-523b-4e25-a0b5-097c71018be5'; // Your test campaign

// Field mapping: Notion CSV → npcs table
const FIELD_MAP = {
  name: 'Name',
  core_status: 'Core Status', // Active/Archived
  player_knowledge: 'Database Status', // Alive/Dead → common_knowledge or dm_only
  tags: 'Tags',
  race: 'Race',
  class: 'Class', // May need JSON array conversion
  level: 'Level',
  description: 'Public Description',
  personality_traits: 'Personality Traits',
  appearance: 'Appearance',
  met_party: 'Met by Party', // Boolean conversion
  dm_secrets: '[DM] Secrets',
  dm_plot_relevance: '[DM] Plot Connections'
};

function main() {
  console.log('Reading CSV...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true
  });

  console.log(`Found ${records.length} NPCs in CSV`);

  // Open database
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  let imported = 0;
  let skipped = 0;

  for (const record of records) {
    try {
      const name = record['Name']?.trim();
      if (!name) {
        console.log('Skipping row with no name');
        skipped++;
        continue;
      }

      // Map core_status: Active/Archived → active/archived
      let coreStatus = 'active';
      if (record['Core Status']?.toLowerCase() === 'archived') {
        coreStatus = 'archived';
      }

      // Map player_knowledge: if Dead or has [DM] secrets, might be dm_only
      // For now, keep it simple: everyone is common_knowledge unless explicitly secret
      let playerKnowledge = 'common_knowledge';

      // Parse tags (comma-separated)
      let tags = [];
      if (record['Tags']) {
        tags = record['Tags'].split(',').map(t => t.trim()).filter(t => t.length > 0);
      }

      // Parse class (may have multiple classes)
      let classField = record['Class']?.trim() || null;
      let classArray = null;
      if (classField) {
        classArray = JSON.stringify([classField]); // Single class as array
      }

      // Parse level
      let level = null;
      if (record['Level']) {
        const parsedLevel = parseInt(record['Level'], 10);
        if (!isNaN(parsedLevel)) {
          level = parsedLevel;
        }
      }

      // Met party boolean
      let metParty = 0;
      if (record['Met by Party']) {
        metParty = record['Met by Party'].length > 0 ? 1 : 0;
      }

      // Insert NPC
      const stmt = db.prepare(`
        INSERT INTO npcs (
          id, campaign_id, name, description, core_status, player_knowledge, tags,
          race, class, level, appearance, personality_traits, met_party,
          dm_secrets, dm_plot_relevance, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const npcId = `notion-npc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = Math.floor(Date.now() / 1000);

      stmt.run(
        npcId,
        CAMPAIGN_ID,
        name,
        record['Public Description'] || null,
        coreStatus,
        playerKnowledge,
        JSON.stringify(tags),
        record['Race'] || null,
        classArray,
        level,
        record['Appearance'] || null,
        record['Personality Traits'] || null,
        metParty,
        record['[DM] Secrets'] || null,
        record['[DM] Plot Connections'] || null,
        now,
        now
      );

      console.log(`✓ Imported: ${name}`);
      imported++;

    } catch (error) {
      console.error(`✗ Failed to import ${record['Name']}:`, error.message);
      skipped++;
    }
  }

  db.close();

  console.log(`\n=== Import Complete ===`);
  console.log(`Imported: ${imported} NPCs`);
  console.log(`Skipped: ${skipped} NPCs`);
}

main();
