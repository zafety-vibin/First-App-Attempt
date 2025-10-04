/**
 * Graph Viewer - Simple list view for knowledge graphs
 * References:
 * - specs/005-create-the-ai/plan.md T059
 */

import React, { useState, useEffect } from 'react';
import { GitBranch, Circle, ArrowRight, Filter, RefreshCw } from 'lucide-react';
import { graphService } from '../services/graphService';

interface GraphUpdate {
  graph_type: string;
  nodes_added: number;
  edges_added: number;
}

interface GraphViewerProps {
  campaignId: string;
  updates?: Record<string, GraphUpdate>;
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  tags?: string[];
  is_active?: boolean;
}

interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: string;
  weight?: number;
}

interface KnowledgeGraph {
  id: string;
  campaign_id: string;
  graph_type: string;
  is_active_filtered: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  updated_at: number;
}

export function GraphViewer({ campaignId, updates = {} }: GraphViewerProps) {
  const [selectedGraph, setSelectedGraph] = useState<string>('geographical');
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [activeFilter, setActiveFilter] = useState(false);
  const [loading, setLoading] = useState(false);

  // Graph types
  const graphTypes = [
    { id: 'geographical', label: 'Geographical', icon: '🗺️' },
    { id: 'political-web', label: 'Political-Web', icon: '🏛️', supportsFilter: true },
    { id: 'world-foundations', label: 'World-Foundations', icon: '🌍' },
    { id: 'campaign-story', label: 'Campaign-Story', icon: '📖', supportsFilter: true },
  ];

  const currentGraphType = graphTypes.find(g => g.id === selectedGraph);

  // Load graph data
  useEffect(() => {
    loadGraph();
  }, [campaignId, selectedGraph, activeFilter]);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const data = await graphService.getGraph(campaignId, selectedGraph, activeFilter);
      setGraph(data);
    } catch (error) {
      console.error('Failed to load graph:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get update info for current graph
  const currentUpdate = updates[selectedGraph];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Knowledge Graphs
        </h3>
      </div>

      {/* Graph Type Selector */}
      <div className="px-4 py-3 border-b">
        <div className="flex flex-wrap gap-2">
          {graphTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedGraph(type.id)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                selectedGraph === type.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{type.icon}</span>
              {type.label}
              {currentUpdate && type.id === selectedGraph && (
                <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  +{currentUpdate.nodes_added + currentUpdate.edges_added}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Active Filter Toggle */}
        {currentGraphType?.supportsFilter && (
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setActiveFilter(!activeFilter)}
              className={`px-3 py-1 rounded-md text-sm transition-colors flex items-center gap-2 ${
                activeFilter
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-3 h-3" />
              Active Filter {activeFilter ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={loadGraph}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Graph Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : graph ? (
          <div className="space-y-4">
            {/* Nodes Section */}
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center justify-between">
                Nodes ({graph.nodes.length})
                {currentUpdate && (
                  <span className="text-xs text-green-600">
                    +{currentUpdate.nodes_added} new
                  </span>
                )}
              </h4>
              <div className="space-y-1">
                {graph.nodes.slice(0, 20).map((node) => (
                  <div
                    key={node.id}
                    className="flex items-start gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    <Circle className="w-3 h-3 mt-1 text-purple-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{node.name}</div>
                      <div className="text-xs text-gray-600">
                        {node.type}
                        {node.is_active && (
                          <span className="ml-2 px-1 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                            active
                          </span>
                        )}
                      </div>
                      {node.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {node.description}
                        </div>
                      )}
                      {node.tags && node.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {node.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {graph.nodes.length > 20 && (
                  <div className="text-xs text-gray-500 italic pl-5">
                    ...and {graph.nodes.length - 20} more nodes
                  </div>
                )}
              </div>
            </div>

            {/* Edges Section */}
            {graph.edges.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center justify-between">
                  Relationships ({graph.edges.length})
                  {currentUpdate && (
                    <span className="text-xs text-green-600">
                      +{currentUpdate.edges_added} new
                    </span>
                  )}
                </h4>
                <div className="space-y-1">
                  {graph.edges.slice(0, 10).map((edge) => {
                    const source = graph.nodes.find(n => n.id === edge.source_id);
                    const target = graph.nodes.find(n => n.id === edge.target_id);
                    return (
                      <div
                        key={edge.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs"
                      >
                        <span className="font-medium truncate">{source?.name || 'Unknown'}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="text-purple-600">{edge.relationship_type}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="font-medium truncate">{target?.name || 'Unknown'}</span>
                      </div>
                    );
                  })}
                  {graph.edges.length > 10 && (
                    <div className="text-xs text-gray-500 italic pl-2">
                      ...and {graph.edges.length - 10} more relationships
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Last Updated */}
            <div className="text-xs text-gray-500 pt-2 border-t">
              Last updated: {new Date(graph.updated_at).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            No graph data available
          </div>
        )}
      </div>
    </div>
  );
}