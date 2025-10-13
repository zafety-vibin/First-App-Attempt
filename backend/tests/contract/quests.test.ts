/**
 * Contract tests for Quests API
 * Based on: specs/014-create-the-database/contracts/openapi.yaml
 *
 * Feature 014 - Structured Category Database Foundation
 * These tests validate the API contract matches the OpenAPI specification.
 * They MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Feature 014
let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';
const testQuestGiverId = 'npc-uuid-001';
const testStartedSessionId = 'session-recap-uuid-001';
const testCompletedSessionId = 'session-recap-uuid-002';
const testRelatedNpcId = 'npc-uuid-002';
const testRelatedLocationId = 'location-uuid-001';

describe('GET /api/quests', () => {
  it('should list quests with pagination', async () => {
    const response = await request(app)
      .get('/api/quests')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      data: expect.any(Array),
      pagination: {
        limit: expect.any(Number),
        offset: expect.any(Number),
        total: expect.any(Number),
      },
    });
  });

  it('should filter quests by campaign_id', async () => {
    const response = await request(app)
      .get('/api/quests')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((quest: any) => {
      expect(quest.campaign_id).toBe(testCampaignId);
    });
  });

  it('should filter quests by core_status', async () => {
    const response = await request(app)
      .get('/api/quests')
      .query({
        campaign_id: testCampaignId,
        core_status: 'active',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((quest: any) => {
      expect(quest.core_status).toBe('active');
    });
  });

  it('should filter quests by status enum', async () => {
    const response = await request(app)
      .get('/api/quests')
      .query({
        campaign_id: testCampaignId,
        status: 'in_progress',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((quest: any) => {
      expect(quest.status).toBe('in_progress');
    });
  });

  it('should filter quests by player_knowledge', async () => {
    const response = await request(app)
      .get('/api/quests')
      .query({
        campaign_id: testCampaignId,
        player_knowledge: 'common_knowledge',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((quest: any) => {
      expect(quest.player_knowledge).toBe('common_knowledge');
    });
  });

  it('should support pagination with limit and offset', async () => {
    const response = await request(app)
      .get('/api/quests')
      .query({
        campaign_id: testCampaignId,
        limit: 10,
        offset: 5,
      })
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body.pagination).toMatchObject({
      limit: 10,
      offset: 5,
      total: expect.any(Number),
    });
    expect(response.body.data.length).toBeLessThanOrEqual(10);
  });

  it('should support sorting by created_at, updated_at, or name', async () => {
    const response = await request(app)
      .get('/api/quests')
      .query({
        campaign_id: testCampaignId,
        sort_by: 'name',
        sort_order: 'asc',
      })
      .set('Authorization', validToken)
      .expect(200);

    const names = response.body.data.map((quest: any) => quest.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });

  it('should strip dm_* fields in player_view mode', async () => {
    const response = await request(app)
      .get('/api/quests')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    response.body.data.forEach((quest: any) => {
      expect(quest).not.toHaveProperty('dm_true_objective');
      expect(quest).not.toHaveProperty('dm_consequences');
    });
  });

  it('should include dm_* fields in dm_view mode', async () => {
    const response = await request(app)
      .get('/api/quests')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm_view')
      .expect(200);

    // At least one quest should have dm_* fields (may be null)
    const firstQuest = response.body.data[0];
    if (firstQuest) {
      expect(firstQuest).toHaveProperty('dm_true_objective');
      expect(firstQuest).toHaveProperty('dm_consequences');
    }
  });

  it('should default to dm_view when X-View-Mode header is omitted', async () => {
    const response = await request(app)
      .get('/api/quests')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    const firstQuest = response.body.data[0];
    if (firstQuest) {
      expect(firstQuest).toHaveProperty('dm_true_objective');
      expect(firstQuest).toHaveProperty('dm_consequences');
    }
  });

  it('should filter by tags (comma-separated)', async () => {
    const response = await request(app)
      .get('/api/quests')
      .query({
        campaign_id: testCampaignId,
        tags: 'main-quest,urgent',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((quest: any) => {
      const hasTag = quest.tags.some((tag: string) =>
        ['main-quest', 'urgent'].includes(tag)
      );
      expect(hasTag).toBe(true);
    });
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/quests')
      .query({ campaign_id: testCampaignId })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/quests', () => {
  it('should create quest with universal fields and return 201', async () => {
    const response = await request(app)
      .post('/api/quests')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Rescue the Kidnapped Princess',
        description: 'The princess has been taken by bandits',
        core_status: 'active',
        player_knowledge: 'common_knowledge',
        tags: ['main-quest', 'rescue'],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      campaign_id: testCampaignId,
      name: 'Rescue the Kidnapped Princess',
      description: 'The princess has been taken by bandits',
      core_status: 'active',
      player_knowledge: 'common_knowledge',
      tags: ['main-quest', 'rescue'],
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
      custom_fields: expect.any(Object),
    });
  });

  it('should create quest with category-specific fields', async () => {
    const response = await request(app)
      .post('/api/quests')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Find the Lost Artifact',
        status: 'in_progress',
        objectives: [
          'Investigate the ancient ruins',
          'Defeat the guardian',
          'Retrieve the artifact',
        ],
        rewards: 'Ancient sword, 1000 gold pieces, XP',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Find the Lost Artifact',
      status: 'in_progress',
      objectives: [
        'Investigate the ancient ruins',
        'Defeat the guardian',
        'Retrieve the artifact',
      ],
      rewards: 'Ancient sword, 1000 gold pieces, XP',
    });
  });

  it('should create quest with foreign key references', async () => {
    const response = await request(app)
      .post('/api/quests')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Quest with References',
        quest_giver_id: testQuestGiverId,
        started_session_id: testStartedSessionId,
        completed_session_id: testCompletedSessionId,
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      quest_giver_id: testQuestGiverId,
      started_session_id: testStartedSessionId,
      completed_session_id: testCompletedSessionId,
    });
  });

  it('should create quest with many-to-many connections', async () => {
    const response = await request(app)
      .post('/api/quests')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Multi-Entity Quest',
        related_npcs: [testRelatedNpcId, 'npc-uuid-003'],
        related_locations: [testRelatedLocationId, 'location-uuid-002'],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      related_npcs: [testRelatedNpcId, 'npc-uuid-003'],
      related_locations: [testRelatedLocationId, 'location-uuid-002'],
    });
  });

  it('should create quest with dm_* fields', async () => {
    const response = await request(app)
      .post('/api/quests')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Secret Quest',
        dm_true_objective: 'Actually a trap to lure the party into ambush',
        dm_consequences: 'If failed, the BBEG gains the artifact of power',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      dm_true_objective: 'Actually a trap to lure the party into ambush',
      dm_consequences: 'If failed, the BBEG gains the artifact of power',
    });
  });

  it('should strip dm_* fields in player_view response', async () => {
    const response = await request(app)
      .post('/api/quests')
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .send({
        campaign_id: testCampaignId,
        name: 'Simple Quest',
        dm_true_objective: 'Hidden objective',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).not.toHaveProperty('dm_true_objective');
    expect(response.body).not.toHaveProperty('dm_consequences');
  });

  it('should create quest with custom_fields JSON object', async () => {
    const response = await request(app)
      .post('/api/quests')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Custom Quest',
        custom_fields: {
          difficulty: 'hard',
          estimated_sessions: 3,
          quest_type: 'investigation',
        },
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.custom_fields).toMatchObject({
      difficulty: 'hard',
      estimated_sessions: 3,
      quest_type: 'investigation',
    });
  });

  it('should require name and campaign_id fields', async () => {
    const response = await request(app)
      .post('/api/quests')
      .set('Authorization', validToken)
      .send({
        description: 'Missing required fields',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate core_status enum', async () => {
    const response = await request(app)
      .post('/api/quests')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test Quest',
        core_status: 'invalid_status',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate status enum (quest-specific)', async () => {
    const response = await request(app)
      .post('/api/quests')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test Quest',
        status: 'invalid_quest_status',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should accept valid status enum values', async () => {
    const validStatuses = ['not_started', 'in_progress', 'completed', 'failed'];

    for (const status of validStatuses) {
      const response = await request(app)
        .post('/api/quests')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `Quest with ${status} status`,
          status: status,
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.status).toBe(status);
    }
  });

  it('should validate name maxLength of 255', async () => {
    const longName = 'A'.repeat(256);
    const response = await request(app)
      .post('/api/quests')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: longName,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/quests')
      .send({
        campaign_id: testCampaignId,
        name: 'Test Quest',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/quests/:id', () => {
  it('should return quest by ID with 200', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .get(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: questId,
      campaign_id: expect.any(String),
      name: expect.any(String),
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
      custom_fields: expect.any(Object),
    });
  });

  it('should return quest with all universal fields', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .get(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('campaign_id');
    expect(response.body).toHaveProperty('name');
    expect(response.body).toHaveProperty('description');
    expect(response.body).toHaveProperty('core_status');
    expect(response.body).toHaveProperty('player_knowledge');
    expect(response.body).toHaveProperty('tags');
    expect(response.body).toHaveProperty('created_at');
    expect(response.body).toHaveProperty('updated_at');
    expect(response.body).toHaveProperty('custom_fields');
  });

  it('should return quest with category-specific fields', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .get(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('objectives');
    expect(response.body).toHaveProperty('rewards');
    expect(response.body).toHaveProperty('quest_giver_id');
    expect(response.body).toHaveProperty('started_session_id');
    expect(response.body).toHaveProperty('completed_session_id');
    expect(response.body).toHaveProperty('related_npcs');
    expect(response.body).toHaveProperty('related_locations');
    expect(response.body).toHaveProperty('dm_true_objective');
    expect(response.body).toHaveProperty('dm_consequences');
  });

  it('should return objectives as JSON array', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .get(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(Array.isArray(response.body.objectives)).toBe(true);
  });

  it('should return related_npcs as JSON array', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .get(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(Array.isArray(response.body.related_npcs)).toBe(true);
  });

  it('should return related_locations as JSON array', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .get(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(Array.isArray(response.body.related_locations)).toBe(true);
  });

  it('should strip dm_* fields in player_view mode', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .get(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_true_objective');
    expect(response.body).not.toHaveProperty('dm_consequences');
  });

  it('should include dm_* fields in dm_view mode', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .get(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm_view')
      .expect(200);

    expect(response.body).toHaveProperty('dm_true_objective');
    expect(response.body).toHaveProperty('dm_consequences');
  });

  it('should filter by player_knowledge in player_view mode', async () => {
    const questId = 'quest-with-dm-only-knowledge';

    const response = await request(app)
      .get(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent quest', async () => {
    const response = await request(app)
      .get('/api/quests/non-existent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/quests/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PUT /api/quests/:id', () => {
  it('should update quest and return 200', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .put(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .send({
        name: 'Updated Quest Name',
        description: 'Updated description',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: questId,
      name: 'Updated Quest Name',
      description: 'Updated description',
      updated_at: expect.any(Number),
    });
  });

  it('should allow partial updates', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .put(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .send({
        status: 'completed',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.status).toBe('completed');
  });

  it('should update category-specific fields', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .put(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .send({
        status: 'in_progress',
        objectives: [
          'New objective 1',
          'New objective 2',
        ],
        rewards: 'Updated rewards',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'in_progress',
      objectives: [
        'New objective 1',
        'New objective 2',
      ],
      rewards: 'Updated rewards',
    });
  });

  it('should update foreign key references', async () => {
    const questId = 'quest-uuid-123';
    const newQuestGiverId = 'npc-uuid-002';
    const newSessionId = 'session-recap-uuid-003';

    const response = await request(app)
      .put(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .send({
        quest_giver_id: newQuestGiverId,
        started_session_id: newSessionId,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      quest_giver_id: newQuestGiverId,
      started_session_id: newSessionId,
    });
  });

  it('should update many-to-many connections', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .put(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .send({
        related_npcs: ['npc-uuid-004', 'npc-uuid-005'],
        related_locations: ['location-uuid-003'],
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      related_npcs: ['npc-uuid-004', 'npc-uuid-005'],
      related_locations: ['location-uuid-003'],
    });
  });

  it('should update dm_* fields', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .put(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .send({
        dm_true_objective: 'Updated secret objective',
        dm_consequences: 'New consequences',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      dm_true_objective: 'Updated secret objective',
      dm_consequences: 'New consequences',
    });
  });

  it('should strip dm_* fields in player_view response', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .put(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_true_objective');
    expect(response.body).not.toHaveProperty('dm_consequences');
  });

  it('should update custom_fields', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .put(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .send({
        custom_fields: {
          new_field: 'new value',
        },
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.custom_fields).toMatchObject({
      new_field: 'new value',
    });
  });

  it('should not allow changing id or campaign_id', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .put(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .send({
        id: 'new-id',
        campaign_id: 'new-campaign-id',
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.id).toBe(questId);
    expect(response.body.campaign_id).not.toBe('new-campaign-id');
  });

  it('should validate core_status enum', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .put(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .send({
        core_status: 'invalid_status',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate status enum (quest-specific)', async () => {
    const questId = 'quest-uuid-123';

    const response = await request(app)
      .put(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .send({
        status: 'invalid_quest_status',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent quest', async () => {
    const response = await request(app)
      .put('/api/quests/non-existent-uuid')
      .set('Authorization', validToken)
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .put('/api/quests/some-uuid')
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/quests/:id', () => {
  it('should delete quest and return 204', async () => {
    const questId = 'quest-uuid-to-delete';

    await request(app)
      .delete(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 404 for non-existent quest', async () => {
    const response = await request(app)
      .delete('/api/quests/non-existent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should handle CASCADE deletion when quest is referenced', async () => {
    const questId = 'quest-with-relationships';

    // This tests that the database properly handles foreign key constraints
    // When a quest with foreign key references is deleted
    await request(app)
      .delete(`/api/quests/${questId}`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete('/api/quests/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when deleting quest from campaign not owned by user', async () => {
    const otherUserQuestId = 'other-user-quest-uuid';

    const response = await request(app)
      .delete(`/api/quests/${otherUserQuestId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});
