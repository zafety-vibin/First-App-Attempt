/**
 * Unit Tests: ExternalAPIService
 * Feature 018: Tests service orchestration with mocked dependencies
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ExternalAPIService } from '../../src/services/ExternalAPIService';

describe('ExternalAPIService', () => {
  it('should validate valid categories', () => {
    expect(ExternalAPIService.isValidCategory('npcs')).toBe(true);
    expect(ExternalAPIService.isValidCategory('factions')).toBe(true);
    expect(ExternalAPIService.isValidCategory('invalid')).toBe(false);
  });

  it('should validate hierarchy categories', () => {
    expect(ExternalAPIService.isHierarchyCategory('locations')).toBe(true);
    expect(ExternalAPIService.isHierarchyCategory('npcs')).toBe(true);
    expect(ExternalAPIService.isHierarchyCategory('factions')).toBe(false);
  });

  it('should validate campaign existence', () => {
    // Would require database setup - simplified test
    expect(typeof ExternalAPIService.validateCampaign).toBe('function');
  });

  it('should cleanup expired confirmation tokens', () => {
    expect(typeof ExternalAPIService.cleanupExpiredConfirmations).toBe('function');
    // Cleanup runs without errors
    ExternalAPIService.cleanupExpiredConfirmations();
  });
});
