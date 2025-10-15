/**
 * Widget Data Service - API calls for dashboard widgets
 * Feature: 015-create-the-dashboard (T014-T020)
 *
 * Fetches data from Feature 014 category APIs for widget display.
 * All API calls automatically include X-View-Mode header via apiClient interceptor.
 */

import { apiClient } from './apiClient';

// ============================================================================
// Type Definitions
// ============================================================================

export interface NPCSummaryData {
  totalCount: number;
  recentNPCs: Array<{ id: string; name: string; relationship_to_party: string }>;
  relationshipBreakdown: { ally: number; neutral: number; enemy: number };
}

export interface LocationSummaryData {
  totalCount: number;
  recentLocations: Array<{ id: string; name: string; location_type: string }>;
  typeBreakdown: { [type: string]: number }; // Flexible for various location types
}

export interface FactionPowerData {
  totalCount: number;
  activeFactions: Array<{ id: string; name: string; power_level: string }>;
  powerBreakdown: { major: number; minor: number };
}

export interface QuestTrackerData {
  activeCount: number;
  completedCount: number;
  inProgressQuests: Array<{ id: string; name: string; status: string }>;
}

export interface SessionTimelineData {
  lastRecap: { id: string; name: string; in_game_date_start: string | null; created_at: string } | null;
  nextPrep: { id: string; name: string; created_at: string } | null;
}

export interface PlayerCharacterData {
  activeCount: number;
  levelRange: { min: number; max: number } | null;
  partyRoster: Array<{ id: string; name: string; level: number; class: string }>;
}

export interface RecentActivityData {
  recentUpdates: Array<{
    category: string;
    id: string;
    name: string;
    updated_at: string;
  }>;
}

export interface KnowledgeGraphsOverviewData {
  totalGraphs: number;
  totalNodes: number;
  graphs: Array<{
    id: string;
    graphType: string;
    graphName: string;
    nodeCount: number;
    confidenceDistribution: {
      high: number;    // >= 0.7
      medium: number;  // 0.4-0.7
      low: number;     // < 0.4
      pinned: number;
    };
  }>;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * T014: NPC Summary Widget Data
 * Fetches NPCs and calculates relationship breakdown
 */
export async function getNPCSummary(campaignId: string): Promise<NPCSummaryData> {
  const response = await apiClient.get('/npcs', {
    params: {
      campaign_id: campaignId,
      limit: 100,
      sort_by: 'updated_at',
      sort_order: 'desc',
    },
  });

  const npcs = response.data.data; // Access .data.data for wrapped response

  // Calculate relationship breakdown based on relationship_to_party field
  const breakdown = { ally: 0, neutral: 0, enemy: 0 };
  npcs.forEach((npc: any) => {
    const relationship = npc.relationship_to_party?.toLowerCase();
    if (relationship?.includes('ally') || relationship?.includes('friend')) {
      breakdown.ally++;
    } else if (relationship?.includes('enemy') || relationship?.includes('hostile')) {
      breakdown.enemy++;
    } else {
      breakdown.neutral++;
    }
  });

  return {
    totalCount: npcs.length,
    recentNPCs: npcs.slice(0, 5).map((npc: any) => ({
      id: npc.id,
      name: npc.name,
      relationship_to_party: npc.relationship_to_party || 'unknown',
    })),
    relationshipBreakdown: breakdown,
  };
}

/**
 * T015: Location Explorer Widget Data
 * Fetches locations and calculates type breakdown
 */
export async function getLocationSummary(campaignId: string): Promise<LocationSummaryData> {
  const response = await apiClient.get('/locations', {
    params: {
      campaign_id: campaignId,
      limit: 100,
      sort_by: 'updated_at',
      sort_order: 'desc',
    },
  });

  const locations = response.data.data;

  // Calculate type breakdown
  const breakdown: { [type: string]: number } = {};
  locations.forEach((location: any) => {
    const type = location.location_type || 'unknown';
    breakdown[type] = (breakdown[type] || 0) + 1;
  });

  return {
    totalCount: locations.length,
    recentLocations: locations.slice(0, 5).map((location: any) => ({
      id: location.id,
      name: location.name,
      location_type: location.location_type || 'unknown',
    })),
    typeBreakdown: breakdown,
  };
}

/**
 * T016: Faction Power Widget Data
 * Fetches factions and calculates power level distribution
 */
export async function getFactionPowerData(campaignId: string): Promise<FactionPowerData> {
  const response = await apiClient.get('/factions', {
    params: {
      campaign_id: campaignId,
      limit: 100,
      sort_by: 'updated_at',
      sort_order: 'desc',
    },
  });

  const factions = response.data.data;

  // Calculate power breakdown
  let majorCount = 0;
  let minorCount = 0;
  factions.forEach((faction: any) => {
    const powerLevel = faction.power_level?.toLowerCase();
    if (powerLevel === 'major') {
      majorCount++;
    } else {
      minorCount++;
    }
  });

  return {
    totalCount: factions.length,
    activeFactions: factions.slice(0, 5).map((faction: any) => ({
      id: faction.id,
      name: faction.name,
      power_level: faction.power_level || 'minor',
    })),
    powerBreakdown: { major: majorCount, minor: minorCount },
  };
}

/**
 * T017: Quest Tracker Widget Data
 * Fetches quests and counts active/completed
 */
export async function getQuestTrackerData(campaignId: string): Promise<QuestTrackerData> {
  const response = await apiClient.get('/quests', {
    params: {
      campaign_id: campaignId,
      limit: 100,
      sort_by: 'updated_at',
      sort_order: 'desc',
    },
  });

  const quests = response.data.data;

  // Count active and completed
  let activeCount = 0;
  let completedCount = 0;
  const inProgressQuests: Array<{ id: string; name: string; status: string }> = [];

  quests.forEach((quest: any) => {
    const status = quest.status?.toLowerCase();
    if (status === 'in_progress' || status === 'not_started') {
      activeCount++;
      if (inProgressQuests.length < 5) {
        inProgressQuests.push({
          id: quest.id,
          name: quest.name,
          status: quest.status || 'not_started',
        });
      }
    } else if (status === 'completed') {
      completedCount++;
    }
  });

  return {
    activeCount,
    completedCount,
    inProgressQuests,
  };
}

/**
 * T018: Session Timeline Widget Data
 * Fetches last recap and next prep
 */
export async function getSessionTimelineData(campaignId: string): Promise<SessionTimelineData> {
  // Fetch last session recap (note: endpoint uses hyphen)
  const recapResponse = await apiClient.get('/session-recaps', {
    params: {
      campaign_id: campaignId,
      limit: 1,
      sort_by: 'created_at',
      sort_order: 'desc',
    },
  });

  const lastRecap = recapResponse.data.data[0] || null;

  // Fetch next session prep (note: endpoint uses hyphen)
  const prepResponse = await apiClient.get('/session-prep', {
    params: {
      campaign_id: campaignId,
      limit: 1,
      sort_by: 'created_at',
      sort_order: 'desc',
    },
  });

  const nextPrep = prepResponse.data.data[0] || null;

  return {
    lastRecap: lastRecap ? {
      id: lastRecap.id,
      name: lastRecap.name,
      in_game_date_start: lastRecap.in_game_date_start || null,
      created_at: lastRecap.created_at,
    } : null,
    nextPrep: nextPrep ? {
      id: nextPrep.id,
      name: nextPrep.name,
      created_at: nextPrep.created_at,
    } : null,
  };
}

/**
 * T019: Player Characters Widget Data
 * Fetches player characters and calculates level range
 */
export async function getPlayerCharacterData(campaignId: string): Promise<PlayerCharacterData> {
  const response = await apiClient.get('/player-characters', {
    params: {
      campaign_id: campaignId,
      limit: 100,
      sort_by: 'name',
      sort_order: 'asc',
    },
  });

  const pcs = response.data.data;

  // Calculate level range
  let levelRange: { min: number; max: number } | null = null;
  if (pcs.length > 0) {
    const levels = pcs.map((pc: any) => pc.level || 1);
    levelRange = {
      min: Math.min(...levels),
      max: Math.max(...levels),
    };
  }

  // Parse class field (it's a JSON array in the database)
  const parseClass = (classField: string | null): string => {
    if (!classField) return 'Unknown';
    try {
      const parsed = JSON.parse(classField);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.join('/'); // Multi-class support
      }
      return String(parsed);
    } catch {
      return classField; // Return as-is if not JSON
    }
  };

  return {
    activeCount: pcs.length,
    levelRange,
    partyRoster: pcs.map((pc: any) => ({
      id: pc.id,
      name: pc.name,
      level: pc.level || 1,
      class: parseClass(pc.class),
    })),
  };
}

/**
 * T020: Recent Activity Widget Data
 * Fetches recent updates across ALL 13 categories
 */
export async function getRecentActivityData(campaignId: string): Promise<RecentActivityData> {
  const categories = [
    'npcs',
    'locations',
    'factions',
    'quests',
    'session-recaps', // hyphen
    'player-characters', // hyphen
    'lore-entries', // hyphen
    'world-rules', // hyphen
    'planar-forces', // hyphen
    'session-prep', // hyphen
    'custom-mechanics', // hyphen
    'items',
    'creatures',
  ];

  // Fetch 2 most recent from each category (13 API calls in parallel)
  const promises = categories.map(async (category) => {
    try {
      const response = await apiClient.get(`/${category}`, {
        params: {
          campaign_id: campaignId,
          limit: 2,
          sort_by: 'updated_at',
          sort_order: 'desc',
        },
      });

      return response.data.data.map((item: any) => ({
        category: category.replace(/-/g, '_'), // Convert hyphens to underscores for display
        id: item.id,
        name: item.name,
        updated_at: item.updated_at,
      }));
    } catch (error) {
      console.error(`Failed to fetch ${category}:`, error);
      return [];
    }
  });

  const results = await Promise.all(promises);

  // Flatten and sort by updated_at DESC
  const allUpdates = results.flat();
  allUpdates.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return {
    recentUpdates: allUpdates.slice(0, 10), // Top 10 most recent
  };
}

/**
 * Feature 006: Knowledge Graphs Overview Widget Data
 * Fetches all knowledge graphs and calculates confidence distributions
 */
export async function getKnowledgeGraphsOverview(campaignId: string): Promise<KnowledgeGraphsOverviewData> {
  try {
    // Fetch all graphs for the campaign
    const graphsResponse = await apiClient.get(`/campaigns/${campaignId}/graphs`);
    const graphs = graphsResponse.data.graphs || [];

    let totalNodes = 0;
    const graphOverviews = [];

    // For each graph, fetch nodes and calculate confidence distribution
    for (const graph of graphs) {
      try {
        const nodesResponse = await apiClient.get(`/campaigns/${campaignId}/graphs/${graph.id}/nodes`);
        const nodes = nodesResponse.data.nodes || [];

        // Calculate confidence distribution
        const distribution = {
          high: 0,
          medium: 0,
          low: 0,
          pinned: 0
        };

        nodes.forEach((node: any) => {
          const confidence = node.confidence ?? 1.0;

          if (node.is_pinned) {
            distribution.pinned++;
          }

          if (confidence >= 0.7) {
            distribution.high++;
          } else if (confidence >= 0.4) {
            distribution.medium++;
          } else {
            distribution.low++;
          }
        });

        totalNodes += nodes.length;

        graphOverviews.push({
          id: graph.id,
          graphType: graph.graph_type,
          graphName: graph.graph_name,
          nodeCount: nodes.length,
          confidenceDistribution: distribution
        });
      } catch (error) {
        console.error(`Failed to fetch nodes for graph ${graph.id}:`, error);
        // Continue with empty node data for this graph
        graphOverviews.push({
          id: graph.id,
          graphType: graph.graph_type,
          graphName: graph.graph_name,
          nodeCount: 0,
          confidenceDistribution: {
            high: 0,
            medium: 0,
            low: 0,
            pinned: 0
          }
        });
      }
    }

    return {
      totalGraphs: graphs.length,
      totalNodes,
      graphs: graphOverviews
    };
  } catch (error) {
    console.error('Failed to fetch knowledge graphs overview:', error);
    throw error;
  }
}
