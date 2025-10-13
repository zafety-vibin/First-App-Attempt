/**
 * Contract tests for Custom Field Definitions API - Feature 014 (TDD)
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';

describe('GET /api/custom-field-definitions', () => {
  it('should list custom field definitions with pagination', async () => {
    const response = await request(app)
      .get('/api/custom-field-definitions')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toMatchObject({
      data: expect.any(Array),
      pagination: expect.any(Object),
    });
  });

  it('should filter by category', async () => {
    const response = await request(app)
      .get('/api/custom-field-definitions')
      .query({ campaign_id: testCampaignId, category: 'npcs' })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((def: any) => {
      expect(def.category).toBe('npcs');
    });
  });
});

describe('POST /api/custom-field-definitions', () => {
  it('should create custom field definition and return 201', async () => {
    const response = await request(app)
      .post('/api/custom-field-definitions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        category: 'npcs',
        field_name: 'magical_affinity',
        field_label: 'Magical Affinity',
        field_type: 'select',
        options: ['Fire', 'Water', 'Earth', 'Air'],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      category: 'npcs',
      field_name: 'magical_affinity',
      field_label: 'Magical Affinity',
      field_type: 'select',
      options: ['Fire', 'Water', 'Earth', 'Air'],
    });
  });

  it('should require options for select and multi_select types', async () => {
    await request(app)
      .post('/api/custom-field-definitions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        category: 'npcs',
        field_name: 'test',
        field_label: 'Test',
        field_type: 'select',
        // Missing options
      })
      .expect(400);
  });

  it('should validate field_type enum', async () => {
    await request(app)
      .post('/api/custom-field-definitions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        category: 'npcs',
        field_name: 'test',
        field_label: 'Test',
        field_type: 'invalid_type',
      })
      .expect(400);
  });

  it('should enforce UNIQUE constraint on (campaign_id, category, field_name)', async () => {
    // Create first
    await request(app)
      .post('/api/custom-field-definitions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        category: 'npcs',
        field_name: 'threat_level',
        field_label: 'Threat Level',
        field_type: 'text',
      })
      .expect(201);

    // Attempt duplicate
    await request(app)
      .post('/api/custom-field-definitions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        category: 'npcs',
        field_name: 'threat_level', // Same
        field_label: 'Different Label',
        field_type: 'number',
      })
      .expect(409); // Conflict
  });
});

describe('GET /api/custom-field-definitions/:id', () => {
  it('should return custom field definition by ID', async () => {
    const response = await request(app)
      .get('/api/custom-field-definitions/def-uuid-123')
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('category');
    expect(response.body).toHaveProperty('field_name');
    expect(response.body).toHaveProperty('field_type');
  });

  it('should return 404 for non-existent definition', async () => {
    await request(app)
      .get('/api/custom-field-definitions/non-existent')
      .set('Authorization', validToken)
      .expect(404);
  });
});

describe('PUT /api/custom-field-definitions/:id', () => {
  it('should update custom field definition', async () => {
    const response = await request(app)
      .put('/api/custom-field-definitions/def-uuid-123')
      .set('Authorization', validToken)
      .send({
        field_label: 'Updated Label',
        options: ['Option A', 'Option B', 'Option C'],
      })
      .expect(200);

    expect(response.body.field_label).toBe('Updated Label');
    expect(response.body.options).toEqual(['Option A', 'Option B', 'Option C']);
  });

  it('should validate field_type enum on update', async () => {
    await request(app)
      .put('/api/custom-field-definitions/def-uuid-123')
      .set('Authorization', validToken)
      .send({ field_type: 'invalid' })
      .expect(400);
  });
});

describe('DELETE /api/custom-field-definitions/:id', () => {
  it('should delete custom field definition and return 204', async () => {
    await request(app)
      .delete('/api/custom-field-definitions/def-to-delete')
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 404 for non-existent definition', async () => {
    await request(app)
      .delete('/api/custom-field-definitions/non-existent')
      .set('Authorization', validToken)
      .expect(404);
  });
});
