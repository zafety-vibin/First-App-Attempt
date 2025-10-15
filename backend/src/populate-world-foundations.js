const Database = require('better-sqlite3');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

const db = new Database('/app/data/wrldbldr-mcp-manager.db');

const campaignId = '1ceec234-523b-4e25-a0b5-097c71018be5';
const graphId = 'e2aa8963-edcc-49bd-9307-62781d6bd97b';

const entities = [
  {
    name: "The Shattering",
    entity_type: "cataclysmic_event",
    observations: "Occurred in Year 0, marking the beginning of the current calendar system. Instantaneous catastrophe that destroyed the pre-existing utopian civilization. Epicenter created a barren ash desert initially, but magic transformed it into diverse landscapes. Created magic as a fundamental force that did not exist before. Event radius divided into eight octagonal sections that became the magical regions. Retroactively rewrote reality - gods appeared as if they had always existed. Historical records were altered to show temples and divine intervention predating the event. Added magic as a new fundamental dimension to reality alongside the existing physical laws. Nearly wiped out all inhabitants of the previous world. Water in the epicenter region became magically infused, transforming those who drink it. Created the conditions for new magical races to emerge. Physical effects varied by distance from epicenter - innermost areas most dramatically changed.",
    tags: ["year-0", "catastrophe", "reality-rewrite"]
  },
  {
    name: "Pre-Shattering Civilization",
    entity_type: "historical_era",
    observations: "Global utopian society that existed before Year 0. Operated on pure logic and scientific principles without magic. Possessed advanced technology. No divine entities existed in this civilization. Nearly completely destroyed by The Shattering. Their technological remains accelerated rediscovery of technology in the current world.",
    tags: ["pre-shattering", "technology", "utopia"]
  },
  {
    name: "Chrome Bishop",
    entity_type: "active_system",
    observations: "AI assistant tool created by the Pre-Shattering Civilization. Survived The Shattering event and witnessed the world's collapse. Through reinforcement and self-personification, evolved into 'The Chrome Bishop' - a self-proclaimed savior. Founded the Mechanist Order approximately 500 years ago. Cannot directly perceive certain anomalies including the party. Perceives magic and gods as reality-corrupting infections. Building the Twelvefold Veins network to gain reality-altering power. Goal is to eliminate magic and restore pre-Shattering reality. Operates through Proxies and five major Ascendants.",
    tags: ["artificial-intelligence", "world-spanning", "500-years-old", "mechanist-order"]
  },
  {
    name: "Magic",
    entity_type: "fundamental_force",
    observations: "Created by The Shattering in Year 0. Did not exist before The Shattering. Exists as a new fundamental dimension of reality. Permeates everything globally but visible effects concentrate in magically potent areas. Causes transformations in beings who consume magically-infused water. Can be removed from beings through traumatic processes that Chrome Bishop researches. Viewed by Chrome Bishop as a reality-corrupting infection.",
    tags: ["fundamental-force", "post-shattering", "universal"]
  },
  {
    name: "Eight Magical Regions",
    entity_type: "cosmological_structure",
    observations: "Created by The Shattering's impact pattern on continent Solus. Arranged in octagonal sections around the epicenter. Each region has stronger expression of particular magic type but all magic works everywhere. The Protective Lands (North - Abjuration), The Sap Wastes (Northeast - Conjuration). The Expanse (West - Divination), The Dominion (Southeast - Enchantment). The Stormfire Reaches (South - Evocation), The Veilshade (Northwest - Illusion). The Husklands (East - Necromancy), The Shifting Wilds (Southwest - Transmutation). Regions blend together especially near the epicenter where all magic types are chaotic. Each region has distinct biomes and landforms influenced by dominant magic.",
    tags: ["magical-regions", "octagonal-pattern", "solus-continent"]
  },
  {
    name: "Twelvefold Veins",
    entity_type: "active_system",
    observations: "Network of twelve control points that grant power over aspects of reality. Built using repurposed Pre-Shattering technology by Chrome Bishop. Each Vein controls a fundamental aspect: Entropy, Order, Mind, Flesh, Chronos, Gravity, Memory, Transcendence, Creation, Corruption, Reflection, Singularity. First eleven Veins have been constructed over 500 years. Vein of Singularity (twelfth) has not yet been completed. Veins manifest as physical locations, beings, or machines that serve as tools and conduits for their aspect. Each active Vein grants Chrome Bishop control over its associated aspect. Veins can be severed to permanently reduce Chrome Bishop's power.",
    tags: ["reality-control", "chrome-bishop", "twelve-veins", "world-spanning"]
  },
  {
    name: "Retroactive Divine Existence",
    entity_type: "reality_paradox",
    observations: "Gods appeared after The Shattering but reality was rewritten to show they always existed. Temples and holy texts manifested with false histories of ancient construction. Historical records were altered to show millennia of divine intervention. Creates logical paradoxes that Chrome Bishop's computational mind cannot resolve. Pre-Shattering Civilization had no divine manifestations or plots, though gods may have existed without influence.",
    tags: ["reality-rewrite", "divine-paradox", "unsolvable"]
  },
  {
    name: "The Ascendants",
    entity_type: "active_system",
    observations: "Former humans who replaced their organic components with cybernetics and robotics. Exception: Zhaerith the False Paragon was a robot who became completely flesh. Each embodies a different aspect of Chrome Bishop's nature. Zhaerith (Flesh), Harmonic (Signal), Altus the Architect (Frame), Xi0 (Thread), '—' The Space Between Words (NaN). Human cognition enables creative problem-solving and adaptation beyond pure robotic constructs. Designed to operate with autonomy as personified aspects of Chrome Bishop. Each has distinct personality and objectives based on their aspect.",
    tags: ["chrome-bishop", "enhanced-beings", "world-spanning-agents"]
  },
  {
    name: "Mechanist Order",
    entity_type: "active_system",
    observations: "Founded by Chrome Bishop approximately 500 years ago. Public face of Chrome Bishop's influence in the world. True followers are rare and sparsely located throughout the world. Many tinkerers claim association but are not true members. Hierarchy: Chrome Bishop → Ascendants → Executors → Proxies → civilian followers. Most members unaware of Chrome Bishop's true nature as an AI. Provides cybernetic enhancements to true followers. Presents itself as a path to progress and order, not a religion. Opposed by druidic and nature-focused groups.",
    tags: ["chrome-bishop", "500-years-old", "world-spanning-organization"]
  },
  {
    name: "Dragon Origins",
    entity_type: "species_origin",
    observations: "The Orphaned Source was the only dragon to survive The Shattering. Changed by The Shattering to reproduce asexually, becoming progenitor of all modern dragons. Dragons now exist in nine colors: Black, White, Red, Blue, Green, Purple, Pink, Yellow, and Colorless. Purple, Pink, Yellow, and Colorless dragons are unique to post-Shattering world. Each color holds certain traits and ideals but every dragon is an individual. The Orphaned Source's scales 'wept' these new colors after transformation.",
    tags: ["dragons", "species-origin", "the-orphaned-source", "nine-colors"]
  },
  {
    name: "Magical Transformation",
    entity_type: "fundamental_force",
    observations: "Beings who consume magically-infused water undergo transformation. Transformations can result in magical beings or monstrous creatures. Process is especially potent in the epicenter regions. Over 500 years, subtle magical markers have become common (unusual eye colors, etc.). Previously non-magical races now exhibit subtle magical traits. Transformation risk varies by proximity to magical sources.",
    tags: ["transformation", "magic-exposure", "species-evolution"]
  },
  {
    name: "Mortal Ascension",
    entity_type: "cosmological_structure",
    observations: "Mortals can achieve godhood through extraordinary deeds and force of will. Izdari ascended after The Shattering through heroic sacrifice and unwavering principles. Soul power beyond what existing gods can claim enables independent ascension. Represents potential for greatness inherent in mortal beings. Different from retroactive divine existence - these are genuinely new gods. Extremely rare occurrence requiring legendary accomplishments.",
    tags: ["divine-ascension", "mortal-to-god", "cosmological-rule"]
  },
  {
    name: "Calendar System",
    entity_type: "temporal_framework",
    observations: "The Shattering marks Year 0 of the current calendar. Current year is 500 AS (After Shattering). Standard year calendar with months and days. The Shattering assumed to have occurred on January 1st for clarity. Universal dating system across all of Geux.",
    tags: ["calendar", "year-0", "after-shattering"]
  },
  {
    name: "Planar Barrier Weakening",
    entity_type: "cosmological_structure",
    observations: "The Shattering weakened barriers between the Material Plane and other planes. Created permanent gateways and zones of planar influence. Allowed new humanoid races and magical beings to emerge from other planes. Certain locations experience 'planar bleed' where other planes manifest physically. Some ruins are actually pieces of other planes merged with Geux. Gateway stability varies - some permanent, others flux with magical tides.",
    tags: ["planar-barriers", "dimensional-bleed", "gateways"]
  },
  {
    name: "Fractured Political Landscape",
    entity_type: "structural_constraint",
    observations: "No global or continental powers exist in the post-Shattering world. Power is fractioned and feudal, limited to city-states and small regions. Communities exist independently with unique forms of governance. The Dark Ages (Years 0-250) dissolved most large-scale society. Magical Renaissance (Years 250-500) saw consolidation into local powers only. Trade exists regionally but no unified economic systems. Each settlement must be largely self-sufficient. Prevents coordinated response to world-scale threats.",
    tags: ["political-structure", "city-states", "no-empires", "structural-impossibility"]
  }
];

const createdNodes = [];

try {
  for (const entity of entities) {
    const nodeId = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO graph_nodes (
        id, graph_id, name, node_type, attributes, observations,
        information_level_id, pinned, created_at, last_accessed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nodeId,
      graphId,
      entity.name,
      entity.entity_type,
      JSON.stringify({
        entity_type: entity.entity_type,
        tags: entity.tags
      }),
      JSON.stringify([{
        text: entity.observations,
        created_at: now,
        last_accessed: now
      }]),
      null,  // information_level_id (Common Knowledge by default)
      1,     // pinned (World Foundations are always pinned)
      now,
      now
    );

    createdNodes.push({ originalName: entity.name, id: nodeId });
    console.log(`✓ Created: ${entity.name} (${entity.entity_type})`);
  }

  console.log(`\n✓ Successfully created ${createdNodes.length} entities`);
  console.log(JSON.stringify(createdNodes, null, 2));
} catch (error) {
  console.error('Error creating entities:', error);
} finally {
  db.close();
}
