/**
 * Contract tests for Database Cards API
 * Based on: specs/003-create-a-notion/contracts/database-cards.yaml
 *
 * These tests validate database schema management and entry CRUD operations.
 * They MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Phase 3.4
let app: Express;
const validToken = 'Bearer valid_jwt_token';

describe('GET /api/cards/:database_id/schema', () => {
  it('should return 200 with database schema', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .get(`/api/cards/${databaseId}/schema`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      columns: expect.any(Array),
      views: expect.any(Array),
      defaultViewId: expect.any(String),
    });
  });

  it('should return 422 for non-database card', async () => {
    const pageCardId = 'page-card-uuid';

    const response = await request(app)
      .get(`/api/cards/${pageCardId}/schema`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(422);

    expect(response.body.error).toMatch(/not a database/i);
  });

  it('should return 404 for non-existent card', async () => {
    const response = await request(app)
      .get('/api/cards/non-existent-uuid/schema')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/cards/database-uuid/schema')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PUT /api/cards/:database_id/schema', () => {
  it('should update database schema and return 200', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .put(`/api/cards/${databaseId}/schema`)
      .set('Authorization', validToken)
      .send({
        columns: [
          {
            id: 'col-1',
            name: 'Name',
            type: 'text',
            required: true,
          },
          {
            id: 'col-2',
            name: 'Level',
            type: 'number',
            required: false,
          },
        ],
        views: [
          {
            id: 'view-1',
            name: 'All Entries',
            type: 'table',
          },
        ],
        defaultViewId: 'view-1',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      columns: expect.any(Array),
      views: expect.any(Array),
      defaultViewId: 'view-1',
    });
  });

  it('should validate column references in views', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .put(`/api/cards/${databaseId}/schema`)
      .set('Authorization', validToken)
      .send({
        columns: [
          {
            id: 'col-1',
            name: 'Name',
            type: 'text',
            required: true,
          },
        ],
        views: [
          {
            id: 'view-1',
            name: 'Filtered View',
            type: 'table',
            filter: [
              {
                columnId: 'non-existent-col', // Invalid reference
                operator: 'equals',
                value: 'test',
              },
            ],
          },
        ],
        defaultViewId: 'view-1',
      })
      .expect('Content-Type', /json/)
      .expect(422);

    expect(response.body.error).toMatch(/non-existent column/i);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .put('/api/cards/database-uuid/schema')
      .send({
        columns: [],
        views: [],
        defaultViewId: 'view-1',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/cards/:database_id/columns', () => {
  it('should add column to database and return 201', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .post(`/api/cards/${databaseId}/columns`)
      .set('Authorization', validToken)
      .send({
        id: 'col-new',
        name: 'Hit Points',
        type: 'number',
        required: false,
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      columns: expect.arrayContaining([
        expect.objectContaining({
          id: 'col-new',
          name: 'Hit Points',
        }),
      ]),
    });
  });

  it('should validate column type enum', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .post(`/api/cards/${databaseId}/columns`)
      .set('Authorization', validToken)
      .send({
        id: 'col-invalid',
        name: 'Invalid Column',
        type: 'invalid-type',
        required: false,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/cards/database-uuid/columns')
      .send({
        id: 'col-new',
        name: 'Column',
        type: 'text',
        required: false,
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/cards/:database_id/columns/:column_id', () => {
  it('should delete column and return 200', async () => {
    const databaseId = 'database-card-uuid';
    const columnId = 'col-to-delete';

    const response = await request(app)
      .delete(`/api/cards/${databaseId}/columns/${columnId}?confirm=true`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.columns).not.toContainEqual(
      expect.objectContaining({ id: columnId })
    );
  });

  it('should require confirm=true query parameter', async () => {
    const databaseId = 'database-card-uuid';
    const columnId = 'col-id';

    const response = await request(app)
      .delete(`/api/cards/${databaseId}/columns/${columnId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete('/api/cards/database-uuid/columns/col-id?confirm=true')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/cards/:database_id/views', () => {
  it('should add view to database and return 201', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .post(`/api/cards/${databaseId}/views`)
      .set('Authorization', validToken)
      .send({
        id: 'view-new',
        name: 'Active Characters',
        type: 'list',
        filter: [
          {
            columnId: 'col-status',
            operator: 'equals',
            value: 'Active',
          },
        ],
        sort: [
          {
            columnId: 'col-level',
            direction: 'desc',
          },
        ],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      views: expect.arrayContaining([
        expect.objectContaining({
          id: 'view-new',
          name: 'Active Characters',
        }),
      ]),
    });
  });

  it('should validate view type enum', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .post(`/api/cards/${databaseId}/views`)
      .set('Authorization', validToken)
      .send({
        id: 'view-invalid',
        name: 'Invalid View',
        type: 'invalid-type',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/cards/database-uuid/views')
      .send({
        id: 'view-new',
        name: 'View',
        type: 'table',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/cards/:database_id/entries', () => {
  it('should return 200 with entries array', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .get(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      entries: expect.any(Array),
      total: expect.any(Number),
    });
  });

  it('should apply view filter when view_id provided', async () => {
    const databaseId = 'database-card-uuid';
    const viewId = 'view-active-only';

    const response = await request(app)
      .get(`/api/cards/${databaseId}/entries?view_id=${viewId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      entries: expect.any(Array),
      total: expect.any(Number),
    });
  });

  it('should respect limit and offset parameters', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .get(`/api/cards/${databaseId}/entries?limit=10&offset=5`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.entries.length).toBeLessThanOrEqual(10);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/cards/database-uuid/entries')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/cards/:database_id/entries', () => {
  it('should create database entry and return 201', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .post(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .send({
        title: 'Gandalf the Grey',
        values: {
          'col-name': 'Gandalf',
          'col-level': 20,
          'col-class': 'choice-wizard',
        },
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      databaseId: databaseId,
      title: 'Gandalf the Grey',
      values: expect.any(Object),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('should validate required columns', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .post(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .send({
        title: 'Incomplete Entry',
        values: {
          // Missing required column
          'col-optional': 'value',
        },
      })
      .expect('Content-Type', /json/)
      .expect(422);

    expect(response.body.error).toMatch(/required column/i);
  });

  it('should create entry as page card with parent_id = database_id', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .post(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .send({
        title: 'Test Entry',
        values: {
          'col-name': 'Test',
        },
      })
      .expect(201);

    // Entry should be a page card (type='page') with parent_id = database_id
    expect(response.body).toMatchObject({
      databaseId: databaseId,
    });
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/cards/database-uuid/entries')
      .send({
        title: 'Entry',
        values: {},
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/cards/:database_id/entries/:entry_id', () => {
  it('should return 200 with entry details', async () => {
    const databaseId = 'database-card-uuid';
    const entryId = 'entry-card-uuid';

    const response = await request(app)
      .get(`/api/cards/${databaseId}/entries/${entryId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: entryId,
      databaseId: databaseId,
      title: expect.any(String),
      values: expect.any(Object),
    });
  });

  it('should return 404 for non-existent entry', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .get(`/api/cards/${databaseId}/entries/non-existent-uuid`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/cards/database-uuid/entries/entry-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PUT /api/cards/:database_id/entries/:entry_id', () => {
  it('should update entry and return 200', async () => {
    const databaseId = 'database-card-uuid';
    const entryId = 'entry-card-uuid';

    const response = await request(app)
      .put(`/api/cards/${databaseId}/entries/${entryId}`)
      .set('Authorization', validToken)
      .send({
        title: 'Updated Title',
        values: {
          'col-name': 'Updated Name',
          'col-level': 25,
        },
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: entryId,
      title: 'Updated Title',
      values: expect.objectContaining({
        'col-name': 'Updated Name',
        'col-level': 25,
      }),
    });
  });

  it('should support partial value updates', async () => {
    const databaseId = 'database-card-uuid';
    const entryId = 'entry-card-uuid';

    const response = await request(app)
      .put(`/api/cards/${databaseId}/entries/${entryId}`)
      .set('Authorization', validToken)
      .send({
        values: {
          'col-level': 30, // Only update one column
        },
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.values).toHaveProperty('col-level', 30);
  });

  it('should return 404 for non-existent entry', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .put(`/api/cards/${databaseId}/entries/non-existent-uuid`)
      .set('Authorization', validToken)
      .send({
        title: 'Updated',
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .put('/api/cards/database-uuid/entries/entry-uuid')
      .send({
        title: 'Updated',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/cards/:database_id/entries/:entry_id', () => {
  it('should delete entry and return 200', async () => {
    const databaseId = 'database-card-uuid';
    const entryId = 'entry-card-uuid';

    const response = await request(app)
      .delete(`/api/cards/${databaseId}/entries/${entryId}`)
      .set('Authorization', validToken)
      .expect(200);

    // No specific body expected for successful deletion
  });

  it('should cascade delete entry subtree if entry has children', async () => {
    const databaseId = 'database-card-uuid';
    const entryId = 'entry-with-children-uuid';

    const response = await request(app)
      .delete(`/api/cards/${databaseId}/entries/${entryId}`)
      .set('Authorization', validToken)
      .expect(200);

    // Deletion should cascade to children (database entries can have nested cards)
  });

  it('should return 404 for non-existent entry', async () => {
    const databaseId = 'database-card-uuid';

    const response = await request(app)
      .delete(`/api/cards/${databaseId}/entries/non-existent-uuid`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete('/api/cards/database-uuid/entries/entry-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});
