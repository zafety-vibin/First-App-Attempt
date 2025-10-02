/**
 * Unit tests for ViewModeService - Database Column Hierarchical Filtering
 * Feature: 004-create-a-tagging
 *
 * Tests column-level and entry-level filtering for database cards.
 * Hierarchical columns hidden in Player View.
 * Secret entries with Player Knowledge field show partial visibility.
 *
 * These tests MUST fail before implementation (TDD).
 * Task: T014
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ViewModeService } from '../../../src/services/ViewModeService';
import { DatabaseCardMetadata, DatabaseColumn } from '../../../../shared/types/DatabaseSchema';

describe('ViewModeService - Database Column Hierarchical Filtering (T014)', () => {
  let viewModeService: ViewModeService;

  beforeEach(() => {
    // ViewModeService will be implemented in Phase 3.4
    viewModeService = new ViewModeService();
  });

  describe('filterDatabaseSchema - Column filtering', () => {
    it('should return all columns in DM view mode', () => {
      const schema: DatabaseCardMetadata = {
        schema: {
          columns: [
            createColumn({ id: 'col-1', name: 'Name', hierarchical: false }),
            createColumn({ id: 'col-2', name: 'Secret Notes', hierarchical: true }),
            createColumn({ id: 'col-3', name: 'Public Info', hierarchical: false }),
          ],
        },
        views: [],
        defaultViewId: 'view-1',
      };

      const filtered = viewModeService.filterDatabaseSchema(schema, 'dm');

      expect(filtered.columns).toHaveLength(3);
    });

    it('should hide hierarchical columns in Player view mode', () => {
      const schema: DatabaseCardMetadata = {
        schema: {
          columns: [
            createColumn({ id: 'col-1', name: 'Name', hierarchical: false }),
            createColumn({ id: 'col-2', name: 'Secret Notes', hierarchical: true }),
            createColumn({ id: 'col-3', name: 'Public Info', hierarchical: false }),
            createColumn({ id: 'col-4', name: 'GM Only', hierarchical: true }),
          ],
        },
        views: [],
        defaultViewId: 'view-1',
      };

      const filtered = viewModeService.filterDatabaseSchema(schema, 'player');

      expect(filtered.columns).toHaveLength(2);
      expect(filtered.columns.map(c => c.id)).toEqual(['col-1', 'col-3']);

      // Verify no hierarchical columns in result
      const hasHierarchical = filtered.columns.some(c => c.hierarchical === true);
      expect(hasHierarchical).toBe(false);
    });

    it('should preserve column order when filtering', () => {
      const schema: DatabaseCardMetadata = {
        schema: {
          columns: [
            createColumn({ id: 'col-1', name: 'A', hierarchical: false }),
            createColumn({ id: 'col-2', name: 'B', hierarchical: true }),
            createColumn({ id: 'col-3', name: 'C', hierarchical: false }),
            createColumn({ id: 'col-4', name: 'D', hierarchical: true }),
            createColumn({ id: 'col-5', name: 'E', hierarchical: false }),
          ],
        },
        views: [],
        defaultViewId: 'view-1',
      };

      const filtered = viewModeService.filterDatabaseSchema(schema, 'player');

      expect(filtered.columns.map(c => c.name)).toEqual(['A', 'C', 'E']);
    });
  });

  describe('filterDatabaseEntries - Entry-level + Column-level filtering', () => {
    it('should return all entries with all column values in DM view', () => {
      const entries = [
        {
          id: 'entry-1',
          information_level_id: 'system',
          values: { 'col-1': 'Public Name', 'col-2': 'Secret Notes' },
        },
        {
          id: 'entry-2',
          information_level_id: 'dm-secret',
          values: { 'col-1': 'Secret NPC', 'col-2': 'Secret Plot' },
        },
      ];

      const filtered = viewModeService.filterDatabaseEntries(entries, [], 'dm');

      expect(filtered.visibleEntries).toHaveLength(2);
      expect(filtered.visibleEntries[0].values).toHaveProperty('col-1');
      expect(filtered.visibleEntries[0].values).toHaveProperty('col-2');
    });

    it('should hide hierarchical columns for all entries in Player view', () => {
      const hierarchicalColumns = ['col-2', 'col-4'];
      const entries = [
        {
          id: 'entry-1',
          information_level_id: 'system',
          values: { 'col-1': 'Public Name', 'col-2': 'Secret Notes', 'col-3': 'Public', 'col-4': 'Secret' },
        },
      ];

      const filtered = viewModeService.filterDatabaseEntries(entries, hierarchicalColumns, 'player');

      expect(filtered.visibleEntries).toHaveLength(1);
      expect(filtered.visibleEntries[0].values).toHaveProperty('col-1');
      expect(filtered.visibleEntries[0].values).not.toHaveProperty('col-2');
      expect(filtered.visibleEntries[0].values).toHaveProperty('col-3');
      expect(filtered.visibleEntries[0].values).not.toHaveProperty('col-4');
    });

    it('should hide secret entries without Player Knowledge field in Player view', () => {
      const entries = [
        {
          id: 'entry-1',
          information_level_id: 'system',
          values: { 'col-1': 'Public NPC' },
        },
        {
          id: 'entry-2',
          information_level_id: 'dm-secret',
          values: { 'col-1': 'Secret NPC' },
        },
      ];

      const filtered = viewModeService.filterDatabaseEntries(entries, [], 'player');

      expect(filtered.visibleEntries).toHaveLength(1);
      expect(filtered.visibleEntries[0].id).toBe('entry-1');
      expect(filtered.partialVisibilityCount).toBe(0);
    });

    it('should show partial visibility for secret entries with Player Knowledge field', () => {
      const playerKnowledgeColumnId = 'col-pk';
      const entries = [
        {
          id: 'entry-1',
          information_level_id: 'dm-secret',
          title: 'Mysterious NPC',
          values: { 'col-1': 'Secret Backstory', [playerKnowledgeColumnId]: 'Seems trustworthy' },
        },
      ];

      const filtered = viewModeService.filterDatabaseEntries(
        entries,
        [],
        'player',
        playerKnowledgeColumnId
      );

      expect(filtered.visibleEntries).toHaveLength(1);
      expect(filtered.visibleEntries[0].title).toBe('Mysterious NPC');
      expect(filtered.visibleEntries[0].values).toHaveProperty(playerKnowledgeColumnId);
      expect(filtered.visibleEntries[0].values[playerKnowledgeColumnId]).toBe('Seems trustworthy');
      expect(filtered.visibleEntries[0].partial_visibility).toBe(true);
      expect(filtered.partialVisibilityCount).toBe(1);

      // Verify other columns are hidden
      expect(filtered.visibleEntries[0].values).not.toHaveProperty('col-1');
    });

    it('should hide secret entry if Player Knowledge field is empty', () => {
      const playerKnowledgeColumnId = 'col-pk';
      const entries = [
        {
          id: 'entry-1',
          information_level_id: 'dm-secret',
          values: { 'col-1': 'Secret Backstory', [playerKnowledgeColumnId]: '' },
        },
      ];

      const filtered = viewModeService.filterDatabaseEntries(
        entries,
        [],
        'player',
        playerKnowledgeColumnId
      );

      expect(filtered.visibleEntries).toHaveLength(0);
      expect(filtered.partialVisibilityCount).toBe(0);
    });

    it('should hide secret entry if Player Knowledge field is null', () => {
      const playerKnowledgeColumnId = 'col-pk';
      const entries = [
        {
          id: 'entry-1',
          information_level_id: 'dm-secret',
          values: { 'col-1': 'Secret Backstory', [playerKnowledgeColumnId]: null },
        },
      ];

      const filtered = viewModeService.filterDatabaseEntries(
        entries,
        [],
        'player',
        playerKnowledgeColumnId
      );

      expect(filtered.visibleEntries).toHaveLength(0);
    });
  });

  describe('3-Layer visibility logic precedence', () => {
    it('should apply column-level hierarchical filter even for non-secret entries', () => {
      const hierarchicalColumns = ['col-secret'];
      const entries = [
        {
          id: 'entry-1',
          information_level_id: 'system',
          values: { 'col-public': 'Public Data', 'col-secret': 'Should be hidden' },
        },
      ];

      const filtered = viewModeService.filterDatabaseEntries(entries, hierarchicalColumns, 'player');

      expect(filtered.visibleEntries[0].values).toHaveProperty('col-public');
      expect(filtered.visibleEntries[0].values).not.toHaveProperty('col-secret');
    });

    it('should hide hierarchical column even in partial visibility mode', () => {
      const playerKnowledgeColumnId = 'col-pk';
      const hierarchicalColumns = ['col-secret'];
      const entries = [
        {
          id: 'entry-1',
          information_level_id: 'dm-secret',
          title: 'Secret NPC',
          values: {
            'col-public': 'Public Name',
            'col-secret': 'Secret Plot',
            [playerKnowledgeColumnId]: 'Known to party',
          },
        },
      ];

      const filtered = viewModeService.filterDatabaseEntries(
        entries,
        hierarchicalColumns,
        'player',
        playerKnowledgeColumnId
      );

      // Entry should be partially visible (Player Knowledge field + title)
      expect(filtered.visibleEntries).toHaveLength(1);
      expect(filtered.visibleEntries[0].partial_visibility).toBe(true);

      // Only Player Knowledge field should be present
      expect(filtered.visibleEntries[0].values).toHaveProperty(playerKnowledgeColumnId);
      expect(filtered.visibleEntries[0].values).not.toHaveProperty('col-public');
      expect(filtered.visibleEntries[0].values).not.toHaveProperty('col-secret');
    });
  });
});

// Helper function to create test columns
function createColumn(overrides: Partial<DatabaseColumn>): DatabaseColumn {
  return {
    id: overrides.id || 'test-col',
    name: overrides.name || 'Test Column',
    type: overrides.type || 'text',
    required: overrides.required || false,
    hierarchical: overrides.hierarchical || false,
    ...overrides,
  };
}
