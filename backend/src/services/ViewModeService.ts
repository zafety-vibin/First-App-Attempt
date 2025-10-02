/**
 * ViewModeService - Business logic for view mode filtering
 * Feature: 004-create-a-tagging
 * Tasks: T020, T021
 */

import { db } from './DatabaseService';
import { ViewMode } from '../../shared/types/ViewMode';
import { Card } from '../../shared/types/Card';
import { DatabaseCardMetadata, DatabaseColumn } from '../../shared/types/DatabaseSchema';

export interface FilteredCardsResult {
  visibleCards: Card[];
  filteredCount: number;
}

export interface FilteredDatabaseEntriesResult {
  visibleEntries: any[];
  partialVisibilityCount: number;
}

export class ViewModeService {
  private hierarchicalLevelIds: Set<string> | null = null;

  /**
   * Filter cards based on view mode
   * DM view: show all cards
   * Player view: hide hierarchical information levels (DM Secret + custom hierarchical)
   */
  filterCards(cards: Card[], viewMode: ViewMode): FilteredCardsResult {
    if (viewMode === 'dm') {
      return {
        visibleCards: cards,
        filteredCount: 0,
      };
    }

    // Player view - filter hierarchical levels
    const hierarchicalIds = this.getHierarchicalLevelIds();
    const visibleCards = cards.filter(card => !hierarchicalIds.has(card.informationLevelId));

    return {
      visibleCards,
      filteredCount: cards.length - visibleCards.length,
    };
  }

  /**
   * Check if single card is visible in view mode
   */
  isCardVisible(informationLevelId: string, viewMode: ViewMode): boolean {
    if (viewMode === 'dm') {
      return true;
    }

    // Player view - hide hierarchical levels
    const hierarchicalIds = this.getHierarchicalLevelIds();
    return !hierarchicalIds.has(informationLevelId);
  }

  /**
   * Filter database schema to hide hierarchical columns in Player view
   */
  filterDatabaseSchema(schema: DatabaseCardMetadata, viewMode: ViewMode): { columns: DatabaseColumn[] } {
    if (viewMode === 'dm') {
      return { columns: schema.schema.columns };
    }

    // Player view - remove hierarchical columns
    const visibleColumns = schema.schema.columns.filter(col => !col.hierarchical);

    return { columns: visibleColumns };
  }

  /**
   * Filter database entries with 3-layer visibility logic:
   * 1. Column-level: hierarchical columns hidden in Player View (highest precedence)
   * 2. Entry-level: hierarchical entries hidden in Player View
   * 3. Partial visibility override: secret entries with Player Knowledge field show title + that field only
   */
  filterDatabaseEntries(
    entries: any[],
    hierarchicalColumns: string[],
    viewMode: ViewMode,
    playerKnowledgeColumnId?: string
  ): FilteredDatabaseEntriesResult {
    if (viewMode === 'dm') {
      return {
        visibleEntries: entries,
        partialVisibilityCount: 0,
      };
    }

    // Player view - apply 3-layer filtering
    const hierarchicalIds = this.getHierarchicalLevelIds();
    const visibleEntries: any[] = [];
    let partialVisibilityCount = 0;

    for (const entry of entries) {
      const isSecret = hierarchicalIds.has(entry.information_level_id);

      if (!isSecret) {
        // Non-secret entry: show all non-hierarchical columns
        const filteredValues: any = {};
        for (const [colId, value] of Object.entries(entry.values)) {
          if (!hierarchicalColumns.includes(colId)) {
            filteredValues[colId] = value;
          }
        }

        visibleEntries.push({
          ...entry,
          values: filteredValues,
          partial_visibility: false,
        });
      } else {
        // Secret entry: check for Player Knowledge field
        if (playerKnowledgeColumnId && entry.values[playerKnowledgeColumnId]) {
          const playerKnowledge = entry.values[playerKnowledgeColumnId];

          // Show partial visibility only if Player Knowledge field has content
          if (typeof playerKnowledge === 'string' && playerKnowledge.trim().length > 0) {
            visibleEntries.push({
              id: entry.id,
              database_id: entry.database_id,
              information_level_id: entry.information_level_id,
              title: entry.title,
              values: {
                [playerKnowledgeColumnId]: playerKnowledge,
              },
              partial_visibility: true,
              created_at: entry.created_at,
              updated_at: entry.updated_at,
            });
            partialVisibilityCount++;
          }
          // If Player Knowledge field is empty, entry is completely hidden
        }
        // If no Player Knowledge field or it's empty, entry is completely hidden
      }
    }

    return {
      visibleEntries,
      partialVisibilityCount,
    };
  }

  /**
   * Get hierarchical information level IDs (cached for performance)
   * Returns Set for O(1) lookup
   */
  getHierarchicalLevelIds(): Set<string> {
    if (this.hierarchicalLevelIds !== null) {
      return this.hierarchicalLevelIds;
    }

    // Query database for hierarchical levels
    const rows = db.prepare('SELECT id FROM information_levels WHERE hierarchical = 1').all() as { id: string }[];
    this.hierarchicalLevelIds = new Set(rows.map(r => r.id));

    return this.hierarchicalLevelIds;
  }

  /**
   * Refresh hierarchical level cache (call after level updates)
   */
  refreshHierarchicalCache(): void {
    this.hierarchicalLevelIds = null;
    this.getHierarchicalLevelIds(); // Rebuild cache
  }

  /**
   * Toggle view mode (convenience method)
   */
  toggleViewMode(currentMode: ViewMode): ViewMode {
    return currentMode === 'dm' ? 'player' : 'dm';
  }

  /**
   * Validate view mode value
   */
  validateViewMode(mode: string): mode is ViewMode {
    return mode === 'dm' || mode === 'player';
  }
}
