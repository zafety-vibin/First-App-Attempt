/**
 * CitationGeneratorService
 * Feature 009: Player Question Portal
 *
 * Generates numbered citations [1][2] linking to source cards
 */

import { Citation } from '../models/PortalMessage';

export interface CitationSource {
  cardId: string;
  cardTitle: string;
}

export class CitationGeneratorService {
  /**
   * T011: Generate numbered citations from source cards
   *
   * @param sources - Array of source cards to cite
   * @returns Array of citations with numbers, cardIds, titles, and URLs
   */
  generate(sources: CitationSource[]): Citation[] {
    return sources.map((source, index) => ({
      number: index + 1, // [1], [2], [3], etc.
      cardId: source.cardId,
      cardTitle: source.cardTitle,
      url: `/cards/${source.cardId}`, // Links to Feature 003 card routes
    }));
  }

  /**
   * Format response text with citation markers
   * Replaces {cardId} references with [number] format
   *
   * @param responseText - AI response with {cardId} markers
   * @param citations - Generated citations
   * @returns Formatted response with [1][2] citation numbers
   */
  formatResponse(responseText: string, citations: Citation[]): string {
    let formatted = responseText;

    // Replace each {cardId} with [number]
    citations.forEach((citation) => {
      const cardIdPattern = new RegExp(`\\{${citation.cardId}\\}`, 'g');
      formatted = formatted.replace(cardIdPattern, `[${citation.number}]`);
    });

    return formatted;
  }

  /**
   * Extract card IDs from AI response text
   * Looks for {cardId} markers inserted by AI
   *
   * @param responseText - AI response text
   * @returns Array of unique card IDs
   */
  extractCardIds(responseText: string): string[] {
    const regex = /\{([a-f0-9-]+)\}/g;
    const matches = responseText.matchAll(regex);
    const cardIds = new Set<string>();

    for (const match of matches) {
      cardIds.add(match[1]);
    }

    return Array.from(cardIds);
  }
}
