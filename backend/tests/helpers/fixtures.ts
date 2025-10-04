import { generateTestId } from './database';

/**
 * Creates a test user fixture
 */
export function createTestUser(overrides: Partial<any> = {}) {
  const id = generateTestId('user');
  const keycloakSub = generateTestId('keycloak');

  return {
    id,
    keycloak_sub: keycloakSub,
    email: `test-${id}@example.com`,
    name: `Test User ${id}`,
    token: `test-token-${id}`,
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides
  };
}

/**
 * Creates a test campaign fixture
 */
export function createTestCampaign(ownerId: string, overrides: Partial<any> = {}) {
  const id = generateTestId('campaign');

  return {
    id,
    name: `Test Campaign ${id}`,
    description: 'A test campaign for unit tests',
    owner_id: ownerId,
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides
  };
}

/**
 * Creates a test card fixture
 */
export function createTestCard(campaignId: string, overrides: Partial<any> = {}) {
  const id = generateTestId('card');

  return {
    id,
    campaign_id: campaignId,
    parent_id: null,
    title: `Test Card ${id}`,
    content: 'Test card content',
    card_type: 'note',
    position: 0,
    information_level_id: null,
    is_database: 0,
    database_schema: null,
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides
  };
}

/**
 * Creates a test import session fixture
 */
export function createTestImportSession(campaignId: string, userId: string, overrides: Partial<any> = {}) {
  const id = generateTestId('import');

  return {
    id,
    campaign_id: campaignId,
    user_id: userId,
    status: 'active',
    file_metadata: JSON.stringify([]),
    chat_history: JSON.stringify([]),
    extracted_entities: JSON.stringify([]),
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides
  };
}

/**
 * Creates a test planning session fixture
 */
export function createTestPlanningSession(campaignId: string, userId: string, overrides: Partial<any> = {}) {
  const id = generateTestId('planning');

  return {
    id,
    campaign_id: campaignId,
    user_id: userId,
    status: 'active',
    chat_history: JSON.stringify([]),
    graph_updates: JSON.stringify([]),
    created_at: Date.now(),
    updated_at: Date.now(),
    completed_at: null,
    ...overrides
  };
}

/**
 * Creates a test knowledge graph fixture
 */
export function createTestKnowledgeGraph(campaignId: string, type: string, overrides: Partial<any> = {}) {
  const id = generateTestId('graph');

  return {
    id,
    campaign_id: campaignId,
    type,
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides
  };
}

/**
 * Creates a test graph node fixture
 */
export function createTestGraphNode(graphId: string, overrides: Partial<any> = {}) {
  const id = generateTestId('node');

  return {
    id,
    graph_id: graphId,
    type: 'npc',
    name: `Test Node ${id}`,
    attributes: JSON.stringify({ description: 'Test node' }),
    import_batch_id: null,
    created_at: Date.now(),
    ...overrides
  };
}

/**
 * Creates a test graph edge fixture
 */
export function createTestGraphEdge(
  graphId: string,
  sourceNodeId: string,
  targetNodeId: string,
  overrides: Partial<any> = {}
) {
  const id = generateTestId('edge');

  return {
    id,
    graph_id: graphId,
    source_node_id: sourceNodeId,
    target_node_id: targetNodeId,
    type: 'relationship',
    attributes: JSON.stringify({ strength: 'strong' }),
    import_batch_id: null,
    created_at: Date.now(),
    ...overrides
  };
}

/**
 * Creates test entity extraction result
 */
export function createTestEntityExtractionResult() {
  return {
    entities: [
      {
        type: 'npc',
        name: 'Lord Blackwood',
        attributes: {
          title: 'Lord',
          location: 'Blackwood Castle',
          role: 'Noble'
        }
      },
      {
        type: 'location',
        name: 'Blackwood Castle',
        attributes: {
          type: 'castle',
          region: 'Northern Wastes'
        }
      },
      {
        type: 'npc',
        name: 'Sage Eldara',
        attributes: {
          title: 'Sage',
          role: 'Advisor'
        }
      }
    ],
    relationships: [
      {
        source_name: 'Sage Eldara',
        target_name: 'Lord Blackwood',
        type: 'advisor',
        attributes: {
          trust_level: 'high'
        }
      }
    ]
  };
}

/**
 * Creates test approval summary
 */
export function createTestApprovalSummary(sessionId: string, campaignId: string) {
  return {
    session_id: sessionId,
    campaign_id: campaignId,
    new_entities: [
      {
        type: 'npc',
        name: 'New NPC',
        attributes: {}
      }
    ],
    updated_entities: [
      {
        card_id: 'existing-card-1',
        updates: {
          attributes: {
            new_info: 'Updated information'
          }
        }
      }
    ],
    relationships: [
      {
        source: 'Entity 1',
        target: 'Entity 2',
        type: 'alliance'
      }
    ],
    conflicts: [],
    statistics: {
      total_entities: 3,
      new_entities: 1,
      updated_entities: 1,
      relationships: 1,
      conflicts: 0
    }
  };
}

/**
 * Creates test SSE event stream
 */
export function createTestSSEStream(events: any[]) {
  return events.map(event => {
    return `data: ${JSON.stringify(event)}\n\n`;
  }).join('');
}

/**
 * Creates test file upload
 */
export function createTestFileUpload(filename: string = 'test.txt', content: string = 'Test content') {
  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype: getMimeType(filename),
    buffer: Buffer.from(content),
    size: content.length
  };
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'md': 'text/markdown',
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return mimeTypes[ext || 'txt'] || 'text/plain';
}