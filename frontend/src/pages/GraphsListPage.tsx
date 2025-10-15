/**
 * Feature 006: Knowledge Graphs List Page
 * Main page displaying all 4 graph types with overview stats
 * Mind/Dream theme aesthetic
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Brain, MapPin, Users, Clock, BookOpen, Plus, Info } from 'lucide-react';
import { graphService } from '../services/graphService';
import { KnowledgeGraph, GraphOverview, GraphStats } from '../types/graph';
import './GraphsListPage.css';

const GraphsListPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [graphOverviews, setGraphOverviews] = useState<GraphOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    graph_type: 'Geographical' as const,
    graph_name: '',
    custom_type: ''
  });
  const hasMountedRef = useRef(false);

  // Load graphs on mount and when returning from subpages
  useEffect(() => {
    if (campaignId) {
      // Always fetch on mount
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        loadGraphs();
      } else {
        // Refetch when returning to this page
        loadGraphs();
      }
    }
  }, [campaignId, location.pathname]);

  const loadGraphs = async () => {
    if (!campaignId) return;

    setLoading(true);
    setError(null);

    try {
      const graphs = await graphService.listGraphs(campaignId);

      // Map graphs to overviews using node_count and edge_count already returned by backend
      const overviews = graphs.map(graph => {
        // Backend returns node_count and edge_count in the list endpoint
        const nodeCount = graph.node_count || 0;
        const edgeCount = graph.edge_count || 0;

        return {
          graph,
          stats: {
            total_nodes: nodeCount,
            total_edges: edgeCount,
            confidence_distribution: {
              high: 0, // TODO: Backend doesn't calculate confidence distribution yet
              medium: 0,
              low: 0,
              pinned: 0
            },
            avg_confidence: 0,
            stale_nodes_count: 0,
            last_updated: graph.updated_at
          } as GraphStats
        };
      });

      setGraphOverviews(overviews);
    } catch (err) {
      console.error('Failed to load graphs:', err);
      setError('Failed to load knowledge graphs');
    } finally {
      setLoading(false);
    }
  };

  const getGraphIcon = (type: string) => {
    switch (type) {
      case 'Geographical': return <MapPin className="w-6 h-6" />;
      case 'Political-Web': return <Users className="w-6 h-6" />;
      case 'Campaign-Story': return <Clock className="w-6 h-6" />;
      case 'World-Foundations': return <BookOpen className="w-6 h-6" />;
      default: return <Brain className="w-6 h-6" />;
    }
  };

  const getGraphRoute = (type: string) => {
    switch (type) {
      case 'Geographical': return 'geographic';
      case 'Political-Web': return 'political';
      case 'Campaign-Story': return 'story';
      case 'World-Foundations': return 'foundations';
      default: return '';
    }
  };

  const getGraphDescription = (type: string) => {
    switch (type) {
      case 'Geographical':
        return 'Locations and their connections. Confidence = "Will this be used again?"';
      case 'Political-Web':
        return 'Faction relationships. Confidence = Relationship strength (1.0 = sworn allies/enemies)';
      case 'Campaign-Story':
        return 'Events over time. Confidence decays with in-game time passage';
      case 'World-Foundations':
        return 'Immutable truths about your world. No confidence decay';
      default:
        return 'Custom knowledge graph';
    }
  };

  const handleToggleGraph = async (e: React.MouseEvent, graph: KnowledgeGraph) => {
    e.stopPropagation();

    try {
      await graphService.toggleGraph(campaignId!, graph.id, !graph.toggle_state);

      // Update local state
      setGraphOverviews(prev =>
        prev.map(overview =>
          overview.graph.id === graph.id
            ? { ...overview, graph: { ...overview.graph, toggle_state: !graph.toggle_state } }
            : overview
        )
      );
    } catch (err) {
      console.error('Failed to toggle graph:', err);
    }
  };

  const handleCreateGraph = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaignId) return;

    const graphName = formData.graph_name.trim();
    if (!graphName) {
      alert('Please enter a graph name');
      return;
    }

    setCreating(true);

    try {
      const graphType = formData.graph_type === 'Custom'
        ? `custom:${formData.custom_type}`
        : formData.graph_type;

      const newGraph = await graphService.createGraph(campaignId, {
        graph_type: graphType,
        graph_name: graphName,
        toggle_state: true,
        decay_rate: getDefaultDecayRate(formData.graph_type)
      });

      // Reload graphs to show the new one
      await loadGraphs();

      // Close modal and reset form
      setShowCreateModal(false);
      setFormData({
        graph_type: 'Geographical',
        graph_name: '',
        custom_type: ''
      });

      // Navigate to the new graph's page
      const route = getGraphRoute(formData.graph_type);
      if (route) {
        navigate(`/campaigns/${campaignId}/graphs/${route}`);
      }
    } catch (err) {
      console.error('Failed to create graph:', err);
      alert('Failed to create graph. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const getDefaultDecayRate = (graphType: string): number => {
    switch (graphType) {
      case 'World-Foundations': return 0.0;
      case 'Geographical': return 0.05;
      case 'Political-Web': return 0.1;
      case 'Campaign-Story': return 0.2;
      default: return 0.1;
    }
  };

  if (loading) {
    return (
      <div className="graphs-loading">
        <Brain className="w-12 h-12 animate-pulse" />
        <p>Loading knowledge graphs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graphs-error">
        <p>{error}</p>
        <button onClick={loadGraphs}>Retry</button>
      </div>
    );
  }

  return (
    <div className="graphs-list-page">
      <header className="graphs-header">
        <div className="header-content">
          <Brain className="w-10 h-10" />
          <div>
            <h1>Knowledge Graphs</h1>
            <p className="subtitle">Modular memory systems for your campaign</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn-help"
            title="Learn about knowledge graphs"
            onClick={() => setShowHelpModal(true)}
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="graphs-grid">
        {graphOverviews.map(({ graph, stats }) => (
          <div
            key={graph.id}
            className={`graph-card ${graph.toggle_state ? 'active' : 'inactive'}`}
            onClick={() => navigate(`/campaigns/${campaignId}/graphs/${getGraphRoute(graph.graph_type)}`)}
          >
            <div className="card-header">
              <div className="graph-icon">
                {getGraphIcon(graph.graph_type)}
              </div>
              <div className="graph-info">
                <h3>{graph.graph_name}</h3>
                <span className="graph-type">{graph.graph_type}</span>
              </div>
            </div>

            <p className="graph-description">
              {getGraphDescription(graph.graph_type)}
            </p>

            <div className="card-stats">
              <div className="stat">
                <span className="stat-value">{stats.total_nodes || 0}</span>
                <span className="stat-label">nodes</span>
              </div>
              <div className="stat">
                <span className="stat-value">{stats.total_edges || 0}</span>
                <span className="stat-label">connections</span>
              </div>
            </div>

            {graph.graph_type !== 'World-Foundations' && (
              <div className="confidence-indicators">
                <div className="confidence-item high">
                  <span className="confidence-dot"></span>
                  <span>{stats.confidence_distribution?.high || 0} strong</span>
                </div>
                <div className="confidence-item medium">
                  <span className="confidence-dot"></span>
                  <span>{stats.confidence_distribution?.medium || 0} medium</span>
                </div>
                <div className="confidence-item low">
                  <span className="confidence-dot"></span>
                  <span>{stats.confidence_distribution?.low || 0} weak</span>
                </div>
                {stats.confidence_distribution?.pinned > 0 && (
                  <div className="confidence-item pinned">
                    <MapPin className="w-3 h-3" />
                    <span>{stats.confidence_distribution.pinned} pinned</span>
                  </div>
                )}
              </div>
            )}

            <div className="toggle-control" onClick={(e) => handleToggleGraph(e, graph)}>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={graph.toggle_state}
                  onChange={() => {}} // Handled by parent onClick
                  className="toggle-input"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">
                  {graph.toggle_state ? 'AI Accessible' : 'AI Hidden'}
                </span>
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="create-graph-section">
        <button
          className="btn-create-graph"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-5 h-5" />
          Create Custom Graph
        </button>
      </div>

      {/* Create Graph Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Knowledge Graph</h2>
            <form onSubmit={handleCreateGraph}>
              <div className="form-group">
                <label htmlFor="graph_type">Graph Type</label>
                <select
                  id="graph_type"
                  value={formData.graph_type}
                  onChange={(e) => setFormData({ ...formData, graph_type: e.target.value as any })}
                  required
                >
                  <option value="Geographical">Geographical Memory</option>
                  <option value="Political-Web">Political-Web Memory</option>
                  <option value="Campaign-Story">Campaign-Story Memory</option>
                  <option value="World-Foundations">World-Foundations Memory</option>
                  <option value="Custom">Custom Graph</option>
                </select>
                <p className="field-hint">{getGraphDescription(formData.graph_type)}</p>
              </div>

              {formData.graph_type === 'Custom' && (
                <div className="form-group">
                  <label htmlFor="custom_type">Custom Type Name</label>
                  <input
                    type="text"
                    id="custom_type"
                    value={formData.custom_type}
                    onChange={(e) => setFormData({ ...formData, custom_type: e.target.value })}
                    placeholder="e.g., magic-systems, pantheon"
                    required={formData.graph_type === 'Custom'}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="graph_name">Graph Name</label>
                <input
                  type="text"
                  id="graph_name"
                  value={formData.graph_name}
                  onChange={(e) => setFormData({ ...formData, graph_name: e.target.value })}
                  placeholder="e.g., Elyria Continent, The Great War"
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)} disabled={creating}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Graph'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()}>
            <h2>About Knowledge Graphs</h2>
            <p>Knowledge graphs are modular memory systems that help you organize campaign information with confidence-based decay.</p>

            <h3>Graph Types:</h3>
            <ul>
              <li>
                <strong>Geographical Memory:</strong> Locations and their hierarchies.
                <br />Confidence = "Will this location be used again?"
              </li>
              <li>
                <strong>Political-Web Memory:</strong> Faction relationships and alliances.
                <br />Confidence = Relationship strength (1.0 = sworn allies/enemies)
              </li>
              <li>
                <strong>Campaign-Story Memory:</strong> Events over time linked to session recaps.
                <br />Confidence = Decays with in-game time passage
              </li>
              <li>
                <strong>World-Foundations Memory:</strong> Immutable truths about your world.
                <br />NO confidence decay - these are permanent facts
              </li>
            </ul>

            <h3>How Confidence Works:</h3>
            <p>
              Each node has a confidence score (0.0 - 1.0) that decays over time unless reinforced.
              Pin important nodes to prevent decay. Toggle graphs on/off to control AI context.
            </p>

            <button onClick={() => setShowHelpModal(false)} className="btn-primary">
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { GraphsListPage };
export default GraphsListPage;