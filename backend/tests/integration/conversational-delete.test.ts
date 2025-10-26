/**
 * Integration Test: Conversational Delete with Confirmation (Scenario 6)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import externalApiRoutes from '../../src/routes/external-api';

describe('Scenario 6: Conversational Delete with Confirmation', () => {
  let app: express.Application;
  let campaignId: string;
  const BASE_URL = '/api/v1/external';

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(BASE_URL, externalApiRoutes);

    const { db } = await import('../../src/services/DatabaseService');
    campaignId = uuidv4();

    db.prepare('INSERT INTO campaigns (id, owner_id, name, created_at, updated_at) VALUES (?, ?, ?, strftime(\'%s\', \'now\'), strftime(\'%s\', \'now\'))').run(campaignId, 'test-user', 'Test Campaign');
  });

  afterAll(async () => {
    const { db } = await import('../../src/services/DatabaseService');
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId);
  });

  it('should complete two-phase delete workflow', async () => {
    // Create item to delete
    const createResponse = await request(app)
      .post(`${BASE_URL}/campaigns/${campaignId}/database/items`)
      .send({ name: 'Broken Sword', item_type: 'weapon' });

    const itemId = createResponse.body.data.id;

    // Phase 1: Preview deletion
    const previewResponse = await request(app)
      .delete(`${BASE_URL}/campaigns/${campaignId}/database/items/${itemId}`)
      .expect(200);

    expect(previewResponse.body.confirmation_token).toBeTruthy();
    expect(previewResponse.body.preview.entry.name).toBe('Broken Sword');

    const token = previewResponse.body.confirmation_token;

    // Phase 2: Confirm deletion
    await request(app)
      .delete(`${BASE_URL}/campaigns/${campaignId}/database/items/${itemId}`)
      .query({ confirm: true })
      .set('X-Confirmation-Token', token)
      .expect(204);

    // Verify item deleted
    const verifyResponse = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/items`)
      .query({ filter: JSON.stringify({ id: itemId }) });

    expect(verifyResponse.body.data).toHaveLength(0);
  });
});
