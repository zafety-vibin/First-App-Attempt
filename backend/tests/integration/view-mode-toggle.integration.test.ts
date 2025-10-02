/**
 * Integration test: View Mode Toggle
 * Feature: 004-create-a-tagging
 *
 * Tests end-to-end workflow:
 * 1. Create custom information level
 * 2. Create card with that level
 * 3. Toggle view mode and verify filtering
 *
 * These tests MUST fail before implementation (TDD).
 * Task: T015
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Phase 3.4
let app: Express;
const validToken = 'Bearer valid_jwt_token';
let testCampaignId: string;
let customHierarchicalLevelId: string;
let customNonHierarchicalLevelId: string;
let hierarchicalCardId: string;
let nonHierarchicalCardId: string;

describe('Integration: View Mode Toggle (T015)', () => {
  beforeAll(async () => {
    // Create test campaign
    const campaignResponse = await request(app)
      .post('/api/campaigns')
      .set('Authorization', validToken)
      .send({ name: 'View Mode Test Campaign' });
    testCampaignId = campaignResponse.body.id;
  });

  afterAll(async () => {
    // Clean up test campaign (cascades to cards and custom levels)
    await request(app)
      .delete(`/api/campaigns/${testCampaignId}`)
      .set('Authorization', validToken);
  });

  it('should create custom hierarchical information level', async () => {
    const response = await request(app)
      .post('/api/information-levels')
      .set('Authorization', validToken)
      .send({
        name: 'Secret Plot Points',
        color: '#FF0000',
        hierarchical: true,
        campaign_id: testCampaignId,
      })
      .expect(201);

    customHierarchicalLevelId = response.body.id;
    expect(response.body.hierarchical).toBe(true);
    expect(response.body.type).toBe('custom');
  });

  it('should create custom non-hierarchical information level', async () => {
    const response = await request(app)
      .post('/api/information-levels')
      .set('Authorization', validToken)
      .send({
        name: 'Public Rumors',
        color: '#00FF00',
        hierarchical: false,
        campaign_id: testCampaignId,
      })
      .expect(201);

    customNonHierarchicalLevelId = response.body.id;
    expect(response.body.hierarchical).toBe(false);
  });

  it('should create card with custom hierarchical level', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', validToken)
      .send({
        type: 'page',
        campaign_id: testCampaignId,
        parent_id: null,
        position: 0,
        title: 'Secret Card',
        information_level_id: customHierarchicalLevelId,
      })
      .expect(201);

    hierarchicalCardId = response.body.id;
    expect(response.body.information_level_id).toBe(customHierarchicalLevelId);
  });

  it('should create card with custom non-hierarchical level', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', validToken)
      .send({
        type: 'page',
        campaign_id: testCampaignId,
        parent_id: null,
        position: 1,
        title: 'Public Card',
        information_level_id: customNonHierarchicalLevelId,
      })
      .expect(201);

    nonHierarchicalCardId = response.body.id;
    expect(response.body.information_level_id).toBe(customNonHierarchicalLevelId);
  });

  it('should show both cards in DM view mode', async () => {
    const response = await request(app)
      .get(`/api/cards?campaign_id=${testCampaignId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm')
      .expect(200);

    expect(response.body.cards).toBeInstanceOf(Array);
    expect(response.body.cards.length).toBeGreaterThanOrEqual(2);
    expect(response.body.filtered_count).toBe(0);

    // Verify both cards are present
    const cardIds = response.body.cards.map((c: any) => c.id);
    expect(cardIds).toContain(hierarchicalCardId);
    expect(cardIds).toContain(nonHierarchicalCardId);
  });

  it('should hide hierarchical card in Player view mode', async () => {
    const response = await request(app)
      .get(`/api/cards?campaign_id=${testCampaignId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect(200);

    const cardIds = response.body.cards.map((c: any) => c.id);

    // Hierarchical card should be filtered out
    expect(cardIds).not.toContain(hierarchicalCardId);

    // Non-hierarchical card should be visible
    expect(cardIds).toContain(nonHierarchicalCardId);

    // Filtered count should be at least 1
    expect(response.body.filtered_count).toBeGreaterThanOrEqual(1);
  });

  it('should return 404 for hierarchical card in Player view mode', async () => {
    const response = await request(app)
      .get(`/api/cards/${hierarchicalCardId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect(404);

    expect(response.body.error).toBe('Card not found');
  });

  it('should return hierarchical card in DM view mode', async () => {
    const response = await request(app)
      .get(`/api/cards/${hierarchicalCardId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm')
      .expect(200);

    expect(response.body.id).toBe(hierarchicalCardId);
    expect(response.body.information_level_id).toBe(customHierarchicalLevelId);
  });

  it('should toggle view mode correctly', async () => {
    // Toggle from DM to Player
    let response = await request(app)
      .post('/api/view-mode/toggle')
      .set('Authorization', validToken)
      .send({ current_mode: 'dm' })
      .expect(200);

    expect(response.body.new_mode).toBe('player');

    // Toggle from Player to DM
    response = await request(app)
      .post('/api/view-mode/toggle')
      .set('Authorization', validToken)
      .send({ current_mode: 'player' })
      .expect(200);

    expect(response.body.new_mode).toBe('dm');
  });

  it('should allow changing card information level', async () => {
    // Change hierarchical card to non-hierarchical level
    await request(app)
      .put(`/api/cards/${hierarchicalCardId}`)
      .set('Authorization', validToken)
      .send({ information_level_id: customNonHierarchicalLevelId })
      .expect(200);

    // Verify card is now visible in Player view
    const response = await request(app)
      .get(`/api/cards/${hierarchicalCardId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect(200);

    expect(response.body.information_level_id).toBe(customNonHierarchicalLevelId);
  });

  it('should update filtering when custom level hierarchical flag changes', async () => {
    // Change custom non-hierarchical level to hierarchical
    await request(app)
      .put(`/api/information-levels/${customNonHierarchicalLevelId}`)
      .set('Authorization', validToken)
      .send({ hierarchical: true })
      .expect(200);

    // Cards with that level should now be hidden in Player view
    const response = await request(app)
      .get(`/api/cards?campaign_id=${testCampaignId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect(200);

    const cardIds = response.body.cards.map((c: any) => c.id);

    // Both custom level cards should now be hierarchical
    expect(cardIds).not.toContain(hierarchicalCardId);
    expect(cardIds).not.toContain(nonHierarchicalCardId);
  });
});
