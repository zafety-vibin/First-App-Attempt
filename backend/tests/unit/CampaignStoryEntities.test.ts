/**
 * Unit tests for Campaign-Story entity taxonomy and helpers
 */

import { describe, it, expect } from 'vitest';
import {
  isNarrativeNode,
  isMetadataNode,
  isNarrativeRelationship,
  isMetadataRelationship,
  getInitialConfidence,
  calculateDecayedConfidence,
  applyConfidenceDecay,
  calculatePruneSession,
  shouldPruneMetadata,
  parseInGameDate,
  formatInGameDate,
  inGameDateToTimestamp,
  DEFAULT_DECAY_CONFIG,
  DEFAULT_RETENTION_WINDOW
} from '../../src/models/CampaignStoryEntities';

describe('CampaignStoryEntities - Type Guards', () => {
  describe('isNarrativeNode', () => {
    it('should return true for narrative node types', () => {
      expect(isNarrativeNode('session_recap')).toBe(true);
      expect(isNarrativeNode('major_event')).toBe(true);
      expect(isNarrativeNode('player_decision')).toBe(true);
      expect(isNarrativeNode('plot_thread')).toBe(true);
      expect(isNarrativeNode('character_moment')).toBe(true);
      expect(isNarrativeNode('discovery')).toBe(true);
      expect(isNarrativeNode('quest_objective')).toBe(true);
    });

    it('should return false for metadata node types', () => {
      expect(isNarrativeNode('import_batch')).toBe(false);
      expect(isNarrativeNode('database_addition_log')).toBe(false);
    });

    it('should return false for invalid types', () => {
      expect(isNarrativeNode('invalid_type')).toBe(false);
      expect(isNarrativeNode('')).toBe(false);
    });
  });

  describe('isMetadataNode', () => {
    it('should return true for metadata node types', () => {
      expect(isMetadataNode('import_batch')).toBe(true);
      expect(isMetadataNode('database_addition_log')).toBe(true);
      expect(isMetadataNode('database_modification_log')).toBe(true);
      expect(isMetadataNode('clarification_note')).toBe(true);
      expect(isMetadataNode('user_correction_log')).toBe(true);
    });

    it('should return false for narrative node types', () => {
      expect(isMetadataNode('session_recap')).toBe(false);
      expect(isMetadataNode('major_event')).toBe(false);
    });
  });

  describe('isNarrativeRelationship', () => {
    it('should return true for narrative relationships', () => {
      expect(isNarrativeRelationship('preceded_by')).toBe(true);
      expect(isNarrativeRelationship('followed_by')).toBe(true);
      expect(isNarrativeRelationship('caused')).toBe(true);
    });

    it('should return false for metadata relationships', () => {
      expect(isNarrativeRelationship('logged_during_session')).toBe(false);
    });
  });

  describe('isMetadataRelationship', () => {
    it('should return true for metadata relationships', () => {
      expect(isMetadataRelationship('logged_during_session')).toBe(true);
      expect(isMetadataRelationship('documents_addition')).toBe(true);
    });

    it('should return false for narrative relationships', () => {
      expect(isMetadataRelationship('preceded_by')).toBe(false);
    });
  });
});

describe('CampaignStoryEntities - Confidence Helpers', () => {
  describe('getInitialConfidence', () => {
    it('should return 1.0 for session_recap (direct experience)', () => {
      expect(getInitialConfidence('session_recap')).toBe(1.0);
    });

    it('should return 1.0 for player_decision (direct experience)', () => {
      expect(getInitialConfidence('player_decision')).toBe(1.0);
    });

    it('should return 0.9 for major_event (witnessed)', () => {
      expect(getInitialConfidence('major_event')).toBe(0.9);
    });

    it('should return 0.1 for import_batch (metadata static)', () => {
      expect(getInitialConfidence('import_batch')).toBe(0.1);
    });

    it('should return 0.1 for all metadata types', () => {
      expect(getInitialConfidence('database_addition_log')).toBe(0.1);
      expect(getInitialConfidence('database_modification_log')).toBe(0.1);
    });
  });

  describe('calculateDecayedConfidence', () => {
    it('should return initial confidence at time of creation (0 weeks)', () => {
      const created_at = 1000000;
      const current_time = 1000000; // Same time
      const result = calculateDecayedConfidence(1.0, created_at, current_time);
      expect(result).toBe(1.0);
    });

    it('should decay confidence after 1 week', () => {
      const created_at = 1000000;
      const one_week_later = created_at + (7 * 24 * 60 * 60);
      const result = calculateDecayedConfidence(
        1.0,
        created_at,
        one_week_later,
        0.2 // Default decay rate
      );
      // After 1 week: 1.0 * e^(-0.2 * 1) ≈ 0.8187
      expect(result).toBeCloseTo(0.8187, 2);
    });

    it('should decay confidence after 5 weeks', () => {
      const created_at = 1000000;
      const five_weeks_later = created_at + (5 * 7 * 24 * 60 * 60);
      const result = calculateDecayedConfidence(
        1.0,
        created_at,
        five_weeks_later,
        0.2
      );
      // After 5 weeks: 1.0 * e^(-0.2 * 5) ≈ 0.3679
      expect(result).toBeCloseTo(0.3679, 2);
    });

    it('should enforce floor minimum', () => {
      const created_at = 1000000;
      const very_long_time = created_at + (100 * 7 * 24 * 60 * 60); // 100 weeks
      const result = calculateDecayedConfidence(
        1.0,
        created_at,
        very_long_time,
        0.2,
        0.35 // Floor
      );
      // Should not go below 0.35
      expect(result).toBe(0.35);
    });

    it('should handle custom decay rates', () => {
      const created_at = 1000000;
      const one_week_later = created_at + (7 * 24 * 60 * 60);

      // Faster decay (0.5 per week)
      const fast_decay = calculateDecayedConfidence(1.0, created_at, one_week_later, 0.5);
      expect(fast_decay).toBeCloseTo(0.6065, 2);

      // Slower decay (0.1 per week)
      const slow_decay = calculateDecayedConfidence(1.0, created_at, one_week_later, 0.1);
      expect(slow_decay).toBeCloseTo(0.9048, 2);
    });
  });

  describe('applyConfidenceDecay', () => {
    it('should return static confidence for metadata nodes (no decay)', () => {
      const created_at = 1000000;
      const very_long_time = created_at + (100 * 7 * 24 * 60 * 60);

      const result = applyConfidenceDecay(
        'import_batch',
        1.0,
        created_at,
        { ...DEFAULT_DECAY_CONFIG, metadata_static: 0.1 }
      );

      // Metadata always returns static 0.1, regardless of time elapsed
      expect(result).toBe(0.1);
    });

    it('should apply decay to narrative nodes', () => {
      const created_at = 1000000;
      const five_weeks_later = created_at + (5 * 7 * 24 * 60 * 60);

      // Mock current time
      const original_now = Date.now;
      Date.now = () => five_weeks_later * 1000;

      const result = applyConfidenceDecay('session_recap', 1.0, created_at);

      // Should decay to ~0.37 after 5 weeks
      expect(result).toBeCloseTo(0.37, 1);

      Date.now = original_now;
    });

    it('should respect narrative floor', () => {
      const created_at = 1000000;
      const very_long_time = created_at + (100 * 7 * 24 * 60 * 60);

      // Mock current time
      const original_now = Date.now;
      Date.now = () => very_long_time * 1000;

      const result = applyConfidenceDecay('session_recap', 1.0, created_at);

      // Should not go below 0.35 floor
      expect(result).toBe(0.35);

      Date.now = original_now;
    });
  });
});

describe('CampaignStoryEntities - Pruning Helpers', () => {
  describe('calculatePruneSession', () => {
    it('should calculate prune session with default retention window', () => {
      expect(calculatePruneSession(5)).toBe(55); // 5 + 50
    });

    it('should calculate prune session with custom retention window', () => {
      expect(calculatePruneSession(10, 25)).toBe(35); // 10 + 25
    });

    it('should handle session 1', () => {
      expect(calculatePruneSession(1)).toBe(51);
    });
  });

  describe('shouldPruneMetadata', () => {
    it('should return true when current session >= prune_after_session', () => {
      expect(shouldPruneMetadata(55, 55)).toBe(true);
      expect(shouldPruneMetadata(55, 60)).toBe(true);
    });

    it('should return false when current session < prune_after_session', () => {
      expect(shouldPruneMetadata(55, 54)).toBe(false);
      expect(shouldPruneMetadata(55, 1)).toBe(false);
    });
  });
});

describe('CampaignStoryEntities - Date Formatting', () => {
  describe('parseInGameDate', () => {
    it('should parse single-digit month and day', () => {
      const result = parseInGameDate('3/15/500');
      expect(result).toEqual({ month: 3, day: 15, year: 500 });
    });

    it('should parse double-digit month and day', () => {
      const result = parseInGameDate('12/25/1234');
      expect(result).toEqual({ month: 12, day: 25, year: 1234 });
    });

    it('should parse zero-padded dates', () => {
      const result = parseInGameDate('03/05/0042');
      expect(result).toEqual({ month: 3, day: 5, year: 42 });
    });

    it('should parse 1-digit years', () => {
      const result = parseInGameDate('1/1/1');
      expect(result).toEqual({ month: 1, day: 1, year: 1 });
    });

    it('should return null for invalid formats', () => {
      expect(parseInGameDate('invalid')).toBeNull();
      expect(parseInGameDate('2025-04-20')).toBeNull(); // Wrong format
      expect(parseInGameDate('13/40/12345')).toBeNull(); // 5-digit year exceeds max
    });
  });

  describe('formatInGameDate', () => {
    it('should format date with month name', () => {
      expect(formatInGameDate('3/15/500')).toBe('March 15, Year 500');
    });

    it('should handle December', () => {
      expect(formatInGameDate('12/25/1234')).toBe('December 25, Year 1234');
    });

    it('should handle January', () => {
      expect(formatInGameDate('1/1/1')).toBe('January 1, Year 1');
    });

    it('should return original string if parsing fails', () => {
      expect(formatInGameDate('invalid')).toBe('invalid');
    });
  });

  describe('inGameDateToTimestamp', () => {
    it('should convert days_elapsed to timestamp', () => {
      // Day 6 = 6 * 24 * 60 * 60 = 518400 "seconds"
      expect(inGameDateToTimestamp('3/15/500', 6)).toBe(518400);
    });

    it('should handle day 0', () => {
      expect(inGameDateToTimestamp('1/1/500', 0)).toBe(0);
    });

    it('should handle large day counts', () => {
      // 365 days = 31,536,000 "seconds"
      expect(inGameDateToTimestamp('1/1/501', 365)).toBe(31536000);
    });
  });
});

describe('CampaignStoryEntities - Default Configuration', () => {
  it('should have correct default decay config', () => {
    expect(DEFAULT_DECAY_CONFIG.decay_rate).toBe(0.2);
    expect(DEFAULT_DECAY_CONFIG.narrative_floor).toBe(0.35);
    expect(DEFAULT_DECAY_CONFIG.metadata_static).toBe(0.1);
  });

  it('should have correct default retention window', () => {
    expect(DEFAULT_RETENTION_WINDOW).toBe(50);
  });
});
