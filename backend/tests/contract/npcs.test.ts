/**
 * Contract tests for NPCs API
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
const testFactionId = 'faction-uuid-001';
const testLocationId = 'location-uuid-001';
const testSuperiorNpcId = 'npc-uuid-001';

describe('GET /api/npcs', () => {
  it('should list NPCs with pagination', async () => {
    const response = await request(app)
      .get('/api/npcs')
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

  it('should filter NPCs by campaign_id', async () => {
    const response = await request(app)
      .get('/api/npcs')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((npc: any) => {
      expect(npc.campaign_id).toBe(testCampaignId);
    });
  });

  it('should filter NPCs by core_status', async () => {
    const response = await request(app)
      .get('/api/npcs')
      .query({
        campaign_id: testCampaignId,
        core_status: 'active',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((npc: any) => {
      expect(npc.core_status).toBe('active');
    });
  });

  it('should filter NPCs by player_knowledge', async () => {
    const response = await request(app)
      .get('/api/npcs')
      .query({
        campaign_id: testCampaignId,
        player_knowledge: 'common_knowledge',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((npc: any) => {
      expect(npc.player_knowledge).toBe('common_knowledge');
    });
  });

  it('should support pagination with limit and offset', async () => {
    const response = await request(app)
      .get('/api/npcs')
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
      .get('/api/npcs')
      .query({
        campaign_id: testCampaignId,
        sort_by: 'name',
        sort_order: 'asc',
      })
      .set('Authorization', validToken)
      .expect(200);

    const names = response.body.data.map((npc: any) => npc.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });

  it('should strip dm_* fields in player_view mode', async () => {
    const response = await request(app)
      .get('/api/npcs')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    response.body.data.forEach((npc: any) => {
      expect(npc).not.toHaveProperty('dm_secrets');
      expect(npc).not.toHaveProperty('dm_plot_relevance');
    });
  });

  it('should include dm_* fields in dm_view mode', async () => {
    const response = await request(app)
      .get('/api/npcs')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm_view')
      .expect(200);

    // At least one NPC should have dm_* fields (may be null)
    const firstNpc = response.body.data[0];
    if (firstNpc) {
      expect(firstNpc).toHaveProperty('dm_secrets');
      expect(firstNpc).toHaveProperty('dm_plot_relevance');
    }
  });

  it('should default to dm_view when X-View-Mode header is omitted', async () => {
    const response = await request(app)
      .get('/api/npcs')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    const firstNpc = response.body.data[0];
    if (firstNpc) {
      expect(firstNpc).toHaveProperty('dm_secrets');
      expect(firstNpc).toHaveProperty('dm_plot_relevance');
    }
  });

  it('should filter by tags (comma-separated)', async () => {
    const response = await request(app)
      .get('/api/npcs')
      .query({
        campaign_id: testCampaignId,
        tags: 'villain,boss',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((npc: any) => {
      const hasTag = npc.tags.some((tag: string) =>
        ['villain', 'boss'].includes(tag)
      );
      expect(hasTag).toBe(true);
    });
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/npcs')
      .query({ campaign_id: testCampaignId })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/npcs', () => {
  it('should create NPC with universal fields and return 201', async () => {
    const response = await request(app)
      .post('/api/npcs')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Elara Moonwhisper',
        description: 'A mysterious elven ranger',
        core_status: 'active',
        player_knowledge: 'common_knowledge',
        tags: ['ally', 'ranger'],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      campaign_id: testCampaignId,
      name: 'Elara Moonwhisper',
      description: 'A mysterious elven ranger',
      core_status: 'active',
      player_knowledge: 'common_knowledge',
      tags: ['ally', 'ranger'],
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
      custom_fields: expect.any(Object),
    });
  });

  it('should create NPC with category-specific fields', async () => {
    const response = await request(app)
      .post('/api/npcs')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Thorin Ironforge',
        race: 'Dwarf',
        class: ['Fighter', 'Cleric'],
        level: 12,
        alignment: 'Lawful Good',
        appearance: 'Stout dwarf with braided beard',
        personality_traits: 'Gruff but honorable',
        motivation: 'Restore his clan honor',
        relationship_to_party: 'Quest giver',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Thorin Ironforge',
      race: 'Dwarf',
      class: ['Fighter', 'Cleric'],
      level: 12,
      alignment: 'Lawful Good',
      appearance: 'Stout dwarf with braided beard',
      personality_traits: 'Gruff but honorable',
      motivation: 'Restore his clan honor',
      relationship_to_party: 'Quest giver',
    });
  });

  it('should create NPC with foreign key references', async () => {
    const response = await request(app)
      .post('/api/npcs')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Shadowy Agent',
        faction_id: testFactionId,
        locations: [testLocationId],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      faction_id: testFactionId,
      locations: [testLocationId],
    });
  });

  it('should create NPC with hierarchical superior_npc_id', async () => {
    const response = await request(app)
      .post('/api/npcs')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Lieutenant Marcus',
        superior_npc_id: testSuperiorNpcId,
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      superior_npc_id: testSuperiorNpcId,
    });
  });

  it('should create NPC with dm_* fields', async () => {
    const response = await request(app)
      .post('/api/npcs')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Mysterious Stranger',
        dm_secrets: 'Actually a dragon in disguise',
        dm_plot_relevance: 'Will betray party at act 3 climax',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      dm_secrets: 'Actually a dragon in disguise',
      dm_plot_relevance: 'Will betray party at act 3 climax',
    });
  });

  it('should strip dm_* fields in player_view response', async () => {
    const response = await request(app)
      .post('/api/npcs')
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .send({
        campaign_id: testCampaignId,
        name: 'Shopkeeper',
        dm_secrets: 'Secret spy',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).not.toHaveProperty('dm_secrets');
    expect(response.body).not.toHaveProperty('dm_plot_relevance');
  });

  it('should create NPC with custom_fields JSON object', async () => {
    const response = await request(app)
      .post('/api/npcs')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Custom NPC',
        custom_fields: {
          voice_actor: 'Matt Mercer',
          accent: 'Scottish',
          theme_song: 'https://example.com/song.mp3',
        },
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.custom_fields).toMatchObject({
      voice_actor: 'Matt Mercer',
      accent: 'Scottish',
      theme_song: 'https://example.com/song.mp3',
    });
  });

  it('should require name and campaign_id fields', async () => {
    const response = await request(app)
      .post('/api/npcs')
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
      .post('/api/npcs')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test NPC',
        core_status: 'invalid_status',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate level minimum value of 1', async () => {
    const response = await request(app)
      .post('/api/npcs')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test NPC',
        level: 0,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate name maxLength of 255', async () => {
    const longName = 'A'.repeat(256);
    const response = await request(app)
      .post('/api/npcs')
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
      .post('/api/npcs')
      .send({
        campaign_id: testCampaignId,
        name: 'Test NPC',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/npcs/:id', () => {
  it('should return NPC by ID with 200', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .get(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: npcId,
      campaign_id: expect.any(String),
      name: expect.any(String),
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
      custom_fields: expect.any(Object),
    });
  });

  it('should return NPC with all universal fields', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .get(`/api/npcs/${npcId}`)
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

  it('should return NPC with category-specific fields', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .get(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('race');
    expect(response.body).toHaveProperty('class');
    expect(response.body).toHaveProperty('level');
    expect(response.body).toHaveProperty('alignment');
    expect(response.body).toHaveProperty('appearance');
    expect(response.body).toHaveProperty('personality_traits');
    expect(response.body).toHaveProperty('motivation');
    expect(response.body).toHaveProperty('relationship_to_party');
    expect(response.body).toHaveProperty('faction_id');
    expect(response.body).toHaveProperty('locations');
    expect(response.body).toHaveProperty('dm_secrets');
    expect(response.body).toHaveProperty('dm_plot_relevance');
  });

  it('should return class as JSON array', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .get(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.class !== null) {
      expect(Array.isArray(response.body.class)).toBe(true);
    }
  });

  it('should return locations as JSON array', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .get(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(Array.isArray(response.body.locations)).toBe(true);
  });

  it('should strip dm_* fields in player_view mode', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .get(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_secrets');
    expect(response.body).not.toHaveProperty('dm_plot_relevance');
  });

  it('should include dm_* fields in dm_view mode', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .get(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm_view')
      .expect(200);

    expect(response.body).toHaveProperty('dm_secrets');
    expect(response.body).toHaveProperty('dm_plot_relevance');
  });

  it('should filter by player_knowledge in player_view mode', async () => {
    const npcId = 'npc-with-dm-only-knowledge';

    const response = await request(app)
      .get(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent NPC', async () => {
    const response = await request(app)
      .get('/api/npcs/non-existent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/npcs/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PUT /api/npcs/:id', () => {
  it('should update NPC and return 200', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .put(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .send({
        name: 'Updated Name',
        description: 'Updated description',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: npcId,
      name: 'Updated Name',
      description: 'Updated description',
      updated_at: expect.any(Number),
    });
  });

  it('should allow partial updates', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .put(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .send({
        level: 15,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.level).toBe(15);
  });

  it('should update category-specific fields', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .put(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .send({
        race: 'Half-Elf',
        class: ['Rogue', 'Ranger'],
        alignment: 'Chaotic Neutral',
        motivation: 'Find lost sibling',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      race: 'Half-Elf',
      class: ['Rogue', 'Ranger'],
      alignment: 'Chaotic Neutral',
      motivation: 'Find lost sibling',
    });
  });

  it('should update foreign key references', async () => {
    const npcId = 'npc-uuid-123';
    const newFactionId = 'faction-uuid-002';

    const response = await request(app)
      .put(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .send({
        faction_id: newFactionId,
        locations: [testLocationId, 'location-uuid-002'],
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      faction_id: newFactionId,
      locations: [testLocationId, 'location-uuid-002'],
    });
  });

  it('should update dm_* fields', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .put(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .send({
        dm_secrets: 'Updated secret',
        dm_plot_relevance: 'New plot hook',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      dm_secrets: 'Updated secret',
      dm_plot_relevance: 'New plot hook',
    });
  });

  it('should strip dm_* fields in player_view response', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .put(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_secrets');
    expect(response.body).not.toHaveProperty('dm_plot_relevance');
  });

  it('should update custom_fields', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .put(`/api/npcs/${npcId}`)
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
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .put(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .send({
        id: 'new-id',
        campaign_id: 'new-campaign-id',
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.id).toBe(npcId);
    expect(response.body.campaign_id).not.toBe('new-campaign-id');
  });

  it('should validate core_status enum', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .put(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .send({
        core_status: 'invalid_status',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate level minimum value', async () => {
    const npcId = 'npc-uuid-123';

    const response = await request(app)
      .put(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .send({
        level: -5,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent NPC', async () => {
    const response = await request(app)
      .put('/api/npcs/non-existent-uuid')
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
      .put('/api/npcs/some-uuid')
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/npcs/:id', () => {
  it('should delete NPC and return 204', async () => {
    const npcId = 'npc-uuid-to-delete';

    await request(app)
      .delete(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 404 for non-existent NPC', async () => {
    const response = await request(app)
      .delete('/api/npcs/non-existent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should handle CASCADE deletion when NPC is referenced', async () => {
    const npcId = 'npc-with-subordinates';

    // This tests that the database properly handles foreign key constraints
    // When an NPC with superior_npc_id references is deleted, subordinates should be handled gracefully
    await request(app)
      .delete(`/api/npcs/${npcId}`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete('/api/npcs/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when deleting NPC from campaign not owned by user', async () => {
    const otherUserNpcId = 'other-user-npc-uuid';

    const response = await request(app)
      .delete(`/api/npcs/${otherUserNpcId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});
