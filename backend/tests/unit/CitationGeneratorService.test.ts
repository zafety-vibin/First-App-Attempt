/**
 * Unit Test: CitationGeneratorService
 * Feature 009: Player Question Portal
 * T011: Test numbered [1][2] format with card linking per research.md Topic 4
 */

import { describe, it, expect } from 'vitest';
import { CitationGeneratorService } from '../../src/services/CitationGeneratorService';

describe('CitationGeneratorService', () => {
  it('should generate numbered citations in [1][2] format', () => {
    // This test will FAIL until CitationGeneratorService is implemented
    const service = new CitationGeneratorService();

    const sources = [
      { cardId: 'card-1', cardTitle: 'Waterdeep Government' },
      { cardId: 'card-2', cardTitle: 'Session 3 Recap' },
    ];

    const citations = service.generate(sources);

    expect(citations).toHaveLength(2);
    expect(citations[0]).toMatchObject({
      number: 1,
      cardId: 'card-1',
      cardTitle: 'Waterdeep Government',
    });
    expect(citations[1]).toMatchObject({
      number: 2,
      cardId: 'card-2',
      cardTitle: 'Session 3 Recap',
    });
  });

  it('should format citations with clickable URLs', () => {
    const service = new CitationGeneratorService();

    const sources = [{ cardId: 'card-123', cardTitle: 'Test Card' }];
    const citations = service.generate(sources);

    expect(citations[0].url).toContain('/cards/card-123');
  });

  it('should handle empty sources array', () => {
    const service = new CitationGeneratorService();

    const citations = service.generate([]);

    expect(citations).toEqual([]);
  });

  it('should generate unique citation numbers', () => {
    const service = new CitationGeneratorService();

    const sources = [
      { cardId: 'card-1', cardTitle: 'Card 1' },
      { cardId: 'card-2', cardTitle: 'Card 2' },
      { cardId: 'card-3', cardTitle: 'Card 3' },
    ];

    const citations = service.generate(sources);

    const numbers = citations.map((c) => c.number);
    expect(numbers).toEqual([1, 2, 3]);
  });

  it('should complete generation in <100ms', () => {
    const service = new CitationGeneratorService();

    const sources = Array.from({ length: 10 }, (_, i) => ({
      cardId: `card-${i}`,
      cardTitle: `Card ${i}`,
    }));

    const start = Date.now();
    service.generate(sources);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
