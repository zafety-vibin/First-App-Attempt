/**
 * Graph Explorer - Browse and manage all 4 knowledge graphs
 * References:
 * - specs/005-create-the-ai/plan.md T063
 */

import React, { useState, useEffect } from 'react';
import { GitBranch, MapPin, Building, Globe, Book, Plus, Filter, Settings } from 'lucide-react';
import { GraphNodeEditor } from './GraphNodeEditor';
import { graphService } from '../services/graphService';

interface GraphExplorerProps {
  campaignId: string;
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  tags?: string[];
  is_active?: boolean;
  attributes?: Record<string, any>;
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

export function GraphExplorer({ campaignId }: GraphExplorerProps) {
  const [activeTab, setActiveTab] = useState('geographical');
  const [graphs, setGraphs] = useState<Record<string, KnowledgeGraph>>({});
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    'political-web': false,
    'campaign-story': false,
  });

  // Graph type configurations
  const graphTypes = [
    {
      id: 'geographical',
      label: 'Geographical',
      icon: MapPin,
      description: 'Locations, regions, and spatial relationships',
      supportsActiveFilter: false,
    },
    {
      id: 'political-web',
      label: 'Political-Web',
      icon: Building,
      description: 'Organizations, factions, and power structures',
      supportsActiveFilter: true,
    },
    {
      id: 'world-foundations',
      label: 'World-Foundations',
      icon: Globe,
      description: 'Core world-building elements and rules',
      supportsActiveFilter: false,
    },
    {
      id: 'campaign-story',
      label: 'Campaign-Story',
      icon: Book,
      description: 'Plot events, NPCs, and story arcs',
      supportsActiveFilter: true,
    },
  ];

  const currentGraphType = graphTypes.find(g => g.id === activeTab);
  const currentGraph = graphs[activeTab];

  // Load all graphs on mount
  useEffect(() => {
    loadAllGraphs();
  }, [campaignId]);

  // Reload specific graph when tab or filter changes
  useEffect(() => {
    if (activeTab) {
      loadGraph(activeTab);
    }
  }, [activeTab, activeFilters[activeTab]]);

  const loadAllGraphs = async () => {
    setLoading(true);
    try {
      const allGraphs = await graphService.listGraphs(campaignId);
      const graphMap: Record<string, KnowledgeGraph> = {};
      allGraphs.forEach(graph => {
        graphMap[graph.graph_type] = graph;
      });
      setGraphs(graphMap);
    } catch (error) {
      console.error('Failed to load graphs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGraph = async (graphType: string) => {
    setLoading(true);
    try {
      const activeFilter = activeFilters[graphType] || false;
      const graph = await graphService.getGraph(campaignId, graphType, activeFilter);
      setGraphs(prev => ({ ...prev, [graphType]: graph }));
    } catch (error) {
      console.error(`Failed to load ${graphType} graph:`, error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActiveFilter = (graphType: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [graphType]: !prev[graphType],
    }));
  };

  const handleCreateNode = () => {
    setSelectedNode({
      id: '',
      name: '',
      type: '',
      description: '',
      tags: [],
      attributes: {},
    });
    setShowNodeEditor(true);
  };

  const handleEditNode = (node: GraphNode) => {
    setSelectedNode(node);
    setShowNodeEditor(true);
  };

  const handleSaveNode = async (node: GraphNode) => {
    try {
      if (node.id) {
        // Update existing node
        await graphService.updateNode(campaignId, activeTab, node.id, node);
      } else {
        // Create new node
        await graphService.createNode(campaignId, activeTab, {
          name: node.name,
          type: node.type,
          description: node.description,
          tags: node.tags,
          attributes: node.attributes,
        });
      }
      setShowNodeEditor(false);
      loadGraph(activeTab);
    } catch (error) {
      console.error('Failed to save node:', error);
      alert('Failed to save node. Please try again.');
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm('Are you sure you want to delete this node? This will also remove all connected edges.')) {
      return;
    }

    try {
      await graphService.deleteNode(campaignId, activeTab, nodeId);
      loadGraph(activeTab);
    } catch (error) {
      console.error('Failed to delete node:', error);
      alert('Failed to delete node. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Knowledge Graphs
        </h2>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex overflow-x-auto">
          {graphTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setActiveTab(type.id)}
                className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === type.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{type.label}</span>
                {graphs[type.id] && (
                  <span className="ml-2 px-2 py-0.5 bg-gray-200 rounded-full text-xs">
                    {graphs[type.id].nodes.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {currentGraphType?.description}
        </div>
        <div className="flex items-center gap-2">
          {currentGraphType?.supportsActiveFilter && (
            <button
              onClick={() => toggleActiveFilter(activeTab)}
              className={`px-3 py-1 rounded-md text-sm transition-colors flex items-center gap-2 ${
                activeFilters[activeTab]
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-3 h-3" />
              Active Filter {activeFilters[activeTab] ? 'ON' : 'OFF'}
            </button>
          )}
          <button
            onClick={handleCreateNode}
            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm"
          >
            <Plus className="w-3 h-3" />
            Add Node
          </button>
        </div>
      </div>

      {/* Graph Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentGraph ? (
          <div className="p-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{currentGraph.nodes.length}</div>
                <div className="text-sm text-gray-600">Total Nodes</div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">{currentGraph.edges.length}</div>
                <div className="text-sm text-gray-600">Relationships</div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600">Last Updated</div>
                <div className="text-xs text-gray-500">
                  {new Date(currentGraph.updated_at).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Nodes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentGraph.nodes.map((node) => (
                <div
                  key={node.id}
                  className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleEditNode(node)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{node.name}</h3>
                    {node.is_active && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                        active
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{node.type}</div>
                  {node.description && (
                    <div className="text-sm text-gray-500 line-clamp-2 mb-2">
                      {node.description}
                    </div>
                  )}
                  {node.tags && node.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {node.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                    {currentGraph.edges.filter(e => e.source_id === node.id || e.target_id === node.id).length} connections
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No graph data available
          </div>
        )}
      </div>

      {/* Node Editor Modal */}
      {showNodeEditor && selectedNode && (
        <GraphNodeEditor
          node={selectedNode}
          graphType={activeTab}
          onSave={handleSaveNode}
          onDelete={selectedNode.id ? () => handleDeleteNode(selectedNode.id) : undefined}
          onClose={() => setShowNodeEditor(false)}
        />
      )}
    </div>
  );
}