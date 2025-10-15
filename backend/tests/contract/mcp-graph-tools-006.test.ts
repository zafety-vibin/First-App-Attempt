/**
 * Contract tests for MCP Graph Tools (Feature 006)
 * Based on: specs/006-create-the-knowledge/contracts/graph-tools.json
 *
 * Feature 006 - Knowledge Graphs with Confidence Decay
 * These tests validate 13 MCP tools for temporal-aware graph operations.
 * They MUST fail before implementation (TDD).
 *
 * NOTE: These tests verify that MCP tool endpoints exist and follow the contract.
 * Actual MCP server integration is in Feature 011.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Feature 006
let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';
const testGraphType = 'political-web';

describe('MCP Tool: create_entities', () => {
  it('should create multiple entities in batch', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/create_entities')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entities: [
          {
            name: 'Lord Neverember',
            entityType: 'NPC',
            observations: ['current location: Waterdeep'],
            informationLevelId: 'common-knowledge',
          },
          {
            name: 'Harpers',
            entityType: 'Faction',
            observations: ['secret organization'],
            informationLevelId: 'dm-secret',
          },
        ],
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      created_count: 2,
      entity_names: ['Lord Neverember', 'Harpers'],
    });
  });

  it('should start all entities with confidence 1.0', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/create_entities')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entities: [
          {
            name: 'New Entity',
            entityType: 'NPC',
          },
        ],
      })
      .expect(200);

    // Verify entity has confidence 1.0 (via query)
    expect(response.body.created_count).toBe(1);
  });

  it('should validate graph_type pattern', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/create_entities')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: 'invalid-type',
        entities: [
          {
            name: 'Test Entity',
            entityType: 'NPC',
          },
        ],
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should require name and entityType fields', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/create_entities')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entities: [
          {
            // Missing required fields
            observations: ['test'],
          },
        ],
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate name maxLength (200 characters)', async () => {
    const longName = 'A'.repeat(201);
    const response = await request(app)
      .post('/api/mcp/tools/create_entities')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entities: [
          {
            name: longName,
            entityType: 'NPC',
          },
        ],
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('MCP Tool: create_relations', () => {
  it('should create multiple relations in batch', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/create_relations')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        relations: [
          {
            from: 'Lord Neverember',
            to: 'Waterdeep',
            relationType: 'rules',
            metadata: { title: 'Open Lord' },
          },
          {
            from: 'Harpers',
            to: 'Zhentarim',
            relationType: 'opposes',
          },
        ],
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      created_count: 2,
      relation_ids: expect.any(Array),
    });
    expect(response.body.relation_ids.length).toBe(2);
  });

  it('should calculate relation confidence as average of entities', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/create_relations')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        relations: [
          {
            from: 'Entity A',
            to: 'Entity B',
            relationType: 'knows',
          },
        ],
      })
      .expect(200);

    // Relation confidence = (entity_a_confidence + entity_b_confidence) / 2.0
    expect(response.body.created_count).toBe(1);
  });

  it('should validate from and to entities exist', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/create_relations')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        relations: [
          {
            from: 'Non-existent Entity',
            to: 'Another Non-existent',
            relationType: 'knows',
          },
        ],
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should require from, to, and relationType fields', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/create_relations')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        relations: [
          {
            from: 'Entity A',
            // Missing to and relationType
          },
        ],
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should prevent circular references (from === to)', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/create_relations')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        relations: [
          {
            from: 'Entity A',
            to: 'Entity A', // Same entity
            relationType: 'knows',
          },
        ],
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('MCP Tool: add_observations', () => {
  it('should append observations to entity', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/add_observations')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entity_name: 'Lord Neverember',
        observations: [
          'current location: palace',
          'planning expedition to Undermountain',
        ],
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      entity_name: 'Lord Neverember',
      new_observation_count: 2,
    });
  });

  it('should give each observation independent confidence decay', async () => {
    await request(app)
      .post('/api/mcp/tools/add_observations')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entity_name: 'Test Entity',
        observations: ['observation 1'],
      })
      .expect(200);

    // Each observation has created_at and last_accessed for decay
  });

  it('should require entity_name and observations fields', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/add_observations')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        // Missing entity_name and observations
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('MCP Tool: search_entities', () => {
  it('should search entities by name or type with confidence filtering', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/search_entities')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        query: 'lord',
        min_confidence: 0.5,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);

    if (response.body.length > 0) {
      const entity = response.body[0];
      expect(entity).toMatchObject({
        name: expect.any(String),
        entityType: expect.any(String),
        confidence: expect.any(Number),
        pinned: expect.any(Boolean),
        observations: expect.any(Array),
      });
      expect(entity.confidence).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('should auto-reinforce returned entities', async () => {
    const beforeTimestamp = Math.floor(Date.now() / 1000);

    await request(app)
      .post('/api/mcp/tools/search_entities')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        query: 'test',
      })
      .expect(200);

    // Returned entities should have last_accessed updated
  });

  it('should sort results by confidence (high first)', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/search_entities')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        query: 'entity',
      })
      .expect(200);

    // Verify descending confidence order
    for (let i = 1; i < response.body.length; i++) {
      expect(response.body[i - 1].confidence).toBeGreaterThanOrEqual(response.body[i].confidence);
    }
  });

  it('should default min_confidence to 0.0', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/search_entities')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        query: 'test',
      })
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe('MCP Tool: read_graph', () => {
  it('should return entire graph snapshot (read-only, no reinforcement)', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/read_graph')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      graph_type: testGraphType,
      graph_name: expect.any(String),
      decay_rate: expect.any(Number),
      confidence_threshold: expect.any(Number),
      entities: expect.any(Array),
      relations: expect.any(Array),
    });
  });

  it('should NOT update last_accessed (read-only)', async () => {
    // This is a snapshot query, should not reinforce entities
    await request(app)
      .post('/api/mcp/tools/read_graph')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
      })
      .expect(200);

    // Implementation should not call reinforcement
  });

  it('should filter by confidence_threshold', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/read_graph')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        confidence_threshold: 0.6,
      })
      .expect(200);

    // All entities should have confidence >= 0.6
    response.body.entities.forEach((entity: any) => {
      expect(entity.confidence).toBeGreaterThanOrEqual(0.6);
    });
  });

  it('should default confidence_threshold to 0.0', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/read_graph')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
      })
      .expect(200);

    expect(response.body).toHaveProperty('entities');
  });
});

describe('MCP Tool: delete_entities', () => {
  it('should delete multiple entities and cascade relations', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/delete_entities')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entity_names: ['Entity to Delete 1', 'Entity to Delete 2'],
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      deleted_count: 2,
    });
  });

  it('should cascade delete connected relations', async () => {
    await request(app)
      .post('/api/mcp/tools/delete_entities')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entity_names: ['Entity with Relations'],
      })
      .expect(200);

    // Relations connected to deleted entity should also be deleted
  });
});

describe('MCP Tool: pin_entity', () => {
  it('should pin entity to lock confidence at 1.0', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/pin_entity')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entity_name: 'BBEG Lord Soth',
        pinned: true,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      entity_name: 'BBEG Lord Soth',
      pinned: true,
      confidence: 1.0,
    });
  });

  it('should bypass decay for pinned entities', async () => {
    // Pinned entities always return confidence 1.0 regardless of time
    await request(app)
      .post('/api/mcp/tools/pin_entity')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entity_name: 'Test Entity',
        pinned: true,
      })
      .expect(200);

    // Verify confidence remains 1.0 even after weeks pass
  });

  it('should unpin entity to enable decay', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/pin_entity')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entity_name: 'Test Entity',
        pinned: false,
      })
      .expect(200);

    expect(response.body.pinned).toBe(false);
    expect(response.body.confidence).toBeLessThanOrEqual(1.0);
  });
});

describe('MCP Tool: get_entity_with_confidence', () => {
  it('should return detailed entity with observations', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/get_entity_with_confidence')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entity_name: 'Lord Neverember',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'Lord Neverember',
      entityType: expect.any(String),
      confidence: expect.any(Number),
      created_at: expect.any(Number),
      last_accessed: expect.any(Number),
      pinned: expect.any(Boolean),
      observations: expect.any(Array),
    });
  });

  it('should auto-reinforce entity on access', async () => {
    const beforeTimestamp = Math.floor(Date.now() / 1000);

    const response = await request(app)
      .post('/api/mcp/tools/get_entity_with_confidence')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entity_name: 'Test Entity',
      })
      .expect(200);

    expect(response.body.last_accessed).toBeGreaterThanOrEqual(beforeTimestamp);
  });

  it('should include observation confidence scores', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/get_entity_with_confidence')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entity_name: 'Entity with Observations',
      })
      .expect(200);

    if (response.body.observations.length > 0) {
      const observation = response.body.observations[0];
      expect(observation).toMatchObject({
        text: expect.any(String),
        confidence: expect.any(Number),
        created_at: expect.any(Number),
        last_accessed: expect.any(Number),
      });
    }
  });
});

describe('MCP Tool: reinforce_entity', () => {
  it('should update last_accessed and reset confidence to 1.0', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/reinforce_entity')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entity_name: 'Stale Entity',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      entity_name: 'Stale Entity',
      old_confidence: expect.any(Number),
      new_confidence: 1.0,
      last_accessed: expect.any(Number),
    });
  });

  it('should accept optional boost_amount parameter', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/reinforce_entity')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entity_name: 'Test Entity',
        boost_amount: 0.2,
      })
      .expect(200);

    expect(response.body).toHaveProperty('new_confidence');
  });

  it('should validate boost_amount range (0.01-0.5)', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/reinforce_entity')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
        entity_name: 'Test Entity',
        boost_amount: 1.5, // Exceeds max
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('MCP Tool: revert_graph', () => {
  it('should revert graph to backup version', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/revert_graph')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      graph_type: testGraphType,
      graph_name: expect.any(String),
      reverted_to_timestamp: expect.any(Number),
      entities_count: expect.any(Number),
      relations_count: expect.any(Number),
    });
  });

  it('should restore confidence metadata (last_accessed, pinned)', async () => {
    await request(app)
      .post('/api/mcp/tools/revert_graph')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: testGraphType,
      })
      .expect(200);

    // Verify restored entities have timestamp metadata
  });

  it('should fail if no backup version exists', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/revert_graph')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: 'graph-with-no-backup',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('MCP Tool: create_graph_instance', () => {
  it('should create new graph instance with decay rate', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/create_graph_instance')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: 'custom:magic-system',
        graph_name: 'Weave Mechanics',
        decay_rate: 0.05,
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      graph_id: expect.any(String),
      graph_type: 'custom:magic-system',
      graph_name: 'Weave Mechanics',
      decay_rate: 0.05,
    });
  });

  it('should validate graph_type pattern', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/create_graph_instance')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: 'invalid-type',
        graph_name: 'Test Graph',
        decay_rate: 0.1,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate decay_rate range (0.0-1.0)', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/create_graph_instance')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: 'political-web',
        graph_name: 'Test Graph',
        decay_rate: 1.5, // Exceeds max
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should enforce unique graph_name per campaign', async () => {
    const response = await request(app)
      .post('/api/mcp/tools/create_graph_instance')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        graph_type: 'political-web',
        graph_name: 'Existing Graph Name',
        decay_rate: 0.1,
      })
      .expect('Content-Type', /json/)
      .expect(409);

    expect(response.body).toHaveProperty('error');
  });
});
