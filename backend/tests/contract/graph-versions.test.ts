/**
 * Contract tests for Graph Versions API
 * Based on: specs/006-create-the-knowledge/contracts/graph-versions.yaml
 *
 * Feature 006 - Knowledge Graphs with Confidence Decay
 * These tests validate 1-deep versioning (current + backup).
 * They MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Feature 006
let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';
const testGraphId = 'graph-uuid-001';
const testVersionId = 'version-uuid-001';

describe('GET /api/campaigns/:campaignId/graphs/:graphId/versions', () => {
  it('should return current and backup versions', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('current_version');
    expect(response.body).toHaveProperty('backup_version');
  });

  it('should return current_version with snapshot content', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.current_version) {
      expect(response.body.current_version).toMatchObject({
        id: expect.any(String),
        graph_id: testGraphId,
        snapshot_content: expect.any(Object),
        version_type: 'current',
        created_at: expect.any(Number),
      });

      // Snapshot should contain nodes and edges
      expect(response.body.current_version.snapshot_content).toHaveProperty('nodes');
      expect(response.body.current_version.snapshot_content).toHaveProperty('edges');
      expect(response.body.current_version.snapshot_content).toHaveProperty('metadata');
    }
  });

  it('should return backup_version when it exists', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.backup_version) {
      expect(response.body.backup_version).toMatchObject({
        id: expect.any(String),
        graph_id: testGraphId,
        snapshot_content: expect.any(Object),
        version_type: 'backup',
        created_at: expect.any(Number),
      });
    }
  });

  it('should return null for backup_version when none exists', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/graph-with-no-backup/versions`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body.backup_version).toBeNull();
  });

  it('should include snapshot metadata with graph info', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.current_version) {
      const metadata = response.body.current_version.snapshot_content.metadata;
      expect(metadata).toMatchObject({
        graph_type: expect.any(String),
        graph_name: expect.any(String),
        node_count: expect.any(Number),
        edge_count: expect.any(Number),
        snapshot_timestamp: expect.any(Number),
      });
    }
  });

  it('should include confidence metadata in snapshot (last_accessed, pinned)', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.current_version && response.body.current_version.snapshot_content.nodes.length > 0) {
      const node = response.body.current_version.snapshot_content.nodes[0];
      expect(node).toHaveProperty('created_at');
      expect(node).toHaveProperty('last_accessed');
      expect(node).toHaveProperty('pinned');
    }
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .get(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent graph', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/non-existent-uuid/versions`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/campaigns/:campaignId/graphs/:graphId/versions/:versionId', () => {
  it('should return specific version by ID', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions/${testVersionId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: testVersionId,
      graph_id: testGraphId,
      snapshot_content: expect.any(Object),
      version_type: expect.stringMatching(/^(current|backup)$/),
      created_at: expect.any(Number),
    });
  });

  it('should include full snapshot content', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions/${testVersionId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body.snapshot_content).toHaveProperty('nodes');
    expect(response.body.snapshot_content).toHaveProperty('edges');
    expect(response.body.snapshot_content).toHaveProperty('metadata');
    expect(Array.isArray(response.body.snapshot_content.nodes)).toBe(true);
    expect(Array.isArray(response.body.snapshot_content.edges)).toBe(true);
  });

  it('should return 404 for non-existent version', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions/non-existent-uuid`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions/${testVersionId}`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .get(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/versions/${testVersionId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/campaigns/:campaignId/graphs/:graphId/versions', () => {
  it('should create new version snapshot and rotate backup', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      graph_id: testGraphId,
      version_type: 'current',
      created_at: expect.any(Number),
      snapshot_content: expect.any(Object),
    });
  });

  it('should move current version to backup before creating new', async () => {
    // Get versions before creating new snapshot
    const beforeResponse = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken);

    const oldCurrentId = beforeResponse.body.current_version?.id;

    // Create new version
    await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken)
      .expect(201);

    // Verify old current is now backup
    const afterResponse = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken);

    if (oldCurrentId) {
      expect(afterResponse.body.backup_version?.id).toBe(oldCurrentId);
    }
  });

  it('should include full graph state in snapshot', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken)
      .expect(201);

    expect(response.body.snapshot_content).toMatchObject({
      nodes: expect.any(Array),
      edges: expect.any(Array),
      metadata: {
        graph_type: expect.any(String),
        graph_name: expect.any(String),
        node_count: expect.any(Number),
        edge_count: expect.any(Number),
        snapshot_timestamp: expect.any(Number),
      },
    });
  });

  it('should capture confidence metadata (timestamps, pinned status)', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken)
      .expect(201);

    if (response.body.snapshot_content.nodes.length > 0) {
      const node = response.body.snapshot_content.nodes[0];
      expect(node).toHaveProperty('created_at');
      expect(node).toHaveProperty('last_accessed');
      expect(node).toHaveProperty('pinned');
    }
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .post(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent graph', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/non-existent-uuid/versions`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/campaigns/:campaignId/graphs/:graphId/versions/restore', () => {
  it('should restore graph from backup version', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions/restore`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      message: expect.any(String),
      graph_id: testGraphId,
      restored_at: expect.any(Number),
      node_count: expect.any(Number),
      edge_count: expect.any(Number),
    });
  });

  it('should replace current graph state with backup snapshot', async () => {
    // Get backup version content before restore
    const beforeResponse = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken);

    const backupNodeCount = beforeResponse.body.backup_version?.snapshot_content.metadata.node_count;

    // Restore from backup
    const restoreResponse = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions/restore`)
      .set('Authorization', validToken)
      .expect(200);

    expect(restoreResponse.body.node_count).toBe(backupNodeCount);
  });

  it('should restore confidence metadata (last_accessed, pinned)', async () => {
    await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions/restore`)
      .set('Authorization', validToken)
      .expect(200);

    // Verify restored nodes have timestamp metadata
    const graphResponse = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken);

    if (graphResponse.body.nodes && graphResponse.body.nodes.length > 0) {
      const node = graphResponse.body.nodes[0];
      expect(node).toHaveProperty('last_accessed');
      expect(node).toHaveProperty('pinned');
    }
  });

  it('should recalculate confidence after restore', async () => {
    await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions/restore`)
      .set('Authorization', validToken)
      .expect(200);

    // Confidence should be calculated using restored timestamps
    const graphResponse = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken);

    if (graphResponse.body.nodes && graphResponse.body.nodes.length > 0) {
      const node = graphResponse.body.nodes[0];
      expect(node).toHaveProperty('confidence');
      expect(node.confidence).toBeGreaterThanOrEqual(0.0);
      expect(node.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  it('should return 400 when no backup version exists', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/graph-with-no-backup/versions/restore`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/no backup/i);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions/restore`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .post(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/versions/restore`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent graph', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/non-existent-uuid/versions/restore`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/campaigns/:campaignId/graphs/:graphId/versions/:versionId', () => {
  it('should delete version snapshot', async () => {
    await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions/${testVersionId}`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should not allow deleting current version', async () => {
    // Get current version ID
    const versionsResponse = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions`)
      .set('Authorization', validToken);

    const currentVersionId = versionsResponse.body.current_version?.id;

    if (currentVersionId) {
      const response = await request(app)
        .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions/${currentVersionId}`)
        .set('Authorization', validToken)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/cannot delete current version/i);
    }
  });

  it('should return 404 for non-existent version', async () => {
    const response = await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions/non-existent-uuid`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/versions/${testVersionId}`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .delete(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/versions/${testVersionId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});
