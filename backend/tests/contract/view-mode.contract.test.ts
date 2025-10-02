/**
 * Contract tests for View Mode Filtering API
 * Based on: specs/004-create-a-tagging/contracts/view-mode.yaml
 *
 * These tests validate view mode filtering works correctly across endpoints.
 * They MUST fail before implementation (TDD).
 *
 * Task: T011
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Phase 3.4
let app: Express;
const validToken = 'Bearer valid_jwt_token';
let testCampaignId: string;
let testDMSecretCardId: string;
let testNormalCardId: string;
let testDatabaseId: string;

describe('GET /api/cards with X-View-Mode header (T011)', () => {
  it('should return all cards in DM view mode', async () => {
    const response = await request(app)
      .get(`/api/cards?campaign_id=${testCampaignId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('cards');
    expect(response.body.cards).toBeInstanceOf(Array);
    expect(response.body).toHaveProperty('filtered_count');
    expect(response.body.filtered_count).toBe(0); // No filtering in DM view
  });

  it('should filter hierarchical cards in Player view mode', async () => {
    const response = await request(app)
      .get(`/api/cards?campaign_id=${testCampaignId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('cards');
    expect(response.body).toHaveProperty('filtered_count');

    // Verify no DM Secret cards in response
    const hasSecretCards = response.body.cards.some(
      (card: any) => card.information_level_id === 'dm-secret'
    );
    expect(hasSecretCards).toBe(false);

    // filtered_count should match number of hidden cards
    expect(response.body.filtered_count).toBeGreaterThanOrEqual(0);
  });

  it('should default to DM view when X-View-Mode header not provided', async () => {
    const response = await request(app)
      .get(`/api/cards?campaign_id=${testCampaignId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.filtered_count).toBe(0); // Default is DM view (no filtering)
  });

  it('should reject invalid view mode values', async () => {
    const response = await request(app)
      .get(`/api/cards?campaign_id=${testCampaignId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'invalid')
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/cards/:id with X-View-Mode header', () => {
  it('should return DM Secret card in DM view mode', async () => {
    const response = await request(app)
      .get(`/api/cards/${testDMSecretCardId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.id).toBe(testDMSecretCardId);
    expect(response.body.information_level_id).toBe('dm-secret');
  });

  it('should return 404 for DM Secret card in Player view mode', async () => {
    const response = await request(app)
      .get(`/api/cards/${testDMSecretCardId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Card not found'); // Don't reveal existence
  });

  it('should return non-hierarchical card in both view modes', async () => {
    // DM View
    const dmResponse = await request(app)
      .get(`/api/cards/${testNormalCardId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm')
      .expect(200);

    expect(dmResponse.body.id).toBe(testNormalCardId);

    // Player View
    const playerResponse = await request(app)
      .get(`/api/cards/${testNormalCardId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect(200);

    expect(playerResponse.body.id).toBe(testNormalCardId);
  });
});

describe('GET /api/cards/:database_id/entries with X-View-Mode header', () => {
  it('should return all columns in DM view mode', async () => {
    const response = await request(app)
      .get(`/api/cards/${testDatabaseId}/entries`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('entries');
    expect(response.body).toHaveProperty('schema');
    expect(response.body.schema).toHaveProperty('columns');

    // Hierarchical column should be present in DM view
    const hasHierarchicalFlag = response.body.schema.columns.some(
      (col: any) => col.hierarchical === true || col.hierarchical === false
    );
    expect(hasHierarchicalFlag).toBe(true);
  });

  it('should filter hierarchical columns in Player view mode', async () => {
    const response = await request(app)
      .get(`/api/cards/${testDatabaseId}/entries`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('schema');

    // Hierarchical columns should be removed from schema
    const visibleColumns = response.body.schema.columns;
    const hasHierarchicalColumn = visibleColumns.some(
      (col: any) => col.hierarchical === true
    );
    expect(hasHierarchicalColumn).toBe(false);

    // Entry values should not contain hierarchical column data
    if (response.body.entries.length > 0) {
      const entry = response.body.entries[0];
      expect(entry).toHaveProperty('values');
      // Values object should only contain visible columns
    }
  });

  it('should show partial visibility for secret entries with Player Knowledge field', async () => {
    const response = await request(app)
      .get(`/api/cards/${testDatabaseId}/entries`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('partial_visibility_count');

    // If there are partially visible entries
    if (response.body.partial_visibility_count > 0) {
      const partialEntry = response.body.entries.find((e: any) => e.partial_visibility === true);
      expect(partialEntry).toBeDefined();
      expect(partialEntry.title).toBeDefined();
      // Only Player Knowledge field should be present
      expect(Object.keys(partialEntry.values).length).toBeLessThanOrEqual(1);
    }
  });

  it('should hide secret entries without Player Knowledge field in Player view', async () => {
    const dmResponse = await request(app)
      .get(`/api/cards/${testDatabaseId}/entries`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm')
      .expect(200);

    const playerResponse = await request(app)
      .get(`/api/cards/${testDatabaseId}/entries`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect(200);

    // Player view should have fewer entries (or equal if no secrets)
    expect(playerResponse.body.entries.length).toBeLessThanOrEqual(dmResponse.body.entries.length);
  });
});

describe('POST /api/view-mode/toggle', () => {
  it('should toggle dm to player', async () => {
    const response = await request(app)
      .post('/api/view-mode/toggle')
      .set('Authorization', validToken)
      .send({
        current_mode: 'dm',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.new_mode).toBe('player');
  });

  it('should toggle player to dm', async () => {
    const response = await request(app)
      .post('/api/view-mode/toggle')
      .set('Authorization', validToken)
      .send({
        current_mode: 'player',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.new_mode).toBe('dm');
  });

  it('should require current_mode field', async () => {
    const response = await request(app)
      .post('/api/view-mode/toggle')
      .set('Authorization', validToken)
      .send({})
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should reject invalid current_mode values', async () => {
    const response = await request(app)
      .post('/api/view-mode/toggle')
      .set('Authorization', validToken)
      .send({
        current_mode: 'invalid',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});
