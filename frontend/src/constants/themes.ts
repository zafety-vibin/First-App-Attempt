/**
 * Theme Constants
 * Feature: 016-create-a-campaign
 * T013: Theme descriptors and World-Foundations questions
 */

export type ThemeOption = 'high_fantasy' | 'cyberpunk' | 'sci_fi' | 'modern' | 'custom';

export interface CategoryLabelsMap {
  npcs: string;
  locations: string;
  factions: string;
  planar_forces: string;
  items: string;
  creatures: string;
  lore: string;
  world_rules: string;
  session_prep: string;
  session_recaps: string;
  quests: string;
  player_characters: string;
  custom_mechanics: string;
}

export const HIGH_FANTASY_LABELS: CategoryLabelsMap = {
  npcs: 'Characters',
  locations: 'Realms',
  factions: 'Kingdoms',
  planar_forces: 'Pantheon',
  items: 'Artifacts',
  creatures: 'Beasts',
  lore: 'Lore',
  world_rules: 'World Rules',
  session_prep: 'Session Prep',
  session_recaps: 'Session Recaps',
  quests: 'Quests',
  player_characters: 'Player Characters',
  custom_mechanics: 'Custom Mechanics'
};

export const CYBERPUNK_LABELS: CategoryLabelsMap = {
  npcs: 'NPCs',
  locations: 'Districts',
  factions: 'Corporations',
  planar_forces: 'Planar Forces',
  items: 'Gear',
  creatures: 'Creatures',
  lore: 'Lore',
  world_rules: 'World Rules',
  session_prep: 'Session Prep',
  session_recaps: 'Session Recaps',
  quests: 'Missions',
  player_characters: 'Runners',
  custom_mechanics: 'Custom Mechanics'
};

export const SCI_FI_LABELS: CategoryLabelsMap = {
  npcs: 'NPCs',
  locations: 'Sectors',
  factions: 'Factions',
  planar_forces: 'Cosmic Forces',
  items: 'Tech',
  creatures: 'Xenofauna',
  lore: 'Archives',
  world_rules: 'Physics',
  session_prep: 'Session Prep',
  session_recaps: 'Session Recaps',
  quests: 'Objectives',
  player_characters: 'Crew',
  custom_mechanics: 'Tech Mods'
};

export const MODERN_LABELS: CategoryLabelsMap = {
  npcs: 'NPCs',
  locations: 'Places',
  factions: 'Organizations',
  planar_forces: 'Beliefs',
  items: 'Equipment',
  creatures: 'Creatures',
  lore: 'Background',
  world_rules: 'World Rules',
  session_prep: 'Session Prep',
  session_recaps: 'Session Recaps',
  quests: 'Tasks',
  player_characters: 'Player Characters',
  custom_mechanics: 'Custom Mechanics'
};

export const CUSTOM_LABELS_DEFAULT: CategoryLabelsMap = {
  npcs: 'NPCs',
  locations: 'Locations',
  factions: 'Factions',
  planar_forces: 'Planar Forces',
  items: 'Items',
  creatures: 'Creatures',
  lore: 'Lore',
  world_rules: 'World Rules',
  session_prep: 'Session Prep',
  session_recaps: 'Session Recaps',
  quests: 'Quests',
  player_characters: 'Player Characters',
  custom_mechanics: 'Custom Mechanics'
};

export interface ThemeDescriptor {
  id: ThemeOption;
  name: string;
  description: string;
  labels: CategoryLabelsMap;
  previewCategories: string[];
}

export const THEME_DESCRIPTORS: ThemeDescriptor[] = [
  {
    id: 'high_fantasy',
    name: 'High Fantasy',
    description: 'Epic worlds of magic, kingdoms, and ancient artifacts',
    labels: HIGH_FANTASY_LABELS,
    previewCategories: ['Pantheon', 'Kingdoms', 'Realms', 'Artifacts']
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon-lit streets, mega-corporations, and high-tech low-life',
    labels: CYBERPUNK_LABELS,
    previewCategories: ['Corporations', 'Districts', 'Runners', 'Gear']
  },
  {
    id: 'sci_fi',
    name: 'Sci-Fi',
    description: 'Space exploration, advanced technology, and cosmic mysteries',
    labels: SCI_FI_LABELS,
    previewCategories: ['Archives', 'Sectors', 'Tech Mods', 'Xenofauna']
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary settings with organizations, tasks, and equipment',
    labels: MODERN_LABELS,
    previewCategories: ['Organizations', 'Background', 'Places', 'Equipment']
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Define your own category names to fit your unique setting',
    labels: CUSTOM_LABELS_DEFAULT,
    previewCategories: ['(You choose all names)']
  }
];

// World-Foundations questionnaire
export interface WorldFoundationsQuestion {
  id: number;
  question: string;
  rule_type: 'setting_identity' | 'technology_level' | 'magical_reality' | 'fundamental_nature' |
    'narrative_tone' | 'content_boundaries' | 'player_agency' |
    'historical_events' | 'religions' | 'political_structures' | 'economic_systems';
  input_type: 'multiple_choice' | 'short_text' | 'long_text';
  options?: string[];
  placeholder?: string;
  required: boolean;
}

export const WORLD_FOUNDATIONS_QUESTIONS: WorldFoundationsQuestion[] = [
  // CORE SETTING IDENTITY (Questions 1-4)
  {
    id: 1,
    question: 'What is your setting\'s core genre and narrative tone?',
    rule_type: 'setting_identity',
    input_type: 'long_text',
    placeholder: 'e.g., High fantasy with epic quests, Cyberpunk dystopia, Retro-futuristic with cosmic horror...',
    required: false
  },
  {
    id: 2,
    question: 'What is the technology level?',
    rule_type: 'technology_level',
    input_type: 'long_text',
    placeholder: 'e.g., Medieval baseline, Industrial revolution, Hyper-futuristic with cybernetics, Mixed/regional variation...',
    required: false
  },
  {
    id: 3,
    question: 'How does magic work in your world?',
    rule_type: 'magical_reality',
    input_type: 'long_text',
    placeholder: 'e.g., Common and institutionalized, Rare and mysterious, Non-existent, Chaotic force from magical epicenter...',
    required: false
  },
  {
    id: 4,
    question: 'Describe the fundamental nature of reality in your setting',
    rule_type: 'fundamental_nature',
    input_type: 'long_text',
    placeholder: 'e.g., Planes of existence, Deterministic vs chaotic, Divine influence, Laws of physics...',
    required: false
  },

  // UNIVERSAL CAMPAIGN RULES (Questions 5-7)
  {
    id: 5,
    question: 'What narrative tone, themes, and storytelling philosophy define your campaign?',
    rule_type: 'narrative_tone',
    input_type: 'long_text',
    placeholder: 'e.g., Mystery and ambition, Grey morality, Political intrigue, Cosmic horror and dread...',
    required: false
  },
  {
    id: 6,
    question: 'What are your content boundaries? (violence, mature themes, player comfort)',
    rule_type: 'content_boundaries',
    input_type: 'long_text',
    placeholder: 'e.g., Violence: Allowed. Avoid: Sexual violence, torture-porn. Include: Body horror, theological dread...',
    required: false
  },
  {
    id: 7,
    question: 'What player agency principles guide your game?',
    rule_type: 'player_agency',
    input_type: 'long_text',
    placeholder: 'e.g., Players reshape the world, Actions have consequences, Multiple solutions encouraged, Reactive not passive world...',
    required: false
  },

  // KEY WORLDBUILDING CONSTANTS (Questions 8-11)
  {
    id: 8,
    question: 'What are 3-5 major historical events that shaped this world?',
    rule_type: 'historical_events',
    input_type: 'long_text',
    placeholder: 'e.g., The Shattering (500 years ago): Catastrophe destroyed civilization and created magic. Dark Ages (500-250): Strife and power vacuums...',
    required: false
  },
  {
    id: 9,
    question: 'How do religion, gods, and belief systems function?',
    rule_type: 'religions',
    input_type: 'long_text',
    placeholder: 'e.g., Gods are real and active, Organized religion rare, Worship as transaction with powerful beings...',
    required: false
  },
  {
    id: 10,
    question: 'What political structures exist in your world?',
    rule_type: 'political_structures',
    input_type: 'long_text',
    placeholder: 'e.g., No global powers, Feudal fractured power, Magical city-states, Technocratic enclaves, Pirate havens...',
    required: false
  },
  {
    id: 11,
    question: 'How does the economy work?',
    rule_type: 'economic_systems',
    input_type: 'long_text',
    placeholder: 'e.g., Gold standard, Barter common, No capitalism, Communities self-sufficient, Trade networks emerging...',
    required: false
  }
];
