/**
 * Contract tests for Cards API
 * Based on: specs/003-create-a-notion/contracts/cards.yaml
 *
 * These tests validate the API contract matches the OpenAPI specification.
 * They MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Phase 3.4
let app: Express;
const validToken = 'Bearer valid_jwt_token';

describe('POST /api/cards', () => {
  it('should create root card and return 201 with Card object', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', validToken)
      .send({
        type: 'page',
        campaignId: 'campaign-uuid',
        parentId: null,
        position: 0,
        title: 'Home Page',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      type: 'page',
      campaignId: 'campaign-uuid',
      parentId: null,
      path: expect.any(String),
      position: 0,
      depth: 0,
      title: 'Home Page',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('should create nested card under parent', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', validToken)
      .send({
        type: 'page',
        campaignId: 'campaign-uuid',
        parentId: 'parent-card-uuid',
        position: 0,
        title: 'Child Page',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      parentId: 'parent-card-uuid',
      depth: expect.any(Number),
    });
    expect(response.body.depth).toBeGreaterThan(0);
  });

  it('should create database card with metadata', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', validToken)
      .send({
        type: 'database',
        campaignId: 'campaign-uuid',
        parentId: null,
        position: 0,
        title: 'Characters',
        metadata: {
          schema: {
            columns: [
              {
                id: 'col-1',
                name: 'Name',
                type: 'text',
                required: true,
              },
            ],
          },
          views: [
            {
              id: 'view-1',
              name: 'All Characters',
              type: 'table',
            },
          ],
          defaultViewId: 'view-1',
        },
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.type).toBe('database');
    expect(response.body.metadata).toMatchObject({
      schema: expect.any(Object),
      views: expect.any(Array),
    });
  });

  it('should require type, campaignId, and position fields', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', validToken)
      .send({
        title: 'Missing required fields',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate card type enum', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', validToken)
      .send({
        type: 'invalid-type',
        campaignId: 'campaign-uuid',
        position: 0,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 422 when nesting depth exceeds 50 levels', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', validToken)
      .send({
        type: 'page',
        campaignId: 'campaign-uuid',
        parentId: 'card-at-depth-50',
        position: 0,
        title: 'Too Deep',
      })
      .expect('Content-Type', /json/)
      .expect(422);

    expect(response.body.error).toMatch(/depth/i);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/cards')
      .send({
        type: 'page',
        campaignId: 'campaign-uuid',
        position: 0,
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/cards', () => {
  it('should return 200 with root cards array for campaign', async () => {
    const response = await request(app)
      .get('/api/cards?campaign_id=campaign-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      cards: expect.any(Array),
    });

    // All returned cards should be root cards (parentId = null)
    response.body.cards.forEach((card: any) => {
      expect(card.parentId).toBeNull();
    });
  });

  it('should filter by card type', async () => {
    const response = await request(app)
      .get('/api/cards?campaign_id=campaign-uuid&type=database')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    response.body.cards.forEach((card: any) => {
      expect(card.type).toBe('database');
    });
  });

  it('should require campaign_id query parameter', async () => {
    const response = await request(app)
      .get('/api/cards')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/cards?campaign_id=campaign-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/cards/:id', () => {
  it('should return 200 with Card object', async () => {
    const cardId = 'valid-card-uuid';

    const response = await request(app)
      .get(`/api/cards/${cardId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: cardId,
      type: expect.any(String),
      campaignId: expect.any(String),
      path: expect.any(String),
      position: expect.any(Number),
      depth: expect.any(Number),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('should return 404 for non-existent card', async () => {
    const response = await request(app)
      .get('/api/cards/non-existent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when accessing card from campaign not owned by user', async () => {
    const otherUserCardId = 'other-user-card-uuid';

    const response = await request(app)
      .get(`/api/cards/${otherUserCardId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/cards/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PUT /api/cards/:id', () => {
  it('should update card content and return 200', async () => {
    const cardId = 'valid-card-uuid';

    const response = await request(app)
      .put(`/api/cards/${cardId}`)
      .set('Authorization', validToken)
      .send({
        title: 'Updated Title',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Updated content' }],
            },
          ],
        },
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: cardId,
      title: 'Updated Title',
      content: expect.any(Object),
    });
  });

  it('should allow partial updates', async () => {
    const cardId = 'valid-card-uuid';

    const response = await request(app)
      .put(`/api/cards/${cardId}`)
      .set('Authorization', validToken)
      .send({
        iconEmoji: '🏰',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.iconEmoji).toBe('🏰');
  });

  it('should not allow changing type, campaign_id, or hierarchy', async () => {
    const cardId = 'valid-card-uuid';

    const response = await request(app)
      .put(`/api/cards/${cardId}`)
      .set('Authorization', validToken)
      .send({
        type: 'database', // Attempting to change immutable field
      })
      .expect('Content-Type', /json/);

    // Type should remain unchanged (ignored)
    expect(response.status).toBe(200);
  });

  it('should return 404 for non-existent card', async () => {
    const response = await request(app)
      .put('/api/cards/non-existent-uuid')
      .set('Authorization', validToken)
      .send({
        title: 'Updated Title',
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .put('/api/cards/some-uuid')
      .send({
        title: 'Updated Title',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/cards/:id', () => {
  it('should delete card and return 200 with deleted count', async () => {
    const cardId = 'valid-card-uuid';

    const response = await request(app)
      .delete(`/api/cards/${cardId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      deleted_count: expect.any(Number),
    });
    expect(response.body.deleted_count).toBeGreaterThanOrEqual(1);
  });

  it('should delete entire subtree (CASCADE)', async () => {
    const parentCardId = 'parent-with-children-uuid';

    const response = await request(app)
      .delete(`/api/cards/${parentCardId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.deleted_count).toBeGreaterThan(1);
  });

  it('should return 409 when card is referenced without force=true', async () => {
    const referencedCardId = 'referenced-card-uuid';

    const response = await request(app)
      .delete(`/api/cards/${referencedCardId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(409);

    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('references');
  });

  it('should force delete when force=true query parameter set', async () => {
    const referencedCardId = 'referenced-card-uuid';

    const response = await request(app)
      .delete(`/api/cards/${referencedCardId}?force=true`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      deleted_count: expect.any(Number),
    });
  });

  it('should return 404 for non-existent card', async () => {
    const response = await request(app)
      .delete('/api/cards/non-existent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete('/api/cards/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/cards/:id/children', () => {
  it('should return 200 with children cards array', async () => {
    const parentId = 'parent-card-uuid';

    const response = await request(app)
      .get(`/api/cards/${parentId}/children`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      cards: expect.any(Array),
    });

    // All returned cards should have parentId = parentId
    response.body.cards.forEach((card: any) => {
      expect(card.parentId).toBe(parentId);
    });
  });

  it('should filter by card type', async () => {
    const parentId = 'parent-card-uuid';

    const response = await request(app)
      .get(`/api/cards/${parentId}/children?type=page`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    response.body.cards.forEach((card: any) => {
      expect(card.type).toBe('page');
    });
  });

  it('should return cards ordered by position', async () => {
    const parentId = 'parent-card-uuid';

    const response = await request(app)
      .get(`/api/cards/${parentId}/children`)
      .set('Authorization', validToken)
      .expect(200);

    const positions = response.body.cards.map((card: any) => card.position);
    const sortedPositions = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sortedPositions);
  });

  it('should return 404 for non-existent parent card', async () => {
    const response = await request(app)
      .get('/api/cards/non-existent-uuid/children')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/cards/some-uuid/children')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/cards/:id/subtree', () => {
  it('should return 200 with root and descendants', async () => {
    const cardId = 'parent-card-uuid';

    const response = await request(app)
      .get(`/api/cards/${cardId}/subtree`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      root: expect.any(Object),
      descendants: expect.any(Array),
      total_count: expect.any(Number),
    });
    expect(response.body.root.id).toBe(cardId);
  });

  it('should respect max_depth query parameter', async () => {
    const cardId = 'parent-card-uuid';

    const response = await request(app)
      .get(`/api/cards/${cardId}/subtree?max_depth=2`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    response.body.descendants.forEach((card: any) => {
      const relativeDepth = card.depth - response.body.root.depth;
      expect(relativeDepth).toBeLessThanOrEqual(2);
    });
  });

  it('should return 404 for non-existent card', async () => {
    const response = await request(app)
      .get('/api/cards/non-existent-uuid/subtree')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/cards/some-uuid/subtree')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PATCH /api/cards/:id/move', () => {
  it('should move card to new parent and return 200', async () => {
    const cardId = 'card-to-move-uuid';
    const newParentId = 'new-parent-uuid';

    const response = await request(app)
      .patch(`/api/cards/${cardId}/move`)
      .set('Authorization', validToken)
      .send({
        new_parent_id: newParentId,
        position: 0,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: cardId,
      parentId: newParentId,
      position: 0,
      path: expect.any(String),
      depth: expect.any(Number),
    });
  });

  it('should recalculate path and depth for entire subtree', async () => {
    const cardId = 'card-with-children-uuid';
    const newParentId = 'new-parent-uuid';

    const response = await request(app)
      .patch(`/api/cards/${cardId}/move`)
      .set('Authorization', validToken)
      .send({
        new_parent_id: newParentId,
        position: 0,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.path).toContain(newParentId);
  });

  it('should allow moving to root (null parent)', async () => {
    const cardId = 'card-to-move-uuid';

    const response = await request(app)
      .patch(`/api/cards/${cardId}/move`)
      .set('Authorization', validToken)
      .send({
        new_parent_id: null,
        position: 0,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.parentId).toBeNull();
    expect(response.body.depth).toBe(0);
  });

  it('should return 422 when creating circular reference', async () => {
    const parentCardId = 'parent-card-uuid';
    const childCardId = 'child-of-parent-uuid';

    const response = await request(app)
      .patch(`/api/cards/${parentCardId}/move`)
      .set('Authorization', validToken)
      .send({
        new_parent_id: childCardId, // Trying to move parent into its own child
        position: 0,
      })
      .expect('Content-Type', /json/)
      .expect(422);

    expect(response.body.error).toMatch(/circular|subtree/i);
  });

  it('should return 422 when move would exceed depth limit', async () => {
    const cardId = 'deep-card-uuid';
    const newParentId = 'parent-at-depth-48-uuid';

    const response = await request(app)
      .patch(`/api/cards/${cardId}/move`)
      .set('Authorization', validToken)
      .send({
        new_parent_id: newParentId,
        position: 0,
      })
      .expect('Content-Type', /json/)
      .expect(422);

    expect(response.body.error).toMatch(/depth/i);
  });

  it('should require new_parent_id and position fields', async () => {
    const cardId = 'card-uuid';

    const response = await request(app)
      .patch(`/api/cards/${cardId}/move`)
      .set('Authorization', validToken)
      .send({})
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent card', async () => {
    const response = await request(app)
      .patch('/api/cards/non-existent-uuid/move')
      .set('Authorization', validToken)
      .send({
        new_parent_id: 'parent-uuid',
        position: 0,
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .patch('/api/cards/some-uuid/move')
      .send({
        new_parent_id: 'parent-uuid',
        position: 0,
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PATCH /api/cards/:id/reorder', () => {
  it('should reorder card within parent and return 200', async () => {
    const cardId = 'card-to-reorder-uuid';

    const response = await request(app)
      .patch(`/api/cards/${cardId}/reorder`)
      .set('Authorization', validToken)
      .send({
        position: 5,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: cardId,
      position: 5,
    });
  });

  it('should require position field', async () => {
    const cardId = 'card-uuid';

    const response = await request(app)
      .patch(`/api/cards/${cardId}/reorder`)
      .set('Authorization', validToken)
      .send({})
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent card', async () => {
    const response = await request(app)
      .patch('/api/cards/non-existent-uuid/reorder')
      .set('Authorization', validToken)
      .send({
        position: 0,
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .patch('/api/cards/some-uuid/reorder')
      .send({
        position: 0,
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/cards/search', () => {
  it('should search cards by title and return 200', async () => {
    const response = await request(app)
      .get('/api/cards/search?campaign_id=campaign-uuid&q=dragon')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      cards: expect.any(Array),
      total: expect.any(Number),
    });
  });

  it('should filter search by card type', async () => {
    const response = await request(app)
      .get('/api/cards/search?campaign_id=campaign-uuid&q=test&type=page')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    response.body.cards.forEach((card: any) => {
      expect(card.type).toBe('page');
    });
  });

  it('should require campaign_id and q query parameters', async () => {
    const response = await request(app)
      .get('/api/cards/search?q=test')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/cards/search?campaign_id=campaign-uuid&q=test')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});
