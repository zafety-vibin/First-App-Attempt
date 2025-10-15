/**
 * WidgetRegistry - Central registry for dashboard widgets
 * Feature: 015-create-the-dashboard (T007)
 *
 * Implements:
 * - Static registry pattern for widget definitions
 * - Category-based filtering for widget picker
 * - Extensible architecture (new widgets register themselves)
 */

import React from 'react';

// Import real widget components (T014-T020)
import { NPCSummaryWidget } from './widgets/NPCSummaryWidget';
import { LocationExplorerWidget } from './widgets/LocationExplorerWidget';
import { FactionPowerWidget } from './widgets/FactionPowerWidget';
import { QuestTrackerWidget } from './widgets/QuestTrackerWidget';
import { SessionTimelineWidget } from './widgets/SessionTimelineWidget';
import { PlayerCharactersWidget } from './widgets/PlayerCharactersWidget';
import { RecentActivityWidget } from './widgets/RecentActivityWidget';
import { KnowledgeGraphsWidget } from './widgets/KnowledgeGraphsWidget';

// Valid category names from Feature 014
export type CategoryName =
  | 'npcs'
  | 'locations'
  | 'factions'
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

// Widget size variants
export type WidgetSize = '1x1' | '2x2' | '3x3' | '2x4' | '4x2' | '3x2' | '4x3' | '4x4';

// Widget category types for grouping in picker
export type WidgetCategoryType = 'category-summary' | 'activity' | 'timeline' | 'analytics' | 'knowledge' | 'custom';

// Base widget props - all widgets receive these
export interface BaseWidgetProps {
  size: WidgetSize; // Current grid size
  viewMode: 'dm_view' | 'player_view'; // From InformationLevelContext
  campaignId: string;
  onRemove?: () => void; // Remove this widget instance
  onConfigure?: () => void; // Open widget configuration modal (future)
}

// Widget definition interface
export interface WidgetDefinition {
  id: string; // Unique widget type ID: 'npc-summary', 'quest-tracker'
  type: WidgetCategoryType; // Category grouping for picker
  name: string; // Display name: "NPC Summary"
  description: string; // User-facing description
  icon?: string; // Icon name/path for picker
  supportedSizes: WidgetSize[]; // ['2x2', '3x3']
  defaultSize: WidgetSize; // '2x2'
  minSize: { w: number; h: number }; // Minimum grid cells
  maxSize?: { w: number; h: number }; // Maximum grid cells
  component: React.ComponentType<BaseWidgetProps>; // React component
  categories?: CategoryName[]; // If specified, only show on these category landing pages
}

/**
 * Static Widget Registry
 * Widgets register themselves by calling WidgetRegistry.register()
 */
export class WidgetRegistry {
  private static widgets: Map<string, WidgetDefinition> = new Map();

  /**
   * Register a widget definition
   */
  static register(widget: WidgetDefinition): void {
    if (this.widgets.has(widget.id)) {
      console.warn(`Widget with id "${widget.id}" already registered. Overwriting.`);
    }
    this.widgets.set(widget.id, widget);
  }

  /**
   * Get a widget definition by ID
   */
  static get(id: string): WidgetDefinition | undefined {
    return this.widgets.get(id);
  }

  /**
   * Get all registered widgets
   */
  static getAll(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get widgets filtered by category (for category landing pages)
   * Returns widgets that:
   * - Have no categories filter (available everywhere), OR
   * - Include the specified category in their categories array
   */
  static getAllByCategory(category?: CategoryName): WidgetDefinition[] {
    if (!category) {
      return this.getAll();
    }

    return this.getAll().filter((widget) => {
      // If widget has no categories filter, it's available everywhere
      if (!widget.categories || widget.categories.length === 0) {
        return true;
      }
      // Otherwise, check if this category is in the widget's categories list
      return widget.categories.includes(category);
    });
  }

  /**
   * Get widgets by widget type (category-summary, activity, etc.)
   */
  static getByType(type: WidgetCategoryType): WidgetDefinition[] {
    return this.getAll().filter((widget) => widget.type === type);
  }

  /**
   * Clear all registered widgets (for testing)
   */
  static clear(): void {
    this.widgets.clear();
  }
}

// ============================================================================
// INITIAL WIDGET REGISTRATIONS (7 widgets for v1)
// ============================================================================

// Register 7 initial widgets with real components (T014-T020)
WidgetRegistry.register({
  id: 'npc-summary',
  type: 'category-summary',
  name: 'NPC Summary',
  description: 'Total NPC count, recent NPCs, and relationship breakdown',
  supportedSizes: ['2x2', '3x3'],
  defaultSize: '2x2',
  minSize: { w: 1, h: 1 },
  maxSize: { w: 12, h: 50 },
  component: NPCSummaryWidget,
  categories: ['npcs'], // Only show on NPCs landing page
});

WidgetRegistry.register({
  id: 'location-explorer',
  type: 'category-summary',
  name: 'Location Explorer',
  description: 'Total location count, type breakdown, and recent locations',
  supportedSizes: ['2x2', '3x3'],
  defaultSize: '2x2',
  minSize: { w: 1, h: 1 },
  maxSize: { w: 12, h: 50 },
  component: LocationExplorerWidget,
  categories: ['locations'], // Only show on Locations landing page
});

WidgetRegistry.register({
  id: 'faction-power',
  type: 'category-summary',
  name: 'Faction Power',
  description: 'Total faction count, power level distribution, and active factions',
  supportedSizes: ['2x2', '3x3'],
  defaultSize: '2x2',
  minSize: { w: 1, h: 1 },
  maxSize: { w: 12, h: 50 },
  component: FactionPowerWidget,
  categories: ['factions'], // Only show on Factions landing page
});

WidgetRegistry.register({
  id: 'quest-tracker',
  type: 'category-summary',
  name: 'Quest Tracker',
  description: 'Active and completed quest counts with progress tracking',
  supportedSizes: ['2x2', '3x3'],
  defaultSize: '2x2',
  minSize: { w: 1, h: 1 },
  maxSize: { w: 12, h: 50 },
  component: QuestTrackerWidget,
  categories: ['quests'], // Only show on Quests landing page
});

WidgetRegistry.register({
  id: 'session-timeline',
  type: 'timeline',
  name: 'Session Timeline',
  description: 'Last recap, next prep, and in-game date tracking',
  supportedSizes: ['2x2', '3x3'],
  defaultSize: '2x2',
  minSize: { w: 1, h: 1 },
  maxSize: { w: 12, h: 50 },
  component: SessionTimelineWidget,
  categories: ['session_recaps', 'session_prep'], // Show on Session Recaps and Prep pages
});

WidgetRegistry.register({
  id: 'player-characters',
  type: 'category-summary',
  name: 'Player Characters',
  description: 'Active PC count, level range, and party roster',
  supportedSizes: ['2x2', '3x3'],
  defaultSize: '2x2',
  minSize: { w: 1, h: 1 },
  maxSize: { w: 12, h: 50 },
  component: PlayerCharactersWidget,
  categories: ['player_characters'], // Only show on Player Characters landing page
});

WidgetRegistry.register({
  id: 'recent-activity',
  type: 'activity',
  name: 'Recent Activity',
  description: 'Most recent updates across all categories',
  supportedSizes: ['2x2', '2x4', '3x3'],
  defaultSize: '2x4',
  minSize: { w: 1, h: 1 },
  maxSize: { w: 12, h: 50 },
  component: RecentActivityWidget,
  // No categories filter = available everywhere (dashboard + all landing pages)
});

WidgetRegistry.register({
  id: 'knowledge-graphs',
  type: 'knowledge',
  name: 'Knowledge Graphs Overview',
  description: 'View all knowledge graphs with confidence distributions',
  supportedSizes: ['2x2', '3x3', '4x3'],
  defaultSize: '3x3',
  minSize: { w: 2, h: 2 },
  maxSize: { w: 12, h: 50 },
  component: KnowledgeGraphsWidget,
  // No categories filter = available everywhere (dashboard + all landing pages)
});

// Export singleton instance for convenience
export default WidgetRegistry;