export type ThemeName = 'high_fantasy' | 'cyberpunk' | 'sci_fi' | 'modern';

export type CategoryName =
  | 'factions'
  | 'npcs'
  | 'locations'
  | 'session_recaps'
  | 'quests'
  | 'player_characters'
  | 'lore_entries'
  | 'world_rules'
  | 'planar_forces'
  | 'session_prep'
  | 'custom_mechanics'
  | 'items'
  | 'creatures';

// 13 categories × 4 themes = 52 labels
const THEMATIC_LABELS: Record<ThemeName, Record<CategoryName, string>> = {
  high_fantasy: {
    factions: 'Factions',
    npcs: 'NPCs',
    locations: 'Locations',
    session_recaps: 'Session Recaps',
    quests: 'Quests',
    player_characters: 'Player Characters',
    lore_entries: 'Lore Entries',
    world_rules: 'World Rules',
    planar_forces: 'Planar Forces',
    session_prep: 'Session Prep',
    custom_mechanics: 'Custom Mechanics',
    items: 'Items',
    creatures: 'Creatures',
  },
  cyberpunk: {
    factions: 'Corporations',
    npcs: 'Contacts',
    locations: 'Districts',
    session_recaps: 'Run Reports',
    quests: 'Jobs',
    player_characters: 'Runners',
    lore_entries: 'Data Files',
    world_rules: 'System Hacks',
    planar_forces: 'AIs',
    session_prep: 'Op Planning',
    custom_mechanics: 'Mods',
    items: 'Gear',
    creatures: 'Threats',
  },
  sci_fi: {
    factions: 'Organizations',
    npcs: 'Personnel',
    locations: 'Sectors',
    session_recaps: 'Mission Logs',
    quests: 'Missions',
    player_characters: 'Crew',
    lore_entries: 'Database',
    world_rules: 'Protocols',
    planar_forces: 'Alien Entities',
    session_prep: 'Mission Brief',
    custom_mechanics: 'Tech Upgrades',
    items: 'Equipment',
    creatures: 'Xenofauna',
  },
  modern: {
    factions: 'Groups',
    npcs: 'People',
    locations: 'Places',
    session_recaps: 'Case Files',
    quests: 'Cases',
    player_characters: 'Investigators',
    lore_entries: 'Research',
    world_rules: 'House Rules',
    planar_forces: 'Unknown Forces',
    session_prep: 'Case Planning',
    custom_mechanics: 'Custom Rules',
    items: 'Inventory',
    creatures: 'Entities',
  },
};

// Default labels (fallback when theme not provided)
const DEFAULT_LABELS: Record<CategoryName, string> = {
  factions: 'Factions',
  npcs: 'NPCs',
  locations: 'Locations',
  session_recaps: 'Session Recaps',
  quests: 'Quests',
  player_characters: 'Player Characters',
  lore_entries: 'Lore Entries',
  world_rules: 'World Rules',
  planar_forces: 'Planar Forces',
  session_prep: 'Session Prep',
  custom_mechanics: 'Custom Mechanics',
  items: 'Items',
  creatures: 'Creatures',
};

/**
 * Returns themed label for a category
 * @param category - Category name (internal identifier)
 * @param theme - Theme name (optional, defaults to high_fantasy)
 * @returns Themed label string
 */
export function getCategoryLabel(category: CategoryName, theme?: ThemeName): string {
  if (!theme) {
    return DEFAULT_LABELS[category] || category;
  }

  const themeLabels = THEMATIC_LABELS[theme];
  if (!themeLabels) {
    return DEFAULT_LABELS[category] || category;
  }

  return themeLabels[category] || DEFAULT_LABELS[category] || category;
}

/**
 * Returns all themed labels for a given theme
 * @param theme - Theme name
 * @returns Record of all category labels
 */
export function getAllCategoryLabels(theme?: ThemeName): Record<CategoryName, string> {
  if (!theme) {
    return DEFAULT_LABELS;
  }

  return THEMATIC_LABELS[theme] || DEFAULT_LABELS;
}
