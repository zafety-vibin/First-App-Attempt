/**
 * Zod schemas for Graph tools
 * Based on contracts/graph-tools.json
 */

import { z } from 'zod';

// query_graph schemas
export const QueryGraphInputSchema = z.object({
  campaign_id: z.string().min(1),
  graph_type: z.enum(['Geographical', 'Political-Web', 'World-Foundations', 'Campaign-Story']),
  query: z.string().min(1),
  active_only: z.boolean().optional().default(false)
});

export const QueryGraphOutputSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    attributes: z.record(z.any()),
    is_active: z.boolean().optional()
  })),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    relationship: z.string(),
    attributes: z.record(z.any()).optional()
  })),
  query_interpretation: z.string()
});

// list_graph_nodes schemas
export const ListGraphNodesInputSchema = z.object({
  campaign_id: z.string().min(1),
  graph_type: z.enum(['Geographical', 'Political-Web', 'World-Foundations', 'Campaign-Story']),
  node_type: z.string().optional(),
  limit: z.number().int().positive().max(100).optional().default(50)
});

export const ListGraphNodesOutputSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    attributes: z.record(z.any()),
    created_at: z.number().int(),
    updated_at: z.number().int()
  })),
  total_count: z.number().int(),
  node_types: z.array(z.string())
});

// get_node_relationships schemas
export const GetNodeRelationshipsInputSchema = z.object({
  campaign_id: z.string().min(1),
  graph_type: z.enum(['Geographical', 'Political-Web', 'World-Foundations', 'Campaign-Story']),
  node_id: z.string().min(1)
});

export const GetNodeRelationshipsOutputSchema = z.object({
  node: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    attributes: z.record(z.any())
  }),
  incoming: z.array(z.object({
    edge_id: z.string(),
    relationship: z.string(),
    source: z.object({
      id: z.string(),
      name: z.string(),
      type: z.string()
    })
  })),
  outgoing: z.array(z.object({
    edge_id: z.string(),
    relationship: z.string(),
    target: z.object({
      id: z.string(),
      name: z.string(),
      type: z.string()
    })
  }))
});

// update_graph schemas
export const UpdateGraphInputSchema = z.object({
  campaign_id: z.string().min(1),
  graph_type: z.enum(['Geographical', 'Political-Web', 'World-Foundations', 'Campaign-Story']),
  operation: z.enum(['add_node', 'update_node', 'delete_node', 'add_edge', 'delete_edge']),
  node: z.object({
    id: z.string().optional(),
    name: z.string(),
    type: z.string(),
    attributes: z.record(z.any()).optional()
  }).optional(),
  edge: z.object({
    id: z.string().optional(),
    source: z.string(),
    target: z.string(),
    relationship: z.string(),
    attributes: z.record(z.any()).optional()
  }).optional()
});

export const UpdateGraphOutputSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  affected: z.object({
    nodes: z.array(z.string()).optional(),
    edges: z.array(z.string()).optional()
  }),
  graph_stats: z.object({
    total_nodes: z.number().int(),
    total_edges: z.number().int()
  })
});