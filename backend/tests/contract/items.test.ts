/**
 * Contract tests for Items API - Feature 014 (TDD)
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';

describe('GET /api/items', () => {
  it('should list items with pagination', async () => {
    const response = await request(app)
      .get('/api/items')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toMatchObject({
      data: expect.any(Array),
      pagination: expect.any(Object),
    });
  });

  it('should strip dm_secret_properties and dm_true_nature in player_view', async () => {
    const response = await request(app)
      .get('/api/items')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    response.body.data.forEach((item: any) => {
      expect(item).not.toHaveProperty('dm_secret_properties');
      expect(item).not.toHaveProperty('dm_true_nature');
    });
  });
});

describe('POST /api/items', () => {
  it('should create item and return 201', async () => {
    const response = await request(app)
      .post('/api/items')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Flametongue Sword',
        item_type: 'weapon',
        rarity: 'rare',
        properties: '+2d6 fire damage',
        value: '5000 gold',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Flametongue Sword',
      item_type: 'weapon',
      rarity: 'rare',
      owner_npc_id: null,
      owner_pc_id: null,
      location_id: null,
    });
  });

  it('should create item with ownership tracking', async () => {
    const response = await request(app)
      .post('/api/items')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Ring of Protection',
        owner_npc_id: 'npc-uuid-001',
      })
      .expect(201);

    expect(response.body.owner_npc_id).toBe('npc-uuid-001');
    expect(response.body.owner_pc_id).toBeNull();
  });

  it('should validate mutual exclusivity of owner_npc_id and owner_pc_id', async () => {
    await request(app)
      .post('/api/items')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test Item',
        owner_npc_id: 'npc-uuid-001',
        owner_pc_id: 'pc-uuid-001', // Both cannot be set
      })
      .expect(400);
  });
});

describe('GET /api/items/:id', () => {
  it('should return item by ID', async () => {
    const response = await request(app)
      .get('/api/items/item-uuid-123')
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('owner_npc_id');
    expect(response.body).toHaveProperty('owner_pc_id');
    expect(response.body).toHaveProperty('location_id');
  });

  it('should strip dm_* fields in player_view', async () => {
    const response = await request(app)
      .get('/api/items/item-uuid-123')
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_secret_properties');
    expect(response.body).not.toHaveProperty('dm_true_nature');
  });
});

describe('PUT /api/items/:id', () => {
  it('should update item', async () => {
    const response = await request(app)
      .put('/api/items/item-uuid-123')
      .set('Authorization', validToken)
      .send({ owner_pc_id: 'pc-uuid-new' })
      .expect(200);

    expect(response.body.owner_pc_id).toBe('pc-uuid-new');
  });

  it('should enforce ownership mutual exclusivity on update', async () => {
    await request(app)
      .put('/api/items/item-uuid-123')
      .set('Authorization', validToken)
      .send({
        owner_npc_id: 'npc-uuid',
        owner_pc_id: 'pc-uuid',
      })
      .expect(400);
  });
});

describe('DELETE /api/items/:id', () => {
  it('should delete item and return 204', async () => {
    await request(app)
      .delete('/api/items/item-to-delete')
      .set('Authorization', validToken)
      .expect(204);
  });
});
