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
  rule_type: 'cosmology' | 'magic_system' | 'technology_level' | 'social_structure';
  input_type: 'multiple_choice' | 'short_text' | 'long_text';
  options?: string[];
  placeholder?: string;
  required: boolean;
}

export const WORLD_FOUNDATIONS_QUESTIONS: WorldFoundationsQuestion[] = [
  {
    id: 1,
    question: 'Does magic exist in your world? If yes, describe how it works.',
    rule_type: 'magic_system',
    input_type: 'long_text',
    placeholder: 'e.g., Magic flows through ley lines, mages channel energy...',
    required: false
  },
  {
    id: 2,
    question: 'What is the technology level of your world?',
    rule_type: 'technology_level',
    input_type: 'multiple_choice',
    options: [
      'Stone Age / Primitive',
      'Medieval / Renaissance',
      'Industrial Revolution',
      'Modern / Contemporary',
      'Near-Future / Cyberpunk',
      'Far-Future / Space Age',
      'Post-Apocalyptic',
      'Mixed (varies by region)'
    ],
    required: false
  },
  {
    id: 3,
    question: 'Describe the cosmology or planar structure (e.g., multiple planes, single material world, etc.)',
    rule_type: 'cosmology',
    input_type: 'long_text',
    placeholder: 'e.g., Material plane connected to Feywild and Shadowfell...',
    required: false
  },
  {
    id: 4,
    question: 'What are the major social structures or governance systems?',
    rule_type: 'social_structure',
    input_type: 'long_text',
    placeholder: 'e.g., Feudal kingdoms, democratic city-states, corporate oligarchy...',
    required: false
  }
];
