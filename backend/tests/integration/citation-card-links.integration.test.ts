/**
 * Integration Test: Citation Links to Existing Card Routes
 * Feature 009: Player Question Portal
 * T016: Test /cards/{cardId} navigation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { CitationGeneratorService } from '../../src/services/CitationGeneratorService';
import { CardService } from '../../src/services/CardService';

describe('Citation Card Links Integration', () => {
  let db: Database.Database;
  let citationService: CitationGeneratorService;
  let cardService: CardService;

  beforeEach(() => {
    // This test will FAIL until services are implemented
    db = new Database(':memory:');
    // TODO: Run migrations
    citationService = new CitationGeneratorService();
    cardService = new CardService(db);
  });

  it('should generate URLs linking to existing card routes', () => {
    const sources = [
      { cardId: 'card-123', cardTitle: 'Waterdeep Government' },
      { cardId: 'card-456', cardTitle: 'Session 3 Recap' },
    ];

    const citations = citationService.generate(sources);

    expect(citations[0].url).toBe('/cards/card-123');
    expect(citations[1].url).toBe('/cards/card-456');
  });

  it('should link to cards that exist in database', async () => {
    // TODO: Create test cards in database
    const cardId = 'test-card-1';

    const sources = [{ cardId, cardTitle: 'Test Card' }];
    const citations = citationService.generate(sources);

    // Verify card exists
    const card = await cardService.getById(cardId);
    expect(card).toBeDefined();

    // Verify citation links to it
    expect(citations[0].cardId).toBe(cardId);
    expect(citations[0].url).toContain(cardId);
  });

  it('should use Feature 003 card route pattern', () => {
    const sources = [{ cardId: 'my-card', cardTitle: 'My Card' }];
    const citations = citationService.generate(sources);

    // Feature 003 uses /cards/{cardId} pattern
    expect(citations[0].url).toMatch(/^\/cards\/.+$/);
  });

  it('should preserve card titles in citations', () => {
    const sources = [
      { cardId: 'card-1', cardTitle: 'Lord of Waterdeep' },
      { cardId: 'card-2', cardTitle: 'Castle Ward District' },
    ];

    const citations = citationService.generate(sources);

    expect(citations[0].cardTitle).toBe('Lord of Waterdeep');
    expect(citations[1].cardTitle).toBe('Castle Ward District');
  });

  it('should handle card IDs with special characters', () => {
    const sources = [{ cardId: 'card-with-dashes-123', cardTitle: 'Test' }];
    const citations = citationService.generate(sources);

    expect(citations[0].url).toBe('/cards/card-with-dashes-123');
  });
});
